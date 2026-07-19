(() => {
  if (window.__figureLoomMobileToolsScrollFixV1) return;
  window.__figureLoomMobileToolsScrollFixV1 = true;

  const root = document.documentElement;
  const ribbon = () => document.querySelector('.ribbon');
  let gesture = null;
  let suppressClick = false;
  let suppressTimer = 0;

  const toolsOpen = () => {
    const node = ribbon();
    return root.dataset.figureloomResolvedMode === 'phone'
      && root.dataset.figureloomPhoneSheet === 'tools'
      && node?.classList.contains('figureloom-phone-sheet-open');
  };

  const isDirectInput = target => Boolean(target?.closest?.('input,select,textarea,[contenteditable="true"]'));

  function beginScroll(event) {
    if (!toolsOpen() || event.pointerType === 'mouse' || isDirectInput(event.target)) return;
    const node = ribbon();
    if (!node) return;
    gesture = {
      id:event.pointerId,
      node,
      startY:event.clientY,
      startScroll:node.scrollTop,
      dragged:false
    };
  }

  function moveScroll(event) {
    if (!gesture || gesture.id !== event.pointerId || !toolsOpen()) return;
    const delta = gesture.startY - event.clientY;
    if (!gesture.dragged && Math.abs(delta) < 5) return;

    if (!gesture.dragged) {
      gesture.dragged = true;
      try { gesture.node.setPointerCapture?.(event.pointerId); } catch {}
    }

    event.preventDefault();
    event.stopPropagation();
    const maximum = Math.max(0, gesture.node.scrollHeight - gesture.node.clientHeight);
    gesture.node.scrollTop = Math.max(0, Math.min(maximum, gesture.startScroll + delta));
    suppressClick = true;
    clearTimeout(suppressTimer);
  }

  function endScroll(event) {
    if (!gesture || gesture.id !== event.pointerId) return;
    try { gesture.node.releasePointerCapture?.(event.pointerId); } catch {}
    const dragged = gesture.dragged;
    gesture = null;
    if (dragged) suppressTimer = setTimeout(() => { suppressClick = false; }, 220);
  }

  function blockAccidentalClick(event) {
    if (!suppressClick || !toolsOpen() || !event.target.closest?.('.ribbon')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    suppressClick = false;
    clearTimeout(suppressTimer);
  }

  const style = document.createElement('style');
  style.id = 'figureloomMobileToolsScrollFixStyle';
  style.textContent = `
    html[data-figureloom-resolved-mode="phone"][data-figureloom-phone-sheet="tools"] .ribbon.figureloom-phone-sheet-open{
      display:block!important;
      overflow-x:hidden!important;
      overflow-y:scroll!important;
      overscroll-behavior-x:none!important;
      overscroll-behavior-y:contain!important;
      touch-action:none!important;
      -webkit-overflow-scrolling:touch!important;
      padding-bottom:calc(104px + env(safe-area-inset-bottom))!important;
      scrollbar-width:none!important;
    }
    html[data-figureloom-resolved-mode="phone"][data-figureloom-phone-sheet="tools"] .ribbon.figureloom-phone-sheet-open::-webkit-scrollbar{display:none!important}
    html[data-figureloom-resolved-mode="phone"][data-figureloom-phone-sheet="tools"] .ribbon.figureloom-phone-sheet-open > #figureloomPhoneToolSections{
      width:100%!important;
      margin:0 0 10px!important;
      box-sizing:border-box!important;
      touch-action:none!important;
    }
    html[data-figureloom-resolved-mode="phone"][data-figureloom-phone-sheet="tools"] .ribbon.figureloom-phone-sheet-open > .tool-group{
      width:100%!important;
      margin:0 0 10px!important;
      box-sizing:border-box!important;
      touch-action:none!important;
    }
    html[data-figureloom-resolved-mode="phone"][data-figureloom-phone-sheet="tools"] .ribbon.figureloom-phone-sheet-open :where(button,label){touch-action:none!important}
    html[data-figureloom-resolved-mode="phone"][data-figureloom-phone-sheet="tools"] .ribbon.figureloom-phone-sheet-open :where(input,select,textarea,[contenteditable="true"]){touch-action:auto!important}
  `;
  document.head.appendChild(style);

  document.addEventListener('pointerdown', beginScroll, true);
  document.addEventListener('pointermove', moveScroll, { capture:true, passive:false });
  document.addEventListener('pointerup', endScroll, true);
  document.addEventListener('pointercancel', endScroll, true);
  document.addEventListener('click', blockAccidentalClick, true);
  addEventListener('figureloom-settings-change', () => {
    gesture = null;
    suppressClick = false;
    clearTimeout(suppressTimer);
  });

  window.FigureLoomMobileToolsScrollFix = Object.freeze({ active:toolsOpen });
})();
