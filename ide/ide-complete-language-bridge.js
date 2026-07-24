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

  const sequenceSummary = (data) => (data?.kind === 'seq'
    ? data.records.map((record) => `${record.name}: ${record.sequence.length} bases`).join('\n') || 'No sequences remained.'
    : 'No FASTA or FASTQ sequences were available.');

  const handler = async ({ text, context, line, helpers }) => {
    const instruction = String(text).trim();
    const needsSequences = sequenceAnalysis.test(instruction);

    if (needsSequences && context.data?.kind === 'seq') {
      context.completeSequenceSource = clone(context.data);
    } else if (
      needsSequences
      && context.data?.kind === 'table'
      && context.completeSequenceSource?.kind === 'seq'
    ) {
      context.data = clone(context.completeSequenceSource);
    }

    if (needsSequences) {
      context.completeSequenceHistory ||= [];
      context.completeSequenceHistory.push(`${instruction}\n${sequenceSummary(context.data)}`);
      context.completeSequenceHistory = context.completeSequenceHistory.slice(-12);
    }

    let handled;
    try {
      handled = await api.run(
        text,
        context,
        line,
        {
          X:helpers.Error,
          enc:helpers.encode,
          sec:helpers.section,
        },
      );
    } catch (error) {
      if (needsSequences && !String(error?.message || '').includes('Sequence input received:')) {
        const history = (context.completeSequenceHistory || []).join('\n\n');
        const runtimeHistory = (context.runtimeSequenceHistory || []).join('\n\n');
        error.message = `${error.message}\n\nSequence input received:\n${sequenceSummary(context.data)}${history ? `\n\nRecent sequence steps:\n${history}` : ''}${runtimeHistory ? `\n\nRuntime sequence trail:\n${runtimeHistory}` : ''}`;
      }
      throw error;
    }

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
