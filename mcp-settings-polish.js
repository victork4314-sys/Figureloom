(() => {
  if (window.__figureLoomMcpSettingsPolishV1) return;
  window.__figureLoomMcpSettingsPolishV1 = true;

  const style = document.createElement('style');
  style.id = 'figureloomMcpSettingsPolishStyle';
  style.textContent = `
    html[data-figureloom-theme] body [data-settings-panel="mcp"]{
      color:var(--figureloom-ui-text,#172321)!important;
    }
    html[data-figureloom-theme] body [data-settings-panel="mcp"] .settings-section-heading{
      margin-bottom:18px!important;
    }
    html[data-figureloom-theme] body [data-settings-panel="mcp"] .hosted-mcp-stack{
      display:grid!important;
      gap:12px!important;
    }
    html[data-figureloom-theme] body [data-settings-panel="mcp"] .hosted-mcp-card{
      display:grid!important;
      gap:12px!important;
      padding:16px!important;
      border:1px solid var(--figureloom-ui-line,#cddbd7)!important;
      border-radius:12px!important;
      color:var(--figureloom-ui-text,#172321)!important;
      background:var(--figureloom-ui-surface,#fff)!important;
      box-shadow:none!important;
    }
    html[data-figureloom-theme] body [data-settings-panel="mcp"] .hosted-mcp-card:first-child{
      background:linear-gradient(145deg,var(--figureloom-ui-accent-soft,#dff1ec),var(--figureloom-ui-surface,#fff) 64%)!important;
    }
    html[data-figureloom-theme] body [data-settings-panel="mcp"] .hosted-mcp-ready{
      border-color:color-mix(in srgb,var(--figureloom-ui-accent,#2f7468) 55%,var(--figureloom-ui-line,#cddbd7))!important;
    }
    html[data-figureloom-theme] body [data-settings-panel="mcp"] .hosted-mcp-card h3{
      margin:0!important;
      color:var(--figureloom-ui-text,#172321)!important;
      font-size:13px!important;
      font-weight:760!important;
      letter-spacing:-.01em!important;
    }
    html[data-figureloom-theme] body [data-settings-panel="mcp"] .hosted-mcp-card p{
      margin:0!important;
      color:var(--figureloom-ui-muted,#60706c)!important;
      font-size:10px!important;
      line-height:1.5!important;
    }
    html[data-figureloom-theme] body [data-settings-panel="mcp"] .hosted-mcp-project,
    html[data-figureloom-theme] body [data-settings-panel="mcp"] .hosted-mcp-link-note,
    html[data-figureloom-theme] body [data-settings-panel="mcp"] .hosted-mcp-status,
    html[data-figureloom-theme] body [data-settings-panel="mcp"] .hosted-mcp-signin{
      padding:11px 12px!important;
      border:1px solid var(--figureloom-ui-line,#cddbd7)!important;
      border-radius:10px!important;
      background:var(--figureloom-ui-soft,#edf3f1)!important;
      box-shadow:none!important;
    }
    html[data-figureloom-theme] body [data-settings-panel="mcp"] .hosted-mcp-project{
      display:grid!important;
      gap:3px!important;
    }
    html[data-figureloom-theme] body [data-settings-panel="mcp"] .hosted-mcp-project strong,
    html[data-figureloom-theme] body [data-settings-panel="mcp"] .hosted-mcp-link-note strong{
      display:block!important;
      color:var(--figureloom-ui-text,#172321)!important;
      font-size:11px!important;
      font-weight:730!important;
    }
    html[data-figureloom-theme] body [data-settings-panel="mcp"] .hosted-mcp-project small,
    html[data-figureloom-theme] body [data-settings-panel="mcp"] .hosted-mcp-link-note small{
      display:block!important;
      margin-top:3px!important;
      color:var(--figureloom-ui-muted,#60706c)!important;
      font-size:9px!important;
      line-height:1.45!important;
    }
    html[data-figureloom-theme] body [data-settings-panel="mcp"] .hosted-mcp-link-note{
      border-color:color-mix(in srgb,var(--figureloom-ui-accent,#2f7468) 45%,var(--figureloom-ui-line,#cddbd7))!important;
      background:var(--figureloom-ui-accent-soft,#dff1ec)!important;
    }
    html[data-figureloom-theme] body [data-settings-panel="mcp"] .hosted-mcp-field{
      display:grid!important;
      gap:6px!important;
      color:var(--figureloom-ui-text,#172321)!important;
      font-size:10px!important;
      font-weight:700!important;
    }
    html[data-figureloom-theme] body [data-settings-panel="mcp"] .hosted-mcp-field select{
      width:100%!important;
      min-height:40px!important;
      padding:0 11px!important;
      border:1px solid var(--figureloom-ui-line,#cddbd7)!important;
      border-radius:9px!important;
      color:var(--figureloom-ui-text,#172321)!important;
      background:var(--figureloom-ui-soft,#edf3f1)!important;
      font:650 11px/1.2 Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;
      box-shadow:none!important;
      outline:none!important;
    }
    html[data-figureloom-theme] body [data-settings-panel="mcp"] .hosted-mcp-field select:focus-visible{
      border-color:var(--figureloom-ui-accent,#2f7468)!important;
      box-shadow:0 0 0 3px color-mix(in srgb,var(--figureloom-ui-accent,#2f7468) 18%,transparent)!important;
    }
    html[data-figureloom-theme] body [data-settings-panel="mcp"] .hosted-mcp-toggle{
      display:grid!important;
      grid-template-columns:auto minmax(0,1fr)!important;
      align-items:start!important;
      gap:10px!important;
      padding:12px!important;
      border:1px solid var(--figureloom-ui-line,#cddbd7)!important;
      border-radius:10px!important;
      background:var(--figureloom-ui-surface,#fff)!important;
    }
    html[data-figureloom-theme] body [data-settings-panel="mcp"] .hosted-mcp-toggle input{
      width:16px!important;
      height:16px!important;
      margin:1px 0 0!important;
      accent-color:var(--figureloom-ui-accent,#2f7468)!important;
    }
    html[data-figureloom-theme] body [data-settings-panel="mcp"] .hosted-mcp-toggle strong{
      display:block!important;
      color:var(--figureloom-ui-text,#172321)!important;
      font-size:11px!important;
      font-weight:720!important;
    }
    html[data-figureloom-theme] body [data-settings-panel="mcp"] .hosted-mcp-toggle small{
      display:block!important;
      margin-top:3px!important;
      color:var(--figureloom-ui-muted,#60706c)!important;
      font-size:9px!important;
      line-height:1.45!important;
    }
    html[data-figureloom-theme] body [data-settings-panel="mcp"] .hosted-mcp-toggle:has(input:checked){
      border-color:var(--figureloom-ui-accent,#2f7468)!important;
      background:var(--figureloom-ui-accent-soft,#dff1ec)!important;
    }
    html[data-figureloom-theme] body [data-settings-panel="mcp"] :where(.hosted-mcp-primary,.hosted-mcp-actions button){
      min-height:40px!important;
      margin:0!important;
      padding:0 13px!important;
      border:1px solid var(--figureloom-ui-line,#cddbd7)!important;
      border-radius:9px!important;
      color:var(--figureloom-ui-text,#172321)!important;
      background:var(--figureloom-ui-soft,#edf3f1)!important;
      font:700 11px/1 Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;
      letter-spacing:0!important;
      box-shadow:none!important;
      transform:none!important;
    }
    html[data-figureloom-theme] body [data-settings-panel="mcp"] :where(.hosted-mcp-primary,.hosted-mcp-actions button):hover:not(:disabled){
      border-color:var(--figureloom-ui-accent,#2f7468)!important;
      filter:none!important;
      transform:none!important;
    }
    html[data-figureloom-theme] body [data-settings-panel="mcp"] .hosted-mcp-primary,
    html[data-figureloom-theme] body [data-settings-panel="mcp"] .hosted-mcp-actions .copy{
      color:var(--figureloom-ui-accent-ink,#fff)!important;
      background:var(--figureloom-ui-accent,#2f7468)!important;
      border-color:var(--figureloom-ui-accent,#2f7468)!important;
    }
    html[data-figureloom-theme] body [data-settings-panel="mcp"] .hosted-mcp-primary{
      width:100%!important;
      min-height:42px!important;
      font-size:12px!important;
      font-weight:740!important;
    }
    html[data-figureloom-theme] body [data-settings-panel="mcp"] :where(.hosted-mcp-primary,.hosted-mcp-actions button):disabled{
      cursor:not-allowed!important;
      opacity:.52!important;
    }
    html[data-figureloom-theme] body [data-settings-panel="mcp"] .hosted-mcp-actions{
      display:grid!important;
      grid-template-columns:minmax(0,1.25fr) minmax(0,1fr) minmax(0,1fr)!important;
      gap:8px!important;
    }
    html[data-figureloom-theme] body [data-settings-panel="mcp"] .hosted-mcp-actions .danger{
      color:var(--figureloom-ui-danger,#9f3a3a)!important;
      background:color-mix(in srgb,var(--figureloom-ui-danger,#9f3a3a) 9%,var(--figureloom-ui-surface,#fff))!important;
      border-color:color-mix(in srgb,var(--figureloom-ui-danger,#9f3a3a) 40%,var(--figureloom-ui-line,#cddbd7))!important;
    }
    html[data-figureloom-theme] body [data-settings-panel="mcp"] .hosted-mcp-status{
      color:var(--figureloom-ui-muted,#60706c)!important;
      font-size:9px!important;
      line-height:1.5!important;
    }
    html[data-figureloom-theme] body [data-settings-panel="mcp"] .hosted-mcp-status[data-kind="success"]{
      color:var(--figureloom-ui-accent-strong,#195c51)!important;
      border-color:color-mix(in srgb,var(--figureloom-ui-accent,#2f7468) 45%,var(--figureloom-ui-line,#cddbd7))!important;
      background:var(--figureloom-ui-accent-soft,#dff1ec)!important;
    }
    html[data-figureloom-theme] body [data-settings-panel="mcp"] .hosted-mcp-status[data-kind="error"],
    html[data-figureloom-theme] body [data-settings-panel="mcp"] .hosted-mcp-signin{
      color:var(--figureloom-ui-danger,#9f3a3a)!important;
      border-color:color-mix(in srgb,var(--figureloom-ui-danger,#9f3a3a) 40%,var(--figureloom-ui-line,#cddbd7))!important;
      background:color-mix(in srgb,var(--figureloom-ui-danger,#9f3a3a) 8%,var(--figureloom-ui-surface,#fff))!important;
    }
    html[data-figureloom-theme] body [data-settings-panel="mcp"] .hosted-mcp-ready[hidden],
    html[data-figureloom-theme] body [data-settings-panel="mcp"] .hosted-mcp-signin[hidden]{display:none!important}

    @media(max-width:640px){
      html[data-figureloom-theme] body [data-settings-panel="mcp"] .hosted-mcp-card{padding:14px!important}
      html[data-figureloom-theme] body [data-settings-panel="mcp"] .hosted-mcp-actions{grid-template-columns:1fr!important}
      html[data-figureloom-theme] body [data-settings-panel="mcp"] .hosted-mcp-actions button{width:100%!important}
    }
  `;
  document.head.appendChild(style);
})();
