(() => {
  if (window.__figureLoomDesktopCompleteConsistencyV1) return;
  window.__figureLoomDesktopCompleteConsistencyV1 = true;

  const root = document.documentElement;
  const DESKTOP = 'html[data-figureloom-device-class="desktop"]:not([data-figureloom-larger-controls="1"]) body';
  const BUBBLE_KEY = 'scicanvas-toolbar-bubble-v1';

  const style = document.createElement('style');
  style.id = 'figureloomDesktopCompleteConsistencyStyle';
  style.textContent = `
    /* Settings tab: match the established ribbon theme without moving it. */
    ${DESKTOP} #settingsRibbonButton{
      display:inline-flex!important;align-items:center!important;justify-content:center!important;
      box-sizing:border-box!important;height:29px!important;min-height:29px!important;width:auto!important;min-width:0!important;
      margin:0!important;padding:0 9px!important;border:0!important;border-bottom:3px solid transparent!important;
      border-radius:0!important;background:transparent!important;color:var(--figureloom-ui-muted,#60706c)!important;
      font-size:9px!important;font-weight:650!important;line-height:1!important;text-align:center!important;white-space:nowrap!important;
    }
    ${DESKTOP} #settingsRibbonButton:hover{
      color:var(--figureloom-ui-accent-strong,#195c51)!important;background:var(--figureloom-ui-accent-soft,#dff1ec)!important;
    }
    ${DESKTOP} #settingsRibbonButton.active{
      color:var(--figureloom-ui-accent-strong,#195c51)!important;background:var(--figureloom-ui-accent-soft,#dff1ec)!important;
      border-bottom-color:var(--figureloom-ui-accent,#2f7468)!important;
    }

    /* Help: keep the icon truly square and centered. */
    ${DESKTOP} .title-actions #tourHelpButton{
      display:grid!important;place-items:center!important;align-items:center!important;justify-content:center!important;
      flex:0 0 28px!important;inline-size:28px!important;block-size:28px!important;min-width:28px!important;max-width:28px!important;
      min-height:28px!important;max-height:28px!important;margin:0!important;padding:0!important;border-radius:50%!important;
      aspect-ratio:1/1!important;font-size:13px!important;font-weight:800!important;line-height:1!important;text-align:center!important;
      overflow:visible!important;transform:none!important;
    }
    ${DESKTOP} .title-actions #tourHelpButton > :where(span,svg,img){display:block!important;max-width:15px!important;max-height:15px!important;object-fit:contain!important}

    /* Compact Settings internals using the same scale as the approved desktop panels. */
    ${DESKTOP} #figureloomSettingsPage{font-size:10px!important}
    ${DESKTOP} #figureloomSettingsPage .settings-topbar{
      min-height:52px!important;padding:10px 16px!important;gap:12px!important;box-shadow:0 5px 18px var(--figureloom-ui-shadow-soft,rgba(12,46,40,.10))!important;
    }
    ${DESKTOP} #figureloomSettingsPage .settings-topbar h1{font-size:17px!important;line-height:1.15!important;letter-spacing:-.015em!important}
    ${DESKTOP} #figureloomSettingsPage .settings-topbar p{margin-top:2px!important;font-size:9px!important;line-height:1.3!important}
    ${DESKTOP} #figureloomSettingsPage .settings-close{
      width:30px!important;min-width:30px!important;height:30px!important;min-height:30px!important;padding:0!important;border-radius:8px!important;
      font-size:19px!important;line-height:1!important;
    }
    ${DESKTOP} #figureloomSettingsPage .settings-layout{grid-template-columns:178px minmax(0,1fr)!important}
    ${DESKTOP} #figureloomSettingsPage .settings-navigation{gap:4px!important;padding:10px 8px!important}
    ${DESKTOP} #figureloomSettingsPage .settings-navigation button{
      grid-template-columns:22px minmax(0,1fr)!important;gap:7px!important;min-height:34px!important;height:34px!important;
      padding:5px 8px!important;border-radius:8px!important;font-size:10px!important;line-height:1.1!important;
    }
    ${DESKTOP} #figureloomSettingsPage .settings-navigation button > span:first-child{width:20px!important;height:20px!important;font-size:12px!important}
    ${DESKTOP} #figureloomSettingsPage .settings-navigation button svg{width:14px!important;height:14px!important}
    ${DESKTOP} #figureloomSettingsPage .settings-content{padding:18px 24px 28px!important}
    ${DESKTOP} #figureloomSettingsPage .settings-panel{max-width:680px!important;margin:0 auto!important}
    ${DESKTOP} #figureloomSettingsPage .settings-section-heading{margin-bottom:12px!important}
    ${DESKTOP} #figureloomSettingsPage .settings-subheading{margin-top:16px!important}
    ${DESKTOP} #figureloomSettingsPage .settings-section-heading h2{font-size:14px!important;line-height:1.2!important}
    ${DESKTOP} #figureloomSettingsPage .settings-section-heading p{margin-top:3px!important;font-size:9px!important;line-height:1.35!important}
    ${DESKTOP} #figureloomSettingsPage .settings-choice-grid{gap:7px!important}
    ${DESKTOP} #figureloomSettingsPage .settings-choice{
      grid-template-columns:14px minmax(0,1fr)!important;gap:8px!important;padding:9px!important;border-radius:8px!important;
    }
    ${DESKTOP} #figureloomSettingsPage :where(.settings-choice,.settings-toggle-row) strong{font-size:10.5px!important;line-height:1.2!important}
    ${DESKTOP} #figureloomSettingsPage :where(.settings-choice,.settings-toggle-row) small{margin-top:2px!important;font-size:9px!important;line-height:1.35!important}
    ${DESKTOP} #figureloomSettingsPage :where(.settings-choice input,.settings-toggle-row input){width:14px!important;height:14px!important;margin-top:1px!important}
    ${DESKTOP} #figureloomSettingsPage :where(.settings-select-row,.settings-language-picker){gap:12px!important;padding:9px!important;border-radius:8px!important}
    ${DESKTOP} #figureloomSettingsPage :where(.settings-select-row select,.settings-language-picker select){
      width:auto!important;min-width:180px!important;max-width:280px!important;height:30px!important;min-height:30px!important;
      padding:4px 7px!important;border-radius:7px!important;font-size:9.5px!important;line-height:1.2!important;
    }
    ${DESKTOP} #figureloomSettingsPage .settings-toggle-row{grid-template-columns:14px minmax(0,1fr)!important;gap:8px!important;padding:9px!important}
    ${DESKTOP} #figureloomSettingsPage .settings-footer{min-height:40px!important;padding:7px 16px!important;font-size:9px!important}
    ${DESKTOP} #figureloomSettingsPage .settings-footer button{height:30px!important;min-height:30px!important;padding:0 9px!important;border-radius:7px!important;font-size:9.5px!important}

    /* One approved shell for every standard desktop drawer. */
    ${DESKTOP} :where(.utility-drawer,.packs-drawer,#scienceDrawer,.drawer):not(#proToolsDrawer){
      box-sizing:border-box!important;width:min(520px,calc(100vw - 48px))!important;max-width:min(520px,calc(100vw - 48px))!important;
      top:72px!important;right:16px!important;bottom:auto!important;max-height:calc(100vh - 96px)!important;border-radius:11px!important;
    }
    ${DESKTOP} :where(.utility-drawer,.packs-drawer,#scienceDrawer,.drawer):not(#proToolsDrawer) :where(.utility-head,.drawer-header){
      flex:0 0 auto!important;min-height:48px!important;padding:9px 11px!important;gap:10px!important;
    }
    ${DESKTOP} :where(.utility-drawer,.packs-drawer,#scienceDrawer,.drawer):not(#proToolsDrawer) :where(.utility-head,.drawer-header) strong{
      font-size:12px!important;line-height:1.2!important;
    }
    ${DESKTOP} :where(.utility-drawer,.packs-drawer,#scienceDrawer,.drawer):not(#proToolsDrawer) :where(.utility-head,.drawer-header) span{
      margin-top:2px!important;font-size:9px!important;line-height:1.3!important;
    }
    ${DESKTOP} :where(.utility-drawer,.packs-drawer,#scienceDrawer,.drawer):not(#proToolsDrawer) :where(.utility-head,.drawer-header) :where(button,[data-close]){
      display:grid!important;place-items:center!important;width:28px!important;min-width:28px!important;height:28px!important;min-height:28px!important;
      padding:0!important;border-radius:7px!important;font-size:19px!important;line-height:1!important;
    }
    ${DESKTOP} :where(.utility-drawer,.packs-drawer,#scienceDrawer,.drawer):not(#proToolsDrawer) :where(.utility-body,.drawer-body){
      min-width:0!important;min-height:0!important;padding:10px!important;overflow:auto!important;
    }
    ${DESKTOP} :where(.utility-drawer,.packs-drawer,#scienceDrawer,.drawer):not(#proToolsDrawer) :where(button,input,select,textarea){
      box-sizing:border-box!important;max-width:100%!important;font-family:inherit!important;font-size:9.5px!important;line-height:1.25!important;
    }
    ${DESKTOP} :where(.utility-drawer,.packs-drawer,#scienceDrawer,.drawer):not(#proToolsDrawer) button{
      min-height:30px!important;height:auto!important;padding:6px 9px!important;border-radius:7px!important;white-space:normal!important;
    }
    ${DESKTOP} :where(.utility-drawer,.packs-drawer,#scienceDrawer,.drawer):not(#proToolsDrawer) :where(input:not([type="checkbox"]):not([type="radio"]):not([type="range"]),select){
      width:100%!important;min-width:0!important;height:30px!important;min-height:30px!important;padding:4px 7px!important;border-radius:7px!important;
    }
    ${DESKTOP} :where(.utility-drawer,.packs-drawer,#scienceDrawer,.drawer):not(#proToolsDrawer) textarea{
      width:100%!important;min-width:0!important;min-height:68px!important;padding:7px!important;border-radius:7px!important;resize:vertical!important;
    }
    ${DESKTOP} :where(.utility-drawer,.packs-drawer,#scienceDrawer,.drawer):not(#proToolsDrawer) :where(label,.tool-note,.empty-state,.personal-empty){
      font-size:9px!important;line-height:1.35!important;
    }

    /* Standard card and preview scale across templates, libraries, assets and projects. */
    ${DESKTOP} :where(.utility-drawer,.packs-drawer,#scienceDrawer,.drawer):not(#proToolsDrawer) :where(.template-card,.science-card,.component-card,.editable-svg-card,.asset-card,.utility-card,.pack-card,.project-gallery-card,.project-card,.gallery-section,.collab-section,.collab-session-card){
      min-width:0!important;padding:8px!important;border-radius:9px!important;box-shadow:none!important;
    }
    ${DESKTOP} :where(.utility-drawer,.packs-drawer,#scienceDrawer,.drawer):not(#proToolsDrawer) :where(.template-card,.project-gallery-card){
      gap:8px!important;
    }
    ${DESKTOP} :where(.utility-drawer,.packs-drawer,#scienceDrawer,.drawer):not(#proToolsDrawer) .template-card{
      grid-template-columns:68px minmax(0,1fr)!important;
    }
    ${DESKTOP} :where(.utility-drawer,.packs-drawer,#scienceDrawer,.drawer):not(#proToolsDrawer) .template-thumb{
      height:46px!important;border-radius:6px!important;font-size:11px!important;
    }
    ${DESKTOP} :where(.utility-drawer,.packs-drawer,#scienceDrawer,.drawer):not(#proToolsDrawer) :where(.template-copy strong,.project-card-copy strong,.editable-svg-card>strong){
      font-size:10px!important;line-height:1.25!important;
    }
    ${DESKTOP} :where(.utility-drawer,.packs-drawer,#scienceDrawer,.drawer):not(#proToolsDrawer) :where(.template-copy span,.project-card-copy small,.project-card-copy em){
      margin-top:2px!important;font-size:8.5px!important;line-height:1.3!important;
    }
    ${DESKTOP} :where(.utility-drawer,.packs-drawer,#scienceDrawer,.drawer):not(#proToolsDrawer) :where(.editable-svg-preview,.asset-preview,.project-thumb){
      min-width:0!important;height:64px!important;border-radius:7px!important;overflow:hidden!important;
    }
    ${DESKTOP} :where(.utility-drawer,.packs-drawer,#scienceDrawer,.drawer):not(#proToolsDrawer) :where(.editable-svg-preview img,.asset-preview img,.project-thumb img){
      width:100%!important;height:100%!important;object-fit:contain!important;
    }

    /* Project/account gallery: remove its separate oversized design. */
    ${DESKTOP} #cloudGalleryDrawer{width:min(520px,calc(100vw - 48px))!important;max-width:min(520px,calc(100vw - 48px))!important}
    ${DESKTOP} #cloudGalleryDrawer .utility-body{padding:10px!important}
    ${DESKTOP} #cloudGalleryDrawer .cloud-hero{min-height:0!important;padding:9px 10px!important;border-radius:9px!important}
    ${DESKTOP} #cloudGalleryDrawer .cloud-hero::after{font-size:48px!important;right:40px!important;top:-8px!important}
    ${DESKTOP} #cloudGalleryDrawer .cloud-hero strong{font-size:12px!important;line-height:1.2!important}
    ${DESKTOP} #cloudGalleryDrawer :where(.cloud-hero small,.cloud-user-row small,.email-account-heading small){font-size:8.5px!important;line-height:1.3!important}
    ${DESKTOP} #cloudGalleryDrawer :where(.cloud-account-panel,.sc-account-profile-card,.gallery-section){margin-top:8px!important;padding:9px!important;border-radius:9px!important}
    ${DESKTOP} #cloudGalleryDrawer .email-account-heading{padding:7px!important;border-radius:8px!important}
    ${DESKTOP} #cloudGalleryDrawer .email-account-heading>span{width:28px!important;height:28px!important;border-radius:7px!important;font-size:14px!important}
    ${DESKTOP} #cloudGalleryDrawer .cloud-account-panel input{height:30px!important;min-height:30px!important;padding:4px 7px!important;border-radius:7px!important}
    ${DESKTOP} #cloudGalleryDrawer :where(.cloud-account-actions,.cloud-toolbar){gap:6px!important}
    ${DESKTOP} #cloudGalleryDrawer :where(.cloud-account-actions,.cloud-toolbar) button{min-height:30px!important;height:30px!important;padding:0 8px!important;font-size:9px!important}
    ${DESKTOP} #cloudGalleryDrawer .sc-profile-summary{grid-template-columns:38px minmax(0,1fr) auto!important;gap:8px!important}
    ${DESKTOP} #cloudGalleryDrawer .sc-profile-avatar{width:38px!important;height:38px!important;border-radius:10px!important;font-size:18px!important}
    ${DESKTOP} #cloudGalleryDrawer .sc-profile-actions{gap:5px!important}
    ${DESKTOP} #cloudGalleryDrawer .sc-profile-actions button{min-width:68px!important;height:30px!important;min-height:30px!important}
    ${DESKTOP} #cloudGalleryDrawer .scientific-avatar-picker{grid-template-columns:repeat(7,minmax(0,1fr))!important;gap:5px!important}
    ${DESKTOP} #cloudGalleryDrawer .scientific-avatar-picker button{min-height:44px!important;height:44px!important;padding:4px!important;border-radius:8px!important}
    ${DESKTOP} #cloudGalleryDrawer .scientific-avatar-picker button span{font-size:16px!important}
    ${DESKTOP} #cloudGalleryDrawer .scientific-avatar-picker button small{font-size:7px!important}
    ${DESKTOP} #cloudGalleryDrawer .project-gallery{gap:7px!important}
    ${DESKTOP} #cloudGalleryDrawer .project-gallery-card{grid-template-columns:72px minmax(0,1fr)!important;gap:7px!important;padding:8px!important;border-radius:9px!important}
    ${DESKTOP} #cloudGalleryDrawer .project-card-actions{grid-column:1/-1!important;display:grid!important;grid-template-columns:repeat(auto-fit,minmax(62px,1fr))!important;gap:5px!important}
    ${DESKTOP} #cloudGalleryDrawer .project-card-actions button{width:100%!important;min-height:28px!important;height:28px!important;padding:0 7px!important;font-size:8.5px!important}

    /* Layers: same component scale as the approved desktop tools. */
    ${DESKTOP} #figureloomLayerManager{gap:5px!important;margin:-1px 0 7px!important;padding:7px!important;border-radius:8px!important}
    ${DESKTOP} #figureloomLayerManager .layer-search-row{grid-template-columns:minmax(0,1fr) 28px!important;gap:4px!important}
    ${DESKTOP} #figureloomLayerManager :where(#layerSearch,#layerFilter,#layerTargetPage){height:29px!important;min-height:29px!important;padding:4px 6px!important;border-radius:6px!important;font-size:9px!important}
    ${DESKTOP} #figureloomLayerManager .layer-search-row button{width:28px!important;min-width:28px!important;height:29px!important;min-height:29px!important;padding:0!important;border-radius:6px!important}
    ${DESKTOP} #figureloomLayerManager :where(.layer-manager-status,.layer-manager-actions summary,.layer-page-target){font-size:8.5px!important;line-height:1.3!important}
    ${DESKTOP} #figureloomLayerManager .layer-action-grid{gap:4px!important;margin-top:6px!important}
    ${DESKTOP} #figureloomLayerManager .layer-action-grid button{min-height:28px!important;height:28px!important;padding:0 5px!important;border-radius:6px!important;font-size:8.5px!important;line-height:1!important}

    /* Editable SVG and every inspector extension must stay inside the approved inspector. */
    ${DESKTOP} .right-panel > .inspector-section{box-sizing:border-box!important;min-width:0!important;max-width:100%!important;overflow:hidden!important}
    ${DESKTOP} .right-panel .inspector-section :where(label,div,span){min-width:0!important;max-width:100%!important}
    ${DESKTOP} .right-panel .inspector-section :where(input:not([type="checkbox"]):not([type="radio"]),select,textarea,button){box-sizing:border-box!important;max-width:100%!important}
    ${DESKTOP} #editableSvgInspector{min-width:0!important;overflow:hidden!important}
    ${DESKTOP} #editableSvgInspector .full-field{display:grid!important;grid-template-columns:minmax(0,1fr)!important;min-width:0!important}
    ${DESKTOP} #editableSvgInspector #svgColorMode{
      display:block!important;width:100%!important;min-width:0!important;max-width:100%!important;height:29px!important;min-height:29px!important;
      padding:4px 22px 4px 6px!important;border-radius:6px!important;font-size:9px!important;line-height:1.2!important;text-overflow:ellipsis!important;white-space:nowrap!important;
    }
    ${DESKTOP} #editableSvgInspector #downloadSelectedSvg{width:100%!important;min-width:0!important;min-height:29px!important;margin-top:7px!important;padding:5px 7px!important;border-radius:6px!important;font-size:9px!important}

    /* Help menu follows the same approved panel density. */
    ${DESKTOP} #figureloomHelpMenu{width:min(360px,calc(100vw - 32px))!important;padding:10px!important;border-radius:11px!important}
    ${DESKTOP} #figureloomHelpMenu .figureloom-help-head{gap:9px!important;padding:2px 2px 9px!important}
    ${DESKTOP} #figureloomHelpMenu .figureloom-help-head strong{font-size:13px!important}
    ${DESKTOP} #figureloomHelpMenu .figureloom-help-head span{font-size:9px!important}
    ${DESKTOP} #figureloomHelpMenu .figureloom-help-head button{width:28px!important;height:28px!important;padding:0!important;border-radius:7px!important;font-size:18px!important}
    ${DESKTOP} #figureloomHelpMenu .figureloom-help-links{gap:5px!important}
    ${DESKTOP} #figureloomHelpMenu :where(.figureloom-help-links a,.figureloom-help-tour){padding:8px 9px!important;border-radius:8px!important}
    ${DESKTOP} #figureloomHelpMenu :where(.figureloom-help-links b,.figureloom-help-tour b){font-size:10px!important}
    ${DESKTOP} #figureloomHelpMenu :where(.figureloom-help-links small,.figureloom-help-tour small){font-size:8.5px!important;line-height:1.3!important}
    ${DESKTOP} #figureloomHelpMenu .figureloom-help-tour>span:first-child{font-size:17px!important}

    /* Restore the real movable/collapsible bubble without changing its approved length or height. */
    ${DESKTOP} .canvas-area .canvas-toolbar.movable-toolbar-bubble{
      position:absolute!important;z-index:18!important;border-radius:12px!important;
      background:var(--figureloom-ui-surface-glass,rgba(255,255,255,.94))!important;
      border-color:var(--figureloom-ui-line,#cddbd7)!important;
      box-shadow:0 9px 26px var(--figureloom-ui-shadow-soft,rgba(12,46,40,.18))!important;
      backdrop-filter:blur(10px)!important;touch-action:none!important;
    }
    ${DESKTOP} .canvas-area .canvas-toolbar .toolbar-grip,
    ${DESKTOP} .canvas-area .canvas-toolbar .toolbar-collapse{
      display:inline-grid!important;place-items:center!important;flex:0 0 28px!important;width:28px!important;min-width:28px!important;max-width:28px!important;
      height:26px!important;min-height:26px!important;max-height:26px!important;padding:0!important;border-radius:6px!important;line-height:1!important;
    }
    ${DESKTOP} .canvas-area .canvas-toolbar .toolbar-grip{cursor:grab!important;font-size:12px!important;touch-action:none!important}
    ${DESKTOP} .canvas-area .canvas-toolbar.toolbar-moving .toolbar-grip{cursor:grabbing!important}
    ${DESKTOP} .canvas-area .canvas-toolbar .toolbar-collapse{font-size:15px!important}
    ${DESKTOP} .canvas-area .canvas-toolbar.toolbar-collapsed{width:auto!important;min-width:0!important;overflow:hidden!important}
    ${DESKTOP} .canvas-area .canvas-toolbar.toolbar-collapsed > :not(.toolbar-grip):not(.toolbar-collapse){display:none!important}
  `;
  document.head.appendChild(style);

  let activeDrag = null;
  let scheduled = false;

  function isDesktop() {
    return root.dataset.figureloomDeviceClass === 'desktop' && root.dataset.figureloomLargerControls !== '1';
  }

  function readBubbleState() {
    try { return JSON.parse(localStorage.getItem(BUBBLE_KEY) || '{}'); }
    catch { return {}; }
  }

  function saveBubbleState(toolbar, canvasArea) {
    try {
      const area = canvasArea.getBoundingClientRect();
      const rect = toolbar.getBoundingClientRect();
      localStorage.setItem(BUBBLE_KEY, JSON.stringify({
        x:Math.round(rect.left - area.left),
        y:Math.round(rect.top - area.top),
        collapsed:toolbar.classList.contains('toolbar-collapsed')
      }));
    } catch {}
  }

  function clampToolbar(toolbar, canvasArea, x, y) {
    const maxX = Math.max(8, canvasArea.clientWidth - toolbar.offsetWidth - 8);
    const maxY = Math.max(8, canvasArea.clientHeight - toolbar.offsetHeight - 8);
    toolbar.style.left = `${Math.max(8, Math.min(maxX, x))}px`;
    toolbar.style.top = `${Math.max(8, Math.min(maxY, y))}px`;
    toolbar.style.right = 'auto';
    toolbar.style.bottom = 'auto';
    toolbar.style.transform = 'none';
  }

  function setCollapsed(toolbar, canvasArea, collapse, next) {
    toolbar.classList.toggle('toolbar-collapsed', next);
    collapse.textContent = next ? '+' : '−';
    collapse.title = next ? 'Open toolbar' : 'Collapse toolbar';
    collapse.setAttribute('aria-expanded', String(!next));
    saveBubbleState(toolbar, canvasArea);
  }

  function ensureToolbarBubble() {
    if (!isDesktop()) return;
    const toolbar = document.querySelector('.canvas-toolbar');
    const canvasArea = document.querySelector('.canvas-area');
    if (!toolbar || !canvasArea) return;

    toolbar.classList.add('movable-toolbar-bubble');

    let grip = toolbar.querySelector('.toolbar-grip');
    if (!grip) {
      grip = document.createElement('button');
      grip.type = 'button';
      grip.className = 'toolbar-grip';
      grip.textContent = '⋮⋮';
      grip.title = 'Drag toolbar';
      grip.setAttribute('aria-label', 'Drag toolbar');
      toolbar.prepend(grip);
    }

    let collapse = toolbar.querySelector('.toolbar-collapse');
    if (!collapse) {
      collapse = document.createElement('button');
      collapse.type = 'button';
      collapse.className = 'toolbar-collapse';
      collapse.textContent = '−';
      collapse.title = 'Collapse toolbar';
      collapse.setAttribute('aria-expanded', 'true');
      toolbar.appendChild(collapse);
    }

    if (grip.dataset.figureloomDesktopDragReady !== '1') {
      grip.dataset.figureloomDesktopDragReady = '1';
      grip.addEventListener('pointerdown', event => {
        if (!isDesktop()) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        const area = canvasArea.getBoundingClientRect();
        const rect = toolbar.getBoundingClientRect();
        toolbar.style.left = `${rect.left - area.left}px`;
        toolbar.style.top = `${rect.top - area.top}px`;
        toolbar.style.right = 'auto';
        toolbar.style.bottom = 'auto';
        toolbar.style.transform = 'none';
        activeDrag = {
          toolbar, canvasArea, grip, pointerId:event.pointerId,
          dx:event.clientX - rect.left, dy:event.clientY - rect.top,
          areaLeft:area.left, areaTop:area.top
        };
        grip.setPointerCapture?.(event.pointerId);
        toolbar.classList.add('toolbar-moving');
      }, { capture:true });
    }

    if (collapse.dataset.figureloomDesktopCollapseReady !== '1') {
      collapse.dataset.figureloomDesktopCollapseReady = '1';
      collapse.addEventListener('click', event => {
        if (!isDesktop()) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        setCollapsed(toolbar, canvasArea, collapse, !toolbar.classList.contains('toolbar-collapsed'));
      }, { capture:true });
    }

    const saved = readBubbleState();
    if (toolbar.dataset.figureloomDesktopPositionReady !== '1') {
      toolbar.dataset.figureloomDesktopPositionReady = '1';
      requestAnimationFrame(() => {
        if (!isDesktop()) return;
        if (Number.isFinite(saved.x) && Number.isFinite(saved.y)) clampToolbar(toolbar, canvasArea, saved.x, saved.y);
        setCollapsed(toolbar, canvasArea, collapse, Boolean(saved.collapsed));
      });
    }
  }

  function normalizeSettingsButton() {
    const button = document.getElementById('settingsRibbonButton');
    if (!button || !isDesktop()) return;
    button.classList.remove('settings-ribbon-button', 'ribbon-command-tab');
    button.classList.add('ribbon-tab');
  }

  function refresh() {
    scheduled = false;
    normalizeSettingsButton();
    ensureToolbarBubble();
  }

  function scheduleRefresh() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(refresh);
  }

  document.addEventListener('pointermove', event => {
    const drag = activeDrag;
    if (!drag || drag.pointerId !== event.pointerId || !isDesktop()) return;
    event.preventDefault();
    clampToolbar(drag.toolbar, drag.canvasArea, event.clientX - drag.areaLeft - drag.dx, event.clientY - drag.areaTop - drag.dy);
  }, { capture:true, passive:false });

  function finishDrag(event) {
    const drag = activeDrag;
    if (!drag || (event?.pointerId != null && drag.pointerId !== event.pointerId)) return;
    activeDrag = null;
    drag.toolbar.classList.remove('toolbar-moving');
    saveBubbleState(drag.toolbar, drag.canvasArea);
  }

  document.addEventListener('pointerup', finishDrag, { capture:true });
  document.addEventListener('pointercancel', finishDrag, { capture:true });

  addEventListener('figureloom-stable-ready', scheduleRefresh);
  addEventListener('figureloom-settings-change', scheduleRefresh);
  addEventListener('resize', scheduleRefresh, { passive:true });
  new MutationObserver(scheduleRefresh).observe(document.body, { childList:true, subtree:true });
  scheduleRefresh();
})();
