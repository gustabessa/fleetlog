# Hospede sua própria garagem

[Documentação](README.md) · [Apresentação](../README.md) · [Referência de configuração](technical-reference.md)

O FleetLog roda como uma aplicação Docker e um PostgreSQL. O frontend Angular e o backend Go vêm na mesma imagem. S3 para fotos e OpenID Connect para login são opcionais. Sem S3 você pode usar a garagem, os registros e os custos; uploads de imagens ficam indisponíveis.

## Antes de começar

Tenha Docker Engine com Docker Compose v2 e um local persistente para os dados do PostgreSQL. Para acesso fora de localhost, prepare um domínio e um proxy reverso com HTTPS. Os exemplos usam `fleetlog.qbsoft.dev`: substitua pelo seu domínio.

Escolha uma versão em [Releases](https://github.com/gustabessa/fleetlog/releases) e confira se o build correspondente terminou e publicou a imagem no [GHCR](https://github.com/users/gustabessa/packages/container/package/fleetlog). Um GitHub Release pode aparecer antes da imagem. Use uma tag fixa, por exemplo `v0.2.0`, em vez de depender da tag móvel `main` em produção.

## 1. Obtenha a configuração

```sh
git clone https://github.com/gustabessa/fleetlog.git
cd fleetlog
cp .env.example .env
```

Edite `.env` e substitua os valores de exemplo:

```dotenv
FLEETLOG_IMAGE=ghcr.io/gustabessa/fleetlog:v0.2.0
POSTGRES_PASSWORD=SUBSTITUA_POR_UMA_SENHA_ALEATORIA_LONGA
PUBLIC_URL=http://localhost:8080
APP_PORT=8080
BOOTSTRAP_USERNAME=admin
BOOTSTRAP_PASSWORD=SUBSTITUA_POR_UMA_SENHA_UNICA_FORTE
```

A senha inicial do usuário deve ter entre 12 e 72 bytes. O arquivo `.env` não deve entrar no Git. `POSTGRES_PASSWORD` inicializa o banco; mudar essa variável depois não altera a senha de um volume PostgreSQL já inicializado.

Se o package estiver privado, autentique o servidor no GHCR com uma credencial de leitura (`read:packages`) antes do próximo passo. Não use o token de releases para o servidor baixar imagens.

## 2. Inicie e entre

```sh
docker compose pull
docker compose up -d
docker compose ps
```

Abra `http://localhost:8080` e entre com as credenciais de bootstrap. A primeira inicialização cria a conta e a garagem; não há cadastro público. Depois do primeiro acesso, remova `BOOTSTRAP_USERNAME` e `BOOTSTRAP_PASSWORD` do `.env` e recrie o serviço com `docker compose up -d`. A conta permanece no banco; o bootstrap não redefine sua senha.

Para compartilhar a garagem, use a gestão de membros com contas individuais. Confira as opções de login e [vínculo OIDC](technical-reference.md#oidc-e-vínculo-de-contas) antes de desativar o acesso local.

## 3. Publique com HTTPS

Aponte seu proxy reverso para a porta 8080 da aplicação e configure:

```dotenv
PUBLIC_URL=https://fleetlog.qbsoft.dev
```

Use a origem exata, sem caminho adicional. Ela é usada na validação de escrita e nos cookies; uma URL diferente da usada pelo navegador pode causar falhas de login ou de gravação. Recrie o container após mudar variáveis.

No Compose padrão, `APP_PORT` publica a porta da aplicação no host. Se o proxy for o único ponto de entrada externo, limite essa porta na configuração de rede do seu servidor. A porta do banco não é publicada.

## Alternativa: Dokploy

1. Crie um serviço **Docker Compose**, provider **Raw**, com o conteúdo de [`compose.registry.yaml`](../compose.registry.yaml).
2. No Environment do Dokploy, defina `FLEETLOG_IMAGE`, `POSTGRES_PASSWORD`, `PUBLIC_URL` e as credenciais de bootstrap do primeiro acesso. O arquivo não lê o `.env` da sua máquina.
3. Configure o domínio HTTPS com destino em `fleetlog-service`, porta `8080`. O Compose usa a rede externa `dokploy-network`, que deve existir no ambiente Dokploy.
4. Se a imagem estiver privada, configure a autenticação do GHCR no servidor de implantação.
5. Faça Deploy, confira os logs e entre na aplicação. Depois remova o bootstrap do Environment e faça novo Deploy.

Esse Compose mantém o PostgreSQL em rede interna e não publica portas no host. O deploy é manual: trocar a imagem no Environment não a publica nem valida o pipeline. Siga o [fluxo de releases](releases.md).

## Fotos e anexos com S3

Crie um bucket **privado** em um serviço compatível com S3 e uma credencial limitada ao prefixo `vehicles/`. O FleetLog não cria o bucket. Configure:

```dotenv
S3_ENDPOINT=https://s3.qbsoft.dev
S3_REGION=us-east-1
S3_BUCKET=fleetlog-private
S3_ACCESS_KEY_ID=SUA_CHAVE
S3_SECRET_ACCESS_KEY=SEU_SEGREDO
S3_PATH_STYLE=true
```

O endpoint é opcional para AWS. `S3_PATH_STYLE` depende do provedor; no RustFS, normalmente é `true`. O servidor precisa de PutObject/GetObject/DeleteObject. Imagens são entregues pela API autenticada, sem transformar o bucket em público. Limites: JPEG, PNG ou WebP, até 10 MB e 20 megapixels. Veja [detalhes de armazenamento](technical-reference.md#imagens-privadas-de-veículos).

## Login com OpenID Connect

Configure `OIDC_ISSUER` e `OIDC_CLIENT_ID`; `OIDC_CLIENT_SECRET` depende do tipo de cliente. Registre no provedor o callback `https://fleetlog.qbsoft.dev/api/auth/oidc/callback` ou o caminho configurado em `OIDC_CALLBACK_PATH`.

As pessoas precisam de contas internas e vínculo explícito no perfil. E-mail e nome do provedor não criam nem associam usuários automaticamente. Mantenha login local até vincular e testar todas as contas necessárias. Só então considere `AUTH_LOCAL_ENABLED=false`. Veja a [referência OIDC](technical-reference.md#oidc-e-vínculo-de-contas).

## Atualizações

1. Confira release notes e sucesso do pipeline da nova tag.
2. Faça backup do PostgreSQL e dos objetos S3.
3. Altere `FLEETLOG_IMAGE` para a nova versão no `.env` ou Dokploy.
4. No Compose, execute `docker compose pull` e `docker compose up -d`; no Dokploy, faça Deploy.
5. Confira `/readyz`, o login e os fluxos principais. A PWA oferece **Atualizar agora** quando detectar o novo bundle.

Migrações de banco são aplicadas na inicialização. O rodapé identifica a versão da interface carregada. Um navegador com atualização pendente pode continuar mostrando a versão anterior até recarregar.

## Backup e recuperação

No Compose padrão, os dados ficam no volume `postgres_data` (com prefixo do projeto Compose). Não use `docker compose down -v` durante atualização: esse comando remove volumes. Fotos e anexos ficam no bucket S3 e exigem backup separado. Preserve também as configurações e credenciais de forma privada.

Exemplo de dump lógico do PostgreSQL:

```sh
docker compose exec -T fleetlog-db pg_dump -U fleetlog -d fleetlog -Fc > fleetlog-backup.dump
```

Mantenha cópias fora do mesmo servidor e teste a restauração em um ambiente separado. Para restaurar um dump compatível em uma instalação preparada com o banco em execução e sem usuários gravando:

```sh
docker compose stop fleetlog-service
docker compose exec -T fleetlog-db pg_restore --clean --if-exists --exit-on-error -U fleetlog -d fleetlog < fleetlog-backup.dump
docker compose up -d fleetlog-service
```

A restauração substitui os objetos do banco pelo conteúdo do backup. Use uma imagem de aplicação compatível com esse backup. Voltar apenas a tag da imagem não desfaz migrações; quando houver incompatibilidade de schema, restaure o banco compatível e os objetos S3 correspondentes. No Dokploy, use os recursos de backup e execução do serviço equivalentes.

## Diagnóstico

| Sintoma                                | Confira                                                                                                                                  |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Imagem não baixa                       | Tag publicada, conclusão do pipeline e autenticação GHCR se privada.                                                                     |
| Aplicação não inicia                   | `docker compose logs --tail=100 fleetlog-service fleetlog-db`, senha e disponibilidade do PostgreSQL. Não publique logs com credenciais. |
| Login ou gravação falha atrás do proxy | Origem exata em `PUBLIC_URL`, HTTPS e acesso ao backend pelo proxy.                                                                      |
| Upload não funciona                    | Bucket privado existente, credenciais S3, permissões e endpoint/path style.                                                              |
| Layout permanece antigo                | Aviso de atualização da PWA, versão do rodapé e imagem efetivamente implantada.                                                          |

`/healthz` verifica o processo HTTP; `/readyz` também verifica o banco. A imagem inclui `fleetlog healthcheck`. A API e as imagens privadas não são cacheadas pela PWA. Para detalhes de variáveis e operação, veja a [referência técnica](technical-reference.md) e o [checklist de implantação](deployment-checklist.md).
