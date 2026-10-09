import { expect, test } from '@playwright/test';
test.use({ serviceWorkers: 'block' });
test('histórico e custos reais separam moedas e filtram dados', async ({ page }) => {
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
      data: { name: `Histórico ${Date.now()}`, initialKm: 100 },
    })
  ).json();
  const url = `${base}/${v.id}`;
  await page.request.post(url + '/service', {
    headers,
    data: { date: '2026-10-08', title: 'Revisão de análise', amount: '120', currency: 'BRL' },
  });
  await page.request.post(url + '/expense', {
    headers,
    data: {
      date: '2026-10-08',
      title: 'Seguro de análise',
      amount: '30',
      currency: 'USD',
      expense: { category: 'insurance', subtype: '' },
    },
  });
  await page.getByRole('button', { name: 'Histórico', exact: true }).click();
  await page.getByLabel('Filtrar veículo').selectOption(String(v.id));
  await page.getByLabel('Filtrar moeda').selectOption('');
  await page.getByRole('button', { name: 'Aplicar filtros' }).click();
  await expect(page.getByText(/Total em BRL:/)).toContainText('120,00');
  await expect(page.getByText(/Total em USD:/)).toContainText('30,00');
  await page.getByLabel('Buscar lançamentos').fill('revisao');
  await page.getByRole('button', { name: 'Aplicar filtros' }).click();
  await expect(page.getByRole('heading', { name: 'Revisão de análise' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Seguro de análise' })).not.toBeVisible();
  await page.getByRole('button', { name: 'Custos', exact: true }).click();
  await page.getByLabel('Buscar lançamentos').fill('');
  await page.getByLabel('Filtrar moeda').selectOption('USD');
  await page.getByRole('button', { name: 'Aplicar filtros' }).click();
  await expect(page.getByText(/Total em USD:/)).toContainText('30,00');
  await expect(page.getByRole('heading', { name: 'Seguro de análise' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Revisão de análise' })).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Seguro, 100.0% do total' })).toBeVisible();
});
