import { expect, test } from '@playwright/test';
import { deflateSync } from 'node:zlib';
test.use({ serviceWorkers: 'block' });
// Tiny PNG fixture with valid CRCs; no generated/user media dependency.
function png() {
  const crc = (b: Buffer) => {
    let c = 0xffffffff;
    for (const v of b) {
      c ^= v;
      for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (kind: string, data: Buffer) => {
    const k = Buffer.from(kind);
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(Buffer.concat([k, data])));
    return Buffer.concat([len, k, data, sum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(1, 0);
  header.writeUInt32BE(1, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.from([0, 255, 0, 0, 255]))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
test('foto usa S3 privado, persiste na garagem e remove', async ({ page }) => {
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
      data: { name: `Foto ${Date.now()}`, initialKm: 0 },
    })
  ).json();
  await page.reload();
  if (!new URL(page.url()).pathname.endsWith('/vehicles/'+v.id))
    await page.locator('button.vehicle-open').filter({ hasText: v.name }).click();
  await page
    .getByLabel('Selecionar foto')
    .setInputFiles({ name: 'vehicle.png', mimeType: 'image/png', buffer: png() });
  await page.getByRole('button', { name: 'Salvar foto', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Foto do veículo', exact: true })).toBeVisible();
  await page.reload();
  if (!new URL(page.url()).pathname.endsWith('/vehicles/'+v.id))
    await page.locator('button.vehicle-open').filter({ hasText: v.name }).click();
  await expect(page.getByRole('img', { name: 'Foto do veículo', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Remover foto', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Confirmar ação' })
    .getByRole('button', { name: 'Confirmar', exact: true })
    .click();
  await expect(page.getByRole('img', { name: 'Foto do veículo', exact: true })).not.toBeVisible();
});
