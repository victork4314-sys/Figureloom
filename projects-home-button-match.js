(() => {
  if (document.getElementById('projectsHomeButtonMatchStyle')) return;

  const root = document.documentElement;
  const style = document.createElement('style');
  style.id = 'projectsHomeButtonMatchStyle';
  style.textContent = `
    html body .app-shell{grid-template-rows:58px 38px 86px minmax(0,1fr) 28px!important}
    html body #projectTabRail{display:none!important}

    #projectsRibbonHost .projects-main-actions button,
    #projectsRibbonHost .projects-current-group>button,
    #projectsRibbonHost .projects-open-chip{
      display:inline-flex!important;
      grid-template-columns:none!important;
      align-items:center!important;
      justify-content:center!important;
      gap:7px!important;
      min-width:0!important;
      height:auto!important;
      padding:7px 10px!important;
      border:1px solid #cfd7e3!important;
      border-radius:7px!important;
      background:#fff!important;
      color:#253044!important;
      box-shadow:none!important;
      font:inherit!important;
      font-size:inherit!important;
      font-weight:400!important;
      line-height:normal!important
    }
    #projectsRibbonHost .projects-main-actions button strong{display:none!important}
    #projectsRibbonHost .projects-main-actions button span,
    #projectsRibbonHost .projects-open-chip span{
      display:inline!important;
      font:inherit!important;
      font-size:inherit!important;
      font-weight:400!important
    }
    #projectsRibbonHost .projects-main-actions button:hover:not(:disabled),
    #projectsRibbonHost .projects-current-group>button:hover:not(:disabled),
    #projectsRibbonHost .projects-open-chip:hover:not(:disabled){
      background:#f4f7fb!important;
      border-color:#cfd7e3!important;
      box-shadow:none!important
    }
    #projectsRibbonHost .projects-open-chip{
      justify-content:flex-start!important;
      flex:0 1 180px!important;
      max-width:180px!important;
      white-space:nowrap!important
    }
    #projectsRibbonHost .projects-open-chip.active{
      border-color:#cfd7e3!important;
      background:#fff!important;
      box-shadow:none!important
    }
    #projectsRibbonHost .projects-current-group [data-project-action="disconnect"]{display:none!important}
    #projectsRibbonHost .projects-current-group{margin-left:auto!important;max-width:none!important}
    #projectsRibbonHost .projects-current-copy{min-width:120px!important;max-width:190px!important}

    html[data-figureloom-theme="dark"] #projectsRibbonHost .projects-main-actions button,
    html[data-figureloom-theme="dark"] #projectsRibbonHost .projects-current-group>button,
    html[data-figureloom-theme="dark"] #projectsRibbonHost .projects-open-chip,
    html[data-figureloom-theme="dark"] #projectsRibbonHost .projects-open-chip.active{
      border-color:#4c535e!important;
      background:#353b44!important;
      color:#e8ebef!important;
      box-shadow:none!important
    }
    html[data-figureloom-theme="dark"] #projectsRibbonHost .projects-main-actions button:hover:not(:disabled),
    html[data-figureloom-theme="dark"] #projectsRibbonHost .projects-current-group>button:hover:not(:disabled),
    html[data-figureloom-theme="dark"] #projectsRibbonHost .projects-open-chip:hover:not(:disabled){
      border-color:#4c535e!important;
      background:#404751!important;
      color:#e8ebef!important;
      box-shadow:none!important
    }

    html:not([data-figureloom-live-connected="1"]) #collabChatBubble,
    html:not([data-figureloom-live-connected="1"]) #collabChatPanel{
      display:none!important
    }

    @media(max-width:900px){
      #projectsRibbonHost .projects-current-copy{display:none!important}
      #projectsRibbonHost .projects-open-chip{flex-basis:135px!important;max-width:135px!important}
    }
  `;
  document.head.appendChild(style);

  function syncLiveVisibility() {
    const button = document.getElementById('projectDisconnectRibbonButton');
    const connected = button?.dataset.state === 'connected' && !button.hidden;
    const nextState = connected ? '1' : '0';
    if (root.dataset.figureloomLiveConnected !== nextState) {
      root.dataset.figureloomLiveConnected = nextState;
    }
    if (!connected) {
      const bubble = document.getElementById('collabChatBubble');
      const panel = document.getElementById('collabChatPanel');
      if (bubble && !bubble.hidden) bubble.hidden = true;
      if (panel && !panel.hidden) panel.hidden = true;
    }
  }

  syncLiveVisibility();
  const timer = setInterval(syncLiveVisibility, 300);
  window.addEventListener('figureloom-collaboration-connected', syncLiveVisibility);
  window.addEventListener('figureloom-collaboration-disconnected', syncLiveVisibility);
  window.addEventListener('scicanvas-cloud-opened', syncLiveVisibility);
  window.addEventListener('beforeunload', () => clearInterval(timer), { once:true });
})();