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
- [ ] Enviar pipeline ao remoto e disparar primeiro push em main.
- [ ] Instalar Woodpecker no homelab e confirmar agente conectado.
- [ ] Cadastrar secrets GHCR com evento push; filtro de imagem omitido nesta versão porque o validador rejeita tags com pontos.
- [ ] Executar primeiro build/publicação e confirmar pacote GHCR.
- [ ] Configurar credenciais de pull no Dokploy se imagem privada.
- [ ] Implantar Compose com SHA publicado e validar HTTPS/PWA.
- [ ] Validar promoção/rollback entre versões.
- [ ] Adicionar testes Playwright ao CI.
- [ ] Avaliar deploy automático via webhook após build e builds multiarch.

Pipeline: [.woodpecker/build.yaml](.woodpecker/build.yaml). Produção: [compose.registry.yaml](compose.registry.yaml).

## Etapas seguintes

- [ ] PostgreSQL: conexão, migrações versionadas e testes de integração.
- [ ] Login local, hash de senha, sessões seguras, CSRF e logout.
- [ ] Garagem compartilhada, inclusão de familiares e autorização por garagem.
- [ ] Perfil e moeda padrão, preservando moeda em cada registro.
- [ ] Cadastro/listagem/detalhes de veículos, compra/venda e informações copiáveis.
- [ ] Histórico de odômetro com autoria e correções rastreáveis.
- [ ] Imagens de veículos via S3 privado, com autorização e limites de upload.
- [ ] Abastecimentos pelo contexto do veículo e histórico de consumo.
- [ ] Manutenção com total direto ou itens/mão de obra e referências reutilizáveis.
- [ ] Pesquisa de itens e histórico de preços.
- [ ] Custos de documentação e outros tipos, sem dupla contabilização.
- [ ] Gráficos por período/veículo, separados por moeda.
- [ ] OIDC configurável, identidade pelo par issuer + subject.
- [ ] Validar implantação no Dokploy, HTTPS e instalação/atualização PWA.

## Decisões de produto pendentes

- [ ] Permissões dos familiares e fluxo de inclusão.
- [ ] Regras de odômetro, correção e exclusão de lançamentos.
- [ ] Compra/venda: campos obrigatórios e arquivamento de veículos vendidos.
- [ ] Consumo: aprovar ou ajustar método tanque cheio a tanque cheio.
- [ ] Descontos, composição da manutenção e moedas diferentes.
- [ ] Unidade/escopo dos itens reutilizáveis e categorias personalizáveis.
- [ ] Momento de entrega OIDC, idioma e escopo inicial de anexos.

## Backlog

- [ ] Offline e sincronização com conflitos.
- [ ] Lembretes e importação de dados de outros sistemas de gestão de veículos, sujeitos a definição de escopo.

## Ponto de retomada

Primeiro scaffold implementado; não há funcionalidades de domínio nem autenticação ainda.
Validados: build Angular (~57 kB transferidos), testes Go e go vet; 6 testes Chromium aprovados em desktop/mobile, cobrindo layout, tema persistente, rotas, manifest, service worker, respostas API e atualização para novo build sem recarga automática.
Pendente: Docker Compose/pull da imagem, HTTPS Dokploy e instalação PWA no sistema operacional. O PostgreSQL está apenas preparado no Compose; sem conexão ou migrações ainda.
Node 22.23.3 disponível. Go 1.27.1 baixado para `/tmp/go` com checksum oficial validado; não instalado no sistema.
Docker Engine indisponível neste ambiente. CLI Compose 2.40.3 extraído em `/tmp/fleetlog-compose-cli` para validar `compose.yaml` e `compose.registry.yaml`, ambos aprovados; build de imagem não executado. Frontend em `web/`, backend em `cmd/fleetlog` e `internal/httpserver`.
Playwright adicionado ao frontend. Testes: `cd web && npm run test:e2e`; requer Go e Chromium. Para este ambiente: `GO_BIN=/tmp/go/bin/go`, `GOCACHE=/tmp/fleetlog-gocache`, `PLAYWRIGHT_BROWSERS_PATH=/tmp/fleetlog-browsers`, `LD_LIBRARY_PATH=/tmp/fleetlog-browser-deps/root/usr/lib/x86_64-linux-gnu`, Node no PATH. Browser e bibliotecas extraídos apenas em `/tmp`; são temporários e precisam ser preparados novamente caso removidos.
Próxima etapa técnica: conexão PostgreSQL/migrações e login local; antes de implementar inclusão de familiares, definir permissões.
Para retomar: ler este arquivo e o plano, conferir git status e executar os checks do README.
Ícones simples provisórios com a letra F; idioma pt-BR provisório para esta base. O frontend usa Angular 22.2 e Node 22; Go 1.27.

Fluxo atual: Woodpecker → GHCR → Dokploy Compose. Pipeline e Compose de produção preparados; instalação/tutorial do Woodpecker ficam fora do repo. Configuração antiga de build pelo Dokploy removida (`compose.dokploy.yaml` e `docs/dokploy.md`). Usuário confirmou login OAuth e repositório habilitado. Próximo passo: enviar pipeline, concluir secrets e executar primeiro build. Nenhum push ou deploy foi realizado pelo agente.

Compose principal alterado para consumir `ghcr.io/gustabessa/fleetlog:main` sem build; `FLEETLOG_IMAGE` permite selecionar versão. Dockerfile mantido para CI. Ambos os Compose usam imagens prontas; publicação/pull real ainda dependem do homelab.
