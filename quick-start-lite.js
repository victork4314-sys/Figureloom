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
    <div class="quick-start-lite-heading">
      <strong>Start your figure</strong>
      <span>Choose what you want to add first.</span>
    </div>
    <div class="quick-start-lite-actions">
      <button type="button" data-action="text"><strong>Text label</strong><span>Add editable text</span></button>
      <button type="button" data-action="science"><strong>Illustration</strong><span>Browse scientific artwork</span></button>
      <button type="button" data-action="template"><strong>Template</strong><span>Use a ready-made layout</span></button>
      <button type="button" data-action="project"><strong>Open project</strong><span>Continue existing work</span></button>
    </div>
  `;

  const style = document.createElement('style');
  style.textContent = `
    #figureloomQuickStartLite{position:absolute;z-index:8;left:50%;bottom:58px;transform:translateX(-50%);width:min(470px,calc(100% - 32px));box-sizing:border-box;padding:17px;border:1px solid #dbe2ea;border-radius:17px;background:linear-gradient(180deg,rgba(255,255,255,.99),rgba(248,250,255,.98));color:#253044;box-shadow:0 18px 48px rgba(37,48,68,.20);overflow:hidden;backdrop-filter:blur(12px)}
    #figureloomQuickStartLite::before{content:"";position:absolute;inset:0 0 auto;height:4px;background:linear-gradient(90deg,#2563eb,#7c3aed)}
    .quick-start-lite-heading{padding-right:34px}
    .quick-start-lite-heading strong,.quick-start-lite-heading span{display:block}
    .quick-start-lite-heading strong{font-size:16px;letter-spacing:-.01em}
    .quick-start-lite-heading span{margin-top:4px;color:#6b7280;font-size:11px}
    .quick-start-lite-close{position:absolute;z-index:1;right:10px;top:10px;display:grid;place-items:center;width:30px;height:30px;padding:0;border:1px solid #dbe2ea;border-radius:50%;background:#fff;color:#6b7280;font-size:18px;line-height:1}
    .quick-start-lite-close:hover{background:#f4f7fb;color:#253044}
    .quick-start-lite-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}
    .quick-start-lite-actions button{display:grid;gap:3px;min-height:62px;padding:10px 12px;border:1px solid #cfd7e3;border-radius:11px;background:#fff;color:#253044;text-align:left;font:inherit}
    .quick-start-lite-actions button:hover{border-color:#a9bce8;background:#f4f7fb;box-shadow:0 5px 14px rgba(37,99,235,.08)}
    .quick-start-lite-actions button:active{transform:translateY(1px)}
    .quick-start-lite-actions strong,.quick-start-lite-actions span{display:block}
    .quick-start-lite-actions strong{font-size:11px}
    .quick-start-lite-actions span{color:#6b7280;font-size:9px;line-height:1.3}
    @media(max-width:560px){#figureloomQuickStartLite{bottom:42px;width:calc(100% - 24px);padding:15px}.quick-start-lite-actions{grid-template-columns:1fr 1fr}.quick-start-lite-actions button{min-height:58px;padding:9px 10px}}
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
