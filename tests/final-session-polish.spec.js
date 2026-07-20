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
    window.FigureLoomMCP &&
    document.documentElement.dataset.figureloomReady === '1'
  ), null, { timeout:40000 });
  await page.waitForTimeout(250);
  return { consoleErrors, pageErrors };
}

function expectNoRuntimeErrors(errors) {
  expect(errors.pageErrors, `Uncaught page errors:\n${errors.pageErrors.join('\n')}`).toEqual([]);
  expect(errors.consoleErrors, `Console errors:\n${errors.consoleErrors.join('\n')}`).toEqual([]);
}

test('final layer owns tab chrome, protects text bounds, and shows the named MCP paw', async ({ page }, testInfo) => {
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
    const group = document.createElementNS(ns, 'g');
    const clip = document.createElementNS(ns, 'clipPath');
    clip.dataset.figureloomTextClip = '1';
    const rect = document.createElementNS(ns, 'rect');
    rect.setAttribute('width', '300');
    rect.setAttribute('height', '40');
    clip.appendChild(rect);
    const text = document.createElementNS(ns, 'text');
    text.append(document.createElementNS(ns, 'tspan'), document.createElementNS(ns, 'tspan'));
    group.append(clip, text);
    const item = {
      id:'text-clip-test',
      type:'text',
      text:'gypq\nsecond line',
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
    window.FigureLoomFinalSessionPolish.textSafetyHeight(item, group);
    return {
      height:item.height,
      textBoxHeight:item.textBoxHeight,
      clipY:Number(rect.getAttribute('y')),
      clipHeight:Number(rect.getAttribute('height'))
    };
  });
  expect(textMetrics.height).toBeGreaterThan(40);
  expect(textMetrics.textBoxHeight).toBe(textMetrics.height);
  expect(textMetrics.clipY).toBeLessThan(0);
  expect(textMetrics.clipHeight).toBeGreaterThan(textMetrics.height);

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
  const cursorBox = await cursor.boundingBox();
  expect(cursorBox).not.toBeNull();
  expect(cursorBox.x).toBeGreaterThanOrEqual(0);
  expect(cursorBox.y).toBeGreaterThanOrEqual(0);

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
