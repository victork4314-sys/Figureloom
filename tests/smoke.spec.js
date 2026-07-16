const { test, expect } = require('@playwright/test');

async function openApp(page) {
  await page.addInitScript(() => {
    localStorage.setItem('scicanvas-guided-tour-v2', 'complete');
    localStorage.setItem('scicanvas-guided-tour-v3', 'complete');
    localStorage.setItem('scicanvas-welcome-v1', 'complete');
    localStorage.setItem('scicanvas-user-name-v1', 'Test Scientist');
    localStorage.setItem('scicanvas-motion-v1', 'off');
  });
  await page.goto('/');
  await expect(page.locator('#canvas')).toBeVisible();
  await page.waitForTimeout(300);
}

test('first run asks for a local name and opens the passive expanded tour', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'one onboarding run is sufficient');
  await page.goto('/');
  await expect(page.locator('#scWelcome')).toHaveClass(/open/);
  await page.locator('#welcomeNameInput').fill('Ada');
  await page.locator('.welcome-primary').click();
  await expect(page.locator('#scWelcome')).not.toHaveClass(/open/);
  await expect(page.locator('#userGreetingButton')).toContainText('Ada');
  await expect(page.locator('#scicanvasTour')).toHaveClass(/open/);
  await expect(page.locator('#scicanvasTour')).toContainText('Nothing is opened, moved, selected, or scrolled');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('scicanvas-user-name-v1'))).toBe('Ada');
});

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

test('mobile canvas toolbar controls are not cropped and remain tappable', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile-only toolbar check');
  await openApp(page);
  await page.waitForTimeout(500);
  const toolbar = page.locator('.canvas-toolbar');
  await expect(toolbar).toBeVisible();
  const result = await toolbar.evaluate(node => {
    const toolbarRect = node.getBoundingClientRect();
    const controls = [...node.querySelectorAll('button,#zoomValue')].filter(control => getComputedStyle(control).display !== 'none');
    return {
      toolbarHeight: toolbarRect.height,
      controls: controls.map(control => {
        const rect = control.getBoundingClientRect();
        return { id:control.id || control.textContent.trim(), width:rect.width, height:rect.height, scrollWidth:control.scrollWidth, scrollHeight:control.scrollHeight };
      })
    };
  });
  expect(result.toolbarHeight).toBeGreaterThanOrEqual(42);
  for (const control of result.controls) {
    expect(control.width, `${control.id} width`).toBeGreaterThanOrEqual(30);
    expect(control.height, `${control.id} height`).toBeGreaterThanOrEqual(32);
    expect(control.scrollHeight, `${control.id} text height`).toBeLessThanOrEqual(control.height + 2);
  }
  await page.locator('#handToolButton').click();
  await expect(page.locator('#handToolButton')).toHaveAttribute('aria-pressed','true');
  await page.locator('#navigatorToggleButton').click();
  await expect(page.locator('#navigatorToggleButton')).toBeVisible();
});

test('refresh preserves multiple pages and their objects', async ({ page }) => {
  await openApp(page);
  await page.locator('#addTextButton').click();
  await page.locator('#addPageButton').click();
  await page.locator('#addShapeButton').click();
  await expect(page.locator('#pagesList .page-thumbnail')).toHaveCount(2);
  await page.evaluate(() => window.saveSciCanvasImmediately?.('refresh'));
  await page.reload();
  await expect(page.locator('#pagesList .page-thumbnail')).toHaveCount(2);
  await expect(page.locator('#objectLayer .canvas-object')).toHaveCount(1);
  await page.locator('#pagesList .page-thumbnail').first().click();
  await expect(page.locator('#objectLayer .canvas-object')).toHaveCount(1);
});

test('toolbar bubble can collapse and reopen', async ({ page }) => {
  await openApp(page);
  const toolbar = page.locator('.canvas-toolbar');
  await expect(page.locator('.toolbar-grip')).toBeVisible();
  await page.locator('.toolbar-collapse').click();
  await expect(toolbar).toHaveClass(/toolbar-collapsed/);
  await expect(page.locator('#zoomInButton')).toBeHidden();
  await page.locator('.toolbar-collapse').click();
  await expect(toolbar).not.toHaveClass(/toolbar-collapsed/);
  await expect(page.locator('#zoomInButton')).toBeVisible();
});

test('current page can be deleted without removing the final page', async ({ page }) => {
  await openApp(page);
  await page.locator('#addPageButton').click();
  await expect(page.locator('#pagesList .page-thumbnail')).toHaveCount(2);
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#deletePageButton').click();
  await expect(page.locator('#pagesList .page-thumbnail')).toHaveCount(1);
  await expect(page.locator('#deletePageButton')).toBeDisabled();
});