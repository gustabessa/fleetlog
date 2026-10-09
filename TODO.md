# FleetLog — andamento

Atualizado em 2026-10-08. Plano de produto: [docs/FleetLog-plan.md](docs/FleetLog-plan.md).

## Decisões de implementação

- Serviços Compose: `fleetlog-service` (aplicação) e `fleetlog-db` (PostgreSQL); volume existente `postgres_data` preservado.

- A implementação foi autorizada em 2026-10-07, substituindo a pausa do plano original.
- Aprovado mediante viabilidade: Go servindo o bundle Angular, PostgreSQL e cliente S3 compatível com RustFS. SPA/PWA servida pelo Go é viável; HTTPS fica no proxy do Dokploy.
- PWA online na v1. Cache somente dos arquivos da aplicação; sem cache de dados privados ou lançamentos offline.
- RustFS é uma opção de provedor; integração e versão ainda precisam ser validadas.
- As regras marcadas como propostas no plano permanecem pendentes.

## Próximas tarefas por prioridade

Esta fila organiza os checklists detalhados abaixo em entregas escolhíveis. Ordem proposta por dependência e uso real, sem alterar decisões de produto pendentes. As prévias e componentes de UI estão disponíveis; backend de veículos/lançamentos ainda não existe. Login, sessões e PostgreSQL já têm implementação funcional.

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
- [ ] **T12 — inclusão de familiares e permissões.** Aprovar como incluir/remover usuários e quais ações cada membro pode fazer; gestão de acesso e testes de garagem compartilhada. Depende de T02. Pode ser antecipada se o próximo teste de uso já envolver a família.

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
- [ ] Adicionar testes Playwright ao CI.
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
- [ ] Definir permissões e forma de inclusão de familiares antes de entregar gestão de membros.
- [ ] Implementar inclusão/remoção de membros conforme a regra aprovada, com login individual.
- [x] Criar proteção reutilizável de sessão/vínculo e aplicá-la às APIs de consulta de garagem.
- [ ] Aplicar proteção de garagem às futuras APIs de veículos/lançamentos e ao acesso S3.
- [x] Testar que membros da mesma garagem consultam os mesmos dados e outras garagens não têm acesso, incluindo revogação do vínculo com sessão ativa.
- [x] Implementar perfil com moeda padrão inicial BRL e alteração da preferência.
- [ ] Fazer seleção de moeda em toda entrada de preço, preenchida pelo perfil.
- [ ] Guardar moeda e valor decimal no registro; mudar perfil não altera histórico.
- [ ] Integrar telas de acesso/perfil/garagem ao design system e validar estados de erro/carregamento.

## Etapa 3 — veículos, informações e odômetro

- [x] Definir cadastro básico T03: nome/modelo e km inicial obrigatórios; placa, marca, ano, chassi e RENAVAM opcionais (aprovado pelo usuário em 2026-10-08).
- Compra/venda, notas livres, fotos e alteração do odômetro ficam nas tarefas seguintes (T10/T09/T05); recursos mantidos no escopo, fora desta entrega.
- [ ] Definir obrigatoriedade de compra/venda na T10.
- [x] Criar migração 003 e API de cadastro, listagem, consulta e edição de veículo vinculado à garagem.
- [x] Persistir quilometragem inicial decimal e preservá-la na edição básica.
- [ ] Implementar histórico e quilometragem atual na T05, separados do km inicial.
- [ ] Registrar data/valor/moeda de compra e venda; proprietários anterior/novo opcionais.
- [x] Implementar chassi e RENAVAM como campos próprios nas informações/cadastro do veículo, separados das notas; persistir como texto para preservar zeros iniciais.
- [ ] Manter notas/anotações do veículo como recurso separado; definir formato e quantidade antes da implementação.
- [x] Copiar chassi e RENAVAM com um clique e confirmação visual.
- [ ] Estender cópia a outros identificadores conforme forem necessários.
- [x] Integrar home com veículos reais, nome/modelo e badge de km inicial no canto superior esquerdo.
- [ ] Substituir ilustração placeholder por fotos reais na T09.
- [x] Integrar consulta/edição de detalhes reais ao veículo selecionado.
- [ ] Manter contexto ao iniciar lançamentos na T06/T07.
- [ ] Definir arquivamento/venda e política de exclusão de veículo com histórico antes dessas ações.
- [ ] Definir regra cronológica de odômetro e tratamento de inconsistências/leituras retroativas.
- [ ] Persistir leituras e suas origens; definir autoria/rastreabilidade de correções conforme decisão aprovada.
- [ ] Recalcular km atual ao editar/excluir lançamento conforme regras aprovadas, preservando km inicial.
- [ ] Validar edição, retroatividade, venda e identificadores com zeros iniciais em testes de integração.

## Etapa 3 — imagens dos veículos

- [ ] Implementar cliente S3 configurável (endpoint, região, bucket, credenciais e path-style).
- [ ] Persistir metadados no PostgreSQL e objetos em bucket privado.
- [ ] Definir formatos/tamanho máximo e validar conteúdo de upload.
- [ ] Implementar upload, leitura autorizada, substituição e remoção de imagem de veículo.
- [ ] Tratar falhas entre banco e S3 sem referências quebradas ou objetos abandonados.
- [ ] Mostrar placeholder quando veículo não tem imagem.
- [ ] Validar operações necessárias em uma versão fixada do RustFS.
- [ ] Documentar variáveis reais do cliente e configuração separada do servidor S3.
- [ ] Definir outros anexos (itens/manutenção/comprovantes) separadamente; só imagens de veículo entram nesta etapa.

## Etapa 4 — abastecimentos e consumo

- [ ] Aprovar campos complementares e cálculo de consumo antes de implementar métricas.
- [ ] Criar modelo/API para data, litros, preço/moeda e odômetro do abastecimento.
- [ ] Abrir formulário na tela do veículo com veículo já definido, sem nova seleção.
- [ ] Definir relação entre total e preço por litro, precisão e arredondamento.
- [ ] Implementar cadastro, consulta, edição e exclusão com atualização coerente de odômetro/custos.
- [ ] Integrar formulário e histórico de abastecimentos com dados reais.
- [ ] Implementar km/L e histórico somente para intervalos válidos conforme método aprovado.
- [ ] Se aprovado tanque cheio a tanque cheio: considerar parciais intermediários e primeiro registro como referência.
- [ ] Definir como indicar dados insuficientes, abastecimentos ausentes e leituras inválidas.
- [ ] Testar retroatividade/edição/exclusão e evitar métricas enganosas ou dupla contabilização.

## Etapa 5 — manutenção, itens e preços

- [ ] Aprovar composição de moedas diferentes, descontos e ajustes.
- [ ] Criar modelo/API de manutenção com veículo, data e campos aprovados de descrição/odômetro.
- [ ] Implementar modo total direto, sem exigir cadastro de itens/suprimentos.
- [ ] Implementar modo detalhado com peças e mão de obra somadas pelo sistema.
- [ ] Tornar itens opcionais; definir troca entre modos sem contabilizar os dois totais.
- [ ] Definir identificação/unidade/escopo do item reutilizável antes da migração de catálogo.
- [ ] Implementar referência reutilizável separada da ocorrência e seu preço histórico, se aprovado esse modelo.
- [ ] Reaproveitar item de revisão anterior em nova revisão sem modificar registros passados.
- [ ] Selecionar moeda em cada preço de peça, mão de obra e total, conforme regras aprovadas.
- [ ] Implementar cadastro, consulta, edição/exclusão e integração com odômetro/custos.
- [ ] Buscar item e consultar/comparar preços entre revisões com data, veículo e moeda.
- [ ] Integrar formulários e histórico real; testar composição do total e preservação de preços históricos.

## Etapa 6 — documentação e outras despesas

- [ ] Definir tipos/subtipos iniciais e necessidade de personalização.
- [ ] Criar modelo/API para data, veículo, descrição, tipo e valor/moeda de despesa.
- [ ] Permitir lançar impostos, licenciamento e outras taxas de documentação.
- [ ] Implementar cadastro, consulta, edição e exclusão, com autorização por garagem.
- [ ] Integrar lançamentos de documentação ao histórico e às análises.
- [ ] Fazer manutenção e abastecimento alimentarem gastos automaticamente, sem despesa duplicada.
- [ ] Testar que itens/mão de obra são detalhamento, não somados novamente ao total da manutenção.

## Etapa 7 — histórico e análises

- [ ] Confirmar critérios de filtros/gráficos a partir da prévia antes do contrato de API.
- [ ] Integrar histórico unificado de abastecimentos, manutenções e despesas com dados persistidos.
- [ ] Implementar busca, filtros aprovados por veículo/tipo/período, ordenação e paginação.
- [ ] Definir inclusão de dias-limite, fuso/data dos registros e comportamento de intervalo inválido.
- [ ] Confirmar se filtro por preço da prévia usa tolerância de ±10%; considerar moeda no filtro real.
- [ ] Entregar gráficos por tipos de gasto e demais análises aprovadas, com filtros coerentes com a lista.
- [ ] Separar totais/comparações por moeda; sem conversão cambial automática.
- [ ] Calcular indicadores a partir de registros reais; não transportar distâncias estimadas do mock para métricas reais.
- [ ] Validar atualização de listas/gráficos após criação, edição e exclusão de registros.
- [ ] Testar períodos vazios, diferentes moedas, duplicação de gastos e autorização dos agregados.

## OIDC — entrega ainda a definir

- [x] Reservar identidades externas pelo par issuer + subject, relacionadas ao usuário interno.
- [ ] Definir momento de entrega, convivência com login local e vinculação explícita de contas.
- [ ] Implementar discovery/issuer, client ID, secret quando aplicável, scopes e callback configuráveis.
- [ ] Validar state, nonce, PKCE e tokens no fluxo apropriado; reutilizar sessão interna após autenticação.
- [ ] Tratar troca de issuer sem associação automática por e-mail.
- [ ] Documentar configurações efetivas e testar com provedor substituível.

## Validação de cada entrega

- [ ] Formularios com seleção de moeda, validação e mensagens coerentes entre frontend/backend.
- [ ] Estados de carregamento, vazio, erro e sucesso; impedir envios duplicados.
- [ ] Confirmar persistência após recarga e autorização também em chamadas diretas à API.
- [ ] Validar navegação responsiva, labels, teclado, temas e operações online da PWA.
- [ ] Testes relevantes de regras de negócio e integração PostgreSQL/S3 quando envolvidos.
- [ ] Atualizar .env.example/README/TODO conforme novos contratos e parâmetros reais.

## Decisões de produto pendentes

- [ ] Permissões dos familiares, inclusão/remoção e propriedade da garagem.
- [ ] Campos básicos do veículo; obrigatoriedade de compra/venda e arquivamento/exclusão com histórico.
- [ ] Formato/quantidade de notas e suporte a campos personalizados.
- [ ] Regras cronológicas de odômetro, correção e exclusão de lançamentos.
- [ ] Método de consumo, campos de combustível/tanque cheio e intervalos inválidos.
- [ ] Manutenção: descontos, ajustes, moedas diferentes e troca entre modos.
- [ ] Itens: identificação, unidade e compartilhamento entre veículos/garagem.
- [ ] Tipos/subtipos de custos e personalização.
- [ ] Filtros/gráficos finais, inclusive filtro de preço e métricas de distância da prévia.
- [ ] Momento de entrega OIDC, idioma e escopo de anexos além de imagens do veículo.

## Complementos propostos — prioridade/escopo a aprovar

Estas tarefas registram lacunas operacionais identificadas na revisão; não alteram os requisitos confirmados do plano.

- [ ] Definir troca de senha local e recuperação administrativa de acesso.
- [ ] Planejar backup/restauração de PostgreSQL e S3 e executar restauração de teste.
- [ ] Definir exportação portátil de dados, formato e inclusão de anexos.
- [ ] Avaliar lembretes por data/km e recorrência; entrega e notificações ainda a definir.

## Backlog — depois do núcleo do produto

- [ ] Importar histórico de outros sistemas: desejo futuro confirmado pelo usuário, sem prioridade na versão atual. Definir formato, mapeamento, moedas/unidades, validação e duplicatas quando essa etapa começar.
- [ ] Offline: definir dados disponíveis localmente.
- [ ] Lançamentos offline e sincronização com tratamento de conflitos.

## Ponto de retomada

Base com login local e PostgreSQL implementada. Garagem base/consulta autorizada implementadas; funcionalidades de veículos e gestão de familiares continuam pendentes.
Última validação local (T01): build Angular (~89 kB transferidos), testes Go sem cache com PostgreSQL real e go vet aprovados; 34 testes Chromium desktop/mobile aprovados, incluindo acesso real, isolamento da prévia, falhas de API, UI e service worker.
Pendente: Docker Compose/pull da imagem, HTTPS Dokploy e instalação PWA no sistema operacional. PostgreSQL conectado; migração de usuários/sessões/identidades externas e bootstrap no startup.
Node 22.23.3 disponível. Go 1.27.1 baixado para `/tmp/go` com checksum oficial validado; não instalado no sistema.
Docker Engine indisponível neste ambiente. CLI Compose 2.40.3 extraído em `/tmp/fleetlog-compose-cli` para validar `compose.yaml` e `compose.registry.yaml`, ambos aprovados; build de imagem não executado. Frontend em `web/`, backend em `cmd/fleetlog` e `internal/httpserver`.
Playwright adicionado ao frontend. Testes: `cd web && npm run test:e2e`; requer Go e Chromium. Para este ambiente: `GO_BIN=/tmp/go/bin/go`, `GOCACHE=/tmp/fleetlog-gocache`, `PLAYWRIGHT_BROWSERS_PATH=/tmp/fleetlog-browsers`, `LD_LIBRARY_PATH=/tmp/fleetlog-browser-deps/root/usr/lib/x86_64-linux-gnu`, Node no PATH. Browser e bibliotecas extraídos apenas em `/tmp`; são temporários e precisam ser preparados novamente caso removidos.
Próxima etapa técnica: T04, perfil/moeda/preferências; antes de implementar inclusão de familiares, definir permissões. Publicar a nova imagem e atualizar o Raw Compose no Dokploy com PG*, PUBLIC_URL e bootstrap.
Para retomar: ler este arquivo e o plano, conferir git status e executar os checks do README.
Ícones simples provisórios com a letra F; idioma pt-BR provisório para esta base. O frontend usa Angular 22.2 e Node 22; Go 1.27.

Fluxo atual: Woodpecker → GHCR → Dokploy Compose. Pipeline e Compose de produção preparados; instalação/tutorial do Woodpecker ficam fora do repo. Configuração antiga de build pelo Dokploy removida (`compose.dokploy.yaml` e `docs/dokploy.md`). Usuário confirmou login OAuth e repositório habilitado. Próximo passo: enviar pipeline, concluir secrets e executar primeiro build. Nenhum push ou deploy foi realizado pelo agente.

Compose principal alterado para consumir `ghcr.io/gustabessa/fleetlog:main` sem build; `FLEETLOG_IMAGE` permite selecionar versão. Dockerfile mantido para CI. Ambos os Compose usam imagens prontas; publicação/pull real ainda dependem do homelab.

Login/PostgreSQL: testes de integração em PostgreSQL 18.6 temporário aprovados (rollback de bootstrap inválido, migração idempotente, hash da senha/token, sessão/rotação/expiração/logout, origem e rate limit). Oito testes Chromium desktop/mobile aprovados, incluindo login e logout. Woodpecker agora possui serviço PostgreSQL descartável para executar os testes de integração. Instância PostgreSQL local usada apenas para testes em `/tmp`, sem instalação de serviço no sistema.
OIDC: schema reserva `external_identities` com chave issuer+subject e password_hash opcional para futuras contas externas. Provedor OIDC não implementado; nenhuma associação automática por e-mail. PUBLIC_URL é a origem exata; a aplicação deriva cookie Secure de HTTPS, sem confiar em headers do proxy.
Confirmação do usuário: Woodpecker → GHCR → Dokploy já funcionou para a base anterior. Deploy desta versão ainda pendente. Bootstrap cria somente primeiro usuário; não redefine senha existente. Troca/recuperação de senha e inclusão de familiares continuam pendentes.

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

- [ ] Persistir paleta e modo claro/escuro no perfil do usuário no banco, com API de preferências. Por enquanto a seleção salva imediatamente em localStorage (`fleetlog.palette` e `fleetlog.theme`) e restaura após recarga.
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
- Validação Go/PostgreSQL e Playwright **não executada** nesta rodada: Go/PostgreSQL indisponíveis no ambiente e resolução de rede falhou ao tentar obter Go. T04 permanece desmarcada até validar persistência/autorização com banco real; nenhum deploy realizado.
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
- Data civil preenchida com hoje, editável; km inicial preservado; km atual pela última data/id. Leituras abaixo do inicial ou em queda cronológica são recusadas, inclusive retroativos/edições. Exclusão recalcula leitura atual.
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
