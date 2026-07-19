(() => {
  if (window.__figureLoomGentleRichTextPolishV2) return;
  window.__figureLoomGentleRichTextPolishV2 = true;

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

  document.getElementById('figureloomGentleRichTextPolishStyle')?.remove();
  const style = document.createElement('style');
  style.id = 'figureloomGentleRichTextPolishStyle';
  style.textContent = `
    html[data-figureloom-theme] #figureloomRichTextControls{
      margin-top:12px!important;
      padding:11px!important;
      color:var(--figureloom-ui-text,#172321)!important;
      background:var(--figureloom-ui-surface,#fff)!important;
      border:1px solid var(--figureloom-ui-line,#cddbd7)!important;
      border-radius:10px!important;
      box-shadow:none!important;
    }
    html[data-figureloom-theme] #figureloomRichTextControls h3{
      margin:0 0 9px!important;
      color:var(--figureloom-ui-muted,#60706c)!important;
      font-size:11px!important;
      letter-spacing:.06em!important;
      text-transform:uppercase!important;
    }
    html[data-figureloom-theme] #openFigureLoomRichText{
      width:100%!important;
      min-height:36px!important;
      margin:0 0 9px!important;
      padding:7px 10px!important;
      color:var(--figureloom-ui-text,#172321)!important;
      background:var(--figureloom-ui-soft,#edf3f1)!important;
      border:1px solid var(--figureloom-ui-line,#cddbd7)!important;
      border-radius:8px!important;
      font-size:11px!important;
      font-weight:700!important;
      box-shadow:none!important;
    }
    html[data-figureloom-theme] #openFigureLoomRichText:hover:not(:disabled){
      color:var(--figureloom-ui-accent-strong,#195c51)!important;
      background:var(--figureloom-ui-accent-soft,#dff1ec)!important;
      border-color:var(--figureloom-ui-accent,#2f7468)!important;
    }
    html[data-figureloom-theme] #figureloomRichTextControls .rich-inspector-grid{gap:8px!important}
    html[data-figureloom-theme] #figureloomRichTextControls .rich-inspector-grid label{
      color:var(--figureloom-ui-muted,#60706c)!important;
      font-size:10px!important;
    }
    html[data-figureloom-theme] #figureloomRichTextControls .rich-inspector-grid input,
    html[data-figureloom-theme] #figureloomRichTextControls .rich-inspector-grid select{
      min-height:32px!important;
      color:var(--figureloom-ui-text,#172321)!important;
      background:var(--figureloom-ui-surface,#fff)!important;
      border:1px solid var(--figureloom-ui-line,#cddbd7)!important;
      border-radius:7px!important;
    }

    html[data-figureloom-theme] .right-panel :where(button,input,select,textarea):disabled{
      color:var(--figureloom-ui-muted,#60706c)!important;
      -webkit-text-fill-color:var(--figureloom-ui-muted,#60706c)!important;
      background:var(--figureloom-ui-soft,#edf3f1)!important;
      border-color:var(--figureloom-ui-line,#cddbd7)!important;
      opacity:.72!important;
      box-shadow:none!important;
    }
    html[data-figureloom-theme] .right-panel button:disabled{cursor:not-allowed!important}

    html[data-figureloom-theme] #figureloomRichTextOverlay{
      color:var(--figureloom-ui-text,#172321)!important;
      background:color-mix(in srgb,var(--figureloom-ui-bg,#181d1c) 76%,transparent)!important;
    }
    html[data-figureloom-theme] #figureloomRichTextOverlay .figureloom-rich-editor{
      color:var(--figureloom-ui-text,#172321)!important;
      background:var(--figureloom-ui-surface,#fff)!important;
      border-color:var(--figureloom-ui-line,#cddbd7)!important;
      box-shadow:0 30px 90px var(--figureloom-ui-shadow,rgba(12,46,40,.22))!important;
    }
    html[data-figureloom-theme] #figureloomRichTextOverlay .figureloom-rich-editor>header,
    html[data-figureloom-theme] #figureloomRichTextOverlay .figureloom-rich-editor>footer{
      color:var(--figureloom-ui-text,#172321)!important;
      background:var(--figureloom-ui-soft,#edf3f1)!important;
      border-color:var(--figureloom-ui-line,#cddbd7)!important;
    }
    html[data-figureloom-theme] #figureloomRichTextOverlay .figureloom-rich-editor header small{
      color:var(--figureloom-ui-muted,#60706c)!important;
    }
    html[data-figureloom-theme] #figureloomRichTextOverlay .rich-toolbar,
    html[data-figureloom-theme] #figureloomRichTextOverlay .rich-symbols{
      color:var(--figureloom-ui-text,#172321)!important;
      background:var(--figureloom-ui-surface,#fff)!important;
      border-color:var(--figureloom-ui-line,#cddbd7)!important;
    }
    html[data-figureloom-theme] #figureloomRichTextOverlay .rich-science-toolbar{
      color:var(--figureloom-ui-text,#172321)!important;
      background:var(--figureloom-ui-soft,#edf3f1)!important;
      border-color:var(--figureloom-ui-line,#cddbd7)!important;
    }
    html[data-figureloom-theme] #figureloomRichTextOverlay :where(
      .rich-toolbar button,.rich-science-toolbar button,.rich-symbols button,
      .rich-toolbar select,.rich-science-toolbar select,.rich-toolbar label,.rich-science-toolbar label,
      .figureloom-rich-editor footer button
    ){
      color:var(--figureloom-ui-text,#172321)!important;
      background:var(--figureloom-ui-surface,#fff)!important;
      border-color:var(--figureloom-ui-line,#cddbd7)!important;
      box-shadow:none!important;
    }
    html[data-figureloom-theme] #figureloomRichTextOverlay :where(
      .rich-toolbar button,.rich-science-toolbar button,.rich-symbols button,.figureloom-rich-editor footer button
    ):hover:not(:disabled){
      color:var(--figureloom-ui-accent-strong,#195c51)!important;
      background:var(--figureloom-ui-accent-soft,#dff1ec)!important;
      border-color:var(--figureloom-ui-accent,#2f7468)!important;
    }
    html[data-figureloom-theme] #figureloomRichTextOverlay option{
      color:var(--figureloom-ui-text,#172321)!important;
      background:var(--figureloom-ui-surface,#fff)!important;
    }
    html[data-figureloom-theme] #figureloomRichTextOverlay input[type="color"]{
      background:var(--figureloom-ui-soft,#edf3f1)!important;
    }
    html[data-figureloom-theme] #figureloomRichTextOverlay .rich-editable{
      color:var(--figureloom-ui-text,#172321)!important;
      caret-color:var(--figureloom-ui-text,#172321)!important;
      background:var(--figureloom-ui-surface,#fff)!important;
      border-color:var(--figureloom-ui-line,#cddbd7)!important;
      box-shadow:inset 0 1px 0 var(--figureloom-ui-shadow-soft,rgba(12,46,40,.10))!important;
    }
    html[data-figureloom-theme] #figureloomRichTextOverlay .rich-editable:focus{
      border-color:var(--figureloom-ui-accent,#2f7468)!important;
      box-shadow:0 0 0 3px color-mix(in srgb,var(--figureloom-ui-accent,#2f7468) 20%,transparent)!important;
    }
    html[data-figureloom-theme] #figureloomRichTextOverlay .rich-editable a{
      color:var(--figureloom-ui-accent-strong,#195c51)!important;
    }
    html[data-figureloom-theme] #figureloomRichTextOverlay [data-rich-save]{
      color:var(--figureloom-ui-accent-ink,#fff)!important;
      background:var(--figureloom-ui-accent,#2f7468)!important;
      border-color:var(--figureloom-ui-accent,#2f7468)!important;
    }
    html[data-figureloom-theme] #figureloomRichTextOverlay [data-rich-close]{
      color:var(--figureloom-ui-muted,#60706c)!important;
      background:transparent!important;
      border-color:transparent!important;
    }
  `;
  document.head.appendChild(style);
})();