(() => {
  if (window.__figureLoomSettingsPageV3) return;
  window.__figureLoomSettingsPageV3 = true;

  let page = null;
  let button = null;
  let section = 'general';
  let previousFocus = null;

  const api = () => window.FigureLoomSettings;

  function stylesheet() {
    if (document.getElementById('figureloomSettingsAccessibilityStylesheet')) return;
    const link = document.createElement('link');
    link.id = 'figureloomSettingsAccessibilityStylesheet';
    link.rel = 'stylesheet';
    link.href = 'settings-accessibility.css?v=20260719-v3';
    document.head.appendChild(link);
  }

  function settingsButton() {
    const existing = document.getElementById('settingsRibbonButton');
    if (existing) return existing;
    const tabs = document.querySelector('.ribbon-tabs');
    if (!tabs) return null;
    const item = document.createElement('button');
    item.id = 'settingsRibbonButton';
    item.type = 'button';
    item.className = 'ribbon-command-tab settings-ribbon-button';
    item.textContent = 'Settings';
    item.setAttribute('aria-label', 'Settings');
    tabs.prepend(item);
    return item;
  }

  function currentTheme() {
    try {
      return document.documentElement.dataset.figureloomTheme === 'dark' || localStorage.getItem('figureloom-interface-theme-v1') === 'dark' ? 'dark' : 'light';
    } catch {
      return document.documentElement.dataset.figureloomTheme === 'dark' ? 'dark' : 'light';
    }
  }

  function setTheme(theme) {
    const next = theme === 'dark' ? 'dark' : 'light';
    if (currentTheme() === next) return;
    const toggle = document.getElementById('interfaceThemeToggle');
    if (toggle) {
      toggle.click();
      return;
    }
    document.documentElement.dataset.figureloomTheme = next;
    try { localStorage.setItem('figureloom-interface-theme-v1', next); } catch {}
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', next === 'dark' ? '#24282f' : '#f7f9fc');
  }

  function buildPage() {
    if (page) return;
    page = document.createElement('section');
    page.id = 'figureloomSettingsPage';
    page.className = 'figureloom-settings-page';
    page.hidden = true;
    page.setAttribute('role', 'dialog');
    page.setAttribute('aria-modal', 'true');
    page.setAttribute('aria-labelledby', 'figureloomSettingsTitle');
    page.innerHTML = `
      <header class="settings-topbar">
        <div><h1 id="figureloomSettingsTitle">Settings</h1><p>Changes are saved automatically on this device.</p></div>
        <button type="button" class="settings-close" data-settings-close aria-label="Close settings">×</button>
      </header>
      <div class="settings-layout">
        <nav class="settings-navigation" aria-label="Settings sections">
          <button type="button" data-settings-section="general" aria-selected="true"><span aria-hidden="true">◫</span><span>General</span></button>
          <button type="button" data-settings-section="accessibility" aria-selected="false"><span aria-hidden="true">◉</span><span>Accessibility</span></button>
        </nav>
        <main class="settings-content">
          <section class="settings-panel" data-settings-panel="general">
            <div class="settings-section-heading"><h2>Appearance</h2></div>
            <label class="settings-select-row"><span><strong>Appearance</strong></span><select data-interface-theme><option value="light">Light</option><option value="dark">Dark</option></select></label>
            <div class="settings-section-heading settings-subheading"><h2>Interface mode</h2><p>Choose how FigureLoom decides which interface to use.</p></div>
            <div class="settings-choice-grid" role="radiogroup" aria-label="Interface mode">
              <label class="settings-choice"><input type="radio" name="figureloom-interface-mode" value="auto" data-setting="interfaceMode"><span><strong>Automatic</strong><small>Use phone mode on phones and the full interface on tablets and computers.</small></span></label>
              <label class="settings-choice"><input type="radio" name="figureloom-interface-mode" value="desktop" data-setting="interfaceMode"><span><strong>Desktop &amp; tablet</strong><small>Always use the current full interface.</small></span></label>
              <label class="settings-choice"><input type="radio" name="figureloom-interface-mode" value="phone" data-setting="interfaceMode"><span><strong>Phone</strong><small>Always use the phone-specific interface.</small></span></label>
            </div>
          </section>
          <section class="settings-panel" data-settings-panel="accessibility" hidden>
            <div class="settings-section-heading"><h2>Accessibility</h2></div>
            <label class="settings-select-row"><span><strong>Interface text size</strong></span><select data-setting="textSize"><option value="standard">Standard</option><option value="large">Large</option><option value="xlarge">Extra large</option></select></label>
            <div class="settings-toggle-list">
              <label class="settings-toggle-row"><input type="checkbox" data-setting="largerControls"><span><strong>Larger controls</strong><small>Increase the touch target for buttons and form controls.</small></span></label>
              <label class="settings-toggle-row"><input type="checkbox" data-setting="strongFocus"><span><strong>Strong focus indicator</strong><small>Show a clear outline around the control currently selected.</small></span></label>
              <label class="settings-toggle-row"><input type="checkbox" data-setting="reduceMotion"><span><strong>Reduce motion</strong><small>Disable non-essential animation and smooth movement.</small></span></label>
              <label class="settings-toggle-row"><input type="checkbox" data-setting="highContrast"><span><strong>High contrast interface</strong><small>Strengthen borders and text contrast without changing the canvas.</small></span></label>
              <label class="settings-toggle-row"><input type="checkbox" data-setting="underlineLinks"><span><strong>Underline links</strong><small>Keep links visually identifiable without relying only on color.</small></span></label>
              <label class="settings-toggle-row"><input type="checkbox" data-setting="readableFont"><span><strong>Readable interface font</strong><small>Use a simpler Arial-style font throughout the interface.</small></span></label>
            </div>
          </section>
        </main>
      </div>
      <footer class="settings-footer"><button type="button" data-settings-reset>Restore defaults</button><span>Changes are saved automatically on this device.</span></footer>
    `;
    document.body.appendChild(page);

    page.querySelector('[data-settings-close]').addEventListener('click', close);
    page.querySelectorAll('[data-settings-section]').forEach(item => item.addEventListener('click', () => show(item.dataset.settingsSection)));
    page.addEventListener('change', event => {
      const themeControl = event.target.closest('[data-interface-theme]');
      if (themeControl) {
        setTheme(themeControl.value);
        sync();
        return;
      }
      const control = event.target.closest('[data-setting]');
      if (!control) return;
      const key = control.dataset.setting;
      if (key === 'interfaceMode' || key === 'textSize') api().set({ [key]:control.value });
      else api().set({ [key]:Boolean(control.checked) });
      sync();
    });
    page.querySelector('[data-settings-reset]').addEventListener('click', () => {
      if (!confirm('Restore defaults?')) return;
      api().reset();
      setTheme('light');
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
    section = ['general', 'accessibility'].includes(name) ? name : 'general';
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
    page.querySelector('[data-interface-theme]').value = currentTheme();
    page.querySelectorAll('[data-setting="interfaceMode"]').forEach(input => { input.checked = input.value === state.interfaceMode; });
    page.querySelector('[data-setting="textSize"]').value = state.textSize;
    ['largerControls','strongFocus','reduceMotion','highContrast','underlineLinks','readableFont'].forEach(key => {
      page.querySelector(`[data-setting="${key}"]`).checked = Boolean(state[key]);
    });
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
    if (!api()) return;
    stylesheet();
    button = settingsButton();
    buildPage();
    button?.addEventListener('click', open);
    addEventListener('figureloom-settings-change', sync);
    window.FigureLoomSettingsPage = Object.freeze({ open, close });
  }

  if (api()) init();
  else addEventListener('figureloom-settings-ready', init, { once:true });
})();
