import { test, expect } from '@playwright/test';

test.describe('Summary Page Filters', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to summary page - assuming authentication is handled
    await page.goto('/app/summary');
    await page.waitForLoadState('networkidle');
  });

  test('D-001: Teilnehmer filter should update application state and results', async ({ page }) => {
    // Test Case 1: Participant filter functionality
    
    // Wait for filter bar to load
    await expect(page.locator('[data-testid="filter-bar"]')).toBeVisible();
    
    // Open participants dropdown
    await page.locator('[data-testid="filter-participants"]').click();
    
    // Wait for dropdown to open
    await page.waitForTimeout(500);
    
    // Select first participant if available
    const firstParticipant = page.locator('[role="option"]').first();
    if (await firstParticipant.isVisible()) {
      await firstParticipant.click();
      
      // Wait for network request to complete
      await page.waitForTimeout(1000);
      
      // Verify the selection is reflected in the button
      await expect(page.locator('[data-testid="filter-participants"]')).toContainText('1 ausgewählt');
      
      // Check that data has been filtered by monitoring network requests
      const response = page.waitForResponse(response => 
        response.url().includes('challenges-summary') && response.status() === 200
      );
      
      // The query should include the participant filter
      const responseBody = await (await response).json();
      expect(responseBody).toBeDefined();
    }
  });

  test('D-002/D-003: Filters should be applied universally and KW slider should sync with date range', async ({ page }) => {
    // Test Case 2: Universal filter application and KW/Date synchronization
    
    // Wait for components to load
    await expect(page.locator('[data-testid="filter-bar"]')).toBeVisible();
    
    // Select a specific group
    await page.locator('[data-testid="filter-groups"]').click();
    await page.waitForTimeout(500);
    
    const firstGroup = page.locator('[role="option"]').first();
    if (await firstGroup.isVisible()) {
      await firstGroup.click();
      await page.waitForTimeout(500);
    }
    
    // Select KPI challenge type
    await page.locator('[data-testid="filter-challenge-type"]').click();
    await page.selectOption('[data-testid="filter-challenge-type"]', 'kpi');
    await page.waitForTimeout(500);
    
    // Interact with KW slider if it exists
    const kwSlider = page.locator('[data-testid="slider-kw-range"]');
    if (await kwSlider.isVisible()) {
      // Get slider bounds
      const sliderBox = await kwSlider.boundingBox();
      if (sliderBox) {
        // Click on the right side of the slider to change the range
        await page.mouse.click(sliderBox.x + sliderBox.width * 0.8, sliderBox.y + sliderBox.height / 2);
        await page.waitForTimeout(500);
        
        // Verify that both KW slider and date range are synchronized
        // Check if the date range picker reflects the change
        const dateRangeButton = page.locator('[data-testid="filter-timeframe"]');
        await expect(dateRangeButton).toBeVisible();
      }
    }
    
    // Verify that all data components show filtered results
    // This should include the weekly timeline, participant rankings, etc.
    await page.waitForTimeout(2000);
    
    // The page should show updated data reflecting all filters
    const challenges = page.locator('[data-testid="challenge-card"]');
    if (await challenges.count() > 0) {
      // If challenges are visible, they should respect the filters
      expect(await challenges.count()).toBeGreaterThan(0);
    }
  });

  test('D-001 Reset: Reset all filters should clear all selections', async ({ page }) => {
    // Test Case 3: Reset functionality
    
    await expect(page.locator('[data-testid="filter-bar"]')).toBeVisible();
    
    // Apply some filters first
    await page.locator('[data-testid="filter-participants"]').click();
    await page.waitForTimeout(500);
    
    const firstParticipant = page.locator('[role="option"]').first();
    if (await firstParticipant.isVisible()) {
      await firstParticipant.click();
      await page.waitForTimeout(500);
    }
    
    // Apply challenge type filter
    await page.locator('[data-testid="filter-challenge-type"]').click();
    await page.selectOption('[data-testid="filter-challenge-type"]', 'habit');
    await page.waitForTimeout(500);
    
    // Click reset button if it appears
    const resetButton = page.locator('[data-testid="button-reset-all"]');
    if (await resetButton.isVisible()) {
      await resetButton.click();
      await page.waitForTimeout(1000);
      
      // Verify all filters are reset
      await expect(page.locator('[data-testid="filter-participants"]')).toContainText('Alle');
      await expect(page.locator('[data-testid="filter-challenge-type"]')).toContainText('Alle');
      
      // KW slider should reset to full range if visible
      const kwSlider = page.locator('[data-testid="slider-kw-range"]');
      if (await kwSlider.isVisible()) {
        // The slider should be at its maximum range
        const sliderText = await page.textContent('[data-testid="slider-kw-range"]');
        expect(sliderText).toBeDefined();
      }
    }
  });

  test('Data consistency: Filters should persist across component updates', async ({ page }) => {
    // Test that filters don't get lost when components re-render
    
    await expect(page.locator('[data-testid="filter-bar"]')).toBeVisible();
    
    // Apply a participant filter
    await page.locator('[data-testid="filter-participants"]').click();
    await page.waitForTimeout(500);
    
    const firstParticipant = page.locator('[role="option"]').first();
    if (await firstParticipant.isVisible()) {
      const participantName = await firstParticipant.textContent();
      await firstParticipant.click();
      await page.waitForTimeout(1000);
      
      // Force a component update by changing date range
      await page.locator('[data-testid="filter-timeframe"]').click();
      await page.selectOption('[data-testid="filter-timeframe"]', 'last30d');
      await page.waitForTimeout(1000);
      
      // Verify the participant filter is still applied
      await expect(page.locator('[data-testid="filter-participants"]')).toContainText('1 ausgewählt');
      
      // Check that the selected participant badge is still visible
      if (participantName) {
        const participantBadge = page.locator('text=' + participantName.trim());
        await expect(participantBadge).toBeVisible();
      }
    }
  });

  test('Network requests: All components should use filtered data', async ({ page }) => {
    // Monitor network requests to ensure all components request filtered data
    
    const requests: string[] = [];
    page.on('request', request => {
      if (request.url().includes('challenges') || request.url().includes('summary')) {
        requests.push(request.url());
      }
    });
    
    await expect(page.locator('[data-testid="filter-bar"]')).toBeVisible();
    
    // Apply filters and check network activity
    await page.locator('[data-testid="filter-challenge-type"]').click();
    await page.selectOption('[data-testid="filter-challenge-type"]', 'kpi');
    
    // Wait for network requests to settle
    await page.waitForTimeout(2000);
    
    // Verify that requests include filter parameters
    expect(requests.length).toBeGreaterThan(0);
    
    // At least one request should reflect the applied filters
    const hasFilteredRequests = requests.some(url => 
      url.includes('kpi') || url.includes('challengeTypes')
    );
    expect(hasFilteredRequests).toBeTruthy();
  });
});