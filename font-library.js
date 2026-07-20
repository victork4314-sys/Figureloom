(() => {
  const FONT_CATALOG = [
    { family:'Inter', category:'Sans', source:'google' },
    { family:'Roboto', category:'Sans', source:'google' },
    { family:'Open Sans', category:'Sans', source:'google' },
    { family:'Lato', category:'Sans', source:'google' },
    { family:'Montserrat', category:'Sans', source:'google' },
    { family:'Nunito', category:'Sans', source:'google' },
    { family:'Source Sans 3', category:'Sans', source:'google' },
    { family:'Work Sans', category:'Sans', source:'google' },
    { family:'IBM Plex Sans', category:'Sans', source:'google' },
    { family:'Noto Sans', category:'Sans', source:'google' },
    { family:'Manrope', category:'Sans', source:'google' },
    { family:'Space Grotesk', category:'Sans', source:'google' },
    { family:'Raleway', category:'Sans', source:'google' },
    { family:'Quicksand', category:'Sans', source:'google' },
    { family:'Cabin', category:'Sans', source:'google' },
    { family:'Carlito', category:'Sans', source:'google' },
    { family:'Arimo', category:'Sans', source:'google' },
    { family:'Lexend', category:'Sans', source:'google' },
    { family:'Atkinson Hyperlegible', category:'Sans', source:'google' },
    { family:'Merriweather', category:'Serif', source:'google' },
    { family:'Lora', category:'Serif', source:'google' },
    { family:'Playfair Display', category:'Serif', source:'google' },
    { family:'Source Serif 4', category:'Serif', source:'google' },
    { family:'Libre Baskerville', category:'Serif', source:'google' },
    { family:'Noto Serif', category:'Serif', source:'google' },
    { family:'STIX Two Text', category:'Serif', source:'google' },
    { family:'IBM Plex Serif', category:'Serif', source:'google' },
    { family:'Tinos', category:'Serif', source:'google' },
    { family:'Caladea', category:'Serif', source:'google' },
    { family:'Newsreader', category:'Serif', source:'google' },
    { family:'EB Garamond', category:'Serif', source:'google' },
    { family:'JetBrains Mono', category:'Mono', source:'google' },
    { family:'IBM Plex Mono', category:'Mono', source:'google' },
    { family:'Fira Code', category:'Mono', source:'google' },
    { family:'Source Code Pro', category:'Mono', source:'google' },
    { family:'Roboto Mono', category:'Mono', source:'google' },
    { family:'Cousine', category:'Mono', source:'google' },
    { family:'Red Hat Mono', category:'Mono', source:'google' },
    { family:'Arial', category:'System', source:'system' },
    { family:'Helvetica', category:'System', source:'system' },
    { family:'Segoe UI', category:'System', source:'system' },
    { family:'Avenir Next', category:'System', source:'system' },
    { family:'Georgia', category:'System', source:'system' },
    { family:'Times New Roman', category:'System', source:'system' },
    { family:'Courier New', category:'System', source:'system' },
    { family:'Verdana', category:'System', source:'system' },
    { family:'Trebuchet MS', category:'System', source:'system' },
    { family:'Palatino', category:'System', source:'system' }
  ];

  let customFonts = [];
  const loadedGoogleFonts = new Set();
  state.defaultFont ??= 'Inter';

  function fontStack(family, category = 'Sans') {
    const fallback = category === 'Serif' ? 'serif' : category === 'Mono' ? 'monospace' : 'sans-serif';
    return `"${family}", ${fallback}`;
  }

  function familyFromStack(stack = '') {
    return stack.split(',')[0].trim().replace(/^['"]|['"]$/g, '');
  }

  function catalogEntry(family) {
    return FONT_CATALOG.find(item => item.family === family) || customFonts.find(item => item.family === family);
  }

  function ensureGoogleFont(family) {
    const entry = catalogEntry(family);
    if (!entry || entry.source !== 'google' || loadedGoogleFonts.has(family)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}&display=swap`;
    link.dataset.scicanvasFont = family;
    document.head.appendChild(link);
    loadedGoogleFonts.add(family);
  }

  async function loadCustomFont(record) {
    if (!record?.family || !record?.dataUrl || !('FontFace' in window)) return;
    try {
      const face = new FontFace(record.family, `url(${record.dataUrl})`);
      await face.load();
      document.fonts.add(face);
    } catch (error) {
      console.warn(`Could not load custom font ${record.family}`, error);
    }
  }

  function allFonts() {
    return [...FONT_CATALOG, ...customFonts.map(item => ({ ...item, category:'Imported', source:'custom' }))];
  }

  function repopulateFontSelect() {
    const select = textControls.family;
    const selected = familyFromStack(select.value) || state.defaultFont;
    select.replaceChildren();

    const groups = ['Sans','Serif','Mono','System','Imported'];
    groups.forEach(category => {
      const entries = allFonts().filter(item => item.category === category);
      if (!entries.length) return;
      const group = document.createElement('optgroup');
      group.label = category;
      entries.forEach(entry => {
        const option = document.createElement('option');
        option.value = fontStack(entry.family, entry.category);
        option.textContent = entry.family;
        group.appendChild(option);
      });
      select.appendChild(group);
    });

    const match = [...select.options].find(option => familyFromStack(option.value) === selected);
    if (match) select.value = match.value;
  }

  function applyFontToItem(item, family) {
    if (!item || item.type !== 'text') return;
    const entry = catalogEntry(family) || { category:'Sans' };
    ensureGoogleFont(family);
    item.fontFamily = fontStack(family, entry.category);
  }

  function chooseFont(family, applyAll = false) {
    ensureGoogleFont(family);
    pushHistory();

    if (applyAll) {
      state.pages.forEach(page => page.objects.filter(item => item.type === 'text').forEach(item => applyFontToItem(item, family)));
      state.defaultFont = family;
    } else {
      const item = selectedObject();
      if (item?.type === 'text') applyFontToItem(item, family);
      else state.defaultFont = family;
    }

    render();
    scheduleSave();
    drawFontCards();
  }

  async function importFontFile(file) {
    const guessed = file.name.replace(/\.(woff2?|ttf|otf)$/i, '').replace(/[-_]+/g, ' ').trim();
    const family = prompt('Font family name', guessed || 'Imported font')?.trim();
    if (!family) return;
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    const record = { id:uid(), family, dataUrl, fileName:file.name, createdAt:new Date().toISOString(), source:'custom' };
    await loadCustomFont(record);
    customFonts = [record, ...customFonts.filter(item => item.family !== family)];
    await vaultWrite('user-fonts', customFonts);
    repopulateFontSelect();
    drawFontCards();
    chooseFont(family, false);
  }

  const drawer = createDrawer('fontLibraryDrawer', 'Font library', 'Academic, presentation, monospaced, and imported fonts');
  drawer.querySelector('.utility-body').innerHTML = `
    <div class="font-tools">
      <input id="fontSearch" type="search" placeholder="Search fonts…">
      <button id="importFontFile" type="button">Import font file</button>
      <input id="fontFileInput" type="file" accept=".woff,.woff2,.ttf,.otf,font/woff,font/woff2,font/ttf,font/otf" hidden>
    </div>
    <label class="font-all-toggle"><input id="applyFontToAll" type="checkbox"> Apply choice to all text in this project</label>
    <div id="fontGrid" class="font-grid"></div>
    <p class="tool-note">Google Fonts load on demand. Imported font files stay on this device; verify their licence before sharing or publishing.</p>
  `;

  const fontGrid = drawer.querySelector('#fontGrid');
  function drawFontCards() {
    const query = drawer.querySelector('#fontSearch').value.trim().toLowerCase();
    fontGrid.replaceChildren();
    allFonts().filter(item => `${item.family} ${item.category}`.toLowerCase().includes(query)).forEach(entry => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `font-card${entry.family === state.defaultFont ? ' default' : ''}`;
      button.style.fontFamily = fontStack(entry.family, entry.category);
      button.innerHTML = `<strong>${entry.family}</strong><span>Ag DNA RNA 0123</span><small>${entry.category}${entry.family === state.defaultFont ? ' · project default' : ''}</small>`;
      button.addEventListener('mouseenter', () => ensureGoogleFont(entry.family));
      button.addEventListener('focus', () => ensureGoogleFont(entry.family));
      button.addEventListener('click', () => chooseFont(entry.family, drawer.querySelector('#applyFontToAll').checked));
      fontGrid.appendChild(button);
    });
  }

  drawer.querySelector('#fontSearch').addEventListener('input', drawFontCards);
  drawer.querySelector('#importFontFile').addEventListener('click', () => drawer.querySelector('#fontFileInput').click());
  drawer.querySelector('#fontFileInput').addEventListener('change', event => {
    const file = event.target.files?.[0];
    if (file) importFontFile(file).catch(error => alert(`Could not import font: ${error.message}`));
    event.target.value = '';
  });

  const fontsButton = document.createElement('button');
  fontsButton.type = 'button';
  fontsButton.textContent = 'Fonts';
  fontsButton.addEventListener('click', () => drawer.classList.toggle('open'));
  document.querySelectorAll('.tool-group')[0].appendChild(fontsButton);

  const fontStyle = document.createElement('style');
  fontStyle.textContent = `
    .font-tools{display:grid;grid-template-columns:1fr auto;gap:7px}.font-tools input{min-width:0;border:1px solid var(--sc-border,#ccd6e3);border-radius:7px;padding:8px}.font-tools button{border:1px solid var(--sc-border,#ccd6e3);border-radius:7px;background:#f8fafc;padding:8px;font-size:10px}.font-all-toggle{display:block;margin:9px 0;color:var(--sc-muted,#697589);font-size:10px}
    .font-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}.font-card{min-width:0;display:grid;gap:3px;text-align:left;padding:9px;border:1px solid var(--sc-border,#d4dde8);border-radius:9px;background:var(--sc-surface,#fff)}.font-card:hover{border-color:var(--sc-accent,#2563eb)}.font-card.default{box-shadow:inset 3px 0 0 var(--sc-accent,#2563eb)}.font-card strong{font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.font-card span{font-size:16px;overflow:hidden;white-space:nowrap}.font-card small{color:var(--sc-muted,#697589);font-family:Inter,sans-serif;font-size:8px}
  `;
  document.head.appendChild(fontStyle);

  textControls.family.addEventListener('change', event => ensureGoogleFont(familyFromStack(event.target.value)), true);

  const fontBaseMakeObject = makeObject;
  makeObject = function makeObjectWithDefaultFont(type) {
    fontBaseMakeObject(type);
    const item = selectedObject();
    if (item?.type === 'text') {
      applyFontToItem(item, state.defaultFont);
      render();
      scheduleSave();
    }
  };

  const fontBaseSnapshot = snapshot;
  snapshot = function snapshotWithFonts() {
    const data = JSON.parse(fontBaseSnapshot());
    data.defaultFont = state.defaultFont;
    return JSON.stringify(data);
  };

  const fontBaseRestore = restore;
  restore = function restoreWithFonts(serialized) {
    const data = typeof serialized === 'string' ? JSON.parse(serialized) : serialized;
    state.defaultFont = data.defaultFont || state.defaultFont || 'Inter';
    fontBaseRestore(data);
    state.pages.flatMap(page => page.objects).filter(item => item.type === 'text').forEach(item => ensureGoogleFont(familyFromStack(item.fontFamily)));
    drawFontCards();
  };

  const fontBaseProjectData = projectData;
  projectData = function projectDataWithFonts() {
    return { ...fontBaseProjectData(), defaultFont:state.defaultFont };
  };

  async function initializeFonts() {
    try {
      const record = await vaultRead('user-fonts');
      customFonts = Array.isArray(record?.value) ? record.value : [];
      await Promise.all(customFonts.map(loadCustomFont));
    } catch (error) {
      console.warn('Could not load imported fonts', error);
    }
    repopulateFontSelect();
    ensureGoogleFont(state.defaultFont);
    drawFontCards();
  }

  initializeFonts();
})();