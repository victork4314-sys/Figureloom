const { test, expect } = require('@playwright/test');

async function preparePhone(page, theme = null) {
  await page.addInitScript(selectedTheme => {
    localStorage.setItem('scicanvas-guided-tour-v2', 'complete');
    localStorage.setItem('scicanvas-guided-tour-v3', 'complete');
    localStorage.setItem('scicanvas-welcome-v1', 'complete');
    localStorage.setItem('scicanvas-user-name-v1', 'Phone Polish Test');
    sessionStorage.setItem('figureloom-quick-start-dismissed', '1');
    if (selectedTheme) localStorage.setItem('figureloom-interface-theme-v1', selectedTheme);
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
  }, theme);
  await page.goto('/');
  await expect(page.locator('#canvas')).toBeVisible();
  await page.waitForFunction(() => Boolean(window.FigureLoomPhoneMode && window.FigureLoomPhoneCanvasFit));
  await expect(page.locator('html')).toHaveAttribute('data-figureloom-resolved-mode', 'phone');
  await page.waitForTimeout(250);
}

async function openPassiveGuide(page) {
  await page.waitForFunction(() => Boolean(window.FigureLoomTourMobileSafe && window.openSciCanvasTour));
  await page.evaluate(() => window.openSciCanvasTour());
  await expect(page.locator('#scicanvasTour')).toHaveClass(/open/);
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

test('passive guide and its actions always remain above the phone dock and inside the visible viewport', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'phone-only guide safety check');
  await preparePhone(page);
  await openPassiveGuide(page);

  const tour = page.locator('#scicanvasTour');
  const card = tour.locator('.tour-card');
  const actions = tour.locator('.tour-actions');
  const next = tour.locator('[data-tour="next"]');

  await expect(card).toBeVisible();
  await expect(actions).toBeVisible();
  await expect(next).toBeVisible();

  const geometry = await page.evaluate(() => {
    const viewport = window.visualViewport;
    const viewportTop = viewport?.offsetTop || 0;
    const viewportBottom = viewportTop + (viewport?.height || innerHeight);
    const card = document.querySelector('#scicanvasTour .tour-card').getBoundingClientRect();
    const actions = document.querySelector('#scicanvasTour .tour-actions').getBoundingClientRect();
    const tourZ = Number.parseInt(getComputedStyle(document.querySelector('#scicanvasTour')).zIndex, 10) || 0;
    const dockZ = Number.parseInt(getComputedStyle(document.querySelector('#figureloomPhoneDock')).zIndex, 10) || 0;
    return { viewportTop, viewportBottom, card, actions, tourZ, dockZ };
  });

  expect(geometry.card.top).toBeGreaterThanOrEqual(geometry.viewportTop - 1);
  expect(geometry.card.bottom).toBeLessThanOrEqual(geometry.viewportBottom + 1);
  expect(geometry.actions.top).toBeGreaterThanOrEqual(geometry.card.top - 1);
  expect(geometry.actions.bottom).toBeLessThanOrEqual(geometry.viewportBottom + 1);
  expect(geometry.tourZ).toBeGreaterThan(geometry.dockZ);

  for (let step = 1; step < 12; step += 1) {
    await expect(next).toBeVisible();
    await next.click();
    await expect(tour.locator('.tour-counter')).toContainText(`${step + 1} of 12`);
    const actionBox = await actions.boundingBox();
    expect(actionBox).not.toBeNull();
    expect(actionBox.y + actionBox.height).toBeLessThanOrEqual(geometry.viewportBottom + 1);
  }

  await expect(next).toHaveText('Done');
  await next.click();
  await expect(tour).not.toHaveClass(/open/);
});

test('passive guide controls remain reachable in phone landscape', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'phone-only guide landscape check');
  await page.setViewportSize({ width:844, height:390 });
  await preparePhone(page);
  await openPassiveGuide(page);

  const actions = page.locator('#scicanvasTour .tour-actions');
  const next = page.locator('#scicanvasTour [data-tour="next"]');
  await expect(actions).toBeVisible();
  await expect(next).toBeVisible();

  const result = await actions.evaluate(node => {
    const rect = node.getBoundingClientRect();
    const viewport = window.visualViewport;
    const bottom = (viewport?.offsetTop || 0) + (viewport?.height || innerHeight);
    return { top:rect.top, bottom:rect.bottom, viewportBottom:bottom };
  });
  expect(result.top).toBeGreaterThanOrEqual(0);
  expect(result.bottom).toBeLessThanOrEqual(result.viewportBottom + 1);
  await next.click();
  await expect(page.locator('#scicanvasTour .tour-counter')).toContainText('2 of 12');
});

test('passive guide footer matches dark mode instead of turning white', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'phone-only dark guide check');
  await preparePhone(page, 'dark');
  await expect(page.locator('html')).toHaveAttribute('data-figureloom-theme', 'dark');
  await openPassiveGuide(page);

  const colors = await page.evaluate(() => {
    const actions = getComputedStyle(document.querySelector('#scicanvasTour .tour-actions'));
    const close = getComputedStyle(document.querySelector('#scicanvasTour [data-tour="close"]'));
    const back = getComputedStyle(document.querySelector('#scicanvasTour [data-tour="back"]'));
    const next = getComputedStyle(document.querySelector('#scicanvasTour [data-tour="next"]'));
    return {
      footerGradient:actions.backgroundImage,
      footerBorder:actions.borderTopColor,
      closeBackground:close.backgroundColor,
      backBackground:back.backgroundColor,
      closeText:close.color,
      nextBackground:next.backgroundColor
    };
  });

  expect(colors.footerGradient).toContain('36, 40, 47');
  expect(colors.footerBorder).not.toBe('rgb(181, 202, 212)');
  expect(colors.closeBackground).toBe('rgb(43, 49, 57)');
  expect(colors.backBackground).toBe('rgb(43, 49, 57)');
  expect(colors.closeText).toBe('rgb(238, 241, 244)');
  expect(colors.nextBackground).toBe('rgb(37, 99, 235)');
});