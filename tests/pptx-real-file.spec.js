const path = require('path');
const { test, expect } = require('@playwright/test');

const jsZipBundlePath = path.join(path.dirname(require.resolve('jszip')), '../dist/jszip.min.js');

async function openApp(page) {
  await page.addInitScript(() => {
    localStorage.setItem('scicanvas-guided-tour-v2', 'complete');
    localStorage.setItem('scicanvas-guided-tour-v3', 'complete');
    localStorage.setItem('scicanvas-welcome-v1', 'complete');
    localStorage.setItem('scicanvas-user-name-v1', 'Direct PowerPoint Tester');
    localStorage.setItem('scicanvas-motion-v1', 'off');
  });
  await page.goto('/');
  await expect(page.locator('#canvas')).toBeVisible();
  await page.addScriptTag({ path:path.resolve(jsZipBundlePath) });
  await expect.poll(() => page.evaluate(() => Boolean(
    window.FigureLoomAllPagesSvgExport?.captureAllEditableSvgPages &&
    window.FigureLoomAllPagesSvgExport?.buildPowerPoint &&
    window.FigureLoomDirectPowerPoint?.validatePresentationBlob &&
    typeof window.PptxGenJS === 'function'
  ))).toBe(true);
}

async function addDistinctPage(page, number) {
  await page.evaluate(index => {
    if (index > 1) document.getElementById('addPageButton').click();
    makeObject('text');
    const text = state.objects.at(-1);
    text.text = `DIRECT PPTX PAGE ${index}`;
    text.name = `Direct file marker ${index}`;
    text.fill = ['#c1121f', '#006d77', '#264653', '#7b2cbf', '#bc6c25'][index - 1];
    text.stroke = text.fill;
    text.x = 60 + index * 75;
    text.y = 55 + index * 48;
    text.width = 300 + index * 11;

    makeObject('shape');
    const shape = state.objects.at(-1);
    shape.name = `Direct file shape ${index}`;
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

test('five real pages are written directly with one unique PNG per PowerPoint slide', async ({ page }) => {
  test.setTimeout(120000);
  await openApp(page);

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
    const blob = await pptx.write({ outputType:'blob' });
    const archive = await window.JSZip.loadAsync(blob);

    const relationshipTexts = [];
    const mediaTargets = [];
    const mediaMarkers = [];
    const pageRecords = [];
    for (let slideNumber = 1; slideNumber <= 5; slideNumber += 1) {
      const relationshipPath = `ppt/slides/_rels/slide${slideNumber}.xml.rels`;
      const relationshipText = await archive.file(relationshipPath).async('text');
      relationshipTexts.push(relationshipText);
      const target = new DOMParser()
        .parseFromString(relationshipText, 'application/xml')
        .querySelector('Relationship[Type$="/image"]')
        ?.getAttribute('Target');
      if (!target) throw new Error(`Slide ${slideNumber} did not contain an image target.`);
      mediaTargets.push(target);
      const mediaPath = `ppt/media/${target.split('/').at(-1)}`;
      const bytes = await archive.file(mediaPath).async('uint8array');
      const text = new TextDecoder('latin1').decode(bytes);
      const markerMatch = text.match(/FigureLoomPage\u0000(\d+-[0-9a-f]{8})/);
      if (!markerMatch) throw new Error(`Slide ${slideNumber} did not contain its direct page marker.`);
      mediaMarkers.push(markerMatch[1]);
      pageRecords.push({ index:slideNumber, token:markerMatch[1] });
    }

    const fourthTarget = mediaTargets[3];
    const corruptedRelationship = relationshipTexts[4].replace(
      /(<Relationship\b[^>]*\bType="[^"]*\/image"[^>]*\bTarget=")[^"]*(")/,
      `$1${fourthTarget}$2`
    );
    archive.file('ppt/slides/_rels/slide5.xml.rels', corruptedRelationship);
    const corruptedBlob = await archive.generateAsync({
      type:'blob',
      mimeType:'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    });
    let corruptionError = '';
    try {
      await window.FigureLoomDirectPowerPoint.validatePresentationBlob(corruptedBlob, pageRecords);
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
      mediaTargets,
      mediaMarkers,
      svgSources:svgPages.map(item => item.source),
      corruptionError
    };
  });

  expect(result.after).toEqual(result.before);
  expect(result.blobSize).toBeGreaterThan(10000);
  expect(result.mediaTargets).toHaveLength(5);
  expect(new Set(result.mediaTargets).size).toBe(5);
  expect(result.mediaMarkers).toHaveLength(5);
  expect(new Set(result.mediaMarkers).size).toBe(5);
  expect(result.corruptionError).toContain('slide 5');

  for (let number = 1; number <= 5; number += 1) {
    const source = result.svgSources[number - 1];
    expect(source).toContain(`DIRECT PPTX PAGE ${number}`);
    for (let other = 1; other <= 5; other += 1) {
      if (other !== number) expect(source).not.toContain(`DIRECT PPTX PAGE ${other}`);
    }
  }
});
