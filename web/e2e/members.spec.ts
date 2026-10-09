import { expect, test } from '@playwright/test';
test.use({ serviceWorkers: 'block' });
test('criador inclui familiar, familiar grava e remoção revoga acesso', async ({
  page,
  browser,
}) => {
  const name = 'family-' + Date.now();
  await page.goto('/');
  await page.getByLabel('Usuário', { exact: true }).fill('e2e');
  await page.getByLabel('Senha', { exact: true }).fill('e2e-password-12345');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.getByRole('button', { name: 'Familiares', exact: true }).click();
  await page.getByLabel('Usuário do familiar').fill(name);
  await page.getByLabel('Senha inicial').fill('family-password-12345');
  await page.getByRole('button', { name: 'Adicionar familiar' }).click();
  await expect(page.getByRole('button', { name: 'Remover ' + name })).toBeVisible();
  const context = await browser.newContext();
  const family = await context.newPage();
  await family.goto('http://127.0.0.1:4173');
  await family.getByLabel('Usuário', { exact: true }).fill(name);
  await family.getByLabel('Senha', { exact: true }).fill('family-password-12345');
  await family.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(
    family.getByRole('button', { name: 'Adicionar veículo', exact: true }),
  ).toBeVisible();
  await expect(family.getByRole('button', { name: 'Familiares', exact: true })).not.toBeVisible();
  const gs = await (await family.request.get('/api/garages')).json();
  const response = await family.request.post(`/api/garages/${gs[0].id}/vehicles`, {
    headers: { Origin: 'http://127.0.0.1:4173' },
    data: { name: 'Shared ' + name, initialKm: 0 },
  });
  expect(response.status()).toBe(201);
  page.on('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Remover ' + name }).click();
  await expect(page.getByRole('button', { name: 'Remover ' + name })).not.toBeVisible();
  expect((await family.request.get(`/api/garages/${gs[0].id}/vehicles`)).status()).toBe(404);
  await context.close();
});
