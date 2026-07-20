(() => {
  if (window.__figureLoomMcpCurrentScreenshotV2) return;
  window.__figureLoomMcpCurrentScreenshotV2 = true;
  window.__figureLoomMcpCurrentScreenshotV1 = true;

  const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve));

  async function settleCurrentPage() {
    try { window.syncPage?.(); } catch {}
    try { window.render?.(); } catch {}
    await nextFrame();
    try { await window.FigureLoomFinalSessionPolishV2?.settleTextBounds?.(); } catch {}
    await nextFrame();
  }

  async function currentScreenshot(args = {}) {
    await settleCurrentPage();
    const scale = Math.max(.25, Math.min(4, Number(args.scale) || 1));
    const includeGrid = Boolean(args.includeGrid ?? args.include_grid);
    const rendered = await window.FigureLoomCommands.renderPage('png', { scale, includeGrid });
    const pageIndex = Math.max(0, Number(state?.activePage) || 0);
    const page = Array.isArray(state?.pages) ? state.pages[pageIndex] : null;
    return {
      ...rendered,
      pageIndex,
      pageName:page?.name || `Page ${pageIndex + 1}`,
      documentTitle:document.getElementById('documentName')?.value || 'Untitled figure',
      capturedAt:new Date().toISOString()
    };
  }

  function install() {
    const commands = window.FigureLoomCommands;
    if (!commands?.register || !commands?.renderPage) return false;

    commands.register('view.screenshot', {
      description:'Capture the current active FigureLoom page as a PNG screenshot after the latest edits and text bounds have settled.',
      category:'view',
      inputSchema:{ scale:'number', includeGrid:'boolean' },
      run:currentScreenshot
    });

    commands.register('page.render', {
      description:'Render the current active FigureLoom page to SVG or PNG after the latest edits have settled.',
      category:'view',
      inputSchema:{ format:'svg|png', scale:'number', includeGrid:'boolean' },
      run:async args => {
        await settleCurrentPage();
        return commands.renderPage(args.format || 'svg', {
          scale:args.scale,
          includeGrid:Boolean(args.includeGrid ?? args.include_grid)
        });
      }
    });

    dispatchEvent(new CustomEvent('figureloom-mcp-screenshot-ready'));
    return true;
  }

  if (!install()) {
    addEventListener('figureloom-command-registry-ready', install, { once:true });
    setTimeout(install, 250);
  }

  window.FigureLoomMcpCurrentScreenshot = Object.freeze({ currentScreenshot, settleCurrentPage, install });
})();
