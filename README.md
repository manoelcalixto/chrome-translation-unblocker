# Desbloqueador de Tradução do Chrome

[![CI](https://github.com/manoelcalixto/chrome-translation-unblocker/actions/workflows/ci.yml/badge.svg)](https://github.com/manoelcalixto/chrome-translation-unblocker/actions/workflows/ci.yml)
[![CodeQL](https://github.com/manoelcalixto/chrome-translation-unblocker/actions/workflows/codeql.yml/badge.svg)](https://github.com/manoelcalixto/chrome-translation-unblocker/actions/workflows/codeql.yml)

Extensão que remove marcações HTML usadas para impedir a tradução de páginas, permitindo que você use o **tradutor nativo do Chrome** em mais sites.

Por exemplo: quando o menu de um site é traduzido e o artigo continua no idioma original por causa de `translate="no"`, a extensão libera esse conteúdo. A tradução continua sendo feita pelo Chrome, no idioma escolhido por você.

## Instalar sem compactação no Windows 11

1. Obtenha este repositório e mantenha sua pasta em um local fixo.
2. Abra `chrome://extensions` e ative **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactação**.
4. Selecione a subpasta **extension**, que contém `manifest.json`.
5. Recarregue as páginas que já estavam abertas.
6. No menu do Chrome, escolha **Traduzir** e selecione **Português**, ou outro idioma de sua preferência.

Se a página já estava parcialmente traduzida, use **Mostrar original** e mande traduzir novamente. A extensão não aciona o menu de tradução automaticamente.

O pacote instalado está inteiramente em `extension/`; não precisa de Node.js, conta, chave de API ou etapa de compilação para funcionar.

## Usar e pausar

O ajuste vem ativado em sites HTTP e HTTPS, incluindo seus frames com esses protocolos. Abra a extensão e desligue **Ativar em todos os sites** para pausar globalmente. Essa opção é guardada localmente e compartilhada entre as abas.

Para limitar a atuação a sites escolhidos, use **Acesso ao site** nas opções da extensão no Chrome. As permissões do navegador prevalecem sobre o botão da extensão.

Ao pausar, a extensão restaura as marcações alteradas nos elementos ainda presentes. Para desfazer uma tradução já apresentada pelo Chrome, use **Mostrar original** ou recarregue a página.

## O que ela ajusta

- Troca `translate="no"` por `translate="yes"` em conteúdo não editável.
- Remove a classe `notranslate` e a indicação global `<meta name="google" content="notranslate">`.
- Acompanha conteúdo inserido dinamicamente e novas marcações, inclusive em navegação sem recarregar a página.
- Preserva exclusões explícitas em código, campos de formulário e regiões editáveis.

O código atua no DOM local. Ele não salva o texto das páginas, não altera o conteúdo publicado no servidor e não executa ações de formulários.

## Permissões e privacidade

O acesso a todos os sites é necessário para ajustar as marcações nas páginas que você visita. A única permissão de API declarada é `storage`, usada para guardar **ativado/desativado** no dispositivo.

A extensão não faz requisições de rede, não inclui anúncios ou telemetria, não lê cookies e não armazena histórico ou conteúdo das páginas. O tradutor do Chrome tem seu próprio funcionamento e suas próprias configurações. Consulte a [política de privacidade](PRIVACY.md).

## Limites

Páginas internas do Chrome, a Chrome Web Store e outras superfícies protegidas pelo navegador não permitem esse tipo de extensão. Arquivos locais e frames com protocolos diferentes de HTTP/HTTPS não estão incluídos.

Textos em imagens, vídeos, PDFs, canvas ou componentes com Shadow DOM podem exigir outro recurso. A remoção de uma marcação HTML não garante que o tradutor do navegador consiga traduzir todo conteúdo de qualquer site.

Este é um projeto independente, sem afiliação ao Google. Chrome é uma marca do Google.

## Atualizar ou remover

Após atualizar os arquivos, use **Recarregar** na extensão em `chrome://extensions` e recarregue as páginas abertas. Para desinstalar, use **Remover** nessa mesma tela e recarregue as páginas. Evite mover a pasta enquanto ela estiver instalada.

## Desenvolvimento e testes

Requer Node.js 24 ou superior e Chrome instalado. Em PowerShell, na raiz do repositório:

```powershell
npm ci --ignore-scripts
npm run check
npm audit --audit-level=moderate
```

Os testes instalam o manifesto real em um **perfil temporário isolado** do Chrome e usam as APIs reais de armazenamento e mensagens. Páginas de teste HTTP/HTTPS e um iframe de outro domínio são atendidos localmente por interceptação de rede. Seu perfil habitual e suas páginas abertas não são usados. O tradutor nativo em si depende do serviço do navegador e não é acionado pela suíte.

Para usar o Chromium distribuído pelo Playwright:

```powershell
npx playwright install chromium --no-shell
$env:PLAYWRIGHT_CHANNEL = 'chromium'
npm test
```

Os testes usam a API de depuração de extensões apenas no processo temporário. Nenhuma opção de depuração é exigida para a instalação normal.

## Manutenção e segurança

CI executa lint, validação de manifesto/permissões/CSP, testes no navegador, auditoria das dependências de desenvolvimento e Gitleaks. CodeQL verifica JavaScript com consultas de segurança estendidas. Dependabot propõe atualizações de npm e GitHub Actions; as Actions são fixadas por SHA completo.

Veja [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md) e a [configuração das proteções do repositório](docs/repository-security.md).

## Licença

[MIT](LICENSE).

## Referências técnicas

- [Content scripts e frames no Chrome](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)
- [Atributo HTML translate](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/translate)
- [Armazenamento de extensões](https://developer.chrome.com/docs/extensions/reference/api/storage)
- [API de depuração usada pelos testes](https://chromedevtools.github.io/devtools-protocol/tot/Extensions/#method-loadUnpacked)
