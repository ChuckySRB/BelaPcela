import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.person-node')).toHaveCount(11);
  await expect(page.getByText('Размештамо породичне приче…')).not.toBeVisible();
});

test('collapse preserves the viewport and survives profile navigation and mode changes', async ({ page }, testInfo) => {
  if (testInfo.project.name === 'desktop') await page.getByRole('button', { name: 'Затвори инспектор' }).click();
  await page.getByRole('button', { name: /Породична веза: Ана Јовановић и Никола Петронић/ }).click();
  const canvas = page.getByTestId('graph-canvas');
  const view = await canvas.getAttribute('data-viewport');
  await page.getByRole('button', { name: 'Сакриј потомке (2)' }).click();
  await expect(page.locator('.person-node')).toHaveCount(9);
  await expect(canvas).toHaveAttribute('data-viewport', view!);
  await expect(canvas).toHaveAttribute('data-focus-person', 'nikola');
  await expect(page.getByRole('button', { name: 'Прикажи потомке: 2 особа' })).toBeAttached();
  await page.getByRole('button', { name: 'Претражи породичну збирку' }).click();
  await page.getByRole('textbox', { name: 'Претражи особе' }).fill('Вера');
  await page.getByRole('dialog').getByRole('button', { name: /Вера/ }).click();
  await expect(page.locator('.person-node')).toHaveCount(9);
  await page.getByRole('button', { name: 'Отвори профил', exact: true }).click();
  await page.getByRole('button', { name: 'Назад на стабло' }).click();
  await expect(page.locator('.person-node')).toHaveCount(9);
  await expect(canvas).toHaveAttribute('data-viewport', view!);
  if (testInfo.project.name === 'mobile') await page.getByRole('button', { name: 'Затвори инспектор' }).click();
  await page.getByRole('button', { name: 'Фокусирано', exact: true }).click();
  await expect(page.locator('.person-node')).toHaveCount(8);
  await page.getByRole('button', { name: 'Цело стабло', exact: true }).click();
  await expect(page.locator('.person-node')).toHaveCount(9);
  await page.getByRole('button', { name: 'Прикажи све гране', exact: true }).click();
  await expect(page.locator('.person-node')).toHaveCount(11);
  await page.reload();
  await expect(page.locator('.person-node')).toHaveCount(11);
});
