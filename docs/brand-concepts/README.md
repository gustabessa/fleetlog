# Identidade FleetLog

O usuário escolheu o conceito **04 — Vehicle ledger**: silhueta de carro com
linhas de registro e confirmação. A referência está em [options/04.png](options/04.png).

A adaptação vetorial está em web/src/app/ui/logo.ts e web/public/logo.svg.
O componente usa texto/cor de destaque do tema. O SVG externo usa as cores originais
para favicon e geração dos PNG/maskable. Para regenerar, execute no diretório web:

`node tools/brand-icons.mjs`

Isso exige o Chromium do Playwright disponível. Os demais conceitos e a galeria
ficam versionados como material de exploração do projeto, fora do bundle do app.

Para os ícones de cada tema confirmado, execute `node tools/themed-icons.mjs`
no diretório web. Ele lê os tokens de `src/themes.css` e gera 24 manifests e
48 PNGs (192/512). A preferência em prévia não altera os assets escolhidos.
