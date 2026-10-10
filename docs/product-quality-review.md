# FleetLog — avaliação de produto e melhorias para revisão

2026-10-09. Esta rodada de melhorias e propostas de identidade **não será
commitada nem publicada** até revisão do usuário. O arquivamento reversível e
o botão + foram concluídos nos commits anteriores solicitados.

## Escopo entregue

O núcleo já é um produto integrado: acesso local temporário/OIDC com vinculação
explícita; garagem familiar e permissões; veículos e cor da tag; foto privada;
odômetro cronológico com auditoria; abastecimentos e consumo cheio a cheio;
manutenção direta/detalhada com referências e preços históricos; notas com
imagem opcional; compra/venda; despesas; histórico e gráficos por moeda;
URLs com recarga/Voltar; tabelas paginadas; arquivar/desarquivar.

A interface é uma PWA online. Os dados de domínio e imagens privadas não entram
no cache. Exportação, importação/offline, imagens em todos os outros registros,
lembretes e canais de notificação continuam em entregas separadas, conforme as
decisões anteriores; esta avaliação não redefine regras de negócio.

## Qualidade atual e evidências

**Persistência e autorização: base sólida para testes de uso.** Migrações
versionadas e transações; vínculo de garagem consultado por requisição; origem
em escritas; sessões e identidades externas preservadas. Valores são decimais
exatos, por moeda; correções de odômetro e lançamentos mudam atomicamente.
A integração S3 mantém reservas/fila de limpeza para tratar falhas.

**Funcionalidade: cobertura ampla do uso pessoal/familiar.** Fluxos reais
substituem mocks; a prévia continua isolada. Os formulários e leitura após
recarga, permissões/revogação, imagens e OIDC estão cobertos por testes locais.
A revisão anterior passou 62 testes Chromium desktop/mobile, além de Go com
PostgreSQL, build e vet. Arquivo/desarquivo foi validado separadamente.

**UI: evoluiu, mas o acabamento ainda precisa revisão humana.** Controles
compactos, hover compartilhado, ícones acessíveis, diálogos com rodapé fixo,
tabelas e paginação resolveram os principais desalinhamentos. Os campos
monetários mantêm precisão e máscara durante digitação. A identidade visual
usa a direção 04 escolhida pelo usuário, adaptada para SVG e cores semânticas
no header/splash. Os ícones PNG/maskable também usam o símbolo escolhido. A avaliação automatizada não substitui uso em dispositivos.

**Limites práticos.** S3/OIDC foram testados com fixtures de protocolo/provedor
assinado, não com o homelab real. HTTPS, instalação real da PWA e execução de
Playwright no CI seguem em validação/infra separada. As listas por veículo são
carregadas completas e paginadas na UI; o histórico geral já pagina na API.
Isso atende a garagem pessoal de teste, mas grandes históricos merecem uma
entrega de paginação por veículo antes de tratar volume como requisito.

## Melhorias propostas e implementadas nesta rodada

### 1. Carregamento visível e acessível

- Componente FlLoading com spinner, trilha animada e área reservada para reduzir saltos.
- Entrada/saída gradual dos loadings e transições curtas entre abas, preservando filtros entre Histórico/Custos.
- Spinner em botões que já têm estado loading; rótulo e aria-busy preservados.
- Sem bloquear leituras antigas com tela vazia desnecessária.
- Movimento desligado quando prefers-reduced-motion estiver ativo.

### 2. Abertura da aplicação e PWA

- Splash HTML/CSS antes de Angular carregar e componente equivalente durante
  a resolução de acesso, com FleetLog, animação discreta e mensagem curta.
- Fundo e cores seguem tokens de tema; preferência visual é aplicada antes da
  primeira renderização por script externo, sem cache de dados privados.
- Assets de abertura entram apenas no cache do shell.
- Modo standalone usa área disponível e safe-area, evitando texto perdido.
- Logo 04 no header e splash, com cor de destaque da paleta e tinta do tema.

A tela inicial nativa exibida pelo navegador/SO antes de carregar o HTML usa
manifest/ícones; sua aparência e timing não são controlados pelo Angular.
Ícones PNG/maskable foram gerados a partir do símbolo vetorial escolhido.
A validação de instalação em Android/iOS continua pendente; o navegador/SO
define a aparência da splash nativa, enquanto a splash HTML acompanha o tema.

### 3. Feedback das ações

- Confirmações continuam no diálogo do sistema.
- Alterações de registros mostram confirmação discreta de sucesso no veículo,
  com anúncio acessível; falhas conservam formulário e possibilidade de repetir.
- Arquivar/desarquivar mostra o estado atualizado e conserva os dados.

### 4. Segurança de revisão e identidade

- 20 conceitos originais gerados para revisão; a galeria permanece local e fora do bundle.
- Direção 04 escolhida pelo usuário e adaptada para vetor; imagem de referência
  preservada junto à documentação. Símbolo separado nos ícones PWA para legibilidade.

## Critérios de revisão do usuário

1. Abrir a aplicação e repetir login/logout com temas diferentes.
2. Criar e editar lançamento, conferir máscara/cálculo e erro recuperável.
3. Testar ações rápidas e detalhes por URL, recarga e Voltar/Avançar.
4. Usar as tabelas com mais de cinco registros e teclado no paginador.
5. Conferir diálogos em desktop/mobile e com redução de movimento.
6. Conferir logo em todas as paletas e os novos ícones ao reinstalar a PWA.

## Fora da implementação desta rodada

As limitações de infra e volume acima são requisitos para uma entrega futura,
não promessas de validação feita. Não criar novos workflows de família,
notificações, recuperação, importação/offline ou exportação sem definir seu
escopo com o usuário. Após revisão, o usuário autorizou commit e push das
melhorias de loading/transição e identidade escolhida.

## Validação da entrega com identidade 04

Build de produção concluído. A suíte geral passou 64 verificações desktop/mobile;
o teste de transição usava o nome anterior da animação e foi corrigido para
verificar Histórico e Custos separadamente. As quatro verificações de animação,
cor da logo e redução de movimento passaram na repetição (66 cenários únicos
validados no conjunto). Nenhuma validação de deploy/homelab foi executada.

## Correção da abertura PWA e recarga de rota interna

- O `<base href="/">` agora precede os assets iniciais. Antes, recarregar uma
  rota como `/garage/1/vehicles` fazia CSS/JS da splash serem buscados no caminho
  da rota, deixando a imagem sem tamanho/estilo na primeira renderização.
- A logo inicial tem dimensões explícitas, e a splash cobre a viewport sem
  deslocar cabeçalho/conteúdo. Carregamentos rápidos não exibem a animação de
  entrada antes de 180 ms; redução de movimento continua respeitada.
- O manifest mantém identidade `/`, usa fundo padrão petróleo e ícones
  versionados `fleetlog-v2-*`, incluídos no prefetch do shell. Também há
  apple-touch-icon apontando para a nova imagem.
- O navegador/SO cria a splash nativa a partir do manifest; ela usa a identidade
  padrão. A splash HTML usa o tema salvo. Uma instalação antiga pode conservar
  o ícone até o SO atualizar seus metadados; reinstalar renova essa identidade.
  Não foi validada uma instalação física Android/iOS nesta rodada.

Referência: https://web.dev/learn/pwa/web-app-manifest

Validação local: build de produção, 22 verificações gerais de acesso/PWA/
startup e quatro verificações de movimento após adaptar o teste ao overlay
fixo (24 cenários únicos desktop/mobile validados).

## Tema confirmado e identidade de instalação

- O seletor agora separa prévia de confirmação. Trocar paleta/modo só altera a
  tela; Cancelar, fechar, Esc e clicar fora restauram o tema de abertura.
- Confirmar grava uma única alteração. Falha da API mantém o diálogo aberto,
  sem mudar preferências locais nem identidade de instalação. Durante a gravação
  a confirmação e o fechamento ficam bloqueados para evitar resultados ambíguos.
- Os ícones PNG de 192/512 e manifests das 24 combinações são gerados a partir
  do símbolo vetorial e tokens compartilhados, por `web/tools/themed-icons.mjs`.
- `/manifest.webmanifest?theme=paleta-modo` é público e permite a instalação
  obter as imagens sem depender de cookies de sessão; `id`, scope e start_url
  continuam `/`. A URL só muda ao aplicar uma preferência já confirmada.
- Cookie visual auxilia a URL padrão; os valores são validados numa lista
  fechada. Manifest personalizado usa private/no-store e fica fora do cache
  estático do worker; as imagens têm URLs próprias e podem ser cacheadas.
- A prévia não seleciona outros ícones nem solicita atualização/instalação.
  Após confirmar, o PWA aberto como aplicativo mostra orientação de atualização.
  O navegador controla a atualização nativa; não há API do site para forçar
  desinstalação/reinstalação. Reinstalação manual usa o tema confirmado.

O build funciona, mas o bundle inicial está em 501,93 kB, ligeiramente acima
 do aviso de 500 kB. Dividir a prévia em carregamento sob demanda é uma melhoria
 futura; o limite não foi aumentado nesta entrega.

Validação desta entrega: 40 testes Chromium desktop/mobile passaram (tema,
prévia, persistência, erro recuperável, perfil, instalação e atualização PWA),
além dos testes Go e vet de httpserver. A demo local foi atualizada mantendo
os dados existentes. Instalação física no celular segue sob revisão do usuário.

## Lembretes internos entregues

Painel por veículo, tabela paginada, metas por km/calendário e avisos na garagem.
O atalho reutiliza manutenção e vincula no mesmo commit do banco; vínculo de
registro existente é idempotente. Correções, exclusões e dados ausentes ajustam
as metas sem inventar referências. Ver docs/maintenance-reminders.md.

Suíte Go/PostgreSQL e vet passaram; 12 cenários únicos desktop/mobile foram
validados. O módulo de lembretes é separado por carregamento sob demanda;
o bundle inicial ainda gera aviso (514,57 kB/500 kB), sem falha de compilação.
Notificações externas e implantação não fazem parte desta entrega.

## Revisão de experiência de registros — 2026-10-09

- Consulta de preços/itens externa à seção Manutenções foi ocultada; mantidos
  tabela e registro. O lançamento detalhado continua funcional, com atualização
  explícita do formulário após confirmação de troca de modo.
- Ações de tabelas não empilham: grupos compactos à direita, ícones uniformes e
  rolagem horizontal da tabela no mobile. Lembretes têm uma ação Realizar
  manutenção, abrindo o diálogo aprovado com Nova ou Existente.
- Avisos de lembretes ficam abaixo dos veículos; uma nova experiência segue no TODO.
- Datas exibidas usam locale, separando datas civis de timestamps para evitar
  deslocar o dia por fuso. API e controles de data conservam valores ISO.
- Snackbar flutuante com sucesso/erro de operações de escrita; leituras/filtros
  não geram mensagens. Usa camada popover para aparecer sobre diálogos, sem
  tirar o foco do formulário. Erros detalhados continuam nos campos/formulários.
- GETs usam indicador único, discreto e atrasado 180 ms; não inserem altura na
  tela e não removem tabelas já carregadas. A atualização de veículos também
  preserva o conteúdo enquanto busca novos dados.
- Dinheiro por centavos, da direita para a esquerda: 1234 vira 12,34. A máscara
  exibe pelo menos duas casas, preservando preços calculados de maior precisão.
  Valores negativos continuam permitidos apenas nos campos que já os aceitavam.
- Odômetro: a falha de retroativo no mesmo dia foi reproduzida. Como não há
  horário da leitura, usamos data, km dentro do dia e ID como desempate. A queda
  real entre dias e leitura abaixo do km inicial continuam bloqueadas. Leitura
  atual, consumo e lembretes seguem a mesma ordem. Criar/apagar abastecimentos
  remove suas leituras automaticamente e restaura o inicial quando não restam
  registros; testes também verificam ausência de leituras órfãs.

Validação: suíte Go/PostgreSQL completa e vet aprovados; 24 cenários únicos
Chromium desktop/mobile validados (22 principais mais dois de erro com diálogo).
Build concluído com aviso de bundle inicial: 519,59 kB/500 kB. Demo local
atualizada, com dados preservados. Alterações desta revisão ficam sem commit.

Ajuste de feedback — 2026-10-10: sucesso com barra regressiva de 2,5 segundos;
sucesso e indicador de GET entram/saem pela direita com fade. Fechamento manual
preserva a saída animada, e um novo GET durante a saída mantém o indicador.
Duração, barra regressiva, fechamento automático e saída do loading conferidos
no navegador local. Redução de movimento continua respeitada.
