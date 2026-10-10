# FleetLog — andamento

Atualizado em 2026-10-08. Produto T01–T12 e OIDC implementados/validados localmente. Plano de produto: [docs/FleetLog-plan.md](docs/FleetLog-plan.md).

## Decisões de implementação

- Serviços Compose: `fleetlog-service` (aplicação) e `fleetlog-db` (PostgreSQL); volume existente `postgres_data` preservado.

- A implementação foi autorizada em 2026-10-07, substituindo a pausa do plano original.
- Aprovado mediante viabilidade: Go servindo o bundle Angular, PostgreSQL e cliente S3 compatível com RustFS. SPA/PWA servida pelo Go é viável; HTTPS fica no proxy do Dokploy.
- PWA online na v1. Cache somente dos arquivos da aplicação; sem cache de dados privados ou lançamentos offline.
- RustFS é uma opção de provedor; integração e versão ainda precisam ser validadas.
- As regras marcadas como propostas no plano permanecem pendentes.

## Próximas tarefas por prioridade

Núcleo do produto entregue: T01–T12 e OIDC com código integrado e validação local. Esta fila preserva a sequência das entregas; infraestrutura e melhorias sem escopo aprovado permanecem separadas. Commits locais por tarefa, sem push nesta rodada.

### P0 — confirmar a base antes de integrar dados reais

- [x] **T01 — validar acesso após as mudanças de UI (localmente, 2026-10-07).** Rodar suíte completa com PostgreSQL; conferir login, sessão após recarga, logout, erros e acesso à garagem vazia. Corrigir regressões encontradas. Confirmar readiness/configuração da versão implantada quando houver acesso ao ambiente. Dependência: nenhuma nova funcionalidade.

### P1 — conseguir cadastrar e consultar o primeiro veículo real

- [x] **T02 — garagem base e autorização (2026-10-07).** Migração de garagem/vínculo com usuário; associar primeiro usuário à garagem; disponibilizar consulta de contexto e proteção reutilizável para APIs. Testar isolamento entre garagens. Gestão de familiares permanece separada e exige aprovação das permissões.
- [x] **T03 — veículos básicos ponta a ponta (2026-10-08).** Campos aprovados: nome/modelo e km inicial obrigatórios; placa, marca, ano, chassi e RENAVAM opcionais; cadastro, listagem, detalhes e edição reais com identificadores próprios (chassi/RENAVAM), km inicial preservado e integração das telas. Placeholder de imagem até T09. Depende de T02; ações de exclusão/arquivamento dependem de definição própria.
- [x] **T04 — perfil, moeda e preferências (2026-10-08).** Persistir moeda padrão e preferências de tema já previstas; integrar API/UI. Estabelecer representação decimal e moeda por registro para os formulários de preço. Não alterar moedas históricas. Necessário antes dos lançamentos financeiros.
- [x] **T05 — odômetro e regras de alteração.** Aprovar cronologia, retroatividade/correção e efeitos de editar/excluir registros; implementar histórico, autoria/origem e leitura atual. Depende de T03; abastecimentos/manutenções usam esta base.

### P2 — registrar o uso cotidiano

- [x] **T06 — abastecimentos reais.** Formulário no contexto do veículo, data/litros/preço/moeda/km, consulta/edição/exclusão e histórico. Consumo depende de método aprovado; concluir casos de tanque parcial/intervalo incompleto antes de apresentar km/L. Depende de T03–T05.
- [x] **T07 — manutenção com total direto.** Registro real sem exigir itens, com edição/consulta/exclusão e integração ao histórico/odômetro. Dependências: T03–T05. Detalhamento/reutilização de itens segue em T08.
- [x] **T08 — peças, mão de obra e preços históricos.** Segundo modo de manutenção, referências reutilizáveis e pesquisa/comparação por item. Aprovar descontos, unidades/escopo e moedas diferentes; garantir que detalhamento não duplica total. Depende de T07.
- [x] **T09 — imagens reais de veículos.** Cliente S3/RustFS, upload/substituição/remoção, metadados e leitura privada autorizada, com limites/validação. Depende de T02/T03; pode avançar em paralelo à sequência de lançamentos sem bloquear formulários.
- [x] **T10 — notas, compra/venda e documentação.** Entregas separáveis: notas livres; dados de aquisição/venda após definição de obrigatoriedade/arquivamento; despesas de impostos/licenciamento/taxas com tipo/moeda. Notas não substituem chassi/RENAVAM. Dados financeiros dependem de T04.

### P3 — consolidar histórico, análises e acesso familiar

- [x] **T11 — histórico integrado e gráficos reais.** Busca/filtros/paginação e agregações dos lançamentos existentes; listas/gráficos coerentes, moedas separadas e gastos contabilizados uma vez. Aproveitar componentes da prévia, substituindo mocks e estimativas. Depende dos tipos de lançamento entregues; evoluir junto deles sem esperar todas as categorias.
- [x] **T12 — inclusão de familiares e permissões.** Aprovar como incluir/remover usuários e quais ações cada membro pode fazer; gestão de acesso e testes de garagem compartilhada. Depende de T02. Pode ser antecipada se o próximo teste de uso já envolver a família.

### Entrega a definir e melhorias futuras

- OIDC configurável: requisito confirmado, data de entrega pendente; pode ser antecipado se login com provedor for necessário para uso.
- Troca/recuperação de senha e backup/restauração: propostas a definir antes de depender de dados reais no uso contínuo.
- Instalação PWA real/HTTPS e CI de navegador: validação transversal, não exigir nova rodada de polimento visual para cada funcionalidade.
- Exportação, lembretes e multiarch: escopo/prioridade ainda a aprovar.
- Importação e offline: backlog, fora da prioridade atual de construir o produto.

## Etapa 1 — base executável (implementada; validação de implantação pendente)

- [x] Incorporar o plano ao repositório.
- [x] Gerar projeto Angular com roteamento.
- [x] Criar servidor Go com encerramento gracioso e health check.
- [x] Separar rotas da API do fallback SPA e evitar HTML para assets ausentes.
- [x] Configurar manifest, ícones e service worker Angular.
- [x] Criar shell responsivo com temas claro/escuro e estado inicial da garagem.
- [x] Criar Dockerfile multi-stage e Compose com PostgreSQL persistente.
- [x] Documentar configurações reais em `.env.example` e README.
- [x] Validar build Angular, testes Go e integração SPA/PWA.
- [x] Testes Chromium desktop/mobile: layout, temas persistentes e rotas sem erros.
- [x] Validar service worker e atualização com aviso e recarga mediante clique.
- [x] Corrigir health check com endereço explícito e resposta JSON para `/api`.
- [x] Remover referências a outro produto dos Markdown; apresentar como sistema de gestão de veículos.
- [ ] Executar pull/health checks Docker Compose (Docker Engine indisponível neste ambiente).
- [ ] Validar HTTPS no Dokploy e instalação PWA em dispositivos reais.

Checklist de implantação: [docs/deployment-checklist.md](docs/deployment-checklist.md).

## CI separado — Woodpecker + GHCR + Dokploy

Direção escolhida pelo usuário: Woodpecker self-hosted faz testes/build e publica no GHCR; Dokploy usa Compose para consumir uma imagem versionada. Sem Application permanente como builder e sem GitHub Actions. Promoção inicial manual pelo SHA do commit.

- Instalação do Woodpecker gerenciada no painel Dokploy; Compose de infraestrutura removido do repositório a pedido do usuário.
- [x] Preparar pipeline Go test/vet + build Dockerfile + publicação `main` e `sha-COMMIT` no GHCR.
- [x] Preparar Compose de produção com imagem publicada, sem build.
- [x] Validar Compose de produção com CLI, sem iniciar serviços.
- Orientações de instalação fornecidas no chat; tutorial fora do repositório conforme pedido do usuário.
- [x] Configurar OAuth App e habilitar repositório no Woodpecker (confirmado pelo usuário).
- [x] Enviar pipeline ao remoto e disparar push em main (commit b19789a); execução da versão atual ainda a conferir.
- [ ] Instalar Woodpecker no homelab e confirmar agente conectado.
- [ ] Cadastrar secrets GHCR com evento push; filtro de imagem omitido nesta versão porque o validador rejeita tags com pontos.
- [ ] Executar primeiro build/publicação e confirmar pacote GHCR.
- [ ] Configurar credenciais de pull no Dokploy se imagem privada.
- [ ] Implantar Compose com SHA publicado e validar HTTPS/PWA.
- [ ] Validar promoção/rollback entre versões.
- [ ] Adicionar testes Playwright ao CI — infraestrutura/CI fora desta rodada; testes locais entregues.
- [ ] Avaliar deploy automático via webhook após build e builds multiarch.

Pipeline: [.woodpecker/build.yaml](.woodpecker/build.yaml). Produção: [compose.registry.yaml](compose.registry.yaml).

## Como acompanhar cada entrega

Ordem técnica proposta: garagem/perfil → veículos/odômetro/imagens → abastecimentos → manutenção/itens → despesas → histórico/gráficos. Definições de produto pendentes devem ser resolvidas antes dos cálculos e regras afetados.

Cada área passa por três estados: **prévia visual → API/persistência integrada → validada**. Marcar funcionalidade como concluída exige salvar dados reais, consultá-los após recarregar, verificar autorização e testar as regras relevantes. Testes com dados mockados validam a interface, não a persistência nem os cálculos do produto.

## Etapa 2 — acesso, garagem e perfil

- [x] Conexão PostgreSQL com pool de 4 e migração inicial transacional/versionada.
- [x] Primeiro usuário via bootstrap, senha bcrypt e reinício sem recriar conta.
- [x] Login/logout com sessões persistentes, expiração, rotação e revogação.
- [x] Cookies HttpOnly/Secure, proteção por origem/JSON e limite de tentativas.
- [x] Testes de integração de autenticação e testes de navegador antes da refatoração visual.
- [x] Reexecutar suíte completa com PostgreSQL após as mudanças de UI/mock/design system (T01: 34 testes Chromium desktop/mobile aprovados).
- [x] Criar modelo/migração de garagem e vínculo dos membros com usuários internos; bootstrap e upgrade preservam contas/sessões.
- [x] Definir permissões e forma de inclusão de familiares antes de entregar gestão de membros.
- [x] Implementar inclusão/remoção de membros conforme a regra aprovada, com login individual.
- [x] Criar proteção reutilizável de sessão/vínculo e aplicá-la às APIs de consulta de garagem.
- [x] Aplicar proteção de garagem às futuras APIs de veículos/lançamentos e ao acesso S3.
- [x] Testar que membros da mesma garagem consultam os mesmos dados e outras garagens não têm acesso, incluindo revogação do vínculo com sessão ativa.
- [x] Implementar perfil com moeda padrão inicial BRL e alteração da preferência.
- [x] Fazer seleção de moeda em toda entrada de preço, preenchida pelo perfil.
- [x] Guardar moeda e valor decimal no registro; mudar perfil não altera histórico.
- [x] Integrar telas de acesso/perfil/garagem ao design system e validar estados de erro/carregamento.

## Etapa 3 — veículos, informações e odômetro

- [x] Definir cadastro básico T03: nome/modelo e km inicial obrigatórios; placa, marca, ano, chassi e RENAVAM opcionais (aprovado pelo usuário em 2026-10-08).
- Compra/venda, notas livres, fotos e alteração do odômetro ficam nas tarefas seguintes (T10/T09/T05); recursos mantidos no escopo, fora desta entrega.
- [x] Definir obrigatoriedade de compra/venda na T10.
- [x] Criar migração 003 e API de cadastro, listagem, consulta e edição de veículo vinculado à garagem.
- [x] Persistir quilometragem inicial decimal e preservá-la na edição básica.
- [x] Implementar histórico e quilometragem atual na T05, separados do km inicial.
- [x] Registrar data/valor/moeda de compra e venda; proprietários anterior/novo opcionais.
- [x] Implementar chassi e RENAVAM como campos próprios nas informações/cadastro do veículo, separados das notas; persistir como texto para preservar zeros iniciais.
- [x] Manter notas/anotações do veículo como recurso separado; definir formato e quantidade antes da implementação.
- [x] Copiar chassi e RENAVAM com um clique e confirmação visual.
- [x] Estender cópia a outros identificadores conforme forem necessários.
- [x] Integrar home com veículos reais, nome/modelo e badge de km inicial no canto superior esquerdo.
- [x] Substituir ilustração placeholder por fotos reais na T09.
- [x] Integrar consulta/edição de detalhes reais ao veículo selecionado.
- [x] Manter contexto ao iniciar lançamentos na T06/T07.
- [x] Definir arquivamento/venda e política de exclusão de veículo com histórico antes dessas ações.
- [x] Definir regra cronológica de odômetro e tratamento de inconsistências/leituras retroativas.
- [x] Persistir leituras e suas origens; definir autoria/rastreabilidade de correções conforme decisão aprovada.
- [x] Recalcular km atual ao editar/excluir lançamento conforme regras aprovadas, preservando km inicial.
- [x] Validar edição, retroatividade, venda e identificadores com zeros iniciais em testes de integração.

## Etapa 3 — imagens dos veículos

- [x] Implementar cliente S3 configurável (endpoint, região, bucket, credenciais e path-style).
- [x] Persistir metadados no PostgreSQL e objetos em bucket privado.
- [x] Definir formatos/tamanho máximo e validar conteúdo de upload.
- [x] Implementar upload, leitura autorizada, substituição e remoção de imagem de veículo.
- [x] Tratar falhas entre banco e S3 sem referências quebradas ou objetos abandonados.
- [x] Mostrar placeholder quando veículo não tem imagem.
- [ ] Validar operações necessárias em uma versão fixada do RustFS.
- [x] Documentar variáveis reais do cliente e configuração separada do servidor S3.
- [ ] Definir outros anexos (itens/manutenção/comprovantes) separadamente; só imagens de veículo entram nesta etapa.

## Etapa 4 — abastecimentos e consumo

- [x] Aprovar campos complementares e cálculo de consumo antes de implementar métricas.
- [x] Criar modelo/API para data, litros, preço/moeda e odômetro do abastecimento.
- [x] Abrir formulário na tela do veículo com veículo já definido, sem nova seleção.
- [x] Definir relação entre total e preço por litro, precisão e arredondamento.
- [x] Implementar cadastro, consulta, edição e exclusão com atualização coerente de odômetro/custos.
- [x] Integrar formulário e histórico de abastecimentos com dados reais.
- [x] Implementar km/L e histórico somente para intervalos válidos conforme método aprovado.
- [x] Se aprovado tanque cheio a tanque cheio: considerar parciais intermediários e primeiro registro como referência.
- [x] Definir como indicar dados insuficientes, abastecimentos ausentes e leituras inválidas.
- [x] Testar retroatividade/edição/exclusão e evitar métricas enganosas ou dupla contabilização.

## Etapa 5 — manutenção, itens e preços

- [x] Aprovar composição de moedas diferentes, descontos e ajustes.
- [x] Criar modelo/API de manutenção com veículo, data e campos aprovados de descrição/odômetro.
- [x] Implementar modo total direto, sem exigir cadastro de itens/suprimentos.
- [x] Implementar modo detalhado com peças e mão de obra somadas pelo sistema.
- [x] Tornar itens opcionais; definir troca entre modos sem contabilizar os dois totais.
- [x] Definir identificação/unidade/escopo do item reutilizável antes da migração de catálogo.
- [x] Implementar referência reutilizável separada da ocorrência e seu preço histórico, se aprovado esse modelo.
- [x] Reaproveitar item de revisão anterior em nova revisão sem modificar registros passados.
- [x] Selecionar moeda em cada preço de peça, mão de obra e total, conforme regras aprovadas.
- [x] Implementar cadastro, consulta, edição/exclusão e integração com odômetro/custos.
- [x] Buscar item e consultar/comparar preços entre revisões com data, veículo e moeda.
- [x] Integrar formulários e histórico real; testar composição do total e preservação de preços históricos.

## Etapa 6 — documentação e outras despesas

- [x] Definir tipos/subtipos iniciais e necessidade de personalização.
- [x] Criar modelo/API para data, veículo, descrição, tipo e valor/moeda de despesa.
- [x] Permitir lançar impostos, licenciamento e outras taxas de documentação.
- [x] Implementar cadastro, consulta, edição e exclusão, com autorização por garagem.
- [x] Integrar lançamentos de documentação ao histórico e às análises.
- [x] Fazer manutenção e abastecimento alimentarem gastos automaticamente, sem despesa duplicada.
- [x] Testar que itens/mão de obra são detalhamento, não somados novamente ao total da manutenção.

## Etapa 7 — histórico e análises

- [x] Confirmar critérios de filtros/gráficos a partir da prévia antes do contrato de API.
- [x] Integrar histórico unificado de abastecimentos, manutenções e despesas com dados persistidos.
- [x] Implementar busca, filtros aprovados por veículo/tipo/período, ordenação e paginação.
- [x] Definir inclusão de dias-limite, fuso/data dos registros e comportamento de intervalo inválido.
- [x] Confirmar se filtro por preço da prévia usa tolerância de ±10%; considerar moeda no filtro real.
- [x] Entregar gráficos por tipos de gasto e demais análises aprovadas, com filtros coerentes com a lista.
- [x] Separar totais/comparações por moeda; sem conversão cambial automática.
- [x] Calcular indicadores a partir de registros reais; não transportar distâncias estimadas do mock para métricas reais.
- [x] Validar atualização de listas/gráficos após criação, edição e exclusão de registros.
- [x] Testar períodos vazios, diferentes moedas, duplicação de gastos e autorização dos agregados.

## OIDC — entregue e validado

- [x] Reservar identidades externas pelo par issuer + subject, relacionadas ao usuário interno.
- [x] Definir momento de entrega, convivência com login local e vinculação explícita de contas.
- [x] Implementar discovery/issuer, client ID, secret quando aplicável, scopes e callback configuráveis.
- [x] Validar state, nonce, PKCE e tokens no fluxo apropriado; reutilizar sessão interna após autenticação.
- [x] Tratar troca de issuer sem associação automática por e-mail.
- [x] Documentar configurações efetivas e testar com provedor substituível.

## Validação de cada entrega

- [x] Formularios com seleção de moeda, validação e mensagens coerentes entre frontend/backend.
- [x] Estados de carregamento, vazio, erro e sucesso; impedir envios duplicados.
- [x] Confirmar persistência após recarga e autorização também em chamadas diretas à API.
- [x] Validar navegação responsiva, labels, teclado, temas e operações online da PWA.
- [x] Testes relevantes de regras de negócio e integração PostgreSQL/S3 quando envolvidos.
- [x] Atualizar .env.example/README/TODO conforme novos contratos e parâmetros reais.

## Decisões de produto — aprovadas e pendências separadas

- [x] Familiares: criador administra acesso; membros alteram dados; contas/autoria preservadas na remoção.
- [x] Veículo básico T03; compra/venda opcionais; venda arquiva; exclusão somente sem histórico.
- [x] Notas: múltiplas anotações de texto livre, separadas de identificadores.
- [x] Odômetro: cronologia, retroativos coerentes, imutabilidade de km inicial e auditoria; autoria da sessão/origem automática.
- [x] Consumo cheio a cheio, parciais, sinalização de intervalo incompleto e métricas somente válidas.
- [x] Manutenção direta/detalhada, mesma moeda, desconto/ajuste e confirmação de troca de modo.
- [x] Itens por garagem, referência separada da ocorrência e preços históricos preservados.
- [x] Tipos/subtipos fixos nesta entrega; sem categorias personalizadas.
- [x] Filtros/gráficos reais e preço ±10% por moeda; distância observada, sem mock.
- [x] OIDC entregue junto do login local temporário com vinculação explícita.
- [ ] Campos personalizados, idioma adicional e anexos além de fotos do veículo: escopo não aprovado, fora do núcleo desta rodada.

## Complementos propostos — prioridade/escopo a aprovar

Estas tarefas registram lacunas operacionais identificadas na revisão; não alteram os requisitos confirmados do plano.

- Troca de senha local retirada desta rodada pelo usuário; recuperação administrativa sem fluxo aprovado, fora da entrega.
- [ ] Planejar backup/restauração de PostgreSQL e S3 e executar restauração de teste.
- [ ] Exportação JSON/CSV e extras: usuário decidiu deixá-los para outra tarefa em 2026-10-08; não implementar nesta rodada.
- [x] Implementar painel de lembretes por veículo e avisos internos por km/data; atalho reutiliza manutenção existente, com vínculo e renovação atômicos. Notificações/canais e adiamento seguem pendentes. Regras e TODO detalhado: [docs/maintenance-reminders.md](docs/maintenance-reminders.md), conforme pedido de tarefa separada.

## Backlog — depois do núcleo do produto

- [ ] Importar histórico de outros sistemas: desejo futuro confirmado pelo usuário, sem prioridade na versão atual. Definir formato, mapeamento, moedas/unidades, validação e duplicatas quando essa etapa começar.
- [ ] Offline: definir dados disponíveis localmente.
- [ ] Lançamentos offline e sincronização com tratamento de conflitos.

## Ponto de retomada

Núcleo T01–T12 e OIDC implementado e validado localmente: 58 testes de navegador
mais 14 rechecagens dos formulários; testes Go/PostgreSQL, build e vet aprovados.
Os dois Compose encaminham todas as variáveis das integrações S3/OIDC.

Antes de retomar: conferir git status, README e decisões atuais acima.
Pendências externas: publicar imagem contendo os commits atuais, atualizar o
Raw Compose do Dokploy, configurar bucket privado/provedor OIDC e recriar a
aplicação. Nenhum push/deploy feito nesta rodada. Testes reais RustFS/HTTPS/PWA
instalada e CI de navegador continuam separados; exportação/extras adiados pelo usuário.

As seções abaixo registram o histórico das entregas; descrições antigas de
funcionalidades pendentes não substituem o estado atual acima.

## Prévia de UI — 2026-10-07

- Botão de tema somente com ícone e nome acessível; rodapé com a frase solicitada.
- Prévia navegável de garagem, detalhes de dois veículos, histórico e custos. Dados de exemplo indicados na interface, sem gravação na API.
- Acesso pela tela de login em “Explorar prévia da garagem” e pela garagem autenticada em “Explorar próximas telas”.
- Build Angular aprovado; aviso de orçamento CSS do componente (7,44 kB / aviso em 4 kB, limite de erro 8 kB). Extrair telas em componentes conforme evoluir a implementação.
- Teste de navegação da prévia aprovado em Chromium desktop/mobile com API de autenticação mockada; inspeção visual da garagem nos temas claro/escuro concluída.

## Design system — 2026-10-07

Primitivos Angular standalone em `web/src/app/ui`: botão nativo com variantes/tamanhos/loading, diretiva para inputs nativos, field com label/ajuda/erro, card, badge, stat, cabeçalho de página e card de veículo. Tokens de tipografia, espaçamento, raios, alturas e cores em `web/src/styles.css`; aplicados ao login e às telas de prévia. Estilos de composição separados entre shell e prévia. Guia: `docs/design-system.md`.
Build sem avisos de orçamento; quatro testes da prévia/primitivos aprovados em Chromium desktop/mobile, com autenticação mockada. Verificados: navegação, labels, obrigatoriedade nativa do login, envio via Enter, estado loading/disabled e seleção da navegação. A suíte completa com PostgreSQL não foi executada nesta refatoração de UI.

Prévia revisada: frases decorativas retiradas dos cabeçalhos; veículos antes dos indicadores da garagem. Histórico com busca sem distinção de acentos, filtro de veículo/tipo e datas inclusivas, limpar filtros e estados vazio/intervalo inválido. Custos com pizza interativa e listagem filtrada por fatia + veículo, ambas derivadas dos mesmos lançamentos de setembro. Lista de lançamentos e pizza extraídas em componentes reutilizáveis. Seis testes Chromium desktop/mobile aprovados, incluindo filtros combinados e pizza via teclado; build aprovado sem avisos.

Prévia: filtro de preço no histórico com faixa inclusiva de ±10%, calculado localmente até a integração backend. Dropdown nativo com seta afastada da borda. Cor de tag configurável na tela de veículo (estado em memória), com contraste de texto calculado; aplicada às listas de histórico/custos. Custos com filtro mês/ano, incluindo distância de exemplo por mês, e estado vazio. Fatias da pizza sem outline retangular em foco/active; foco por teclado preservado no contorno da fatia. Build e oito testes Chromium desktop/mobile aprovados, incluindo faixa de preço, troca de cor/período e outline.

Histórico e Custos agora compartilham FlDateRange, calendário de intervalo em um único controle. Custos filtra datas inclusivas, com resumo do intervalo e limpeza; distância de exemplo proporcional aos dias selecionados, identificada como estimativa. Build e oito testes desktop/mobile aprovados usando os calendários.

Revisão de componentização: seletor de veículo extraído e compartilhado por histórico/custos; moeda centralizada; login e estado vazio usam FlCard em section nativa; removidos formatter sem uso e CSS antigo. Corrigida precedência do layout mobile de custos. Seletor de período usa o mesmo fundo dos inputs. Build aprovado; testes desktop e mobile aprovados nas validações da revisão.

Temas: dez paletas claro/escuro (20 combinações) com tokens compartilhados em themes.css e catálogo em ui/themes.ts. Botão de tema percorre combinações; nome no tooltip, preferência persistida. Gráficos seguem tokens da paleta e tags de veículo preservam configuração própria. Build aprovado; teste de ciclo completo/persistência aprovado em desktop/mobile.

- [x] Persistir paleta e modo claro/escuro no perfil (T04); localStorage mantém cache visual/seleção anônima, perfil autenticado prevalece.
      Seletor de tema em janela modal reutilizável FlThemePicker: dez amostras visuais com cores derivadas dos tokens de cada paleta, seleção direta, claro/escuro e fechamento via Concluir/Escape/clique no backdrop. Testes de todas as combinações e persistência aprovados em desktop/mobile.

Paletas adicionais: Preto e cinza (mono) e Petróleo e cobre (copper), com versões clara/escura. Total: 12 paletas / 24 combinações; build e seleção/persistência desktop/mobile aprovados.

Dialog extraído em FlDialog reutilizável, com cabeçalho/rodapé fixos e corpo rolável. Seletor de temas usa projeção de conteúdo/ações. Build e quatro testes de seleção/persistência e posição fixa durante rolagem aprovados desktop/mobile.

Instalação PWA: FlInstallPwa no header fora do modo standalone/fullscreen/minimal-ui e Safari standalone. Usa beforeinstallprompt quando disponível; fallback de orientação em FlDialog e instruções Safari/iOS. Oculta ao receber appinstalled; listeners removidos no destroy. Build aprovado; quatro testes desktop/mobile com prompt e display-mode simulados aprovados. Instalação real/HTTPS ainda exige validação no dispositivo.

Range picker: posicionamento medido pela viewport visível (inclui visualViewport), abre acima quando não cabe abaixo. Caso não caiba inteiro, limita altura ao lado com mais espaço e usa scroll interno. Reposiciona em scroll/resize e mudança de mês; alinhamento horizontal limitado à tela. Build e oito testes desktop/mobile de posicionamento, seleção e fechamento aprovados.

Barra da PWA: theme-color atualizado a partir de --surface ao aplicar/restaurar o tema. HTML/manifest usam branco como fallback inicial. Build e testes desktop/mobile verificando metadado nas 24 combinações e após reload aprovados; aparência da barra no app instalado depende do navegador/SO e requer teste no dispositivo.

## T01 — validação da base concluída localmente — 2026-10-07

- PostgreSQL 18.6 descartável em localhost, sem instalar serviço no sistema. Testes Go executados sem cache; integração auth, migrações, sessão e proteção de origem aprovadas; go vet aprovado.
- Build Angular de produção aprovado sem avisos de orçamento; suíte completa com 34 testes Chromium desktop/mobile aprovada.
- Login/senha incorreta, recarga com sessão e logout real verificados. Replay do token após logout retorna 401; logout também fecha a prévia.
- Prévia anônima não concede sessão e não envia gravações à API; login por Enter funciona com backend real.
- API indisponível encerra carregamento inicial; falha no login libera formulário e limpa senha; falha no logout preserva sessão e permite tentar novamente. Falhas são injetadas somente nesses cenários, mantendo os testes de acesso com banco real.
- Corrigidos testes da prévia: seletor de rodapé usa contentinfo para evitar os rodapés dos dialogs; testes com mocks bloqueiam service worker para que interceptações não escapem para a API real. Service worker de produção continua ativo nos testes reais de base/PWA.
- Nenhuma mudança de comportamento do aplicativo foi necessária nesta rodada. Testes novos em `web/e2e/access.spec.ts`; ajuste de isolamento em `web/e2e/preview.spec.ts`.
- Pendência externa: conferir readiness/configuração e acesso na versão implantada no Dokploy; painel/credenciais não acessados nesta tarefa. Instalação real da PWA segue pendente.
- Próxima tarefa recomendada: T02 (garagem base e autorização), preparando o cadastro real de veículos em T03.

## T02 — garagem base e autorização — 2026-10-07

- Migrações movidas para módulo database; versão 001 preservada e 002 adicionada. Upgrade associa cada usuário antigo à própria garagem; bootstrap novo cria usuário/garagem/vínculo atomicamente. Reinício não altera senhas/sessões nem duplica garagens.
- APIs GET /api/garages e /api/garages/{garageID} autenticadas; middleware reutilizável consulta sessão e vínculo por requisição. Garagem inexistente e de outro usuário retornam o mesmo 404. Usuário e garagem disponíveis no contexto dos handlers.
- Tela autenticada consulta garagem persistida e trata carregamento, erro com nova tentativa e falta de vínculo. Prévia anônima permanece separada. Nenhuma tela de gestão de familiares/permissões de escrita foi implementada.
- Testes PostgreSQL aprovados: banco novo, upgrade v1→v2 com sessão/senha existentes, reinício, isolamento entre usuários, consulta compartilhada, revogação de vínculo, sessão inválida/expirada e IDs inválidos. Fixtures de membros usadas apenas nos testes, sem API pública para inclusão.
- Build Angular, go test sem cache com PostgreSQL, go vet e build Go CGO_ENABLED=0 aprovados; suíte completa com 36 testes Chromium desktop/mobile aprovada.
- Sem novas envs. Deploy desta versão aplica migração 002; preservar volume. Pendência de implantação real continua separada.
- Próxima entrega: T03, definir campos obrigatórios e integrar cadastro/listagem/detalhes/edição de veículos reais à garagem autorizada.

## T03 — veículos básicos reais — 2026-10-08

- Campos aprovados pelo usuário e registrados antes da implementação: nome/modelo (um campo textual) e km inicial obrigatórios; placa, marca, ano, chassi e RENAVAM opcionais.
- Migração 003 cria veículos vinculados à garagem; GET lista/detalhes, POST cadastro e PUT edição com validação e no-store. Identificadores como texto; quilometragem initial numeric(12,3), preservada na edição, sem leitura atual/histórico ainda.
- Componente VehicleGarage separado da prévia: cadastro/edição em FlDialog, lista com FlVehicleCard, detalhes reais e cópia de chassi/RENAVAM com confirmação. Badge de km inicial no canto superior esquerdo e ilustração placeholder até T09. Dados persistem após recarga.
- Escrita temporariamente limitada ao criador da garagem, mantendo membros como leitores até definir permissões na T12. APIs verificam sessão/vínculo/origem/JSON; consultas/edições de veículo incluem garage_id para impedir troca de contexto.
- Testes PostgreSQL aprovados: criação, campos opcionais, precisão/zeros iniciais, edição/imutabilidade de km inicial, reinício, isolamento entre garagens, vínculo removido, leitura compartilhada e escrita negada a não criador.
- Build Angular, Go test com PostgreSQL e go vet aprovados; suíte completa com 38 testes Chromium desktop/mobile aprovada. Teste de cópia intercepta somente a escrita no clipboard; cadastro/consulta/edição usam backend e banco reais.
- Compra/venda, notas, fotos, alterações do odômetro e exclusão/arquivamento continuam nas tarefas posteriores. Não há nova env; deploy aplica migração 003 preservando volume existente.
- Próxima tarefa recomendada: T04 (perfil e moeda/preferências), depois T05 (odômetro) e T06 (abastecimentos).

## T04 — perfil, moeda e preferências — 2026-10-08

- Migração 004 adiciona paleta/modo ao usuário com defaults original/light; moeda existente mantém BRL inicial. Login e consulta de sessão retornam as preferências.
- PUT /api/profile altera apenas o usuário autenticado, com proteção de origem/JSON, validação de campos/moedas/paletas/modos e respostas no-store. Alterações parciais preservam os demais campos.
- Perfil acessível no cabeçalho permite salvar moeda padrão. Tema autenticado grava no banco; login/recarga restaura o perfil acima do cache local. Gravações de tema são ordenadas; falha mostra opção de nova tentativa. Seleção anônima permanece local.
- Contrato decimal/moeda para futuras APIs documentado em [docs/money.md](docs/money.md): string decimal, numeric(18,6), moeda própria por registro, sem conversão automática nem alteração de histórico. Os formulários reais de preço serão integrados em T06/T07/T10; prévia mantém BRL fictício.
- Build Angular de produção aprovado e git diff --check aprovado. Testes de integração Go ampliados para perfil, valores inválidos, atualizações parciais, isolamento e proteção de origem. Teste Playwright adicionado para falha/nova tentativa, moeda/tema após recarga e novo login.
- Validação Go/PostgreSQL e Playwright **não executada** nesta rodada: Go/PostgreSQL indisponíveis no ambiente e resolução de rede falhou ao tentar obter Go. Naquele ponto a T04 ficou desmarcada; a validação foi concluída na continuação abaixo. Nenhum deploy realizado.
- Próximo passo: executar testes integrados da T04; depois definir cronologia, correções e efeitos de edição/exclusão para T05.

## Continuação de produto — 2026-10-08

- Autorizado implementar todas as entregas de código/produto, um commit por tarefa, sem push. Deploy e infraestrutura fora desta rodada.
- Aprovadas regras propostas de T05–T12 no chat: cronologia/retroatividade coerente e auditoria de odômetro; consumo cheio a cheio com parciais e intervalo incompleto; dois modos de manutenção; itens por garagem, mesma moeda por manutenção, desconto/ajuste; múltiplas notas; compra/venda opcionais e arquivamento; exclusão sem histórico; despesas e filtros/gráficos; criador administra membros, membros escrevem dados. Data preenchida com hoje e editável; autor obtido da sessão.
- Aprovadas imagens JPEG/PNG/WebP, 10 MB, 20 megapixels e uma foto por veículo. OIDC aprovado agora com vinculação explícita e login local temporário; contas externas não são criadas por e-mail.
- Troca de senha retirada desta entrega pelo usuário; recuperação administrativa não implementada.
- **TODO — lembretes de manutenção por veículo:** definir painel com serviço, último km/data, intervalo km/meses e antecedência; investigar Web Push gratuito e alternativas e-mail/ferramentas self-hosted. Nova tarefa separada: não configurar homelab nesta rodada. Propostas de valores de intervalos dependem do manual do veículo, sem intervalos universais automáticos.
- T04: testes Go com PostgreSQL 18.6 e go vet aprovados; teste de perfil desktop/mobile aprovado. Suíte de navegador encontrou overflow no novo botão de perfil mobile; layout corrigido para permitir quebra e limitar nome. Ferramentas apenas em /tmp, sem instalação de serviços.

## T05 — odômetro concluído — 2026-10-08

- Migração 005: leituras e auditoria com autor/origem; APIs de leituras avulsas e consulta de auditoria. Origens financeiras são modificadas pelo lançamento correspondente.
- Data civil preenchida com hoje, editável; km inicial preservado; km atual pela última data, maior km dentro do dia e ID como desempate. Leituras abaixo do inicial ou em queda cronológica são recusadas, inclusive retroativos/edições. Exclusão recalcula leitura atual.
- Transações bloqueiam o veículo para serializar alterações concorrentes; auditoria registra antes/depois e autor da sessão. Tela real permite cadastrar/editar/excluir leitura e consultar auditoria.
- Go/PostgreSQL aprovados (cronologia, rollback, recálculo, revogação de vínculo), build Angular aprovado e 4 testes de odômetro/veículos desktop/mobile aprovados.

## T06 — abastecimentos concluídos — 2026-10-08

- APIs reais por veículo: criar/listar/consultar/editar/excluir; data civil, combustível, litros, total/preço por litro, moeda, km e tanque cheio. Formulário usa contexto do veículo e moeda do perfil; campos decimais enviados como texto.
- Cálculos com big.Rat; total arredondado half-up à unidade da moeda (JPY inteira, demais duas casas). Total e preço unitário informados juntos precisam corresponder. numeric(18,6) guarda valores e moeda por ocorrência.
- Consumo cheio a cheio inclui parciais intermediários. Primeiro cheio é referência; parciais/intervalos incompletos/distância zero não exibem km/L. Exclusão marca o próximo intervalo incompleto. Histórico financeiro e odômetro/auditoria alterados atomicamente.
- Go/PostgreSQL e build Angular aprovados; testes de formulário real desktop/mobile aprovados, incluindo persistência/moeda e integração de km. Sem dados privados no cache.

## T07 — manutenção com total direto concluída — 2026-10-08

- Migração 007 e API real de manutenções com data preenchida automaticamente, descrição/km opcionais, total e moeda. Itens não são exigidos.
- Consulta/cadastro/edição/exclusão integrados à tela do veículo. Histórico de gastos mantém moeda própria; remover km opcional remove somente a leitura vinculada, com recálculo e auditoria atômicos.
- Testes PostgreSQL de criação/arredondamento/edição/remoção de leitura/exclusão aprovados; build Angular e testes Chromium desktop/mobile reais aprovados.

## T08 — itens e preços históricos concluídos — 2026-10-08

- Migração 008 cria referências de itens por garagem (nome/marca/código/unidade). Formulário cria/reutiliza referências sem cadastro prévio; peças e mão de obra são ocorrências com quantidade/preço/moeda e snapshot dos identificadores.
- Modo detalhado soma quantidade × preço com decimal exato, desconto e ajuste explícitos; mesma moeda exigida. Modo direto rejeita detalhes ativos. Troca de modo confirma descarte na interface; somente um total é contabilizado.
- Pesquisa de referências e histórico de preços por item mostram data, veículo, unidade, quantidade e moeda. Reutilização não altera preços anteriores; isolamento por garagem inclui referências e consultas de preços.
- Build Angular, go vet, testes Go/PostgreSQL de composição/modos/preços/isolamento e 4 testes Chromium desktop/mobile de manutenção direta/detalhada aprovados.

## T09 — fotos reais concluídas — 2026-10-08

- SDK S3 oficial com endpoint/região/bucket/credenciais/path-style configuráveis; sem bucket/configuração a aplicação funciona, uploads retornam indisponibilidade. Documentação/env representam apenas o cliente, sem alterações em Compose/infra.
- Migração 009 guarda metadados/reservas/fila de limpeza. Upload/substituição/remoção e leitura privada exigem vínculo/origem; imagem válida JPEG/PNG/WebP até 10 MB/20 megapixels. Cards/detalhes usam foto real e placeholder quando ausente ou leitura falha.
- Reserva persistida antes de upload evita objetos sem rastreabilidade. Falhas mantêm foto anterior e fila para nova tentativa; reservas antigas são limpas após uma hora, remoções a cada minuto/reinício. Nenhuma URL pública/cache de imagem privada.
- Build Angular/go vet/suíte Go com PostgreSQL aprovados. Testes do SDK com servidor S3 de protocolo exercitam upload/leitura/substituição/falhas/limpeza/isolamento; testes Chromium desktop/mobile de fotos reais pela API/banco aprovados.
- Validação de versão concreta RustFS/homelab permanece externa e fora do escopo pedido. O servidor S3 de navegador é fixture descartável, não prova de compatibilidade de versão RustFS.

## T10 — informações e despesas concluídas — 2026-10-08

- Migração 010 e APIs de múltiplas anotações textuais (até 20 mil caracteres), consulta/edição/exclusão com autoria e isolamento; identificadores permanecem campos separados.
- Compra/venda opcionais com data/valor/moeda e proprietários opcionais; venda arquiva e preserva histórico, correção/remoção de venda restaura à lista ativa. Mudanças de compra/venda auditadas. Listagem oferece incluir vendidos/arquivados.
- Veículo sem histórico pode ser excluído; existência de notas, lançamentos, leituras/auditoria ou compra/venda bloqueia exclusão. Foto removida passa pela fila persistida de limpeza.
- Despesas de documentação (IPVA/licenciamento/transferência/taxas/outros), seguro e outros: cadastro/consulta/edição/exclusão reais com moeda própria. Compra/venda ficam como informações patrimoniais; gráficos operacionais usam lançamentos de gastos, sem somar novamente detalhamento de manutenção.
- Atualização de dados após salvar não desmonta os demais formulários do veículo. Build Angular e suíte Go/PostgreSQL aprovados; 6 testes Chromium desktop/mobile de notas/venda/despesas/fotos/odômetro aprovados.

## T11 — histórico e gráficos reais concluídos — 2026-10-08

- GET history por garagem consulta todos os gastos persistidos; busca sem acentos, filtros veículo/tipo/datas inclusivas/moeda e preço ±10%, ordenação e paginação com limites. Datas civis/intervalos inválidos validados na API/UI.
- Lista, contagem e agregações por moeda/tipo/mês/veículo usam o mesmo snapshot PostgreSQL. Cada lançamento conta seu total uma vez; peças/mão de obra não duplicam a manutenção e moedas não são convertidas/somadas juntas.
- Navegação real Veículos/Histórico/Custos; componentes de lista/pizza aceitam dados reais e rótulos monetários na moeda correta. Formatação de totais decimais usa BigInt para evitar perda de precisão.
- Distância usa somente diferença entre leituras reais do veículo dentro do período; menos de duas leituras indica dados insuficientes, sem transportar estimativas do mock.
- Build/go vet e testes PostgreSQL de busca/datas/paginação/moedas/totais/isolamento aprovados; testes Chromium desktop/mobile de lista e gráficos reais aprovados.

## T12 — familiares e permissões concluídos — 2026-10-08

- Criador consulta/cria/vincula contas existentes e remove membros; não pode remover a si mesmo. Nova conta usa senha inicial bcrypt e não ganha garagem própria automaticamente; conta existente conserva senha, identidades externas e histórico.
- Membros podem alterar veículos, fotos, leituras e lançamentos; somente criador administra acesso. Middleware consulta vínculo a cada requisição, inclusive com sessão ativa. Remover vínculo não apaga usuário/autoria/lançamentos.
- Tela Familiares com carregamento/erro, inclusão e confirmação de remoção. Consulta de garagem informa capacidade de gestão; seleção de garagem ativa aparece quando há mais de uma. Navegação mobile permite quebra de linha.
- Testes Go/PostgreSQL de acesso compartilhado/revogação/reinclusão e regressões aprovados; build e 10 testes Chromium desktop/mobile de familiares/base/PWA aprovados.
- Mesmo usuário interno será reutilizado pela vinculação OIDC; não existe associação por e-mail nem recriação de usuário ao autenticar externamente.

## OIDC — concluído — 2026-10-08

- Migração 011 persiste fluxos de curta duração. Discovery/issuer/client ID/secret/scopes/callback configuráveis; token verifica assinatura, issuer, audience/azp, validade, nonce e at_hash quando informado. Código usa PKCE S256 e state ligado a cookie HttpOnly/Lax do navegador; replay/expiração são recusados.
- Vinculação explícita pelo perfil exige sessão válida do usuário que iniciou o fluxo; logout/troca de sessão cancela vínculo. Issuer + subject aponta ao mesmo usuário interno, sem cadastro público nem associação por e-mail; conflito não transfere identidade.
- Login externo emite/rotaciona sessão FleetLog; tokens do provedor não persistem. AUTH_LOCAL_ENABLED permite manter/desligar login local após vincular contas necessárias; configuração sem OIDC não pode desabilitar todos os métodos.
- UI de login/perfil com fluxo externo e mensagens de vínculo/erro. README/.env.example documentam configuração real e efeitos de trocar issuer; nenhum provedor do homelab configurado.
- Testes Go/PostgreSQL com provedor assinado substituível aprovados: PKCE/nonce/audience/assinatura/expiração, cookies/state/replay, identidade não vinculada, conflito, logout, troca de issuer e login local desabilitado. Build/go vet e fluxo Chromium desktop/mobile aprovados.

## Validação final do produto — 2026-10-08

- Build Angular sem avisos de orçamento; suíte Go sem cache com PostgreSQL 18.6 e go vet aprovados.
- Suíte completa com **58 testes Chromium desktop/mobile aprovada**: acesso real, veículos, odômetro, abastecimentos, manutenção direta/detalhada, histórico de preços, notas/venda/despesas, fotos, familiares, OIDC, temas e PWA.
- Revisão final: dinheiro/km/litros apresentados em pt-BR sem exposição da escala interna; valores decimais mantidos exatos. Leituras atualizam após lançamentos sem desmontar formulários vizinhos; cadastro inicial aparece com origem/autoria. Cópia de placa acrescentada ao padrão de identificadores.
- Logins locais bem-sucedidos não consomem orçamento de tentativas malsucedidas/concorrentes; campos de outro tipo de lançamento são recusados e falhas de exclusão não são mascaradas.
- S3/OIDC validados com fixtures locais de protocolo/provedor assinado e banco real; não configuram nem validam serviços do homelab. Compose, pipeline, deploy, push e infraestrutura não alterados.
- Exportação e extras explicitamente adiados pelo usuário para outra tarefa. Campos personalizados/outros anexos e importação/offline seguem separados do núcleo. Lembretes têm proposta/TODO próprio a pedido do usuário; troca de senha local não foi implementada por sua decisão.

- Após os ajustes finais de apresentação/atualização, **14 testes dos formulários/histórico/veículos em desktop/mobile reexecutados e aprovados**; rastreabilidade do cadastro verificada em PostgreSQL.

## Encaminhamento de configuração corrigido — 2026-10-09

- compose.yaml e compose.registry.yaml passam S3__, OIDC__ e AUTH_LOCAL_ENABLED para fleetlog-service, com defaults iguais aos do código. Integrações continuam opcionais; AUTH_LOCAL_ENABLED=false é preservado.
- .env.example/README atualizados e ponto de retomada antigo corrigido. HTTP_ADDR/STATIC_DIR continuam definidos pela imagem; PostgreSQL continua configurado pelo Compose, sem alterar volume/senha/rede.
- Restam configuração do bucket privado e cliente/callback OIDC no provedor, publicação de imagem atual e aplicação do Compose atualizado. São ações externas, não funcionalidades faltantes do código.

- Validação sem daemon: CLI Compose conferiu os dois arquivos com integrações desabilitadas e configuração preenchida, cobrindo as 13 variáveis do código e preservação explícita de AUTH_LOCAL_ENABLED=false. git diff --check aprovado.

## Revisão de UI e navegação — 2026-10-09 — concluída

- [x] Revisar espaçamentos da home, detalhes e demais telas; botões compactos no desktop e alvos acessíveis no mobile.
- [x] Perfil com ícone no header; logout dentro do diálogo de perfil; copiar identificadores somente com ícone e label acessível.
- [x] Padronizar foco/hover, checkbox custom tematizado e indicação clara da aba ativa.
- [x] Filtros de histórico/custos alinhados; estado vazio compacto e útil.
- [x] Manter gráficos/resumos de custos completos ao selecionar categoria; filtrar somente lista, com destaque sutil sem borda branca.
- [x] Familiares com formulário de largura contida e lista de membros organizada.
- [x] Notas, abastecimentos e manutenções em visualização tabular responsiva.
- [x] Máscara monetária em campos de valor, mantendo decimais exatos e precisão de preços unitários.
- [x] Ações rápidas de abastecimento/manutenção/despesa nos cards da garagem.
- [x] Navegação por URL com F5, links diretos e histórico Voltar/Avançar.
- [x] Subir instância local separada com usuário/senha de teste e validar desktop/mobile.

## TODO — imagens opcionais em todos os registros

Pedido em 2026-10-09: permitir imagens opcionais em abastecimentos, manutenções,
anotações e demais ações/registros do produto. Entrega separada, não implementar
como parte da revisão de UI.

- [ ] Definir quais registros aceitam anexos e quantidade por registro.
- [ ] Aprovar formatos, tamanho/dimensões, ordenação/legendas e limites de armazenamento.
- [ ] Generalizar metadados S3 privados, vínculo com registro e autorização por garagem.
- [ ] Upload/leitura/substituição/remoção com fila de limpeza e rollback consistente.
- [ ] Integrar formulário, tabela/detalhes e visualização de imagens em diálogo.
- [ ] Definir efeitos de editar/excluir registro e eventual exportação com anexos.
- [ ] Testar persistência, isolamento, validação de conteúdo e falhas banco/S3.

### Ajustes adicionais pedidos durante a revisão

- [x] Card 75/25, ações rápidas com ícones dentro do card, sem botões aninhados.
- [x] Perfil/ações compactos, editar com lápis, excluir com lixeira, copiar com ícone; margens controladas por grupos.
- [x] Checkbox com centro alinhado ao texto; controle de período com mesmo tamanho e ícone SVG de calendário.
- [x] Máscara monetária durante digitação, caret e edição de negativos/decimais; precisão preservada.
- [x] Compra/venda em grupos independentes, sem embaralhar campos condicionais no grid.
- [x] Odômetro em tabela; todas as tabelas com 5 itens por página e seleção de quantidade.
- [x] Cor da tag configurável na edição real do veículo e persistida no banco.
- [x] Diálogo de anotação com imagem opcional privada (pedido posterior autoriza esta parte agora); demais anexos continuam no TODO separado.
- [x] Verificar default Original/Claro do perfil e separar preferências deslogadas do perfil autenticado.

Validação da revisão: build Angular sem avisos, go vet, suíte Go/PostgreSQL e
**62 testes Chromium desktop/mobile aprovados**. Testes novos cobrem rotas/F5/
Voltar, ações rápidas, máscara ao digitar/cálculo vinculado, cor persistida,
paginação e imagem privada da anotação. Demais anexos continuam no TODO acima.
Instância de demonstração em http://127.0.0.1:8080, banco separado, dados
fictícios; usuário demo e senha de teste fornecidos no chat. Armazenamento S3
de demonstração local, sem acesso ao homelab.


## Arquivamento reversível — 2026-10-09

- Pedido posterior substitui exclusão física por arquivar/desarquivar, inclusive
  com histórico; dados/fotos/notas/leituras e autoria preservados.
- DELETE do veículo passa a arquivar por compatibilidade; PUT /archive aceita
  archived true/false. Mudanças auditadas. Edição comum de compra/venda não
  sobrescreve decisão manual de arquivamento; novo registro/remoção de venda
  ainda aplica a transição já definida.
- UI mostra Arquivar/Desarquivar; Recarregar veículos removido.

## TODO — lançamento por áudio com IA

Pedido em 2026-10-09: enviar um áudio para a IA transcrever, identificar se o
lançamento é abastecimento, manutenção ou documentação, extrair os dados e
registrar no banco conforme o tipo. Feature futura; não implementar nesta rodada.

- [ ] Permitir envio de áudio e transcrição para texto.
- [ ] Classificar abastecimento, manutenção e documentação; identificar veículo e data.
- [ ] Extrair valores/moeda e campos pertinentes: litros, preço por litro, total,
  odômetro, combustível, descrição/itens de manutenção e tipo de documentação.
- [ ] Validar dados estruturados com as regras existentes, preservando precisão
  monetária, autoria do usuário logado e permissões por garagem.
- [ ] Integrar o registro no banco aos fluxos existentes de lançamentos e odômetro,
  evitando duplicidade em novas tentativas e mantendo auditoria.
- [ ] Projetar integração configurável por adaptadores, permitindo self-hosted
  e provedores externos, como OpenAI/GPT, Anthropic/Claude e Amazon Bedrock,
  sem acoplar o fluxo de lançamentos a um fornecedor específico.
- [ ] Separar transcrição e interpretação/extração estruturada para permitir
  provedores/modelos distintos em cada etapa, conforme suas capacidades.
- [ ] Definir com o usuário seleção/configuração de provedores, modelos/endpoints,
  credenciais, custos e limites de áudio, armazenamento/retenção e tratamento
  de dados. Escopo da configuração (instância/garagem/usuário) fica pendente.
- [ ] Definir revisão/confirmação antes da gravação e como pedir esclarecimento
  quando houver campos ausentes, ambíguos ou transcrição incerta; não inventar valores.
- [ ] Testar fala em português, valores monetários, identificação do veículo/tipo,
  ambiguidades, falhas de transcrição/IA e consistência do lançamento persistido.

## Lembretes internos de manutenção — 2026-10-09

- [x] Configuração por veículo em km/meses, vencendo pelo primeiro limite e com antecedência configurável.
- [x] Tabela paginada, metas e estados; avisos na garagem com atalho ao veículo.
- [x] Registrar manutenção reutiliza o diálogo existente e grava o vínculo atomicamente; vincular existente é idempotente e restrito ao veículo.
- [x] Recálculo após correções/retroativos/exclusões, calendário mensal, km ausente e arquivamento; permissões/auditoria por garagem.
- [ ] Notificações externas, adiamento e demais fluxos: próximos escopos a definir em docs/maintenance-reminders.md.

## TODO — experiência de consulta de peças e preços

- [ ] Repensar busca de itens/preços históricos na seção Manutenções. Por enquanto
  esconder o bloco externo de pesquisa/preços, mantendo tabela e Registrar manutenção.
  O detalhamento de peças/mão de obra dentro do lançamento continua disponível.

- [ ] Repensar a apresentação dos avisos de manutenção na home da garagem.
  Por enquanto, o painel fica abaixo da grade de veículos.
