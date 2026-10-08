# Validação de implantação — etapa 1

Os testes locais validam o bundle Angular de produção servido pelo Go em Chromium desktop e mobile. Este checklist cobre o que depende do Docker e da implantação real; não está marcado como executado.

## Docker Compose

O Compose baixa a imagem pronta do GHCR. Confirme a publicação da imagem e autentique com `docker login ghcr.io` se ela for privada. Para uma versão específica, defina `FLEETLOG_IMAGE` com a tag publicada.

- [ ] Copiar `.env.example` para `.env` e definir senha PostgreSQL, URL pública e credenciais do primeiro usuário.
- [ ] Executar `docker compose config --quiet` para validar interpolação/configuração.
- [ ] Executar `docker compose up -d` e confirmar `fleetlog-service` e `fleetlog-db` saudáveis em `docker compose ps`.
- [ ] Confirmar `docker compose exec fleetlog-service /app/fleetlog healthcheck` e `curl --fail http://localhost:8080/healthz`.
- [ ] Verificar que o processo da aplicação roda sem root: `docker compose exec fleetlog-service id`.
- [ ] Abrir a garagem e alternar temas; recarregar e confirmar a preferência.
- [ ] Confirmar acesso somente interno ao banco e volume `postgres_data` persistente.

O health check da aplicação verifica HTTP. `/readyz` verifica PostgreSQL; startup aplica migrações e cria o primeiro usuário via bootstrap.

## Dokploy e PWA

- [ ] Configurar domínio HTTPS com destino em `fleetlog-service:8080`, publicando o app na raiz do domínio.
- [ ] Confirmar `/healthz` e a garagem pelo domínio público.
- [ ] Confirmar `manifest.webmanifest` como `application/manifest+json`, ícones acessíveis e `ngsw-worker.js` sem redirecionamento ou fallback HTML.
- [ ] Confirmar service worker ativo no navegador e ausência de erros no console.
- [ ] Instalar a PWA pelo navegador em um computador e celular; abrir pelo ícone e conferir modo standalone.
- [ ] Publicar um novo build completo e confirmar aviso **Atualizar agora**; clicar e conferir carregamento da nova versão.
- [ ] Confirmar que `/api` e `/api/vehicles` retornam JSON 404 nesta base, sem HTML ou cache de dados.

Não use `docker compose down -v` para reiniciar a implantação: esse comando remove o volume do banco. A instalação no sistema operacional e o comportamento no domínio HTTPS precisam ser conferidos nos dispositivos reais; a emulação mobile não substitui esses checks.

- [ ] Atualizar o Raw Compose no Dokploy com as variáveis PG*, PUBLIC_URL e bootstrap; preservar volume e senha do banco.
- [ ] Validar login, recarga com sessão e logout; remover bootstrap após primeiro acesso.
- [ ] Confirmar `/readyz` saudável e cookie Secure/HttpOnly no domínio HTTPS.
