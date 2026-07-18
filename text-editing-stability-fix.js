(() => {
  if (window.__figureLoomTextEditingStabilityFixV3) return;
  window.__figureLoomTextEditingStabilityFixV3 = true;

  let editor = null;
  let lastRange = null;
  let lastExpandedRange = null;
  let normalEditHistoryItem = '';

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

  function normalizePlain(value) {
    return String(value || '')
      .replace(/\u00a0/g, ' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function plainFromHtml(html) {
    const root = document.createElement('div');
    root.innerHTML = String(html || '');
    const output = [];

    function walk(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        output.push(node.nodeValue || '');
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const tag = node.tagName;
      if (tag === 'BR') {
        output.push('\n');
        return;
      }
      const block = ['P','DIV','LI','UL','OL'].includes(tag);
      [...node.childNodes].forEach(walk);
      if (block) output.push('\n');
    }

    [...root.childNodes].forEach(walk);
    return normalizePlain(output.join(''));
  }

  function meaningfulNodes(element) {
    return [...element.childNodes].filter(node => {
      if (node.nodeType === Node.TEXT_NODE) return Boolean(node.nodeValue?.trim());
      return node.nodeType === Node.ELEMENT_NODE;
    });
  }

  function htmlForNodes(nodes) {
    return nodes.map(node => node.nodeType === Node.TEXT_NODE ? escapeHtml(node.nodeValue) : node.outerHTML).join('');
  }

  function textForNodes(nodes) {
    return plainFromHtml(htmlForNodes(nodes));
  }

  function markupScore(nodes) {
    return nodes.reduce((score, node) => {
      if (node.nodeType !== Node.ELEMENT_NODE) return score;
      return score
        + node.querySelectorAll('*').length * 4
        + node.querySelectorAll('[style],a,mark,s,u,sub,sup,strong,b,em,i').length * 8
        + (node.getAttribute('style') || '').length;
    }, 0);
  }

  function collapseDuplicateChildren(element) {
    [...element.children].forEach(collapseDuplicateChildren);
    const nodes = meaningfulNodes(element);
    if (nodes.length < 2) return;

    for (let split = 1; split < nodes.length; split += 1) {
      const left = nodes.slice(0, split);
      const right = nodes.slice(split);
      const leftText = textForNodes(left);
      const rightText = textForNodes(right);
      if (!leftText || leftText !== rightText) continue;

      const keep = markupScore(right) >= markupScore(left) ? right : left;
      const keepSet = new Set(keep);
      nodes.forEach(node => {
        if (!keepSet.has(node)) node.remove();
      });
      break;
    }
  }

  function canonicalHtml(html) {
    const root = document.createElement('div');
    root.innerHTML = String(html || '');
    collapseDuplicateChildren(root);
    return root.innerHTML;
  }

  function healItem(item) {
    if (!item?.richTextHtml) return item;
    const nextHtml = canonicalHtml(item.richTextHtml);
    const nextText = plainFromHtml(nextHtml);
    if (nextHtml !== item.richTextHtml) item.richTextHtml = nextHtml;
    if (item.text !== nextText) item.text = nextText;
    if (nextText) item.name = nextText.slice(0, 40);
    return item;
  }

  function removeDuplicateTextLayers(group, item) {
    if (!group || !isRichTextItem(item)) return group;
    healItem(item);
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
    renderObject = item => {
      healItem(item);
      return removeDuplicateTextLayers(baseRenderObject(item), item);
    };
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

  function rememberRange(clearCollapsed = false) {
    if (!selectionInside()) return;
    const range = window.getSelection().getRangeAt(0).cloneRange();
    lastRange = range;
    if (!range.collapsed && normalizePlain(range.toString())) lastExpandedRange = range.cloneRange();
    else if (clearCollapsed) lastExpandedRange = null;
  }

  function restoreRange(preferExpanded = false) {
    const range = preferExpanded && lastExpandedRange ? lastExpandedRange : lastRange;
    if (!editor || !range) return null;
    const selection = window.getSelection();
    editor.focus({ preventScroll:true });
    selection.removeAllRanges();
    selection.addRange(range);
    return selection;
  }

  function selectedText() {
    const live = selectionInside() ? window.getSelection() : null;
    if (live?.rangeCount && !live.getRangeAt(0).collapsed) return live.toString();
    return restoreRange(true)?.toString() || '';
  }

  function replaceSelection(html) {
    const live = selectionInside() ? window.getSelection() : null;
    const useLive = live?.rangeCount && !live.getRangeAt(0).collapsed;
    const selection = useLive ? live : restoreRange(true);
    if (!selection?.rangeCount || !editor) return;

    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return;
    range.deleteContents();

    const template = document.createElement('template');
    template.innerHTML = html;
    const fragment = template.content;
    const last = fragment.lastChild;
    range.insertNode(fragment);

    if (last) {
      range.setStartAfter(last);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      lastRange = range.cloneRange();
    }
    lastExpandedRange = null;
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
    if (overlay.dataset.stableSelectionV3 === '1') return true;

    overlay.dataset.stableSelectionV3 = '1';
    editor = nextEditor;

    ['keyup','mouseup','pointerup','input','focus'].forEach(type => editor.addEventListener(type, () => rememberRange(true), true));
    document.addEventListener('selectionchange', () => {
      if (!overlay.hidden) rememberRange(false);
    });

    overlay.addEventListener('pointerdown', event => {
      const control = event.target.closest?.('.rich-toolbar button,.rich-science-toolbar button,.rich-symbols button');
      if (!control) return;
      rememberRange();
      event.preventDefault();
    }, true);

    overlay.addEventListener('click', event => {
      const replacement = event.target.closest?.('[data-rich-inline-equation],[data-rich-display-equation],[data-rich-chemical]');
      if (replacement) {
        handleReplacement(event, replacement);
        return;
      }

      const save = event.target.closest?.('[data-rich-save]');
      if (!save) return;
      const item = currentTextItem();
      editor.innerHTML = canonicalHtml(editor.innerHTML);
      queueMicrotask(() => {
        if (!item?.richTextHtml) return;
        healItem(item);
        const textarea = document.getElementById('textContent');
        if (textarea && currentTextItem()?.id === item.id) textarea.value = item.text;
        if (typeof render === 'function') render();
        if (typeof renderPages === 'function') renderPages();
        if (typeof scheduleSave === 'function') scheduleSave();
      });
    }, true);

    return true;
  }

  function installNormalEditorHandoff() {
    const textarea = document.getElementById('textContent');
    if (!textarea) return false;
    if (textarea.dataset.richTextHandoffV3 === '1') return true;
    textarea.dataset.richTextHandoffV3 = '1';

    textarea.addEventListener('focus', () => {
      const item = currentTextItem();
      if (!item?.richTextHtml || normalEditHistoryItem === item.id) return;
      normalEditHistoryItem = item.id;
      if (typeof pushHistory === 'function') pushHistory();
    }, true);

    const sync = event => {
      const item = currentTextItem();
      if (!item?.richTextHtml) return false;
      event.stopImmediatePropagation();
      item.text = event.target.value;
      item.richTextHtml = plainHtml(event.target.value);
      item.name = event.target.value.trim().slice(0, 40) || 'Text label';
      return true;
    };

    textarea.addEventListener('input', event => {
      if (!sync(event)) return;
      requestAnimationFrame(() => {
        if (typeof render === 'function') render();
        if (typeof renderPages === 'function') renderPages();
        if (typeof scheduleSave === 'function') scheduleSave();
      });
    }, true);

    textarea.addEventListener('change', event => {
      if (!sync(event)) return;
      normalEditHistoryItem = '';
      if (typeof render === 'function') render();
      if (typeof renderPages === 'function') renderPages();
      if (typeof scheduleSave === 'function') scheduleSave();
    }, true);

    textarea.addEventListener('blur', () => {
      normalEditHistoryItem = '';
    }, true);

    return true;
  }

  function installInspectorCanonicalView() {
    if (window.__figureLoomRichTextInspectorCanonicalV3 || typeof updateInspector !== 'function') return true;
    window.__figureLoomRichTextInspectorCanonicalV3 = true;
    const baseUpdateInspector = updateInspector;

    updateInspector = function updateInspectorWithCanonicalRichText() {
      baseUpdateInspector();
      const item = currentTextItem();
      if (!item?.richTextHtml) return;
      healItem(item);
      const textarea = document.getElementById('textContent');
      if (textarea && document.activeElement !== textarea) textarea.value = item.text;
    };
    return true;
  }

  document.getElementById('figureloomRichTextThemeFix')?.remove();
  document.getElementById('figureloomRichTextThemeFixV2')?.remove();

  const style = document.createElement('style');
  style.id = 'figureloomRichTextThemeFixV3';
  style.textContent = `
    html[data-figureloom-theme="dark"] #figureloomRichTextOverlay{
      background:rgba(8,10,14,.64)!important;
      color:#e9ecf0!important
    }
    html[data-figureloom-theme="dark"] #figureloomRichTextOverlay .figureloom-rich-editor{
      background:#292e35!important;
      color:#e9ecf0!important;
      border-color:#454c57!important;
      box-shadow:0 22px 58px rgba(0,0,0,.42)!important
    }
    html[data-figureloom-theme="dark"] #figureloomRichTextOverlay .figureloom-rich-editor>header,
    html[data-figureloom-theme="dark"] #figureloomRichTextOverlay .figureloom-rich-editor>footer{
      background:#30353d!important;
      color:#f1f3f6!important;
      border-color:#474e59!important
    }
    html[data-figureloom-theme="dark"] #figureloomRichTextOverlay .figureloom-rich-editor header small{
      color:#aab2bd!important
    }
    html[data-figureloom-theme="dark"] #figureloomRichTextOverlay .rich-toolbar{
      background:#2b3037!important;
      border-color:#3d434d!important
    }
    html[data-figureloom-theme="dark"] #figureloomRichTextOverlay .rich-science-toolbar{
      background:#30353d!important;
      border-color:#454c57!important
    }
    html[data-figureloom-theme="dark"] #figureloomRichTextOverlay .rich-symbols{
      background:#292e35!important;
      border-color:#434a55!important
    }
    html[data-figureloom-theme="dark"] #figureloomRichTextOverlay :where(
      .rich-toolbar button,.rich-science-toolbar button,.rich-symbols button,
      .rich-toolbar select,.rich-science-toolbar select,
      .rich-toolbar label,.rich-science-toolbar label,
      .figureloom-rich-editor footer button
    ){
      background:#373d46!important;
      color:#e9ecf0!important;
      border-color:#505864!important
    }
    html[data-figureloom-theme="dark"] #figureloomRichTextOverlay :where(
      .rich-toolbar button,.rich-science-toolbar button,.rich-symbols button,
      .figureloom-rich-editor footer button
    ):hover{
      background:#414852!important
    }
    html[data-figureloom-theme="dark"] #figureloomRichTextOverlay option{
      background:#343a43!important;
      color:#eef1f4!important
    }
    html[data-figureloom-theme="dark"] #figureloomRichTextOverlay input[type="color"]{
      background:#343a43!important
    }
    html[data-figureloom-theme="dark"] #figureloomRichTextOverlay .rich-editable{
      background:#343a43!important;
      color:#eef1f4!important;
      border-color:#505864!important;
      caret-color:#eef1f4!important
    }
    html[data-figureloom-theme="dark"] #figureloomRichTextOverlay .rich-editable:focus{
      border-color:#7f9bd3!important;
      box-shadow:0 0 0 3px rgba(127,155,211,.18)!important
    }
    html[data-figureloom-theme="dark"] #figureloomRichTextOverlay .rich-editable a{
      color:#b9cef8!important
    }
    html[data-figureloom-theme="dark"] #figureloomRichTextOverlay [data-rich-save]{
      background:#586fb9!important;
      color:#fff!important;
      border-color:#7188d0!important
    }
    html[data-figureloom-theme="dark"] #figureloomRichTextOverlay [data-rich-close]{
      color:#aab2bd!important;
      background:transparent!important;
      border-color:transparent!important
    }
  `;
  document.head.appendChild(style);

  function install() {
    const ready = installRichEditor() && installNormalEditorHandoff() && installInspectorCanonicalView();
    if (!ready) setTimeout(install, 80);
  }

  install();
})();