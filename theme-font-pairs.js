(() => {
  const FONT_PAIRS = {
    'lab-light': { heading:'Inter', body:'Source Sans 3', label:'Inter + Source Sans 3' },
    'fluorescence': { heading:'Space Grotesk', body:'IBM Plex Sans', label:'Space Grotesk + IBM Plex Sans' },
    'agar-peach': { heading:'Playfair Display', body:'Lato', label:'Playfair Display + Lato' },
    'mint-culture': { heading:'Nunito', body:'Source Sans 3', label:'Nunito + Source Sans 3' },
    'lilac-assay': { heading:'Raleway', body:'Lora', label:'Raleway + Lora' },
    'ocean-sequencing': { heading:'Manrope', body:'Noto Sans', label:'Manrope + Noto Sans' },
    'crimson-pathway': { heading:'Montserrat', body:'Work Sans', label:'Montserrat + Work Sans' },
    'retro-microscope': { heading:'Libre Baskerville', body:'Cabin', label:'Libre Baskerville + Cabin' },
    'journal-mono': { heading:'Source Serif 4', body:'Arial', label:'Source Serif 4 + Arial' },
    'solar-lab': { heading:'Lora', body:'Lato', label:'Lora + Lato' },
    'cytometry-pop': { heading:'Quicksand', body:'Nunito', label:'Quicksand + Nunito' },
    'high-contrast': { heading:'Arial', body:'Verdana', label:'Arial + Verdana' }
  };

  const GOOGLE_FONTS = new Set([
    'Inter','Source Sans 3','Space Grotesk','IBM Plex Sans','Playfair Display','Lato','Nunito','Raleway','Lora','Manrope','Noto Sans','Montserrat','Work Sans','Libre Baskerville','Cabin','Source Serif 4','Quicksand'
  ]);
  const loaded = new Set();
  state.themeFontsEnabled ??= true;

  function ensureFont(family) {
    if (!GOOGLE_FONTS.has(family) || loaded.has(family)) return;
    const existing = document.querySelector(`link[data-theme-font="${CSS.escape(family)}"]`);
    if (existing) {
      loaded.add(family);
      return;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}:wght@400;500;600;700&display=swap`;
    link.dataset.themeFont = family;
    document.head.appendChild(link);
    loaded.add(family);
  }

  function fontStack(family) {
    const serif = new Set(['Playfair Display','Lora','Libre Baskerville','Source Serif 4']);
    return `"${family}", ${serif.has(family) ? 'serif' : 'sans-serif'}`;
  }

  function isHeading(item) {
    const label = `${item.name || ''} ${item.text || ''}`;
    return (item.fontSize || 30) >= 34 || /\b(title|heading|poster|figure|abstract|workflow)\b/i.test(label);
  }

  function applyThemeFonts(themeId = state.projectTheme, { renderNow = true } = {}) {
    if (!state.themeFontsEnabled) return;
    const pair = FONT_PAIRS[themeId] || FONT_PAIRS['lab-light'];
    ensureFont(pair.heading);
    ensureFont(pair.body);
    state.defaultFont = pair.body;
    state.pages.forEach(page => page.objects.forEach(item => {
      if (item.type !== 'text') return;
      item.fontFamily = fontStack(isHeading(item) ? pair.heading : pair.body);
    }));
    if (renderNow) {
      render();
      renderPages();
      scheduleSave();
    }
    updateThemeFontLabels();
  }

  window.applyProjectThemeFonts = applyThemeFonts;

  const panel = document.querySelector('.project-theme-panel');
  const options = panel?.querySelector('.project-theme-options');
  if (options) {
    const label = document.createElement('label');
    label.innerHTML = '<input id="themeFonts" type="checkbox" checked> Change project fonts';
    options.appendChild(label);
    const checkbox = label.querySelector('input');
    checkbox.checked = state.themeFontsEnabled;
    checkbox.addEventListener('change', () => {
      state.themeFontsEnabled = checkbox.checked;
      if (checkbox.checked) {
        pushHistory();
        applyThemeFonts();
      } else {
        scheduleSave();
      }
    });
  }

  function updateThemeFontLabels() {
    document.querySelectorAll('#projectThemeGrid .theme-card').forEach(card => {
      const strong = card.querySelector('strong');
      const themeName = strong?.textContent?.trim();
      const themeButton = card;
      const themeCards = [...document.querySelectorAll('#projectThemeGrid .theme-card')];
      const index = themeCards.indexOf(themeButton);
      const themeIds = Object.keys(FONT_PAIRS);
      const pair = FONT_PAIRS[themeIds[index]];
      if (!pair) return;
      let note = card.querySelector('.theme-font-pair');
      if (!note) {
        note = document.createElement('span');
        note.className = 'theme-font-pair';
        card.querySelector('span:last-child')?.appendChild(note);
      }
      note.textContent = pair.label;
      note.title = `${themeName || 'Theme'} font pair`;
    });
  }

  const themeGrid = document.getElementById('projectThemeGrid');
  themeGrid?.addEventListener('click', event => {
    if (!event.target.closest('.theme-card')) return;
    setTimeout(() => {
      if (state.themeFontsEnabled) applyThemeFonts(state.projectTheme);
      else updateThemeFontLabels();
    }, 0);
  });

  const generate = document.getElementById('generateEditableFigure');
  generate?.addEventListener('click', () => {
    setTimeout(() => applyThemeFonts(state.projectTheme), 0);
  });

  const baseSnapshot = snapshot;
  snapshot = function snapshotWithThemeFonts() {
    const data = JSON.parse(baseSnapshot());
    data.themeFontsEnabled = state.themeFontsEnabled;
    return JSON.stringify(data);
  };

  const baseRestore = restore;
  restore = function restoreWithThemeFonts(serialized) {
    const data = typeof serialized === 'string' ? JSON.parse(serialized) : serialized;
    state.themeFontsEnabled = data.themeFontsEnabled ?? true;
    baseRestore(data);
    const checkbox = document.getElementById('themeFonts');
    if (checkbox) checkbox.checked = state.themeFontsEnabled;
    if (state.themeFontsEnabled) applyThemeFonts(state.projectTheme);
    updateThemeFontLabels();
  };

  const baseProjectData = projectData;
  projectData = function projectDataWithThemeFonts() {
    return { ...baseProjectData(), themeFontsEnabled:state.themeFontsEnabled };
  };

  const style = document.createElement('style');
  style.textContent = `
    .project-theme-options{flex-wrap:wrap}.theme-font-pair{display:block;margin-top:3px;color:#6f7b8f;font-size:7px;line-height:1.2;white-space:normal}
  `;
  document.head.appendChild(style);

  updateThemeFontLabels();
  if (state.themeFontsEnabled) applyThemeFonts(state.projectTheme, { renderNow:false });
})();