(() => {
  const TOUR_KEY = 'scicanvas-guided-tour-v2';

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

    if (!localStorage.getItem(TOUR_KEY)) setTimeout(window.openSciCanvasTour, 900);
  }

  const style = document.createElement('style');
  style.textContent = `
    .titlebar{display:grid!important;grid-template-columns:minmax(150px,auto) minmax(180px,1fr) auto!important;align-items:center;gap:10px;min-width:0}
    .brand,.document-title,.title-actions{min-width:0}.document-title{width:100%;max-width:680px;justify-self:center}.document-title input{min-width:0;width:100%;max-width:520px}
    .title-actions{display:flex!important;align-items:center;justify-content:flex-end;gap:6px;flex-wrap:nowrap;overflow:visible!important}.title-actions>button{flex:0 0 auto;min-width:max-content;white-space:nowrap!important}
    #exportButton{display:inline-flex!important;visibility:visible!important;opacity:1!important;position:relative;z-index:3;background:#2563eb!important;color:white!important;border-color:#2563eb!important;font-weight:700}
    #tourHelpButton{width:34px;min-width:34px!important;padding:6px!important;border-radius:50%!important;font-weight:800}
    #dataObjectInspector button{width:100%;min-height:38px;border:1px solid #7b9ce2;border-radius:8px;background:#edf4ff;color:#2454ad;font-weight:700;white-space:normal}#dataObjectInspector p{font-size:10px;line-height:1.4;color:#6b778a}
    #objectQuickMenu [data-action="edit-data"][hidden]{display:none!important}
    #scicanvasTour{position:fixed;inset:0;z-index:1000;display:none;pointer-events:none}#scicanvasTour.open{display:block}.tour-shade{position:absolute;inset:0;background:rgba(15,23,42,.16);pointer-events:none}.tour-highlight{position:fixed;z-index:1;border:3px solid #7ca0ff;border-radius:10px;box-shadow:0 0 0 4px rgba(124,160,255,.2);pointer-events:none;transition:left .12s ease,top .12s ease,width .12s ease,height .12s ease}.tour-card{position:absolute;z-index:2;left:50%;bottom:24px;transform:translateX(-50%);width:min(520px,calc(100vw - 28px));padding:18px;border:1px solid #cbd5e1;border-radius:15px;background:white;box-shadow:0 24px 80px rgba(0,0,0,.28);pointer-events:auto}.tour-card h2{margin:5px 0 7px;font-size:20px;color:#1e293b}.tour-card p{margin:0;color:#56657a;line-height:1.5}.tour-passive-note{margin-top:10px!important;font-size:10px;color:#7a8799!important}.tour-progress{font-size:10px;font-weight:800;color:#5772b8;text-transform:uppercase;letter-spacing:.08em}.tour-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}.tour-actions button{min-height:38px;padding:8px 13px;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc}.tour-actions button:disabled{opacity:.45}.tour-actions .primary{background:#2563eb;border-color:#2563eb;color:white}
    @media(max-width:820px){.titlebar{grid-template-columns:minmax(0,1fr) auto!important}.brand{display:none!important}.document-title{justify-self:stretch}.document-title span{display:none}.title-actions{max-width:48vw;overflow-x:auto!important;scrollbar-width:none}.title-actions::-webkit-scrollbar{display:none}#exportButton{position:sticky;right:0}}
    @media(max-width:520px){.titlebar{gap:6px;padding-left:8px!important;padding-right:8px!important}.document-title input{font-size:13px!important}.title-actions>button{padding:7px 8px!important;font-size:11px!important}.mode-button{display:none!important}#undoButton,#redoButton{min-width:34px!important;font-size:0!important}#undoButton::after{content:'↶';font-size:17px}#redoButton::after{content:'↷';font-size:17px}#exportButton{padding-inline:11px!important}.tour-card{bottom:12px;padding:15px}.tour-actions{flex-wrap:wrap}}
  `;
  document.head.appendChild(style);

  function setup() {
    installDataEditControls();
    createTour();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(setup, 0), { once:true });
  else setTimeout(setup, 0);
})();
