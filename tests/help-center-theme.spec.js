const { test, expect } = require('@playwright/test');

async function prepare(page, theme = 'light') {
  await page.addInitScript(savedTheme => {
    localStorage.setItem('scicanvas-guided-tour-v2', 'complete');
    localStorage.setItem('scicanvas-guided-tour-v3', 'complete');
    localStorage.setItem('scicanvas-welcome-v1', 'complete');
    localStorage.setItem('scicanvas-user-name-v1', 'Help Test');
    localStorage.setItem('figureloom-interface-theme-v1', savedTheme);
    localStorage.setItem('figureloom-settings-v1', JSON.stringify({
      interfaceMode:'desktop', textSize:'standard', largerControls:false, strongFocus:false,
      reduceMotion:false, highContrast:false, underlineLinks:false, readableFont:false
    }));
    sessionStorage.setItem('figureloom-quick-start-dismissed', '1');
  }, theme);
  await page.goto('/');
  await expect(page.locator('#canvas')).toBeVisible();
  await page.waitForFunction(() => Boolean(
    window.FigureLoomHelpCenter && window.FigureLoomSageTheme &&
    window.__figureLoomPlatformIconsV2 && window.__figureLoomInteractionStabilityV1
  ));
  await page.waitForTimeout(250);
}

test('the advanced-mode question mark opens Help rather than starting the passive guide', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop Help control');
  await prepare(page);
  await page.locator('#tourHelpButton').click();
  await expect(page.locator('#figureloomHelpMenu')).toBeVisible();
  await expect(page.locator('#scicanvasTour')).not.toHaveClass(/open/);
});

for (const theme of ['light', 'dark']) {
  test(`the ${theme} editor keeps the shared sage palette`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop palette check');
    await prepare(page, theme);
    await expect(page.locator('#figureloomLayerManager')).toBeVisible();
    const colors = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      return {
        accent:root.getPropertyValue('--figureloom-ui-accent').trim(),
        layer:getComputedStyle(document.querySelector('#figureloomLayerManager')).backgroundColor,
        grid:getComputedStyle(document.querySelector('#gridToggle')).accentColor,
        opacity:getComputedStyle(document.querySelector('#opacity')).accentColor
      };
    });
    const accent = theme === 'light' ? '#2f7468' : '#78c4b5';
    const rgb = theme === 'light' ? 'rgb(47, 116, 104)' : 'rgb(120, 196, 181)';
    expect(colors.accent).toBe(accent);
    expect(colors.grid).toBe(rgb);
    expect(colors.opacity).toBe(rgb);
    expect(colors.layer).toBe(theme === 'light' ? 'rgb(255, 255, 255)' : 'rgb(34, 41, 39)');
  });
}

test('cross-platform icon files are served and declared', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop icon audit');
  await prepare(page);
  const declarations = await page.evaluate(() => ({
    icons:[...document.querySelectorAll('link[rel="icon"]')].map(link => `${link.getAttribute('sizes') || ''}:${link.getAttribute('href')}`),
    apple:document.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href'),
    precomposed:document.querySelector('link[rel="apple-touch-icon-precomposed"]')?.getAttribute('href'),
    mask:document.querySelector('link[rel="mask-icon"]')?.getAttribute('href'),
    manifest:document.querySelector('link[rel="manifest"]')?.getAttribute('href'),
    windows:document.querySelector('meta[name="msapplication-config"]')?.content
  }));
  expect(declarations.icons.join('|')).toContain('16x16:./figureloom-tab-16.png?v=2');
  expect(declarations.icons.join('|')).toContain('32x32:./figureloom-tab-32.png?v=2');
  expect(declarations.icons.join('|')).toContain('./favicon.ico?v=2');
  expect(declarations.apple).toBe('./apple-touch-icon.png?v=2');
  expect(declarations.precomposed).toBe('./apple-touch-icon-precomposed.png?v=2');
  expect(declarations.mask).toBe('./figureloom-pinned.svg?v=2');
  expect(declarations.manifest).toContain('manifest.webmanifest?v=11');
  expect(declarations.windows).toContain('browserconfig.xml?v=2');

  const files = await page.evaluate(async () => {
    const inspect = async path => {
      const response = await fetch(path, { cache:'no-store' });
      const bytes = new Uint8Array(await response.arrayBuffer());
      return { status:response.status, header:[...bytes.slice(0,8)] };
    };
    return {
      ico:await inspect('./favicon.ico?v=2'),
      apple:await inspect('./apple-touch-icon.png?v=2'),
      android:await inspect('./figureloom-app-192.png?v=2')
    };
  });
  expect(files.ico.status).toBe(200);
  expect(files.ico.header.slice(0,4)).toEqual([0,0,1,0]);
  expect(files.apple.header).toEqual([137,80,78,71,13,10,26,10]);
  expect(files.android.header).toEqual([137,80,78,71,13,10,26,10]);
});

test('native Safari trackpad pinch zooms the page', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop trackpad gesture');
  await prepare(page);
  const result = await page.evaluate(async () => {
    const stage = document.getElementById('canvasStage');
    const before = state.zoom;
    const emit = (type, scale) => {
      const event = new Event(type, { bubbles:true, cancelable:true });
      Object.defineProperties(event, {
        scale:{ value:scale },
        clientX:{ value:stage.getBoundingClientRect().left + stage.clientWidth / 2 },
        clientY:{ value:stage.getBoundingClientRect().top + stage.clientHeight / 2 }
      });
      stage.dispatchEvent(event);
    };
    emit('gesturestart', 1);
    emit('gesturechange', 1.25);
    emit('gestureend', 1.25);
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return { before, after:state.zoom };
  });
  expect(result.after).toBeGreaterThan(result.before);
});

test('stale drag state cannot flood errors or toasts', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop stale drag regression');
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await prepare(page);
  const result = await page.evaluate(async () => {
    state.selectedId = 'missing-object';
    state.drag = { id:'missing-object', dx:0, dy:0 };
    const canvas = document.getElementById('canvas');
    canvas.dispatchEvent(new PointerEvent('pointermove', { bubbles:true, cancelable:true, pointerId:77, clientX:100, clientY:100 }));
    for (let i = 0; i < 8; i += 1) window.SciCanvasToast?.('Repeated diagnostic', 'error', 5000);
    await new Promise(resolve => setTimeout(resolve, 80));
    return {
      drag:state.drag,
      duplicateCount:[...document.querySelectorAll('#scToastStack .sc-toast')].filter(node => node.textContent.includes('Repeated diagnostic')).length,
      totalToasts:document.querySelectorAll('#scToastStack .sc-toast').length
    };
  });
  expect(result.drag).toBeNull();
  expect(result.duplicateCount).toBeLessThanOrEqual(1);
  expect(result.totalToasts).toBeLessThanOrEqual(3);
  expect(pageErrors).toEqual([]);
});

test('welcome overlay stays translucent with the workspace visible behind it', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop welcome overlay');
  await prepare(page);
  const result = await page.evaluate(async () => {
    const welcome = document.getElementById('scWelcome');
    welcome.classList.add('open');
    await new Promise(resolve => requestAnimationFrame(resolve));
    const color = getComputedStyle(welcome).backgroundColor;
    const match = color.match(/rgba?\(([^)]+)\)/);
    const parts = match ? match[1].split(',').map(value => Number(value.trim())) : [];
    return {
      color,
      alpha:parts.length === 4 ? parts[3] : 1,
      overlayThemed:welcome.classList.contains('figureloom-themed-window'),
      cardThemed:welcome.querySelector('.welcome-card')?.classList.contains('figureloom-themed-window'),
      shellVisible:getComputedStyle(document.querySelector('.app-shell')).visibility !== 'hidden'
    };
  });
  expect(result.alpha).toBeLessThan(1);
  expect(result.overlayThemed).toBe(false);
  expect(result.cardThemed).toBe(true);
  expect(result.shellVisible).toBe(true);
});