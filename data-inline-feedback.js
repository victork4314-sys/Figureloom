(() => {
  if (window.__figureLoomDataInlineFeedbackV1) return;
  window.__figureLoomDataInlineFeedbackV1 = true;

  let installed = false;

  function delimiterFor(line) {
    const counts = [
      ['\t',(line.match(/\t/g) || []).length],
      [',',(line.match(/,/g) || []).length],
      [';',(line.match(/;/g) || []).length]
    ].sort((a,b) => b[1] - a[1]);
    return counts[0][1] ? counts[0][0] : ',';
  }

  function parse(text) {
    const raw = String(text || '').replace(/\r\n?/g, '\n');
    const first = raw.split('\n').find(line => line.trim()) || '';
    const delimiter = delimiterFor(first);
    const rows = [];
    let row = [], value = '', quoted = false;

    for (let index = 0; index < raw.length; index += 1) {
      const char = raw[index];
      if (char === '"') {
        if (quoted && raw[index + 1] === '"') {
          value += '"';
          index += 1;
        } else quoted = !quoted;
      } else if (char === delimiter && !quoted) {
        row.push(value);
        value = '';
      } else if (char === '\n' && !quoted) {
        row.push(value);
        rows.push(row);
        row = [];
        value = '';
      } else value += char;
    }
    row.push(value);
    rows.push(row);
    while (rows.length && rows.at(-1).every(cell => !String(cell).trim())) rows.pop();
    return { rows, quoted, delimiter };
  }

  function numeric(value) {
    const cleaned = String(value ?? '').trim().replace(/\s/g,'').replace(',', '.');
    if (!cleaned) return null;
    const number = Number(cleaned);
    return Number.isFinite(number) ? number : null;
  }

  function validate(text, visualType) {
    const raw = String(text || '');
    if (!raw.trim()) return { block:true, kind:'note', text:'Paste or import data first.' };
    if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(raw)) {
      return { block:true, kind:'warning', text:'This file does not look like readable CSV or TSV data.' };
    }

    const parsed = parse(raw);
    if (parsed.quoted) return { block:true, kind:'warning', text:'This data has an unfinished quoted value. Check the last quoted cell.' };
    if (parsed.rows.length < 2 || (parsed.rows[0]?.length || 0) < 2) {
      return { block:true, kind:'note', text:'Add a header row, at least two columns, and one data row.' };
    }

    const headerWidth = parsed.rows[0].length;
    const unevenRows = parsed.rows.slice(1).filter(row => row.length !== headerWidth).length;
    const values = parsed.rows.slice(1).flatMap(row => row.slice(1));
    const numbers = values.map(numeric);
    const numericValues = numbers.filter(value => value !== null);
    const nonEmptyValues = values.filter(value => String(value).trim());
    const skipped = Math.max(0, nonEmptyValues.length - numericValues.length);
    const label = document.querySelector('#dataVisual option:checked')?.textContent || 'This visual';

    if (visualType !== 'table' && !numericValues.length) {
      return { block:true, kind:'note', text:`${label} needs at least one numeric value outside the first label column.` };
    }

    if (['pie','donut'].includes(visualType) && numericValues.some(value => value < 0)) {
      return { block:true, kind:'note', text:'Pie and donut charts cannot use negative values. Fix those cells or choose another visual.' };
    }

    const notes = [];
    if (unevenRows) notes.push(`${unevenRows} row${unevenRows === 1 ? '' : 's'} have a different number of cells; missing cells will stay blank.`);
    if (visualType !== 'table' && skipped) notes.push(`${skipped} non-numeric cell${skipped === 1 ? '' : 's'} will be skipped by this visual.`);
    if (visualType === 'box') {
      const columns = Array.from({ length:Math.max(0, headerWidth - 1) }, (_, index) => parsed.rows.slice(1).map(row => numeric(row[index + 1])).filter(value => value !== null));
      if (!columns.some(column => column.length >= 3)) notes.push('Box plots work best with at least three numeric values in one series.');
    }
    if (visualType === 'heatmap' && numericValues.length < Math.max(1, Math.ceil(nonEmptyValues.length * .65))) {
      notes.push('Heatmaps work best when most cells outside the first column are numeric.');
    }

    return notes.length ? { block:false, kind:'note', text:notes.join(' ') } : { block:false, kind:'', text:'' };
  }

  function install() {
    if (installed) return;
    const drawer = document.getElementById('dataLabDrawer');
    const panel = document.getElementById('figureloomDataWorkspacePlus');
    const source = drawer?.querySelector('#dataPaste');
    const visual = drawer?.querySelector('#dataVisual');
    const insert = drawer?.querySelector('#insertDataVisual');
    const update = drawer?.querySelector('#updateDataVisual');
    const fileInput = panel?.querySelector('[data-data-file]');
    const pasteButton = panel?.querySelector('[data-data-action="paste"]');
    if (!drawer || !panel || !source || !visual || !insert || !update || !fileInput || !pasteButton) {
      setTimeout(install, 80);
      return;
    }
    installed = true;

    const feedback = document.createElement('p');
    feedback.id = 'figureloomDataFeedback';
    feedback.className = 'figureloom-data-feedback';
    feedback.setAttribute('role', 'status');
    feedback.setAttribute('aria-live', 'polite');
    feedback.hidden = true;
    drawer.querySelector('.data-preview-summary')?.insertAdjacentElement('afterend', feedback);

    function show(result) {
      feedback.textContent = result?.text || '';
      feedback.dataset.kind = result?.kind || '';
      feedback.hidden = !result?.text;
    }

    function refresh() {
      const result = validate(source.value, visual.value);
      show(result.block || result.text ? result : null);
      return result;
    }

    function guard(event) {
      const result = validate(source.value, visual.value);
      if (result.text) show(result); else show(null);
      if (!result.block) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      source.closest('details')?.setAttribute('open','');
      source.focus({ preventScroll:true });
    }

    insert.addEventListener('click', guard, true);
    update.addEventListener('click', guard, true);
    source.addEventListener('input', refresh);
    visual.addEventListener('change', refresh);

    pasteButton.addEventListener('click', async event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      try {
        const text = await navigator.clipboard.readText();
        if (!text.trim()) return show({ kind:'note', text:'The clipboard does not contain any data.' });
        source.value = text;
        source.dispatchEvent(new Event('input', { bubbles:true }));
        window.FigureLoomDataWorkspace?.renderGrid?.();
        refresh();
      } catch {
        source.closest('details')?.setAttribute('open','');
        source.focus({ preventScroll:true });
        show({ kind:'note', text:'Clipboard access was blocked. Paste into Raw CSV / TSV instead.' });
      }
    }, true);

    fileInput.addEventListener('change', event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const file = fileInput.files?.[0];
      fileInput.value = '';
      if (!file) return;
      if (file.size > 8 * 1024 * 1024) {
        show({ kind:'warning', text:'This data file is too large to open here. Choose a file smaller than 8 MB.' });
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => show({ kind:'warning', text:'This file could not be read. It may be damaged or unavailable.' });
      reader.onload = () => {
        const text = String(reader.result || '');
        const result = validate(text, visual.value);
        if (/^[\s\S]*[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(text)) {
          show(result);
          return;
        }
        source.value = text;
        source.dispatchEvent(new Event('input', { bubbles:true }));
        window.FigureLoomDataWorkspace?.renderGrid?.();
        show(result.text ? result : null);
      };
      reader.readAsText(file);
    }, true);

    const observer = new MutationObserver(() => {
      if (drawer.classList.contains('open')) requestAnimationFrame(refresh);
    });
    observer.observe(drawer, { attributes:true, attributeFilter:['class'] });
    refresh();

    window.FigureLoomDataFeedback = Object.freeze({ validate, refresh, show });
  }

  const style = document.createElement('style');
  style.id = 'figureloomDataInlineFeedbackStyle';
  style.textContent = `
    .figureloom-data-feedback{margin:-3px 0 9px;padding:8px 10px;border:1px solid var(--figureloom-ui-line,#cddbd7);border-left:3px solid var(--figureloom-ui-accent,#2f7468);border-radius:8px;color:var(--figureloom-ui-text,#172321);background:var(--figureloom-ui-soft,#edf3f1);font-size:9px;line-height:1.45}
    .figureloom-data-feedback[hidden]{display:none!important}.figureloom-data-feedback[data-kind="warning"]{border-left-color:#b17a2e}.figureloom-data-feedback[data-kind="note"]{border-left-color:var(--figureloom-ui-accent,#2f7468)}
  `;
  document.head.appendChild(style);

  install();
})();
