(() => {
  if (window.__figureLoomGentleRichTextPolishV1) return;
  window.__figureLoomGentleRichTextPolishV1 = true;

  let lastEnterAt = 0;

  function selectedTextItem() {
    try {
      const item = typeof selectedObject === 'function' ? selectedObject() : null;
      if (item?.type === 'text') return item;
    } catch {}
    const id = state?.selectedId || '';
    return (state?.objects || []).find(item => item?.type === 'text' && item.id === id) || null;
  }

  function textItems(id) {
    const found = [];
    const seen = new Set();
    const add = item => {
      if (!item || item.type !== 'text' || item.id !== id || seen.has(item)) return;
      seen.add(item);
      found.push(item);
    };
    (state?.objects || []).forEach(add);
    (state?.pages || []).forEach(page => (page.objects || []).forEach(add));
    return found;
  }

  function meaningful(html) {
    const root = document.createElement('div');
    root.innerHTML = String(html || '');
    return Boolean(root.textContent?.replace(/\u00a0/g, ' ').trim() || root.querySelector('[data-figure-label],[data-figure-ref],a[href]'));
  }

  function plainFromHtml(html) {
    const root = document.createElement('div');
    root.innerHTML = String(html || '');
    return String(root.innerText || root.textContent || '').replace(/\u00a0/g, ' ').trimEnd();
  }

  function groupFromEvent(event) {
    return event.composedPath?.().find(node =>
      node instanceof Element && node.classList?.contains('canvas-object') && node.hasAttribute('data-id')
    ) || event.target.closest?.('.canvas-object[data-id]') || null;
  }

  function openFallback(id) {
    if (!id) return;
    requestAnimationFrame(() => {
      const overlay = document.getElementById('figureloomRichTextOverlay');
      if (overlay && !overlay.hidden) return;
      if (typeof window.openFigureLoomRichTextEditor === 'function') window.openFigureLoomRichTextEditor(id);
    });
  }

  document.addEventListener('click', event => {
    if (!event.target.closest?.('#openFigureLoomRichText')) return;
    openFallback(selectedTextItem()?.id || '');
  }, true);

  document.addEventListener('dblclick', event => {
    const group = groupFromEvent(event);
    if (group) openFallback(group.dataset.id || '');
  }, true);

  document.addEventListener('click', event => {
    const button = event.target.closest?.('#figureloomRichTextOverlay [data-rich-save]');
    if (!button) return;
    const editor = document.querySelector('#figureloomRichTextOverlay [data-rich-editor]');
    const item = selectedTextItem();
    const html = editor?.innerHTML || '';
    if (!item || !meaningful(html)) return;

    button.textContent = 'Saved';
    const id = item.id;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const matches = textItems(id);
      if (!matches.length || matches.some(entry => meaningful(entry.richTextHtml))) return;
      const text = plainFromHtml(html);
      matches.forEach(entry => {
        entry.richTextHtml = html;
        entry.text = text;
        entry.name = text.trim().slice(0, 40) || 'Text label';
      });
      try { render?.(); } catch {}
      try { renderPages?.(); } catch {}
      try { scheduleSave?.(); } catch {}
    }));
  }, true);

  function placeCaret(node) {
    const range = document.createRange();
    range.selectNodeContents(node);
    range.collapse(true);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }

  document.addEventListener('beforeinput', event => {
    if (event.inputType !== 'insertParagraph' || event.isComposing) return;
    const editor = document.querySelector('#figureloomRichTextOverlay [data-rich-editor]');
    if (!editor || !editor.contains(event.target)) return;
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
      return;
    }
    lastEnterAt = now;
    event.preventDefault();
    event.stopPropagation();

    if (!range.collapsed) {
      range.deleteContents();
      if (selection.rangeCount) range = selection.getRangeAt(0);
    }

    if (!item.textContent?.replace(/\u00a0/g, ' ').trim()) {
      const list = item.parentElement;
      const paragraph = document.createElement('p');
      paragraph.appendChild(document.createElement('br'));
      list.after(paragraph);
      item.remove();
      if (!list.querySelector('li')) list.remove();
      placeCaret(paragraph);
    } else {
      const next = document.createElement('li');
      try {
        const tail = document.createRange();
        tail.setStart(range.startContainer, range.startOffset);
        tail.setEnd(item, item.childNodes.length);
        next.appendChild(tail.extractContents());
      } catch {}
      if (!next.childNodes.length) next.appendChild(document.createElement('br'));
      item.after(next);
      placeCaret(next);
    }

    editor.dispatchEvent(new Event('input', { bubbles:true }));
  }, true);

  const style = document.createElement('style');
  style.id = 'figureloomGentleRichTextPolishStyle';
  style.textContent = `
    #figureloomRichTextControls{margin-top:12px!important;padding:10px!important;border:1px solid #d9e0e9!important;border-radius:8px!important;background:#fff!important}
    #figureloomRichTextControls h3{margin:0 0 9px!important;color:#596579!important;font-size:11px!important;letter-spacing:.06em!important;text-transform:uppercase!important}
    #openFigureLoomRichText{width:100%!important;min-height:36px!important;margin:0 0 9px!important;padding:7px 10px!important;border:1px solid #cfd7e3!important;border-radius:7px!important;background:#f7f9fc!important;color:#253044!important;font-size:11px!important;font-weight:700!important;box-shadow:none!important}
    #openFigureLoomRichText:hover:not(:disabled){background:#eef4ff!important;border-color:#9db5e8!important;color:#2457a7!important}
    #figureloomRichTextControls .rich-inspector-grid{gap:8px!important}
    #figureloomRichTextControls .rich-inspector-grid label{color:#6b7280!important;font-size:10px!important}
    #figureloomRichTextControls .rich-inspector-grid input,#figureloomRichTextControls .rich-inspector-grid select{min-height:32px!important;border:1px solid #cfd7e3!important;border-radius:6px!important;background:#fff!important;color:#253044!important}
    html[data-figureloom-theme="dark"] #figureloomRichTextControls{background:#30353d!important;border-color:#454c57!important}
    html[data-figureloom-theme="dark"] #figureloomRichTextControls h3{color:#c8ced7!important}
    html[data-figureloom-theme="dark"] #openFigureLoomRichText{background:#373d46!important;border-color:#505864!important;color:#eef1f4!important}
    html[data-figureloom-theme="dark"] #figureloomRichTextControls .rich-inspector-grid label{color:#aab2bd!important}
    html[data-figureloom-theme="dark"] #figureloomRichTextControls .rich-inspector-grid input,html[data-figureloom-theme="dark"] #figureloomRichTextControls .rich-inspector-grid select{background:#343a43!important;border-color:#505864!important;color:#eef1f4!important}
  `;
  document.head.appendChild(style);
})();
