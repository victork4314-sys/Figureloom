(() => {
  'use strict';

  const actions = new Set([
    'find_start_codons',
    'find_stop_codons',
    'check_gaps',
    'check_unclear_bases',
    'summarize_lengths',
    'summarize_read_quality',
    'summarize_coverage',
    'find_shared_variants',
    'find_unique_variants',
    'create_length_plot',
    'create_gc_plot',
    'create_quality_plot',
  ]);

  const ready = window.FigureLoomBioSemanticLanguageReady.then((api) => {
    const toRuntime = (node) => {
      if (!actions.has(String(node?.action || ''))) return api.toRuntime(node);
      return {
        type:'instruction',
        operation:node.operation,
        targets:[...(node.targets || [])],
        action:node.action,
        semanticAction:node.action,
        arguments:{...(node.arguments || {})},
        modifiers:[...(node.modifiers || [])],
        roles:{...(node.roles || {})},
        comparison:node.comparison || null,
        source:node.source,
        line:node.line,
        lineNumber:node.line_number || node.line || 1,
        values:[...(node.arguments?.runtime_values || [])],
        semantic:node,
      };
    };
    const expanded = Object.freeze({ ...api, toRuntime });
    window.FigureLoomBioSemanticLanguage = expanded;
    window.FigureLoomBioSemanticLanguageReady = Promise.resolve(expanded);
    window.dispatchEvent(new CustomEvent('figureloom-bio-semantic-language-ready', { detail:expanded }));
    return expanded;
  });

  window.FigureLoomBioSemanticLanguageReady = ready;
})();
