(() => {
  if (window.__figureLoomTodayUiStabilityV5) return;
  window.__figureLoomTodayUiStabilityV5 = true;
  window.__figureLoomTodayUiStabilityV4 = true;
  window.__figureLoomTodayUiStabilityV3 = true;
  window.__figureLoomTodayUiStabilityV2 = true;
  window.__figureLoomTodayUiStabilityV1 = true;

  const root = document.documentElement;
  const DESKTOP = 'html[data-figureloom-device-class="desktop"] body';
  let projectAddButton = null;
  const style = document.createElement('style');
  style.id = 'figureloomTodayUiStabilityStyle';
  style.textContent = `
    /* One desktop project-tab box containing the title and its close control. */
    ${DESKTOP} #projectTabRail .project-tab-wrap{
      position:relative!important;
      display:grid!important;
      grid-template-columns:minmax(0,1fr) 20px!important;
      align-items:center!important;
      column-gap:2px!important;
      flex:0 1 190px!important;
      min-width:92px!important;
      max-width:190px!important;
      min-height:28px!important;
      overflow:hidden!important;
      border:1px solid transparent!important;
      border-bottom:0!important;
      border-radius:9px 9px 0 0!important;
      background:transparent!important;
      color:var(--figureloom-ui-muted,#60706c)!important;
      box-shadow:none!important;
    }
    ${DESKTOP} #projectTabRail .project-tab-wrap:hover{
      background:var(--figureloom-ui-soft,#edf3f1)!important;
      color:var(--figureloom-ui-text,#172321)!important;
    }
    ${DESKTOP} #projectTabRail .project-tab-wrap.active{
      border-color:var(--figureloom-ui-line,#cddbd7)!important;
      background:var(--figureloom-ui-surface,#fff)!important;
      color:var(--figureloom-ui-text,#172321)!important;
      box-shadow:0 -3px 10px var(--figureloom-ui-shadow-soft,rgba(12,46,40,.08))!important;
    }
    ${DESKTOP} #projectTabRail .project-tab-wrap>.project-tab{
      position:relative!important;
      grid-column:1!important;
      width:100%!important;
      min-width:0!important;
      height:27px!important;
      min-height:27px!important;
      margin:0!important;
      padding:4px 7px 4px 9px!important;
      border:0!important;
      border-radius:0!important;
      background:transparent!important;
      color:inherit!important;
      box-shadow:none!important;
    }
    ${DESKTOP} #projectTabRail .project-tab-wrap>.project-tab.active{
      height:27px!important;
      border:0!important;
      background:transparent!important;
      box-shadow:none!important;
    }
    ${DESKTOP} #projectTabRail .project-tab-wrap>.project-tab-close{
      position:static!important;
      grid-column:2!important;
      align-self:center!important;
      justify-self:center!important;
      display:grid!important;
      place-items:center!important;
      width:19px!important;
      min-width:19px!important;
      max-width:19px!important;
      height:19px!important;
      min-height:19px!important;
      max-height:19px!important;
      margin:0!important;
      padding:0!important;
      border:0!important;
      border-radius:6px!important;
      background:transparent!important;
      color:inherit!important;
      box-shadow:none!important;
      transform:none!important;
      inset:auto!important;
      font-size:14px!important;
      line-height:1!important;
      opacity:.72!important;
    }
    ${DESKTOP} #projectTabRail .project-tab-wrap.active>.project-tab-close,
    ${DESKTOP} #projectTabRail .project-tab-wrap:hover>.project-tab-close,
    ${DESKTOP} #projectTabRail .project-tab-wrap:focus-within>.project-tab-close{opacity:1!important}
    ${DESKTOP} #projectTabRail .project-tab-wrap>.project-tab-close:hover:not(:disabled){
      background:var(--figureloom-ui-soft-strong,#e2ebe8)!important;
      color:var(--figureloom-ui-text,#172321)!important;
    }

    /* Move the real project + into the strip after the final complete tab. */
    ${DESKTOP} #projectTabRail .project-tab-scroll>.project-tab-add{
      align-self:end!important;
      flex:0 0 28px!important;
      display:grid!important;
      place-items:center!important;
      width:28px!important;
      min-width:28px!important;
      max-width:28px!important;
      height:28px!important;
      min-height:28px!important;
      max-height:28px!important;
      margin:0 0 0 2px!important;
      padding:0!important;
      border:1px solid var(--figureloom-ui-line,#cddbd7)!important;
      border-bottom:0!important;
      border-radius:9px 9px 0 0!important;
      background:var(--figureloom-ui-soft,#edf3f1)!important;
      color:var(--figureloom-ui-text,#172321)!important;
      box-shadow:none!important;
      font-size:16px!important;
      font-weight:700!important;
      line-height:1!important;
      transform:none!important;
    }
    ${DESKTOP} #projectTabRail .project-tab-scroll>.project-tab-add:hover:not(:disabled){
      border-color:var(--figureloom-ui-accent,#2f7468)!important;
      background:var(--figureloom-ui-accent-soft,#dff1ec)!important;
      color:var(--figureloom-ui-accent-strong,#195c51)!important;
    }

    /* Projects panel chips retain their compact side-by-side close layout. */
    ${DESKTOP} #projectsRibbonHost .projects-chip-wrap{
      position:relative!important;
      display:grid!important;
      grid-template-columns:minmax(0,1fr) 20px!important;
      align-items:center!important;
      column-gap:2px!important;
      min-width:92px!important;
      overflow:hidden!important;
    }
    ${DESKTOP} #projectsRibbonHost .projects-chip-wrap>.projects-open-chip{
      position:relative!important;
      grid-column:1!important;
      width:100%!important;
      min-width:0!important;
      max-width:none!important;
      padding-right:8px!important;
    }
    ${DESKTOP} #projectsRibbonHost .projects-chip-wrap>.projects-chip-close{
      position:static!important;
      grid-column:2!important;
      align-self:center!important;
      justify-self:center!important;
      display:grid!important;
      place-items:center!important;
      width:19px!important;
      min-width:19px!important;
      max-width:19px!important;
      height:19px!important;
      min-height:19px!important;
      max-height:19px!important;
      margin:0!important;
      padding:0!important;
      transform:none!important;
      inset:auto!important;
      line-height:1!important;
      opacity:.72!important;
    }
    ${DESKTOP} #projectsRibbonHost .projects-chip-wrap:hover>.projects-chip-close,
    ${DESKTOP} #projectsRibbonHost .projects-chip-wrap:focus-within>.projects-chip-close{opacity:1!important}

    /* Keep the account status dot outside the avatar instead of covering the picture. */
    ${DESKTOP} #accountProfileButton#accountProfileButton.brand-mark{overflow:visible!important}
    ${DESKTOP} #accountProfileButton#accountProfileButton.brand-mark .account-avatar-face{overflow:hidden!important}
    ${DESKTOP} #accountProfileButton#accountProfileButton::after{right:-6px!important;bottom:-5px!important}

    /* Desktop Pages heading: equal + and − boxes together on the right. */
    ${DESKTOP} .left-panel>.panel-heading:first-of-type{
      display:grid!important;
      grid-template-columns:minmax(0,1fr) 28px 28px!important;
      align-items:center!important;
      gap:4px!important;
    }
    ${DESKTOP} .left-panel>.panel-heading:first-of-type>h2{grid-column:1!important;min-width:0!important;margin:0!important}
    ${DESKTOP} .left-panel>.panel-heading:first-of-type>#addPageButton,
    ${DESKTOP} .left-panel>.panel-heading:first-of-type>#deletePageButton{
      display:grid!important;
      place-items:center!important;
      width:28px!important;
      min-width:28px!important;
      max-width:28px!important;
      height:28px!important;
      min-height:28px!important;
      max-height:28px!important;
      margin:0!important;
      padding:0!important;
      border-radius:7px!important;
      box-sizing:border-box!important;
      font-size:16px!important;
      line-height:1!important;
    }
    ${DESKTOP} .left-panel>.panel-heading:first-of-type>#addPageButton{grid-column:2!important}
    ${DESKTOP} .left-panel>.panel-heading:first-of-type>#deletePageButton{grid-column:3!important}

    /* Desktop Data & Charts: checkbox marks stay at the compact control scale. */
    ${DESKTOP} :where(#dataShowLegend,#dataShowGridlines,#dataShowLabels,#dataTableTitle),
    ${DESKTOP} #dataLabDrawer input[type="checkbox"]{
      appearance:auto!important;
      -webkit-appearance:checkbox!important;
      flex:0 0 13px!important;
      width:13px!important;
      min-width:13px!important;
      max-width:13px!important;
      height:13px!important;
      min-height:13px!important;
      max-height:13px!important;
      margin:0!important;
      padding:0!important;
      transform:none!important;
    }
    ${DESKTOP} #dataLabDrawer :where(label,.data-setting-row,.data-check-row){font-size:9px!important;line-height:1.3!important}

    /* Desktop Review: match the compact drawer scale used everywhere else. */
    ${DESKTOP} #reviewProDrawer.review-pro-drawer{font-size:9px!important}
    ${DESKTOP} #reviewProDrawer .review-section{margin-bottom:6px!important;border-radius:8px!important}
    ${DESKTOP} #reviewProDrawer .review-section>summary{padding:8px 9px!important;font-size:9.5px!important;font-weight:750!important;line-height:1.2!important}
    ${DESKTOP} #reviewProDrawer .review-content{padding:0 8px 8px!important}
    ${DESKTOP} #reviewProDrawer :where(textarea,input:not([type="checkbox"]),select){min-height:29px!important;padding:5px 7px!important;border-radius:7px!important;font-size:9px!important;line-height:1.3!important}
    ${DESKTOP} #reviewProDrawer textarea{min-height:58px!important}
    ${DESKTOP} #reviewProDrawer :where(.review-filter,.review-full,.vision-row label,.vision-row span,.review-list,.tool-note){font-size:8.5px!important;line-height:1.3!important}
    ${DESKTOP} #reviewProDrawer input[type="checkbox"]{
      appearance:auto!important;
      -webkit-appearance:checkbox!important;
      flex:0 0 13px!important;
      width:13px!important;
      min-width:13px!important;
      max-width:13px!important;
      height:13px!important;
      min-height:13px!important;
      max-height:13px!important;
      margin:0!important;
      padding:0!important;
      transform:none!important;
    }
    ${DESKTOP} #reviewProDrawer :where(.review-actions button,.review-row-actions button,.utility-action){min-height:28px!important;height:auto!important;padding:5px 7px!important;border-radius:6px!important;font-size:8.5px!important;line-height:1.15!important}
    ${DESKTOP} #reviewProDrawer .review-row{gap:6px!important;padding:7px!important;border-radius:7px!important}
    ${DESKTOP} #reviewProDrawer .review-row strong{font-size:9px!important}
    ${DESKTOP} #reviewProDrawer .review-row small{font-size:7.5px!important}
    ${DESKTOP} #reviewProDrawer .review-row span{font-size:8.5px!important;line-height:1.3!important}
    ${DESKTOP} #reviewProDrawer .audit-results p{padding:6px!important;font-size:8.5px!important;line-height:1.3!important}

    /* Recovery History was still inheriting the original oversized project-tools typography. */
    ${DESKTOP} #historyDrawer{font-size:9px!important}
    ${DESKTOP} #historyDrawer .utility-head{min-height:44px!important;padding:8px 10px!important;gap:8px!important}
    ${DESKTOP} #historyDrawer .utility-head strong{font-size:10px!important;line-height:1.2!important}
    ${DESKTOP} #historyDrawer .utility-head span{margin-top:2px!important;font-size:8px!important;line-height:1.25!important}
    ${DESKTOP} #historyDrawer .utility-head button{width:27px!important;min-width:27px!important;height:27px!important;min-height:27px!important;padding:0!important;border-radius:7px!important;font-size:18px!important;line-height:1!important}
    ${DESKTOP} #historyDrawer .utility-body{padding:8px 10px!important}
    ${DESKTOP} #historyDrawer .tool-note{margin:0!important;font-size:8.5px!important;line-height:1.35!important}
    ${DESKTOP} #historyDrawer .snapshot{grid-template-columns:minmax(0,1fr) auto!important;gap:6px!important;padding:7px 0!important;font-size:8.5px!important;line-height:1.25!important}
    ${DESKTOP} #historyDrawer .snapshot strong{font-size:9px!important;line-height:1.25!important}
    ${DESKTOP} #historyDrawer .snapshot small{margin-top:2px!important;font-size:7.5px!important;line-height:1.25!important}
    ${DESKTOP} #historyDrawer .snapshot button{min-height:27px!important;height:27px!important;padding:0 7px!important;border-radius:6px!important;font-size:8px!important;line-height:1!important}
  `;

  function isDesktop() {
    return root.dataset.figureloomDeviceClass === 'desktop';
  }

  function keepStyleLast() {
    if (!style.isConnected || document.head.lastElementChild !== style) document.head.appendChild(style);
  }

  function syncProjectTabShells() {
    if (!isDesktop()) return;
    document.querySelectorAll('#projectTabRail .project-tab-wrap').forEach(wrapper => {
      wrapper.classList.toggle('active', Boolean(wrapper.querySelector(':scope>.project-tab.active')));
      wrapper.classList.toggle('disconnected', Boolean(wrapper.querySelector(':scope>.project-tab.disconnected')));
    });
  }

  function ensureProjectAddInsideStrip() {
    if (!isDesktop()) return;
    const rail = document.getElementById('projectTabRail');
    const scroll = rail?.querySelector('.project-tab-scroll');
    if (!rail || !scroll) return;

    if (!projectAddButton) projectAddButton = rail.querySelector('.project-tab-add');
    if (!projectAddButton) return;

    scroll.querySelectorAll('.project-tab-add-inline').forEach(button => button.remove());
    projectAddButton.classList.remove('project-tab-add-inline');
    if (projectAddButton.parentElement !== scroll || scroll.lastElementChild !== projectAddButton) scroll.appendChild(projectAddButton);
  }

  function labelPhoneHelp() {
    document.querySelectorAll('[data-phone-action="guide"]').forEach(button => {
      const label = button.querySelector('small');
      if (label && label.textContent !== 'Help') label.textContent = 'Help';
      button.setAttribute('aria-label', 'Open FigureLoom help');
      button.title = 'Open FigureLoom help';
    });
  }

  function refreshDesktop() {
    keepStyleLast();
    syncProjectTabShells();
    ensureProjectAddInsideStrip();
  }

  document.getElementById(style.id)?.remove();
  document.head.appendChild(style);

  let maintenanceFrame = 0;
  function scheduleMaintenance() {
    if (maintenanceFrame) return;
    maintenanceFrame = requestAnimationFrame(() => {
      maintenanceFrame = 0;
      refreshDesktop();
      labelPhoneHelp();
    });
  }

  new MutationObserver(scheduleMaintenance).observe(document.documentElement, {
    childList:true,
    subtree:true,
    attributes:true,
    attributeFilter:['class','aria-selected']
  });

  function openPhoneHelp() {
    window.FigureLoomPhoneMode?.close?.({ restoreFocus:false });
    requestAnimationFrame(() => {
      const helpButton = document.getElementById('tourHelpButton');
      if (window.FigureLoomHelpCenter?.open) {
        window.FigureLoomHelpCenter.open(helpButton || undefined);
        return;
      }
      if (helpButton) {
        helpButton.click();
        return;
      }
      window.openSciCanvasTour?.();
    });
  }

  window.addEventListener('click', event => {
    if (root.dataset.figureloomResolvedMode !== 'phone') return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const guide = target.closest('[data-phone-action="guide"]');
    if (!guide) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openPhoneHelp();
  }, true);

  addEventListener('figureloom-stable-ready', scheduleMaintenance);
  addEventListener('figureloom-settings-change', scheduleMaintenance);
  scheduleMaintenance();

  window.FigureLoomTodayUiStability = Object.freeze({
    openPhoneHelp,
    keepStyleLast,
    labelPhoneHelp,
    syncProjectTabShells,
    ensureProjectAddInsideStrip,
    refreshDesktop
  });
})();