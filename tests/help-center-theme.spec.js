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
      const iconLinks = [...document.querySelectorAll('link[rel="icon"]')];
      const legacyLinks = document.querySelectorAll('link[rel="shortcut icon"],link[rel="apple-touch-icon"],link[rel="apple-touch-icon-precomposed"],link[rel="mask-icon"]');
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
        iconCount:iconLinks.length,
        iconHref:iconLinks[0]?.getAttribute('href') || '',
        legacyLinkCount:legacyLinks.length
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
    expect(colors.iconCount).toBe(1);
    expect(colors.iconHref).toBe('./figureloom-mark.svg?v=1');
    expect(colors.legacyLinkCount).toBe(0);

    const mark = await page.evaluate(async () => {
      const response = await fetch('./figureloom-mark.svg?v=1', { cache:'no-store' });
      const text = await response.text();
      return { ok:response.ok, type:response.headers.get('content-type') || '', text };
    });
    expect(mark.ok).toBe(true);
    expect(mark.type).toContain('image/svg+xml');
    expect(mark.text).toContain('fill="#0c2e28"');
    expect(mark.text).toContain('stroke="#79d6c3"');
  });
}

test('legacy icon paths are gone', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop icon cleanup');
  await prepare(page);

  const statuses = await page.evaluate(async () => {
    const paths = ['./favicon.svg','./favicon.ico','./safari-pinned-tab.svg'];
    const results = {};
    for (const iconPath of paths) {
      const response = await fetch(iconPath, { cache:'no-store' });
      results[iconPath] = response.status;
    }
    return results;
  });
  expect(statuses['./favicon.svg']).toBe(404);
  expect(statuses['./favicon.ico']).toBe(410);
  expect(statuses['./safari-pinned-tab.svg']).toBe(404);
});
