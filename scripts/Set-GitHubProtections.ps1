[CmdletBinding()]
param(
    [ValidatePattern('^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$')]
    [string]$Repository = 'manoelcalixto/chrome-translation-unblocker',
    [switch]$SkipRules,
    [switch]$CheckOnly
)

$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path -Parent $PSScriptRoot

function Invoke-RepositoryApi {
    param([string]$Endpoint = '', [string]$Method = 'GET', [object]$Body = $null)
    $apiPath = "repos/$Repository"
    if ($Endpoint) { $apiPath += "/$Endpoint" }
    $apiArguments = @('api', '--method', $Method, $apiPath, '-H', 'Accept: application/vnd.github+json')
    $bodyFile = $null
    try {
        if ($null -ne $Body) {
            $bodyFile = [IO.Path]::GetTempFileName()
            [IO.File]::WriteAllText($bodyFile, ($Body | ConvertTo-Json -Depth 30), [Text.UTF8Encoding]::new($false))
            $apiArguments += @('--input', $bodyFile)
        }
        $apiOutput = & gh @apiArguments
        if ($LASTEXITCODE -ne 0) { throw "GitHub API failed: $Method $apiPath" }
        if ($apiOutput) { return (($apiOutput -join "`n") | ConvertFrom-Json -Depth 50) }
    }
    finally {
        if ($bodyFile -and (Test-Path -LiteralPath $bodyFile)) { Remove-Item -LiteralPath $bodyFile -Force }
    }
}

$repositoryInfo = Invoke-RepositoryApi
if ($repositoryInfo.private) { throw 'This security baseline targets a public repository. Visibility is never changed by this script.' }

if (-not $CheckOnly) {
    Invoke-RepositoryApi -Method PATCH -Body @{
        allow_merge_commit = $false
        allow_rebase_merge = $false
        allow_squash_merge = $true
        allow_auto_merge = $false
        delete_branch_on_merge = $true
        has_wiki = $false
        security_and_analysis = @{
            secret_scanning = @{ status = 'enabled' }
            secret_scanning_push_protection = @{ status = 'enabled' }
        }
    } | Out-Null
    Invoke-RepositoryApi -Endpoint 'vulnerability-alerts' -Method PUT | Out-Null
    Invoke-RepositoryApi -Endpoint 'automated-security-fixes' -Method PUT | Out-Null
    Invoke-RepositoryApi -Endpoint 'private-vulnerability-reporting' -Method PUT | Out-Null
    Invoke-RepositoryApi -Endpoint 'actions/permissions' -Method PUT -Body @{
        enabled = $true; allowed_actions = 'selected'; sha_pinning_required = $true
    } | Out-Null
    Invoke-RepositoryApi -Endpoint 'actions/permissions/selected-actions' -Method PUT -Body @{
        github_owned_allowed = $true
        verified_allowed = $false
        patterns_allowed = @('gitleaks/gitleaks-action@*')
    } | Out-Null
    Invoke-RepositoryApi -Endpoint 'actions/permissions/workflow' -Method PUT -Body @{
        default_workflow_permissions = 'read'; can_approve_pull_request_reviews = $false
    } | Out-Null
    Invoke-RepositoryApi -Endpoint 'actions/permissions/fork-pr-contributor-approval' -Method PUT -Body @{
        approval_policy = 'all_external_contributors'
    } | Out-Null

    if (-not $SkipRules) {
        $desiredRuleset = Get-Content -LiteralPath (Join-Path $repositoryRoot '.github/main-ruleset.json') -Raw | ConvertFrom-Json
        $rulesets = @(Invoke-RepositoryApi -Endpoint 'rulesets')
        $existingRuleset = @($rulesets | Where-Object { $_.name -eq $desiredRuleset.name -and $_.source -eq $Repository })
        if ($existingRuleset.Count -gt 1) { throw 'Multiple matching rulesets; inspect manually before updating.' }
        if ($existingRuleset.Count -eq 1) {
            Invoke-RepositoryApi -Endpoint "rulesets/$($existingRuleset[0].id)" -Method PUT -Body $desiredRuleset | Out-Null
        }
        else {
            Invoke-RepositoryApi -Endpoint 'rulesets' -Method POST -Body $desiredRuleset | Out-Null
        }
    }
}

$repositoryInfo = Invoke-RepositoryApi
$actions = Invoke-RepositoryApi -Endpoint 'actions/permissions'
$allowedActions = Invoke-RepositoryApi -Endpoint 'actions/permissions/selected-actions'
$workflow = Invoke-RepositoryApi -Endpoint 'actions/permissions/workflow'
$forks = Invoke-RepositoryApi -Endpoint 'actions/permissions/fork-pr-contributor-approval'
$privateReports = Invoke-RepositoryApi -Endpoint 'private-vulnerability-reporting'
$securityUpdates = Invoke-RepositoryApi -Endpoint 'automated-security-fixes'
Invoke-RepositoryApi -Endpoint 'vulnerability-alerts' | Out-Null
$rulesetDetails = @()
foreach ($ruleset in @(Invoke-RepositoryApi -Endpoint 'rulesets')) {
    if ($ruleset.name -eq 'Protect main') {
        $rulesetDetails += Invoke-RepositoryApi -Endpoint "rulesets/$($ruleset.id)"
    }
}

if ($repositoryInfo.private -or $repositoryInfo.security_and_analysis.secret_scanning.status -ne 'enabled' -or
    $repositoryInfo.security_and_analysis.secret_scanning_push_protection.status -ne 'enabled' -or
    -not $actions.sha_pinning_required -or $actions.allowed_actions -ne 'selected' -or
    $workflow.default_workflow_permissions -ne 'read' -or $workflow.can_approve_pull_request_reviews -or
    $forks.approval_policy -ne 'all_external_contributors' -or -not $privateReports.enabled) {
    throw 'GitHub security settings do not match the expected baseline.'
}
if (-not $SkipRules -and @($rulesetDetails | Where-Object { $_.enforcement -eq 'active' }).Count -ne 1) {
    throw 'Expected one active Protect main ruleset.'
}

[ordered]@{
    repository = $Repository
    visibility = $repositoryInfo.visibility
    security_and_analysis = $repositoryInfo.security_and_analysis
    dependabot_alerts = 'enabled'
    dependabot_security_updates = $securityUpdates
    private_vulnerability_reporting = $privateReports
    actions = $actions
    allowed_actions = $allowedActions
    workflow_permissions = $workflow
    fork_workflow_approval = $forks
    rulesets = $rulesetDetails
} | ConvertTo-Json -Depth 30
