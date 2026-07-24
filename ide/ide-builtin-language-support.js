(() => {
  'use strict';

  const api = window.FigureLoomApprovedBio;
  const editor = document.getElementById('programEditor');
  if (!api) return;

  const rules = [
    // Program flow
    [/^(Make a recipe called )(.+)(:)$/i, ['c','v','p']],
    [/^(If )(.+)(:)$/i, ['c','v','p']],
    [/^(Otherwise(?:,)? if )(.+)(:)$/i, ['c','v','p']],
    [/^(Otherwise)(:)$/i, ['c','p']],
    [/^(For every )([a-z][\w-]*)( in )([a-z][\w-]*)(:)$/i, ['c','v','w','v','p']],
    [/^(For every )([a-z][\w-]*)(:)$/i, ['c','v','p']],
    [/^(Open all )(FASTQ|FASTA|CSV|TSV)( files in )(.+?)( as )([\w-]+)(\.)$/i, ['c','v','c','f','w','v','p']],
    [/^(Open all )(FASTQ|FASTA|CSV|TSV)( files as )([\w-]+)(\.)$/i, ['c','v','c','v','p']],
    [/^(Open the sample)(\.)$/i, ['c','p']],
    [/^(Call the result )(.+)(\.)$/i, ['c','v','p']],
    [/^(Use the recipe )(.+)(\.)$/i, ['c','v','p']],
    [/^(Use the result )(.+)(\.)$/i, ['c','v','p']],
    [/^(Make sure )(.+)(\.)$/i, ['c','v','p']],
    [/^(Show a warning saying )(.+)(\.)$/i, ['c','v','p']],
    [/^(Show a warning)(\.)$/i, ['c','p']],
    [/^((?:Warn|Warning)(?::|\s)+)(.+)(\.)$/i, ['c','v','p']],
    [/^((?:Stop the program|Continue with the next sample|Skip this sample|Mark the sample for review))(\.)$/i, ['c','p']],
    [/^(Save the (?:result|sequences|reads) using the sample name)(\.)$/i, ['c','p']],

    // Built-in microbiology
    [/^((?:Prepare|Clean)(?: the)? bacterial(?: Illumina)? reads)(\.)$/i, ['c','p']],
    [/^(Prepare reads for bacterial analysis)(\.)$/i, ['c','p']],
    [/^((?:Assemble|Build)(?: the| a)? bacterial genome from )(.+?)( and )(.+?)( into )(.+)(\.)$/i, ['c','f','w','f','w','f','p']],
    [/^((?:Assemble|Build)(?: the| a)? bacterial genome from )(.+?)( into )(.+)(\.)$/i, ['c','f','w','f','p']],
    [/^((?:Check|Evaluate|Assess)(?: the)?(?: bacterial)? assembly )(.+?)( into )(.+)(\.)$/i, ['c','f','w','f','p']],
    [/^((?:Annotate(?: the| a)? bacterial genome|Find genes in(?: the)? bacterial genome) )(.+?)( into )(.+)(\.)$/i, ['c','f','w','f','p']],
    [/^(Find resistance genes in )(.+?)( using )(.+)(\.)$/i, ['c','f','w','v','p']],
    [/^(Screen )(.+?)( for resistance genes using )(.+)(\.)$/i, ['c','f','c','v','p']],
    [/^(Find virulence genes in )(.+)(\.)$/i, ['c','f','p']],
    [/^(Screen )(.+)( for virulence genes)(\.)$/i, ['c','f','c','p']],
    [/^(Identify(?: the)? organism in )(.+?)( using )(.+)(\.)$/i, ['c','f','w','v','p']],
    [/^(Classify )(.+?)( using )(.+)(\.)$/i, ['c','f','w','v','p']],
    [/^(Find plasmids in )(.+?)( into )(.+)(\.)$/i, ['c','f','w','f','p']],
    [/^(Reconstruct plasmids from )(.+?)( into )(.+)(\.)$/i, ['c','f','w','f','p']],

    // Old declarations remain readable but are no longer needed.
    [/^((?:Use|Load|Enable|Install)(?: the)? \.?[a-z0-9][a-z0-9-]*(?: add-on| package)?)(\.)$/i, ['c','p']]
  ];

  for (const rule of rules) api.registerHighlight(...rule);

  const matches = (line) => rules.some(([pattern]) => pattern.test(String(line).trim()));
  window.FigureLoomBioBuiltinLanguage = Object.freeze({
    rules,
    matches
  });

  // The original highlighter renders before several language modules register
  // their sentences. Repaint once now so an already-open program immediately
  // loses every stale red underline, including paired-read save lines.
  queueMicrotask(() => {
    editor?.dispatchEvent(new Event('input', { bubbles:true }));
  });
})();
