import { expect, test } from '@playwright/test';
test.use({ serviceWorkers: 'block' });
test('abastecimento real deriva total, preserva moeda e integra odômetro', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Usuário', { exact: true }).fill('e2e');
  await page.getByLabel('Senha', { exact: true }).fill('e2e-password-12345');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Minha garagem' })).toBeVisible();
  const headers = { Origin: 'http://127.0.0.1:4173' };
  const gs = await (await page.request.get('/api/garages')).json();
  const base = `/api/garages/${gs[0].id}/vehicles`;
  const v = await (
    await page.request.post(base, {
      headers,
      data: { name: `Combustível ${Date.now()}`, initialKm: 100 },
    })
  ).json();
  await page.reload();
  if (!new URL(page.url()).pathname.endsWith('/vehicles/' + v.id))
    await page.locator('button.vehicle-open').filter({ hasText: v.name }).click();
  await page.getByRole('button', { name: 'Registrar abastecimento' }).click();
  await page.getByLabel('Data do abastecimento').fill('2026-10-08');
  await page.getByLabel('Litros', { exact: true }).fill('42,5');
  await page.getByLabel('Odômetro do abastecimento (km)').fill('200');
  await page.getByLabel('Preço por litro').fill('620');
  await page.getByLabel('Moeda do abastecimento').selectOption('USD');
  await page.getByRole('button', { name: 'Salvar abastecimento' }).click();
  await expect(page.getByText(/263,50/)).toBeVisible();
  await expect(
    page
      .locator('fl-readings')
      .getByRole('row')
      .filter({ hasText: '08/10/2026' })
      .filter({ hasText: 'Abastecimento' }),
  ).toBeVisible();
  const e = await (await page.request.get(`${base}/${v.id}/fuel`)).json();
  expect(e[0].amount).toBe('263.500000');
  expect(e[0].currency).toBe('USD');
  const actual = await (await page.request.get(`${base}/${v.id}`)).json();
  expect(actual.currentKm).toBe('200.000');
  await page.reload();
  if (!new URL(page.url()).pathname.endsWith('/vehicles/' + v.id))
    await page.locator('button.vehicle-open').filter({ hasText: v.name }).click();
  await expect(page.getByText(/263,50/)).toBeVisible();
});
