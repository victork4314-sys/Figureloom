(() => {
  if (window.__figureLoomCollaborationStatusFixV2) return;
  window.__figureLoomCollaborationStatusFixV2 = true;

  let timer = 0;
  let lastInteractionAt = 0;

  function nodes() {
    const drawer = document.getElementById('collaborationDrawer');
    return {
      drawer,
      banner:drawer?.querySelector('#collabRemoteBanner'),
      apply:drawer?.querySelector('#collabApplyRemote'),
      dismiss:drawer?.querySelector('#collabDismissRemote'),
      toggle:drawer?.querySelector('#collabSessionToggle')
    };
  }

  function busy() {
    return Boolean(
      window.state?.drag || window.state?.resize || window.state?.multiDrag || window.state?.multiResize ||
      Date.now() - lastInteractionAt < 1100
    );
  }

  function clearTimer() {
    clearTimeout(timer);
    timer = 0;
  }

  function dismissStale() {
    const { banner, dismiss } = nodes();
    if (!banner || banner.hidden) return;
    dismiss?.click();
    if (!banner.hidden) banner.hidden = true;
  }

  function schedule() {
    clearTimer();
    const { banner } = nodes();
    if (!banner || banner.hidden) return;
    const copy = 'A collaborator update is waiting. It will apply when you finish editing.';
    const label = banner.querySelector('span');
    if (label && label.textContent !== copy) label.textContent = copy;
    timer = setTimeout(() => {
      const { banner:current, apply, dismiss, toggle } = nodes();
      if (!current || current.hidden) return;
      if (busy()) return schedule();
      const sessionIsLive = toggle && /stop review session/i.test(toggle.textContent || '');
      if (!sessionIsLive) {
        dismiss?.click();
        if (!current.hidden) current.hidden = true;
        return;
      }
      apply?.click();
      setTimeout(() => {
        const latest = nodes().banner;
        if (latest && !latest.hidden && !busy()) dismissStale();
      }, 2200);
    }, 1400);
  }

  function install() {
    const { banner } = nodes();
    if (!banner || banner.dataset.figureloomStatusFixed === '2') return false;
    banner.dataset.figureloomStatusFixed = '2';
    const observer = new MutationObserver(schedule);
    observer.observe(banner, { attributes:true, attributeFilter:['hidden'] });
    if (!banner.hidden) schedule();
    return true;
  }

  ['pointerdown','keydown','input','change'].forEach(type => {
    document.addEventListener(type, event => {
      if (!event.target.closest?.('.app-shell,.utility-drawer,.figureloom-settings-page')) return;
      lastInteractionAt = Date.now();
      if (!nodes().banner?.hidden) schedule();
    }, true);
  });

  ['scicanvas-cloud-opened','scicanvas-share-link-accepted'].forEach(type => {
    addEventListener(type, () => {
      clearTimer();
      dismissStale();
    });
  });

  const style = document.createElement('style');
  style.id = 'figureloomCollaborationHiddenFixStyle';
  style.textContent = '#collaborationDrawer #collabRemoteBanner[hidden]{display:none!important}';
  document.head.appendChild(style);

  const bodyObserver = new MutationObserver(() => install());
  bodyObserver.observe(document.body, { childList:true, subtree:true });
  install();
  setTimeout(install, 1200);
})();