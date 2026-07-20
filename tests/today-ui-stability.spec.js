const { test, expect } = require('@playwright/test');

async function prepare(page, interfaceMode) {
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.addInitScript(mode => {
    localStorage.setItem('scicanvas-guided-tour-v2', 'complete');
    localStorage.setItem('scicanvas-guided-tour-v3', 'complete');
    localStorage.setItem('scicanvas-welcome-v1', 'complete');
    localStorage.setItem('scicanvas-user-name-v1', 'UI Stability Test');
    localStorage.setItem('scicanvas-motion-v1', 'off');
    localStorage.setItem('figureloom-interface-theme-v1', 'light');
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
    window.FigureLoomSettings &&
    window.FigureLoomHelpCenter &&
    window.FigureLoomTodayUiStability &&
    document.documentElement.dataset.figureloomReady === '1'
  ), null, { timeout:40000 });
  await page.waitForTimeout(300);

  return { consoleErrors, pageErrors };
}

function expectNoRuntimeErrors(errors) {
  expect(errors.pageErrors, `Uncaught page errors:\n${errors.pageErrors.join('\n')}`).toEqual([]);
  expect(errors.consoleErrors, `Console errors:\n${errors.consoleErrors.join('\n')}`).toEqual([]);
}

test('desktop project tabs, avatar, Pages controls, Data checks and Review density stay compact', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop-only UI density check');
  const errors = await prepare(page, 'desktop');
  await expect(page.locator('html')).toHaveAttribute('data-figureloom-device-class', 'desktop');

  await page.evaluate(() => {
    let rail = document.getElementById('projectTabRail');
    if (!rail) {
      rail = document.createElement('nav');
      rail.id = 'projectTabRail';
      rail.innerHTML = '<div class="project-tab-scroll"></div><div class="project-tab-tools"><button class="project-tab-add" type="button">+</button></div>';
      document.body.appendChild(rail);
    }
    let scroll = rail.querySelector('.project-tab-scroll');
    if (!scroll) {
      scroll = document.createElement('div');
      scroll.className = 'project-tab-scroll';
      rail.prepend(scroll);
    }
    let tools = rail.querySelector('.project-tab-tools');
    if (!tools) {
      tools = document.createElement('div');
      tools.className = 'project-tab-tools';
      rail.appendChild(tools);
    }
    if (!tools.querySelector('.project-tab-add')) {
      const add = document.createElement('button');
      add.type = 'button';
      add.className = 'project-tab-add';
      add.textContent = '+';
      tools.prepend(add);
    }
    if (!scroll.querySelector('.project-tab-wrap')) {
      const wrap = document.createElement('div');
      wrap.className = 'project-tab-wrap';
      wrap.innerHTML = '<button class="project-tab active" type="button"><span>Untitled figure</span></button><button class="project-tab-close" type="button">×</button>';
      scroll.appendChild(wrap);
    }
    window.FigureLoomTodayUiStability.ensureInlineProjectAdd();
  });

  const inlineAdd = page.locator('#projectTabRail .project-tab-scroll>.project-tab-add-inline');
  await expect(inlineAdd).toBeVisible();

  const tabGeometry = await page.evaluate(() => {
    const scroll = document.querySelector('#projectTabRail .project-tab-scroll');
    const wrap = scroll.querySelector('.project-tab-wrap');
    const tab = wrap.querySelector('.project-tab');
    const close = wrap.querySelector('.project-tab-close');
    const add = scroll.querySelector('.project-tab-add-inline');
    const outer = wrap.getBoundingClientRect();
    const body = tab.getBoundingClientRect();
    const x = close.getBoundingClientRect();
    const plus = add.getBoundingClientRect();
    return {
      inlineParent:add.parentElement === scroll,
      inlineLast:scroll.lastElementChild === add,
      closeCenterDifference:Math.abs((body.top + body.bottom) / 2 - (x.top + x.bottom) / 2),
      closeInside:x.right <= outer.right + 1 && x.top >= outer.top - 1 && x.bottom <= outer.bottom + 1,
      plusAfterTab:plus.left >= outer.right - 1,
      plusSize:{ width:plus.width, height:plus.height },
      originalDisplay:getComputedStyle(document.querySelector('#projectTabRail .project-tab-tools>.project-tab-add')).display
    };
  });
  expect(tabGeometry.inlineParent).toBe(true);
  expect(tabGeometry.inlineLast).toBe(true);
  expect(tabGeometry.closeCenterDifference).toBeLessThanOrEqual(4);
  expect(tabGeometry.closeInside).toBe(true);
  expect(tabGeometry.plusAfterTab).toBe(true);
  expect(tabGeometry.plusSize.width).toBe(28);
  expect(tabGeometry.plusSize.height).toBe(28);
  expect(tabGeometry.originalDisplay).toBe('none');

  const desktopGeometry = await page.evaluate(() => {
    const avatar = document.getElementById('accountProfileButton');
    const avatarDot = getComputedStyle(avatar, '::after');
    const heading = document.querySelector('.left-panel>.panel-heading:first-of-type');
    const add = document.getElementById('addPageButton').getBoundingClientRect();
    const remove = document.getElementById('deletePageButton').getBoundingClientRect();
    const headingRect = heading.getBoundingClientRect();
    return {
      avatarOverflow:getComputedStyle(avatar).overflow,
      avatarRight:Number.parseFloat(avatarDot.right),
      avatarBottom:Number.parseFloat(avatarDot.bottom),
      add:{ width:add.width, height:add.height, left:add.left, right:add.right },
      remove:{ width:remove.width, height:remove.height, left:remove.left, right:remove.right },
      heading:{ left:headingRect.left, right:headingRect.right }
    };
  });
  expect(desktopGeometry.avatarOverflow).toBe('visible');
  expect(desktopGeometry.avatarRight).toBeLessThan(0);
  expect(desktopGeometry.avatarBottom).toBeLessThan(0);
  expect(desktopGeometry.add.width).toBe(28);
  expect(desktopGeometry.add.height).toBe(28);
  expect(desktopGeometry.remove.width).toBe(28);
  expect(desktopGeometry.remove.height).toBe(28);
  expect(desktopGeometry.remove.left - desktopGeometry.add.right).toBeLessThanOrEqual(5);
  expect(desktopGeometry.add.left).toBeGreaterThan(desktopGeometry.heading.left + (desktopGeometry.heading.right - desktopGeometry.heading.left) / 2);

  await page.evaluate(() => window.openDataLab?.());
  await expect(page.locator('#dataLabDrawer')).toHaveClass(/open/);
  await expect(page.locator('#dataShowLegend')).toBeVisible();
  const dataCheckbox = await page.locator('#dataShowLegend').boundingBox();
  expect(dataCheckbox.width).toBeLessThanOrEqual(14);
  expect(dataCheckbox.height).toBeLessThanOrEqual(14);

  await page.evaluate(() => window.openReviewTools?.());
  const review = page.locator('#reviewProDrawer');
  await expect(review).toHaveClass(/open/);
  const reviewMetrics = await page.evaluate(() => {
    const drawer = document.getElementById('reviewProDrawer');
    const summary = drawer.querySelector('.review-section>summary');
    const button = drawer.querySelector('.review-actions button,.utility-action');
    const checkbox = drawer.querySelector('input[type="checkbox"]');
    const checkboxRect = checkbox.getBoundingClientRect();
    return {
      summaryFont:Number.parseFloat(getComputedStyle(summary).fontSize),
      buttonFont:Number.parseFloat(getComputedStyle(button).fontSize),
      buttonHeight:button.getBoundingClientRect().height,
      checkboxWidth:checkboxRect.width,
      checkboxHeight:checkboxRect.height
    };
  });
  expect(reviewMetrics.summaryFont).toBeLessThanOrEqual(10);
  expect(reviewMetrics.buttonFont).toBeLessThanOrEqual(9);
  expect(reviewMetrics.buttonHeight).toBeLessThanOrEqual(31);
  expect(reviewMetrics.checkboxWidth).toBeLessThanOrEqual(14);
  expect(reviewMetrics.checkboxHeight).toBeLessThanOrEqual(14);

  expectNoRuntimeErrors(errors);
});

test('Phone Data and Review controls use compact checkbox, font and button sizing', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'phone Data and Review scale check');
  const errors = await prepare(page, 'phone');
  await expect(page.locator('html')).toHaveAttribute('data-figureloom-resolved-mode', 'phone');

  await page.evaluate(() => window.openDataLab?.());
  const dataDrawer = page.locator('#dataLabDrawer');
  await expect(dataDrawer).toHaveClass(/open/);
  const dataCheckboxes = await dataDrawer.locator('.data-check-grid input[type="checkbox"],.data-inline-check input[type="checkbox"]').evaluateAll(nodes =>
    nodes.map(node => {
      const rect = node.getBoundingClientRect();
      return { width:rect.width, height:rect.height };
    })
  );
  expect(dataCheckboxes.length).toBeGreaterThan(0);
  for (const checkbox of dataCheckboxes) {
    expect(checkbox.width).toBeGreaterThanOrEqual(14);
    expect(checkbox.width).toBeLessThanOrEqual(20);
    expect(checkbox.height).toBeGreaterThanOrEqual(14);
    expect(checkbox.height).toBeLessThanOrEqual(20);
  }

  await page.evaluate(() => document.getElementById('dataLabDrawer')?.classList.remove('open'));
  await page.evaluate(() => window.openReviewTools?.());
  const reviewDrawer = page.locator('#reviewProDrawer');
  await expect(reviewDrawer).toHaveClass(/open/);

  const reviewScale = await reviewDrawer.evaluate(drawer => {
    const summary = drawer.querySelector('.review-section>summary');
    const textarea = drawer.querySelector('#reviewCommentInput');
    const button = drawer.querySelector('#addReviewComment');
    const checkbox = drawer.querySelector('#showResolvedComments');
    const checkboxRect = checkbox.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    return {
      summaryFont:parseFloat(getComputedStyle(summary).fontSize),
      textareaFont:parseFloat(getComputedStyle(textarea).fontSize),
      buttonFont:parseFloat(getComputedStyle(button).fontSize),
      buttonHeight:buttonRect.height,
      checkboxWidth:checkboxRect.width,
      checkboxHeight:checkboxRect.height
    };
  });

  expect(reviewScale.summaryFont).toBeLessThanOrEqual(13);
  expect(reviewScale.textareaFont).toBeLessThanOrEqual(13);
  expect(reviewScale.buttonFont).toBeLessThanOrEqual(12);
  expect(reviewScale.buttonHeight).toBeGreaterThanOrEqual(36);
  expect(reviewScale.buttonHeight).toBeLessThanOrEqual(42);
  expect(reviewScale.checkboxWidth).toBeLessThanOrEqual(20);
  expect(reviewScale.checkboxHeight).toBeLessThanOrEqual(20);

  expectNoRuntimeErrors(errors);
});

test('Phone More Help opens Help and the expanded passive guide without runtime errors', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'phone Help regression check');
  const errors = await prepare(page, 'phone');

  await expect(page.locator('html')).toHaveAttribute('data-figureloom-resolved-mode', 'phone');
  await page.locator('[data-phone-action="more"]').click();
  await expect(page.locator('#figureloomPhoneMoreSheet')).toBeVisible();
  await page.locator('[data-phone-action="guide"]').click();

  const help = page.locator('#figureloomHelpMenu');
  await expect(help).toBeVisible();
  await expect(help).toContainText('Need a hand?');
  await help.locator('[data-help-tour]').click();

  const tour = page.locator('#scicanvasTour');
  await expect(tour).toHaveClass(/open/);
  const stepCount = await page.evaluate(() => window.FigureLoomPassiveGuide?.steps || 0);
  expect(stepCount).toBeGreaterThanOrEqual(10);
  await expect(tour.locator('.tour-progress')).toHaveText(`1 of ${stepCount}`);

  for (let step = 2; step <= stepCount; step += 1) {
    await tour.locator('[data-tour="next"]').click();
    await expect(tour.locator('.tour-progress')).toHaveText(`${step} of ${stepCount}`);
  }
  await tour.locator('[data-tour="next"]').click();
  await expect(tour).not.toHaveClass(/open/);

  expectNoRuntimeErrors(errors);
});