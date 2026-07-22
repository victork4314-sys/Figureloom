(() => {
const STORAGE_KEY = 'figureloom-bio-ide-files-v1';
const ACTIVE_KEY = 'figureloom-bio-ide-active-v1';
const DELETED_KEY = 'figureloom-bio-ide-deleted-files-v1';
const fileList = document.getElementById('fileList');
const filePicker = document.getElementById('filePicker');
const activeFileLabel = document.getElementById('activeFileLabel');
const programName = document.getElementById('programName');
const editor = document.getElementById('programEditor');
const editorWrap = document.querySelector('.editor-wrap');
const results = document.getElementById('results');
const runStatus = document.getElementById('runStatus');
if (!fileList || !activeFileLabel || !programName || !editor || !editorWrap) return;
const sentencePatterns = [
/^Open the file .+\.$/i,
/^Keep only rows marked .+ under [^.,]+\.$/i,
/^Remove rows marked .+ under [^.,]+\.$/i,
/^Count the rows\.$/i,
/^Show the (?:result|file)\.$/i,
/^Save the result as .+\.$/i,
/^Say .+\.$/i
];
function readFiles() {
try {
const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
if (saved && typeof saved === 'object' && !Array.isArray(saved)) return saved;
} catch {}
return {};
}
function readDeleted() {
try {
const saved = JSON.parse(localStorage.getItem(DELETED_KEY) || '[]');
if (Array.isArray(saved)) return new Set(saved.map((name) => String(name).toLowerCase()));
} catch {}
return new Set();
}
function writeDeleted(deleted) {
try { localStorage.setItem(DELETED_KEY, JSON.stringify(Array.from(deleted))); } catch {}
}
function isDeleted(name, deleted = readDeleted()) {
return deleted.has(String(name).toLowerCase());
}
function looksLikeProgram(source) {
const lines = String(source).split(/\r?\n/)
.map((line) => line.trim())
.filter((line) => line && !line.startsWith('#'));
if (!lines.length) return false;
const matching = lines.filter((line) => sentencePatterns.some((pattern) => pattern.test(line))).length;
return matching > 0 && matching >= Math.ceil(lines.length / 2);
}
function looksLikeDelimitedData(name, source) {
const lower = String(name).toLowerCase();
if (lower.endsWith('.csv') || lower.endsWith('.tsv')) return true;
const lines = String(source).split(/\r?\n/).filter((line) => line.trim()).slice(0, 3);
if (lines.length < 2) return false;
const delimiter = lines[0].includes('\t') ? '\t' : (lines[0].includes(',') ? ',' : '');
return Boolean(delimiter && lines.slice(1).every((line) => line.includes(delimiter)));
}
function normalizedProgramName(name) {
const current = String(name || 'new-program').trim();
if (/\.flbio$/i.test(current)) return current;
if (/\.flbio\.txt$/i.test(current)) return current.replace(/\.flbio\.txt$/i, '.flbio');
const withoutExtension = current.replace(/\.[^.]+$/, '');
return `${withoutExtension || 'new-program'}.flbio`;
}
function normalizeCurrentProgram() {
const activeName = activeFileLabel.textContent.trim();
if (activeName.toLowerCase().endsWith('.flbio')) return true;
if (!looksLikeProgram(editor.value)) return false;
programName.value = normalizedProgramName(activeName || programName.value);
programName.dispatchEvent(new Event('change', { bubbles:true }));
return activeFileLabel.textContent.trim().toLowerCase().endsWith('.flbio');
}
function escapeHtml(value) {
return String(value)
.replaceAll('&', '&amp;')
.replaceAll('<', '&lt;')
.replaceAll('>', '&gt;')
.replaceAll('"', '&quot;')
.replaceAll("'", '&#039;');
}
function token(className, value) {
return `<span class="${className}">${escapeHtml(value)}</span>`;
}
function validLine(parts) {
return `<span class="syntax-valid">${parts.join('')}</span>`;
}
function highlightSentence(sentence) {
let match = sentence.match(/^(Open the file )(.+)(\.)$/i);
if (match) return validLine([token('syntax-command', match[1]), token('syntax-file', match[2]), token('syntax-punctuation', match[3])]);
match = sentence.match(/^(Keep only rows marked )(.+?)( under )([^.,]+)(\.)$/i);
if (match) return validLine([token('syntax-command', match[1]), token('syntax-value', match[2]), token('syntax-word', match[3]), token('syntax-field', match[4]), token('syntax-punctuation', match[5])]);
match = sentence.match(/^(Remove rows marked )(.+?)( under )([^.,]+)(\.)$/i);
if (match) return validLine([token('syntax-command', match[1]), token('syntax-value', match[2]), token('syntax-word', match[3]), token('syntax-field', match[4]), token('syntax-punctuation', match[5])]);
match = sentence.match(/^(Count the rows)(\.)$/i);
if (match) return validLine([token('syntax-command', match[1]), token('syntax-punctuation', match[2])]);
match = sentence.match(/^(Show the (?:result|file))(\.)$/i);
if (match) return validLine([token('syntax-command', match[1]), token('syntax-punctuation', match[2])]);
match = sentence.match(/^(Save the result as )(.+)(\.)$/i);
if (match) return validLine([token('syntax-command', match[1]), token('syntax-file', match[2]), token('syntax-punctuation', match[3])]);
match = sentence.match(/^(Say )(.+)(\.)$/i);
if (match) return validLine([token('syntax-command', match[1]), token('syntax-value', match[2]), token('syntax-punctuation', match[3])]);
return token('syntax-invalid', sentence);
}
function installAutomaticHighlighting() {
for (const existing of document.querySelectorAll('#syntaxHighlight')) existing.remove();
const highlight = document.createElement('pre');
highlight.id = 'syntaxHighlight';
highlight.className = 'syntax-highlight';
highlight.setAttribute('aria-hidden', 'true');
editorWrap.insertBefore(highlight, editor);
function syncScroll() {
highlight.scrollTop = editor.scrollTop;
highlight.scrollLeft = editor.scrollLeft;
}
function render() {
const name = activeFileLabel.textContent.trim();
const colorAsProgram = !looksLikeDelimitedData(name, editor.value);
highlight.innerHTML = editor.value.split('\n').map((line) => {
if (!colorAsProgram) return escapeHtml(line);
if (!line.trim()) return '';
if (line.trimStart().startsWith('#')) return token('syntax-comment', line);
const leading = line.match(/^\s*/)?.[0] || '';
const trailing = line.match(/\s*$/)?.[0] || '';
const middleEnd = trailing ? line.length - trailing.length : line.length;
const middle = line.slice(leading.length, middleEnd);
return `${escapeHtml(leading)}${highlightSentence(middle)}${escapeHtml(trailing)}`;
}).join('\n') + '\n';
syncScroll();
}
editor.addEventListener('input', render);
editor.addEventListener('scroll', syncScroll);
new MutationObserver(render).observe(activeFileLabel, { childList:true, subtree:true, characterData:true });
render();
}
function uniqueBlankName(files, deleted) {
let name = 'new-program.flbio';
let number = 2;
while (Object.prototype.hasOwnProperty.call(files, name) || isDeleted(name, deleted)) {
name = `new-program-${number}.flbio`;
number += 1;
}
return name;
}
function chooseNextFile(files, deleted) {
const names = Object.keys(files).filter((name) => !isDeleted(name, deleted));
names.sort((a, b) => {
const aProgram = a.toLowerCase().endsWith('.flbio');
const bProgram = b.toLowerCase().endsWith('.flbio');
if (aProgram !== bProgram) return aProgram ? -1 : 1;
return a.localeCompare(b);
});
return names[0] || null;
}
function showDeletedReference(name) {
if (!results) return;
results.replaceChildren();
const section = document.createElement('section');
section.className = 'result-section error';
const heading = document.createElement('h3');
heading.textContent = 'Could not run the program';
const message = document.createElement('p');
message.textContent = `${name} was deleted.\n\nOpen another file or change the instruction that uses it.`;
section.append(heading, message);
results.append(section);
if (runStatus) {
runStatus.textContent = 'Needs attention';
runStatus.className = 'status-pill error';
}
}
function referencedDeletedFile() {
const deleted = readDeleted();
for (const line of editor.value.split(/\r?\n/)) {
const match = line.trim().match(/^Open the file (.+)\.$/i);
if (match && isDeleted(match[1].trim(), deleted)) return match[1].trim();
}
return null;
}
function deleteWorkspaceFile(name) {
if (!window.confirm(`Delete ${name}?`)) return;
const files = readFiles();
const deleted = readDeleted();
const matchingName = Object.keys(files).find((fileName) => fileName.toLowerCase() === name.toLowerCase());
if (matchingName) delete files[matchingName];
deleted.add(name.toLowerCase());
const activeName = activeFileLabel.textContent.trim();
let nextName = activeName;
if (activeName.toLowerCase() === name.toLowerCase()) {
nextName = chooseNextFile(files, deleted);
if (!nextName) {
nextName = uniqueBlankName(files, deleted);
files[nextName] = 'Say Starting the analysis.\n';
}
activeFileLabel.textContent = nextName;
programName.value = nextName;
editor.value = files[nextName] || '';
}
try {
localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
localStorage.setItem(ACTIVE_KEY, nextName);
writeDeleted(deleted);
} catch {}
window.location.reload();
}
let decorating = false;
function decorateFileRows() {
if (decorating) return;
decorating = true;
const deleted = readDeleted();
for (const item of Array.from(fileList.children)) {
if (!(item instanceof HTMLElement) || !item.matches('.file-item[data-file]')) continue;
const name = item.dataset.file || '';
if (isDeleted(name, deleted)) {
item.remove();
continue;
}
const row = document.createElement('div');
row.className = 'file-row';
item.before(row);
row.append(item);
const remove = document.createElement('button');
remove.type = 'button';
remove.className = 'file-delete-button';
remove.setAttribute('aria-label', `Delete ${name}`);
remove.title = `Delete ${name}`;
remove.textContent = '×';
remove.addEventListener('click', (event) => {
event.preventDefault();
event.stopPropagation();
deleteWorkspaceFile(name);
});
row.append(remove);
}
decorating = false;
}
new MutationObserver(decorateFileRows).observe(fileList, { childList:true });
decorateFileRows();
if (filePicker) {
filePicker.addEventListener('change', () => {
const deleted = readDeleted();
for (const file of Array.from(filePicker.files || [])) {
deleted.delete(file.name.toLowerCase());
if (/\.flbio\.txt$/i.test(file.name)) deleted.delete(file.name.replace(/\.txt$/i, '').toLowerCase());
}
writeDeleted(deleted);
}, true);
}
window.addEventListener('click', (event) => {
const target = event.target instanceof Element ? event.target : null;
if (target?.closest('#exampleButton')) {
const deleted = readDeleted();
deleted.delete('example.flbio');
deleted.delete('example-samples.csv');
writeDeleted(deleted);
}
if (!target?.closest('#runButton')) return;
normalizeCurrentProgram();
const missing = referencedDeletedFile();
if (!missing) return;
event.preventDefault();
event.stopImmediatePropagation();
showDeletedReference(missing);
}, true);
document.addEventListener('keydown', (event) => {
const command = event.ctrlKey || event.metaKey;
if (!command || event.key !== 'Enter') return;
normalizeCurrentProgram();
const missing = referencedDeletedFile();
if (!missing) return;
event.preventDefault();
event.stopImmediatePropagation();
showDeletedReference(missing);
}, true);
window.setTimeout(installAutomaticHighlighting, 0);
})();
