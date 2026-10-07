# FleetLog — andamento

Atualizado em 2026-10-07. Plano de produto: [docs/FleetLog-plan.md](docs/FleetLog-plan.md).

## Decisões de implementação

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
- [ ] Executar build/health checks Docker Compose (Docker indisponível neste ambiente).
- [ ] Validar HTTPS no Dokploy e instalação PWA em dispositivos reais.

Checklist de implantação: [docs/deployment-checklist.md](docs/deployment-checklist.md).

## Build gerenciado pelo Dokploy

- [x] Compose específico com build local da imagem, porta interna e redes de proxy/banco.
- [x] Documentar fonte Git, branch, Compose Path, variáveis, domínio e atualização da imagem.
- [x] Validar contrato do Compose com CLI, sem deploy (Compose 2.40.3; imagem por projeto, redes, volume e ausência de portas publicadas).
- [ ] Enviar alterações ao remoto e configurar serviço no painel Dokploy.
- [ ] Executar primeiro build/deploy e validar domínio HTTPS/PWA.

Configuração: [compose.dokploy.yaml](compose.dokploy.yaml). Guia: [docs/dokploy.md](docs/dokploy.md).

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
Pendente: Docker Compose/build, HTTPS Dokploy e instalação PWA no sistema operacional. O PostgreSQL está apenas preparado no Compose; sem conexão ou migrações ainda.
Node 22.23.3 disponível. Go 1.27.1 baixado para `/tmp/go` com checksum oficial validado; não instalado no sistema.
Docker Engine indisponível neste ambiente. CLI Compose 2.40.3 extraído em `/tmp/fleetlog-compose-cli` para validar `compose.yaml` e `compose.dokploy.yaml`, ambos aprovados; build de imagem não executado. Frontend em `web/`, backend em `cmd/fleetlog` e `internal/httpserver`.
Playwright adicionado ao frontend. Testes: `cd web && npm run test:e2e`; requer Go e Chromium. Para este ambiente: `GO_BIN=/tmp/go/bin/go`, `GOCACHE=/tmp/fleetlog-gocache`, `PLAYWRIGHT_BROWSERS_PATH=/tmp/fleetlog-browsers`, `LD_LIBRARY_PATH=/tmp/fleetlog-browser-deps/root/usr/lib/x86_64-linux-gnu`, Node no PATH. Browser e bibliotecas extraídos apenas em `/tmp`; são temporários e precisam ser preparados novamente caso removidos.
Próxima etapa técnica: conexão PostgreSQL/migrações e login local; antes de implementar inclusão de familiares, definir permissões.
Para retomar: ler este arquivo e o plano, conferir git status e executar os checks do README.
Ícones simples provisórios com a letra F; idioma pt-BR provisório para esta base. O frontend usa Angular 22.2 e Node 22; Go 1.27.

Build no Dokploy preparado em `compose.dokploy.yaml`: GitHub/main -> Dockerfile -> imagem local por projeto. Próxima ação de implantação: enviar arquivos ao remoto, configurar Compose Path/Environment/Domains no painel conforme `docs/dokploy.md` e executar primeiro deploy. Nenhum acesso ao painel ou deploy foi realizado nesta sessão.
