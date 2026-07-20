(() => {
  if (window.__figureLoomInteractionFixes20260720) return;
  window.__figureLoomInteractionFixes20260720 = true;

  const root = document.documentElement;
  const DESKTOP = 'html[data-figureloom-device-class="desktop"] body';
  const style = document.createElement('style');
  style.id = 'figureloomInteractionFixes20260720Style';
  style.textContent = `
    /* Keep both kinds of project-tab close controls beside their own title. */
    ${DESKTOP} #projectsRibbonHost .projects-open-list .projects-chip-wrap{
      position:relative!important;
      display:block!important;
      flex:0 1 145px!important;
      width:auto!important;
      min-width:86px!important;
      max-width:145px!important;
      height:27px!important;
      min-height:27px!important;
      max-height:27px!important;
      margin:0!important;
      padding:0!important;
      align-self:center!important;
      overflow:visible!important;
    }
    ${DESKTOP} #projectsRibbonHost .projects-open-list .projects-chip-wrap>.projects-open-chip{
      position:relative!important;
      display:flex!important;
      align-items:center!important;
      box-sizing:border-box!important;
      width:100%!important;
      min-width:0!important;
      max-width:none!important;
      height:27px!important;
      min-height:27px!important;
      max-height:27px!important;
      margin:0!important;
      padding:0 27px 0 8px!important;
    }
    ${DESKTOP} #projectsRibbonHost .projects-open-list .projects-chip-wrap>.projects-chip-close{
      position:absolute!important;
      z-index:6!important;
      top:50%!important;
      right:4px!important;
      bottom:auto!important;
      left:auto!important;
      display:grid!important;
      place-items:center!important;
      box-sizing:border-box!important;
      width:19px!important;
      min-width:19px!important;
      max-width:19px!important;
      height:19px!important;
      min-height:19px!important;
      max-height:19px!important;
      margin:0!important;
      padding:0!important;
      transform:translateY(-50%)!important;
      line-height:1!important;
    }
    ${DESKTOP} #projectTabRail .project-tab-wrap{
      position:relative!important;
      display:block!important;
      height:28px!important;
      min-height:28px!important;
      overflow:visible!important;
    }
    ${DESKTOP} #projectTabRail .project-tab-wrap>.project-tab{
      box-sizing:border-box!important;
      width:100%!important;
      height:28px!important;
      margin:0!important;
      padding-right:29px!important;
    }
    ${DESKTOP} #projectTabRail .project-tab-wrap>.project-tab-close{
      position:absolute!important;
      z-index:6!important;
      top:50%!important;
      right:4px!important;
      bottom:auto!important;
      left:auto!important;
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
      transform:translateY(-50%)!important;
      line-height:1!important;
    }
  `;

  function keepStyleLast() {
    if (!style.isConnected) document.head.appendChild(style);
    else if (document.head.lastElementChild !== style) document.head.appendChild(style);
  }

  function labelMobileHelp() {
    document.querySelectorAll('[data-phone-action="guide"]').forEach(button => {
      const label = button.querySelector('small');
      if (label && label.textContent !== 'Help') label.textContent = 'Help';
      button.setAttribute('aria-label', 'Open FigureLoom help');
      button.title = 'Open FigureLoom help';
    });
  }

  function openMobileHelp() {
    window.FigureLoomPhoneMode?.close?.({ restoreFocus:false });
    requestAnimationFrame(() => {
      const button = document.getElementById('tourHelpButton');
      if (window.FigureLoomHelpCenter?.open) {
        window.FigureLoomHelpCenter.open(button || undefined);
        return;
      }
      button?.click();
    });
  }

  window.addEventListener('click', event => {
    if (root.dataset.figureloomResolvedMode !== 'phone') return;
    const button = event.target instanceof Element ? event.target.closest('[data-phone-action="guide"]') : null;
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openMobileHelp();
  }, true);

  const observer = new MutationObserver(() => {
    keepStyleLast();
    labelMobileHelp();
  });

  if (document.head) keepStyleLast();
  else document.addEventListener('DOMContentLoaded', keepStyleLast, { once:true });
  observer.observe(document.documentElement, { childList:true, subtree:true });
  addEventListener('figureloom-stable-ready', () => {
    keepStyleLast();
    labelMobileHelp();
  });
  addEventListener('figureloom-settings-change', labelMobileHelp);
  labelMobileHelp();
})();
