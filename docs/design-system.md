# FleetLog UI

A UI usa componentes Angular standalone em `web/src/app/ui/` e tokens globais em `web/src/styles.css`. Importe os componentes pelo barrel `./ui`. Estilos de tela devem cuidar da composição; aparência e estados dos controles pertencem aos primitivos.

## Tipografia

| Papel | Token | Desktop | Celular | Uso |
|---|---|---|---|---|
| Título de página | `--text-page` | 36 px | 30 px | h1 / FlPageHeading |
| Título de card | `--text-title` | 24 px | 24 px | Nome do veículo |
| Título de seção | `--text-section` | 20 px | 20 px | h2 |
| Subtítulo | `--text-subtitle` | 18 px | 18 px | Descrição da página |
| Corpo | `--text-body` | 16 px | 16 px | Texto e inputs |
| Rótulo | `--text-label` | 14 px | 14 px | Labels e botões |
| Legenda | `--text-caption` | 12 px | 12 px | Datas, badges e ajuda |
| Indicador | `--text-metric` | 28 px | 24 px | FlStat |

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
  <input flInput id="name" name="name" [(ngModel)]="name"
         aria-describedby="name-message" required />
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

Dez paletas em `web/src/themes.css`: original, orange, blue, violet, green, rose, amber, cyan, red e lime. Cada uma define tokens `--palette-light-*` e `--palette-dark-*`; o modo os mapeia para `--bg`, `--surface`, `--text`, `--muted`, `--line`, `--accent`, `--on-accent` e `--soft`. Componentes continuam usando tokens semânticos. Gráficos usam `--chart-1/2/3`; tags de veículo mantêm a cor escolhida pelo usuário.

Catálogo de nomes em `ui/themes.ts`. O botão percorre claro/escuro de cada paleta e retorna à original depois de 20 cliques. Preferências em `fleetlog.palette` e `fleetlog.theme`; preserva a preferência anterior de modo. Para adicionar um tema, incluir seus dois conjuntos de tokens e uma entrada no catálogo.

O ciclo de cliques foi substituído por `fl-theme-picker`: janela modal nativa com dez amostras, modos claro/escuro e seleção imediata persistida no navegador. Recebe palette/dark e emite select. As amostras usam os mesmos tokens da paleta, sem duplicar hexadecimais.

- `fl-dialog`: modal nativo reutilizável com title, corpo projetado rolável e slot `[flDialogFooter]`. Cabeçalho/título/X e rodapé permanecem fixos. Métodos show()/close(), evento closed; mantém foco/modalidade nativos, Escape e fechamento por backdrop. FlThemePicker usa este componente.

- `fl-install-pwa`: ação de instalar no header, oculta quando executado como app; usa prompt nativo capturado ou FlDialog com instruções do navegador. Referência: [beforeinstallprompt no MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeinstallprompt_event).
