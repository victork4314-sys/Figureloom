const { test, expect } = require('@playwright/test');

async function prepare(page, mode) {
  await page.addInitScript(interfaceMode => {
    localStorage.setItem('scicanvas-guided-tour-v2', 'complete');
    localStorage.setItem('scicanvas-guided-tour-v3', 'complete');
    localStorage.setItem('scicanvas-welcome-v1', 'complete');
    localStorage.setItem('scicanvas-user-name-v1', 'Brand Test');
    sessionStorage.setItem('figureloom-quick-start-dismissed', '1');
    localStorage.setItem('figureloom-settings-v1', JSON.stringify({
      interfaceMode,
      textSize:'standard',
      largerControls:false,
      strongFocus:false,
      reduceMotion:false,
      highContrast:false,
      underlineLinks:false,
      readableFont:false
    }));
  }, mode);
  await page.goto('/');
  await expect(page.locator('#canvas')).toBeVisible();
  await page.waitForFunction(() => Boolean(window.FigureLoomVisibleBranding && window.FigureLoomSettingsPage));
  await page.waitForTimeout(300);
}

async function visibleLeaks(page) {
  return page.evaluate(() => {
    const pattern = /scicanvas/i;
    const excluded = [
      '#canvas', '#objectLayer', '.canvas-object', '.canvas-text',
      '#documentName', '#userGreetingButton',
      '[contenteditable="true"]', '[data-user-content="true"]',
      '[data-project-content="true"]', '[data-imported-content="true"]',
      '.project-tab', '.projects-open-chip', '.project-name',
      '.project-card-title', '.project-gallery-card', '.gallery-project-name',
      '.page-thumbnail', '.page-name', '.layer-name',
      '.chat-message', '.collaboration-message', '.collab-chat-message',
      '.code-window', '.instruction-block', 'pre', 'code'
    ].join(',');
    const leaks = [];
    const visible = element => {
      if (!(element instanceof Element) || element.closest(excluded)) return false;
      const style = getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth;
    };

    if (pattern.test(document.title)) leaks.push(`title: ${document.title}`);
    document.querySelectorAll('meta[name="description"],meta[property="og:title"],meta[property="og:description"],meta[name="twitter:title"],meta[name="twitter:description"],meta[name="application-name"],meta[name="apple-mobile-web-app-title"]')
      .forEach(meta => {
        const value = meta.content || '';
        if (pattern.test(value)) leaks.push(`meta: ${value}`);
      });

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const parent = node.parentElement;
      const text = node.nodeValue || '';
      if (parent && visible(parent) && pattern.test(text)) leaks.push(`text: ${text.trim()}`);
    }

    const attributes = ['title','aria-label','aria-description','aria-valuetext','placeholder','alt','data-tooltip','data-title','data-label'];
    document.querySelectorAll('*').forEach(element => {
      if (!visible(element)) return;
      for (const attribute of attributes) {
        const value = element.getAttribute(attribute) || '';
        if (pattern.test(value)) leaks.push(`${attribute}: ${value}`);
      }
      if (element instanceof HTMLInputElement && ['button','submit','reset'].includes(element.type) && pattern.test(element.value || '')) {
        leaks.push(`value: ${element.value}`);
      }
      for (const pseudo of ['::before','::after']) {
        const content = getComputedStyle(element, pseudo).content || '';
        if (content !== 'none' && pattern.test(content)) leaks.push(`${pseudo}: ${content}`);
      }
    });
    return [...new Set(leaks)];
  });
}

async function expectNoVisibleSciCanvas(page, label) {
  await page.waitForTimeout(80);
  expect(await visibleLeaks(page), label).toEqual([]);
}

test('all rendered product branding says FigureLoom on desktop and phone', async ({ page }, testInfo) => {
  const mode = testInfo.project.name === 'mobile' ? 'phone' : 'desktop';
  await prepare(page, mode);
  await expectNoVisibleSciCanvas(page, 'initial interface');

  await page.evaluate(() => window.openSciCanvasWelcome?.({ edit:true }));
  await expect(page.locator('#scWelcome')).toHaveClass(/open/);
  await expectNoVisibleSciCanvas(page, 'welcome dialog');
  await page.locator('#scWelcome .welcome-secondary').click();

  await page.evaluate(() => window.openSciCanvasTour?.());
  await expect(page.locator('#scicanvasTour')).toHaveClass(/open/);
  await expectNoVisibleSciCanvas(page, 'passive guide');
  await page.locator('#scicanvasTour [data-tour="close"]').click();

  await page.evaluate(() => window.FigureLoomSettingsPage.open());
  await expect(page.locator('#figureloomSettingsPage')).toBeVisible();
  await expectNoVisibleSciCanvas(page, 'settings page');
  await page.locator('#figureloomSettingsPage [data-settings-close]').click();
});

test('late-created UI is renamed without touching user or project content', async ({ page }, testInfo) => {
  const mode = testInfo.project.name === 'mobile' ? 'phone' : 'desktop';
  await prepare(page, mode);

  await page.locator('#documentName').fill('SciCanvas research project');
  await page.evaluate(() => {
    const userText = document.createElement('div');
    userText.id = 'brandingUserText';
    userText.dataset.userContent = 'true';
    userText.contentEditable = 'true';
    userText.textContent = 'SciCanvas is part of my experimental note';
    document.body.appendChild(userText);

    const interfaceCard = document.createElement('section');
    interfaceCard.id = 'brandingDynamicInterface';
    interfaceCard.innerHTML = `
      <h2>SciCanvas cloud tools</h2>
      <button title="Open SciCanvas" aria-label="Open SciCanvas">SciCanvas action</button>
      <input placeholder="Search SciCanvas" />
      <p>Download a .scicanvas backup</p>`;
    document.body.appendChild(interfaceCard);
  });

  await expect(page.locator('#brandingDynamicInterface')).toContainText('FigureLoom cloud tools');
  await expect(page.locator('#brandingDynamicInterface')).toContainText('Download a .figureloom backup');
  await expect(page.locator('#brandingDynamicInterface button')).toHaveAttribute('title', 'Open FigureLoom');
  await expect(page.locator('#brandingDynamicInterface button')).toHaveAttribute('aria-label', 'Open FigureLoom');
  await expect(page.locator('#brandingDynamicInterface input')).toHaveAttribute('placeholder', 'Search FigureLoom');
  await expect(page.locator('#documentName')).toHaveValue('SciCanvas research project');
  await expect(page.locator('#brandingUserText')).toHaveText('SciCanvas is part of my experimental note');
  await expectNoVisibleSciCanvas(page, 'dynamic interface excluding user content');
});

test('new backup filenames use .figureloom and legacy .scicanvas remains importable', async ({ page }, testInfo) => {
  const mode = testInfo.project.name === 'mobile' ? 'phone' : 'desktop';
  await prepare(page, mode);

  const result = await page.evaluate(() => {
    const link = document.createElement('a');
    link.href = 'data:application/json,{}';
    link.download = 'SciCanvas project.scicanvas';
    link.addEventListener('click', event => event.preventDefault());
    document.body.appendChild(link);
    link.click();

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.scicanvas';
    document.body.appendChild(input);
    window.FigureLoomVisibleBranding.refresh();

    return {
      download:link.download,
      accept:input.accept,
      legacyKey:localStorage.getItem('scicanvas-user-name-v1')
    };
  });

  expect(result.download).toBe('FigureLoom project.figureloom');
  expect(result.accept).toContain('.figureloom');
  expect(result.accept).toContain('.scicanvas');
  expect(result.legacyKey).toBe('Brand Test');
});