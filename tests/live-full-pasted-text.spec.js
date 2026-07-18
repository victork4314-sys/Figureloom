const { test, expect } = require('@playwright/test');

test('live pasted text uses every required line and survives resize and reload', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(
    window.__figureLoomPastedTextAutogrow &&
    window.__figureLoomTextLayoutTools &&
    document.getElementById('textContent')
  ));
  await page.evaluate(() => document.getElementById('scWelcome')?.classList.remove('open'));

  await page.click('#addTextButton');
  const created = await page.evaluate(() => {
    const item = typeof selectedObject === 'function' ? selectedObject() : null;
    if (!item || item.type !== 'text') throw new Error('A text object was not selected after Add Text.');
    item.fontSize = 18;
    render();
    return { id:item.id, width:item.width };
  });

  const paragraph = Array.from({ length:220 }, (_, index) => `method${index + 1}`).join(' ');
  await page.evaluate(text => {
    const field = document.getElementById('textContent');
    field.value = text;
    field.dispatchEvent(new Event('paste', { bubbles:true }));
  }, paragraph);

  await page.waitForFunction(expected => {
    const item = state.objects.find(entry => entry.id === expected.id);
    const group = document.querySelector(`#objectLayer .canvas-object[data-id="${expected.id}"]`);
    return item?.text === expected.text && group?.querySelectorAll('text > tspan').length > 20;
  }, { id:created.id, text:paragraph });

  const initial = await page.evaluate(id => {
    const item = state.objects.find(entry => entry.id === id);
    const group = document.querySelector(`#objectLayer .canvas-object[data-id="${id}"]`);
    const lines = [...group.querySelectorAll('text > tspan')];
    const fontSize = Math.max(6, Number(item.fontSize) || 30);
    const lineHeight = fontSize * Math.max(1, Number(item.lineHeight) || 1.25);
    const padding = Math.max(0, Number(item.textPadding) || 0);
    return {
      text:item.text,
      flow:item.textFlow,
      width:item.width,
      height:item.height,
      expectedHeight:Math.ceil(lines.length * lineHeight + padding * 2),
      lineCount:lines.length,
      lastLineText:lines.at(-1)?.textContent || '',
      clipHeight:Number(group.querySelector('clipPath rect')?.getAttribute('height'))
    };
  }, created.id);

  expect(initial.text).toBe(paragraph);
  expect(initial.flow).toBe('auto-height');
  expect(initial.lineCount).toBeGreaterThan(20);
  expect(initial.height).toBe(initial.expectedHeight);
  expect(initial.clipHeight).toBe(initial.height);
  expect(initial.lastLineText).toContain('method220');

  const resized = await page.evaluate(id => {
    const item = state.objects.find(entry => entry.id === id);
    item.width = 500;
    item.textBoxWidth = 500;
    render();
    const group = document.querySelector(`#objectLayer .canvas-object[data-id="${id}"]`);
    const lines = [...group.querySelectorAll('text > tspan')];
    return {
      width:item.width,
      textBoxWidth:item.textBoxWidth,
      height:item.height,
      lineCount:lines.length,
      lastLineText:lines.at(-1)?.textContent || ''
    };
  }, created.id);

  expect(resized.width).toBe(500);
  expect(resized.textBoxWidth).toBe(500);
  expect(resized.lineCount).toBeGreaterThan(10);
  expect(resized.lineCount).toBeLessThan(initial.lineCount);
  expect(resized.lastLineText).toContain('method220');

  await page.evaluate(async () => {
    syncPage?.();
    await vaultWrite('autosave', structuredClone(projectData()));
  });
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__figureLoomPastedTextAutogrow));
  await page.waitForFunction(expected => {
    const item = state.objects.find(entry => entry.id === expected.id);
    const lines = document.querySelectorAll(`#objectLayer .canvas-object[data-id="${expected.id}"] text > tspan`);
    return item?.text === expected.text && Number(item.width) === 500 && lines.length > 10;
  }, { id:created.id, text:paragraph });

  const restored = await page.evaluate(id => {
    const item = state.objects.find(entry => entry.id === id);
    const group = document.querySelector(`#objectLayer .canvas-object[data-id="${id}"]`);
    const lines = [...group.querySelectorAll('text > tspan')];
    return {
      text:item.text,
      flow:item.textFlow,
      width:item.width,
      textBoxWidth:item.textBoxWidth,
      height:item.height,
      lineCount:lines.length,
      lastLineText:lines.at(-1)?.textContent || ''
    };
  }, created.id);

  expect(restored.text).toBe(paragraph);
  expect(restored.flow).toBe('auto-height');
  expect(restored.width).toBe(500);
  expect(restored.textBoxWidth).toBe(500);
  expect(restored.lineCount).toBe(resized.lineCount);
  expect(restored.height).toBe(resized.height);
  expect(restored.lastLineText).toContain('method220');
});