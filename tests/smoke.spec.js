const { test, expect } = require('@playwright/test');

async function openApp(page) {
  await page.addInitScript(() => {
    localStorage.setItem('scicanvas-guided-tour-v2', 'complete');
    localStorage.setItem('scicanvas-motion-v1', 'off');
  });
  await page.goto('/');
  await expect(page.locator('#canvas')).toBeVisible();
  await page.waitForTimeout(300);
}

test('core editor controls remain clickable and persist content', async ({ page }) => {
  await openApp(page);
  await page.locator('#addTextButton').click();
  await expect(page.locator('#objectLayer .canvas-object')).toHaveCount(1);
  await page.waitForTimeout(900);
  await page.reload();
  await expect(page.locator('#objectLayer .canvas-object')).toHaveCount(1);
  await expect(page.locator('#exportButton')).toBeVisible();
  await page.locator('#exportButton').click();
  await expect(page.locator('#exportMenu')).toHaveClass(/open/);
  await expect(page.locator('#exportMenu')).toContainText('PowerPoint');
});

test('all Pro Tools workspaces are enabled', async ({ page }) => {
  await openApp(page);
  await page.locator('#proToolsButton').click();
  await expect(page.locator('#proToolsDrawer')).toHaveClass(/open/);
  for (const id of ['arrange','data','annotate','components','review','publish','office','workspace','scienceplus']) {
    const card = page.locator(`[data-workspace="${id}"]`);
    await expect(card).toBeVisible();
    await expect(card).toBeEnabled();
  }
  await page.locator('[data-workspace="office"]').click();
  await expect(page.locator('#officeBridgeDrawer')).toHaveClass(/open/);
});

test('command palette and workspace recovery open without hiding export', async ({ page }) => {
  await openApp(page);
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K');
  await expect(page.locator('#scCommandPalette')).toHaveClass(/open/);
  await page.locator('#scCommandPalette input').fill('move objects');
  await page.keyboard.press('Enter');
  await expect(page.locator('#workspaceRecoveryDrawer')).toHaveClass(/open/);
  await expect(page.locator('#exportButton')).toBeVisible();
});

test('presentation keeps a created object visible and restores editing page', async ({ page }) => {
  await openApp(page);
  await page.locator('#addShapeButton').click();
  await page.locator('#proToolsButton').click();
  await page.locator('[data-workspace="publish"]').click();
  await page.locator('#startPresentation').click();
  await expect(page.locator('#presentationMode')).toHaveClass(/open/);
  await expect(page.locator('#presentationStage .canvas-object')).toHaveCount(1);
  await page.locator('#presentationClose').click();
  await expect(page.locator('#presentationMode')).not.toHaveClass(/open/);
  await expect(page.locator('#objectLayer .canvas-object')).toHaveCount(1);
});

test('mobile header, Pro Tools and horizontal workspace remain usable', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile-only interaction check');
  await openApp(page);
  await expect(page.locator('#exportButton')).toBeVisible();
  await expect(page.locator('#proToolsButton')).toBeVisible();
  await page.locator('#proToolsButton').click();
  const office = page.locator('[data-workspace="office"]');
  await expect(office).toBeEnabled();
  await page.locator('[data-workspace="workspace"]').click();
  await expect(page.locator('#workspaceRecoveryDrawer')).toHaveClass(/open/);
  const stage = page.locator('#canvasStage');
  await expect(stage).toBeVisible();
  const overflow = await stage.evaluate(node => ({ width: node.scrollWidth, client: node.clientWidth }));
  expect(overflow.width).toBeGreaterThanOrEqual(overflow.client);
});
