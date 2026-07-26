(() => {
  'use strict';

  const EXPANSION_URL = '../figureloom-bio/figureloom_bio/bio_expansion_grammar.json?v=1';
  const WORD_RE = /"[^"\n]*"|'[^'\n]*'|[A-Za-z0-9_./\\:+-]+/g;
  const NUMBER_RE = /^[0-9]+(?:\.[0-9]+)?$/;
  const FILE_RE = /[^\s]+\.(?:csv|tsv|txt|fa|fasta|fna|ffn|faa|frn|fq|fastq|vcf|gff|gff3|gtf|bed|nwk|svg)$/i;

  const normalize = (value) => String(value).toLowerCase().replace(/\s+/g, ' ').trim();
  const wordsOf = (source) => [...String(source).matchAll(WORD_RE)].map((match) => match[0].replace(/^['"]|['"]$/g, ''));

  function entries(grammar, category) {
    const output = [];
    for (const [canonical, forms] of Object.entries(grammar[category] || {})) {
      for (const form of forms) output.push({ canonical, words: normalize(form).split(' ') });
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
          return { canonical: entry.canonical, start: index, end: index + entry.words.length };
        }
      }
    }
    return null;
  }

  function parser(expansion, baseApi) {
    const operationEntries = entries(expansion, 'operations');
    const targetEntries = entries(expansion, 'targets');
    const comparisonEntries = entries(expansion, 'comparisons');
    const roleEntries = entries(expansion, 'roles');
    const modifierEntries = entries(expansion, 'modifiers');

    function parseExpandedInstruction(source, lineNumber = 1) {
      const words = wordsOf(source);
      const operationMatch = findPhrase(words, operationEntries, true);
      if (!operationMatch) throw new baseApi.LanguageError('missing_operation', 'I could not find a supported bioinformatics operation.', null, lineNumber);
      const operation = operationMatch.canonical;

      const targets = [];
      for (const entry of targetEntries) {
        const match = findPhrase(words, [entry]);
        if (match && !targets.includes(entry.canonical)) targets.push(entry.canonical);
      }
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
        if (match) roleMatches.push({ role: entry.canonical, ...match });
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
        const score = 10 + (rule.modifier ? 4 : 0) + (rule.needs_number ? 2 : 0) + (rule.needs_file ? 2 : 0);
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
      try { return baseApi.parseSemanticInstruction(source, lineNumber); }
      catch (baseError) {
        try { return parseExpandedInstruction(source, lineNumber); }
        catch { throw baseError; }
      }
    }

    function parseInstruction(source, lineNumber = 1) {
      return toRuntime(parseSemanticInstruction(source, lineNumber));
    }

    function toRuntime(node) {
      if (!node || !String(node.action || '').startsWith('count_') && ![
        'find_orfs','find_snps','find_indels','find_primers','check_contamination','check_duplicate_names','check_read_pairs',
        'keep_variant_quality','keep_pass_variants','remove_low_quality_variants','annotate_variants','annotate_genes',
        'summarize_variants','summarize_expression','summarize_alignment','extract_features','create_heatmap','create_pca_plot','create_ma_plot','create_box_plot'
      ].includes(node.action)) return baseApi.toRuntime(node);
      return {
        type:'instruction', operation:node.operation, targets:[...(node.targets || [])], action:node.action,
        semanticAction:node.action, arguments:node.arguments || {}, modifiers:[...(node.modifiers || [])],
        roles:{...(node.roles || {})}, comparison:node.comparison, source:node.source, line:node.line,
        lineNumber:node.line_number || node.line || 1, values:[...(node.arguments?.runtime_values || [])], semantic:node,
      };
    }

    function parseProgram(source) {
      try { return baseApi.parseProgram(source); }
      catch (baseError) {
        const lines = String(source).split(/\r?\n/);
        if (lines.some((line) => line.trim().endsWith(':'))) throw baseError;
        const body = [];
        for (let index = 0; index < lines.length; index += 1) {
          const text = lines[index].trim();
          if (!text || text.startsWith('#')) continue;
          if (!text.endsWith('.')) throw baseError;
          body.push(parseSemanticInstruction(text.slice(0, -1), index + 1));
        }
        return { type:'program', body, recipes:{} };
      }
    }

    return Object.freeze({ ...baseApi, parseExpandedInstruction, parseSemanticInstruction, parseInstruction, parseProgram, toRuntime, expansion });
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
