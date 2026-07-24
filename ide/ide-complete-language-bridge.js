(() => {
  'use strict';

  const api = window.FigureLoomBioCompleteLanguage;
  if (!api?.run || !api?.uses) {
    throw new Error('The completed FigureLoom Bio language loaded without its browser runtime.');
  }

  const sequenceAnalysis = /^(?:Find repeated sequences|Find palindromes|Find (?:start|stop) codons|Find open reading frames|Find genes|Find signal peptides|Find transmembrane regions|Find PCR primers|Compare the sequences|Build a phylogenetic tree|Join the sequences)$/i;

  const clone = (value) => (
    typeof structuredClone === 'function'
      ? structuredClone(value)
      : JSON.parse(JSON.stringify(value))
  );

  const handler = async ({ text, context, line, helpers }) => {
    const needsSequences = sequenceAnalysis.test(String(text).trim());

    if (needsSequences && context.data?.kind === 'seq') {
      context.completeSequenceSource = clone(context.data);
    } else if (
      needsSequences
      && context.data?.kind === 'table'
      && context.completeSequenceSource?.kind === 'seq'
    ) {
      context.data = clone(context.completeSequenceSource);
    }

    const handled = await api.run(
      text,
      context,
      line,
      {
        X:helpers.Error,
        enc:helpers.encode,
        sec:helpers.section,
      },
    );

    if (needsSequences && context.data?.kind === 'seq') {
      context.completeSequenceSource = clone(context.data);
    }
    return handled;
  };

  const recognizer = (source) => api.uses(source);

  window.FigureLoomBioStatementHandlers = window.FigureLoomBioStatementHandlers || [];
  window.FigureLoomBioStatementRecognizers = window.FigureLoomBioStatementRecognizers || [];

  if (!window.FigureLoomBioStatementHandlers.includes(handler)) {
    window.FigureLoomBioStatementHandlers.push(handler);
  }
  if (!window.FigureLoomBioStatementRecognizers.includes(recognizer)) {
    window.FigureLoomBioStatementRecognizers.push(recognizer);
  }

  window.FigureLoomBioCompleteLanguageBridge = Object.freeze({ handler, recognizer });
})();
