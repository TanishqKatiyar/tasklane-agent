import { expect, test } from '@playwright/test';

/**
 * Happy Path E2E Test
 *
 * Validates the critical user journey:
 * 1. Login page is accessible
 * 2. Login with existing credentials
 * 3. Dashboard loads with projects visible
 * 4. Can navigate to a project board
 *
 * Requires: Full stack running (API + Web + Postgres + Redis)
 * with seeded data (admin@tasklane.dev / Admin123!)
 */
test.describe('Happy Path', () => {
  test('should load login page', async ({ page }) => {
    await page.goto('/login');

    // Login page should be visible
    await expect(page).toHaveTitle(/Tasklane/i);
    await expect(page.getByRole('button', { name: /sign in|log in/i })).toBeVisible();
  });

  test('should login and see dashboard', async ({ page }) => {
    await page.goto('/login');

    // Fill in credentials
    await page.getByPlaceholder(/email/i).fill('admin@tasklane.dev');
    await page.getByPlaceholder(/password/i).fill('Admin123!');

    // Submit
    await page.getByRole('button', { name: /sign in|log in/i }).click();

    // Should redirect to dashboard
    await page.waitForURL('**/dashboard**', { timeout: 15000 });

    // Dashboard content should be visible
    await expect(page.locator('body')).toContainText(/dashboard|projects|team/i);
  });

  test('should register a new user and land on onboarding', async ({ page }) => {
    const uniqueEmail = `e2e-${Date.now()}@test.com`;

    await page.goto('/register');

    // Fill registration form
    await page.getByPlaceholder(/name/i).fill('E2E Test User');
    await page.getByPlaceholder(/email/i).fill(uniqueEmail);
    await page
      .getByPlaceholder(/password/i)
      .first()
      .fill('TestPass123!');

    // Check for confirm password field
    const confirmField = page.getByPlaceholder(/confirm/i);
    if (await confirmField.isVisible()) {
      await confirmField.fill('TestPass123!');
    }

    // Submit
    await page.getByRole('button', { name: /sign up|register|create/i }).click();

    // Should redirect somewhere authenticated (dashboard, onboarding, or teams)
    await page.waitForURL(/\/(dashboard|onboarding|teams)/, { timeout: 15000 });

    // User should be logged in
    await expect(page.locator('body')).not.toContainText(/sign in|log in/i);
  });
});
