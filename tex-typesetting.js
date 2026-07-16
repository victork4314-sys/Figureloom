(() => {
  if (typeof createDrawer !== 'function') return;

  const MATHJAX_URL = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js';
  let mathJaxPromise = null;
  const drawer = createDrawer('texTypesettingDrawer', 'TeX typesetting', 'Render publication-quality mathematics as editable vector objects');
  drawer.classList.add('tex-typesetting-drawer');
  const body = drawer.querySelector('.utility-body');
  body.innerHTML = `
    <div class="tex-hero"><span>∫</span><div><strong>TeX → embedded SVG</strong><small>The source remains editable; the rendered equation stays vector in the project.</small></div></div>
    <label>TeX source <textarea id="texSource" rows="6" spellcheck="false" placeholder="E = mc^2"></textarea></label>
    <div class="tex-options"><label><input id="texDisplayMode" type="checkbox" checked> Display equation</label><label>Color <input id="texColor" type="color" value="#172033"></label></div>
    <div class="tex-actions"><button id="texInsert" type="button" class="primary">Insert equation</button><button id="texUpdate" type="button">Update selected equation</button></div>
    <div class="tex-examples"><button type="button" data-tex="\\frac{\\partial C}{\\partial t}=D\\nabla^2C-kC">Diffusion</button><button type="button" data-tex="\\Delta G=\\Delta H-T\\Delta S">Thermodynamics</button><button type="button" data-tex="y=\\beta_0+\\beta_1x+\\varepsilon">Regression</button><button type="button" data-tex="\\mathrm{A}+\\mathrm{B}\\rightleftharpoons\\mathrm{C}">Reaction</button></div>
    <p id="texStatus" class="tex-status">MathJax loads only when an equation is rendered. Once loaded, equations are stored inside the project as SVG.</p>
  `;

  const q = selector => drawer.querySelector(selector);

  function selectedLatex() {
    const item = typeof selectedObject === 'function' ? selectedObject() : null;
    return item?.type === 'latex' ? item : null;
  }

  function status(text, kind = '') {
    q('#texStatus').textContent = text;
    q('#texStatus').dataset.kind = kind;
  }

  async function loadMathJax() {
    if (window.MathJax?.tex2svgPromise) return window.MathJax;
    if (!mathJaxPromise) {
      mathJaxPromise = new Promise((resolve, reject) => {
        window.MathJax = {
          loader:{ load:['[tex]/ams','[tex]/mhchem'] },
          tex:{ packages:{ '[+]':['ams','mhchem'] }, inlineMath:[['$','$'],['\\(','\\)']] },
          svg:{ fontCache:'none' }, startup:{ typeset:false }
        };
        const script = document.createElement('script');
        script.src = MATHJAX_URL;
        script.async = true;
        script.onload = () => window.MathJax.startup.promise.then(() => resolve(window.MathJax), reject);
        script.onerror = () => reject(new Error('MathJax could not be loaded. Check the internet connection and try again.'));
        document.head.appendChild(script);
      });
    }
    return mathJaxPromise;
  }

  async function renderTex(source, display) {
    const MathJax = await loadMathJax();
    const container = await MathJax.tex2svgPromise(source, { display });
    const svg = container.querySelector('svg');
    if (!svg) throw new Error('MathJax did not return an SVG equation.');
    svg.querySelectorAll('script,foreignObject').forEach(node => node.remove());
    const viewBox = svg.getAttribute('viewBox') || '0 0 1000 200';
    const values = viewBox.split(/[\s,]+/).map(Number);
    return { markup:svg.innerHTML, viewBox, ratio:(values[2] || 1000) / Math.max(1, values[3] || 200) };
  }

  function latexNode(item) {
    const nested = createSvg('svg', {
      width:item.width, height:item.height, viewBox:item.mathViewBox || '0 0 1000 200',
      preserveAspectRatio:'xMidYMid meet', overflow:'visible'
    });
    nested.style.color = item.fill || '#172033';
    const parsed = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${item.mathSvgMarkup || ''}</svg>`, 'image/svg+xml');
    [...parsed.documentElement.childNodes].forEach(child => nested.appendChild(document.importNode(child, true)));
    return nested;
  }

  const baseRenderObject = renderObject;
  renderObject = function renderLatexObject(item) {
    if (item.type !== 'latex') return baseRenderObject(item);
    const group = typeof genericGroup === 'function' ? genericGroup(item) : createSvg('g', {
      class:'canvas-object', 'data-id':item.id, transform:`translate(${item.x} ${item.y})`, opacity:item.opacity ?? 1
    });
    if (item.visible === false) group.style.display = 'none';
    group.appendChild(latexNode(item));
    group.addEventListener('dblclick', event => {
      event.stopPropagation();
      state.selectedId = item.id;
      render();
      openForItem(item);
    });
    return group;
  };

  async function createOrUpdate(update = false) {
    const source = q('#texSource').value.trim();
    if (!source) return status('Enter a TeX expression first.', 'error');
    const target = update ? selectedLatex() : null;
    if (update && !target) return status('Select a TeX equation to update.', 'error');
    try {
      status('Rendering TeX with MathJax…');
      const rendered = await renderTex(source, q('#texDisplayMode').checked);
      pushHistory();
      if (target) {
        target.mathSource = source;
        target.mathDisplay = q('#texDisplayMode').checked;
        target.mathSvgMarkup = rendered.markup;
        target.mathViewBox = rendered.viewBox;
        target.fill = q('#texColor').value;
        target.height = Math.max(42, target.width / rendered.ratio);
      } else {
        const dimensions = window.currentCanvasSize?.() || { width:1200, height:750 };
        const width = Math.min(dimensions.width * .62, Math.max(180, rendered.ratio * 70));
        const item = {
          id:uid(), type:'latex', name:'TeX equation', mathSource:source, mathDisplay:q('#texDisplayMode').checked,
          mathSvgMarkup:rendered.markup, mathViewBox:rendered.viewBox,
          x:(dimensions.width - width) / 2, y:dimensions.height * .38, width, height:Math.max(42,width/rendered.ratio),
          fill:q('#texColor').value, stroke:'none', opacity:1, rotation:0, visible:true,
          metadata:{ source:'MathJax TeX SVG renderer', notes:'Equation source remains editable in SciCanvas.' }
        };
        state.objects.push(item);
        state.selectedId = item.id;
        window.styleNewObjectFromTheme?.(item);
        item.fill = q('#texColor').value;
      }
      window.currentPage?.().objects && (currentPage().objects = state.objects);
      render(); window.renderPages?.(); scheduleSave();
      status(target ? 'Equation updated.' : 'Equation inserted as editable vector artwork.', 'success');
    } catch (error) {
      console.error(error);
      status(error.message, 'error');
    }
  }

  function openForItem(item = selectedLatex()) {
    drawer.classList.add('open');
    if (item) {
      q('#texSource').value = item.mathSource || '';
      q('#texDisplayMode').checked = item.mathDisplay !== false;
      q('#texColor').value = item.fill || '#172033';
    }
    q('#texUpdate').disabled = !item;
  }

  q('#texInsert').addEventListener('click', () => createOrUpdate(false));
  q('#texUpdate').addEventListener('click', () => createOrUpdate(true));
  q('#texSource').addEventListener('input', () => { q('#texUpdate').disabled = !selectedLatex(); });
  drawer.querySelectorAll('[data-tex]').forEach(button => button.addEventListener('click', () => {
    q('#texSource').value = button.dataset.tex;
    q('#texSource').focus();
  }));

  const inspector = document.createElement('section');
  inspector.id = 'latexInspector';
  inspector.className = 'inspector-section';
  inspector.hidden = true;
  inspector.innerHTML = '<h2>TeX equation</h2><button id="editLatexEquation" type="button">Edit TeX source</button><p>Rendered as embedded SVG for publication-quality scaling.</p>';
  document.querySelector('.right-panel')?.appendChild(inspector);
  inspector.querySelector('button')?.addEventListener('click', () => openForItem());
  const baseUpdateInspector = updateInspector;
  updateInspector = function updateInspectorWithLatex() {
    baseUpdateInspector();
    inspector.hidden = !selectedLatex();
    q('#texUpdate').disabled = !selectedLatex();
  };

  const style = document.createElement('style');
  style.textContent = `
    .tex-typesetting-drawer{width:min(720px,calc(100vw - 18px))!important}.tex-hero{display:flex;align-items:center;gap:12px;padding:13px;border:1px solid #cbd9e1;border-radius:12px;background:linear-gradient(135deg,#edf7f6,#f5f1fa)}.tex-hero>span{display:grid;place-items:center;width:44px;height:44px;border-radius:12px;background:linear-gradient(145deg,#4f89a0,#7c6fa6);color:white;font:700 26px Georgia}.tex-hero strong,.tex-hero small{display:block}.tex-hero small{margin-top:4px;color:#6f7e91;font-size:9px}.tex-typesetting-drawer label{display:grid;gap:5px;margin-top:10px;color:#617086;font-size:10px}.tex-typesetting-drawer textarea{border:1px solid #cbd6e1;border-radius:9px;background:white;padding:10px;font-family:'SFMono-Regular',Consolas,monospace;font-size:11px}.tex-options,.tex-actions,.tex-examples{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:9px}.tex-options label{display:flex;align-items:center;gap:6px;margin:0}.tex-actions .primary{background:#4169b7;color:white;border-color:#4169b7}.tex-examples button{font-size:9px}.tex-status{margin:10px 0 0;padding:9px;border-radius:8px;background:#eef4f7;color:#66768a;font-size:9px;line-height:1.45}.tex-status[data-kind="error"]{background:#fff1f0;color:#b42318}.tex-status[data-kind="success"]{background:#eef9f4;color:#28745f}#latexInspector button{width:100%;min-height:36px;border:1px solid #8ba6d7;border-radius:8px;background:#edf4ff;color:#315da6;font-weight:700}#latexInspector p{font-size:9px;color:#708095}`;
  document.head.appendChild(style);

  const register = () => window.SciCanvasPro?.register('typeset', () => openForItem());
  register(); setTimeout(register, 140);
})();
