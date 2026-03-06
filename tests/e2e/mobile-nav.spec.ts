import { expect, test } from '@playwright/test';

test('mobile nav shows admin links under "Ещё" for admin', async ({ page }) => {
  const adminLogin = process.env.E2E_ADMIN_LOGIN ?? 'admin';
  const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? 'ChangeMe123!';
  const adminNewPassword = process.env.E2E_ADMIN_NEW_PASSWORD ?? 'NewPass12345!';

  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto('/stock');
  await page.getByTestId('login-login').fill(adminLogin);
  await page.getByTestId('login-password').fill(adminPassword);
  await page.getByTestId('login-submit').click();
  await page.waitForTimeout(500);

  if (/\/login$/.test(page.url())) {
    await page.getByTestId('login-password').fill(adminNewPassword);
    await page.getByTestId('login-submit').click();
    await page.waitForTimeout(500);
  }

  const isChangePassword = /\/change-password$/.test(page.url());

  if (isChangePassword) {
    await page.getByTestId('cp-current').fill(adminPassword);
    await page.getByTestId('cp-new').fill(adminNewPassword);
    await page.getByTestId('cp-confirm').fill(adminNewPassword);
    await page.getByTestId('cp-submit').click();
    await expect.poll(async () => page.url(), { timeout: 20_000 }).toMatch(/\/(stock|operation)$/);
  }

  await page.goto('/stock');
  await page.getByRole('button', { name: 'Ещё' }).click();

  await expect(page.getByRole('link', { name: 'Профиль' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Номенклатура' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Отчёты' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Админка' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Пользователи' })).toBeVisible();
});
