const { test, expect } = require('@playwright/test');

test('live pasted text grows to every wrapped line and survives reload', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__figureLoomPastedTextAutogrow && document.getElementById('textBoxFlow')));
  await page.evaluate(() => document.getElementById('scWelcome')?.classList.remove('open'));

  await page.click('#addTextButton');
  const longText = Array.from({ length: 90 }, (_, index) =>
    `Instruction ${index + 1}: record the sample, verify the result, and continue to the next analysis step.`
  ).join(' ');

  await page.locator('#textContent').evaluate((element, value) => {
    element.focus();
    element.value = value;
    element.dispatchEvent(new Event('paste', { bubbles:true }));
  }, longText);

  await page.waitForFunction(expected => {
    const item = state.objects.find(entry => entry.type === 'text' && entry.text === expected);
    return Boolean(item && document.querySelectorAll(`#objectLayer .canvas-object[data-id="${item.id}"] text > tspan`).length >= 20);
  }, longText);

  const created = await page.evaluate(expected => {
    const item = state.objects.find(entry => entry.type === 'text' && entry.text === expected);
    const group = document.querySelector(`#objectLayer .canvas-object[data-id="${item.id}"]`);
    const tspans = [...group.querySelectorAll('text > tspan')];
    const clipHeight = Number(group.querySelector('clipPath[data-figureloom-text-clip="1"] rect')?.getAttribute('height') || 0);
    return {
      id:item.id,
      text:item.text,
      flow:item.textFlow,
      width:item.width,
      height:item.height,
      y:item.y,
      fontSize:item.fontSize,
      lineHeight:item.lineHeight,
      padding:item.textPadding,
      lines:tspans.length,
      lastLineY:Number(tspans.at(-1)?.getAttribute('y') || 0),
      clipHeight
    };
  }, longText);

  expect(created.text).toBe(longText);
  expect(created.flow).toBe('auto-height');
  expect(created.lines).toBeGreaterThanOrEqual(20);
  expect(created.clipHeight).toBe(created.height);
  expect(created.lastLineY).toBeLessThanOrEqual(created.height);
  expect(created.y).toBeGreaterThanOrEqual(0);

  const expectedHeight = Math.ceil(
    created.lines * created.fontSize * Math.max(1, created.lineHeight || 1.25) +
    Math.max(0, created.padding || 0) * 2
  );
  expect(created.height).toBe(expectedHeight);

  await page.evaluate(async () => {
    syncPage?.();
    await vaultWrite('autosave', structuredClone(projectData()));
  });
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__figureLoomPastedTextAutogrow));
  await page.waitForFunction(expected => {
    const item = state.objects.find(entry => entry.type === 'text' && entry.text === expected);
    if (!item) return false;
    const group = document.querySelector(`#objectLayer .canvas-object[data-id="${item.id}"]`);
    const lines = group?.querySelectorAll('text > tspan').length || 0;
    const clipHeight = Number(group?.querySelector('clipPath[data-figureloom-text-clip="1"] rect')?.getAttribute('height') || 0);
    return item.textFlow === 'auto-height' && lines >= 20 && clipHeight === Number(item.height);
  }, longText);
});

test('explicit Single line is respected', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__figureLoomPastedTextAutogrow && document.getElementById('textBoxFlow')));
  await page.evaluate(() => document.getElementById('scWelcome')?.classList.remove('open'));

  await page.click('#addTextButton');
  await page.selectOption('#textBoxFlow', 'single');
  const text = 'This intentionally stays on one line even though it is much longer than the selected text box.';
  await page.locator('#textContent').evaluate((element, value) => {
    element.value = value;
    element.dispatchEvent(new Event('paste', { bubbles:true }));
  }, text);
  await page.waitForTimeout(80);

  const result = await page.evaluate(expected => {
    const item = state.objects.find(entry => entry.type === 'text' && entry.text === expected);
    const lines = item ? document.querySelectorAll(`#objectLayer .canvas-object[data-id="${item.id}"] text > tspan`).length : 0;
    return item && { flow:item.textFlow, explicit:Boolean(item.metadata?.textFlowExplicit), lines };
  }, text);

  expect(result).toEqual({ flow:'single', explicit:true, lines:1 });
});