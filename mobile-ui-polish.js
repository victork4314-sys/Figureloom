(() => {
  if (window.__figureLoomMobileUiPolishV1) return;
  window.__figureLoomMobileUiPolishV1 = true;

  const root = document.documentElement;
  const phoneMode = () => root.dataset.figureloomResolvedMode === 'phone';

  const ICONS = {
    tools:'<svg viewBox="0 0 24 24"><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/><circle cx="12" cy="12" r="4"/><path d="m5.6 5.6 2.1 2.1m8.6 8.6 2.1 2.1m0-12.8-2.1 2.1M7.7 16.3l-2.1 2.1"/></svg>',
    pages:'<svg viewBox="0 0 24 24"><rect x="6" y="4" width="12" height="15" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>',
    edit:'<svg viewBox="0 0 24 24"><path d="m4 20 4.2-1 10.4-10.4a2.1 2.1 0 0 0-3-3L5.2 16Z"/><path d="m13.8 7.4 2.8 2.8"/></svg>',
    more:'<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>',
    projects:'<svg viewBox="0 0 24 24"><path d="M3.5 7.5h6l1.7 2H20.5v9.5a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19Z"/><path d="M3.5 7.5V5A1.5 1.5 0 0 1 5 3.5h4.2l1.6 2H19A1.5 1.5 0 0 1 20.5 7v2.5"/></svg>',
    settings:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21h-4v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H3v-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6V3h4v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1v4H21a1.7 1.7 0 0 0-1.6 1Z"/></svg>',
    export:'<svg viewBox="0 0 24 24"><path d="M12 3v12m-4.5-4.5L12 15l4.5-4.5M5 20h14"/></svg>',
    share:'<svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5"/></svg>',
    account:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"/><path d="M4.5 20c.7-4 3.2-6 7.5-6s6.8 2 7.5 6"/></svg>',
    templates:'<svg viewBox="0 0 24 24"><rect x="3.5" y="4" width="17" height="16" rx="2"/><path d="M8.5 4v16M8.5 9h12"/></svg>',
    desktop:'<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
    protools:'<svg viewBox="0 0 24 24"><path d="M4 7h16M7 4v6M4 17h16M16 14v6M4 12h16M11 9v6"/></svg>',
    loomy:'<svg viewBox="0 0 24 24"><path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5Z"/><path d="m18 15 .8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8Z"/></svg>',
    guide:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.4 2.4 0 1 1 3.7 2c-1 .7-1.5 1.2-1.5 2.4M12 17h.01"/></svg>'
  };

  function iconFor(action) {
    return ICONS[action] || ICONS.more;
  }

  function decoratePhoneButton(button) {
    const action = button.dataset.phoneAction;
    if (!action || button.dataset.figureloomConsistentIcon === action) return;
    const iconHost = button.querySelector(':scope > span:first-child');
    if (!iconHost) return;
    iconHost.classList.add('figureloom-phone-action-icon');
    iconHost.innerHTML = iconFor(action);
    button.dataset.figureloomConsistentIcon = action;
  }

  function inferSectionLabel(group) {
    const text = `${group.textContent || ''} ${[...group.querySelectorAll('[id]')].map(node => node.id).join(' ')}`.toLowerCase();
    if (/bring|send|align|distribut|arrang|layer|order|group|ungroup|delete/.test(text)) return 'Arrange';
    if (/add|insert|text|shape|arrow|draw|font|connect|illustration|image|symbol/.test(text)) return 'Add';
    if (/grid|snap|guide|view|fit|zoom/.test(text)) return 'View';
    return 'Tools';
  }

  function prepareToolGroups() {
    document.querySelectorAll('.ribbon .tool-group').forEach(group => {
      let label = group.querySelector(':scope > .tool-group-label');
      if (!label) {
        label = document.createElement('span');
        label.className = 'tool-group-label';
        label.textContent = inferSectionLabel(group);
        group.prepend(label);
      }
      group.dataset.figureloomPhoneSection = label.textContent.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'tools';
    });
  }

  function prepare() {
    document.querySelectorAll('#figureloomPhoneDock [data-phone-action],#figureloomPhoneMoreSheet [data-phone-action]').forEach(decoratePhoneButton);
    prepareToolGroups();
  }

  const style = document.createElement('style');
  style.id = 'figureloomMobileUiPolishStyle';
  style.textContent = `
    .figureloom-phone-action-icon svg{
      display:block!important;
      width:22px!important;
      height:22px!important;
      fill:none!important;
      stroke:currentColor!important;
      stroke-width:1.8!important;
      stroke-linecap:round!important;
      stroke-linejoin:round!important;
      overflow:visible!important;
      pointer-events:none!important;
    }
    html[data-figureloom-resolved-mode="phone"] .ribbon.figureloom-phone-sheet-open{
      display:grid!important;
      grid-template-columns:minmax(0,1fr)!important;
      align-content:start!important;
      align-items:start!important;
      gap:10px!important;
      overflow-x:hidden!important;
      overflow-y:auto!important;
      overscroll-behavior-y:contain!important;
      touch-action:pan-y!important;
      -webkit-overflow-scrolling:touch!important;
      scroll-behavior:smooth;
      padding-bottom:calc(96px + env(safe-area-inset-bottom))!important;
    }
    html[data-figureloom-resolved-mode="phone"] .ribbon.figureloom-phone-sheet-open .tool-group{
      position:relative!important;
      display:grid!important;
      grid-template-columns:repeat(2,minmax(0,1fr))!important;
      flex:none!important;
      width:100%!important;
      min-width:0!important;
      min-height:0!important;
      gap:8px!important;
      padding:10px!important;
      border:1px solid var(--figureloom-ui-line,#cddbd7)!important;
      border-radius:14px!important;
      background:var(--figureloom-ui-soft,#edf3f1)!important;
      box-shadow:0 5px 15px var(--figureloom-ui-shadow-soft,rgba(12,46,40,.10))!important;
    }
    html[data-figureloom-resolved-mode="phone"] .ribbon.figureloom-phone-sheet-open .tool-group-label{
      position:static!important;
      inset:auto!important;
      grid-column:1/-1!important;
      display:flex!important;
      align-items:center!important;
      min-height:28px!important;
      margin:-2px -2px 2px!important;
      padding:5px 8px!important;
      border:1px solid color-mix(in srgb,var(--figureloom-ui-accent,#2f7468) 28%,var(--figureloom-ui-line,#cddbd7))!important;
      border-radius:9px!important;
      color:var(--figureloom-ui-accent-strong,#195c51)!important;
      background:var(--figureloom-ui-accent-soft,#dff1ec)!important;
      font-size:10px!important;
      font-weight:800!important;
      letter-spacing:.055em!important;
      line-height:1!important;
      text-transform:uppercase!important;
    }
    html[data-figureloom-resolved-mode="phone"] .ribbon.figureloom-phone-sheet-open .tool-group>button,
    html[data-figureloom-resolved-mode="phone"] .ribbon.figureloom-phone-sheet-open .tool-group>label{
      width:100%!important;
      min-width:0!important;
      min-height:44px!important;
      margin:0!important;
      justify-content:center!important;
      border-radius:10px!important;
    }
    html[data-figureloom-resolved-mode="phone"] .phone-more-grid{
      align-items:stretch!important;
    }
    html[data-figureloom-resolved-mode="phone"] .phone-more-grid button{
      grid-template-columns:32px minmax(0,1fr)!important;
      width:100%!important;
      height:60px!important;
      min-height:60px!important;
      max-height:60px!important;
      padding:8px 11px!important;
      border-color:var(--figureloom-ui-line,#cddbd7)!important;
      color:var(--figureloom-ui-text,#172321)!important;
      background:var(--figureloom-ui-soft,#edf3f1)!important;
    }
    html[data-figureloom-resolved-mode="phone"] .phone-more-grid .figureloom-phone-action-icon{
      display:grid!important;
      place-items:center!important;
      width:32px!important;
      height:32px!important;
      border:1px solid var(--figureloom-ui-line,#cddbd7)!important;
      border-radius:9px!important;
      color:var(--figureloom-ui-accent-strong,#195c51)!important;
      background:var(--figureloom-ui-accent-soft,#dff1ec)!important;
    }
    html[data-figureloom-resolved-mode="phone"] #figureloomPhoneDock .figureloom-phone-action-icon{
      display:grid!important;
      place-items:center!important;
      width:26px!important;
      height:26px!important;
    }
    html[data-figureloom-resolved-mode="phone"] .phone-use-desktop{
      min-height:70px!important;
      color:var(--figureloom-ui-text,#172321)!important;
      border-color:var(--figureloom-ui-line,#cddbd7)!important;
      background:var(--figureloom-ui-accent-soft,#dff1ec)!important;
    }
    html[data-figureloom-resolved-mode="phone"] #scToastStack{
      z-index:13050!important;
      right:12px!important;
      bottom:calc(76px + env(safe-area-inset-bottom))!important;
      left:12px!important;
      justify-items:center!important;
    }
    .sc-toast{
      position:relative!important;
      width:min(420px,100%)!important;
      max-width:100%!important;
      padding:11px 13px 11px 15px!important;
      border:1px solid var(--figureloom-ui-line,#cddbd7)!important;
      border-left:4px solid var(--figureloom-ui-accent,#2f7468)!important;
      border-radius:11px!important;
      color:var(--figureloom-ui-text,#172321)!important;
      background:var(--figureloom-ui-surface,#fff)!important;
      box-shadow:0 14px 34px var(--figureloom-ui-shadow,rgba(12,46,40,.22))!important;
      font-size:11px!important;
      font-weight:650!important;
    }
    .sc-toast.success{border-left-color:var(--figureloom-ui-accent,#2f7468)!important}
    .sc-toast.warning{border-left-color:#b17a2e!important}
    .sc-toast.error{border-left-color:#b34f55!important}
    @media(max-width:350px){
      html[data-figureloom-resolved-mode="phone"] .ribbon.figureloom-phone-sheet-open .tool-group{
        grid-template-columns:minmax(0,1fr)!important;
      }
    }
  `;
  document.head.appendChild(style);

  function init() {
    prepare();
    const observer = new MutationObserver(prepare);
    observer.observe(document.body, { childList:true, subtree:true });
    addEventListener('figureloom-settings-change', () => requestAnimationFrame(prepare));
    addEventListener('figureloom-stable-ready', () => requestAnimationFrame(prepare));
    window.FigureLoomMobileUiPolish = Object.freeze({ refresh:prepare, active:phoneMode });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();