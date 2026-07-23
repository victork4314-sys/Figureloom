(() => {
  'use strict';

  const editor = document.getElementById('programEditor');
  const runButton = document.getElementById('runButton');
  const sourceUrl = '../figureloom-bio/figureloom_bio/language_aliases.json?v=1';
  const NEW_ACTIONS = new Set(['read_statistic', 'grouped_box_plot', 'heat_map_columns', 'show_warning']);
  let ready = false;
  let replaying = false;

  const escapeText = (value) => String(value).replace(/[&<>"']/g, (character) => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;',
  }[character]));

  const canonical = (rule, groups) => {
    let text = String(rule.canonical);
    groups.forEach((value, index) => { text = text.replaceAll(`$${index + 1}`, String(value).trim()); });
    if (rule.id === 'average_column') text = text.replace(/\bmean\b/i, 'average');
    return text;
  };

  const compile = (payload) => payload.rules
    .map((rule) => Object.freeze({ ...rule, regex:new RegExp(`^(?:${rule.pattern})$`, 'i') }))
    .sort((left, right) => right.pattern.length - left.pattern.length);

  const findRule = (rules, text) => {
    for (const rule of rules) {
      const match = String(text).match(rule.regex);
      if (match) return { rule, groups:match.slice(1).map((value) => String(value ?? '').trim()) };
    }
    return null;
  };

  const qualityOf = (record) => {
    const quality = String(record?.quality || '');
    if (!quality) return null;
    return [...quality].reduce((sum, character) => sum + character.charCodeAt(0) - 33, 0) / quality.length;
  };
  const average = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const median = (values) => {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  };
  const deviation = (values) => {
    const center = average(values);
    return Math.sqrt(values.reduce((sum, value) => sum + (value - center) ** 2, 0) / values.length);
  };
  const percentile = (values, fraction) => {
    const sorted = [...values].sort((a, b) => a - b);
    if (sorted.length === 1) return sorted[0];
    const position = (sorted.length - 1) * fraction;
    const low = Math.floor(position), high = Math.ceil(position);
    return low === high ? sorted[low] : sorted[low] + (sorted[high] - sorted[low]) * (position - low);
  };

  const saveSvg = (context, helpers, name, title, body, height = 500) => {
    context.files[name] = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="${height}" viewBox="0 0 800 ${height}" role="img" aria-label="${escapeText(title)}"><rect width="100%" height="100%" fill="#f7fbfa"/><text x="28" y="36" font-family="system-ui,sans-serif" font-size="22" font-weight="700" fill="#173f38">${escapeText(title)}</text><g fill="#376f67" stroke="#173e38">${body}</g></svg>\n`;
    context.latestGeneratedFile = name;
    context.changed = 1;
    helpers.section('Created the figure', { file:name });
  };

  const naturalList = (text) => {
    let cleaned = String(text).trim().replace(', and ', ', ');
    if (!cleaned.includes(',') && cleaned.includes(' and ')) {
      const at = cleaned.lastIndexOf(' and ');
      cleaned = `${cleaned.slice(0, at)}, ${cleaned.slice(at + 5)}`;
    }
    return cleaned.split(',').map((part) => part.trim()).filter(Boolean);
  };

  const tableColumn = (context, requested, helpers, line) => {
    if (!context.data || context.data.kind !== 'table') throw new helpers.Error('This instruction needs an open table.', line);
    const found = context.data.columns.find((name) => name.toLowerCase() === String(requested).toLowerCase());
    if (!found) throw new helpers.Error(`I could not find a column called ${requested}.`, line);
    return found;
  };

  async function runNewAction(found, payload) {
    const { rule, groups } = found;
    const { context, line, helpers } = payload;

    if (rule.action === 'show_warning') {
      helpers.section('Warning', { kind:'warning', p:[groups[0] || 'This sample needs attention.'] });
      return true;
    }

    if (rule.action === 'read_statistic') {
      const operation = rule.id === 'standard_deviation_of_quality' ? 'standard deviation' : groups[0].toLowerCase();
      const metric = (rule.id === 'standard_deviation_of_quality' ? groups[0] : groups[1]).toLowerCase();
      const records = helpers.records(context.data);
      let values;
      if (metric === 'quality') {
        values = records.map(qualityOf);
        if (values.some((value) => value === null)) throw new helpers.Error('This instruction needs FASTQ reads with quality values.', line);
      } else {
        values = records.map((record) => String(record.sequence || '').length);
      }
      if (!values.length) throw new helpers.Error('There are no reads to summarize.', line);
      const normalized = operation === 'mean' ? 'average' : operation;
      const functions = {
        average,
        median,
        'standard deviation':deviation,
        minimum:(items) => Math.min(...items),
        maximum:(items) => Math.max(...items),
      };
      const value = functions[normalized](values);
      helpers.section(`${normalized[0].toUpperCase()}${normalized.slice(1)} read ${metric}`, {
        big:Number(value).toFixed(6).replace(/0+$/, '').replace(/\.$/, ''),
        p:[`Reads used\n${values.length}`],
      });
      return true;
    }

    if (rule.action === 'grouped_box_plot') {
      const valueColumn = tableColumn(context, groups[0], helpers, line);
      const groupColumn = tableColumn(context, groups[1], helpers, line);
      const grouped = new Map();
      for (const row of context.data.rows) {
        const group = String(row[groupColumn] ?? '').trim();
        const raw = String(row[valueColumn] ?? '').trim();
        if (!group || raw === '' || !Number.isFinite(Number(raw))) continue;
        if (!grouped.has(group)) grouped.set(group, []);
        grouped.get(group).push(Number(raw));
      }
      const entries = [...grouped].filter(([, values]) => values.length).slice(0, 12);
      if (!entries.length) throw new helpers.Error(`I could not find grouped numeric values under ${valueColumn} and ${groupColumn}.`, line);
      const all = entries.flatMap(([, values]) => values);
      const minimum = Math.min(...all), maximum = Math.max(...all), span = maximum - minimum || 1;
      const scale = (value) => 210 + (value - minimum) / span * 540;
      const rowHeight = Math.max(34, Math.min(58, 390 / entries.length));
      const body = entries.map(([name, values], index) => {
        const sorted = [...values].sort((a, b) => a - b);
        const low = sorted[0], high = sorted.at(-1), q1 = percentile(sorted, .25), q2 = percentile(sorted, .5), q3 = percentile(sorted, .75);
        const y = 70 + index * rowHeight;
        return `<text x="12" y="${y + 7}" font-size="12" stroke="none" fill="#173f38">${escapeText(name.slice(0, 24))}</text><line x1="${scale(low)}" y1="${y}" x2="${scale(high)}" y2="${y}" stroke-width="2"/><rect x="${scale(q1)}" y="${y - 12}" width="${Math.max(1, scale(q3)-scale(q1))}" height="24" fill="none" stroke-width="2"/><line x1="${scale(q2)}" y1="${y - 12}" x2="${scale(q2)}" y2="${y + 12}" stroke-width="2"/>`;
      }).join('');
      saveSvg(context, helpers, 'box-plot.svg', `${valueColumn} under ${groupColumn}`, body);
      return true;
    }

    if (rule.action === 'heat_map_columns') {
      const columns = naturalList(groups[0]).map((name) => tableColumn(context, name, helpers, line));
      if (!columns.length) throw new helpers.Error('Name at least one column for the heat map.', line);
      const rows = context.data.rows.slice(0, 50);
      const cellWidth = Math.max(24, Math.min(120, 680 / columns.length));
      const cellHeight = Math.max(12, Math.min(28, 390 / Math.max(1, rows.length)));
      const numeric = columns.map((column) => rows.map((row) => Number(row[column])).filter(Number.isFinite));
      const body = [];
      columns.forEach((column, columnIndex) => {
        const values = numeric[columnIndex];
        const low = values.length ? Math.min(...values) : 0;
        const high = values.length ? Math.max(...values) : 1;
        const span = high - low || 1;
        body.push(`<text x="${90 + columnIndex * cellWidth}" y="58" font-size="11" stroke="none" fill="#173f38">${escapeText(column.slice(0, 12))}</text>`);
        rows.forEach((row, rowIndex) => {
          const value = Number(row[column]);
          const opacity = Number.isFinite(value) ? .15 + .85 * (value - low) / span : .05;
          body.push(`<rect x="${80 + columnIndex * cellWidth}" y="${70 + rowIndex * cellHeight}" width="${cellWidth - 2}" height="${cellHeight - 2}" opacity="${opacity}"/>`);
        });
      });
      saveSvg(context, helpers, 'heat-map.svg', `Heat map of ${columns.join(', ')}`, body.join(''));
      return true;
    }

    return false;
  }

  const readyPromise = fetch(sourceUrl, { cache:'no-store' })
    .then((response) => {
      if (!response.ok) throw new Error(`Could not load the language vocabulary (${response.status}).`);
      return response.json();
    })
    .then((payload) => {
      const rules = compile(payload);
      const api = Object.freeze({
        version:payload.version,
        rules:Object.freeze(rules),
        find:(text) => findRule(rules, String(text).replace(/[.:]$/, '').trim()),
        recognizes:(text) => Boolean(findRule(rules, String(text).replace(/[.:]$/, '').trim())),
        canonicalizeSentence(text) {
          const original = String(text).trim();
          const ending = original.endsWith(':') ? ':' : original.endsWith('.') ? '.' : '';
          const core = ending ? original.slice(0, -1).trim() : original;
          const found = findRule(rules, core);
          if (!found || NEW_ACTIONS.has(found.rule.action)) return original;
          return canonical(found.rule, found.groups);
        },
        normalizeSource(source) {
          return String(source).split(/\r?\n/).map((raw) => {
            const indent = raw.match(/^\s*/)?.[0] || '';
            const text = raw.trim();
            if (!text || text.startsWith('#') || text.endsWith(':')) return raw;
            return indent + this.canonicalizeSentence(text);
          }).join('\n');
        },
      });

      const current = window.FigureLoomBioCurrentFile;
      if (current?.normalizeSource) {
        window.FigureLoomBioCurrentFile = Object.freeze({
          ...current,
          normalizeSource:(source) => current.normalizeSource(api.normalizeSource(source)),
        });
      }

      const handler = async (payload) => {
        const internalShow = payload.text.match(/^Show the generated file (.+)$/i);
        if (internalShow) {
          const content = payload.context.files[internalShow[1]];
          if (content == null) throw new payload.helpers.Error(`I could not find ${internalShow[1]}.`, payload.line);
          payload.helpers.section('The file', { file:internalShow[1], p:[`Size\n${String(content).length} bytes`] });
          return true;
        }
        const internalCopy = payload.text.match(/^Copy the generated file (.+?) as (.+)$/i);
        if (internalCopy) {
          const content = payload.context.files[internalCopy[1]];
          if (content == null) throw new payload.helpers.Error(`I could not find ${internalCopy[1]}.`, payload.line);
          payload.context.files[internalCopy[2]] = content;
          payload.context.latestGeneratedFile = internalCopy[2];
          payload.context.changed = 1;
          payload.helpers.section('Saved the file', { file:internalCopy[2] });
          return true;
        }
        const found = findRule(rules, payload.text);
        if (!found || !NEW_ACTIONS.has(found.rule.action)) return false;
        return runNewAction(found, payload);
      };
      const recognizer = (source) => String(source).split(/\r?\n/).some((line) => {
        const text = line.trim().replace(/[.:]$/, '');
        return Boolean(findRule(rules, text)) || /^Show the generated file /i.test(text) || /^Copy the generated file /i.test(text);
      });
      window.FigureLoomBioStatementHandlers = window.FigureLoomBioStatementHandlers || [];
      window.FigureLoomBioStatementRecognizers = window.FigureLoomBioStatementRecognizers || [];
      window.FigureLoomBioStatementHandlers.push(handler);
      window.FigureLoomBioStatementRecognizers.push(recognizer);
      window.FigureLoomBioLanguageAliases = api;
      window.dispatchEvent(new CustomEvent('figureloom-bio-aliases-ready', { detail:api }));
      ready = true;
      editor?.dispatchEvent(new Event('input', { bubbles:true }));
      return api;
    })
    .catch((error) => {
      console.error('Could not load the FigureLoom Bio language vocabulary', error);
      const status = document.getElementById('runStatus');
      if (status) {
        status.textContent = 'Language vocabulary did not load';
        status.className = 'status-pill error';
      }
      throw error;
    });

  window.FigureLoomBioLanguageAliasesReady = readyPromise;

  const waitForVocabulary = (event) => {
    if (ready || replaying) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    readyPromise.then(() => {
      replaying = true;
      runButton?.click();
      replaying = false;
    });
  };
  runButton?.addEventListener('click', waitForVocabulary, true);
  document.addEventListener('keydown', (event) => {
    if (!(event.ctrlKey || event.metaKey) || event.key !== 'Enter' || ready || replaying) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    readyPromise.then(() => {
      replaying = true;
      runButton?.click();
      replaying = false;
    });
  }, true);
})();
