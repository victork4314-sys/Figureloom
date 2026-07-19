(() => {
  if (window.__figureLoomTourMobileSafeV3) return;
  window.__figureLoomTourMobileSafeV3 = true;

  const root = document.documentElement;

  const style = document.createElement('style');
  style.id = 'figureloomTourMobileSafeStyle';
  style.textContent = `
    #scicanvasTour.open {
      position: fixed !important;
      z-index: 2147482000 !important;
      inset: var(--figureloom-tour-viewport-top, 0px) 0 auto !important;
      width: 100dvw !important;
      height: var(--figureloom-tour-viewport-height, 100dvh) !important;
      max-width: 100dvw !important;
      max-height: var(--figureloom-tour-viewport-height, 100dvh) !important;
      overflow: hidden !important;
      isolation: isolate !important;
      pointer-events: auto !important;
    }

    #scicanvasTour.open .tour-shade {
      position: absolute !important;
      z-index: 0 !important;
      inset: 0 !important;
      pointer-events: auto !important;
    }

    #scicanvasTour.open .tour-highlight {
      z-index: 1 !important;
    }

    #scicanvasTour.open .tour-card {
      position: absolute !important;
      z-index: 2 !important;
      top: auto !important;
      right: max(10px, env(safe-area-inset-right)) !important;
      bottom: max(10px, env(safe-area-inset-bottom)) !important;
      left: max(10px, env(safe-area-inset-left)) !important;
      width: auto !important;
      max-width: 560px !important;
      max-height: calc(var(--figureloom-tour-viewport-height, 100dvh) - 20px - env(safe-area-inset-top) - env(safe-area-inset-bottom)) !important;
      margin: 0 auto !important;
      padding: 18px 18px 0 !important;
      overflow-x: hidden !important;
      overflow-y: auto !important;
      overscroll-behavior: contain !important;
      -webkit-overflow-scrolling: touch !important;
      transform: none !important;
      scroll-padding-bottom: 78px !important;
      box-sizing: border-box !important;
    }

    #scicanvasTour.open .tour-actions {
      position: sticky !important;
      z-index: 4 !important;
      right: 0 !important;
      bottom: 0 !important;
      left: 0 !important;
      display: grid !important;
      grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
      gap: 8px !important;
      margin: 16px -18px 0 !important;
      padding: 12px 18px max(14px, env(safe-area-inset-bottom)) !important;
      border-top: 1px solid var(--figureloom-ui-line, #cddbd7) !important;
      background: var(--figureloom-ui-soft, #edf3f1) !important;
      box-shadow: 0 -10px 22px var(--figureloom-ui-shadow-soft, rgba(12,46,40,.10)) !important;
      backdrop-filter: blur(14px) saturate(1.08) !important;
      color: var(--figureloom-ui-text, #172321) !important;
    }

    #scicanvasTour.open .tour-actions button {
      width: 100% !important;
      min-width: 0 !important;
      min-height: 44px !important;
      padding: 9px 10px !important;
      touch-action: manipulation !important;
    }

    html[data-figureloom-theme="dark"] #scicanvasTour.open .tour-actions,
    html[data-theme="dark"] #scicanvasTour.open .tour-actions {
      border-top-color: var(--figureloom-ui-line, #43514d) !important;
      background: var(--figureloom-ui-soft, #2a3431) !important;
      box-shadow: 0 -10px 24px var(--figureloom-ui-shadow-soft, rgba(0,0,0,.24)) !important;
      color: var(--figureloom-ui-text, #eef7f4) !important;
    }

    html[data-figureloom-theme="dark"] #scicanvasTour.open .tour-actions button:not(.primary):not([data-tour="next"]),
    html[data-theme="dark"] #scicanvasTour.open .tour-actions button:not(.primary):not([data-tour="next"]) {
      border-color: var(--figureloom-ui-line, #43514d) !important;
      background: var(--figureloom-ui-surface, #222927) !important;
      color: var(--figureloom-ui-text, #eef7f4) !important;
    }

    #scicanvasTour.open .tour-actions [data-tour="next"] {
      border-color: var(--figureloom-ui-accent, #2f7468) !important;
      background: var(--figureloom-ui-accent, #2f7468) !important;
      color: var(--figureloom-ui-accent-ink, #fff) !important;
    }

    html[data-figureloom-theme="dark"] #scicanvasTour.open .tour-actions button:disabled,
    html[data-theme="dark"] #scicanvasTour.open .tour-actions button:disabled {
      border-color: var(--figureloom-ui-line, #43514d) !important;
      background: var(--figureloom-ui-surface, #222927) !important;
      color: var(--figureloom-ui-muted, #aebdb8) !important;
      opacity: .72 !important;
    }

    html.figureloom-tour-open,
    html.figureloom-tour-open body {
      overflow: hidden !important;
      overscroll-behavior: none !important;
    }

    html.figureloom-tour-open #figureloomPhoneDock,
    html.figureloom-tour-open .canvas-toolbar,
    html.figureloom-tour-open .movable-toolbar-bubble,
    html.figureloom-tour-open #figureloomPhoneSheetBar {
      pointer-events: none !important;
    }

    @media (max-width: 640px) {
      #scicanvasTour.open .tour-card {
        max-width: none !important;
        border-radius: 18px !important;
        padding: 15px 15px 0 !important;
        scroll-padding-bottom: 80px !important;
      }

      #scicanvasTour.open .tour-progress-bar {
        margin-bottom: 12px !important;
      }

      #scicanvasTour.open h2 {
        font-size: clamp(20px, 6vw, 26px) !important;
        line-height: 1.12 !important;
      }

      #scicanvasTour.open .tour-text {
        font-size: 15px !important;
        line-height: 1.45 !important;
      }

      #scicanvasTour.open .tour-actions {
        margin-right: -15px !important;
        margin-left: -15px !important;
        padding-right: 15px !important;
        padding-left: 15px !important;
      }
    }

    @media (max-width: 360px) {
      #scicanvasTour.open .tour-actions {
        grid-template-columns: 1fr 1fr !important;
      }

      #scicanvasTour.open .tour-actions [data-tour="close"] {
        grid-column: 1 / -1 !important;
        order: 3 !important;
      }
    }

    @media (orientation: landscape) and (max-height: 520px) {
      #scicanvasTour.open .tour-card {
        right: max(8px, env(safe-area-inset-right)) !important;
        bottom: max(8px, env(safe-area-inset-bottom)) !important;
        left: max(8px, env(safe-area-inset-left)) !important;
        max-height: calc(var(--figureloom-tour-viewport-height, 100dvh) - 16px - env(safe-area-inset-top) - env(safe-area-inset-bottom)) !important;
        padding-top: 12px !important;
      }

      #scicanvasTour.open .tour-progress-bar {
        margin: 6px 0 9px !important;
      }

      #scicanvasTour.open h2 {
        margin-bottom: 5px !important;
        font-size: 20px !important;
      }

      #scicanvasTour.open .tour-passive-note {
        margin-top: 6px !important;
      }

      #scicanvasTour.open .tour-actions {
        margin-top: 10px !important;
        padding-top: 8px !important;
        padding-bottom: max(8px, env(safe-area-inset-bottom)) !important;
      }
    }
  `;
  document.head.appendChild(style);

  function syncViewport() {
    const viewport = window.visualViewport;
    const height = Math.max(240, Math.round(viewport?.height || window.innerHeight || document.documentElement.clientHeight));
    const top = Math.max(0, Math.round(viewport?.offsetTop || 0));
    root.style.setProperty('--figureloom-tour-viewport-height', `${height}px`);
    root.style.setProperty('--figureloom-tour-viewport-top', `${top}px`);
  }

  function syncOpenState() {
    const tour = document.getElementById('scicanvasTour');
    const open = Boolean(tour?.classList.contains('open'));
    root.classList.toggle('figureloom-tour-open', open);
    if (!open) return;
    syncViewport();
    const actions = tour.querySelector('.tour-actions');
    actions?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }

  function observeTour() {
    const existing = document.getElementById('scicanvasTour');
    if (existing && existing.dataset.figureloomMobileSafeObserved !== '1') {
      existing.dataset.figureloomMobileSafeObserved = '1';
      new MutationObserver(syncOpenState).observe(existing, { attributes: true, attributeFilter: ['class'] });
      syncOpenState();
    }
  }

  function init() {
    syncViewport();
    observeTour();
    new MutationObserver(observeTour).observe(document.body, { childList: true, subtree: true });
    window.visualViewport?.addEventListener('resize', syncViewport, { passive: true });
    window.visualViewport?.addEventListener('scroll', syncViewport, { passive: true });
    window.addEventListener('resize', syncViewport, { passive: true });
    window.addEventListener('orientationchange', () => setTimeout(syncViewport, 120), { passive: true });
    window.FigureLoomTourMobileSafe = Object.freeze({ syncViewport, syncOpenState });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();