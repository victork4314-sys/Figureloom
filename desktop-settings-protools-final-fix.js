(() => {
  if (window.__figureLoomDesktopUiCorrectionsV4) return;
  window.__figureLoomDesktopUiCorrectionsV4 = true;

  const root = document.documentElement;
  const DESKTOP = 'html[data-figureloom-device-class="desktop"] body';
  const THEMED_DESKTOP = 'html[data-figureloom-device-class="desktop"][data-figureloom-theme] body';
  const TOOLBAR_STATE_KEY = 'scicanvas-toolbar-bubble-v1';
  const style = document.createElement('style');
  style.id = 'figureloomDesktopSettingsProToolsFinalFixStyle';
  style.textContent = `
    /* Desktop only: Settings is a normal top-category tab. */
    ${DESKTOP} #settingsRibbonButton#settingsRibbonButton{
      display:inline-flex!important;align-items:center!important;justify-content:center!important;align-self:center!important;
      box-sizing:border-box!important;width:auto!important;min-width:0!important;height:29px!important;min-height:29px!important;max-height:29px!important;
      margin:0!important;padding:0 9px!important;border:0!important;border-bottom:3px solid transparent!important;border-radius:0!important;
      background:transparent!important;color:var(--figureloom-ui-muted,#60706c)!important;font-size:9px!important;font-weight:500!important;
      line-height:1!important;text-align:center!important;white-space:nowrap!important;transform:none!important;top:auto!important;
    }
    ${DESKTOP} #settingsRibbonButton#settingsRibbonButton::before{content:none!important;display:none!important}
    ${DESKTOP}.figureloom-settings-open #settingsRibbonButton#settingsRibbonButton,
    ${DESKTOP} #settingsRibbonButton#settingsRibbonButton.active{
      color:var(--figureloom-ui-accent-strong,#195c51)!important;background:var(--figureloom-ui-accent-soft,#dff1ec)!important;
      border-bottom-color:var(--figureloom-ui-accent,#2f7468)!important;font-weight:650!important;
    }

    /* Desktop only: compact Settings internals, matching the inspector scale. */
    ${DESKTOP} #figureloomSettingsPage#figureloomSettingsPage{font-size:9px!important}
    ${DESKTOP} #figureloomSettingsPage#figureloomSettingsPage .settings-topbar{min-height:44px!important;padding:7px 12px!important;gap:9px!important}
    ${DESKTOP} #figureloomSettingsPage#figureloomSettingsPage .settings-topbar h1{font-size:14px!important;line-height:1.15!important}
    ${DESKTOP} #figureloomSettingsPage#figureloomSettingsPage .settings-topbar p{margin-top:2px!important;font-size:8px!important;line-height:1.3!important}
    ${DESKTOP} #figureloomSettingsPage#figureloomSettingsPage .settings-close{width:28px!important;min-width:28px!important;height:28px!important;min-height:28px!important;padding:0!important;border-radius:7px!important;font-size:17px!important}
    ${DESKTOP} #figureloomSettingsPage#figureloomSettingsPage .settings-layout{grid-template-columns:164px minmax(0,1fr)!important}
    ${DESKTOP} #figureloomSettingsPage#figureloomSettingsPage .settings-navigation{gap:3px!important;padding:7px 6px!important}
    ${DESKTOP} #figureloomSettingsPage#figureloomSettingsPage .settings-navigation button{grid-template-columns:19px minmax(0,1fr)!important;gap:6px!important;height:30px!important;min-height:30px!important;padding:4px 7px!important;border-radius:7px!important;font-size:9px!important;line-height:1.1!important;font-weight:600!important}
    ${DESKTOP} #figureloomSettingsPage#figureloomSettingsPage .settings-content{padding:12px 16px 18px!important}
    ${DESKTOP} #figureloomSettingsPage#figureloomSettingsPage .settings-section-heading h2{font-size:12px!important;line-height:1.2!important}
    ${DESKTOP} #figureloomSettingsPage#figureloomSettingsPage .settings-section-heading p,
    ${DESKTOP} #figureloomSettingsPage#figureloomSettingsPage :where(.settings-choice,.settings-toggle-row) small{font-size:8px!important;line-height:1.3!important}
    ${DESKTOP} #figureloomSettingsPage#figureloomSettingsPage :where(.settings-choice,.settings-toggle-row){gap:7px!important;padding:7px!important;border-radius:7px!important}
    ${DESKTOP} #figureloomSettingsPage#figureloomSettingsPage :where(.settings-choice,.settings-toggle-row) strong{font-size:9.5px!important;line-height:1.2!important}
    ${DESKTOP} #figureloomSettingsPage#figureloomSettingsPage :where(.settings-select-row select,.settings-language-picker select){height:28px!important;min-height:28px!important;padding:3px 6px!important;border-radius:6px!important;font-size:9px!important}

    /* Desktop only: Help is a true circle and cannot be squeezed. */
    ${DESKTOP} .title-actions #tourHelpButton#tourHelpButton{
      display:grid!important;place-items:center!important;flex:0 0 28px!important;inline-size:28px!important;block-size:28px!important;
      width:28px!important;min-width:28px!important;max-width:28px!important;height:28px!important;min-height:28px!important;max-height:28px!important;
      margin:0!important;padding:0!important;border-radius:50%!important;aspect-ratio:1/1!important;font-size:13px!important;font-weight:700!important;
      line-height:1!important;overflow:hidden!important;transform:none!important;
    }
    ${DESKTOP} .title-actions #tourHelpButton#tourHelpButton>:where(span,svg,img){display:block!important;max-width:14px!important;max-height:14px!important;object-fit:contain!important}

    /* Desktop only: compact account/collaboration profile picture. */
    ${DESKTOP} #accountProfileButton#accountProfileButton.brand-mark{
      flex:0 0 27px!important;width:27px!important;min-width:27px!important;max-width:27px!important;
      height:27px!important;min-height:27px!important;max-height:27px!important;padding:0!important;border-radius:50%!important;overflow:hidden!important;
    }
    ${DESKTOP} #accountProfileButton#accountProfileButton::after{width:7px!important;height:7px!important;border-width:1px!important}
    ${DESKTOP} #accountProfileButton#accountProfileButton .figureloom-profile-picture{font-size:13px!important}
    ${DESKTOP} #figureloomShareIdentity#figureloomShareIdentity{grid-template-columns:30px minmax(0,1fr)!important;gap:8px!important;margin-bottom:8px!important;padding:7px 8px!important;border-radius:8px!important}
    ${DESKTOP} #figureloomShareIdentity#figureloomShareIdentity .figureloom-share-avatar{width:30px!important;height:30px!important;font-size:14px!important}

    /* Desktop only: every Projects control uses the toolbar scale without crushing Current actions. */
    ${DESKTOP} #projectsRibbonHost#projectsRibbonHost{align-items:center!important;gap:8px!important}
    ${DESKTOP} #projectsRibbonHost#projectsRibbonHost .tool-group{align-items:center!important;gap:6px!important;padding:0 10px 11px 0!important}
    ${DESKTOP} #projectsRibbonHost#projectsRibbonHost .tool-group-label{bottom:-1px!important;font-size:8px!important;line-height:1!important}
    ${DESKTOP} #projectsRibbonHost#projectsRibbonHost button{
      box-sizing:border-box!important;align-items:center!important;justify-content:center!important;height:27px!important;min-height:27px!important;max-height:27px!important;
      margin:0!important;padding:0 8px!important;border-radius:5px!important;box-shadow:none!important;font-size:9px!important;font-weight:620!important;
      line-height:1!important;white-space:nowrap!important;transform:none!important;
    }
    ${DESKTOP} #projectsRibbonHost#projectsRibbonHost .projects-main-actions button{
      display:inline-flex!important;grid-template-columns:none!important;flex:0 0 auto!important;width:auto!important;min-width:0!important;max-width:150px!important;gap:4px!important;
    }
    ${DESKTOP} #projectsRibbonHost#projectsRibbonHost .projects-main-actions button strong,
    ${DESKTOP} #projectsRibbonHost#projectsRibbonHost .projects-main-actions button span{display:inline!important;margin:0!important;padding:0!important;font-size:9px!important;font-weight:620!important;line-height:1!important}
    ${DESKTOP} #projectsRibbonHost#projectsRibbonHost .projects-open-list{gap:4px!important;padding:0 1px 2px!important}
    ${DESKTOP} #projectsRibbonHost#projectsRibbonHost .projects-open-chip{display:flex!important;flex:0 1 145px!important;width:auto!important;min-width:86px!important;max-width:145px!important;gap:5px!important}
    ${DESKTOP} #projectsRibbonHost#projectsRibbonHost .projects-open-chip i{width:6px!important;height:6px!important}
    ${DESKTOP} #projectsRibbonHost#projectsRibbonHost .projects-open-chip span{font-size:8.5px!important;font-weight:600!important}
    ${DESKTOP} #projectsRibbonHost#projectsRibbonHost .projects-current-group{
      display:grid!important;grid-template-columns:minmax(118px,1fr) minmax(72px,auto) minmax(72px,auto) minmax(44px,auto)!important;
      align-items:center!important;gap:5px!important;min-width:350px!important;max-width:420px!important;margin-left:auto!important;
    }
    ${DESKTOP} #projectsRibbonHost#projectsRibbonHost .projects-current-copy{min-width:118px!important;max-width:none!important}
    ${DESKTOP} #projectsRibbonHost#projectsRibbonHost .projects-current-copy strong{font-size:9px!important;line-height:1.15!important}
    ${DESKTOP} #projectsRibbonHost#projectsRibbonHost .projects-current-copy small{margin-top:2px!important;font-size:7.5px!important;line-height:1.15!important}
    ${DESKTOP} #projectsRibbonHost#projectsRibbonHost .projects-current-group>button{display:inline-flex!important;flex:0 0 auto!important;width:auto!important;min-width:0!important;max-width:none!important}
    ${DESKTOP} #projectsRibbonHost#projectsRibbonHost .projects-current-group [data-project-action="disconnect"]{display:inline-flex!important;min-width:72px!important}
    ${DESKTOP} #projectsRibbonHost#projectsRibbonHost .projects-current-group [data-project-action="window"]{min-width:72px!important;font-size:0!important}
    ${DESKTOP} #projectsRibbonHost#projectsRibbonHost .projects-current-group [data-project-action="window"]::after{content:'New window';font-size:8.5px!important;line-height:1!important}
    ${DESKTOP} #projectsRibbonHost#projectsRibbonHost .projects-current-group [data-project-action="close"]{min-width:44px!important;font-size:0!important}
    ${DESKTOP} #projectsRibbonHost#projectsRibbonHost .projects-current-group [data-project-action="close"]::after{content:'Close';font-size:8.5px!important;line-height:1!important}

    /* Project-tab close stays beside its project title instead of falling underneath. */
    ${DESKTOP} #projectTabRail#projectTabRail .project-tab-wrap{position:relative!important;display:flex!important;align-items:stretch!important;min-height:28px!important}
    ${DESKTOP} #projectTabRail#projectTabRail .project-tab{position:relative!important;width:100%!important;padding-right:30px!important}
    ${DESKTOP} #projectTabRail#projectTabRail .project-tab-close{
      position:absolute!important;z-index:3!important;right:4px!important;top:50%!important;bottom:auto!important;left:auto!important;
      display:grid!important;place-items:center!important;width:19px!important;min-width:19px!important;max-width:19px!important;
      height:19px!important;min-height:19px!important;max-height:19px!important;margin:0!important;padding:0!important;
      transform:translateY(-50%)!important;border-radius:5px!important;font-size:13px!important;line-height:1!important;
    }

    /* Desktop only: Science Library artwork cards stay large enough to see the full illustration. */
    ${DESKTOP} #scienceDrawer#scienceDrawer .science-grid{
      grid-template-columns:repeat(3,minmax(0,1fr))!important;grid-auto-rows:164px!important;align-content:start!important;
      gap:10px!important;padding:12px!important;overflow:auto!important;
    }
    ${DESKTOP} #scienceDrawer#scienceDrawer .science-card{
      box-sizing:border-box!important;display:grid!important;grid-template-rows:minmax(0,1fr) auto!important;place-items:center!important;
      width:100%!important;min-width:0!important;height:164px!important;min-height:164px!important;max-height:164px!important;
      gap:6px!important;padding:10px!important;border-radius:9px!important;overflow:hidden!important;
    }
    ${DESKTOP} #scienceDrawer#scienceDrawer .science-card .preview{
      box-sizing:border-box!important;display:grid!important;place-items:center!important;width:100%!important;min-width:0!important;
      height:118px!important;min-height:118px!important;max-height:118px!important;margin:0!important;padding:2px!important;
      font-size:44px!important;line-height:1!important;overflow:hidden!important;
    }
    ${DESKTOP} #scienceDrawer#scienceDrawer .science-card .preview>:where(svg,img),
    ${DESKTOP} #scienceDrawer#scienceDrawer .science-card .preview svg,
    ${DESKTOP} #scienceDrawer#scienceDrawer .science-card .preview img{
      display:block!important;width:100%!important;max-width:100%!important;height:100%!important;max-height:100%!important;object-fit:contain!important;overflow:visible!important;
    }
    ${DESKTOP} #scienceDrawer#scienceDrawer .science-card small{
      display:block!important;width:100%!important;min-width:0!important;margin:0!important;font-size:9.5px!important;line-height:1.2!important;
      text-align:center!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;
    }

    /* Desktop only: Insert and Loomy use the Pro Tools / inspector scale. */
    ${DESKTOP} :where(#insertDrawer#insertDrawer,#figureAssistantDrawer#figureAssistantDrawer){width:min(460px,calc(100vw - 48px))!important;max-width:min(460px,calc(100vw - 48px))!important;top:72px!important;right:16px!important;bottom:auto!important;max-height:calc(100vh - 96px)!important}
    ${DESKTOP} :where(#insertDrawer#insertDrawer,#figureAssistantDrawer#figureAssistantDrawer) .utility-head{min-height:42px!important;padding:7px 9px!important;gap:8px!important}
    ${DESKTOP} :where(#insertDrawer#insertDrawer,#figureAssistantDrawer#figureAssistantDrawer) .utility-head strong{font-size:11px!important;line-height:1.2!important}
    ${DESKTOP} :where(#insertDrawer#insertDrawer,#figureAssistantDrawer#figureAssistantDrawer) .utility-head span{margin-top:1px!important;font-size:8px!important;line-height:1.25!important}
    ${DESKTOP} #insertDrawer#insertDrawer .utility-body{padding:9px!important;overflow:auto!important}
    ${DESKTOP} #insertDrawer#insertDrawer .insert-section{margin-bottom:9px!important}
    ${DESKTOP} #insertDrawer#insertDrawer .insert-section h3{margin:0 0 5px!important;font-size:9px!important;line-height:1.2!important}
    ${DESKTOP} #insertDrawer#insertDrawer .insert-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:6px!important}
    ${DESKTOP} #insertDrawer#insertDrawer .insert-action{min-height:38px!important;height:auto!important;gap:2px!important;padding:6px 8px!important;border-radius:7px!important}
    ${DESKTOP} #insertDrawer#insertDrawer .insert-action strong{font-size:9.5px!important;line-height:1.2!important}
    ${DESKTOP} #insertDrawer#insertDrawer .insert-action small{font-size:8px!important;line-height:1.25!important}
    ${DESKTOP} #figureAssistantDrawer#figureAssistantDrawer .figureloom-chat-topbar{gap:6px!important;padding:7px 8px!important}
    ${DESKTOP} #figureAssistantDrawer#figureAssistantDrawer .figureloom-chat-source{height:27px!important;min-height:27px!important;padding:0 8px!important;font-size:8.5px!important;line-height:1!important}
    ${DESKTOP} #figureAssistantDrawer#figureAssistantDrawer .figureloom-chat-bubble p{font-size:9px!important;line-height:1.35!important}
    ${DESKTOP} #figureAssistantDrawer#figureAssistantDrawer .figureloom-chat-action{font-size:8px!important}
    ${DESKTOP} #figureAssistantDrawer#figureAssistantDrawer .figureloom-chat-action select,
    ${DESKTOP} #figureAssistantDrawer#figureAssistantDrawer .figureloom-chat-composer>textarea{font-family:inherit!important;font-size:9px!important;line-height:1.3!important;padding:6px 7px!important;border-radius:7px!important}
    ${DESKTOP} #figureAssistantDrawer#figureAssistantDrawer .figureloom-chat-composer>textarea{min-height:62px!important}
    ${DESKTOP} #figureAssistantDrawer#figureAssistantDrawer .figureloom-chat-composer>textarea::placeholder{font-size:9px!important;font-weight:400!important;opacity:.75!important}
    ${DESKTOP} #figureAssistantDrawer#figureAssistantDrawer .figureloom-chat-sendrow button{min-height:30px!important;height:30px!important;padding:0 8px!important;border-radius:7px!important;font-size:8.5px!important}

    /* Pro Tools remains the approved desktop reference component. */
    ${DESKTOP} #proToolsDrawer#proToolsDrawer{width:min(460px,calc(100vw - 48px))!important;max-width:min(460px,calc(100vw - 48px))!important;top:72px!important;right:16px!important;bottom:auto!important;max-height:calc(100vh - 96px)!important}
    ${DESKTOP} #proToolsDrawer#proToolsDrawer .utility-head{padding:9px 11px!important}
    ${DESKTOP} #proToolsDrawer#proToolsDrawer .utility-head strong{font-size:11px!important;line-height:1.25!important}
    ${DESKTOP} #proToolsDrawer#proToolsDrawer .utility-head span{font-size:8.5px!important;line-height:1.35!important}
    ${DESKTOP} #proToolsDrawer#proToolsDrawer .utility-body{padding:9px!important;overflow:auto!important}
    ${DESKTOP} #proToolsDrawer#proToolsDrawer .pro-workspace-grid{grid-template-columns:minmax(0,1fr)!important;gap:6px!important}
    ${DESKTOP} #proToolsDrawer#proToolsDrawer .pro-workspace-card{grid-template-columns:28px minmax(0,1fr) 13px!important;gap:8px!important;width:100%!important;min-height:0!important;height:auto!important;padding:8px 9px!important;border-radius:8px!important}
    ${DESKTOP} #proToolsDrawer#proToolsDrawer .pro-workspace-icon{width:28px!important;min-width:28px!important;height:28px!important;min-height:28px!important;border-radius:7px!important;font-size:14px!important}
    ${DESKTOP} #proToolsDrawer#proToolsDrawer .pro-workspace-card strong{font-size:10px!important;line-height:1.25!important}
    ${DESKTOP} #proToolsDrawer#proToolsDrawer .pro-workspace-card small{font-size:8px!important;line-height:1.35!important}

    /* The exact Pages / hand / zoom / Format / Navigation bar is draggable. Collapse behavior is left alone. */
    ${DESKTOP} .canvas-area .canvas-toolbar.movable-toolbar-bubble{
      position:absolute!important;cursor:grab!important;user-select:none!important;-webkit-user-select:none!important;touch-action:none!important;
    }
    ${DESKTOP} .canvas-area .canvas-toolbar.movable-toolbar-bubble.toolbar-moving{cursor:grabbing!important}
    ${DESKTOP} .canvas-area .canvas-toolbar.movable-toolbar-bubble :where(button,input,select){cursor:pointer!important}
    ${DESKTOP} .canvas-area .canvas-toolbar.movable-toolbar-bubble .toolbar-grip{cursor:grab!important}
    ${DESKTOP} .canvas-area .canvas-toolbar.movable-toolbar-bubble.toolbar-moving .toolbar-grip{cursor:grabbing!important}

    /* One variable-driven surface pass for both normal and dark desktop modes. */
    ${THEMED_DESKTOP} :where(
      .canvas-toolbar,#projectTabRail,#projectsRibbonHost .projects-open-chip,#projectsRibbonHost .projects-main-actions button,
      #projectsRibbonHost .projects-current-group>button,.project-tab,.project-tab-close,.right-panel .inspector-section,
      .right-panel .inspector-tabs,#figureloomShareIdentity
    ){
      color:var(--figureloom-ui-text,#172321)!important;background:var(--figureloom-ui-surface,#fff)!important;
      border-color:var(--figureloom-ui-line,#cddbd7)!important;
    }
    ${THEMED_DESKTOP} :where(.canvas-toolbar,#projectTabRail){box-shadow:0 9px 26px var(--figureloom-ui-shadow-soft,rgba(12,46,40,.18))!important}
    ${THEMED_DESKTOP} :where(.projects-current-copy small,.project-tab-empty,#figureloomShareIdentity small){color:var(--figureloom-ui-muted,#60706c)!important}
    ${THEMED_DESKTOP} :where(.project-tab.active,.projects-open-chip.active){color:var(--figureloom-ui-accent-strong,#195c51)!important;background:var(--figureloom-ui-accent-soft,#dff1ec)!important;border-color:var(--figureloom-ui-accent,#2f7468)!important}
    ${THEMED_DESKTOP} .right-panel :where(input,select,textarea){color:var(--figureloom-ui-text,#172321)!important;background:var(--figureloom-ui-surface,#fff)!important;border-color:var(--figureloom-ui-line,#cddbd7)!important}
  `;

  document.getElementById(style.id)?.remove();
  document.head.appendChild(style);

  let scheduled = false;
  function keepLast() {
    scheduled = false;
    if (style.isConnected && document.head.lastElementChild !== style) document.head.appendChild(style);
  }
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(keepLast);
  }

  function isDesktop() {
    return root.dataset.figureloomDeviceClass === 'desktop';
  }

  function readToolbarState() {
    try { return JSON.parse(localStorage.getItem(TOOLBAR_STATE_KEY) || '{}'); }
    catch { return {}; }
  }

  function setImportantPosition(toolbar, canvasArea, x, y) {
    const maxX = Math.max(8, canvasArea.clientWidth - toolbar.offsetWidth - 8);
    const maxY = Math.max(8, canvasArea.clientHeight - toolbar.offsetHeight - 8);
    const nextX = Math.max(8, Math.min(maxX, Number(x) || 8));
    const nextY = Math.max(8, Math.min(maxY, Number(y) || 8));
    toolbar.style.setProperty('position', 'absolute', 'important');
    toolbar.style.setProperty('left', `${nextX}px`, 'important');
    toolbar.style.setProperty('top', `${nextY}px`, 'important');
    toolbar.style.setProperty('right', 'auto', 'important');
    toolbar.style.setProperty('bottom', 'auto', 'important');
    toolbar.style.setProperty('transform', 'none', 'important');
  }

  function saveToolbarPosition(toolbar, canvasArea) {
    try {
      const area = canvasArea.getBoundingClientRect();
      const rect = toolbar.getBoundingClientRect();
      const old = readToolbarState();
      localStorage.setItem(TOOLBAR_STATE_KEY, JSON.stringify({
        ...old,
        x:Math.round(rect.left - area.left),
        y:Math.round(rect.top - area.top),
        collapsed:toolbar.classList.contains('toolbar-collapsed')
      }));
    } catch {}
  }

  let toolbarDrag = null;

  function installToolbarDrag() {
    if (!isDesktop()) return;
    const toolbar = document.querySelector('.canvas-area .canvas-toolbar');
    const canvasArea = document.querySelector('.canvas-area');
    if (!toolbar || !canvasArea) return;
    toolbar.classList.add('movable-toolbar-bubble');

    if (toolbar.dataset.figureloomWholeBarDragReady === '1') return;
    toolbar.dataset.figureloomWholeBarDragReady = '1';

    const saved = readToolbarState();
    if (Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
      requestAnimationFrame(() => setImportantPosition(toolbar, canvasArea, saved.x, saved.y));
    }

    toolbar.addEventListener('pointerdown', event => {
      if (!isDesktop() || event.button !== 0) return;
      const interactive = event.target.closest?.('button,input,select,textarea,a,label');
      const isGrip = event.target.closest?.('.toolbar-grip');
      if (interactive && !isGrip) return;

      event.preventDefault();
      event.stopPropagation();
      const area = canvasArea.getBoundingClientRect();
      const rect = toolbar.getBoundingClientRect();
      setImportantPosition(toolbar, canvasArea, rect.left - area.left, rect.top - area.top);
      toolbarDrag = {
        toolbar,
        canvasArea,
        pointerId:event.pointerId,
        dx:event.clientX - rect.left,
        dy:event.clientY - rect.top,
        areaLeft:area.left,
        areaTop:area.top
      };
      toolbar.setPointerCapture?.(event.pointerId);
      toolbar.classList.add('toolbar-moving');
    }, { capture:true });
  }

  document.addEventListener('pointermove', event => {
    const drag = toolbarDrag;
    if (!drag || drag.pointerId !== event.pointerId || !isDesktop()) return;
    event.preventDefault();
    setImportantPosition(
      drag.toolbar,
      drag.canvasArea,
      event.clientX - drag.areaLeft - drag.dx,
      event.clientY - drag.areaTop - drag.dy
    );
  }, { capture:true, passive:false });

  function finishToolbarDrag(event) {
    const drag = toolbarDrag;
    if (!drag || (event?.pointerId != null && event.pointerId !== drag.pointerId)) return;
    toolbarDrag = null;
    drag.toolbar.classList.remove('toolbar-moving');
    saveToolbarPosition(drag.toolbar, drag.canvasArea);
  }

  document.addEventListener('pointerup', finishToolbarDrag, { capture:true });
  document.addEventListener('pointercancel', finishToolbarDrag, { capture:true });

  function refreshAll() {
    schedule();
    installToolbarDrag();
  }

  new MutationObserver(refreshAll).observe(document.head, { childList:true });
  new MutationObserver(installToolbarDrag).observe(document.body, { childList:true, subtree:true });
  addEventListener('figureloom-stable-ready', refreshAll);
  addEventListener('figureloom-settings-change', refreshAll);
  addEventListener('resize', () => {
    const toolbar = document.querySelector('.canvas-area .canvas-toolbar');
    const canvasArea = document.querySelector('.canvas-area');
    const saved = readToolbarState();
    if (toolbar && canvasArea && Number.isFinite(saved.x) && Number.isFinite(saved.y)) setImportantPosition(toolbar, canvasArea, saved.x, saved.y);
  }, { passive:true });
  refreshAll();
})();