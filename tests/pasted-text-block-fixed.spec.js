const { test, expect } = require('@playwright/test');

const pastedText = Array.from({ length: 60 }, (_, index) => `sample${String(index + 1).padStart(2, '0')}`).join(' ');

async function dismissOverlays(page) {
  await page.evaluate(() => {
    document.getElementById('scWelcome')?.classList.remove('open');
    document.querySelectorAll('.quick-start-overlay,.quick-start.open').forEach(node => node.classList.remove('open'));
  });
}

async function readTextBlock(page) {
  return page.evaluate(() => {
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
      lineCount:lines.length,
      renderedText:lines.join(' ').replace(/\s+/g, ' ').trim()
    };
  });
}

function expectCompleteBlock(result) {
  expect(result.text).toBe(pastedText);
  expect(result.flow).toBe('auto-height');
  expect(result.width).toBeGreaterThanOrEqual(480);
  expect(result.width).toBeLessThanOrEqual(720);
  expect(result.fontSize).toBe(30);
  expect(result.lineHeight).toBe(1.15);
  expect(result.lineCount).toBeGreaterThanOrEqual(20);
  expect(result.renderedText).toBe(pastedText);
  expect(result.height).toBeGreaterThanOrEqual(
    Math.ceil(result.lineCount * result.fontSize * result.lineHeight + result.padding * 2)
  );
  expect(result.y + result.height).toBeLessThanOrEqual(750);
}

test('inspector paste creates a complete visible text block and restores', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__figureLoomTextLayoutTools && window.__figureLoomPastedTextAutogrow));
  await dismissOverlays(page);
  await page.click('#addTextButton');

  const initial = await page.evaluate(() => {
    const item = state.objects.find(entry => entry.type === 'text');
    return { width:item.width, lineHeight:item.lineHeight, fontSize:item.fontSize };
  });
  expect(initial).toEqual({ width:480, lineHeight:1.15, fontSize:30 });

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

  expectCompleteBlock(await readTextBlock(page));

  await page.evaluate(async () => {
    syncPage?.();
    await vaultWrite('autosave', structuredClone(projectData()));
  });
  await page.reload();
  await page.waitForFunction(text => {
    const item = state.objects.find(entry => entry.type === 'text');
    return Boolean(window.__figureLoomPastedTextAutogrow && item?.text === text);
  }, pastedText);
  expectCompleteBlock(await readTextBlock(page));
});

test('on-canvas paste uses the same complete wrapped block', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__figureLoomTextLayoutTools && window.__figureLoomPastedTextAutogrow));
  await dismissOverlays(page);
  await page.click('#addTextButton');

  const textNode = page.locator('#objectLayer .canvas-object text').first();
  await textNode.click();
  const editor = page.locator('.figureloom-direct-label-editor');
  await expect(editor).toBeVisible();

  await editor.evaluate((node, text) => {
    const transfer = new DataTransfer();
    transfer.setData('text/plain', text);
    node.dispatchEvent(new ClipboardEvent('paste', { bubbles:true, cancelable:true, clipboardData:transfer }));
  }, pastedText);
  await page.locator('#documentName').click();

  await page.waitForFunction(text => {
    const item = state.objects.find(entry => entry.type === 'text');
    return item?.text === text && document.querySelectorAll(`#objectLayer .canvas-object[data-id="${item.id}"] text tspan`).length >= 20;
  }, pastedText);
  expectCompleteBlock(await readTextBlock(page));
});
