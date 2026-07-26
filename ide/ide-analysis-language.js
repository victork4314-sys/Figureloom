(() => {
  'use strict';

  const statementPatterns = [
    /^Calculate the (average|median|standard deviation|confidence interval) of (.+)$/i,
    /^Calculate the p value for (.+?) between (.+?) and (.+?) under (.+)$/i,
    /^Create a histogram of (.+)$/i,
    /^Create a bar chart of (.+)$/i,
    /^Create a scatter plot of (.+?) and (.+)$/i,
    /^Create a box plot of (.+)$/i,
    /^Create a heat map$/i,
    /^Create a PCA plot$/i,
    /^Create a volcano plot using (.+?) and (.+)$/i,
  ];

  const sourceRecognizer = (source) => source.split(/\r?\n/).some((line) => {
    const sentence = line.trim().replace(/\.$/, '');
    return statementPatterns.some((pattern) => pattern.test(sentence));
  });

  const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const median = (values) => {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  };
  const standardDeviation = (values) => {
    if (values.length < 2) return 0;
    const average = mean(values);
    return Math.sqrt(values.reduce((sum, value) => sum + ((value - average) ** 2), 0) / (values.length - 1));
  };
  const quartile = (values, fraction) => {
    const sorted = [...values].sort((a, b) => a - b);
    const position = (sorted.length - 1) * fraction;
    const lower = Math.floor(position);
    const upper = Math.ceil(position);
    if (lower === upper) return sorted[lower];
    return sorted[lower] + ((sorted[upper] - sorted[lower]) * (position - lower));
  };
  const escapeXml = (value) => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

  function requireTable(context, line, ErrorType) {
    if (!context.data || context.data.kind !== 'table') {
      throw new ErrorType('Open a CSV or TSV file before this instruction.', line);
    }
    return context.data;
  }

  function columnName(table, requested, line, ErrorType) {
    const wanted = String(requested).trim().toLowerCase();
    const found = table.columns.find((column) => String(column).toLowerCase() === wanted);
    if (!found) throw new ErrorType(`I could not find the column ${requested}.`, line);
    return found;
  }

  function numericValues(table, requested, line, ErrorType) {
    const column = columnName(table, requested, line, ErrorType);
    const values = table.rows
      .map((row) => Number(row[column]))
      .filter((value) => Number.isFinite(value));
    if (!values.length) throw new ErrorType(`${column} does not contain numeric values.`, line);
    return { column, values };
  }

  function svgShell(title, body, width = 800, height = 500) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(title)}"><rect width="100%" height="100%" fill="#f7fbfa"/><text x="40" y="38" font-family="system-ui,sans-serif" font-size="22" font-weight="700" fill="#173f38">${escapeXml(title)}</text>${body}</svg>`;
  }

  function scale(value, minimum, maximum, start, end) {
    if (maximum === minimum) return (start + end) / 2;
    return start + ((value - minimum) / (maximum - minimum)) * (end - start);
  }

  function saveFigure(context, helpers, name, title, svg, description) {
    context.files[name] = svg;
    context.changed = 1;
    const section = helpers.section(title, { p:[description], file:name });
    const image = document.createElement('img');
    image.alt = title;
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    image.style.maxWidth = '100%';
    image.style.height = 'auto';
    image.style.marginTop = '12px';
    section.append(image);
  }

  function histogram(values, title) {
    const minimum = Math.min(...values);
    const maximum = Math.max(...values);
    const binCount = Math.max(5, Math.min(20, Math.ceil(Math.sqrt(values.length))));
    const counts = Array(binCount).fill(0);
    const span = maximum - minimum || 1;
    for (const value of values) counts[Math.min(binCount - 1, Math.floor(((value - minimum) / span) * binCount))] += 1;
    const highest = Math.max(...counts, 1);
    const bars = counts.map((count, index) => {
      const x = 55 + index * (690 / binCount);
      const width = Math.max(2, (690 / binCount) - 3);
      const height = (count / highest) * 360;
      return `<rect x="${x.toFixed(2)}" y="${(440 - height).toFixed(2)}" width="${width.toFixed(2)}" height="${height.toFixed(2)}" fill="#4f8f82"/><text x="${(x + width / 2).toFixed(2)}" y="462" text-anchor="middle" font-family="system-ui,sans-serif" font-size="10" fill="#315b52">${(minimum + (span * index / binCount)).toFixed(1)}</text>`;
    }).join('');
    return svgShell(title, `<line x1="50" y1="440" x2="755" y2="440" stroke="#315b52"/>${bars}`);
  }

  function barChart(values, title) {
    const counts = new Map();
    for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
    const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);
    const highest = Math.max(...entries.map((entry) => entry[1]), 1);
    const width = 690 / Math.max(entries.length, 1);
    const bars = entries.map(([label, count], index) => {
      const x = 55 + index * width;
      const height = (count / highest) * 340;
      return `<rect x="${x.toFixed(2)}" y="${(420 - height).toFixed(2)}" width="${Math.max(3, width - 5).toFixed(2)}" height="${height.toFixed(2)}" fill="#70a99d"/><text transform="translate(${(x + width / 2).toFixed(2)} 432) rotate(45)" font-family="system-ui,sans-serif" font-size="10" fill="#315b52">${escapeXml(label)}</text>`;
    }).join('');
    return svgShell(title, `<line x1="50" y1="420" x2="755" y2="420" stroke="#315b52"/>${bars}`);
  }

  function scatterPlot(xValues, yValues, title, xLabel, yLabel) {
    const xmin = Math.min(...xValues), xmax = Math.max(...xValues);
    const ymin = Math.min(...yValues), ymax = Math.max(...yValues);
    const points = xValues.map((value, index) => `<circle cx="${scale(value, xmin, xmax, 65, 750).toFixed(2)}" cy="${scale(yValues[index], ymin, ymax, 430, 65).toFixed(2)}" r="4" fill="#397c70" fill-opacity="0.75"/>`).join('');
    return svgShell(title, `<line x1="60" y1="435" x2="755" y2="435" stroke="#315b52"/><line x1="60" y1="435" x2="60" y2="60" stroke="#315b52"/>${points}<text x="405" y="485" text-anchor="middle" font-family="system-ui,sans-serif" font-size="14" fill="#315b52">${escapeXml(xLabel)}</text><text transform="translate(18 250) rotate(-90)" text-anchor="middle" font-family="system-ui,sans-serif" font-size="14" fill="#315b52">${escapeXml(yLabel)}</text>`);
  }

  function boxPlot(values, title) {
    const minimum = Math.min(...values), maximum = Math.max(...values);
    const q1 = quartile(values, 0.25), q2 = quartile(values, 0.5), q3 = quartile(values, 0.75);
    const x = (value) => scale(value, minimum, maximum, 100, 700);
    const body = `<line x1="${x(minimum)}" y1="250" x2="${x(maximum)}" y2="250" stroke="#315b52" stroke-width="3"/><line x1="${x(minimum)}" y1="220" x2="${x(minimum)}" y2="280" stroke="#315b52"/><line x1="${x(maximum)}" y1="220" x2="${x(maximum)}" y2="280" stroke="#315b52"/><rect x="${x(q1)}" y="180" width="${Math.max(1, x(q3) - x(q1))}" height="140" fill="#9bc9bf" stroke="#315b52"/><line x1="${x(q2)}" y1="180" x2="${x(q2)}" y2="320" stroke="#173f38" stroke-width="4"/><text x="100" y="360" font-family="system-ui,sans-serif" font-size="13" fill="#315b52">Min ${minimum.toFixed(2)}</text><text x="350" y="360" font-family="system-ui,sans-serif" font-size="13" fill="#315b52">Median ${q2.toFixed(2)}</text><text x="620" y="360" font-family="system-ui,sans-serif" font-size="13" fill="#315b52">Max ${maximum.toFixed(2)}</text>`;
    return svgShell(title, body);
  }

  function heatMap(table, line, ErrorType) {
    const numericColumns = table.columns.filter((column) => table.rows.some((row) => Number.isFinite(Number(row[column])))).slice(0, 30);
    if (!numericColumns.length) throw new ErrorType('The file does not contain numeric columns for a heat map.', line);
    const rows = table.rows.slice(0, 50);
    const matrix = rows.map((row) => numericColumns.map((column) => Number(row[column])));
    const finite = matrix.flat().filter(Number.isFinite);
    const minimum = Math.min(...finite), maximum = Math.max(...finite);
    const cellWidth = Math.min(24, 680 / numericColumns.length);
    const cellHeight = Math.min(18, 380 / Math.max(rows.length, 1));
    const cells = matrix.map((row, rowIndex) => row.map((value, columnIndex) => {
      const ratio = Number.isFinite(value) ? (value - minimum) / (maximum - minimum || 1) : 0;
      const lightness = 92 - ratio * 55;
      return `<rect x="${90 + columnIndex * cellWidth}" y="${65 + rowIndex * cellHeight}" width="${cellWidth}" height="${cellHeight}" fill="hsl(170 35% ${lightness}%)"/>`;
    }).join('')).join('');
    const labels = numericColumns.map((column, index) => `<text transform="translate(${96 + index * cellWidth} 55) rotate(-45)" font-family="system-ui,sans-serif" font-size="9" fill="#315b52">${escapeXml(column)}</text>`).join('');
    return svgShell('Heat map', `${labels}${cells}`);
  }

  function powerIteration(matrix, iterations = 80) {
    let vector = Array(matrix.length).fill(1 / Math.sqrt(Math.max(matrix.length, 1)));
    for (let step = 0; step < iterations; step += 1) {
      const next = matrix.map((row) => row.reduce((sum, value, index) => sum + value * vector[index], 0));
      const length = Math.sqrt(next.reduce((sum, value) => sum + value * value, 0)) || 1;
      vector = next.map((value) => value / length);
    }
    const eigenvalue = vector.reduce((sum, value, row) => sum + value * matrix[row].reduce((inner, cell, column) => inner + cell * vector[column], 0), 0);
    return { vector, eigenvalue };
  }

  function pcaPlot(table, line, ErrorType) {
    const columns = table.columns.filter((column) => table.rows.some((row) => Number.isFinite(Number(row[column]))));
    if (columns.length < 2) throw new ErrorType('The file needs at least two numeric columns for PCA.', line);
    const rows = table.rows.map((row) => columns.map((column) => Number(row[column]))).filter((row) => row.every(Number.isFinite));
    if (rows.length < 2) throw new ErrorType('The file needs at least two complete numeric rows for PCA.', line);
    const means = columns.map((_, index) => mean(rows.map((row) => row[index])));
    const centered = rows.map((row) => row.map((value, index) => value - means[index]));
    const covariance = columns.map((_, i) => columns.map((__, j) => centered.reduce((sum, row) => sum + row[i] * row[j], 0) / Math.max(1, centered.length - 1)));
    const first = powerIteration(covariance);
    const deflated = covariance.map((row, i) => row.map((value, j) => value - first.eigenvalue * first.vector[i] * first.vector[j]));
    const second = powerIteration(deflated);
    const x = centered.map((row) => row.reduce((sum, value, index) => sum + value * first.vector[index], 0));
    const y = centered.map((row) => row.reduce((sum, value, index) => sum + value * second.vector[index], 0));
    return scatterPlot(x, y, 'PCA plot', 'Principal component 1', 'Principal component 2');
  }

  function permutationPValue(left, right) {
    const observed = Math.abs(mean(left) - mean(right));
    const combined = [...left, ...right];
    const leftSize = left.length;
    let extreme = 0;
    let total = 0;
    if (combined.length <= 16) {
      const limit = 1 << combined.length;
      for (let mask = 0; mask < limit; mask += 1) {
        let bits = 0;
        for (let value = mask; value; value &= value - 1) bits += 1;
        if (bits !== leftSize) continue;
        const a = [], b = [];
        combined.forEach((value, index) => ((mask >> index) & 1 ? a : b).push(value));
        if (Math.abs(mean(a) - mean(b)) >= observed - 1e-12) extreme += 1;
        total += 1;
      }
    } else {
      let state = 173;
      for (let iteration = 0; iteration < 5000; iteration += 1) {
        const shuffled = [...combined];
        for (let index = shuffled.length - 1; index > 0; index -= 1) {
          state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
          const chosen = state % (index + 1);
          [shuffled[index], shuffled[chosen]] = [shuffled[chosen], shuffled[index]];
        }
        if (Math.abs(mean(shuffled.slice(0, leftSize)) - mean(shuffled.slice(leftSize))) >= observed - 1e-12) extreme += 1;
        total += 1;
      }
    }
    return (extreme + 1) / (total + 1);
  }

  async function handler({ text, context, line, helpers }) {
    let match;
    if ((match = text.match(/^Calculate the (average|median|standard deviation|confidence interval) of (.+)$/i))) {
      const table = requireTable(context, line, helpers.Error);
      const { column, values } = numericValues(table, match[2], line, helpers.Error);
      const operation = match[1].toLowerCase();
      const average = mean(values);
      const deviation = standardDeviation(values);
      if (operation === 'average') helpers.section(`Average of ${column}`, { big:average.toFixed(6), p:[`Values used\n${values.length}`] });
      if (operation === 'median') helpers.section(`Median of ${column}`, { big:median(values).toFixed(6), p:[`Values used\n${values.length}`] });
      if (operation === 'standard deviation') helpers.section(`Standard deviation of ${column}`, { big:deviation.toFixed(6), p:['Sample standard deviation', `Values used\n${values.length}`] });
      if (operation === 'confidence interval') {
        const margin = 1.96 * deviation / Math.sqrt(values.length);
        helpers.section(`95% confidence interval of ${column}`, { big:`${(average - margin).toFixed(6)} to ${(average + margin).toFixed(6)}`, p:['Normal approximation around the mean', `Values used\n${values.length}`] });
      }
      return true;
    }

    if ((match = text.match(/^Calculate the p value for (.+?) between (.+?) and (.+?) under (.+)$/i))) {
      const table = requireTable(context, line, helpers.Error);
      const valueColumn = columnName(table, match[1], line, helpers.Error);
      const groupColumn = columnName(table, match[4], line, helpers.Error);
      const left = table.rows.filter((row) => String(row[groupColumn]) === match[2]).map((row) => Number(row[valueColumn])).filter(Number.isFinite);
      const right = table.rows.filter((row) => String(row[groupColumn]) === match[3]).map((row) => Number(row[valueColumn])).filter(Number.isFinite);
      if (!left.length || !right.length) throw new helpers.Error('Both named groups need numeric values.', line);
      const pValue = permutationPValue(left, right);
      helpers.section(`P value for ${valueColumn}`, { big:pValue.toPrecision(6), p:[`Permutation comparison: ${match[2]} versus ${match[3]}`, `${match[2]} values\n${left.length}`, `${match[3]} values\n${right.length}`] });
      return true;
    }

    if ((match = text.match(/^Create a histogram of (.+)$/i))) {
      const table = requireTable(context, line, helpers.Error);
      const { column, values } = numericValues(table, match[1], line, helpers.Error);
      saveFigure(context, helpers, 'histogram.svg', `Histogram of ${column}`, histogram(values, `Histogram of ${column}`), `Values plotted\n${values.length}`);
      return true;
    }
    if ((match = text.match(/^Create a bar chart of (.+)$/i))) {
      const table = requireTable(context, line, helpers.Error);
      const column = columnName(table, match[1], line, helpers.Error);
      const values = table.rows.map((row) => String(row[column] ?? '')).filter((value) => value.length);
      if (!values.length) throw new helpers.Error(`${column} contains no values.`, line);
      saveFigure(context, helpers, 'bar-chart.svg', `Bar chart of ${column}`, barChart(values, `Bar chart of ${column}`), `Categories plotted\n${new Set(values).size}`);
      return true;
    }
    if ((match = text.match(/^Create a scatter plot of (.+?) and (.+)$/i))) {
      const table = requireTable(context, line, helpers.Error);
      const xColumn = columnName(table, match[1], line, helpers.Error);
      const yColumn = columnName(table, match[2], line, helpers.Error);
      const pairs = table.rows.map((row) => [Number(row[xColumn]), Number(row[yColumn])]).filter((pair) => pair.every(Number.isFinite));
      if (!pairs.length) throw new helpers.Error('The two columns do not contain matching numeric values.', line);
      saveFigure(context, helpers, 'scatter-plot.svg', `${xColumn} and ${yColumn}`, scatterPlot(pairs.map((pair) => pair[0]), pairs.map((pair) => pair[1]), `${xColumn} and ${yColumn}`, xColumn, yColumn), `Points plotted\n${pairs.length}`);
      return true;
    }
    if ((match = text.match(/^Create a box plot of (.+)$/i))) {
      const table = requireTable(context, line, helpers.Error);
      const { column, values } = numericValues(table, match[1], line, helpers.Error);
      saveFigure(context, helpers, 'box-plot.svg', `Box plot of ${column}`, boxPlot(values, `Box plot of ${column}`), `Values plotted\n${values.length}`);
      return true;
    }
    if (/^Create a heat map$/i.test(text)) {
      const table = requireTable(context, line, helpers.Error);
      saveFigure(context, helpers, 'heat-map.svg', 'Heat map', heatMap(table, line, helpers.Error), `Rows plotted\n${Math.min(table.rows.length, 50)}`);
      return true;
    }
    if (/^Create a PCA plot$/i.test(text)) {
      const table = requireTable(context, line, helpers.Error);
      saveFigure(context, helpers, 'pca-plot.svg', 'PCA plot', pcaPlot(table, line, helpers.Error), `Rows plotted\n${table.rows.length}`);
      return true;
    }
    if ((match = text.match(/^Create a volcano plot using (.+?) and (.+)$/i))) {
      const table = requireTable(context, line, helpers.Error);
      const effectColumn = columnName(table, match[1], line, helpers.Error);
      const pColumn = columnName(table, match[2], line, helpers.Error);
      const pairs = table.rows.map((row) => [Number(row[effectColumn]), Number(row[pColumn])]).filter(([effect, p]) => Number.isFinite(effect) && Number.isFinite(p) && p > 0);
      if (!pairs.length) throw new helpers.Error('The effect and p-value columns do not contain plottable values.', line);
      const x = pairs.map((pair) => pair[0]);
      const y = pairs.map((pair) => -Math.log10(pair[1]));
      saveFigure(context, helpers, 'volcano-plot.svg', 'Volcano plot', scatterPlot(x, y, 'Volcano plot', effectColumn, `-log10(${pColumn})`), `Points plotted\n${pairs.length}`);
      return true;
    }
    return false;
  }


  async function structuredHandler({ node, context, line, helpers }) {
    const action = node.action;
    const values = [...(node.arguments?.runtime_values || [])];
    const statisticActions = {
      calculate_average:'average',
      calculate_median:'median',
      calculate_standard_deviation:'standard deviation',
      calculate_minimum:'minimum',
      calculate_maximum:'maximum',
    };

    if (action === 'summary_statistic' || statisticActions[action]) {
      const operation = statisticActions[action] || String(values[0] || '').toLowerCase();
      const requested = statisticActions[action] ? values[0] : values[1];
      const table = requireTable(context, line, helpers.Error);
      const { column, values:numbers } = numericValues(table, requested, line, helpers.Error);
      const average = mean(numbers);
      const deviation = standardDeviation(numbers);
      if (operation === 'average') helpers.section(`Average of ${column}`, { big:average.toFixed(6), p:[`Values used\n${numbers.length}`] });
      else if (operation === 'median') helpers.section(`Median of ${column}`, { big:median(numbers).toFixed(6), p:[`Values used\n${numbers.length}`] });
      else if (operation === 'standard deviation') helpers.section(`Standard deviation of ${column}`, { big:deviation.toFixed(6), p:['Sample standard deviation', `Values used\n${numbers.length}`] });
      else if (operation === 'minimum') helpers.section(`Minimum of ${column}`, { big:String(Math.min(...numbers)) });
      else if (operation === 'maximum') helpers.section(`Maximum of ${column}`, { big:String(Math.max(...numbers)) });
      else if (operation === 'confidence interval') {
        const margin = 1.96 * deviation / Math.sqrt(numbers.length);
        helpers.section(`95% confidence interval of ${column}`, { big:`${(average - margin).toFixed(6)} to ${(average + margin).toFixed(6)}`, p:['Normal approximation around the mean', `Values used\n${numbers.length}`] });
      } else throw new helpers.Error(`The statistic “${operation}” is not implemented.`, line);
      return true;
    }

    if (action === 'normalize_counts') {
      const table = requireTable(context, line, helpers.Error);
      const { column, values:numbers } = numericValues(table, values[0], line, helpers.Error);
      const total = numbers.reduce((sum, value) => sum + value, 0);
      const output = `${column}_normalized`;
      if (!table.columns.includes(output)) table.columns.push(output);
      for (const row of table.rows) {
        const raw = String(row[column] ?? '').trim();
        const number = Number(raw);
        row[output] = raw && Number.isFinite(number) ? ((number / total * 1000000) || 0).toFixed(6) : '';
      }
      helpers.section('Normalized counts', { p:[column, 'Counts per million', output] });
      return true;
    }

    if (action === 'compare_groups') {
      const table = requireTable(context, line, helpers.Error);
      const first = String(values[0]), second = String(values[1]);
      const group = columnName(table, values[2], line, helpers.Error);
      const firstRows = table.rows.filter((row) => String(row[group] ?? '').toLowerCase() === first.toLowerCase());
      const secondRows = table.rows.filter((row) => String(row[group] ?? '').toLowerCase() === second.toLowerCase());
      if (!firstRows.length || !secondRows.length) throw new helpers.Error(`I could not find both ${first} and ${second} under ${group}.`, line);
      const rows = [];
      for (const name of table.columns) {
        if (name === group) continue;
        const left = firstRows.map((row) => Number(row[name])).filter(Number.isFinite);
        const right = secondRows.map((row) => Number(row[name])).filter(Number.isFinite);
        if (!left.length || !right.length) continue;
        const leftAverage = mean(left), rightAverage = mean(right), fold = rightAverage ? leftAverage / rightAverage : Infinity;
        rows.push({ column:name, [`${first}_average`]:String(Number(leftAverage.toPrecision(6))), [`${second}_average`]:String(Number(rightAverage.toPrecision(6))), difference:String(Number((leftAverage-rightAverage).toPrecision(6))), fold_change:Number.isFinite(fold) ? String(Number(fold.toPrecision(6))) : 'infinite' });
      }
      if (!rows.length) throw new helpers.Error('I could not find numeric columns to compare.', line);
      context.data = { kind:'table', columns:Object.keys(rows[0]), rows, delimiter:'\t' };
      helpers.section(`Compared ${first} and ${second}`, { table:{ columns:context.data.columns, rows } });
      return true;
    }

    if (action === 'permutation_p_value') {
      const table = requireTable(context, line, helpers.Error);
      const valueColumn = columnName(table, values[0], line, helpers.Error);
      const groupColumn = columnName(table, values[3], line, helpers.Error);
      const left = table.rows.filter((row) => String(row[groupColumn]) === String(values[1])).map((row) => Number(row[valueColumn])).filter(Number.isFinite);
      const right = table.rows.filter((row) => String(row[groupColumn]) === String(values[2])).map((row) => Number(row[valueColumn])).filter(Number.isFinite);
      if (!left.length || !right.length) throw new helpers.Error('Both named groups need numeric values.', line);
      const pValue = permutationPValue(left, right);
      helpers.section(`P value for ${valueColumn}`, { big:pValue.toPrecision(6), p:[`Permutation comparison: ${values[1]} versus ${values[2]}`, `${values[1]} values\n${left.length}`, `${values[2]} values\n${right.length}`] });
      return true;
    }

    if (['histogram','create_histogram'].includes(action)) {
      const table = requireTable(context, line, helpers.Error);
      const { column, values:numbers } = numericValues(table, values[0], line, helpers.Error);
      saveFigure(context, helpers, 'histogram.svg', `Histogram of ${column}`, histogram(numbers, `Histogram of ${column}`), `Values plotted\n${numbers.length}`);
      return true;
    }
    if (action === 'bar_chart') {
      const table = requireTable(context, line, helpers.Error);
      const column = columnName(table, values[0], line, helpers.Error);
      const categories = table.rows.map((row) => String(row[column] ?? '')).filter(Boolean);
      if (!categories.length) throw new helpers.Error(`${column} contains no values.`, line);
      saveFigure(context, helpers, 'bar-chart.svg', `Bar chart of ${column}`, barChart(categories, `Bar chart of ${column}`), `Categories plotted\n${new Set(categories).size}`);
      return true;
    }
    if (action === 'create_bar_chart') {
      const table = requireTable(context, line, helpers.Error);
      const label = columnName(table, values[0], line, helpers.Error);
      const value = columnName(table, values[1], line, helpers.Error);
      const points = table.rows.slice(0, 40).map((row) => [String(row[label] ?? ''), Number(row[value])]).filter(([, number]) => Number.isFinite(number));
      if (!points.length) throw new helpers.Error(`There are no numeric values under ${value}.`, line);
      const maximum = Math.max(...points.map(([, number]) => Math.abs(number))) || 1;
      const body = points.map(([name, number], index) => { const y = 45 + index * Math.min(28, 380/points.length), width = 570*Math.abs(number)/maximum; return `<text x="10" y="${(y+14).toFixed(2)}" font-family="system-ui,sans-serif" font-size="12" fill="#315b52">${escapeXml(name.slice(0,24))}</text><rect x="180" y="${y.toFixed(2)}" width="${width.toFixed(2)}" height="18" rx="2" fill="#70a99d"/>`; }).join('');
      saveFigure(context, helpers, 'bar-chart.svg', `${value} by ${label}`, svgShell(`${value} by ${label}`, body), `Rows plotted\n${points.length}`);
      return true;
    }
    if (['scatter_plot','create_scatter_plot'].includes(action)) {
      const table = requireTable(context, line, helpers.Error);
      const xColumn = columnName(table, values[0], line, helpers.Error);
      const yColumn = columnName(table, values[1], line, helpers.Error);
      const pairs = table.rows.map((row) => [Number(row[xColumn]), Number(row[yColumn])]).filter((pair) => pair.every(Number.isFinite));
      if (!pairs.length) throw new helpers.Error('The two columns do not contain matching numeric values.', line);
      saveFigure(context, helpers, 'scatter-plot.svg', `${xColumn} and ${yColumn}`, scatterPlot(pairs.map((pair) => pair[0]), pairs.map((pair) => pair[1]), `${xColumn} and ${yColumn}`, xColumn, yColumn), `Points plotted\n${pairs.length}`);
      return true;
    }
    if (['box_plot','create_box_plot','grouped_box_plot'].includes(action)) {
      const table = requireTable(context, line, helpers.Error);
      const { column, values:numbers } = numericValues(table, values[0], line, helpers.Error);
      saveFigure(context, helpers, 'box-plot.svg', `Box plot of ${column}`, boxPlot(numbers, `Box plot of ${column}`), `Values plotted\n${numbers.length}`);
      return true;
    }
    if (['heat_map','heat_map_columns'].includes(action)) {
      const table = requireTable(context, line, helpers.Error);
      saveFigure(context, helpers, 'heat-map.svg', 'Heat map', heatMap(table, line, helpers.Error), `Rows plotted\n${Math.min(table.rows.length, 50)}`);
      return true;
    }
    if (action === 'pca_plot') {
      const table = requireTable(context, line, helpers.Error);
      saveFigure(context, helpers, 'pca-plot.svg', 'PCA plot', pcaPlot(table, line, helpers.Error), `Rows plotted\n${table.rows.length}`);
      return true;
    }
    if (action === 'volcano_plot') {
      const table = requireTable(context, line, helpers.Error);
      const effectColumn = columnName(table, values[0], line, helpers.Error);
      const pColumn = columnName(table, values[1], line, helpers.Error);
      const pairs = table.rows.map((row) => [Number(row[effectColumn]), Number(row[pColumn])]).filter(([effect, p]) => Number.isFinite(effect) && Number.isFinite(p) && p > 0);
      if (!pairs.length) throw new helpers.Error('The effect and p-value columns do not contain plottable values.', line);
      saveFigure(context, helpers, 'volcano-plot.svg', 'Volcano plot', scatterPlot(pairs.map((pair) => pair[0]), pairs.map((pair) => -Math.log10(pair[1])), 'Volcano plot', effectColumn, `-log10(${pColumn})`), `Points plotted\n${pairs.length}`);
      return true;
    }
    return false;
  }

  const structuredActions = [
    'summary_statistic','calculate_average','calculate_median','calculate_standard_deviation','calculate_minimum','calculate_maximum',
    'normalize_counts','compare_groups','permutation_p_value','histogram','create_histogram','bar_chart','create_bar_chart',
    'scatter_plot','create_scatter_plot','box_plot','create_box_plot','grouped_box_plot','heat_map','heat_map_columns','pca_plot','volcano_plot',
  ];
  window.FigureLoomBioSemanticRuntime?.registerAction?.(structuredActions, structuredHandler);

  window.FigureLoomBioStatementHandlers = window.FigureLoomBioStatementHandlers || [];
  window.FigureLoomBioStatementRecognizers = window.FigureLoomBioStatementRecognizers || [];
  window.FigureLoomBioStatementHandlers.push(handler);
  window.FigureLoomBioStatementRecognizers.push(sourceRecognizer);

  const api = window.FigureLoomApprovedBio;
  if (api) {
    api.registerHighlight(/^(Calculate the (?:average|median|standard deviation|confidence interval) of )(.+)(\.)$/i, ['c','v','p']);
    api.registerHighlight(/^(Calculate the p value for )(.+?)( between )(.+?)( and )(.+?)( under )(.+)(\.)$/i, ['c','v','w','v','w','v','w','v','p']);
    api.registerHighlight(/^(Create a (?:histogram|bar chart|box plot) of )(.+)(\.)$/i, ['c','v','p']);
    api.registerHighlight(/^(Create a scatter plot of )(.+?)( and )(.+)(\.)$/i, ['c','v','w','v','p']);
    api.registerHighlight(/^(Create a (?:heat map|PCA plot))(\.)$/i, ['c','p']);
    api.registerHighlight(/^(Create a volcano plot using )(.+?)( and )(.+)(\.)$/i, ['c','v','w','v','p']);
    document.getElementById('programEditor')?.dispatchEvent(new Event('input', { bubbles:true }));
  }
})();
