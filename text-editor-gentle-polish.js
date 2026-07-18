(() => {
  if (window.__figureLoomTextEditorGentlePolishV1) return;
  window.__figureLoomTextEditorGentlePolishV1 = true;

  let activeId = '';
  let lastEnterAt = 0;
  let lastTapId = '';
  let lastTapAt = 0;

  const selectedText = () => {
    try {
      const item = typeof selectedObject === 'function' ? selectedObject() : null;
      return item?.type === 'text' ? item : null;
    } catch {
      return null;
    }
  };

  function wrapOpen() {
    const current = window.openFigureLoomRichTextEditor;
    if (typeof current !== 'function') return false;
    if (current.__figureLoomGentleOpenV1) return true;
    const wrapped = function gentleRichTextOpen(id) {
      const resolved = id || selectedText()?.id || activeId;
      if (resolved) activeId = resolved;
      return current.call(this, resolved);
    };
    wrapped.__figureLoomGentleOpenV1 = true;
    window.openFigureLoomRichTextEditor = wrapped;
    return true;
  }

  function editorParts() {
    const overlay = document.getElementById('figureloomRichTextOverlay');
    const editor = overlay?.querySelector('[data-rich-editor]');
    return { overlay, editor };
  }

  function splitListItem(event) {
    const { overlay, editor } = editorParts();
    if (!overlay || overlay.hidden || !editor || event.isComposing) return;
    const keyboard = event.type === 'keydown' && event.key === 'Enter' && !event.shiftKey;
    const input = event.type === 'beforeinput' && event.inputType === 'insertParagraph';
    if (!keyboard && !input) return;

    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    let range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return;
    const anchor = range.startContainer.nodeType === Node.ELEMENT_NODE ? range.startContainer : range.startContainer.parentElement;
    const item = anchor?.closest?.('li');
    if (!item || !editor.contains(item)) return;

    const now = performance.now();
    if (now - lastEnterAt < 140) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    lastEnterAt = now;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (!range.collapsed) {
      range.deleteContents();
      if (selection.rangeCount) range = selection.getRangeAt(0);
    }

    if (!item.textContent.replace(/\u00a0/g, ' ').trim()) {
      const list = item.parentElement;
      const paragraph = document.createElement('p');
      paragraph.appendChild(document.createElement('br'));
      list.after(paragraph);
      item.remove();
      if (!list.querySelector('li')) list.remove();
      range = document.createRange();
      range.selectNodeContents(paragraph);
      range.collapse(true);
    } else {
      const tailRange = document.createRange();
      try {
        tailRange.setStart(range.startContainer, range.startOffset);
        tailRange.setEnd(item, item.childNodes.length);
      } catch {
        tailRange.selectNodeContents(item);
        tailRange.collapse(false);
      }
      const next = document.createElement('li');
      next.appendChild(tailRange.extractContents());
      if (!next.textContent.trim()) next.appendChild(document.createElement('br'));
      item.after(next);
      range = document.createRange();
      range.selectNodeContents(next);
      range.collapse(true);
    }

    selection.removeAllRanges();
    selection.addRange(range);
    editor.dispatchEvent(new Event('input', { bubbles:true }));
  }

  document.addEventListener('pointerdown', event => {
    const save = event.target.closest?.('#figureloomRichTextOverlay [data-rich-save]');
    if (!save) return;
    save.textContent = 'Saving…';
    save.setAttribute('aria-busy', 'true');
  }, true);

  document.addEventListener('click', event => {
    const save = event.target.closest?.('#figureloomRichTextOverlay [data-rich-save]');
    if (save) {
      const { overlay } = editorParts();
      if (overlay) overlay.style.opacity = '0';
      requestAnimationFrame(() => {
        if (overlay) overlay.style.opacity = '';
      });
      return;
    }

    const button = event.target.closest?.('#openFigureLoomRichText');
    if (!button) return;
    const { overlay } = editorParts();
    if (overlay && !overlay.hidden) return;
    const item = selectedText();
    if (!item || typeof window.openFigureLoomRichTextEditor !== 'function') return;
    event.preventDefault();
    event.stopPropagation();
    activeId = item.id;
    window.openFigureLoomRichTextEditor(item.id);
  }, true);

  document.addEventListener('keydown', splitListItem, true);
  document.addEventListener('beforeinput', splitListItem, true);

  document.addEventListener('dblclick', event => {
    const group = event.composedPath?.().find(node => node instanceof Element && node.classList?.contains('canvas-object') && node.dataset?.id);
    const id = group?.dataset?.id || '';
    if (!id || typeof window.openFigureLoomRichTextEditor !== 'function') return;
    activeId = id;
    window.openFigureLoomRichTextEditor(id);
  }, true);

  document.addEventListener('pointerup', event => {
    const group = event.composedPath?.().find(node => node instanceof Element && node.classList?.contains('canvas-object') && node.dataset?.id);
    const id = group?.dataset?.id || '';
    if (!id) return;
    const now = performance.now();
    if (id === lastTapId && now - lastTapAt < 900 && typeof window.openFigureLoomRichTextEditor === 'function') {
      activeId = id;
      window.openFigureLoomRichTextEditor(id);
      lastTapId = '';
      lastTapAt = 0;
      return;
    }
    lastTapId = id;
    lastTapAt = now;
  }, true);

  const style = document.createElement('style');
  style.id = 'figureloomGentleRichTextPolish';
  style.textContent = `
    #figureloomRichTextControls{display:grid!important;gap:8px!important;margin-top:12px!important;padding:10px!important;border:1px solid #d9e0e9!important;border-radius:8px!important;background:#fff!important;box-shadow:none!important}
    #figureloomRichTextControls h3{margin:0!important;color:#596579!important;font-size:10px!important;font-weight:700!important;letter-spacing:.06em!important;text-transform:uppercase!important}
    #openFigureLoomRichText{width:100%!important;min-height:36px!important;margin:0!important;padding:7px 10px!important;border:1px solid #cfd7e3!important;border-radius:7px!important;background:#f7f9fc!important;color:#253044!important;font-size:11px!important;font-weight:700!important;box-shadow:none!important}
    #openFigureLoomRichText:hover:not(:disabled){background:#eef4ff!important;border-color:#9db5e8!important;color:#2457a7!important}
    #figureloomRichTextControls .rich-inspector-grid{gap:8px!important}
    #figureloomRichTextControls .rich-inspector-grid label{color:#6b7280!important;font-size:10px!important}
    #figureloomRichTextOverlay{transition:opacity .08s ease}
    #figureloomRichTextOverlay [data-rich-save][aria-busy="true"]{cursor:wait;opacity:.86}
    html[data-figureloom-theme="dark"] #figureloomRichTextControls{background:#30353d!important;border-color:#454c57!important}
    html[data-figureloom-theme="dark"] #figureloomRichTextControls h3{color:#c8ced7!important}
    html[data-figureloom-theme="dark"] #openFigureLoomRichText{background:#373d46!important;border-color:#505864!important;color:#eef1f4!important}
    html[data-figureloom-theme="dark"] #openFigureLoomRichText:hover:not(:disabled){background:#414852!important;border-color:#66717f!important;color:#fff!important}
  `;
  document.head.appendChild(style);

  const install = () => {
    wrapOpen();
    const button = document.getElementById('openFigureLoomRichText');
    if (!button || typeof window.openFigureLoomRichTextEditor !== 'function') setTimeout(install, 80);
  };
  install();
})();