import { expect, test } from '@playwright/test';

// Route only failure injection; successful create/read/edit use the real Go API and PostgreSQL.
test.use({ serviceWorkers: 'block' });

test('veículo real persiste, edita identificadores e preserva km inicial', async ({ page }) => {
  const name = `Veículo T03 ${Date.now()}`;
  await page.goto('/');
  await page.getByLabel('Usuário', { exact: true }).fill('e2e');
  await page.getByLabel('Senha', { exact: true }).fill('e2e-password-12345');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.getByRole('button', { name: 'Adicionar veículo', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Adicionar veículo', exact: true });
  await dialog.getByRole('button', { name: 'Salvar veículo', exact: true }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Nome/modelo', { exact: true }).fill(name);
  await dialog.getByLabel('Placa (opcional)', { exact: true }).fill('TST1A23');
  await dialog.getByLabel('Marca (opcional)', { exact: true }).fill('Marca teste');
  await dialog.getByLabel('Ano (opcional)', { exact: true }).fill('2020');
  await dialog.getByLabel('Chassi (opcional)', { exact: true }).fill('000CHASSIS');
  await dialog.getByLabel('RENAVAM (opcional)', { exact: true }).fill('000001234');
  await dialog.getByLabel('Quilometragem inicial (km)', { exact: true }).fill('12345.678');
  await page.route('**/api/garages/*/vehicles', async (route) => {
    if (route.request().method() === 'POST')
      await route.fulfill({ status: 503, json: { error: 'unavailable' } });
    else await route.continue();
  });
  await dialog.getByRole('button', { name: 'Salvar veículo', exact: true }).click();
  await expect(dialog.getByRole('alert')).toHaveText('Não foi possível salvar. Tente novamente.');
  await expect(dialog.getByRole('button', { name: 'Salvar veículo', exact: true })).toBeEnabled();
  await page.unroute('**/api/garages/*/vehicles');
  await dialog.getByRole('button', { name: 'Salvar veículo', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  const card = page.locator('button.vehicle-open').filter({ hasText: name });
  await expect(card).toBeVisible();
  await page.reload();
  await card.click();
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  await expect(page.getByText('000CHASSIS', { exact: true })).toBeVisible();
  await expect(page.getByText('000001234', { exact: true })).toBeVisible();
  await expect(page.getByText('12.345,678 km', { exact: true }).first()).toBeVisible();
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          (window as unknown as { copiedIdentifier: string }).copiedIdentifier = value;
        },
      },
    }),
  );
  await page.getByRole('button', { name: 'Copiar RENAVAM', exact: true }).click();
  await expect(page.getByText('RENAVAM copiado.', { exact: true })).toBeVisible();
  expect(
    await page.evaluate(() => (window as unknown as { copiedIdentifier: string }).copiedIdentifier),
  ).toBe('000001234');
  await page.getByRole('button', { name: 'Editar veículo', exact: true }).click();
  const edit = page.getByRole('dialog', { name: 'Editar veículo', exact: true });
  await expect(edit.getByLabel('Quilometragem inicial (km)', { exact: true })).toHaveCount(0);
  await edit.getByLabel('Nome/modelo', { exact: true }).fill(name + ' editado');
  await edit.getByLabel('RENAVAM (opcional)', { exact: true }).fill('000000007');
  await edit.getByRole('button', { name: 'Salvar veículo', exact: true }).click();
  await expect(edit).not.toBeVisible();
  await expect(page.getByRole('heading', { name: name + ' editado', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: name + ' editado', exact: true })).toBeVisible();
  await expect(page.getByText('000000007', { exact: true })).toBeVisible();
  await expect(page.getByText('12.345,678 km', { exact: true }).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
