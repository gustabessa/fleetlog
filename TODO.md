# FleetLog — andamento

Atualizado em 2026-10-07. Plano de produto: [docs/FleetLog-plan.md](docs/FleetLog-plan.md).

## Decisões de implementação

- Serviços Compose: `fleetlog-service` (aplicação) e `fleetlog-db` (PostgreSQL); volume existente `postgres_data` preservado.

- A implementação foi autorizada em 2026-10-07, substituindo a pausa do plano original.
- Aprovado mediante viabilidade: Go servindo o bundle Angular, PostgreSQL e cliente S3 compatível com RustFS. SPA/PWA servida pelo Go é viável; HTTPS fica no proxy do Dokploy.
- PWA online na v1. Cache somente dos arquivos da aplicação; sem cache de dados privados ou lançamentos offline.
- RustFS é uma opção de provedor; integração e versão ainda precisam ser validadas.
- As regras marcadas como propostas no plano permanecem pendentes.

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
- [ ] Reexecutar suíte completa com PostgreSQL após as mudanças de UI/mock/design system.
- [ ] Criar modelo/migração de garagem e vínculo dos membros com usuários internos.
- [ ] Definir permissões e forma de inclusão de familiares antes de entregar gestão de membros.
- [ ] Implementar inclusão/remoção de membros conforme a regra aprovada, com login individual.
- [ ] Aplicar autorização por garagem em todas as APIs e no acesso a objetos/imagens.
- [ ] Testar que membros da mesma garagem consultam os mesmos dados e outras garagens não têm acesso.
- [ ] Implementar perfil com moeda padrão inicial BRL e alteração da preferência.
- [ ] Fazer seleção de moeda em toda entrada de preço, preenchida pelo perfil.
- [ ] Guardar moeda e valor decimal no registro; mudar perfil não altera histórico.
- [ ] Integrar telas de acesso/perfil/garagem ao design system e validar estados de erro/carregamento.

## Etapa 3 — veículos, informações e odômetro

- [ ] Definir campos básicos do cadastro e obrigatoriedade de compra/venda conforme plano.
- [ ] Criar migrações e API de cadastro, listagem, consulta e edição de veículo vinculado à garagem.
- [ ] Persistir quilometragem inicial separada do histórico e quilometragem atual.
- [ ] Registrar data/valor/moeda de compra e venda; proprietários anterior/novo opcionais.
- [ ] Implementar notas/informações, chassi e RENAVAM; guardar identificadores como texto.
- [ ] Copiar identificadores com um clique e confirmação visual.
- [ ] Integrar home com cards/imagens reais, nome/modelo e badge de km no canto superior esquerdo.
- [ ] Integrar detalhes ao veículo selecionado e manter contexto ao iniciar lançamentos.
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

Base com login local e PostgreSQL implementada. Funcionalidades de veículos e garagem compartilhada continuam pendentes.
Validados: build Angular (~57 kB transferidos), testes Go e go vet; 8 testes Chromium aprovados em desktop/mobile, cobrindo layout, tema persistente, rotas, manifest, service worker, respostas API e atualização para novo build sem recarga automática.
Pendente: Docker Compose/pull da imagem, HTTPS Dokploy e instalação PWA no sistema operacional. PostgreSQL conectado; migração de usuários/sessões/identidades externas e bootstrap no startup.
Node 22.23.3 disponível. Go 1.27.1 baixado para `/tmp/go` com checksum oficial validado; não instalado no sistema.
Docker Engine indisponível neste ambiente. CLI Compose 2.40.3 extraído em `/tmp/fleetlog-compose-cli` para validar `compose.yaml` e `compose.registry.yaml`, ambos aprovados; build de imagem não executado. Frontend em `web/`, backend em `cmd/fleetlog` e `internal/httpserver`.
Playwright adicionado ao frontend. Testes: `cd web && npm run test:e2e`; requer Go e Chromium. Para este ambiente: `GO_BIN=/tmp/go/bin/go`, `GOCACHE=/tmp/fleetlog-gocache`, `PLAYWRIGHT_BROWSERS_PATH=/tmp/fleetlog-browsers`, `LD_LIBRARY_PATH=/tmp/fleetlog-browser-deps/root/usr/lib/x86_64-linux-gnu`, Node no PATH. Browser e bibliotecas extraídos apenas em `/tmp`; são temporários e precisam ser preparados novamente caso removidos.
Próxima etapa técnica: garagem e veículos; antes de implementar inclusão de familiares, definir permissões. Publicar a nova imagem e atualizar o Raw Compose no Dokploy com PG*, PUBLIC_URL e bootstrap.
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
