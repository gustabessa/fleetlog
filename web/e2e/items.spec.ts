import { expect, test } from '@playwright/test';
test.use({ serviceWorkers: 'block' });
test('manutenção detalhada soma itens e consulta preços reais', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Usuário', { exact: true }).fill('e2e');
  await page.getByLabel('Senha', { exact: true }).fill('e2e-password-12345');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Minha garagem' })).toBeVisible();
  const gs = await (await page.request.get('/api/garages')).json();
  const base = `/api/garages/${gs[0].id}/vehicles`;
  const v = await (
    await page.request.post(base, {
      headers: { Origin: 'http://127.0.0.1:4173' },
      data: { name: `Itens ${Date.now()}`, initialKm: 100 },
    })
  ).json();
  await page.reload();
  if (!new URL(page.url()).pathname.endsWith('/vehicles/' + v.id))
    await page.locator('button.vehicle-open').filter({ hasText: v.name }).click();
  await page.getByRole('button', { name: 'Registrar manutenção' }).click();
  await page.getByLabel('Modo de valor').selectOption('detailed');
  await page
    .getByRole('dialog', { name: 'Confirmar ação' })
    .getByRole('button', { name: 'Confirmar', exact: true })
    .click();
  await page.getByLabel('Nome do item', { exact: true }).fill('Filtro teste ' + Date.now());
  const item = await page.getByLabel('Nome do item', { exact: true }).inputValue();
  await page.getByLabel('Quantidade', { exact: true }).fill('2');
  await page.getByLabel('Preço unitário', { exact: true }).fill('3000');
  await page.getByLabel('Desconto', { exact: true }).fill('500');
  await page.getByLabel('Ajuste', { exact: true }).fill('-100');
  await page.getByRole('button', { name: 'Salvar manutenção' }).click();
  await expect(
    page.getByRole('row').filter({ hasText: 'Manutenção' }).filter({ hasText: '54,00' }),
  ).toBeVisible();
  await expect(page.getByLabel('Pesquisar preços de item')).toHaveCount(0);
});
