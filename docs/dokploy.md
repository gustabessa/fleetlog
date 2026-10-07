# Build e implantação no Dokploy

O Dokploy busca o repositório, constrói a imagem com o Dockerfile multi-stage e gerencia aplicação e PostgreSQL via Docker Compose. A imagem é armazenada no Docker do servidor de implantação. Este fluxo não publica imagens em um registry nem exige GitHub Actions.

## Configurar o serviço

1. No projeto/ambiente do Dokploy, crie um serviço **Docker Compose** chamado FleetLog. Escolha o modo **Docker Compose**, não Stack: Stack não suporta `build`.
2. Conecte a fonte GitHub (ou Git) ao repositório `https://github.com/gustabessa/fleetlog`, branch `main`.
3. Informe **Compose Path**: `./compose.dokploy.yaml`. O contexto de build é a raiz do repositório; o Dockerfile está em `./Dockerfile`.
4. Em **Environment**, defina `POSTGRES_PASSWORD` com uma senha longa e exclusiva. Não copie `APP_PORT`: a configuração Dokploy não publica portas no host.
5. Em **Domains**, adicione seu domínio com serviço **app**, porta de container **8080**, caminho **/** e HTTPS habilitado. O DNS precisa apontar para o servidor/proxy que atende a implantação.
6. Use **Preview Compose** e confirme que `app` mantém as redes `backend` e `dokploy-network`, que `db` permanece na rede `backend` e que o domínio recebeu labels de roteamento.
7. Faça **Deploy** e acompanhe os logs de build/deploy. Confirme os serviços saudáveis e abra o domínio.

Referências: [Docker Compose no Dokploy](https://docs.dokploy.com/docs/core/docker-compose), [domínios e redes](https://docs.dokploy.com/docs/core/docker-compose/domains).

## Imagem e novos builds

O nome da imagem é `fleetlog-${COMPOSE_PROJECT_NAME}:latest`, usando o nome de projeto Compose definido pelo Dokploy; fora dele, o fallback é `fleetlog-homelab:latest`. `pull_policy: build` manda construir a imagem a partir do código em cada deploy, aproveitando o cache de camadas do Docker. Não precisa cadastrar credenciais de registry para essa imagem local.

Depois de enviar commits à branch configurada, execute **Deploy** para construir e substituir a aplicação. Opcionalmente, habilite **Auto Deploy** na integração Git do Dokploy, verificando que acompanha somente a branch desejada. Um commit apenas local não chega ao servidor: precisa estar no repositório remoto.

O banco usa volume nomeado persistente, separado da imagem. Mantenha o mesmo serviço/projeto Compose para preservar a associação com o volume. Alterar `POSTGRES_PASSWORD` após inicialização não altera a senha do banco existente.

Não troque para Stack ou um servidor de build separado com este arquivo. Esses cenários exigem um registry acessível ao servidor de implantação e um fluxo de publicação de imagem. O Dokploy gerencia o build e o uso da imagem neste fluxo; não está configurado como servidor de registry.

## Rede e HTTPS

`app` entra em `dokploy-network` para o proxy e mantém `backend` para comunicação com `db`. O banco não publica porta e não entra na rede compartilhada do proxy. `dokploy-network` precisa existir no servidor de implantação, como na instalação padrão Dokploy. Caso use redes personalizadas/isolamento automático, confira o Preview Compose e preserve uma rede comum a `app` e `db`.

O Go escuta HTTP na porta 8080 dentro do container; o proxy do Dokploy termina HTTPS. Não monte certificados na aplicação. Publique na raiz do domínio: o build Angular atual usa `base href="/"`.

## Verificar a implantação

- Abra `/healthz` e confirme `{"status":"ok"}`.
- Confirme que aplicação e banco ficam saudáveis no painel.
- Abra a garagem e alterne temas, inclusive após recarregar.
- Confirme manifest e service worker pelo domínio HTTPS e instale a PWA no dispositivo.
- Num próximo build, confirme o aviso **Atualizar agora**.

Veja também o [checklist de implantação](deployment-checklist.md).

Esta fase ainda não tem login ou persistência de veículos; PostgreSQL está preparado, mas a aplicação não o utiliza. O health check da aplicação verifica somente HTTP.

## Validação sem deploy

Com Docker Compose disponível, valide o arquivo sem subir serviços:

```sh
POSTGRES_PASSWORD=validation-only docker compose -f compose.dokploy.yaml config --quiet
```

Use uma senha real exclusivamente no Environment do Dokploy. A configuração no repositório não configura automaticamente o painel nem realiza deploy; repositório, domínio e variáveis devem ser preenchidos lá.
