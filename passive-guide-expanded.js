(() => {
  if (window.__figureLoomExpandedPassiveGuide20260720) return;
  window.__figureLoomExpandedPassiveGuide20260720 = true;

  const GUIDE_KEY = 'figureloom-passive-guide-v4';
  const steps = [
    {
      selectors:['.ribbon-tab[data-tab="projects"]','#projectTabRail'],
      title:'Projects and open tabs',
      text:'Create, open, switch, save, disconnect, or close project tabs here. The × beside a title closes only that tab and does not silently delete the project.'
    },
    {
      selectors:['#settingsRibbonButton','[data-phone-action="settings"]'],
      title:'Settings and appearance',
      text:'Choose automatic, desktop and tablet, or phone layout. Light and dark appearance, text sizing, motion, focus, and readability controls also live here.'
    },
    {
      selectors:['.ribbon-tabs','#figureloomPhoneDock'],
      title:'Main workspaces',
      text:'The top tabs organize ordinary editing. On a phone, the bottom dock opens Tools, Pages, Edit, and More without changing the project itself.'
    },
    {
      selectors:['.ribbon','#figureloomPhoneMoreSheet'],
      title:'Tools for the current task',
      text:'Text, shapes, drawing, fonts, arranging, data, review, and other controls appear here according to the active workspace.'
    },
    {
      selectors:['#canvasStage','#canvas'],
      title:'The canvas and real page',
      text:'The page is the export area. Zoom changes only the view. The surrounding workspace is for navigation and should never become extra page area.'
    },
    {
      selectors:['.left-panel','[data-phone-action="pages"]'],
      title:'Pages and layers',
      text:'Switch or reorder pages, select hidden objects, lock layers, change visibility, and move objects forward or backward.'
    },
    {
      selectors:['.canvas-toolbar'],
      title:'Canvas control bar',
      text:'Pages, Hand, zoom, 100 percent, Format, and Navigation stay together here. In desktop mode the whole bar can be dragged, and its existing collapse control still works.'
    },
    {
      selectors:['.right-panel','[data-phone-action="edit"]'],
      title:'Inspector',
      text:'Exact position, size, color, opacity, text, image, chart, metadata, and accessibility controls appear here for the selected object.'
    },
    {
      selectors:['#proToolsButton','[data-phone-action="protools"]'],
      title:'Pro Tools',
      text:'Advanced arranging, data, annotations, components, review, publication checks, office tools, recovery, and specialist science tools stay in one focused hub.'
    },
    {
      selectors:['.figure-assistant-button','[data-phone-action="loomy"]'],
      title:'Loomy',
      text:'Loomy can assemble an editable first draft from a description. It is optional, and the ordinary editor continues to work without it.'
    },
    {
      selectors:['#collaborateRibbonButton','[data-phone-action="share"]'],
      title:'Share and collaboration',
      text:'Open sharing, presence, review, and collaboration controls here. Local projects remain local unless you deliberately save or share them.'
    },
    {
      selectors:['#tourHelpButton','[data-phone-action="guide"]'],
      title:'Help and manuals',
      text:'Help opens the manual, quick task guides, the visual interface guide, and this passive tour without closing the current project.'
    },
    {
      selectors:['#exportButton'],
      title:'Export and backup',
      text:'Export the finished work and keep a complete editable project backup for anything important. The export control stays close at hand in every interface mode.'
    }
  ];

  const visibleTarget = step => {
    for (const selector of step.selectors) {
      const nodes = [...document.querySelectorAll(selector)];
      const visible = nodes.find(node => {
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 2 && rect.height > 2 && rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth;
      });
      if (visible) return visible;
    }
    return null;
  };

  function installStyle() {
    if (document.getElementById('figureloomExpandedPassiveGuideStyle')) return;
    const style = document.createElement('style');
    style.id = 'figureloomExpandedPassiveGuideStyle';
    style.textContent = `
      #scicanvasTour{position:fixed;inset:0;z-index:2147481900;display:none;pointer-events:none;color:var(--figureloom-ui-text,#172321)}
      #scicanvasTour.open{display:block}
      #scicanvasTour .tour-shade{position:absolute;inset:0;background:rgba(8,18,16,.22);pointer-events:none}
      #scicanvasTour .tour-highlight{position:fixed;z-index:1;border:3px solid var(--figureloom-ui-accent,#2f7468);border-radius:12px;box-shadow:0 0 0 5px color-mix(in srgb,var(--figureloom-ui-accent,#2f7468) 22%,transparent);pointer-events:none;transition:left .12s ease,top .12s ease,width .12s ease,height .12s ease}
      #scicanvasTour .tour-card{position:absolute;z-index:2;left:50%;bottom:calc(22px + env(safe-area-inset-bottom));transform:translateX(-50%);width:min(560px,calc(100vw - 28px));max-height:min(430px,calc(100dvh - 36px - env(safe-area-inset-top) - env(safe-area-inset-bottom)));overflow:auto;padding:18px;border:1px solid var(--figureloom-ui-line,#cddbd7);border-radius:16px;background:var(--figureloom-ui-surface,#fff);box-shadow:0 24px 80px var(--figureloom-ui-shadow,rgba(12,46,40,.28));pointer-events:auto}
      #scicanvasTour.guide-card-top .tour-card{top:calc(18px + env(safe-area-inset-top));bottom:auto}
      #scicanvasTour .tour-card h2{margin:5px 0 7px;color:var(--figureloom-ui-text,#172321);font-size:20px;line-height:1.2}
      #scicanvasTour .tour-card p{margin:0;color:var(--figureloom-ui-muted,#60706c);font-size:12px;line-height:1.5}
      #scicanvasTour .tour-passive-note{margin-top:10px!important;font-size:10px!important}
      #scicanvasTour .tour-progress{color:var(--figureloom-ui-accent-strong,#195c51);font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
      #scicanvasTour .tour-actions{position:sticky;bottom:-18px;display:flex;justify-content:flex-end;gap:8px;margin:16px -18px -18px;padding:12px 18px calc(12px + env(safe-area-inset-bottom));border-top:1px solid var(--figureloom-ui-line,#cddbd7);background:var(--figureloom-ui-surface,#fff)}
      #scicanvasTour .tour-actions button{min-height:38px;padding:8px 13px;border:1px solid var(--figureloom-ui-line,#cddbd7);border-radius:8px;background:var(--figureloom-ui-soft,#edf3f1);color:var(--figureloom-ui-text,#172321)}
      #scicanvasTour .tour-actions button:disabled{opacity:.45}
      #scicanvasTour .tour-actions .primary{border-color:var(--figureloom-ui-accent,#2f7468);background:var(--figureloom-ui-accent,#2f7468);color:#fff}
      @media(max-width:520px){
        #scicanvasTour .tour-card,#scicanvasTour.guide-card-top .tour-card{top:auto;right:8px;bottom:calc(82px + env(safe-area-inset-bottom));left:8px;width:auto;max-height:calc(100dvh - 116px - env(safe-area-inset-top) - env(safe-area-inset-bottom));transform:none;padding:15px}
        #scicanvasTour .tour-card h2{font-size:17px}
        #scicanvasTour .tour-actions{bottom:-15px;margin:14px -15px -15px;padding:10px 15px calc(10px + env(safe-area-inset-bottom));flex-wrap:wrap}
      }
      @media(prefers-reduced-motion:reduce){#scicanvasTour .tour-highlight{transition:none}}
    `;
    document.head.appendChild(style);
  }

  function buildGuide() {
    const old = document.getElementById('scicanvasTour');
    if (old?.dataset.figureloomExpandedGuide === '1') return old;
    old?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'scicanvasTour';
    overlay.dataset.figureloomExpandedGuide = '1';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `
      <div class="tour-shade"></div>
      <div class="tour-highlight" aria-hidden="true"></div>
      <div class="tour-card" role="dialog" aria-modal="false" aria-labelledby="tourTitle" aria-describedby="tourText">
        <div class="tour-progress"></div>
        <h2 id="tourTitle"></h2>
        <p id="tourText"></p>
        <p class="tour-passive-note">This guide only points things out. It never opens panels, moves objects, changes selections, or scrolls your project.</p>
        <div class="tour-actions"><button data-tour="skip" type="button">Close</button><button data-tour="back" type="button">Back</button><button data-tour="next" class="primary" type="button">Next</button></div>
      </div>`;
    document.body.appendChild(overlay);
    return overlay;
  }

  let index = 0;
  let overlay = null;

  function position(step) {
    const highlight = overlay.querySelector('.tour-highlight');
    const target = visibleTarget(step);
    if (!target) {
      highlight.hidden = true;
      overlay.classList.remove('guide-card-top');
      return;
    }
    const rect = target.getBoundingClientRect();
    const padding = 6;
    const left = Math.max(4, rect.left - padding);
    const top = Math.max(4, rect.top - padding);
    highlight.hidden = false;
    highlight.style.left = `${left}px`;
    highlight.style.top = `${top}px`;
    highlight.style.width = `${Math.max(2, Math.min(innerWidth - left - 4, rect.width + padding * 2))}px`;
    highlight.style.height = `${Math.max(2, Math.min(innerHeight - top - 4, rect.height + padding * 2))}px`;
    overlay.classList.toggle('guide-card-top', rect.top < innerHeight * .58 && rect.bottom > innerHeight * .44);
  }

  function show() {
    const step = steps[index];
    overlay.querySelector('#tourTitle').textContent = step.title;
    overlay.querySelector('#tourText').textContent = step.text;
    overlay.querySelector('.tour-progress').textContent = `${index + 1} of ${steps.length}`;
    overlay.querySelector('[data-tour="back"]').disabled = index === 0;
    overlay.querySelector('[data-tour="next"]').textContent = index === steps.length - 1 ? 'Done' : 'Next';
    position(step);
  }

  function close({ remember = true } = {}) {
    if (!overlay) return;
    overlay.classList.remove('open','guide-card-top');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.querySelector('.tour-highlight').hidden = true;
    if (remember) {
      try { localStorage.setItem(GUIDE_KEY, 'complete'); } catch {}
    }
  }

  function open() {
    installStyle();
    overlay = buildGuide();
    index = 0;
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    show();
    requestAnimationFrame(() => overlay.querySelector('[data-tour="next"]')?.focus({ preventScroll:true }));
  }

  function install() {
    installStyle();
    overlay = buildGuide();
    overlay.querySelector('[data-tour="skip"]').addEventListener('click', () => close());
    overlay.querySelector('[data-tour="back"]').addEventListener('click', () => {
      if (index > 0) index -= 1;
      show();
    });
    overlay.querySelector('[data-tour="next"]').addEventListener('click', () => {
      if (index >= steps.length - 1) return close();
      index += 1;
      show();
    });
    addEventListener('resize', () => {
      if (overlay.classList.contains('open')) position(steps[index]);
    }, { passive:true });
    addEventListener('orientationchange', () => setTimeout(() => {
      if (overlay.classList.contains('open')) position(steps[index]);
    }, 120));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && overlay.classList.contains('open')) close();
    });
    window.openSciCanvasTour = open;
    window.FigureLoomPassiveGuide = Object.freeze({ open, close, steps:steps.length });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once:true });
  else install();
})();
