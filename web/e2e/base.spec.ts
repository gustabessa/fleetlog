import { expect, test } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Usuário', { exact: true }).fill('e2e');
  await page.getByLabel('Senha', { exact: true }).fill('e2e-password-12345');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Minha garagem' })).toBeVisible();
});

test('login persiste e logout revoga o acesso', async ({ page }) => {
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Minha garagem' })).toBeVisible();
  if (!(await page.getByRole('button', { name: 'Sair', exact: true }).isVisible()))
    await page.getByRole('button', { name: /^Perfil de / }).click();
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Entre na sua garagem' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Entre na sua garagem' })).toBeVisible();
  await page.getByLabel('Usuário', { exact: true }).fill('e2e');
  await page.getByLabel('Senha', { exact: true }).fill('wrong-password');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Usuário ou senha incorretos.');
  await expect(page.getByLabel('Senha', { exact: true })).toHaveValue('');
});

test('garagem responsiva, tema persistente e rotas sem erros', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Minha garagem' })).toBeVisible();
  await page.getByRole('button', { name: 'Escolher tema', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: '☾ Escuro', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar tema', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Escolher tema', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: '☀ Claro', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar tema', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.goto('/rota-ainda-inexistente');
  await expect(page).toHaveURL(/\/garage\/\d+\/vehicles$/);
  await expect(page.getByRole('heading', { name: 'Minha garagem' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('manifest, worker e API online sem cache de dados privados', async ({ page, request }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  const manifestResponse = await request.get('/manifest.webmanifest');
  expect(manifestResponse.headers()['content-type']).toBe('application/manifest+json');
  const manifest = await manifestResponse.json();
  expect(manifest.name).toBe('FleetLog');
  expect(manifest.display).toBe('standalone');
  for (const size of ['192x192', '512x512']) {
    const icon = manifest.icons.find((entry: { sizes: string }) => entry.sizes === size);
    expect(icon).toBeTruthy();
    expect((await request.get('/' + icon.src)).ok()).toBe(true);
  }
  const config = await (await request.get('/ngsw.json')).json();
  expect(config.dataGroups).toEqual([]);
  expect(Object.keys(config.hashTable).some((path) => path.startsWith('/api/'))).toBe(false);
  const apiResponse = await page.evaluate(async () => {
    const result = await fetch('/api/vehicles');
    return {
      status: result.status,
      type: result.headers.get('content-type'),
      cache: result.headers.get('cache-control'),
    };
  });
  expect(apiResponse).toEqual({ status: 404, type: 'application/json', cache: 'no-store' });
  const bareAPI = await request.get('/api', { headers: { Accept: 'text/html' } });
  expect(bareAPI.status()).toBe(404);
  expect(bareAPI.headers()['content-type']).toBe('application/json');
  expect((await request.get('/missing.js', { headers: { Accept: 'text/html' } })).status()).toBe(
    404,
  );
});

test('nova versão oferece atualização sem recarregar automaticamente', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  const indexPath = '.e2e-dist/index.html';
  const configPath = '.e2e-dist/ngsw.json';
  const oldIndex = readFileSync(indexPath, 'utf8');
  const oldConfig = readFileSync(configPath, 'utf8');
  const newIndex = oldIndex.replace(
    '<title>FleetLog</title>',
    '<title>FleetLog atualizado</title>',
  );
  const config = JSON.parse(oldConfig);
  config.hashTable['/index.html'] = createHash('sha1').update(newIndex).digest('hex');
  try {
    writeFileSync(indexPath, newIndex);
    writeFileSync(configPath, JSON.stringify(config));
    await page.evaluate(() =>
      navigator.serviceWorker.controller!.postMessage({
        action: 'CHECK_FOR_UPDATES',
        nonce: 12345,
      }),
    );
    await expect(page.getByRole('button', { name: 'Atualizar agora' })).toBeVisible();
    await expect(page).toHaveTitle('FleetLog');
    await page.getByRole('button', { name: 'Atualizar agora' }).click();
    await expect(page).toHaveTitle('FleetLog atualizado');
    await expect(page.getByRole('heading', { name: 'Minha garagem' })).toBeVisible();
  } finally {
    writeFileSync(indexPath, oldIndex);
    writeFileSync(configPath, oldConfig);
  }
});
