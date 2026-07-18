(() => {
  if (window.__figureLoomTextEditingStabilityFixV4) return;
  window.__figureLoomTextEditingStabilityFixV4 = true;

  const ALLOWED_TAGS = new Set(['A','B','BR','DIV','EM','I','LI','MARK','OL','P','S','SMALL','SPAN','STRONG','SUB','SUP','U','UL']);
  const ALLOWED_STYLES = new Set([
    'background-color','color','font-family','font-size','font-style','font-variant','font-weight',
    'line-height','margin-bottom','margin-left','text-align','text-decoration','text-transform'
  ]);

  let overlay = null;
  let editor = null;
  let activeItemId = '';
  let lastRange = null;
  let lastExpandedRange = null;
  let historyItemId = '';

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  })[character]);

  const plainHtml = value => String(value || '')
    .split(/\r?\n/)
    .map(line => `<p>${escapeHtml(line) || '<br>'}</p>`)
    .join('');

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

    const walk = node => {
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
      const block = ['P','DIV','LI'].includes(tag);
      [...node.childNodes].forEach(walk);
      if (block) output.push('\n');
    };

    [...root.childNodes].forEach(walk);
    return normalizePlain(output.join(''));
  }

  function safeHref(value) {
    const href = String(value || '').trim();
    if (!href) return '';
    if (href.startsWith('#')) return href;
    try {
      const url = new URL(href, location.href);
      return ['http:','https:','mailto:'].includes(url.protocol) ? href : '';
    } catch {
      return '';
    }
  }

  function cleanStyle(value) {
    const source = document.createElement('span');
    source.setAttribute('style', String(value || ''));
    const target = document.createElement('span');
    [...source.style].forEach(property => {
      if (!ALLOWED_STYLES.has(property)) return;
      const content = source.style.getPropertyValue(property);
      if (/url\s*\(|expression\s*\(|javascript:/i.test(content)) return;
      target.style.setProperty(property, content);
    });
    return target.getAttribute('style') || '';
  }

  function normalizeFontTags(root) {
    root.querySelectorAll('font').forEach(font => {
      const span = document.createElement('span');
      const color = font.getAttribute('color');
      const face = font.getAttribute('face');
      const size = Number(font.getAttribute('size'));
      if (color) span.style.color = color;
      if (face) span.style.fontFamily = face;
      if (size) span.style.fontSize = ({1:'.65em',2:'.8em',3:'1em',4:'1.15em',5:'1.35em',6:'1.65em',7:'2em'})[size] || '1em';
      while (font.firstChild) span.appendChild(font.firstChild);
      font.replaceWith(span);
    });
  }

  function sanitizeHtml(value) {
    const template = document.createElement('template');
    template.innerHTML = String(value || '');
    normalizeFontTags(template.content);

    const walk = node => {
      [...node.childNodes].forEach(child => {
        if (child.nodeType === Node.COMMENT_NODE) {
          child.remove();
          return;
        }
        if (child.nodeType !== Node.ELEMENT_NODE) return;
        if (!ALLOWED_TAGS.has(child.tagName)) {
          walk(child);
          child.replaceWith(...child.childNodes);
          return;
        }

        [...child.attributes].forEach(attribute => {
          const name = attribute.name.toLowerCase();
          if (name === 'style') {
            const style = cleanStyle(attribute.value);
            if (style) child.setAttribute('style', style);
            else child.removeAttribute('style');
            return;
          }
          if (name === 'href' && child.tagName === 'A') {
            const href = safeHref(attribute.value);
            if (href) child.setAttribute('href', href);
            else child.removeAttribute('href');
            return;
          }
          if (['data-figure-label','data-figure-ref','data-scientific-style'].includes(name)) return;
          child.removeAttribute(attribute.name);
        });

        if (child.tagName === 'A') {
          child.setAttribute('target', '_blank');
          child.setAttribute('rel', 'noopener noreferrer');
        }
        walk(child);
      });
    };

    walk(template.content);
    return template.innerHTML;
  }

  function meaningfulNodes(element) {
    return [...element.childNodes].filter(node => {
      if (node.nodeType === Node.TEXT_NODE) return Boolean(node.nodeValue?.trim());
      return node.nodeType === Node.ELEMENT_NODE;
    });
  }

  function nodesHtml(nodes) {
    return nodes.map(node => node.nodeType === Node.TEXT_NODE ? escapeHtml(node.nodeValue) : node.outerHTML).join('');
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

  function collapseExactDuplicateSiblings(element) {
    [...element.children].forEach(collapseExactDuplicateSiblings);
    const nodes = meaningfulNodes(element);
    if (nodes.length < 2) return;

    for (let split = 1; split < nodes.length; split += 1) {
      const left = nodes.slice(0, split);
      const right = nodes.slice(split);
      const leftText = plainFromHtml(nodesHtml(left));
      const rightText = plainFromHtml(nodesHtml(right));
      if (!leftText || leftText !== rightText) continue;

      const keep = markupScore(right) >= markupScore(left) ? right : left;
      const keepSet = new Set(keep);
      nodes.forEach(node => {
        if (!keepSet.has(node)) node.remove();
      });
      return;
    }
  }

  function canonicalHtml(value) {
    const root = document.createElement('div');
    root.innerHTML = sanitizeHtml(value);
    collapseExactDuplicateSiblings(root);
    return sanitizeHtml(root.innerHTML);
  }

  function currentTextItem() {
    try {
      const selected = typeof selectedObject === 'function' ? selectedObject() : null;
      if (selected?.type === 'text') return selected;
    } catch {}
    return null;
  }

  function itemById(id) {
    if (!id) return null;
    return (state.objects || []).find(item => item.id === id && item.type === 'text') ||
      (state.pages || []).flatMap(page => page.objects || []).find(item => item.id === id && item.type === 'text') || null;
  }

  function activeItem() {
    return itemById(activeItemId) || currentTextItem();
  }

  function syncTextArea(item) {
    const textarea = document.getElementById('textContent');
    if (textarea && item && currentTextItem()?.id === item.id && document.activeElement !== textarea) {
      textarea.value = item.text || '';
    }
  }

  function repairStoredItem(item) {
    if (!item?.richTextHtml) return false;
    const html = canonicalHtml(item.richTextHtml);
    const text = plainFromHtml(html);
    const changed = html !== item.richTextHtml || text !== normalizePlain(item.text);
    if (!changed) return false;
    item.richTextHtml = html;
    item.text = text;
    item.name = text.slice(0, 40) || 'Text label';
    return true;
  }

  function repairExistingItems() {
    let changed = false;
    (state.pages || []).forEach(page => (page.objects || []).forEach(item => {
      if (repairStoredItem(item)) changed = true;
    }));
    if (changed && typeof scheduleSave === 'function') scheduleSave();
  }

  function removeDuplicateRenderLayers(group, item) {
    if (!group || item?.type !== 'text' || !item.richTextHtml) return group;
    group.querySelectorAll('text').forEach(node => {
      if (!node.closest('foreignObject')) node.remove();
    });
    group.querySelectorAll('[data-figureloom-text-clip="1"],clipPath[id^="figureloom-text-clip-"]').forEach(node => node.remove());
    const richLayers = [...group.querySelectorAll('[data-figureloom-rich-text="1"]')];
    richLayers.slice(0, -1).forEach(node => node.remove());
    return group;
  }

  function installRenderCleanup() {
    if (window.__figureLoomRichTextRenderCleanupV4 || typeof renderObject !== 'function') return true;
    window.__figureLoomRichTextRenderCleanupV4 = true;
    const baseRenderObject = renderObject;
    renderObject = item => removeDuplicateRenderLayers(baseRenderObject(item), item);
    return true;
  }

  function selectionInsideEditor() {
    const selection = window.getSelection();
    return Boolean(editor && selection?.rangeCount && editor.contains(selection.getRangeAt(0).commonAncestorContainer));
  }

  function rememberRange(clearExpanded = false) {
    if (!selectionInsideEditor()) return;
    const range = window.getSelection().getRangeAt(0).cloneRange();
    lastRange = range;
    if (!range.collapsed && normalizePlain(range.toString())) lastExpandedRange = range.cloneRange();
    else if (clearExpanded) lastExpandedRange = null;
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
    const selection = selectionInsideEditor() ? window.getSelection() : restoreRange(true);
    return selection?.toString() || '';
  }

  function replaceSelection(html) {
    const live = selectionInsideEditor() ? window.getSelection() : null;
    const selection = live?.rangeCount && !live.getRangeAt(0).collapsed ? live : restoreRange(true);
    if (!selection?.rangeCount || !editor) return;
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return;

    range.deleteContents();
    const template = document.createElement('template');
    template.innerHTML = sanitizeHtml(html);
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

  function saveRichText(event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const item = activeItem();
    if (!item || !editor) return;
    if (typeof pushHistory === 'function') pushHistory();

    const html = canonicalHtml(editor.innerHTML);
    const text = plainFromHtml(html);
    item.richTextHtml = html;
    item.text = text;
    item.name = text.slice(0, 40) || 'Text label';

    syncTextArea(item);
    if (typeof render === 'function') render();
    if (typeof renderPages === 'function') renderPages();
    if (typeof scheduleSave === 'function') scheduleSave();

    overlay.hidden = true;
    activeItemId = '';
    lastRange = null;
    lastExpandedRange = null;
  }

  function prepareEditorForItem() {
    const item = currentTextItem();
    if (!item || !editor) return;
    activeItemId = item.id;
    repairStoredItem(item);
    editor.innerHTML = item.richTextHtml ? canonicalHtml(item.richTextHtml) : plainHtml(item.text);
    syncTextArea(item);
    lastRange = null;
    lastExpandedRange = null;
  }

  function installRichEditorOwnership() {
    overlay = document.getElementById('figureloomRichTextOverlay');
    editor = overlay?.querySelector('[data-rich-editor]') || null;
    if (!overlay || !editor) return false;
    if (overlay.dataset.atomicSaveV4 === '1') return true;
    overlay.dataset.atomicSaveV4 = '1';

    const observer = new MutationObserver(() => {
      if (!overlay.hidden) requestAnimationFrame(prepareEditorForItem);
    });
    observer.observe(overlay, { attributes:true, attributeFilter:['hidden'] });

    ['keyup','mouseup','pointerup','input','focus'].forEach(type => {
      editor.addEventListener(type, () => rememberRange(type !== 'mouseup' && type !== 'pointerup'), true);
    });
    document.addEventListener('selectionchange', () => {
      if (!overlay.hidden) rememberRange(false);
    });

    overlay.addEventListener('pointerdown', event => {
      const control = event.target.closest?.('.rich-toolbar button,.rich-science-toolbar button,.rich-symbols button');
      if (!control) return;
      rememberRange(false);
      event.preventDefault();
    }, true);

    overlay.addEventListener('change', event => {
      if (event.target.matches?.('.rich-toolbar select,.rich-science-toolbar select,input[type="color"]')) restoreRange(true);
    }, true);

    overlay.addEventListener('click', event => {
      const replacement = event.target.closest?.('[data-rich-inline-equation],[data-rich-display-equation],[data-rich-chemical]');
      if (replacement) {
        handleReplacement(event, replacement);
        return;
      }
      if (event.target.closest?.('[data-rich-save]')) saveRichText(event);
    }, true);

    return true;
  }

  function installNormalEditorOwnership() {
    const textarea = document.getElementById('textContent');
    if (!textarea) return false;
    if (textarea.dataset.atomicRichTextV4 === '1') return true;
    textarea.dataset.atomicRichTextV4 = '1';

    textarea.addEventListener('focus', () => {
      const item = currentTextItem();
      if (!item?.richTextHtml || historyItemId === item.id) return;
      historyItemId = item.id;
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
      if (typeof render === 'function') render();
      if (typeof renderPages === 'function') renderPages();
      if (typeof scheduleSave === 'function') scheduleSave();
    }, true);

    textarea.addEventListener('change', event => {
      if (!sync(event)) return;
      historyItemId = '';
      if (typeof render === 'function') render();
      if (typeof renderPages === 'function') renderPages();
      if (typeof scheduleSave === 'function') scheduleSave();
    }, true);

    textarea.addEventListener('blur', () => { historyItemId = ''; }, true);
    return true;
  }

  function installInspectorSync() {
    if (window.__figureLoomRichTextInspectorSyncV4 || typeof updateInspector !== 'function') return true;
    window.__figureLoomRichTextInspectorSyncV4 = true;
    const baseUpdateInspector = updateInspector;
    updateInspector = function updateInspectorWithAtomicRichText() {
      baseUpdateInspector();
      const item = currentTextItem();
      if (item?.richTextHtml) syncTextArea(item);
    };
    return true;
  }

  document.getElementById('figureloomRichTextThemeFix')?.remove();
  document.getElementById('figureloomRichTextThemeFixV2')?.remove();
  document.getElementById('figureloomRichTextThemeFixV3')?.remove();

  const style = document.createElement('style');
  style.id = 'figureloomRichTextThemeFixV4';
  style.textContent = `
    html[data-figureloom-theme="dark"] #figureloomRichTextOverlay{background:rgba(8,10,14,.64)!important;color:#e9ecf0!important}
    html[data-figureloom-theme="dark"] #figureloomRichTextOverlay .figureloom-rich-editor{background:#292e35!important;color:#e9ecf0!important;border-color:#454c57!important;box-shadow:0 22px 58px rgba(0,0,0,.42)!important}
    html[data-figureloom-theme="dark"] #figureloomRichTextOverlay .figureloom-rich-editor>header,
    html[data-figureloom-theme="dark"] #figureloomRichTextOverlay .figureloom-rich-editor>footer{background:#30353d!important;color:#f1f3f6!important;border-color:#474e59!important}
    html[data-figureloom-theme="dark"] #figureloomRichTextOverlay .figureloom-rich-editor header small{color:#aab2bd!important}
    html[data-figureloom-theme="dark"] #figureloomRichTextOverlay .rich-toolbar{background:#2b3037!important;border-color:#3d434d!important}
    html[data-figureloom-theme="dark"] #figureloomRichTextOverlay .rich-science-toolbar{background:#30353d!important;border-color:#454c57!important}
    html[data-figureloom-theme="dark"] #figureloomRichTextOverlay .rich-symbols{background:#292e35!important;border-color:#434a55!important}
    html[data-figureloom-theme="dark"] #figureloomRichTextOverlay :where(.rich-toolbar button,.rich-science-toolbar button,.rich-symbols button,.rich-toolbar select,.rich-science-toolbar select,.rich-toolbar label,.rich-science-toolbar label,.figureloom-rich-editor footer button){background:#373d46!important;color:#e9ecf0!important;border-color:#505864!important}
    html[data-figureloom-theme="dark"] #figureloomRichTextOverlay :where(.rich-toolbar button,.rich-science-toolbar button,.rich-symbols button,.figureloom-rich-editor footer button):hover{background:#414852!important}
    html[data-figureloom-theme="dark"] #figureloomRichTextOverlay option{background:#343a43!important;color:#eef1f4!important}
    html[data-figureloom-theme="dark"] #figureloomRichTextOverlay input[type="color"]{background:#343a43!important}
    html[data-figureloom-theme="dark"] #figureloomRichTextOverlay .rich-editable{background:#343a43!important;color:#eef1f4!important;border-color:#505864!important;caret-color:#eef1f4!important}
    html[data-figureloom-theme="dark"] #figureloomRichTextOverlay .rich-editable:focus{border-color:#7f9bd3!important;box-shadow:0 0 0 3px rgba(127,155,211,.18)!important}
    html[data-figureloom-theme="dark"] #figureloomRichTextOverlay .rich-editable a{color:#b9cef8!important}
    html[data-figureloom-theme="dark"] #figureloomRichTextOverlay [data-rich-save]{background:#586fb9!important;color:#fff!important;border-color:#7188d0!important}
    html[data-figureloom-theme="dark"] #figureloomRichTextOverlay [data-rich-close]{color:#aab2bd!important;background:transparent!important;border-color:transparent!important}
  `;
  document.head.appendChild(style);

  function install() {
    const ready = installRenderCleanup() && installRichEditorOwnership() && installNormalEditorOwnership() && installInspectorSync();
    if (!ready) setTimeout(install, 80);
  }

  repairExistingItems();
  install();
})();