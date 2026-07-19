const { test, expect } = require('@playwright/test');

async function prepare(page, interfaceMode) {
  await page.addInitScript(mode => {
    localStorage.setItem('scicanvas-guided-tour-v2', 'complete');
    localStorage.setItem('scicanvas-guided-tour-v3', 'complete');
    localStorage.setItem('scicanvas-welcome-v1', 'complete');
    localStorage.setItem('scicanvas-user-name-v1', 'History Test');
    localStorage.setItem('scicanvas-motion-v1', 'off');
    localStorage.removeItem('scicanvas-document');
    localStorage.setItem('figureloom-settings-v1', JSON.stringify({
      interfaceMode:mode,
      textSize:'standard',
      largerControls:false,
      strongFocus:false,
      reduceMotion:false,
      highContrast:false,
      underlineLinks:false,
      readableFont:false
    }));
    sessionStorage.setItem('figureloom-quick-start-dismissed', '1');
  }, interfaceMode);
  await page.goto('/');
  await expect(page.locator('#canvas')).toBeVisible();
  await page.waitForFunction(() => Boolean(
    document.documentElement.dataset.figureloomReady === '1' &&
    window.__figureLoomDesktopHistoryActionsV3 &&
    window.FigureLoomDesktopHistoryActions
  ));
  if (interfaceMode === 'desktop') await expect(page.locator('#figureloomShapesButton')).toBeAttached();
}

async function placement(page) {
  return page.evaluate(() => {
    const undo = document.getElementById('undoButton');
    const redo = document.getElementById('redoButton');
    const remove = document.getElementById('deleteButton');
    const titleActions = document.querySelector('.title-actions');
    return {
      resolvedMode:document.documentElement.dataset.figureloomResolvedMode,
      moved:document.documentElement.dataset.figureloomDesktopHistoryActions === '1',
      sameGroup:undo.parentElement === remove.parentElement && redo.parentElement === remove.parentElement,
      order:[...remove.parentElement.children].filter(node => ['undoButton','redoButton','deleteButton'].includes(node.id)).map(node => node.id),
      undoInHeader:undo.parentElement === titleActions,
      redoInHeader:redo.parentElement === titleActions
    };
  });
}

async function ribbonStyles(page) {
  return page.evaluate(() => {
    const buttons = [...document.querySelectorAll('.ribbon .tool-group > button:not(.figureloom-legacy-shape-action)')]
      .filter(button => button.getClientRects().length && getComputedStyle(button).display !== 'none')
      .map(button => {
        const style = getComputedStyle(button);
        const rect = button.getBoundingClientRect();
        return {
          id:button.id,
          text:button.textContent.trim(),
          height:rect.height,
          width:rect.width,
          fontFamily:style.fontFamily,
          fontSize:style.fontSize,
          fontWeight:style.fontWeight,
          lineHeight:style.lineHeight,
          borderRadius:style.borderRadius,
          color:style.color,
          backgroundColor:style.backgroundColor,
          borderColor:style.borderColor
        };
      });
    return buttons;
  });
}

test('normal desktop uses one consistent ribbon button system', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop ribbon consistency');
  await prepare(page, 'desktop');

  const result = await placement(page);
  expect(result.resolvedMode).toBe('desktop');
  expect(result.moved).toBe(true);
  expect(result.sameGroup).toBe(true);
  expect(result.order).toEqual(['undoButton','redoButton','deleteButton']);
  expect(result.undoInHeader).toBe(false);
  expect(result.redoInHeader).toBe(false);

  const viewOrder = await page.evaluate(() => {
    const fit = document.getElementById('fitButton');
    const grid = document.getElementById('gridToggle').closest('label');
    const snap = document.getElementById('snapToggle').closest('label');
    return [...fit.parentElement.children]
      .filter(node => node === fit || node === grid || node === snap)
      .map(node => node === fit ? 'fit' : node === grid ? 'grid' : 'snap');
  });
  expect(viewOrder).toEqual(['fit','grid','snap']);

  const buttons = await ribbonStyles(page);
  expect(buttons.length).toBeGreaterThanOrEqual(10);
  expect(new Set(buttons.map(button => Math.round(button.height * 10) / 10))).toEqual(new Set([36]));
  expect(new Set(buttons.map(button => button.fontFamily)).size).toBe(1);
  expect(new Set(buttons.map(button => button.fontSize))).toEqual(new Set(['13px']));
  expect(new Set(buttons.map(button => button.fontWeight))).toEqual(new Set(['600']));
  expect(new Set(buttons.map(button => button.lineHeight))).toEqual(new Set(['15.6px']));
  expect(new Set(buttons.map(button => button.borderRadius))).toEqual(new Set(['8px']));

  const history = ['undoButton','redoButton','deleteButton'].map(id => buttons.find(button => button.id === id));
  expect(history.every(Boolean)).toBe(true);
  expect(new Set(history.map(button => Math.round(button.width * 10) / 10))).toEqual(new Set([78]));

  const before = await page.evaluate(() => state.objects.length);
  await page.locator('#addTextButton:visible').click();
  await expect(page.locator('#undoButton')).toBeEnabled();
  expect(await page.evaluate(() => state.objects.length)).toBe(before + 1);

  const enabledStyle = await page.evaluate(() => ['addTextButton','undoButton','deleteButton'].map(id => {
    const style = getComputedStyle(document.getElementById(id));
    return { id, color:style.color, backgroundColor:style.backgroundColor, borderColor:style.borderColor, font:style.font };
  }));
  expect(new Set(enabledStyle.map(value => value.color)).size).toBe(1);
  expect(new Set(enabledStyle.map(value => value.backgroundColor)).size).toBe(1);
  expect(new Set(enabledStyle.map(value => value.borderColor)).size).toBe(1);
  expect(new Set(enabledStyle.map(value => value.font)).size).toBe(1);

  await page.locator('#undoButton').click();
  expect(await page.evaluate(() => state.objects.length)).toBe(before);
  await expect(page.locator('#redoButton')).toBeEnabled();
  await page.locator('#redoButton').click();
  expect(await page.evaluate(() => state.objects.length)).toBe(before + 1);
});

test('desktop interface on touch keeps the new placement and clears pressed color', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'touch desktop interface');
  await prepare(page, 'desktop');

  const result = await placement(page);
  expect(await page.evaluate(() => matchMedia('(pointer: coarse) and (hover: none)').matches)).toBe(true);
  expect(result.resolvedMode).toBe('desktop');
  expect(result.moved).toBe(true);
  expect(result.sameGroup).toBe(true);
  expect(result.order).toEqual(['undoButton','redoButton','deleteButton']);

  await page.locator('#addTextButton:visible').tap();
  const beforeTap = await page.locator('#deleteButton').evaluate(button => {
    const style = getComputedStyle(button);
    return { backgroundColor:style.backgroundColor, color:style.color, borderColor:style.borderColor };
  });
  await page.locator('#deleteButton').tap();
  await page.waitForTimeout(120);
  const afterTap = await page.locator('#deleteButton').evaluate(button => {
    const style = getComputedStyle(button);
    return { backgroundColor:style.backgroundColor, color:style.color, borderColor:style.borderColor, focused:document.activeElement === button };
  });
  expect(afterTap.focused).toBe(true);
  expect(afterTap.backgroundColor).toBe(beforeTap.backgroundColor);
  expect(afterTap.color).toBe(beforeTap.color);
  expect(afterTap.borderColor).toBe(beforeTap.borderColor);
});

test('phone interface keeps Undo and Redo in the header', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'phone interface protection');
  await prepare(page, 'phone');

  const result = await placement(page);
  expect(result.resolvedMode).toBe('phone');
  expect(result.moved).toBe(false);
  expect(result.undoInHeader).toBe(true);
  expect(result.redoInHeader).toBe(true);
  await expect(page.locator('html')).not.toHaveAttribute('data-figureloom-desktop-view-order', '1');
});
