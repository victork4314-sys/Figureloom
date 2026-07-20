(() => {
  if (window.__figureLoomRecoveryLayoutFixesV1) return;
  window.__figureLoomRecoveryLayoutFixesV1 = true;

  const RECOVERY_REQUEST_KEY = 'figureloom-password-recovery-requested-v1';
  let recoveryPending = false;
  let authSubscription = null;

  function recoveryRequestedRecently() {
    const requested = Number(localStorage.getItem(RECOVERY_REQUEST_KEY)) || 0;
    return requested > 0 && Date.now() - requested < 24 * 60 * 60 * 1000;
  }

  function recoveryLinkInLocation() {
    const query = new URLSearchParams(location.search);
    const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
    if (query.get('type') === 'recovery' || hash.get('type') === 'recovery') return true;
    if (hash.has('access_token') && hash.has('refresh_token')) return true;
    return query.has('code') && recoveryRequestedRecently();
  }

  function setRecoveryShell(active) {
    recoveryPending = Boolean(active);
    document.documentElement.classList.toggle('figureloom-password-recovery', recoveryPending);
    window.__figureLoomPasswordRecoveryPending = recoveryPending;
    if (recoveryPending) document.getElementById('scWelcome')?.classList.remove('open');
    window.dispatchEvent(new CustomEvent('figureloom-password-recovery-state', { detail:{ active:recoveryPending } }));
  }

  function clearRecoveryLocation() {
    localStorage.removeItem(RECOVERY_REQUEST_KEY);
    setRecoveryShell(false);
    if (location.search || location.hash) history.replaceState({}, document.title, location.pathname);
  }

  function recoveryNodes() {
    const drawer = document.getElementById('cloudGalleryDrawer');
    return {
      drawer,
      panel:drawer?.querySelector('.cloud-account-panel'),
      signedOut:drawer?.querySelector('#cloudSignedOut'),
      signedIn:drawer?.querySelector('#cloudSignedIn'),
      recovery:drawer?.querySelector('#cloudPasswordRecovery'),
      message:drawer?.querySelector('#cloudAccountMessage'),
      profile:drawer?.querySelector('#scAccountProfileCard')
    };
  }

  function openRecoveryWindow(session = null) {
    const nodes = recoveryNodes();
    if (!nodes.drawer || !nodes.panel || !nodes.recovery) return false;
    setRecoveryShell(true);
    document.getElementById('scWelcome')?.classList.remove('open');
    nodes.panel.hidden = false;
    if (nodes.profile) nodes.profile.hidden = true;
    if (nodes.signedOut) nodes.signedOut.hidden = true;
    if (nodes.signedIn) nodes.signedIn.hidden = true;
    nodes.recovery.hidden = false;
    nodes.drawer.classList.add('open');
    if (nodes.message) {
      nodes.message.textContent = session?.user
        ? 'Recovery link accepted. Choose a new password.'
        : 'Opening the password reset link…';
      nodes.message.dataset.kind = session?.user ? 'success' : '';
    }
    setTimeout(() => nodes.recovery.querySelector('#cloudNewPassword')?.focus({ preventScroll:true }), 60);
    return true;
  }

  function showRecoveryFailure(text) {
    const nodes = recoveryNodes();
    if (!nodes.drawer || !nodes.panel) return;
    nodes.panel.hidden = false;
    if (nodes.signedOut) nodes.signedOut.hidden = false;
    if (nodes.signedIn) nodes.signedIn.hidden = true;
    if (nodes.recovery) nodes.recovery.hidden = true;
    nodes.drawer.classList.add('open');
    if (nodes.message) {
      nodes.message.textContent = text;
      nodes.message.dataset.kind = 'error';
    }
  }

  async function waitForCloud(timeout = 12000) {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      if (window.SciCanvasCloud?.getClient && document.getElementById('cloudGalleryDrawer')) return window.SciCanvasCloud;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return null;
  }

  async function bindRecoveryFlow() {
    const cloud = await waitForCloud();
    if (!cloud) return;
    try {
      const client = await cloud.getClient();
      const listener = client.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          localStorage.setItem(RECOVERY_REQUEST_KEY, String(Date.now()));
          openRecoveryWindow(session);
          return;
        }
        if (event === 'USER_UPDATED' && recoveryPending) setTimeout(clearRecoveryLocation, 0);
      });
      authSubscription = listener.data.subscription;

      if (!recoveryPending) return;
      for (let attempt = 0; attempt < 48; attempt += 1) {
        const { data, error } = await client.auth.getSession();
        if (error) throw error;
        if (data.session?.user) {
          openRecoveryWindow(data.session);
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 250));
      }
      showRecoveryFailure('This password reset link could not be accepted. Request a new recovery email and open the newest link.');
    } catch (error) {
      if (recoveryPending) showRecoveryFailure(error.message || 'The password reset link could not be opened.');
    }
  }

  const style = document.createElement('style');
  style.id = 'figureloomRecoveryLayoutFixesStyle';
  style.textContent = `
    html.figureloom-password-recovery #scWelcome{display:none!important}
    html.figureloom-password-recovery body #cloudGalleryDrawer .cloud-account-panel{display:grid!important}
    html.figureloom-password-recovery body #cloudGalleryDrawer #scAccountProfileCard{display:none!important}
    .welcome-avatar-chooser{min-width:0;max-width:100%;overflow:hidden}
    .welcome-avatar-chooser>div{align-items:flex-start!important;flex-wrap:wrap}
    .welcome-avatar-options{display:grid!important;grid-template-columns:repeat(7,minmax(0,1fr))!important;width:100%!important;min-width:0!important;max-width:100%!important;overflow:hidden!important}
    .welcome-avatar-options button{width:100%!important;min-width:0!important;max-width:100%!important}
    @media(max-width:620px){.welcome-avatar-options{grid-template-columns:repeat(4,minmax(0,1fr))!important}}
  `;
  document.head.appendChild(style);

  document.addEventListener('click', event => {
    if (event.target.closest?.('#cloudForgotPassword')) localStorage.setItem(RECOVERY_REQUEST_KEY, String(Date.now()));
    if (event.target.closest?.('#cloudCancelRecovery')) clearRecoveryLocation();
  }, true);

  const observer = new MutationObserver(() => {
    if (recoveryPending) document.getElementById('scWelcome')?.classList.remove('open');
  });
  observer.observe(document.documentElement, { childList:true, subtree:true, attributes:true, attributeFilter:['class'] });

  setRecoveryShell(recoveryLinkInLocation());
  bindRecoveryFlow();
  window.addEventListener('beforeunload', () => authSubscription?.unsubscribe?.());
})();