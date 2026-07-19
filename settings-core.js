(() => {
  if (window.__figureLoomSettingsCoreV3) return;
  window.__figureLoomSettingsCoreV3 = true;

  const KEY = 'figureloom-settings-v1';
  const root = document.documentElement;
  const modes = new Set(['auto','desktop','phone']);
  const sizes = new Set(['standard','large','xlarge']);
  const defaults = () => ({
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
  let state = defaults();
  let ready = false;

  function read() {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch {}
    const next = { ...defaults(), ...saved };
    delete next.language;
    if (!modes.has(next.interfaceMode)) next.interfaceMode = 'auto';
    if (!sizes.has(next.textSize)) next.textSize = 'standard';
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

  function apply({ persist = true, notify = true } = {}) {
    root.lang = 'en';
    root.dataset.figureloomLanguage = 'en';
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
    if (notify) dispatchEvent(new CustomEvent('figureloom-settings-change', { detail:{ ...state, resolvedMode:resolvedMode() } }));
  }

  function normalize(next) {
    const merged = { ...state, ...next };
    delete merged.language;
    if (!modes.has(merged.interfaceMode)) merged.interfaceMode = 'auto';
    if (!sizes.has(merged.textSize)) merged.textSize = 'standard';
    booleanKeys.forEach(key => { merged[key] = Boolean(merged[key]); });
    return merged;
  }

  function init() {
    if (ready) return;
    ready = true;
    state = read();
    apply({ persist:false, notify:false });
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

  init();
})();
