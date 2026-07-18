const { test, expect } = require('@playwright/test');

test('text boxes wrap, align, resize, and restore', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__figureLoomTextLayoutTools && document.getElementById('textBoxFlow')));
  await page.evaluate(() => document.getElementById('scWelcome')?.classList.remove('open'));

  await page.click('#addTextButton');
  const longText = 'A long scientific explanation should wrap naturally inside its text box instead of stretching into one enormous line across the figure. This second sentence gives the paragraph enough words to test justified alignment as well.';
  const content = page.locator('#textContent');
  await content.fill(longText);
  await content.blur();

  const created = await page.evaluate(() => {
    const item = state.objects.find(entry => entry.type === 'text');
    return item && {
      id:item.id,
      flow:item.textFlow,
      width:item.width,
      height:item.height,
      fontSize:item.fontSize,
      text:item.text
    };
  });
  expect(created).toBeTruthy();
  expect(created.flow).toBe('auto-height');
  expect(created.width).toBeGreaterThanOrEqual(280);
  expect(created.text).toBe(longText);
  expect(created.height).toBeGreaterThan(62);

  const group = page.locator(`#objectLayer .canvas-object[data-id="${created.id}"]`);
  await expect(group).toBeVisible();
  expect(await group.locator('text tspan').count()).toBeGreaterThan(2);

  await page.click('[data-text-horizontal] button[data-value="center"]');
  await expect(group.locator('text')).toHaveAttribute('text-anchor', 'middle');

  await page.click('[data-text-horizontal] button[data-value="justify"]');
  expect(await group.locator('text tspan[textLength]').count()).toBeGreaterThan(0);

  await page.selectOption('#textBoxFlow', 'wrap');
  await page.click('[data-text-vertical] button[data-value="bottom"]');
  await page.evaluate(id => {
    const item = state.objects.find(entry => entry.id === id);
    item.height = 450;
    render();
  }, created.id);

  const firstLineY = Number(await group.locator('text tspan').first().getAttribute('y'));
  expect(firstLineY).toBeGreaterThan(100);
  await expect(page.locator('.text-box-resize-hit')).toHaveCount(4);

  const beforeResize = await page.evaluate(id => {
    const item = state.objects.find(entry => entry.id === id);
    return { width:item.width, fontSize:item.fontSize };
  }, created.id);
  const eastHandle = page.locator('.text-box-resize-hit.resize-e');
  const box = await eastHandle.boundingBox();
  expect(box).toBeTruthy();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2, { steps:6 });
  await page.mouse.up();

  const afterResize = await page.evaluate(id => {
    const item = state.objects.find(entry => entry.id === id);
    return {
      width:item.width,
      fontSize:item.fontSize,
      flow:item.textFlow,
      align:item.textAlign,
      vertical:item.textVerticalAlign
    };
  }, created.id);
  expect(afterResize.width).toBeGreaterThan(beforeResize.width);
  expect(afterResize.fontSize).toBe(beforeResize.fontSize);
  expect(afterResize).toMatchObject({ flow:'wrap', align:'justify', vertical:'bottom' });

  await page.evaluate(async () => {
    syncPage?.();
    await vaultWrite('autosave', structuredClone(projectData()));
  });
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__figureLoomTextLayoutTools));
  await page.waitForFunction(expected => {
    const item = state.objects.find(entry => entry.type === 'text');
    const lineCount = item && document.querySelectorAll(`#objectLayer .canvas-object[data-id="${item.id}"] text tspan`).length;
    return item?.text === expected && item.textFlow === 'wrap' && item.textAlign === 'justify' && item.textVerticalAlign === 'bottom' && lineCount > 1;
  }, longText);

  const restored = await page.evaluate(() => {
    const item = state.objects.find(entry => entry.type === 'text');
    return {
      text:item.text,
      flow:item.textFlow,
      align:item.textAlign,
      vertical:item.textVerticalAlign,
      width:item.width,
      fontSize:item.fontSize
    };
  });
  expect(restored.text).toBe(longText);
  expect(restored.flow).toBe('wrap');
  expect(restored.align).toBe('justify');
  expect(restored.vertical).toBe('bottom');
  expect(restored.width).toBeGreaterThan(beforeResize.width);
  expect(restored.fontSize).toBe(beforeResize.fontSize);
});