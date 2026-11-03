import { expect, test } from '@playwright/test';

test('starts an empty family, adds the first person, reloads and reopens the retained example', async ({ page }) => {
  await page.goto('/#/settings');
  await page.getByRole('textbox', { name: 'Назив нове збирке' }).fill('Моја породица');
  await page.getByRole('button', { name: 'Направи празну збирку' }).click();
  await expect(page.getByRole('heading', { name: 'Почните своју породичну причу' })).toBeVisible();
  await expect(page.locator('.person-node')).toHaveCount(0);
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
});
