(() => {
  if (window.__figureLoomDataWorkspaceInsertFixV1) return;
  window.__figureLoomDataWorkspaceInsertFixV1 = true;

  const palettes = {
    scientific:['#4f7fe5','#37a37d','#e6904e','#a36ad8','#d9576f','#45a3bd'],
    colorblind:['#0072B2','#E69F00','#009E73','#CC79A7','#D55E00','#56B4E9','#F0E442'],
    cool:['#3056d3','#0ea5a8','#6d5bd0','#3b82c4','#22a06b','#64748b'],
    warm:['#c84f3d','#e58a2b','#b76bb2','#d45b7a','#9c6b30','#d1a319'],
    mono:['#1f2937','#475569','#64748b','#94a3b8','#cbd5e1','#e2e8f0']
  };

  function install() {
    const button = document.querySelector('#dataLabDrawer #insertDataVisual');
    const panel = document.getElementById('figureloomDataWorkspacePlus');
    if (!button || !panel || typeof state === 'undefined') {
      setTimeout(install, 80);
      return;
    }

    let beforeCount = 0;
    button.addEventListener('click', () => {
      beforeCount = Array.isArray(state.objects) ? state.objects.length : 0;
    }, true);

    button.addEventListener('click', () => {
      const previousCount = beforeCount;
      setTimeout(() => {
        if (!Array.isArray(state.objects) || state.objects.length <= previousCount) return;
        const item = typeof selectedObject === 'function' ? selectedObject() : null;
        if (!['chart','table'].includes(item?.type)) return;
        const paletteName = panel.querySelector('#dataPalette')?.value || 'scientific';
        Object.assign(item, {
          xAxisTitle:panel.querySelector('#dataXAxis')?.value.trim() || '',
          yAxisTitle:panel.querySelector('#dataYAxis')?.value.trim() || '',
          showLegend:panel.querySelector('#dataShowLegend')?.checked !== false,
          showGridlines:panel.querySelector('#dataShowGridlines')?.checked !== false,
          showDataLabels:panel.querySelector('#dataShowLabels')?.checked === true,
          paletteName,
          palette:[...(palettes[paletteName] || palettes.scientific)],
          headerFill:panel.querySelector('#dataHeaderFill')?.value || '#dce8f8',
          rowFill:panel.querySelector('#dataRowFill')?.value || '#ffffff',
          alternateFill:panel.querySelector('#dataAlternateFill')?.value || '#f7f9fc',
          tableTextColor:panel.querySelector('#dataTableTextColor')?.value || '#334155',
          tableAlignment:panel.querySelector('#dataTableAlignment')?.value || 'left',
          tableFontSize:Math.max(8, Math.min(24, Number(panel.querySelector('#dataTableFontSize')?.value) || 12)),
          tableTitle:panel.querySelector('#dataTableTitle')?.checked !== false
        });
        try { render?.(); } catch {}
        try { renderLayers?.(); } catch {}
        try { scheduleSave?.(); } catch {}
      }, 0);
    });
  }

  install();
})();