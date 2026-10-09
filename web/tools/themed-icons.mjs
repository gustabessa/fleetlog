// Deterministic brand assets from the shared palette tokens; no user secrets/data.
import fs from 'node:fs/promises';
import { chromium } from 'playwright-core';
const themes = await fs.readFile(new URL('../src/themes.css', import.meta.url), 'utf8');
const original = await fs.readFile(new URL('../public/logo.svg', import.meta.url), 'utf8');
const base = JSON.parse(
  await fs.readFile(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'),
);
await fs.mkdir(new URL('../public/pwa', import.meta.url), { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  for (const palette of [
    'original',
    'orange',
    'blue',
    'violet',
    'green',
    'rose',
    'amber',
    'cyan',
    'red',
    'lime',
    'mono',
    'copper',
  ])
    for (const mode of ['light', 'dark']) {
      await page.setContent(`<style>${themes}</style>`);
      const colors = await page.evaluate(
        ({ palette, mode }) => {
          document.documentElement.dataset.palette = palette;
          document.documentElement.dataset.theme = mode;
          const css = getComputedStyle(document.documentElement);
          return Object.fromEntries(
            ['bg', 'text', 'accent', 'surface'].map((k) => [
              k,
              css.getPropertyValue('--' + k).trim(),
            ]),
          );
        },
        { palette, mode },
      );
      const svg = original
        .replace('viewBox="145 340 990 620"', 'viewBox="145 340 990 350"')
        .replace(/<text[\s\S]*?<\/text>/, '')
        .replaceAll('#253238', colors.text)
        .replaceAll('#087e83', colors.accent);
      const key = `${palette}-${mode}`;
      const icons = [];
      for (const size of [192, 512]) {
        await page.setViewportSize({ width: size, height: size });
        await page.setContent(
          `<style>body{margin:0;background:${colors.bg};width:100vw;height:100vh;display:grid;place-items:center}svg{width:72%;height:auto}</style>${svg}`,
        );
        const file = `pwa-${key}-${size}.png`;
        await page.screenshot({
          path: new URL('../public/icons/' + file, import.meta.url).pathname,
        });
        icons.push({
          src: '/icons/' + file,
          sizes: `${size}x${size}`,
          type: 'image/png',
          purpose: 'any maskable',
        });
      }
      await fs.writeFile(
        new URL('../public/pwa/' + key + '.webmanifest', import.meta.url),
        JSON.stringify(
          {
            ...base,
            id: '/',
            start_url: '/',
            scope: '/',
            theme_color: colors.surface,
            background_color: colors.bg,
            icons,
          },
          null,
          2,
        ) + '\n',
      );
    }
} finally {
  await browser.close();
}
