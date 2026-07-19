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
  await page.waitForFunction(() => Boolean(window.__figureLoomTouchDrawingPadInstalled && window.FigureLoomDrawingPad));
}

async function drawStroke(surface, pointerId, points) {
  const box = await surface.boundingBox();
  const mapped = points.map(([x, y]) => ({ clientX:box.x + box.width * x, clientY:box.y + box.height * y }));
  const base = { pointerId, pointerType:'touch', isPrimary:true, button:0, buttons:1 };
  await surface.dispatchEvent('pointerdown', { ...base, ...mapped[0] });
  for (const point of mapped.slice(1)) await surface.dispatchEvent('pointermove', { ...base, ...point });
  await surface.dispatchEvent('pointerup', { ...base, buttons:0, ...mapped.at(-1) });
}

async function insertDrawing(page) {
  await page.locator('[data-phone-action="tools"]').click();
  await page.locator('#figureloomDrawButton').click();
  const pad = page.locator('#figureloomDrawPad');
  const surface = pad.locator('[data-draw-surface]');
  await expect(pad).toBeVisible();
  await expect(surface).toBeVisible();
  await drawStroke(surface, 51, [[.2,.35],[.5,.65],[.8,.3]]);
  await expect(pad.locator('[data-draw-strokes] path')).toHaveCount(1);
  await expect(pad.locator('[data-draw-insert]')).toBeEnabled();
  await pad.locator('[data-draw-insert]').click();
  await expect(pad).toBeHidden();
  return { pad, surface };
}

test('touch drawing pad records a finger stroke and inserts it as one object', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'touch-specific drawing check');
  await prepare(page, 'phone');

  const { pad } = await insertDrawing(page);
  await expect(page.locator('#canvas')).not.toHaveClass(/figureloom-draw-active/);
  await expect(pad).toBeHidden();
  await expect(page.locator('#objectLayer .canvas-object')).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => state.objects.at(-1)?.type)).toBe('drawingPad');
});

test('inserted drawing has a full drag surface and moves like every other object', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'touch drawing movement check');
  await prepare(page, 'phone');
  await insertDrawing(page);

  const hitArea = page.locator('#objectLayer .drawing-pad-object .drawing-pad-hit-area');
  await expect(hitArea).toBeVisible();
  const before = await page.evaluate(() => ({ x:state.objects[0].x, y:state.objects[0].y }));
  const box = await hitArea.boundingBox();
  const start = { x:box.x + box.width * .5, y:box.y + box.height * .5 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 42, start.y + 28, { steps:5 });
  await page.mouse.up();

  await expect.poll(() => page.evaluate(({ x, y }) => {
    const item = state.objects[0];
    return Math.abs(item.x - x) + Math.abs(item.y - y);
  }, before)).toBeGreaterThan(0);
});

test('a selected drawing can always be reopened and saved without creating a second object', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'touch drawing re-edit check');
  await prepare(page, 'phone');
  await insertDrawing(page);

  await page.locator('[data-phone-action="edit"]').click();
  const editButton = page.locator('#figureloomEditDrawingButton');
  await expect(editButton).toBeVisible();
  await expect(editButton).toBeEnabled();
  await editButton.click();

  const pad = page.locator('#figureloomDrawPad');
  const surface = pad.locator('[data-draw-surface]');
  await expect(pad).toBeVisible();
  await expect(pad.locator('#figureloomDrawPadTitle')).toHaveText('Edit drawing');
  await expect(pad.locator('[data-draw-strokes] path')).toHaveCount(1);
  await expect(pad.locator('[data-draw-insert]')).toHaveText('Save drawing');

  await drawStroke(surface, 52, [[.28,.2],[.42,.32],[.58,.18]]);
  await expect(pad.locator('[data-draw-strokes] path')).toHaveCount(2);
  await pad.locator('[data-draw-insert]').click();

  await expect(pad).toBeHidden();
  await expect(page.locator('#objectLayer .canvas-object')).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => state.objects[0]?.strokes?.length)).toBe(2);
});