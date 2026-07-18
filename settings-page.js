(() => {
  if (window.__figureLoomSettingsPageV1) return;
  window.__figureLoomSettingsPageV1 = true;

  let page = null;
  let button = null;
  let section = 'general';
  let previousFocus = null;

  const api = () => window.FigureLoomSettings;
  const packs = () => window.FigureLoomLanguagePacks;
  const i18n = () => window.FigureLoomI18n;

  function stylesheet() {
    if (document.getElementById('figureloomSettingsAccessibilityStylesheet')) return;
    const link = document.createElement('link');
    link.id = 'figureloomSettingsAccessibilityStylesheet';
    link.rel = 'stylesheet';
    const source = document.currentScript?.src || '';
    link.href = `settings-accessibility.css${source.includes('?') ? source.slice(source.indexOf('?')) : ''}`;
    document.head.appendChild(link);
  }

  function settingsButton() {
    const existing = document.getElementById('settingsRibbonButton');
    if (existing) return existing;
    const review = document.querySelector('.ribbon-tab[data-tab="review"]');
    const tabs = review?.parentElement || document.querySelector('.ribbon-tabs');
    if (!tabs) return null;
    const item = document.createElement('button');
    item.id = 'settingsRibbonButton';
    item.type = 'button';
    item.className = 'ribbon-command-tab settings-ribbon-button';
    item.dataset.i18nKey = 'settings';
    item.dataset.ariaLabelI18nKey = 'settings';
    item.textContent = 'Settings';
    item.setAttribute('aria-label','Settings');
    if (review) review.insertAdjacentElement('afterend', item);
    else tabs.appendChild(item);
    return item;
  }

  function languageOptions() {
    return packs().available.map(code => `<option value="${code}">${packs().languages[code]}</option>`).join('');
  }

  function buildPage() {
    if (page) return;
    page = document.createElement('section');
    page.id = 'figureloomSettingsPage';
    page.className = 'figureloom-settings-page';
    page.hidden = true;
    page.setAttribute('role','dialog');
    page.setAttribute('aria-modal','true');
    page.setAttribute('aria-labelledby','figureloomSettingsTitle');
    page.innerHTML = `
      <header class="settings-topbar">
        <div><h1 id="figureloomSettingsTitle" data-i18n-key="settings">Settings</h1><p data-i18n-key="changesSaved">Changes are saved automatically on this device.</p></div>
        <button type="button" class="settings-close" data-settings-close data-aria-label-i18n-key="close" aria-label="Close">×</button>
      </header>
      <div class="settings-layout">
        <nav class="settings-navigation" aria-label="Settings sections">
          <button type="button" data-settings-section="general" aria-selected="true"><span aria-hidden="true">◫</span><span data-i18n-key="general">General</span></button>
          <button type="button" data-settings-section="accessibility" aria-selected="false"><span aria-hidden="true">◉</span><span data-i18n-key="accessibility">Accessibility</span></button>
          <button type="button" data-settings-section="language" aria-selected="false"><span aria-hidden="true">文</span><span data-i18n-key="language">Language</span></button>
        </nav>
        <main class="settings-content">
          <section class="settings-panel" data-settings-panel="general">
            <div class="settings-section-heading"><h2 data-i18n-key="interfaceMode">Interface mode</h2><p data-i18n-key="interfaceModeHelp">Choose how FigureLoom decides which interface to use.</p></div>
            <div class="settings-choice-grid" role="radiogroup">
              <label class="settings-choice"><input type="radio" name="figureloom-interface-mode" value="auto" data-setting="interfaceMode"><span><strong data-i18n-key="automatic">Automatic</strong><small data-i18n-key="automaticDesc">Use phone mode on phones and the full interface on tablets and computers.</small></span></label>
              <label class="settings-choice"><input type="radio" name="figureloom-interface-mode" value="desktop" data-setting="interfaceMode"><span><strong data-i18n-key="desktopTablet">Desktop & tablet</strong><small data-i18n-key="desktopTabletDesc">Always use the current full interface.</small></span></label>
              <label class="settings-choice"><input type="radio" name="figureloom-interface-mode" value="phone" data-setting="interfaceMode"><span><strong data-i18n-key="phone">Phone</strong><small data-i18n-key="phoneDesc">Always use the phone-specific interface.</small></span></label>
            </div>
          </section>
          <section class="settings-panel" data-settings-panel="accessibility" hidden>
            <div class="settings-section-heading"><h2 data-i18n-key="accessibility">Accessibility</h2></div>
            <label class="settings-select-row"><span><strong data-i18n-key="textSize">Interface text size</strong></span><select data-setting="textSize"><option value="standard" data-i18n-key="standard">Standard</option><option value="large" data-i18n-key="large">Large</option><option value="xlarge" data-i18n-key="extraLarge">Extra large</option></select></label>
            <div class="settings-toggle-list">
              <label class="settings-toggle-row"><input type="checkbox" data-setting="largerControls"><span><strong data-i18n-key="largerControls">Larger controls</strong><small data-i18n-key="largerControlsDesc">Increase the touch target for buttons and form controls.</small></span></label>
              <label class="settings-toggle-row"><input type="checkbox" data-setting="strongFocus"><span><strong data-i18n-key="strongFocus">Strong focus indicator</strong><small data-i18n-key="strongFocusDesc">Show a clear outline around the control currently selected.</small></span></label>
              <label class="settings-toggle-row"><input type="checkbox" data-setting="reduceMotion"><span><strong data-i18n-key="reduceMotion">Reduce motion</strong><small data-i18n-key="reduceMotionDesc">Disable non-essential animation and smooth movement.</small></span></label>
              <label class="settings-toggle-row"><input type="checkbox" data-setting="highContrast"><span><strong data-i18n-key="highContrast">High contrast interface</strong><small data-i18n-key="highContrastDesc">Strengthen borders and text contrast without changing the canvas.</small></span></label>
              <label class="settings-toggle-row"><input type="checkbox" data-setting="underlineLinks"><span><strong data-i18n-key="underlineLinks">Underline links</strong><small data-i18n-key="underlineLinksDesc">Keep links visually identifiable without relying only on color.</small></span></label>
              <label class="settings-toggle-row"><input type="checkbox" data-setting="readableFont"><span><strong data-i18n-key="readableFont">Readable interface font</strong><small data-i18n-key="readableFontDesc">Use a simpler Arial-style font throughout the interface.</small></span></label>
            </div>
          </section>
          <section class="settings-panel" data-settings-panel="language" hidden>
            <div class="settings-section-heading"><h2 data-i18n-key="languageLabel">Interface language</h2><p data-i18n-key="languageHelp">Changes apply immediately across FigureLoom.</p></div>
            <label class="settings-language-picker"><span data-i18n-key="languageLabel">Interface language</span><select data-setting="language">${languageOptions()}</select></label>
            <p class="settings-scope-note" data-i18n-key="languageScope">Project text, labels you create, file names, and imported content are never translated.</p>
          </section>
        </main>
      </div>
      <footer class="settings-footer"><button type="button" data-settings-reset data-i18n-key="restoreDefaults">Restore defaults</button><span data-i18n-key="changesSaved">Changes are saved automatically on this device.</span></footer>
    `;
    document.body.appendChild(page);
    page.querySelector('[data-settings-close]').addEventListener('click', close);
    page.querySelectorAll('[data-settings-section]').forEach(item => item.addEventListener('click', () => show(item.dataset.settingsSection)));
    page.addEventListener('change', event => {
      const control = event.target.closest('[data-setting]');
      if (!control) return;
      const key = control.dataset.setting;
      if (key === 'interfaceMode' || key === 'textSize' || key === 'language') api().set({ [key]:control.value });
      else api().set({ [key]:Boolean(control.checked) });
      sync();
    });
    page.querySelector('[data-settings-reset]').addEventListener('click', () => {
      if (!confirm(`${i18n().t('restoreDefaults')}?`)) return;
      api().reset();
      sync();
    });
    page.addEventListener('keydown', event => {
      if (event.key === 'Escape') return close();
      if (event.key !== 'Tab') return;
      const controls = [...page.querySelectorAll('button,input,select,[tabindex]:not([tabindex="-1"])')].filter(item => !item.disabled && !item.closest('[hidden]'));
      if (!controls.length) return;
      if (event.shiftKey && document.activeElement === controls[0]) {
        event.preventDefault();
        controls.at(-1).focus();
      } else if (!event.shiftKey && document.activeElement === controls.at(-1)) {
        event.preventDefault();
        controls[0].focus();
      }
    });
  }

  function show(name) {
    section = ['general','accessibility','language'].includes(name) ? name : 'general';
    page.querySelectorAll('[data-settings-section]').forEach(item => {
      const active = item.dataset.settingsSection === section;
      item.classList.toggle('active', active);
      item.setAttribute('aria-selected', String(active));
    });
    page.querySelectorAll('[data-settings-panel]').forEach(panel => { panel.hidden = panel.dataset.settingsPanel !== section; });
  }

  function sync() {
    if (!page) return;
    const state = api().get();
    page.querySelectorAll('[data-setting="interfaceMode"]').forEach(input => { input.checked = input.value === state.interfaceMode; });
    page.querySelector('[data-setting="textSize"]').value = state.textSize;
    page.querySelector('[data-setting="language"]').value = state.language;
    ['largerControls','strongFocus','reduceMotion','highContrast','underlineLinks','readableFont'].forEach(key => {
      page.querySelector(`[data-setting="${key}"]`).checked = Boolean(state[key]);
    });
    i18n().apply(page, true);
  }

  function open() {
    buildPage();
    previousFocus = document.activeElement;
    sync();
    show(section);
    page.hidden = false;
    document.body.classList.add('figureloom-settings-open');
    requestAnimationFrame(() => page.querySelector('[data-settings-close]').focus());
  }

  function close() {
    if (!page || page.hidden) return;
    page.hidden = true;
    document.body.classList.remove('figureloom-settings-open');
    previousFocus?.focus?.();
  }

  function init() {
    if (!api() || !packs() || !i18n()) return;
    stylesheet();
    button = settingsButton();
    buildPage();
    button?.addEventListener('click', open);
    addEventListener('figureloom-settings-change', sync);
    i18n().apply(document, true);
    window.FigureLoomSettingsPage = Object.freeze({ open, close });
  }

  if (api() && packs()) init();
  else addEventListener('figureloom-settings-ready', init, { once:true });
})();
