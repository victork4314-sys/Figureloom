(() => {
  if (window.__figureloomQuickStartLite) return;
  window.__figureloomQuickStartLite = true;

  const canvasArea = document.querySelector('.canvas-area');
  if (!canvasArea || typeof state === 'undefined' || !Array.isArray(state.objects)) return;
  if (state.objects.length || sessionStorage.getItem('figureloom-quick-start-dismissed') === '1') return;

  const panel = document.createElement('section');
  panel.id = 'figureloomQuickStartLite';
  panel.setAttribute('aria-label', 'Quick add');
  panel.innerHTML = `
    <button class="quick-start-lite-close" type="button" aria-label="Close quick add">×</button>
    <strong>Quick add</strong>
    <span>Start with one of these.</span>
    <div class="quick-start-lite-actions">
      <button type="button" data-action="text">Text label</button>
      <button type="button" data-action="science">Scientific illustration</button>
      <button type="button" data-action="template">Template</button>
      <button type="button" data-action="project">Open project</button>
    </div>
  `;

  const style = document.createElement('style');
  style.textContent = `
    #figureloomQuickStartLite{position:absolute;z-index:8;left:50%;top:72px;transform:translateX(-50%);width:min(420px,calc(100% - 28px));box-sizing:border-box;padding:14px;border:1px solid #cfd7e3;border-radius:12px;background:#fff;color:#253044;box-shadow:0 12px 32px rgba(37,48,68,.16)}
    #figureloomQuickStartLite>strong,#figureloomQuickStartLite>span{display:block}
    #figureloomQuickStartLite>strong{font-size:14px}
    #figureloomQuickStartLite>span{margin-top:3px;color:#6b7280;font-size:10px}
    .quick-start-lite-close{position:absolute;right:7px;top:6px;width:30px;height:30px;border:0;background:transparent;color:#6b7280;font-size:20px}
    .quick-start-lite-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:11px}
    .quick-start-lite-actions button{min-height:42px;padding:8px;border:1px solid #cfd7e3;border-radius:8px;background:#f4f7fb;color:#253044;font:inherit;font-size:10px;font-weight:650}
    .quick-start-lite-actions button:active{transform:translateY(1px)}
    @media(max-width:560px){#figureloomQuickStartLite{top:60px}.quick-start-lite-actions{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
  canvasArea.appendChild(panel);

  function close(remember = false) {
    if (remember) sessionStorage.setItem('figureloom-quick-start-dismissed', '1');
    panel.remove();
    style.remove();
  }

  panel.querySelector('.quick-start-lite-close').addEventListener('click', () => close(true));
  panel.querySelector('[data-action="text"]').addEventListener('click', () => {
    close();
    document.getElementById('addTextButton')?.click();
  });
  panel.querySelector('[data-action="science"]').addEventListener('click', () => {
    close();
    document.querySelector('.ribbon-tab[data-tab="science"]')?.click();
    document.getElementById('scienceDrawer')?.classList.add('open');
  });
  panel.querySelector('[data-action="template"]').addEventListener('click', () => {
    close();
    document.getElementById('templateDrawer')?.classList.add('open');
  });
  panel.querySelector('[data-action="project"]').addEventListener('click', () => {
    close();
    const fileInput = document.getElementById('projectFile');
    if (fileInput) fileInput.click();
    else document.getElementById('projectDrawer')?.classList.add('open');
  });
})();
