import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const sourcePath = path.join(process.cwd(), 'scripts/validate-bio-language-aliases.mjs');
const source = fs.readFileSync(sourcePath, 'utf8');
const original = "if (typeof saved[name] !== 'string' || !saved[name].trimStart().startsWith('<svg')) fail(`The browser did not save the real generated SVG ${name}.`);";
const replacement = "if (typeof saved[name] !== 'string' || !saved[name].trimStart().startsWith('<svg')) { const value = saved[name]; const keys = Object.keys(saved).filter((key) => /(?:svg|scatter|histogram|bar|pca|volcano|heat|box)/i.test(key)); const normalized = windowObject.FigureLoomBioCurrentFile?.normalizeSource?.(program) || program; const at = normalized.toLowerCase().indexOf('scatter'); const excerpt = normalized.slice(Math.max(0, at - 180), at < 0 ? 500 : at + 620); fail(`The browser did not save the real generated SVG ${name}. Type: ${typeof value}. Prefix: ${JSON.stringify(String(value ?? '').slice(0, 160))}. Figure-like keys: ${keys.join(', ') || '(none)'}. Normalized scatter section: ${JSON.stringify(excerpt)}.`); }";

if (!source.includes(original)) {
  throw new Error('The detailed language validator could not find the SVG assertion to enhance.');
}

const temporary = path.join(process.cwd(), '.validate-bio-language-aliases-detailed.mjs');
fs.writeFileSync(temporary, source.replace(original, replacement), 'utf8');
try {
  await import(`${pathToFileURL(temporary).href}?run=${Date.now()}`);
} finally {
  fs.rmSync(temporary, { force:true });
}
