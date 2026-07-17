(() => {
  if (document.getElementById('projectsHomeButtonMatchStyle')) return;
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
      border-color:#8fa7d2!important;
      background:#f2f6fc!important;
      box-shadow:inset 0 -2px 0 rgba(65,105,193,.42)!important
    }
    #projectsRibbonHost .projects-current-group [data-project-action="disconnect"]{display:none!important}
    #projectsRibbonHost .projects-current-group{margin-left:auto!important;max-width:none!important}
    #projectsRibbonHost .projects-current-copy{min-width:120px!important;max-width:190px!important}

    html[data-figureloom-theme="dark"] #projectsRibbonHost .projects-main-actions button,
    html[data-figureloom-theme="dark"] #projectsRibbonHost .projects-current-group>button,
    html[data-figureloom-theme="dark"] #projectsRibbonHost .projects-open-chip{
      border-color:#455365!important;
      background:#293440!important;
      color:#dce3eb!important
    }
    html[data-figureloom-theme="dark"] #projectsRibbonHost .projects-main-actions button:hover:not(:disabled),
    html[data-figureloom-theme="dark"] #projectsRibbonHost .projects-current-group>button:hover:not(:disabled),
    html[data-figureloom-theme="dark"] #projectsRibbonHost .projects-open-chip:hover:not(:disabled){background:#313d4a!important}
    html[data-figureloom-theme="dark"] #projectsRibbonHost .projects-open-chip.active{border-color:#7188bb!important;background:#303c4b!important}

    @media(max-width:900px){
      #projectsRibbonHost .projects-current-copy{display:none!important}
      #projectsRibbonHost .projects-open-chip{flex-basis:135px!important;max-width:135px!important}
    }
  `;
  document.head.appendChild(style);
})();