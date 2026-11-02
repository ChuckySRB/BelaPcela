import { chromium } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
const svg = await readFile(new URL('../public/seal.svg', import.meta.url), 'utf8');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage();
  for (const size of [192, 512]) {
    const base64 = await page.evaluate(async ({ svg, size }) => {
      const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size;
      const context = canvas.getContext('2d'); context.fillStyle = '#F7F3EA'; context.fillRect(0, 0, size, size);
      const image = new Image(); image.src = 'data:image/svg+xml;base64,' + btoa(svg); await image.decode();
      context.drawImage(image, size * .22, size * .185, size * .56, size * .63);
      return canvas.toDataURL('image/png').split(',')[1];
    }, { svg, size });
    await mkdir(new URL('../public/icons/', import.meta.url), { recursive: true });
    await writeFile(new URL(`../public/icons/icon-${size}.png`, import.meta.url), Buffer.from(base64, 'base64'));
  }
} finally { await browser.close(); }
