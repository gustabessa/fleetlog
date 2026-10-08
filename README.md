# FleetLog

Garagem familiar em uma PWA Angular, com backend Go e PostgreSQL, para implantação no homelab.

**Status:** primeira base executável. Shell responsivo, temas claro/escuro, manifest e service worker, servidor de arquivos SPA e health check. Login local, logout, sessões e migração inicial PostgreSQL implementados. Garagem persistida com vínculo ao usuário e consulta autorizada implementada. Gestão de veículos, inclusão de familiares e OIDC ainda pendentes.

Veja [TODO.md](TODO.md) para andamento e retomada e [plano de produto](docs/FleetLog-plan.md) para requisitos e propostas pendentes.

## Desenvolvimento

Requisitos: Node 22.22.3+ na linha 22 e Go 1.27+.

```sh
cd web
npm ci
npm run build
cd ..
# Configure DATABASE_URL (or PG*), PUBLIC_URL and first-user bootstrap.
go run ./cmd/fleetlog
```

Acesse `http://localhost:8080`. O service worker é habilitado no build de produção; HTTPS é obrigatório fora de localhost. Para editar somente o frontend, execute `npm start` em `web/` (service worker desabilitado em desenvolvimento).

```sh
go test ./...
go vet ./...
# Integration: creates an isolated schema and removes it after each test.
TEST_DATABASE_URL=postgres://USER:PASSWORD@localhost:5432/fleetlog_test go test ./internal/auth
```

Para os testes de navegador (Chromium desktop e mobile):

```sh
cd web
npx playwright install --with-deps chromium
E2E_DATABASE_URL=postgres://USER:PASSWORD@localhost:5432/fleetlog_e2e npm run test:e2e
```

O comando faz o build de produção e inicia o servidor Go na porta local 4173, servindo uma cópia temporária do bundle. Requer Go no PATH; alternativamente, informe `GO_BIN=/caminho/para/go`. Use um banco exclusivo de testes; o servidor cria nele o usuário sintético `e2e`. Os testes verificam login/logout, temas, layout, rotas, manifest, service worker, API sem cache e atualização de versão. Artefatos ficam em `web/test-results/`, fora do Git.

## Docker e Dokploy

```sh
cp .env.example .env
# Defina POSTGRES_PASSWORD, PUBLIC_URL e as credenciais de bootstrap no .env.
docker compose up -d
```

O Dockerfile compila Angular e Go em estágios separados. A imagem final roda sem root e não inclui Node. O Go serve frontend e futura API na mesma origem. Configure o domínio HTTPS no Dokploy com destino no serviço `fleetlog-service`, porta 8080. O banco não publica porta externa; os dados persistem no volume `postgres_data`.

`compose.yaml` baixa a imagem pronta do GHCR, sem build e sem exigir Node/Go na máquina. Por padrão usa `ghcr.io/gustabessa/fleetlog:main`; `FLEETLOG_IMAGE` permite escolher uma tag específica. A imagem precisa ter sido publicada pela pipeline. Se privada, autentique-se antes com `docker login ghcr.io`. Em produção no Dokploy, use `compose.registry.yaml` com provider Raw e defina `FLEETLOG_IMAGE` como `ghcr.io/gustabessa/fleetlog:sha-COMMIT_PUBLICADO` no Environment, junto de `POSTGRES_PASSWORD`, `PUBLIC_URL` e as credenciais de bootstrap no primeiro deploy. O arquivo usa a rede externa `dokploy-network` e não publica portas no host. Para imagem privada, configure autenticação GHCR no servidor de implantação.

O CI Woodpecker usa `.woodpecker/build.yaml` para testar Go, construir o Dockerfile e publicar tags `main` e `sha-COMMIT` no GHCR. Cada promoção em produção é manual: atualize `FLEETLOG_IMAGE` para a versão aprovada e faça Deploy. A instalação do Woodpecker é gerenciada no painel Dokploy.

`/healthz` verifica o processo HTTP; `/readyz` verifica a conexão com PostgreSQL. A imagem oferece o comando `fleetlog healthcheck` para o health check Docker.

## Configuração atual

| Opção | Onde | Padrão | Uso |
| --- | --- | --- | --- |
| `APP_PORT` | Compose / `.env` | `8080` | Porta publicada da aplicação |
| `FLEETLOG_IMAGE` | Compose / Dokploy | `ghcr.io/gustabessa/fleetlog:main` no Compose principal; obrigatório no Compose de produção | Imagem GHCR; use tag do commit aprovado em produção |
| `POSTGRES_PASSWORD` | Compose / `.env` | obrigatório | Senha na inicialização do banco |
| `PUBLIC_URL` | Processo Go / Compose | `http://localhost:8080` no Compose local; obrigatório no processo/produção | Origem usada na proteção CSRF; HTTPS ativa cookie Secure |
| `BOOTSTRAP_USERNAME` | Processo Go / Compose | obrigatório apenas sem usuários | Login do primeiro usuário (até 64 bytes) |
| `BOOTSTRAP_PASSWORD` | Processo Go / Compose | obrigatório apenas sem usuários | Senha inicial de 12 a 72 bytes; remover após criação |
| `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`, `PGSSLMODE` | Processo Go | fornecidos pelo Compose | Conexão PostgreSQL; Compose usa host fleetlog-db, porta 5432, banco/usuário fleetlog, senha do banco e sslmode disable na rede interna |
| `DATABASE_URL` | Processo Go | opcional | Connection string alternativa; sobrepõe parâmetros PG* presentes nela |
| `HTTP_ADDR` | Processo Go | `:8080` | Endereço HTTP; manter padrão no container |
| `STATIC_DIR` | Processo Go | `web/dist/fleetlog/browser` | Diretório do build Angular; Docker usa `/app/web` |

Recrie o serviço afetado após mudar variáveis (`docker compose up -d`). A senha PostgreSQL só é aplicada ao inicializar um volume vazio; mudar a variável não altera a senha de um banco existente. Secrets ficam fora do repositório.

OIDC e S3/RustFS terão documentação e variáveis quando suas integrações forem implementadas. Preferências como moeda ficarão no perfil.

## Primeiro acesso e sessões

O startup aplica migrações SQL versionadas em transação com lock, criando usuários, sessões, garagens/vínculos e a reserva de identidades externas (`issuer` + `subject`). Com a tabela de usuários vazia, exige bootstrap e grava a senha com bcrypt. Reiniciar ou mudar bootstrap não altera contas existentes. Não existe cadastro público; criação de familiares e recuperação/troca de senha entram nas próximas etapas.

Para publicar esta versão no Dokploy, atualize o Raw Compose a partir de `compose.registry.yaml` (novas variáveis PG*), mantenha o volume/senha existentes e defina `PUBLIC_URL=https://SEU-DOMINIO`, `BOOTSTRAP_USERNAME` e `BOOTSTRAP_PASSWORD`. Depois do primeiro login, remova bootstrap e recrie o serviço. Não use a URL do painel Dokploy como PUBLIC_URL: é o domínio do FleetLog.

Sessões expiram em 24 horas; tokens aleatórios são armazenados somente como hash no banco. Cookies são HttpOnly/SameSite Strict e Secure em HTTPS. Login/logout exigem JSON e Origin igual a PUBLIC_URL, sem confiar em headers de proxy. Login tem limite global de 20 tentativas por minuto por instância; sessões expiradas são limpas em novos logins. APIs privadas usam no-store e logout revoga a sessão no servidor. OIDC terá callback/configuração próprios, reutilizando usuários e sessões; não há vinculação automática por e-mail.

## Garagem e autorização

As migrações ficam em `internal/database/migrations/`. A versão 001 foi preservada; a versão 002 adiciona garagens e vínculos. No primeiro upgrade, cada conta já existente recebe uma garagem própria, sem alterar senhas/sessões. Em um banco vazio, o bootstrap cria o usuário e sua garagem na mesma transação. Reinícios não duplicam garagens nem vinculam automaticamente contas criadas depois; inclusão de familiares terá fluxo explícito.

| API | Resposta |
| --- | --- |
| `GET /api/garages` | Garagens vinculadas à sessão atual; lista vazia se não há vínculo |
| `GET /api/garages/{garageID}` | Identificador e nome da garagem, somente para membros |

Sem sessão válida, as rotas retornam 401. ID inexistente/inacessível retorna 404 com a mesma resposta, evitando revelar outra garagem. Respostas usam no-store; expiração, revogação da sessão e vínculo são conferidos em cada chamada.

`auth.RequireUser` fornece usuário autenticado no contexto; `auth.RequireWrite` também exige JSON/origem válida. `garage.RequireMember` fornece a garagem autorizada no contexto e protege futuras rotas com `{garageID}`. Permissões de escrita/gestão dos familiares continuam pendentes; esta etapa entrega somente consultas.

A tela autenticada busca a garagem real, com estados de carregamento, erro/nova tentativa e ausência de vínculo. Usa a primeira garagem da lista ordenada por ID; escolha entre múltiplas garagens não é uma funcionalidade entregue. Prévia visual e dados fictícios continuam separados.

Não há novas variáveis de ambiente nesta etapa. Publique a imagem e faça deploy preservando o volume existente; a migração 002 é aplicada no startup. Não edite migrações já aplicadas: novas mudanças devem acrescentar outra versão.

## PWA e atualização

O service worker guarda apenas arquivos do aplicativo e ícones. APIs e imagens privadas não entram no cache; operações de domínio continuarão online. O servidor revalida arquivos e não usa fallback HTML para assets ausentes ou para `/api/`. Cada imagem Docker contém um build completo, evitando publicação parcial do bundle.

Quando uma nova versão está pronta, a interface oferece **Atualizar agora**; a página só recarrega após o clique. Um estado irrecuperável do service worker oferece **Recarregar**. Rotas que ainda não existem voltam para a garagem.

Service worker e atualização validados em Chromium automatizado desktop/mobile, via localhost. Execução Docker, HTTPS no Dokploy e instalação pelo sistema operacional ainda pendentes; ver [checklist de implantação](docs/deployment-checklist.md).
