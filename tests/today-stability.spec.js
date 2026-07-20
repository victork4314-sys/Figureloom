const { test, expect } = require('@playwright/test');

async function prepare(page, interfaceMode) {
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(`pageerror: ${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error') runtimeErrors.push(`console.error: ${message.text()}`);
  });

  await page.addInitScript(mode => {
    localStorage.setItem('scicanvas-guided-tour-v2', 'complete');
    localStorage.setItem('scicanvas-guided-tour-v3', 'complete');
    localStorage.setItem('scicanvas-welcome-v1', 'complete');
    localStorage.setItem('scicanvas-user-name-v1', 'Stability Test');
    localStorage.setItem('figureloom-settings-v1', JSON.stringify({
      interfaceMode:mode,
      textSize:'standard',
      largerControls:false,
      strongFocus:false,
      reduceMotion:true,
      highContrast:false,
      underlineLinks:false,
      readableFont:false
    }));
    sessionStorage.setItem('figureloom-quick-start-dismissed', '1');
  }, interfaceMode);

  await page.goto('/');
  await expect(page.locator('#canvas')).toBeVisible();
  await page.waitForFunction(() => Boolean(
    window.FigureLoomHelpCenter &&
    window.openSciCanvasTour &&
    document.querySelector('#scicanvasTour[data-figureloom-expanded-help-tour="1"]')
  ));
  await page.waitForTimeout(250);
  return runtimeErrors;
}

test('project tab close stays beside its title and the expanded guide remains passive', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop stability check');
  const runtimeErrors = await prepare(page, 'desktop');

  await page.evaluate(() => {
    const old = document.getElementById('projectTabRail');
    old?.remove();
    const rail = document.createElement('nav');
    rail.id = 'projectTabRail';
    rail.innerHTML = '<div class="project-tab-scroll"><div class="project-tab-wrap"><button class="project-tab active" type="button"><i></i><span>Example project</span></button><button class="project-tab-close" type="button">×</button></div></div>';
    document.querySelector('.ribbon-tabs')?.before(rail);
  });

  const tab = page.locator('#projectTabRail .project-tab');
  const close = page.locator('#projectTabRail .project-tab-close');
  await expect(close).toBeVisible();
  await expect.poll(async () => {
    const tabBox = await tab.boundingBox();
    const closeBox = await close.boundingBox();
    if (!tabBox || !closeBox) return false;
    return closeBox.y >= tabBox.y - 1 &&
      closeBox.y + closeBox.height <= tabBox.y + tabBox.height + 1 &&
      closeBox.x + closeBox.width <= tabBox.x + tabBox.width + 1 &&
      closeBox.x >= tabBox.x + tabBox.width - 34;
  }).toBe(true);

  const before = await page.evaluate(() => ({
    x:scrollX,
    y:scrollY,
    objects:document.querySelectorAll('#objectLayer .canvas-object').length,
    openPanels:document.querySelectorAll('.open,[open]').length
  }));

  await page.evaluate(() => window.openSciCanvasTour());
  await expect(page.locator('#scicanvasTour')).toHaveClass(/open/);
  const counter = await page.locator('#scicanvasTour .tour-counter').textContent();
  expect(Number(counter.match(/of\s+(\d+)/)?.[1] || 0)).toBeGreaterThanOrEqual(14);

  const next = page.locator('#scicanvasTour [data-tour="next"]');
  while (await page.locator('#scicanvasTour').evaluate(node => node.classList.contains('open'))) {
    await next.click();
  }

  const after = await page.evaluate(() => ({
    x:scrollX,
    y:scrollY,
    objects:document.querySelectorAll('#objectLayer .canvas-object').length,
    openPanels:document.querySelectorAll('.open,[open]').length
  }));
  expect(after).toEqual(before);
  expect(runtimeErrors).toEqual([]);
});

test('phone More Help opens the real Help center and starts the passive guide', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'phone Help check');
  const runtimeErrors = await prepare(page, 'phone');

  await expect(page.locator('html')).toHaveAttribute('data-figureloom-resolved-mode', 'phone');
  await page.locator('[data-phone-action="more"]').click();
  const helpAction = page.locator('[data-phone-action="guide"]');
  await expect(helpAction).toBeVisible();
  await expect(helpAction.locator('small')).toHaveText('Help');
  await helpAction.click();

  await expect(page.locator('#figureloomHelpMenu')).toBeVisible();
  await expect(page.locator('#figureloomPhoneMoreSheet')).not.toHaveClass(/figureloom-phone-sheet-open/);
  await page.locator('#figureloomHelpMenu [data-help-tour]').click();
  await expect(page.locator('#scicanvasTour')).toHaveClass(/open/);
  await expect(page.locator('#scicanvasTour .tour-counter')).toContainText('of 12');
  await page.locator('#scicanvasTour [data-tour="close"]').click();
  expect(runtimeErrors).toEqual([]);
});
