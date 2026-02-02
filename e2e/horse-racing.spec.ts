import { test, expect } from '@playwright/test';

test.describe('Horse Racing Game', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display initial UI elements', async ({ page }) => {
    await expect(page.getByText('Horse Racing')).toBeVisible();
    await expect(page.getByTestId('generate-btn')).toBeVisible();
    await expect(page.getByTestId('start-pause-btn')).toBeVisible();
  });

  test('should generate program when clicking GENERATE PROGRAM', async ({ page }) => {
    await page.getByTestId('generate-btn').click();

    await expect(page.getByTestId('horse-list')).toBeVisible();
    await expect(page.getByTestId('results-panel')).toBeVisible();
  });

  test('should show 20 horses after generating program', async ({ page }) => {
    await page.getByTestId('generate-btn').click();

    const horseRows = page.getByTestId('horse-row');
    await expect(horseRows).toHaveCount(20);
  });

  test('should show 6 race laps in results', async ({ page }) => {
    await page.getByTestId('generate-btn').click();

    for (let i = 1; i <= 6; i++) {
      await expect(page.getByTestId(`lap-header-${i}`)).toBeVisible();
    }
  });

  test('should start race when clicking START', async ({ page }) => {
    await page.getByTestId('generate-btn').click();
    await page.getByTestId('start-pause-btn').click();

    await expect(page.getByTestId('start-pause-btn')).toHaveText('PAUSE');
  });

  test('should pause race when clicking PAUSE', async ({ page }) => {
    await page.getByTestId('generate-btn').click();
    await page.getByTestId('start-pause-btn').click();
    await page.getByTestId('start-pause-btn').click();

    await expect(page.getByTestId('start-pause-btn')).toHaveText('START');
  });

  test('should move horses during race', async ({ page }) => {
    await page.getByTestId('generate-btn').click();
    await page.getByTestId('start-pause-btn').click();

    await page.waitForTimeout(500);

    const firstHorse = page.getByTestId('race-horse').first();
    const style = await firstHorse.getAttribute('style');

    expect(style).toContain('left:');
    expect(style).not.toContain('left: 0%');
  });

  test('should populate results as horses finish', async ({ page }) => {
    await page.getByTestId('generate-btn').click();
    await page.getByTestId('start-pause-btn').click();

    await page.waitForTimeout(3000);

    const firstResult = await page.getByTestId('result-name-1-1').textContent();

    expect(firstResult).not.toBe('-');
  });
});
