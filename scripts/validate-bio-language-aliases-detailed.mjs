import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const sourcePath = path.join(process.cwd(), 'scripts/validate-bio-language-aliases.mjs');
let source = fs.readFileSync(sourcePath, 'utf8');
const assertion = "if (typeof saved[name] !== 'string' || !saved[name].trimStart().startsWith('<svg')) fail(`The browser did not save the real generated SVG ${name}.`);";
const detailedAssertion = "if (typeof saved[name] !== 'string' || !saved[name].trimStart().startsWith('<svg')) { const value = saved[name]; const keys = Object.keys(saved).filter((key) => /(?:svg|scatter|histogram|bar|pca|volcano|heat|box)/i.test(key)); const normalized = windowObject.FigureLoomBioCurrentFile?.normalizeSource?.(program) || program; const at = normalized.toLowerCase().indexOf('scatter'); const excerpt = normalized.slice(Math.max(0, at - 180), at < 0 ? 500 : at + 620); const trace = windowObject.__languageHandlerTrace || []; fail(`The browser did not save the real generated SVG ${name}. Type: ${typeof value}. Prefix: ${JSON.stringify(String(value ?? '').slice(0, 160))}. Source prefix: ${JSON.stringify(String(saved['scatter-plot.svg'] ?? '').slice(0, 160))}. Figure-like keys: ${keys.join(', ') || '(none)'}. Normalized scatter section: ${JSON.stringify(excerpt)}. Handler trace: ${JSON.stringify(trace)}.`); }";
const readyLine = "await windowObject.FigureLoomBioLanguageAliasesReady;";
const tracedReady = `${readyLine}
windowObject.__languageHandlerTrace = [];
windowObject.FigureLoomBioStatementHandlers = (windowObject.FigureLoomBioStatementHandlers || []).map((originalHandler, handlerIndex) => async (payload) => {
  const relevant = /scatter|generated file/i.test(payload.text);
  const before = relevant ? {
    source:String(payload.context.files['scatter-plot.svg'] ?? '').slice(0, 80),
    target:String(payload.context.files['scatter-copy.svg'] ?? '').slice(0, 80),
    latest:payload.context.latestGeneratedFile ?? null,
  } : null;
  const handled = await originalHandler(payload);
  if (relevant && handled) {
    windowObject.__languageHandlerTrace.push({
      handlerIndex,
      text:payload.text,
      handler:String(originalHandler).slice(0, 180),
      before,
      after:{
        source:String(payload.context.files['scatter-plot.svg'] ?? '').slice(0, 80),
        target:String(payload.context.files['scatter-copy.svg'] ?? '').slice(0, 80),
        latest:payload.context.latestGeneratedFile ?? null,
      },
    });
  }
  return handled;
});`;

if (!source.includes(assertion)) {
  throw new Error('The detailed language validator could not find the SVG assertion to enhance.');
}
if (!source.includes(readyLine)) {
  throw new Error('The detailed language validator could not find the alias-ready point to trace handlers.');
}
source = source.replace(assertion, detailedAssertion).replace(readyLine, tracedReady);

const temporary = path.join(process.cwd(), '.validate-bio-language-aliases-detailed.mjs');
fs.writeFileSync(temporary, source, 'utf8');
try {
  await import(`${pathToFileURL(temporary).href}?run=${Date.now()}`);
} finally {
  fs.rmSync(temporary, { force:true });
}
