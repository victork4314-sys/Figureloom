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

  ready.then((aliases) => {
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
        if (clearsGeneratedFile(canonical)) generated = null;
        output.push(`${indent}${canonical}`);
      }
      return output.join('\n');
    }

    window.FigureLoomBioCurrentFile = Object.freeze({
      ...previous,
      normalizeSource:(source) => previous.normalizeSource(expandGeneratedFiles(source)),
    });

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
      if ((match = text.match(/^Copy the generated file (.+?) as (.+)$/i))) {
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
    const recognizer = (source) => /(?:Use|Show|Check|Count|Copy|Rename) the generated file |(?:Show|Display|Check|Count|Save|Copy|Rename) (?:the )?(?:current )?(?:file|result)/i.test(String(source));
    window.FigureLoomBioStatementHandlers = window.FigureLoomBioStatementHandlers || [];
    window.FigureLoomBioStatementRecognizers = window.FigureLoomBioStatementRecognizers || [];
    window.FigureLoomBioStatementHandlers.unshift(handler);
    window.FigureLoomBioStatementRecognizers.unshift(recognizer);
    window.FigureLoomBioGeneratedFiles = Object.freeze({ figureName, expandSource:expandGeneratedFiles });
  });
})();
