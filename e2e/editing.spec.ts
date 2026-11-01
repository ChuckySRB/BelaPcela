import { expect, test, type Page } from '@playwright/test';

async function selectPerson(page: Page, name: string) {
  await page.getByRole('button', { name: 'Претражи породичну збирку' }).click();
  await page.getByRole('textbox', { name: 'Претражи особе' }).fill(name);
  await page.getByRole('dialog').getByRole('button', { name: new RegExp(name) }).click();
}
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.person-node')).toHaveCount(11);
  await expect(page.getByText('Размештамо породичне приче…')).not.toBeVisible();
});

test('commits edits and event years, preserves the view, and supports undo/redo and reload', async ({ page }) => {
  await selectPerson(page, 'Никола Петронић');
  const canvas = page.getByTestId('graph-canvas');
  const view = await canvas.getAttribute('data-viewport');
  await page.getByRole('button', { name: 'Измени особу', exact: true }).click();
  await page.getByRole('textbox', { name: 'Име и презиме', exact: true }).fill('Никола Petronić');
  await page.getByRole('spinbutton', { name: 'Година рођења' }).fill('1953');
  await page.getByRole('button', { name: 'Сачувај измене' }).click();
  const inspector = page.getByRole('complementary', { name: 'Подаци о изабраној особи' });
  await expect(inspector.getByRole('heading', { name: 'Никола Petronić' })).toBeVisible();
  await expect(inspector.getByText('р. 1953', { exact: true })).toBeVisible();
  await expect(canvas).toHaveAttribute('data-viewport', view!);
  await expect(page.locator('.local-status')).toHaveText('Сачувано локално');
  await page.keyboard.press('Control+z');
  await expect(inspector.getByRole('heading', { name: 'Никола Петронић' })).toBeVisible();
  await page.keyboard.press('Control+Shift+z');
  await expect(inspector.getByRole('heading', { name: 'Никола Petronić' })).toBeVisible();
  await page.reload();
  await expect(page.locator('.person-node')).toHaveCount(11);
  await selectPerson(page, 'Никола Petronić');
  await expect(inspector.getByText('р. 1953', { exact: true })).toBeVisible();
});

test('creates a child with an unknown other parent and persists it as one undoable command', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await selectPerson(page, 'Никола Петронић');
  const anchor = page.locator('.person-node').filter({ hasText: 'Никола Петронић' });
  const anchorBefore = await anchor.boundingBox();
  const zoomBefore = (await page.getByTestId('graph-canvas').getAttribute('data-viewport'))!.split(',')[2];
  await page.getByRole('button', { name: 'Додај сродника', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: /^Дете/ }).click();
  await page.getByRole('textbox', { name: /Име и презиме/ }).fill('Огњен Петронић');
  await expect(page.getByRole('combobox', { name: /Други родитељ/ })).toHaveValue('');
  await page.getByRole('button', { name: /Прегледај везу/ }).click();
  await page.screenshot({ path: testInfo.outputPath('relative-review.png'), fullPage: true });
  await page.getByRole('button', { name: 'Потврди и сачувај' }).click();
  await expect(page.locator('.person-node')).toHaveCount(12);
  await expect(page.getByText('Размештамо породичне приче…')).not.toBeVisible();
  await expect.poll(async () => Math.abs((await anchor.boundingBox())!.x - anchorBefore!.x)).toBeLessThan(2);
  await expect.poll(async () => Math.abs((await anchor.boundingBox())!.y - anchorBefore!.y)).toBeLessThan(2);
  expect((await page.getByTestId('graph-canvas').getAttribute('data-viewport'))!.split(',')[2]).toBe(zoomBefore);
  const inspector = page.getByRole('complementary', { name: 'Подаци о изабраној особи' });
  await expect(inspector.getByRole('heading', { name: 'Огњен Петронић' })).toBeVisible();
  await expect(inspector.locator('.relation-row')).toHaveCount(1);
  await expect(inspector.locator('.relation-row')).toContainText('Никола Петронић');
  await page.keyboard.press('Control+z');
  await expect(page.locator('.person-node')).toHaveCount(11);
  await page.keyboard.press('Control+Shift+z');
  await expect(page.locator('.person-node')).toHaveCount(12);
  await page.reload();
  await expect(page.locator('.person-node')).toHaveCount(12);
  await selectPerson(page, 'Огњен Петронић');
  await expect(inspector.locator('.relation-row')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('links an existing person and rejects an ancestry cycle without changing records', async ({ page }) => {
  await selectPerson(page, 'Никола Петронић');
  await page.getByRole('button', { name: 'Додај сродника', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: /^Родитељ/ }).click();
  await page.getByRole('button', { name: 'Постојећа особа', exact: true }).click();
  await page.getByRole('combobox', { name: 'Особа за повезивање' }).selectOption('luka');
  await page.getByRole('button', { name: /Прегледај везу/ }).click();
  await page.getByRole('button', { name: 'Потврди и сачувај' }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('круг предака');
  await page.getByRole('button', { name: 'Назад', exact: true }).click();
  await page.getByRole('textbox', { name: 'Претражи постојеће особе' }).fill('Даница');
  await page.getByRole('combobox', { name: 'Особа за повезивање' }).selectOption('danica');
  await page.getByRole('button', { name: /Прегледај везу/ }).click();
  await page.getByRole('button', { name: 'Потврди и сачувај' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.locator('.person-node')).toHaveCount(11);
  await selectPerson(page, 'Даница Илић');
  await expect(page.locator('.inspector .relation-row')).toContainText('Никола Петронић');
});

test('creates a disconnected person through the person picker without requiring biographical fields', async ({ page }) => {
  await page.getByRole('button', { name: 'Претражи породичну збирку' }).click();
  await page.getByRole('button', { name: 'Додај особу', exact: true }).click();
  await page.getByRole('textbox', { name: 'Име и презиме', exact: true }).fill('Зора Петронић');
  await page.getByRole('button', { name: 'Сачувај измене' }).click();
  await expect(page.locator('.person-node')).toHaveCount(12);
  await expect(page.getByRole('complementary').getByRole('heading', { name: 'Зора Петронић' })).toBeVisible();
  await expect(page.getByTestId('graph-canvas')).toHaveAttribute('data-focus-person', 'nikola');
  await page.reload();
  await expect(page.locator('.person-node')).toHaveCount(12);
});

test('a stale window can reload without losing its draft or overwriting unrelated newer fields', async ({ page, context }) => {
  const other = await context.newPage();
  await other.goto('/');
  await expect(other.locator('.person-node')).toHaveCount(11);
  await selectPerson(other, 'Никола Петронић');
  await other.getByRole('button', { name: 'Измени особу', exact: true }).click();
  await other.getByRole('textbox', { name: 'Надимак' }).fill('Унос из другог прозора');
  await selectPerson(page, 'Никола Петронић');
  await page.getByRole('button', { name: 'Измени особу', exact: true }).click();
  await page.getByRole('textbox', { name: 'Име и презиме', exact: true }).fill('Никола Петронић · новије име');
  await page.getByRole('button', { name: 'Сачувај измене' }).click();
  await other.getByRole('button', { name: 'Сачувај измене' }).click();
  await expect(other.getByRole('dialog').getByRole('alert')).toContainText('другом прозору');
  await expect(other.getByRole('textbox', { name: 'Надимак' })).toHaveValue('Унос из другог прозора');
  await other.getByRole('button', { name: 'Освежи збирку и задржи унос' }).click();
  await other.getByRole('button', { name: 'Сачувај измене' }).click();
  await expect(other.getByRole('dialog')).not.toBeVisible();
  await expect(other.getByRole('complementary').getByRole('heading', { name: 'Никола Петронић · новије име' })).toBeVisible();
  await expect(other.locator('.nickname')).toHaveText('„Унос из другог прозора“');
  await other.close();
});

test('unavailable browser storage blocks editing and never pretends to save a demo', async ({ browser }) => {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    const original = IDBFactory.prototype.open;
    IDBFactory.prototype.open = function (...args) {
      if (args[0] === 'BelaPcela') throw new DOMException('Storage denied', 'SecurityError');
      return original.apply(this, args);
    };
  });
  const blocked = await context.newPage();
  await blocked.goto('http://127.0.0.1:5173');
  await expect(blocked.getByRole('alert')).toContainText('Локална збирка није доступна');
  await expect(blocked.locator('.person-node')).toHaveCount(0);
  await expect(blocked.getByRole('button', { name: 'Покушај поново' })).toBeVisible();
  await context.close();
});
