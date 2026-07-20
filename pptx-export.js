(() => {
  if (window.__figureLoomExportMenuLoaderV3) return;
  window.__figureLoomExportMenuLoaderV3 = true;
  window.__figureLoomLegacyPptxExporterRetired = true;
  const script = document.createElement('script');
  script.src = 'export-menu-final.js?v=20260720-v3';
  script.async = false;
  document.head.appendChild(script);
})();