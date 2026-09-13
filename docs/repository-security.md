# Proteções do repositório

A configuração versionada fica em [.github/main-ruleset.json](../.github/main-ruleset.json) e [scripts/Set-GitHubProtections.ps1](../scripts/Set-GitHubProtections.ps1). Os arquivos descrevem a configuração desejada; para conferir o estado atual do GitHub, execute o modo de consulta abaixo.

## Branch principal

O ruleset **Protect main** exige pull request, histórico linear, resolução das conversas e aprovação das verificações **Quality**, **Browser tests**, **Secrets** e **CodeQL**, com a branch atualizada. Os status são vinculados à integração oficial GitHub Actions.

Force pushes e exclusão de `main` são bloqueados. Não há atores com bypass automático. Merge é por squash. O resultado do CodeQL também bloqueia erros e alertas de segurança de severidade alta ou crítica.

Como o projeto tem um único mantenedor, o número obrigatório de aprovações humanas começa em **zero**: o próprio autor não consegue aprovar seu PR. PR e CI continuam obrigatórios para o mantenedor. CODEOWNERS aponta para ele para facilitar a revisão de contribuições externas. Quando houver outro mantenedor, aumente `required_approving_review_count` para `1` e considere exigir revisão de CODEOWNERS.

## Actions e dependências

- Token padrão somente de leitura; Actions não podem aprovar PRs.
- Actions oficiais do GitHub e `gitleaks/gitleaks-action` permitidas; SHA completo obrigatório por política do repositório.
- Workflows de todos os contribuidores externos precisam de aprovação antes de executar.
- Checkout sem credenciais persistidas; nenhum `pull_request_target` ou workflow privilegiado de publicação.
- Dependências de desenvolvimento fixadas e lockfile versionado; `npm ci --ignore-scripts` na CI.
- Dependabot semanal para npm e Actions; alertas e atualizações de segurança habilitados.

## Código e segredos

CI cobre testes reais da extensão em perfil temporário, ESLint, permissões/CSP e auditoria npm. Gitleaks verifica o histórico alcançável pelo evento; o checkout inclui o histórico completo. CodeQL usa `security-extended` em PRs, pushes na principal e verificação semanal.

Secret scanning e push protection do GitHub são habilitados. Relatos privados de vulnerabilidade são aceitos em **Security → Advisories → Report a vulnerability**.

Não há publicação automática de pacotes ou na Chrome Web Store. A licença MIT está incluída para uso e contribuição públicos.

## Aplicar ou conferir

Requer PowerShell 7 e GitHub CLI autenticado com permissão administrativa neste repositório. O script não muda a visibilidade e recusa repositórios privados.

```powershell
# Consulta o GitHub e verifica os controles principais, sem alterações.
.\scripts\Set-GitHubProtections.ps1 -CheckOnly

# Aplica ou reaplica a configuração versionada.
.\scripts\Set-GitHubProtections.ps1
```

`-SkipRules` existe apenas para o bootstrap antes do primeiro push; não é o estado final esperado. O ruleset deve ser aplicado depois de o primeiro commit e seus checks existirem.

Para alterar ou desfazer um controle, edite sua configuração versionada e use **Settings → Rules → Rulesets**, **Settings → Actions** ou **Settings → Advanced Security**. Remover os arquivos locais não desativa controles já existentes no GitHub. O modo `-CheckOnly` consulta os endpoints de rulesets, não apenas a proteção clássica de branches.

## Fontes

- [Rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets)
- [API de regras do repositório](https://docs.github.com/en/rest/repos/rules)
- [Permissões do GitHub Actions](https://docs.github.com/en/rest/actions/permissions)
