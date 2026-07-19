const { test, expect } = require('@playwright/test');

async function prepare(page, theme = 'light') {
  await page.addInitScript(selectedTheme => {
    localStorage.setItem('scicanvas-guided-tour-v2', 'complete');
    localStorage.setItem('scicanvas-guided-tour-v3', 'complete');
    localStorage.setItem('scicanvas-welcome-v1', 'complete');
    localStorage.setItem('scicanvas-user-name-v1', 'Mobile Tools Test');
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
  await page.waitForFunction(() => Boolean(window.FigureLoomPhoneMode && window.FigureLoomMobileToolsPolish));
  await expect(page.locator('html')).toHaveAttribute('data-figureloom-resolved-mode', 'phone');
}

test('mobile Tools is vertically scrollable, sectioned and uses the sage theme', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'phone tools check');
  await prepare(page);

  await page.locator('[data-phone-action="tools"]').click();
  const ribbon = page.locator('.ribbon');
  await expect(ribbon).toHaveClass(/figureloom-phone-sheet-open/);
  await expect(page.locator('#figureloomPhoneToolSections')).toBeVisible();
  await expect(page.locator('#figureloomPhoneToolSections [data-phone-tool-tab="insert"]')).toContainText('Add');
  await expect(page.locator('#figureloomPhoneToolSections [data-phone-tool-tab="layout"]')).toContainText('Arrange');

  const result = await ribbon.evaluate(node => {
    const nodeStyle = getComputedStyle(node);
    const probe = document.createElement('span');
    document.body.appendChild(probe);
    probe.style.color = 'var(--figureloom-phone-accent)';
    const phoneAccent = getComputedStyle(probe).color;
    probe.style.color = 'var(--figureloom-ui-accent)';
    const uiAccent = getComputedStyle(probe).color;
    probe.remove();
    const before = node.scrollTop;
    node.scrollTop = node.scrollHeight;
    return {
      overflowY:nodeStyle.overflowY,
      touchAction:nodeStyle.touchAction,
      scrollHeight:node.scrollHeight,
      clientHeight:node.clientHeight,
      before,
      after:node.scrollTop,
      phoneAccent,
      uiAccent
    };
  });

  expect(['auto','scroll']).toContain(result.overflowY);
  expect(result.touchAction).toContain('pan-y');
  expect(result.phoneAccent).toBe(result.uiAccent);
  if (result.scrollHeight > result.clientHeight + 1) expect(result.after).toBeGreaterThan(result.before);
});

test('mobile More uses one vector icon family and equal action heights', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'phone more check');
  await prepare(page, 'dark');

  await page.locator('[data-phone-action="more"]').click();
  const sheet = page.locator('#figureloomPhoneMoreSheet');
  await expect(sheet).toBeVisible();
  const buttons = sheet.locator('.phone-more-grid [data-phone-action]');
  await expect(buttons.first()).toBeVisible();

  const count = await buttons.count();
  expect(count).toBeGreaterThanOrEqual(6);
  for (let index = 0; index < count; index += 1) {
    await expect(buttons.nth(index).locator(':scope > span:first-child svg.figureloom-phone-action-icon')).toHaveCount(1);
  }

  const heights = await page.evaluate(() => {
    const projects = document.querySelector('[data-phone-action="projects"]').getBoundingClientRect();
    const settings = document.querySelector('[data-phone-action="settings"]').getBoundingClientRect();
    const sheetStyle = getComputedStyle(document.querySelector('#figureloomPhoneMoreSheet'));
    const probe = document.createElement('span');
    document.body.appendChild(probe);
    probe.style.background = 'var(--figureloom-ui-surface)';
    const expectedSurface = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return { projects:projects.height, settings:settings.height, sheet:sheetStyle.backgroundColor, expectedSurface };
  });
  expect(Math.abs(heights.projects - heights.settings)).toBeLessThanOrEqual(1);
  expect(heights.settings).toBeGreaterThanOrEqual(58);
  expect(heights.sheet).toBe(heights.expectedSurface);

  for (const action of ['tools','pages','edit','more']) {
    await expect(page.locator(`#figureloomPhoneDock [data-phone-action="${action}"] svg.figureloom-phone-action-icon`)).toHaveCount(1);
  }
});