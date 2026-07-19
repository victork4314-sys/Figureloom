import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';

const server = spawn('python3', ['-m', 'http.server', '4173'], { stdio:'ignore' });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch('http://127.0.0.1:4173/');
      if (response.ok) return;
    } catch {}
    await sleep(250);
  }
  throw new Error('Local audit server did not start.');
}

function unique(values) {
  return [...new Set(values.map(value => String(value || '').replace(/\s+/g, ' ').trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'en'));
}

try {
  await waitForServer();
  const browser = await chromium.launch({ headless:true });
  const page = await browser.newPage({ viewport:{ width:1440, height:1000 } });
  await page.addInitScript(() => {
    localStorage.setItem('scicanvas-guided-tour-v2', 'complete');
    localStorage.setItem('scicanvas-guided-tour-v3', 'complete');
    localStorage.setItem('scicanvas-welcome-v1', 'complete');
    localStorage.setItem('scicanvas-user-name-v1', 'Audit User');
    localStorage.setItem('scicanvas-motion-v1', 'off');
    localStorage.setItem('figureloom-settings-v1', JSON.stringify({ language:'en', interfaceMode:'desktop' }));
  });
  page.on('dialog', dialog => dialog.dismiss().catch(() => {}));
  await page.goto('http://127.0.0.1:4173/', { waitUntil:'domcontentloaded' });
  await page.waitForSelector('#canvas', { state:'visible', timeout:45000 });
  await page.waitForFunction(() => document.documentElement.dataset.figureloomReady === '1', null, { timeout:45000 }).catch(() => {});
  await page.waitForTimeout(1500);

  const safeSelectors = [
    '#settingsRibbonButton', '#proToolsButton', '#exportButton', '#accountProfileButton', '#collaborateRibbonButton',
    '.ribbon-tab[data-tab="home"]', '.ribbon-tab[data-tab="insert"]', '.ribbon-tab[data-tab="science"]',
    '.ribbon-tab[data-tab="layout"]', '.ribbon-tab[data-tab="design"]', '.ribbon-tab[data-tab="data"]',
    '.ribbon-tab[data-tab="review"]', '.ribbon-tab[data-tab="projects"]'
  ];
  for (const selector of safeSelectors) {
    const target = page.locator(selector).first();
    if (await target.count()) {
      await target.click({ force:true }).catch(() => {});
      await page.waitForTimeout(120);
    }
  }

  const workspaceIds = await page.locator('[data-workspace]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-workspace')).filter(Boolean));
  for (const id of workspaceIds) {
    const tools = page.locator('#proToolsButton').first();
    if (await tools.count()) await tools.click({ force:true }).catch(() => {});
    const card = page.locator(`[data-workspace="${id}"]`).first();
    if (await card.count()) {
      await card.click({ force:true }).catch(() => {});
      await page.waitForTimeout(100);
    }
  }

  const snapshot = await page.evaluate(() => {
    const excluded = [
      '#canvas','#canvas *','#objectLayer','#objectLayer *','.canvas-object','.canvas-object *',
      '.page-thumbnail>span:last-child','.layer-item','.layer-item *','[contenteditable]','[contenteditable] *',
      '.data-sheet-grid','.data-sheet-grid *','.figureloom-chat-messages','.figureloom-chat-messages *',
      '.collab-comment','.collab-comment *','.project-thumb','.project-thumb *','.template-thumb','.template-thumb *',
      'script','style','noscript','code','pre'
    ].join(',');
    const blocked = element => !element || element.hasAttribute?.('data-no-translate') || Boolean(element.closest?.(excluded));
    const records = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (blocked(node.parentElement)) continue;
      const text = String(node.nodeValue || '').replace(/\s+/g, ' ').trim();
      if (text && /[A-Za-zÀ-ÖØ-öø-ÿ]/.test(text)) records.push({ kind:'text', text, element:node.parentElement?.tagName || '' });
    }
    for (const element of document.querySelectorAll('[title],[aria-label],[placeholder],[aria-description]')) {
      if (blocked(element)) continue;
      for (const attribute of ['title','aria-label','placeholder','aria-description']) {
        const text = String(element.getAttribute(attribute) || '').replace(/\s+/g, ' ').trim();
        if (text && /[A-Za-zÀ-ÖØ-öø-ÿ]/.test(text)) records.push({ kind:attribute, text, element:element.tagName });
      }
    }
    return records;
  });

  const groups = {};
  for (const record of snapshot) {
    const key = record.text;
    groups[key] ||= { text:key, kinds:[], elements:[] };
    if (!groups[key].kinds.includes(record.kind)) groups[key].kinds.push(record.kind);
    if (!groups[key].elements.includes(record.element)) groups[key].elements.push(record.element);
  }
  const catalog = Object.values(groups).sort((a, b) => a.text.localeCompare(b.text, 'en'));
  fs.mkdirSync('artifacts', { recursive:true });
  fs.writeFileSync('artifacts/rendered-interface-audit.json', JSON.stringify({ count:catalog.length, catalog }, null, 2));
  console.log(`Rendered interface audit: ${catalog.length} unique strings`);
  await browser.close();
} finally {
  server.kill('SIGTERM');
}
