(() => {
  if (window.__figureLoomMcpSettingsPanelV1) return;
  window.__figureLoomMcpSettingsPanelV1 = true;

  let installed = false;

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
  }

  function statusLabel(value) {
    if (value === 'connected') return 'Connected';
    if (value === 'connecting') return 'Connecting…';
    if (value === 'disabled') return 'Disabled';
    if (value === 'disconnected') return 'Disconnected';
    if (value === 'pairing-token-required') return 'Pairing token required';
    if (String(value).startsWith('error:')) return String(value).slice(6);
    return value || 'Not connected';
  }

  function installStyles() {
    if (document.getElementById('figureloomMcpSettingsStyles')) return;
    const style = document.createElement('style');
    style.id = 'figureloomMcpSettingsStyles';
    style.textContent = `
      .mcp-settings-stack{display:grid;gap:14px}.mcp-settings-card{display:grid;gap:10px;padding:14px;border:1px solid #d8e0ea;border-radius:11px;background:#fff}.mcp-settings-card h3{margin:0;color:#334155;font-size:13px}.mcp-settings-card p{margin:0;color:#6b7789;font-size:10px;line-height:1.5}.mcp-settings-field{display:grid;gap:5px;color:#536176;font-size:10px;font-weight:700}.mcp-settings-field input,.mcp-settings-field select{width:100%;box-sizing:border-box;min-height:38px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;padding:7px 9px;color:#26364d;font:inherit}.mcp-toggle{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:start;gap:9px;padding:9px 0;border-top:1px solid #e6ebf1}.mcp-toggle:first-of-type{border-top:0}.mcp-toggle input{margin-top:2px}.mcp-toggle strong,.mcp-toggle small{display:block}.mcp-toggle strong{color:#334155;font-size:11px}.mcp-toggle small{margin-top:3px;color:#748094;font-size:9px;line-height:1.4}.mcp-actions{display:flex;flex-wrap:wrap;gap:7px}.mcp-actions button{min-height:36px;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc;padding:7px 11px;color:#40516a;font-size:10px;font-weight:700}.mcp-actions button.primary{border-color:#2f7468;background:#2f7468;color:#fff}.mcp-actions button.danger{border-color:#e3bcbc;background:#fff7f7;color:#a23232}.mcp-status{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 10px;border:1px solid #d8e0ea;border-radius:9px;background:#f8fafc}.mcp-status strong{font-size:11px}.mcp-status span{color:#68758a;font-size:9px}.mcp-session-list{display:grid;gap:7px}.mcp-session{padding:9px;border:1px solid #dce3ec;border-radius:8px;background:#fafbfd}.mcp-session strong,.mcp-session small{display:block}.mcp-session strong{font-size:10px}.mcp-session small{margin-top:3px;color:#718096;font-size:8px}.mcp-empty{color:#7a8798;font-size:9px}.mcp-code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.mcp-warning{border-color:#ead5a4;background:#fffaf0!important}.mcp-danger-card{border-color:#eccaca;background:#fffafa!important}
      html[data-figureloom-theme="dark"] .mcp-settings-card{border-color:#48515d;background:#30353d}html[data-figureloom-theme="dark"] .mcp-settings-card h3,html[data-figureloom-theme="dark"] .mcp-toggle strong{color:#edf2f5}html[data-figureloom-theme="dark"] .mcp-settings-card p,html[data-figureloom-theme="dark"] .mcp-toggle small,html[data-figureloom-theme="dark"] .mcp-settings-field{color:#bdc5cf}html[data-figureloom-theme="dark"] .mcp-settings-field input,html[data-figureloom-theme="dark"] .mcp-settings-field select{border-color:#505966;background:#393f48;color:#f2f4f6}html[data-figureloom-theme="dark"] .mcp-status,html[data-figureloom-theme="dark"] .mcp-session{border-color:#4a535f;background:#383e47}
    `;
    document.head.appendChild(style);
  }

  function showMcp(page, navButton, panel) {
    page.querySelectorAll('[data-settings-section]').forEach(item => {
      const active = item === navButton;
      item.classList.toggle('active', active);
      item.setAttribute('aria-selected', String(active));
    });
    page.querySelectorAll('[data-settings-panel]').forEach(item => { item.hidden = item !== panel; });
    sync(panel);
  }

  function sync(panel) {
    if (!panel || !window.FigureLoomMCP) return;
    const state = window.FigureLoomMCP.get();
    panel.querySelector('[data-mcp-enabled]').checked = Boolean(state.enabled);
    panel.querySelector('[data-mcp-url]').value = state.url || '';
    panel.querySelector('[data-mcp-token]').placeholder = state.token ? 'Pairing token saved' : 'Paste the pairing token from the MCP server';
    panel.querySelector('[data-mcp-access]').value = state.access === 'full' ? 'full' : 'read';
    panel.querySelector('[data-mcp-project]').checked = Boolean(state.authorizeCurrentProject);
    panel.querySelector('[data-mcp-destructive]').checked = Boolean(state.allowDestructive);
    panel.querySelector('[data-mcp-destructive]').disabled = state.access !== 'full';
    panel.querySelector('[data-mcp-status]').textContent = statusLabel(state.status);
    panel.querySelector('[data-mcp-project-name]').textContent = state.project?.title || 'Current project';
    panel.querySelector('[data-mcp-project-id]').textContent = state.project?.id || '';
    const list = panel.querySelector('[data-mcp-sessions]');
    list.replaceChildren();
    if (!state.sessions?.length) {
      const empty = document.createElement('div');
      empty.className = 'mcp-empty';
      empty.textContent = state.connected ? 'No MCP clients are connected yet.' : 'Connect the FigureLoom bridge to see active MCP clients.';
      list.appendChild(empty);
    } else {
      state.sessions.forEach(session => {
        const row = document.createElement('div');
        row.className = 'mcp-session';
        row.innerHTML = `<strong>${escapeHtml(session.clientName || session.id || 'MCP client')}</strong><small>${escapeHtml(session.transport || 'MCP')} · ${escapeHtml(session.workspace || 'scratch project')} · ${escapeHtml(session.access || 'read-only')}</small>`;
        list.appendChild(row);
      });
    }
  }

  function install() {
    if (installed) return true;
    const page = document.getElementById('figureloomSettingsPage');
    const nav = page?.querySelector('.settings-navigation');
    const content = page?.querySelector('.settings-content');
    if (!page || !nav || !content || !window.FigureLoomMCP) return false;
    installed = true;
    installStyles();

    const navButton = document.createElement('button');
    navButton.type = 'button';
    navButton.dataset.settingsSection = 'mcp';
    navButton.setAttribute('aria-selected', 'false');
    navButton.innerHTML = '<span aria-hidden="true">⌁</span><span>MCP &amp; AI access</span>';
    nav.appendChild(navButton);

    const panel = document.createElement('section');
    panel.className = 'settings-panel';
    panel.dataset.settingsPanel = 'mcp';
    panel.hidden = true;
    panel.innerHTML = `
      <div class="settings-section-heading"><h2>Model Context Protocol</h2><p>Connect ChatGPT, Claude Desktop, Codex, Gemini Desktop, or another MCP client directly to FigureLoom.</p></div>
      <div class="mcp-settings-stack">
        <section class="mcp-settings-card">
          <h3>Connection</h3>
          <p>The MCP server runs separately. FigureLoom connects to it through an authenticated bridge, so the server can use the actual editor state and command history.</p>
          <label class="mcp-toggle"><input type="checkbox" data-mcp-enabled><span><strong>Enable MCP bridge</strong><small>Nothing can connect until this is enabled and a pairing token is supplied.</small></span></label>
          <label class="mcp-settings-field">Bridge address<input class="mcp-code" type="url" data-mcp-url spellcheck="false"></label>
          <label class="mcp-settings-field">Pairing token<input class="mcp-code" type="password" data-mcp-token autocomplete="off" spellcheck="false"></label>
          <div class="mcp-actions"><button type="button" class="primary" data-mcp-connect>Save and connect</button><button type="button" data-mcp-disconnect>Disconnect</button></div>
          <div class="mcp-status"><strong data-mcp-status>Disabled</strong><span>Bridge status</span></div>
        </section>

        <section class="mcp-settings-card">
          <h3>Access level</h3>
          <label class="mcp-settings-field">Default access<select data-mcp-access><option value="read">Read-only</option><option value="full">Full editor access</option></select></label>
          <label class="mcp-toggle"><input type="checkbox" data-mcp-project><span><strong>Authorize this project</strong><small><span data-mcp-project-name>Current project</span> becomes available to paired clients. New sessions otherwise remain in isolated scratch projects.</small><span class="mcp-code" data-mcp-project-id></span></span></label>
          <label class="mcp-toggle"><input type="checkbox" data-mcp-destructive><span><strong>Allow destructive actions</strong><small>Permit deleting pages, projects, and objects. Kept off by default even with full access.</small></span></label>
        </section>

        <section class="mcp-settings-card">
          <h3>Active sessions</h3>
          <div class="mcp-session-list" data-mcp-sessions></div>
        </section>

        <section class="mcp-settings-card mcp-danger-card">
          <h3>Revoke access</h3>
          <p>Disconnect every client on this device, remove the pairing token, and return all MCP permissions to their defaults.</p>
          <div class="mcp-actions"><button type="button" class="danger" data-mcp-revoke>Revoke all MCP access</button></div>
        </section>
      </div>`;
    content.appendChild(panel);

    navButton.addEventListener('click', event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      showMcp(page, navButton, panel);
    }, true);

    panel.querySelector('[data-mcp-connect]').addEventListener('click', () => {
      const tokenField = panel.querySelector('[data-mcp-token]');
      const current = window.FigureLoomMCP.get();
      window.FigureLoomMCP.set({
        enabled:panel.querySelector('[data-mcp-enabled]').checked,
        url:panel.querySelector('[data-mcp-url]').value.trim(),
        token:tokenField.value.trim() || (current.token ? undefined : ''),
        access:panel.querySelector('[data-mcp-access]').value,
        authorizeCurrentProject:panel.querySelector('[data-mcp-project]').checked,
        allowDestructive:panel.querySelector('[data-mcp-destructive]').checked
      });
      tokenField.value = '';
      sync(panel);
    });
    panel.querySelector('[data-mcp-disconnect]').addEventListener('click', () => { window.FigureLoomMCP.disconnect(); sync(panel); });
    panel.querySelector('[data-mcp-revoke]').addEventListener('click', () => {
      if (!confirm('Revoke all MCP access on this device?')) return;
      window.FigureLoomMCP.revoke();
      panel.querySelector('[data-mcp-token]').value = '';
      sync(panel);
    });
    panel.querySelector('[data-mcp-access]').addEventListener('change', () => {
      if (panel.querySelector('[data-mcp-access]').value !== 'full') panel.querySelector('[data-mcp-destructive]').checked = false;
      sync(panel);
    });
    addEventListener('figureloom-mcp-settings-change', () => sync(panel));
    sync(panel);
    return true;
  }

  function attempt() {
    if (install()) return;
    setTimeout(attempt, 100);
  }

  attempt();
})();