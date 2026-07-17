(() => {
  function addInsertButton() {
    const grid = document.getElementById('insertFileGrid') || document.getElementById('insertScienceGrid');
    if (!grid || document.getElementById('insertMapStudio')) return false;

    const button = document.createElement('button');
    button.id = 'insertMapStudio';
    button.type = 'button';
    button.className = 'insert-action';
    button.innerHTML = '<strong>Interactive maps</strong><small>Search, drag, pinch, satellite, terrain, and explicit markers</small>';
    button.addEventListener('click', () => {
      document.getElementById('insertDrawer')?.classList.remove('open');
      window.openMapStudio?.();
    });
    grid.appendChild(button);
    return true;
  }

  if (!addInsertButton()) {
    new MutationObserver((_, observer) => {
      if (addInsertButton()) observer.disconnect();
    }).observe(document.body, { childList: true, subtree: true });
  }
})();
