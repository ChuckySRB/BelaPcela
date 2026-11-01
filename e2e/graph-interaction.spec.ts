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

test('zoom changes detail without changing card geometry or losing focused/selected people', async ({ page }, testInfo) => {
  if (testInfo.project.name === 'desktop') await page.getByRole('button', { name: 'Затвори инспектор' }).click();
  const vera = page.locator('.person-node').filter({ hasText: 'Вера Петронић' });
  const geometry = await vera.evaluate(node => ({ width: (node as HTMLElement).offsetWidth, height: (node as HTMLElement).offsetHeight }));
  for (let i = 0; i < 6; i++) await page.getByRole('button', { name: 'Умањи', exact: true }).click();
  await expect(vera).toHaveAttribute('data-detail', 'far');
  const hubTarget = page.locator('.family-hub > button').first();
  expect((await hubTarget.boundingBox())!.width).toBeGreaterThanOrEqual(43);
  expect((await hubTarget.boundingBox())!.height).toBeGreaterThanOrEqual(43);
  await expect(page.locator('.person-node.is-focused')).toHaveAttribute('data-detail', 'near');
  expect(await vera.evaluate(node => ({ width: (node as HTMLElement).offsetWidth, height: (node as HTMLElement).offsetHeight }))).toEqual(geometry);
  await vera.focus();
  await page.keyboard.press('Enter');
  await expect(vera).toHaveAttribute('data-detail', 'near');
  await expect(page.getByRole('complementary').getByRole('heading', { name: 'Вера Петронић' })).toBeVisible();
});

test('delayed hover preview permits pointer travel and keyboard dismissal without selecting', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Touch users use the inspector and explicit preview action.');
  const vera = page.locator('.person-node').filter({ hasText: 'Вера Петронић' });
  await vera.hover();
  const preview = page.getByRole('dialog', { name: 'Кратак преглед: Вера Петронић' });
  await expect(preview).toBeVisible();
  await preview.getByRole('button', { name: 'Подаци о особи' }).hover();
  await expect(preview).toBeVisible();
  await expect(page.locator('.person-node.is-selected')).toHaveAttribute('aria-label', /Никола Петронић/);
  await page.keyboard.press('Escape');
  await expect(preview).not.toBeVisible();
  await vera.focus(); await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Кратак преглед: Вера Петронић', exact: true }).click();
  await expect(preview.getByRole('button', { name: 'Затвори кратак преглед' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(preview).not.toBeVisible();
  await expect(vera).toBeFocused();
  await expect(page.getByRole('complementary').getByRole('heading', { name: 'Вера Петронић' })).toBeVisible();
});
