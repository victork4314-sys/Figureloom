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
    ['arrange', 'Arrange & group', 'Multi-select, groups, alignment, distribution, guides and anchored connectors.', '⌘'],
    ['data', 'Data & charts', 'Paste CSV/TSV data into editable tables, charts and heatmaps.', '▥'],
    ['annotate', 'Scientific annotation', 'Callouts, brackets, scale bars, panel labels, equations and symbols.', '✦'],
    ['components', 'Components & objects', 'Reusable components, image crop/masks, flipping and shape combinations.', '◇'],
    ['review', 'Review & references', 'Comments, sources, version comparison, accessibility and visual checks.', '✓'],
    ['publish', 'Publish & present', 'Journal presets, print checks, presentation mode and export readiness.', '▣'],
    ['office', 'Office bridge', 'Import PowerPoint, Excel, ODS, CSV and TSV; export editable or compatibility PowerPoint.', '▦']
  ];

  function renderWorkspaces() {
    grid.replaceChildren();
    defaults.forEach(([id, title, description, icon]) => {
      const entry = registry.get(id);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'pro-workspace-card';
      button.dataset.workspace = id;
      button.innerHTML = `<span class="pro-workspace-icon">${icon}</span><span><strong>${title}</strong><small>${description}</small></span><span class="pro-open-arrow">›</span>`;
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

  const style = document.createElement('style');
  style.textContent = `
    #proToolsButton{border-color:#9bb1d4;background:#eef4ff;color:#244f9c;font-weight:700}
    #proToolsButton:hover{background:#e2ecff}.pro-tools-drawer{width:min(760px,calc(100vw - 20px))!important}
    .pro-intro{margin:0 0 12px;color:#657287;font-size:11px;line-height:1.5}
    .pro-workspace-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
    .pro-workspace-card{min-width:0;display:grid;grid-template-columns:38px minmax(0,1fr) 18px;align-items:center;gap:10px;min-height:92px;padding:12px;border:1px solid #d5deea;border-radius:11px;background:#fff;text-align:left;color:#29364b}
    .pro-workspace-card:not(:disabled):hover{border-color:#7899da;background:#f5f8ff;box-shadow:0 5px 16px rgba(43,60,90,.08)}
    .pro-workspace-card:disabled{opacity:.55}.pro-workspace-icon{display:grid;place-items:center;width:38px;height:38px;border-radius:10px;background:#eaf1ff;color:#315fae;font-size:20px;font-weight:800}
    .pro-workspace-card strong,.pro-workspace-card small{display:block}.pro-workspace-card strong{font-size:12px}.pro-workspace-card small{margin-top:5px;color:#718096;font-size:9px;line-height:1.4}.pro-open-arrow{font-size:24px;color:#8a9ab1}
    .pro-shortcuts{margin-top:13px;border:1px solid #dce3ed;border-radius:9px;background:#f8fafc;padding:9px}.pro-shortcuts summary{cursor:pointer;color:#52627a;font-size:10px;font-weight:700}
    #proShortcutList{display:grid;gap:6px;margin-top:9px}.pro-shortcut-row{display:grid;grid-template-columns:minmax(70px,auto) 1fr;align-items:center;gap:9px;font-size:9px;color:#657287}.pro-shortcut-row kbd{justify-self:start;padding:4px 6px;border:1px solid #cbd5e1;border-bottom-width:2px;border-radius:5px;background:white;color:#334155;font-family:inherit}
    @media(max-width:620px){.pro-workspace-grid{grid-template-columns:1fr}.pro-workspace-card{min-height:82px}}
  `;
  document.head.appendChild(style);
  renderWorkspaces();
  renderShortcuts();
})();
