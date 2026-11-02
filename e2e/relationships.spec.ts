import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const row = (page: Page, name: string) => page.locator('.profile-page .relations-section .relation-list-item').filter({ hasText: name });
const editRow = (page: Page, name: string) => row(page, name).getByRole('button', { name: /^Измени везу:/ }).click();
const saveReview = async (page: Page) => {
  await page.getByRole('button', { name: 'Прегледај измене', exact: true }).click();
  await page.getByRole('button', { name: 'Потврди и сачувај везу' }).click(); await expect(page.getByRole('dialog')).not.toBeVisible();
};

test('edits parentage with cancel, explicit review, undo/redo and a stable tree viewport', async ({ page }) => {
  test.setTimeout(30000);
  await page.goto('/'); await expect(page.locator('.person-node')).toHaveCount(11);
  const canvas = page.getByTestId('graph-canvas'); await expect.poll(() => canvas.getAttribute('data-viewport')).not.toBe('0.000,0.000,0.720');
  await page.keyboard.press('Control+k'); await page.getByRole('textbox', { name: 'Претражи особе' }).fill('Лука Петронић');
  await page.getByRole('dialog').getByRole('button', { name: /Лука Петронић/ }).click();
  const view = await canvas.getAttribute('data-viewport'); const focus = await canvas.getAttribute('data-focus-person');
  await page.getByRole('button', { name: 'Отвори профил', exact: true }).click();
  await editRow(page, 'Никола Петронић'); await page.getByLabel('Врста родитељства').selectOption('adoptive'); await page.getByRole('button', { name: 'Прегледај измене', exact: true }).click();
  await page.keyboard.press('Escape'); await expect(row(page, 'Никола Петронић')).not.toContainText('усвојење');
  await editRow(page, 'Никола Петронић'); await page.getByLabel('Врста родитељства').selectOption('adoptive'); await saveReview(page);
  await expect(row(page, 'Никола Петронић')).toContainText('усвојење'); await expect(row(page, 'Ана Јовановић')).not.toContainText('усвојење');
  await page.getByRole('button', { name: 'Назад на стабло' }).click(); await expect(canvas).toHaveAttribute('data-viewport', view!); await expect(canvas).toHaveAttribute('data-focus-person', focus!);
  await page.keyboard.press('Control+z'); await page.getByRole('button', { name: 'Отвори профил', exact: true }).click(); await expect(row(page, 'Никола Петронић')).not.toContainText('усвојење');
  await page.keyboard.press('Control+Shift+z'); await expect(row(page, 'Никола Петронић')).toContainText('усвојење');
  await page.reload(); await expect(row(page, 'Никола Петронић')).toContainText('усвојење');
  await editRow(page, 'Никола Петронић'); await page.getByRole('combobox', { name: 'Родитељ', exact: true }).selectOption('vera'); await saveReview(page);
  await expect(row(page, 'Вера Петронић')).toContainText('усвојење'); await expect(row(page, 'Никола Петронић')).toHaveCount(0); await expect(row(page, 'Ана Јовановић')).toBeVisible();
  await page.reload(); await expect(row(page, 'Вера Петронић')).toBeVisible();
});

test('deletes one parent-child record from a family junction and restores it with undo', async ({ page }, testInfo) => {
  test.setTimeout(30000);
  await page.goto('/'); await expect(page.locator('.person-node')).toHaveCount(11);
  await page.getByRole('button', { name: 'Укључи тамну тему' }).click();
  await page.getByRole('button', { name: /^Породична веза: Вера Петронић\./ }).click();
  const inspector = page.getByRole('complementary', { name: 'Подаци о породичној вези' });
  await inspector.getByRole('button', { name: /^Обриши везу:/ }).click(); await expect(page.getByRole('button', { name: 'Потврди брисање везе' })).toBeDisabled();
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('delete-relationship.png'), fullPage: true });
  await page.keyboard.press('Escape'); await expect(inspector).toBeVisible();
  await inspector.getByRole('button', { name: /^Обриши везу:/ }).click(); await page.getByRole('checkbox', { name: 'Разумем да бришем само ову везу.' }).check(); await page.getByRole('button', { name: 'Потврди брисање везе' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible(); await expect(page.locator('.person-node')).toHaveCount(11);
  await expect(page.locator('.unconnected-note').getByRole('button', { name: 'Ива Петронић', exact: true })).toBeVisible();
  await expect(page.getByTestId('graph-canvas')).toHaveAttribute('data-focus-person', 'nikola');
  await expect(page.getByRole('complementary', { name: 'Подаци о изабраној особи' })).toBeVisible();
  await page.keyboard.press('Control+z'); await expect(inspector).toBeVisible(); await expect(page.locator('.unconnected-note').getByRole('button', { name: 'Ива Петронић', exact: true })).toHaveCount(0);
  await page.keyboard.press('Control+Shift+z'); await expect(page.locator('.unconnected-note').getByRole('button', { name: 'Ива Петронић', exact: true })).toBeVisible();
  await page.reload(); await expect(page.locator('.person-node')).toHaveCount(11); await expect(page.locator('.unconnected-note').getByRole('button', { name: 'Ива Петронић', exact: true })).toBeVisible();
});

test('edits partnerships and clears their year without changing recorded parentage', async ({ page }) => {
  await page.goto('/#/person/nikola'); await editRow(page, 'Ана Јовановић');
  await page.getByLabel('Врста партнерске везе').selectOption('unspecified'); await page.getByLabel('Почетна година (необавезно)').fill('0'); await saveReview(page);
  await expect(row(page, 'Ана Јовановић')).toContainText('Забележена веза'); await expect(row(page, 'Лука Петронић')).toBeVisible(); await expect(row(page, 'Сара Петронић')).toContainText('усвојење');
  await page.getByRole('button', { name: 'Назад на стабло' }).click(); await page.getByRole('button', { name: 'Породична веза: Ана Јовановић и Никола Петронић', exact: true }).click();
  const record = page.getByRole('complementary', { name: 'Подаци о породичној вези' }).locator('.relationship-record').filter({ hasText: '↔' });
  await expect(record).toContainText('од 0.'); await record.getByRole('button', { name: /^Измени везу:/ }).click();
  await page.getByLabel('Почетна година (необавезно)').fill(''); await saveReview(page); await expect(record).not.toContainText('од 0.');
  await page.reload(); await page.getByRole('button', { name: 'Породична веза: Ана Јовановић и Никола Петронић', exact: true }).click(); await expect(record).toContainText('Забележена веза'); await expect(record).not.toContainText('од ');
});

test('edits a direct kinship assertion and opens its deletion by keyboard on the graph edge', async ({ page }) => {
  await page.goto('/#/person/danica'); await page.getByRole('button', { name: 'Додај сродника', exact: true }).click(); await page.getByRole('dialog').getByRole('button', { name: /^Брат \/ сестра/ }).click();
  await page.getByRole('button', { name: 'Постојећа особа', exact: true }).click(); await page.getByLabel('Особа за повезивање').selectOption('vera');
  await page.getByRole('button', { name: 'Прегледај везу' }).click(); await page.getByRole('button', { name: 'Потврди и сачувај', exact: true }).click();
  await editRow(page, 'Вера Петронић'); await page.getByRole('combobox', { name: 'Друга особа', exact: true }).selectOption('ana'); await page.getByLabel('Назив сродства').fill('Рођаке'); await saveReview(page);
  await expect(row(page, 'Ана Јовановић')).toContainText('Рођаке'); await expect(row(page, 'Вера Петронић')).toHaveCount(0);
  await page.getByRole('button', { name: 'Назад на стабло' }).click(); await page.getByRole('button', { name: 'Рођаке', exact: true }).press('Enter');
  await expect(page.getByRole('dialog')).toContainText('Даница Илић ↔ Ана Јовановић'); await page.getByRole('button', { name: 'Обриши везу', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Разумем да бришем само ову везу.' }).check(); await page.getByRole('button', { name: 'Потврди брисање везе' }).click(); await expect(page.getByRole('button', { name: 'Рођаке', exact: true })).toHaveCount(0);
  await expect(page.locator('.person-node')).toHaveCount(11); await page.keyboard.press('Control+z'); await expect(page.getByRole('button', { name: 'Рођаке', exact: true })).toBeVisible();
});

test('requires a fresh delete acknowledgement after another window edits the relationship', async ({ page, context }) => {
  test.setTimeout(30000);
  await page.goto('/#/person/luka'); await row(page, 'Никола Петронић').getByRole('button', { name: /^Обриши везу:/ }).click(); await page.getByRole('checkbox').check();
  const other = await context.newPage(); await other.goto('/#/person/luka'); await editRow(other, 'Никола Петронић'); await other.getByLabel('Врста родитељства').selectOption('adoptive'); await saveReview(other);
  await page.getByRole('button', { name: 'Потврди брисање везе' }).click(); await expect(page.getByRole('dialog').getByRole('alert')).toContainText('другом прозору');
  await page.getByRole('button', { name: 'Освежи збирку и задржи унос' }).click(); await expect(page.getByRole('checkbox')).not.toBeChecked(); await expect(page.getByRole('button', { name: 'Потврди брисање везе' })).toBeDisabled(); await expect(page.getByRole('dialog')).toContainText('Усвојитељско родитељство');
  await page.getByRole('checkbox').check(); await page.getByRole('button', { name: 'Потврди брисање везе' }).click(); await expect(row(page, 'Никола Петронић')).toHaveCount(0);
  await page.keyboard.press('Control+z'); await expect(row(page, 'Никола Петронић')).toContainText('усвојење');
});

test('invalid relationship corrections retain the draft and leave the archive unchanged', async ({ page }) => {
  await page.goto('/#/person/luka'); await editRow(page, 'Никола Петронић'); await page.getByRole('combobox', { name: 'Дете', exact: true }).selectOption('jovan');
  await page.getByRole('button', { name: 'Прегледај измене', exact: true }).click(); await expect(page.getByRole('alert')).toContainText('круг предака'); await expect(page.getByRole('combobox', { name: 'Дете', exact: true })).toHaveValue('jovan');
  await page.getByRole('combobox', { name: 'Дете', exact: true }).selectOption('luka'); await page.getByRole('combobox', { name: 'Родитељ', exact: true }).selectOption('ana'); await page.getByRole('button', { name: 'Прегледај измене', exact: true }).click(); await expect(page.getByRole('alert')).toContainText('већ забележено');
  await page.keyboard.press('Escape'); await expect(row(page, 'Никола Петронић')).toBeVisible(); await expect(row(page, 'Ана Јовановић')).toBeVisible(); await page.reload(); await expect(row(page, 'Никола Петронић')).toBeVisible();
});
