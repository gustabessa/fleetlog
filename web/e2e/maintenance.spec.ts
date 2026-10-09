import { expect, test } from '@playwright/test';
test.use({ serviceWorkers: 'block' });
test('manutenção total direto funciona sem itens e sem leitura obrigatória', async ({ page }) => {
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
      data: { name: `Manutenção ${Date.now()}`, initialKm: 100 },
    })
  ).json();
  await page.reload();
  if (!new URL(page.url()).pathname.endsWith('/vehicles/'+v.id))
    await page.locator('button.vehicle-open').filter({ hasText: v.name }).click();
  await page.getByRole('button', { name: 'Registrar manutenção' }).click();
  await page.getByLabel('Descrição da manutenção (opcional)').fill('Revisão direta');
  await page.getByLabel('Total da manutenção').fill('150,50');
  await page.getByRole('button', { name: 'Salvar manutenção' }).click();
  await expect(
    page.getByRole('row').filter({ hasText: 'Revisão direta' }).filter({ hasText: '150,50' }),
  ).toBeVisible();
  await page.reload();
  if (!new URL(page.url()).pathname.endsWith('/vehicles/'+v.id))
    await page.locator('button.vehicle-open').filter({ hasText: v.name }).click();
  await expect(
    page.getByRole('row').filter({ hasText: 'Revisão direta' }).filter({ hasText: '150,50' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Editar manutenção' }).click();
  await page.getByLabel('Total da manutenção').fill('200');
  await page.getByLabel('Odômetro da manutenção (opcional)').fill('250');
  await page.getByRole('button', { name: 'Salvar manutenção' }).click();
  await expect(
    page.getByRole('row').filter({ hasText: 'Revisão direta' }).filter({ hasText: '200,00' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Excluir manutenção' }).click();
  await page
    .getByRole('dialog', { name: 'Confirmar ação' })
    .getByRole('button', { name: 'Confirmar', exact: true })
    .click();
  await expect(page.getByText('Nenhuma manutenção registrada.')).toBeVisible();
  const actual = await (await page.request.get(`${base}/${v.id}`)).json();
  expect(actual.currentKm).toBe('100.000');
});
