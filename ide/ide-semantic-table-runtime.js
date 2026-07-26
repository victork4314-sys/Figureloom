(() => {
  'use strict';

  class SemanticTableRuntimeError extends Error {
    constructor(message, lineNumber = null, code = 'semantic_table_runtime_error') {
      super(message);
      this.name = 'FigureLoomBioSemanticRuntimeError';
      this.lineNumber = lineNumber;
      this.code = code;
    }
  }

  const ACTIONS = new Set([
    'keep_rows',
    'remove_rows',
    'keep_columns',
    'rename_column',
    'replace_empty',
    'change_value',
    'order_rows',
    'largest_first',
    'smallest_first',
    'remove_duplicates',
  ]);

  const lineOf = (node) => node?.line_number ?? node?.lineNumber ?? node?.line ?? null;

  function requireTable(context, node) {
    const table = context?.data;
    if (!table || table.kind !== 'table' || !Array.isArray(table.columns) || !Array.isArray(table.rows)) {
      throw new SemanticTableRuntimeError(
        'This instruction needs an open table. Open a CSV or TSV file first.',
        lineOf(node),
        'table_required',
      );
    }
    return table;
  }

  function findColumn(table, requested, node) {
    const name = String(requested ?? '').trim();
    const column = table.columns.find((item) => String(item).toLowerCase() === name.toLowerCase());
    if (!column) {
      throw new SemanticTableRuntimeError(
        `The current table does not contain a column called ${name || '(empty)'}.`,
        lineOf(node),
        'unknown_column',
      );
    }
    return column;
  }

  function listValues(value) {
    if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
    return String(value ?? '')
      .replace(/\s+and\s+/gi, ',')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function comparableRows(table, column) {
    const nonempty = table.rows.filter((row) => String(row[column] ?? '').trim());
    const empty = table.rows.filter((row) => !String(row[column] ?? '').trim());
    const numeric = nonempty.length > 0 && nonempty.every((row) => Number.isFinite(Number(String(row[column]).trim())));
    return { nonempty, empty, numeric };
  }

  function sortRows(table, column, descending) {
    const { nonempty, empty, numeric } = comparableRows(table, column);
    nonempty.sort((left, right) => {
      const comparison = numeric
        ? Number(left[column]) - Number(right[column])
        : String(left[column]).localeCompare(String(right[column]), undefined, { numeric: true, sensitivity: 'base' });
      return descending ? -comparison : comparison;
    });
    table.rows = nonempty.concat(empty);
  }

  function supports(action) {
    return ACTIONS.has(String(action || ''));
  }

  async function executeInstruction(node, context) {
    const action = String(node?.action || node?.semantic?.action || '');
    if (!supports(action)) return false;

    const table = requireTable(context, node);
    const argumentsObject = node.arguments || node.semantic?.arguments || {};

    if (action === 'keep_rows' || action === 'remove_rows') {
      const column = findColumn(table, argumentsObject.condition_column || argumentsObject.column, node);
      const expected = argumentsObject.condition_value ?? argumentsObject.value;
      table.rows = table.rows.filter((row) => action === 'keep_rows'
        ? row[column] === expected
        : row[column] !== expected);
    } else if (action === 'keep_columns') {
      const requested = listValues(argumentsObject.list || argumentsObject.columns || argumentsObject.runtime_values?.[0]);
      const columns = requested.map((column) => findColumn(table, column, node));
      table.columns = columns;
      table.rows = table.rows.map((row) => Object.fromEntries(columns.map((column) => [column, row[column] ?? ''])));
    } else if (action === 'rename_column') {
      const source = findColumn(table, argumentsObject.source_value || argumentsObject.column, node);
      const destination = String(argumentsObject.destination_value || argumentsObject.destination || '').trim();
      if (!destination) {
        throw new SemanticTableRuntimeError('Rename the column to a non-empty name.', lineOf(node), 'missing_destination');
      }
      if (table.columns.some((name) => String(name).toLowerCase() === destination.toLowerCase() && name !== source)) {
        throw new SemanticTableRuntimeError(`A column called ${destination} already exists.`, lineOf(node), 'duplicate_column');
      }
      table.columns = table.columns.map((name) => name === source ? destination : name);
      table.rows = table.rows.map((row) => {
        const next = {};
        for (const name of table.columns) next[name] = name === destination ? (row[source] ?? '') : (row[name] ?? '');
        return next;
      });
    } else if (action === 'replace_empty') {
      const column = findColumn(table, argumentsObject.column || argumentsObject.condition_column, node);
      const replacement = argumentsObject.destination_value ?? argumentsObject.replacement ?? argumentsObject.value;
      table.rows.forEach((row) => {
        if (!String(row[column] ?? '').trim()) row[column] = replacement;
      });
    } else if (action === 'change_value') {
      const column = findColumn(table, argumentsObject.column || argumentsObject.condition_column, node);
      const source = argumentsObject.source_value;
      const destination = argumentsObject.destination_value;
      table.rows.forEach((row) => {
        if (row[column] === source) row[column] = destination;
      });
    } else if (action === 'order_rows' || action === 'largest_first' || action === 'smallest_first') {
      const column = findColumn(table, argumentsObject.column || argumentsObject.using, node);
      sortRows(table, column, action === 'largest_first');
    } else if (action === 'remove_duplicates') {
      const column = findColumn(table, argumentsObject.column || argumentsObject.using, node);
      const seen = new Set();
      table.rows = table.rows.filter((row) => {
        const value = row[column] ?? '';
        if (seen.has(value)) return false;
        seen.add(value);
        return true;
      });
    }

    context.data = table;
    context.lastAction = action;
    return true;
  }

  window.FigureLoomBioSemanticTableRuntime = Object.freeze({
    SemanticTableRuntimeError,
    supports,
    executeInstruction,
  });
})();
