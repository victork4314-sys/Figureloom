const { test, expect } = require('@playwright/test');

async function prepare(page) {
  await page.addInitScript(() => {
    localStorage.setItem('scicanvas-guided-tour-v2', 'complete');
    localStorage.setItem('scicanvas-guided-tour-v3', 'complete');
    localStorage.setItem('scicanvas-welcome-v1', 'complete');
    localStorage.setItem('scicanvas-user-name-v1', 'Inspector Test');
    localStorage.setItem('scicanvas-motion-v1', 'off');
    localStorage.setItem('figureloom-interface-theme-v1', 'dark');
    if (!sessionStorage.getItem('figureloom-inspector-test-initialized')) {
      localStorage.removeItem('figureloom-inspector-order-v1');
      sessionStorage.setItem('figureloom-inspector-test-initialized', '1');
    }
    localStorage.setItem('figureloom-settings-v1', JSON.stringify({
      interfaceMode:'desktop', textSize:'standard', largerControls:false,
      strongFocus:false, reduceMotion:false, highContrast:false,
      underlineLinks:false, readableFont:false
    }));
    sessionStorage.setItem('figureloom-quick-start-dismissed', '1');
  });
  await page.goto('/');
  await expect(page.locator('#canvas')).toBeVisible();
  await page.waitForFunction(() => Boolean(
    document.documentElement.dataset.figureloomReady === '1' &&
    window.__figureLoomInspectorConsistencyV1 &&
    window.FigureLoomInspectorLayout
  ));
  await page.waitForFunction(() => document.querySelectorAll('.right-panel > .inspector-section').length >= 7);
}

function sectionByHeading(page, heading) {
  return page.locator('.right-panel > .inspector-section').filter({
    has:page.locator('.figureloom-inspector-card-header', { hasText:heading })
  }).first();
}

test('inspector uses one visual system and sections can be reordered persistently', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop inspector regression');
  await prepare(page);

  const sections = page.locator('.right-panel > .inspector-section');
  const sectionCount = await sections.count();
  expect(sectionCount).toBeGreaterThanOrEqual(7);
  await expect(page.locator('.right-panel')).toHaveAttribute('data-figureloom-inspector-consistent', '1');
  await expect(page.locator('.right-panel > .inspector-section > .figureloom-inspector-card-header')).toHaveCount(sectionCount);
  await expect(page.locator('.right-panel > .inspector-section .figureloom-inspector-drag-handle')).toHaveCount(sectionCount);

  const cardStyles = await sections.evaluateAll(nodes => nodes.map(node => {
    const style = getComputedStyle(node);
    return {
      background:style.backgroundColor,
      border:style.borderTopColor,
      borderWidth:style.borderTopWidth,
      radius:style.borderRadius,
      padding:style.padding
    };
  }));
  expect(new Set(cardStyles.map(style => style.background)).size).toBe(1);
  expect(new Set(cardStyles.map(style => style.border)).size).toBe(1);
  expect(new Set(cardStyles.map(style => style.borderWidth)).size).toBe(1);
  expect(new Set(cardStyles.map(style => style.radius)).size).toBe(1);
  expect(new Set(cardStyles.map(style => style.padding)).size).toBe(1);
  expect(cardStyles[0].borderWidth).toBe('1px');
  expect(cardStyles[0].radius).toBe('11px');

  await page.waitForFunction(() => Boolean(document.getElementById('figureloomRichTextControls')));
  const nestedStyle = await page.locator('#figureloomRichTextControls').evaluate(node => {
    const style = getComputedStyle(node);
    return {
      left:style.borderLeftWidth,
      right:style.borderRightWidth,
      bottom:style.borderBottomWidth,
      top:style.borderTopWidth,
      radius:style.borderRadius,
      background:style.backgroundColor
    };
  });
  expect(nestedStyle.left).toBe('0px');
  expect(nestedStyle.right).toBe('0px');
  expect(nestedStyle.bottom).toBe('0px');
  expect(nestedStyle.top).toBe('1px');
  expect(nestedStyle.radius).toBe('0px');
  expect(nestedStyle.background).toBe('rgba(0, 0, 0, 0)');

  const controlStyles = await page.evaluate(() => {
    const ids = ['positionX','objectName','fontFamily','openFigureLoomRichText','pathwayRole'];
    return ids.map(id => {
      const node = document.getElementById(id);
      if (!node) return { id, missing:true };
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return {
        id, missing:false, height:Math.round(rect.height), fontFamily:style.fontFamily,
        fontSize:style.fontSize, fontWeight:style.fontWeight,
        borderRadius:style.borderRadius, background:style.backgroundColor,
        color:style.color
      };
    });
  });
  expect(controlStyles.every(style => !style.missing)).toBe(true);
  expect(new Set(controlStyles.map(style => style.height)).size).toBe(1);
  expect(controlStyles[0].height).toBe(36);
  expect(new Set(controlStyles.map(style => style.fontFamily)).size).toBe(1);
  expect(new Set(controlStyles.map(style => style.fontSize)).size).toBe(1);
  expect(new Set(controlStyles.map(style => style.fontWeight)).size).toBe(1);
  expect(new Set(controlStyles.map(style => style.borderRadius)).size).toBe(1);
  expect(new Set(controlStyles.map(style => style.background)).size).toBe(1);
  expect(new Set(controlStyles.map(style => style.color)).size).toBe(1);
  expect(controlStyles[0].fontSize).toBe('12px');
  expect(controlStyles[0].borderRadius).toBe('8px');

  const identity = sectionByHeading(page, 'Object identity');
  const position = sectionByHeading(page, 'Position and size');
  await expect(identity).toBeVisible();
  await expect(position).toBeVisible();
  const before = await page.evaluate(() => window.FigureLoomInspectorLayout.order());
  const identityKey = await identity.getAttribute('data-figureloom-inspector-key');
  const positionKey = await position.getAttribute('data-figureloom-inspector-key');
  expect(before.indexOf(identityKey)).toBeLessThan(before.indexOf(positionKey));

  const positionHandle = position.locator('.figureloom-inspector-drag-handle');
  await positionHandle.scrollIntoViewIfNeeded();
  const handleBox = await positionHandle.boundingBox();
  const identityBox = await identity.boundingBox();
  expect(handleBox).not.toBeNull();
  expect(identityBox).not.toBeNull();
  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(identityBox.x + identityBox.width / 2, identityBox.y + 5, { steps:12 });
  await page.mouse.up();

  await expect.poll(async () => {
    const order = await page.evaluate(() => window.FigureLoomInspectorLayout.order());
    return order.indexOf(positionKey) < order.indexOf(identityKey);
  }).toBe(true);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('figureloom-inspector-order-v1')));
  expect(stored.indexOf(positionKey)).toBeLessThan(stored.indexOf(identityKey));

  await page.reload();
  await page.waitForFunction(() => Boolean(document.documentElement.dataset.figureloomReady === '1' && window.FigureLoomInspectorLayout));
  const restored = await page.evaluate(() => window.FigureLoomInspectorLayout.order());
  expect(restored.indexOf(positionKey)).toBeLessThan(restored.indexOf(identityKey));

  const restoredPosition = sectionByHeading(page, 'Position and size');
  const restoredHandle = restoredPosition.locator('.figureloom-inspector-drag-handle');
  await restoredHandle.focus();
  await restoredHandle.press('ArrowDown');
  const keyboardOrder = await page.evaluate(() => window.FigureLoomInspectorLayout.order());
  expect(keyboardOrder.indexOf(positionKey)).toBeGreaterThan(restored.indexOf(positionKey));
});
