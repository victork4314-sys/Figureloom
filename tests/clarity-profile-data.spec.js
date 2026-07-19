const { test, expect } = require('@playwright/test');

async function prepare(page, mode = 'desktop') {
  await page.addInitScript(interfaceMode => {
    localStorage.setItem('scicanvas-guided-tour-v2', 'complete');
    localStorage.setItem('scicanvas-guided-tour-v3', 'complete');
    localStorage.setItem('scicanvas-welcome-v1', 'complete');
    localStorage.setItem('scicanvas-user-name-v1', 'Profile Test');
    localStorage.setItem('scicanvas-motion-v1', 'off');
    localStorage.setItem('figureloom-settings-v1', JSON.stringify({
      interfaceMode,
      textSize:'standard',
      largerControls:false,
      strongFocus:false,
      reduceMotion:false,
      highContrast:false,
      underlineLinks:false,
      readableFont:false
    }));
    sessionStorage.setItem('figureloom-quick-start-dismissed', '1');
  }, mode);
  await page.goto('/');
  await expect(page.locator('#canvas')).toBeVisible();
  await page.waitForFunction(() => Boolean(
    document.documentElement.dataset.figureloomReady === '1' &&
    window.FigureLoomNavigationClarity &&
    window.FigureLoomProfilePicture &&
    window.FigureLoomDataFeedback
  ));
}

test('workspace tabs use clearer names and descriptions', async ({ page }, testInfo) => {
  await prepare(page, testInfo.project.name === 'mobile' ? 'phone' : 'desktop');
  const expected = {
    home:'Basics',
    projects:'Projects',
    insert:'Add',
    science:'Library',
    layout:'Arrange',
    design:'Design',
    data:'Data',
    review:'Review'
  };
  for (const [tab, label] of Object.entries(expected)) {
    const button = page.locator(`.ribbon-tabs [data-tab="${tab}"]`);
    await expect(button).toHaveText(label);
    await expect(button).toHaveAttribute('title', /.+/);
    await expect(button).toHaveAttribute('aria-label', new RegExp(`^${label}:`));
  }
});

test('uploaded profile picture appears in Account and Share', async ({ page }, testInfo) => {
  const mobile = testInfo.project.name === 'mobile';
  await prepare(page, mobile ? 'phone' : 'desktop');
  if (mobile) {
    await page.locator('[data-phone-action="more"]').click();
    await expect(page.locator('#figureloomPhoneMoreSheet')).toBeVisible();
    await page.locator('#figureloomPhoneMoreSheet [data-phone-action="account"]').click();
  } else {
    await page.locator('#accountProfileButton').click();
  }

  const card = page.locator('#scAccountProfileCard');
  await expect(card).toBeVisible();
  await expect(card.locator('.scientific-avatar-picker [data-sc-avatar-plus]')).toHaveCount(6);
  await expect(card.locator('.scientific-avatar-picker [data-sc-avatar-upload]')).toBeVisible();

  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFElEQVR42mP8z8AARAwMDAxQAAAJAgEAff3vWQAAAABJRU5ErkJggg==', 'base64');
  await page.locator('#figureloomProfilePictureUpload').setInputFiles({ name:'profile.png', mimeType:'image/png', buffer:png });
  await page.waitForFunction(() => localStorage.getItem('scicanvas-profile-avatar-v1') === 'custom');
  await expect(page.locator('#accountProfileButton img.figureloom-profile-image')).toHaveCount(1);
  await expect(card.locator('[data-sc-avatar-preview] img.figureloom-profile-image')).toBeVisible();

  await page.evaluate(() => {
    document.getElementById('collaborationDrawer')?.classList.add('open');
    window.dispatchEvent(new CustomEvent('scicanvas-collaboration-opened'));
  });
  await expect(page.locator('#figureloomShareIdentity')).toBeVisible();
  await expect(page.locator('#figureloomShareIdentity strong')).toHaveText('Sharing as Profile Test');
  await expect(page.locator('#figureloomShareIdentity img.figureloom-profile-image')).toBeVisible();
});

test('invalid chart data stays in the drawer with a small inline message', async ({ page }, testInfo) => {
  await prepare(page, testInfo.project.name === 'mobile' ? 'phone' : 'desktop');
  let dialogCount = 0;
  page.on('dialog', async dialog => {
    dialogCount += 1;
    await dialog.dismiss();
  });

  await page.evaluate(() => window.openDataLab?.());
  await expect(page.locator('#dataLabDrawer')).toHaveClass(/open/);
  await page.locator('#dataVisual').selectOption('bar');
  const rawSource = page.locator('.data-raw-source');
  await rawSource.locator('summary').click();
  await expect(rawSource).toHaveAttribute('open', '');
  await page.locator('#dataPaste').fill('Condition,Value\nControl,not-a-number\nTreatment,still-text');
  const before = await page.evaluate(() => state.objects.length);
  await page.locator('#insertDataVisual').click();

  const feedback = page.locator('#figureloomDataFeedback');
  await expect(feedback).toBeVisible();
  await expect(feedback).toContainText('needs at least one numeric value');
  await expect(page.locator('#dataLabDrawer')).toHaveClass(/open/);
  expect(await page.evaluate(() => state.objects.length)).toBe(before);
  expect(dialogCount).toBe(0);

  const badFile = Buffer.from([0, 1, 2, 3, 4, 5]);
  await page.locator('[data-data-file]').setInputFiles({ name:'broken.csv', mimeType:'text/csv', buffer:badFile });
  await expect(feedback).toContainText('does not look like readable CSV or TSV');
  expect(dialogCount).toBe(0);
});
