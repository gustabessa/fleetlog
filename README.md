# FleetLog

Garagem familiar em uma PWA Angular, com backend Go e PostgreSQL, para implantação no homelab.

**Status:** núcleo do produto implementado e validado localmente. Garagem familiar, veículos, odômetro/auditoria, abastecimentos/consumo, manutenção direta/detalhada, itens/preços históricos, notas/compra/venda/documentação, fotos privadas S3, perfil, histórico/gráficos e OIDC com vínculo explícito. Operações online; instalação real da PWA e infraestrutura continuam em validação separada.

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
TEST_DATABASE_URL=postgres://USER:PASSWORD@localhost:5432/fleetlog_test go test -count=1 ./...
```

Para os testes de navegador (Chromium desktop e mobile):

```sh
cd web
npx playwright install --with-deps chromium
E2E_DATABASE_URL=postgres://USER:PASSWORD@localhost:5432/fleetlog_e2e npm run test:e2e
```

O comando faz o build de produção e inicia o servidor Go na porta local 4173, servindo uma cópia temporária do bundle. Requer Go no PATH; alternativamente, informe `GO_BIN=/caminho/para/go`. Use um banco exclusivo de testes; o servidor cria nele o usuário sintético `e2e`. Os testes verificam acesso, formulários reais/persistência, compartilhamento/revogação, valores/moedas, histórico/gráficos, temas, layout e PWA. O runner usa fixtures descartáveis de protocolo S3 e provedor OIDC assinado; Go e PostgreSQL são reais. Não acessa provedores nem infraestrutura do homelab. Artefatos ficam em `web/test-results/`, fora do Git.

## Docker e Dokploy

```sh
cp .env.example .env
# Defina POSTGRES_PASSWORD, PUBLIC_URL e as credenciais de bootstrap no .env.
docker compose up -d
```

O Dockerfile compila Angular e Go em estágios separados. A imagem final roda sem root e não inclui Node. O Go serve frontend e API na mesma origem. Configure o domínio HTTPS no Dokploy com destino no serviço `fleetlog-service`, porta 8080. O banco não publica porta externa; os dados persistem no volume `postgres_data`.

`compose.yaml` baixa a imagem pronta do GHCR, sem build e sem exigir Node/Go na máquina. Por padrão usa `ghcr.io/gustabessa/fleetlog:main`; `FLEETLOG_IMAGE` permite escolher uma tag específica. A imagem precisa ter sido publicada pela pipeline. Se privada, autentique-se antes com `docker login ghcr.io`. Em produção no Dokploy, use `compose.registry.yaml` com provider Raw e defina `FLEETLOG_IMAGE` como `ghcr.io/gustabessa/fleetlog:sha-COMMIT_PUBLICADO` no Environment, junto de `POSTGRES_PASSWORD`, `PUBLIC_URL` e as credenciais de bootstrap no primeiro deploy. O arquivo usa a rede externa `dokploy-network` e não publica portas no host. Para imagem privada, configure autenticação GHCR no servidor de implantação.

O CI Woodpecker usa `.woodpecker/build.yaml` para testar Go, construir o Dockerfile e publicar tags `main` e `sha-COMMIT` no GHCR. Cada promoção em produção é manual: atualize `FLEETLOG_IMAGE` para a versão aprovada e faça Deploy. A instalação do Woodpecker é gerenciada no painel Dokploy.

`/healthz` verifica o processo HTTP; `/readyz` verifica a conexão com PostgreSQL. A imagem oferece o comando `fleetlog healthcheck` para o health check Docker.

## Configuração atual

| Opção                                                                 | Onde                  | Padrão                                                                                      | Uso                                                                                                                                    |
| --------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `APP_PORT`                                                            | Compose / `.env`      | `8080`                                                                                      | Porta publicada da aplicação                                                                                                           |
| `FLEETLOG_IMAGE`                                                      | Compose / Dokploy     | `ghcr.io/gustabessa/fleetlog:main` no Compose principal; obrigatório no Compose de produção | Imagem GHCR; use tag do commit aprovado em produção                                                                                    |
| `POSTGRES_PASSWORD`                                                   | Compose / `.env`      | obrigatório                                                                                 | Senha na inicialização do banco                                                                                                        |
| `PUBLIC_URL`                                                          | Processo Go / Compose | `http://localhost:8080` no Compose local; obrigatório no processo/produção                  | Origem usada na proteção CSRF; HTTPS ativa cookie Secure                                                                               |
| `BOOTSTRAP_USERNAME`                                                  | Processo Go / Compose | obrigatório apenas sem usuários                                                             | Login do primeiro usuário (até 64 bytes)                                                                                               |
| `BOOTSTRAP_PASSWORD`                                                  | Processo Go / Compose | obrigatório apenas sem usuários                                                             | Senha inicial de 12 a 72 bytes; remover após criação                                                                                   |
| `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`, `PGSSLMODE` | Processo Go           | fornecidos pelo Compose                                                                     | Conexão PostgreSQL; Compose usa host fleetlog-db, porta 5432, banco/usuário fleetlog, senha do banco e sslmode disable na rede interna |
| `DATABASE_URL`                                                        | Processo Go           | opcional                                                                                    | Connection string alternativa; sobrepõe parâmetros PG* presentes nela                                                                  |
| `HTTP_ADDR`                                                           | Processo Go           | `:8080`                                                                                     | Endereço HTTP; manter padrão no container                                                                                              |
| `STATIC_DIR`                                                          | Processo Go           | `web/dist/fleetlog/browser`                                                                 | Diretório do build Angular; Docker usa `/app/web`                                                                                      |

Recrie o serviço afetado após mudar variáveis (`docker compose up -d`). A senha PostgreSQL só é aplicada ao inicializar um volume vazio; mudar a variável não altera a senha de um banco existente. Secrets ficam fora do repositório.

OIDC e S3 estão documentados abaixo; preferências de moeda/tema ficam no perfil. As variáveis novas são do processo Go e precisam ser encaminhadas à aplicação na implantação; o encaminhamento nos Compose não foi alterado nesta rodada, que exclui infraestrutura.

## Primeiro acesso e sessões

O startup aplica migrações SQL versionadas em transação com lock, criando usuários, sessões, garagens/vínculos e a reserva de identidades externas (`issuer` + `subject`). Com a tabela de usuários vazia, exige bootstrap e grava a senha com bcrypt. Reiniciar ou mudar bootstrap não altera contas existentes. Não existe cadastro público; o criador inclui familiares no painel. Troca/recuperação de senha local ficou fora da entrega por decisão do usuário.

Para publicar esta versão no Dokploy, atualize o Raw Compose a partir de `compose.registry.yaml` (novas variáveis PG*), mantenha o volume/senha existentes e defina `PUBLIC_URL=https://SEU-DOMINIO`, `BOOTSTRAP_USERNAME` e `BOOTSTRAP_PASSWORD`. Depois do primeiro login, remova bootstrap e recrie o serviço. Não use a URL do painel Dokploy como PUBLIC_URL: é o domínio do FleetLog.

Sessões expiram em 24 horas; tokens aleatórios são armazenados somente como hash no banco. Cookies são HttpOnly/SameSite Strict e Secure em HTTPS. Login/logout exigem JSON e Origin igual a PUBLIC_URL, sem confiar em headers de proxy. Login local tem limite global de 20 tentativas malsucedidas/concorrentes por minuto por instância; logins concluídos não consomem esse orçamento; sessões expiradas são limpas em novos logins. APIs privadas usam no-store e logout revoga a sessão no servidor. OIDC tem callback/configuração próprios, reutilizando usuários e sessões; não há vinculação automática por e-mail.

## Garagem e autorização

As migrações ficam em `internal/database/migrations/`. A versão 001 foi preservada; a versão 002 adiciona garagens e vínculos. No primeiro upgrade, cada conta já existente recebe uma garagem própria, sem alterar senhas/sessões. Em um banco vazio, o bootstrap cria o usuário e sua garagem na mesma transação. Reinícios não duplicam garagens nem vinculam automaticamente contas criadas depois; inclusão de familiares tem fluxo explícito por criador.

| API                           | Resposta                                                          |
| ----------------------------- | ----------------------------------------------------------------- |
| `GET /api/garages`            | Garagens vinculadas à sessão atual; lista vazia se não há vínculo |
| `GET /api/garages/{garageID}` | Identificador e nome da garagem, somente para membros             |

Sem sessão válida, as rotas retornam 401. ID inexistente/inacessível retorna 404 com a mesma resposta, evitando revelar outra garagem. Respostas usam no-store; expiração, revogação da sessão e vínculo são conferidos em cada chamada.

`auth.RequireUser` fornece usuário autenticado no contexto; `auth.RequireWrite` também exige JSON/origem válida. `garage.RequireMember` consulta o vínculo em cada chamada. `RequireMemberWrite` autoriza dados do produto; `RequireCreator`/`RequireCreatorWrite` protegem gestão de membros. Remover acesso preserva autoria/histórico e bloqueia a próxima chamada com sessão ativa.

A tela oferece seleção entre garagens vinculadas. `canManage` indica capacidade de administrar membros; novas contas familiares não recebem outra garagem automaticamente. APIs de membros: GET/POST `/api/garages/{garageID}/members`, DELETE no mesmo caminho + `/{userID}`. Nova conta recebe senha inicial; incluir uma existente não muda senha/identidades.

Migrações aplicadas são imutáveis; alterações acrescentam versões. Nenhum comando de implantação é necessário para executar os testes locais do produto.

## Veículos básicos

Nome/modelo (um campo textual) e quilometragem inicial são obrigatórios. Placa, marca, ano, chassi e RENAVAM são opcionais. Chassi/RENAVAM são campos próprios, guardados como texto e copiáveis na tela de detalhes. Notas, compra/venda, fotos, leituras e lançamentos são seções reais dos detalhes.

| API                                                | Uso                                             |
| -------------------------------------------------- | ----------------------------------------------- |
| `GET /api/garages/{garageID}/vehicles`             | Lista de veículos da garagem autorizada         |
| `GET /api/garages/{garageID}/vehicles/{vehicleID}` | Detalhes, com escopo da garagem                 |
| `POST /api/garages/{garageID}/vehicles`            | Criar veículo (membro da garagem)               |
| `PUT /api/garages/{garageID}/vehicles/{vehicleID}` | Substituir campos editáveis (membro da garagem) |

Corpo de criação: `name`, `plate`, `brand`, `year` (inteiro ou null), `chassis`, `renavam` e `initialKm` (número decimal não negativo, até três casas e 999999999.999 km). O backend guarda odômetro como numeric e devolve `initialKm` como texto decimal. Na edição, não envie `initialKm`: esse valor é preservado; leituras e lançamentos atualizam `currentKm`, preservando o inicial. Venda arquiva; `includeArchived=true` inclui vendidos na listagem. DELETE no caminho de detalhe exige ausência de histórico, incluindo auditoria.

Limites: nome 120 caracteres, placa 32, marca 100, chassi/RENAVAM 64; ano opcional entre 1 e 9999. O cadastro não força formato nacional de placa/identificadores. Campos inválidos retornam 400 e nomes dos campos em `fields`; gestão de membros por não criador retorna 403; veículo de outra garagem retorna 404. APIs não são cacheadas.

A migração 003 adiciona veículos sem alterar dados das migrações anteriores. No deploy, preserve o volume do banco. Sem novas variáveis de ambiente. Home/detalhes reais são separados da prévia. Cards exibem foto privada ou placeholder e quilometragem atual; o km inicial tem origem/autoria do cadastro.

## PWA e atualização

O service worker guarda apenas arquivos do aplicativo e ícones. APIs e imagens privadas não entram no cache; operações de domínio são online. O servidor revalida arquivos e não usa fallback HTML para assets ausentes ou para `/api/`. Cada imagem Docker contém um build completo, evitando publicação parcial do bundle.

Quando uma nova versão está pronta, a interface oferece **Atualizar agora**; a página só recarrega após o clique. Um estado irrecuperável do service worker oferece **Recarregar**. Rotas que ainda não existem voltam para a garagem.

Service worker e atualização validados em Chromium automatizado desktop/mobile, via localhost. Execução Docker, HTTPS no Dokploy e instalação pelo sistema operacional ainda pendentes; ver [checklist de implantação](docs/deployment-checklist.md).

### Imagens privadas de veículos

Configure `S3_BUCKET`, `S3_ACCESS_KEY_ID` e `S3_SECRET_ACCESS_KEY` para habilitar uploads.
`S3_ENDPOINT` é opcional (sem ele usa AWS); `S3_REGION` padrão `us-east-1`;
`S3_PATH_STYLE` padrão `false` (normalmente `true` com RustFS). Reinicie a aplicação
após mudar essas variáveis. O bucket já deve existir e permanecer privado; a
aplicação usa apenas PutObject/GetObject/DeleteObject. Credenciais precisam de
acesso somente ao prefixo `vehicles/`. As imagens são lidas pela API autenticada,
sem links públicos nem cache privado. JPEG/PNG/WebP: até 10 MB e 20 megapixels.

Reservas/remoções são persistidas no banco. Limpezas pendentes são repetidas a
cada minuto e após reinício; uploads interrompidos são removidos após uma hora.
Configurar o servidor RustFS, criar bucket e validar a versão no homelab são
ações externas a esta entrega de código; o cliente segue o contrato S3.

### OIDC e vínculo de contas

`OIDC_ISSUER` e `OIDC_CLIENT_ID` habilitam discovery e login com provedor.
`OIDC_CLIENT_SECRET` é opcional para cliente público com PKCE; clientes
confidenciais devem configurá-lo. `OIDC_DISCOVERY_URL` opcional substitui a URL
do documento, mas seu issuer deve continuar idêntico a `OIDC_ISSUER`.
`OIDC_SCOPES` padrão `openid profile`; openid sempre é incluído.
`OIDC_CALLBACK_PATH` padrão `/api/auth/oidc/callback`, podendo usar um caminho
sob `/api/auth/oidc/callback/`. Redirect URI: `PUBLIC_URL` + esse caminho.
URLs do provedor exigem HTTPS; HTTP somente para localhost/loopback de testes.
Reinicie a aplicação após alterar variáveis. OIDC mal configurado falha no
início; não há fallback silencioso de verificação.

O criador cadastra/vincula o usuário da família. Cada usuário entra com sua
conta local temporária, abre Perfil e escolhe **Vincular conta do provedor**.
Depois usa **Entrar com provedor**. A identidade é issuer + subject; nome/e-mail
não criam nem associam contas. Um vínculo existente não pode ser transferido
para outro usuário; remover alguém da garagem conserva identidade/autoria.
Trocar issuer exige vincular explicitamente a nova identidade (sem migrar por
subject ou e-mail). Nenhum token de acesso/refresh do provedor fica no banco.

`AUTH_LOCAL_ENABLED` padrão `true`. Pode ser `false` quando o administrador e
os usuários necessários já estiverem vinculados; sem OIDC a aplicação rejeita
essa configuração. Novas vinculações continuam exigindo uma sessão interna
válida; planeje provisionamento antes de desligar o login local. Logout revoga
a sessão FleetLog; não encerra a sessão global no provedor. Senha inicial não é
redefinida pelo bootstrap nem por reinclusão de familiar.

## Contratos de produto

Valores financeiros são strings decimais na API e numeric(18,6) no PostgreSQL;
moeda própria por registro. Veja [money.md](docs/money.md). Data civil `YYYY-MM-DD`
preenchida com hoje no navegador; autor obtido da sessão, não do corpo da API.

Sob `/api/garages/{garageID}/vehicles/{vehicleID}`:

- `/readings`: GET/POST; PUT/DELETE + `/{readingID}` para leitura avulsa. `/readings/audit` consulta rastreabilidade. Leituras financeiras são alteradas pelo lançamento de origem. Km inicial aparece com autoria/data do cadastro, sem inventar data civil de leitura passada.
- `/fuel`, `/service`, `/expense`: GET/POST; GET/PUT/DELETE + `/{entryID}`. Retornos carregam valor/moeda, detalhes e autor. Todo registro/odômetro/auditoria muda atomicamente.
- `/consumption`: consumo cheio a cheio; inclui parciais, sem métrica para referência/intervalo aberto/incompleto/distância zero. Exclusão de abastecimento invalida o próximo intervalo até conferência.
- `/notes`: GET/POST; PUT/DELETE + `/{noteID}`. `/ownership`: GET/PUT com compra/venda opcionais; venda arquiva, histórico permanece.
- `/image`: GET/PUT (bytes da imagem)/DELETE, exigindo acesso de garagem e Origin em escrita.

GET `/api/garages/{garageID}/items?q=...` pesquisa referências; `/{itemID}/prices`
no mesmo caminho consulta preços históricos por ocorrência. Modo detalhado de
manutenção usa mesma moeda, desconto/ajuste explícitos; modo direto não soma
itens. Troca de modo na interface pede confirmação.

GET `/api/garages/{garageID}/history`: filtros `vehicleId`, `kind`, `from`, `to`,
`q`, `currency`, `price` (±10%, exige moeda), `page` e `limit` (1–100).
Datas são inclusivas. A resposta traz lista paginada, contagem e agregações por
moeda/tipo/mês/veículo no mesmo snapshot; nenhuma conversão cambial automática.
Distância é observada entre leituras reais do período, com dados insuficientes
quando não houver duas. Aquisição/venda são dados patrimoniais separados dos
gastos operacionais. Alterar bucket/endpoint S3 não migra objetos existentes.
