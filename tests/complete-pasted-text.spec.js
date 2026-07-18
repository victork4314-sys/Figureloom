const { test, expect } = require('@playwright/test');

test('a large on-canvas paste renders every wrapped line and restores', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await page.waitForFunction(() => Boolean(
    window.__figureLoomTextLayoutTools &&
    window.__figureLoomPastedTextAutogrow &&
    document.getElementById('textBoxFlow')
  ));
  await page.evaluate(() => document.getElementById('scWelcome')?.classList.remove('open'));

  await page.click('#addTextButton');
  await page.locator('#fontSize').fill('18');
  await page.locator('#fontSize').evaluate(element => {
    element.dispatchEvent(new Event('change', { bubbles:true }));
  });

  const created = await page.evaluate(() => {
    const item = selectedObject();
    return { id:item.id, width:item.width, y:item.y, fontSize:item.fontSize };
  });
  expect(created.width).toBe(320);
  expect(created.fontSize).toBe(18);

  const longText = `${Array.from({ length:85 }, (_, index) => `method${String(index + 1).padStart(3, '0')}`).join(' ')} FINAL_VISIBLE_MARKER`;
  await page.evaluate(value => navigator.clipboard.writeText(value), longText);

  const renderedText = page.locator(`#objectLayer .canvas-object[data-id="${created.id}"] text`).first();
  await renderedText.click();
  const editor = page.locator('.figureloom-direct-label-editor');
  await expect(editor).toBeVisible();
  await editor.press('Control+V');

  await page.waitForFunction(({ id, text }) => {
    const item = state.objects.find(entry => entry.id === id);
    const group = document.querySelector(`#objectLayer .canvas-object[data-id="${id}"]`);
    const lines = group?.querySelectorAll('text > tspan') || [];
    return item?.text === text && item.textFlow === 'auto-height' && lines.length > 20;
  }, { id:created.id, text:longText });

  await page.locator('#canvasBackground').click({ position:{ x:10, y:10 } });
  await expect(editor).toBeHidden();

  const result = await page.evaluate(id => {
    const item = state.objects.find(entry => entry.id === id);
    const group = document.querySelector(`#objectLayer .canvas-object[data-id="${id}"]`);
    const lines = [...group.querySelectorAll('text > tspan')];
    const last = lines.at(-1);
    const clip = group.querySelector('clipPath rect');
    const fontSize = Math.max(6, Number(item.fontSize) || 30);
    const lineHeight = fontSize * Math.max(1, Number(item.lineHeight) || 1.25);
    const padding = Math.max(0, Number(item.textPadding) || 0);
    return {
      text:item.text,
      flow:item.textFlow,
      width:item.width,
      height:item.height,
      y:item.y,
      fontSize:item.fontSize,
      lineCount:lines.length,
      lastLine:last?.textContent || '',
      lastLineY:Number(last?.getAttribute('y')),
      clipHeight:Number(clip?.getAttribute('height')),
      requiredHeight:Math.ceil(lines.length * lineHeight + padding * 2)
    };
  }, created.id);

  expect(result.text).toBe(longText);
  expect(result.flow).toBe('auto-height');
  expect(result.width).toBe(created.width);
  expect(result.fontSize).toBe(created.fontSize);
  expect(result.lineCount).toBeGreaterThan(20);
  expect(result.lastLine).toContain('FINAL_VISIBLE_MARKER');
  expect(result.height).toBeGreaterThanOrEqual(result.requiredHeight);
  expect(result.clipHeight).toBe(result.height);
  expect(result.lastLineY + result.fontSize).toBeLessThanOrEqual(result.height);
  expect(result.y).toBeLessThanOrEqual(created.y);
  expect(result.y + result.height).toBeLessThanOrEqual(750);

  await page.evaluate(async () => {
    syncPage?.();
    await vaultWrite('autosave', structuredClone(projectData()));
  });
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__figureLoomPastedTextAutogrow));
  await page.waitForFunction(({ text, width }) => {
    const item = state.objects.find(entry => entry.type === 'text' && entry.text === text);
    if (!item || item.textFlow !== 'auto-height' || item.width !== width) return false;
    const lines = [...document.querySelectorAll(`#objectLayer .canvas-object[data-id="${item.id}"] text > tspan`)];
    return lines.length > 20 && lines.at(-1)?.textContent.includes('FINAL_VISIBLE_MARKER');
  }, { text:longText, width:created.width });

  const restored = await page.evaluate(text => {
    const item = state.objects.find(entry => entry.type === 'text' && entry.text === text);
    const lines = document.querySelectorAll(`#objectLayer .canvas-object[data-id="${item.id}"] text > tspan`);
    return {
      width:item.width,
      height:item.height,
      fontSize:item.fontSize,
      lineCount:lines.length
    };
  }, longText);
  expect(restored.width).toBe(result.width);
  expect(restored.height).toBe(result.height);
  expect(restored.fontSize).toBe(result.fontSize);
  expect(restored.lineCount).toBe(result.lineCount);
});