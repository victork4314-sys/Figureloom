(() => {
  if (window.__figureLoomExportMenuLoaderV1) return;
  window.__figureLoomExportMenuLoaderV1 = true;
  window.__figureLoomLegacyPptxExporterRetired = true;
  const script = document.createElement('script');
  script.src = 'export-menu-final.js?v=20260720-v1';
  script.async = false;
  document.head.appendChild(script);
})();