import { expect, test } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

test('perfil persiste moeda e tema após recarga e novo login', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Usuário', { exact: true }).fill('e2e');
  await page.getByLabel('Senha', { exact: true }).fill('e2e-password-12345');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.getByRole('button', { name: 'Perfil de e2e', exact: true }).click();
  const profile = page.getByRole('dialog', { name: 'Meu perfil', exact: true });
  await profile.getByLabel('Moeda padrão').selectOption('USD');
  await page.route('**/api/profile', (route) =>
    route.fulfill({ status: 503, json: { error: 'unavailable' } }),
  );
  await profile.getByRole('button', { name: 'Salvar perfil' }).click();
  await expect(page.getByRole('alert')).toContainText('Não foi possível salvar');
  await page.unroute('**/api/profile');
  await profile.getByRole('button', { name: 'Salvar perfil' }).click();
  await expect(profile.getByRole('status')).toHaveText('Preferências salvas.');
  await profile.getByRole('button', { name: 'Fechar Meu perfil' }).click();
  const response = await page.request.put('/api/profile', {
    headers: { Origin: 'http://127.0.0.1:4173' },
    data: { palette: 'copper', theme: 'dark' },
  });
  expect(response.ok()).toBeTruthy();
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'copper');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Perfil de e2e' }).click();
  await expect(profile.getByLabel('Moeda padrão')).toHaveValue('USD');
  await profile.getByRole('button', { name: 'Fechar Meu perfil' }).click();
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await page.getByLabel('Usuário', { exact: true }).fill('e2e');
  await page.getByLabel('Senha', { exact: true }).fill('e2e-password-12345');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.getByRole('button', { name: 'Perfil de e2e' }).click();
  await expect(profile.getByLabel('Moeda padrão')).toHaveValue('USD');
  // Restore the shared fixture for the rest of the suite.
  await page.request.put('/api/profile', {
    headers: { Origin: 'http://127.0.0.1:4173' },
    data: { currency: 'BRL', palette: 'original', theme: 'light' },
  });
});
