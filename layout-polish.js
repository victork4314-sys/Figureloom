(() => {
  const NAVIGATOR_POSITION_KEY = 'scicanvas-navigator-last-position-v2';

  function syncVisibleControls() {
    const size = state.projectSize || {};
    const format = document.getElementById('projectFormat');
    const orientation = document.getElementById('projectOrientation');
    const width = document.getElementById('customWidthMm');
    const height = document.getElementById('customHeightMm');
    const grid = document.getElementById('gridSpacing');
    if (format && [...format.options].some(option => option.value === size.format)) format.value = size.format;
    if (orientation) orientation.value = size.orientation === 'portrait' ? 'portrait' : 'landscape';
    if (width && Number.isFinite(Number(size.widthMm))) width.value = Math.round(Number(size.widthMm));
    if (height && Number.isFinite(Number(size.heightMm))) height.value = Math.round(Number(size.heightMm));
    if (grid) grid.value = state.settings?.gridSpacingMode || 'auto';
    window.applyAdaptiveGrid?.();
  }

  const baseRestore = restore;
  restore = function restoreAndSyncLayoutControls(serialized) {
    baseRestore(serialized);
    requestAnimationFrame(syncVisibleControls);
  };
  window.addEventListener('load', () => setTimeout(syncVisibleControls, 180), { once:true });

  function setupNavigatorMemory() {
    const navigator = document.getElementById('canvasNavigator');
    const canvasArea = document.querySelector('.canvas-area');
    const toggle = document.getElementById('navigatorToggleButton');
    const close = navigator?.querySelector('.navigator-actions button:last-child');
    const head = navigator?.querySelector('.navigator-head');
    if (!navigator || !canvasArea || !toggle || !head) return;

    function rememberPosition() {
      if (navigator.classList.contains('navigator-hidden')) return;
      const area = canvasArea.getBoundingClientRect();
      const rect = navigator.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      localStorage.setItem(NAVIGATOR_POSITION_KEY, JSON.stringify({ x:rect.left - area.left, y:rect.top - area.top }));
    }

    function restorePosition() {
      if (navigator.classList.contains('navigator-hidden')) return;
      try {
        const saved = JSON.parse(localStorage.getItem(NAVIGATOR_POSITION_KEY) || 'null');
        if (!saved) return;
        const maxX = Math.max(8, canvasArea.clientWidth - navigator.offsetWidth - 8);
        const maxY = Math.max(8, canvasArea.clientHeight - navigator.offsetHeight - 8);
        navigator.style.left = `${Math.max(8, Math.min(maxX, Number(saved.x) || 8))}px`;
        navigator.style.top = `${Math.max(8, Math.min(maxY, Number(saved.y) || 8))}px`;
        navigator.style.right = 'auto';
        navigator.style.bottom = 'auto';
      } catch {}
    }

    close?.addEventListener('click', rememberPosition, true);
    head.addEventListener('pointerup', rememberPosition);
    toggle.addEventListener('click', () => setTimeout(restorePosition, 0));
    window.addEventListener('resize', restorePosition);
    setTimeout(() => {
      rememberPosition();
      restorePosition();
    }, 220);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupNavigatorMemory, { once:true });
  else setupNavigatorMemory();
})();