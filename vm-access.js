(() => {
  if (window.__figureloomVmAccessInstalled) return;
  window.__figureloomVmAccessInstalled = true;

  const LOGIN_URL = 'https://vm.figureloom.org';
  const PUBLIC_URL = 'https://vm.figureloom.org/#/cast/figureloom';

  function createPanel() {
    if (document.getElementById('figureloomVmPanel')) return;

    const panel = document.createElement('div');
    panel.id = 'figureloomVmPanel';
    panel.innerHTML = `
      <section class="vm-access-card" role="dialog" aria-modal="false" aria-labelledby="vmAccessTitle">
        <button id="figureloomVmClose" class="vm-access-close" type="button" aria-label="Close VM access">×</button>

        <div class="vm-access-head">
          <span class="vm-access-badge" aria-hidden="true">VM</span>
          <div>
            <h2 id="vmAccessTitle">FigureLoom Linux VM</h2>
            <p>Open the browser-based Linux desktop for bioinformatics, files, and advanced tools.</p>
          </div>
        </div>

        <div class="vm-access-links">
          <a href="${PUBLIC_URL}" target="_blank" rel="noopener noreferrer">Open public VM</a>
          <a href="${LOGIN_URL}" target="_blank" rel="noopener noreferrer">Open login screen</a>
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

    panel.querySelector('#figureloomVmClose')?.addEventListener('click', () => {
      panel.classList.remove('open');
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') panel.classList.remove('open');
    });
  }

  function openPanel() {
    createPanel();
    document.getElementById('figureloomVmPanel')?.classList.add('open');
  }

  function installButton() {
    if (document.getElementById('figureloomVmButton')) return true;

    const actions = document.querySelector('.title-actions');
    if (!actions) return false;

    const button = document.createElement('button');
    button.id = 'figureloomVmButton';
    button.type = 'button';
    button.textContent = 'VM';
    button.title = 'Open FigureLoom Linux VM';
    button.addEventListener('click', openPanel);

    const helpButton = document.getElementById('tourHelpButton');
    if (helpButton && helpButton.parentElement === actions) {
      helpButton.insertAdjacentElement('afterend', button);
    } else {
      actions.prepend(button);
    }

    return true;
  }

  const style = document.createElement('style');
  style.textContent = `
    #figureloomVmButton {
      border-color: #79b8a8 !important;
      background: #edf9f5 !important;
      color: #195c51 !important;
      font-weight: 800 !important;
    }

    #figureloomVmButton:hover {
      background: #dff4ee !important;
    }

    #figureloomVmPanel {
      position: fixed;
      inset: 0;
      z-index: 1400;
      display: none;
      place-items: center;
      padding: 18px;
      background: transparent;
      pointer-events: none;
    }

    #figureloomVmPanel.open {
      display: grid;
    }

    .vm-access-card {
      pointer-events: auto;
      position: relative;
      width: min(560px, calc(100vw - 28px));
      max-height: calc(100vh - 30px);
      overflow: auto;
      padding: 17px;
      border: 1px solid #cbdcd7;
      border-radius: 16px;
      background: #ffffff;
      color: #172321;
      box-shadow: 0 28px 90px rgba(0, 0, 0, .28);
    }

    .vm-access-close {
      position: absolute;
      top: 10px;
      right: 10px;
      width: 34px;
      height: 34px;
      border: 1px solid #d5e2de;
      border-radius: 50%;
      background: #f6faf8;
      color: #43524f;
      font-size: 21px;
      line-height: 1;
      cursor: pointer;
    }

    .vm-access-head {
      display: grid;
      grid-template-columns: 44px minmax(0, 1fr);
      gap: 12px;
      align-items: start;
      padding-right: 42px;
    }

    .vm-access-badge {
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: #dff4ee;
      color: #195c51;
      font-weight: 900;
    }

    .vm-access-head h2 {
      margin: 0 0 4px;
      font-size: 18px;
    }

    .vm-access-head p {
      margin: 0;
      color: #60706c;
      font-size: 11px;
      line-height: 1.45;
    }

    .vm-access-links {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 9px;
      margin: 15px 0;
    }

    .vm-access-links a {
      display: grid;
      place-items: center;
      min-height: 42px;
      padding: 9px 12px;
      border: 1px solid #1f7a68;
      border-radius: 10px;
      background: #1f7a68;
      color: #ffffff;
      text-decoration: none;
      font-weight: 800;
      font-size: 12px;
    }

    .vm-access-links a:nth-child(2) {
      border-color: #bcd4ce;
      background: #f4faf8;
      color: #195c51;
    }

    .vm-access-box {
      margin-top: 10px;
      padding: 11px;
      border: 1px solid #dbe7e3;
      border-radius: 12px;
      background: #f8fbfa;
    }

    .vm-access-box p {
      margin: 5px 0;
      color: #5f6f6b;
      font-size: 11px;
      line-height: 1.5;
    }

    .vm-access-check {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin-top: 9px;
      color: #263a36;
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

    html[data-figureloom-theme="dark"] .vm-access-card {
      border-color: #46544f;
      background: #252b29;
      color: #eef7f4;
    }

    html[data-figureloom-theme="dark"] .vm-access-head p,
    html[data-figureloom-theme="dark"] .vm-access-box p {
      color: #a8b7b2;
    }

    html[data-figureloom-theme="dark"] .vm-access-box {
      border-color: #46544f;
      background: #303735;
    }

    html[data-figureloom-theme="dark"] .vm-access-close {
      border-color: #4b5a55;
      background: #303735;
      color: #eef7f4;
    }

    @media (max-width: 620px) {
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

      .vm-access-card {
        padding: 14px;
      }
    }
  `;
  document.head.appendChild(style);

  function boot() {
    if (installButton()) return;

    const observer = new MutationObserver(() => {
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
