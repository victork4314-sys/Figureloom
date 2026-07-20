const { test, expect } = require('@playwright/test');

async function openApp(page) {
  await page.addInitScript(() => {
    localStorage.setItem('scicanvas-guided-tour-v2', 'complete');
    localStorage.setItem('scicanvas-guided-tour-v3', 'complete');
    localStorage.setItem('scicanvas-welcome-v1', 'complete');
    localStorage.setItem('scicanvas-user-name-v1', 'SVG ZIP Export Tester');
    localStorage.setItem('scicanvas-motion-v1', 'off');
  });
  await page.goto('/');
  await expect(page.locator('#canvas')).toBeVisible();
  await expect.poll(() => page.evaluate(() => Boolean(
    window.FigureLoomEditableSvgExport?.createSource &&
    window.FigureLoomAllPagesSvgExport?.captureAllEditableSvgPages &&
    window.FigureLoomAllPagesSvgExport?.buildSvgZipBlob
  ))).toBe(true);
}

async function addPageMarker(page, number) {
  if (number > 1) await page.locator('#addPageButton').click();
  await page.locator('#addTextButton').click();
  await page.evaluate(index => {
    const item = state.objects.at(-1);
    item.text = `EXACT SVG ZIP PAGE ${index}`;
    item.name = `SVG ZIP marker ${index}`;
    item.fill = ['#b42318', '#28745f', '#2454ad'][index - 1];
    item.stroke = item.fill;
    item.x = 90 + index * 55;
    item.y = 100 + index * 60;
    if (typeof syncPage === 'function') syncPage();
    if (typeof render === 'function') render();
    if (typeof renderPages === 'function') renderPages();
  }, number);
}

test('three project pages become three separate editable SVG files in one ZIP', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'single deterministic desktop ZIP test');
  await openApp(page);

  for (let number = 1; number <= 3; number += 1) await addPageMarker(page, number);

  const result = await page.evaluate(async () => {
    const before = {
      activePage:state.activePage,
      text:state.objects.at(-1)?.text || ''
    };

    const normalSingleSvg = window.FigureLoomEditableSvgExport.createSource(false);
    const svgPages = await window.FigureLoomAllPagesSvgExport.captureAllEditableSvgPages({ includeGrid:false });
    const zipBlob = await window.FigureLoomAllPagesSvgExport.buildSvgZipBlob(svgPages);
    const archive = await window.JSZip.loadAsync(zipBlob);
    const names = Object.keys(archive.files).filter(name => !archive.files[name].dir).sort();
    const sources = [];
    for (const name of names) sources.push(await archive.file(name).async('text'));

    return {
      before,
      after:{ activePage:state.activePage, text:state.objects.at(-1)?.text || '' },
      normalSingleSvg,
      capturedNames:svgPages.map(item => item.fileName),
      capturedSources:svgPages.map(item => item.source),
      zipNames:names,
      zipSources:sources,
      zipSize:zipBlob.size
    };
  });

  expect(result.after).toEqual(result.before);
  expect(result.normalSingleSvg).toContain('EXACT SVG ZIP PAGE 3');
  expect(result.capturedNames).toEqual(['page-001.svg', 'page-002.svg', 'page-003.svg']);
  expect(result.zipNames).toEqual(['page-001.svg', 'page-002.svg', 'page-003.svg']);
  expect(result.capturedSources).toHaveLength(3);
  expect(result.zipSources).toHaveLength(3);
  expect(new Set(result.capturedSources).size).toBe(3);
  expect(new Set(result.zipSources).size).toBe(3);
  expect(result.zipSize).toBeGreaterThan(500);

  for (let number = 1; number <= 3; number += 1) {
    expect(result.capturedSources[number - 1]).toContain(`EXACT SVG ZIP PAGE ${number}`);
    expect(result.zipSources[number - 1]).toBe(result.capturedSources[number - 1]);
  }
  expect(result.zipSources[2]).toContain('EXACT SVG ZIP PAGE 3');
});
