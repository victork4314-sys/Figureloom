const { test, expect } = require('@playwright/test');

test('pasted text wraps into every required line and grows the box', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__figureLoomPastedTextAutogrow && document.getElementById('textBoxFlow')));
  await page.evaluate(() => document.getElementById('scWelcome')?.classList.remove('open'));

  await page.click('#addTextButton');
  const longText = Array.from({ length: 34 }, (_, index) => `Scientific instruction ${index + 1} explains the next reproducible analysis step clearly.`).join(' ');

  await page.evaluate(() => {
    const item = selectedObject();
    item.y = 600;
    item.width = 320;
    item.fontSize = 24;
    item.textFlow = 'single';
    item.metadata = {};
    render();
  });

  await page.evaluate(text => {
    const field = document.getElementById('textContent');
    field.value = text;
    field.dispatchEvent(new Event('paste', { bubbles:true }));
  }, longText);

  await page.waitForFunction(expected => {
    const item = selectedObject();
    const group = item && document.querySelector(`#objectLayer .canvas-object[data-id="${item.id}"]`);
    return item?.text === expected && item.textFlow === 'auto-height' && group?.querySelectorAll('text tspan').length >= 20;
  }, longText);

  const result = await page.evaluate(() => {
    const item = selectedObject();
    const group = document.querySelector(`#objectLayer .canvas-object[data-id="${item.id}"]`);
    const lines = group.querySelectorAll('text tspan');
    const clip = group.querySelector('clipPath rect');
    return {
      flow:item.textFlow,
      y:item.y,
      height:item.height,
      lineCount:lines.length,
      finalText:lines[lines.length - 1]?.textContent || '',
      clipHeight:Number(clip?.getAttribute('height')),
      fontSize:item.fontSize
    };
  });

  expect(result.flow).toBe('auto-height');
  expect(result.lineCount).toBeGreaterThanOrEqual(20);
  expect(result.y).toBe(0);
  expect(result.height).toBeGreaterThan(750);
  expect(result.clipHeight).toBe(result.height);
  expect(result.fontSize).toBe(24);
  expect(result.finalText.length).toBeGreaterThan(0);
});