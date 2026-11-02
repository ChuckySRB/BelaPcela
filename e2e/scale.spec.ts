import { expect, test } from '@playwright/test';
import { largeArchive } from '../src/tests/largeArchive';

test('a 1200-person import lays out in a worker, remains responsive and collapses without losing data', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Desktop editing scale; mobile browsing is covered by the regular suite.'); test.setTimeout(45000);
  const archive = largeArchive(1200);
  await page.goto('/#/settings'); await page.getByRole('button', { name: 'Направи резервну копију', exact: true }).click();
  await page.getByLabel('ZIP или JSON за увоз').setInputFiles({ name: 'scale.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ format: 'BelaPcela', formatVersion: 1, dataSchemaVersion: 3, exportedAt: new Date().toISOString(), kind: 'data-only', archive })) });
  await page.getByRole('checkbox', { name: /Прегледао\/ла сам податке/ }).check();
  const start = Date.now(); await page.getByRole('button', { name: 'Потврди увоз' }).click();
  // A header control must respond while ELK is doing the expensive part in its worker.
  await page.getByRole('button', { name: 'Укључи тамну тему' }).click(); await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByText('Размештамо породичне приче…')).not.toBeVisible({ timeout: 25000 });
  await expect(page.getByText('1200 особа у приказу', { exact: true })).toBeVisible();
  expect(Date.now() - start).toBeLessThan(30000);
  await page.getByRole('button', { name: 'Увећај', exact: true }).click();
  await page.keyboard.press('Control+k'); await page.getByRole('textbox', { name: 'Претражи особе' }).fill('Особа 1199'); await page.getByRole('dialog').getByRole('button', { name: /Особа 1199/ }).click();
  await expect(page.getByRole('complementary').getByRole('heading', { name: 'Особа 1199', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Уклопи приказ', exact: true }).click();
  const junction = page.getByRole('button', { name: /Породична веза: Особа 0\./ }); await junction.press('Enter');
  await page.getByRole('button', { name: 'Сакриј потомке' }).click(); await expect(page.getByText('1 особа у приказу', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Прикажи све гране', exact: true }).click(); await expect(page.getByText('1200 особа у приказу', { exact: true })).toBeVisible();
  await testInfo.attach('scale-timing', { body: `1200-person import/layout/interactive controls completed in ${Date.now() - start} ms.`, contentType: 'text/plain' });
});
