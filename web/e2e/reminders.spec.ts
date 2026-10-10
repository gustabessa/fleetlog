import { test, expect } from '@playwright/test';
test.use({ serviceWorkers: 'block' });
test('lembrete usa manutenção real, persiste metas e mostra aviso na garagem', async ({ page }) => {
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
      data: { name: 'Lembretes ' + Date.now(), initialKm: 1000 },
    })
  ).json();
  await page.goto(`/garage/${gs[0].id}/vehicles/${v.id}`);
  await page.getByRole('button', { name: 'Adicionar lembrete', exact: true }).click();
  const editor = page.getByRole('dialog', { name: 'Adicionar lembrete', exact: true });
  await editor.getByLabel('Serviço', { exact: true }).fill('Troca de óleo');
  await editor.getByLabel('Intervalo (km)', { exact: true }).fill('200');
  await editor.getByLabel('Km da última realização', { exact: true }).fill('800');
  await editor.getByLabel('Avisar antes (km)', { exact: true }).fill('50');
  await editor.getByRole('button', { name: 'Salvar lembrete', exact: true }).click();
  await expect(editor).not.toBeVisible();
  const section = page.locator('fl-reminders');
  const row = section.getByRole('row').filter({ hasText: 'Troca de óleo' });
  await expect(row).toContainText('Vencida');
  await row.getByRole('button', { name: 'Registrar manutenção', exact: true }).click();
  const maintenance = page.getByRole('dialog', { name: 'Manutenção', exact: true });
  await expect(maintenance).toBeVisible();
  await expect(
    maintenance.getByLabel('Descrição da manutenção (opcional)', { exact: true }),
  ).toHaveValue('Troca de óleo');
  await maintenance.getByLabel('Odômetro da manutenção', { exact: true }).fill('1100');
  await maintenance.getByLabel('Total da manutenção', { exact: true }).fill('100');
  await maintenance.getByRole('button', { name: 'Salvar manutenção', exact: true }).click();
  await expect(maintenance).not.toBeVisible();
  await expect(row).toContainText('Em dia');
  await expect(row).toContainText('1.300');
  await page.reload();
  await expect(
    page.locator('fl-reminders').getByRole('row').filter({ hasText: 'Troca de óleo' }),
  ).toContainText('1.300');
  const rules = await (await page.request.get(`${base}/${v.id}/reminders`)).json();
  expect(rules[0].lastEntryId).toBeTruthy();
  const headers = { Origin: 'http://127.0.0.1:4173' };
  await page.request.put(`${base}/${v.id}/reminders/${rules[0].id}`, {
    headers,
    data: {
      title: 'Troca de óleo',
      intervalKm: '200',
      intervalMonths: null,
      baseKm: '800',
      baseDate: null,
      advanceKm: '200',
      advanceDays: 0,
    },
  });
  await page.getByRole('button', { name: 'Voltar à garagem', exact: true }).click();
  const notice = page.locator('fl-reminders .notice').filter({ hasText: v.name });
  await expect(notice).toContainText('Próxima');
  await notice.getByRole('button', { name: 'Ver veículo', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/vehicles/${v.id}$`));
});

test('vincular manutenção existente renova lembrete por data sem exigir km', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Usuário', { exact: true }).fill('e2e');
  await page.getByLabel('Senha', { exact: true }).fill('e2e-password-12345');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Minha garagem' })).toBeVisible();
  const gs = await (await page.request.get('/api/garages')).json();
  const base = `/api/garages/${gs[0].id}/vehicles`;
  const headers = { Origin: 'http://127.0.0.1:4173' };
  const v = await (
    await page.request.post(base, {
      headers,
      data: { name: 'Mensal ' + Date.now(), initialKm: 1000 },
    })
  ).json();
  const url = `${base}/${v.id}`;
  const rule = await (
    await page.request.post(url + '/reminders', {
      headers,
      data: { title: 'Inspeção', intervalMonths: 1, baseDate: '2026-01-31', advanceDays: 0 },
    })
  ).json();
  const entry = await (
    await page.request.post(url + '/service', {
      headers,
      data: { title: 'Inspeção realizada', date: '2026-02-28', amount: '0', currency: 'BRL' },
    })
  ).json();
  await page.goto(`/garage/${gs[0].id}/vehicles/${v.id}`);
  const row = page.locator('fl-reminders').getByRole('row').filter({ hasText: 'Inspeção' });
  await row.getByRole('button', { name: 'Vincular existente', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Vincular manutenção existente' });
  await dialog
    .getByLabel('Manutenção registrada', { exact: true })
    .selectOption({ label: '2026-02-28 · Inspeção realizada · sem odômetro' });
  await dialog.getByRole('button', { name: 'Vincular manutenção', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(row).toContainText('2026-03-28');
  const rules = await (await page.request.get(url + '/reminders')).json();
  expect(rules.find((r: any) => r.id === rule.id).lastEntryId).toBe(entry.id);
});
