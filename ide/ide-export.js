(() => {
  const results = document.getElementById('results');
  const clearResultsButton = document.getElementById('clearResultsButton');
  const programName = document.getElementById('programName');
  if (!results || !clearResultsButton || !programName) return;

  const exportButton = document.createElement('button');
  exportButton.id = 'exportResultsButton';
  exportButton.type = 'button';
  exportButton.textContent = 'Export results';
  exportButton.disabled = true;
  clearResultsButton.parentElement?.insertBefore(exportButton, clearResultsButton);

  function exportableChildren() {
    return Array.from(results.children).filter((child) =>
      child.matches?.('.result-section,.repeat-run-group')
    );
  }

  function updateExportButton() {
    exportButton.disabled = exportableChildren().length === 0;
  }

  function safeFilename(value) {
    const cleaned = String(value || 'figureloom-bio')
      .replace(/\.flbio$/i, '')
      .replace(/[^a-z0-9._-]+/gi, '-')
      .replace(/^-+|-+$/g, '');
    return cleaned || 'figureloom-bio';
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function exportResults() {
    const children = exportableChildren();
    if (!children.length) return;
    const title = programName.value.trim() || 'FigureLoom Bio results';
    const exportedAt = new Date().toLocaleString();
    const theme = document.documentElement.dataset.figureloomTheme === 'dark' ? 'dark' : 'light';
    const sectionHtml = children.map((section) => section.outerHTML).join('\n');

    const report = `<!doctype html>
<html lang="en" data-theme="${theme}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="${theme === 'dark' ? '#181d1c' : '#0c2e28'}">
  <title>${escapeHtml(title)} results</title>
  <style>
    :root{color-scheme:light;--bg:#f4f7f6;--surface:#ffffff;--soft:#edf3f1;--strong:#dce9e5;--text:#172321;--muted:#60706c;--line:#cddbd7;--accent:#2f7468;--accent-strong:#195c51;--accent-soft:#dff1ec;--shadow:0 12px 34px rgba(12,46,40,.12);--danger:#a43e3e;--danger-soft:#fae8e8;--warning:#8a641d;--warning-soft:#fff4d7}
    html[data-theme="dark"]{color-scheme:dark;--bg:#181d1c;--surface:#222927;--soft:#2a3431;--strong:#35413e;--text:#eef7f4;--muted:#aebdb8;--line:#43514d;--accent:#78c4b5;--accent-strong:#a1ddcf;--accent-soft:#253e38;--shadow:0 12px 34px rgba(0,0,0,.34);--danger:#ff9b9b;--danger-soft:#482929;--warning:#f1ca73;--warning-soft:#44391f}
    *{box-sizing:border-box}
    body{margin:0;background:var(--bg);color:var(--text);font:15px/1.55 Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    main{width:min(960px,calc(100% - 32px));margin:36px auto 70px}
    header{position:relative;margin-bottom:24px;padding:22px 24px 22px 76px;border:1px solid var(--line);border-radius:16px;background:var(--surface);box-shadow:var(--shadow)}
    header::before{content:"";position:absolute;left:24px;top:23px;width:34px;height:34px;border-radius:10px;background:var(--accent);box-shadow:inset 0 0 0 9px var(--accent-soft)}
    h1{margin:0 0 6px;color:var(--accent-strong);font-size:30px;letter-spacing:-.025em}
    header p{margin:0;color:var(--muted);font-size:13px}
    .results-list,.repeat-run-results{display:grid;gap:16px}
    .repeat-run-group{display:grid;gap:12px;padding:16px;border:1px solid var(--line);border-radius:16px;background:var(--soft)}
    .repeat-run-group>h3{margin:0;color:var(--accent-strong);font-size:16px}
    .result-section{padding:20px;border:1px solid var(--line);border-left:4px solid var(--accent);border-radius:14px;background:var(--surface);box-shadow:var(--shadow)}
    .repeat-run-group .result-section{box-shadow:none}
    .result-section h3{margin:0 0 13px;color:var(--accent-strong);font-size:15px}
    .result-section p{margin:0;white-space:pre-wrap}
    .result-section p+p{margin-top:9px}
    .big-value{color:var(--accent-strong);font-size:27px;font-weight:800;letter-spacing:-.025em}
    .result-table-wrap{overflow:auto;margin-top:5px;border:1px solid var(--line);border-radius:10px}
    table{width:100%;border-collapse:collapse;font-size:13px}
    th,td{padding:10px 11px;border-bottom:1px solid var(--line);border-right:1px solid var(--line);text-align:left;white-space:nowrap}
    th:last-child,td:last-child{border-right:0}tbody tr:last-child td{border-bottom:0}
    th{background:var(--accent-soft);color:var(--accent-strong)}tbody tr:nth-child(even){background:var(--soft)}
    .result-file{display:grid;gap:4px;padding:11px 12px;border:1px solid var(--line);border-radius:9px;background:var(--accent-soft)}
    .result-file strong{color:var(--accent-strong)}.result-file span{color:var(--muted);font-size:12px}
    .result-section.error{border-color:var(--danger);background:var(--danger-soft)}.result-section.error h3{color:var(--danger)}
    .result-section.warning{border-color:var(--warning);background:var(--warning-soft)}.result-section.warning h3{color:var(--warning)}
    footer{margin-top:22px;color:var(--muted);font-size:12px;text-align:center}
    @media print{html{color-scheme:light}:root,html[data-theme="dark"]{--bg:#fff;--surface:#fff;--soft:#f5f7f6;--text:#172321;--muted:#60706c;--line:#cddbd7;--accent:#2f7468;--accent-strong:#195c51;--accent-soft:#dff1ec;--shadow:none}body{background:#fff}main{width:100%;margin:0}.result-section,.repeat-run-group,header{break-inside:avoid;box-shadow:none}}
  </style>
</head>
<body>
  <main>
    <header><h1>${escapeHtml(title)} results</h1><p>Exported from FigureLoom Bio on ${escapeHtml(exportedAt)}.</p></header>
    <div class="results-list">${sectionHtml}</div>
    <footer>FigureLoom Bio</footer>
  </main>
</body>
</html>`;

    const blob = new Blob([report], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeFilename(title)}-results.html`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    const original = exportButton.textContent;
    exportButton.textContent = 'Exported';
    setTimeout(() => { exportButton.textContent = original; }, 1200);
  }

  exportButton.addEventListener('click', exportResults);
  new MutationObserver(updateExportButton).observe(results, { childList: true, subtree: true });
  updateExportButton();
})();
