import { expect, test } from '@playwright/test';

// Fault injection must reach page routes, rather than the Angular service worker.
// base.spec.ts exercises the production service worker with real authentication.
test.use({ serviceWorkers: 'block' });

test('prévia anônima não cria sessão; Enter autentica e logout fecha prévia', async ({
  page,
  request,
}) => {
  const writes: string[] = [];
  page.on('request', (req) => {
    if (req.method() !== 'GET' && req.url().includes('/api/')) writes.push(req.url());
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Entre na sua garagem' })).toBeVisible();
  await page.getByRole('button', { name: 'Explorar prévia da garagem' }).click();
  await page.getByRole('button', { name: /Honda Civic/ }).click();
  await expect(page.getByRole('heading', { name: 'Honda Civic', exact: true })).toBeVisible();
  expect((await page.request.get('/api/auth/me')).status()).toBe(401);
  expect(writes).toEqual([]);
  await page.getByRole('button', { name: 'Sair da prévia' }).click();
  await page.getByLabel('Usuário', { exact: true }).fill('e2e');
  await page.getByLabel('Senha', { exact: true }).fill('e2e-password-12345');
  await page.getByLabel('Senha', { exact: true }).press('Enter');
  await expect(page.getByRole('heading', { name: 'Minha garagem' })).toBeVisible();
  const me = await page.request.get('/api/auth/me');
  expect(me.status()).toBe(200);
  expect((await me.json()).username).toBe('e2e');
  const garagesResponse = await page.request.get('/api/garages');
  expect(garagesResponse.status()).toBe(200);
  expect(garagesResponse.headers()['cache-control']).toBe('no-store');
  const garages = await garagesResponse.json();
  expect(garages).toHaveLength(1);
  expect(garages[0].name).toBe('Minha garagem');
  expect((await page.request.get(`/api/garages/${garages[0].id}`)).status()).toBe(200);
  expect((await request.get(`/api/garages/${garages[0].id}`)).status()).toBe(401);

  const session = (await page.context().cookies()).find(
    (cookie) => cookie.name === 'fleetlog_session',
  );
  expect(session).toBeTruthy();
  await page.getByRole('button', { name: 'Explorar próximas telas' }).click();
  await expect(page.getByText('Prévia do produto', { exact: true })).toBeVisible();
  if (!(await page.getByRole('button', { name: 'Sair', exact: true }).isVisible()))
    await page.getByRole('button', { name: /^Perfil de / }).click();
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Entre na sua garagem' })).toBeVisible();
  await expect(page.getByText('Prévia do produto', { exact: true })).not.toBeVisible();
  // Replay the original token: logout must revoke the server-side session too.
  expect(
    (
      await request.get('/api/auth/me', {
        headers: { Cookie: `fleetlog_session=${session!.value}` },
      })
    ).status(),
  ).toBe(401);
});

test('API indisponível encerra carregamento inicial e permite nova tentativa', async ({ page }) => {
  await page.route('**/api/auth/me', (route) => route.abort('connectionfailed'));
  await page.goto('/');
  await expect(page.getByRole('alert')).toHaveText('Não foi possível conectar ao FleetLog.');
  await expect(page.getByText('Carregando seu acesso…')).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeEnabled();
  await page.unroute('**/api/auth/me');
  await page.getByLabel('Usuário', { exact: true }).fill('e2e');
  await page.getByLabel('Senha', { exact: true }).fill('e2e-password-12345');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Minha garagem' })).toBeVisible();
  await expect(page.getByRole('alert')).not.toBeVisible();
});

test('falha no login libera formulário; falha no logout preserva sessão', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Usuário', { exact: true }).fill('e2e');
  await page.getByLabel('Senha', { exact: true }).fill('e2e-password-12345');
  await page.route('**/api/auth/login', (route) =>
    route.fulfill({ status: 503, json: { error: 'unavailable' } }),
  );
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Não foi possível entrar. Tente novamente.');
  await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeEnabled();
  await expect(page.getByLabel('Senha', { exact: true })).toHaveValue('');
  await page.unroute('**/api/auth/login');
  await page.getByLabel('Senha', { exact: true }).fill('e2e-password-12345');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Minha garagem' })).toBeVisible();
  await page.route('**/api/auth/logout', (route) =>
    route.fulfill({ status: 503, json: { error: 'unavailable' } }),
  );
  if (!(await page.getByRole('button', { name: 'Sair', exact: true }).isVisible()))
    await page.getByRole('button', { name: /^Perfil de / }).click();
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Não foi possível sair. Tente novamente.');
  await expect(page.getByRole('button', { name: 'Sair', exact: true })).toBeEnabled();
  expect((await page.request.get('/api/auth/me')).status()).toBe(200);
  await page.unroute('**/api/auth/logout');
  if (!(await page.getByRole('button', { name: 'Sair', exact: true }).isVisible()))
    await page.getByRole('button', { name: /^Perfil de / }).click();
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Entre na sua garagem' })).toBeVisible();
});

test('erro de garagem permite repetir a consulta sem perder login', async ({ page }) => {
  await page.route('**/api/garages', (route) =>
    route.fulfill({ status: 503, json: { error: 'unavailable' } }),
  );
  await page.goto('/');
  await page.getByLabel('Usuário', { exact: true }).fill('e2e');
  await page.getByLabel('Senha', { exact: true }).fill('e2e-password-12345');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Não foi possível carregar sua garagem.');
  expect((await page.request.get('/api/auth/me')).status()).toBe(200);
  await expect(page.getByText('Carregando sua garagem…')).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Explorar próximas telas' })).not.toBeVisible();
  await page.unroute('**/api/garages');
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Explorar próximas telas' })).toBeVisible();
  await expect(page.getByRole('alert')).not.toBeVisible();
});
