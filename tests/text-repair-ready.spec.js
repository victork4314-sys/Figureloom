const { test, expect } = require('@playwright/test');

function watchRuntime(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console.error: ${message.text()}`);
  });
  return errors;
}

test('text-bound repair is active before the editor is revealed', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop text readiness check');
  const errors = watchRuntime(page);

  await page.addInitScript(() => {
    localStorage.setItem('scicanvas-guided-tour-v2', 'complete');
    localStorage.setItem('scicanvas-guided-tour-v3', 'complete');
    localStorage.setItem('figureloom-passive-guide-v4', 'complete');
    localStorage.setItem('scicanvas-welcome-v1', 'complete');
    localStorage.setItem('scicanvas-user-name-v1', 'Text Ready Test');
    localStorage.setItem('scicanvas-motion-v1', 'off');
    localStorage.setItem('figureloom-interface-theme-v1', 'light');
    localStorage.setItem('figureloom-settings-v1', JSON.stringify({
      interfaceMode:'desktop', textSize:'standard', largerControls:false,
      strongFocus:false, reduceMotion:true, highContrast:false,
      underlineLinks:false, readableFont:false
    }));
    sessionStorage.setItem('figureloom-quick-start-dismissed', '1');
    window.__figureloomTextRepairAtReveal = null;
    addEventListener('figureloom-stable-ready', () => {
      window.__figureloomTextRepairAtReveal = Boolean(
        window.FigureLoomFinalSessionPolishV2?.repairTextGroup &&
        window.FigureLoomFinalSessionPolishV2?.settleTextBounds
      );
    }, { once:true });
  });

  await page.goto('/');
  await page.waitForFunction(() => document.documentElement.dataset.figureloomReady === '1');
  await expect(page.locator('#canvas')).toBeVisible();

  expect(await page.evaluate(() => window.__figureloomTextRepairAtReveal)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.__FIGURELOOM_STABLE_BUILD__)).toContain('v87');

  const repaired = await page.evaluate(() => {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.style.position = 'fixed';
    svg.style.left = '-2000px';
    document.body.appendChild(svg);
    const group = document.createElementNS(ns, 'g');
    const clip = document.createElementNS(ns, 'clipPath');
    clip.dataset.figureloomTextClip = '1';
    const rect = document.createElementNS(ns, 'rect');
    rect.setAttribute('width', '120');
    rect.setAttribute('height', '30');
    clip.appendChild(rect);
    const text = document.createElementNS(ns, 'text');
    Object.defineProperty(text, 'getBBox', {
      configurable:true,
      value:() => ({ x:-8, y:-5, width:340, height:88 })
    });
    group.append(clip, text);
    svg.appendChild(group);
    const item = { id:'crop-check', type:'text', x:10, y:10, width:120, height:30, fontSize:28 };
    const changed = window.FigureLoomFinalSessionPolishV2.repairTextGroup(group, item);
    const result = {
      changed,
      width:item.width,
      height:item.height,
      clipX:Number(rect.getAttribute('x')),
      clipY:Number(rect.getAttribute('y')),
      clipWidth:Number(rect.getAttribute('width')),
      clipHeight:Number(rect.getAttribute('height'))
    };
    svg.remove();
    return result;
  });

  expect(repaired.changed).toBe(true);
  expect(repaired.width).toBeGreaterThan(120);
  expect(repaired.height).toBeGreaterThan(30);
  expect(repaired.clipX).toBeLessThan(0);
  expect(repaired.clipY).toBeLessThan(0);
  expect(repaired.clipWidth).toBeGreaterThan(340);
  expect(repaired.clipHeight).toBeGreaterThan(88);
  expect(errors, errors.join('\n')).toEqual([]);
});