(() => {
  if (window.__figureLoomProjectsRibbonPolish) return;
  window.__figureLoomProjectsRibbonPolish = true;

  const shareButton = document.getElementById('collaborateRibbonButton');
  const ribbonTabs = document.querySelector('.ribbon-tabs');
  const cloud = window.SciCanvasCloud;
  if (!shareButton || !ribbonTabs || !cloud) return;

  const ACTIVE_DRAFT_KEY = 'figureloom-window-active-local-draft-v1';
  const CLOUD_ACTIVE_KEY = 'figureloom-window-active-project-tab-v1';

  const disconnectButton = document.createElement('button');
  disconnectButton.id = 'projectDisconnectRibbonButton';
  disconnectButton.type = 'button';
  disconnectButton.className = 'ribbon-command-tab';
  disconnectButton.hidden = true;
  disconnectButton.textContent = 'Disconnect';
  shareButton.insertAdjacentElement('afterend', disconnectButton);

  function rail() {
    return document.getElementById('projectTabRail');
  }

  function activeCloudTab() {
    return rail()?.querySelector('.project-tab.active[data-project-id]') || null;
  }

  function activeCloudId() {
    return String(
      cloud.currentProjectId ||
      activeCloudTab()?.dataset.projectId ||
      sessionStorage.getItem(CLOUD_ACTIVE_KEY) ||
      ''
    );
  }

  function isLocalDraft() {
    return Boolean(sessionStorage.getItem(ACTIVE_DRAFT_KEY));
  }

  function renderDisconnect() {
    const projectId = activeCloudId();
    const connected = Boolean(cloud.currentProjectId);
    const shouldShow = Boolean(projectId) && !isLocalDraft();

    disconnectButton.hidden = !shouldShow;
    disconnectButton.disabled = !shouldShow;
    disconnectButton.dataset.state = connected ? 'connected' : 'disconnected';
    disconnectButton.textContent = connected ? 'Disconnect' : 'Reconnect';
    disconnectButton.title = connected
      ? 'Save the latest project state and disconnect live collaboration'
      : 'Reconnect this project to live collaboration';
    disconnectButton.setAttribute('aria-label', disconnectButton.title);
  }

  disconnectButton.addEventListener('click', () => {
    const projectRail = rail();
    if (!projectRail || disconnectButton.disabled) return;

    disconnectButton.disabled = true;
    if (cloud.currentProjectId) {
      projectRail.querySelector('.project-tab-disconnect')?.click();
    } else {
      activeCloudTab()?.click();
    }

    [80, 350, 900, 1600].forEach(delay => setTimeout(renderDisconnect, delay));
  });

  ['scicanvas-cloud-opened', 'scicanvas-cloud-saved', 'scicanvas-cloud-disconnected', 'figureloom-project-created'].forEach(type => {
    window.addEventListener(type, () => setTimeout(renderDisconnect, 60));
  });

  const railObserver = new MutationObserver(renderDisconnect);
  const observedRail = rail();
  if (observedRail) {
    railObserver.observe(observedRail, {
      subtree:true,
      childList:true,
      attributes:true,
      attributeFilter:['class', 'data-project-id', 'disabled']
    });
  }

  const style = document.createElement('style');
  style.id = 'projectsRibbonPolishStyle';
  style.textContent = `
    #projectsRibbonHost{align-items:center;gap:9px}
    #projectsRibbonHost .tool-group{align-self:stretch}
    .projects-main-actions button{
      display:inline-flex!important;grid-template-columns:none!important;align-items:center;justify-content:center;gap:6px;
      min-width:70px!important;height:36px!important;padding:6px 9px!important;
      border:1px solid #cfd7e3!important;border-radius:7px!important;background:#fff!important;color:#253044!important;
      box-shadow:none!important
    }
    .projects-main-actions button:hover:not(:disabled){background:#f4f7fb!important;border-color:#aebccd!important}
    .projects-main-actions button strong{
      display:grid;place-items:center;width:19px;height:19px;border-radius:5px;
      background:#eef3f8;color:#526b8d;font-size:12px!important;font-weight:700!important;line-height:1
    }
    .projects-main-actions button span{font-size:10px!important;font-weight:700!important}
    .projects-open-list{gap:5px!important;padding-bottom:3px!important}
    .projects-open-chip{
      flex-basis:158px!important;max-width:158px!important;height:34px!important;padding:5px 9px!important;
      border:1px solid #cfd7e3!important;border-radius:7px!important;background:#fff!important;color:#344258!important;
      box-shadow:none!important
    }
    .projects-open-chip:hover{background:#f4f7fb!important;border-color:#aebccd!important}
    .projects-open-chip.active{
      border-color:#8ba4d2!important;background:#f2f6fc!important;
      box-shadow:inset 0 -2px 0 rgba(65,105,193,.42)!important
    }
    .projects-open-chip span{font-size:9px!important;font-weight:650!important}
    .projects-current-group{margin-left:auto;max-width:330px!important}
    .projects-current-copy{min-width:105px!important;max-width:155px!important}
    .projects-current-group [data-project-action="disconnect"]{display:none!important}
    .projects-current-group>button{height:34px!important;border-radius:7px!important;background:#fff!important;box-shadow:none!important}
    #projectDisconnectRibbonButton{margin-left:0!important;color:#6d5b4a}
    #projectDisconnectRibbonButton::before{content:'●';font-size:7px;color:#d28a43;margin-right:6px}
    #projectDisconnectRibbonButton[data-state="disconnected"]{color:#466f63}
    #projectDisconnectRibbonButton[data-state="disconnected"]::before{content:'↻';font-size:12px;color:#4b927d}
    #projectDisconnectRibbonButton[hidden]{display:none!important}
    html[data-figureloom-theme="dark"] .projects-main-actions button,
    html[data-figureloom-theme="dark"] .projects-open-chip,
    html[data-figureloom-theme="dark"] .projects-current-group>button{
      border-color:#455365!important;background:#293440!important;color:#dce3eb!important
    }
    html[data-figureloom-theme="dark"] .projects-main-actions button strong{background:#344151;color:#aebfe0}
    html[data-figureloom-theme="dark"] .projects-open-chip:hover{background:#313d4a!important}
    html[data-figureloom-theme="dark"] .projects-open-chip.active{border-color:#7188bb!important;background:#303c4b!important}
    @media(max-width:900px){
      .projects-main-actions button{min-width:38px!important;padding-inline:7px!important}
      .projects-open-chip{flex-basis:126px!important;max-width:126px!important}
      #projectDisconnectRibbonButton{padding-inline:9px!important}
    }
  `;
  document.head.appendChild(style);

  const timer = setInterval(renderDisconnect, 800);
  window.addEventListener('beforeunload', () => {
    clearInterval(timer);
    railObserver.disconnect();
  }, { once:true });

  renderDisconnect();
})();
