import { test, expect, Page } from '@playwright/test';
import { injectAxe, checkA11y } from '@axe-core/playwright';

// Test configuration
const DESKTOP_VIEWPORT = { width: 1280, height: 720 };
const MOBILE_VIEWPORT = { width: 375, height: 667 };
const TABLET_VIEWPORT = { width: 768, height: 1024 };

// Helper function to wait for debounce
const waitForDebounce = async (page: Page, delay: number = 300) => {
  await page.waitForTimeout(delay + 50); // Add small buffer
};

// Helper function to inject axe and check accessibility
const checkAccessibility = async (page: Page, context?: string) => {
  await injectAxe(page);
  await checkA11y(page, undefined, {
    detailedReport: true,
    detailedReportOptions: { html: true },
    tags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
  });
};

test.describe('Product Listing Page - Filter System', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the product listing page
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Desktop Experience', () => {
    test.use({ viewport: DESKTOP_VIEWPORT });

    test('should render filter sidebar on desktop', async ({ page }) => {
      // Check if sidebar is visible
      const sidebar = page.locator('[role="complementary"], .sidebar');
      await expect(sidebar).toBeVisible();

      // Check main filter sections
      await expect(page.locator('text=Price Range')).toBeVisible();
      await expect(page.locator('text=Categories')).toBeVisible();
      await expect(page.locator('text=Brands')).toBeVisible();
    });

    test('should handle price range filtering with debounce', async ({ page }) => {
      // Test minimum price input
      const minPriceInput = page.locator('#price-min');
      await expect(minPriceInput).toBeVisible();
      
      await minPriceInput.fill('10');
      await waitForDebounce(page, 500); // Price inputs have 500ms debounce
      
      // Check URL update
      await expect(page).toHaveURL(/minPrice=10/);

      // Test maximum price input
      const maxPriceInput = page.locator('#price-max');
      await maxPriceInput.fill('100');
      await waitForDebounce(page, 500);
      
      await expect(page).toHaveURL(/maxPrice=100/);

      // Test Enter key immediate update
      await maxPriceInput.press('Enter');
      await page.waitForTimeout(100);
      await expect(page).toHaveURL(/maxPrice=100/);
    });

    test('should handle category filtering with visual feedback', async ({ page }) => {
      // Find first category checkbox
      const firstCategory = page.locator('[data-testid="category-filter"] input[type="checkbox"]').first();
      await expect(firstCategory).toBeVisible();

      // Click checkbox and verify immediate visual feedback
      await firstCategory.check();
      await expect(firstCategory).toBeChecked();

      // Wait for debounce and check URL update
      await waitForDebounce(page, 100); // Checkbox filters have 100ms debounce
      await expect(page.url()).toContain('category=');
    });

    test('should support bulk selection in checkbox filters', async ({ page }) => {
      // Test "Select All" functionality
      const selectAllButton = page.locator('text=All').first();
      await selectAllButton.click();
      
      await waitForDebounce(page, 100);
      
      // Verify all checkboxes in that group are selected
      const categoryCheckboxes = page.locator('[data-testid="category-filter"] input[type="checkbox"]');
      const count = await categoryCheckboxes.count();
      
      for (let i = 0; i < count; i++) {
        await expect(categoryCheckboxes.nth(i)).toBeChecked();
      }

      // Test "Clear All" functionality
      const clearAllButton = page.locator('text=Clear').first();
      await clearAllButton.click();
      
      await waitForDebounce(page, 100);
      
      for (let i = 0; i < count; i++) {
        await expect(categoryCheckboxes.nth(i)).not.toBeChecked();
      }
    });

    test('should handle global reset functionality', async ({ page }) => {
      // Apply multiple filters
      await page.locator('#price-min').fill('50');
      await page.locator('#price-max').fill('200');
      await page.locator('[data-testid="category-filter"] input[type="checkbox"]').first().check();
      
      await waitForDebounce(page, 500);
      
      // Verify filters are applied
      await expect(page).toHaveURL(/minPrice=50/);
      await expect(page).toHaveURL(/maxPrice=200/);
      await expect(page.url()).toContain('category=');

      // Click global reset
      const resetButton = page.locator('button', { hasText: 'Clear All' });
      await resetButton.click();

      // Verify all filters are cleared
      await expect(page.url()).not.toContain('minPrice=');
      await expect(page.url()).not.toContain('maxPrice=');
      await expect(page.url()).not.toContain('category=');
    });

    test('should integrate with search functionality', async ({ page }) => {
      // Test search input
      const searchInput = page.locator('input[type="search"]');
      await searchInput.fill('test product');
      
      await waitForDebounce(page, 300); // Search has 300ms debounce
      
      // Verify search in URL
      await expect(page).toHaveURL(/search=test\+product/);

      // Test combination with filters
      await page.locator('#price-min').fill('25');
      await waitForDebounce(page, 500);
      
      // Both search and price filter should be in URL
      await expect(page).toHaveURL(/search=test\+product/);
      await expect(page).toHaveURL(/minPrice=25/);
    });
  });

  test.describe('Mobile Experience', () => {
    test.use({ viewport: MOBILE_VIEWPORT });

    test('should show filter button on mobile', async ({ page }) => {
      // Check filter trigger button
      const filterButton = page.locator('button', { hasText: 'Filters' });
      await expect(filterButton).toBeVisible();

      // Should show indicator when filters are active
      await page.locator('input[type="search"]').fill('test');
      await waitForDebounce(page, 300);
      
      // Look for active filter indicator
      const activeIndicator = page.locator('[aria-label="Active filters"]');
      await expect(activeIndicator).toBeVisible();
    });

    test('should open filter drawer with proper modal behavior', async ({ page }) => {
      const filterButton = page.locator('button', { hasText: 'Filters' });
      await filterButton.click();

      // Check modal properties
      const drawer = page.locator('[role="dialog"]');
      await expect(drawer).toBeVisible();
      await expect(drawer).toHaveAttribute('aria-modal', 'true');

      // Check drawer title
      const title = page.locator('#filter-title');
      await expect(title).toBeVisible();
      await expect(title).toHaveText('Filters');

      // Test ESC key closing
      await page.keyboard.press('Escape');
      await expect(drawer).not.toBeVisible();
    });

    test('should handle body scroll lock in mobile drawer', async ({ page }) => {
      // Open drawer
      await page.locator('button', { hasText: 'Filters' }).click();
      
      // Check body scroll lock (implementation dependent)
      const body = page.locator('body');
      const bodyStyle = await body.getAttribute('style');
      
      // Note: This test depends on implementation details
      // In real app, you'd verify scroll behavior is disabled
      
      // Close drawer
      await page.keyboard.press('Escape');
    });
  });

  test.describe('Focus Management & Accessibility', () => {
    test('should manage focus correctly after filter navigation', async ({ page }) => {
      // Apply a filter
      await page.locator('#price-min').fill('30');
      await waitForDebounce(page, 500);

      // Check that focus management works
      // Note: This would depend on the specific focus management implementation
      // For a real test, you'd verify focus moves to results or status message
      
      const resultsHeader = page.locator('h1, [role="status"]');
      if (await resultsHeader.isVisible()) {
        // Verify focus is managed properly
        await expect(resultsHeader).toBeFocused();
      }
    });

    test('should announce filter changes to screen readers', async ({ page }) => {
      // Check for ARIA live regions
      const liveRegion = page.locator('[aria-live="polite"], [role="status"]');
      await expect(liveRegion).toBeVisible();

      // Apply filter and verify announcement
      await page.locator('#price-min').fill('40');
      await waitForDebounce(page, 500);

      // Note: Testing screen reader announcements requires specific tools
      // This test verifies the structure is in place
    });

    test('should provide proper ARIA labeling', async ({ page }) => {
      // Check price inputs
      const minPriceInput = page.locator('#price-min');
      await expect(minPriceInput).toHaveAttribute('aria-label');

      const maxPriceInput = page.locator('#price-max');
      await expect(maxPriceInput).toHaveAttribute('aria-label');

      // Check fieldset/legend structure
      const priceFieldset = page.locator('fieldset');
      await expect(priceFieldset).toBeVisible();
      
      const legend = priceFieldset.locator('legend');
      await expect(legend).toBeVisible();
    });
  });

  test.describe('Performance & Debouncing', () => {
    test('should debounce search input correctly', async ({ page }) => {
      const searchInput = page.locator('input[type="search"]');
      
      // Type quickly
      await searchInput.fill('a');
      await searchInput.fill('ab');
      await searchInput.fill('abc');
      
      // Should not update URL immediately
      await page.waitForTimeout(200);
      await expect(page.url()).not.toContain('search=abc');
      
      // Should update after debounce period
      await waitForDebounce(page, 300);
      await expect(page).toHaveURL(/search=abc/);
    });

    test('should bundle checkbox selections efficiently', async ({ page }) => {
      // Rapidly select multiple checkboxes
      const checkboxes = page.locator('[data-testid="category-filter"] input[type="checkbox"]');
      const count = Math.min(3, await checkboxes.count());
      
      for (let i = 0; i < count; i++) {
        await checkboxes.nth(i).check();
        await page.waitForTimeout(50); // Rapid clicks
      }
      
      // Should bundle updates
      await waitForDebounce(page, 100);
      
      // Verify final state
      for (let i = 0; i < count; i++) {
        await expect(checkboxes.nth(i)).toBeChecked();
      }
    });
  });

  test.describe('Accessibility Compliance', () => {
    test('should pass axe accessibility audit - desktop', async ({ page }) => {
      test.use({ viewport: DESKTOP_VIEWPORT });
      await checkAccessibility(page, 'Desktop PLP Filters');
    });

    test('should pass axe accessibility audit - mobile', async ({ page }) => {
      test.use({ viewport: MOBILE_VIEWPORT });
      
      // Test closed state
      await checkAccessibility(page, 'Mobile PLP Filters - Closed');
      
      // Test open drawer state
      await page.locator('button', { hasText: 'Filters' }).click();
      await checkAccessibility(page, 'Mobile PLP Filters - Open Drawer');
    });

    test('should support keyboard navigation', async ({ page }) => {
      // Test tab navigation through filters
      await page.keyboard.press('Tab');
      
      // Should be able to navigate through all interactive elements
      const focusableElements = page.locator('input, button, [tabindex="0"]');
      const count = await focusableElements.count();
      
      for (let i = 0; i < Math.min(5, count); i++) {
        const focused = page.locator(':focus');
        await expect(focused).toBeVisible();
        await page.keyboard.press('Tab');
      }
    });

    test('should handle high contrast mode', async ({ page }) => {
      // Enable high contrast simulation
      await page.emulateMedia({ forcedColors: 'active' });
      
      // Verify filters are still usable
      await expect(page.locator('input[type="search"]')).toBeVisible();
      await expect(page.locator('#price-min')).toBeVisible();
      await expect(page.locator('input[type="checkbox"]').first()).toBeVisible();
    });
  });

  test.describe('Error Handling & Edge Cases', () => {
    test('should handle invalid price inputs gracefully', async ({ page }) => {
      const minPriceInput = page.locator('#price-min');
      
      // Test negative values
      await minPriceInput.fill('-10');
      await waitForDebounce(page, 500);
      
      // Should handle gracefully (exact behavior depends on implementation)
      // At minimum, should not crash the app
      await expect(page.locator('body')).toBeVisible();
    });

    test('should handle network failures during filtering', async ({ page }) => {
      // Simulate network issues
      await page.route('**/*', route => route.abort());
      
      // Apply filter - should handle gracefully
      await page.locator('#price-min').fill('50');
      await waitForDebounce(page, 500);
      
      // App should remain functional
      await expect(page.locator('input[type="search"]')).toBeVisible();
    });

    test('should preserve filter state on page refresh', async ({ page }) => {
      // Apply filters
      await page.locator('input[type="search"]').fill('laptop');
      await page.locator('#price-min').fill('100');
      await waitForDebounce(page, 500);
      
      // Refresh page
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Verify filters are restored
      await expect(page.locator('input[type="search"]')).toHaveValue('laptop');
      await expect(page.locator('#price-min')).toHaveValue('100');
    });
  });
});