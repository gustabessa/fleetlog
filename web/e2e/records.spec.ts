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
  await page.getByRole('button', { name: new RegExp(v.name) }).click();
  await page
    .getByLabel('Anotação', { exact: true })
    .fill('Dados extras <script> preservados como texto');
  await page.getByRole('button', { name: 'Adicionar anotação' }).click();
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
  page.on('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Salvar compra e venda' }).click();
  await expect
    .poll(async () => (await (await page.request.get(`${base}/${v.id}`)).json()).archived)
    .toBe(true);
  await page.getByRole('button', { name: 'Excluir veículo', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('histórico');
  await page.getByRole('button', { name: 'Voltar à garagem' }).click();
  await expect(page.getByRole('button', { name: new RegExp(v.name) })).not.toBeVisible();
  await page.getByLabel('Incluir veículos vendidos/arquivados').check();
  await page.getByRole('button', { name: new RegExp(v.name) }).click();
  await expect(page.getByText('Dados extras <script> preservados como texto')).toBeVisible();
  await expect(page.getByText(/IPVA real · R\$\s*300,00/)).toBeVisible();
});
