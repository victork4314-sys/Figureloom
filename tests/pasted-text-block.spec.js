const { test, expect } = require('@playwright/test');

test('a large pasted paragraph becomes a complete visible text block', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__figureLoomTextLayoutTools && window.__figureLoomPastedTextAutogrow));
  await page.evaluate(() => document.getElementById('scWelcome')?.classList.remove('open'));

  await page.click('#addTextButton');
  const pastedText = Array.from({ length: 60 }, (_, index) => `sample${String(index + 1).padStart(2, '0')}`).join(' ');

  await page.evaluate(text => {
    const field = document.getElementById('textContent');
    field.focus();
    field.value = text;
    const transfer = new DataTransfer();
    transfer.setData('text/plain', text);
    field.dispatchEvent(new ClipboardEvent('paste', { bubbles:true, cancelable:true, clipboardData:transfer }));
  }, pastedText);

  await page.waitForFunction(text => {
    const item = state.objects.find(entry => entry.type === 'text');
    return item?.text === text && document.querySelectorAll(`#objectLayer .canvas-object[data-id="${item.id}"] text tspan`).length >= 20;
  }, pastedText);

  const result = await page.evaluate(() => {
    const item = state.objects.find(entry => entry.type === 'text');
    const lines = [...document.querySelectorAll(`#objectLayer .canvas-object[data-id="${item.id}"] text tspan`)]
      .map(line => line.textContent.trim())
      .filter(Boolean);
    return {
      text:item.text,
      flow:item.textFlow,
      width:item.width,
      height:item.height,
      y:item.y,
      fontSize:item.fontSize,
      lineHeight:item.lineHeight,
      padding:item.textPadding,
      lines,
      renderedText:lines.join(' ').replace(/\s+/g, ' ').trim()
    };
  });

  expect(result.text).toBe(pastedText);
  expect(result.flow).toBe('auto-height');
  expect(result.lines.length).toBeGreaterThanOrEqual(20);
  expect(result.renderedText).toBe(pastedText);
  expect(result.height).toBeGreaterThanOrEqual(
    Math.ceil(result.lines.length * result.fontSize * result.lineHeight + result.padding * 2)
  );
  expect(result.y + result.height).toBeLessThanOrEqual(750);
});
