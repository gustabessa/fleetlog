import { expect, test } from '@playwright/test';
test.use({ serviceWorkers: 'block' });
test('notas, despesas e venda preservam histórico e arquivam veículo', async ({ page }) => {
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
      data: { name: `Documentação ${Date.now()}`, initialKm: 100 },
    })
  ).json();
  await page.reload();
  if (!new URL(page.url()).pathname.endsWith('/vehicles/' + v.id))
    await page.locator('button.vehicle-open').filter({ hasText: v.name }).click();
  await page.getByRole('button', { name: 'Adicionar anotação', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Anotação', exact: true })
    .fill('Dados extras <script> preservados como texto');
  await page.getByRole('button', { name: 'Salvar anotação', exact: true }).click();
  await expect(page.getByText('Dados extras <script> preservados como texto')).toBeVisible();
  await page.getByRole('button', { name: 'Registrar despesa' }).click();
  await page.getByLabel('Descrição da despesa').fill('IPVA real');
  await page.getByLabel('Tipo de documentação').selectOption('ipva');
  await page.getByLabel('Valor da despesa').fill('300');
  await page.getByRole('button', { name: 'Salvar despesa' }).click();
  await expect(page.getByText(/IPVA real · R\$\s*300,00/)).toBeVisible();
  await page.getByLabel('Informar compra', { exact: true }).check();
  await page.getByLabel('Data de compra').fill('2026-01-01');
  await page.getByLabel('Valor de compra').fill('20000');
  await page.getByLabel('Informar venda', { exact: true }).check();
  await page.getByLabel('Data de venda').fill('2026-10-08');
  await page.getByLabel('Valor de venda').fill('22000');
  await page.getByRole('button', { name: 'Salvar compra e venda' }).click();
  await page
    .getByRole('dialog', { name: 'Confirmar ação' })
    .getByRole('button', { name: 'Confirmar', exact: true })
    .click();
  await expect
    .poll(async () => (await (await page.request.get(`${base}/${v.id}`)).json()).archived)
    .toBe(true);
  await page.getByRole('button', { name: 'Desarquivar veículo', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Confirmar ação' })
    .getByRole('button', { name: 'Confirmar', exact: true })
    .click();
  await expect(page.getByRole('button', { name: 'Arquivar veículo', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Arquivar veículo', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Confirmar ação' })
    .getByRole('button', { name: 'Confirmar', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Desarquivar veículo', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Voltar à garagem' }).click();
  await expect(page.locator('button.vehicle-open').filter({ hasText: v.name })).not.toBeVisible();
  await page.getByLabel('Incluir veículos vendidos/arquivados').check();
  if (!new URL(page.url()).pathname.endsWith('/vehicles/' + v.id))
    await page.locator('button.vehicle-open').filter({ hasText: v.name }).click();
  await expect(page.getByText('Dados extras <script> preservados como texto')).toBeVisible();
  await expect(page.getByText(/IPVA real · R\$\s*300,00/)).toBeVisible();
});
