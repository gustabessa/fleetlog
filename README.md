# FleetLog

Garagem familiar em uma PWA Angular, com backend Go e PostgreSQL, para implantação no homelab.

**Status:** primeira base executável. Shell responsivo, temas claro/escuro, manifest e service worker, servidor de arquivos SPA e health check. Login, persistência e funcionalidades de veículos ainda não implementados. O PostgreSQL do Compose está preparado, mas a aplicação ainda não o utiliza.

Veja [TODO.md](TODO.md) para andamento e retomada e [plano de produto](docs/FleetLog-plan.md) para requisitos e propostas pendentes.

## Desenvolvimento

Requisitos: Node 22.22.3+ na linha 22 e Go 1.27+.

```sh
cd web
npm ci
npm run build
cd ..
go run ./cmd/fleetlog
```

Acesse `http://localhost:8080`. O service worker é habilitado no build de produção; HTTPS é obrigatório fora de localhost. Para editar somente o frontend, execute `npm start` em `web/` (service worker desabilitado em desenvolvimento).

```sh
go test ./...
go vet ./...
```

## Docker e Dokploy

```sh
cp .env.example .env
# Substitua POSTGRES_PASSWORD no .env antes de iniciar.
docker compose up --build -d
```

O Dockerfile compila Angular e Go em estágios separados. A imagem final roda sem root e não inclui Node. O Go serve frontend e futura API na mesma origem. Configure o domínio HTTPS no Dokploy com destino no serviço `app`, porta 8080. O banco não publica porta externa; os dados persistem no volume `postgres_data`.

`/healthz` verifica somente o processo HTTP, não a conexão com PostgreSQL. A imagem oferece o comando `fleetlog healthcheck` para o health check Docker.

## Configuração atual

| Opção | Onde | Padrão | Uso |
| --- | --- | --- | --- |
| `APP_PORT` | Compose / `.env` | `8080` | Porta publicada da aplicação |
| `POSTGRES_PASSWORD` | Compose / `.env` | obrigatório | Senha na inicialização do banco |
| `HTTP_ADDR` | Processo Go | `:8080` | Endereço HTTP; manter padrão no container |
| `STATIC_DIR` | Processo Go | `web/dist/fleetlog/browser` | Diretório do build Angular; Docker usa `/app/web` |

Recrie o serviço afetado após mudar variáveis (`docker compose up -d`). A senha PostgreSQL só é aplicada ao inicializar um volume vazio; mudar a variável não altera a senha de um banco existente. Secrets ficam fora do repositório.

OIDC e S3/RustFS terão documentação e variáveis quando suas integrações forem implementadas. Preferências como moeda ficarão no perfil.

## PWA e atualização

O service worker guarda apenas arquivos do aplicativo e ícones. APIs e imagens privadas não entram no cache; operações de domínio continuarão online. O servidor revalida arquivos e não usa fallback HTML para assets ausentes ou para `/api/`. Cada imagem Docker contém um build completo, evitando publicação parcial do bundle.

Validação em navegador de instalação/atualização PWA e execução Docker ainda pendentes; ver TODO.md.
