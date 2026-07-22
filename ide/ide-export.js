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

  function resultSections() {
    return Array.from(results.querySelectorAll('.result-section'));
  }

  function updateExportButton() {
    exportButton.disabled = resultSections().length === 0;
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
    const sections = resultSections();
    if (!sections.length) return;

    const title = programName.value.trim() || 'FigureLoom Bio results';
    const exportedAt = new Date().toLocaleString();
    const sectionHtml = sections.map((section) => section.outerHTML).join('\n');

    const report = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} results</title>
  <style>
    :root{color-scheme:light;--bg:#f4f7f6;--surface:#fff;--soft:#edf3f1;--text:#172321;--muted:#60706c;--line:#cddbd7;--accent:#2f7468;--shadow:0 12px 34px rgba(12,46,40,.10)}
    *{box-sizing:border-box}
    body{margin:0;background:var(--bg);color:var(--text);font:15px/1.55 Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    main{width:min(920px,calc(100% - 32px));margin:36px auto 70px}
    header{margin-bottom:24px;padding-bottom:18px;border-bottom:1px solid var(--line)}
    h1{margin:0 0 6px;font-size:30px;letter-spacing:-.025em}
    header p{margin:0;color:var(--muted);font-size:13px}
    .results-list{display:grid;gap:16px}
    .result-section{padding:20px;border:1px solid var(--line);border-radius:14px;background:var(--surface);box-shadow:var(--shadow)}
    .result-section h3{margin:0 0 13px;font-size:15px}
    .result-section p{margin:0;white-space:pre-wrap}
    .result-section p+p{margin-top:9px}
    .big-value{font-size:27px;font-weight:800;letter-spacing:-.025em}
    .result-table-wrap{overflow:auto;margin-top:5px}
    table{width:100%;border-collapse:collapse;font-size:13px}
    th,td{padding:10px 11px;border:1px solid var(--line);text-align:left;white-space:nowrap}
    th{background:var(--soft)}
    .result-file{display:grid;gap:4px;padding:11px 12px;border-radius:9px;background:var(--soft)}
    .result-file span{color:var(--muted);font-size:12px}
    .result-section.error{border-color:#dbaaaa;background:#fae8e8}
    .result-section.warning{border-color:#dcc58a;background:#fff4d7}
    footer{margin-top:22px;color:var(--muted);font-size:12px;text-align:center}
    @media print{body{background:#fff}main{width:100%;margin:0}.result-section{break-inside:avoid;box-shadow:none}}
  </style>
</head>
<body>
  <main>
    <header>
      <h1>${escapeHtml(title)} results</h1>
      <p>Exported from FigureLoom Bio on ${escapeHtml(exportedAt)}.</p>
    </header>
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
    window.setTimeout(() => URL.revokeObjectURL(url), 0);

    const originalLabel = exportButton.textContent;
    exportButton.textContent = 'Exported';
    window.setTimeout(() => { exportButton.textContent = originalLabel; }, 1200);
  }

  exportButton.addEventListener('click', exportResults);
  new MutationObserver(updateExportButton).observe(results, { childList:true, subtree:true });
  updateExportButton();
})();
