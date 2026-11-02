import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('tree, settings and backup controls pass automated accessibility checks in both themes', async ({ page }, testInfo) => {
  test.setTimeout(60000);
  await page.goto('/'); await expect(page.locator('.person-node')).toHaveCount(11);
  for (const theme of ['light', 'dark']) {
    if (theme === 'dark') await page.getByRole('button', { name: 'Укључи тамну тему' }).click();
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await page.getByRole('button', { name: 'Подешавања', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Подешавања', exact: true })).toBeVisible();
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await page.getByRole('button', { name: 'Направи резервну копију', exact: true }).click(); await expect(page.getByRole('button', { name: 'Направи ZIP резервну копију' })).toBeFocused();
    await page.keyboard.press('Shift+Tab'); await expect(page.getByRole('button', { name: 'Затвори дијалог' })).toBeFocused();
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await page.keyboard.press('Escape'); await expect(page.getByRole('button', { name: 'Направи резервну копију', exact: true })).toBeFocused();
    await page.screenshot({ path: testInfo.outputPath(`settings-${theme}.png`), fullPage: true });
    await page.getByRole('button', { name: 'Стабло', exact: true }).click();
  }
});
