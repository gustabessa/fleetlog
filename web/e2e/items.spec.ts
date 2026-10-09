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
  await page.getByRole('button', { name: new RegExp(v.name) }).click();
  await page.getByRole('button', { name: 'Registrar manutenção' }).click();
  page.on('dialog', (d) => d.accept());
  await page.getByLabel('Modo de valor').selectOption('detailed');
  await page.getByLabel('Nome do item', { exact: true }).fill('Filtro teste ' + Date.now());
  const item = await page.getByLabel('Nome do item', { exact: true }).inputValue();
  await page.getByLabel('Quantidade', { exact: true }).fill('2');
  await page.getByLabel('Preço unitário', { exact: true }).fill('30');
  await page.getByLabel('Desconto', { exact: true }).fill('5');
  await page.getByLabel('Ajuste', { exact: true }).fill('-1');
  await page.getByRole('button', { name: 'Salvar manutenção' }).click();
  await expect(page.getByText(/Manutenção · 54.000000 BRL/)).toBeVisible();
  await page.getByLabel('Pesquisar preços de item').fill(item);
  await page.getByRole('button', { name: 'Buscar itens' }).click();
  await page.getByRole('button', { name: 'Preços de ' + item, exact: true }).click();
  await expect(page.getByText(new RegExp(item + ' · 30 BRL'))).toBeVisible();
});
