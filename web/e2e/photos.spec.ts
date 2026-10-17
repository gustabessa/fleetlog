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
  if (!new URL(page.url()).pathname.endsWith('/vehicles/' + v.id))
    await page.locator('button.vehicle-open').filter({ hasText: v.name }).click();
  await page
    .getByLabel('Selecionar foto')
    .setInputFiles({ name: 'vehicle.png', mimeType: 'image/png', buffer: png() });
  await expect(page.getByLabel('Prévia do enquadramento')).toBeVisible();
  const zoom = page.getByRole('slider', { name: 'Zoom', exact: true });
  const horizontal = page.getByRole('slider', { name: 'Posição horizontal', exact: true });
  const vertical = page.getByRole('slider', { name: 'Posição vertical', exact: true });
  await expect(zoom).toHaveValue('1');
  await expect(horizontal).toHaveValue('50');
  await expect(vertical).toHaveValue('50');
  await zoom.focus();
  await zoom.press('ArrowRight');
  await expect(zoom).toHaveValue('1.01');
  await expect(zoom).toHaveAttribute('aria-valuetext', '1.01×');
  await zoom.press('End');
  await zoom.press('ArrowRight');
  await expect(zoom).toHaveValue('3');
  await zoom.press('Home');
  await zoom.press('ArrowLeft');
  await expect(zoom).toHaveValue('1');
  await horizontal.focus();
  await horizontal.press('ArrowLeft');
  await expect(horizontal).toHaveValue('49');
  await vertical.focus();
  await vertical.press('End');
  await expect(vertical).toHaveValue('100');
  await vertical.press('Home');
  await expect(vertical).toHaveValue('0');
  await vertical.fill('50');
  for (const mode of ['☀ Claro', '☾ Escuro']) {
    for (const palette of ['Grafite e laranja', 'Ardósia e azul']) {
      await page.getByRole('button', { name: 'Escolher tema', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Escolha o tema' });
      await dialog.getByRole('button', { name: palette, exact: true }).click();
      await dialog.getByRole('button', { name: mode, exact: true }).click();
      // Resolve the CSS token as a color and compare it to the native control.
      expect(
        await zoom.evaluate((input) => {
          const probe = document.createElement('span');
          probe.style.color = 'var(--accent)';
          input.parentElement!.append(probe);
          const expected = getComputedStyle(probe).color;
          probe.remove();
          return getComputedStyle(input).accentColor === expected;
        }),
      ).toBe(true);
      await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
    }
  }
  await page.emulateMedia({ forcedColors: 'active' });
  await zoom.focus();
  await zoom.press('ArrowRight');
  await expect(zoom).toHaveValue('1.01');
  await page.emulateMedia({ forcedColors: 'none' });
  for (const slider of [zoom, horizontal, vertical]) {
    const box = await slider.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  }
  await zoom.fill('1.5');
  await page.getByLabel('Posição horizontal', { exact: true }).fill('30');
  let releaseUpload!: () => void;
  const uploadGate = new Promise<void>((resolve) => {
    releaseUpload = resolve;
  });
  await page.route('**/image', async (route) => {
    if (route.request().method() === 'PUT') await uploadGate;
    await route.continue();
  });
  try {
    await page.getByRole('button', { name: 'Salvar foto', exact: true }).click();
    for (const slider of [zoom, horizontal, vertical]) await expect(slider).toBeDisabled();
  } finally {
    releaseUpload();
  }
  await expect(page.getByRole('img', { name: 'Foto do veículo', exact: true })).toBeVisible();
  await page.reload();
  if (!new URL(page.url()).pathname.endsWith('/vehicles/' + v.id))
    await page.locator('button.vehicle-open').filter({ hasText: v.name }).click();
  await expect(page.getByRole('img', { name: 'Foto do veículo', exact: true })).toBeVisible();
  const savedPhoto = page.getByRole('img', { name: 'Foto do veículo', exact: true });
  await expect
    .poll(() =>
      savedPhoto.evaluate((img: HTMLImageElement) => [img.naturalWidth, img.naturalHeight]),
    )
    .toEqual([1024, 1024]);
  await page.getByRole('button', { name: 'Ajustar enquadramento', exact: true }).click();
  await expect(page.getByLabel('Prévia do enquadramento')).toBeVisible();
  await page.getByRole('button', { name: 'Cancelar enquadramento', exact: true }).click();
  await expect(page.getByLabel('Prévia do enquadramento')).not.toBeVisible();
  await expect(savedPhoto).toBeVisible();
  await page.getByRole('button', { name: 'Ajustar enquadramento', exact: true }).click();
  await page.getByLabel('Zoom', { exact: true }).fill('2');
  await page.getByRole('button', { name: 'Salvar enquadramento', exact: true }).click();
  await expect(page.getByLabel('Prévia do enquadramento')).not.toBeVisible();
  await page.getByRole('button', { name: 'Remover foto', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Confirmar ação' })
    .getByRole('button', { name: 'Confirmar', exact: true })
    .click();
  await expect(page.getByRole('img', { name: 'Foto do veículo', exact: true })).not.toBeVisible();
});
