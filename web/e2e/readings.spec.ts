import { expect, test } from '@playwright/test';
test.use({ serviceWorkers: 'block' });
test('odômetro salva retroativo coerente, rejeita erro e recalcula após excluir', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Usuário', { exact: true }).fill('e2e');
  await page.getByLabel('Senha', { exact: true }).fill('e2e-password-12345');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Minha garagem' })).toBeVisible();
  const headers = { Origin: 'http://127.0.0.1:4173' };
  const gs = await (await page.request.get('/api/garages')).json();
  const base = `/api/garages/${gs[0].id}/vehicles`;
  const vehicle = await (
    await page.request.post(base, {
      headers,
      data: { name: `Odômetro ${Date.now()}`, initialKm: 100 },
    })
  ).json();
  await page.reload();
  await page.getByRole('button', { name: new RegExp(vehicle.name) }).click();
  await page.getByLabel('Data da leitura').fill('2026-10-08');
  await page.getByLabel('Quilometragem (km)', { exact: true }).fill('300');
  await page.getByRole('button', { name: 'Adicionar leitura', exact: true }).click();
  await expect(page.getByText('2026-10-08 · 300 km · Leitura avulsa · e2e')).toBeVisible();
  await page.getByLabel('Data da leitura').fill('2026-10-01');
  await page.getByLabel('Quilometragem (km)', { exact: true }).fill('200');
  await page.getByRole('button', { name: 'Adicionar leitura', exact: true }).click();
  await expect(page.getByText('2026-10-01 · 200 km · Leitura avulsa · e2e')).toBeVisible();
  await page.getByLabel('Data da leitura').fill('2026-10-02');
  await page.getByLabel('Quilometragem (km)', { exact: true }).fill('400');
  await page.getByRole('button', { name: 'Adicionar leitura', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('incoerente');
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Excluir leitura', exact: true }).first().click();
  await expect(page.getByText('2026-10-08 · 300 km · Leitura avulsa · e2e')).not.toBeVisible();
  await page.getByRole('button', { name: 'Ver auditoria de leituras' }).click();
  await expect(page.getByText(/e2e · delete/)).toBeVisible();
  const actual = await (await page.request.get(`${base}/${vehicle.id}`)).json();
  expect(actual.currentKm).toBe('200.000');
  expect(actual.initialKm).toBe('100.000');
});
