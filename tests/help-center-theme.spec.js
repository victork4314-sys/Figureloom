const { test, expect } = require('@playwright/test');

async function prepare(page, theme = 'light') {
  await page.addInitScript(savedTheme => {
    localStorage.setItem('scicanvas-guided-tour-v2', 'complete');
    localStorage.setItem('scicanvas-guided-tour-v3', 'complete');
    localStorage.setItem('scicanvas-welcome-v1', 'complete');
    localStorage.setItem('scicanvas-user-name-v1', 'Help Test');
    localStorage.setItem('figureloom-interface-theme-v1', savedTheme);
    localStorage.setItem('figureloom-settings-v1', JSON.stringify({
      interfaceMode:'desktop',
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
  await page.waitForFunction(() => Boolean(window.FigureLoomHelpCenter && window.FigureLoomSageTheme));
  await expect(page.locator('#tourHelpButton')).toBeVisible();
  await page.waitForTimeout(350);
}

test('the advanced-mode question mark opens Help rather than starting the passive guide', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop advanced-mode Help control');
  await prepare(page);

  await page.locator('#tourHelpButton').click();
  await expect(page.locator('#figureloomHelpMenu')).toBeVisible();
  await expect(page.locator('#scicanvasTour')).not.toHaveClass(/open/);
  await expect(page.locator('#tourHelpButton')).toHaveAttribute('aria-expanded', 'true');
});

for (const theme of ['light', 'dark']) {
  test(`the ${theme} editor uses the shared sage Help and wiki palette`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop palette check');
    await prepare(page, theme);
    await page.locator('#tourHelpButton').click();

    const colors = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const title = getComputedStyle(document.querySelector('.titlebar'));
      const help = getComputedStyle(document.querySelector('#figureloomHelpMenu'));
      const brand = getComputedStyle(document.querySelector('.brand-mark'));
      return {
        accent:root.getPropertyValue('--figureloom-ui-accent').trim(),
        surface:root.getPropertyValue('--figureloom-ui-surface').trim(),
        text:root.getPropertyValue('--figureloom-ui-text').trim(),
        titleBackground:title.backgroundColor,
        helpBackground:help.backgroundColor,
        brandBackground:brand.backgroundImage
      };
    });

    if (theme === 'light') {
      expect(colors.accent).toBe('#2f7468');
      expect(colors.surface).toBe('#ffffff');
      expect(colors.text).toBe('#172321');
      expect(colors.helpBackground).toBe('rgb(255, 255, 255)');
    } else {
      expect(colors.accent).toBe('#78c4b5');
      expect(colors.surface).toBe('#222927');
      expect(colors.text).toBe('#eef7f4');
      expect(colors.helpBackground).toBe('rgb(34, 41, 39)');
    }
    expect(colors.titleBackground).not.toBe('rgba(0, 0, 0, 0)');
    expect(colors.brandBackground).not.toContain('37, 99, 235');
    expect(colors.brandBackground).not.toContain('124, 58, 237');
  });

  test(`the ${theme} inspector and rich text editor use the complete sage polish`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop inspector and editor check');
    await prepare(page, theme);

    await page.locator('#addTextButton').click();
    await expect(page.locator('#openFigureLoomRichText')).toBeEnabled();

    const inspector = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const section = getComputedStyle(document.querySelector('.right-panel .inspector-section'));
      const advanced = getComputedStyle(document.querySelector('#figureloomRichTextControls'));
      const disabled = getComputedStyle(document.querySelector('#downloadSelectedSvg'));
      return {
        surface:root.getPropertyValue('--figureloom-ui-surface').trim(),
        soft:root.getPropertyValue('--figureloom-ui-soft').trim(),
        line:root.getPropertyValue('--figureloom-ui-line').trim(),
        sectionBackground:section.backgroundColor,
        advancedBackground:advanced.backgroundColor,
        advancedBorder:advanced.borderTopColor,
        disabledBackground:disabled.backgroundColor,
        disabledOpacity:disabled.opacity
      };
    });

    await page.locator('#openFigureLoomRichText').click();
    await expect(page.locator('#figureloomRichTextOverlay')).toBeVisible();

    const editor = await page.evaluate(() => {
      const frame = getComputedStyle(document.querySelector('.figureloom-rich-editor'));
      const toolbar = getComputedStyle(document.querySelector('.rich-toolbar'));
      const editable = getComputedStyle(document.querySelector('.rich-editable'));
      const favicon = document.querySelector('link[rel="icon"]')?.getAttribute('href') || '';
      return {
        frameBackground:frame.backgroundColor,
        toolbarBackground:toolbar.backgroundColor,
        editableBackground:editable.backgroundColor,
        favicon,
        hasInternalBootCopy:document.documentElement.innerHTML.includes('Stable version')
      };
    });

    if (theme === 'light') {
      expect(inspector.sectionBackground).toBe('rgb(255, 255, 255)');
      expect(inspector.advancedBackground).toBe('rgb(237, 243, 241)');
      expect(editor.frameBackground).toBe('rgb(255, 255, 255)');
      expect(editor.toolbarBackground).toBe('rgb(237, 243, 241)');
    } else {
      expect(inspector.sectionBackground).toBe('rgb(34, 41, 39)');
      expect(inspector.advancedBackground).toBe('rgb(42, 52, 49)');
      expect(editor.frameBackground).toBe('rgb(34, 41, 39)');
      expect(editor.toolbarBackground).toBe('rgb(42, 52, 49)');
    }
    expect(inspector.advancedBorder).not.toBe('rgb(48, 53, 61)');
    expect(inspector.disabledBackground).toBe(inspector.advancedBackground);
    expect(Number(inspector.disabledOpacity)).toBeLessThan(0.8);
    expect(editor.editableBackground).toBe('rgb(255, 255, 255)');
    expect(editor.favicon).toContain('favicon.svg?v=8');
    expect(editor.hasInternalBootCopy).toBe(false);
  });
}