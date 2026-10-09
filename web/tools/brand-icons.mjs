// Render the repo-native vector symbol into installable PWA sizes.
import fs from 'node:fs/promises';
import { chromium } from 'playwright-core';
const svg = (await fs.readFile(new URL('../public/logo.svg', import.meta.url), 'utf8'))
  .replace('viewBox="145 340 990 620"', 'viewBox="145 340 990 350"')
  .replace(/<text[\s\S]*?<\/text>/, '');
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  for (const size of [72, 96, 128, 144, 152, 192, 384, 512]) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<style>body{margin:0;background:#f6f8fa;display:grid;place-items:center;width:100vw;height:100vh}svg{width:72%;height:auto}</style>${svg}`);
    await page.screenshot({ path: new URL(`../public/icons/icon-${size}x${size}.png`, import.meta.url).pathname });
  }
} finally { await browser.close(); }
