const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

test('six unique pages become six unique JPEG media files in the actual pptx', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => typeof window.FigureLoomSafeJpegPowerPoint === 'function');

  await page.evaluate(() => {
    const fills = ['#ff0000', '#00aa00', '#0000ff', '#ff00ff', '#00cccc', '#ffaa00'];
    state.pages = fills.map((fill, index) => ({
      id:`package-test-page-${index + 1}`,
      name:`Package page ${index + 1}`,
      objects:[{
        id:`package-test-object-${index + 1}`,
        type:'shape',
        name:`Package shape ${index + 1}`,
        x:80 + index * 9,
        y:90 + index * 7,
        width:520,
        height:280,
        fill,
        stroke:'#111111',
        strokeWidth:4,
        opacity:1,
        rotation:index * 4,
        visible:true
      }]
    }));
    state.activePage = 0;
    state.objects = state.pages[0].objects;
    state.selectedId = null;
    documentName.value = 'Six unique package pages';
  });

  const downloadPromise = page.waitForEvent('download');
  await page.evaluate(() => window.FigureLoomSafeJpegPowerPoint());
  const download = await downloadPromise;

  const outputDir = path.join(process.cwd(), 'test-results');
  fs.mkdirSync(outputDir, { recursive:true });
  const pptxPath = path.join(outputDir, 'six-unique-pages.pptx');
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

  const relatedMedia = [];
  for (let index = 1; index <= 6; index += 1) {
    const relPath = `ppt/slides/_rels/slide${index}.xml.rels`;
    const rels = execFileSync('unzip', ['-p', pptxPath, relPath], { encoding:'utf8' });
    const match = rels.match(/Target="\.\.\/media\/([^\"]+\.(?:jpe?g))"/i);
    expect(match, `slide ${index} should reference a JPEG`).not.toBeNull();
    relatedMedia.push(match[1]);
  }
  expect(new Set(relatedMedia).size).toBe(6);
});