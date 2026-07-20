const { test, expect } = require('@playwright/test');

test('MCP controls live under Settings and start locked down', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => document.documentElement.dataset.figureloomReady === '1');

  const registry = await page.evaluate(() => ({
    available: Boolean(window.FigureLoomCommands),
    commands: window.FigureLoomCommands?.list?.().map(command => command.name) || []
  }));

  expect(registry.available).toBe(true);
  expect(registry.commands).toContain('document.get');
  expect(registry.commands).toContain('page.get_state');
  expect(registry.commands).toContain('page.render');
  expect(registry.commands).toContain('object.create');
  expect(registry.commands).toContain('object.modify');
  expect(registry.commands).toContain('history.undo');
  expect(registry.commands).toContain('history.redo');
  expect(registry.commands).toContain('project.list');
  expect(registry.commands).toContain('export.pdf');
  expect(registry.commands).toContain('export.pptx');

  await page.locator('#settingsRibbonButton').click();
  const mcpNavigation = page.locator('[data-settings-section="mcp"]');
  await expect(mcpNavigation).toBeVisible();
  await mcpNavigation.click();

  const panel = page.locator('[data-settings-panel="mcp"]');
  await expect(panel).toBeVisible();
  await expect(panel.getByRole('heading', { name: 'Model Context Protocol' })).toBeVisible();
  await expect(panel.locator('[data-mcp-enabled]')).not.toBeChecked();
  await expect(panel.locator('[data-mcp-access]')).toHaveValue('read');
  await expect(panel.locator('[data-mcp-project]')).not.toBeChecked();
  await expect(panel.locator('[data-mcp-destructive]')).not.toBeChecked();
  await expect(panel.locator('[data-mcp-destructive]')).toBeDisabled();
  await expect(panel.locator('[data-mcp-status]')).toHaveText('Disabled');
});

test('MCP writes use FigureLoom history and return observable geometry', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => document.documentElement.dataset.figureloomReady === '1');

  const result = await page.evaluate(async () => {
    const before = window.FigureLoomCommands.pageState();
    const created = await window.FigureLoomCommands.execute('object.create', {
      object: { type:'shape', name:'MCP test object', x:25, y:40, width:160, height:90, rotation:12 }
    }, { source:'test', readOnly:false, allowDestructive:true });
    const afterCreate = window.FigureLoomCommands.pageState();
    const historyAfterCreate = await window.FigureLoomCommands.execute('history.get');
    await window.FigureLoomCommands.execute('history.undo', {}, { source:'test', readOnly:false, allowDestructive:true });
    const afterUndo = window.FigureLoomCommands.pageState();
    return { before, created, afterCreate, historyAfterCreate, afterUndo };
  });

  expect(result.created.id).toBeTruthy();
  expect(result.created.geometry).toEqual({ x:25, y:40, w:160, h:90, rotation:12 });
  expect(result.afterCreate.objects.some(object => object.id === result.created.id)).toBe(true);
  expect(result.historyAfterCreate.undoCount).toBeGreaterThan(0);
  expect(result.afterUndo.objects.some(object => object.id === result.created.id)).toBe(false);
  expect(result.afterUndo.objects.length).toBe(result.before.objects.length);
});