(() => {
  if (window.__figureLoomMobileToolsPolishV1) return;
  window.__figureLoomMobileToolsPolishV1 = true;

  const root = document.documentElement;
  const phoneMode = () => root.dataset.figureloomResolvedMode === 'phone';
  const icon = paths => `<svg class="figureloom-phone-action-icon" viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
  const ICONS = {
    tools:icon('<path d="M4 7h16M7 7V4m10 3V4M4 17h16m-9 0v3m6-8H7m4 0V9"/>'),
    pages:icon('<rect x="5" y="4" width="11" height="14" rx="2"/><path d="M9 8h9a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9"/>'),
    edit:icon('<path d="m5 16-1 4 4-1L19 8l-3-3Z"/><path d="m14 7 3 3"/>'),
    more:icon('<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>'),
    projects:icon('<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 9h18M8 5V3h8v2"/>'),
    settings:icon('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1v.1h-4v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1-.4h-.1v-4H3A1.7 1.7 0 0 0 4.6 8.5a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1v-.1h4V3A1.7 1.7 0 0 0 15.5 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.11.38.32.72.6 1 .28.28.62.49 1 .6h.1v4H21a1.7 1.7 0 0 0-1.6.4Z"/>'),
    export:icon('<path d="M12 3v12m-5-5 5 5 5-5M5 20h14"/>'),
    share:icon('<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.3 10.9 7.4-4.1M8.3 13.1l7.4 4.1"/>'),
    account:icon('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
    templates:icon('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/>'),
    desktop:icon('<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>'),
    protools:icon('<path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5"/>'),
    loomy:icon('<path d="m12 3 1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4ZM18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8Z"/>'),
    guide:icon('<circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.4 2.4 0 1 1 3.5 2.1c-.8.4-1.3 1-1.3 1.9M12 17h.01"/>'),
    add:icon('<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>'),
    arrange:icon('<rect x="4" y="5" width="7" height="7" rx="1"/><rect x="13" y="12" width="7" height="7" rx="1"/><path d="M15 5h5v5M9 19H4v-5"/>')
  };

  function syncIcons() {
    document.querySelectorAll('#figureloomPhoneDock [data-phone-action],#figureloomPhoneMoreSheet [data-phone-action]').forEach(button => {
      const action = button.dataset.phoneAction;
      const holder = button.querySelector(':scope > span:first-child');
      if (!holder || !ICONS[action] || holder.dataset.figureloomVectorIcon === action) return;
      holder.innerHTML = ICONS[action];
      holder.dataset.figureloomVectorIcon = action;
      holder.classList.add('figureloom-phone-action-icon-wrap');
    });
  }

  function ensureToolSections() {
    const ribbon = document.querySelector('.ribbon');
    if (!ribbon || ribbon.querySelector('#figureloomPhoneToolSections')) return;
    const sections = document.createElement('div');
    sections.id = 'figureloomPhoneToolSections';
    sections.setAttribute('role', 'group');
    sections.setAttribute('aria-label', 'Tool sections');
    sections.innerHTML = `
      <button type="button" data-phone-tool-tab="insert"><span>${ICONS.add}</span><strong>Add</strong><small>Objects and imports</small></button>
      <button type="button" data-phone-tool-tab="layout"><span>${ICONS.arrange}</span><strong>Arrange</strong><small>Order and alignment</small></button>`;
    ribbon.prepend(sections);
  }

  function openToolSection(tabName) {
    const tab = document.querySelector(`.ribbon-tabs .ribbon-tab[data-tab="${tabName}"]`);
    if (!tab) return;
    if (tabName === 'insert') {
      window.FigureLoomPhoneMode?.close?.({ restoreFocus:false });
      tab.click();
      return;
    }
    tab.click();
    setTimeout(() => {
      ensureToolSections();
      window.FigureLoomPhoneMode?.open?.('tools');
      document.querySelector('.ribbon')?.scrollTo?.({ top:0, behavior:'auto' });
    }, 0);
  }

  function handleSectionClick(event) {
    const button = event.target.closest?.('[data-phone-tool-tab]');
    if (!button || !phoneMode()) return;
    event.preventDefault();
    event.stopPropagation();
    openToolSection(button.dataset.phoneToolTab);
  }

  const style = document.createElement('style');
  style.id = 'figureloomMobileToolsPolishStyle';
  style.textContent = `
    html[data-figureloom-resolved-mode="phone"]{
      --figureloom-phone-bg:var(--figureloom-ui-bg,#f4f7f6)!important;
      --figureloom-phone-surface:var(--figureloom-ui-surface,#fff)!important;
      --figureloom-phone-surface-soft:var(--figureloom-ui-soft,#edf3f1)!important;
      --figureloom-phone-border:var(--figureloom-ui-line,#cddbd7)!important;
      --figureloom-phone-text:var(--figureloom-ui-text,#172321)!important;
      --figureloom-phone-muted:var(--figureloom-ui-muted,#60706c)!important;
      --figureloom-phone-accent:var(--figureloom-ui-accent,#2f7468)!important;
      --figureloom-phone-shadow:0 -16px 42px var(--figureloom-ui-shadow,rgba(12,46,40,.22))!important;
    }
    html[data-figureloom-resolved-mode="phone"] :where(#figureloomPhoneDock,#figureloomPhoneMoreSheet,#figureloomPhoneSheetBar,.ribbon.figureloom-phone-sheet-open){
      color:var(--figureloom-ui-text,#172321)!important;
      border-color:var(--figureloom-ui-line,#cddbd7)!important;
      background-color:var(--figureloom-ui-surface,#fff)!important;
    }
    html[data-figureloom-resolved-mode="phone"] .ribbon.figureloom-phone-sheet-open{
      display:flex!important;
      align-content:flex-start!important;
      align-items:stretch!important;
      flex-wrap:wrap!important;
      overflow-x:hidden!important;
      overflow-y:auto!important;
      overscroll-behavior-x:none!important;
      overscroll-behavior-y:contain!important;
      touch-action:pan-y!important;
      -webkit-overflow-scrolling:touch!important;
      scrollbar-gutter:stable both-edges;
    }
    html[data-figureloom-resolved-mode="phone"] .ribbon.figureloom-phone-sheet-open :where(.tool-group,button,label){touch-action:pan-y!important}
    html[data-figureloom-resolved-mode="phone"] .ribbon.figureloom-phone-sheet-open :where(input,select,textarea){touch-action:auto!important}
    html[data-figureloom-resolved-mode="phone"] .ribbon .tool-group{
      position:relative!important;
      flex:0 0 100%!important;
      width:100%!important;
      min-width:0!important;
      min-height:88px!important;
      gap:8px!important;
      padding:34px 10px 11px!important;
      border:1px solid var(--figureloom-ui-line,#cddbd7)!important;
      border-radius:15px!important;
      background:var(--figureloom-ui-soft,#edf3f1)!important;
      box-shadow:0 5px 14px var(--figureloom-ui-shadow-soft,rgba(12,46,40,.10))!important;
    }
    html[data-figureloom-resolved-mode="phone"] .ribbon .tool-group-label{
      position:absolute!important;
      top:9px!important;
      right:10px!important;
      bottom:auto!important;
      left:10px!important;
      display:block!important;
      color:var(--figureloom-ui-accent-strong,#195c51)!important;
      font-size:11px!important;
      font-weight:800!important;
      letter-spacing:.02em!important;
      line-height:16px!important;
      text-transform:none!important;
    }
    html[data-figureloom-resolved-mode="phone"] .ribbon button{
      border-color:var(--figureloom-ui-line,#cddbd7)!important;
      color:var(--figureloom-ui-text,#172321)!important;
      background:var(--figureloom-ui-surface,#fff)!important;
      box-shadow:none!important;
    }
    html[data-figureloom-resolved-mode="phone"] .ribbon button:active{
      border-color:var(--figureloom-ui-accent,#2f7468)!important;
      background:var(--figureloom-ui-accent-soft,#dff1ec)!important;
    }
    #figureloomPhoneToolSections{display:none}
    html[data-figureloom-resolved-mode="phone"] #figureloomPhoneToolSections{
      position:sticky!important;
      z-index:3!important;
      top:0!important;
      display:grid!important;
      grid-template-columns:repeat(2,minmax(0,1fr))!important;
      flex:0 0 100%!important;
      width:100%!important;
      gap:8px!important;
      padding:0 0 2px!important;
      background:linear-gradient(var(--figureloom-ui-surface,#fff) 82%,transparent)!important;
    }
    html[data-figureloom-resolved-mode="phone"] #figureloomPhoneToolSections button{
      display:grid!important;
      grid-template-columns:34px minmax(0,1fr)!important;
      grid-template-rows:auto auto!important;
      align-items:center!important;
      min-width:0!important;
      min-height:58px!important;
      padding:8px 10px!important;
      text-align:left!important;
      border:1px solid var(--figureloom-ui-line,#cddbd7)!important;
      border-radius:14px!important;
      color:var(--figureloom-ui-text,#172321)!important;
      background:var(--figureloom-ui-accent-soft,#dff1ec)!important;
    }
    html[data-figureloom-resolved-mode="phone"] #figureloomPhoneToolSections button>span{grid-row:1/3;display:grid;place-items:center;color:var(--figureloom-ui-accent-strong,#195c51)!important}
    html[data-figureloom-resolved-mode="phone"] #figureloomPhoneToolSections strong{font-size:12px;line-height:1.15}
    html[data-figureloom-resolved-mode="phone"] #figureloomPhoneToolSections small{color:var(--figureloom-ui-muted,#60706c)!important;font-size:9px;line-height:1.2}
    html[data-figureloom-resolved-mode="phone"] .figureloom-phone-action-icon-wrap{display:grid!important;place-items:center!important;width:28px!important;height:28px!important;font-size:0!important}
    html[data-figureloom-resolved-mode="phone"] .figureloom-phone-action-icon{width:22px!important;height:22px!important;fill:none!important;stroke:currentColor!important;stroke-width:1.8!important;stroke-linecap:round!important;stroke-linejoin:round!important;pointer-events:none!important}
    html[data-figureloom-resolved-mode="phone"] #figureloomPhoneDock .figureloom-phone-action-icon{width:21px!important;height:21px!important}
    html[data-figureloom-resolved-mode="phone"] .phone-more-grid{align-items:stretch!important}
    html[data-figureloom-resolved-mode="phone"] .phone-more-grid button{
      grid-template-columns:32px minmax(0,1fr)!important;
      width:100%!important;
      height:60px!important;
      min-height:60px!important;
      padding:9px 11px!important;
      border-color:var(--figureloom-ui-line,#cddbd7)!important;
      color:var(--figureloom-ui-text,#172321)!important;
      background:var(--figureloom-ui-soft,#edf3f1)!important;
    }
    html[data-figureloom-resolved-mode="phone"] .phone-more-grid button small{align-self:center!important;font-size:11px!important;line-height:1.2!important}
    html[data-figureloom-resolved-mode="phone"] .phone-use-desktop{
      border-color:var(--figureloom-ui-accent,#2f7468)!important;
      color:var(--figureloom-ui-text,#172321)!important;
      background:var(--figureloom-ui-accent-soft,#dff1ec)!important;
    }
  `;
  document.head.appendChild(style);

  function sync() {
    ensureToolSections();
    syncIcons();
  }

  document.addEventListener('click', handleSectionClick, true);
  new MutationObserver(sync).observe(document.body, { childList:true, subtree:true });
  addEventListener('figureloom-settings-change', () => requestAnimationFrame(sync));
  addEventListener('figureloom-stable-ready', () => requestAnimationFrame(sync));
  sync();
  window.FigureLoomMobileToolsPolish = Object.freeze({ sync });
})();