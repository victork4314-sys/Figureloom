(() => {
  if (window.__figureLoomChemicalsUnderAdd) return;
  window.__figureLoomChemicalsUnderAdd = true;

  function addChemicalShortcut() {
    const grid = document.getElementById('insertScienceGrid');
    if (!grid || typeof window.openPubChemLibrary !== 'function') return false;
    if (document.getElementById('insertChemicalStructures')) return true;

    const button = document.createElement('button');
    button.id = 'insertChemicalStructures';
    button.type = 'button';
    button.className = 'insert-action';
    button.innerHTML = '<strong>Chemical structures</strong><small>Search PubChem by name, synonym, or CID</small>';
    button.addEventListener('click', () => {
      window.openPubChemLibrary();
      document.getElementById('insertDrawer')?.classList.remove('open');
    });
    grid.appendChild(button);
    return true;
  }

  if (!addChemicalShortcut()) {
    const observer = new MutationObserver(() => {
      if (addChemicalShortcut()) observer.disconnect();
    });
    observer.observe(document.body, { childList:true, subtree:true });
    setTimeout(() => observer.disconnect(), 8000);
  }
})();