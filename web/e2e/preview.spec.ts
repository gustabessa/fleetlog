import { expect, test } from '@playwright/test';

test('prévia navega pelos veículos, histórico e custos sem alterar a garagem', async ({ page }) => {
  await page.route('**/api/auth/me', (route) => route.fulfill({ status: 401, json: {} }));
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Entre na sua garagem' })).toBeVisible();
  await expect(page.locator('footer')).toHaveText('FeetLog · Acompanhe cada quilômetro.');
  await page.getByRole('button', { name: 'Explorar prévia da garagem' }).click();
  await expect(page.getByRole('heading', { name: 'Minha garagem' })).toBeVisible();
  await page.getByRole('button', { name: /Volkswagen Polo/ }).click();
  await expect(page.getByRole('heading', { name: 'Volkswagen Polo' })).toBeVisible();
  await expect(page.getByText('21.680 km', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Histórico', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Histórico', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Troca de óleo e filtro' })).toBeVisible();
  await page.getByRole('button', { name: 'Custos', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Custos', exact: true })).toBeVisible();
  await expect(page.getByText('R$ 1.282,90', { exact: true })).toBeVisible();
  for (const theme of ['light', 'dark']) {
    await page.evaluate((value) => (document.documentElement.dataset['theme'] = value), theme);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.getByRole('button', { name: 'Sair da prévia' }).click();
  await expect(page.getByRole('heading', { name: 'Entre na sua garagem' })).toBeVisible();
  expect(errors).toEqual([]);
});
