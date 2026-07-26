(() => {
  'use strict';

  class SemanticRuntimeError extends Error {
    constructor(message, lineNumber = null, code = 'semantic_runtime_error') {
      super(message);
      this.name = 'FigureLoomBioSemanticRuntimeError';
      this.lineNumber = lineNumber;
      this.code = code;
    }
  }

  const cloneValue = (value) => {
    if (value === null || value === undefined) return value;
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  };

  const normalizeName = (value) => String(value ?? '').replace(/^(?:the\s+)?/i, '').trim();

  function mapGet(map, name) {
    if (!(map instanceof Map)) return undefined;
    if (map.has(name)) return map.get(name);
    const lowered = String(name).toLowerCase();
    for (const [key, value] of map) if (String(key).toLowerCase() === lowered) return value;
    return undefined;
  }

  function dataRecords(data) {
    if (!data) return [];
    if (Array.isArray(data.records)) return data.records;
    if (data.kind === 'pair') return [...(data.a?.records || []), ...(data.b?.records || [])];
    return [];
  }

  function metricValue(spec, context) {
    const target = String(spec?.target || '').toLowerCase();
    const metric = String(spec?.metric || 'count').toLowerCase();
    const data = context.data;
    if (metric === 'count') {
      if (target === 'row' || target === 'rows') return data?.kind === 'table' ? (data.rows || []).length : 0;
      if (['sequence','sequences','read','reads'].includes(target)) return dataRecords(data).length;
      if (target === 'base' || target === 'bases') return dataRecords(data).reduce((sum, record) => sum + String(record.sequence || '').length, 0);
    }
    if (metric === 'average_quality') {
      const values = dataRecords(data).map((record) => {
        if (!record.quality) return null;
        return [...record.quality].reduce((sum, character) => sum + character.charCodeAt(0) - 33, 0) / record.quality.length;
      }).filter((value) => value !== null);
      return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    }
    if (metric === 'gc_content') {
      const sequence = dataRecords(data).map((record) => String(record.sequence || '')).join('').toUpperCase().replaceAll('U', 'T');
      if (!sequence.length) return 0;
      return [...sequence].filter((base) => base === 'G' || base === 'C').length / sequence.length * 100;
    }
    return undefined;
  }

  function referenceValue(name, context) {
    const cleaned = normalizeName(name);
    const variable = mapGet(context.variables, cleaned);
    if (variable !== undefined) return variable;
    if (/^(?:true|yes)$/i.test(cleaned)) return true;
    if (/^(?:false|no)$/i.test(cleaned)) return false;
    if (/^(?:result|current result)$/i.test(cleaned)) return context.data;
    if (/^(?:row|rows|row count)$/i.test(cleaned)) return context.data?.kind === 'table' ? (context.data.rows || []).length : 0;
    if (/^(?:sequence|sequences|sequence count|read|reads|read count)$/i.test(cleaned)) return dataRecords(context.data).length;
    if (/^(?:base|bases|base count)$/i.test(cleaned)) return dataRecords(context.data).reduce((sum, record) => sum + String(record.sequence || '').length, 0);
    if (context.currentRow && Object.prototype.hasOwnProperty.call(context.currentRow, cleaned)) return context.currentRow[cleaned];
    return cleaned;
  }

  function operandValue(operand, context) {
    if (operand === null || operand === undefined) return operand;
    if (typeof operand !== 'object') return operand;
    const type = operand.type || operand.kind;
    if (type === 'number') return Number(operand.value);
    if (type === 'literal' || type === 'value') return operand.value;
    if (type === 'reference') return referenceValue(operand.name, context);
    if (type === 'column') return context.currentRow?.[operand.name] ?? referenceValue(operand.name, context);
    if (type === 'metric') return metricValue(operand, context);
    if (type === 'file') {
      const name = operand.name === 'current' ? context.currentFile : operand.name;
      return name ? context.files?.[name] : undefined;
    }
    if (type === 'result') return context.data;
    if (type === 'flag') return Boolean(mapGet(context.flags, operand.name));
    if (type === 'sample_name') return context.currentSample?.name ?? context.currentRow?.sample ?? context.currentRow?.name;
    if ('value' in operand) return operand.value;
    return operand;
  }

  function empty(value) {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string' || Array.isArray(value)) return value.length === 0;
    if (value instanceof Map || value instanceof Set) return value.size === 0;
    if (value.kind === 'table') return !(value.rows || []).length;
    if (Array.isArray(value.records)) return !value.records.length;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  }

  function comparable(value) {
    if (typeof value === 'number') return value;
    const number = Number(value);
    if (String(value ?? '').trim() !== '' && Number.isFinite(number)) return number;
    return String(value ?? '').toLowerCase();
  }

  function compare(left, operator, right) {
    const a = comparable(left);
    const b = comparable(right);
    switch (String(operator || '').toLowerCase()) {
      case 'equal': case 'equals': case 'is': return a === b;
      case 'not_equal': case 'does_not_equal': return a !== b;
      case 'greater': case 'more': case 'longer': case 'after': return a > b;
      case 'less': case 'fewer': case 'shorter': case 'before': return a < b;
      case 'at_least': return a >= b;
      case 'at_most': return a <= b;
      case 'contains': return String(left ?? '').toLowerCase().includes(String(right ?? '').toLowerCase());
      case 'not_contains': return !String(left ?? '').toLowerCase().includes(String(right ?? '').toLowerCase());
      case 'starts_with': return String(left ?? '').toLowerCase().startsWith(String(right ?? '').toLowerCase());
      case 'ends_with': return String(left ?? '').toLowerCase().endsWith(String(right ?? '').toLowerCase());
      case 'exists': return left !== undefined && left !== null;
      case 'empty': return empty(left);
      case 'not_empty': return !empty(left);
      case 'found': return Boolean(left);
      case 'not_found': return !left;
      default: throw new SemanticRuntimeError(`The comparison “${operator}” is not implemented.`, null, 'unsupported_comparison');
    }
  }

  function evaluateCondition(condition, context) {
    if (!condition) return false;
    const type = condition.type === 'condition' ? condition.kind : (condition.type || condition.kind);
    if (type === 'literal') return Boolean(condition.value);
    if (type === 'boolean') {
      const left = evaluateCondition(condition.left, context);
      return String(condition.operator).toLowerCase() === 'and'
        ? left && evaluateCondition(condition.right, context)
        : left || evaluateCondition(condition.right, context);
    }
    if (type === 'not') return !evaluateCondition(condition.value, context);
    if (type === 'comparison' || type === 'predicate') {
      const operator = condition.operator || condition.comparison;
      return compare(operandValue(condition.left, context), operator, operandValue(condition.right, context));
    }
    throw new SemanticRuntimeError(`The condition type “${type}” is not implemented.`, condition.line_number || condition.line || null, 'unsupported_condition');
  }

  function substituteText(value, variables) {
    if (typeof value !== 'string' || !(variables instanceof Map)) return value;
    let output = value;
    for (const [name, replacement] of variables) {
      const pattern = new RegExp(`\\b${String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      output = output.replace(pattern, String(replacement?.name ?? replacement));
    }
    return output;
  }

  function substitute(value, variables) {
    if (typeof value === 'string') return substituteText(value, variables);
    if (Array.isArray(value)) return value.map((item) => substitute(item, variables));
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, substitute(item, variables)]));
  }

  function collectionValue(name, context) {
    const direct = mapGet(context.variables, normalizeName(name));
    if (Array.isArray(direct)) return direct;
    const normalized = normalizeName(name).toLowerCase();
    if (['file','files'].includes(normalized)) return Object.keys(context.files || {});
    if (['row','rows'].includes(normalized)) return context.data?.kind === 'table' ? (context.data.rows || []) : [];
    if (['sequence','sequences','read','reads'].includes(normalized)) return dataRecords(context.data);
    if (direct && typeof direct[Symbol.iterator] === 'function') return [...direct];
    throw new SemanticRuntimeError(`I could not find a collection called ${name}.`, null, 'unknown_collection');
  }

  function createContext(values = {}) {
    return {
      data: values.data ?? null,
      files: values.files ?? {},
      currentFile: values.currentFile ?? null,
      currentRow: values.currentRow ?? null,
      currentSample: values.currentSample ?? null,
      variables: values.variables instanceof Map ? values.variables : new Map(),
      named: values.named instanceof Map ? values.named : new Map(),
      recipes: values.recipes instanceof Map ? values.recipes : new Map(),
      flags: values.flags instanceof Map ? values.flags : new Map(),
      runNumber: values.runNumber ?? 1,
      totalRuns: values.totalRuns ?? 1,
    };
  }

  function prepareProgram(tree) {
    const body = [...(tree?.body || [])];
    let repeatCount = 1;
    const repeats = body.filter((node) => node?.action === 'repeat' || node?.action === 'repeat_program' || node?.semantic?.action === 'repeat_program');
    if (repeats.length > 1) throw new SemanticRuntimeError('Use only one instruction that says how many times to run the program.', repeats[1].lineNumber || repeats[1].line_number || null, 'multiple_repeats');
    if (repeats.length) {
      if (body[0] !== repeats[0]) throw new SemanticRuntimeError('Put the repeat instruction at the beginning of the program.', repeats[0].lineNumber || repeats[0].line_number || null, 'repeat_position');
      repeatCount = Number(repeats[0].values?.[0] ?? repeats[0].arguments?.runtime_values?.[0] ?? repeats[0].arguments?.number ?? repeats[0].semantic?.arguments?.runtime_values?.[0] ?? repeats[0].semantic?.arguments?.number ?? 1);
      body.shift();
    }
    return { repeatCount, body };
  }

  function createExecutor({ executeInstruction }) {
    if (typeof executeInstruction !== 'function') throw new TypeError('executeInstruction is required.');

    async function executeNodes(nodes, context) {
      for (const original of nodes || []) {
        const type = original?.type || (original?.action ? 'instruction' : null);
        const node = type === 'instruction' ? substitute(original, context.variables) : original;
        if (type === 'recipe') {
          context.recipes.set(String(node.name).toLowerCase(), node);
          continue;
        }
        if (type === 'if') {
          const branches = node.branches || [{ condition:node.condition, body:node.then || [] }];
          let selected = null;
          for (const branch of branches) {
            if (evaluateCondition(branch.condition, context)) { selected = branch.body; break; }
          }
          await executeNodes(selected || node.otherwise || [], context);
          continue;
        }
        if (type === 'loop') {
          const iterator = node.item || node.iterator;
          const values = collectionValue(node.collection, context);
          for (const value of values) {
            context.variables.set(iterator, value);
            context.currentRow = value && typeof value === 'object' && !Array.isArray(value) ? value : null;
            await executeNodes(node.body || [], context);
          }
          context.variables.delete(iterator);
          context.currentRow = null;
          continue;
        }
        if (type !== 'instruction') throw new SemanticRuntimeError(`The program node “${type}” is not executable.`, node.lineNumber || node.line_number || node.line || null, 'unsupported_node');

        const semanticAction = node.semantic?.action || node.semanticAction || node.action;
        const values = node.values || node.arguments?.runtime_values || node.semantic?.arguments?.runtime_values || [];
        const roles = node.roles || node.semantic?.roles || {};
        if (semanticAction === 'use_recipe' || node.action === 'useRecipe') {
          const name = String(values[0] || roles.name || '').toLowerCase();
          const recipe = context.recipes.get(name);
          if (!recipe) throw new SemanticRuntimeError(`I could not find a recipe called ${values[0] || name}.`, node.lineNumber || node.line_number || null, 'unknown_recipe');
          await executeNodes(recipe.body || [], context);
          continue;
        }
        if (semanticAction === 'name_result' || node.action === 'nameResult') {
          const name = String(values[0] || roles.name || '').trim();
          if (!name) throw new SemanticRuntimeError('Name the result with a non-empty name.', node.lineNumber || node.line_number || null, 'missing_result_name');
          context.named.set(name.toLowerCase(), cloneValue(context.data));
          continue;
        }
        if (semanticAction === 'use_result' || node.action === 'useResult') {
          const name = String(values[0] || roles.name || '').trim();
          const saved = context.named.get(name.toLowerCase());
          if (saved === undefined) throw new SemanticRuntimeError(`I could not find a saved result called ${name}.`, node.lineNumber || node.line_number || null, 'unknown_result');
          context.data = cloneValue(saved);
          continue;
        }
        const next = await executeInstruction(node, context);
        if (next !== undefined) context.data = next;
      }
      return context;
    }

    async function executeProgram(tree, values = {}) {
      const context = createContext(values);
      for (const node of tree?.body || []) if (node.type === 'recipe') context.recipes.set(String(node.name).toLowerCase(), node);
      await executeNodes((tree?.body || []).filter((node) => node.type !== 'recipe'), context);
      return context;
    }

    return Object.freeze({ executeNodes, executeProgram, evaluateCondition, createContext, prepareProgram });
  }

  window.FigureLoomBioSemanticRuntime = Object.freeze({
    SemanticRuntimeError,
    createExecutor,
    createContext,
    evaluateCondition,
    prepareProgram,
  });
})();
