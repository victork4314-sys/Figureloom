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
  await page.waitForFunction(() => Boolean(
    window.FigureLoomPhoneMode
    && window.FigureLoomMobileToolsPolish
    && window.FigureLoomMobileToolsScrollFix
    && document.documentElement.dataset.figureloomReady === '1'
  ));
  await expect(page.locator('html')).toHaveAttribute('data-figureloom-resolved-mode', 'phone');
}

test('mobile Tools responds to a real vertical touch drag and uses the sage theme', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'phone tools check');
  await page.setViewportSize({ width:390, height:640 });
  await prepare(page);

  await page.locator('[data-phone-action="tools"]').click();
  const ribbon = page.locator('.ribbon');
  await expect(ribbon).toHaveClass(/figureloom-phone-sheet-open/);
  await expect(page.locator('#figureloomPhoneToolSections')).toBeVisible();
  await expect(page.locator('#figureloomPhoneToolSections [data-phone-tool-tab="insert"]')).toContainText('Add');
  await expect(page.locator('#figureloomPhoneToolSections [data-phone-tool-tab="layout"]')).toContainText('Arrange');
  await page.waitForFunction(() => document.querySelectorAll('.ribbon .tool-group').length >= 3);

  const result = await ribbon.evaluate(node => {
    const nodeStyle = getComputedStyle(node);
    const probe = document.createElement('span');
    document.body.appendChild(probe);
    probe.style.color = 'var(--figureloom-phone-accent)';
    const phoneAccent = getComputedStyle(probe).color;
    probe.style.color = 'var(--figureloom-ui-accent)';
    const uiAccent = getComputedStyle(probe).color;
    probe.remove();
    node.scrollTop = 0;
    return {
      display:nodeStyle.display,
      overflowY:nodeStyle.overflowY,
      touchAction:nodeStyle.touchAction,
      scrollHeight:node.scrollHeight,
      clientHeight:node.clientHeight,
      phoneAccent,
      uiAccent
    };
  });

  expect(result.display).toBe('block');
  expect(result.overflowY).toBe('scroll');
  expect(result.touchAction).toBe('none');
  expect(result.scrollHeight).toBeGreaterThan(result.clientHeight + 1);
  expect(result.phoneAccent).toBe(result.uiAccent);

  const target = ribbon.locator('.tool-group').nth(1);
  const base = { pointerId:71, pointerType:'touch', isPrimary:true, button:0, buttons:1, clientX:300 };
  await target.dispatchEvent('pointerdown', { ...base, clientY:560 });
  await target.dispatchEvent('pointermove', { ...base, clientY:360 });
  await target.dispatchEvent('pointermove', { ...base, clientY:180 });
  await ribbon.dispatchEvent('pointerup', { ...base, buttons:0, clientY:180 });
  await expect.poll(() => ribbon.evaluate(node => node.scrollTop)).toBeGreaterThan(100);
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

test('mobile toast uses the active FigureLoom surface, text and sage accent', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'phone toast theme check');
  await prepare(page, 'dark');
  await page.waitForFunction(() => Boolean(window.__figureLoomMobileToastThemeV1 && window.SciCanvasToast));
  await page.evaluate(() => window.SciCanvasToast('Theme check', 'success', 5000));

  const toast = page.locator('.sc-toast').last();
  await expect(toast).toBeVisible();
  const result = await toast.evaluate(node => {
    const style = getComputedStyle(node);
    const stackStyle = getComputedStyle(node.parentElement);
    const probe = document.createElement('span');
    document.body.appendChild(probe);
    probe.style.backgroundColor = 'var(--figureloom-ui-surface)';
    const expectedSurface = getComputedStyle(probe).backgroundColor;
    probe.style.color = 'var(--figureloom-ui-text)';
    const expectedText = getComputedStyle(probe).color;
    probe.style.color = 'var(--figureloom-ui-accent)';
    const expectedAccent = getComputedStyle(probe).color;
    probe.remove();
    return {
      background:style.backgroundColor,
      color:style.color,
      borderLeft:style.borderLeftColor,
      expectedSurface,
      expectedText,
      expectedAccent,
      stackBottom:parseFloat(stackStyle.bottom)
    };
  });

  expect(result.background).toBe(result.expectedSurface);
  expect(result.color).toBe(result.expectedText);
  expect(result.borderLeft).toBe(result.expectedAccent);
  expect(result.stackBottom).toBeGreaterThanOrEqual(70);
});
