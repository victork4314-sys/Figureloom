(() => {
  if (window.__figureLoomSettingsCoreV1) return;
  window.__figureLoomSettingsCoreV1 = true;

  const KEY = 'figureloom-settings-v1';
  const root = document.documentElement;
  const modes = new Set(['auto','desktop','phone']);
  const sizes = new Set(['standard','large','xlarge']);
  const defaults = () => ({
    language:'en',
    interfaceMode:'auto',
    textSize:'standard',
    largerControls:false,
    strongFocus:false,
    reduceMotion:Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches),
    highContrast:false,
    underlineLinks:false,
    readableFont:false
  });
  const booleanKeys = ['largerControls','strongFocus','reduceMotion','highContrast','underlineLinks','readableFont'];
  const textState = new WeakMap();
  const attributeState = new WeakMap();
  const attributes = ['title','aria-label','placeholder'];
  const excluded = [
    '#canvas','#canvas *','#objectLayer','#objectLayer *','.canvas-object','.canvas-object *',
    '.page-thumbnail>span:last-child','.layer-item','.layer-item *','[contenteditable]','[contenteditable] *',
    '.data-sheet-grid','.data-sheet-grid *','.figureloom-chat-messages','.figureloom-chat-messages *',
    '.collab-comment','.collab-comment *','.project-thumb','.project-thumb *','.template-thumb','.template-thumb *',
    'script','style','noscript','code','pre'
  ].join(',');
  let state = defaults();
  let observer = null;
  let exactEnglish = null;
  let ready = false;

  const packs = () => window.FigureLoomLanguagePacks;
  const t = key => packs()?.translate(state.language, key) || key;

  function read() {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch {}
    const next = { ...defaults(), ...saved };
    if (!modes.has(next.interfaceMode)) next.interfaceMode = 'auto';
    if (!sizes.has(next.textSize)) next.textSize = 'standard';
    next.language = packs().normalize(next.language || navigator.language || 'en');
    booleanKeys.forEach(key => { next[key] = Boolean(next[key]); });
    return next;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  }

  function phoneDevice() {
    const width = Number(window.screen?.width) || innerWidth;
    const height = Number(window.screen?.height) || innerHeight;
    return Boolean(
      window.matchMedia?.('(pointer: coarse)').matches &&
      window.matchMedia?.('(hover: none)').matches &&
      Math.min(width, height) <= 600
    );
  }

  function resolvedMode() {
    if (state.interfaceMode === 'phone') return 'phone';
    if (state.interfaceMode === 'desktop') return 'desktop';
    return phoneDevice() ? 'phone' : 'desktop';
  }

  function dataset(name, enabled) {
    if (enabled) root.dataset[name] = '1';
    else delete root.dataset[name];
  }

  function apply({ persist = true, translate = true, notify = true } = {}) {
    root.lang = state.language;
    root.dataset.figureloomLanguage = state.language;
    root.dataset.figureloomModePreference = state.interfaceMode;
    root.dataset.figureloomResolvedMode = resolvedMode();
    root.dataset.figureloomTextSize = state.textSize;
    dataset('figureloomLargerControls', state.largerControls);
    dataset('figureloomStrongFocus', state.strongFocus);
    dataset('figureloomReduceMotion', state.reduceMotion);
    dataset('figureloomHighContrast', state.highContrast);
    dataset('figureloomUnderlineLinks', state.underlineLinks);
    dataset('figureloomReadableFont', state.readableFont);
    if (persist) save();
    if (translate) translateTree(document, true);
    if (notify) {
      dispatchEvent(new CustomEvent('figureloom-settings-change', { detail:{ ...state, resolvedMode:resolvedMode() } }));
      dispatchEvent(new CustomEvent('figureloom-language-change', { detail:{ language:state.language } }));
    }
  }

  function englishMap() {
    if (exactEnglish) return exactEnglish;
    exactEnglish = new Map();
    Object.entries(packs().get('en')).forEach(([key,value]) => exactEnglish.set(String(value), key));
    exactEnglish.set('Close settings','close');
    return exactEnglish;
  }

  function spaced(source, replacement) {
    return `${source.match(/^\s*/)?.[0] || ''}${replacement}${source.match(/\s*$/)?.[0] || ''}`;
  }

  function translateValue(source) {
    const value = String(source ?? '');
    const clean = value.trim();
    if (!clean) return value;
    const key = englishMap().get(clean);
    if (key) return spaced(value, t(key));
    const punctuated = clean.match(/^(.*?)([.…:])$/);
    if (punctuated) {
      const punctuationKey = englishMap().get(punctuated[1].trim());
      if (punctuationKey) return spaced(value, `${t(punctuationKey)}${punctuated[2]}`);
    }
    let match = clean.match(/^Page\s+(\d+)\s+of\s+(\d+)$/i);
    if (match) return spaced(value, `${t('page')} ${match[1]} ${t('of')} ${match[2]}`);
    match = clean.match(/^(\d+)\s+objects?$/i);
    if (match) return spaced(value, `${match[1]} ${t('objects')}`);
    match = clean.match(/^(\d+)\s+rows?\s*·\s*(\d+)\s+columns?\s*·\s*(\d+)\s+numeric cells?$/i);
    if (match) return spaced(value, `${match[1]} ${t('rows')} · ${match[2]} ${t('columns')} · ${match[3]} ${t('numericCells')}`);
    return value;
  }

  function blocked(element) {
    return !(element instanceof Element) || element.hasAttribute('data-no-translate') || Boolean(element.closest(excluded));
  }

  function textNode(node, force = false) {
    const parent = node.parentElement;
    if (!parent || blocked(parent)) return;
    const current = node.nodeValue || '';
    let record = textState.get(node);
    if (!record || (!force && current !== record.last)) {
      record = { source:current, last:current };
      textState.set(node, record);
    }
    const next = parent.dataset.i18nKey ? spaced(record.source, t(parent.dataset.i18nKey)) : translateValue(record.source);
    if (next !== current) node.nodeValue = next;
    record.last = next;
  }

  function elementAttributes(element, force = false) {
    if (blocked(element)) return;
    let records = attributeState.get(element);
    if (!records) {
      records = new Map();
      attributeState.set(element, records);
    }
    attributes.forEach(attribute => {
      if (!element.hasAttribute(attribute)) return;
      const current = element.getAttribute(attribute) || '';
      let record = records.get(attribute);
      if (!record || (!force && current !== record.last)) {
        record = { source:current, last:current };
        records.set(attribute, record);
      }
      const property = `${attribute.replace(/-([a-z])/g, (_,letter) => letter.toUpperCase())}I18nKey`;
      const next = element.dataset[property] ? t(element.dataset[property]) : translateValue(record.source);
      if (next !== current) element.setAttribute(attribute, next);
      record.last = next;
    });
  }

  function translateTree(target = document, force = false) {
    if (!packs()) return;
    if (target.nodeType === Node.TEXT_NODE) return textNode(target, force);
    if (target.nodeType === Node.ELEMENT_NODE) elementAttributes(target, force);
    const walker = document.createTreeWalker(target, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.TEXT_NODE) textNode(node, force);
      else elementAttributes(node, force);
    }
  }

  function watchTranslations() {
    observer?.disconnect();
    observer = new MutationObserver(records => records.forEach(record => {
      if (record.type === 'characterData') textNode(record.target);
      else if (record.type === 'attributes') elementAttributes(record.target);
      else record.addedNodes.forEach(node => translateTree(node));
    }));
    observer.observe(document.body, {
      subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:attributes
    });
  }

  function normalize(next) {
    const merged = { ...state, ...next };
    if (!modes.has(merged.interfaceMode)) merged.interfaceMode = 'auto';
    if (!sizes.has(merged.textSize)) merged.textSize = 'standard';
    merged.language = packs().normalize(merged.language);
    booleanKeys.forEach(key => { merged[key] = Boolean(merged[key]); });
    return merged;
  }

  function init() {
    if (ready || !packs()) return;
    ready = true;
    state = read();
    watchTranslations();
    apply({ persist:false, notify:false });
    translateTree(document, true);
    const auto = () => {
      if (state.interfaceMode !== 'auto') return;
      const mode = resolvedMode();
      if (root.dataset.figureloomResolvedMode === mode) return;
      root.dataset.figureloomResolvedMode = mode;
      dispatchEvent(new CustomEvent('figureloom-settings-change', { detail:{ ...state, resolvedMode:mode } }));
    };
    addEventListener('resize', auto);
    window.matchMedia?.('(pointer: coarse)').addEventListener?.('change', auto);
    window.matchMedia?.('(hover: none)').addEventListener?.('change', auto);
    dispatchEvent(new CustomEvent('figureloom-settings-ready'));
  }

  window.FigureLoomSettings = Object.freeze({
    get:() => ({ ...state, resolvedMode:resolvedMode() }),
    set(next = {}) {
      state = normalize(next);
      apply();
      return { ...state, resolvedMode:resolvedMode() };
    },
    reset() {
      state = normalize(defaults());
      apply();
      return { ...state, resolvedMode:resolvedMode() };
    },
    resolveMode:resolvedMode
  });

  window.FigureLoomI18n = Object.freeze({
    t,
    get language() { return state.language; },
    apply:translateTree
  });

  if (packs()) init();
  else addEventListener('figureloom-language-packs-ready', init, { once:true });
})();
