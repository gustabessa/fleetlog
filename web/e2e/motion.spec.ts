import { expect, test } from '@playwright/test';
test.use({ serviceWorkers: 'block' });
test('logo acompanha tema; splash e abas animam sem bloquear navegação', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(() => {
    (window as any).motionEvents = [];
    document.addEventListener('animationstart', (event) =>
      (window as any).motionEvents.push(event.animationName),
    );
  });
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/auth/me', async (route) => {
    await gate;
    await route.continue();
  });
  try {
    await page.goto('/');
    await expect(page.locator('fl-startup .fleetlog-logo')).toBeVisible();
    await expect(page.locator('.startup-progress')).toBeVisible();
  } finally {
    release();
  }
  await page.getByLabel('Usuário', { exact: true }).fill('e2e');
  await page.getByLabel('Senha', { exact: true }).fill('e2e-password-12345');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Adicionar veículo', exact: true })).toBeVisible();
  await page.evaluate(() => {
    document.documentElement.dataset['palette'] = 'orange';
    document.documentElement.dataset['theme'] = 'dark';
  });
  expect(
    await page
      .locator('.brand .logo-accent')
      .first()
      .evaluate((el) => getComputedStyle(el).fill),
  ).toBe(
    await page.locator('.brand').evaluate((el) => {
      const probe = document.createElement('i');
      probe.style.color = 'var(--accent)';
      el.append(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    }),
  );
  await page.getByRole('button', { name: 'Histórico', exact: true }).click();
  await expect(page).toHaveURL(/\/history$/);
  await expect
    .poll(() => page.evaluate(() => (window as any).motionEvents))
    .toContain('history-arrive');
  await page.getByRole('button', { name: 'Custos', exact: true }).click();
  await expect(page).toHaveURL(/\/costs$/);
  await expect
    .poll(() => page.evaluate(() => (window as any).motionEvents))
    .toContain('costs-arrive');
});
test('redução de movimento desliga animações da splash', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/auth/me', async (route) => {
    await gate;
    await route.continue();
  });
  try {
    await page.goto('/');
    await expect(page.locator('fl-startup .startup-screen')).toBeVisible();
    expect(
      await page
        .locator('fl-startup .startup-screen')
        .evaluate((el) => getComputedStyle(el).animationName),
    ).toBe('none');
    expect(
      await page
        .locator('fl-startup .startup-progress')
        .evaluate((el) => getComputedStyle(el, '::after').animationName),
    ).toBe('none');
  } finally {
    release();
  }
});
