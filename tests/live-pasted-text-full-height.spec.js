const { test, expect } = require('@playwright/test');

test('live pasted text keeps every wrapped line before and after reload', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(
    window.__figureLoomPastedTextAutogrow &&
    document.getElementById('textBoxFlow') &&
    document.getElementById('textContent')
  ));
  await page.evaluate(() => document.getElementById('scWelcome')?.classList.remove('open'));

  await page.click('#addTextButton');
  const paragraph = Array.from(
    { length: 40 },
    (_, index) => `Sample ${index + 1} contains an important analysis result that must remain visible.`
  ).join(' ');

  await page.evaluate(value => {
    const field = document.getElementById('textContent');
    field.focus();
    field.value = value;
    field.dispatchEvent(new Event('paste', { bubbles:true }));
  }, paragraph);

  await page.waitForFunction(expected => {
    const item = state.objects.find(entry => entry.type === 'text' && entry.text === expected);
    const group = item && document.querySelector(`#objectLayer .canvas-object[data-id="${item.id}"]`);
    return Boolean(item && group && group.querySelectorAll('text > tspan').length >= 20 && item.height > 750);
  }, paragraph);

  const beforeReload = await page.evaluate(() => {
    const item = state.objects.find(entry => entry.type === 'text');
    const group = document.querySelector(`#objectLayer .canvas-object[data-id="${item.id}"]`);
    const lineCount = group.querySelectorAll('text > tspan').length;
    const clipHeight = Number(group.querySelector('[data-figureloom-text-clip="1"] rect')?.getAttribute('height'));
    const expectedHeight = Math.ceil(
      lineCount * (Number(item.fontSize) || 30) * Math.max(1, Number(item.lineHeight) || 1.25) +
      Math.max(0, Number(item.textPadding) || 0) * 2
    );
    return {
      text:item.text,
      flow:item.textFlow,
      width:item.width,
      height:item.height,
      lineCount,
      clipHeight,
      expectedHeight
    };
  });

  expect(beforeReload.text).toBe(paragraph);
  expect(beforeReload.flow).toBe('auto-height');
  expect(beforeReload.lineCount).toBeGreaterThanOrEqual(20);
  expect(beforeReload.height).toBe(beforeReload.expectedHeight);
  expect(beforeReload.clipHeight).toBe(beforeReload.height);
  expect(beforeReload.height).toBeGreaterThan(750);

  await page.evaluate(async () => {
    syncPage?.();
    await vaultWrite('autosave', structuredClone(projectData()));
  });

  await page.reload();
  await page.waitForFunction(() => Boolean(window.__figureLoomPastedTextAutogrow));
  await page.waitForFunction(expected => {
    const item = state.objects.find(entry => entry.type === 'text' && entry.text === expected);
    const group = item && document.querySelector(`#objectLayer .canvas-object[data-id="${item.id}"]`);
    return Boolean(item && group && group.querySelectorAll('text > tspan').length >= 20);
  }, paragraph);

  const afterReload = await page.evaluate(() => {
    const item = state.objects.find(entry => entry.type === 'text');
    const group = document.querySelector(`#objectLayer .canvas-object[data-id="${item.id}"]`);
    return {
      text:item.text,
      flow:item.textFlow,
      width:item.width,
      height:item.height,
      lineCount:group.querySelectorAll('text > tspan').length,
      clipHeight:Number(group.querySelector('[data-figureloom-text-clip="1"] rect')?.getAttribute('height'))
    };
  });

  expect(afterReload).toEqual({
    text:paragraph,
    flow:'auto-height',
    width:beforeReload.width,
    height:beforeReload.height,
    lineCount:beforeReload.lineCount,
    clipHeight:beforeReload.height
  });
});