import { expect, test, Page } from '@playwright/test';

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
  await expect(page.locator('.entry').filter({ hasText: 'Honda Civic · ABC1D23' })).toHaveCount(5);
  await expect(page.locator('.entry').filter({ hasText: 'Volkswagen Polo · DEF4G56' })).toHaveCount(
    4,
  );
  await page.getByRole('button', { name: 'Custos', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Custos', exact: true })).toBeVisible();
  await expect(page.getByText('R$ 2.110,64', { exact: true })).toBeVisible();
  await page.getByLabel('Veículo', { exact: true }).selectOption('ABC1D23');
  await expect(page.getByText('R$ 1.282,90', { exact: true })).toBeVisible();
  await page.getByLabel('Veículo', { exact: true }).selectOption('DEF4G56');
  await expect(page.getByText('R$ 827,74', { exact: true })).toBeVisible();
  await expect(page.getByText('R$ 0,84', { exact: true })).toBeVisible();
  await expect(page.getByText('R$ 420,00', { exact: true }).first()).toBeVisible();
  await page.getByLabel('Veículo', { exact: true }).selectOption('all');
  await expect(page.getByText('R$ 2.110,64', { exact: true })).toBeVisible();
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

test('primitivos preservam labels, validação e envio do login com estado de carregamento', async ({
  page,
}) => {
  await page.route('**/api/auth/me', (route) => route.fulfill({ status: 401, json: {} }));
  let finishLogin!: () => void;
  const pending = new Promise<void>((resolve) => {
    finishLogin = resolve;
  });
  await page.route('**/api/auth/login', async (route) => {
    expect(route.request().postDataJSON()).toEqual({ username: 'teste', password: 'senha-teste' });
    await pending;
    await route.fulfill({ json: { username: 'teste', currency: 'BRL' } });
  });
  await page.goto('/');
  const submit = page.getByRole('button', { name: 'Entrar', exact: true });
  await submit.click();
  await expect(page.getByRole('heading', { name: 'Entre na sua garagem' })).toBeVisible();
  await expect(submit).toBeEnabled();
  await page.getByLabel('Usuário', { exact: true }).fill('teste');
  await page.getByLabel('Senha', { exact: true }).fill('senha-teste');
  await page.getByLabel('Senha', { exact: true }).press('Enter');
  const loading = page.getByRole('button', { name: 'Entrando…', exact: true });
  await expect(loading).toBeDisabled();
  await expect(loading).toHaveAttribute('aria-busy', 'true');
  finishLogin();
  await expect(page.getByRole('heading', { name: 'Minha garagem' })).toBeVisible();
  await page.getByRole('button', { name: 'Explorar próximas telas' }).click();
  await expect(page.getByRole('button', { name: 'Garagem', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
});

test('histórico combina filtros e pizza filtra lançamentos do veículo selecionado', async ({
  page,
}) => {
  await page.route('**/api/auth/me', (route) => route.fulfill({ status: 401, json: {} }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Explorar prévia da garagem' }).click();
  await expect(page.locator('fl-page-heading .fl-eyebrow')).toHaveCount(0);
  expect(
    await page
      .locator('.vehicle-grid')
      .evaluate(
        (el) =>
          el.getBoundingClientRect().top <
          document.querySelector('.stats')!.getBoundingClientRect().top,
      ),
  ).toBe(true);
  await page.getByRole('button', { name: 'Histórico', exact: true }).click();
  await page.getByLabel('Veículo', { exact: true }).selectOption('DEF4G56');
  await page.getByLabel('Tipo de custo').selectOption('service');
  await page.getByLabel('Buscar').fill('revisao');
  await selectRange(page, 'history-period', '2026-09-26', '2026-09-26');
  await expect(page.locator('.timeline .entry')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Revisão periódica' })).toBeVisible();
  await page.getByLabel('Buscar').fill('inexistente');
  await expect(page.getByText('Nenhum lançamento encontrado para estes filtros.')).toBeVisible();
  await page.getByRole('button', { name: 'Limpar filtros' }).click();
  await expect(page.locator('.timeline .entry')).toHaveCount(9);
  await page.getByRole('button', { name: 'Custos', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Custos', exact: true })).toBeVisible();
  await page.getByLabel('Veículo', { exact: true }).selectOption('DEF4G56');
  const slice = page.locator('fl-pie-chart path').filter({ hasText: 'Manutenção' });
  await slice.focus();
  await slice.press('Enter');
  const list = page.getByLabel('Lançamentos dos custos');
  await expect(list.locator('.entry')).toHaveCount(1);
  await expect(list).toContainText('Volkswagen Polo');
  await expect(list).toContainText('R$ 240,00');
  await page.getByLabel('Veículo', { exact: true }).selectOption('ABC1D23');
  await expect(list.locator('.entry')).toHaveCount(1);
  await expect(list).toContainText('Troca de óleo e filtro');
  await expect(list).toContainText('R$ 380,00');
  await page.getByRole('button', { name: 'Ver todos os tipos' }).click();
  await expect(list.locator('.entry')).toHaveCount(4);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('preço aproximado, cor do veículo e período de custos', async ({ page }) => {
  await page.route('**/api/auth/me', (route) => route.fulfill({ status: 401, json: {} }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Explorar prévia da garagem' }).click();
  await page.getByRole('button', { name: /Honda Civic/ }).click();
  await page.getByLabel('Cor da tag do veículo').fill('#c04080');
  await page.getByRole('button', { name: 'Histórico', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Histórico', exact: true })).toBeVisible();
  await page.getByLabel('Preço (R$)', { exact: true }).fill('250');
  await expect(page.getByText('R$ 225,00 a R$ 275,00 (±10%)')).toBeVisible();
  await expect(page.locator('.timeline .entry')).toHaveCount(3);
  await expect(page.locator('.timeline fl-badge').first()).toHaveCSS(
    'background-color',
    'rgb(192, 64, 128)',
  );
  await page.getByRole('button', { name: 'Limpar filtros' }).click();
  await expect(page.getByLabel('Preço (R$)', { exact: true })).toHaveValue('');
  await page.getByRole('button', { name: 'Custos', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Custos', exact: true })).toBeVisible();
  await selectRange(page, 'cost-period', '2026-10-01', '2026-10-31');
  await expect(page.getByText('R$ 486,50', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Lançamentos dos custos').locator('.entry')).toHaveCount(2);
  await expect(page.getByLabel('Lançamentos dos custos').locator('fl-badge').first()).toHaveCSS(
    'background-color',
    'rgb(192, 64, 128)',
  );
  const slice = page.locator('fl-pie-chart path').first();
  await slice.click();
  await expect(slice).toHaveCSS('outline-style', 'none');
  await selectRange(page, 'cost-period', '2026-08-01', '2026-08-31');
  await expect(page.getByText('Sem custos neste período.')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

async function selectRange(page: Page, id: string, from: string, to: string) {
  const picker = page.locator('fl-date-range').filter({ has: page.locator('#' + id + '-value') });
  await picker.locator('.trigger').click();
  const dateLabel = (iso: string) =>
    new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(iso + 'T12:00:00'));
  let month =
    id === 'history-period'
      ? '2026-10'
      : (await picker.locator('.month strong').innerText()).includes('setembro')
        ? '2026-09'
        : '2026-10';
  const target = from.slice(0, 7);
  while (month !== target) {
    const delta = month < target ? 1 : -1;
    await picker.getByRole('button', { name: delta > 0 ? 'Próximo mês' : 'Mês anterior' }).click();
    const [year, current] = month.split('-').map(Number);
    const next = new Date(year, current - 1 + delta, 1);
    month = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
  }
  await picker.getByRole('button', { name: dateLabel(from), exact: true }).click();
  await picker.getByRole('button', { name: dateLabel(to), exact: true }).click();
}

test('calendário fecha ao clicar fora e mantém cliques internos', async ({ page }) => {
  await page.route('**/api/auth/me', (route) => route.fulfill({ status: 401, json: {} }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Explorar prévia da garagem' }).click();
  await page.getByRole('button', { name: 'Custos', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Custos', exact: true })).toBeVisible();
  const picker = page.locator('fl-date-range');
  await picker.locator('.trigger').click();
  await picker.getByRole('button', { name: 'Próximo mês' }).click();
  await expect(picker.locator('.calendar')).toBeVisible();
  await page.getByRole('heading', { name: 'Custos', exact: true }).click();
  await expect(picker.locator('.calendar')).toHaveCount(0);
  await picker.locator('.trigger').click();
  await page.getByLabel('Veículo', { exact: true }).focus();
  await page.getByLabel('Veículo', { exact: true }).dispatchEvent('pointerdown');
  await expect(picker.locator('.calendar')).toHaveCount(0);
});

test('seletor mostra doze paletas nos dois modos e persiste escolha', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.route('**/api/auth/me', (route) => route.fulfill({ status: 401, json: {} }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Escolher tema', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Escolha o tema' });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.palette')).toHaveCount(12);
  const combinations = new Set<string>();
  for (const dark of [false, true]) {
    await dialog.getByRole('button', { name: dark ? '☾ Escuro' : '☀ Claro', exact: true }).click();
    for (let i = 0; i < 12; i++) {
      await dialog.locator('.palette').nth(i).click();
      await expect(dialog.locator('.palette').nth(i)).toHaveAttribute('aria-pressed', 'true');
      combinations.add(
        await page.evaluate(
          () =>
            document.documentElement.dataset['palette'] +
            ':' +
            document.documentElement.dataset['theme'],
        ),
      );
    }
  }
  expect(combinations.size).toBe(24);
  await dialog.getByRole('button', { name: 'Grafite e laranja', exact: true }).click();
  await dialog.getByRole('button', { name: 'Concluir', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'orange');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Escolher tema', exact: true }).click();
  await expect(
    dialog.getByRole('button', { name: 'Grafite e laranja', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
});

test('dialog mantém cabeçalho e ações fixos enquanto o conteúdo rola', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 600 });
  await page.route('**/api/auth/me', (route) => route.fulfill({ status: 401, json: {} }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Escolher tema', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Escolha o tema' });
  const header = await dialog.locator('header').boundingBox();
  const footer = await dialog.locator('footer').boundingBox();
  const body = dialog.locator('.body');
  expect(await body.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
  await body.evaluate((el) => (el.scrollTop = el.scrollHeight));
  expect(await dialog.locator('header').boundingBox()).toEqual(header);
  expect(await dialog.locator('footer').boundingBox()).toEqual(footer);
  await expect(dialog.getByRole('button', { name: 'Concluir', exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Fechar Escolha o tema', exact: true }).click();
  await expect(dialog).not.toBeVisible();
});
