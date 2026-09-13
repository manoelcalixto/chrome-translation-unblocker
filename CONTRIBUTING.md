# Como contribuir

Abra uma issue com o problema ou proposta e envie alterações em uma branch própria por pull request.

1. Instale Node.js 24+ e Chrome.
2. Execute `npm ci --ignore-scripts`.
3. Faça uma alteração focada e adicione teste quando o comportamento justificar.
4. Execute `npm run check` e `npm audit --audit-level=moderate`.
5. Para mudanças no painel, confira a apresentação no Chrome e inclua evidência com dados sintéticos.

Não envie perfis de navegador, cookies, capturas de páginas privadas, credenciais ou dependências instaladas. A pasta distribuída é `extension/`; ferramentas de desenvolvimento ficam fora dela.

A suíte usa um perfil temporário separado e URLs fictícias. Não substitua esses testes por automação de páginas autenticadas.

Os pull requests devem passar pelas verificações exigidas, resolver as conversas de revisão e manter um histórico linear. Atualizações de dependências seguem o mesmo processo. Não habilite execução de código de forks em eventos privilegiados como `pull_request_target`.

Ao mudar uma GitHub Action, use o SHA completo de um commit verificável e atualize o comentário da versão. A publicação de uma nova versão ou na loja do navegador é uma etapa separada da integração de código.

Para vulnerabilidades, consulte [SECURITY.md](SECURITY.md).
