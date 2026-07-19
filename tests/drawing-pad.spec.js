const { test, expect } = require('@playwright/test');

async function prepare(page, interfaceMode) {
  await page.addInitScript(mode => {
    localStorage.setItem('scicanvas-guided-tour-v2', 'complete');
    localStorage.setItem('scicanvas-guided-tour-v3', 'complete');
    localStorage.setItem('scicanvas-welcome-v1', 'complete');
    localStorage.setItem('scicanvas-user-name-v1', 'Drawing Test');
    localStorage.setItem('scicanvas-motion-v1', 'off');
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
  await page.waitForFunction(() => Boolean(window.__figureLoomTouchDrawingPadInstalled));
}

async function drawStroke(surface, pointerType = 'touch', pointerId = 51, verticalOffset = 0) {
  const box = await surface.boundingBox();
  const start = { x:box.x + box.width * 0.2, y:box.y + box.height * (0.3 + verticalOffset) };
  const middle = { x:box.x + box.width * 0.5, y:box.y + box.height * (0.6 + verticalOffset / 2) };
  const end = { x:box.x + box.width * 0.8, y:box.y + box.height * (0.28 + verticalOffset) };
  const base = { pointerId, pointerType, isPrimary:true, button:0, buttons:1 };
  await surface.dispatchEvent('pointerdown', { ...base, clientX:start.x, clientY:start.y });
  await surface.dispatchEvent('pointermove', { ...base, clientX:middle.x, clientY:middle.y });
  await surface.dispatchEvent('pointermove', { ...base, clientX:end.x, clientY:end.y });
  await surface.dispatchEvent('pointerup', { ...base, buttons:0, clientX:end.x, clientY:end.y });
}

test('touch drawing pad records a finger stroke and inserts it as one object', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'touch-specific drawing check');
  await prepare(page, 'phone');

  await page.locator('[data-phone-action="tools"]').click();
  await page.locator('#figureloomDrawButton').click();

  const pad = page.locator('#figureloomDrawPad');
  const surface = pad.locator('[data-draw-surface]');
  await expect(pad).toBeVisible();
  await expect(surface).toBeVisible();
  await expect(page.locator('#canvas')).not.toHaveClass(/figureloom-draw-active/);

  await drawStroke(surface);

  await expect(pad.locator('[data-draw-strokes] path')).toHaveCount(1);
  await expect(pad.locator('[data-draw-insert]')).toBeEnabled();
  await pad.locator('[data-draw-insert]').click();

  await expect(pad).toBeHidden();
  await expect(page.locator('#objectLayer .canvas-object')).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => state.objects.at(-1)?.type)).toBe('drawingPad');
});

test('a drawing has a full drag target and can always be reopened for editing', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop object behavior check');
  await prepare(page, 'desktop');

  await page.locator('#figureloomDrawButton').click();
  const pad = page.locator('#figureloomDrawPad');
  const surface = pad.locator('[data-draw-surface]');
  await drawStroke(surface, 'mouse', 61);
  await pad.locator('[data-draw-insert]').click();

  const before = await page.evaluate(() => {
    const item = state.objects.find(object => object.type === 'drawingPad');
    return { id:item.id, x:item.x, y:item.y, width:item.width, height:item.height };
  });
  const hitbox = page.locator(`#objectLayer .canvas-object[data-id="${before.id}"] .drawing-pad-hitbox`);
  await expect(hitbox).toBeVisible();
  const box = await hitbox.boundingBox();
  const start = { clientX:box.x + box.width / 2, clientY:box.y + box.height / 2, pointerId:73, pointerType:'mouse', isPrimary:true, button:0, buttons:1 };
  await hitbox.dispatchEvent('pointerdown', start);
  await page.locator('#canvas').dispatchEvent('pointermove', { ...start, clientX:start.clientX + 80, clientY:start.clientY + 45 });
  await page.locator('#canvas').dispatchEvent('pointerup', { ...start, buttons:0, clientX:start.clientX + 80, clientY:start.clientY + 45 });

  await expect.poll(() => page.evaluate(id => {
    const item = state.objects.find(object => object.id === id);
    return `${Math.round(item.x)},${Math.round(item.y)}`;
  }, before.id)).not.toBe(`${Math.round(before.x)},${Math.round(before.y)}`);

  await expect(page.locator('#figureloomDrawingEditSection')).toBeVisible();
  await page.locator('#figureloomEditDrawingButton').click();
  await expect(pad).toBeVisible();
  await expect(pad.locator('#figureloomDrawPadTitle')).toHaveText('Edit drawing');
  await expect(pad.locator('[data-draw-strokes] path')).toHaveCount(1);
  await expect(pad.locator('[data-draw-insert]')).toHaveText('Save drawing');

  await drawStroke(surface, 'mouse', 74, 0.12);
  await expect(pad.locator('[data-draw-strokes] path')).toHaveCount(2);
  await pad.locator('[data-draw-insert]').click();

  await expect(pad).toBeHidden();
  await expect(page.locator('#objectLayer .canvas-object')).toHaveCount(1);
  const after = await page.evaluate(id => {
    const item = state.objects.find(object => object.id === id);
    return { id:item?.id, strokes:item?.strokes?.length, width:item?.width, height:item?.height };
  }, before.id);
  expect(after.id).toBe(before.id);
  expect(after.strokes).toBe(2);
  expect(after.width).toBe(before.width);
  expect(after.height).toBe(before.height);
});