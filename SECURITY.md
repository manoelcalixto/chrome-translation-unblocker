# Política de segurança

## Versões suportadas

A versão estável mais recente recebe correções. No momento, a versão suportada é **1.0.x**.

## Relatar uma vulnerabilidade

Use [Report a vulnerability](https://github.com/manoelcalixto/chrome-translation-unblocker/security/advisories/new) para enviar um relato privado ao mantenedor. Não publique credenciais, dados pessoais ou detalhes de exploração em issues públicas.

Inclua a versão afetada, passos para reproduzir com dados sintéticos, comportamento observado e impacto. Um exemplo HTML mínimo costuma ser suficiente; não é necessário enviar conteúdo de sites privados.

## Limites de confiança

- O HTML do site é entrada não confiável. Ele não deve ser executado ou encaminhado a serviços pela extensão.
- O content script roda em mundo isolado e só altera marcações específicas do DOM.
- Mensagens externas de páginas e extensões de terceiros não são habilitadas.
- O painel utiliza arquivos locais e uma Content Security Policy que bloqueia scripts remotos e conexões de rede.
- A configuração persistente contém somente um booleano. Não armazene conteúdo de páginas, tokens ou URLs.
- Ampliações de permissão ou coleta de dados exigem justificativa, testes e atualização da política de privacidade.

Os controles e testes reduzem riscos; não constituem promessa de ausência de vulnerabilidades. Consulte [as proteções do repositório](docs/repository-security.md) para a configuração de manutenção.
