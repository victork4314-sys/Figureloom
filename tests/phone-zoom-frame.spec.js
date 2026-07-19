const { test, expect } = require('@playwright/test');

async function preparePhone(page) {
  await page.addInitScript(() => {
    localStorage.setItem('scicanvas-guided-tour-v2', 'complete');
    localStorage.setItem('scicanvas-guided-tour-v3', 'complete');
    localStorage.setItem('scicanvas-welcome-v1', 'complete');
    localStorage.setItem('scicanvas-user-name-v1', 'Phone Zoom Test');
    localStorage.setItem('scicanvas-motion-v1', 'off');
    sessionStorage.setItem('figureloom-quick-start-dismissed', '1');
    localStorage.setItem('figureloom-settings-v1', JSON.stringify({
      interfaceMode:'phone',
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
  await page.waitForFunction(() => Boolean(window.FigureLoomPhoneZoomFrame && window.FigureLoomPhoneMode));
  await page.waitForTimeout(350);
}

test('phone header keeps only the new undo and redo SVG icons', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'phone-only regression');
  await preparePhone(page);

  for (const id of ['undoButton', 'redoButton']) {
    const result = await page.locator(`#${id}`).evaluate(button => ({
      icons:button.querySelectorAll('.figureloom-phone-header-icon').length,
      text:button.textContent.trim(),
      before:getComputedStyle(button, '::before').content,
      after:getComputedStyle(button, '::after').content
    }));
    expect(result.icons).toBe(1);
    expect(result.text).toBe('');
    expect(['none', 'normal', '""']).toContain(result.before);
    expect(['none', 'normal', '""']).toContain(result.after);
  }
});

test('phone zoom scales the real page without inventing blank canvas area', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'phone-only regression');
  await preparePhone(page);

  await page.evaluate(() => window.setZoom(1.6));
  await page.waitForTimeout(120);

  const geometry = await page.evaluate(() => {
    const stage = document.getElementById('canvasStage');
    const frame = document.getElementById('figureloomPhoneCanvasFrame');
    const canvas = document.getElementById('canvas');
    const stageStyle = getComputedStyle(stage);
    const frameRect = frame.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const paddingX = (parseFloat(stageStyle.paddingLeft) || 0) + (parseFloat(stageStyle.paddingRight) || 0);
    const paddingY = (parseFloat(stageStyle.paddingTop) || 0) + (parseFloat(stageStyle.paddingBottom) || 0);
    return {
      viewBox:canvas.getAttribute('viewBox'),
      inlineWidth:canvas.style.width,
      computedWidth:parseFloat(getComputedStyle(canvas).width),
      scale:parseFloat(frame.dataset.phoneZoom),
      frame:{ width:frameRect.width, height:frameRect.height, left:frameRect.left, top:frameRect.top, right:frameRect.right, bottom:frameRect.bottom },
      canvas:{ width:canvasRect.width, height:canvasRect.height, left:canvasRect.left, top:canvasRect.top, right:canvasRect.right, bottom:canvasRect.bottom },
      scroll:{ width:stage.scrollWidth, height:stage.scrollHeight, clientWidth:stage.clientWidth, clientHeight:stage.clientHeight, paddingX, paddingY },
      frameOffset:{ width:frame.offsetWidth, height:frame.offsetHeight }
    };
  });

  expect(geometry.viewBox).toBe('0 0 1200 750');
  expect(geometry.inlineWidth).toBe('1920px');
  expect(geometry.scale).toBeCloseTo(2, 2);
  expect(geometry.computedWidth).toBeLessThan(600);
  expect(Math.abs(geometry.frame.width - geometry.canvas.width)).toBeLessThanOrEqual(1.5);
  expect(Math.abs(geometry.frame.height - geometry.canvas.height)).toBeLessThanOrEqual(1.5);
  expect(Math.abs(geometry.frame.left - geometry.canvas.left)).toBeLessThanOrEqual(1.5);
  expect(Math.abs(geometry.frame.top - geometry.canvas.top)).toBeLessThanOrEqual(1.5);
  expect(Math.abs(geometry.frame.right - geometry.canvas.right)).toBeLessThanOrEqual(1.5);
  expect(Math.abs(geometry.frame.bottom - geometry.canvas.bottom)).toBeLessThanOrEqual(1.5);

  const expectedScrollWidth = Math.max(geometry.scroll.clientWidth, geometry.frameOffset.width + geometry.scroll.paddingX);
  const expectedScrollHeight = Math.max(geometry.scroll.clientHeight, geometry.frameOffset.height + geometry.scroll.paddingY);
  expect(Math.abs(geometry.scroll.width - expectedScrollWidth)).toBeLessThanOrEqual(3);
  expect(Math.abs(geometry.scroll.height - expectedScrollHeight)).toBeLessThanOrEqual(3);
});

test('objects drag to every real canvas edge while phone canvas is zoomed', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'phone-only regression');
  await preparePhone(page);

  await page.evaluate(() => {
    document.getElementById('addShapeButton').click();
    window.setZoom(1.6);
  });
  await page.waitForTimeout(120);

  async function dragObjectTo(clientX, clientY, pointerId) {
    const object = page.locator('#objectLayer .canvas-object').first();
    const box = await object.boundingBox();
    const start = { clientX:box.x + box.width / 2, clientY:box.y + box.height / 2, pointerId, pointerType:'touch', isPrimary:true, buttons:1 };
    await object.dispatchEvent('pointerdown', start);
    await page.locator('#canvas').dispatchEvent('pointermove', { clientX, clientY, pointerId, pointerType:'touch', isPrimary:true, buttons:1 });
    await page.locator('#canvas').dispatchEvent('pointerup', { clientX, clientY, pointerId, pointerType:'touch', isPrimary:true, buttons:0 });
    await page.waitForTimeout(40);
  }

  const canvasBox = await page.locator('#canvas').boundingBox();
  await dragObjectTo(canvasBox.x + canvasBox.width - 8, canvasBox.y + canvasBox.height - 8, 31);
  let position = await page.locator('#objectLayer .canvas-object').first().getAttribute('transform');
  let match = position.match(/translate\(([-\d.]+)\s+([-\d.]+)\)/);
  expect(Number(match[1])).toBeGreaterThanOrEqual(980);
  expect(Number(match[2])).toBeGreaterThanOrEqual(615);

  await dragObjectTo(canvasBox.x + 4, canvasBox.y + 4, 32);
  position = await page.locator('#objectLayer .canvas-object').first().getAttribute('transform');
  match = position.match(/translate\(([-\d.]+)\s+([-\d.]+)\)/);
  expect(Number(match[1])).toBeLessThanOrEqual(10);
  expect(Number(match[2])).toBeLessThanOrEqual(10);
});