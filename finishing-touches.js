(() => {
  const TOUR_KEY = 'scicanvas-guided-tour-v1';

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
    { selector:'.ribbon-tabs', title:'The main sections', text:'Insert adds objects and files, Science opens the illustration library, Design controls the canvas, and Data and Review contain specialist tools.' },
    { selector:'#canvasStage', title:'Your canvas', text:'Pinch with two fingers to zoom. Use the Hand tool or hold Space to move around large posters.' },
    { selector:'.left-panel', title:'Pages and layers', text:'Switch pages, reorder layers, hide items, and drag objects between your workflow using copy and paste.' },
    { selector:'.right-panel', title:'Selection controls', text:'Position, size, colors, metadata, and context-specific controls appear here when an object is selected.' },
    { selector:'#proToolsButton', fallback:'.title-actions', title:'Pro tools', text:'Advanced arranging, charts, annotations, components, review, accessibility, and publication checks stay inside one focused hub.' },
    { selector:'#exportButton', title:'Export and backup', text:'Export SVG, PNG, PowerPoint, or the complete editable project. The Export button always stays visible in the top bar.' }
  ];

  function createTour() {
    if (document.getElementById('scicanvasTour')) return;
    const overlay = document.createElement('div');
    overlay.id = 'scicanvasTour';
    overlay.innerHTML = `
      <div class="tour-shade"></div>
      <div class="tour-card" role="dialog" aria-modal="true" aria-labelledby="tourTitle">
        <div class="tour-progress"></div>
        <h2 id="tourTitle"></h2>
        <p id="tourText"></p>
        <div class="tour-actions"><button data-tour="skip" type="button">Skip tour</button><button data-tour="next" class="primary" type="button">Next</button></div>
      </div>`;
    document.body.appendChild(overlay);
    let index = 0;
    let highlighted = null;

    function targetFor(step) {
      return document.querySelector(step.selector) || (step.fallback ? document.querySelector(step.fallback) : null);
    }
    function clearHighlight() {
      highlighted?.classList.remove('tour-target');
      highlighted = null;
    }
    function finish() {
      clearHighlight();
      overlay.classList.remove('open');
      localStorage.setItem(TOUR_KEY, '1');
    }
    function show() {
      clearHighlight();
      const step = tourSteps[index];
      const target = targetFor(step);
      if (target) {
        highlighted = target;
        target.classList.add('tour-target');
        target.scrollIntoView?.({ block:'nearest', inline:'nearest' });
      }
      overlay.querySelector('#tourTitle').textContent = step.title;
      overlay.querySelector('#tourText').textContent = step.text;
      overlay.querySelector('.tour-progress').textContent = `${index + 1} of ${tourSteps.length}`;
      overlay.querySelector('[data-tour="next"]').textContent = index === tourSteps.length - 1 ? 'Start creating' : 'Next';
    }
    overlay.querySelector('[data-tour="skip"]').addEventListener('click', finish);
    overlay.querySelector('[data-tour="next"]').addEventListener('click', () => {
      if (index >= tourSteps.length - 1) return finish();
      index += 1;
      show();
    });
    window.openSciCanvasTour = () => { index = 0; overlay.classList.add('open'); show(); };

    const help = document.createElement('button');
    help.id = 'tourHelpButton';
    help.type = 'button';
    help.textContent = '?';
    help.title = 'Show the SciCanvas tour';
    help.addEventListener('click', window.openSciCanvasTour);
    document.querySelector('.title-actions')?.prepend(help);

    if (!localStorage.getItem(TOUR_KEY)) setTimeout(window.openSciCanvasTour, 700);
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
    #scicanvasTour{position:fixed;inset:0;z-index:1000;display:none;pointer-events:none}#scicanvasTour.open{display:block}.tour-shade{position:absolute;inset:0;background:rgba(15,23,42,.58);pointer-events:auto}.tour-card{position:absolute;z-index:2;left:50%;bottom:24px;transform:translateX(-50%);width:min(520px,calc(100vw - 28px));padding:18px;border:1px solid #cbd5e1;border-radius:15px;background:white;box-shadow:0 24px 80px rgba(0,0,0,.34);pointer-events:auto}.tour-card h2{margin:5px 0 7px;font-size:20px;color:#1e293b}.tour-card p{margin:0;color:#56657a;line-height:1.5}.tour-progress{font-size:10px;font-weight:800;color:#5772b8;text-transform:uppercase;letter-spacing:.08em}.tour-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}.tour-actions button{min-height:38px;padding:8px 13px;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc}.tour-actions .primary{background:#2563eb;border-color:#2563eb;color:white}.tour-target{position:relative!important;z-index:1001!important;outline:4px solid #7ca0ff!important;outline-offset:4px!important;box-shadow:0 0 0 9999px rgba(15,23,42,.08)!important}
    @media(max-width:820px){.titlebar{grid-template-columns:minmax(0,1fr) auto!important}.brand{display:none!important}.document-title{justify-self:stretch}.document-title span{display:none}.title-actions{max-width:48vw;overflow-x:auto!important;scrollbar-width:none}.title-actions::-webkit-scrollbar{display:none}#exportButton{position:sticky;right:0}}
    @media(max-width:520px){.titlebar{gap:6px;padding-left:8px!important;padding-right:8px!important}.document-title input{font-size:13px!important}.title-actions>button{padding:7px 8px!important;font-size:11px!important}.mode-button{display:none!important}#undoButton,#redoButton{min-width:34px!important;font-size:0!important}#undoButton::after{content:'↶';font-size:17px}#redoButton::after{content:'↷';font-size:17px}#exportButton{padding-inline:11px!important}.tour-card{bottom:12px;padding:15px}}
  `;
  document.head.appendChild(style);

  function setup() {
    installDataEditControls();
    createTour();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(setup, 0), { once:true });
  else setTimeout(setup, 0);
})();
