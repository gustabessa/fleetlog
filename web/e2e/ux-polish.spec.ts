import { expect, test } from '@playwright/test';
test.use({ serviceWorkers: 'block' });
async function fixture(page: any) {
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
      data: { name: 'UX ' + Date.now(), initialKm: 100 },
    })
  ).json();
  await page.goto(`/garage/${gs[0].id}/vehicles/${v.id}`);
  return { base, v, garage: gs[0].id };
}
test('dinheiro por centavos, data local e snackbar fixa; consulta não gera snackbar', async ({
  page,
}) => {
  const { base, v, garage } = await fixture(page);
  await page.getByRole('button', { name: 'Registrar manutenção', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Manutenção', exact: true });
  const money = dialog.getByLabel('Total da manutenção', { exact: true });
  await money.pressSequentially('1234');
  await expect(money).toHaveValue(/12,34$/);
  await money.press('Backspace');
  await expect(money).toHaveValue(/1,23$/);
  await money.press('Backspace');
  await expect(money).toHaveValue(/0,12$/);
  await money.fill('-1234');
  expect(await money.evaluate((el) => (el as HTMLInputElement).validity.valid)).toBe(false);
  await money.fill('1234');
  await dialog.getByLabel('Data da manutenção', { exact: true }).fill('2026-10-08');
  await dialog.getByRole('button', { name: 'Salvar manutenção', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  const toast = page.locator('.snackbar');
  await expect(toast).toContainText('Manutenção salva');
  expect(await toast.evaluate((el: any) => getComputedStyle(el).position)).toBe('fixed');
  await page.getByRole('button', { name: 'Fechar notificação', exact: true }).click();
  await expect(page.locator('fl-maintenance .record-table')).toContainText('08/10/2026');
  await expect(page.getByLabel('Pesquisar preços de item')).toHaveCount(0);
  const saved = await (await page.request.get(`${base}/${v.id}/service`)).json();
  expect(saved[0].amount).toBe('12.340000');
  await page.goto(`/garage/${garage}/history`);
  await page.getByRole('button', { name: 'Aplicar filtros', exact: true }).click();
  await expect(toast).not.toBeVisible();
});
test('GET lento mantém a tabela e sua posição; botões de linha não empilham', async ({ page }) => {
  const { base, v } = await fixture(page);
  const headers = { Origin: 'http://127.0.0.1:4173' };
  await page.request.post(`${base}/${v.id}/service`, {
    headers,
    data: { date: '2026-10-08', title: 'Referência', amount: '1', currency: 'BRL' },
  });
  await page.reload();
  const table = page.locator('fl-maintenance .record-table');
  await expect(table).toContainText('Referência');
  await table.getByRole('button', { name: 'Editar manutenção', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Manutenção', exact: true });
  const y = await table.evaluate((el: any) => el.getBoundingClientRect().top);
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  await page.route('**/service', async (route) => {
    if (route.request().method() === 'GET') {
      await gate;
      await route.continue();
    } else await route.continue();
  });
  await dialog.getByRole('button', { name: 'Salvar manutenção', exact: true }).click();
  await expect(page.locator('fl-loading.app-loading')).toBeVisible();
  try {
    await expect(table).toContainText('Referência');
    expect(await table.evaluate((el: any) => el.getBoundingClientRect().top)).toBe(y);
    const rows = await table
      .locator('.row-actions button')
      .evaluateAll((buttons: any[]) =>
        buttons.map((b) => Math.round(b.getBoundingClientRect().top)),
      );
    expect(new Set(rows).size).toBe(1);
  } finally {
    release();
  }
});

test('erro de gravação mantém formulário e snackbar acima do diálogo', async ({ page }) => {
  await fixture(page);
  await page.getByRole('button', { name: 'Registrar manutenção', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Manutenção', exact: true });
  await dialog.getByLabel('Total da manutenção', { exact: true }).fill('1234');
  await page.route('**/service', (route) =>
    route.request().method() === 'POST'
      ? route.fulfill({ status: 503, json: { error: 'unavailable' } })
      : route.continue(),
  );
  await dialog.getByRole('button', { name: 'Salvar manutenção', exact: true }).click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('Total da manutenção', { exact: true })).toHaveValue(/12,34$/);
  const toast = page.locator('.snackbar.error');
  await expect(toast).toBeVisible();
  expect(await toast.evaluate((el) => el.matches(':popover-open'))).toBe(true);
});
