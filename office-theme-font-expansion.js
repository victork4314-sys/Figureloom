(() => {
  if (window.__figureLoomOfficeThemeFontExpansionV1) return;
  window.__figureLoomOfficeThemeFontExpansionV1 = true;

  const OFFICE_FONTS = [
    { family:'Carlito', category:'Sans · office' },
    { family:'Lato', category:'Sans · office' },
    { family:'Source Sans 3', category:'Sans · editorial' },
    { family:'Noto Sans', category:'Sans · international' },
    { family:'Manrope', category:'Sans · modern' },
    { family:'IBM Plex Sans', category:'Sans · technical' },
    { family:'Caladea', category:'Serif · office' },
    { family:'Merriweather', category:'Serif · readable' },
    { family:'Libre Baskerville', category:'Serif · editorial' },
    { family:'IBM Plex Serif', category:'Serif · technical' },
    { family:'Roboto Slab', category:'Slab serif' },
    { family:'JetBrains Mono', category:'Mono · code' },
    { family:'IBM Plex Mono', category:'Mono · technical' },
    { family:'Source Code Pro', category:'Mono · code' }
  ];

  const OFFICE_STYLES = [
    { id:'office-neutrals', name:'Office Neutrals', description:'White, warm gray, slate, and quiet blue', accent:'#526b7a', accent2:'#7a8f88', page:{mode:'solid',primary:'#fbfbfa',secondary:'#f0f1ef',angle:135}, palette:['#dfe4e3','#c8d0d2','#9eabb0','#75858b','#b7afa4'], text:'#263137', stroke:'#536167' },
    { id:'executive-navy', name:'Executive Navy', description:'Clean navy, steel blue, linen, and muted gold', accent:'#244a6a', accent2:'#9a7a3d', page:{mode:'solid',primary:'#fffefd',secondary:'#edf1f4',angle:135}, palette:['#355e7d','#6f8798','#a9b6bf','#d9d2c4','#b99558'], text:'#182c3b', stroke:'#405565' },
    { id:'warm-office', name:'Warm Office', description:'Cream, taupe, charcoal, and restrained terracotta', accent:'#705f52', accent2:'#a7654f', page:{mode:'gradient',primary:'#fffdf8',secondary:'#eee7dc',angle:135}, palette:['#c9bdae','#a69787','#786e65','#d7c9b5','#bd8068'], text:'#3a342f', stroke:'#62594f' },
    { id:'slate-sand', name:'Slate + Sand', description:'Cool slate balanced with paper and sandstone', accent:'#526272', accent2:'#a17d57', page:{mode:'gradient',primary:'#fbfaf7',secondary:'#e7e5df',angle:135}, palette:['#70808f','#aeb7bf','#d5d4ce','#c4a985','#92775c'], text:'#2a333b', stroke:'#59636c' },
    { id:'sage-studio', name:'Sage Studio', description:'Soft sage, olive gray, clay, and natural paper', accent:'#5e7568', accent2:'#a56f5e', page:{mode:'solid',primary:'#fdfdf9',secondary:'#e9eee8',angle:135}, palette:['#8fa397','#bdc8bf','#d9d5c7','#b88b78','#778174'], text:'#29342e', stroke:'#536158' },
    { id:'monochrome-report', name:'Monochrome Report', description:'Ink, graphite, silver, and white for formal reports', accent:'#30363b', accent2:'#71777c', page:{mode:'solid',primary:'#ffffff',secondary:'#eeeeee',angle:135}, palette:['#1f2428','#555b60','#8a9095','#bcc0c3','#e1e3e4'], text:'#171a1d', stroke:'#444a4f' },
    { id:'linen-burgundy', name:'Linen + Burgundy', description:'Warm linen with burgundy and muted rose accents', accent:'#713d4b', accent2:'#a77a68', page:{mode:'gradient',primary:'#fffdf9',secondary:'#eee5dc',angle:135}, palette:['#824b58','#a66d76','#c7a3a0','#d8c7b8','#987d6c'], text:'#3d2930', stroke:'#664d55' },
    { id:'accessible-office', name:'Accessible Office', description:'High-contrast navy, teal, orange, and clear neutrals', accent:'#164e73', accent2:'#b45309', page:{mode:'solid',primary:'#ffffff',secondary:'#edf3f5',angle:135}, palette:['#176b87','#258277','#c56a13','#7a5a96','#66737d'], text:'#102f43', stroke:'#294c5d' }
  ];

  const loadedFonts = new Set();
  let fontGrid = null;
  let styleGrid = null;

  function familyStack(entry) {
    const fallback = entry.category.startsWith('Serif') || entry.category.startsWith('Slab') ? 'serif' : entry.category.startsWith('Mono') ? 'monospace' : 'sans-serif';
    return `"${entry.family}", ${fallback}`;
  }

  function familyFromStack(stack = '') {
    return String(stack).split(',')[0].trim().replace(/^['"]|['"]$/g, '');
  }

  function officeFont(family) {
    return OFFICE_FONTS.find(entry => entry.family === family);
  }

  function loadFont(family) {
    if (!officeFont(family) || loadedFonts.has(family)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}&display=swap`;
    link.dataset.figureloomOfficeFont = family;
    document.head.appendChild(link);
    loadedFonts.add(family);
  }

  function ensureFontOptions() {
    if (typeof textControls === 'undefined' || !textControls?.family) return false;
    const select = textControls.family;
    let group = [...select.querySelectorAll('optgroup')].find(item => item.label === 'Office & editorial');
    if (!group) {
      group = document.createElement('optgroup');
      group.label = 'Office & editorial';
      select.appendChild(group);
    }
    OFFICE_FONTS.forEach(entry => {
      const stack = familyStack(entry);
      if ([...select.options].some(option => option.value === stack)) return;
      group.appendChild(new Option(entry.family, stack));
    });
    return true;
  }

  function applyFont(entry) {
    loadFont(entry.family);
    pushHistory();
    const stack = familyStack(entry);
    const applyAll = document.getElementById('applyFontToAll')?.checked;
    const pages = Array.isArray(state.pages) && state.pages.length ? state.pages : [{ objects:state.objects }];
    if (applyAll) {
      pages.forEach(page => (page.objects || []).filter(item => item.type === 'text').forEach(item => { item.fontFamily = stack; }));
      state.defaultFont = entry.family;
    } else {
      const item = typeof selectedObject === 'function' ? selectedObject() : null;
      if (item?.type === 'text') item.fontFamily = stack;
      else state.defaultFont = entry.family;
    }
    ensureFontOptions();
    if (textControls?.family) textControls.family.value = stack;
    render();
    scheduleSave();
    drawFontCards();
  }

  function drawFontCards() {
    if (!fontGrid) return;
    fontGrid.replaceChildren();
    OFFICE_FONTS.forEach(entry => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `font-card${entry.family === state.defaultFont ? ' default' : ''}`;
      button.style.fontFamily = familyStack(entry);
      button.innerHTML = `<strong>${entry.family}</strong><span>Ag DNA RNA 0123</span><small>${entry.category}</small>`;
      button.addEventListener('mouseenter', () => loadFont(entry.family));
      button.addEventListener('focus', () => loadFont(entry.family));
      button.addEventListener('click', () => applyFont(entry));
      fontGrid.appendChild(button);
    });
  }

  function addFontPanel() {
    const drawer = document.getElementById('fontLibraryDrawer');
    const body = drawer?.querySelector('.utility-body');
    const mainGrid = drawer?.querySelector('#fontGrid');
    if (!body || !mainGrid) return false;
    let panel = body.querySelector('.office-font-library');
    if (!panel) {
      panel = document.createElement('section');
      panel.className = 'office-font-library';
      panel.innerHTML = '<div class="extra-library-heading"><strong>Office & editorial fonts</strong><span>14 additional families for reports, posters, and presentations</span></div><div class="font-grid office-font-grid"></div>';
      const extra = body.querySelector('.extra-font-library');
      (extra || mainGrid).insertAdjacentElement(extra ? 'afterend' : 'beforebegin', panel);
    }
    fontGrid = panel.querySelector('.office-font-grid');
    ensureFontOptions();
    drawFontCards();
    return true;
  }

  function styleById(id) {
    return OFFICE_STYLES.find(style => style.id === id);
  }

  function colorItem(item, style, index) {
    if (!item || item.type === 'image') return;
    if (item.type === 'svg' && item.svgColorMode !== 'recolor') return;
    if (item.type === 'text') {
      item.fill = style.text;
      item.stroke = style.stroke;
    } else if (['arrow','inhibition','connector'].includes(item.type)) {
      item.fill = index % 2 ? style.accent2 : style.accent;
      item.stroke = style.stroke;
    } else {
      item.fill = style.palette[index % style.palette.length];
      item.stroke = style.stroke;
    }
  }

  function applyCurrentStyleToItem(item) {
    const style = styleById(state.officeStylePack);
    if (!style || !item) return;
    colorItem(item, style, Math.max(0, state.objects.indexOf(item)));
  }

  function applyStyle(style) {
    pushHistory();
    state.officeStylePack = style.id;
    state.libraryStylePack = null;
    const pages = Array.isArray(state.pages) && state.pages.length ? state.pages : [{ objects:state.objects }];
    pages.forEach(page => {
      page.background = structuredClone(style.page);
      (page.objects || []).forEach((item, index) => colorItem(item, style, index));
    });
    render();
    renderPages?.();
    window.applyPageBackground?.();
    scheduleSave();
    drawStyleCards();
  }

  function drawStyleCards() {
    if (!styleGrid) return;
    styleGrid.replaceChildren();
    OFFICE_STYLES.forEach(style => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `theme-card${state.officeStylePack === style.id ? ' active' : ''}`;
      button.dataset.officeStyle = style.id;
      const colors = [style.accent, ...style.palette.slice(0, 4)];
      button.innerHTML = `<span class="theme-stripes">${colors.map(color => `<i style="background:${color}"></i>`).join('')}</span><span><strong>${style.name}</strong><small>${style.description}</small></span>`;
      button.addEventListener('click', () => applyStyle(style));
      styleGrid.appendChild(button);
    });
  }

  function addStylePanel() {
    const drawer = document.getElementById('designDrawer');
    const body = drawer?.querySelector('.utility-body');
    if (!body) return false;
    let panel = body.querySelector('.office-style-library');
    if (!panel) {
      panel = document.createElement('section');
      panel.className = 'project-theme-panel office-style-library';
      panel.innerHTML = '<h3>Office & neutral themes</h3><p>Eight polished systems for reports, presentations, administrative documents, and restrained scientific figures.</p><div class="theme-grid office-style-grid"></div>';
      const extra = body.querySelector('.extra-style-library');
      if (extra) extra.insertAdjacentElement('afterend', panel);
      else body.prepend(panel);
      body.addEventListener('click', event => {
        const card = event.target.closest('.theme-card');
        if (!card || card.closest('.office-style-library')) return;
        state.officeStylePack = null;
        drawStyleCards();
      }, true);
    }
    styleGrid = panel.querySelector('.office-style-grid');
    drawStyleCards();
    return true;
  }

  function wrapCreationFunctions() {
    if (window.__figureLoomOfficeStyleCreationWrapped) return;
    window.__figureLoomOfficeStyleCreationWrapped = true;
    ['makeObject','addScienceAsset','addSpecialObject'].forEach(name => {
      const base = window[name];
      if (typeof base !== 'function') return;
      window[name] = function officeStyledCreation(...args) {
        const result = base.apply(this, args);
        applyCurrentStyleToItem(typeof selectedObject === 'function' ? selectedObject() : null);
        render();
        scheduleSave();
        return result;
      };
    });
    const baseThemeStyle = window.styleNewObjectFromTheme;
    window.styleNewObjectFromTheme = item => {
      baseThemeStyle?.(item);
      applyCurrentStyleToItem(item);
    };
  }

  function wrapPersistence() {
    if (window.__figureLoomOfficeStylePersistenceWrapped) return;
    window.__figureLoomOfficeStylePersistenceWrapped = true;
    if (typeof snapshot === 'function') {
      const base = snapshot;
      snapshot = function snapshotWithOfficeStyle() {
        const data = JSON.parse(base());
        data.officeStylePack = state.officeStylePack || null;
        return JSON.stringify(data);
      };
    }
    if (typeof projectData === 'function') {
      const base = projectData;
      projectData = function projectDataWithOfficeStyle() {
        return { ...base(), officeStylePack:state.officeStylePack || null };
      };
    }
    if (typeof restore === 'function') {
      const base = restore;
      restore = function restoreWithOfficeStyle(serialized) {
        const data = typeof serialized === 'string' ? JSON.parse(serialized) : serialized;
        state.officeStylePack = data?.officeStylePack || null;
        const result = base(data);
        setTimeout(() => {
          ensureFontOptions();
          const families = new Set([state.defaultFont]);
          const pages = Array.isArray(state.pages) && state.pages.length ? state.pages : [{ objects:state.objects }];
          pages.forEach(page => (page.objects || []).filter(item => item.type === 'text').forEach(item => families.add(familyFromStack(item.fontFamily))));
          families.forEach(loadFont);
          drawFontCards();
          drawStyleCards();
        }, 0);
        return result;
      };
    }
  }

  const style = document.createElement('style');
  style.id = 'figureloomOfficeThemeFontExpansionStyle';
  style.textContent = `
    .office-font-library{margin-bottom:12px}
    .office-style-library{padding-top:12px}
    .office-font-library .font-card strong,.office-font-library .font-card span,.office-font-library .font-card small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  `;
  document.head.appendChild(style);

  function initialize() {
    const fontsReady = addFontPanel();
    const stylesReady = addStylePanel();
    if (!fontsReady || !stylesReady) return false;
    wrapCreationFunctions();
    wrapPersistence();
    ensureFontOptions();
    return true;
  }

  if (!initialize()) {
    const observer = new MutationObserver(() => {
      if (initialize()) observer.disconnect();
    });
    observer.observe(document.body, { childList:true, subtree:true });
    setTimeout(() => observer.disconnect(), 10000);
  }
})();