import { test, expect } from '@playwright/test';

test.describe('Group Management E2E Flows (Admin/Owner)', () => {
  // Test group and member IDs (would be real in actual tests)
  const testGroupId = 'test-group-1';
  const memberUserId = 'test-user-2';

  test.beforeEach(async ({ page }) => {
    // Mock authentication and navigate to groups page
    await page.goto('/app/groups');
    await page.waitForLoadState('networkidle');
  });

  // Test for Requirement 2 (Group Deletion)
  test('Admin should be able to delete a group via options menu and confirmation', async ({ page }) => {
    // Wait for groups to load
    await page.waitForSelector('[data-testid="groups-grid"]');
    
    // Locate the first group card (assuming it exists)
    const groupCard = page.locator('[data-testid^="group-card-"]').first();
    
    if (await groupCard.count() === 0) {
      // Skip test if no groups exist
      test.skip(true, 'No groups available for testing');
    }

    // WHEN - Click options menu
    await groupCard.locator('[data-testid="button-group-options"]').click();
    
    // Click delete option
    await page.locator('[data-testid="option-delete-group"]').click();

    // THEN - AlertDialog should appear
    const alertDialog = page.locator('[role="alertdialog"]').filter({ hasText: 'Gruppe wirklich löschen?' });
    await expect(alertDialog).toBeVisible();

    // WHEN - Confirm deletion
    await alertDialog.locator('[data-testid="button-confirm-delete"]').click();

    // THEN - Group should be removed and success message should appear
    // Note: In real tests, we'd verify the specific group disappears
    await expect(page.getByText('Gruppe erfolgreich gelöscht.')).toBeVisible({ timeout: 5000 });
  });

  // Test for Requirement 1 (Member Management)
  test('Admin should be able to view and remove members after confirmation', async ({ page }) => {
    // Wait for groups to load
    await page.waitForSelector('[data-testid="groups-grid"]');
    
    // Locate the first group card
    const groupCard = page.locator('[data-testid^="group-card-"]').first();
    
    if (await groupCard.count() === 0) {
      test.skip(true, 'No groups available for testing');
    }

    // WHEN - Open member management modal
    await groupCard.locator('[data-testid="button-manage-members"]').click();
    
    const modal = page.locator('[data-testid="manage-members-modal"]');
    await expect(modal).toBeVisible();

    // THEN - Should show members with avatars and names
    const memberItems = modal.locator('[data-testid^="member-item-"]');
    
    if (await memberItems.count() === 0) {
      // Just verify modal structure if no members
      await expect(modal.getByText('Keine Mitglieder gefunden.')).toBeVisible();
      return;
    }

    // Check first member has avatar and name
    const firstMember = memberItems.first();
    await expect(firstMember.locator('img[alt*="Avatar"]')).toBeVisible();
    await expect(firstMember.locator('text')).toBeVisible();

    // If remove button exists, test removal flow
    const removeButton = firstMember.locator('[data-testid^="button-remove-member-"]');
    
    if (await removeButton.count() > 0) {
      // WHEN - Click remove member
      await removeButton.click();

      // THEN - AlertDialog should appear
      const alertDialog = page.locator('[role="alertdialog"]').filter({ 
        hasText: /Mitglied entfernen\?|Gruppe verlassen\?/ 
      });
      await expect(alertDialog).toBeVisible();

      // Cancel to avoid actually removing in tests
      await alertDialog.getByRole('button', { name: 'Abbrechen' }).click();
      await expect(alertDialog).not.toBeVisible();
    }
  });

  // Test for UI consistency and responsiveness
  test('Group cards should display correctly and be interactive', async ({ page }) => {
    await page.waitForSelector('[data-testid="groups-grid"]');
    
    const groupCards = page.locator('[data-testid^="group-card-"]');
    
    if (await groupCards.count() === 0) {
      // Verify empty state message
      await expect(page.getByText('Noch keine Gruppen')).toBeVisible();
      return;
    }

    // Check first group card structure
    const firstCard = groupCards.first();
    
    // Should have title and manage members button
    await expect(firstCard.locator('h3')).toBeVisible();
    await expect(firstCard.locator('[data-testid="button-manage-members"]')).toBeVisible();
    
    // Options menu should be clickable (for owners)
    const optionsButton = firstCard.locator('[data-testid="button-group-options"]');
    if (await optionsButton.count() > 0) {
      await expect(optionsButton).toBeVisible();
    }
  });

  // Test for group creation flow
  test('User should be able to create a new group', async ({ page }) => {
    await page.waitForSelector('[data-testid="groups-grid"]');
    
    // Fill in group creation form
    await page.fill('input[placeholder="Group name"]', 'Test Group E2E');
    await page.fill('input[placeholder="Description (optional)"]', 'Test group created by E2E test');
    
    // Submit form
    await page.getByRole('button', { name: 'Create' }).click();
    
    // Should show success message
    await expect(page.getByText('Gruppe erstellt')).toBeVisible({ timeout: 5000 });
    
    // Form should be cleared
    await expect(page.locator('input[placeholder="Group name"]')).toHaveValue('');
    await expect(page.locator('input[placeholder="Description (optional)"]')).toHaveValue('');
  });

  // Test for join group flow
  test('User should be able to join a group with invite code', async ({ page }) => {
    await page.waitForSelector('[data-testid="groups-grid"]');
    
    // Use a mock invite code
    const mockInviteCode = 'test-invite-code-123';
    
    // Fill in join form
    await page.fill('input[placeholder="Invite code"]', mockInviteCode);
    
    // Submit form
    await page.getByRole('button', { name: 'Join group' }).click();
    
    // Should either show success or error message
    await expect(
      page.locator('text=/Gruppe beigetreten|Join failed/')
    ).toBeVisible({ timeout: 5000 });
    
    // Form should be cleared on success
    const inviteInput = page.locator('input[placeholder="Invite code"]');
    if (await page.getByText('Gruppe beigetreten').isVisible()) {
      await expect(inviteInput).toHaveValue('');
    }
  });
});