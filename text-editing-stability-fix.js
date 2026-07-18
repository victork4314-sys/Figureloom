(() => {
  if (window.__figureLoomTextEditingStabilityFixV2) return;
  window.__figureLoomTextEditingStabilityFixV2 = true;

  let editor = null;
  let lastRange = null;

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  })[character]);

  const plainHtml = value => String(value || '')
    .split(/\r?\n/)
    .map(line => `<p>${escapeHtml(line) || '<br>'}</p>`)
    .join('');

  function isRichTextItem(item) {
    return item?.type === 'text' && Boolean(item.richTextHtml || item.textFlow === 'fit' || item.textOverflow === 'scroll');
  }

  function removeDuplicateTextLayers(group, item) {
    if (!group || !isRichTextItem(item)) return group;
    group.querySelectorAll('text').forEach(node => {
      if (!node.closest('foreignObject')) node.remove();
    });
    group.querySelectorAll('[data-figureloom-text-clip="1"],clipPath[id^="figureloom-text-clip-"]').forEach(node => node.remove());
    const richLayers = [...group.querySelectorAll('[data-figureloom-rich-text="1"]')];
    richLayers.slice(0, -1).forEach(node => node.remove());
    return group;
  }

  if (typeof renderObject === 'function') {
    const baseRenderObject = renderObject;
    renderObject = item => removeDuplicateTextLayers(baseRenderObject(item), item);
  }

  function currentTextItem() {
    try {
      const item = typeof selectedObject === 'function' ? selectedObject() : null;
      return item?.type === 'text' ? item : null;
    } catch {
      return null;
    }
  }

  function selectionInside() {
    const selection = window.getSelection();
    if (!editor || !selection?.rangeCount) return false;
    return editor.contains(selection.getRangeAt(0).commonAncestorContainer);
  }

  function rememberRange() {
    if (!selectionInside()) return;
    lastRange = window.getSelection().getRangeAt(0).cloneRange();
  }

  function restoreRange() {
    if (!editor || !lastRange) return null;
    const selection = window.getSelection();
    editor.focus({ preventScroll:true });
    selection.removeAllRanges();
    selection.addRange(lastRange);
    return selection;
  }

  function selectedText() {
    return (selectionInside() ? window.getSelection() : restoreRange())?.toString() || '';
  }

  function replaceSelection(html) {
    const selection = selectionInside() ? window.getSelection() : restoreRange();
    if (!selection?.rangeCount || !editor) return;
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return;
    range.deleteContents();
    const template = document.createElement('template');
    template.innerHTML = html;
    const fragment = template.content;
    const last = fragment.lastChild;
    range.insertNode(fragment);
    if (!last) return;
    range.setStartAfter(last);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    lastRange = range.cloneRange();
  }

  function handleReplacement(event, button) {
    const selected = selectedText();
    let value = '';
    let html = '';
    if (button.matches('[data-rich-inline-equation]')) {
      value = selected || prompt('Inline equation or notation', 'E = mc²');
      html = value && `<span style="font-family:Georgia,serif;font-style:italic">${escapeHtml(value)}</span>`;
    } else if (button.matches('[data-rich-display-equation]')) {
      value = selected || prompt('Display equation or notation', 'E = mc²');
      html = value && `<div style="font-family:Georgia,serif;font-style:italic;text-align:center;margin-bottom:.5em">${escapeHtml(value)}</div>`;
    } else if (button.matches('[data-rich-chemical]')) {
      value = selected || prompt('Chemical formula', 'H2O');
      html = value && escapeHtml(value).replace(/([A-Za-z\)])(\d+)/g, (_, base, digits) => `${base}<sub>${digits}</sub>`);
    }
    if (!html) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    replaceSelection(html);
  }

  function installRichEditor() {
    const overlay = document.getElementById('figureloomRichTextOverlay');
    const nextEditor = overlay?.querySelector('[data-rich-editor]');
    if (!overlay || !nextEditor) return false;
    if (overlay.dataset.stableSelectionV2 === '1') return true;
    overlay.dataset.stableSelectionV2 = '1';
    editor = nextEditor;

    ['keyup','mouseup','pointerup','input','focus'].forEach(type => editor.addEventListener(type, rememberRange, true));
    document.addEventListener('selectionchange', () => { if (!overlay.hidden) rememberRange(); });

    overlay.addEventListener('pointerdown', event => {
      const button = event.target.closest?.('.rich-toolbar button,.rich-science-toolbar button,.rich-symbols button');
      if (!button) return;
      rememberRange();
      event.preventDefault();
    }, true);

    overlay.addEventListener('click', event => {
      const button = event.target.closest?.('[data-rich-inline-equation],[data-rich-display-equation],[data-rich-chemical]');
      if (button) handleReplacement(event, button);
    }, true);
    return true;
  }

  function installNormalEditorHandoff() {
    const textarea = document.getElementById('textContent');
    if (!textarea) return false;
    if (textarea.dataset.richTextHandoffV2 === '1') return true;
    textarea.dataset.richTextHandoffV2 = '1';

    const sync = event => {
      const item = currentTextItem();
      if (!item?.richTextHtml) return;
      item.text = event.target.value;
      item.richTextHtml = plainHtml(event.target.value);
    };
    textarea.addEventListener('input', sync, true);
    textarea.addEventListener('change', event => {
      sync(event);
      requestAnimationFrame(() => {
        if (typeof render === 'function') render();
        if (typeof renderPages === 'function') renderPages();
        if (typeof scheduleSave === 'function') scheduleSave();
      });
    });
    return true;
  }

  const style = document.createElement('style');
  style.id = 'figureloomRichTextThemeFixV2';
  style.textContent = `
    #figureloomRichTextOverlay{color:var(--sc-text,#172033)!important}
    #figureloomRichTextOverlay .figureloom-rich-editor{background:var(--sc-surface,#fff)!important;color:var(--sc-text,#172033)!important;border-color:var(--sc-border,#cbd5e1)!important}
    #figureloomRichTextOverlay .figureloom-rich-editor>header,#figureloomRichTextOverlay .figureloom-rich-editor>footer{background:var(--sc-surface,#fff)!important;border-color:var(--sc-border,#e2e8f0)!important;color:var(--sc-text,#172033)!important}
    #figureloomRichTextOverlay .rich-toolbar,#figureloomRichTextOverlay .rich-science-toolbar,#figureloomRichTextOverlay .rich-symbols{background:var(--sc-surface-2,#f8fafc)!important;border-color:var(--sc-border,#e2e8f0)!important}
    #figureloomRichTextOverlay .rich-toolbar button,#figureloomRichTextOverlay .rich-science-toolbar button,#figureloomRichTextOverlay .rich-symbols button,#figureloomRichTextOverlay select,#figureloomRichTextOverlay .rich-toolbar label,#figureloomRichTextOverlay .rich-science-toolbar label,#figureloomRichTextOverlay footer button{background:var(--sc-surface,#fff)!important;color:var(--sc-text,#334155)!important;border-color:var(--sc-border,#cbd5e1)!important}
    #figureloomRichTextOverlay .rich-editable{background:var(--sc-surface,#fff)!important;color:var(--sc-text,#172033)!important;border-color:var(--sc-border,#cbd5e1)!important;caret-color:var(--sc-text,#172033)!important}
    #figureloomRichTextOverlay [data-rich-save]{background:var(--sc-accent,#2563eb)!important;border-color:var(--sc-accent,#2563eb)!important;color:#fff!important}
    :is(html[data-figureloom-theme="dark"],html.dark-mode,body.dark-mode) #figureloomRichTextOverlay{background:rgba(2,8,15,.72)!important}
    :is(html[data-figureloom-theme="dark"],html.dark-mode,body.dark-mode) .figureloom-rich-editor{background:#17211f!important;color:#edf4f2!important;border-color:#43544f!important}
    :is(html[data-figureloom-theme="dark"],html.dark-mode,body.dark-mode) .figureloom-rich-editor>header,
    :is(html[data-figureloom-theme="dark"],html.dark-mode,body.dark-mode) .figureloom-rich-editor>footer{background:#1b2825!important;border-color:#34443f!important;color:#edf4f2!important}
    :is(html[data-figureloom-theme="dark"],html.dark-mode,body.dark-mode) .rich-toolbar,
    :is(html[data-figureloom-theme="dark"],html.dark-mode,body.dark-mode) .rich-symbols{background:#1c2926!important;border-color:#34443f!important}
    :is(html[data-figureloom-theme="dark"],html.dark-mode,body.dark-mode) .rich-science-toolbar{background:#20302c!important;border-color:#34443f!important}
    :is(html[data-figureloom-theme="dark"],html.dark-mode,body.dark-mode) #figureloomRichTextOverlay button,
    :is(html[data-figureloom-theme="dark"],html.dark-mode,body.dark-mode) #figureloomRichTextOverlay select,
    :is(html[data-figureloom-theme="dark"],html.dark-mode,body.dark-mode) #figureloomRichTextOverlay label{background:#24332f!important;color:#e6efec!important;border-color:#4a5c56!important}
    :is(html[data-figureloom-theme="dark"],html.dark-mode,body.dark-mode) .rich-editable{background:#111a18!important;color:#edf4f2!important;border-color:#4b5d57!important;caret-color:#edf4f2!important}
    :is(html[data-figureloom-theme="dark"],html.dark-mode,body.dark-mode) #figureloomRichTextOverlay [data-rich-save]{background:#39786d!important;border-color:#4f8f80!important;color:#fff!important}
  `;
  document.head.appendChild(style);

  function install() {
    if (!installRichEditor() || !installNormalEditorHandoff()) setTimeout(install, 80);
  }
  install();
})();
