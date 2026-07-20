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
  await page.waitForTimeout(250);

  return { consoleErrors, pageErrors };
}

function expectNoRuntimeErrors(errors) {
  expect(errors.pageErrors, `Uncaught page errors:\n${errors.pageErrors.join('\n')}`).toEqual([]);
  expect(errors.consoleErrors, `Console errors:\n${errors.consoleErrors.join('\n')}`).toEqual([]);
}

test('desktop project tab and Projects chip close controls stay beside their titles', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop-only close placement check');
  const errors = await prepare(page, 'desktop');

  const geometry = await page.evaluate(() => {
    let rail = document.getElementById('projectTabRail');
    if (!rail) {
      rail = document.createElement('nav');
      rail.id = 'projectTabRail';
      rail.innerHTML = '<div class="project-tab-scroll"></div>';
      document.body.appendChild(rail);
    }
    const scroll = rail.querySelector('.project-tab-scroll') || rail;
    const tabWrap = document.createElement('div');
    tabWrap.className = 'project-tab-wrap';
    tabWrap.innerHTML = '<button class="project-tab active" type="button"><span>Current project title</span></button><button class="project-tab-close" type="button">×</button>';
    scroll.appendChild(tabWrap);

    let projects = document.getElementById('projectsRibbonHost');
    if (!projects) {
      projects = document.createElement('section');
      projects.id = 'projectsRibbonHost';
      document.body.appendChild(projects);
    }
    const chipWrap = document.createElement('div');
    chipWrap.className = 'projects-chip-wrap';
    chipWrap.innerHTML = '<button class="projects-open-chip" type="button"><span>Current project title</span></button><button class="projects-chip-close" type="button">×</button>';
    projects.appendChild(chipWrap);

    const measure = (wrapper, title, close) => {
      const outer = wrapper.getBoundingClientRect();
      const body = title.getBoundingClientRect();
      const x = close.getBoundingClientRect();
      return {
        outer:{ left:outer.left, right:outer.right, top:outer.top, bottom:outer.bottom },
        title:{ left:body.left, right:body.right, top:body.top, bottom:body.bottom },
        close:{ left:x.left, right:x.right, top:x.top, bottom:x.bottom },
        centerDifference:Math.abs((body.top + body.bottom) / 2 - (x.top + x.bottom) / 2)
      };
    };

    return {
      tab:measure(tabWrap, tabWrap.querySelector('.project-tab'), tabWrap.querySelector('.project-tab-close')),
      chip:measure(chipWrap, chipWrap.querySelector('.projects-open-chip'), chipWrap.querySelector('.projects-chip-close'))
    };
  });

  for (const item of [geometry.tab, geometry.chip]) {
    expect(item.centerDifference).toBeLessThanOrEqual(4);
    expect(item.close.left).toBeGreaterThanOrEqual(item.title.left);
    expect(item.close.right).toBeLessThanOrEqual(item.outer.right + 1);
    expect(item.close.top).toBeGreaterThanOrEqual(item.outer.top - 1);
    expect(item.close.bottom).toBeLessThanOrEqual(item.outer.bottom + 1);
  }

  expectNoRuntimeErrors(errors);
});

test('Phone More Guide opens Help and the expanded passive tour without runtime errors', async ({ page }, testInfo) => {
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
  await expect(tour.locator('.tour-progress')).toHaveText('1 of 10');

  for (let step = 2; step <= 10; step += 1) {
    await tour.locator('[data-tour="next"]').click();
    await expect(tour.locator('.tour-progress')).toHaveText(`${step} of 10`);
  }
  await tour.locator('[data-tour="next"]').click();
  await expect(tour).not.toHaveClass(/open/);

  expectNoRuntimeErrors(errors);
});
