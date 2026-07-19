const { test, expect } = require('@playwright/test');

async function prepare(page, interfaceMode = 'auto', theme = 'light') {
  await page.addInitScript(({ interfaceMode, theme }) => {
    localStorage.setItem('scicanvas-guided-tour-v2', 'complete');
    localStorage.setItem('scicanvas-guided-tour-v3', 'complete');
    localStorage.setItem('scicanvas-welcome-v1', 'complete');
    localStorage.setItem('scicanvas-user-name-v1', 'Phone Test');
    localStorage.setItem('scicanvas-motion-v1', 'off');
    localStorage.setItem('figureloom-interface-theme-v1', theme);
    localStorage.setItem('figureloom-settings-v1', JSON.stringify({
      interfaceMode,
      textSize:'standard',
      largerControls:false,
      strongFocus:false,
      reduceMotion:false,
      highContrast:false,
      underlineLinks:false,
      readableFont:false
    }));
    sessionStorage.setItem('figureloom-quick-start-dismissed', '1');
  }, { interfaceMode, theme });
  await page.goto('/');
  await expect(page.locator('#canvas')).toBeVisible();
  await page.waitForFunction(() => Boolean(window.FigureLoomSettings && window.FigureLoomPhoneMode && window.FigureLoomPhoneCanvasFit));
  await page.waitForTimeout(350);
}

async function expectPhone(page) {
  await expect(page.locator('html')).toHaveAttribute('data-figureloom-resolved-mode', 'phone');
  await expect(page.locator('#figureloomPhoneDock')).toBeVisible();
}

async function closePhoneSheet(page) {
  const close = page.locator('.phone-sheet-close');
  if (await close.isVisible()) await close.click();
}

test('automatic mode resolves only real phone-sized touch contexts to phone', async ({ page }, testInfo) => {
  await prepare(page, 'auto');
  const expected = testInfo.project.name === 'mobile' ? 'phone' : 'desktop';
  await expect(page.locator('html')).toHaveAttribute('data-figureloom-resolved-mode', expected);
  if (expected === 'phone') await expect(page.locator('#figureloomPhoneDock')).toBeVisible();
  else await expect(page.locator('#figureloomPhoneDock')).toBeHidden();
});

test('forced phone works on desktop and forced desktop disables phone immediately', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop forcing check');
  await prepare(page, 'phone');
  await expectPhone(page);
  await page.locator('[data-phone-action="more"]').click();
  await expect(page.locator('#figureloomPhoneMoreSheet')).toBeVisible();
  await page.locator('[data-phone-action="desktop"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-figureloom-resolved-mode', 'desktop');
  await expect(page.locator('#figureloomPhoneDock')).toBeHidden();
  await expect(page.locator('.left-panel')).not.toHaveAttribute('aria-hidden');
  await expect(page.locator('.right-panel')).not.toHaveAttribute('aria-hidden');
});

test('forced desktop keeps the normal interface and removes all phone-only state on a phone viewport', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile override check');
  await prepare(page, 'desktop');
  await expect(page.locator('html')).toHaveAttribute('data-figureloom-resolved-mode', 'desktop');
  await expect(page.locator('#figureloomPhoneDock')).toBeHidden();
  await expect(page.locator('.left-panel')).not.toHaveAttribute('aria-hidden');
  await expect(page.locator('.right-panel')).not.toHaveAttribute('aria-hidden');
  await expect(page.locator('.ribbon')).not.toHaveClass(/figureloom-phone-sheet-open/);
});

test('portrait phone geometry, touch targets, colors and canvas fit stay inside the viewport', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'phone geometry check');
  await prepare(page, 'phone');
  await expectPhone(page);
  const result = await page.evaluate(() => {
    const viewport = { width:innerWidth, height:innerHeight };
    const selectors = ['#undoButton','#redoButton','#exportButton','.ribbon-tabs .ribbon-tab','#figureloomPhoneDock button','.canvas-toolbar button'];
    const targets = selectors
      .flatMap(selector => [...document.querySelectorAll(selector)])
      .filter(node => {
        if (getComputedStyle(node).display === 'none') return false;
        const rect = node.getBoundingClientRect();
        return rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight;
      })
      .map(node => {
        const rect = node.getBoundingClientRect();
        return { selector:node.id || node.textContent.trim(), width:rect.width, height:rect.height, left:rect.left, right:rect.right, top:rect.top, bottom:rect.bottom };
      });
    const shell = document.querySelector('.app-shell').getBoundingClientRect();
    const canvas = document.querySelector('#canvas').getBoundingClientRect();
    const stage = document.querySelector('#canvasStage').getBoundingClientRect();
    const dock = getComputedStyle(document.querySelector('#figureloomPhoneDock'));
    const title = getComputedStyle(document.querySelector('.titlebar'));
    return {
      viewport,
      bodyMinWidth:getComputedStyle(document.body).minWidth,
      shell:{ left:shell.left, right:shell.right, width:shell.width },
      canvas:{ left:canvas.left, right:canvas.right, width:canvas.width },
      stage:{ left:stage.left, right:stage.right, width:stage.width },
      targets,
      dockBackground:dock.backgroundColor,
      titleBackground:title.backgroundColor,
      horizontalOverflow:document.documentElement.scrollWidth - innerWidth,
      ribbonScrollWidth:document.querySelector('.ribbon-tabs').scrollWidth,
      ribbonClientWidth:document.querySelector('.ribbon-tabs').clientWidth,
      ribbonOverflowX:getComputedStyle(document.querySelector('.ribbon-tabs')).overflowX,
      visibleHeaderActions:[...document.querySelectorAll('.title-actions>*')]
        .filter(node => getComputedStyle(node).display !== 'none')
        .map(node => node.id || node.className)
    };
  });
  expect(result.bodyMinWidth).toBe('0px');
  expect(result.shell.left).toBeGreaterThanOrEqual(-1);
  expect(result.shell.right).toBeLessThanOrEqual(result.viewport.width + 1);
  expect(result.horizontalOverflow).toBeLessThanOrEqual(1);
  expect(result.ribbonScrollWidth).toBeGreaterThanOrEqual(result.ribbonClientWidth);
  expect(['auto','scroll']).toContain(result.ribbonOverflowX);
  expect(result.canvas.width).toBeLessThanOrEqual(result.stage.width + 1);
  expect(result.canvas.left).toBeGreaterThanOrEqual(result.stage.left - 1);
  expect(result.dockBackground).not.toBe('rgba(0, 0, 0, 0)');
  expect(result.titleBackground).not.toBe('rgba(0, 0, 0, 0)');
  expect(result.visibleHeaderActions).toEqual(['undoButton','redoButton','exportButton']);
  for (const target of result.targets) {
    expect(target.width, `${target.selector} width`).toBeGreaterThanOrEqual(40);
    expect(target.height, `${target.selector} height`).toBeGreaterThanOrEqual(44);
    expect(target.left, `${target.selector} left`).toBeGreaterThanOrEqual(-2);
    expect(target.right, `${target.selector} right`).toBeLessThanOrEqual(result.viewport.width + 2);
  }
});

test('ordinary tools and project controls use sheets while Insert stays full-screen', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'phone sheets check');
  await prepare(page, 'phone');

  await page.locator('.ribbon-tab[data-tab="home"]').click();
  await expect(page.locator('.ribbon')).toHaveClass(/figureloom-phone-sheet-open/);
  await expect(page.locator('#figureloomPhoneSheetTitle')).toContainText('Home');
  await expect(page.locator('#addTextButton')).toBeVisible();
  await closePhoneSheet(page);

  await page.locator('.ribbon-tab[data-tab="insert"]').click();
  await expect(page.locator('#insertDrawer')).toHaveClass(/open/);
  await expect(page.locator('#insertDrawer')).toBeVisible();
  const insertRect = await page.locator('#insertDrawer').boundingBox();
  expect(insertRect.width).toBeGreaterThanOrEqual(389);
  expect(insertRect.height).toBeGreaterThanOrEqual(843);
  await page.locator('#insertDrawer [data-close]').click();
  await expect(page.locator('#insertDrawer')).not.toHaveClass(/open/);

  await page.locator('[data-phone-action="pages"]').click();
  await expect(page.locator('.left-panel')).toHaveClass(/figureloom-phone-sheet-open/);
  const thumb = page.locator('.left-panel .page-thumbnail').first();
  await expect(thumb).toBeVisible();
  expect((await thumb.boundingBox()).width).toBeGreaterThanOrEqual(100);

  await page.locator('[data-phone-action="edit"]').click();
  await expect(page.locator('.right-panel')).toHaveClass(/figureloom-phone-sheet-open/);
  await expect(page.locator('#fillColor')).toBeVisible();

  await page.locator('[data-phone-action="more"]').click();
  await expect(page.locator('#figureloomPhoneMoreSheet')).toHaveClass(/figureloom-phone-sheet-open/);
  await expect(page.locator('[data-phone-action="desktop"]')).toBeVisible();
  await expect(page.locator('[data-phone-action="protools"]')).toBeVisible();
  await expect(page.locator('[data-phone-action="loomy"]')).toBeVisible();
  await expect(page.locator('[data-phone-action="guide"]')).toBeVisible();
  await page.locator('[data-phone-action="projects"]').click();
  await expect(page.locator('.ribbon')).toHaveClass(/figureloom-phone-sheet-open/);
  await expect(page.locator('#projectsRibbonHost')).toBeVisible();
});

test('settings opens full-screen and remains usable in phone mode', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'phone settings check');
  await prepare(page, 'phone');
  await page.locator('[data-phone-action="more"]').click();
  await page.locator('[data-phone-action="settings"]').click();
  const settings = page.locator('#figureloomSettingsPage');
  await expect(settings).toBeVisible();
  const rect = await settings.boundingBox();
  expect(rect.x).toBeGreaterThanOrEqual(-1);
  expect(rect.y).toBeGreaterThanOrEqual(-1);
  expect(rect.width).toBeGreaterThanOrEqual(389);
  expect(rect.height).toBeGreaterThanOrEqual(843);
  await expect(settings.locator('[data-setting="interfaceMode"][value="phone"]')).toBeChecked();
  await settings.locator('[data-settings-close]').click();
  await expect(settings).toBeHidden();
});

test('landscape phone layout keeps chrome, dock and canvas controls on-screen', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'phone landscape check');
  await page.setViewportSize({ width:844, height:390 });
  await prepare(page, 'phone');
  await expectPhone(page);
  const result = await page.evaluate(() => {
    const nodes = ['.titlebar','.ribbon-tabs','#figureloomPhoneDock','.canvas-toolbar'].map(selector => {
      const rect = document.querySelector(selector).getBoundingClientRect();
      return { selector, left:rect.left, right:rect.right, top:rect.top, bottom:rect.bottom };
    });
    return { width:innerWidth, height:innerHeight, scrollWidth:document.documentElement.scrollWidth, nodes };
  });
  expect(result.scrollWidth).toBeLessThanOrEqual(result.width + 1);
  for (const node of result.nodes) {
    expect(node.left, `${node.selector} left`).toBeGreaterThanOrEqual(-2);
    expect(node.right, `${node.selector} right`).toBeLessThanOrEqual(result.width + 2);
    expect(node.top, `${node.selector} top`).toBeGreaterThanOrEqual(-2);
    expect(node.bottom, `${node.selector} bottom`).toBeLessThanOrEqual(result.height + 2);
  }
});

test('dark phone mode uses the existing dark palette rather than transparent mobile chrome', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'phone dark mode check');
  await prepare(page, 'phone', 'dark');
  await expectPhone(page);
  await expect(page.locator('html')).toHaveAttribute('data-figureloom-theme', 'dark');
  const colors = await page.evaluate(() => ({
    surface:getComputedStyle(document.documentElement).getPropertyValue('--figureloom-phone-surface').trim(),
    text:getComputedStyle(document.documentElement).getPropertyValue('--figureloom-phone-text').trim(),
    dock:getComputedStyle(document.querySelector('#figureloomPhoneDock')).backgroundColor
  }));
  expect(colors.surface).toContain('36');
  expect(colors.text.toLowerCase()).toBe('#eef1f4');
  expect(colors.dock).not.toBe('rgba(0, 0, 0, 0)');
});

test('long press forwards to the existing context-menu path', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'phone long press check');
  await prepare(page, 'phone');
  await page.locator('[data-phone-action="tools"]').click();
  await page.locator('#addShapeButton').click();
  await closePhoneSheet(page);
  const object = page.locator('#objectLayer .canvas-object').first();
  await expect(object).toBeVisible();
  await page.evaluate(() => {
    window.__phoneContextCount = 0;
    document.querySelector('#objectLayer .canvas-object').addEventListener('contextmenu', () => window.__phoneContextCount++);
  });
  const box = await object.boundingBox();
  const point = { clientX:box.x + box.width / 2, clientY:box.y + box.height / 2, pointerId:21, pointerType:'touch', isPrimary:true };
  await object.dispatchEvent('pointerdown', point);
  await page.waitForTimeout(650);
  await object.dispatchEvent('pointerup', point);
  await expect.poll(() => page.evaluate(() => window.__phoneContextCount)).toBe(1);
});

test('repeated live mode switching never duplicates phone chrome', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'phone duplicate check');
  await prepare(page, 'phone');
  await page.evaluate(() => {
    FigureLoomSettings.set({ interfaceMode:'desktop' });
    FigureLoomSettings.set({ interfaceMode:'phone' });
    FigureLoomSettings.set({ interfaceMode:'desktop' });
    FigureLoomSettings.set({ interfaceMode:'phone' });
  });
  await expectPhone(page);
  for (const selector of ['#figureloomPhoneChrome','#figureloomPhoneDock','#figureloomPhoneScrim','#figureloomPhoneSheetBar','#figureloomPhoneMoreSheet']) {
    await expect(page.locator(selector)).toHaveCount(1);
  }
});
