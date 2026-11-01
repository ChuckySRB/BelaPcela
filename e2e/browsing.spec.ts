import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.person-node')).toHaveCount(11);
  await expect(page.getByText('Размештамо породичне приче…')).not.toBeVisible();
  await expect.poll(async () => page.getByTestId('graph-canvas').getAttribute('data-viewport')).not.toBe('0.000,0.000,0.720');
});

test('selection keeps focus and viewport, and profile round-trip preserves the view', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Mobile-specific browsing is covered below.');
  const canvas = page.getByTestId('graph-canvas');
  const initialZoom = Number((await canvas.getAttribute('data-viewport'))!.split(',')[2]);
  await page.getByRole('button', { name: 'Увећај', exact: true }).click();
  // Zoom controls animate; wait for the viewport to settle before testing selection.
  await expect(page.getByRole('button', { name: 'Увећај', exact: true })).toBeEnabled();
  await page.mouse.move(300, 250);
  await expect.poll(async () => Number((await canvas.getAttribute('data-viewport'))!.split(',')[2])).toBeGreaterThan(initialZoom);
  const before = await canvas.getAttribute('data-viewport');
  await page.locator('.person-node').filter({ hasText: 'Вера Петровић' }).click();
  await expect(canvas).toHaveAttribute('data-focus-person', 'nikola');
  await expect(page.getByRole('complementary', { name: 'Подаци о изабраној особи' }).getByRole('heading', { name: 'Вера Петровић' })).toBeVisible();
  await expect(canvas).toHaveAttribute('data-viewport', before!);
  await page.getByRole('button', { name: 'Отвори профил', exact: true }).click();
  await expect(page).toHaveURL(/#\/person\/vera$/);
  await expect(page.getByRole('heading', { name: 'Вера Петровић', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Назад на стабло' }).click();
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute('data-viewport', before!);
});

test('focus is explicit and a disconnected person remains accessible', async ({ page }) => {
  await page.getByRole('button', { name: 'Фокусирано', exact: true }).click();
  await expect(page.locator('.person-node')).toHaveCount(10);
  await page.getByRole('button', { name: 'Цело стабло', exact: true }).click();
  await expect(page.locator('.person-node')).toHaveCount(11);
  await page.locator('.unconnected-note').getByRole('button', { name: 'Даница Илић', exact: true }).click();
  await expect(page.getByTestId('graph-canvas')).toHaveAttribute('data-focus-person', 'nikola');
  await page.keyboard.press('f');
  await expect(page.getByTestId('graph-canvas')).toHaveAttribute('data-focus-person', 'danica');
  await expect(page.locator('.person-node')).toHaveCount(1);
});

test('search and relative menu work by keyboard and explain prototype scope', async ({ page }) => {
  await page.keyboard.press('Control+k');
  const search = page.getByRole('textbox', { name: 'Претражи особе' });
  await expect(search).toBeFocused();
  await search.fill('ниџа');
  await page.getByRole('dialog').getByRole('button', { name: /Никола Петровић/ }).click();
  await page.getByRole('button', { name: 'Додај сродника', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: /^Дете/ }).click();
  await expect(page.getByRole('dialog').getByRole('status')).toContainText('подаци нису промењени');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.locator('.person-node')).toHaveCount(11);
});

test('keyboard selection opens a closed inspector without moving the graph', async ({ page }, testInfo) => {
  if (testInfo.project.name === 'desktop') await page.getByRole('button', { name: 'Затвори инспектор' }).click();
  const canvas = page.getByTestId('graph-canvas');
  const before = await canvas.getAttribute('data-viewport');
  const positions = await page.locator('.react-flow__node').evaluateAll(nodes => nodes.map(node => (node as HTMLElement).style.transform));
  await page.locator('.person-node').filter({ hasText: 'Вера Петровић' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('complementary', { name: 'Подаци о изабраној особи' }).getByRole('heading', { name: 'Вера Петровић' })).toBeVisible();
  await expect(canvas).toHaveAttribute('data-viewport', before!);
  await expect(canvas).toHaveAttribute('data-focus-person', 'nikola');
  expect(await page.locator('.react-flow__node').evaluateAll(nodes => nodes.map(node => (node as HTMLElement).style.transform))).toEqual(positions);
});

test('single-parent hub explains missing parent without inventing a partner', async ({ page }) => {
  await page.getByRole('button', { name: /Породична веза: Вера Петровић/ }).click();
  const inspector = page.getByRole('complementary', { name: 'Подаци о породичној вези' });
  await expect(inspector.getByText(/Други родитељ није познат/)).toBeVisible();
  await expect(inspector.getByText('Брак', { exact: true })).not.toBeVisible();
});

test('all app assets are local and the page runs without remote requests', async ({ page }, testInfo) => {
  const external: string[] = [];
  page.on('request', request => { if (!request.url().startsWith('http://127.0.0.1:5173') && !request.url().startsWith('data:')) external.push(request.url()); });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.reload();
  await expect(page.locator('.person-node')).toHaveCount(11);
  await expect(page.locator('html')).toHaveAttribute('lang', 'sr-Cyrl');
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('demo.png'), fullPage: true });
});

test('mobile sheet closes and the canvas has no horizontal page overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile');
  await expect(page.getByRole('complementary', { name: 'Подаци о изабраној особи' })).not.toBeVisible();
  await page.locator('.unconnected-note').getByRole('button', { name: 'Даница Илић', exact: true }).click();
  await expect(page.getByRole('complementary', { name: 'Подаци о изабраној особи' })).toBeVisible();
  await page.getByRole('button', { name: 'Затвори инспектор' }).click();
  await expect(page.getByTestId('graph-canvas')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.getByRole('button', { name: 'Увећај', exact: true })).toBeVisible();
});
