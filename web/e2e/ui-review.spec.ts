import { expect, test } from '@playwright/test';
import { deflateSync } from 'node:zlib';
test.use({ serviceWorkers: 'block' });
function png() {
  const crc = (b: Buffer) => {
    let c = 0xffffffff;
    for (const n of b) {
      c ^= n;
      for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (t: string, d: Buffer) => {
    const k = Buffer.from(t),
      len = Buffer.alloc(4),
      sum = Buffer.alloc(4);
    len.writeUInt32BE(d.length);
    sum.writeUInt32BE(crc(Buffer.concat([k, d])));
    return Buffer.concat([len, k, d, sum]);
  };
  const h = Buffer.alloc(13);
  h.writeUInt32BE(1, 0);
  h.writeUInt32BE(1, 4);
  h[8] = 8;
  h[9] = 6;
  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    chunk('IHDR', h),
    chunk('IDAT', deflateSync(Buffer.from([0, 255, 0, 0, 255]))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
async function fixture(page: any) {
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Usuário', exact: true }).fill('e2e');
  await page.getByLabel('Senha', { exact: true }).fill('e2e-password-12345');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Adicionar veículo', exact: true })).toBeVisible();
  const gs = await (await page.request.get('/api/garages')).json();
  const base = `/api/garages/${gs[0].id}/vehicles`;
  const v = await (
    await page.request.post(base, {
      headers: { Origin: 'http://127.0.0.1:4173' },
      data: { name: `UI ${Date.now()}`, initialKm: 100, tagColor: '#b43a64' },
    })
  ).json();
  await page.reload();
  return { base, v, garage: gs[0].id };
}
test('URL preserva detalhes, ações rápidas usam diálogo e máscara é imediata', async ({ page }) => {
  const { base, v, garage } = await fixture(page);
  await page.getByRole('button', { name: 'Abastecer ' + v.name, exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Abastecimento', exact: true });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Total pago').fill('1234,56');
  await expect(dialog.getByLabel('Total pago')).toHaveValue(/R\$ 1\.234,56/);
  await dialog.getByLabel('Litros', { exact: true }).fill('10');
  await expect(dialog.getByLabel('Preço por litro')).toHaveValue(/123,456/);
  await dialog.getByLabel('Preço por litro').fill('6,2');
  await expect(dialog.getByLabel('Total pago')).toHaveValue(/62,00/);
  await dialog.getByLabel('Litros', { exact: true }).fill('20');
  await expect(dialog.getByLabel('Total pago')).toHaveValue(/124,00/);
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.locator('button.vehicle-open').filter({ hasText: v.name }).click();
  await expect(page).toHaveURL(new RegExp(`/garage/${garage}/vehicles/${v.id}$`));
  await page.reload();
  await expect(page.getByRole('heading', { name: v.name, exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Histórico', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/garage/${garage}/history$`));
  await expect(page.getByLabel('Filtrar moeda')).toHaveCount(0);
  await page.goBack();
  await expect(page.getByRole('heading', { name: v.name, exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Editar veículo', exact: true }).click();
  const editor = page.getByRole('dialog', { name: 'Editar veículo', exact: true });
  await editor.getByLabel('Cor da tag').evaluate((element: any) => {
    element.value = '#d17b3a';
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await editor.getByRole('button', { name: 'Salvar veículo', exact: true }).click();
  await expect(editor).not.toBeVisible();
  expect((await (await page.request.get(`${base}/${v.id}`)).json()).tagColor).toBe('#d17b3a');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('notas paginam de cinco em cinco e imagem opcional persiste privada', async ({ page }) => {
  const { base, v } = await fixture(page);
  for (let i = 0; i < 6; i++)
    await page.request.post(`${base}/${v.id}/notes`, {
      headers: { Origin: 'http://127.0.0.1:4173' },
      data: { content: `Anotação de teste ${i}` },
    });
  await page.locator('button.vehicle-open').filter({ hasText: v.name }).click();
  const notes = page.locator('fl-vehicle-records .notes-table');
  await expect(notes.locator('tbody tr')).toHaveCount(5);
  await page.getByRole('combobox', { name: 'Anotações: itens por página' }).selectOption('10');
  await expect(notes.locator('tbody tr')).toHaveCount(6);
  await page.getByRole('button', { name: 'Adicionar anotação', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Nova anotação', exact: true });
  await dialog.getByRole('textbox', { name: 'Anotação', exact: true }).fill('Imagem persistida');
  await dialog
    .getByLabel('Imagem opcional')
    .setInputFiles({ name: 'note.png', mimeType: 'image/png', buffer: png() });
  await dialog.getByRole('button', { name: 'Salvar anotação', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  const row = notes.getByRole('row').filter({ hasText: 'Imagem persistida' });
  await expect(row.getByRole('img', { name: 'Imagem da anotação' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: v.name, exact: true })).toBeVisible();
  await expect(
    notes.getByRole('row').filter({ hasText: 'Imagem persistida' }).getByRole('img'),
  ).toBeVisible();
});
