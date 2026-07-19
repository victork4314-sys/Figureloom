const { test, expect } = require('@playwright/test');

async function prepare(page) {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('scicanvas-guided-tour-v2', 'complete');
    localStorage.setItem('scicanvas-guided-tour-v3', 'complete');
    localStorage.setItem('scicanvas-welcome-v1', 'complete');
    localStorage.setItem('scicanvas-user-name-v1', 'Theme Test');
    localStorage.setItem('figureloom-interface-theme-v1', 'dark');
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
  });
  await page.goto('/');
  await expect(page.locator('#canvas')).toBeVisible();
  await page.waitForFunction(() => Boolean(window.__figureLoomAdrianaPolishV2));
}

test('startup choice card uses the active FigureLoom theme', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop visual check');
  await prepare(page);

  const panel = page.locator('#figureloomQuickStartLite');
  await expect(panel).toBeVisible();

  const colors = await panel.evaluate(element => {
    const rootStyle = getComputedStyle(document.documentElement);
    const panelStyle = getComputedStyle(element);
    const beforeStyle = getComputedStyle(element, '::before');
    const probe = document.createElement('span');
    document.body.appendChild(probe);

    const normalizedColor = value => {
      probe.style.color = value;
      return getComputedStyle(probe).color;
    };
    const normalizedBackground = value => {
      probe.style.backgroundColor = value;
      return getComputedStyle(probe).backgroundColor;
    };

    const result = {
      text:panelStyle.color,
      border:panelStyle.borderTopColor,
      background:panelStyle.backgroundColor,
      accent:beforeStyle.backgroundColor,
      expectedText:normalizedColor(rootStyle.getPropertyValue('--figureloom-ui-text')),
      expectedLine:normalizedColor(rootStyle.getPropertyValue('--figureloom-ui-line')),
      expectedBackground:normalizedBackground(rootStyle.getPropertyValue('--figureloom-ui-surface-glass')),
      expectedAccent:normalizedBackground(rootStyle.getPropertyValue('--figureloom-ui-accent'))
    };
    probe.remove();
    return result;
  });

  expect(colors.text).toBe(colors.expectedText);
  expect(colors.border).toBe(colors.expectedLine);
  expect(colors.background).toBe(colors.expectedBackground);
  expect(colors.accent).toBe(colors.expectedAccent);
});

test('Adriana note is the final Pro tools item and uses the system sage accent', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop panel check');
  await prepare(page);

  await page.locator('#proToolsButton').click();
  const note = page.locator('#proToolsDrawer .pro-adriana-closing-note');
  await expect(note).toBeVisible();
  await expect(note).toHaveText('Made for Adriana M. K., who has been drafting me into unpaid lab work since I was small enough to fit under the bench.');

  const details = await note.evaluate(element => {
    const body = element.closest('.utility-body');
    const rootStyle = getComputedStyle(document.documentElement);
    const noteStyle = getComputedStyle(element);
    const probe = document.createElement('span');
    probe.style.color = rootStyle.getPropertyValue('--figureloom-ui-accent');
    document.body.appendChild(probe);
    const expectedAccent = getComputedStyle(probe).color;
    probe.style.color = rootStyle.getPropertyValue('--figureloom-ui-muted');
    const mutedText = getComputedStyle(probe).color;
    probe.remove();
    return {
      isLast:body?.lastElementChild === element,
      color:noteStyle.color,
      expectedAccent,
      mutedText,
      marginTop:parseFloat(noteStyle.marginTop)
    };
  });

  expect(details.isLast).toBe(true);
  expect(details.color).toBe(details.expectedAccent);
  expect(details.color).not.toBe(details.mutedText);
  expect(details.marginTop).toBeGreaterThanOrEqual(20);
});