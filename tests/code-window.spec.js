const { test, expect } = require('@playwright/test');

test('code windows edit, render, resize, and restore from the project vault', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.FigureLoomCodeWindows && document.getElementById('addCodeWindowButton')));

  await page.click('#addCodeWindowButton');
  const editor = page.locator('#figureloomCodeEditorOverlay');
  await expect(editor).toBeVisible();

  const code = 'const samples = [1, 2, 3];\n// calculate a total\nconst total = samples.reduce((sum, value) => sum + value, 0);';
  await editor.locator('[data-code-value]').fill(code);
  await editor.locator('[data-code-language]').selectOption('javascript');
  await editor.locator('[data-code-theme]').selectOption('light');
  await editor.locator('[data-code-lines]').uncheck();
  await editor.locator('[data-code-wrap]').check();
  await editor.locator('[data-code-save]').click();
  await expect(editor).toBeHidden();

  const savedObject = await page.evaluate(() => {
    const item = state.objects.find(entry => entry.type === 'code');
    return item && {
      id:item.id,
      code:item.code,
      language:item.language,
      theme:item.codeTheme,
      lines:item.codeLineNumbers,
      wrap:item.codeWrap,
      name:item.name
    };
  });
  expect(savedObject).toMatchObject({
    code,
    language:'javascript',
    theme:'light',
    lines:false,
    wrap:true,
    name:'JavaScript code'
  });

  const codeGroup = page.locator(`#objectLayer .canvas-object[data-id="${savedObject.id}"]`);
  await expect(codeGroup).toBeVisible();
  await expect(codeGroup).toContainText('JavaScript');
  await expect(codeGroup).toContainText('const');
  expect(await codeGroup.locator('tspan[fill="#6d28d9"]').count()).toBeGreaterThan(0);

  await page.evaluate(id => {
    const item = state.objects.find(entry => entry.id === id);
    item.width = 640;
    item.height = 390;
    render();
  }, savedObject.id);
  await expect(codeGroup.locator('rect').first()).toHaveAttribute('width', '640');
  await expect(codeGroup.locator('rect').first()).toHaveAttribute('height', '390');

  await page.evaluate(async () => {
    syncPage?.();
    await vaultWrite('autosave', structuredClone(projectData()));
  });
  await page.reload();
  await page.waitForFunction(() => Boolean(window.FigureLoomCodeWindows));
  await page.waitForFunction(expected => {
    const item = state.objects.find(entry => entry.type === 'code');
    return item?.code === expected && document.querySelector(`#objectLayer .canvas-object[data-id="${item.id}"] text`)?.textContent.includes('JavaScript');
  }, code);

  const restored = await page.evaluate(() => {
    const item = state.objects.find(entry => entry.type === 'code');
    return { code:item.code, language:item.language, width:item.width, height:item.height };
  });
  expect(restored).toEqual({ code, language:'javascript', width:640, height:390 });
});
