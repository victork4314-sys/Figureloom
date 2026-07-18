const { test, expect } = require('@playwright/test');

async function dismissWelcome(page) {
  await page.evaluate(() => document.getElementById('scWelcome')?.classList.remove('open'));
}

test('a large pasted block renders every wrapped line and restores completely', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(
    window.__figureLoomTextLayoutTools &&
    window.__figureLoomTextPasteAutoGrowFix &&
    document.getElementById('textBoxFlow')
  ));
  await dismissWelcome(page);

  await page.click('#addTextButton');
  const longText = Array.from({ length: 90 }, (_, index) =>
    `Instruction ${index + 1}: record the sample, verify the result, and continue to the next analysis step.`
  ).join(' ');

  await page.locator('#textContent').evaluate((element, value) => {
    element.focus();
    element.value = value;
    element.dispatchEvent(new InputEvent('input', {
      bubbles:true,
      inputType:'insertFromPaste',
      data:value
    }));
  }, longText);

  const created = await page.evaluate(() => {
    const item = state.objects.find(entry => entry.type === 'text' && entry.text?.startsWith('Instruction 1:'));
    if (!item) return null;
    const group = document.querySelector(`#objectLayer .canvas-object[data-id="${item.id}"]`);
    const tspans = [...(group?.querySelectorAll('text > tspan') || [])];
    const clip = group?.querySelector('clipPath[data-figureloom-text-clip="1"] rect');
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
      clipHeight:Number(clip?.getAttribute('height') || 0)
    };
  });

  expect(created).toBeTruthy();
  expect(created.text).toBe(longText);
  expect(created.flow).toBe('auto-height');
  expect(created.lines).toBeGreaterThanOrEqual(20);
  expect(created.width).toBeGreaterThanOrEqual(420);
  expect(created.width).toBeLessThanOrEqual(600);
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
  await page.waitForFunction(() => Boolean(window.__figureLoomTextPasteAutoGrowFix));
  await page.waitForFunction(expected => {
    const item = state.objects.find(entry => entry.type === 'text' && entry.text === expected);
    if (!item) return false;
    const group = document.querySelector(`#objectLayer .canvas-object[data-id="${item.id}"]`);
    const lines = group?.querySelectorAll('text > tspan').length || 0;
    const clipHeight = Number(group?.querySelector('clipPath[data-figureloom-text-clip="1"] rect')?.getAttribute('height') || 0);
    return item.textFlow === 'auto-height' && lines >= 20 && clipHeight === Number(item.height);
  }, longText);

  const restored = await page.evaluate(expected => {
    const item = state.objects.find(entry => entry.type === 'text' && entry.text === expected);
    const group = document.querySelector(`#objectLayer .canvas-object[data-id="${item.id}"]`);
    return {
      text:item.text,
      flow:item.textFlow,
      height:item.height,
      lines:group.querySelectorAll('text > tspan').length,
      clipHeight:Number(group.querySelector('clipPath[data-figureloom-text-clip="1"] rect').getAttribute('height'))
    };
  }, longText);

  expect(restored.text).toBe(longText);
  expect(restored.flow).toBe('auto-height');
  expect(restored.lines).toBe(created.lines);
  expect(restored.height).toBe(created.height);
  expect(restored.clipHeight).toBe(restored.height);
});

test('Single line remains available when deliberately selected', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__figureLoomTextPasteAutoGrowFix && document.getElementById('textBoxFlow')));
  await dismissWelcome(page);

  await page.click('#addTextButton');
  await page.selectOption('#textBoxFlow', 'single');
  const text = 'This intentionally stays on one line even though it is much longer than the selected text box.';
  await page.locator('#textContent').fill(text);

  const result = await page.evaluate(expected => {
    const item = state.objects.find(entry => entry.type === 'text' && entry.text === expected);
    const lines = item
      ? document.querySelectorAll(`#objectLayer .canvas-object[data-id="${item.id}"] text > tspan`).length
      : 0;
    return item && { flow:item.textFlow, manual:item.textFlowManual, lines };
  }, text);

  expect(result).toEqual({ flow:'single', manual:true, lines:1 });
});