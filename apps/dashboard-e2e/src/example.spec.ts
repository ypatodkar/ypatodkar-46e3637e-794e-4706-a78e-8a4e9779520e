import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');

  // Unauthenticated users are redirected to login (`/` → dashboard → login).
  expect(await page.locator('h1').innerText()).toContain('Task management');
});
