(() => {
  const TOUR_KEY = 'scicanvas-guided-tour-v2';
  const VM_LOGIN_URL = 'https://vm.figureloom.org';
  const VM_ANON_URL = 'https://vm.figureloom.org/#/cast/figureloom';

  function selectedDataObject() {
    const item = typeof selectedObject === 'function' ? selectedObject() : null;
    return item && (item.type === 'chart' || item.type === 'table') ? item : null;
  }

  function editSelectedDataObject() {
    const item = selectedDataObject();
    if (!item) return;
    const node = document.querySelector(`.canvas-object[data-id="${CSS.escape(item.id)}"]`);
    if (node) node.dispatchEvent(new MouseEvent('dblclick', { bubbles:true, cancelable:true, view:window }));
  }
  window.editSelectedDataObject = editSelectedDataObject;

  function installDataEditControls() {
    const menu = document.getElementById('objectQuickMenu');
    if (menu && !menu.querySelector('[data-action="edit-data"]')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.action = 'edit-data';
      button.title = 'Edit chart or table data';
      button.innerHTML = '<span>▦</span><small>Edit data</small>';
      const design = menu.querySelector('[data-action="design"]');
      menu.insertBefore(button, design || menu.lastElementChild);
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        editSelectedDataObject();
      });
    }

    if (!document.getElementById('dataObjectInspector')) {
      const section = document.createElement('section');
      section.id = 'dataObjectInspector';
      section.className = 'inspector-section';
      section.hidden = true;
      section.innerHTML = '<h2>Data object</h2><button id="editSelectedDataButton" type="button">Edit chart or table data</button><p>Change the source data, title, or chart type without rebuilding it.</p>';
      document.querySelector('.right-panel')?.appendChild(section);
      section.querySelector('button')?.addEventListener('click', editSelectedDataObject);

      const baseUpdateInspector = updateInspector;
      updateInspector = function updateInspectorWithDataAction() {
        baseUpdateInspector();
        section.hidden = !selectedDataObject();
      };
      updateInspector();
    }

    const baseRender = render;
    if (!baseRender.__finishingTouchesWrapped) {
      const wrapped = function renderWithDataMenuState() {
        baseRender();
        const dataButton = document.querySelector('#objectQuickMenu [data-action="edit-data"]');
        if (dataButton) dataButton.hidden = !selectedDataObject();
      };
      wrapped.__finishingTouchesWrapped = true;
      render = wrapped;
      render();
    }
  }

  const tourSteps = [
    {
      selector:'.ribbon-tabs',
      title:'The main sections',
      text:'Settings and Projects manage the workspace. Add, Illustrations, Arrange, Style, Charts, and Check organize the normal editing workflow. On a phone, the same sections stay available through the scrollable tabs and bottom dock.'
    },
    {
      selector:'#projectTabRail',
      fallback:'.document-title',
      title:'Project name and open project tabs',
      text:'Rename the current project at the top. Open cloud projects appear as tabs, and each tab has its own close control beside the title. Closing a tab does not silently delete the project.'
    },
    {
      selector:'.ribbon-tab[data-tab="insert"]',
      fallback:'.ribbon-tabs',
      title:'Add objects and files',
      text:'Add opens text, shapes, arrows, connectors, images, files, templates, tables, charts, equations, code windows, and other insertable objects. Illustrations opens the searchable science library.'
    },
    {
      selector:'#canvasStage',
      title:'Your canvas and real page area',
      text:'The page is the exported area. The surrounding workspace is only for navigation. Pinch with two fingers to zoom, and remember that zoom changes the view rather than inventing extra page space.'
    },
    {
      selector:'.canvas-toolbar',
      fallback:'#canvasStage',
      title:'Canvas navigation controls',
      text:'Pages, the Hand tool, zoom, 100 percent, Format, and Navigation stay together in this bar. On supported desktop layouts the complete bar can be dragged to another position or collapsed without changing the figure.'
    },
    {
      selector:'.left-panel',
      fallback:'#figureloomPhoneDock',
      title:'Pages and layers',
      text:'Switch, add, duplicate, delete, and reorder pages here. Layers help select covered objects, change front-to-back order, hide items, and lock them. On a phone, open Pages from the bottom dock.'
    },
    {
      selector:'.right-panel',
      fallback:'#figureloomPhoneDock',
      title:'Selection controls and inspector',
      text:'Position, size, rotation, colors, opacity, text, image, chart, metadata, and accessibility controls appear here when relevant. On a phone, select an object and open Edit.'
    },
    {
      selector:'#proToolsButton',
      fallback:'.title-actions',
      title:'Pro Tools',
      text:'Advanced arranging, data workspaces, annotations, components, review, accessibility, publication checks, office tools, recovery, and advanced science tools stay inside one focused hub.'
    },
    {
      selector:'#figureloomVmButton',
      fallback:'.title-actions',
      title:'FigureLoom Linux VM',
      text:'The VM button opens access links for the hosted FigureLoom Linux desktop. Anonymous users should launch through the public session link. Named users can sign in directly.'
    },
    {
      selector:'#tourHelpButton',
      fallback:'.title-actions',
      title:'Help, manual, and this passive guide',
      text:'Help opens the full manual, quick task guides, visual interface guide, and this tour. In Phone mode, open More and choose Guide. The tour only highlights existing areas and never clicks controls, opens panels, scrolls the project, or changes your work.'
    },
    {
      selector:'#exportButton',
      title:'Export, backup, and final checks',
      text:'Export SVG, PNG, PowerPoint, or a complete editable project backup. Use Check before submission, and keep a downloaded .figureloom backup for work that matters.'
    }
  ];

  function createVMAccessPanel(helpButton = null) {
    if (document.getElementById('figureloomVmButton')) return;
    const actions = document.querySelector('.title-actions');
    if (!actions) return;

    const button = document.createElement('button');
    button.id = 'figureloomVmButton';
    button.type = 'button';
    button.textContent = 'VM';
    button.title = 'Open FigureLoom Linux VM access links';
    if (helpButton?.parentNode === actions) helpButton.after(button);
    else actions.prepend(button);

    const modal = document.createElement('div');
    modal.id = 'figureloomVmPanel';
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = `
      <div class="figureloom-vm-backdrop" data-vm-close></div>
      <section class="figureloom-vm-card" role="dialog" aria-modal="true" aria-labelledby="figureloomVmTitle">
        <button class="figureloom-vm-close" type="button" data-vm-close aria-label="Close VM access">×</button>
        <div class="figureloom-vm-hero">
          <span class="figureloom-vm-mark" aria-hidden="true">VM</span>
          <div><h2 id="figureloomVmTitle">FigureLoom Linux VM</h2><p>Open the hosted Linux desktop for bioinformatics and scientific workflows.</p></div>
        </div>
        <div class="figureloom-vm-grid">
          <article>
            <strong>Public anonymous session</strong>
            <p>Use this when you do not have a named VM account. Please delete the session when finished so the next person is not blocked.</p>
            <a class="figureloom-vm-link figureloom-vm-anon is-disabled" href="${VM_ANON_URL}" target="_blank" rel="noopener">Launch anonymous VM</a>
          </article>
          <article>
            <strong>Named user / key user login</strong>
            <p>Users with a VM account should sign in here. Named users do not need the anonymous queue.</p>
            <a class="figureloom-vm-link" href="${VM_LOGIN_URL}" target="_blank" rel="noopener">Open VM login</a>
          </article>
        </div>
        <div class="figureloom-vm-login-note">
          <strong>Account details</strong>
          <p>Use the VM username and password provided by FigureLoom. Do not use the administrator account for normal VM work.</p>
        </div>
        <label class="figureloom-vm-pledge"><input id="figureloomVmPledge" type="checkbox"> <span>I understand: when I am done, I will use the Kasm menu to <strong>Delete Session</strong> instead of only closing the tab.</span></label>
        <p class="figureloom-vm-footnote">Closing the browser tab can leave the VM running. Deleting the session frees resources for the next user.</p>
      </section>`;
    document.body.appendChild(modal);

    const anonLink = modal.querySelector('.figureloom-vm-anon');
    const pledge = modal.querySelector('#figureloomVmPledge');
    function setOpen(open) {
      modal.classList.toggle('open', open);
      modal.setAttribute('aria-hidden', open ? 'false' : 'true');
      if (open) setTimeout(() => modal.querySelector('#figureloomVmPledge')?.focus({ preventScroll:true }), 30);
    }
    function updateAnonLink() {
      const enabled = Boolean(pledge.checked);
      anonLink.classList.toggle('is-disabled', !enabled);
      anonLink.setAttribute('aria-disabled', enabled ? 'false' : 'true');
      anonLink.tabIndex = enabled ? 0 : -1;
    }
    button.addEventListener('click', () => setOpen(true));
    modal.querySelectorAll('[data-vm-close]').forEach(node => node.addEventListener('click', () => setOpen(false)));
    modal.addEventListener('keydown', event => { if (event.key === 'Escape') setOpen(false); });
    anonLink.addEventListener('click', event => {
      if (!pledge.checked) {
        event.preventDefault();
        pledge.focus({ preventScroll:true });
      }
    });
    pledge.addEventListener('change', updateAnonLink);
    updateAnonLink();
  }

  function createTour() {
    if (document.getElementById('scicanvasTour')) return;
    const overlay = document.createElement('div');
    overlay.id = 'scicanvasTour';
    overlay.innerHTML = `
      <div class="tour-shade"></div>
      <div class="tour-highlight" aria-hidden="true"></div>
      <div class="tour-card" role="dialog" aria-modal="false" aria-labelledby="tourTitle">
        <div class="tour-progress"></div>
        <h2 id="tourTitle"></h2>
        <p id="tourText"></p>
        <p class="tour-passive-note">This tour never opens panels, scrolls the page, or changes your project.</p>
        <div class="tour-actions"><button data-tour="skip" type="button">Close</button><button data-tour="back" type="button">Back</button><button data-tour="next" class="primary" type="button">Next</button></div>
      </div>`;
    document.body.appendChild(overlay);
    let index = 0;
    const highlight = overlay.querySelector('.tour-highlight');

    function targetFor(step) {
      return document.querySelector(step.selector) || (step.fallback ? document.querySelector(step.fallback) : null);
    }
    function positionHighlight(target) {
      if (!target) {
        highlight.hidden = true;
        return;
      }
      const rect = target.getBoundingClientRect();
      const visible = rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth;
      if (!visible || rect.width < 2 || rect.height < 2) {
        highlight.hidden = true;
        return;
      }
      highlight.hidden = false;
      const padding = 5;
      highlight.style.left = `${Math.max(4, rect.left - padding)}px`;
      highlight.style.top = `${Math.max(4, rect.top - padding)}px`;
      highlight.style.width = `${Math.min(window.innerWidth - Math.max(4, rect.left - padding) - 4, rect.width + padding * 2)}px`;
      highlight.style.height = `${Math.min(window.innerHeight - Math.max(4, rect.top - padding) - 4, rect.height + padding * 2)}px`;
    }
    function finish() {
      overlay.classList.remove('open');
      highlight.hidden = true;
      localStorage.setItem(TOUR_KEY, '1');
    }
    function show() {
      const step = tourSteps[index];
      positionHighlight(targetFor(step));
      overlay.querySelector('#tourTitle').textContent = step.title;
      overlay.querySelector('#tourText').textContent = step.text;
      overlay.querySelector('.tour-progress').textContent = `${index + 1} of ${tourSteps.length}`;
      overlay.querySelector('[data-tour="back"]').disabled = index === 0;
      overlay.querySelector('[data-tour="next"]').textContent = index === tourSteps.length - 1 ? 'Done' : 'Next';
    }
    overlay.querySelector('[data-tour="skip"]').addEventListener('click', finish);
    overlay.querySelector('[data-tour="back"]').addEventListener('click', () => {
      if (index > 0) index -= 1;
      show();
    });
    overlay.querySelector('[data-tour="next"]').addEventListener('click', () => {
      if (index >= tourSteps.length - 1) return finish();
      index += 1;
      show();
    });
    window.openSciCanvasTour = () => {
      index = 0;
      overlay.classList.add('open');
      show();
    };
    window.addEventListener('resize', () => {
      if (overlay.classList.contains('open')) positionHighlight(targetFor(tourSteps[index]));
    }, { passive:true });

    const help = document.createElement('button');
    help.id = 'tourHelpButton';
    help.type = 'button';
    help.textContent = '?';
    help.title = 'Open FigureLoom Help and the passive interface guide';
    help.addEventListener('click', window.openSciCanvasTour);
    document.querySelector('.title-actions')?.prepend(help);
    createVMAccessPanel(help);

    if (!localStorage.getItem(TOUR_KEY)) setTimeout(window.openSciCanvasTour, 900);
  }

  const style = document.createElement('style');
  style.textContent = `
    .titlebar{display:grid!important;grid-template-columns:minmax(150px,auto) minmax(180px,1fr) auto!important;align-items:center;gap:10px;min-width:0}
    .brand,.document-title,.title-actions{min-width:0}.document-title{width:100%;max-width:680px;justify-self:center}.document-title input{min-width:0;width:100%;max-width:520px}
    .title-actions{display:flex!important;align-items:center;justify-content:flex-end;gap:6px;flex-wrap:nowrap;overflow:visible!important}.title-actions>button{flex:0 0 auto;min-width:max-content;white-space:nowrap!important}
    #exportButton{display:inline-flex!important;visibility:visible!important;opacity:1!important;position:relative;z-index:3;background:#2563eb!important;color:white!important;border-color:#2563eb!important;font-weight:700}
    #tourHelpButton{width:34px;min-width:34px!important;padding:6px!important;border-radius:50%!important;font-weight:800}
    #figureloomVmButton{min-width:42px!important;border-color:#77b5a8!important;background:#e9f8f4!important;color:#195c51!important;font-weight:850;letter-spacing:.02em}
    #figureloomVmButton:hover{background:#dff3ee!important;border-color:#4f9f8f!important}
    #dataObjectInspector button{width:100%;min-height:38px;border:1px solid #7b9ce2;border-radius:8px;background:#edf4ff;color:#2454ad;font-weight:700;white-space:normal}#dataObjectInspector p{font-size:10px;line-height:1.4;color:#6b778a}
    #objectQuickMenu [data-action="edit-data"][hidden]{display:none!important}
    #figureloomVmPanel{position:fixed;inset:0;z-index:1100;display:none}#figureloomVmPanel.open{display:block}.figureloom-vm-backdrop{position:absolute;inset:0;background:rgba(15,23,42,.44);backdrop-filter:blur(3px)}.figureloom-vm-card{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(620px,calc(100vw - 24px));max-height:calc(100vh - 28px);overflow:auto;padding:18px;border:1px solid #c9d8de;border-radius:17px;background:#f8fbfa;color:#172321;box-shadow:0 28px 90px rgba(0,0,0,.34)}.figureloom-vm-close{position:absolute;right:12px;top:10px;width:34px;min-width:34px;height:34px;border:1px solid #cddbd7;border-radius:50%;background:#fff;color:#40524e;font-size:20px;font-weight:800}.figureloom-vm-hero{display:grid;grid-template-columns:48px minmax(0,1fr);align-items:center;gap:12px;padding-right:28px}.figureloom-vm-mark{display:grid;place-items:center;width:48px;height:48px;border-radius:14px;background:linear-gradient(145deg,#0c2e28,#25675b);color:#d8fff6;font-size:13px;font-weight:900;letter-spacing:.08em}.figureloom-vm-hero h2{margin:0;color:#142522;font-size:21px}.figureloom-vm-hero p,.figureloom-vm-grid p,.figureloom-vm-login-note p,.figureloom-vm-footnote{margin:5px 0 0;color:#5d6d68;font-size:12px;line-height:1.45}.figureloom-vm-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:15px}.figureloom-vm-grid article,.figureloom-vm-login-note{padding:13px;border:1px solid #d6e3df;border-radius:13px;background:#fff}.figureloom-vm-grid strong,.figureloom-vm-login-note strong{display:block;color:#203833;font-size:13px}.figureloom-vm-link{display:inline-flex;align-items:center;justify-content:center;min-height:38px;margin-top:11px;padding:8px 12px;border:1px solid #1e6f62;border-radius:9px;background:#1f7568;color:#fff!important;font-size:12px;font-weight:800;text-decoration:none}.figureloom-vm-link:hover{background:#195f55}.figureloom-vm-link.is-disabled{cursor:not-allowed;opacity:.48;filter:grayscale(.15)}.figureloom-vm-login-note{margin-top:10px;background:#f1f7f5}.figureloom-vm-pledge{display:flex!important;align-items:flex-start;gap:9px;margin-top:12px;padding:11px;border:1px solid #b9d3cc;border-radius:12px;background:#edf7f4;color:#203833;font-size:12px;line-height:1.45}.figureloom-vm-pledge input{flex:0 0 auto;width:18px;height:18px;margin-top:1px}.figureloom-vm-footnote{font-size:10px;color:#6c7d78}
    #scicanvasTour{position:fixed;inset:0;z-index:1000;display:none;pointer-events:none}#scicanvasTour.open{display:block}.tour-shade{position:absolute;inset:0;background:rgba(15,23,42,.16);pointer-events:none}.tour-highlight{position:fixed;z-index:1;border:3px solid #7ca0ff;border-radius:10px;box-shadow:0 0 0 4px rgba(124,160,255,.2);pointer-events:none;transition:left .12s ease,top .12s ease,width .12s ease,height .12s ease}.tour-card{position:absolute;z-index:2;left:50%;bottom:24px;transform:translateX(-50%);width:min(520px,calc(100vw - 28px));padding:18px;border:1px solid #cbd5e1;border-radius:15px;background:white;box-shadow:0 24px 80px rgba(0,0,0,.28);pointer-events:auto}.tour-card h2{margin:5px 0 7px;font-size:20px;color:#1e293b}.tour-card p{margin:0;color:#56657a;line-height:1.5}.tour-passive-note{margin-top:10px!important;font-size:10px;color:#7a8799!important}.tour-progress{font-size:10px;font-weight:800;color:#5772b8;text-transform:uppercase;letter-spacing:.08em}.tour-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}.tour-actions button{min-height:38px;padding:8px 13px;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc}.tour-actions button:disabled{opacity:.45}.tour-actions .primary{background:#2563eb;border-color:#2563eb;color:white}
    html[data-figureloom-theme="dark"] #figureloomVmButton{border-color:#4d7f75!important;background:#273c38!important;color:#bff1e5!important}html[data-figureloom-theme="dark"] .figureloom-vm-card{border-color:#3d4b49;background:#202827;color:#eef7f4}html[data-figureloom-theme="dark"] .figureloom-vm-close,html[data-figureloom-theme="dark"] .figureloom-vm-grid article{border-color:#485653;background:#2a3331;color:#eef7f4}html[data-figureloom-theme="dark"] .figureloom-vm-hero h2,html[data-figureloom-theme="dark"] .figureloom-vm-grid strong,html[data-figureloom-theme="dark"] .figureloom-vm-login-note strong{color:#eef7f4}html[data-figureloom-theme="dark"] .figureloom-vm-hero p,html[data-figureloom-theme="dark"] .figureloom-vm-grid p,html[data-figureloom-theme="dark"] .figureloom-vm-login-note p,html[data-figureloom-theme="dark"] .figureloom-vm-footnote{color:#aebdb9}html[data-figureloom-theme="dark"] .figureloom-vm-login-note,html[data-figureloom-theme="dark"] .figureloom-vm-pledge{border-color:#4c635d;background:#283531;color:#dcefeb}
    @media(max-width:820px){.titlebar{grid-template-columns:minmax(0,1fr) auto!important}.brand{display:none!important}.document-title{justify-self:stretch}.document-title span{display:none}.title-actions{max-width:48vw;overflow-x:auto!important;scrollbar-width:none}.title-actions::-webkit-scrollbar{display:none}#exportButton{position:sticky;right:0}.figureloom-vm-grid{grid-template-columns:1fr}}
    @media(max-width:520px){.titlebar{gap:6px;padding-left:8px!important;padding-right:8px!important}.document-title input{font-size:13px!important}.title-actions>button{padding:7px 8px!important;font-size:11px!important}.mode-button{display:none!important}#undoButton,#redoButton{min-width:34px!important;font-size:0!important}#undoButton::after{content:'↶';font-size:17px}#redoButton::after{content:'↷';font-size:17px}#exportButton{padding-inline:11px!important}.tour-card{bottom:12px;padding:15px}.tour-actions{flex-wrap:wrap}.figureloom-vm-card{padding:15px}.figureloom-vm-hero{grid-template-columns:40px minmax(0,1fr)}.figureloom-vm-mark{width:40px;height:40px;border-radius:12px}.figureloom-vm-hero h2{font-size:18px}}
  `;
  document.head.appendChild(style);

  function setup() {
    installDataEditControls();
    createTour();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(setup, 0), { once:true });
  else setTimeout(setup, 0);
})();