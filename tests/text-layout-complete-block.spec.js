const { test, expect } = require('@playwright/test');

test('pasted text becomes a complete auto-height block with every line preserved', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__figureLoomFullPasteTextFix && document.getElementById('textBoxFlow')));
  await page.evaluate(() => document.getElementById('scWelcome')?.classList.remove('open'));

  await page.click('#addTextButton');
  const repeated = Array.from({ length: 34 }, (_, index) => `Step ${index + 1} explains a scientific instruction with enough words to wrap naturally inside the text box.`).join(' ');
  const longText = `${repeated} FINAL_VISIBLE_MARKER`;

  const content = page.locator('#textContent');
  await content.focus();
  await page.evaluate(value => {
    const input = document.getElementById('textContent');
    input.dispatchEvent(new InputEvent('beforeinput', {
      bubbles:true,
      inputType:'insertFromPaste',
      data:value
    }));
    input.value = value;
    input.dispatchEvent(new InputEvent('input', {
      bubbles:true,
      inputType:'insertFromPaste',
      data:value
    }));
  }, longText);

  const result = await page.evaluate(() => {
    const item = state.objects.find(entry => entry.type === 'text');
    const group = document.querySelector(`#objectLayer .canvas-object[data-id="${item.id}"]`);
    const lines = [...group.querySelectorAll('text tspan')].map(node => node.textContent);
    return {
      text:item.text,
      flow:item.textFlow,
      height:item.height,
      fontSize:item.fontSize,
      lineHeight:item.lineHeight,
      padding:item.textPadding,
      lineCount:lines.length,
      lastLine:lines.at(-1),
      clipPath:group.querySelector('text')?.getAttribute('clip-path') || ''
    };
  });

  expect(result.text).toBe(longText);
  expect(result.flow).toBe('auto-height');
  expect(result.lineCount).toBeGreaterThanOrEqual(20);
  expect(result.lastLine).toContain('FINAL_VISIBLE_MARKER');
  expect(result.clipPath).toBe('');
  expect(result.height).toBeGreaterThanOrEqual(result.lineCount * result.fontSize * result.lineHeight);

  await page.evaluate(async () => {
    syncPage?.();
    await vaultWrite('autosave', structuredClone(projectData()));
  });
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__figureLoomFullPasteTextFix));
  await page.waitForFunction(expected => {
    const item = state.objects.find(entry => entry.type === 'text');
    if (!item || item.text !== expected || item.textFlow !== 'auto-height') return false;
    const lines = [...document.querySelectorAll(`#objectLayer .canvas-object[data-id="${item.id}"] text tspan`)];
    return lines.length >= 20 && lines.at(-1)?.textContent.includes('FINAL_VISIBLE_MARKER');
  }, longText);
});
