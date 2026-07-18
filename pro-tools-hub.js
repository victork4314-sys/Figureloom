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

    .data-lab-polished{width:min(760px,calc(100vw - 20px))!important}
    .data-lab-polished .utility-body{display:grid;gap:9px;background:#f7f8fa}
    .data-lab-hero{display:grid;grid-template-columns:32px minmax(0,1fr);align-items:center;gap:9px;padding:2px 2px 10px;border:0;border-bottom:1px solid #dce2ea;border-radius:0;background:transparent;box-shadow:none;color:#2d3b50}
    .data-lab-hero-icon{display:grid;place-items:center;width:32px;height:32px;border-radius:8px;background:#e7eef9;color:#406cae;font-size:18px;font-weight:800;box-shadow:none}
    .data-lab-hero strong,.data-lab-hero small{display:block}.data-lab-hero strong{font-size:12px}.data-lab-hero small{margin-top:2px;color:#748094;font-size:9px;line-height:1.35}
    #figureloomDataWorkspacePlus{gap:7px!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important}
    .data-sheet-heading{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:1px 1px 2px}.data-sheet-heading strong,.data-sheet-heading small{display:block}.data-sheet-heading strong{color:#334155;font-size:11px}.data-sheet-heading small{margin-top:2px;color:#7b8798;font-size:8px}.data-sheet-badge{flex:0 0 auto;padding:3px 6px;border:1px solid #ccd8e8;border-radius:999px;background:#eef3f9;color:#57708f;font-size:7px;font-weight:800;text-transform:uppercase;letter-spacing:.04em}
    .data-sheet-toolbar{padding:0!important;border:0!important;border-radius:0!important;background:transparent!important}.data-sheet-toolbar,.data-sheet-edit{gap:5px!important}
    .data-sheet-toolbar button,.data-sheet-edit button{display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:4px!important;min-height:29px!important;border:1px solid #d5dce6!important;border-radius:7px!important;background:#fff!important;padding:4px 8px!important;color:#526176!important;font-size:8px!important;font-weight:700!important;box-shadow:none!important;transform:none!important}
    .data-sheet-toolbar button:hover,.data-sheet-edit button:hover{border-color:#91a7c8!important;background:#f3f6fa!important;transform:none!important}
    .data-sheet-toolbar button::before,.data-sheet-edit button::before{display:inline-grid;place-items:center;min-width:12px;height:12px;color:#587aab;font-size:10px;font-weight:900;line-height:1}
    [data-data-action="import"]::before{content:"↥"}[data-data-action="paste"]::before{content:"⎘"}[data-data-action="export"]::before{content:"↓"}[data-data-action="add-row"]::before,[data-data-action="add-column"]::before{content:"+"}[data-data-action="delete-row"]::before,[data-data-action="delete-column"]::before{content:"−"}[data-data-action="transpose"]::before{content:"⇄"}[data-data-action="clear"]::before{content:"×"}
    .data-sheet-wrap{max-height:260px!important;border:1px solid #d5dde7!important;border-radius:8px!important;background:#fff!important;box-shadow:none!important}
    .data-sheet-grid th{background:#f0f3f7!important;color:#566579}.data-sheet-grid .data-sheet-marker{background:#e9edf3!important}.data-sheet-grid input{font-size:9px!important}.data-sheet-grid input:focus{background:#f4f7fb!important}
    .data-sheet-status{display:block!important;min-height:0!important;padding:1px 2px!important;border:0!important;border-radius:0!important;background:transparent!important;color:#7a8697!important;font-size:8px!important;font-weight:600!important}
    .data-sheet-edit{padding:0!important}.data-sheet-edit .danger{margin-left:auto!important;border-color:#e4c8c8!important;background:transparent!important;color:#a54a4a!important}.data-sheet-edit .danger::before{color:#a54a4a}
    .data-primary-controls,.data-plus-settings{padding:9px 0 0!important;border:0!important;border-top:1px solid #dde3eb!important;border-radius:0!important;background:transparent!important;box-shadow:none!important}
    .data-primary-controls{margin:0!important}.data-primary-controls::before{content:"Visual setup";grid-column:1/-1;margin-bottom:0;color:#536176;font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.055em}
    .data-plus-settings h3{margin:0 0 7px!important;color:#536176!important;font-size:8px!important}
    .data-plus-settings .data-control-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:7px!important;margin-top:0!important}
    .data-control-grid label,.data-table-style-grid label{font-weight:650}.data-control-grid select,.data-control-grid input,.data-table-style-grid input,.data-table-style-grid select{min-height:34px!important;border:1px solid #d3dae4!important;border-radius:7px!important;background:#fff!important;padding:6px 8px!important;box-shadow:none!important}
    .data-control-grid select:focus,.data-control-grid input:focus,.data-table-style-grid input:focus,.data-table-style-grid select:focus{outline:2px solid rgba(83,126,207,.16);border-color:#829dc6!important}
    .data-check-grid{grid-column:1/-1!important;display:flex!important;align-items:center!important;justify-content:flex-start!important;flex-wrap:wrap!important;gap:8px 18px!important;padding-top:1px!important}
    .data-check-grid>label,.data-inline-check{display:inline-flex!important;flex-direction:row!important;align-items:center!important;justify-content:flex-start!important;gap:6px!important;min-height:0!important;width:auto!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;color:#657287!important;font-size:9px!important;font-weight:650!important;white-space:nowrap!important}
    .data-check-grid input[type="checkbox"],.data-inline-check input[type="checkbox"]{appearance:auto!important;width:16px!important;height:16px!important;min-width:16px!important;min-height:16px!important;margin:0!important;padding:0!important;flex:0 0 16px!important;accent-color:#537dc4!important}
    .data-preview-card{margin:0!important;padding:7px 9px!important;border:1px solid #dbe2eb!important;border-radius:7px!important;background:#f1f4f7!important;color:#647287!important;font-size:9px!important;font-weight:650!important;box-shadow:none!important}
    .data-final-actions{gap:7px!important}.data-final-actions button{min-height:38px!important;border-radius:8px!important;font-weight:750!important;box-shadow:none!important}.data-final-actions button.primary{background:#315f9f!important;border-color:#315f9f!important;color:#fff!important;box-shadow:none!important}.data-final-actions button.primary:hover{background:#2b568f!important;filter:none!important}
    .data-raw-source{padding:7px 0 0!important;border:0!important;border-top:1px solid #e0e5ec!important;border-radius:0!important;background:transparent!important}.data-raw-source summary{font-size:8px!important}.data-lab-note{margin:0!important;padding:7px 8px!important;border:0!important;border-left:2px solid #9aaec9!important;border-radius:0 6px 6px 0!important;background:#f1f3f6!important;color:#707c8d!important;font-size:8px!important;line-height:1.4!important}

    html[data-figureloom-theme="dark"] .data-lab-polished .utility-body{background:#2b2f35}
    html[data-figureloom-theme="dark"] .data-lab-hero{border-color:#454b54;background:transparent;color:#eef1f4}html[data-figureloom-theme="dark"] .data-lab-hero-icon{background:#3a424e;color:#b7c9e6}html[data-figureloom-theme="dark"] .data-lab-hero small{color:#a8b0bc}
    html[data-figureloom-theme="dark"] #figureloomDataWorkspacePlus,html[data-figureloom-theme="dark"] .data-primary-controls,html[data-figureloom-theme="dark"] .data-plus-settings{border-color:#454b54!important;background:transparent!important;box-shadow:none!important}html[data-figureloom-theme="dark"] .data-sheet-heading strong{color:#eef1f4}html[data-figureloom-theme="dark"] .data-sheet-heading small{color:#a8b0bc}html[data-figureloom-theme="dark"] .data-sheet-badge{border-color:#505a68;background:#363d46;color:#b9c5d5}
    html[data-figureloom-theme="dark"] .data-sheet-toolbar{background:transparent!important}html[data-figureloom-theme="dark"] .data-sheet-toolbar button,html[data-figureloom-theme="dark"] .data-sheet-edit button{border-color:#4d5561!important;background:#353a42!important;color:#dce2e9!important}html[data-figureloom-theme="dark"] .data-sheet-toolbar button:hover,html[data-figureloom-theme="dark"] .data-sheet-edit button:hover{border-color:#677487!important;background:#3a414b!important}
    html[data-figureloom-theme="dark"] .data-sheet-wrap{border-color:#515965!important;background:#30343a!important}html[data-figureloom-theme="dark"] .data-sheet-grid th{background:#343941!important;color:#c0c8d3}html[data-figureloom-theme="dark"] .data-sheet-grid .data-sheet-marker{background:#373d45!important}html[data-figureloom-theme="dark"] .data-sheet-status{background:transparent!important;color:#aab2bd!important}
    html[data-figureloom-theme="dark"] .data-control-grid select,html[data-figureloom-theme="dark"] .data-control-grid input,html[data-figureloom-theme="dark"] .data-table-style-grid input,html[data-figureloom-theme="dark"] .data-table-style-grid select{border-color:#505864!important;background:#343941!important;color:#eef1f4!important}html[data-figureloom-theme="dark"] .data-check-grid>label,html[data-figureloom-theme="dark"] .data-inline-check{background:transparent!important;color:#c0c7d0!important}
    html[data-figureloom-theme="dark"] .data-preview-card{border-color:#484f59!important;background:#32373e!important;color:#b8c0cb!important}html[data-figureloom-theme="dark"] .data-raw-source{border-color:#454b54!important;background:transparent!important}html[data-figureloom-theme="dark"] .data-lab-note{border-left-color:#687a93!important;background:#30343a!important;color:#aeb6c2!important}

    @media(min-width:1100px){.pro-workspace-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
    @media(max-width:620px){.pro-workspace-grid{grid-template-columns:1fr}.pro-workspace-card{min-height:82px}.data-lab-polished{width:min(100vw - 12px,760px)!important}.data-lab-hero{grid-template-columns:30px minmax(0,1fr);padding-bottom:8px}.data-lab-hero-icon{width:30px;height:30px}.data-primary-controls,.data-plus-settings .data-control-grid{grid-template-columns:1fr!important}.data-sheet-heading{align-items:flex-start}.data-sheet-badge{margin-top:1px}.data-sheet-edit .danger{margin-left:0!important}.data-final-actions{grid-template-columns:1fr!important}.data-check-grid{gap:8px 13px!important}}
  `;
  document.head.appendChild(style);
  renderWorkspaces();
  renderShortcuts();
})();
