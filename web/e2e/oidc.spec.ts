import { expect, test } from '@playwright/test';
test.use({ serviceWorkers: 'block' });
test('OIDC exige vínculo explícito e depois autentica o mesmo usuário', async ({ page }) => {
  const subject = 'fixture-' + Date.now();
  await page.route(/http:\/\/127\.0\.0\.1:\d+\/authorize\?/, (route) => {
    const url = new URL(route.request().url());
    url.searchParams.set('fixture_subject', subject);
    return route.continue({ url: url.toString() });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Entrar com passkey', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('ainda não está vinculada');
  await page.getByLabel('Usuário', { exact: true }).fill('e2e');
  await page.getByLabel('Senha', { exact: true }).fill('e2e-password-12345');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.getByRole('button', { name: 'Perfil de e2e' }).click();
  await page
    .getByRole('button', { name: /^Vincular (conta|outra identidade) do provedor$/ })
    .click();
  await expect(page.getByText('Conta do provedor vinculada.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Perfil de e2e' })).toBeVisible();
  if (!(await page.getByRole('button', { name: 'Sair', exact: true }).isVisible()))
    await page.getByRole('button', { name: /^Perfil de / }).click();
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await page.getByRole('button', { name: 'Entrar com passkey', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Perfil de e2e' })).toBeVisible();
  const current = await (await page.request.get('/api/auth/me')).json();
  expect(current.username).toBe('e2e');
  expect((await (await page.request.get('/api/auth/oidc/status')).json()).linked).toBe(true);
});
