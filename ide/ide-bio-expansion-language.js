(() => {
  'use strict';

  const EXPANSION_URL = '../figureloom-bio/figureloom_bio/bio_expansion_grammar.json?v=20260727-scientific-3';
  const WORD_RE = /"[^"\n]*"|'[^'\n]*'|[A-Za-z0-9_./\\:+-]+/g;
  const NUMBER_RE = /^[0-9]+(?:\.[0-9]+)?$/;
  const FILE_RE = /[^\s]+\.(?:csv|tsv|txt|fa|fasta|fna|ffn|faa|frn|fq|fastq|vcf|gff|gff3|gtf|bed|nwk|svg)$/i;

  const normalize = (value) => String(value).toLowerCase().replace(/\s+/g, ' ').trim();
  const wordsOf = (source) => [...String(source).matchAll(WORD_RE)].map((match) => match[0].replace(/^['"]|['"]$/g, ''));

  function entries(grammar, category) {
    const output = [];
    for (const [canonical, forms] of Object.entries(grammar[category] || {})) {
      for (const form of forms) output.push({ canonical, words:normalize(form).split(' ') });
    }
    output.sort((left, right) => right.words.length - left.words.length);
    return output;
  }

  function findPhrase(words, list, startOnly = false) {
    const lowered = words.map(normalize);
    for (const entry of list) {
      const limit = startOnly ? 1 : lowered.length - entry.words.length + 1;
      for (let index = 0; index < Math.max(0, limit); index += 1) {
        if (entry.words.every((word, offset) => lowered[index + offset] === word)) {
          return { canonical:entry.canonical, start:index, end:index + entry.words.length };
        }
      }
    }
    return null;
  }

  function allTargetMatches(words, list) {
    const lowered = words.map(normalize);
    const matches = [];
    for (const entry of list) {
      for (let index = 0; index <= lowered.length - entry.words.length; index += 1) {
        if (entry.words.every((word, offset) => lowered[index + offset] === word)) {
          matches.push({ canonical:entry.canonical, start:index, end:index + entry.words.length });
        }
      }
    }
    matches.sort((left, right) => (right.end - right.start) - (left.end - left.start) || left.start - right.start || left.canonical.localeCompare(right.canonical));
    const selected = [];
    for (const candidate of matches) {
      if (selected.some((other) => other.start <= candidate.start && candidate.end <= other.end)) continue;
      selected.push(candidate);
    }
    selected.sort((left, right) => left.start - right.start || (right.end - right.start) - (left.end - left.start));
    return selected;
  }

  function parser(expansion, baseApi) {
    const groups = {
      operations:entries(expansion, 'operations'),
      targets:entries(expansion, 'targets'),
      comparisons:entries(expansion, 'comparisons'),
      roles:entries(expansion, 'roles'),
      modifiers:entries(expansion, 'modifiers'),
    };
    const operationEntries = groups.operations;
    const targetEntries = groups.targets;
    const comparisonEntries = groups.comparisons;
    const roleEntries = groups.roles;
    const modifierEntries = groups.modifiers;
    const expansionActions = new Set((expansion.capabilities || []).map((rule) => rule.action));

    function classifyExpansionPhrase(category, phrase) {
      const list = groups[category];
      if (!list) throw new Error(`Unknown expansion category: ${category}`);
      const words = wordsOf(phrase);
      const match = findPhrase(words, list, true);
      return match && match.start === 0 && match.end === words.length ? match.canonical : null;
    }

    function parseExpandedInstruction(source, lineNumber = 1) {
      const words = wordsOf(source);
      const operationMatch = findPhrase(words, operationEntries, true);
      if (!operationMatch) throw new baseApi.LanguageError('missing_operation', 'I could not find a supported bioinformatics operation.', null, lineNumber);
      const operation = operationMatch.canonical;

      const targetMatches = allTargetMatches(words, targetEntries);
      const targets = [...new Set(targetMatches.map((match) => match.canonical))];
      const targetLengths = new Map(targetMatches.map((match) => [match.canonical, Math.max(1, match.end - match.start)]));
      if (!targets.length) throw new baseApi.LanguageError('missing_target', 'This bioinformatics instruction needs a target.', null, lineNumber);

      const modifiers = [];
      for (const entry of modifierEntries) {
        if (findPhrase(words, [entry]) && !modifiers.includes(entry.canonical)) modifiers.push(entry.canonical);
      }
      const comparisonMatch = findPhrase(words, comparisonEntries);
      const comparison = comparisonMatch?.canonical || null;
      const numbers = words.filter((word) => NUMBER_RE.test(word));
      const files = words.filter((word) => FILE_RE.test(word));

      const roleMatches = [];
      for (const entry of roleEntries) {
        const match = findPhrase(words, [entry]);
        if (match) roleMatches.push({ role:entry.canonical, ...match });
      }
      roleMatches.sort((left, right) => left.start - right.start);
      const roles = {};
      roleMatches.forEach((match, index) => {
        const stop = roleMatches[index + 1]?.start ?? words.length;
        const value = words.slice(match.end, stop).filter((word) => !['the', 'a', 'an'].includes(normalize(word))).join(' ').trim();
        if (value) roles[match.role] = value;
      });

      const candidates = [];
      for (const rule of expansion.capabilities || []) {
        if (rule.operation !== operation || !targets.includes(rule.target)) continue;
        if (rule.modifier && !modifiers.includes(rule.modifier)) continue;
        if (rule.needs_number && !numbers.length) continue;
        if (rule.needs_file && !files.length) continue;
        let score = 10 + (targetLengths.get(rule.target) || 1) * 3;
        if (rule.modifier) score += 4;
        if (rule.needs_number) score += 2;
        if (rule.needs_file) score += 2;
        candidates.push({ score, rule });
      }
      if (!candidates.length) {
        throw new baseApi.LanguageError('incompatible_operation_target', `The operation ${operation} cannot be used with ${targets.join(', ')} in this form.`, null, lineNumber);
      }
      candidates.sort((left, right) => right.score - left.score);
      const topScore = candidates[0].score;
      const top = candidates.filter((item) => item.score === topScore);
      const actions = new Set(top.map((item) => item.rule.action));
      if (actions.size !== 1) {
        throw new baseApi.LanguageError('ambiguous_instruction', `This instruction has more than one valid meaning: ${[...actions].sort().join(', ')}.`, null, lineNumber);
      }
      const rule = top[0].rule;
      const args = { numbers:[...numbers], files:[...files], runtime_values:[...numbers, ...files], ...roles };
      if (numbers.length) args.number = numbers[0];
      if (files.length) args.source = files[0];
      if (comparison) args.comparison = comparison;
      return {
        type:'instruction', operation, targets, action:rule.action, arguments:args,
        modifiers, roles, comparison:comparison ? { operator:comparison, value:numbers[0] || null } : null,
        source:String(source), source_text:String(source), line:lineNumber, line_number:lineNumber, column:1,
      };
    }

    function parseSemanticInstruction(source, lineNumber = 1) {
      try { return parseExpandedInstruction(source, lineNumber); }
      catch (expansionError) {
        try { return baseApi.parseSemanticInstruction(source, lineNumber); }
        catch { throw expansionError; }
      }
    }

    function parseInstruction(source, lineNumber = 1) {
      return toRuntime(parseSemanticInstruction(source, lineNumber));
    }

    function toRuntime(node) {
      if (!node || !expansionActions.has(node.action)) return baseApi.toRuntime(node);
      return {
        type:'instruction', operation:node.operation, targets:[...(node.targets || [])], action:node.action,
        semanticAction:node.action, arguments:node.arguments || {}, modifiers:[...(node.modifiers || [])],
        roles:{...(node.roles || {})}, comparison:node.comparison, source:node.source, line:node.line,
        lineNumber:node.line_number || node.line || 1, values:[...(node.arguments?.runtime_values || [])], semantic:node,
      };
    }

    function parseConditionWithBase(source, lineNumber) {
      const probe = baseApi.parseProgram(`If ${source}:\n    Say condition check.`);
      const node = probe.body?.[0];
      if (!node || node.type !== 'if') throw new baseApi.LanguageError('missing_condition', 'This block needs a valid condition.', null, lineNumber);
      return node.branches[0].condition;
    }

    function parseProgram(source) {
      const root = { type:'program', body:[], recipes:{} };
      const stack = [{ indent:-4, body:root.body }];
      const lastIf = new Map();
      const lines = String(source).split(/\r?\n/);

      lines.forEach((raw, index) => {
        const line = index + 1;
        const text = raw.trim();
        if (!text || text.startsWith('#')) return;
        const leading = (raw.match(/^\s*/) || [''])[0];
        if (leading.includes('\t') || leading.length % 4) throw new baseApi.LanguageError('invalid_indent', 'Indent blocks with four spaces.', null, line);
        const indent = leading.length;
        while (stack.length > 1 && indent <= stack.at(-1).indent) stack.pop();
        const parent = stack.at(-1);
        if (indent !== parent.indent + 4) throw new baseApi.LanguageError('invalid_indent', 'This line is indented farther than the block above it.', null, line);

        if (text.endsWith(':')) {
          const header = text.slice(0, -1).trim();
          const lower = header.toLowerCase();
          if (lower.startsWith('make a recipe called ')) {
            const name = header.slice('Make a recipe called '.length).trim();
            if (!name) throw new baseApi.LanguageError('missing_recipe_name', 'A recipe header needs a name.', null, line);
            const node = { type:'recipe', name, body:[], line, line_number:line };
            parent.body.push(node); root.recipes[name.toLowerCase()] = node; stack.push({ indent, body:node.body }); lastIf.delete(indent); return;
          }
          if (lower.startsWith('if ')) {
            const branch = { condition:parseConditionWithBase(header.slice(3).trim(), line), body:[], line };
            const node = { type:'if', branches:[branch], otherwise:[], line, line_number:line };
            parent.body.push(node); lastIf.set(indent, node); stack.push({ indent, body:branch.body }); return;
          }
          if (lower.startsWith('otherwise if ') || lower.startsWith('else if ')) {
            const prefix = lower.startsWith('otherwise if ') ? 'otherwise if ' : 'else if ';
            const node = lastIf.get(indent);
            if (!node) throw new baseApi.LanguageError('orphan_else_if', 'Put Else if directly after an If block.', null, line);
            const branch = { condition:parseConditionWithBase(header.slice(prefix.length).trim(), line), body:[], line };
            node.branches.push(branch); stack.push({ indent, body:branch.body }); return;
          }
          if (lower === 'otherwise' || lower === 'else') {
            const node = lastIf.get(indent);
            if (!node) throw new baseApi.LanguageError('orphan_else', 'Put Else directly after an If block.', null, line);
            stack.push({ indent, body:node.otherwise }); return;
          }
          if (lower.startsWith('for every ')) {
            const rest = header.slice('For every '.length);
            const match = rest.match(/^(.*?)\s+in\s+(.+)$/i);
            const item = (match?.[1] || rest).trim() || 'item';
            const collection = (match?.[2] || `${item}s`).trim().toLowerCase();
            const node = { type:'loop', item, iterator:item, collection, body:[], line, line_number:line };
            parent.body.push(node); stack.push({ indent, body:node.body }); lastIf.delete(indent); return;
          }
          throw new baseApi.LanguageError('unknown_block', `I could not parse the block header “${header}”.`, null, line);
        }

        if (!text.endsWith('.')) throw new baseApi.LanguageError('missing_period', 'This instruction needs a period at the end.', null, line);
        const node = parseSemanticInstruction(text.slice(0, -1), line);
        node.line = line; node.line_number = line; node.column = 1; node.source = node.source_text || text.slice(0, -1);
        parent.body.push(node); lastIf.delete(indent);
      });
      return root;
    }

    return Object.freeze({ ...baseApi, classifyExpansionPhrase, parseExpandedInstruction, parseSemanticInstruction, parseInstruction, parseProgram, toRuntime, expansion });
  }

  const ready = Promise.all([
    window.FigureLoomBioSemanticLanguageReady,
    fetch(EXPANSION_URL, { cache:'no-store' }).then((response) => {
      if (!response.ok) throw new Error(`Could not load the bioinformatics expansion (${response.status}).`);
      return response.json();
    }),
  ]).then(([baseApi, expansion]) => {
    const api = parser(expansion, baseApi);
    window.FigureLoomBioSemanticLanguage = api;
    window.FigureLoomBioSemanticLanguageReady = Promise.resolve(api);
    window.dispatchEvent(new CustomEvent('figureloom-bio-semantic-language-ready', { detail:api }));
    return api;
  });

  window.FigureLoomBioSemanticLanguageReady = ready;
})();
