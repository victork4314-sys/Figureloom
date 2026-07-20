(() => {
  if (window.__figureLoomCriticalFlowFixesV1) return;
  window.__figureLoomCriticalFlowFixesV1 = true;

  const RECOVERY_REQUEST_KEY = 'figureloom-password-recovery-requested-v1';
  const PPTXGEN_CDN = 'https://cdn.jsdelivr.net/gh/gitbrent/pptxgenjs/dist/pptxgen.bundle.js';
  let recoveryPending = false;
  let authSubscription = null;
  let exporting = false;

  function cloneValue(value) {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

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
    nodes.profile && (nodes.profile.hidden = true);
    nodes.signedOut && (nodes.signedOut.hidden = true);
    nodes.signedIn && (nodes.signedIn.hidden = true);
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
    nodes.signedOut && (nodes.signedOut.hidden = false);
    nodes.signedIn && (nodes.signedIn.hidden = true);
    nodes.recovery && (nodes.recovery.hidden = true);
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
        if (event === 'USER_UPDATED' && recoveryPending) {
          setTimeout(clearRecoveryLocation, 0);
        }
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

  function loadPptxGenJs() {
    if (window.PptxGenJS) return Promise.resolve(window.PptxGenJS);
    if (loadPptxGenJs.promise) return loadPptxGenJs.promise;
    loadPptxGenJs.promise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = PPTXGEN_CDN;
      script.async = true;
      script.onload = () => window.PptxGenJS
        ? resolve(window.PptxGenJS)
        : reject(new Error('PowerPoint library loaded without its browser export.'));
      script.onerror = () => reject(new Error('Could not load the PowerPoint export library. Check the connection and try again.'));
      document.head.appendChild(script);
    });
    return loadPptxGenJs.promise;
  }

  function capturePages() {
    if (typeof syncPage === 'function') syncPage();
    const pages = Array.isArray(state.pages) && state.pages.length
      ? state.pages
      : [{ id:'page-1', name:documentName.value || 'Figure 1', objects:state.objects || [] }];
    return cloneValue(pages);
  }

  function waitForPaint() {
    return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }

  function exportFileName() {
    if (typeof safeFileName === 'function') return safeFileName('pptx');
    const base = String(documentName?.value || 'FigureLoom').trim().replace(/[^a-z0-9_-]+/gi, '-') || 'FigureLoom';
    return `${base}.pptx`;
  }

  async function exportEveryPage(options = {}) {
    if (exporting) return;
    exporting = true;

    const pages = capturePages();
    const originalPages = state.pages;
    const originalPage = state.activePage;
    const originalObjects = state.objects;
    const originalSelected = state.selectedId;
    const originalSelectedIds = Array.isArray(state.selectedIds) ? [...state.selectedIds] : null;
    const progress = document.getElementById('figureloomExportAllPagesPptx') || document.querySelector('[data-figureloom-pptx-fixed]');
    const originalHtml = progress?.innerHTML;

    try {
      if (!pages.length) throw new Error('This project does not contain any pages.');
      if (typeof window.renderCurrentPagePngData !== 'function') throw new Error('The page renderer has not finished loading. Reload FigureLoom and try again.');
      if (progress) {
        progress.disabled = true;
        progress.innerHTML = '<strong>Preparing complete PowerPoint…</strong><small>Please keep this window open</small>';
      }

      const Pptx = await loadPptxGenJs();
      const pptx = new Pptx();
      const size = window.currentCanvasSize?.() || { widthMm:304.8, heightMm:190.5 };
      const slideWidth = (Number(size.widthMm) || 304.8) / 25.4;
      const slideHeight = (Number(size.heightMm) || 190.5) / 25.4;
      pptx.defineLayout({ name:'FIGURELOOM_COMPLETE', width:slideWidth, height:slideHeight });
      pptx.layout = 'FIGURELOOM_COMPLETE';
      pptx.author = 'FigureLoom';
      pptx.company = 'FigureLoom';
      pptx.title = documentName.value.trim() || 'FigureLoom figure';
      pptx.subject = 'Scientific illustration presentation';
      pptx.lang = 'en-US';

      state.pages = pages;
      for (let index = 0; index < pages.length; index += 1) {
        const page = pages[index];
        state.activePage = index;
        state.objects = Array.isArray(page.objects) ? page.objects : [];
        state.selectedId = null;
        if (Array.isArray(state.selectedIds)) state.selectedIds = [];
        render?.();
        window.applyPageBackground?.();
        await document.fonts?.ready;
        await waitForPaint();

        if (progress) progress.innerHTML = `<strong>Rendering slide ${index + 1} of ${pages.length}…</strong><small>${page.name || `Page ${index + 1}`}</small>`;
        const png = await window.renderCurrentPagePngData({
          includeGrid:Boolean(options.includeGrid),
          transparent:Boolean(options.transparent),
          scale:Number(options.scale) || 2
        });
        const slide = pptx.addSlide();
        slide.background = { color:'FFFFFF' };
        slide.addImage({ data:png, x:0, y:0, w:slideWidth, h:slideHeight, altText:page.name || `FigureLoom page ${index + 1}` });
        if (page.notes) slide.addNotes?.(String(page.notes));
      }

      if (progress) progress.innerHTML = '<strong>Building .pptx…</strong><small>Finishing every unique slide</small>';
      await pptx.writeFile({ fileName:exportFileName(), compression:true });
    } finally {
      state.pages = originalPages;
      state.activePage = originalPage;
      state.objects = originalObjects;
      state.selectedId = originalSelected;
      if (originalSelectedIds) state.selectedIds = originalSelectedIds;
      render?.();
      renderPages?.();
      window.applyPageBackground?.();
      if (progress) {
        progress.disabled = false;
        progress.innerHTML = originalHtml;
      }
      exporting = false;
    }
  }

  function installExporter() {
    if (typeof window.renderCurrentPagePngData !== 'function') {
      setTimeout(installExporter, 100);
      return;
    }
    window.FigureLoomExportPowerPointAllPages = options => exportEveryPage(options);
    window.FigureLoomSafeJpegPowerPoint = exportEveryPage;

    document.querySelectorAll('button[data-export="pptx"]').forEach(button => {
      if (button.dataset.figureloomPptxFixed === '1') return;
      const replacement = button.cloneNode(true);
      replacement.removeAttribute('data-export');
      replacement.dataset.figureloomPptxFixed = '1';
      replacement.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        document.getElementById('exportMenu')?.classList.remove('open');
        exportEveryPage({
          includeGrid:Boolean(document.getElementById('exportGrid')?.checked),
          transparent:Boolean(document.getElementById('pptxTransparent')?.checked),
          scale:2
        }).catch(error => alert(`PowerPoint export failed: ${error.message}`));
      });
      button.replaceWith(replacement);
    });
  }

  const style = document.createElement('style');
  style.id = 'figureloomCriticalFlowFixesStyle';
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
    if (event.target.closest?.('#cloudForgotPassword')) {
      localStorage.setItem(RECOVERY_REQUEST_KEY, String(Date.now()));
    }
    if (event.target.closest?.('#cloudCancelRecovery')) {
      clearRecoveryLocation();
    }
  }, true);

  const observer = new MutationObserver(() => {
    if (recoveryPending) document.getElementById('scWelcome')?.classList.remove('open');
    installExporter();
  });
  observer.observe(document.documentElement, { childList:true, subtree:true, attributes:true, attributeFilter:['class'] });

  setRecoveryShell(recoveryLinkInLocation());
  bindRecoveryFlow();
  installExporter();

  window.addEventListener('beforeunload', () => authSubscription?.unsubscribe?.());
})();