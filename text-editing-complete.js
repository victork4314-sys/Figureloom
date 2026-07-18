(() => {
  if (window.__figureLoomCompleteTextEditingV1) return;
  window.__figureLoomCompleteTextEditingV1 = true;

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const XHTML_NS = 'http://www.w3.org/1999/xhtml';
  const ALLOWED_TAGS = new Set(['A','B','BR','DIV','EM','I','LI','MARK','OL','P','S','SMALL','SPAN','STRONG','SUB','SUP','U','UL']);
  const ALLOWED_STYLES = new Set([
    'background-color','color','font-family','font-size','font-style','font-variant','font-weight',
    'line-height','margin-bottom','margin-left','text-align','text-decoration','text-transform'
  ]);
  const SPECIAL_SYMBOLS = ['α','β','γ','δ','Δ','ε','λ','μ','π','ρ','σ','φ','χ','ψ','ω','Ω','±','×','÷','→','↔','≤','≥','≠','≈','∞','°','µ','Å','₂','₃','⁻¹','²','³'];
  const FONT_CHOICES = [
    ['inherit','Default'],['Arial, sans-serif','Arial'],['Georgia, serif','Georgia'],
    ['Times New Roman, serif','Times New Roman'],['Inter, sans-serif','Inter'],
    ['Courier New, monospace','Courier New'],['Fira Code, monospace','Fira Code']
  ];
  const SIZE_CHOICES = [
    ['0.7em','70%'],['0.85em','85%'],['1em','100%'],['1.15em','115%'],['1.35em','135%'],['1.6em','160%'],['2em','200%']
  ];

  let modal = null;
  let editor = null;
  let activeId = '';
  let savedRange = null;
  const fitCache = new Map();

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[character]);
  }

  function plainHtml(value) {
    const paragraphs = String(value || '').split(/\r?\n/);
    return paragraphs.map(line => `<p>${escapeHtml(line) || '<br>'}</p>`).join('');
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
          if (name === 'data-figure-label' || name === 'data-figure-ref') return;
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

  function currentPageId() {
    try {
      return currentPage?.()?.id || state.pages?.[state.activePage]?.id || '';
    } catch {
      return state.pages?.[state.activePage]?.id || '';
    }
  }

  function pageIndexById(id) {
    return Math.max(0, (state.pages || []).findIndex(page => page.id === id));
  }

  function resolveDynamicHtml(value) {
    const template = document.createElement('template');
    template.innerHTML = sanitizeHtml(value);
    template.content.querySelectorAll('[data-figure-label]').forEach(node => {
      const index = pageIndexById(node.dataset.figureLabel);
      node.textContent = `Figure ${index + 1}.`;
      node.id = `figure-${node.dataset.figureLabel}`;
    });
    template.content.querySelectorAll('[data-figure-ref]').forEach(node => {
      const index = pageIndexById(node.dataset.figureRef);
      node.textContent = `Figure ${index + 1}`;
      node.setAttribute('href', `#figure-${node.dataset.figureRef}`);
      node.removeAttribute('target');
    });
    return template.innerHTML;
  }

  function textDefaults(item) {
    item.fontSize ??= 30;
    item.fontFamily ??= 'Segoe UI, sans-serif';
    item.fontWeight ??= 650;
    item.fontStyle ??= 'normal';
    item.lineHeight ??= 1.25;
    item.textPadding ??= 9;
    item.textFlow ??= 'auto-height';
    item.textOverflow ??= 'clip';
    item.textMinWidth ??= 80;
    item.textMaxWidth ??= 1200;
    item.textFitMin ??= 8;
    item.textFitMax ??= Math.max(12, Number(item.fontSize) || 30);
    return item;
  }

  function hasRichText(item) {
    return item?.type === 'text' && Boolean(item.richTextHtml || item.textFlow === 'fit' || item.textOverflow === 'scroll');
  }

  function rootCss(item, fontSize) {
    const horizontal = item.textAlign || 'left';
    const vertical = item.textVerticalAlign || 'top';
    const display = vertical === 'middle' || vertical === 'bottom' ? 'flex' : 'block';
    const justify = vertical === 'middle' ? 'center' : vertical === 'bottom' ? 'flex-end' : 'flex-start';
    return [
      'box-sizing:border-box',
      `width:${Math.max(1, Number(item.width) || 1)}px`,
      `height:${Math.max(1, Number(item.height) || 1)}px`,
      `padding:${Math.max(0, Number(item.textPadding) || 0)}px`,
      `font-family:${item.fontFamily || 'Segoe UI, sans-serif'}`,
      `font-size:${fontSize}px`,
      `font-weight:${item.fontWeight || 400}`,
      `font-style:${item.fontStyle || 'normal'}`,
      `line-height:${Math.max(.75, Number(item.lineHeight) || 1.25)}`,
      `color:${item.fill || '#172033'}`,
      `text-align:${horizontal}`,
      'overflow-wrap:anywhere',
      'word-break:normal',
      `overflow:${item.textOverflow === 'scroll' ? 'auto' : 'hidden'}`,
      `white-space:${item.textFlow === 'single' ? 'nowrap' : 'normal'}`,
      `display:${display}`,
      'flex-direction:column',
      `justify-content:${justify}`,
      'text-rendering:geometricPrecision'
    ].join(';');
  }

  function measurementNode(item, html, fontSize) {
    const node = document.createElement('div');
    node.style.cssText = rootCss(item, fontSize);
    node.style.position = 'fixed';
    node.style.left = '-100000px';
    node.style.top = '0';
    node.style.visibility = 'hidden';
    node.style.height = item.textFlow === 'auto-height' ? 'auto' : `${Math.max(1, Number(item.height) || 1)}px`;
    node.style.maxHeight = 'none';
    node.style.overflow = 'visible';
    node.innerHTML = html;
    document.body.appendChild(node);
    return node;
  }

  function fittedFontSize(item, html) {
    const min = Math.max(5, Number(item.textFitMin) || 8);
    const max = Math.max(min, Number(item.textFitMax) || Number(item.fontSize) || 30);
    const key = [item.id,item.width,item.height,min,max,item.lineHeight,item.textPadding,html].join('|');
    if (fitCache.has(key)) return fitCache.get(key);
    let low = min;
    let high = max;
    let best = min;
    for (let count = 0; count < 9 && low <= high; count += 1) {
      const midpoint = (low + high) / 2;
      const node = measurementNode(item, html, midpoint);
      const fits = node.scrollWidth <= node.clientWidth + 1 && node.scrollHeight <= node.clientHeight + 1;
      node.remove();
      if (fits) {
        best = midpoint;
        low = midpoint + .4;
      } else {
        high = midpoint - .4;
      }
    }
    const result = Math.max(min, Math.min(max, Math.floor(best * 10) / 10));
    fitCache.set(key, result);
    if (fitCache.size > 180) fitCache.delete(fitCache.keys().next().value);
    return result;
  }

  function autoHeight(item, html, fontSize) {
    const node = measurementNode(item, html, fontSize);
    const pageHeight = Number(document.getElementById('canvas')?.viewBox?.baseVal?.height) || 750;
    const available = Math.max(32, pageHeight - (Number(item.y) || 0));
    const next = Math.min(available, Math.max(30, Math.ceil(node.scrollHeight + 2)));
    node.remove();
    return next;
  }

  function makeForeignObject(item, html, fontSize) {
    const foreignObject = document.createElementNS(SVG_NS, 'foreignObject');
    foreignObject.setAttribute('x', '0');
    foreignObject.setAttribute('y', '0');
    foreignObject.setAttribute('width', String(Math.max(1, Number(item.width) || 1)));
    foreignObject.setAttribute('height', String(Math.max(1, Number(item.height) || 1)));
    foreignObject.dataset.figureloomRichText = '1';

    const div = document.createElementNS(XHTML_NS, 'div');
    div.setAttribute('xmlns', XHTML_NS);
    div.setAttribute('style', rootCss(item, fontSize));
    div.innerHTML = html;
    foreignObject.appendChild(div);

    div.querySelectorAll('a').forEach(link => {
      link.style.cursor = 'pointer';
      link.addEventListener('pointerdown', event => event.stopPropagation());
      link.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        const reference = link.dataset.figureRef;
        if (reference) {
          const index = pageIndexById(reference);
          if (typeof switchPage === 'function' && state.pages?.[index]) switchPage(index);
          return;
        }
        const href = safeHref(link.getAttribute('href'));
        if (href) window.open(href, '_blank', 'noopener,noreferrer');
      });
    });
    return foreignObject;
  }

  function renderRichText(group, item) {
    textDefaults(item);
    item.width = Math.max(Number(item.textMinWidth) || 40, Math.min(Number(item.textMaxWidth) || 1200, Number(item.width) || 190));
    const html = resolveDynamicHtml(item.richTextHtml || plainHtml(item.text));
    const fontSize = item.textFlow === 'fit' ? fittedFontSize(item, html) : Math.max(5, Number(item.fontSize) || 30);
    if (item.textFlow === 'auto-height') item.height = autoHeight(item, html, fontSize);

    [...group.children].forEach(child => {
      const tag = child.tagName?.toLowerCase();
      if (tag === 'text' || child.dataset?.figureloomTextClip === '1' || child.dataset?.figureloomRichText === '1') child.remove();
    });
    group.appendChild(makeForeignObject(item, html, fontSize));
    group.addEventListener('dblclick', event => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      openRichEditor(item.id);
    }, true);
  }

  function saveSelection() {
    const selection = window.getSelection();
    if (!editor || !selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (editor.contains(range.commonAncestorContainer)) savedRange = range.cloneRange();
  }

  function restoreSelection() {
    if (!savedRange || !editor) return false;
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(savedRange);
    return true;
  }

  function focusEditor() {
    editor?.focus({ preventScroll:true });
    restoreSelection();
  }

  function runCommand(command, value = null) {
    focusEditor();
    document.execCommand(command, false, value);
    saveSelection();
  }

  function wrapSelection(style = {}, tag = 'span', attributes = {}) {
    focusEditor();
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return;
    const wrapper = document.createElement(tag);
    Object.assign(wrapper.style, style);
    Object.entries(attributes).forEach(([key, value]) => wrapper.setAttribute(key, value));
    try {
      range.surroundContents(wrapper);
    } catch {
      wrapper.appendChild(range.extractContents());
      range.insertNode(wrapper);
    }
    selection.removeAllRanges();
    const next = document.createRange();
    next.selectNodeContents(wrapper);
    selection.addRange(next);
    saveSelection();
  }

  function insertHtml(html) {
    focusEditor();
    document.execCommand('insertHTML', false, sanitizeHtml(html));
    saveSelection();
  }

  function selectedText() {
    const selection = window.getSelection();
    return selection && editor?.contains(selection.anchorNode) ? selection.toString() : '';
  }

  function replaceSelectionHtml(html) {
    focusEditor();
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
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
    }
    saveSelection();
  }

  function chemicalMarkup(value) {
    return escapeHtml(value).replace(/([A-Za-z\)])(\d+)/g, (_, base, digits) => `${base}<sub>${digits}</sub>`);
  }

  function blockStyle(property, value) {
    focusEditor();
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    let node = selection.anchorNode?.nodeType === Node.ELEMENT_NODE ? selection.anchorNode : selection.anchorNode?.parentElement;
    node = node?.closest?.('p,div,li') || editor;
    if (node === editor && property === 'marginBottom') {
      [...editor.children].forEach(child => { if (child.matches('p,div,li')) child.style[property] = value; });
    } else if (node) {
      node.style[property] = value;
    }
    saveSelection();
  }

  function openTexDrawer() {
    modal.hidden = true;
    if (typeof window.openTexTypesetting === 'function') window.openTexTypesetting();
    else document.getElementById('texTypesettingDrawer')?.classList.add('open');
  }

  function ensureModal() {
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'figureloomRichTextOverlay';
    modal.hidden = true;
    modal.innerHTML = `
      <section class="figureloom-rich-editor" role="dialog" aria-modal="true" aria-labelledby="figureloomRichTextTitle">
        <header><div><strong id="figureloomRichTextTitle">Rich text editor</strong><small>Formatting stays attached to this text box</small></div><button type="button" data-rich-close aria-label="Close">×</button></header>
        <div class="rich-toolbar" aria-label="Text formatting">
          <button type="button" data-command="bold"><b>B</b></button>
          <button type="button" data-command="italic"><i>I</i></button>
          <button type="button" data-command="underline"><u>U</u></button>
          <button type="button" data-command="strikeThrough"><s>S</s></button>
          <label title="Text color">Text <input data-rich-color type="color" value="#172033"></label>
          <label title="Highlight color">Highlight <input data-rich-highlight type="color" value="#fff2a8"></label>
          <select data-rich-size aria-label="Font size"></select>
          <select data-rich-font aria-label="Font family"></select>
          <button type="button" data-command="insertUnorderedList">• List</button>
          <button type="button" data-command="insertOrderedList">1. List</button>
          <button type="button" data-command="indent">Indent</button>
          <button type="button" data-command="outdent">Outdent</button>
          <button type="button" data-rich-sup>Sup</button>
          <button type="button" data-rich-sub>Sub</button>
          <button type="button" data-rich-smallcaps>Small caps</button>
          <button type="button" data-rich-link>Link</button>
          <button type="button" data-command="unlink">Unlink</button>
        </div>
        <div class="rich-science-toolbar">
          <button type="button" data-rich-chemical>Chemical formula</button>
          <button type="button" data-rich-species>Species / gene</button>
          <button type="button" data-rich-protein>Protein</button>
          <button type="button" data-rich-inline-equation>Inline equation</button>
          <button type="button" data-rich-display-equation>Display equation</button>
          <button type="button" data-rich-tex>TeX object</button>
          <label>Paragraph gap <select data-rich-paragraph><option value="0">None</option><option value=".25em">Small</option><option value=".5em">Medium</option><option value="1em">Large</option></select></label>
          <label>Reference <select data-rich-page></select></label>
          <button type="button" data-rich-figure-label>Insert figure label</button>
          <button type="button" data-rich-figure-reference>Insert figure reference</button>
        </div>
        <div class="rich-symbols" aria-label="Scientific symbols"></div>
        <div class="rich-editable" data-rich-editor contenteditable="true" spellcheck="true" role="textbox" aria-multiline="true"></div>
        <footer><button type="button" data-rich-cancel>Cancel</button><button type="button" class="primary" data-rich-save>Save text</button></footer>
      </section>`;
    document.body.appendChild(modal);
    editor = modal.querySelector('[data-rich-editor]');

    SIZE_CHOICES.forEach(([value, label]) => modal.querySelector('[data-rich-size]').add(new Option(label, value)));
    FONT_CHOICES.forEach(([value, label]) => modal.querySelector('[data-rich-font]').add(new Option(label, value)));
    SPECIAL_SYMBOLS.forEach(symbol => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = symbol;
      button.addEventListener('click', () => insertHtml(escapeHtml(symbol)));
      modal.querySelector('.rich-symbols').appendChild(button);
    });

    modal.querySelectorAll('[data-command]').forEach(button => button.addEventListener('click', () => runCommand(button.dataset.command)));
    modal.querySelector('[data-rich-color]').addEventListener('input', event => wrapSelection({ color:event.target.value }));
    modal.querySelector('[data-rich-highlight]').addEventListener('input', event => wrapSelection({ backgroundColor:event.target.value }));
    modal.querySelector('[data-rich-size]').addEventListener('change', event => wrapSelection({ fontSize:event.target.value }));
    modal.querySelector('[data-rich-font]').addEventListener('change', event => wrapSelection({ fontFamily:event.target.value }));
    modal.querySelector('[data-rich-sup]').addEventListener('click', () => runCommand('superscript'));
    modal.querySelector('[data-rich-sub]').addEventListener('click', () => runCommand('subscript'));
    modal.querySelector('[data-rich-smallcaps]').addEventListener('click', () => wrapSelection({ fontVariant:'small-caps' }));
    modal.querySelector('[data-rich-link]').addEventListener('click', () => {
      saveSelection();
      const href = prompt('Link address', 'https://');
      if (!href) return;
      const safe = safeHref(href);
      if (!safe) return alert('Use an http, https, or mailto link.');
      if (selectedText()) runCommand('createLink', safe);
      else insertHtml(`<a href="${escapeHtml(safe)}">${escapeHtml(safe)}</a>`);
    });
    modal.querySelector('[data-rich-chemical]').addEventListener('click', () => {
      const value = selectedText() || prompt('Chemical formula', 'H2O');
      if (value) replaceSelectionHtml(chemicalMarkup(value));
    });
    modal.querySelector('[data-rich-species]').addEventListener('click', () => wrapSelection({ fontStyle:'italic' }, 'span', { 'data-scientific-style':'species-gene' }));
    modal.querySelector('[data-rich-protein]').addEventListener('click', () => wrapSelection({ fontStyle:'normal', fontWeight:'700' }, 'span', { 'data-scientific-style':'protein' }));
    modal.querySelector('[data-rich-inline-equation]').addEventListener('click', () => {
      const value = selectedText() || prompt('Inline equation or notation', 'E = mc²');
      if (value) replaceSelectionHtml(`<span style="font-family:Georgia,serif;font-style:italic">${escapeHtml(value)}</span>`);
    });
    modal.querySelector('[data-rich-display-equation]').addEventListener('click', () => {
      const value = selectedText() || prompt('Display equation or notation', 'E = mc²');
      if (value) replaceSelectionHtml(`<div style="font-family:Georgia,serif;font-style:italic;text-align:center;margin-bottom:.5em">${escapeHtml(value)}</div>`);
    });
    modal.querySelector('[data-rich-tex]').addEventListener('click', openTexDrawer);
    modal.querySelector('[data-rich-paragraph]').addEventListener('change', event => blockStyle('marginBottom', event.target.value));
    modal.querySelector('[data-rich-figure-label]').addEventListener('click', () => {
      const id = currentPageId();
      if (id) insertHtml(`<span data-figure-label="${escapeHtml(id)}">Figure.</span>&nbsp;`);
    });
    modal.querySelector('[data-rich-figure-reference]').addEventListener('click', () => {
      const id = modal.querySelector('[data-rich-page]').value;
      if (id) insertHtml(`<a data-figure-ref="${escapeHtml(id)}" href="#figure-${escapeHtml(id)}">Figure</a>`);
    });

    editor.addEventListener('keyup', saveSelection);
    editor.addEventListener('mouseup', saveSelection);
    editor.addEventListener('focus', saveSelection);
    editor.addEventListener('paste', event => {
      const html = event.clipboardData?.getData('text/html');
      const text = event.clipboardData?.getData('text/plain');
      event.preventDefault();
      insertHtml(html ? sanitizeHtml(html) : plainHtml(text));
    });

    const close = () => {
      modal.hidden = true;
      activeId = '';
      savedRange = null;
    };
    modal.querySelector('[data-rich-close]').addEventListener('click', close);
    modal.querySelector('[data-rich-cancel]').addEventListener('click', close);
    modal.addEventListener('pointerdown', event => { if (event.target === modal) close(); });
    modal.querySelector('[data-rich-save]').addEventListener('click', () => {
      const item = state.objects.find(entry => entry.id === activeId && entry.type === 'text');
      if (!item) return close();
      pushHistory();
      item.richTextHtml = sanitizeHtml(editor.innerHTML);
      item.text = editor.innerText.replace(/\u00a0/g, ' ').trimEnd();
      item.name = item.text.trim().slice(0, 40) || 'Text label';
      textDefaults(item);
      render();
      renderPages?.();
      scheduleSave();
      close();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !modal.hidden) close();
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && !modal.hidden) modal.querySelector('[data-rich-save]').click();
    });

    const style = document.createElement('style');
    style.textContent = `
      #figureloomRichTextOverlay{position:fixed;inset:0;z-index:2147483646;display:grid;place-items:center;padding:12px;background:rgba(15,23,42,.48);backdrop-filter:blur(3px)}
      #figureloomRichTextOverlay[hidden]{display:none!important}.figureloom-rich-editor{display:grid;grid-template-rows:auto auto auto auto minmax(240px,1fr) auto;width:min(980px,calc(100vw - 24px));height:min(820px,calc(100dvh - 24px));overflow:hidden;border:1px solid #cbd5e1;border-radius:15px;background:#fff;box-shadow:0 30px 90px rgba(15,23,42,.35)}
      .figureloom-rich-editor>header,.figureloom-rich-editor>footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 13px;border-bottom:1px solid #e2e8f0}.figureloom-rich-editor>footer{justify-content:flex-end;border-top:1px solid #e2e8f0;border-bottom:0}.figureloom-rich-editor header strong,.figureloom-rich-editor header small{display:block}.figureloom-rich-editor header small{margin-top:2px;color:#64748b;font-size:9px}.figureloom-rich-editor header button{border:0;background:transparent;font-size:25px;color:#64748b}
      .rich-toolbar,.rich-science-toolbar,.rich-symbols{display:flex;flex-wrap:wrap;align-items:center;gap:5px;padding:8px 11px;border-bottom:1px solid #edf0f4;background:#f8fafc}.rich-science-toolbar{background:#f4f8f7}.rich-symbols{padding-block:6px;overflow:auto;flex-wrap:nowrap}.rich-toolbar button,.rich-science-toolbar button,.rich-symbols button,.rich-toolbar select,.rich-science-toolbar select,.rich-toolbar label,.rich-science-toolbar label{min-height:31px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;padding:5px 8px;color:#334155;font-size:10px}.rich-toolbar label,.rich-science-toolbar label{display:flex;align-items:center;gap:5px}.rich-toolbar input[type=color]{width:24px;height:22px;padding:0;border:0;background:transparent}.rich-symbols button{flex:0 0 auto;min-width:31px;padding:4px}
      .rich-editable{min-height:0;margin:12px;overflow:auto;padding:18px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;color:#172033;font:16px/1.45 Inter,Segoe UI,sans-serif;outline:none}.rich-editable:focus{border-color:#6690df;box-shadow:0 0 0 3px rgba(59,130,246,.13)}.rich-editable p{margin-top:0}.rich-editable a{color:#2563eb;text-decoration:underline}.rich-editable mark{padding:0 .08em}.figureloom-rich-editor footer button{min-width:100px;min-height:38px;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc}.figureloom-rich-editor footer .primary{border-color:#2563eb;background:#2563eb;color:#fff}
      .figureloom-rich-controls{margin-top:12px;padding-top:11px;border-top:1px solid #e1e6ee}.figureloom-rich-controls h3{margin:0 0 9px;font-size:11px;color:#526077;text-transform:uppercase;letter-spacing:.04em}.figureloom-rich-controls .rich-inspector-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}.figureloom-rich-controls label{display:grid;gap:4px;color:#66758b;font-size:9px}.figureloom-rich-controls input,.figureloom-rich-controls select{width:100%;min-width:0;min-height:34px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;padding:6px}.figureloom-rich-controls>button{width:100%;min-height:39px;margin-bottom:8px;border:1px solid #7f9fd8;border-radius:8px;background:#edf4ff;color:#2f5da7;font-weight:700}
      @media(max-width:640px){.figureloom-rich-editor{height:calc(100dvh - 10px);width:calc(100vw - 10px);border-radius:10px}.rich-toolbar,.rich-science-toolbar{max-height:130px;overflow:auto}.rich-editable{margin:7px;padding:12px}.figureloom-rich-controls .rich-inspector-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
    return modal;
  }

  function refreshPageOptions() {
    const select = ensureModal().querySelector('[data-rich-page]');
    const current = select.value;
    select.replaceChildren(...(state.pages || []).map((page, index) => new Option(`Figure ${index + 1} · ${page.name || `Page ${index + 1}`}`, page.id)));
    if ([...select.options].some(option => option.value === current)) select.value = current;
    else select.value = currentPageId();
  }

  function openRichEditor(id) {
    const item = state.objects.find(entry => entry.id === id && entry.type === 'text');
    if (!item) return;
    textDefaults(item);
    const overlay = ensureModal();
    activeId = item.id;
    editor.innerHTML = sanitizeHtml(item.richTextHtml || plainHtml(item.text));
    refreshPageOptions();
    overlay.hidden = false;
    requestAnimationFrame(() => {
      editor.focus({ preventScroll:true });
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      saveSelection();
    });
  }
  window.openFigureLoomRichTextEditor = openRichEditor;

  function installInspector() {
    const textInspector = document.getElementById('textInspector');
    const flow = document.getElementById('textBoxFlow');
    if (!textInspector || !flow) return false;
    if (!flow.querySelector('option[value="fit"]')) flow.add(new Option('Fit text · shrink to stay inside', 'fit'));
    if (document.getElementById('figureloomRichTextControls')) return true;

    const section = document.createElement('div');
    section.id = 'figureloomRichTextControls';
    section.className = 'figureloom-rich-controls';
    section.innerHTML = `
      <h3>Advanced text</h3>
      <button type="button" id="openFigureLoomRichText" disabled>Open rich text editor</button>
      <div class="rich-inspector-grid">
        <label>Overflow<select id="figureloomTextOverflow" disabled><option value="clip">Clip</option><option value="scroll">Scrollable</option></select></label>
        <label>Line spacing<input id="figureloomTextLineHeight" type="number" min="0.75" max="3" step="0.05" disabled></label>
        <label>Minimum width<input id="figureloomTextMinWidth" type="number" min="20" max="2000" step="10" disabled></label>
        <label>Maximum width<input id="figureloomTextMaxWidth" type="number" min="20" max="4000" step="10" disabled></label>
        <label>Fit minimum size<input id="figureloomTextFitMin" type="number" min="5" max="180" step="1" disabled></label>
        <label>Fit maximum size<input id="figureloomTextFitMax" type="number" min="5" max="300" step="1" disabled></label>
      </div>`;
    textInspector.appendChild(section);

    const controls = {
      open:section.querySelector('#openFigureLoomRichText'),
      overflow:section.querySelector('#figureloomTextOverflow'),
      lineHeight:section.querySelector('#figureloomTextLineHeight'),
      minWidth:section.querySelector('#figureloomTextMinWidth'),
      maxWidth:section.querySelector('#figureloomTextMaxWidth'),
      fitMin:section.querySelector('#figureloomTextFitMin'),
      fitMax:section.querySelector('#figureloomTextFitMax')
    };

    controls.open.addEventListener('click', () => {
      const item = selectedObject();
      if (item?.type === 'text') openRichEditor(item.id);
    });

    function change(key, value) {
      const item = selectedObject();
      if (!item || item.type !== 'text') return;
      pushHistory();
      textDefaults(item);
      item[key] = value;
      if (key === 'textMinWidth' || key === 'textMaxWidth') {
        item.textMaxWidth = Math.max(item.textMinWidth, item.textMaxWidth);
        item.width = Math.max(item.textMinWidth, Math.min(item.textMaxWidth, item.width));
      }
      fitCache.clear();
      render();
      scheduleSave();
    }

    controls.overflow.addEventListener('change', event => change('textOverflow', event.target.value));
    controls.lineHeight.addEventListener('change', event => change('lineHeight', Math.max(.75, Number(event.target.value) || 1.25)));
    controls.minWidth.addEventListener('change', event => change('textMinWidth', Math.max(20, Number(event.target.value) || 80)));
    controls.maxWidth.addEventListener('change', event => change('textMaxWidth', Math.max(20, Number(event.target.value) || 1200)));
    controls.fitMin.addEventListener('change', event => change('textFitMin', Math.max(5, Number(event.target.value) || 8)));
    controls.fitMax.addEventListener('change', event => change('textFitMax', Math.max(5, Number(event.target.value) || 30)));

    const baseUpdateInspector = updateInspector;
    updateInspector = function updateInspectorWithCompleteTextEditing() {
      baseUpdateInspector();
      const item = selectedObject();
      const active = item?.type === 'text';
      Object.values(controls).forEach(control => { control.disabled = !active; });
      if (!active) return;
      textDefaults(item);
      controls.overflow.value = item.textOverflow;
      controls.lineHeight.value = item.lineHeight;
      controls.minWidth.value = item.textMinWidth;
      controls.maxWidth.value = item.textMaxWidth;
      controls.fitMin.value = item.textFitMin;
      controls.fitMax.value = item.textFitMax;
    };

    document.getElementById('textContent')?.addEventListener('change', event => {
      const item = selectedObject();
      if (!item || item.type !== 'text' || !item.richTextHtml) return;
      item.richTextHtml = plainHtml(event.target.value);
    }, true);
    return true;
  }

  function installRenderer() {
    if (window.__figureLoomRichTextRendererInstalled) return;
    if (typeof renderObject !== 'function') return;
    window.__figureLoomRichTextRendererInstalled = true;
    const baseRenderObject = renderObject;
    renderObject = function renderObjectWithCompleteTextEditing(item) {
      const group = baseRenderObject(item);
      if (group && hasRichText(item)) renderRichText(group, item);
      return group;
    };
  }

  function install() {
    installRenderer();
    if (!installInspector()) setTimeout(install, 80);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(install, 0), { once:true });
  else setTimeout(install, 0);
})();
