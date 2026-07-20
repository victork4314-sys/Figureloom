(() => {
  if (window.__figureLoomTodayUiStabilityV3) return;
  window.__figureLoomTodayUiStabilityV3 = true;
  window.__figureLoomTodayUiStabilityV2 = true;
  window.__figureLoomTodayUiStabilityV1 = true;

  const root = document.documentElement;
  const DESKTOP = 'html[data-figureloom-device-class="desktop"] body';
  const style = document.createElement('style');
  style.id = 'figureloomTodayUiStabilityStyle';
  style.textContent = `
    /* Desktop project tabs: keep each close control in the same row as its title. */
    ${DESKTOP} #projectTabRail .project-tab-wrap{
      position:relative!important;
      display:grid!important;
      grid-template-columns:minmax(0,1fr) 20px!important;
      align-items:center!important;
      column-gap:2px!important;
      min-height:28px!important;
      overflow:hidden!important;
    }
    ${DESKTOP} #projectTabRail .project-tab-wrap>.project-tab{
      position:relative!important;
      grid-column:1!important;
      width:100%!important;
      min-width:0!important;
      padding-right:8px!important;
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
      transform:none!important;
      inset:auto!important;
      line-height:1!important;
    }

    /* Put the project + directly after the final project tab. */
    ${DESKTOP} #projectTabRail .project-tab-tools>.project-tab-add{display:none!important}
    ${DESKTOP} #projectTabRail .project-tab-scroll>.project-tab-add-inline{
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
    }
    ${DESKTOP} #projectTabRail .project-tab-scroll>.project-tab-add-inline:hover:not(:disabled){
      border-color:var(--figureloom-ui-accent,#2f7468)!important;
      background:var(--figureloom-ui-accent-soft,#dff1ec)!important;
      color:var(--figureloom-ui-accent-strong,#195c51)!important;
    }

    /* Projects panel chips use the same side-by-side close layout. */
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
    ${DESKTOP} #accountProfileButton.brand-mark{overflow:visible!important}
    ${DESKTOP} #accountProfileButton.brand-mark::after{
      right:-6px!important;
      bottom:-5px!important;
      width:10px!important;
      height:10px!important;
      border-width:2px!important;
    }

    /* Desktop Pages heading: equal + and − boxes together on the right. */
    ${DESKTOP} .left-panel>.panel-heading:first-child{
      display:flex!important;
      align-items:center!important;
      gap:4px!important;
    }
    ${DESKTOP} .left-panel>.panel-heading:first-child>h2{margin-right:auto!important}
    ${DESKTOP} .left-panel>.panel-heading:first-child>#addPageButton,
    ${DESKTOP} .left-panel>.panel-heading:first-child>#deletePageButton{
      display:grid!important;
      place-items:center!important;
      flex:0 0 28px!important;
      width:28px!important;
      min-width:28px!important;
      max-width:28px!important;
      height:28px!important;
      min-height:28px!important;
      max-height:28px!important;
      margin:0!important;
      padding:0!important;
      border:1px solid var(--figureloom-ui-line,#cddbd7)!important;
      border-radius:7px!important;
      background:var(--figureloom-ui-soft,#edf3f1)!important;
      box-shadow:none!important;
      font-size:15px!important;
      font-weight:750!important;
      line-height:1!important;
    }
    ${DESKTOP} .left-panel>.panel-heading:first-child>#addPageButton{margin-left:auto!important}
    ${DESKTOP} .left-panel>.panel-heading:first-child>#deletePageButton{color:#b42318!important}

    /* Desktop Data & Charts: checkbox marks stay at the compact control scale. */
    ${DESKTOP} :where(#dataShowLegend,#dataShowGridlines,#dataShowLabels,#dataTableTitle),
    ${DESKTOP} #dataLabDrawer input[type="checkbox"]{
      appearance:auto!important;
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
    ${DESKTOP} #reviewProDrawer .review-section>summary{
      padding:8px 9px!important;
      font-size:9.5px!important;
      font-weight:750!important;
      line-height:1.2!important;
    }
    ${DESKTOP} #reviewProDrawer .review-content{padding:0 8px 8px!important}
    ${DESKTOP} #reviewProDrawer :where(textarea,input:not([type="checkbox"]),select){
      min-height:29px!important;
      padding:5px 7px!important;
      border-radius:7px!important;
      font-size:9px!important;
      line-height:1.3!important;
    }
    ${DESKTOP} #reviewProDrawer textarea{min-height:58px!important}
    ${DESKTOP} #reviewProDrawer :where(.review-filter,.review-full,.vision-row label,.vision-row span,.review-list,.tool-note){
      font-size:8.5px!important;
      line-height:1.3!important;
    }
    ${DESKTOP} #reviewProDrawer input[type="checkbox"]{
      appearance:auto!important;
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
    ${DESKTOP} #reviewProDrawer :where(.review-actions button,.review-row-actions button,.utility-action){
      min-height:28px!important;
      height:auto!important;
      padding:5px 7px!important;
      border-radius:6px!important;
      font-size:8.5px!important;
      line-height:1.15!important;
    }
    ${DESKTOP} #reviewProDrawer .review-row{
      gap:6px!important;
      padding:7px!important;
      border-radius:7px!important;
    }
    ${DESKTOP} #reviewProDrawer .review-row strong{font-size:9px!important}
    ${DESKTOP} #reviewProDrawer .review-row small{font-size:7.5px!important}
    ${DESKTOP} #reviewProDrawer .review-row span{font-size:8.5px!important;line-height:1.3!important}
    ${DESKTOP} #reviewProDrawer .audit-results p{padding:6px!important;font-size:8.5px!important;line-height:1.3!important}
  `;

  function isDesktop() {
    return root.dataset.figureloomDeviceClass === 'desktop';
  }

  function keepStyleLast() {
    if (!style.isConnected || document.head.lastElementChild !== style) document.head.appendChild(style);
  }

  function ensureInlineProjectAdd() {
    if (!isDesktop()) return;
    const rail = document.getElementById('projectTabRail');
    const scroll = rail?.querySelector('.project-tab-scroll');
    const original = rail?.querySelector('.project-tab-tools>.project-tab-add');
    if (!rail || !scroll || !original) return;

    let inline = scroll.querySelector('.project-tab-add-inline');
    if (!inline) {
      inline = document.createElement('button');
      inline.type = 'button';
      inline.className = 'project-tab-add-inline';
      inline.textContent = '+';
      inline.title = 'Open another project';
      inline.setAttribute('aria-label', 'Open another project');
      inline.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        if (!original.disabled) original.click();
      });
      scroll.appendChild(inline);
    }
    inline.disabled = original.disabled;
    if (scroll.lastElementChild !== inline) scroll.appendChild(inline);
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
    ensureInlineProjectAdd();
  }

  document.getElementById(style.id)?.remove();
  document.head.appendChild(style);
  let refreshFrame = 0;
  new MutationObserver(() => {
    if (!refreshFrame) {
      refreshFrame = requestAnimationFrame(() => {
        refreshFrame = 0;
        refreshDesktop();
      });
    }
    labelPhoneHelp();
  }).observe(document.documentElement, { childList:true, subtree:true });

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

  /* Window capture runs before the older document-level phone action handler. */
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

  addEventListener('figureloom-stable-ready', () => {
    refreshDesktop();
    labelPhoneHelp();
  });
  addEventListener('figureloom-settings-change', () => {
    refreshDesktop();
    labelPhoneHelp();
  });
  refreshDesktop();
  labelPhoneHelp();
  window.FigureLoomTodayUiStability = Object.freeze({ openPhoneHelp, keepStyleLast, labelPhoneHelp, ensureInlineProjectAdd, refreshDesktop });
})();