const { test, expect } = require('@playwright/test');

test('live build preserves every line of a large pasted text block', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__figureLoomPastedTextAutogrow && document.getElementById('textBoxFlow')));
  await page.evaluate(() => document.getElementById('scWelcome')?.classList.remove('open'));

  await page.click('#addTextButton');
  const repeated = Array.from({ length: 34 }, (_, index) => `Step ${index + 1} explains a scientific instruction with enough words to wrap naturally inside the text box.`).join(' ');
  const longText = `${repeated} ENDMARK`;

  const content = page.locator('#textContent');
  await content.focus();
  await page.evaluate(value => {
    const input = document.getElementById('textContent');
    const transfer = new DataTransfer();
    transfer.setData('text/plain', value);
    input.dispatchEvent(new ClipboardEvent('paste', {
      bubbles:true,
      cancelable:true,
      clipboardData:transfer
    }));
    input.value = value;
    input.dispatchEvent(new InputEvent('input', {
      bubbles:true,
      inputType:'insertFromPaste',
      data:value
    }));
  }, longText);
  await page.waitForTimeout(100);

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
      combined:lines.join(' ')
    };
  });

  expect(result.text).toBe(longText);
  expect(result.flow).toBe('auto-height');
  expect(result.lineCount).toBeGreaterThanOrEqual(20);
  expect(result.combined).toContain('ENDMARK');
  expect(result.height).toBeGreaterThanOrEqual(result.lineCount * result.fontSize * result.lineHeight);

  await page.evaluate(async () => {
    syncPage?.();
    await vaultWrite('autosave', structuredClone(projectData()));
  });
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__figureLoomPastedTextAutogrow));
  await page.waitForFunction(expected => {
    const item = state.objects.find(entry => entry.type === 'text');
    if (!item || item.text !== expected || item.textFlow !== 'auto-height') return false;
    const lines = [...document.querySelectorAll(`#objectLayer .canvas-object[data-id="${item.id}"] text tspan`)];
    return lines.length >= 20 && lines.some(line => line.textContent.includes('ENDMARK'));
  }, longText);
});
