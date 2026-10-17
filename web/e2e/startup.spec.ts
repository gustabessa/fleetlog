import { expect, test } from '@playwright/test';
test.use({ serviceWorkers: 'block' });
test('recarga de URL interna carrega assets da raiz e splash temática limitada', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem('fleetlog.theme', 'dark');
    localStorage.setItem('fleetlog.palette', 'orange');
  });
  // Stop Angular to inspect the actual first HTML paint, before app bootstrap.
  await page.route('**/main-*.js', (route) => route.abort());
  const css = page.waitForResponse((r) => new URL(r.url()).pathname === '/startup.css');
  const js = page.waitForResponse((r) => new URL(r.url()).pathname === '/startup-theme.js');
  await page.goto('/garage/1/vehicles');
  expect((await css).ok()).toBe(true);
  expect((await js).ok()).toBe(true);
  const splash = page.locator('.startup-screen');
  await expect(splash).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'orange');
  await expect.poll(() => splash.evaluate((el) => getComputedStyle(el).position)).toBe('fixed');
  const bounds = await splash.boundingBox();
  expect(bounds!.width).toBe(page.viewportSize()!.width);
  const logo = await splash.locator('svg').boundingBox();
  expect(logo!.width).toBeLessThanOrEqual(240);
  expect(logo!.width).toBeGreaterThan(100);
});
test('manifest usa identidade estável, fundo padrão e ícones novos disponíveis no shell', async ({
  request,
}) => {
  const manifest = await (await request.get('/manifest.webmanifest')).json();
  expect(manifest.id).toBe('/');
  expect(manifest.background_color).toBe('#17181c');
  const worker = await (await request.get('/ngsw.json')).json();
  for (const size of ['192x192', '512x512']) {
    const icon = manifest.icons.find((i: any) => i.sizes === size);
    expect(icon.src).toContain('pwa-orange-dark-');
    const response = await request.get(icon.src);
    expect(response.ok()).toBe(true);
    expect(response.headers()['content-type']).toBe('image/png');
    expect(worker.assetGroups.find((g: any) => g.name === 'app').urls).toContain(icon.src);
  }
});

test('primeiro acesso usa grafite e laranja escuro mesmo com sistema claro', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.route('**/api/auth/me', (route) => route.fulfill({ status: 401, json: {} }));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Entre na sua garagem' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'orange');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
