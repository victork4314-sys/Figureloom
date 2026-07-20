const { test, expect } = require('@playwright/test');

async function prepare(page) {
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.addInitScript(() => {
    localStorage.setItem('scicanvas-guided-tour-v2', 'complete');
    localStorage.setItem('scicanvas-guided-tour-v3', 'complete');
    localStorage.setItem('scicanvas-welcome-v1', 'complete');
    localStorage.setItem('scicanvas-user-name-v1', 'Final Polish Test');
    localStorage.setItem('scicanvas-motion-v1', 'off');
    localStorage.setItem('figureloom-interface-theme-v1', 'light');
    localStorage.setItem('figureloom-settings-v1', JSON.stringify({
      interfaceMode:'desktop',
      textSize:'standard',
      largerControls:false,
      strongFocus:false,
      reduceMotion:true,
      highContrast:false,
      underlineLinks:false,
      readableFont:false
    }));
    sessionStorage.setItem('figureloom-quick-start-dismissed', '1');
  });

  await page.goto('/');
  await expect(page.locator('#canvas')).toBeVisible();
  await page.waitForFunction(() => Boolean(
    window.FigureLoomFinalSessionPolish &&
    window.FigureLoomFinalSessionPolishV2 &&
    window.FigureLoomMcpCurrentScreenshot &&
    window.FigureLoomMCP &&
    window.FigureLoomCommands?.get?.('view.screenshot') &&
    document.documentElement.dataset.figureloomReady === '1'
  ), null, { timeout:40000 });
  await page.waitForTimeout(250);
  return { consoleErrors, pageErrors };
}

function expectNoRuntimeErrors(errors) {
  expect(errors.pageErrors, `Uncaught page errors:\n${errors.pageErrors.join('\n')}`).toEqual([]);
  expect(errors.consoleErrors, `Console errors:\n${errors.consoleErrors.join('\n')}`).toEqual([]);
}

test('final layer owns tab chrome, repairs text on both axes, and exposes a themed MCP screenshot pointer', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop verification');
  const errors = await prepare(page);
  await expect(page.locator('html')).toHaveAttribute('data-figureloom-device-class', 'desktop');

  await page.evaluate(() => {
    let rail = document.getElementById('projectTabRail');
    if (!rail) {
      rail = document.createElement('nav');
      rail.id = 'projectTabRail';
      rail.innerHTML = '<div class="project-tab-scroll"></div><div class="project-tab-tools"><button class="project-tab-add" type="button">+</button></div>';
      document.body.appendChild(rail);
    }
    const scroll = rail.querySelector('.project-tab-scroll');
    if (!scroll.querySelector('.project-tab-wrap')) {
      const wrapper = document.createElement('div');
      wrapper.className = 'project-tab-wrap';
      wrapper.innerHTML = '<button class="project-tab active" type="button"><i class="project-tab-dot"></i><span>Untitled figure</span></button><button class="project-tab-close" type="button">×</button>';
      scroll.prepend(wrapper);
    }
    window.FigureLoomFinalSessionPolish.refresh();
  });

  const tabMetrics = await page.evaluate(() => {
    const scroll = document.querySelector('#projectTabRail .project-tab-scroll');
    const wrapper = scroll.querySelector('.project-tab-wrap');
    const title = wrapper.querySelector('.project-tab');
    const close = wrapper.querySelector('.project-tab-close');
    const add = scroll.querySelector('.project-tab-add');
    const wrapperRect = wrapper.getBoundingClientRect();
    const closeRect = close.getBoundingClientRect();
    const wrapperStyle = getComputedStyle(wrapper);
    const titleStyle = getComputedStyle(title);
    return {
      wrapperActive:wrapper.classList.contains('active'),
      wrapperBorder:Number.parseFloat(wrapperStyle.borderTopWidth),
      wrapperBackground:wrapperStyle.backgroundColor,
      titleBorder:Number.parseFloat(titleStyle.borderTopWidth),
      titleBackground:titleStyle.backgroundColor,
      closeInside:closeRect.left >= wrapperRect.left && closeRect.right <= wrapperRect.right + 1 && closeRect.top >= wrapperRect.top - 1 && closeRect.bottom <= wrapperRect.bottom + 1,
      addIsReal:Boolean(add?.classList.contains('project-tab-add')),
      addIsLast:scroll.lastElementChild === add
    };
  });
  expect(tabMetrics.wrapperActive).toBe(true);
  expect(tabMetrics.wrapperBorder).toBeGreaterThanOrEqual(1);
  expect(tabMetrics.wrapperBackground).not.toBe('rgba(0, 0, 0, 0)');
  expect(tabMetrics.titleBorder).toBe(0);
  expect(tabMetrics.titleBackground).toBe('rgba(0, 0, 0, 0)');
  expect(tabMetrics.closeInside).toBe(true);
  expect(tabMetrics.addIsReal).toBe(true);
  expect(tabMetrics.addIsLast).toBe(true);

  const textMetrics = await page.evaluate(() => {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('width', '500');
    svg.setAttribute('height', '200');
    svg.style.position = 'fixed';
    svg.style.left = '-1000px';
    document.body.appendChild(svg);

    const group = document.createElementNS(ns, 'g');
    const clip = document.createElementNS(ns, 'clipPath');
    clip.dataset.figureloomTextClip = '1';
    const rect = document.createElementNS(ns, 'rect');
    rect.setAttribute('width', '300');
    rect.setAttribute('height', '40');
    clip.appendChild(rect);
    const text = document.createElementNS(ns, 'text');
    Object.defineProperty(text, 'getBBox', {
      configurable:true,
      value:() => ({ x:-6, y:-3, width:386, height:91 })
    });
    group.append(clip, text);
    svg.appendChild(group);

    const item = {
      id:'text-clip-test',
      type:'text',
      text:'Horizontally long text\nwith a visible final line',
      x:10,
      y:10,
      width:300,
      height:40,
      fontSize:30,
      lineHeight:1.25,
      textPadding:9,
      textFlow:'auto-height',
      rotation:0
    };
    const changed = window.FigureLoomFinalSessionPolishV2.repairTextGroup(group, item);
    const result = {
      changed,
      width:item.width,
      height:item.height,
      textBoxWidth:item.textBoxWidth,
      textBoxHeight:item.textBoxHeight,
      clipX:Number(rect.getAttribute('x')),
      clipY:Number(rect.getAttribute('y')),
      clipWidth:Number(rect.getAttribute('width')),
      clipHeight:Number(rect.getAttribute('height'))
    };
    svg.remove();
    return result;
  });
  expect(textMetrics.changed).toBe(true);
  expect(textMetrics.width).toBeGreaterThan(300);
  expect(textMetrics.height).toBeGreaterThan(40);
  expect(textMetrics.textBoxWidth).toBe(textMetrics.width);
  expect(textMetrics.textBoxHeight).toBe(textMetrics.height);
  expect(textMetrics.clipX).toBeLessThan(0);
  expect(textMetrics.clipY).toBeLessThan(0);
  expect(textMetrics.clipWidth).toBeGreaterThan(386);
  expect(textMetrics.clipHeight).toBeGreaterThan(91);

  await page.evaluate(() => {
    dispatchEvent(new CustomEvent('figureloom-mcp-agent-activity', {
      detail:{
        phase:'start',
        sessionId:'claude-test-session',
        clientName:'Claude Desktop',
        command:'object.edit_text',
        args:{ id:'missing-text-object' }
      }
    }));
  });

  const cursor = page.locator('.figureloom-mcp-agent-cursor[data-session-id="claude-test-session"]');
  await expect(cursor).toHaveClass(/visible/);
  await expect(cursor.locator('b')).toHaveText('Claude');
  await expect(cursor.locator('small')).toContainText('Object Edit Text');
  await expect.poll(() => cursor.evaluate(node => node.dataset.agent)).toBe('claude');
  expect(await cursor.evaluate(node => node.style.getPropertyValue('--mcp-agent-color'))).toBe('#d97757');
  expect(await cursor.locator('.mcp-paw svg').evaluate(node => getComputedStyle(node).display)).toBe('none');
  const cursorBox = await cursor.boundingBox();
  expect(cursorBox).not.toBeNull();
  expect(cursorBox.x).toBeGreaterThanOrEqual(0);
  expect(cursorBox.y).toBeGreaterThanOrEqual(0);

  const screenshot = await page.evaluate(async () => {
    const result = await window.FigureLoomCommands.execute('view.screenshot', { scale:.25, includeGrid:false }, {
      source:'test',
      readOnly:true,
      allowDestructive:false
    });
    return {
      mimeType:result.mimeType,
      encoding:result.encoding,
      width:result.width,
      height:result.height,
      dataLength:String(result.data || '').length,
      pageIndex:result.pageIndex
    };
  });
  expect(screenshot.mimeType).toBe('image/png');
  expect(screenshot.encoding).toBe('base64');
  expect(screenshot.width).toBeGreaterThan(0);
  expect(screenshot.height).toBeGreaterThan(0);
  expect(screenshot.dataLength).toBeGreaterThan(100);
  expect(screenshot.pageIndex).toBeGreaterThanOrEqual(0);

  await page.evaluate(() => {
    dispatchEvent(new CustomEvent('figureloom-mcp-agent-activity', {
      detail:{
        phase:'end',
        sessionId:'claude-test-session',
        clientName:'Claude Desktop',
        command:'object.edit_text',
        args:{},
        ok:true
      }
    }));
  });
  await expect(cursor.locator('small')).toContainText('done');

  expectNoRuntimeErrors(errors);
});