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

test('desktop tabs use one box for title and close, with compact Recovery History', async ({ page }, testInfo) => {
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
    if (!rail.querySelector('.project-tab-add')) {
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
    window.FigureLoomTodayUiStability.refreshDesktop();
  });

  const realAdd = page.locator('#projectTabRail .project-tab-scroll>.project-tab-add');
  await expect(realAdd).toBeVisible();
  await expect(page.locator('#projectTabRail .project-tab-add-inline')).toHaveCount(0);

  const tabGeometry = await page.evaluate(() => {
    const scroll = document.querySelector('#projectTabRail .project-tab-scroll');
    const wrap = scroll.querySelector('.project-tab-wrap');
    const tab = wrap.querySelector('.project-tab');
    const close = wrap.querySelector('.project-tab-close');
    const add = scroll.querySelector('.project-tab-add');
    const outer = wrap.getBoundingClientRect();
    const body = tab.getBoundingClientRect();
    const x = close.getBoundingClientRect();
    const plus = add.getBoundingClientRect();
    const wrapperStyle = getComputedStyle(wrap);
    const tabStyle = getComputedStyle(tab);
    return {
      addIsOriginal:add.classList.contains('project-tab-add'),
      addParent:add.parentElement === scroll,
      addLast:scroll.lastElementChild === add,
      closeCenterDifference:Math.abs((body.top + body.bottom) / 2 - (x.top + x.bottom) / 2),
      closeInside:x.left >= outer.left && x.right <= outer.right + 1 && x.top >= outer.top - 1 && x.bottom <= outer.bottom + 1,
      plusAfterTab:plus.left >= outer.right - 1,
      plusSize:{ width:plus.width, height:plus.height },
      wrapperBorder:Number.parseFloat(wrapperStyle.borderTopWidth),
      wrapperRadius:Number.parseFloat(wrapperStyle.borderTopLeftRadius),
      tabBorder:Number.parseFloat(tabStyle.borderTopWidth),
      tabBackground:tabStyle.backgroundColor
    };
  });

  expect(tabGeometry.addIsOriginal).toBe(true);
  expect(tabGeometry.addParent).toBe(true);
  expect(tabGeometry.addLast).toBe(true);
  expect(tabGeometry.closeCenterDifference).toBeLessThanOrEqual(4);
  expect(tabGeometry.closeInside).toBe(true);
  expect(tabGeometry.plusAfterTab).toBe(true);
  expect(tabGeometry.plusSize.width).toBe(29);
  expect(tabGeometry.plusSize.height).toBe(29);
  expect(tabGeometry.wrapperBorder).toBeGreaterThanOrEqual(1);
  expect(tabGeometry.wrapperRadius).toBeGreaterThanOrEqual(8);
  expect(tabGeometry.tabBorder).toBe(0);
  expect(tabGeometry.tabBackground).toBe('rgba(0, 0, 0, 0)');

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

  const recoveryMetrics = await page.evaluate(() => {
    const drawer = document.getElementById('historyDrawer');
    drawer.classList.add('open');
    const body = drawer.querySelector('.utility-body');
    if (!body.querySelector('.snapshot')) {
      const snapshot = document.createElement('div');
      snapshot.className = 'snapshot';
      snapshot.innerHTML = '<div><strong>Automatic recovery</strong><small>Today · 4 objects</small></div><button type="button">Restore</button>';
      body.appendChild(snapshot);
    }
    const title = drawer.querySelector('.utility-head strong');
    const subtitle = drawer.querySelector('.utility-head span');
    const snapshot = drawer.querySelector('.snapshot');
    const strong = snapshot.querySelector('strong');
    const small = snapshot.querySelector('small');
    const button = snapshot.querySelector('button');
    return {
      titleFont:Number.parseFloat(getComputedStyle(title).fontSize),
      subtitleFont:Number.parseFloat(getComputedStyle(subtitle).fontSize),
      entryFont:Number.parseFloat(getComputedStyle(strong).fontSize),
      timestampFont:Number.parseFloat(getComputedStyle(small).fontSize),
      buttonFont:Number.parseFloat(getComputedStyle(button).fontSize),
      buttonHeight:button.getBoundingClientRect().height
    };
  });
  expect(recoveryMetrics.titleFont).toBeLessThanOrEqual(10.5);
  expect(recoveryMetrics.subtitleFont).toBeLessThanOrEqual(8.5);
  expect(recoveryMetrics.entryFont).toBeLessThanOrEqual(9.5);
  expect(recoveryMetrics.timestampFont).toBeLessThanOrEqual(8);
  expect(recoveryMetrics.buttonFont).toBeLessThanOrEqual(8.5);
  expect(recoveryMetrics.buttonHeight).toBeLessThanOrEqual(28);

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
