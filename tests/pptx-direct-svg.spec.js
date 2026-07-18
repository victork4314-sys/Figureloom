const { test, expect } = require('@playwright/test');

test('all-pages PowerPoint produces six unique SVG slides without canvases', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => typeof window.FigureLoomDirectSvgPowerPoint === 'function');

  await page.evaluate(() => {
    window.__figureLoomRecordedSlides = [];
    window.__figureLoomCanvasCreates = 0;
    window.__figureLoomPptxWritten = false;

    const originalCreateElement = document.createElement.bind(document);
    document.createElement = function patchedCreateElement(name, ...args) {
      if (String(name).toLowerCase() === 'canvas') window.__figureLoomCanvasCreates += 1;
      return originalCreateElement(name, ...args);
    };

    class FakeSlide {
      addImage(options) {
        window.__figureLoomRecordedSlides.push(options.data);
      }
      addNotes() {}
    }

    window.PptxGenJS = class FakePptxGenJS {
      defineLayout() {}
      addSlide() { return new FakeSlide(); }
      async writeFile() { window.__figureLoomPptxWritten = true; }
    };

    const fills = ['#ff0000', '#00aa00', '#0000ff', '#ff00ff', '#00cccc', '#ffaa00'];
    state.pages = fills.map((fill, index) => ({
      id:`test-page-${index + 1}`,
      name:`Unique page ${index + 1}`,
      objects:[{
        id:`test-object-${index + 1}`,
        type:'shape',
        name:`Unique shape ${index + 1}`,
        x:50 + index * 10,
        y:70 + index * 8,
        width:280,
        height:160,
        fill,
        stroke:'#111111',
        strokeWidth:3,
        opacity:1,
        rotation:index * 3,
        visible:true
      }]
    }));
    state.activePage = 0;
    state.objects = state.pages[0].objects;
    state.selectedId = null;
  });

  await page.evaluate(() => window.FigureLoomDirectSvgPowerPoint());

  const result = await page.evaluate(() => ({
    slides:window.__figureLoomRecordedSlides,
    canvases:window.__figureLoomCanvasCreates,
    written:window.__figureLoomPptxWritten
  }));

  expect(result.written).toBe(true);
  expect(result.canvases).toBe(0);
  expect(result.slides).toHaveLength(6);
  expect(new Set(result.slides).size).toBe(6);

  result.slides.forEach((data, index) => {
    expect(data.startsWith('data:image/svg+xml;base64,')).toBe(true);
    const xml = Buffer.from(data.split(',')[1], 'base64').toString('utf8');
    expect(xml).toContain(`"figureloomPage":${index + 1}`);
    expect(xml).toContain(`test-page-${index + 1}`);
    expect(xml).toContain(`Unique page ${index + 1}`);
  });
});
