import { expect, test } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';

test('production shell cold-starts offline with local media, lazy settings, worker layout and ZIP backup', async ({ page, context }, testInfo) => {
  const errors: string[] = []; context.on('page', current => current.on('pageerror', error => errors.push(error.message)));
  await page.goto('/#/media'); await expect(page.getByText('Апликација је спремна за рад без интернета.')).toBeVisible();
  await page.getByRole('button', { name: 'Додај датотеке', exact: true }).click();
  await page.getByLabel('Изабери датотеке', { exact: true }).setInputFiles({ name: 'офлајн.txt', mimeType: 'text/plain', buffer: Buffer.from('Локална успомена без интернета') });
  await page.getByRole('checkbox', { name: 'Никола Петронић', exact: true }).check(); await page.getByRole('button', { name: 'Сачувај датотеке' }).click(); await expect(page.locator('.media-tile')).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  const cached = await page.evaluate(async () => { const names = (await caches.keys()).filter(name => name.startsWith('belapcela-shell-')); const cache = await caches.open(names[0]); return (await cache.keys()).map(request => request.url); });
  expect(cached.some(url => /layout.worker/.test(url))).toBe(true); expect(cached.every(url => !/blob:|family.json|\/media\//.test(url))).toBe(true);
  await context.setOffline(true); await page.close(); const offline = await context.newPage();
  await offline.goto('/#/tree'); await expect(offline.locator('.person-node')).toHaveCount(11); await expect(offline.getByText('Размештамо породичне приче…')).not.toBeVisible();
  await offline.getByRole('button', { name: 'Подешавања', exact: true }).click(); await offline.getByLabel('Назив збирке', { exact: true }).fill('Збирка без интернета'); await offline.getByRole('button', { name: 'Сачувај назив' }).click(); await expect(offline.getByText('Назив је сачуван.')).toBeVisible();
  await offline.reload(); await expect(offline.getByLabel('Назив збирке', { exact: true })).toHaveValue('Збирка без интернета');
  await offline.getByRole('button', { name: 'Направи резервну копију', exact: true }).click(); const pending = offline.waitForEvent('download'); await offline.getByRole('button', { name: 'Направи ZIP резервну копију' }).click(); const download = await pending;
  expect(download.suggestedFilename()).toMatch(/\.zip$/); const chunks: Buffer[] = []; const stream = await download.createReadStream(); for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  await offline.getByLabel('ZIP или JSON за увоз').setInputFiles({ name: 'offline.zip', mimeType: 'application/zip', buffer: Buffer.concat(chunks) }); await expect(offline.getByRole('heading', { name: 'Преглед увоза: Збирка без интернета' })).toBeVisible();
  await offline.keyboard.press('Escape'); await offline.getByRole('button', { name: 'Архив', exact: true }).click(); await offline.locator('.media-tile').click(); await expect(offline.locator('.document-text')).toHaveText('Локална успомена без интернета');
  await offline.screenshot({ path: testInfo.outputPath('offline-media.png'), fullPage: true }); expect(errors).toEqual([]);
});

test('a waiting app update preserves an open draft until the user explicitly reloads', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'offline-desktop', 'Service-worker update lifecycle is shared across responsive layouts.');
  const path = new URL('../dist/sw.js', import.meta.url); const original = await readFile(path, 'utf8');
  try {
    await page.goto('/#/settings'); await expect(page.getByText('Апликација је спремна за рад без интернета.')).toBeVisible();
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    await page.getByLabel('Назив збирке', { exact: true }).fill('Несачуван нацрт');
    await writeFile(path, `${original}\n// update lifecycle test ${Date.now()}\n`);
    await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration())!.update(); });
    await expect(page.getByText('Доступна је нова верзија. Прво сачувајте отворен унос.')).toBeVisible();
    await expect(page.getByLabel('Назив збирке', { exact: true })).toHaveValue('Несачуван нацрт');
    await page.getByRole('button', { name: 'Сачувај назив' }).click(); await expect(page.getByText('Назив је сачуван.')).toBeVisible();
    const reloaded = page.waitForEvent('load'); await page.getByRole('button', { name: 'Ажурирај и поново отвори' }).click(); await reloaded;
    await expect(page.getByLabel('Назив збирке', { exact: true })).toHaveValue('Несачуван нацрт');
  } finally { await writeFile(path, original); }
});
