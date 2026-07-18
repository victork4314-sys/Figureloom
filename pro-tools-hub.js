(() => {
  if (typeof createDrawer !== 'function') return;

  const drawer = createDrawer('proToolsDrawer', 'Pro Tools', 'Advanced scientific figure tools, grouped by task');
  drawer.classList.add('pro-tools-drawer');
  const body = drawer.querySelector('.utility-body');
  body.innerHTML = `
    <p class="pro-intro">Open only the workspace you need. Nothing here changes the canvas until you choose an action.</p>
    <div id="proWorkspaceGrid" class="pro-workspace-grid"></div>
    <details class="pro-shortcuts"><summary>Keyboard shortcuts</summary><div id="proShortcutList"></div></details>
  `;

  const registry = new Map();
  const shortcutRegistry = new Map();
  const grid = body.querySelector('#proWorkspaceGrid');
  const shortcutList = body.querySelector('#proShortcutList');

  const defaults = [
    ['arrange', 'Layouts & templates', 'Editable starting layouts, reusable FigureLoom files, and PowerPoint templates.', '▦'],
    ['data', 'Data & charts', 'Paste CSV/TSV data into editable tables, charts and heatmaps.', '▥'],
    ['code', 'Code & instructions', 'Create and edit code windows and structured technical instructions.', '</>'],
    ['annotate', 'Scientific annotation', 'Callouts, brackets, scale bars, panel labels, equations and symbols.', '✦'],
    ['components', 'Components & objects', 'Reusable components, image crop/masks, flipping and shape combinations.', '◇'],
    ['review', 'Review & references', 'Comments, sources, version comparison, accessibility and visual checks.', '✓'],
    ['publish', 'Publish & present', 'Journal presets, print checks, presentation mode and export readiness.', '▣'],
    ['office', 'Office bridge', 'Import PowerPoint, Excel, ODS, CSV and TSV; export editable or compatibility PowerPoint.', '▦'],
    ['workspace', 'Workspace & recovery', 'Move objects between pages, manage assets, recover work, diagnose and reset the interface.', '↻'],
    ['scienceplus', 'Advanced Science', 'Publication plots, sequence tracks, phylogenetic trees, gels and microscopy layouts.', '∿'],
    ['cloud', 'Accounts & gallery', 'Email sign-in and recovery, local gallery, encrypted cloud vault and shared projects.', '☁'],
    ['collab', 'Live collaboration', 'Invite collaborators, encrypted comments, presence, remote cursors and realtime review sessions.', '◎'],
    ['vector', 'SVG path editor', 'Edit path commands and anchors or break compound SVG artwork into independent objects.', '⌁'],
    ['typeset', 'TeX typesetting', 'Render editable TeX source into publication-quality embedded SVG equations.', '∫'],
    ['exchange', 'Pathway exchange', 'Export the active page as SBGN-ML, BioPAX RDF/XML or SBML Level 3.', '⇄']
  ];

  function renderWorkspaces() {
    grid.replaceChildren();
    defaults.forEach(([id, title, description, icon]) => {
      const entry = registry.get(id);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'pro-workspace-card';
      button.dataset.workspace = id;

      const iconNode = document.createElement('span');
      iconNode.className = 'pro-workspace-icon';
      iconNode.setAttribute('aria-hidden', 'true');
      iconNode.textContent = icon;

      const copy = document.createElement('span');
      const heading = document.createElement('strong');
      heading.textContent = title;
      const detail = document.createElement('small');
      detail.textContent = description;
      copy.append(heading, detail);

      const arrow = document.createElement('span');
      arrow.className = 'pro-open-arrow';
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '›';

      button.append(iconNode, copy, arrow);
      button.disabled = !entry;
      button.title = entry ? `Open ${title}` : `${title} is loading`;
      button.addEventListener('click', () => {
        if (!entry) return;
        drawer.classList.remove('open');
        entry.open();
      });
      grid.appendChild(button);
    });
  }

  function renderShortcuts() {
    shortcutList.replaceChildren();
    if (!shortcutRegistry.size) {
      shortcutList.textContent = 'Shortcuts appear as advanced workspaces load.';
      return;
    }
    [...shortcutRegistry.entries()].forEach(([keys, description]) => {
      const row = document.createElement('div');
      row.className = 'pro-shortcut-row';
      row.innerHTML = `<kbd>${keys}</kbd><span>${description}</span>`;
      shortcutList.appendChild(row);
    });
  }

  window.SciCanvasPro = {
    register(id, open, options = {}) {
      registry.set(id, { open, ...options });
      renderWorkspaces();
    },
    shortcut(keys, description) {
      shortcutRegistry.set(keys, description);
      renderShortcuts();
    },
    open() { drawer.classList.add('open'); },
    close() { drawer.classList.remove('open'); }
  };

  const proButton = document.createElement('button');
  proButton.id = 'proToolsButton';
  proButton.type = 'button';
  proButton.textContent = 'Pro tools';
  proButton.title = 'Open advanced scientific figure tools';
  proButton.addEventListener('click', () => drawer.classList.toggle('open'));
  document.querySelector('.title-actions')?.prepend(proButton);

  document.querySelector('[data-tab="review"]')?.addEventListener('click', () => drawer.classList.add('open'));

  function correctCollaborationCopy() {
    const note = document.querySelector('#collaborationDrawer .collab-note');
    if (note) note.textContent = 'Only the owner can change access. Existing accounts receive access immediately; new email addresses receive it automatically after creating an account.';
    const inviteButton = document.getElementById('collabInviteButton');
    if (inviteButton && inviteButton.textContent === 'Send invite') inviteButton.textContent = 'Grant access';
    return Boolean(note && inviteButton);
  }
  if (!correctCollaborationCopy()) {
    const observer = new MutationObserver(() => {
      if (correctCollaborationCopy()) observer.disconnect();
    });
    observer.observe(document.body, { childList:true, subtree:true });
    setTimeout(() => observer.disconnect(), 5000);
  }

  function decorateDataWorkspace() {
    const dataDrawer = document.getElementById('dataLabDrawer');
    const dataPanel = document.getElementById('figureloomDataWorkspacePlus');
    if (!dataDrawer || !dataPanel) return false;
    dataDrawer.classList.add('data-lab-polished');

    const dataBody = dataDrawer.querySelector('.utility-body');
    if (dataBody && !dataBody.querySelector('.data-lab-hero')) {
      const hero = document.createElement('div');
      hero.className = 'data-lab-hero';
      hero.innerHTML = '<span class="data-lab-hero-icon" aria-hidden="true">▥</span><span><strong>Build a visual from your data</strong><small>Import, paste, or edit values in the sheet, then choose how FigureLoom should display them.</small></span>';
      dataBody.prepend(hero);
    }

    if (!dataPanel.querySelector('.data-sheet-heading')) {
      const heading = document.createElement('div');
      heading.className = 'data-sheet-heading';
      heading.innerHTML = '<span><strong>Data sheet</strong><small>Edit cells directly. The first row is used for column names.</small></span><span class="data-sheet-badge">Editable</span>';
      dataPanel.prepend(heading);
    }

    const mainControls = [...(dataBody?.children || [])].find(node => node.classList?.contains('data-control-grid') && !dataPanel.contains(node));
    mainControls?.classList.add('data-primary-controls');
    dataDrawer.querySelector('#dataPreviewSummary')?.classList.add('data-preview-card');
    dataDrawer.querySelector('.data-actions')?.classList.add('data-final-actions');
    dataDrawer.querySelector('.tool-note')?.classList.add('data-lab-note');
    return true;
  }

  if (!decorateDataWorkspace()) {
    const dataObserver = new MutationObserver(() => {
      if (decorateDataWorkspace()) dataObserver.disconnect();
    });
    dataObserver.observe(document.body, { childList:true, subtree:true });
    setTimeout(() => dataObserver.disconnect(), 10000);
  }

  const style = document.createElement('style');
  style.textContent = `
    #proToolsButton{border-color:#9bb1d4;background:#eef4ff;color:#244f9c;font-weight:700}
    #proToolsButton:hover{background:#e2ecff}.pro-tools-drawer{width:min(900px,calc(100vw - 20px))!important}
    .pro-intro{margin:0 0 12px;color:#657287;font-size:11px;line-height:1.5}
    .pro-workspace-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
    .pro-workspace-card{min-width:0;display:grid;grid-template-columns:38px minmax(0,1fr) 18px;align-items:center;gap:10px;min-height:92px;padding:12px;border:1px solid #d5deea;border-radius:11px;background:#fff;text-align:left;color:#29364b}
    .pro-workspace-card:not(:disabled):hover{border-color:#7899da;background:#f5f8ff;box-shadow:0 5px 16px rgba(43,60,90,.08)}
    .pro-workspace-card:disabled{opacity:.55}.pro-workspace-icon{display:grid;place-items:center;width:38px;height:38px;border-radius:10px;background:#eaf1ff;color:#315fae;font-size:20px;font-weight:800;line-height:1;white-space:nowrap}
    .pro-workspace-card[data-workspace="code"] .pro-workspace-icon{font:800 14px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:-1px}
    .pro-workspace-card strong,.pro-workspace-card small{display:block}.pro-workspace-card strong{font-size:12px}.pro-workspace-card small{margin-top:5px;color:#718096;font-size:9px;line-height:1.4}.pro-open-arrow{font-size:24px;color:#8a9ab1}
    .pro-shortcuts{margin-top:13px;border:1px solid #dce3ed;border-radius:9px;background:#f8fafc;padding:9px}.pro-shortcuts summary{cursor:pointer;color:#52627a;font-size:10px;font-weight:700}
    #proShortcutList{display:grid;gap:6px;margin-top:9px}.pro-shortcut-row{display:grid;grid-template-columns:minmax(70px,auto) 1fr;align-items:center;gap:9px;font-size:9px;color:#657287}.pro-shortcut-row kbd{justify-self:start;padding:4px 6px;border:1px solid #cbd5e1;border-bottom-width:2px;border-radius:5px;background:white;color:#334155;font-family:inherit}

    .data-lab-polished{width:min(820px,calc(100vw - 20px))!important}
    .data-lab-polished .utility-body{display:grid;gap:11px;background:linear-gradient(180deg,#f7f9fc 0,#f3f6fa 100%)}
    .data-lab-hero{display:grid;grid-template-columns:44px minmax(0,1fr);align-items:center;gap:11px;padding:13px 14px;border:1px solid #d6e1f3;border-radius:13px;background:linear-gradient(135deg,#ffffff 0%,#edf4ff 100%);box-shadow:0 7px 22px rgba(48,76,125,.08);color:#283a57}
    .data-lab-hero-icon{display:grid;place-items:center;width:44px;height:44px;border-radius:12px;background:#dce9ff;color:#2e61b7;font-size:24px;font-weight:800;box-shadow:inset 0 0 0 1px rgba(73,112,181,.12)}
    .data-lab-hero strong,.data-lab-hero small{display:block}.data-lab-hero strong{font-size:12px}.data-lab-hero small{margin-top:4px;color:#6a7890;font-size:9px;line-height:1.45}
    #figureloomDataWorkspacePlus{gap:9px!important;margin:0!important;padding:12px;border:1px solid #d9e1ec;border-radius:13px;background:#fff;box-shadow:0 6px 20px rgba(46,59,83,.06)}
    .data-sheet-heading{display:flex;align-items:center;justify-content:space-between;gap:10px;padding-bottom:2px}.data-sheet-heading strong,.data-sheet-heading small{display:block}.data-sheet-heading strong{color:#2d3b51;font-size:12px}.data-sheet-heading small{margin-top:3px;color:#7a8799;font-size:9px}.data-sheet-badge{flex:0 0 auto;padding:5px 8px;border:1px solid #c8d9f4;border-radius:999px;background:#edf4ff;color:#3965ac;font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.05em}
    .data-sheet-toolbar{padding:7px;border:1px solid #e0e6ef;border-radius:10px;background:#f7f9fc}.data-sheet-toolbar button,.data-sheet-edit button{display:inline-flex!important;align-items:center;justify-content:center;gap:5px;min-height:34px!important;border-color:#d2dae6!important;border-radius:8px!important;background:#fff!important;padding:6px 10px!important;color:#40516a!important;font-weight:700;box-shadow:0 1px 2px rgba(45,57,78,.04)}
    .data-sheet-toolbar button:hover,.data-sheet-edit button:hover{border-color:#7f9fda!important;background:#f0f5ff!important;transform:translateY(-1px)}
    .data-sheet-toolbar button::before,.data-sheet-edit button::before{display:inline-grid;place-items:center;min-width:15px;height:15px;color:#4771b8;font-size:12px;font-weight:900;line-height:1}
    [data-data-action="import"]::before{content:"↥"}[data-data-action="paste"]::before{content:"⎘"}[data-data-action="export"]::before{content:"↓"}[data-data-action="add-row"]::before,[data-data-action="add-column"]::before{content:"+"}[data-data-action="delete-row"]::before,[data-data-action="delete-column"]::before{content:"−"}[data-data-action="transpose"]::before{content:"⇄"}[data-data-action="clear"]::before{content:"×"}
    .data-sheet-wrap{max-height:310px!important;border-color:#d5dde9!important;border-radius:11px!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 3px 10px rgba(42,56,80,.05)}
    .data-sheet-grid th{background:#eef3fa!important;color:#53637a}.data-sheet-grid .data-sheet-marker{background:#e8eef7!important}.data-sheet-grid input{font-size:10px!important}.data-sheet-grid input:focus{background:#f5f8ff!important}
    .data-sheet-status{display:flex;align-items:center;min-height:25px;padding:4px 8px;border-radius:7px;background:#f4f7fb;color:#718096!important;font-weight:650}
    .data-sheet-edit{padding-bottom:3px}.data-sheet-edit .danger{margin-left:auto!important;border-color:#efcaca!important;background:#fff7f7!important;color:#a43a3a!important}.data-sheet-edit .danger::before{color:#b44444}
    .data-primary-controls,.data-plus-settings{padding:11px!important;border:1px solid #dce3ed!important;border-radius:11px!important;background:#fff!important;box-shadow:0 3px 12px rgba(46,59,83,.045)}
    .data-primary-controls{margin:0!important}.data-primary-controls::before{content:"Visual setup";grid-column:1/-1;margin-bottom:1px;color:#465872;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.05em}
    .data-plus-settings{border-top:1px solid #dce3ed!important}.data-plus-settings h3{margin-bottom:9px!important;color:#465872!important}
    .data-control-grid label,.data-table-style-grid label{font-weight:650}.data-control-grid select,.data-control-grid input,.data-table-style-grid input,.data-table-style-grid select{border-color:#d2dae6!important;border-radius:8px!important;background:#fbfcfe!important;box-shadow:inset 0 1px 2px rgba(40,55,78,.03)}
    .data-control-grid select:focus,.data-control-grid input:focus,.data-table-style-grid input:focus,.data-table-style-grid select:focus{outline:2px solid rgba(83,126,207,.2);border-color:#7296d7!important}
    .data-check-grid{gap:7px!important}.data-check-grid label,.data-inline-check{min-height:32px;padding:6px 8px;border:1px solid #e0e6ef;border-radius:8px;background:#f8fafc;color:#5d6c82!important;font-weight:650}
    .data-preview-card{margin:0!important;padding:10px 12px!important;border:1px solid #d7e3f5;border-radius:10px!important;background:linear-gradient(135deg,#eef5ff,#f8fbff)!important;color:#49627f!important;font-weight:700;box-shadow:0 3px 10px rgba(57,84,126,.05)}
    .data-final-actions{gap:9px!important}.data-final-actions button{min-height:43px!important;border-radius:10px!important;font-weight:800;box-shadow:0 3px 10px rgba(41,58,88,.06)}.data-final-actions button.primary{background:linear-gradient(135deg,#2e69d3,#245bc0)!important;border-color:#245bc0!important;box-shadow:0 6px 16px rgba(37,99,235,.22)!important}.data-final-actions button.primary:hover{filter:brightness(1.04)}
    .data-raw-source{padding:9px!important;border:1px solid #e0e6ef!important;border-radius:9px!important;background:#f8fafc}.data-raw-source summary{font-size:9px!important}.data-lab-note{margin:0!important;padding:10px 11px;border-left:3px solid #8aa7d8;border-radius:0 8px 8px 0;background:#f5f8fc;color:#66758a!important;line-height:1.45}

    html[data-figureloom-theme="dark"] .data-lab-polished .utility-body{background:linear-gradient(180deg,#292e35,#262b31)}
    html[data-figureloom-theme="dark"] .data-lab-hero{border-color:#47566d;background:linear-gradient(135deg,#343a43,#303945);color:#eef1f4;box-shadow:none}html[data-figureloom-theme="dark"] .data-lab-hero-icon{background:#394d6d;color:#b9d0ff}html[data-figureloom-theme="dark"] .data-lab-hero small{color:#aab4c3}
    html[data-figureloom-theme="dark"] #figureloomDataWorkspacePlus,html[data-figureloom-theme="dark"] .data-primary-controls,html[data-figureloom-theme="dark"] .data-plus-settings{border-color:#454d58!important;background:#30353d!important;box-shadow:none}html[data-figureloom-theme="dark"] .data-sheet-heading strong{color:#eef1f4}html[data-figureloom-theme="dark"] .data-sheet-heading small{color:#aab2bd}html[data-figureloom-theme="dark"] .data-sheet-badge{border-color:#4e6385;background:#35445b;color:#c6d9ff}
    html[data-figureloom-theme="dark"] .data-sheet-toolbar,html[data-figureloom-theme="dark"] .data-check-grid label,html[data-figureloom-theme="dark"] .data-inline-check,html[data-figureloom-theme="dark"] .data-raw-source,html[data-figureloom-theme="dark"] .data-sheet-status,html[data-figureloom-theme="dark"] .data-lab-note{border-color:#48515d!important;background:#343a43!important;color:#b9c2cf!important}html[data-figureloom-theme="dark"] .data-sheet-toolbar button,html[data-figureloom-theme="dark"] .data-sheet-edit button{border-color:#505a67!important;background:#383f49!important;color:#e8edf3!important}html[data-figureloom-theme="dark"] .data-preview-card{border-color:#465873;background:linear-gradient(135deg,#323d4d,#303844)!important;color:#c2cee0!important}
    html[data-figureloom-theme="dark"] .data-control-grid select,html[data-figureloom-theme="dark"] .data-control-grid input,html[data-figureloom-theme="dark"] .data-table-style-grid input,html[data-figureloom-theme="dark"] .data-table-style-grid select{border-color:#505864!important;background:#343a43!important;color:#eef1f4!important}

    @media(min-width:1100px){.pro-workspace-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
    @media(max-width:620px){.pro-workspace-grid{grid-template-columns:1fr}.pro-workspace-card{min-height:82px}.data-lab-hero{grid-template-columns:38px minmax(0,1fr);padding:11px}.data-lab-hero-icon{width:38px;height:38px}.data-primary-controls{grid-template-columns:1fr!important}.data-sheet-heading{align-items:flex-start}.data-sheet-badge{margin-top:1px}.data-sheet-edit .danger{margin-left:0!important}.data-final-actions{grid-template-columns:1fr!important}}
  `;
  document.head.appendChild(style);
  renderWorkspaces();
  renderShortcuts();
})();
