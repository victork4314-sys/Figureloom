(() => {
  const THEMES = [
    { id:'lab-light', name:'Lab Light', description:'Clean journal-ready blue', accent:'#2563eb', accent2:'#7c3aed', page:{mode:'solid',primary:'#ffffff',secondary:'#edf3ff',angle:135}, palette:['#8ea0ff','#8fd2c3','#f3cc72','#ee8d9f','#bd91ef'], text:'#172033', stroke:'#26324a' },
    { id:'fluorescence', name:'Fluorescence', description:'Dark microscopy and neon signals', accent:'#20d9b6', accent2:'#9b7cff', page:{mode:'gradient',primary:'#101729',secondary:'#1d2f50',angle:135}, palette:['#24e0bd','#ff6fb5','#7b9cff','#ffd35a','#b781ff'], text:'#f7fbff', stroke:'#dce8ff' },
    { id:'agar-peach', name:'Agar Peach', description:'Warm culture-plate tones', accent:'#e56d4d', accent2:'#d9903d', page:{mode:'gradient',primary:'#fff9f2',secondary:'#ffe1c8',angle:135}, palette:['#ef9a7f','#f0bf67','#d7889f','#8fc5ad','#9aa8df'], text:'#4b3028', stroke:'#6b4133' },
    { id:'mint-culture', name:'Mint Culture', description:'Fresh microbiology greens', accent:'#278a70', accent2:'#46a8a0', page:{mode:'gradient',primary:'#f4fff9',secondary:'#d4f2e5',angle:135}, palette:['#6cc6a7','#81b9df','#f0c46e','#d98ca5','#9d91dc'], text:'#23463b', stroke:'#315e50' },
    { id:'lilac-assay', name:'Lilac Assay', description:'Soft molecular biology purple', accent:'#7557c8', accent2:'#b05cb7', page:{mode:'gradient',primary:'#fffaff',secondary:'#e8dbff',angle:135}, palette:['#a58be5','#d88ebd','#78b7b2','#ecc26f','#83a6dc'], text:'#3f3150', stroke:'#5b476f' },
    { id:'ocean-sequencing', name:'Ocean Sequencing', description:'Cool cyan and deep genome blue', accent:'#147fa3', accent2:'#315fc5', page:{mode:'gradient',primary:'#f5fcff',secondary:'#cfeaf5',angle:135}, palette:['#4ab1c8','#5d83d9','#72c7a6','#f0b766','#c085d5'], text:'#173b4e', stroke:'#265b72' },
    { id:'crimson-pathway', name:'Crimson Pathway', description:'Strong signaling and inhibition', accent:'#b8324b', accent2:'#e16a45', page:{mode:'gradient',primary:'#fffafa',secondary:'#f4d9dc',angle:135}, palette:['#d85670','#ee9a62','#8bb8c7','#8fc39f','#aa8bd2'], text:'#4a2830', stroke:'#6d3542' },
    { id:'retro-microscope', name:'Retro Microscope', description:'Cream paper and vintage instruments', accent:'#3f7d71', accent2:'#b17342', page:{mode:'solid',primary:'#fffaf0',secondary:'#efe4c9',angle:135}, palette:['#5f9b8b','#cf8b54','#d3b55f','#7e91b8','#a982a9'], text:'#3e392d', stroke:'#665e49' },
    { id:'journal-mono', name:'Journal Mono', description:'Black, white, and publication gray', accent:'#333333', accent2:'#777777', page:{mode:'solid',primary:'#ffffff',secondary:'#eeeeee',angle:135}, palette:['#2e2e2e','#676767','#969696','#bcbcbc','#e0e0e0'], text:'#111111', stroke:'#111111' },
    { id:'solar-lab', name:'Solar Lab', description:'Golden light with teal contrast', accent:'#c07a16', accent2:'#1b8d85', page:{mode:'gradient',primary:'#fffaf0',secondary:'#f7dfa5',angle:135}, palette:['#e5a63c','#3aa59c','#d36e7d','#6f91cf','#9b7ac2'], text:'#463d29', stroke:'#675a3e' },
    { id:'cytometry-pop', name:'Cytometry Pop', description:'Bold gates and bright cell populations', accent:'#f0448b', accent2:'#6a62ff', page:{mode:'gradient',primary:'#fff9ff',secondary:'#e6e1ff',angle:45}, palette:['#f05293','#675fff','#21b7a8','#f5b83d','#925fca'], text:'#392c4b', stroke:'#55436c' },
    { id:'high-contrast', name:'High Contrast', description:'Maximum figure separation', accent:'#005fcc', accent2:'#d10068', page:{mode:'solid',primary:'#ffffff',secondary:'#e8edf4',angle:135}, palette:['#0066cc','#d0005f','#009267','#e58a00','#6d42c7'], text:'#000000', stroke:'#000000' },
    { id:'office-neutrals', name:'Office Neutrals', description:'Warm white, slate, and quiet blue', accent:'#526b7a', accent2:'#7a8f88', page:{mode:'solid',primary:'#fbfbfa',secondary:'#f0f1ef',angle:135}, palette:['#dfe4e3','#c8d0d2','#9eabb0','#75858b','#b7afa4'], text:'#263137', stroke:'#536167' },
    { id:'executive-navy', name:'Executive Navy', description:'Navy, steel blue, linen, and muted gold', accent:'#244a6a', accent2:'#9a7a3d', page:{mode:'solid',primary:'#fffefd',secondary:'#edf1f4',angle:135}, palette:['#355e7d','#6f8798','#a9b6bf','#d9d2c4','#b99558'], text:'#182c3b', stroke:'#405565' },
    { id:'warm-office', name:'Warm Office', description:'Cream, taupe, charcoal, and terracotta', accent:'#705f52', accent2:'#a7654f', page:{mode:'gradient',primary:'#fffdf8',secondary:'#eee7dc',angle:135}, palette:['#c9bdae','#a69787','#786e65','#d7c9b5','#bd8068'], text:'#3a342f', stroke:'#62594f' },
    { id:'slate-sand', name:'Slate + Sand', description:'Cool slate, paper, and sandstone', accent:'#526272', accent2:'#a17d57', page:{mode:'gradient',primary:'#fbfaf7',secondary:'#e7e5df',angle:135}, palette:['#70808f','#aeb7bf','#d5d4ce','#c4a985','#92775c'], text:'#2a333b', stroke:'#59636c' },
    { id:'sage-studio', name:'Sage Studio', description:'Sage, olive gray, clay, and natural paper', accent:'#5e7568', accent2:'#a56f5e', page:{mode:'solid',primary:'#fdfdf9',secondary:'#e9eee8',angle:135}, palette:['#8fa397','#bdc8bf','#d9d5c7','#b88b78','#778174'], text:'#29342e', stroke:'#536158' },
    { id:'monochrome-report', name:'Monochrome Report', description:'Ink, graphite, silver, and white', accent:'#30363b', accent2:'#71777c', page:{mode:'solid',primary:'#ffffff',secondary:'#eeeeee',angle:135}, palette:['#1f2428','#555b60','#8a9095','#bcc0c3','#e1e3e4'], text:'#171a1d', stroke:'#444a4f' },
    { id:'linen-burgundy', name:'Linen + Burgundy', description:'Warm linen, burgundy, and muted rose', accent:'#713d4b', accent2:'#a77a68', page:{mode:'gradient',primary:'#fffdf9',secondary:'#eee5dc',angle:135}, palette:['#824b58','#a66d76','#c7a3a0','#d8c7b8','#987d6c'], text:'#3d2930', stroke:'#664d55' },
    { id:'accessible-office', name:'Accessible Office', description:'High-contrast navy, teal, orange, and neutrals', accent:'#164e73', accent2:'#b45309', page:{mode:'solid',primary:'#ffffff',secondary:'#edf3f5',angle:135}, palette:['#176b87','#258277','#c56a13','#7a5a96','#66737d'], text:'#102f43', stroke:'#294c5d' }
  ];

  state.projectTheme ??= 'lab-light';

  function themeById(id = state.projectTheme) {
    return THEMES.find(theme => theme.id === id) || THEMES[0];
  }

  function colorObject(item, theme, index) {
    if (item.type === 'image') return;
    if (item.type === 'svg' && item.svgColorMode !== 'recolor') return;
    if (item.type === 'text') {
      item.fill = theme.text;
      item.stroke = theme.stroke;
      return;
    }
    if (item.type === 'arrow' || item.type === 'inhibition' || item.type === 'connector') {
      item.fill = index % 2 ? theme.accent2 : theme.accent;
      item.stroke = theme.stroke;
      return;
    }
    item.fill = theme.palette[index % theme.palette.length];
    item.stroke = theme.stroke;
  }

  function styleNewObject(item) {
    if (!item) return;
    const theme = themeById();
    colorObject(item, theme, Math.max(0, state.objects.indexOf(item)));
  }
  window.styleNewObjectFromTheme = styleNewObject;

  function applyProjectTheme(id, { recolor = true, backgrounds = true } = {}) {
    const theme = themeById(id);
    pushHistory();
    state.projectTheme = theme.id;

    state.pages.forEach(page => {
      if (backgrounds) page.background = structuredClone(theme.page);
      if (recolor) page.objects.forEach((item, index) => colorObject(item, theme, index));
    });

    render();
    renderPages();
    window.applyPageBackground?.();
    scheduleSave();
    drawThemeCards();
  }

  const themeStyle = document.createElement('style');
  themeStyle.textContent = `
    .project-theme-panel{margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid #e1e6ee}.project-theme-panel h3{margin:0 0 4px;font-size:13px}.project-theme-panel>p{margin:0 0 10px;color:#697589;font-size:10px;line-height:1.35}
    .project-theme-options{display:flex;gap:12px;margin-bottom:10px;font-size:10px;color:#697589}.theme-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}.theme-card{display:grid;grid-template-columns:42px 1fr;gap:8px;align-items:center;text-align:left;padding:7px;border:1px solid #d2dae5;border-radius:9px;background:#fff;color:#253044}
    .theme-card.active{box-shadow:0 0 0 2px rgba(37,99,235,.22);border-color:#2563eb}.theme-stripes{height:38px;border-radius:6px;display:grid;grid-template-columns:repeat(5,1fr);overflow:hidden}.theme-card strong,.theme-card small{display:block}.theme-card strong{font-size:10px}.theme-card small{margin-top:2px;color:#697589;font-size:8px;line-height:1.2}
  `;
  document.head.appendChild(themeStyle);

  const panel = document.createElement('section');
  panel.className = 'project-theme-panel';
  panel.innerHTML = `
    <h3>Project color theme</h3>
    <p>Changes only the figure itself. The FigureLoom interface stays unchanged.</p>
    <div class="project-theme-options">
      <label><input id="themeRecolor" type="checkbox" checked> Recolor project objects</label>
      <label><input id="themeBackgrounds" type="checkbox" checked> Change every page background</label>
    </div>
    <div id="projectThemeGrid" class="theme-grid"></div>
  `;
  designDrawer.querySelector('.utility-body').prepend(panel);
  const themeGrid = panel.querySelector('#projectThemeGrid');

  function drawThemeCards() {
    themeGrid.replaceChildren();
    THEMES.forEach(theme => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `theme-card${theme.id === state.projectTheme ? ' active' : ''}`;
      const colors = [theme.accent, ...theme.palette.slice(0, 4)];
      button.innerHTML = `<span class="theme-stripes">${colors.map(color => `<i style="background:${color}"></i>`).join('')}</span><span><strong>${theme.name}</strong><small>${theme.description}</small></span>`;
      button.addEventListener('click', () => applyProjectTheme(theme.id, {
        recolor: panel.querySelector('#themeRecolor').checked,
        backgrounds: panel.querySelector('#themeBackgrounds').checked
      }));
      themeGrid.appendChild(button);
    });
  }

  const themeBaseMakeObject = makeObject;
  makeObject = function themedMakeObject(type) {
    themeBaseMakeObject(type);
    styleNewObject(selectedObject());
    render();
    scheduleSave();
  };

  const themeBaseScienceAsset = addScienceAsset;
  addScienceAsset = function themedScienceAsset(asset) {
    themeBaseScienceAsset(asset);
    styleNewObject(selectedObject());
    render();
    scheduleSave();
  };

  if (typeof addSpecialObject === 'function') {
    const themeBaseSpecialObject = addSpecialObject;
    addSpecialObject = function themedSpecialObject(type) {
      themeBaseSpecialObject(type);
      styleNewObject(selectedObject());
      render();
      scheduleSave();
    };
  }

  const themeBaseSnapshot = snapshot;
  snapshot = function snapshotWithTheme() {
    const data = JSON.parse(themeBaseSnapshot());
    data.projectTheme = state.projectTheme;
    return JSON.stringify(data);
  };

  const themeBaseRestore = restore;
  restore = function restoreWithTheme(serialized) {
    const data = typeof serialized === 'string' ? JSON.parse(serialized) : serialized;
    state.projectTheme = data.projectTheme || state.projectTheme || 'lab-light';
    themeBaseRestore(data);
    drawThemeCards();
  };

  const themeBaseProjectData = projectData;
  projectData = function projectDataWithTheme() {
    return { ...themeBaseProjectData(), projectTheme: state.projectTheme };
  };

  drawThemeCards();
})();