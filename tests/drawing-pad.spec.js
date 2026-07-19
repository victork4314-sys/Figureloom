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

  const box = await surface.boundingBox();
  const start = { x:box.x + box.width * 0.2, y:box.y + box.height * 0.35 };
  const middle = { x:box.x + box.width * 0.5, y:box.y + box.height * 0.65 };
  const end = { x:box.x + box.width * 0.8, y:box.y + box.height * 0.3 };
  const base = { pointerId:51, pointerType:'touch', isPrimary:true, button:0, buttons:1 };

  await surface.dispatchEvent('pointerdown', { ...base, clientX:start.x, clientY:start.y });
  await surface.dispatchEvent('pointermove', { ...base, clientX:middle.x, clientY:middle.y });
  await surface.dispatchEvent('pointermove', { ...base, clientX:end.x, clientY:end.y });
  await surface.dispatchEvent('pointerup', { ...base, buttons:0, clientX:end.x, clientY:end.y });

  await expect(pad.locator('[data-draw-strokes] path')).toHaveCount(1);
  await expect(pad.locator('[data-draw-insert]')).toBeEnabled();
  await pad.locator('[data-draw-insert]').click();

  await expect(pad).toBeHidden();
  await expect(page.locator('#objectLayer .canvas-object')).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => state.objects.at(-1)?.type)).toBe('drawingPad');
});
