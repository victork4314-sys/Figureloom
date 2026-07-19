(() => {
  if (window.__figureLoomAdrianaPolishV2) return;
  window.__figureLoomAdrianaPolishV2 = true;

  const NOTE = 'Made for Adriana M. K., who has been drafting me into unpaid lab work since I was small enough to fit under the bench.';

  function installClosingNote() {
    const body = document.querySelector('#proToolsDrawer .utility-body');
    if (!body) return false;

    let note = body.querySelector('.pro-adriana-closing-note');
    if (!note) {
      note = document.createElement('p');
      note.className = 'pro-adriana-closing-note';
      note.textContent = NOTE;
    }
    note.style.setProperty('color', 'var(--figureloom-ui-accent,#2f7468)', 'important');
    if (body.lastElementChild !== note) body.appendChild(note);
    return true;
  }

  document.getElementById('figureloomQuickStartLite')?.classList.add('quick-start-card');

  const style = document.createElement('style');
  style.id = 'figureloomAdrianaPolishStyle';
  style.textContent = `
    #figureloomQuickStartLite{
      border-color:var(--figureloom-ui-line,#cddbd7)!important;
      border-radius:16px!important;
      background:var(--figureloom-ui-surface-glass,rgba(255,255,255,.92))!important;
      color:var(--figureloom-ui-text,#172321)!important;
      box-shadow:0 22px 70px var(--figureloom-ui-shadow,rgba(12,46,40,.22))!important;
      backdrop-filter:blur(18px)!important;
    }
    #figureloomQuickStartLite::before{
      height:3px!important;
      background:var(--figureloom-ui-accent,#2f7468)!important;
    }
    #figureloomQuickStartLite .quick-start-lite-glow{display:none!important}
    #figureloomQuickStartLite .quick-start-lite-heading strong{color:var(--figureloom-ui-text,#172321)!important}
    #figureloomQuickStartLite .quick-start-lite-heading>span:last-child{color:var(--figureloom-ui-muted,#60706c)!important}
    #figureloomQuickStartLite .quick-start-lite-kicker{
      border-color:var(--figureloom-ui-line,#cddbd7)!important;
      background:var(--figureloom-ui-accent-soft,#dff1ec)!important;
      color:var(--figureloom-ui-accent-strong,#195c51)!important;
    }
    #figureloomQuickStartLite .quick-start-lite-close{
      border-color:var(--figureloom-ui-line,#cddbd7)!important;
      background:var(--figureloom-ui-surface,#fff)!important;
      color:var(--figureloom-ui-muted,#60706c)!important;
      box-shadow:0 4px 12px var(--figureloom-ui-shadow-soft,rgba(12,46,40,.10))!important;
    }
    #figureloomQuickStartLite .quick-start-lite-close:hover{
      border-color:var(--figureloom-ui-accent,#2f7468)!important;
      background:var(--figureloom-ui-accent-soft,#dff1ec)!important;
      color:var(--figureloom-ui-accent-strong,#195c51)!important;
    }
    #figureloomQuickStartLite .quick-start-lite-actions button{
      border-color:var(--figureloom-ui-line,#cddbd7)!important;
      border-radius:11px!important;
      background:var(--figureloom-ui-surface,#fff)!important;
      color:var(--figureloom-ui-text,#172321)!important;
      box-shadow:0 5px 16px var(--figureloom-ui-shadow-soft,rgba(12,46,40,.10))!important;
    }
    #figureloomQuickStartLite .quick-start-lite-actions button:hover{
      border-color:var(--figureloom-ui-accent,#2f7468)!important;
      background:var(--figureloom-ui-accent-soft,#dff1ec)!important;
      box-shadow:0 8px 20px var(--figureloom-ui-shadow-soft,rgba(12,46,40,.10))!important;
    }
    #figureloomQuickStartLite .quick-start-lite-icon{
      border-color:var(--figureloom-ui-line,#cddbd7)!important;
      background:var(--figureloom-ui-accent-soft,#dff1ec)!important;
      color:var(--figureloom-ui-accent-strong,#195c51)!important;
    }
    #figureloomQuickStartLite .quick-start-lite-copy strong{color:var(--figureloom-ui-text,#172321)!important}
    #figureloomQuickStartLite .quick-start-lite-copy span{color:var(--figureloom-ui-muted,#60706c)!important}
    .pro-tools-drawer .pro-adriana-closing-note{
      margin:24px 2px 2px!important;
      padding:16px 2px 2px!important;
      border-top:1px solid var(--figureloom-ui-line,#cddbd7)!important;
      color:var(--figureloom-ui-accent,#2f7468)!important;
      background:transparent!important;
      font-size:11px!important;
      font-weight:500!important;
      line-height:1.58!important;
    }
  `;
  document.head.appendChild(style);

  if (!installClosingNote()) {
    const observer = new MutationObserver(() => {
      if (installClosingNote()) observer.disconnect();
    });
    observer.observe(document.body, { childList:true, subtree:true });
    setTimeout(() => observer.disconnect(), 10000);
  }
})();