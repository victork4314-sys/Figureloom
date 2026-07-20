(() => {
  if (window.__figureLoomTodayUiStabilityV2) return;
  window.__figureLoomTodayUiStabilityV2 = true;
  window.__figureLoomTodayUiStabilityV1 = true;

  const root = document.documentElement;
  const style = document.createElement('style');
  style.id = 'figureloomTodayUiStabilityStyle';
  style.textContent = `
    /* Desktop project tabs: keep each close control in the same row as its title. */
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
  `;

  function keepStyleLast() {
    if (!style.isConnected || document.head.lastElementChild !== style) document.head.appendChild(style);
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
  let styleFrame = 0;
  new MutationObserver(() => {
    if (!styleFrame) {
      styleFrame = requestAnimationFrame(() => {
        styleFrame = 0;
        keepStyleLast();
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
    keepStyleLast();
    labelPhoneHelp();
  });
  addEventListener('figureloom-settings-change', () => {
    keepStyleLast();
    labelPhoneHelp();
  });
  labelPhoneHelp();
  window.FigureLoomTodayUiStability = Object.freeze({ openPhoneHelp, keepStyleLast, labelPhoneHelp });
})();
