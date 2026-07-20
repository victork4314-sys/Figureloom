(() => {
  if (window.__figureLoomTodayUiStabilityV4) return;
  window.__figureLoomTodayUiStabilityV4 = true;
  window.__figureLoomTodayUiStabilityV3 = true;
  window.__figureLoomTodayUiStabilityV2 = true;
  window.__figureLoomTodayUiStabilityV1 = true;

  const root = document.documentElement;
  const style = document.createElement('style');
  style.id = 'figureloomTodayUiStabilityStyle';
  style.textContent = `
    /* Desktop project tabs: title, close button, then the add-tab button at the end of the strip. */
    html[data-figureloom-device-class="desktop"] body #projectTabRail .project-tab-wrap{
      position:relative!important;
      display:grid!important;
      grid-template-columns:minmax(0,1fr) 20px!important;
      align-items:center!important;
      column-gap:2px!important;
      min-height:28px!important;
      overflow:hidden!important;
    }
    html[data-figureloom-device-class="desktop"] body #projectTabRail .project-tab-wrap>.project-tab{
      position:relative!important;
      grid-column:1!important;
      width:100%!important;
      min-width:0!important;
      padding-right:8px!important;
    }
    html[data-figureloom-device-class="desktop"] body #projectTabRail .project-tab-wrap>.project-tab-close{
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
    html[data-figureloom-device-class="desktop"] body #projectTabRail .project-tab-tools>.project-tab-add{display:none!important}
    html[data-figureloom-device-class="desktop"] body #projectTabRail .project-tab-scroll>.project-tab-add-inline{
      align-self:end!important;
      display:grid!important;
      place-items:center!important;
      flex:0 0 28px!important;
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
      color:var(--figureloom-ui-text,#172321)!important;
      background:var(--figureloom-ui-soft,#edf3f1)!important;
      box-shadow:none!important;
      font-size:16px!important;
      font-weight:700!important;
      line-height:1!important;
      transform:none!important;
    }
    html[data-figureloom-device-class="desktop"] body #projectTabRail .project-tab-scroll>.project-tab-add-inline:hover:not(:disabled){
      color:var(--figureloom-ui-accent-strong,#195c51)!important;
      border-color:var(--figureloom-ui-accent,#2f7468)!important;
      background:var(--figureloom-ui-accent-soft,#dff1ec)!important;
    }

    /* Projects panel chips use the same side-by-side close layout. */
    html[data-figureloom-device-class="desktop"] body #projectsRibbonHost .projects-chip-wrap{
      position:relative!important;
      display:grid!important;
      grid-template-columns:minmax(0,1fr) 20px!important;
      align-items:center!important;
      column-gap:2px!important;
      min-width:92px!important;
      overflow:hidden!important;
    }
    html[data-figureloom-device-class="desktop"] body #projectsRibbonHost .projects-chip-wrap>.projects-open-chip{
      position:relative!important;
      grid-column:1!important;
      width:100%!important;
      min-width:0!important;
      max-width:none!important;
      padding-right:8px!important;
    }
    html[data-figureloom-device-class="desktop"] body #projectsRibbonHost .projects-chip-wrap>.projects-chip-close{
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
    html[data-figureloom-device-class="desktop"] body #projectsRibbonHost .projects-chip-wrap:hover>.projects-chip-close,
    html[data-figureloom-device-class="desktop"] body #projectsRibbonHost .projects-chip-wrap:focus-within>.projects-chip-close{
      opacity:1!important;
    }

    /* Keep the account status dot outside the avatar circle instead of clipping it into the picture. */
    html[data-figureloom-device-class="desktop"] body #accountProfileButton#accountProfileButton.brand-mark{
      overflow:visible!important;
    }
    html[data-figureloom-device-class="desktop"] body #accountProfileButton#accountProfileButton.brand-mark .account-avatar-face{
      overflow:hidden!important;
    }
    html[data-figureloom-device-class="desktop"] body #accountProfileButton#accountProfileButton::after{
      right:-3px!important;
      bottom:-3px!important;
    }

    /* Desktop Pages heading: matching add/delete boxes together on the right. */
    html[data-figureloom-device-class="desktop"] body .left-panel>.panel-heading:first-of-type{
      display:grid!important;
      grid-template-columns:minmax(0,1fr) 28px 28px!important;
      align-items:center!important;
      gap:4px!important;
    }
    html[data-figureloom-device-class="desktop"] body .left-panel>.panel-heading:first-of-type>h2{
      grid-column:1!important;
      min-width:0!important;
      margin:0!important;
    }
    html[data-figureloom-device-class="desktop"] body .left-panel>.panel-heading:first-of-type>#addPageButton,
    html[data-figureloom-device-class="desktop"] body .left-panel>.panel-heading:first-of-type>#deletePageButton{
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
    html[data-figureloom-device-class="desktop"] body .left-panel>.panel-heading:first-of-type>#addPageButton{grid-column:2!important}
    html[data-figureloom-device-class="desktop"] body .left-panel>.panel-heading:first-of-type>#deletePageButton{grid-column:3!important}

    /* Desktop Data & Charts: retain the compact checkboxes already approved there. */
    html[data-figureloom-device-class="desktop"] body :where(#dataShowLegend,#dataShowGridlines,#dataShowLabels,#dataTableTitle),
    html[data-figureloom-device-class="desktop"] body #dataLabDrawer input[type="checkbox"]{
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
    html[data-figureloom-device-class="desktop"] body #dataLabDrawer :where(label,.data-setting-row,.data-check-row){
      font-size:9px!important;
      line-height:1.3!important;
    }

    /* Desktop Review: retain the compact drawer scale already approved there. */
    html[data-figureloom-device-class="desktop"] body #reviewProDrawer.review-pro-drawer{font-size:9px!important}
    html[data-figureloom-device-class="desktop"] body #reviewProDrawer .review-section{margin-bottom:6px!important;border-radius:8px!important}
    html[data-figureloom-device-class="desktop"] body #reviewProDrawer .review-section>summary{
      padding:8px 9px!important;
      font-size:9.5px!important;
      font-weight:750!important;
      line-height:1.2!important;
    }
    html[data-figureloom-device-class="desktop"] body #reviewProDrawer .review-content{padding:0 8px 8px!important}
    html[data-figureloom-device-class="desktop"] body #reviewProDrawer :where(textarea,input:not([type="checkbox"]),select){
      min-height:29px!important;
      padding:5px 7px!important;
      border-radius:7px!important;
      font-size:9px!important;
      line-height:1.3!important;
    }
    html[data-figureloom-device-class="desktop"] body #reviewProDrawer textarea{min-height:58px!important}
    html[data-figureloom-device-class="desktop"] body #reviewProDrawer :where(.review-filter,.review-full,.vision-row label,.vision-row span,.review-list,.tool-note){
      font-size:8.5px!important;
      line-height:1.3!important;
    }
    html[data-figureloom-device-class="desktop"] body #reviewProDrawer input[type="checkbox"]{
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
    html[data-figureloom-device-class="desktop"] body #reviewProDrawer :where(.review-actions button,.review-row-actions button,.utility-action){
      min-height:28px!important;
      height:auto!important;
      padding:5px 7px!important;
      border-radius:6px!important;
      font-size:8.5px!important;
      line-height:1.15!important;
    }
    html[data-figureloom-device-class="desktop"] body #reviewProDrawer .review-row{
      gap:6px!important;
      padding:7px!important;
      border-radius:7px!important;
    }
    html[data-figureloom-device-class="desktop"] body #reviewProDrawer .review-row strong{font-size:9px!important}
    html[data-figureloom-device-class="desktop"] body #reviewProDrawer .review-row small{font-size:7.5px!important}
    html[data-figureloom-device-class="desktop"] body #reviewProDrawer .review-row span{font-size:8.5px!important;line-height:1.3!important}
    html[data-figureloom-device-class="desktop"] body #reviewProDrawer .audit-results p{padding:6px!important;font-size:8.5px!important;line-height:1.3!important}

    /* Phone Data & charts: checkboxes remain normal checkbox size, not giant mobile fields. */
    html[data-figureloom-resolved-mode="phone"] body #dataLabDrawer :where(.data-check-grid,.data-inline-check) input[type="checkbox"]{
      appearance:auto!important;
      -webkit-appearance:checkbox!important;
      display:inline-block!important;
      flex:0 0 17px!important;
      width:17px!important;
      min-width:17px!important;
      max-width:17px!important;
      height:17px!important;
      min-height:17px!important;
      max-height:17px!important;
      margin:0!important;
      padding:0!important;
      border-radius:3px!important;
      box-shadow:none!important;
      transform:none!important;
      accent-color:var(--figureloom-ui-accent,#2f7468);
    }
    html[data-figureloom-resolved-mode="phone"] body #dataLabDrawer :where(.data-check-grid label,.data-inline-check){
      min-height:30px!important;
      gap:7px!important;
      font-size:11px!important;
      line-height:1.25!important;
    }

    /* Phone Review: use the same compact type and control scale as the other phone workspaces. */
    html[data-figureloom-resolved-mode="phone"] body .review-pro-drawer{
      font-size:11px!important;
    }
    html[data-figureloom-resolved-mode="phone"] body .review-pro-drawer .utility-body{
      padding:10px 11px calc(86px + env(safe-area-inset-bottom))!important;
    }
    html[data-figureloom-resolved-mode="phone"] body .review-pro-drawer .utility-head :where(h2,strong){
      font-size:17px!important;
      line-height:1.2!important;
    }
    html[data-figureloom-resolved-mode="phone"] body .review-pro-drawer .utility-head :where(p,small){
      font-size:10px!important;
      line-height:1.35!important;
    }
    html[data-figureloom-resolved-mode="phone"] body .review-pro-drawer .review-section{
      margin-bottom:7px!important;
      border-radius:10px!important;
    }
    html[data-figureloom-resolved-mode="phone"] body .review-pro-drawer .review-section>summary{
      padding:10px 11px!important;
      font-size:12px!important;
      line-height:1.25!important;
      font-weight:700!important;
    }
    html[data-figureloom-resolved-mode="phone"] body .review-pro-drawer .review-content{
      padding:0 9px 9px!important;
    }
    html[data-figureloom-resolved-mode="phone"] body .review-pro-drawer :where(textarea,input:not([type="checkbox"]),select){
      min-height:40px!important;
      padding:8px!important;
      border-radius:8px!important;
      font-size:12px!important;
      line-height:1.35!important;
    }
    html[data-figureloom-resolved-mode="phone"] body .review-pro-drawer textarea{
      min-height:76px!important;
    }
    html[data-figureloom-resolved-mode="phone"] body .review-pro-drawer :where(.review-actions button,.review-row-actions button,.utility-action){
      min-height:40px!important;
      padding:8px 10px!important;
      border-radius:8px!important;
      font-size:11px!important;
      line-height:1.15!important;
    }
    html[data-figureloom-resolved-mode="phone"] body .review-pro-drawer .review-filter input[type="checkbox"]{
      appearance:auto!important;
      -webkit-appearance:checkbox!important;
      flex:0 0 17px!important;
      width:17px!important;
      min-width:17px!important;
      max-width:17px!important;
      height:17px!important;
      min-height:17px!important;
      max-height:17px!important;
      margin:0!important;
      padding:0!important;
      transform:none!important;
      accent-color:var(--figureloom-ui-accent,#2f7468);
    }
    html[data-figureloom-resolved-mode="phone"] body .review-pro-drawer .review-filter{
      min-height:30px!important;
      gap:7px!important;
      font-size:11px!important;
    }
    html[data-figureloom-resolved-mode="phone"] body .review-pro-drawer .review-list{
      gap:6px!important;
      font-size:10px!important;
    }
    html[data-figureloom-resolved-mode="phone"] body .review-pro-drawer .review-row{
      gap:7px!important;
      padding:8px!important;
    }
    html[data-figureloom-resolved-mode="phone"] body .review-pro-drawer .review-row strong{font-size:12px!important}
    html[data-figureloom-resolved-mode="phone"] body .review-pro-drawer .review-row small{font-size:9px!important}
    html[data-figureloom-resolved-mode="phone"] body .review-pro-drawer .review-row span,
    html[data-figureloom-resolved-mode="phone"] body .review-pro-drawer :where(.review-full,.vision-row label,.vision-row span,.tool-note,.audit-results p){
      font-size:10px!important;
      line-height:1.35!important;
    }
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

  document.getElementById(style.id)?.remove();
  document.head.appendChild(style);

  let maintenanceFrame = 0;
  function scheduleMaintenance() {
    if (maintenanceFrame) return;
    maintenanceFrame = requestAnimationFrame(() => {
      maintenanceFrame = 0;
      keepStyleLast();
      ensureInlineProjectAdd();
      labelPhoneHelp();
    });
  }

  new MutationObserver(scheduleMaintenance).observe(document.documentElement, { childList:true, subtree:true });

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

  addEventListener('figureloom-stable-ready', scheduleMaintenance);
  addEventListener('figureloom-settings-change', scheduleMaintenance);
  scheduleMaintenance();

  window.FigureLoomTodayUiStability = Object.freeze({
    openPhoneHelp,
    keepStyleLast,
    ensureInlineProjectAdd,
    labelPhoneHelp
  });
})();