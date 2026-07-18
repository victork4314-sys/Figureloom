(() => {
  if (window.__figureLoomCodeWindowsV2) return;
  window.__figureLoomCodeWindowsV2 = true;

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const LANGUAGES = [
    ['plain','Plain text'],['python','Python'],['r','R'],['bash','Bash'],['javascript','JavaScript'],
    ['html','HTML'],['css','CSS'],['sql','SQL'],['json','JSON'],['yaml','YAML'],['matlab','MATLAB'],
    ['julia','Julia'],['cpp','C / C++'],['java','Java']
  ];
  const KEYWORDS = {
    python:['and','as','assert','async','await','break','class','continue','def','del','elif','else','except','False','finally','for','from','global','if','import','in','is','lambda','None','nonlocal','not','or','pass','raise','return','True','try','while','with','yield'],
    r:['break','else','FALSE','for','function','if','in','Inf','NA','NaN','next','NULL','repeat','return','TRUE','while'],
    bash:['case','do','done','elif','else','esac','fi','for','function','if','in','select','then','time','until','while'],
    javascript:['async','await','break','case','catch','class','const','continue','debugger','default','delete','do','else','export','extends','false','finally','for','from','function','if','import','in','instanceof','let','new','null','of','return','static','super','switch','this','throw','true','try','typeof','undefined','var','void','while','with','yield'],
    css:['align-items','animation','background','border','color','display','flex','font-family','font-size','gap','grid','height','justify-content','margin','opacity','padding','position','transform','transition','width'],
    sql:['ALTER','AND','AS','ASC','BEGIN','BETWEEN','BY','CASE','CREATE','DELETE','DESC','DISTINCT','DROP','ELSE','END','FROM','FULL','GROUP','HAVING','IN','INNER','INSERT','INTO','IS','JOIN','LEFT','LIKE','LIMIT','NOT','NULL','ON','OR','ORDER','OUTER','RIGHT','SELECT','SET','TABLE','THEN','UNION','UPDATE','VALUES','WHEN','WHERE'],
    matlab:['break','case','catch','classdef','continue','else','elseif','end','for','function','global','if','otherwise','parfor','persistent','return','spmd','switch','try','while'],
    julia:['abstract','baremodule','begin','break','catch','const','continue','do','else','elseif','end','export','finally','for','function','global','if','import','let','local','macro','module','mutable','primitive','quote','return','struct','try','using','while'],
    cpp:['alignas','alignof','and','asm','auto','bool','break','case','catch','char','class','const','constexpr','continue','default','delete','do','double','else','enum','explicit','export','extern','false','float','for','friend','if','inline','int','long','namespace','new','noexcept','nullptr','operator','private','protected','public','register','return','short','signed','sizeof','static','struct','switch','template','this','throw','true','try','typedef','typename','union','unsigned','using','virtual','void','volatile','while'],
    java:['abstract','assert','boolean','break','byte','case','catch','char','class','const','continue','default','do','double','else','enum','extends','false','final','finally','float','for','goto','if','implements','import','instanceof','int','interface','long','native','new','null','package','private','protected','public','return','short','static','strictfp','super','switch','synchronized','this','throw','throws','transient','true','try','void','volatile','while']
  };

  let modal = null;
  let editingId = '';

  function svg(tag, attrs = {}) {
    const node = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
    return node;
  }

  function allObjects() {
    const items = [];
    const seen = new Set();
    const add = item => { if (item && !seen.has(item)) { seen.add(item); items.push(item); } };
    (state?.objects || []).forEach(add);
    (state?.pages || []).forEach(page => (page.objects || []).forEach(add));
    return items;
  }

  function findItem(id, type = '') {
    return allObjects().find(item => item?.id === id && (!type || item.type === type)) || null;
  }

  function codeDefaults(item) {
    item.code ??= 'import pandas as pd\n\nresults = pd.read_csv("results.csv")\nprint(results.head())';
    item.language ??= 'python';
    item.codeMode ??= item.terminalMode ? 'terminal' : 'code';
    item.codeTheme ??= 'dark';
    item.codeWrap ??= true;
    item.codeLineNumbers ??= true;
    item.codeFontSize ??= 16;
    item.codeFontFamily ??= 'SFMono-Regular, Consolas, Liberation Mono, monospace';
    item.codeTabSize ??= 4;
    item.codeIndentWithTabs ??= false;
    item.codeTitle ??= item.codeMode === 'terminal' ? 'Terminal' : 'Code';
    item.codeHeader ??= true;
    item.codeCopyButton ??= true;
    item.codeBorderRadius ??= 12;
    item.codePadding ??= 11;
    item.codeHighlightLines ??= '';
    item.diffBefore ??= '';
    item.diffAfter ??= '';
    item.fill ??= '#111827';
    item.stroke ??= '#334155';
    item.opacity ??= 1;
    item.rotation ??= 0;
    item.visible ??= true;
    return item;
  }

  function instructionDefaults(item) {
    item.instructionTitle ??= 'Workflow';
    item.instructionPurpose ??= 'Explain what this workflow accomplishes.';
    item.instructionPrerequisites ??= '';
    item.instructionSteps ??= ['Add the first step', 'Add the next step'];
    item.instructionWarnings ??= '';
    item.instructionExpected ??= 'Describe the expected result.';
    item.instructionNotes ??= '';
    item.instructionTheme ??= 'light';
    item.instructionAccent ??= '#315ec7';
    item.instructionCopyButton ??= true;
    item.instructionBorderRadius ??= 12;
    item.instructionFontSize ??= 15;
    item.opacity ??= 1;
    item.rotation ??= 0;
    item.visible ??= true;
    return item;
  }

  function displayLanguage(value) {
    return LANGUAGES.find(([id]) => id === value)?.[1] || 'Code';
  }

  function palette(theme) {
    return theme === 'light'
      ? { background:'#f8fafc', header:'#e2e8f0', border:'#94a3b8', text:'#1e293b', muted:'#64748b', keyword:'#6d28d9', string:'#b45309', number:'#0369a1', comment:'#15803d', highlight:'#fef3c7', added:'#dcfce7', removed:'#fee2e2' }
      : { background:'#111827', header:'#1f2937', border:'#475569', text:'#e5e7eb', muted:'#94a3b8', keyword:'#c4b5fd', string:'#fbbf24', number:'#67e8f9', comment:'#86efac', highlight:'#3f3a20', added:'#153b2b', removed:'#48262a' };
  }

  function commentMarker(language) {
    if (['python','r','bash','yaml'].includes(language)) return '#';
    if (language === 'sql') return '--';
    if (language === 'html') return '<!--';
    return '//';
  }

  function tokenize(line, language) {
    if (language === 'plain') return [{ text:line, kind:'plain' }];
    if (language === 'html') {
      const pieces = [];
      const pattern = /(<!--.*?-->|<\/?[A-Za-z][^>]*>|&[A-Za-z0-9#]+;)/g;
      let cursor = 0;
      for (const match of line.matchAll(pattern)) {
        if (match.index > cursor) pieces.push({ text:line.slice(cursor, match.index), kind:'plain' });
        pieces.push({ text:match[0], kind:match[0].startsWith('<!--') ? 'comment' : 'keyword' });
        cursor = match.index + match[0].length;
      }
      if (cursor < line.length) pieces.push({ text:line.slice(cursor), kind:'plain' });
      return pieces.length ? pieces : [{ text:line, kind:'plain' }];
    }
    const marker = commentMarker(language);
    const commentAt = line.indexOf(marker);
    const codePart = commentAt >= 0 ? line.slice(0, commentAt) : line;
    const commentPart = commentAt >= 0 ? line.slice(commentAt) : '';
    const words = KEYWORDS[language] || [];
    const keywordPattern = words.length ? new RegExp(`\\b(?:${words.map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, language === 'sql' ? 'gi' : 'g') : null;
    const tokens = [];
    const mixed = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b)/gi;
    let cursor = 0;
    function appendText(text) {
      if (!text) return;
      if (!keywordPattern) return tokens.push({ text, kind:'plain' });
      keywordPattern.lastIndex = 0;
      let start = 0;
      let match;
      while ((match = keywordPattern.exec(text))) {
        if (match.index > start) tokens.push({ text:text.slice(start, match.index), kind:'plain' });
        tokens.push({ text:match[0], kind:'keyword' });
        start = match.index + match[0].length;
      }
      if (start < text.length) tokens.push({ text:text.slice(start), kind:'plain' });
    }
    let match;
    while ((match = mixed.exec(codePart))) {
      appendText(codePart.slice(cursor, match.index));
      tokens.push({ text:match[0], kind:match[1] ? 'string' : 'number' });
      cursor = match.index + match[0].length;
    }
    appendText(codePart.slice(cursor));
    if (commentPart) tokens.push({ text:commentPart, kind:'comment' });
    return tokens.length ? tokens : [{ text:'', kind:'plain' }];
  }

  function parseHighlightedLines(value) {
    const output = new Set();
    String(value || '').split(',').map(part => part.trim()).filter(Boolean).forEach(part => {
      const match = part.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
      if (!match) return;
      const start = Math.max(1, Number(match[1]));
      const end = Math.max(start, Number(match[2] || start));
      for (let line = start; line <= Math.min(end, start + 500); line += 1) output.add(line);
    });
    return output;
  }

  function hardWrap(text, limit) {
    if (!text.length) return [''];
    const chunks = [];
    let remaining = text;
    while (remaining.length > limit) {
      let cut = remaining.lastIndexOf(' ', limit);
      if (cut < Math.floor(limit * .45)) cut = limit;
      chunks.push(remaining.slice(0, cut));
      remaining = remaining.slice(cut);
      if (remaining.startsWith(' ')) remaining = remaining.slice(1);
    }
    chunks.push(remaining);
    return chunks;
  }

  function sourceLines(item, codeWidth) {
    const tabSize = Math.max(1, Math.min(8, Number(item.codeTabSize) || 4));
    const source = String(item.code || '').replace(/\t/g, ' '.repeat(tabSize)).split(/\r?\n/);
    if (item.codeWrap === false) return source.map((text, index) => ({ text, source:index + 1, continuation:false, kind:'normal' }));
    const width = Math.max(5, item.codeFontSize * .61);
    const limit = Math.max(8, Math.floor(codeWidth / width));
    return source.flatMap((line, index) => hardWrap(line, limit).map((text, part) => ({ text, source:index + 1, continuation:part > 0, kind:'normal' })));
  }

  function diffLines(beforeText, afterText) {
    const before = String(beforeText || '').split(/\r?\n/);
    const after = String(afterText || '').split(/\r?\n/);
    const n = Math.min(before.length, 250);
    const m = Math.min(after.length, 250);
    const dp = Array.from({ length:n + 1 }, () => new Uint16Array(m + 1));
    for (let i = n - 1; i >= 0; i -= 1) for (let j = m - 1; j >= 0; j -= 1) dp[i][j] = before[i] === after[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const rows = [];
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
      if (before[i] === after[j]) { rows.push({ text:`  ${before[i]}`, kind:'same', source:j + 1 }); i += 1; j += 1; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) { rows.push({ text:`- ${before[i]}`, kind:'removed', source:i + 1 }); i += 1; }
      else { rows.push({ text:`+ ${after[j]}`, kind:'added', source:j + 1 }); j += 1; }
    }
    while (i < n) { rows.push({ text:`- ${before[i]}`, kind:'removed', source:i + 1 }); i += 1; }
    while (j < m) { rows.push({ text:`+ ${after[j]}`, kind:'added', source:j + 1 }); j += 1; }
    return rows;
  }

  function addText(group, attrs, value) {
    const node = svg('text', attrs);
    node.textContent = value;
    group.appendChild(node);
    return node;
  }

  function copyText(text) {
    const value = String(text || '');
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(value).then(() => window.SciCanvasToast?.('Copied', 'success')).catch(() => {});
    else {
      const area = document.createElement('textarea');
      area.value = value;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      try { document.execCommand('copy'); window.SciCanvasToast?.('Copied', 'success'); } catch {}
      area.remove();
    }
  }

  function renderCopyButton(group, item, text, paletteValue, y = 7) {
    if (item.codeCopyButton === false && item.instructionCopyButton === false) return;
    const button = svg('g', { class:'figureloom-code-copy', transform:`translate(${Math.max(8, item.width - 70)} ${y})`, role:'button', tabindex:'0' });
    button.appendChild(svg('rect', { width:58, height:22, rx:6, fill:paletteValue.header || '#e2e8f0', stroke:paletteValue.border || '#94a3b8', 'stroke-width':1 }));
    addText(button, { x:29, y:15, fill:paletteValue.text || '#1e293b', 'font-size':9, 'font-weight':700, 'font-family':'Segoe UI, sans-serif', 'text-anchor':'middle' }, 'Copy');
    const run = event => { event.preventDefault(); event.stopPropagation(); copyText(text); };
    button.addEventListener('pointerdown', event => { event.preventDefault(); event.stopPropagation(); });
    button.addEventListener('click', run);
    button.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') run(event); });
    group.appendChild(button);
  }

  function renderCodeObject(item) {
    codeDefaults(item);
    const colors = palette(item.codeTheme);
    const group = typeof genericGroup === 'function' ? genericGroup(item) : svg('g', { class:'canvas-object', 'data-id':item.id, transform:`translate(${item.x} ${item.y})`, opacity:item.opacity });
    const radius = Math.max(0, Math.min(32, Number(item.codeBorderRadius) || 0));
    const headerHeight = item.codeHeader === false ? 0 : 34;
    group.appendChild(svg('rect', { width:item.width, height:item.height, rx:radius, fill:colors.background, stroke:colors.border, 'stroke-width':2 }));
    if (headerHeight) {
      group.appendChild(svg('rect', { width:item.width, height:headerHeight, rx:radius, fill:colors.header }));
      group.appendChild(svg('rect', { y:Math.max(0, headerHeight - radius), width:item.width, height:radius, fill:colors.header }));
      if (item.codeMode === 'terminal') addText(group, { x:13, y:22, fill:colors.muted, 'font-size':12, 'font-family':item.codeFontFamily }, '›_');
      else ['#fb7185','#fbbf24','#4ade80'].forEach((fill, index) => group.appendChild(svg('circle', { cx:15 + index * 14, cy:17, r:4.3, fill })));
      addText(group, { x:item.codeMode === 'terminal' ? 42 : 58, y:22, fill:colors.text, 'font-size':11, 'font-weight':700, 'font-family':'Segoe UI, sans-serif' }, item.codeTitle || displayLanguage(item.language));
      if (item.codeCopyButton !== false) renderCopyButton(group, item, item.codeMode === 'diff' ? `${item.diffBefore || ''}\n---\n${item.diffAfter || ''}` : item.code, colors, 6);
    }
    const clipId = `code-clip-${String(item.id).replace(/[^a-z0-9_-]/gi, '')}`;
    const clip = svg('clipPath', { id:clipId });
    clip.appendChild(svg('rect', { x:1, y:headerHeight, width:Math.max(1, item.width - 2), height:Math.max(1, item.height - headerHeight - 1), rx:Math.max(0, radius - 2) }));
    group.appendChild(clip);
    const content = svg('g', { 'clip-path':`url(#${clipId})` });
    const numberWidth = item.codeLineNumbers === false || item.codeMode === 'terminal' ? 0 : 42;
    const padding = Math.max(4, Math.min(30, Number(item.codePadding) || 11));
    if (numberWidth) content.appendChild(svg('rect', { x:0, y:headerHeight, width:numberWidth, height:Math.max(0, item.height - headerHeight), fill:colors.header, opacity:.54 }));
    const codeX = numberWidth + padding;
    const usableWidth = Math.max(20, item.width - codeX - padding);
    const lineHeight = Math.max(14, Math.round(item.codeFontSize * 1.48));
    const highlighted = parseHighlightedLines(item.codeHighlightLines);
    const lines = item.codeMode === 'diff' ? diffLines(item.diffBefore, item.diffAfter) : sourceLines(item, usableWidth);
    const visibleCount = Math.max(1, Math.floor((item.height - headerHeight - padding * 1.4) / lineHeight));
    lines.slice(0, visibleCount).forEach((line, index) => {
      const y = headerHeight + padding + item.codeFontSize + index * lineHeight;
      const rowTop = y - item.codeFontSize - 3;
      if (line.kind === 'added') content.appendChild(svg('rect', { x:numberWidth, y:rowTop, width:item.width - numberWidth, height:lineHeight, fill:colors.added }));
      else if (line.kind === 'removed') content.appendChild(svg('rect', { x:numberWidth, y:rowTop, width:item.width - numberWidth, height:lineHeight, fill:colors.removed }));
      else if (highlighted.has(line.source) && !line.continuation) content.appendChild(svg('rect', { x:numberWidth, y:rowTop, width:item.width - numberWidth, height:lineHeight, fill:colors.highlight }));
      if (numberWidth && !line.continuation) addText(content, { x:numberWidth - 9, y, fill:colors.muted, 'font-size':Math.max(9, item.codeFontSize - 2), 'font-family':item.codeFontFamily, 'text-anchor':'end' }, String(line.source));
      const textNode = svg('text', { x:codeX, y, fill:colors.text, 'font-size':item.codeFontSize, 'font-family':item.codeFontFamily, 'xml:space':'preserve' });
      if (item.codeMode === 'diff') {
        textNode.textContent = line.text || ' ';
        textNode.setAttribute('fill', line.kind === 'added' ? '#16a34a' : line.kind === 'removed' ? '#dc2626' : colors.text);
      } else {
        tokenize(line.text, item.language).forEach(token => {
          const span = svg('tspan', { fill:colors[token.kind] || colors.text });
          span.textContent = token.text || ' ';
          textNode.appendChild(span);
        });
      }
      content.appendChild(textNode);
    });
    group.appendChild(content);
    if (!headerHeight && item.codeCopyButton !== false) renderCopyButton(group, item, item.code, colors, 7);
    if (item.visible === false) group.style.display = 'none';
    group.addEventListener('dblclick', event => { event.preventDefault(); event.stopPropagation(); openEditor(item.id); });
    return group;
  }

  function wrapWords(text, maxChars) {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    words.forEach(word => {
      const next = line ? `${line} ${word}` : word;
      if (next.length > maxChars && line) { lines.push(line); line = word; } else line = next;
    });
    if (line) lines.push(line);
    return lines.length ? lines : [''];
  }

  function instructionPlain(item) {
    instructionDefaults(item);
    const steps = Array.isArray(item.instructionSteps) ? item.instructionSteps : String(item.instructionSteps || '').split(/\r?\n/);
    return [item.instructionTitle, item.instructionPurpose ? `Purpose: ${item.instructionPurpose}` : '', item.instructionPrerequisites ? `Prerequisites: ${item.instructionPrerequisites}` : '', ...steps.filter(Boolean).map((step, index) => `${index + 1}. ${step}`), item.instructionWarnings ? `Warning: ${item.instructionWarnings}` : '', item.instructionExpected ? `Expected result: ${item.instructionExpected}` : '', item.instructionNotes ? `Notes: ${item.instructionNotes}` : ''].filter(Boolean).join('\n\n');
  }

  function renderInstructionObject(item) {
    instructionDefaults(item);
    const dark = item.instructionTheme === 'dark';
    const colors = dark ? { bg:'#1f2937', header:'#111827', text:'#f3f4f6', muted:'#cbd5e1', border:'#475569', warning:'#fbbf24', panel:'#273449' } : { bg:'#ffffff', header:'#f8fafc', text:'#1f2937', muted:'#64748b', border:'#cbd5e1', warning:'#b45309', panel:'#f8fafc' };
    const group = typeof genericGroup === 'function' ? genericGroup(item) : svg('g', { class:'canvas-object', 'data-id':item.id, transform:`translate(${item.x} ${item.y})`, opacity:item.opacity });
    const radius = Math.max(0, Math.min(32, Number(item.instructionBorderRadius) || 12));
    group.appendChild(svg('rect', { width:item.width, height:item.height, rx:radius, fill:colors.bg, stroke:colors.border, 'stroke-width':2 }));
    group.appendChild(svg('rect', { width:item.width, height:46, rx:radius, fill:colors.header }));
    group.appendChild(svg('rect', { y:Math.max(0, 46 - radius), width:item.width, height:radius, fill:colors.header }));
    group.appendChild(svg('rect', { x:0, y:0, width:6, height:item.height, rx:Math.min(6, radius), fill:item.instructionAccent }));
    addText(group, { x:18, y:29, fill:colors.text, 'font-size':Math.max(14, item.instructionFontSize + 2), 'font-weight':800, 'font-family':'Segoe UI, sans-serif' }, item.instructionTitle || 'Workflow');
    if (item.instructionCopyButton !== false) renderCopyButton(group, item, instructionPlain(item), { ...colors, header:colors.panel }, 12);
    const clipId = `instruction-clip-${String(item.id).replace(/[^a-z0-9_-]/gi, '')}`;
    const clip = svg('clipPath', { id:clipId });
    clip.appendChild(svg('rect', { x:8, y:48, width:Math.max(1, item.width - 16), height:Math.max(1, item.height - 54), rx:Math.max(0, radius - 3) }));
    group.appendChild(clip);
    const content = svg('g', { 'clip-path':`url(#${clipId})` });
    const fontSize = Math.max(10, Number(item.instructionFontSize) || 15);
    const lineHeight = Math.round(fontSize * 1.42);
    const maxChars = Math.max(20, Math.floor((item.width - 40) / (fontSize * .53)));
    let y = 68;
    const addBlock = (label, text, color = colors.text) => {
      if (!String(text || '').trim()) return;
      addText(content, { x:18, y, fill:item.instructionAccent, 'font-size':Math.max(9, fontSize - 3), 'font-weight':800, 'font-family':'Segoe UI, sans-serif' }, label.toUpperCase());
      y += lineHeight;
      wrapWords(text, maxChars).forEach(line => { addText(content, { x:18, y, fill:color, 'font-size':fontSize, 'font-family':'Segoe UI, sans-serif' }, line); y += lineHeight; });
      y += 6;
    };
    addBlock('Purpose', item.instructionPurpose, colors.text);
    addBlock('Prerequisites', item.instructionPrerequisites, colors.muted);
    const steps = Array.isArray(item.instructionSteps) ? item.instructionSteps : String(item.instructionSteps || '').split(/\r?\n/);
    if (steps.filter(Boolean).length) {
      addText(content, { x:18, y, fill:item.instructionAccent, 'font-size':Math.max(9, fontSize - 3), 'font-weight':800, 'font-family':'Segoe UI, sans-serif' }, 'STEPS');
      y += lineHeight;
      steps.filter(Boolean).forEach((step, index) => wrapWords(step, Math.max(12, maxChars - 4)).forEach((line, lineIndex) => { addText(content, { x:18, y, fill:colors.text, 'font-size':fontSize, 'font-family':'Segoe UI, sans-serif' }, `${lineIndex ? '   ' : `${index + 1}. `}${line}`); y += lineHeight; }));
      y += 6;
    }
    addBlock('Warning', item.instructionWarnings, colors.warning);
    addBlock('Expected result', item.instructionExpected, colors.text);
    addBlock('Notes', item.instructionNotes, colors.muted);
    group.appendChild(content);
    if (item.visible === false) group.style.display = 'none';
    group.addEventListener('dblclick', event => { event.preventDefault(); event.stopPropagation(); window.FigureLoomCodeWindows?.openWorkspace?.(item.id); });
    return group;
  }

  function addCodeWindow(options = {}) {
    pushHistory?.();
    const mode = options.mode || 'code';
    const item = codeDefaults({ id:uid(), type:'code', name:mode === 'terminal' ? 'Terminal' : mode === 'diff' ? 'Code diff' : 'Python code', x:330, y:190, width:520, height:340, opacity:1, rotation:0, visible:true, codeMode:mode });
    if (mode === 'terminal') { item.language = 'bash'; item.codeTitle = 'Terminal'; item.codeLineNumbers = false; item.code = '$ python analysis.py\nLoading data…\nDone.'; }
    if (mode === 'diff') { item.codeTitle = 'Changes'; item.diffBefore = 'const value = 1;\nconsole.log(value);'; item.diffAfter = 'const value = 2;\nconsole.log(`Value: ${value}`);'; }
    state.objects.push(item);
    state.selectedId = item.id;
    render?.();
    scheduleSave?.();
    return item.id;
  }

  function addInstructionBlock() {
    pushHistory?.();
    const item = instructionDefaults({ id:uid(), type:'instruction', name:'Workflow instructions', x:330, y:150, width:560, height:470, opacity:1, rotation:0, visible:true });
    state.objects.push(item);
    state.selectedId = item.id;
    render?.();
    scheduleSave?.();
    return item.id;
  }

  function textareaTabHandler(event, item) {
    if (event.key !== 'Tab') return;
    event.preventDefault();
    const area = event.currentTarget;
    const start = area.selectionStart;
    const end = area.selectionEnd;
    const tabSize = Math.max(1, Math.min(8, Number(item.codeTabSize) || 4));
    const insert = item.codeIndentWithTabs ? '\t' : ' '.repeat(tabSize);
    area.setRangeText(insert, start, end, 'end');
    area.dispatchEvent(new Event('input', { bubbles:true }));
  }

  function ensureModal() {
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'figureloomCodeEditorOverlay';
    modal.hidden = true;
    modal.innerHTML = `<section class="figureloom-code-editor" role="dialog" aria-modal="true" aria-labelledby="figureloomCodeEditorTitle"><header><div><strong id="figureloomCodeEditorTitle">Edit code window</strong><small>Large editor for the selected code object</small></div><button type="button" data-code-close aria-label="Close">×</button></header><textarea data-code-value spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="Code"></textarea><footer><button type="button" data-code-cancel>Cancel</button><button type="button" class="primary" data-code-save>Save code</button></footer></section>`;
    document.body.appendChild(modal);
    const close = () => { modal.hidden = true; editingId = ''; };
    modal.querySelector('[data-code-close]').onclick = close;
    modal.querySelector('[data-code-cancel]').onclick = close;
    modal.addEventListener('pointerdown', event => { if (event.target === modal) close(); });
    modal.querySelector('[data-code-save]').onclick = () => { const item = findItem(editingId, 'code'); if (!item) return close(); pushHistory?.(); item.code = modal.querySelector('[data-code-value]').value; render?.(); scheduleSave?.(); close(); };
    modal.querySelector('[data-code-value]').addEventListener('keydown', event => { const item = findItem(editingId, 'code'); if (item) textareaTabHandler(event, item); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && !modal.hidden) close(); });
    const style = document.createElement('style');
    style.id = 'figureloomCodeWindowStylesV2';
    style.textContent = `#figureloomCodeEditorOverlay{position:fixed;z-index:10020;inset:0;display:grid;place-items:center;padding:16px;background:rgba(15,23,42,.48);backdrop-filter:blur(5px)}#figureloomCodeEditorOverlay[hidden]{display:none}.figureloom-code-editor{width:min(900px,calc(100vw - 24px));height:min(720px,calc(100vh - 28px));display:grid;grid-template-rows:auto minmax(0,1fr) auto;overflow:hidden;border:1px solid #cbd5e1;border-radius:14px;background:#fff;box-shadow:0 28px 90px rgba(15,23,42,.34)}.figureloom-code-editor>header,.figureloom-code-editor>footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px}.figureloom-code-editor>header{border-bottom:1px solid #e2e8f0}.figureloom-code-editor>footer{justify-content:flex-end;border-top:1px solid #e2e8f0}.figureloom-code-editor header strong,.figureloom-code-editor header small{display:block}.figureloom-code-editor header small{margin-top:2px;color:#718096;font-size:10px}.figureloom-code-editor header button{border:0;background:transparent;font-size:24px;color:#64748b}.figureloom-code-editor textarea{width:100%;min-height:0;box-sizing:border-box;border:0;outline:0;padding:16px;background:#111827;color:#e5e7eb;font:13px/1.55 SFMono-Regular,Consolas,Liberation Mono,monospace;resize:none;tab-size:4}.figureloom-code-editor footer button{border:1px solid #cbd5e1;border-radius:8px;background:#fff;padding:8px 12px}.figureloom-code-editor footer button.primary{border-color:#315ec7;background:#315ec7;color:#fff}html[data-figureloom-theme="dark"] .figureloom-code-editor{border-color:#475569;background:#1f2937;color:#e5e7eb}html[data-figureloom-theme="dark"] .figureloom-code-editor>header,html[data-figureloom-theme="dark"] .figureloom-code-editor>footer{border-color:#374151}`;
    document.head.appendChild(style);
    return modal;
  }

  function openEditor(id) {
    const item = findItem(id, 'code');
    if (!item) return;
    codeDefaults(item);
    editingId = id;
    const overlay = ensureModal();
    overlay.querySelector('[data-code-value]').value = item.codeMode === 'diff' ? item.diffAfter : item.code;
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.querySelector('[data-code-value]').focus({ preventScroll:true }));
  }

  const baseRenderObject = renderObject;
  renderObject = function renderObjectWithCodeAndInstructions(item) {
    if (item?.type === 'code') return renderCodeObject(item);
    if (item?.type === 'instruction') return renderInstructionObject(item);
    return baseRenderObject(item);
  };

  window.FigureLoomCodeWindows = {
    languages:LANGUAGES, add:addCodeWindow, addInstruction:addInstructionBlock, edit:openEditor, find:findItem, codeDefaults, instructionDefaults, copyText, instructionPlain, textareaTabHandler,
    openWorkspace(id) { if (id) state.selectedId = id; window.SciCanvasPro?.open?.(); setTimeout(() => document.querySelector('#proToolsDrawer [data-workspace="code"]')?.click(), 0); }
  };
})();