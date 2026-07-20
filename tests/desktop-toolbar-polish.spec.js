const { test, expect } = require('@playwright/test');

test('desktop toolbar controls stay compact, centered and unsquished', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop geometry check');

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => {
    localStorage.setItem('scicanvas-guided-tour-v2', '1');
    localStorage.setItem('scicanvas-guided-tour-v3', 'complete');
    localStorage.setItem('scicanvas-welcome-v1', 'complete');
    localStorage.setItem('figureloom-settings-v1', JSON.stringify({
      interfaceMode:'desktop',
      textSize:'standard',
      largerControls:false,
      strongFocus:false,
      reduceMotion:false,
      highContrast:false,
      underlineLinks:false,
      readableFont:false
    }));
  });

  await page.goto('/');
  await page.waitForFunction(() => document.documentElement.dataset.figureloomReady === '1');
  await expect(page.locator('html')).toHaveAttribute('data-figureloom-device-class', 'desktop');
  await expect(page.locator('#settingsRibbonButton')).toBeVisible();
  await expect(page.locator('#exportButton')).toBeVisible();
  await expect(page.locator('#tourHelpButton')).toBeVisible();

  const metrics = await page.evaluate(() => {
    const rect = node => {
      const box = node.getBoundingClientRect();
      return {
        width:box.width,
        height:box.height,
        centerY:box.top + box.height / 2,
        clientWidth:node.clientWidth,
        clientHeight:node.clientHeight,
        scrollWidth:node.scrollWidth,
        scrollHeight:node.scrollHeight
      };
    };
    const visible = node => {
      const style = getComputedStyle(node);
      const box = node.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0;
    };

    const settings = document.getElementById('settingsRibbonButton');
    const exportButton = document.getElementById('exportButton');
    const help = document.getElementById('tourHelpButton');
    const titlebar = document.querySelector('.titlebar');
    const tabs = [...document.querySelectorAll('.ribbon-tabs > button')].filter(visible);
    const ordinaryTab = tabs.find(node => node !== settings);
    const tools = [...document.querySelectorAll('.ribbon button')].filter(visible).map(node => ({
      label:node.textContent.trim() || node.id,
      ...rect(node)
    }));

    return {
      settings:rect(settings),
      ordinaryTab:rect(ordinaryTab),
      exportButton:rect(exportButton),
      help:rect(help),
      titlebar:rect(titlebar),
      tools
    };
  });

  expect(Math.abs(metrics.settings.centerY - metrics.ordinaryTab.centerY)).toBeLessThanOrEqual(1.5);
  expect(metrics.settings.height).toBeLessThanOrEqual(28);

  expect(Math.abs(metrics.exportButton.centerY - metrics.titlebar.centerY)).toBeLessThanOrEqual(1.5);
  expect(metrics.exportButton.height).toBeLessThanOrEqual(26);

  expect(Math.abs(metrics.help.width - metrics.help.height)).toBeLessThanOrEqual(1);
  expect(metrics.help.width).toBeLessThanOrEqual(26);
  expect(Math.abs(metrics.help.centerY - metrics.titlebar.centerY)).toBeLessThanOrEqual(1.5);

  expect(metrics.tools.length).toBeGreaterThan(3);
  for (const tool of metrics.tools) {
    expect(tool.height, `${tool.label} height`).toBeLessThanOrEqual(24);
    expect(tool.height, `${tool.label} height`).toBeGreaterThanOrEqual(21);
    expect(tool.scrollHeight, `${tool.label} vertical clipping`).toBeLessThanOrEqual(tool.clientHeight + 2);
  }
});
