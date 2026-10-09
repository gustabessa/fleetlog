import { test, expect } from '@playwright/test';
test.use({ serviceWorkers: 'block' });
test('prévia não grava nem troca manifest; cancelar restaura; confirmar persiste', async ({
  page,
}) => {
  await page.route('**/api/auth/me', (r) => r.fulfill({ status: 401, json: {} }));
  await page.goto('/');
  const before = await page.request.get('/manifest.webmanifest');
  const original = await before.json();
  let writes = 0;
  page.on('request', (r) => {
    if (r.url().endsWith('/api/profile') && r.method() === 'PUT') writes++;
  });
  await page.getByRole('button', { name: 'Escolher tema', exact: true }).click();
  const d = page.getByRole('dialog', { name: 'Escolha o tema' });
  await d.getByRole('button', { name: 'Grafite e laranja', exact: true }).click();
  await d.getByRole('button', { name: '☾ Escuro', exact: true }).click();
  expect(await (await page.request.get('/manifest.webmanifest')).json()).toEqual(original);
  expect(await page.evaluate(() => localStorage.getItem('fleetlog.guest.palette'))).not.toBe(
    'orange',
  );
  await page.keyboard.press('Escape');
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'original');
  await page.getByRole('button', { name: 'Escolher tema', exact: true }).click();
  await d.getByRole('button', { name: 'Grafite e laranja', exact: true }).click();
  await d.getByRole('button', { name: '☾ Escuro', exact: true }).click();
  await d.getByRole('button', { name: 'Confirmar tema', exact: true }).click();
  await expect(d).not.toBeVisible();
  const manifest = await (await page.request.get('/manifest.webmanifest')).json();
  expect(manifest.id).toBe('/');
  expect(manifest.icons[0].src).toContain('pwa-orange-dark');
  expect(manifest.background_color).toBe('#17181c');
  expect((await page.request.get(manifest.icons[0].src)).ok()).toBe(true);
  expect(writes).toBe(0);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'orange');
});
test('usuário só grava na confirmação; erro mantém preferência e permite cancelar', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Usuário', { exact: true }).fill('e2e');
  await page.getByLabel('Senha', { exact: true }).fill('e2e-password-12345');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Minha garagem' })).toBeVisible();
  const original = await (await page.request.get('/api/auth/me')).json();
  let writes = 0;
  await page.route('**/api/profile', (r) => {
    writes++;
    return r.fulfill({ status: 503, json: { error: 'unavailable' } });
  });
  await page.getByRole('button', { name: 'Escolher tema', exact: true }).click();
  const d = page.getByRole('dialog', { name: 'Escolha o tema' });
  const next = original.palette === 'orange' ? 'Ardósia e azul' : 'Grafite e laranja';
  await d.getByRole('button', { name: next, exact: true }).click();
  expect(writes).toBe(0);
  await d.getByRole('button', { name: 'Confirmar tema', exact: true }).click();
  await expect(d.getByRole('alert')).toContainText('Não foi possível confirmar');
  expect(writes).toBe(1);
  expect(await page.evaluate(() => localStorage.getItem('fleetlog.palette'))).toBe(
    original.palette,
  );
  await d.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-palette', original.palette);
});

test('PWA instalado só orienta atualização do ícone depois de confirmar', async ({ page }) => {
  await page.addInitScript(() => {
    const original = window.matchMedia.bind(window);
    window.matchMedia = (query) => {
      const result = original(query);
      if (query.includes('display-mode: standalone'))
        Object.defineProperty(result, 'matches', { value: true });
      return result;
    };
  });
  await page.route('**/api/auth/me', (r) => r.fulfill({ status: 401, json: {} }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Escolher tema', exact: true }).click();
  const d = page.getByRole('dialog', { name: 'Escolha o tema' });
  await d.getByRole('button', { name: 'Grafite e laranja', exact: true }).click();
  const update = page.getByRole('dialog', { name: 'Atualizar ícone do aplicativo' });
  await expect(update).not.toBeVisible();
  await d.getByRole('button', { name: 'Confirmar tema', exact: true }).click();
  await expect(update).toBeVisible();
  expect(await page.locator('link[rel="manifest"]').getAttribute('href')).toContain(
    'theme=orange-light',
  );
  const url = await page.locator('link[rel="manifest"]').getAttribute('href');
  const manifest = await (await page.request.get(url!)).json();
  expect(manifest.icons[0].src).toContain('pwa-orange-light');
});
