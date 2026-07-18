const { test, expect } = require('@playwright/test');

test('a long paste renders every wrapped line and restores after reload', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(
    window.FigureLoomFullTextPaste &&
    window.__figureLoomTextLayoutTools &&
    document.getElementById('textContent')
  ));
  await page.evaluate(() => document.getElementById('scWelcome')?.classList.remove('open'));

  await page.click('#addTextButton');
  await page.waitForFunction(() => {
    const item = state.objects.find(entry => entry.type === 'text');
    return item?.textFlow === 'auto-height' && Number(item.width) >= 300;
  });

  const original = await page.evaluate(() => {
    const item = state.objects.find(entry => entry.type === 'text');
    item.fontSize = 18;
    render();
    return { id:item.id, x:item.x, y:item.y, width:item.width };
  });

  const paragraph = Array.from({ length:220 }, (_, index) => `method${index + 1}`).join(' ');
  const editor = page.locator('#textContent');
  await editor.focus();
  await editor.fill(paragraph);

  await page.waitForFunction(expected => {
    const item = state.objects.find(entry => entry.id === expected.id);
    const group = document.querySelector(`#objectLayer .canvas-object[data-id="${expected.id}"]`);
    return item?.text === expected.text && group?.querySelectorAll('text > tspan').length > 20;
  }, { id:original.id, text:paragraph });

  await expect(editor).toBeFocused();

  const result = await page.evaluate(id => {
    const item = state.objects.find(entry => entry.id === id);
    const group = document.querySelector(`#objectLayer .canvas-object[data-id="${id}"]`);
    const lines = [...group.querySelectorAll('text > tspan')];
    const lastLine = lines.at(-1);
    return {
      text:item.text,
      flow:item.textFlow,
      x:item.x,
      y:item.y,
      width:item.width,
      height:item.height,
      expectedHeight:window.FigureLoomFullTextPaste.requiredHeight(item),
      fontSize:item.fontSize,
      lineCount:lines.length,
      lastLineY:Number(lastLine?.getAttribute('y')),
      lastLineText:lastLine?.textContent || '',
      clipHeight:Number(group.querySelector('clipPath rect')?.getAttribute('height'))
    };
  }, original.id);

  expect(result.text).toBe(paragraph);
  expect(result.flow).toBe('auto-height');
  expect(result.x).toBe(original.x);
  expect(result.y).toBe(original.y);
  expect(result.width).toBe(original.width);
  expect(result.lineCount).toBeGreaterThan(20);
  expect(result.height).toBe(result.expectedHeight);
  expect(result.clipHeight).toBe(result.height);
  expect(result.lastLineText).toContain('method220');
  expect(result.lastLineY + result.fontSize * .35).toBeLessThanOrEqual(result.height);

  await page.evaluate(async () => {
    syncPage?.();
    await vaultWrite('autosave', structuredClone(projectData()));
  });
  await page.reload();
  await page.waitForFunction(() => Boolean(window.FigureLoomFullTextPaste));
  await page.waitForFunction(expected => {
    const item = state.objects.find(entry => entry.type === 'text');
    const lines = document.querySelectorAll(`#objectLayer .canvas-object[data-id="${item?.id}"] text > tspan`);
    return item?.text === expected && lines.length > 20;
  }, paragraph);

  const restored = await page.evaluate(() => {
    const item = state.objects.find(entry => entry.type === 'text');
    const lines = [...document.querySelectorAll(`#objectLayer .canvas-object[data-id="${item.id}"] text > tspan`)];
    return {
      text:item.text,
      flow:item.textFlow,
      width:item.width,
      textBoxWidth:item.textBoxWidth,
      height:item.height,
      expectedHeight:window.FigureLoomFullTextPaste.requiredHeight(item),
      lineCount:lines.length,
      lastLineText:lines.at(-1)?.textContent || ''
    };
  });

  expect(restored.text).toBe(paragraph);
  expect(restored.flow).toBe('auto-height');
  expect(restored.width).toBe(original.width);
  expect(restored.textBoxWidth).toBe(original.width);
  expect(restored.height).toBe(restored.expectedHeight);
  expect(restored.lineCount).toBeGreaterThan(20);
  expect(restored.lastLineText).toContain('method220');
});