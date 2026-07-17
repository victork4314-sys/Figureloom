(() => {
  if (window.__figureLoomInterfaceThemeV2) return;
  window.__figureLoomInterfaceThemeV2 = true;
  window.__figureLoomInterfaceTheme = true;

  const STORAGE_KEY = 'figureloom-interface-theme-v1';
  const root = document.documentElement;
  const actions = document.querySelector('.title-actions');
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (!actions) return;

  document.getElementById('interfaceThemeToggle')?.remove();
  document.getElementById('figureloomDarkModeStyles')?.remove();

  const button = document.createElement('button');
  button.id = 'interfaceThemeToggle';
  button.type = 'button';
  button.className = 'interface-theme-toggle';
  actions.insertBefore(button, document.getElementById('exportButton'));

  function savedTheme() {
    try { return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light'; }
    catch { return 'light'; }
  }

  function apply(theme, save = true) {
    const dark = theme === 'dark';
    root.dataset.figureloomTheme = dark ? 'dark' : 'light';

    // Keep native rendering in light mode. Safari can otherwise recolor inherited
    // text, controls and currentColor-based SVG content inside the project.
    root.style.colorScheme = 'light';

    button.textContent = dark ? '☀' : '☾';
    button.title = dark ? 'Use light interface' : 'Use dark interface';
    button.setAttribute('aria-label', button.title);
    button.setAttribute('aria-pressed', dark ? 'true' : 'false');
    themeMeta?.setAttribute('content', dark ? '#24282f' : '#f7f9fc');

    if (save) {
      try { localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light'); } catch {}
    }
  }

  button.addEventListener('click', () => apply(root.dataset.figureloomTheme === 'dark' ? 'light' : 'dark'));

  const style = document.createElement('style');
  style.id = 'figureloomDarkModeStyles';
  style.textContent = `
    .interface-theme-toggle{display:grid;place-items:center;width:34px;min-width:34px;height:32px;padding:0!important;font-size:15px!important}

    html[data-figureloom-theme="dark"],html[data-figureloom-theme="dark"] body{background:#24282f!important}
    html[data-figureloom-theme="dark"] .titlebar{background:#282d34!important;border-color:#3b414b!important}
    html[data-figureloom-theme="dark"] .brand strong,html[data-figureloom-theme="dark"] .document-title input{color:#f0f2f5!important}
    html[data-figureloom-theme="dark"] .brand span,html[data-figureloom-theme="dark"] .document-title span{color:#a7afb9!important}
    html[data-figureloom-theme="dark"] .document-title input:focus{background:#333942!important;border-color:#626d7b!important}

    html[data-figureloom-theme="dark"] .ribbon-tabs{background:#23272d!important;border-color:#3b414b!important}
    html[data-figureloom-theme="dark"] .ribbon-tab,html[data-figureloom-theme="dark"] .ribbon-command-tab{color:#bbc1c9!important;background:transparent!important}
    html[data-figureloom-theme="dark"] .ribbon-tab.active{color:#ffffff!important;border-bottom-color:#8ca9e8!important}
    html[data-figureloom-theme="dark"] .ribbon{background:#2b3037!important;border-color:#3d434d!important;box-shadow:0 2px 8px rgba(0,0,0,.16)!important}
    html[data-figureloom-theme="dark"] .tool-group{border-color:#414751!important}
    html[data-figureloom-theme="dark"] .tool-group-label,html[data-figureloom-theme="dark"] .empty-state{color:#9aa3ae!important}

    html[data-figureloom-theme="dark"] .workspace{background:#30353d!important}
    html[data-figureloom-theme="dark"] .left-panel,html[data-figureloom-theme="dark"] .right-panel{background:#292e35!important;border-color:#3e454f!important;color:#e7e9ed!important}
    html[data-figureloom-theme="dark"] .panel-heading h2,html[data-figureloom-theme="dark"] .inspector-section h2{color:#b9c0c9!important}
    html[data-figureloom-theme="dark"] .page-thumbnail,html[data-figureloom-theme="dark"] .layer-item,html[data-figureloom-theme="dark"] .inspector-tab{background:#333941!important;color:#eceef1!important;border-color:#484f5a!important}
    html[data-figureloom-theme="dark"] .page-thumbnail>span:last-child,html[data-figureloom-theme="dark"] .page-number{color:#c5cad1!important}
    html[data-figureloom-theme="dark"] .page-thumbnail.active,html[data-figureloom-theme="dark"] .layer-item.active{background:#3a4558!important;border-color:#7f9bd3!important;box-shadow:none!important}
    html[data-figureloom-theme="dark"] .mini-page{background:#fff!important;border-color:#69717d!important;color-scheme:light!important}
    html[data-figureloom-theme="dark"] .inspector-tabs,html[data-figureloom-theme="dark"] .inspector-section{border-color:#404751!important}
    html[data-figureloom-theme="dark"] .inspector-tab{border-left:0!important;border-right:0!important;border-top:0!important}
    html[data-figureloom-theme="dark"] .inspector-tab.active{color:#ffffff!important;border-bottom-color:#8ca9e8!important}
    html[data-figureloom-theme="dark"] .field-grid label,html[data-figureloom-theme="dark"] .full-field,html[data-figureloom-theme="dark"] #selectionName{color:#c0c6ce!important}

    html[data-figureloom-theme="dark"] .canvas-area,html[data-figureloom-theme="dark"] .canvas-stage{background:#343941!important}
    html[data-figureloom-theme="dark"] .canvas-toolbar{background:#292e35!important;border-color:#4b535e!important;box-shadow:0 7px 18px rgba(0,0,0,.24)!important;color:#edf0f4!important}
    html[data-figureloom-theme="dark"] #canvas{color-scheme:light!important;isolation:isolate;background:#fff;box-shadow:0 16px 38px rgba(0,0,0,.34),0 0 0 1px #5a626d!important}
    html[data-figureloom-theme="dark"] #canvas *,html[data-figureloom-theme="dark"] .mini-page *{color-scheme:light!important}

    html[data-figureloom-theme="dark"] .statusbar{background:#252a31!important;color:#aeb6c0!important;border-color:#3d434d!important}

    html[data-figureloom-theme="dark"] .title-actions button,
    html[data-figureloom-theme="dark"] .ribbon button,
    html[data-figureloom-theme="dark"] .panel-heading button,
    html[data-figureloom-theme="dark"] .canvas-toolbar button,
    html[data-figureloom-theme="dark"] .left-panel button,
    html[data-figureloom-theme="dark"] .right-panel button,
    html[data-figureloom-theme="dark"] .utility-drawer button,
    html[data-figureloom-theme="dark"] .drawer button,
    html[data-figureloom-theme="dark"] dialog button,
    html[data-figureloom-theme="dark"] .modal button{color:#e8ebef!important;border-color:#4c535e!important;background:#353b44!important}
    html[data-figureloom-theme="dark"] .title-actions button:hover,
    html[data-figureloom-theme="dark"] .ribbon button:hover,
    html[data-figureloom-theme="dark"] .panel-heading button:hover,
    html[data-figureloom-theme="dark"] .canvas-toolbar button:hover,
    html[data-figureloom-theme="dark"] .utility-drawer button:hover,
    html[data-figureloom-theme="dark"] .drawer button:hover{background:#404751!important}
    html[data-figureloom-theme="dark"] #exportButton{background:#5c72bf!important;border-color:#5c72bf!important;color:#fff!important}

    html[data-figureloom-theme="dark"] .right-panel input,
    html[data-figureloom-theme="dark"] .right-panel select,
    html[data-figureloom-theme="dark"] .right-panel textarea,
    html[data-figureloom-theme="dark"] .left-panel input,
    html[data-figureloom-theme="dark"] .left-panel select,
    html[data-figureloom-theme="dark"] .utility-drawer input,
    html[data-figureloom-theme="dark"] .utility-drawer select,
    html[data-figureloom-theme="dark"] .utility-drawer textarea,
    html[data-figureloom-theme="dark"] .drawer input,
    html[data-figureloom-theme="dark"] .drawer select,
    html[data-figureloom-theme="dark"] .drawer textarea,
    html[data-figureloom-theme="dark"] dialog input,
    html[data-figureloom-theme="dark"] dialog select,
    html[data-figureloom-theme="dark"] dialog textarea{color:#edf0f4!important;border-color:#4d5561!important;background:#343a43!important}
    html[data-figureloom-theme="dark"] input::placeholder,html[data-figureloom-theme="dark"] textarea::placeholder{color:#929ba7!important}
    html[data-figureloom-theme="dark"] input[type="color"]{background:#343a43!important}

    html[data-figureloom-theme="dark"] .utility-drawer,html[data-figureloom-theme="dark"] .drawer,html[data-figureloom-theme="dark"] dialog,html[data-figureloom-theme="dark"] .modal,html[data-figureloom-theme="dark"] .utility-body{background:#292e35!important;color:#e9ecf0!important;border-color:#414852!important}
    html[data-figureloom-theme="dark"] .utility-head,html[data-figureloom-theme="dark"] .drawer-header,html[data-figureloom-theme="dark"] .modal-header{background:#30353d!important;color:#f2f4f7!important;border-color:#454c57!important}
    html[data-figureloom-theme="dark"] .utility-head span,html[data-figureloom-theme="dark"] .tool-note,html[data-figureloom-theme="dark"] .collab-note,html[data-figureloom-theme="dark"] .collab-details{color:#a5aeba!important}

    html[data-figureloom-theme="dark"] .figureloom-chat-shell{background:#272c33!important}
    html[data-figureloom-theme="dark"] .figureloom-chat-topbar,html[data-figureloom-theme="dark"] .figureloom-chat-composer{background:#30353d!important;border-color:#454c57!important}
    html[data-figureloom-theme="dark"] .figureloom-chat-bubble{background:#353b44!important;border-color:#4b535e!important;color:#eef0f3!important}
    html[data-figureloom-theme="dark"] .figureloom-chat-message.user .figureloom-chat-bubble{background:#596fba!important;color:#fff!important}
    html[data-figureloom-theme="dark"] .figureloom-chat-details{background:#2f343c!important;border-color:#484f5a!important}
    html[data-figureloom-theme="dark"] .loomy-progress{background:#333942!important;border-color:#49515c!important}
    html[data-figureloom-theme="dark"] .loomy-progress-copy strong{color:#eef1f5!important}

    html[data-figureloom-theme="dark"] .collab-session-card{background:#333941!important;border-color:#4a525d!important}
    html[data-figureloom-theme="dark"] .collab-person,html[data-figureloom-theme="dark"] .collab-comment{background:#353b44!important;border-color:#4b535e!important;color:#eceff3!important}
    html[data-figureloom-theme="dark"] .collab-comment p{color:#cdd2d9!important}
    html[data-figureloom-theme="dark"] .collab-comments>p{border-color:#505864!important;color:#aab2bd!important}
    html[data-figureloom-theme="dark"] .collab-remote-banner{background:#443a28!important;border-color:#766343!important;color:#f0d7a7!important}

    html[data-figureloom-theme="dark"] ::-webkit-scrollbar{width:10px;height:10px}
    html[data-figureloom-theme="dark"] ::-webkit-scrollbar-track{background:#252a31}
    html[data-figureloom-theme="dark"] ::-webkit-scrollbar-thumb{background:#555d68;border:2px solid #252a31;border-radius:999px}
  `;
  document.head.appendChild(style);
  apply(savedTheme(), false);
})();