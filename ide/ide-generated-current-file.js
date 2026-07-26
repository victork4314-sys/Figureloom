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

  const clearsGeneratedFile = (sentence) => /^(?:Open|Keep|Remove|Trim|Cut|Convert|Translate|Join|Merge|Combine|Change|Replace|Select|Sort|Align|Compare|Build|Assemble|Annotate|Normalize|Find|Detect|Call|Design|Validate)\b/i.test(String(sentence));

  ready.then(() => {
    // The alias handler is registered immediately before this promise resolves.
    // Put that specific, vocabulary-driven handler before broad legacy handlers
    // so an older table rule cannot swallow a newer read or figure sentence.
    const registeredHandlers = window.FigureLoomBioStatementHandlers || [];
    if (registeredHandlers.length > 1) {
      registeredHandlers.unshift(registeredHandlers.pop());
    }

    // Older figure handlers predate the current-file model. Wrap every handler
    // that was already registered so any real SVG it creates becomes the file.
    for (let index = 1; index < registeredHandlers.length; index += 1) {
      const original = registeredHandlers[index];
      if (original?.__figureloomGeneratedCurrentWrapper) continue;
      const wrapped = async (payload) => {
        const handled = await original(payload);
        if (handled) {
          const generated = figureName(payload.text);
          if (generated && payload.context?.files?.[generated] != null) {
            payload.context.latestGeneratedFile = generated;
          }
        }
        return handled;
      };
      Object.defineProperty(wrapped, '__figureloomGeneratedCurrentWrapper', { value:true });
      registeredHandlers[index] = wrapped;
    }

    const previous = window.FigureLoomBioCurrentFile;
    if (!previous) return;

    const copyGenerated = (context, helpers, line, source, target, verb = 'Saved') => {
      const content = context.files[source];
      if (content == null) throw new helpers.Error(`I could not find ${source}.`, line);
      const sourceExtension = source.match(/\.[^.]+$/)?.[0]?.toLowerCase() || '';
      const targetExtension = target.match(/\.[^.]+$/)?.[0]?.toLowerCase() || '';
      if (sourceExtension !== targetExtension) throw new helpers.Error(`Use a ${sourceExtension || 'matching'} filename for this generated file.`, line);
      context.files[target] = content;
      context.latestGeneratedFile = target;
      context.changed = 1;
      helpers.section(`${verb} the file`, { file:target });
    };

    const handler = async ({ text, context, line, helpers }) => {
      let match;
      const created = figureName(text);
      if (!created && clearsGeneratedFile(text)) {
        context.latestGeneratedFile = null;
        return false;
      }

      if ((match = text.match(/^Use the generated file (.+)$/i))) {
        if (context.files[match[1]] == null) throw new helpers.Error(`I could not find ${match[1]}.`, line);
        context.latestGeneratedFile = match[1];
        return true;
      }

      const current = context.latestGeneratedFile;
      if (current && (match = text.match(/^Save the (?:file|result) as (.+)$/i))) {
        copyGenerated(context, helpers, line, current, match[1]);
        return true;
      }
      if (current && (match = text.match(/^Copy the (?:current )?file as (.+)$/i))) {
        copyGenerated(context, helpers, line, current, match[1]);
        return true;
      }
      if (current && (match = text.match(/^Rename the (?:current )?file to (.+)$/i))) {
        const source = current;
        copyGenerated(context, helpers, line, source, match[1], 'Renamed');
        delete context.files[source];
        return true;
      }
      if (current && /^(?:Show|Display) (?:the )?(?:current )?(?:file|result)$/i.test(text)) {
        const content = context.files[current];
        if (content == null) throw new helpers.Error(`I could not find ${current}.`, line);
        helpers.section('The file', { file:current, p:[`Type\n${current.split('.').pop().toUpperCase()}`, `Size\n${String(content).length} bytes`] });
        return true;
      }
      if (current && /^Check (?:the )?(?:current )?file$/i.test(text)) {
        const content = context.files[current];
        if (content == null) throw new helpers.Error(`I could not find ${current}.`, line);
        helpers.section('File check', { file:current, p:[`Type\n${current.split('.').pop().toUpperCase()}`, `Size\n${String(content).length} bytes`] });
        return true;
      }
      if (current && /^Count (?:the )?(?:current )?file$/i.test(text)) {
        const content = context.files[current];
        if (content == null) throw new helpers.Error(`I could not find ${current}.`, line);
        helpers.section('File size', { big:String(content).length, p:['bytes'] });
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
      if ((match = text.match(/^FigureLoom internal copy generated file (.+?) to (.+)$/i))) {
        copyGenerated(context, helpers, line, match[1], match[2]);
        return true;
      }
      if ((match = text.match(/^Rename the generated file (.+?) to (.+)$/i))) {
        copyGenerated(context, helpers, line, match[1], match[2], 'Renamed');
        delete context.files[match[1]];
        return true;
      }
      return false;
    };
    const recognizer = (source) => /FigureLoom internal copy generated file |(?:Use|Show|Check|Count|Rename) the generated file |(?:Show|Display|Check|Count|Save|Copy|Rename) (?:the )?(?:current )?(?:file|result)/i.test(String(source));
    window.FigureLoomBioStatementHandlers = window.FigureLoomBioStatementHandlers || [];
    window.FigureLoomBioStatementRecognizers = window.FigureLoomBioStatementRecognizers || [];
    window.FigureLoomBioStatementHandlers.unshift(handler);
    window.FigureLoomBioStatementRecognizers.unshift(recognizer);
    window.FigureLoomBioGeneratedFiles = Object.freeze({ figureName });
  });
})();
