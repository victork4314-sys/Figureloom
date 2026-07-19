const { test, expect } = require('@playwright/test');

async function preparePhone(page, theme = 'light') {
  await page.addInitScript(selectedTheme => {
    localStorage.setItem('scicanvas-guided-tour-v2', 'complete');
    localStorage.setItem('scicanvas-guided-tour-v3', 'complete');
    localStorage.setItem('scicanvas-welcome-v1', 'complete');
    localStorage.setItem('scicanvas-user-name-v1', 'Mobile UI Test');
    localStorage.setItem('scicanvas-motion-v1', 'off');
    localStorage.setItem('figureloom-interface-theme-v1', selectedTheme);
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
    sessionStorage.setItem('figureloom-quick-start-dismissed', '1');
  }, theme);
  await page.goto('/');
  await expect(page.locator('#canvas')).toBeVisible();
  await page.waitForFunction(() => Boolean(window.FigureLoomPhoneMode && window.FigureLoomMobileUiPolish));
  await expect(page.locator('html')).toHaveAttribute('data-figureloom-resolved-mode', 'phone');
}

test('phone Tools sheet scrolls vertically and presents Add and Arrange as clear sections', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'phone-only tools polish check');
  await preparePhone(page);
  await page.locator('[data-phone-action="tools"]').click();
  const ribbon = page.locator('.ribbon');
  await expect(ribbon).toHaveClass(/figureloom-phone-sheet-open/);
  await expect(ribbon.locator('.tool-group-label', { hasText:'Add' })).toBeVisible();
  await expect(ribbon.locator('.tool-group-label', { hasText:'Arrange' })).toBeVisible();

  const details = await ribbon.evaluate(node => {
    const style = getComputedStyle(node);
    const section = node.querySelector('.tool-group');
    const label = node.querySelector('.tool-group-label');
    const before = node.scrollTop;
    node.scrollTop = node.scrollHeight;
    return {
      overflowY:style.overflowY,
      touchAction:style.touchAction,
      canOverflow:node.scrollHeight > node.clientHeight,
      scrolled:node.scrollTop > before,
      sectionDisplay:section ? getComputedStyle(section).display : '',
      labelPosition:label ? getComputedStyle(label).position : ''
    };
  });
  expect(['auto','scroll']).toContain(details.overflowY);
  expect(details.touchAction).toContain('pan-y');
  expect(details.canOverflow).toBe(true);
  expect(details.scrolled).toBe(true);
  expect(details.sectionDisplay).toBe('grid');
  expect(details.labelPosition).toBe('static');
});

test('phone navigation uses one consistent SVG icon system and equal More button heights', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'phone-only icon polish check');
  await preparePhone(page);
  await page.locator('[data-phone-action="more"]').click();
  const actions = page.locator('#figureloomPhoneDock [data-phone-action],#figureloomPhoneMoreSheet [data-phone-action]');
  const count = await actions.count();
  expect(count).toBeGreaterThan(8);
  for (let index = 0; index < count; index += 1) {
    await expect(actions.nth(index).locator(':scope > span:first-child svg')).toHaveCount(1);
  }

  const heights = await page.locator('#figureloomPhoneMoreSheet .phone-more-grid button').evaluateAll(buttons => buttons.map(button => button.getBoundingClientRect().height));
  expect(new Set(heights.map(height => Math.round(height))).size).toBe(1);
  expect(heights[0]).toBeGreaterThanOrEqual(58);
  const settingsHeight = await page.locator('[data-phone-action="settings"]').evaluate(node => node.getBoundingClientRect().height);
  const projectsHeight = await page.locator('[data-phone-action="projects"]').evaluate(node => node.getBoundingClientRect().height);
  expect(Math.round(settingsHeight)).toBe(Math.round(projectsHeight));
});

test('toast notifications use the active FigureLoom surface and sage accent', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'phone-only toast theme check');
  await preparePhone(page, 'dark');
  await page.evaluate(() => window.SciCanvasToast?.('Theme check', 'success', 5000));
  const toast = page.locator('.sc-toast').last();
  await expect(toast).toBeVisible();
  const colors = await toast.evaluate(node => {
    const root = getComputedStyle(document.documentElement);
    const style = getComputedStyle(node);
    const probe = document.createElement('span');
    document.body.appendChild(probe);
    probe.style.backgroundColor = root.getPropertyValue('--figureloom-ui-surface');
    const expectedSurface = getComputedStyle(probe).backgroundColor;
    probe.style.color = root.getPropertyValue('--figureloom-ui-accent');
    const expectedAccent = getComputedStyle(probe).color;
    probe.remove();
    return {
      background:style.backgroundColor,
      text:style.color,
      leftBorder:style.borderLeftColor,
      expectedSurface,
      expectedAccent
    };
  });
  expect(colors.background).toBe(colors.expectedSurface);
  expect(colors.leftBorder).toBe(colors.expectedAccent);
  expect(colors.text).not.toBe('rgb(255, 255, 255)');
});