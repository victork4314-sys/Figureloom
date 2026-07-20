const { test, expect } = require('@playwright/test');

async function prepare(page) {
  await page.addInitScript(() => {
    localStorage.setItem('scicanvas-guided-tour-v2', 'complete');
    localStorage.setItem('scicanvas-guided-tour-v3', 'complete');
    localStorage.setItem('scicanvas-welcome-v1', 'complete');
    localStorage.setItem('scicanvas-user-name-v1', 'Office Polish Test');
    localStorage.setItem('scicanvas-motion-v1', 'off');
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
    window.__figureLoomOfficeThemeFontExpansionV1 &&
    window.__figureLoomAccountInspectorFitPolishV1
  ));
}

test('office themes and editorial fonts are available and apply', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop library regression');
  await prepare(page);

  await page.evaluate(() => {
    document.getElementById('designDrawer')?.classList.add('open');
    document.getElementById('fontLibraryDrawer')?.classList.add('open');
  });

  const themes = page.locator('.office-style-library .theme-card');
  const fonts = page.locator('.office-font-library .font-card');
  await expect(themes).toHaveCount(8);
  await expect(fonts).toHaveCount(14);
  await expect(page.locator('select optgroup[label="Office & editorial"] option')).toHaveCount(14);
  await expect(themes.filter({ hasText:'Office Neutrals' })).toHaveCount(1);
  await expect(fonts.filter({ hasText:'Carlito' })).toHaveCount(1);

  await page.evaluate(() => { state.selectedId = null; });
  await fonts.filter({ hasText:'Carlito' }).click();
  expect(await page.evaluate(() => state.defaultFont)).toBe('Carlito');

  await page.evaluate(() => document.getElementById('fontLibraryDrawer')?.classList.remove('open'));
  await expect(page.locator('#fontLibraryDrawer')).not.toHaveClass(/open/);
  await expect(page.locator('#designDrawer')).toHaveClass(/open/);
  await themes.filter({ hasText:'Office Neutrals' }).click();
  const applied = await page.evaluate(() => {
    const page = state.pages?.[state.activePage] || null;
    return {
      pack:state.officeStylePack,
      libraryPack:state.libraryStylePack,
      background:page?.background || null
    };
  });
  expect(applied.pack).toBe('office-neutrals');
  expect(applied.libraryPack).toBeFalsy();
  expect(applied.background?.primary).toBe('#fbfbfa');
});

test('inspector labels stay inside their controls without splitting words', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop inspector regression');
  await prepare(page);
  await page.evaluate(() => makeObject('text'));

  const horizontal = page.locator('.text-layout-buttons[data-text-horizontal]');
  const vertical = page.locator('.text-layout-buttons[data-text-vertical]');
  await expect(horizontal).toBeVisible();
  await expect(vertical).toBeVisible();

  const result = await page.evaluate(() => {
    const inspect = selector => {
      const group = document.querySelector(selector);
      const style = getComputedStyle(group);
      return {
        display:style.display,
        columns:style.gridTemplateColumns.split(' ').filter(Boolean).length,
        buttons:[...group.querySelectorAll('button')].map(button => {
          const computed = getComputedStyle(button);
          return {
            text:button.textContent.trim(),
            whiteSpace:computed.whiteSpace,
            wordBreak:computed.wordBreak,
            fitsWidth:button.scrollWidth <= button.clientWidth + 1,
            fitsHeight:button.scrollHeight <= button.clientHeight + 1
          };
        })
      };
    };
    const richLabels = [...document.querySelectorAll('#figureloomRichTextControls .rich-inspector-grid label')].map(label => {
      const input = label.querySelector('input,select');
      const a = label.getBoundingClientRect();
      const b = input.getBoundingClientRect();
      return { inside:b.left >= a.left - 1 && b.right <= a.right + 1, width:b.width, labelWidth:a.width };
    });
    return { horizontal:inspect('[data-text-horizontal]'), vertical:inspect('[data-text-vertical]'), richLabels };
  });

  expect(result.horizontal.display).toBe('grid');
  expect(result.horizontal.columns).toBe(2);
  expect(result.vertical.columns).toBe(3);
  for (const button of [...result.horizontal.buttons, ...result.vertical.buttons]) {
    expect(button.whiteSpace).toBe('nowrap');
    expect(button.wordBreak).toBe('normal');
    expect(button.fitsWidth, button.text).toBe(true);
    expect(button.fitsHeight, button.text).toBe(true);
  }
  expect(result.richLabels.length).toBeGreaterThanOrEqual(6);
  expect(result.richLabels.every(label => label.inside && label.width <= label.labelWidth + 1)).toBe(true);
});

test('signed-in profile keeps Edit name and Sign out in one box', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop account regression');
  await prepare(page);
  await page.evaluate(() => {
    document.getElementById('cloudGalleryDrawer')?.classList.add('open');
    const cloud = window.SciCanvasCloud;
    cloud.getUser = () => ({ email:'office@example.com', user_metadata:{ full_name:'Office Polish Test' } });
    document.getElementById('cloudSignedIn').hidden = false;
    window.FigureLoomAccountInspectorFit.sync();
  });

  const card = page.locator('#scAccountProfileCard');
  const actions = card.locator('.sc-profile-actions');
  const edit = actions.locator('#scProfileEditName');
  const signOut = actions.locator('#cloudSignOut');
  await expect(card).toBeVisible();
  await expect(edit).toBeVisible();
  await expect(signOut).toBeVisible();
  await expect(page.locator('#cloudGalleryDrawer')).toHaveAttribute('data-figureloom-profile-state', 'signed-in');

  const layout = await page.evaluate(() => {
    const edit = document.getElementById('scProfileEditName');
    const signOut = document.getElementById('cloudSignOut');
    const panel = document.querySelector('#cloudGalleryDrawer .cloud-account-panel');
    return {
      sameParent:edit.parentElement === signOut.parentElement,
      editHeight:edit.getBoundingClientRect().height,
      signOutHeight:signOut.getBoundingClientRect().height,
      panelDisplay:getComputedStyle(panel).display
    };
  });
  expect(layout.sameParent).toBe(true);
  expect(Math.abs(layout.editHeight - layout.signOutHeight)).toBeLessThanOrEqual(1);
  expect(layout.panelDisplay).toBe('none');
});