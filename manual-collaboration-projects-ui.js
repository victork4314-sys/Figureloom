(() => {
  if (window.__figureLoomManualCollaborationUi) return;
  window.__figureLoomManualCollaborationUi = true;

  const cloud = window.SciCanvasCloud;
  const drawer = document.getElementById('collaborationDrawer');
  const drawerToggle = drawer?.querySelector('#collabSessionToggle');
  const drawerStatus = drawer?.querySelector('#collabStatus');
  const shareButton = document.getElementById('collaborateRibbonButton');
  const ribbonTabs = document.querySelector('.ribbon-tabs');
  if (!cloud || !drawer || !drawerToggle || !drawerStatus || !shareButton || !ribbonTabs) return;

  const ACTIVE_DRAFT_KEY = 'figureloom-window-active-local-draft-v1';
  const TRANSPORT_BUILD = 'manual-collaboration-20260718-v1';
  const TRANSPORTS = [
    ['collaboration-chat.js', '__figureLoomCollabChat'],
    ['collaboration-live-motion.js', '__figureLoomLiveMotion'],
    ['collaboration-realtime-delivery-fix.js', '__figureLoomRealtimeDeliveryFix']
  ];

  let enabledProjectId = '';
  let busy = false;
  let bypassDrawerToggle = false;
  let transportPromise = null;

  const projectId = () => String(cloud.currentProjectId || localStorage.getItem('scicanvas-current-cloud-project-v1') || '');
  const user = () => cloud.getUser?.() || null;
  const isLocalDraft = () => Boolean(sessionStorage.getItem(ACTIVE_DRAFT_KEY));
  const isEnabled = (id = projectId()) => Boolean(id && enabledProjectId === String(id));

  function setText(node, text) {
    if (node && node.textContent !== text) node.textContent = text;
  }

  function setDisabled(node, value) {
    const next = Boolean(value);
    if (node && node.disabled !== next) node.disabled = next;
  }

  function setMessage(text, kind = '') {
    const message = drawer.querySelector('#collabMessage');
    if (!message) return;
    setText(message, text);
    message.dataset.kind = kind;
  }

  function hideChat() {
    const bubble = document.getElementById('collabChatBubble');
    const panel = document.getElementById('collabChatPanel');
    if (bubble) bubble.hidden = true;
    if (panel) panel.hidden = true;
  }

  function ensureTopButton() {
    let button = document.getElementById('projectDisconnectRibbonButton');
    if (!button) {
      button = document.createElement('button');
      button.id = 'projectDisconnectRibbonButton';
      button.type = 'button';
      button.className = 'ribbon-command-tab';
      shareButton.insertAdjacentElement('afterend', button);
    }
    if (button.dataset.manualCollaborationBound !== '1') {
      button.dataset.manualCollaborationBound = '1';
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        void toggleManual();
      }, true);
    }
    return button;
  }

  function decorateProjects() {
    const host = document.getElementById('projectsRibbonHost');
    if (!host) return;

    host.querySelectorAll('.projects-main-actions button').forEach(button => {
      const label = button.querySelector('span')?.textContent?.trim();
      if (label) button.setAttribute('aria-label', label);
    });

    const windowButton = host.querySelector('[data-project-action="window"]');
    const closeButton = host.querySelector('[data-project-action="close"]');
    if (windowButton) {
      setText(windowButton, 'New window');
      windowButton.title = 'Open this project in another window';
    }
    if (closeButton) {
      setText(closeButton, 'Close');
      closeButton.title = 'Close this project from the open list without deleting it';
    }

    const id = projectId();
    const status = host.querySelector('.projects-current-copy small');
    if (isLocalDraft()) setText(status, 'Local draft · save to cloud when ready');
    else if (!id) setText(status, 'No cloud project open');
    else setText(status, isEnabled(id) ? 'Live collaboration connected' : 'Cloud project open · live collaboration off');

    host.querySelectorAll('.projects-open-chip i[data-live]').forEach(dot => {
      if (dot.dataset.live !== '0') dot.dataset.live = '0';
    });
    if (isEnabled(id) && !isLocalDraft()) {
      const activeDot = host.querySelector('.projects-open-chip.active i[data-live]');
      if (activeDot) activeDot.dataset.live = '1';
    }
  }

  function render() {
    const id = projectId();
    const signedIn = Boolean(user());
    const localDraft = isLocalDraft();
    const connected = isEnabled(id);
    const canConnect = Boolean(id && signedIn && !localDraft);
    const topButton = ensureTopButton();

    topButton.hidden = !Boolean(id && !localDraft);
    setDisabled(topButton, busy || !canConnect);
    topButton.dataset.state = connected ? 'connected' : 'disconnected';
    setText(topButton, connected ? 'Disconnect' : 'Connect');
    topButton.title = connected
      ? 'Save the latest project state and disconnect live collaboration'
      : 'Connect live collaboration for this project';
    topButton.setAttribute('aria-label', topButton.title);

    setText(drawer.querySelector('.utility-head strong'), 'Live collaboration');
    setText(drawer.querySelector('.utility-head span'), 'Connect only when you are ready to edit together, chat, and see live changes');
    const details = drawer.querySelector('.collab-details');
    setText(details?.querySelector('summary'), 'How live editing works');
    setText(details?.querySelector('p'), 'Live editing is manual. Opening or saving a cloud project does not connect anyone. Press Connect to start encrypted collaboration, and Disconnect to save the latest state and leave the live session.');

    setDisabled(drawerToggle, busy || !canConnect);
    setText(drawerToggle, connected ? 'Disconnect' : busy ? 'Working…' : 'Connect');
    drawerToggle.title = connected
      ? 'Save and leave the live collaboration session'
      : canConnect ? 'Start live collaboration for this project' : localDraft ? 'Save this draft to the cloud before collaborating' : 'Open a signed-in cloud project first';

    if (!id) setText(drawerStatus, 'Save or open a cloud project to collaborate.');
    else if (localDraft) setText(drawerStatus, 'Save this local draft to the cloud before starting live collaboration.');
    else if (!signedIn) setText(drawerStatus, 'Join or sign in before starting live collaboration.');
    else if (connected) setText(drawerStatus, 'Live collaboration connected. Changes, chat, and movement sync now.');
    else setText(drawerStatus, 'Project open. Live collaboration is off until you press Connect.');

    decorateProjects();
  }

  function loadScript(path, flag) {
    if (window[flag]) return Promise.resolve();
    const selector = `script[data-figureloom-manual-transport="${path}"]`;
    const existing = document.querySelector(selector);
    if (existing) {
      if (existing.dataset.loaded === '1') return Promise.resolve();
      return new Promise((resolve, reject) => {
        existing.addEventListener('load', resolve, { once:true });
        existing.addEventListener('error', () => reject(new Error(`${path} could not load.`)), { once:true });
      });
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `${path}?v=${encodeURIComponent(TRANSPORT_BUILD)}`;
      script.dataset.figureloomManualTransport = path;
      script.addEventListener('load', () => {
        script.dataset.loaded = '1';
        resolve();
      }, { once:true });
      script.addEventListener('error', () => reject(new Error(`${path} could not load.`)), { once:true });
      document.head.appendChild(script);
    });
  }

  function loadTransports() {
    if (!transportPromise) {
      transportPromise = (async () => {
        for (const [path, flag] of TRANSPORTS) await loadScript(path, flag);
      })();
    }
    return transportPromise;
  }

  function startBaseSession() {
    bypassDrawerToggle = true;
    try {
      setDisabled(drawerToggle, false);
      drawerToggle.click();
    } finally {
      bypassDrawerToggle = false;
    }
  }

  async function connectManual() {
    const id = projectId();
    if (busy || isEnabled(id)) return;
    if (!id) return setMessage('Open a cloud project before connecting.', 'error');
    if (isLocalDraft()) return setMessage('Save this local draft to the cloud before connecting.', 'error');
    if (!user()) return setMessage('Sign in or join the project before connecting.', 'error');

    busy = true;
    enabledProjectId = id;
    render();
    setMessage('Connecting live collaboration…');
    try {
      startBaseSession();
      await loadTransports();
      if (projectId() !== id) throw new Error('The active project changed while collaboration was connecting.');
      window.dispatchEvent(new CustomEvent('figureloom-collaboration-connected', { detail:{ projectId:id } }));
      setMessage('Live collaboration connected. Use Disconnect whenever you are finished.', 'success');
    } catch (error) {
      enabledProjectId = '';
      transportPromise = null;
      hideChat();
      setMessage(`Could not connect live collaboration: ${error.message}`, 'error');
    } finally {
      busy = false;
      render();
    }
  }

  async function disconnectManual() {
    const id = projectId();
    if (busy || !isEnabled(id)) return;
    busy = true;
    render();
    setMessage('Saving the latest project state before disconnecting…');
    try {
      window.syncPage?.();
      window.renderPages?.();
      await new Promise(resolve => setTimeout(resolve, 220));
      await cloud.saveCurrentProject();
      enabledProjectId = '';
      hideChat();
      window.dispatchEvent(new CustomEvent('figureloom-collaboration-disconnected', { detail:{ projectId:id, saved:true } }));
      setMessage('Disconnected. The latest shared state was saved.', 'success');
      const saveStatus = document.getElementById('saveStatus');
      if (saveStatus) saveStatus.textContent = 'Disconnected · latest state saved';
      render();
      setTimeout(() => location.reload(), 180);
    } catch (error) {
      setMessage(`Disconnect stopped because the project could not be saved: ${error.message}`, 'error');
      busy = false;
      render();
    }
  }

  const toggleManual = () => isEnabled(projectId()) ? disconnectManual() : connectManual();

  drawerToggle.addEventListener('click', event => {
    if (bypassDrawerToggle) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void toggleManual();
  }, true);

  window.FigureLoomLiveConnection = {
    projectId,
    isEnabled,
    connect:connectManual,
    disconnect:disconnectManual,
    toggle:toggleManual
  };

  window.addEventListener('scicanvas-cloud-opened', event => {
    const openedId = String(event.detail?.projectId || projectId());
    if (enabledProjectId && openedId !== enabledProjectId) {
      enabledProjectId = '';
      hideChat();
      window.dispatchEvent(new CustomEvent('figureloom-collaboration-disconnected', { detail:{ projectId:openedId, saved:true, reason:'project-switch' } }));
      setTimeout(() => location.reload(), 0);
      return;
    }
    render();
    const saveStatus = document.getElementById('saveStatus');
    if (saveStatus && !isEnabled(openedId)) saveStatus.textContent = 'Cloud project open · live collaboration off';
  });

  window.addEventListener('scicanvas-share-link-accepted', event => {
    enabledProjectId = '';
    hideChat();
    render();
    setTimeout(() => setMessage(`Joined “${event.detail?.title || 'shared project'}”. Press Connect when you are ready to collaborate live.`, 'success'), 40);
  });

  ['scicanvas-cloud-saved','scicanvas-cloud-disconnected','figureloom-project-created'].forEach(type => {
    window.addEventListener(type, () => setTimeout(render, 40));
  });

  const style = document.createElement('style');
  style.id = 'manualCollaborationProjectsStyle';
  style.textContent = `
    .projects-main-actions button,.projects-current-group>button,.projects-open-chip{
      display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:7px!important;
      min-width:0!important;height:auto!important;padding:7px 10px!important;
      border:1px solid #cfd7e3!important;border-radius:7px!important;
      background:#fff!important;color:#253044!important;box-shadow:none!important;
      font:inherit!important;font-size:inherit!important;font-weight:400!important;line-height:normal!important
    }
    .projects-main-actions button strong{display:none!important}
    .projects-main-actions button span,.projects-open-chip span{font:inherit!important;font-size:inherit!important;font-weight:400!important}
    .projects-main-actions button:hover:not(:disabled),.projects-current-group>button:hover:not(:disabled),.projects-open-chip:hover:not(:disabled){background:#f4f7fb!important;border-color:#cfd7e3!important;box-shadow:none!important}
    .projects-open-chip{justify-content:flex-start!important;flex:0 1 180px!important;max-width:180px!important;white-space:nowrap!important}
    .projects-open-chip.active{border-color:#8fa7d2!important;background:#f2f6fc!important;box-shadow:inset 0 -2px 0 rgba(65,105,193,.42)!important}
    .projects-open-chip i{flex:0 0 auto}
    .projects-current-group [data-project-action="disconnect"]{display:none!important}
    .projects-current-group{margin-left:auto!important;max-width:none!important}
    .projects-current-copy{min-width:120px!important;max-width:190px!important}
    #projectDisconnectRibbonButton{margin-left:0!important}
    #projectDisconnectRibbonButton::before{content:'○';margin-right:6px;color:#5f7896}
    #projectDisconnectRibbonButton[data-state="connected"]::before{content:'●';color:#d58a43}
    #projectDisconnectRibbonButton[hidden]{display:none!important}
    html[data-figureloom-theme="dark"] .projects-main-actions button,html[data-figureloom-theme="dark"] .projects-current-group>button,html[data-figureloom-theme="dark"] .projects-open-chip{border-color:#455365!important;background:#293440!important;color:#dce3eb!important}
    html[data-figureloom-theme="dark"] .projects-main-actions button:hover:not(:disabled),html[data-figureloom-theme="dark"] .projects-current-group>button:hover:not(:disabled),html[data-figureloom-theme="dark"] .projects-open-chip:hover:not(:disabled){background:#313d4a!important}
    html[data-figureloom-theme="dark"] .projects-open-chip.active{border-color:#7188bb!important;background:#303c4b!important}
    @media(max-width:900px){.projects-current-copy{display:none!important}.projects-open-chip{flex-basis:135px!important;max-width:135px!important}#projectDisconnectRibbonButton{padding-inline:9px!important}}
  `;
  document.head.appendChild(style);

  // A page load always starts disconnected; manual sessions never resurrect themselves.
  enabledProjectId = '';
  hideChat();
  render();

  const timer = setInterval(render, 500);
  window.addEventListener('beforeunload', () => clearInterval(timer), { once:true });
})();