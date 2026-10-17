# FleetLog UI

A UI usa componentes Angular standalone em `web/src/app/ui/` e tokens globais em `web/src/styles.css`. Importe os componentes pelo barrel `./ui`. Estilos de tela devem cuidar da composição; aparência e estados dos controles pertencem aos primitivos.

## Tipografia

| Papel            | Token             | Desktop | Celular | Uso                   |
| ---------------- | ----------------- | ------- | ------- | --------------------- |
| Título de página | `--text-page`     | 36 px   | 30 px   | h1 / FlPageHeading    |
| Título de card   | `--text-title`    | 24 px   | 24 px   | Nome do veículo       |
| Título de seção  | `--text-section`  | 20 px   | 20 px   | h2                    |
| Subtítulo        | `--text-subtitle` | 18 px   | 18 px   | Descrição da página   |
| Corpo            | `--text-body`     | 16 px   | 16 px   | Texto e inputs        |
| Rótulo           | `--text-label`    | 14 px   | 14 px   | Labels e botões       |
| Legenda          | `--text-caption`  | 12 px   | 12 px   | Datas, badges e ajuda |
| Indicador        | `--text-metric`   | 28 px   | 24 px   | FlStat                |

Os valores estão em rem para acompanhar a preferência de tamanho de fonte do navegador. Pesos: 400, 600 e 700. Corpo usa entrelinha 1,6; títulos 1,2–1,3; legenda 1,5. O breakpoint mobile é 700 px.

## Tokens e controles

Espaçamento: 4, 8, 12, 16, 20, 24, 32, 40, 48, 56 e 80 px (`--space-*`). Raios: controle 10 px, card 16 px, badge arredondado. Alturas: sm 36 px, md 44 px, lg 48 px; use md/lg para ações principais e toque. Cores semânticas: fundo, superfície, texto, texto secundário, borda, destaque, texto sobre destaque, destaque suave e erro. O tema escuro redefine cores, mantendo componentes e escala.

## Componentes

- `button[flButton]`: variantes primary, secondary, ghost e tab; tamanhos sm, md, lg e icon. `loading` bloqueia a ação e informa aria-busy; `disabled` bloqueia sem indicar carregamento. O conteúdo define a mensagem de carregamento. Botões de ícone precisam de aria-label. Abas usam aria-current="page" na opção ativa.
- `input[flInput]`, `textarea[flInput]`, `select[flInput]`: diretiva de aparência, com tamanho sm/md/lg. Mantém validação nativa, autocomplete e ngModel. Erro visual via aria-invalid ou ng-invalid + ng-touched.
- `fl-field`: controlId, label, hint e error. Associa label ao input e mostra ajuda/erro. Quando houver mensagem, passe `aria-describedby="ID-message"` no controle e aria-invalid em erro.
- `fl-card`: padding none/sm/md; superfície e borda padronizadas.
- `fl-badge`: marcador compacto com destaque suave.
- `fl-stat`: label, value e unit; indicador responsivo.
- `fl-page-heading`: title, eyebrow e descrição projetada; h1 semântico.
- `fl-vehicle-card`: componente de domínio, recebe VehicleSummary e emite activate.

```html
<fl-field controlId="name" label="Nome" hint="Como você identifica o veículo">
  <input
    flInput
    id="name"
    name="name"
    [(ngModel)]="name"
    aria-describedby="name-message"
    required
  />
</fl-field>
<button flButton variant="primary" type="submit" [loading]="saving()">
  {{ saving() ? 'Salvando…' : 'Salvar' }}
</button>
<fl-stat label="Odômetro" value="48.250" unit="km" />
```

Foco visível é compartilhado por botões, links e inputs. As transições respeitam preferência por movimento reduzido. Evite CSS da tela que sobrescreva tipografia ou estados internos dos primitivos; ajuste os tokens ou adicione uma variante tipada quando houver necessidade real.

- `fl-entry-list`: lista compartilhada entre histórico e detalhamento de custos; exibe veículo, placa, data, descrição e valor, incluindo estado vazio.
- `fl-pie-chart`: pizza SVG com categorias e seleção; fatias operáveis por mouse, Enter e Espaço e legenda com botões equivalentes. Emite `choose` com o tipo selecionado.

- `fl-date-range`: um controle com calendário para início/fim, destaque do intervalo, navegação entre meses e limpeza. Recebe `id`, `label`, `from`, `to`; emite `rangeChange`. Datas inclusivas; seleção em ordem inversa é normalizada. Fecha ao clicar fora ou pressionar Escape, restaurando foco ao controle.

- `fl-vehicle-select`: seletor compartilhado de veículo com label, opção todos e opções por placa. Recebe controlId, vehicles e value; emite valueChange.
- `format.ts`: formatadores compartilhados de moeda (centavos) e números; reutilizam instâncias de Intl.

## Paletas

O FleetLog oferece **24 paletas**, cada uma em modo claro e escuro (48 combinações). O padrão no primeiro acesso e para contas novas é **Grafite e laranja** (`orange`, `dark`). Preferências já salvas de usuários e visitantes são preservadas.

As paletas são: original, orange, blue, violet, green, rose, amber, cyan, red, lime, mono, copper, navy, emerald, lavender, magenta, ruby, sand, olive, arctic, indigo, mint, lemon e coral. Os nomes exibidos ficam em `web/src/app/ui/themes.ts`; os tokens ficam em `web/src/themes.css`.

Cada paleta define `--palette-light-*` e `--palette-dark-*`; o modo os mapeia para `--bg`, `--surface`, `--text`, `--muted`, `--line`, `--accent`, `--on-accent` e `--soft`. Componentes usam esses tokens semânticos. Gráficos usam `--chart-1/2/3`; tags de veículo mantêm a cor escolhida pelo usuário.

O `fl-theme-picker` apresenta as 24 amostras em uma janela rolável, com modos claro/escuro. Selecionar uma amostra aplica uma prévia; somente **Confirmar tema** persiste. Cancelar restaura o tema anterior. Usuários autenticados salvam no perfil; visitantes usam preferências locais separadas. Os ícones e manifests da PWA acompanham a confirmação.

Para adicionar paletas, atualize o catálogo, os tokens, a lista do script de inicialização, a validação do perfil e a seleção de manifest no backend. Adicione uma migração para ampliar a constraint do banco sem modificar migrações já aplicadas. `web/tools/themed-icons.mjs` descobre as paletas pelo CSS e gera ícones e manifests de ambos os modos. Confira contraste, foco, overflow mobile e preservação de preferências.

- `fl-dialog`: modal nativo reutilizável com title, corpo projetado rolável e slot `[flDialogFooter]`. Cabeçalho/título/X e rodapé permanecem fixos. Métodos show()/close(), evento closed; mantém foco/modalidade nativos, Escape e fechamento por backdrop. FlThemePicker usa este componente.

- `fl-install-pwa`: ação de instalar no header, oculta quando executado como app; usa prompt nativo capturado ou FlDialog com instruções do navegador. Referência: [beforeinstallprompt no MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeinstallprompt_event).

## Revisão de 2026-10-09

- FlCheckbox mantém input nativo/ngModel/teclado, com visual alinhado e tematizado.
- FlMoneyInput mantém string decimal exata, símbolo/grupos durante digitação,
  precisão adicional em preço unitário e negativos apenas quando permitidos.
- FlIcon padroniza calendário, copiar/editar/excluir e ações rápidas.
- FlTablePager usa cinco registros por padrão, com 10/25/50 e navegação acessível.
- FlDialog usa rodapé fixo com grupo fl-dialog-actions (gap 8px, cancelar antes
  da ação primária), tamanhos sm/md/lg e host sem interferência no layout.
- Confirmation substitui confirm nativo por diálogo do sistema.
- Controles compartilham control-hover-bg/control-hover-border; alvos compactos
  no desktop e ampliados para ponteiro touch. Tab ativa permanece identificada.
- Cards reais usam imagem/texto 75/25 e ações independentes sobre a imagem,
  mantendo um único botão principal e evitando botões aninhados.
- Rotas reais: /garage/:garageId/vehicles, /history, /costs, /members e
  /garage/:garageId/vehicles/:vehicleId. Recarregar e voltar conservam a tela.
