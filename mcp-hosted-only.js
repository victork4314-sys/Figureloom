(() => {
  if (window.__figureLoomHostedMcpOnlyV1) return;
  window.__figureLoomHostedMcpOnlyV1 = true;

  function disableLegacy() {
    try { window.FigureLoomMCP?.revoke?.(); } catch {}
    try { localStorage.removeItem('figureloom-mcp-access-v1'); } catch {}
  }

  disableLegacy();
  setTimeout(disableLegacy,250);
  setTimeout(disableLegacy,1000);
})();