(() => {
  const DEFAULT_SIZE = { format:'screen', orientation:'landscape', widthMm:304.8, heightMm:190.5 };

  function movePageSizeIntoDesign() {
    const panel = document.querySelector('.page-format-panel');
    const designBody = document.querySelector('#designDrawer .utility-body');
    if (!panel || !designBody || panel.parentElement === designBody) return;
    const heading = panel.querySelector('h3');
    if (heading) heading.textContent = 'Canvas and poster size';
    designBody.prepend(panel);
  }

  movePageSizeIntoDesign();

  const baseSnapshot = snapshot;
  snapshot = function snapshotWithWorkspaceState() {
    const data = JSON.parse(baseSnapshot());
    data.projectSize = { ...DEFAULT_SIZE, ...(state.projectSize || {}) };
    data.viewZoom = state.zoom || 1;
    return JSON.stringify(data);
  };

  const baseProjectData = projectData;
  projectData = function projectDataWithWorkspaceState() {
    return {
      ...baseProjectData(),
      projectSize:{ ...DEFAULT_SIZE, ...(state.projectSize || {}) },
      viewZoom:state.zoom || 1
    };
  };

  const baseRestore = restore;
  restore = function restoreWithWorkspaceState(serialized) {
    const data = typeof serialized === 'string' ? JSON.parse(serialized) : serialized;
    if (data?.projectSize) state.projectSize = { ...DEFAULT_SIZE, ...data.projectSize };
    const restoredZoom = Number(data?.viewZoom);
    baseRestore(data);
    requestAnimationFrame(() => {
      movePageSizeIntoDesign();
      window.applyCanvasSize?.({ fit:false });
      if (Number.isFinite(restoredZoom)) setZoom(restoredZoom);
    });
  };

  async function storedWorkspaceState() {
    let local = null;
    try {
      const raw = localStorage.getItem('scicanvas-document');
      if (raw) local = JSON.parse(raw);
    } catch (error) {
      console.warn('Could not read the lightweight workspace state', error);
    }

    let vault = null;
    try {
      vault = (await vaultRead('autosave'))?.value || null;
    } catch (error) {
      console.warn('Could not read the vault workspace state', error);
    }

    const sources = [vault, local].filter(Boolean);
    return {
      projectSize:sources.find(source => source.projectSize)?.projectSize || null,
      viewZoom:sources.find(source => Number.isFinite(Number(source.viewZoom)))?.viewZoom ?? null
    };
  }

  async function hydrateWorkspaceAfterStartup() {
    const stored = await storedWorkspaceState();
    if (stored.projectSize) state.projectSize = { ...DEFAULT_SIZE, ...stored.projectSize };
    const restoredZoom = Number(stored.viewZoom);
    movePageSizeIntoDesign();
    window.applyCanvasSize?.({ fit:false });
    if (Number.isFinite(restoredZoom)) setZoom(restoredZoom);
  }

  if (document.readyState === 'complete') {
    setTimeout(() => void hydrateWorkspaceAfterStartup(), 0);
  } else {
    window.addEventListener('load', () => setTimeout(() => void hydrateWorkspaceAfterStartup(), 0), { once:true });
  }

  const style = document.createElement('style');
  style.textContent = `
    #designDrawer .page-format-panel{margin-top:0;padding-top:0}
    #designDrawer .page-format-panel + *{margin-top:0}
  `;
  document.head.appendChild(style);
})();