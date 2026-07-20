const path = require('path');
const { test, expect } = require('@playwright/test');

const pptxBundlePath = path.join(path.dirname(require.resolve('pptxgenjs')), 'pptxgen.bundle.js');

async function openApp(page) {
  await page.addInitScript(() => {
    localStorage.setItem('scicanvas-guided-tour-v2', 'complete');
    localStorage.setItem('scicanvas-guided-tour-v3', 'complete');
    localStorage.setItem('scicanvas-welcome-v1', 'complete');
    localStorage.setItem('scicanvas-user-name-v1', 'Real PowerPoint Tester');
    localStorage.setItem('scicanvas-motion-v1', 'off');
  });
  await page.goto('/');
  await expect(page.locator('#canvas')).toBeVisible();
  await expect.poll(() => page.evaluate(() => Boolean(
    window.FigureLoomAllPagesSvgExport?.captureAllEditableSvgPages &&
    window.FigureLoomAllPagesSvgExport?.buildPowerPoint &&
    window.FigureLoomReliablePptx?.install
  ))).toBe(true);
}

async function addDistinctPage(page, number) {
  await page.evaluate(index => {
    if (index > 1) document.getElementById('addPageButton').click();
    makeObject('text');
    const text = state.objects.at(-1);
    text.text = `REAL PPTX PAGE ${index}`;
    text.name = `Real file marker ${index}`;
    text.fill = ['#c1121f', '#006d77', '#264653', '#7b2cbf', '#bc6c25'][index - 1];
    text.stroke = text.fill;
    text.x = 60 + index * 75;
    text.y = 55 + index * 48;
    text.width = 300 + index * 11;

    makeObject('shape');
    const shape = state.objects.at(-1);
    shape.name = `Real file shape ${index}`;
    shape.fill = text.fill;
    shape.x = 700 - index * 43;
    shape.y = 180 + index * 37;
    shape.width = 95 + index * 29;
    shape.height = 70 + index * 13;
    syncPage();
    render();
    renderPages();
  }, number);
}

test('five real pages are written into a verified PowerPoint without media reuse', async ({ page }) => {
  test.setTimeout(120000);
  await openApp(page);
  await page.addScriptTag({ path:path.resolve(pptxBundlePath) });
  await page.evaluate(() => {
    const ActualPptxGenJS = window.PptxGenJS;
    if (typeof ActualPptxGenJS !== 'function') throw new Error('The test PowerPoint bundle did not load.');
    window.FigureLoomReliablePptx.install(ActualPptxGenJS);
  });

  for (let number = 1; number <= 5; number += 1) await addDistinctPage(page, number);
  await page.evaluate(() => {
    switchPage(0);
    switchPage(4);
    switchPage(1);
    switchPage(3);
    switchPage(2);
  });

  const result = await page.evaluate(async () => {
    const before = {
      activePage:state.activePage,
      pageIds:state.pages.map(item => item.id),
      objectIds:state.pages.map(item => item.objects.map(object => object.id))
    };
    const svgPages = await window.FigureLoomAllPagesSvgExport.captureAllEditableSvgPages({ includeGrid:false });
    const pptx = await window.FigureLoomAllPagesSvgExport.buildPowerPoint(svgPages, { writeFile:false });
    if (typeof pptx.writeVerifiedBlob !== 'function') throw new Error('The verified PowerPoint writer was not installed.');
    const blob = await pptx.writeVerifiedBlob({ compression:true });
    const verification = pptx.__figureLoomLastVerification;

    const archive = await window.JSZip.loadAsync(blob);
    const relationshipTexts = [];
    for (let slideNumber = 1; slideNumber <= 5; slideNumber += 1) {
      relationshipTexts.push(await archive.file(`ppt/slides/_rels/slide${slideNumber}.xml.rels`).async('text'));
    }

    const fourthTarget = new DOMParser()
      .parseFromString(relationshipTexts[3], 'application/xml')
      .querySelector('Relationship[Type$="/image"]')
      ?.getAttribute('Target');
    if (!fourthTarget) throw new Error('Slide 4 did not contain an image target.');
    const fifthXml = relationshipTexts[4].replace(
      /(<Relationship\b[^>]*\bType="[^"]*\/image"[^>]*\bTarget=")[^"]*(")/,
      `$1${fourthTarget}$2`
    );
    archive.file('ppt/slides/_rels/slide5.xml.rels', fifthXml);
    const corruptedBlob = await archive.generateAsync({
      type:'blob',
      mimeType:'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    });
    let corruptionError = '';
    try {
      await window.FigureLoomReliablePptx.validatePptxBlob(corruptedBlob, verification.actualHashes);
    } catch (error) {
      corruptionError = error.message;
    }

    return {
      before,
      after:{
        activePage:state.activePage,
        pageIds:state.pages.map(item => item.id),
        objectIds:state.pages.map(item => item.objects.map(object => object.id))
      },
      blobSize:blob.size,
      slideCount:verification.slideCount,
      actualHashes:verification.actualHashes,
      mediaTargets:verification.mediaTargets,
      svgSources:svgPages.map(item => item.source),
      corruptionError
    };
  });

  expect(result.after).toEqual(result.before);
  expect(result.blobSize).toBeGreaterThan(10000);
  expect(result.slideCount).toBe(5);
  expect(result.actualHashes).toHaveLength(5);
  expect(new Set(result.actualHashes).size).toBe(5);
  expect(result.mediaTargets).toHaveLength(5);
  expect(new Set(result.mediaTargets).size).toBe(5);
  expect(result.corruptionError).toContain('slide 5');

  for (let number = 1; number <= 5; number += 1) {
    const source = result.svgSources[number - 1];
    expect(source).toContain(`REAL PPTX PAGE ${number}`);
    for (let other = 1; other <= 5; other += 1) {
      if (other !== number) expect(source).not.toContain(`REAL PPTX PAGE ${other}`);
    }
  }
});
