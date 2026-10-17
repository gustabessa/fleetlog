import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

test.use({ serviceWorkers: 'block' });

test('Scalar carrega localmente e expõe o contrato com versão do aplicativo', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).origin !== 'http://127.0.0.1:4173') external.push(request.url());
  });
  await page.goto('/docs/api');
  await expect(page).toHaveURL(/\/docs\/api\/$/);
  await expect(page.getByRole('heading', { name: 'FleetLog API', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Baixar OpenAPI', exact: true })).toHaveAttribute(
    'href',
    './openapi.json',
  );
  const response = await page.request.get('/docs/api/openapi.json');
  expect(response.ok()).toBe(true);
  const spec = await response.json();
  expect(spec.openapi).toBe('3.1.0');
  expect(spec.info.version).toBe(readFileSync('../VERSION', 'utf8').trim());
  expect(spec.paths['/api/auth/me'].get).toBeDefined();
  expect(spec.components.securitySchemes.sessionCookie.in).toBe('cookie');
  expect(external).toEqual([]);
});

test('console Scalar reutiliza sessão HttpOnly para ler o usuário', async ({ page }) => {
  const login = await page.request.post('/api/auth/login', {
    headers: { Origin: 'http://127.0.0.1:4173' },
    data: { username: 'e2e', password: 'e2e-password-12345' },
  });
  expect(login.ok()).toBe(true);
  await page.goto('/docs/api/#tag/autentica%C3%A7%C3%A3o/GET/api/auth/me');
  await page.locator('button').filter({ hasText: 'get /api/auth/me' }).click();
  const response = page.waitForResponse((r) => new URL(r.url()).pathname === '/api/auth/me');
  await page.getByRole('button', { name: /^Send get request to/ }).click();
  const me = await response;
  expect(me.status()).toBe(200);
  expect((await me.json()).username).toBe('e2e');
  expect(await page.evaluate(() => document.cookie.includes('fleetlog_session'))).toBe(false);
});
