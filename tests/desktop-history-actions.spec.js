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
    window.FigureLoomDesktopHistoryActions
  ));
}

test('mouse desktop places Undo and Redo directly beside Delete', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'mouse desktop placement');
  await prepare(page, 'desktop');

  await expect(page.locator('html')).toHaveAttribute('data-figureloom-desktop-history-actions', '1');
  const placement = await page.evaluate(() => {
    const undo = document.getElementById('undoButton');
    const redo = document.getElementById('redoButton');
    const remove = document.getElementById('deleteButton');
    const titleActions = document.querySelector('.title-actions');
    return {
      sameGroup:undo.parentElement === remove.parentElement && redo.parentElement === remove.parentElement,
      order:[...remove.parentElement.children].filter(node => ['undoButton','redoButton','deleteButton'].includes(node.id)).map(node => node.id),
      undoInHeader:undo.parentElement === titleActions,
      redoInHeader:redo.parentElement === titleActions
    };
  });
  expect(placement.sameGroup).toBe(true);
  expect(placement.order).toEqual(['undoButton','redoButton','deleteButton']);
  expect(placement.undoInHeader).toBe(false);
  expect(placement.redoInHeader).toBe(false);

  const boxes = await page.evaluate(() => ['undoButton','redoButton','deleteButton'].map(id => {
    const rect = document.getElementById(id).getBoundingClientRect();
    return { id, width:rect.width, height:rect.height, top:rect.top };
  }));
  expect(Math.max(...boxes.map(box => box.height)) - Math.min(...boxes.map(box => box.height))).toBeLessThanOrEqual(1);
  expect(Math.max(...boxes.map(box => box.top)) - Math.min(...boxes.map(box => box.top))).toBeLessThanOrEqual(1);
  expect(Math.abs(boxes[0].width - boxes[1].width)).toBeLessThanOrEqual(1);

  const before = await page.evaluate(() => state.objects.length);
  await page.locator('#addTextButton:visible').click();
  await expect(page.locator('#undoButton')).toBeEnabled();
  expect(await page.evaluate(() => state.objects.length)).toBe(before + 1);
  await page.locator('#undoButton').click();
  expect(await page.evaluate(() => state.objects.length)).toBe(before);
  await expect(page.locator('#redoButton')).toBeEnabled();
  await page.locator('#redoButton').click();
  expect(await page.evaluate(() => state.objects.length)).toBe(before + 1);
});

test('coarse-touch desktop interface keeps the header controls unchanged', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'coarse-touch protection');
  await prepare(page, 'desktop');

  const result = await page.evaluate(() => {
    const undo = document.getElementById('undoButton');
    const redo = document.getElementById('redoButton');
    const remove = document.getElementById('deleteButton');
    const titleActions = document.querySelector('.title-actions');
    return {
      coarseTouch:matchMedia('(pointer: coarse) and (hover: none)').matches,
      resolvedMode:document.documentElement.dataset.figureloomResolvedMode,
      moved:document.documentElement.dataset.figureloomDesktopHistoryActions === '1',
      undoInHeader:undo.parentElement === titleActions,
      redoInHeader:redo.parentElement === titleActions,
      deleteSeparate:remove.parentElement !== titleActions
    };
  });
  expect(result.coarseTouch).toBe(true);
  expect(result.resolvedMode).toBe('desktop');
  expect(result.moved).toBe(false);
  expect(result.undoInHeader).toBe(true);
  expect(result.redoInHeader).toBe(true);
  expect(result.deleteSeparate).toBe(true);
});
