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

  const style = document.createElement('style');
  style.id = 'figureloomGentleRichTextPolishStyle';
  style.textContent = `
    html[data-figureloom-theme] .right-panel{
      --inspector-gap:10px;
    }
    html[data-figureloom-theme] .right-panel .inspector-section{
      margin:0!important;
      padding:14px!important;
      color:var(--figureloom-ui-text,#172321)!important;
      background:var(--figureloom-ui-surface,#fff)!important;
      border-color:var(--figureloom-ui-line,#cddbd7)!important;
    }
    html[data-figureloom-theme] .right-panel .inspector-section + .inspector-section{
      border-top:0!important;
    }
    html[data-figureloom-theme] .right-panel :where(.field-grid,.rich-inspector-grid){gap:8px!important}
    html[data-figureloom-theme] .right-panel :where(label,.full-field){
      color:var(--figureloom-ui-muted,#60706c)!important;
    }
    html[data-figureloom-theme] .right-panel :where(input:not([type="range"]),select,textarea,button){
      min-height:34px;
      border-radius:8px!important;
      border-color:var(--figureloom-ui-line,#cddbd7)!important;
      box-shadow:none!important;
    }
    html[data-figureloom-theme] .right-panel :where(input:not([type="range"]),select,textarea){
      color:var(--figureloom-ui-text,#172321)!important;
      background:var(--figureloom-ui-surface,#fff)!important;
    }
    html[data-figureloom-theme] .right-panel :where(button,input,select,textarea):disabled{
      color:var(--figureloom-ui-muted,#60706c)!important;
      background:var(--figureloom-ui-soft,#edf3f1)!important;
      border-color:var(--figureloom-ui-line,#cddbd7)!important;
      opacity:.68!important;
      cursor:not-allowed!important;
    }
    html[data-figureloom-theme] .right-panel input[type="range"]:disabled{opacity:.48!important}
    html[data-figureloom-theme] .right-panel :where(fieldset,details,.inspector-card,[class*="inspector-card"],[class*="control-card"]){
      color:var(--figureloom-ui-text,#172321)!important;
      background:var(--figureloom-ui-soft,#edf3f1)!important;
      border-color:var(--figureloom-ui-line,#cddbd7)!important;
      border-radius:10px!important;
    }

    html[data-figureloom-theme] #figureloomRichTextControls{
      margin-top:12px!important;
      padding:12px!important;
      border:1px solid var(--figureloom-ui-line,#cddbd7)!important;
      border-radius:10px!important;
      background:var(--figureloom-ui-soft,#edf3f1)!important;
      color:var(--figureloom-ui-text,#172321)!important;
      box-shadow:none!important;
    }
    html[data-figureloom-theme] #figureloomRichTextControls h3{
      margin:0 0 10px!important;
      color:var(--figureloom-ui-text,#172321)!important;
      font-size:11px!important;
      letter-spacing:.06em!important;
      text-transform:uppercase!important;
    }
    html[data-figureloom-theme] #openFigureLoomRichText{
      width:100%!important;
      min-height:38px!important;
      margin:0 0 10px!important;
      padding:8px 10px!important;
      border:1px solid var(--figureloom-ui-line,#cddbd7)!important;
      border-radius:8px!important;
      background:var(--figureloom-ui-surface,#fff)!important;
      color:var(--figureloom-ui-text,#172321)!important;
      font-size:11px!important;
      font-weight:700!important;
      box-shadow:none!important;
    }
    html[data-figureloom-theme] #openFigureLoomRichText:hover:not(:disabled){
      background:var(--figureloom-ui-accent-soft,#dff1ec)!important;
      border-color:var(--figureloom-ui-accent,#2f7468)!important;
      color:var(--figureloom-ui-accent-strong,#195c51)!important;
    }
    html[data-figureloom-theme] #figureloomRichTextControls .rich-inspector-grid label{
      color:var(--figureloom-ui-muted,#60706c)!important;
      font-size:10px!important;
    }
    html[data-figureloom-theme] #figureloomRichTextControls .rich-inspector-grid :where(input,select){
      min-height:34px!important;
      border:1px solid var(--figureloom-ui-line,#cddbd7)!important;
      border-radius:7px!important;
      background:var(--figureloom-ui-surface,#fff)!important;
      color:var(--figureloom-ui-text,#172321)!important;
    }

    html[data-figureloom-theme] #figureloomRichTextOverlay{
      background:color-mix(in srgb,var(--figureloom-ui-bg,#181d1c) 72%,transparent)!important;
      backdrop-filter:blur(6px)!important;
    }
    html[data-figureloom-theme] .figureloom-rich-editor{
      color:var(--figureloom-ui-text,#172321)!important;
      background:var(--figureloom-ui-surface,#fff)!important;
      border-color:var(--figureloom-ui-line,#cddbd7)!important;
      box-shadow:0 30px 90px var(--figureloom-ui-shadow,rgba(12,46,40,.22))!important;
    }
    html[data-figureloom-theme] .figureloom-rich-editor>header,
    html[data-figureloom-theme] .figureloom-rich-editor>footer{
      color:var(--figureloom-ui-text,#172321)!important;
      background:var(--figureloom-ui-soft,#edf3f1)!important;
      border-color:var(--figureloom-ui-line,#cddbd7)!important;
    }
    html[data-figureloom-theme] .figureloom-rich-editor header small{
      color:var(--figureloom-ui-muted,#60706c)!important;
    }
    html[data-figureloom-theme] .figureloom-rich-editor header button{
      color:var(--figureloom-ui-muted,#60706c)!important;
      background:transparent!important;
      border-color:transparent!important;
    }
    html[data-figureloom-theme] :where(.rich-toolbar,.rich-science-toolbar,.rich-symbols){
      color:var(--figureloom-ui-text,#172321)!important;
      background:var(--figureloom-ui-soft,#edf3f1)!important;
      border-color:var(--figureloom-ui-line,#cddbd7)!important;
    }
    html[data-figureloom-theme] .rich-science-toolbar{
      background:color-mix(in srgb,var(--figureloom-ui-accent-soft,#dff1ec) 62%,var(--figureloom-ui-surface,#fff))!important;
    }
    html[data-figureloom-theme] :where(.rich-toolbar,.rich-science-toolbar,.rich-symbols) :where(button,select,label){
      color:var(--figureloom-ui-text,#172321)!important;
      background:var(--figureloom-ui-surface,#fff)!important;
      border-color:var(--figureloom-ui-line,#cddbd7)!important;
      border-radius:8px!important;
      box-shadow:none!important;
    }
    html[data-figureloom-theme] :where(.rich-toolbar,.rich-science-toolbar,.rich-symbols) button:hover{
      color:var(--figureloom-ui-accent-strong,#195c51)!important;
      background:var(--figureloom-ui-accent-soft,#dff1ec)!important;
      border-color:var(--figureloom-ui-accent,#2f7468)!important;
    }
    html[data-figureloom-theme] .rich-editable{
      color-scheme:light!important;
      color:#172321!important;
      background:#ffffff!important;
      border-color:var(--figureloom-ui-line,#cddbd7)!important;
      box-shadow:inset 0 1px 3px rgba(12,46,40,.08)!important;
    }
    html[data-figureloom-theme] .rich-editable:focus{
      border-color:var(--figureloom-ui-accent,#2f7468)!important;
      box-shadow:0 0 0 3px color-mix(in srgb,var(--figureloom-ui-accent,#2f7468) 20%,transparent)!important;
    }
    html[data-figureloom-theme] .rich-editable a{color:#195c51!important}
    html[data-figureloom-theme] .figureloom-rich-editor footer button{
      color:var(--figureloom-ui-text,#172321)!important;
      background:var(--figureloom-ui-surface,#fff)!important;
      border-color:var(--figureloom-ui-line,#cddbd7)!important;
    }
    html[data-figureloom-theme] .figureloom-rich-editor footer .primary{
      color:var(--figureloom-ui-accent-ink,#fff)!important;
      background:var(--figureloom-ui-accent,#2f7468)!important;
      border-color:var(--figureloom-ui-accent,#2f7468)!important;
    }

    @media(max-width:640px){
      html[data-figureloom-theme] .right-panel .inspector-section{padding:12px!important}
      html[data-figureloom-theme] #figureloomRichTextControls{padding:10px!important}
    }
  `;
  document.head.appendChild(style);
})();