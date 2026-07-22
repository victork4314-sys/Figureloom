(() => {
  if (window.__figureloomVmAccessInstalledV5) return;
  window.__figureloomVmAccessInstalledV5 = true;

  const VERSION = '5';
  const LOGIN_URL = 'https://vm.figureloom.org';
  const PUBLIC_URL = 'https://vm.figureloom.org/#/cast/figureloom';

  function removeOldPanels() {
    document.querySelectorAll('#figureloomVmPanel').forEach(panel => {
      if (panel.dataset.figureloomVmVersion !== VERSION) panel.remove();
    });
  }

  function normalizeButton(button) {
    button.id = 'figureloomVmButton';
    button.type = 'button';
    button.classList.add('figureloom-vm-top-button');
    button.textContent = 'VM';
    button.title = 'Open FigureLoom Linux VM';
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-controls', 'figureloomVmPanel');
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      openPanel();
    });
    return button;
  }

  function installButton() {
    const actions = document.querySelector('.title-actions');
    if (!actions) return false;

    const duplicateButtons = Array.from(document.querySelectorAll('#figureloomVmButton'));
    let button = duplicateButtons.shift();
    duplicateButtons.forEach(extra => extra.remove());

    if (button) {
      const cleanButton = button.cloneNode(false);
      button.replaceWith(cleanButton);
      button = cleanButton;
    } else {
      button = document.createElement('button');
    }

    normalizeButton(button);

    const helpButton = document.getElementById('tourHelpButton');
    if (helpButton && helpButton.parentElement === actions) {
      helpButton.insertAdjacentElement('afterend', button);
    } else if (button.parentElement !== actions) {
      actions.prepend(button);
    }

    return true;
  }

  function createPanel() {
    removeOldPanels();

    const existing = document.getElementById('figureloomVmPanel');
    if (existing && existing.dataset.figureloomVmVersion === VERSION) return existing;

    const panel = document.createElement('div');
    panel.id = 'figureloomVmPanel';
    panel.dataset.figureloomVmVersion = VERSION;
    panel.setAttribute('aria-hidden', 'true');
    panel.innerHTML = `
      <section class="vm-access-card" role="dialog" aria-modal="false" aria-labelledby="vmAccessTitle">
        <button class="vm-access-close" type="button" data-vm-close aria-label="Close VM access">×</button>

        <div class="vm-access-head">
          <span class="vm-access-badge" aria-hidden="true">VM</span>
          <div>
            <h2 id="vmAccessTitle">FigureLoom Linux VM</h2>
            <p>Open the browser-based Linux desktop for bioinformatics, files, and advanced tools.</p>
          </div>
        </div>

        <div class="vm-access-links" aria-label="VM access links">
          <a class="vm-access-link vm-access-link-primary" href="${PUBLIC_URL}" target="_blank" rel="noopener noreferrer">Open public VM</a>
          <a class="vm-access-link" href="${LOGIN_URL}" target="_blank" rel="noopener noreferrer">Open login screen</a>
        </div>

        <div class="vm-access-box">
          <p>Backup login: guest@figureloom.local / FigureLoom2026!</p>
          <p>Login screen: ${LOGIN_URL}</p>
          <p>Public VM: ${PUBLIC_URL}</p>
        </div>

        <div class="vm-access-box">
          <p>Please delete your Kasm session when finished. Closing the browser tab may leave the VM running and block the next person.</p>
          <label class="vm-access-check">
            <input type="checkbox">
            <span>I understand and will delete the VM session when I’m done.</span>
          </label>
        </div>
      </section>
    `;

    document.body.appendChild(panel);

    panel.querySelector('[data-vm-close]')?.addEventListener('click', closePanel);
    panel.querySelectorAll('.vm-access-link').forEach(link => {
      link.addEventListener('click', () => closePanel());
    });

    return panel;
  }

  function openPanel() {
    const panel = createPanel();
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    setTimeout(() => panel.querySelector('.vm-access-link-primary')?.focus({ preventScroll: true }), 20);
  }

  function closePanel() {
    const panel = document.getElementById('figureloomVmPanel');
    if (!panel) return;
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    setTimeout(() => document.getElementById('figureloomVmButton')?.focus({ preventScroll: true }), 0);
  }

  const style = document.createElement('style');
  style.dataset.figureloomVmVersion = VERSION;
  style.textContent = `
    .title-actions #figureloomVmButton.figureloom-vm-top-button {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      flex: 0 0 auto !important;
      min-width: 42px !important;
      width: auto !important;
      min-height: 34px !important;
      height: 34px !important;
      padding: 7px 10px !important;
      border: 1px solid var(--figureloom-ui-line, #cfd7e3) !important;
      border-radius: 7px !important;
      background: var(--figureloom-ui-surface, #ffffff) !important;
      color: var(--figureloom-ui-text, #253044) !important;
      box-shadow: none !important;
      font: inherit !important;
      font-size: 12px !important;
      font-weight: 750 !important;
      letter-spacing: 0 !important;
      line-height: 1 !important;
      white-space: nowrap !important;
    }

    .title-actions #figureloomVmButton.figureloom-vm-top-button:hover,
    .title-actions #figureloomVmButton.figureloom-vm-top-button:focus-visible {
      border-color: var(--figureloom-ui-accent, #2f7468) !important;
      background: var(--figureloom-ui-accent-soft, #dff1ec) !important;
      color: var(--figureloom-ui-accent-strong, #195c51) !important;
      outline: none !important;
    }

    #figureloomVmPanel {
      position: fixed;
      inset: 0;
      z-index: 1400;
      display: none;
      align-items: start;
      justify-content: end;
      padding: 66px 18px 18px;
      background: transparent !important;
      pointer-events: none;
    }

    #figureloomVmPanel.open {
      display: grid;
    }

    .vm-access-card {
      pointer-events: auto;
      position: relative;
      width: min(520px, calc(100vw - 28px));
      max-height: min(620px, calc(100vh - 84px));
      overflow: auto;
      padding: 16px;
      border: 1px solid var(--figureloom-ui-line, #cddbd7);
      border-radius: 15px;
      background: var(--figureloom-ui-surface, #ffffff);
      color: var(--figureloom-ui-text, #172321);
      box-shadow: 0 18px 55px rgba(15, 23, 42, .22);
    }

    .vm-access-close {
      position: absolute;
      top: 10px;
      right: 10px;
      display: grid;
      place-items: center;
      width: 32px;
      min-width: 32px;
      height: 32px;
      padding: 0 !important;
      border: 1px solid var(--figureloom-ui-line, #d5e2de) !important;
      border-radius: 50% !important;
      background: var(--figureloom-ui-soft, #f6faf8) !important;
      color: var(--figureloom-ui-muted, #43524f) !important;
      box-shadow: none !important;
      font-size: 20px !important;
      font-weight: 750 !important;
      line-height: 1 !important;
      cursor: pointer;
    }

    .vm-access-close:hover,
    .vm-access-close:focus-visible {
      border-color: var(--figureloom-ui-accent, #2f7468) !important;
      color: var(--figureloom-ui-accent-strong, #195c51) !important;
      outline: none !important;
    }

    .vm-access-head {
      display: grid;
      grid-template-columns: 42px minmax(0, 1fr);
      gap: 11px;
      align-items: start;
      padding-right: 42px;
    }

    .vm-access-badge {
      display: grid;
      place-items: center;
      width: 42px;
      height: 42px;
      border: 1px solid var(--figureloom-ui-accent, #2f7468);
      border-radius: 12px;
      background: var(--figureloom-ui-accent-soft, #dff1ec);
      color: var(--figureloom-ui-accent-strong, #195c51);
      font-size: 12px;
      font-weight: 900;
      letter-spacing: .06em;
    }

    .vm-access-head h2 {
      margin: 0 0 4px;
      color: var(--figureloom-ui-text, #172321);
      font-size: 18px;
      line-height: 1.2;
    }

    .vm-access-head p {
      margin: 0;
      color: var(--figureloom-ui-muted, #60706c);
      font-size: 11px;
      line-height: 1.45;
    }

    .vm-access-links {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 9px;
      margin: 15px 0 10px;
    }

    .vm-access-link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 40px;
      padding: 9px 12px;
      border: 1px solid #2f7468;
      border-radius: 10px;
      background: #2f7468;
      color: #ffffff !important;
      box-shadow: none;
      text-align: center;
      text-decoration: none;
      font-size: 12px;
      font-weight: 800;
      line-height: 1.2;
    }

    .vm-access-link-primary {
      border-color: #2f7468;
      background: #2f7468;
      color: #ffffff !important;
    }

    .vm-access-link:hover,
    .vm-access-link:focus-visible {
      border-color: #195c51;
      background: #195c51;
      color: #ffffff !important;
      transform: translateY(-1px);
      outline: none;
      box-shadow: 0 8px 18px rgba(15, 23, 42, .12);
    }

    .vm-access-box {
      margin-top: 10px;
      padding: 11px;
      border: 1px solid var(--figureloom-ui-line, #dbe7e3);
      border-radius: 12px;
      background: var(--figureloom-ui-soft, #f8fbfa);
    }

    .vm-access-box p {
      margin: 5px 0;
      overflow-wrap: anywhere;
      color: var(--figureloom-ui-muted, #5f6f6b);
      font-size: 11px;
      line-height: 1.5;
    }

    .vm-access-check {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin-top: 9px;
      color: var(--figureloom-ui-text, #263a36);
      font-size: 11px;
      font-weight: 700;
      line-height: 1.4;
    }

    .vm-access-check input {
      width: 17px;
      height: 17px;
      flex: 0 0 17px;
      margin-top: 1px;
    }

    html[data-figureloom-theme="dark"] #figureloomVmPanel .vm-access-card {
      border-color: var(--figureloom-ui-line, #46544f);
      background: var(--figureloom-ui-surface, #252b29);
      color: var(--figureloom-ui-text, #eef7f4);
      box-shadow: 0 18px 55px rgba(0, 0, 0, .38);
    }

    html[data-figureloom-theme="dark"] #figureloomVmPanel .vm-access-box {
      border-color: var(--figureloom-ui-line, #46544f);
      background: var(--figureloom-ui-soft, #303735);
    }

    html[data-figureloom-theme="dark"] #figureloomVmPanel .vm-access-link {
      border-color: #2f7468;
      background: #2f7468;
      color: #ffffff !important;
    }

    html[data-figureloom-theme="dark"] #figureloomVmPanel .vm-access-link:hover,
    html[data-figureloom-theme="dark"] #figureloomVmPanel .vm-access-link:focus-visible {
      border-color: #3f8c7d;
      background: #3f8c7d;
      color: #ffffff !important;
    }

    @media (max-width: 820px) {
      #figureloomVmPanel {
        justify-content: center;
        padding-top: 58px;
      }
    }

    @media (max-width: 620px) {
      .vm-access-card {
        width: calc(100vw - 22px);
        max-height: calc(100vh - 70px);
        padding: 14px;
      }

      .vm-access-links {
        grid-template-columns: 1fr;
      }

      .vm-access-head {
        grid-template-columns: 40px minmax(0, 1fr);
      }

      .vm-access-badge {
        width: 40px;
        height: 40px;
      }
    }
  `;
  document.head.appendChild(style);

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closePanel();
  });

  function boot() {
    removeOldPanels();

    if (installButton()) return;

    const observer = new MutationObserver(() => {
      removeOldPanels();
      if (installButton()) observer.disconnect();
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 8000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 0), { once: true });
  } else {
    setTimeout(boot, 0);
  }
})();