import { chromium, devices, expect } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Fulfill every app request directly from dist: no HTTP server or external traffic.
// Service workers are blocked here; the dedicated offline suite tests their lifecycle.
const root = fileURLToPath(new URL('../', import.meta.url));
const dist = path.join(root, 'dist');
const origin = 'https://belapcela.test';
const { version } = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff': 'font/woff', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8' };
await readFile(path.join(dist, 'index.html')); // Fail before launching if the production build is missing.
const channel = process.env.PLAYWRIGHT_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined);
const browser = await chromium.launch({ channel });
try {
  for (const [name, options] of [['desktop', { viewport: { width: 1536, height: 1000 } }], ['mobile', { ...devices['iPhone 13'], defaultBrowserType: undefined }]]) {
    const context = await browser.newContext({ ...options, serviceWorkers: 'block', colorScheme: 'light' });
    try {
      await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.origin !== origin) throw new Error(`Unexpected external request: ${url.origin}`);
        const file = path.resolve(dist, `.${decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)}`);
        if (!file.startsWith(`${dist}${path.sep}`)) return route.abort();
        try { await route.fulfill({ status: 200, contentType: mime[path.extname(file)] || 'application/octet-stream', body: await readFile(file) }); }
        catch { await route.fulfill({ status: 404, body: 'Missing build asset' }); }
      });
      const page = await context.newPage();
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      const screenshots = path.join(root, 'test-results/static-smoke', name);
      await mkdir(screenshots, { recursive: true });
      await page.goto(`${origin}/`);
      await expect(page.locator('.person-node')).toHaveCount(11);
      await expect(page.getByText('Размештамо породичне приче…')).not.toBeVisible();
      await expect.poll(() => page.getByTestId('graph-canvas').getAttribute('data-viewport')).not.toBe('0.000,0.000,0.720');
      await page.screenshot({ path: path.join(screenshots, 'tree-light.png') });
      await page.getByRole('button', { name: 'Укључи тамну тему' }).click();
      await page.screenshot({ path: path.join(screenshots, 'tree-dark.png') });
      await page.getByRole('button', { name: 'Подешавања', exact: true }).click();
      await page.getByRole('textbox', { name: 'Назив нове збирке' }).fill('Моја породица');
      await page.getByRole('button', { name: 'Направи празну збирку' }).click();
      await expect(page.getByRole('heading', { name: 'Почните своју породичну причу' })).toBeVisible();
      await page.screenshot({ path: path.join(screenshots, 'empty.png') });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.reload();
      await page.getByRole('button', { name: 'Додај прву особу' }).click();
      await page.getByRole('textbox', { name: 'Име и презиме', exact: true }).fill('Прва особа');
      await page.getByRole('button', { name: 'Сачувај измене', exact: true }).click();
      await expect(page.locator('.person-node')).toHaveCount(1);
      await page.reload(); await expect(page.locator('.person-node')).toHaveCount(1);
      await page.getByRole('button', { name: 'Подешавања', exact: true }).click();
      await page.getByLabel('Сачуване збирке').selectOption('demo-petronic');
      await page.getByRole('button', { name: 'Отвори изабрану збирку' }).click();
      await expect(page.locator('.person-node')).toHaveCount(11);
      await page.getByRole('button', { name: 'Подешавања', exact: true }).click();
      await page.getByRole('button', { name: 'О БелаПчели', exact: true }).click();
      await expect(page.getByRole('dialog', { name: 'О БелаПчели' })).toBeVisible();
      await expect(page.getByText(`ВЕРЗИЈА ${version}`)).toBeVisible();
      await page.screenshot({ path: path.join(screenshots, 'about.png') });
      expect(errors).toEqual([]);
      process.stdout.write(`${name}: production tree, theme, empty collection, first person, reload, collection switch and About passed.\n`);
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
