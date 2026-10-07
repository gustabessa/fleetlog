# Validação de implantação — etapa 1

Os testes locais validam o bundle Angular de produção servido pelo Go em Chromium desktop e mobile. Este checklist cobre o que depende do Docker e da implantação real; não está marcado como executado.

## Docker Compose

- [ ] Copiar `.env.example` para `.env` e definir uma senha própria para PostgreSQL.
- [ ] Executar `docker compose config --quiet` para validar interpolação/configuração.
- [ ] Executar `docker compose up --build -d` e confirmar `app` e `db` saudáveis em `docker compose ps`.
- [ ] Confirmar `docker compose exec app /app/fleetlog healthcheck` e `curl --fail http://localhost:8080/healthz`.
- [ ] Verificar que o processo da aplicação roda sem root: `docker compose exec app id`.
- [ ] Abrir a garagem e alternar temas; recarregar e confirmar a preferência.
- [ ] Confirmar acesso somente interno ao banco e volume `postgres_data` persistente.

O health check da aplicação verifica o HTTP, e não o banco. A aplicação ainda não utiliza PostgreSQL; migrações e persistência entram na próxima etapa.

## Dokploy e PWA

- [ ] Configurar domínio HTTPS com destino em `app:8080`, publicando o app na raiz do domínio.
- [ ] Confirmar `/healthz` e a garagem pelo domínio público.
- [ ] Confirmar `manifest.webmanifest` como `application/manifest+json`, ícones acessíveis e `ngsw-worker.js` sem redirecionamento ou fallback HTML.
- [ ] Confirmar service worker ativo no navegador e ausência de erros no console.
- [ ] Instalar a PWA pelo navegador em um computador e celular; abrir pelo ícone e conferir modo standalone.
- [ ] Publicar um novo build completo e confirmar aviso **Atualizar agora**; clicar e conferir carregamento da nova versão.
- [ ] Confirmar que `/api` e `/api/vehicles` retornam JSON 404 nesta base, sem HTML ou cache de dados.

Não use `docker compose down -v` para reiniciar a implantação: esse comando remove o volume do banco. A instalação no sistema operacional e o comportamento no domínio HTTPS precisam ser conferidos nos dispositivos reais; a emulação mobile não substitui esses checks.
