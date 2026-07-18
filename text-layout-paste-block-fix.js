(() => {
  if (window.__figureLoomTextPasteBlockFix) return;
  window.__figureLoomTextPasteBlockFix = true;

  const sessions = new WeakMap();

  function textItem(id) {
    return state.objects?.find(item => item.id === id && item.type === 'text') || null;
  }

  function selectedTextItem() {
    const item = typeof selectedObject === 'function' ? selectedObject() : null;
    return item?.type === 'text' ? item : null;
  }

  function editorText(editor) {
    return String(editor?.innerText ?? editor?.textContent ?? '').replace(/\r\n?/g, '\n');
  }

  function editorScale() {
    const canvas = document.getElementById('canvas');
    const rect = canvas?.getBoundingClientRect();
    const viewWidth = Number(canvas?.viewBox?.baseVal?.width) || 1200;
    return rect?.width ? Math.max(.1, rect.width / viewWidth) : 1;
  }

  function sizeWrappedEditor(editor, width) {
    const scale = editorScale();
    const cssWidth = Math.min(window.innerWidth - 12, Math.max(80, width * scale + 6));
    editor.style.width = `${cssWidth}px`;
    editor.style.whiteSpace = 'pre-wrap';
    editor.style.overflowWrap = 'anywhere';
    editor.style.wordBreak = 'normal';
    editor.style.overflow = 'hidden';
    editor.style.lineHeight = '1.25';
    editor.style.height = 'auto';
    requestAnimationFrame(() => {
      if (editor.isConnected) editor.style.height = `${Math.max(24, editor.scrollHeight + 4)}px`;
    });
  }

  function configureEditor(editor) {
    if (!(editor instanceof HTMLElement) || !editor.matches('.figureloom-direct-label-editor')) return;
    const item = selectedTextItem();
    if (!item || item.textFlow === 'single') return;
    const width = Math.max(80, Number(item.width) || 320);
    sessions.set(editor, { id:item.id, width });
    editor.dataset.figureloomWrappedEditor = '1';
    editor.setAttribute('aria-multiline', 'true');
    sizeWrappedEditor(editor, width);
  }

  function syncEditorAfterNativeHandler(editor) {
    const session = sessions.get(editor);
    if (!session) return;
    const value = editorText(editor);
    setTimeout(() => {
      const item = textItem(session.id);
      if (!item) return;
      item.text = value;
      item.name = value.trim().slice(0, 40) || 'Text label';
      item.textFlow = 'auto-height';
      item.width = session.width;
      const inspector = document.getElementById('textContent');
      if (inspector && selectedTextItem()?.id === item.id) inspector.value = value;
      sizeWrappedEditor(editor, session.width);
      render();
      scheduleSave();
    }, 0);
  }

  function insertPlainText(value) {
    if (document.execCommand?.('insertText', false, value)) return;
    const selection = window.getSelection?.();
    if (!selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const node = document.createTextNode(value);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  document.addEventListener('paste', event => {
    const editor = event.target.closest?.('.figureloom-direct-label-editor[data-figureloom-wrapped-editor="1"]');
    if (editor) {
      event.preventDefault();
      event.stopImmediatePropagation();
      insertPlainText(event.clipboardData?.getData('text/plain') || '');
      return;
    }

    if (event.target?.id !== 'textContent') return;
    const item = selectedTextItem();
    if (!item) return;
    const width = Math.max(320, Number(item.width) || 0);
    setTimeout(() => {
      const current = selectedTextItem();
      const control = document.getElementById('textContent');
      if (!current || current.id !== item.id || !control) return;
      pushHistory();
      current.text = control.value;
      current.name = control.value.trim().slice(0, 40) || 'Text label';
      if (!(current.textFlow === 'single' && current.textFlowExplicit === true)) {
        current.textFlow = 'auto-height';
      }
      current.width = width;
      render();
      scheduleSave();
    }, 0);
  }, true);

  document.addEventListener('beforeinput', event => {
    const editor = event.target.closest?.('.figureloom-direct-label-editor[data-figureloom-wrapped-editor="1"]');
    if (!editor) return;
    if (event.inputType === 'insertParagraph' || event.inputType === 'insertLineBreak') {
      event.stopImmediatePropagation();
    }
  }, true);

  document.addEventListener('input', event => {
    const editor = event.target.closest?.('.figureloom-direct-label-editor[data-figureloom-wrapped-editor="1"]');
    if (editor) syncEditorAfterNativeHandler(editor);
  }, true);

  document.addEventListener('keydown', event => {
    const editor = event.target.closest?.('.figureloom-direct-label-editor[data-figureloom-wrapped-editor="1"]');
    if (!editor || event.key !== 'Enter') return;
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      editor.blur();
      return;
    }
    event.stopImmediatePropagation();
  }, true);

  document.addEventListener('blur', event => {
    const editor = event.target.closest?.('.figureloom-direct-label-editor[data-figureloom-wrapped-editor="1"]');
    if (!editor) return;
    const session = sessions.get(editor);
    const value = editorText(editor);
    if (!session) return;
    setTimeout(() => {
      const item = textItem(session.id);
      if (!item) return;
      item.text = value;
      item.name = value.trim().slice(0, 40) || 'Text label';
      item.textFlow = 'auto-height';
      item.width = session.width;
      render();
      scheduleSave();
    }, 0);
  }, true);

  function installFullHeightRenderer() {
    if (!window.__figureLoomTextLayoutTools || typeof renderObject !== 'function') {
      setTimeout(installFullHeightRenderer, 50);
      return;
    }
    if (renderObject.__figureLoomFullTextHeight) return;

    const baseRenderObject = renderObject;
    const wrapped = function renderFullHeightTextBlock(item) {
      const isBlock = item?.type === 'text' && item.textFlow && item.textFlow !== 'single';
      const preservedWidth = isBlock ? Math.max(20, Number(item.width) || 320) : 0;
      const group = baseRenderObject(item);
      if (!isBlock || !group) return group;

      item.width = preservedWidth;
      const text = group.querySelector('text');
      const lines = [...group.querySelectorAll('text > tspan')];
      const fontSize = Math.max(6, Number(item.fontSize) || 30);
      const lineHeight = fontSize * Math.max(1, Number(item.lineHeight) || 1.25);
      const padding = Math.max(0, Number(item.textPadding) || 0);
      const contentHeight = Math.max(lineHeight, Math.max(1, lines.length) * lineHeight);
      const requiredHeight = Math.max(30, Math.ceil(contentHeight + padding * 2));
      const pageHeight = Number(document.getElementById('canvas')?.viewBox?.baseVal?.height) || 750;

      let y = Number(item.y) || 0;
      if (requiredHeight <= pageHeight && y + requiredHeight > pageHeight) {
        y = Math.max(0, pageHeight - requiredHeight);
      } else if (requiredHeight > pageHeight) {
        y = 0;
      }

      item.y = y;
      item.height = requiredHeight;
      group.setAttribute('transform', `translate(${item.x} ${item.y}) rotate(${item.rotation || 0} ${item.width / 2} ${item.height / 2})`);

      const clipRect = group.querySelector('clipPath[data-figureloom-text-clip="1"] rect');
      clipRect?.setAttribute('width', String(item.width));
      clipRect?.setAttribute('height', String(item.height));

      if (text) {
        let firstBaseline = padding + fontSize;
        if (item.textVerticalAlign === 'middle') {
          firstBaseline = (item.height - contentHeight) / 2 + fontSize;
        } else if (item.textVerticalAlign === 'bottom') {
          firstBaseline = item.height - padding - contentHeight + fontSize;
        }
        firstBaseline = Math.max(fontSize * .85, firstBaseline);

        const x = item.textAlign === 'center'
          ? item.width / 2
          : item.textAlign === 'right'
            ? item.width - padding
            : padding;
        const anchor = item.textAlign === 'center' ? 'middle' : item.textAlign === 'right' ? 'end' : 'start';
        text.setAttribute('x', String(x));
        text.setAttribute('y', String(firstBaseline));
        text.setAttribute('text-anchor', anchor);
        lines.forEach((line, index) => {
          line.setAttribute('x', String(x));
          line.setAttribute('y', String(firstBaseline + index * lineHeight));
          if (item.textAlign === 'justify' && index < lines.length - 1 && /\s/.test(line.textContent.trim())) {
            line.setAttribute('textLength', String(Math.max(1, item.width - padding * 2)));
            line.setAttribute('lengthAdjust', 'spacing');
          } else {
            line.removeAttribute('textLength');
            line.removeAttribute('lengthAdjust');
          }
        });
      }
      return group;
    };
    wrapped.__figureLoomFullTextHeight = true;
    renderObject = wrapped;
    window.renderObject = wrapped;
    render();
  }

  function installFlowIntentMarker() {
    const flow = document.getElementById('textBoxFlow');
    if (!flow) {
      setTimeout(installFlowIntentMarker, 50);
      return;
    }
    if (flow.dataset.figureloomIntentMarker === '1') return;
    flow.dataset.figureloomIntentMarker = '1';
    flow.addEventListener('change', () => {
      const item = selectedTextItem();
      if (!item) return;
      item.textFlowExplicit = true;
      scheduleSave();
    });
  }

  const observer = new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(node => {
      if (!(node instanceof Element)) return;
      if (node.matches?.('.figureloom-direct-label-editor')) configureEditor(node);
      node.querySelectorAll?.('.figureloom-direct-label-editor').forEach(configureEditor);
    }));
  });
  observer.observe(document.body, { childList:true, subtree:true });

  installFullHeightRenderer();
  installFlowIntentMarker();
})();