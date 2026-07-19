(() => {
  if (window.__figureLoomSageThemeInstalled) return;
  window.__figureLoomSageThemeInstalled = true;

  const root = document.documentElement;
  const style = document.createElement('style');
  style.id = 'figureloomSageTheme';
  style.textContent = `
    :root,
    html[data-figureloom-theme="light"]{
      --figureloom-ui-bg:#f4f7f6;
      --figureloom-ui-surface:#ffffff;
      --figureloom-ui-surface-glass:rgba(255,255,255,.92);
      --figureloom-ui-soft:#edf3f1;
      --figureloom-ui-strong:#dce9e5;
      --figureloom-ui-text:#172321;
      --figureloom-ui-muted:#60706c;
      --figureloom-ui-line:#cddbd7;
      --figureloom-ui-accent:#2f7468;
      --figureloom-ui-accent-strong:#195c51;
      --figureloom-ui-accent-soft:#dff1ec;
      --figureloom-ui-accent-ink:#ffffff;
      --figureloom-ui-shadow:rgba(12,46,40,.22);
      --figureloom-ui-shadow-soft:rgba(12,46,40,.10);
      --delight-ink:#172321;
      --delight-muted:#60706c;
      --delight-line:#cddbd7;
      --delight-glass:rgba(255,255,255,.88);
      --delight-blue:#2f7468;
      --delight-cyan:#5b9a8e;
      --delight-moss:#789978;
      --delight-lilac:#6e8f86;
      --delight-shadow:0 16px 44px rgba(12,46,40,.12);
      --figureloom-phone-surface:#ffffff;
      --figureloom-phone-surface-soft:#edf3f1;
      --figureloom-phone-text:#172321;
      --figureloom-phone-muted:#60706c;
      --figureloom-phone-line:#cddbd7;
      --figureloom-phone-accent:#2f7468;
    }
    html[data-figureloom-theme="dark"]{
      --figureloom-ui-bg:#181d1c;
      --figureloom-ui-surface:#222927;
      --figureloom-ui-surface-glass:rgba(34,41,39,.94);
      --figureloom-ui-soft:#2a3431;
      --figureloom-ui-strong:#35413e;
      --figureloom-ui-text:#eef7f4;
      --figureloom-ui-muted:#aebdb8;
      --figureloom-ui-line:#43514d;
      --figureloom-ui-accent:#78c4b5;
      --figureloom-ui-accent-strong:#a1ddcf;
      --figureloom-ui-accent-soft:#253e38;
      --figureloom-ui-accent-ink:#102621;
      --figureloom-ui-shadow:rgba(0,0,0,.48);
      --figureloom-ui-shadow-soft:rgba(0,0,0,.24);
      --delight-ink:#eef7f4;
      --delight-muted:#aebdb8;
      --delight-line:#43514d;
      --delight-glass:rgba(34,41,39,.92);
      --delight-blue:#78c4b5;
      --delight-cyan:#78c4b5;
      --delight-moss:#8eaa8d;
      --delight-lilac:#83a69c;
      --delight-shadow:0 16px 44px rgba(0,0,0,.34);
      --figureloom-phone-surface:#222927;
      --figureloom-phone-surface-soft:#2a3431;
      --figureloom-phone-text:#eef7f4;
      --figureloom-phone-muted:#aebdb8;
      --figureloom-phone-line:#43514d;
      --figureloom-phone-accent:#78c4b5;
    }

    html[data-figureloom-theme] body{
      color:var(--figureloom-ui-text)!important;
      background:
        radial-gradient(circle at 9% 8%,color-mix(in srgb,var(--figureloom-ui-accent) 12%,transparent),transparent 27%),
        radial-gradient(circle at 92% 12%,color-mix(in srgb,var(--figureloom-ui-accent-strong) 8%,transparent),transparent 30%),
        var(--figureloom-ui-bg)!important;
    }
    html[data-figureloom-theme] body .app-shell{background:transparent!important}
    html[data-figureloom-theme] body .titlebar,
    html[data-figureloom-theme] body .ribbon-tabs,
    html[data-figureloom-theme] body .ribbon,
    html[data-figureloom-theme] body .left-panel,
    html[data-figureloom-theme] body .right-panel,
    html[data-figureloom-theme] body .statusbar{
      background:var(--figureloom-ui-surface-glass)!important;
      border-color:var(--figureloom-ui-line)!important;
      color:var(--figureloom-ui-text)!important;
      backdrop-filter:blur(15px) saturate(1.08);
    }
    html[data-figureloom-theme] body .titlebar{box-shadow:0 8px 26px var(--figureloom-ui-shadow-soft)!important}
    html[data-figureloom-theme] body .ribbon{box-shadow:0 2px 8px var(--figureloom-ui-shadow-soft)!important}
    html[data-figureloom-theme] body .workspace{background:var(--figureloom-ui-strong)!important}
    html[data-figureloom-theme] body .canvas-area,
    html[data-figureloom-theme] body .canvas-stage{
      background:
        radial-gradient(circle at 22% 13%,color-mix(in srgb,var(--figureloom-ui-accent) 8%,transparent),transparent 31%),
        linear-gradient(145deg,var(--figureloom-ui-strong),var(--figureloom-ui-soft))!important;
    }
    html[data-figureloom-theme] body #canvas{background:#fff!important;color-scheme:light!important;filter:drop-shadow(0 18px 28px var(--figureloom-ui-shadow-soft))!important}
    html[data-figureloom-theme] body #canvas *,
    html[data-figureloom-theme] body .mini-page *{color-scheme:light!important}
    html[data-figureloom-theme] body .selection-box{stroke:var(--figureloom-ui-accent)!important}

    html[data-figureloom-theme] body .brand-mark{
      background:linear-gradient(145deg,var(--figureloom-ui-accent-strong),var(--figureloom-ui-accent) 58%,#5b9a8e)!important;
      border-color:color-mix(in srgb,var(--figureloom-ui-surface) 72%,transparent)!important;
      box-shadow:0 7px 18px color-mix(in srgb,var(--figureloom-ui-accent) 28%,transparent)!important;
    }
    html[data-figureloom-theme] body .brand strong,
    html[data-figureloom-theme] body .document-title input,
    html[data-figureloom-theme] body #selectionName{color:var(--figureloom-ui-text)!important}
    html[data-figureloom-theme] body .brand span,
    html[data-figureloom-theme] body .document-title span,
    html[data-figureloom-theme] body .tool-group-label,
    html[data-figureloom-theme] body .panel-heading h2,
    html[data-figureloom-theme] body .inspector-section h2,
    html[data-figureloom-theme] body .empty-state,
    html[data-figureloom-theme] body .tool-note,
    html[data-figureloom-theme] body .collab-note,
    html[data-figureloom-theme] body .collab-details{color:var(--figureloom-ui-muted)!important}

    html[data-figureloom-theme] body .ribbon-tab,
    html[data-figureloom-theme] body .ribbon-command-tab{color:var(--figureloom-ui-muted)!important;background:transparent!important}
    html[data-figureloom-theme] body .ribbon-tab:hover,
    html[data-figureloom-theme] body .ribbon-command-tab:hover{color:var(--figureloom-ui-accent-strong)!important;background:var(--figureloom-ui-accent-soft)!important}
    html[data-figureloom-theme] body .ribbon-tab.active,
    html[data-figureloom-theme] body .inspector-tab.active{color:var(--figureloom-ui-accent-strong)!important;border-bottom-color:var(--figureloom-ui-accent)!important;background:var(--figureloom-ui-accent-soft)!important}
    html[data-figureloom-theme] body .ribbon-tab.active::after{background:var(--figureloom-ui-accent)!important}
    html[data-figureloom-resolved-mode="phone"][data-figureloom-theme] body .ribbon-tab.active{border-bottom-color:transparent!important}
    html[data-figureloom-theme] body .tool-group,
    html[data-figureloom-theme] body .inspector-tabs,
    html[data-figureloom-theme] body .inspector-section{border-color:var(--figureloom-ui-line)!important}

    html[data-figureloom-theme] body button:not(:disabled):not(.welcome-primary):not(.tour-primary):not(#exportButton),
    html[data-figureloom-theme] body .icon-button,
    html[data-figureloom-theme] body .editor-link{
      color:var(--figureloom-ui-text)!important;
      border-color:var(--figureloom-ui-line)!important;
      background:var(--figureloom-ui-surface)!important;
    }
    html[data-figureloom-theme] body button:not(:disabled):hover,
    html[data-figureloom-theme] body a[role="button"]:hover{
      border-color:var(--figureloom-ui-accent)!important;
      box-shadow:0 5px 14px var(--figureloom-ui-shadow-soft)!important;
    }
    html[data-figureloom-theme] body #exportButton,
    html[data-figureloom-theme] body .welcome-primary,
    html[data-figureloom-theme] body .tour-primary,
    html[data-figureloom-theme] body .editor-link,
    html[data-figureloom-theme] body .primary-button,
    html[data-figureloom-theme] body [data-primary="true"]{
      color:var(--figureloom-ui-accent-ink)!important;
      background:var(--figureloom-ui-accent)!important;
      border-color:var(--figureloom-ui-accent)!important;
    }
    html[data-figureloom-theme] body #exportButton:hover,
    html[data-figureloom-theme] body .welcome-primary:hover,
    html[data-figureloom-theme] body .tour-primary:hover{
      background:var(--figureloom-ui-accent-strong)!important;
      border-color:var(--figureloom-ui-accent-strong)!important;
    }

    html[data-figureloom-theme] body input:not([type="range"]),
    html[data-figureloom-theme] body select,
    html[data-figureloom-theme] body textarea{
      color:var(--figureloom-ui-text)!important;
      border-color:var(--figureloom-ui-line)!important;
      background:var(--figureloom-ui-surface)!important;
    }
    html[data-figureloom-theme] body input::placeholder,
    html[data-figureloom-theme] body textarea::placeholder{color:var(--figureloom-ui-muted)!important}
    html[data-figureloom-theme] body input:focus,
    html[data-figureloom-theme] body select:focus,
    html[data-figureloom-theme] body textarea:focus{
      border-color:var(--figureloom-ui-accent)!important;
      box-shadow:0 0 0 3px color-mix(in srgb,var(--figureloom-ui-accent) 20%,transparent)!important;
      outline:none!important;
    }
    html[data-figureloom-theme] body input[type="color"]{background:var(--figureloom-ui-soft)!important}

    html[data-figureloom-theme] body .science-card,
    html[data-figureloom-theme] body .pack-icon,
    html[data-figureloom-theme] body .component-card,
    html[data-figureloom-theme] body .template-card,
    html[data-figureloom-theme] body .pro-workspace-card,
    html[data-figureloom-theme] body .utility-card,
    html[data-figureloom-theme] body .page-thumbnail,
    html[data-figureloom-theme] body .layer-item,
    html[data-figureloom-theme] body .inspector-tab,
    html[data-figureloom-theme] body .project-card,
    html[data-figureloom-theme] body .project-gallery-card,
    html[data-figureloom-theme] body .gallery-card,
    html[data-figureloom-theme] body .account-card,
    html[data-figureloom-theme] body .settings-card,
    html[data-figureloom-theme] body .collab-session-card,
    html[data-figureloom-theme] body .collab-person,
    html[data-figureloom-theme] body .collab-comment,
    html[data-figureloom-theme] body .figureloom-chat-bubble,
    html[data-figureloom-theme] body .quick-start-card{
      color:var(--figureloom-ui-text)!important;
      background:var(--figureloom-ui-surface)!important;
      border-color:var(--figureloom-ui-line)!important;
      box-shadow:0 5px 16px var(--figureloom-ui-shadow-soft)!important;
    }
    html[data-figureloom-theme] body .page-thumbnail.active,
    html[data-figureloom-theme] body .layer-item.active,
    html[data-figureloom-theme] body .project-card.active,
    html[data-figureloom-theme] body .selected,
    html[data-figureloom-theme] body [aria-selected="true"]{
      color:var(--figureloom-ui-accent-strong)!important;
      background:var(--figureloom-ui-accent-soft)!important;
      border-color:var(--figureloom-ui-accent)!important;
      box-shadow:0 0 0 2px color-mix(in srgb,var(--figureloom-ui-accent) 15%,transparent)!important;
    }
    html[data-figureloom-theme] body .mini-page{background:#fff!important;border-color:var(--figureloom-ui-line)!important;color-scheme:light!important}

    html[data-figureloom-theme] body .utility-drawer,
    html[data-figureloom-theme] body .packs-drawer,
    html[data-figureloom-theme] body #scienceDrawer,
    html[data-figureloom-theme] body .drawer,
    html[data-figureloom-theme] body dialog,
    html[data-figureloom-theme] body .modal,
    html[data-figureloom-theme] body [role="dialog"],
    html[data-figureloom-theme] body .utility-body,
    html[data-figureloom-theme] body .figureloom-chat-shell,
    html[data-figureloom-theme] body #figureloomSettingsPage,
    html[data-figureloom-theme] body #figureloomPhoneMoreSheet{
      color:var(--figureloom-ui-text)!important;
      background:var(--figureloom-ui-surface)!important;
      border-color:var(--figureloom-ui-line)!important;
      box-shadow:0 22px 70px var(--figureloom-ui-shadow)!important;
    }
    html[data-figureloom-theme] body .utility-head,
    html[data-figureloom-theme] body .drawer-header,
    html[data-figureloom-theme] body .modal-header,
    html[data-figureloom-theme] body .figureloom-chat-topbar,
    html[data-figureloom-theme] body .figureloom-chat-composer,
    html[data-figureloom-theme] body .phone-sheet-bar{
      color:var(--figureloom-ui-text)!important;
      background:var(--figureloom-ui-soft)!important;
      border-color:var(--figureloom-ui-line)!important;
    }

    html[data-figureloom-theme] body .canvas-toolbar,
    html[data-figureloom-theme] body #figureloomPhoneDock,
    html[data-figureloom-theme] body #figureloomPhoneChrome,
    html[data-figureloom-theme] body .figureloom-phone-sheet{
      color:var(--figureloom-ui-text)!important;
      background:var(--figureloom-ui-surface-glass)!important;
      border-color:var(--figureloom-ui-line)!important;
      box-shadow:0 8px 24px var(--figureloom-ui-shadow-soft)!important;
    }

    html[data-figureloom-theme] body .welcome-card,
    html[data-figureloom-theme] body #scicanvasTour .tour-card,
    html[data-figureloom-theme] body .figureloom-help-menu{
      color:var(--figureloom-ui-text)!important;
      background:var(--figureloom-ui-surface)!important;
      border-color:var(--figureloom-ui-line)!important;
      box-shadow:0 28px 90px var(--figureloom-ui-shadow)!important;
    }
    html[data-figureloom-theme] body .welcome-kicker,
    html[data-figureloom-theme] body .figureloom-help-links a:hover,
    html[data-figureloom-theme] body .figureloom-help-tour:hover{
      color:var(--figureloom-ui-accent-strong)!important;
      background:var(--figureloom-ui-accent-soft)!important;
    }
    html[data-figureloom-theme] body .welcome-card h1{
      background:linear-gradient(110deg,var(--figureloom-ui-accent-strong),var(--figureloom-ui-accent),#6f9288)!important;
      -webkit-background-clip:text!important;
      background-clip:text!important;
      color:transparent!important;
    }
    html[data-figureloom-theme] body #scicanvasTour .tour-highlight{
      border-color:var(--figureloom-ui-accent)!important;
      box-shadow:0 0 0 5px color-mix(in srgb,var(--figureloom-ui-accent) 18%,transparent),0 12px 34px var(--figureloom-ui-shadow-soft)!important;
    }
    html[data-figureloom-theme] body #scicanvasTour .tour-progress-fill{
      background:linear-gradient(90deg,#5b9a8e,var(--figureloom-ui-accent),#789978)!important;
    }
    html[data-figureloom-theme] body #scicanvasTour .tour-progress-bar{background:var(--figureloom-ui-strong)!important}
    html[data-figureloom-theme] body .delight-toast{
      color:var(--figureloom-ui-text)!important;
      background:var(--figureloom-ui-surface)!important;
      border-color:var(--figureloom-ui-line)!important;
      box-shadow:0 14px 42px var(--figureloom-ui-shadow)!important;
    }
    html[data-figureloom-theme] body .dna-pair{background:linear-gradient(var(--figureloom-ui-accent),#789978)!important}
    html[data-figureloom-theme] body .dna-pair::before{background:#78c4b5!important;color:#78c4b5!important}
    html[data-figureloom-theme] body .dna-pair::after{background:#8eaa8d!important;color:#8eaa8d!important}

    html[data-figureloom-theme] body .real-library-shortcut{
      color:var(--figureloom-ui-accent-strong)!important;
      background:linear-gradient(135deg,var(--figureloom-ui-accent-soft),var(--figureloom-ui-surface))!important;
      border-color:var(--figureloom-ui-accent)!important;
    }
    html[data-figureloom-theme] body .real-library-shortcut .shortcut-art{
      color:var(--figureloom-ui-accent-ink)!important;
      background:var(--figureloom-ui-accent)!important;
    }
    html[data-figureloom-theme] body .real-library-shortcut small{color:var(--figureloom-ui-muted)!important}
    html[data-figureloom-theme] body .real-library-shortcut .shortcut-arrow{color:var(--figureloom-ui-accent)!important}

    html[data-figureloom-theme] body .figureloom-chat-message.user .figureloom-chat-bubble{
      color:var(--figureloom-ui-accent-ink)!important;
      background:var(--figureloom-ui-accent)!important;
      border-color:var(--figureloom-ui-accent)!important;
    }
    html[data-figureloom-theme] body .loomy-progress,
    html[data-figureloom-theme] body .figureloom-chat-details{
      color:var(--figureloom-ui-text)!important;
      background:var(--figureloom-ui-soft)!important;
      border-color:var(--figureloom-ui-line)!important;
    }

    html[data-figureloom-theme] body ::selection{background:color-mix(in srgb,var(--figureloom-ui-accent) 28%,transparent)}
    html[data-figureloom-theme] body *{scrollbar-color:color-mix(in srgb,var(--figureloom-ui-accent) 48%,var(--figureloom-ui-line)) transparent}
    html[data-figureloom-theme] body ::-webkit-scrollbar-track{background:var(--figureloom-ui-soft)}
    html[data-figureloom-theme] body ::-webkit-scrollbar-thumb{background:color-mix(in srgb,var(--figureloom-ui-accent) 48%,var(--figureloom-ui-line));border:2px solid var(--figureloom-ui-soft);border-radius:999px}
  `;
  document.head.appendChild(style);

  function syncThemeChrome() {
    const dark = root.dataset.figureloomTheme === 'dark';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#181d1c' : '#f4f7f6');
  }

  syncThemeChrome();
  new MutationObserver(syncThemeChrome).observe(root, { attributes:true, attributeFilter:['data-figureloom-theme'] });
  window.FigureLoomSageTheme = { sync:syncThemeChrome };
})();
