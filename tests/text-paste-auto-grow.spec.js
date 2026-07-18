const { test, expect } = require('@playwright/test');

test('pasted text wraps into every required line and grows from its original top edge', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(
    window.__figureLoomTextLayoutTools &&
    window.__figureLoomTextPasteAutoGrowFix &&
    document.getElementById('textBoxFlow')
  ));
  await page.evaluate(() => document.getElementById('scWelcome')?.classList.remove('open'));

  await page.click('#addTextButton');
  await page.waitForFunction(() => {
    const item = state.objects.find(entry => entry.type === 'text');
    return item?.textFlow === 'auto-height' && Number(item.width) >= 420;
  });

  const original = await page.evaluate(() => {
    const item = state.objects.find(entry => entry.type === 'text');
    return { id:item.id, x:item.x, y:item.y };
  });

  await page.locator('#fontSize').fill('18');
  await page.locator('#fontSize').evaluate(element => element.dispatchEvent(new Event('change', { bubbles:true })));

  const paragraph = Array.from({ length:220 }, (_, index) => `method${index + 1}`).join(' ');
  const editor = page.locator('#textContent');
  await editor.focus();
  await editor.fill(paragraph);

  await page.waitForFunction(expected => {
    const item = state.objects.find(entry => entry.id === expected.id);
    const group = document.querySelector(`#objectLayer .canvas-object[data-id="${expected.id}"]`);
    return item?.text === expected.text && group?.querySelectorAll('text > tspan').length > 20;
  }, { id:original.id, text:paragraph });

  const result = await page.evaluate(id => {
    const item = state.objects.find(entry => entry.id === id);
    const group = document.querySelector(`#objectLayer .canvas-object[data-id="${id}"]`);
    const lines = [...group.querySelectorAll('text > tspan')];
    const lastLine = lines.at(-1);
    const clipHeight = Number(group.querySelector('clipPath rect')?.getAttribute('height'));
    return {
      text:item.text,
      flow:item.textFlow,
      x:item.x,
      y:item.y,
      width:item.width,
      height:item.height,
      fontSize:item.fontSize,
      lineCount:lines.length,
      lastLineY:Number(lastLine?.getAttribute('y')),
      clipHeight
    };
  }, original.id);

  expect(result.text).toBe(paragraph);
  expect(result.flow).toBe('auto-height');
  expect(result.x).toBe(original.x);
  expect(result.y).toBe(original.y);
  expect(result.width).toBeGreaterThanOrEqual(420);
  expect(result.lineCount).toBeGreaterThan(20);
  expect(result.height).toBeGreaterThan(500);
  expect(result.clipHeight).toBe(result.height);
  expect(result.lastLineY + result.fontSize).toBeLessThanOrEqual(result.height);

  await page.evaluate(async () => {
    syncPage?.();
    await vaultWrite('autosave', structuredClone(projectData()));
  });
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__figureLoomTextPasteAutoGrowFix));
  await page.waitForFunction(expected => {
    const item = state.objects.find(entry => entry.type === 'text');
    const lines = document.querySelectorAll(`#objectLayer .canvas-object[data-id="${item?.id}"] text > tspan`);
    return item?.text === expected && lines.length > 20;
  }, paragraph);

  const restored = await page.evaluate(() => {
    const item = state.objects.find(entry => entry.type === 'text');
    return {
      text:item.text,
      flow:item.textFlow,
      y:item.y,
      height:item.height,
      lineCount:document.querySelectorAll(`#objectLayer .canvas-object[data-id="${item.id}"] text > tspan`).length
    };
  });
  expect(restored.text).toBe(paragraph);
  expect(restored.flow).toBe('auto-height');
  expect(restored.y).toBe(original.y);
  expect(restored.lineCount).toBeGreaterThan(20);
  expect(restored.height).toBe(result.height);
});