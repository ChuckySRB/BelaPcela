import { expect, test, type Download } from '@playwright/test';
import { unzipSync, zipSync, strToU8 } from 'fflate';

async function downloaded(download: Download) { const chunks: Buffer[] = []; const stream = await download.createReadStream(); for await (const chunk of stream!) chunks.push(Buffer.from(chunk)); return Buffer.concat(chunks); }

test('ZIP replacement restores original photographs, shared records and exact bytes after reload', async ({ page }, testInfo) => {
  test.setTimeout(30000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/#/media');
  const encoded = await page.evaluate(() => { const canvas = document.createElement('canvas'); canvas.width = 48; canvas.height = 60; const context = canvas.getContext('2d')!; context.fillStyle = '#244B3A'; context.fillRect(0, 0, 48, 60); return canvas.toDataURL('image/png').split(',')[1]; });
  const original = Buffer.from(encoded, 'base64');
  await page.getByRole('button', { name: 'Додај датотеке', exact: true }).click();
  await page.getByLabel('Изабери датотеке', { exact: true }).setInputFiles([{ name: 'портрет.png', mimeType: 'image/png', buffer: original }, { name: 'писмо.txt', mimeType: 'text/plain', buffer: Buffer.from('Изворно писмо · породица') }]);
  await page.getByRole('checkbox', { name: 'Никола Петронић', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Вера Петронић', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Рођење · Никола Петронић', exact: true }).check();
  await page.getByRole('button', { name: 'Сачувај датотеке' }).click();
  await page.locator('.media-tile').filter({ hasText: 'портрет.png' }).click();
  await page.getByRole('combobox', { name: 'Изабери особу за портрет' }).selectOption('nikola'); await page.getByRole('button', { name: 'Постави за портрет' }).click();
  await page.getByRole('button', { name: 'Подешавања', exact: true }).click();
  await page.getByLabel('Назив збирке', { exact: true }).fill('Породична успомена'); await page.getByRole('button', { name: 'Сачувај назив' }).click();
  await expect(page.getByText('Назив је сачуван.')).toBeVisible();
  await page.getByRole('button', { name: 'Направи резервну копију', exact: true }).click();
  const pending = page.waitForEvent('download'); await page.getByRole('button', { name: 'Направи ZIP резервну копију' }).click(); const bytes = await downloaded(await pending);
  const zip = unzipSync(bytes); expect(Object.keys(zip)).toHaveLength(4); expect(zip['data/photos/media-000001.png']).toEqual(new Uint8Array(original));
  await page.getByRole('button', { name: 'Затвори дијалог' }).click();
  await page.getByLabel('Назив збирке', { exact: true }).fill('Измена после копије'); await page.getByRole('button', { name: 'Сачувај назив' }).click(); await expect(page.getByText('Назив је сачуван.')).toBeVisible();
  await page.getByRole('button', { name: 'Направи резервну копију', exact: true }).click();
  await page.getByLabel('ZIP или JSON за увоз').setInputFiles({ name: 'копија.zip', mimeType: 'application/zip', buffer: bytes });
  await expect(page.getByRole('heading', { name: 'Преглед увоза: Породична успомена' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Потврди увоз' })).toBeDisabled();
  await page.getByLabel('Начин увоза').selectOption('replace');
  await page.screenshot({ path: testInfo.outputPath('import-review.png'), fullPage: true });
  await page.getByRole('checkbox', { name: /Разумем и потврђујем замену/ }).check(); await page.getByRole('button', { name: 'Потврди увоз' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.goto('/#/person/nikola'); await expect(page.locator('.portrait--profile img')).toBeVisible(); await expect(page.locator('.media-tile')).toHaveCount(2);
  await page.reload(); await page.locator('.media-tile').filter({ hasText: 'портрет.png' }).click();
  const restored = page.waitForEvent('download'); await page.getByRole('link', { name: 'Преузми оригинал' }).click(); expect(await downloaded(await restored)).toEqual(original);
  await page.getByRole('button', { name: 'Подешавања', exact: true }).click(); await expect(page.getByLabel('Назив збирке', { exact: true })).toHaveValue('Породична успомена');
  expect(errors).toEqual([]);
});

test('data-only import opens a separate collection and settings can reopen the original', async ({ page }) => {
  await page.goto('/#/settings'); await page.getByLabel('Назив збирке', { exact: true }).fill('Почетна збирка'); await page.getByRole('button', { name: 'Сачувај назив' }).click(); await expect(page.getByText('Назив је сачуван.')).toBeVisible();
  await page.getByRole('button', { name: 'Направи резервну копију', exact: true }).click(); const pending = page.waitForEvent('download'); await page.getByRole('button', { name: 'Преузми JSON — само подаци' }).click(); const json = JSON.parse((await downloaded(await pending)).toString('utf8')); json.archive.name = 'Увезена збирка';
  await page.getByLabel('ZIP или JSON за увоз').setInputFiles({ name: 'data.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(json)) });
  await expect(page.getByText('Ово је JSON само са подацима. Оригиналне датотеке нису укључене.')).toBeVisible();
  await page.getByRole('checkbox', { name: /Прегледао\/ла сам податке/ }).check(); await page.getByRole('button', { name: 'Потврди увоз' }).click(); await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Подешавања', exact: true }).click(); await expect(page.getByLabel('Назив збирке', { exact: true })).toHaveValue('Увезена збирка');
  const originalValue = await page.getByLabel('Сачуване збирке').locator('option').filter({ hasText: 'Почетна збирка' }).getAttribute('value');
  await page.getByLabel('Сачуване збирке').selectOption(originalValue!); await page.getByRole('button', { name: 'Отвори изабрану збирку' }).click();
  await page.reload(); await page.getByRole('button', { name: 'Подешавања', exact: true }).click(); await expect(page.getByLabel('Назив збирке', { exact: true })).toHaveValue('Почетна збирка');
});

test('bad imports are rejected during review without altering the active collection', async ({ page }) => {
  await page.goto('/#/settings'); const name = await page.getByLabel('Назив збирке', { exact: true }).inputValue();
  await page.getByRole('button', { name: 'Направи резервну копију', exact: true }).click();
  await page.getByLabel('ZIP или JSON за увоз').setInputFiles({ name: 'traversal.zip', mimeType: 'application/zip', buffer: Buffer.from(zipSync({ '../family.json': strToU8('{}') })) });
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('ZIP није исправан'); await expect(page.getByRole('button', { name: 'Потврди увоз' })).toHaveCount(0);
  await page.keyboard.press('Escape'); await expect(page.getByLabel('Назив збирке', { exact: true })).toHaveValue(name);
});
