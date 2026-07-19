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
    await expect(page.locator('#figureloomLayerManager')).toBeVisible();
    await page.locator('#tourHelpButton').click();

    const colors = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const title = getComputedStyle(document.querySelector('.titlebar'));
      const help = getComputedStyle(document.querySelector('#figureloomHelpMenu'));
      const brand = getComputedStyle(document.querySelector('.brand-mark'));
      const layerPanel = getComputedStyle(document.querySelector('#figureloomLayerManager'));
      const layerSearch = getComputedStyle(document.querySelector('#layerSearch'));
      const grid = getComputedStyle(document.querySelector('#gridToggle'));
      const snap = getComputedStyle(document.querySelector('#snapToggle'));
      const opacity = getComputedStyle(document.querySelector('#opacity'));
      return {
        accent:root.getPropertyValue('--figureloom-ui-accent').trim(),
        surface:root.getPropertyValue('--figureloom-ui-surface').trim(),
        text:root.getPropertyValue('--figureloom-ui-text').trim(),
        titleBackground:title.backgroundColor,
        helpBackground:help.backgroundColor,
        brandBackground:brand.backgroundImage,
        layerBackground:layerPanel.backgroundColor,
        layerSearchBackground:layerSearch.backgroundColor,
        gridAccent:grid.accentColor,
        snapAccent:snap.accentColor,
        opacityAccent:opacity.accentColor,
        nativeThemePresent:Boolean(document.getElementById('figureloomNativeControlTheme')),
        iconHref:document.querySelector('link[rel="shortcut icon"]')?.getAttribute('href') || ''
      };
    });

    const expectedAccent = theme === 'light' ? 'rgb(47, 116, 104)' : 'rgb(120, 196, 181)';
    if (theme === 'light') {
      expect(colors.accent).toBe('#2f7468');
      expect(colors.surface).toBe('#ffffff');
      expect(colors.text).toBe('#172321');
      expect(colors.helpBackground).toBe('rgb(255, 255, 255)');
      expect(colors.layerBackground).toBe('rgb(255, 255, 255)');
      expect(colors.layerSearchBackground).toBe('rgb(255, 255, 255)');
    } else {
      expect(colors.accent).toBe('#78c4b5');
      expect(colors.surface).toBe('#222927');
      expect(colors.text).toBe('#eef7f4');
      expect(colors.helpBackground).toBe('rgb(34, 41, 39)');
      expect(colors.layerBackground).toBe('rgb(34, 41, 39)');
      expect(colors.layerSearchBackground).toBe('rgb(34, 41, 39)');
    }
    expect(colors.titleBackground).not.toBe('rgba(0, 0, 0, 0)');
    expect(colors.brandBackground).not.toContain('37, 99, 235');
    expect(colors.brandBackground).not.toContain('124, 58, 237');
    expect(colors.gridAccent).toBe(expectedAccent);
    expect(colors.snapAccent).toBe(expectedAccent);
    expect(colors.opacityAccent).toBe(expectedAccent);
    expect(colors.nativeThemePresent).toBe(true);
    expect(colors.iconHref).toBe('./favicon.ico?v=9');

    const ico = await page.evaluate(async () => {
      const response = await fetch('./favicon.ico?v=9', { cache:'no-store' });
      const bytes = new Uint8Array(await response.arrayBuffer());
      return { ok:response.ok, length:bytes.length, header:[...bytes.slice(0, 4)] };
    });
    expect(ico.ok).toBe(true);
    expect(ico.length).toBeGreaterThan(1000);
    expect(ico.header).toEqual([0, 0, 1, 0]);
  });
}