(() => {
  'use strict';

  const ready = window.FigureLoomBioLanguageAliasesReady;
  if (!ready) return;

  const figureName = (sentence) => {
    const text = String(sentence).replace(/\.$/, '').trim();
    if (/^Create a histogram\b/i.test(text)) return 'histogram.svg';
    if (/^Create a bar chart\b/i.test(text)) return 'bar-chart.svg';
    if (/^Create a scatter plot\b/i.test(text)) return 'scatter-plot.svg';
    if (/^Create a box plot\b/i.test(text)) return 'box-plot.svg';
    if (/^Create a heat map\b/i.test(text)) return 'heat-map.svg';
    if (/^Create a PCA plot$/i.test(text)) return 'pca-plot.svg';
    if (/^Create a volcano plot\b/i.test(text)) return 'volcano-plot.svg';
    return null;
  };

  ready.then((aliases) => {
    // The alias handler is registered immediately before this promise resolves.
    // Put that specific, vocabulary-driven handler before broad legacy handlers
    // so an older table rule cannot swallow a newer read or figure sentence.
    const registeredHandlers = window.FigureLoomBioStatementHandlers;
    if (Array.isArray(registeredHandlers) && registeredHandlers.length > 1) {
      registeredHandlers.unshift(registeredHandlers.pop());
    }

    const previous = window.FigureLoomBioCurrentFile;
    if (!previous?.normalizeSource) throw new Error('The current-file language did not load before generated-file support.');

    function expandGeneratedFiles(source) {
      const output = [];
      let generated = null;
      for (const raw of String(source).split(/\r?\n/)) {
        const indent = raw.match(/^\s*/)?.[0] || '';
        const text = raw.trim();
        if (!text || text.startsWith('#') || text.endsWith(':')) {
          output.push(raw);
          continue;
        }
        const canonical = aliases.canonicalizeSentence(text);
        const created = figureName(canonical);
        if (created) {
          output.push(`${indent}${canonical}`);
          output.push(`${indent}Use the generated file ${created}.`);
          generated = created;
          continue;
        }
        let match;
        if (generated && /^(?:Show|Display) (?:the )?(?:current )?file\.?$/i.test(canonical)) {
          output.push(`${indent}Show the generated file ${generated}.`);
          continue;
        }
        if (generated && /^Check (?:the )?(?:current )?file\.?$/i.test(canonical)) {
          output.push(`${indent}Check the generated file ${generated}.`);
          continue;
        }
        if (generated && /^Count (?:the )?(?:current )?file\.?$/i.test(canonical)) {
          output.push(`${indent}Count the generated file ${generated}.`);
          continue;
        }
        match = generated ? canonical.match(/^Save (?:the )?(?:current )?file as (.+)\.$/i) : null;
        if (match) {
          output.push(`${indent}Copy the generated file ${generated} as ${match[1]}.`);
          generated = match[1];
          continue;
        }
        match = generated ? canonical.match(/^Copy (?:the )?(?:current )?file as (.+)\.$/i) : null;
        if (match) {
          output.push(`${indent}Copy the generated file ${generated} as ${match[1]}.`);
          continue;
        }
        match = generated ? canonical.match(/^Rename (?:the )?(?:current )?file to (.+)\.$/i) : null;
        if (match) {
          output.push(`${indent}Rename the generated file ${generated} to ${match[1]}.`);
          generated = match[1];
          continue;
        }
        if (/^(?:Open|Keep|Remove|Trim|Cut|Convert|Translate|Join|Merge|Combine|Change|Replace|Select|Sort|Align|Compare|Build|Assemble|Annotate|Normalize|Find|Detect|Call|Design|Validate)\b/i.test(canonical)) {
          generated = null;
        }
        output.push(`${indent}${canonical}`);
      }
      return output.join('\n');
    }

    window.FigureLoomBioCurrentFile = Object.freeze({
      ...previous,
      normalizeSource:(source) => previous.normalizeSource(expandGeneratedFiles(source)),
    });

    const handler = async ({ text, context, line, helpers }) => {
      let match;
      if ((match = text.match(/^Use the generated file (.+)$/i))) {
        if (context.files[match[1]] == null) throw new helpers.Error(`I could not find ${match[1]}.`, line);
        context.latestGeneratedFile = match[1];
        return true;
      }
      if ((match = text.match(/^(?:Show|Check) the generated file (.+)$/i))) {
        const content = context.files[match[1]];
        if (content == null) throw new helpers.Error(`I could not find ${match[1]}.`, line);
        helpers.section(text.toLowerCase().startsWith('check') ? 'File check' : 'The file', {
          file:match[1],
          p:[`Type\n${match[1].split('.').pop().toUpperCase()}`, `Size\n${String(content).length} bytes`],
        });
        return true;
      }
      if ((match = text.match(/^Count the generated file (.+)$/i))) {
        const content = context.files[match[1]];
        if (content == null) throw new helpers.Error(`I could not find ${match[1]}.`, line);
        helpers.section('File size', { big:String(content).length, p:['bytes'] });
        return true;
      }
      if ((match = text.match(/^Copy the generated file (.+?) as (.+)$/i))) {
        const content = context.files[match[1]];
        if (content == null) throw new helpers.Error(`I could not find ${match[1]}.`, line);
        const sourceExtension = match[1].match(/\.[^.]+$/)?.[0]?.toLowerCase() || '';
        const targetExtension = match[2].match(/\.[^.]+$/)?.[0]?.toLowerCase() || '';
        if (sourceExtension !== targetExtension) throw new helpers.Error(`Save this generated file with a ${sourceExtension || 'matching'} filename.`, line);
        context.files[match[2]] = content;
        context.latestGeneratedFile = match[2];
        context.changed = 1;
        helpers.section('Saved the file', { file:match[2] });
        return true;
      }
      if ((match = text.match(/^Rename the generated file (.+?) to (.+)$/i))) {
        const content = context.files[match[1]];
        if (content == null) throw new helpers.Error(`I could not find ${match[1]}.`, line);
        const sourceExtension = match[1].match(/\.[^.]+$/)?.[0]?.toLowerCase() || '';
        const targetExtension = match[2].match(/\.[^.]+$/)?.[0]?.toLowerCase() || '';
        if (sourceExtension !== targetExtension) throw new helpers.Error(`Rename this generated file with a ${sourceExtension || 'matching'} filename.`, line);
        context.files[match[2]] = content;
        delete context.files[match[1]];
        context.latestGeneratedFile = match[2];
        context.changed = 1;
        helpers.section('Renamed the file', { file:match[2] });
        return true;
      }
      return false;
    };
    const recognizer = (source) => /(?:Use|Show|Check|Count|Copy|Rename) the generated file /i.test(String(source));
    window.FigureLoomBioStatementHandlers = window.FigureLoomBioStatementHandlers || [];
    window.FigureLoomBioStatementRecognizers = window.FigureLoomBioStatementRecognizers || [];
    window.FigureLoomBioStatementHandlers.push(handler);
    window.FigureLoomBioStatementRecognizers.push(recognizer);
    window.FigureLoomBioGeneratedFiles = Object.freeze({ figureName, expandSource:expandGeneratedFiles });
  });
})();
