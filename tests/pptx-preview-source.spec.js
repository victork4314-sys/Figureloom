const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

test('rendered page previews become six correctly ordered PowerPoint slides', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => typeof window.FigureLoomThumbnailPowerPoint === 'function');

  const expected = await page.evaluate(() => {
    const fills = ['#e53935', '#43a047', '#1e88e5', '#8e24aa', '#00acc1', '#fb8c00'];
    state.pages = fills.map((fill, index) => ({
      id:`preview-page-${index + 1}`,
      name:`Preview page ${index + 1}`,
      objects:[{ id:`different-data-${index + 1}`, fill }]
    }));
    state.activePage = 0;
    state.objects = state.pages[0].objects;
    state.selectedId = null;
    documentName.value = 'Six rendered preview pages';

    // Freeze the manually rendered previews so export must use these exact nodes.
    renderPages = () => {};
    window.renderPages = renderPages;

    const list = document.getElementById('pagesList');
    list.replaceChildren();
    fills.forEach((fill, index) => {
      const inner = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 550"><rect width="1000" height="550" fill="${fill}"/><text x="500" y="290" text-anchor="middle" font-size="96" fill="white">PAGE ${index + 1}</text></svg>`;
      const blobUrl = URL.createObjectURL(new Blob([inner], { type:'image/svg+xml' }));
      const button = document.createElement('button');
      button.className = 'page-thumbnail';
      const host = document.createElement('span');
      host.className = 'mini-page';
      host.innerHTML = `<svg class="page-preview-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 750"><rect width="1200" height="750" fill="white"/><image href="${blobUrl}" x="100" y="100" width="1000" height="550"/></svg>`;
      button.appendChild(host);
      list.appendChild(button);
    });
    return fills;
  });

  const downloadPromise = page.waitForEvent('download');
  await page.evaluate(() => window.FigureLoomThumbnailPowerPoint());
  const download = await downloadPromise;

  const outputDir = path.join(process.cwd(), 'test-results');
  fs.mkdirSync(outputDir, { recursive:true });
  const pptxPath = path.join(outputDir, 'six-preview-pages.pptx');
  await download.saveAs(pptxPath);

  const entries = execFileSync('unzip', ['-Z1', pptxPath], { encoding:'utf8' })
    .split(/\r?\n/)
    .filter(Boolean);
  const jpegEntries = entries.filter(entry => /^ppt\/media\/image[-\d]+\.(?:jpe?g)$/i.test(entry));
  expect(jpegEntries).toHaveLength(6);

  const hashes = jpegEntries.map(entry => {
    const bytes = execFileSync('unzip', ['-p', pptxPath, entry]);
    return crypto.createHash('sha256').update(bytes).digest('hex');
  });
  expect(new Set(hashes).size).toBe(6);

  const orderedDataUrls = [];
  for (let index = 1; index <= 6; index += 1) {
    const relPath = `ppt/slides/_rels/slide${index}.xml.rels`;
    const rels = execFileSync('unzip', ['-p', pptxPath, relPath], { encoding:'utf8' });
    const match = rels.match(/Target="\.\.\/media\/([^\"]+\.(?:jpe?g))"/i);
    expect(match, `slide ${index} should reference a JPEG`).not.toBeNull();
    const bytes = execFileSync('unzip', ['-p', pptxPath, `ppt/media/${match[1]}`]);
    orderedDataUrls.push(`data:image/jpeg;base64,${bytes.toString('base64')}`);
  }

  const sampled = await page.evaluate(async urls => {
    const read = url => new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0);
        resolve([...context.getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1).data].slice(0, 3));
      };
      image.onerror = reject;
      image.src = url;
    });
    return Promise.all(urls.map(read));
  }, orderedDataUrls);

  const expectedRgb = expected.map(hex => [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16)));
  sampled.forEach((rgb, index) => {
    rgb.forEach((value, channel) => expect(Math.abs(value - expectedRgb[index][channel])).toBeLessThanOrEqual(18));
  });
});