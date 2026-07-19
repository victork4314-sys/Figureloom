(() => {
  if (window.__figureLoomInspectorConsistencySpecificityV1) return;
  window.__figureLoomInspectorConsistencySpecificityV1 = true;

  const style = document.createElement('style');
  style.id = 'figureloomInspectorConsistencySpecificityStyle';
  style.textContent = `
    html[data-figureloom-theme] body .right-panel[data-figureloom-inspector-consistent="1"] #figureloomRichTextControls{
      margin:12px 0 0!important;
      padding:12px 0 0!important;
      color:var(--figureloom-ui-text,#172321)!important;
      background:transparent!important;
      border:0!important;
      border-top:1px solid var(--figureloom-ui-line,#cddbd7)!important;
      border-radius:0!important;
      box-shadow:none!important;
    }
    html[data-figureloom-theme] body .right-panel[data-figureloom-inspector-consistent="1"] #figureloomRichTextControls h3{
      margin:0 0 9px!important;
      color:var(--figureloom-ui-text,#172321)!important;
      font-family:inherit!important;
      font-size:11px!important;
      font-weight:750!important;
      line-height:1.25!important;
      letter-spacing:.04em!important;
      text-transform:uppercase!important;
    }
    html[data-figureloom-theme] body .right-panel[data-figureloom-inspector-consistent="1"] #openFigureLoomRichText{
      width:100%!important;
      min-height:36px!important;
      margin:0 0 9px!important;
      padding:8px 9px!important;
      color:var(--figureloom-ui-text,#172321)!important;
      background:var(--figureloom-ui-soft,#edf3f1)!important;
      border:1px solid var(--figureloom-ui-line,#cddbd7)!important;
      border-radius:8px!important;
      font-family:inherit!important;
      font-size:12px!important;
      font-weight:650!important;
      line-height:1.25!important;
      box-shadow:none!important;
    }
    html[data-figureloom-theme] body .right-panel[data-figureloom-inspector-consistent="1"] #figureloomRichTextControls .rich-inspector-grid label{
      color:var(--figureloom-ui-muted,#60706c)!important;
      font-family:inherit!important;
      font-size:11px!important;
      font-weight:600!important;
      line-height:1.35!important;
    }
    html[data-figureloom-theme] body .right-panel[data-figureloom-inspector-consistent="1"] #figureloomRichTextControls .rich-inspector-grid :where(input,select){
      min-height:36px!important;
      padding:8px 9px!important;
      color:var(--figureloom-ui-text,#172321)!important;
      background:var(--figureloom-ui-soft,#edf3f1)!important;
      border:1px solid var(--figureloom-ui-line,#cddbd7)!important;
      border-radius:8px!important;
      font-family:inherit!important;
      font-size:12px!important;
      font-weight:650!important;
      line-height:1.25!important;
      box-shadow:none!important;
    }
  `;

  function keepLast() {
    document.getElementById(style.id)?.remove();
    document.head.appendChild(style);
  }

  keepLast();
  addEventListener('figureloom-stable-ready', keepLast);
  setTimeout(keepLast, 1600);
})();
