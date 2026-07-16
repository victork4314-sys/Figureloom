(() => {
  function openOfficeBridge() {
    if (window.SciCanvasOffice?.open) {
      window.SciCanvasOffice.open();
      return;
    }
    const drawer = document.getElementById('officeBridgeDrawer');
    if (drawer) {
      drawer.classList.add('open');
      return;
    }
    setTimeout(() => {
      if (window.SciCanvasOffice?.open) window.SciCanvasOffice.open();
      else document.getElementById('officeBridgeDrawer')?.classList.add('open');
    }, 120);
  }

  function setup() {
    document.getElementById('importButton')?.remove();
    document.getElementById('simpleImportMenu')?.remove();
    document.getElementById('officeBridgeButton')?.remove();

    if (!window.SciCanvasPro) {
      setTimeout(setup, 80);
      return;
    }

    window.SciCanvasPro.register('office', openOfficeBridge, { title: 'Office bridge' });

    document.querySelectorAll('#exportMenu [data-office-export],#exportMenu [data-export="editable-pptx"],#exportMenu [data-export="office-options"]').forEach(node => {
      node.style.display = '';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(setup, 0), { once: true });
  } else {
    setTimeout(setup, 0);
  }
})();