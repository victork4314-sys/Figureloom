const { test, expect } = require('@playwright/test');

async function preparePhone(page) {
  await page.addInitScript(() => {
    localStorage.setItem('scicanvas-guided-tour-v2', 'complete');
    localStorage.setItem('scicanvas-guided-tour-v3', 'complete');
    localStorage.setItem('scicanvas-welcome-v1', 'complete');
    localStorage.setItem('scicanvas-user-name-v1', 'Phone Polish Test');
    sessionStorage.setItem('figureloom-quick-start-dismissed', '1');
    localStorage.setItem('figureloom-settings-v1', JSON.stringify({
      interfaceMode:'phone',
      textSize:'standard',
      largerControls:false,
      strongFocus:false,
      reduceMotion:false,
      highContrast:false,
      underlineLinks:false,
      readableFont:false
    }));
  });
  await page.goto('/');
  await expect(page.locator('#canvas')).toBeVisible();
  await page.waitForFunction(() => Boolean(window.FigureLoomPhoneMode && window.FigureLoomPhoneCanvasFit));
  await expect(page.locator('html')).toHaveAttribute('data-figureloom-resolved-mode', 'phone');
  await page.waitForTimeout(250);
}

test('Add uses only its full-screen panel and never leaves the floating sheet bar', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'phone-only polish check');
  await preparePhone(page);
  await page.locator('.ribbon-tab[data-tab="insert"]').click();
  await expect(page.locator('#insertDrawer')).toHaveClass(/open/);
  await expect(page.locator('#figureloomPhoneSheetBar')).toBeHidden();
  await expect(page.locator('.ribbon')).not.toHaveClass(/figureloom-phone-sheet-open/);
});

test('active phone tab has no obsolete full-width underline', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'phone-only polish check');
  await preparePhone(page);
  await page.locator('.ribbon-tab[data-tab="insert"]').click();
  const border = await page.locator('.ribbon-tab[data-tab="insert"]').evaluate(node => getComputedStyle(node).borderBottomColor);
  expect(border).toBe('rgba(0, 0, 0, 0)');
});

test('header controls are clean vector buttons and Export has an obvious return path', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'phone-only polish check');
  await preparePhone(page);

  for (const id of ['undoButton','redoButton','exportButton']) {
    const button = page.locator(`#${id}`);
    await expect(button.locator('svg.figureloom-phone-header-icon')).toHaveCount(1);
    const box = await button.boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(42);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }

  await page.locator('#exportButton').click();
  await expect(page.locator('#exportMenu')).toHaveClass(/open/);
  await expect(page.locator('#figureloomPhoneExportBack')).toBeVisible();
  await expect(page.locator('#figureloomPhoneExportBack')).toContainText('Back to editor');
  await page.locator('#figureloomPhoneExportBack').click();
  await expect(page.locator('#exportMenu')).not.toHaveClass(/open/);
});