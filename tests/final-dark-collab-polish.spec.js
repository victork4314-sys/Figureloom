const { test, expect } = require('@playwright/test');

async function prepare(page) {
  await page.addInitScript(() => {
    localStorage.setItem('scicanvas-guided-tour-v2', 'complete');
    localStorage.setItem('scicanvas-guided-tour-v3', 'complete');
    localStorage.setItem('scicanvas-welcome-v1', 'complete');
    localStorage.setItem('scicanvas-user-name-v1', 'Dark Polish Test');
    localStorage.setItem('scicanvas-motion-v1', 'off');
    localStorage.setItem('figureloom-interface-theme-v1', 'dark');
    localStorage.setItem('figureloom-settings-v1', JSON.stringify({
      interfaceMode:'desktop', textSize:'standard', largerControls:false,
      strongFocus:false, reduceMotion:true, highContrast:false,
      underlineLinks:false, readableFont:false
    }));
    sessionStorage.setItem('figureloom-quick-start-dismissed', '1');
  });
  await page.goto('/');
  await expect(page.locator('#canvas')).toBeVisible();
  await page.waitForFunction(() => Boolean(
    document.documentElement.dataset.figureloomReady === '1' &&
    window.__figureLoomFinalSurfacePolishV1 &&
    window.__figureLoomCollaborationStatusFixV2 &&
    window.__figureLoomEditableSvgOriginalColorFixV1
  ));
}

function rgbTuple(value) {
  return String(value).match(/\d+(?:\.\d+)?/g)?.slice(0, 3).map(Number) || [];
}

function isDark(value) {
  const [r = 255, g = 255, b = 255] = rgbTuple(value);
  return (r + g + b) / 3 < 100;
}

test('dark inspector, settings, share and account surfaces use one polished system', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop surface regression');
  await prepare(page);

  const inspector = page.locator('.right-panel');
  const firstCard = page.locator('.right-panel > .inspector-section').first();
  await expect(firstCard).toBeVisible();
  const darkSurfaces = await page.evaluate(() => ({
    panel:getComputedStyle(document.querySelector('.right-panel')).backgroundColor,
    card:getComputedStyle(document.querySelector('.right-panel > .inspector-section')).backgroundColor
  }));
  expect(isDark(darkSurfaces.panel)).toBe(true);
  expect(isDark(darkSurfaces.card)).toBe(true);

  const handle = page.locator('.figureloom-inspector-drag-handle').first();
  const centering = await handle.evaluate(button => {
    const icon = button.querySelector('svg');
    const a = button.getBoundingClientRect();
    const b = icon.getBoundingClientRect();
    return {
      dx:Math.abs((a.left + a.width / 2) - (b.left + b.width / 2)),
      dy:Math.abs((a.top + a.height / 2) - (b.top + b.height / 2)),
      display:getComputedStyle(button).display
    };
  });
  expect(centering.display).toBe('grid');
  expect(centering.dx).toBeLessThanOrEqual(1);
  expect(centering.dy).toBeLessThanOrEqual(1);

  await page.locator('#settingsRibbonButton').click();
  const settings = page.locator('#figureloomSettingsPage');
  await expect(settings).toBeVisible();
  await expect(settings.locator('.settings-navigation svg')).toHaveCount(2);
  const settingsStyles = await settings.evaluate(node => ({
    page:getComputedStyle(node).backgroundColor,
    top:getComputedStyle(node.querySelector('.settings-topbar')).backgroundColor,
    nav:getComputedStyle(node.querySelector('.settings-navigation')).backgroundColor,
    choice:getComputedStyle(node.querySelector('.settings-choice')).backgroundColor,
    family:getComputedStyle(node).fontFamily
  }));
  expect(isDark(settingsStyles.page)).toBe(true);
  expect(isDark(settingsStyles.top)).toBe(true);
  expect(isDark(settingsStyles.nav)).toBe(true);
  expect(isDark(settingsStyles.choice)).toBe(true);
  expect(settingsStyles.family.toLowerCase()).toContain('inter');
  await settings.locator('[data-settings-close]').click();

  await page.evaluate(() => window.openSciCanvasCollaboration?.());
  const share = page.locator('#collaborationDrawer');
  await expect(share).toHaveClass(/open/);
  const shareStyles = await share.evaluate(node => ({
    drawer:getComputedStyle(node).backgroundColor,
    body:getComputedStyle(node.querySelector('.utility-body')).backgroundColor,
    card:getComputedStyle(node.querySelector('.collab-session-card')).backgroundColor,
    section:getComputedStyle(node.querySelector('.collab-section')).backgroundColor
  }));
  expect(isDark(shareStyles.drawer)).toBe(true);
  expect(isDark(shareStyles.body)).toBe(true);
  expect(isDark(shareStyles.card)).toBe(true);
  expect(isDark(shareStyles.section)).toBe(true);

  const banner = share.locator('#collabRemoteBanner');
  await banner.evaluate(node => { node.hidden = false; });
  await expect(banner).toBeHidden({ timeout:5000 });
  await share.locator('[data-close]').click();

  await page.evaluate(() => window.SciCanvasCloud?.open?.());
  const gallery = page.locator('#cloudGalleryDrawer');
  await expect(gallery).toHaveClass(/open/);
  const galleryStyles = await gallery.evaluate(node => ({
    drawer:getComputedStyle(node).backgroundColor,
    body:getComputedStyle(node.querySelector('.utility-body')).backgroundColor,
    account:getComputedStyle(node.querySelector('.cloud-account-panel')).backgroundColor,
    gallery:getComputedStyle(node.querySelector('.gallery-section')).backgroundColor
  }));
  expect(isDark(galleryStyles.drawer)).toBe(true);
  expect(isDark(galleryStyles.body)).toBe(true);
  expect(isDark(galleryStyles.account)).toBe(true);
  expect(isDark(galleryStyles.gallery)).toBe(true);
});

test('original editable SVG currentColor stays black in dark mode', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop SVG regression');
  await prepare(page);

  await page.evaluate(() => {
    const item = {
      id:'figureloom-black-svg-test', type:'svg', name:'Black speech bubble',
      x:120, y:120, width:180, height:120, opacity:1, rotation:0, visible:true,
      fill:'#ffffff', stroke:'#ffffff', svgColorMode:'original', svgViewBox:'0 0 100 70',
      svgMarkup:'<path fill="currentColor" d="M5 5h90v45H48L30 66l4-16H5z"/><circle style="fill:currentColor" cx="25" cy="27" r="4"/>'
    };
    state.objects.push(item);
    state.selectedId = item.id;
    render();
  });

  const object = page.locator('#canvas .canvas-object[data-id="figureloom-black-svg-test"]');
  await expect(object).toBeVisible();
  const colors = await object.evaluate(node => ({
    group:getComputedStyle(node).color,
    path:getComputedStyle(node.querySelector('path')).fill,
    circle:getComputedStyle(node.querySelector('circle')).fill,
    pathAttribute:node.querySelector('path').getAttribute('fill'),
    circleStyle:node.querySelector('circle').getAttribute('style')
  }));
  expect(rgbTuple(colors.group)).toEqual([0, 0, 0]);
  expect(rgbTuple(colors.path)).toEqual([0, 0, 0]);
  expect(rgbTuple(colors.circle)).toEqual([0, 0, 0]);
  expect(colors.pathAttribute).toBe('#000000');
  expect(colors.circleStyle.toLowerCase()).toContain('#000000');
});