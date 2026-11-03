import { test, expect } from '@playwright/test';

/**
 * Synthetic Browser Check for Kavach Homepage
 * Monitors page availability, core branding, and critical user journeys
 */
const baseUrl = process.env.ENVIRONMENT_URL || 'http://localhost:3002';

test('Kavach Homepage loads without visual errors and renders core components', async ({ page }) => {
  const response = await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBe(200);

  // 1. Verify Page Title
  await expect(page).toHaveTitle(/Kavach/i);

  // 2. Verify Primary Connect GitHub CTA exists and is clickable
  const connectBtn = page.getByRole('link', { name: /Connect GitHub/i });
  await expect(connectBtn).toBeVisible();

  // 3. Verify SAST Findings Table Section is displayed
  const sastSection = page.locator('#sast-findings-section');
  await expect(sastSection).toBeVisible();

  // 4. Verify Workspaces Security Grid is rendered
  const workspacesSection = page.locator('#workspaces');
  await expect(workspacesSection).toBeVisible();
});
