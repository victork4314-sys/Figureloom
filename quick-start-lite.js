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
    <span class="quick-start-lite-glow quick-start-lite-glow-one" aria-hidden="true"></span>
    <span class="quick-start-lite-glow quick-start-lite-glow-two" aria-hidden="true"></span>
    <button class="quick-start-lite-close" type="button" aria-label="Close quick add">×</button>
    <div class="quick-start-lite-heading">
      <span class="quick-start-lite-kicker">New figure</span>
      <strong>What do you want to start with?</strong>
      <span>Pick one. Everything stays editable.</span>
    </div>
    <div class="quick-start-lite-actions">
      <button type="button" data-action="text"><span class="quick-start-lite-icon" aria-hidden="true">T</span><span class="quick-start-lite-copy"><strong>Text label</strong><span>Write directly on the canvas</span></span></button>
      <button type="button" data-action="science"><span class="quick-start-lite-icon" aria-hidden="true">✦</span><span class="quick-start-lite-copy"><strong>Illustration</strong><span>Browse scientific artwork</span></span></button>
      <button type="button" data-action="template"><span class="quick-start-lite-icon" aria-hidden="true">▦</span><span class="quick-start-lite-copy"><strong>Template</strong><span>Start with a ready layout</span></span></button>
      <button type="button" data-action="project"><span class="quick-start-lite-icon" aria-hidden="true">↗</span><span class="quick-start-lite-copy"><strong>Open project</strong><span>Continue existing work</span></span></button>
    </div>
  `;

  const style = document.createElement('style');
  style.textContent = `
    #figureloomQuickStartLite{position:absolute;z-index:8;left:50%;bottom:34px;transform:translateX(-50%);width:min(520px,calc(100% - 32px));box-sizing:border-box;padding:20px;border:1px solid rgba(173,187,214,.72);border-radius:22px;background:linear-gradient(145deg,rgba(255,255,255,.98),rgba(246,248,255,.97));color:#253044;box-shadow:0 24px 70px rgba(37,48,68,.22),0 3px 12px rgba(37,99,235,.08);overflow:hidden;backdrop-filter:blur(16px)}
    #figureloomQuickStartLite::before{content:"";position:absolute;inset:0 0 auto;height:5px;background:linear-gradient(90deg,#2563eb 0%,#6d7df2 52%,#7c3aed 100%)}
    .quick-start-lite-glow{position:absolute;border-radius:50%;filter:blur(2px);pointer-events:none;opacity:.65}
    .quick-start-lite-glow-one{right:-70px;top:-95px;width:210px;height:210px;background:radial-gradient(circle,rgba(124,58,237,.16),rgba(124,58,237,0) 68%)}
    .quick-start-lite-glow-two{left:-80px;bottom:-105px;width:230px;height:230px;background:radial-gradient(circle,rgba(37,99,235,.13),rgba(37,99,235,0) 68%)}
    .quick-start-lite-heading{position:relative;padding-right:40px}
    .quick-start-lite-heading strong,.quick-start-lite-heading>span{display:block}
    .quick-start-lite-kicker{width:max-content;margin-bottom:7px;padding:4px 8px;border:1px solid #cdd9f5;border-radius:999px;background:#edf3ff;color:#315fb8;font-size:8px;font-weight:800;letter-spacing:.09em;text-transform:uppercase}
    .quick-start-lite-heading strong{font-size:19px;line-height:1.15;letter-spacing:-.025em}
    .quick-start-lite-heading>span:last-child{margin-top:5px;color:#6b7280;font-size:11px}
    .quick-start-lite-close{position:absolute;z-index:2;right:12px;top:12px;display:grid;place-items:center;width:32px;height:32px;padding:0;border:1px solid #d7dfeb;border-radius:50%;background:rgba(255,255,255,.82);color:#687386;font-size:19px;line-height:1;box-shadow:0 4px 10px rgba(37,48,68,.07)}
    .quick-start-lite-close:hover{background:#fff;color:#253044}
    .quick-start-lite-actions{position:relative;display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:17px}
    .quick-start-lite-actions button{display:grid;grid-template-columns:38px 1fr;gap:10px;align-items:center;min-height:72px;padding:11px;border:1px solid #d4ddea;border-radius:14px;background:rgba(255,255,255,.86);color:#253044;text-align:left;font:inherit;box-shadow:0 5px 16px rgba(37,48,68,.055)}
    .quick-start-lite-actions button:hover{border-color:#9fb4e8;background:#fff;box-shadow:0 9px 22px rgba(37,99,235,.10);transform:translateY(-1px)}
    .quick-start-lite-actions button:active{transform:translateY(0)}
    .quick-start-lite-icon{display:grid;place-items:center;width:38px;height:38px;border:1px solid #cdd9f5;border-radius:12px;background:linear-gradient(145deg,#edf3ff,#f3efff);color:#315fb8;font-size:16px;font-weight:800}
    .quick-start-lite-copy,.quick-start-lite-copy strong,.quick-start-lite-copy span{display:block;min-width:0}
    .quick-start-lite-copy strong{font-size:11px}
    .quick-start-lite-copy span{margin-top:3px;color:#6b7280;font-size:9px;line-height:1.35}
    @media(max-width:560px){#figureloomQuickStartLite{bottom:22px;width:calc(100% - 22px);padding:17px;border-radius:19px}.quick-start-lite-heading strong{font-size:17px}.quick-start-lite-actions{gap:7px}.quick-start-lite-actions button{grid-template-columns:34px 1fr;min-height:64px;padding:9px}.quick-start-lite-icon{width:34px;height:34px;border-radius:10px}}
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
