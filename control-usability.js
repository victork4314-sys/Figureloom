(() => {
  const stage = document.getElementById('canvasStage');
  const toolbar = document.querySelector('.canvas-toolbar');
  const leftPanel = document.querySelector('.left-panel');
  const rightPanel = document.querySelector('.right-panel');
  if (!stage || !toolbar || !leftPanel || !rightPanel) return;

  toolbar.setAttribute('aria-label','Canvas navigation and view controls');

  const pagesButton = document.createElement('button');
  pagesButton.type = 'button';
  pagesButton.id = 'mobilePagesButton';
  pagesButton.textContent = 'Pages';
  pagesButton.title = 'Open pages and layers';

  const formatButton = document.createElement('button');
  formatButton.type = 'button';
  formatButton.id = 'mobileFormatButton';
  formatButton.textContent = 'Format';
  formatButton.title = 'Open object formatting controls';

  toolbar.prepend(pagesButton);
  toolbar.appendChild(formatButton);

  function closePanels() {
    document.body.classList.remove('show-pages-panel','show-format-panel');
  }

  pagesButton.addEventListener('click', event => {
    event.stopPropagation();
    const opening = !document.body.classList.contains('show-pages-panel');
    closePanels();
    if (opening) document.body.classList.add('show-pages-panel');
  });

  formatButton.addEventListener('click', event => {
    event.stopPropagation();
    const opening = !document.body.classList.contains('show-format-panel');
    closePanels();
    if (opening) document.body.classList.add('show-format-panel');
  });

  document.addEventListener('pointerdown', event => {
    if (window.innerWidth > 900) return;
    if (leftPanel.contains(event.target) || rightPanel.contains(event.target) || pagesButton.contains(event.target) || formatButton.contains(event.target)) return;
    closePanels();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closePanels();
  });

  function normalizeToolbarLabels() {
    const health = document.getElementById('projectHealthButton');
    if (health) {
      health.dataset.fullLabel ||= health.textContent.trim() || 'Check project';
      const wanted = window.innerWidth <= 560 ? 'Check' : health.dataset.fullLabel;
      if (health.textContent !== wanted) health.textContent = wanted;
      health.title ||= 'Check and repair project data';
    }
  }

  function labelClippedControls() {
    normalizeToolbarLabels();
    document.querySelectorAll('button').forEach(button => {
      const label = button.textContent.trim();
      if (!label) return;
      if (!button.title) button.title = label;
      button.classList.toggle('text-clipped', button.scrollWidth > button.clientWidth + 2 || button.scrollHeight > button.clientHeight + 2);
    });
  }

  const resizeObserver = new ResizeObserver(labelClippedControls);
  resizeObserver.observe(document.body);
  new MutationObserver(labelClippedControls).observe(document.body,{childList:true,subtree:true,characterData:true});
  window.addEventListener('resize',labelClippedControls);
  requestAnimationFrame(labelClippedControls);

  const style = document.createElement('style');
  style.textContent = `
    body{min-width:0!important}
    button{max-width:100%;min-width:0;overflow-wrap:anywhere;line-height:1.2}
    .title-actions,.ribbon,.tool-group,.canvas-toolbar,.pack-links,.editable-svg-actions,.text-actions{min-width:0}
    .title-actions{flex-wrap:wrap;align-content:center}
    .title-actions button,.ribbon button,.panel-heading button,.utility-action,.assistant-examples button,.pack-icon button,.pack-browser-head button{height:auto;min-height:34px;white-space:normal;text-align:center}
    .ribbon{overflow-x:auto;overflow-y:hidden;flex-wrap:nowrap;scrollbar-width:thin;-webkit-overflow-scrolling:touch}
    .tool-group{flex:0 0 auto;max-width:none}
    .tool-group button{flex:0 0 auto;min-width:52px}
    .ribbon-tabs{overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch}
    .ribbon-tab{flex:0 0 auto;white-space:nowrap}
    .canvas-stage{display:block!important;place-items:unset!important;overflow:scroll!important;text-align:center;overscroll-behavior:contain;scrollbar-gutter:stable both-edges;-webkit-overflow-scrolling:touch}
    #canvas{display:block!important;max-width:none!important;margin:0 auto!important;flex:none!important}
    .canvas-stage::-webkit-scrollbar{width:13px;height:13px}.canvas-stage::-webkit-scrollbar-thumb{background:#aeb9c8;border:3px solid #eef2f7;border-radius:999px}.canvas-stage::-webkit-scrollbar-track{background:#eef2f7}
    .canvas-toolbar{display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:6px!important;width:max-content!important;height:auto!important;min-height:46px!important;max-width:calc(100% - 20px)!important;padding:6px!important;box-sizing:border-box!important;overflow-x:auto!important;overflow-y:hidden!important;scrollbar-width:none;white-space:nowrap;-webkit-overflow-scrolling:touch;touch-action:pan-x}
    .canvas-toolbar::-webkit-scrollbar{display:none}
    .canvas-toolbar button{flex:0 0 auto!important;width:auto!important;min-width:34px!important;max-width:none!important;height:34px!important;min-height:34px!important;padding:0 9px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;white-space:nowrap!important;overflow:visible!important;overflow-wrap:normal!important;line-height:1!important;box-sizing:border-box!important}
    .canvas-toolbar #zoomValue{flex:0 0 auto!important;display:inline-flex;align-items:center;justify-content:center;min-width:44px;height:34px;padding:0 4px;white-space:nowrap;box-sizing:border-box}
    .canvas-toolbar .text-clipped{outline:none!important}
    .text-clipped{outline:2px solid rgba(37,99,235,.18);outline-offset:1px}
    #mobilePagesButton,#mobileFormatButton{display:none}
    .utility-drawer,.packs-drawer,#scienceDrawer{max-width:calc(100vw - 20px)!important}
    .utility-body button,.utility-body input,.utility-body select,.utility-body textarea{max-width:100%}
    .assistant-examples button,.pack-source p,.tool-note{overflow-wrap:anywhere}

    @media(max-width:1100px){
      .titlebar{grid-template-columns:auto minmax(150px,1fr) auto;gap:8px;padding:6px 10px}.document-title input{width:min(260px,100%)}
      .title-actions{gap:5px}.title-actions button{padding:6px 8px;font-size:11px}
    }

    @media(max-width:900px){
      .app-shell{grid-template-rows:auto 38px auto minmax(0,1fr) 28px}
      .titlebar{grid-template-columns:auto 1fr;grid-template-areas:'brand actions' 'document document';min-height:58px}
      .brand{grid-area:brand}.brand span{display:none}.document-title{grid-area:document}.title-actions{grid-area:actions}
      .workspace{grid-template-columns:minmax(0,1fr)!important}
      .left-panel,.right-panel{display:none;position:fixed;z-index:40;top:148px;bottom:34px;width:min(310px,calc(100vw - 20px));border:1px solid #cfd8e4;border-radius:12px;box-shadow:0 18px 50px rgba(25,39,61,.28);overflow:auto}
      .left-panel{left:10px}.right-panel{right:10px}
      body.show-pages-panel .left-panel,body.show-format-panel .right-panel{display:block}
      #mobilePagesButton,#mobileFormatButton{display:inline-flex!important;align-items:center;justify-content:center;width:auto!important;padding:0 9px!important}
      .canvas-toolbar{left:10px!important;right:auto!important;transform:none!important;max-width:calc(100% - 20px)!important}
      #canvasNavigator{width:128px!important;right:9px!important;bottom:9px!important}
      .ribbon{padding:8px 10px}.tool-group{padding-right:10px}.tool-group button{min-width:48px;font-size:11px;padding:6px 8px}
      .statusbar span:nth-child(3){display:none}
    }

    @media(max-width:560px){
      .brand strong{font-size:13px}.brand-mark{width:31px;height:31px}
      .title-actions button{min-height:31px;padding:5px 7px;font-size:10px}
      .document-title input{font-size:12px}
      .ribbon-tab{padding:0 10px;font-size:11px}
      .canvas-stage{padding:68px 24px 48px!important}
      .canvas-toolbar{left:6px!important;max-width:calc(100% - 12px)!important;min-height:44px!important;padding:5px!important;gap:4px!important}
      .canvas-toolbar button{height:34px!important;min-height:34px!important;padding:0 8px!important;font-size:11px!important}
      .canvas-toolbar #handToolButton{font-size:16px!important}
      .canvas-toolbar #zoomValue{min-width:42px;height:34px;font-size:10px}
      #canvasNavigator{display:none}
      .utility-drawer,#scienceDrawer{left:6px!important;right:6px!important;top:92px!important;bottom:34px!important;width:auto!important}
    }
  `;
  document.head.appendChild(style);
})();