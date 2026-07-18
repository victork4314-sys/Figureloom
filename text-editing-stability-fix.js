(() => {
  if (window.__figureLoomTextEditingStabilityFixV6) return;
  window.__figureLoomTextEditingStabilityFixV6 = true;

  let editor = null;
  let overlay = null;
  let savedRange = null;
  let savedExpandedRange = null;
  let lastGoodHtml = '';
  let deliberateClear = false;

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
      if (node.tagName === 'BR') {
        output.push('\n');
        return;
      }
      const block = ['P','DIV','LI'].includes(node.tagName);
      [...node.childNodes].forEach(walk);
      if (block) output.push('\n');
    };

    [...root.childNodes].forEach(walk);
    return normalizePlain(output.join(''));
  }

  function allTextItems() {
    const items = [];
    const seen = new Set();
    (state.pages || []).forEach(page => (page.objects || []).forEach(item => {
      if (item?.type === 'text' && !seen.has(item.id)) {
        seen.add(item.id);
        items.push(item);
      }
    }));
    (state.objects || []).forEach(item => {
      if (item?.type === 'text' && !seen.has(item.id)) {
        seen.add(item.id);
        items.push(item);
      }
    });
    return items;
  }

  function repairPlainFallbacks() {
    let changed = false;
    allTextItems().forEach(item => {
      if (!item.richTextHtml) return;
      const plain = plainFromHtml(item.richTextHtml);
      if (item.text === plain) return;
      item.text = plain;
      item.name = plain.slice(0, 40) || 'Text label';
      changed = true;
    });
    if (!changed) return;
    if (typeof renderLayers === 'function') renderLayers();
    if (typeof updateInspector === 'function') updateInspector();
    if (typeof scheduleSave === 'function') scheduleSave();
  }

  function hasMeaningfulContent() {
    if (!editor) return false;
    if (normalizePlain(editor.textContent)) return true;
    return Boolean(editor.querySelector('[data-figure-label],[data-figure-ref],a[href]'));
  }

  function rememberHealthyContent() {
    if (!editor || !hasMeaningfulContent()) return false;
    lastGoodHtml = editor.innerHTML;
    return true;
  }

  function restoreHealthyContent() {
    if (!editor || !lastGoodHtml || deliberateClear || hasMeaningfulContent()) return false;
    editor.innerHTML = lastGoodHtml;
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    savedRange = range.cloneRange();
    savedExpandedRange = null;
    return true;
  }

  function selectionInsideEditor() {
    const selection = window.getSelection();
    return Boolean(editor && selection?.rangeCount && editor.contains(selection.getRangeAt(0).commonAncestorContainer));
  }

  function rememberSelection() {
    if (!selectionInsideEditor()) return;
    const range = window.getSelection().getRangeAt(0).cloneRange();
    savedRange = range;
    if (!range.collapsed && normalizePlain(range.toString())) savedExpandedRange = range.cloneRange();
  }

  function restoreSelection(preferExpanded = false) {
    const range = preferExpanded && savedExpandedRange ? savedExpandedRange : savedRange;
    if (!editor || !range) return false;
    try {
      const selection = window.getSelection();
      editor.focus({ preventScroll:true });
      selection.removeAllRanges();
      selection.addRange(range);
      return true;
    } catch {
      savedRange = null;
      savedExpandedRange = null;
      return false;
    }
  }

  function selectionCoversEditor() {
    if (!editor || !selectionInsideEditor()) return false;
    const selection = window.getSelection();
    if (!selection?.rangeCount || selection.getRangeAt(0).collapsed) return false;
    const selected = normalizePlain(selection.toString());
    const all = normalizePlain(editor.textContent);
    return Boolean(all && selected === all);
  }

  function runOwnedCommand(event, command) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    restoreSelection(true);
    document.execCommand(command, false, null);
    rememberSelection();
    queueMicrotask(() => {
      if (!restoreHealthyContent()) rememberHealthyContent();
    });
  }

  function prepareOpenEditor() {
    savedRange = null;
    savedExpandedRange = null;
    deliberateClear = false;
    lastGoodHtml = '';
    requestAnimationFrame(() => {
      rememberHealthyContent();
      repairPlainFallbacks();
    });
  }

  function installEditorGuard() {
    overlay = document.getElementById('figureloomRichTextOverlay');
    editor = overlay?.querySelector('[data-rich-editor]') || null;
    if (!overlay || !editor) return false;
    if (overlay.dataset.selectionGuardV6 === '1') return true;
    overlay.dataset.selectionGuardV6 = '1';

    ['keyup','mouseup','pointerup','focus','selectionchange'].forEach(type => {
      const target = type === 'selectionchange' ? document : editor;
      target.addEventListener(type, () => {
        if (!overlay.hidden) rememberSelection();
      }, true);
    });

    editor.addEventListener('beforeinput', event => {
      rememberHealthyContent();
      const deletion = String(event.inputType || '').startsWith('delete');
      deliberateClear = deletion && selectionCoversEditor();
    }, true);

    editor.addEventListener('input', () => {
      queueMicrotask(() => {
        if (hasMeaningfulContent()) {
          deliberateClear = false;
          rememberHealthyContent();
          return;
        }
        if (!deliberateClear) restoreHealthyContent();
      });
    }, true);

    overlay.addEventListener('pointerdown', event => {
      const control = event.target.closest?.('.rich-toolbar button,.rich-science-toolbar button,.rich-symbols button');
      if (!control) return;
      rememberSelection();
      event.preventDefault();
    }, true);

    overlay.addEventListener('pointerdown', event => {
      const control = event.target.closest?.('.rich-toolbar select,.rich-science-toolbar select,.rich-toolbar input,.rich-science-toolbar input');
      if (control) rememberSelection();
    }, true);

    overlay.addEventListener('change', event => {
      if (event.target.matches?.('.rich-toolbar select,.rich-science-toolbar select,.rich-toolbar input,.rich-science-toolbar input')) {
        restoreSelection(true);
      }
    }, true);

    overlay.addEventListener('click', event => {
      const commandButton = event.target.closest?.('[data-command]');
      if (commandButton) {
        runOwnedCommand(event, commandButton.dataset.command);
        return;
      }
      if (event.target.closest?.('[data-rich-sup]')) {
        runOwnedCommand(event, 'superscript');
        return;
      }
      if (event.target.closest?.('[data-rich-sub]')) {
        runOwnedCommand(event, 'subscript');
        return;
      }
      if (event.target.closest?.('[data-rich-save]')) {
        if (!hasMeaningfulContent() && lastGoodHtml && !deliberateClear) restoreHealthyContent();
      }
    }, true);

    const observer = new MutationObserver(() => {
      if (!overlay.hidden) prepareOpenEditor();
      else {
        savedRange = null;
        savedExpandedRange = null;
        deliberateClear = false;
        lastGoodHtml = '';
      }
    });
    observer.observe(overlay, { attributes:true, attributeFilter:['hidden'] });
    return true;
  }

  document.getElementById('figureloomRichTextThemeFix')?.remove();
  document.getElementById('figureloomRichTextThemeFixV2')?.remove();
  document.getElementById('figureloomRichTextThemeFixV3')?.remove();
  document.getElementById('figureloomRichTextThemeFixV5')?.remove();

  const style = document.createElement('style');
  style.id = 'figureloomRichTextThemeFixV6';
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
    repairPlainFallbacks();
    if (!installEditorGuard()) setTimeout(install, 80);
  }

  install();
})();
