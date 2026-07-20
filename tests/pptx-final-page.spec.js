const { test, expect } = require('@playwright/test');

async function openApp(page) {
  await page.addInitScript(() => {
    localStorage.setItem('scicanvas-guided-tour-v2', 'complete');
    localStorage.setItem('scicanvas-guided-tour-v3', 'complete');
    localStorage.setItem('scicanvas-welcome-v1', 'complete');
    localStorage.setItem('scicanvas-user-name-v1', 'Export Tester');
    localStorage.setItem('scicanvas-motion-v1', 'off');
  });
  await page.goto('/');
  await expect(page.locator('#canvas')).toBeVisible();
  await expect.poll(() => page.evaluate(() => Boolean(
    window.FigureLoomEditableSvgExport?.createSource &&
    window.FigureLoomEditableSvgPowerPoint?.captureEditableSvgPages
  ))).toBe(true);
}

async function addPageMarker(page, number) {
  if (number > 1) await page.locator('#addPageButton').click();
  await page.locator('#addTextButton').click();
  await page.evaluate(index => {
    const item = state.objects.at(-1);
    item.text = `EXACT EDITABLE SVG PAGE ${index}`;
    item.name = `Exact SVG marker ${index}`;
    item.fill = ['#b42318', '#28745f', '#2454ad'][index - 1];
    item.stroke = item.fill;
    item.x = 90 + index * 55;
    item.y = 100 + index * 60;
    if (typeof syncPage === 'function') syncPage();
    if (typeof render === 'function') render();
    if (typeof renderPages === 'function') renderPages();
  }, number);
}

test('three pages run through the working editable SVG export and become three PowerPoint slides', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'single deterministic desktop conversion test');
  await openApp(page);

  for (let number = 1; number <= 3; number += 1) await addPageMarker(page, number);

  const result = await page.evaluate(async () => {
    const before = {
      activePage:state.activePage,
      text:state.objects.at(-1)?.text || ''
    };
    const normalSingleSvg = window.FigureLoomEditableSvgExport.createSource(false);
    const svgPages = await window.FigureLoomEditableSvgPowerPoint.captureEditableSvgPages({ includeGrid:false });

    window.__svgPptxSlides = [];
    window.__svgPptxWroteFile = false;
    window.PptxGenJS = class MockPptxGenJS {
      constructor() { this._slides = []; }
      defineLayout() {}
      addSlide() {
        const slide = {
          data:'',
          addImage:options => { slide.data = options.data; },
          addNotes:() => {}
        };
        this._slides.push(slide);
        window.__svgPptxSlides.push(slide);
        return slide;
      }
      async writeFile() { window.__svgPptxWroteFile = true; }
    };

    await window.FigureLoomEditableSvgPowerPoint.buildPowerPoint(svgPages);

    const decodeSvg = data => {
      const encoded = data.split(',')[1] || '';
      const binary = atob(encoded);
      const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    };

    return {
      before,
      after:{ activePage:state.activePage, text:state.objects.at(-1)?.text || '' },
      normalSingleSvg,
      svgSources:svgPages.map(item => item.source),
      slideSources:window.__svgPptxSlides.map(slide => decodeSvg(slide.data)),
      wroteFile:window.__svgPptxWroteFile
    };
  });

  expect(result.after).toEqual(result.before);
  expect(result.normalSingleSvg).toContain('EXACT EDITABLE SVG PAGE 3');
  expect(result.svgSources).toHaveLength(3);
  expect(result.slideSources).toHaveLength(3);
  expect(result.wroteFile).toBe(true);
  expect(new Set(result.svgSources).size).toBe(3);
  expect(new Set(result.slideSources).size).toBe(3);

  for (let number = 1; number <= 3; number += 1) {
    expect(result.svgSources[number - 1]).toContain(`EXACT EDITABLE SVG PAGE ${number}`);
    expect(result.slideSources[number - 1]).toBe(result.svgSources[number - 1]);
  }
  expect(result.slideSources[2]).toContain('EXACT EDITABLE SVG PAGE 3');
});
