const { test, expect } = require('@playwright/test');

async function openApp(page) {
  await page.addInitScript(() => {
    localStorage.setItem('scicanvas-guided-tour-v2', 'complete');
    localStorage.setItem('scicanvas-guided-tour-v3', 'complete');
    localStorage.setItem('scicanvas-welcome-v1', 'complete');
    localStorage.setItem('scicanvas-user-name-v1', 'Isolated Export Tester');
    localStorage.setItem('scicanvas-motion-v1', 'off');
  });
  await page.goto('/');
  await expect(page.locator('#canvas')).toBeVisible();
  await expect.poll(() => page.evaluate(() => Boolean(
    window.FigureLoomAllPagesSvgExport?.captureAllEditableSvgPages &&
    window.FigureLoomAllPagesSvgExport?.buildPowerPoint &&
    window.FigureLoomAllPagesSvgExport?.buildSvgZipBlob
  ))).toBe(true);
}

async function addPageMarker(page, number) {
  if (number > 1) await page.locator('#addPageButton').click();
  await page.locator('#addTextButton').click();
  await page.evaluate(index => {
    if (typeof makeObject !== 'function') throw new Error('FigureLoom makeObject is unavailable');
    makeObject('shape');

    const text = state.objects.at(-2);
    text.text = `EXACT ISOLATED PAGE ${index}`;
    text.name = `Isolated marker ${index}`;
    text.fill = ['#b42318', '#28745f', '#2454ad', '#7a3e9d', '#98600a', '#006d77'][index - 1];
    text.stroke = text.fill;
    text.x = 70 + index * 45;
    text.y = 80 + index * 55;

    const shape = state.objects.at(-1);
    shape.name = `Unique shape ${index}`;
    shape.fill = text.fill;
    shape.x = 620 - index * 25;
    shape.y = 120 + index * 45;
    shape.width = 120 + index * 13;
    shape.height = 80 + index * 7;

    if (typeof syncPage === 'function') syncPage();
    if (typeof render === 'function') render();
    if (typeof renderPages === 'function') renderPages();
  }, number);
}

test('three pages are captured independently and assembled into three unique PowerPoint slides', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'single deterministic desktop export test');
  await openApp(page);

  for (let number = 1; number <= 3; number += 1) await addPageMarker(page, number);
  await page.evaluate(() => switchPage(1));

  const result = await page.evaluate(async () => {
    const before = {
      activePage:state.activePage,
      objectIds:state.objects.map(item => item.id),
      text:state.objects.find(item => item.type === 'text')?.text || ''
    };

    const svgPages = await window.FigureLoomAllPagesSvgExport.captureAllEditableSvgPages({ includeGrid:false });

    class FakeSlide {
      constructor() {
        this.images = [];
        this.notes = [];
        this.background = null;
      }
      addImage(options) { this.images.push(options); }
      addNotes(notes) { this.notes.push(notes); }
    }
    class FakePptxGenJS {
      constructor() { this._slides = []; }
      defineLayout(layout) { this.layoutDefinition = layout; }
      addSlide() {
        const slide = new FakeSlide();
        this._slides.push(slide);
        return slide;
      }
      async writeFile() { throw new Error('writeFile should not run in this test'); }
    }

    const previousPptx = window.PptxGenJS;
    window.PptxGenJS = FakePptxGenJS;
    const pptx = await window.FigureLoomAllPagesSvgExport.buildPowerPoint(svgPages, { writeFile:false });
    window.PptxGenJS = previousPptx;

    const zipBlob = await window.FigureLoomAllPagesSvgExport.buildSvgZipBlob(svgPages);
    const archive = await window.JSZip.loadAsync(zipBlob);
    const zipNames = Object.keys(archive.files).filter(name => !archive.files[name].dir).sort();
    const zipSources = [];
    for (const name of zipNames) zipSources.push(await archive.file(name).async('text'));

    return {
      before,
      after:{
        activePage:state.activePage,
        objectIds:state.objects.map(item => item.id),
        text:state.objects.find(item => item.type === 'text')?.text || ''
      },
      captureMethods:svgPages.map(item => item.captureMethod),
      capturedNames:svgPages.map(item => item.fileName),
      capturedSources:svgPages.map(item => item.source),
      capturedPageIds:svgPages.map(item => item.id),
      slideCount:pptx._slides.length,
      slideImageData:pptx._slides.map(slide => slide.images[0]?.data || ''),
      zipNames,
      zipSources,
      zipSize:zipBlob.size
    };
  });

  expect(result.after).toEqual(result.before);
  expect(result.captureMethods).toEqual(['isolated', 'isolated', 'isolated']);
  expect(result.capturedNames).toEqual(['page-001.svg', 'page-002.svg', 'page-003.svg']);
  expect(new Set(result.capturedPageIds).size).toBe(3);
  expect(result.slideCount).toBe(3);
  expect(result.slideImageData).toHaveLength(3);
  expect(new Set(result.slideImageData).size).toBe(3);
  expect(result.zipNames).toEqual(result.capturedNames);
  expect(result.zipSources).toEqual(result.capturedSources);
  expect(result.zipSize).toBeGreaterThan(500);

  for (let number = 1; number <= 3; number += 1) {
    const source = result.capturedSources[number - 1];
    expect(source).toContain(`EXACT ISOLATED PAGE ${number}`);
    for (let other = 1; other <= 3; other += 1) {
      if (other !== number) expect(source).not.toContain(`EXACT ISOLATED PAGE ${other}`);
    }

    const slideSource = await page.evaluate(data => {
      const encoded = data.split(',')[1];
      const bytes = Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    }, result.slideImageData[number - 1]);
    expect(slideSource).toBe(source);
  }
});

test('six pages stay unique during repeated exports without changing the active page', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'single deterministic desktop export test');
  await openApp(page);
  for (let number = 1; number <= 6; number += 1) await addPageMarker(page, number);
  await page.evaluate(() => switchPage(3));

  const result = await page.evaluate(async () => {
    const before = { activePage:state.activePage, ids:state.objects.map(item => item.id) };
    const first = await window.FigureLoomAllPagesSvgExport.captureAllEditableSvgPages({ includeGrid:false });
    const second = await window.FigureLoomAllPagesSvgExport.captureAllEditableSvgPages({ includeGrid:false });
    return {
      before,
      after:{ activePage:state.activePage, ids:state.objects.map(item => item.id) },
      first:first.map(item => item.source),
      second:second.map(item => item.source),
      methods:first.map(item => item.captureMethod)
    };
  });

  expect(result.after).toEqual(result.before);
  expect(result.first).toHaveLength(6);
  expect(result.second).toEqual(result.first);
  expect(result.methods).toEqual(Array(6).fill('isolated'));
  expect(new Set(result.first).size).toBe(6);
  for (let number = 1; number <= 6; number += 1) {
    expect(result.first[number - 1]).toContain(`EXACT ISOLATED PAGE ${number}`);
  }
});
