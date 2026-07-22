(() => {
'use strict';
const FILES_KEY = 'figureloom-bio-ide-files-v1';
const ACTIVE_KEY = 'figureloom-bio-ide-active-v1';
const DELETED_KEY = 'figureloom-bio-ide-deleted-files-v1';
const RESULTS_KEY = 'figureloom-bio-ide-results-v1';
const RUN_STATUS_KEY = 'figureloom-bio-ide-run-status-v1';
const THEME_KEY = 'figureloom-interface-theme-v1';
const MAX_BROWSER_RUNS = 100;
const FASTA_EXTENSIONS = ['.fa', '.fasta', '.fna', '.ffn', '.faa', '.frn'];
const FASTQ_EXTENSIONS = ['.fq', '.fastq'];
const TABLE_EXTENSIONS = ['.csv', '.tsv'];
const exampleProgram = `Say Starting the example.
Open the file example-samples.csv.
Keep only rows marked treated under condition.
Remove rows marked failed under status.
Count the rows.
Show the result.
Save the result as example-result.csv.
Say The example is finished.
`;
const exampleData = `sample,condition,status
sample-01,treated,passed
sample-02,control,passed
sample-03,treated,failed
sample-04,treated,passed
sample-05,control,failed
`;
const exampleFastq = `@read-01
ACGTACGTACGT
+
IIIIIIIIIIII
@read-02
ACGTNN
+
!!!!!!
@read-03
TTGCAACGTTAA
+
HHHHHHHHHHHH
`;
const fastqProgram = `Run this program 10 times.
Say Cleaning the reads.
Open the file example-reads.fastq.
Keep reads with average quality at least 20.
Remove reads shorter than 8 bases.
Trim 2 bases from the start.
Count the reads.
Calculate the GC content.
Save the reads as cleaned-reads.fastq.
Say The reads are ready.
`;
const defaults = {
'example.flbio': exampleProgram,
'example-samples.csv': exampleData,
'fastq-example.flbio': fastqProgram,
'example-reads.fastq': exampleFastq
};
const elements = {
programName: document.getElementById('programName'),
saveStatus: document.getElementById('saveStatus'),
themeButton: document.getElementById('themeButton'),
runButton: document.getElementById('runButton'),
newButton: document.getElementById('newButton'),
openButton: document.getElementById('openButton'),
saveButton: document.getElementById('saveButton'),
filePicker: document.getElementById('filePicker'),
addFileButton: document.getElementById('addFileButton'),
formatButton: document.getElementById('formatButton'),
clearResultsButton: document.getElementById('clearResultsButton'),
exampleButton: document.getElementById('exampleButton'),
fileList: document.getElementById('fileList'),
activeFileLabel: document.getElementById('activeFileLabel'),
editor: document.getElementById('programEditor'),
editorWrap: document.querySelector('.editor-wrap'),
lineNumbers: document.getElementById('lineNumbers'),
cursorStatus: document.getElementById('cursorStatus'),
results: document.getElementById('results'),
runStatus: document.getElementById('runStatus'),
builderButton: document.getElementById('builderButton'),
builder: document.getElementById('programBuilder'),
builderClose: document.getElementById('builderClose'),
builderName: document.getElementById('builderName'),
builderRuns: document.getElementById('builderRuns'),
builderPreset: document.getElementById('builderPreset'),
builderLoadPreset: document.getElementById('builderLoadPreset'),
builderStepType: document.getElementById('builderStepType'),
builderFields: document.getElementById('builderFields'),
builderAddStep: document.getElementById('builderAddStep'),
builderSteps: document.getElementById('builderSteps'),
builderClear: document.getElementById('builderClear'),
builderDownload: document.getElementById('builderDownload'),
builderUse: document.getElementById('builderUse')
};
if (!elements.editor || !elements.fileList || !elements.results || !elements.runButton) return;
class PlainError extends Error {
constructor(message, lineNumber = null) {
super(message);
this.lineNumber = lineNumber;
}
}
function safeObject(value) {
return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}
function readJson(key, fallback) {
try {
const parsed = JSON.parse(localStorage.getItem(key) || 'null');
return parsed === null ? fallback : parsed;
} catch {
return fallback;
}
}
let files = safeObject(readJson(FILES_KEY, {}));
let deleted = new Set(
Array.isArray(readJson(DELETED_KEY, []))
? readJson(DELETED_KEY, []).map((name) => String(name).toLowerCase())
: []
);
if (!Object.keys(files).some((name) => !deleted.has(name.toLowerCase()))) {
files = { ...defaults };
deleted.clear();
}
let activeFile = localStorage.getItem(ACTIVE_KEY) || '';
if (!Object.prototype.hasOwnProperty.call(files, activeFile) || deleted.has(activeFile.toLowerCase())) {
activeFile = chooseFirstFile();
}
let highlight = document.getElementById('syntaxHighlight');
if (!highlight && elements.editorWrap) {
highlight = document.createElement('pre');
highlight.id = 'syntaxHighlight';
highlight.className = 'syntax-highlight';
highlight.setAttribute('aria-hidden', 'true');
elements.editorWrap.insertBefore(highlight, elements.editor);
}
function persistWorkspace() {
try {
localStorage.setItem(FILES_KEY, JSON.stringify(files));
localStorage.setItem(ACTIVE_KEY, activeFile);
localStorage.setItem(DELETED_KEY, JSON.stringify(Array.from(deleted)));
if (elements.saveStatus) elements.saveStatus.textContent = 'Saved in this browser';
} catch {
if (elements.saveStatus) elements.saveStatus.textContent = 'Could not save in this browser';
}
}
function persistResults() {
try {
localStorage.setItem(RESULTS_KEY, elements.results.innerHTML);
localStorage.setItem(RUN_STATUS_KEY, JSON.stringify({
text: elements.runStatus?.textContent || 'Ready',
className: elements.runStatus?.className || 'status-pill'
}));
} catch {}
}
function restoreResults() {
const saved = localStorage.getItem(RESULTS_KEY);
if (saved && /(?:result-section|empty-results|repeat-run-group)/.test(saved)) {
elements.results.innerHTML = saved;
}
const status = safeObject(readJson(RUN_STATUS_KEY, {}));
if (elements.runStatus && status.text) {
elements.runStatus.textContent = status.text;
elements.runStatus.className = status.className || 'status-pill';
}
}
function visibleNames() {
return Object.keys(files).filter((name) => !deleted.has(name.toLowerCase()));
}
function chooseFirstFile() {
const names = visibleNames();
names.sort((left, right) => {
const leftProgram = looksLikeProgramName(left);
const rightProgram = looksLikeProgramName(right);
if (leftProgram !== rightProgram) return leftProgram ? -1 : 1;
return left.localeCompare(right);
});
return names[0] || createBlankProgram(false);
}
function matchingName(requested) {
const lower = String(requested).toLowerCase();
return Object.keys(files).find((name) => name.toLowerCase() === lower) || null;
}
function uniqueName(requested) {
if (!matchingName(requested) || deleted.has(requested.toLowerCase())) return requested;
const dot = requested.lastIndexOf('.');
const stem = dot > 0 ? requested.slice(0, dot) : requested;
const extension = dot > 0 ? requested.slice(dot) : '';
let number = 2;
let candidate = `${stem}-${number}${extension}`;
while (matchingName(candidate) && !deleted.has(candidate.toLowerCase())) {
number += 1;
candidate = `${stem}-${number}${extension}`;
}
return candidate;
}
function looksLikeProgramName(name) {
return /\.flbio(?:\.txt)?$/i.test(name);
}
function looksLikeProgram(source) {
const lines = String(source).split(/\r?\n/)
.map((line) => line.trim())
.filter((line) => line && !line.startsWith('#'));
if (!lines.length) return false;
const matching = lines.filter((line) => {
try {
parseInstruction({ sentence: line.replace(/\.$/, ''), lineNumber: 1 });
return line.endsWith('.');
} catch {
return false;
}
}).length;
return matching > 0 && matching >= Math.ceil(lines.length / 2);
}
function isTableName(name) {
const lower = name.toLowerCase();
return TABLE_EXTENSIONS.some((extension) => lower.endsWith(extension));
}
function isFastaName(name) {
const lower = name.toLowerCase();
return FASTA_EXTENSIONS.some((extension) => lower.endsWith(extension));
}
function isFastqName(name) {
const lower = name.toLowerCase();
return FASTQ_EXTENSIONS.some((extension) => lower.endsWith(extension));
}
function fileKind(name) {
if (looksLikeProgramName(name)) return 'Program';
if (name.toLowerCase().endsWith('.csv')) return 'CSV file';
if (name.toLowerCase().endsWith('.tsv')) return 'TSV file';
if (isFastaName(name)) return 'FASTA file';
if (isFastqName(name)) return 'FASTQ file';
return 'Text file';
}
function fileGlyph(name) {
if (looksLikeProgramName(name)) return '●';
if (isTableName(name)) return '▦';
if (isFastaName(name) || isFastqName(name)) return '⌁';
return '□';
}
function renderFileList() {
elements.fileList.replaceChildren();
const names = visibleNames().sort((left, right) => {
const leftProgram = looksLikeProgramName(left);
const rightProgram = looksLikeProgramName(right);
if (leftProgram !== rightProgram) return leftProgram ? -1 : 1;
return left.localeCompare(right);
});
for (const name of names) {
const row = document.createElement('div');
row.className = 'file-row';
const button = document.createElement('button');
button.type = 'button';
button.className = `file-item${name === activeFile ? ' active' : ''}`;
button.dataset.file = name;
const icon = document.createElement('span');
icon.className = 'file-icon';
icon.textContent = fileGlyph(name);
const copy = document.createElement('span');
copy.className = 'file-copy';
const strong = document.createElement('strong');
strong.textContent = name;
const small = document.createElement('span');
small.textContent = fileKind(name);
copy.append(strong, small);
button.append(icon, copy);
button.addEventListener('click', () => activateFile(name));
const remove = document.createElement('button');
remove.type = 'button';
remove.className = 'file-delete-button';
remove.setAttribute('aria-label', `Delete ${name}`);
remove.title = `Delete ${name}`;
remove.textContent = '×';
remove.addEventListener('click', () => deleteFile(name));
row.append(button, remove);
elements.fileList.append(row);
}
}
function saveEditor() {
if (!activeFile) return;
files[activeFile] = elements.editor.value;
persistWorkspace();
}
function activateFile(name) {
if (!Object.prototype.hasOwnProperty.call(files, name) || deleted.has(name.toLowerCase())) return;
if (activeFile && activeFile !== name) files[activeFile] = elements.editor.value;
activeFile = name;
elements.editor.value = files[name] || '';
if (elements.programName) elements.programName.value = name;
if (elements.activeFileLabel) elements.activeFileLabel.textContent = name;
persistWorkspace();
renderFileList();
refreshEditor();
elements.editor.focus();
}
function createBlankProgram(activate = true) {
const name = uniqueName('new-program.flbio');
deleted.delete(name.toLowerCase());
files[name] = 'Say Starting the analysis.\n';
if (activate) activateFile(name);
return name;
}
function deleteFile(name) {
if (!window.confirm(`Delete ${name}?`)) return;
saveEditor();
const actual = matchingName(name);
if (actual) delete files[actual];
deleted.add(name.toLowerCase());
if (activeFile.toLowerCase() === name.toLowerCase()) {
activeFile = visibleNames()[0] || createBlankProgram(false);
elements.editor.value = files[activeFile] || '';
if (elements.programName) elements.programName.value = activeFile;
if (elements.activeFileLabel) elements.activeFileLabel.textContent = activeFile;
}
persistWorkspace();
renderFileList();
refreshEditor();
}
function normalizeProgramFilename(name) {
const entered = String(name || 'new-program').trim();
if (/\.flbio$/i.test(entered)) return entered;
if (/\.flbio\.txt$/i.test(entered)) return entered.replace(/\.txt$/i, '');
const withoutExtension = entered.replace(/\.[^.]+$/, '');
return `${withoutExtension || 'new-program'}.flbio`;
}
function renameActiveFile() {
const requestedRaw = elements.programName?.value.trim() || activeFile;
let requested = requestedRaw;
if (looksLikeProgram(files[activeFile] ?? elements.editor.value) || looksLikeProgramName(activeFile)) {
requested = normalizeProgramFilename(requestedRaw);
}
if (!requested || requested === activeFile) {
if (elements.programName) elements.programName.value = activeFile;
return;
}
const collision = matchingName(requested);
if (collision && collision !== activeFile && !deleted.has(collision.toLowerCase())) {
if (elements.programName) elements.programName.value = activeFile;
showError('This filename is already being used.');
return;
}
files[activeFile] = elements.editor.value;
files[requested] = files[activeFile];
if (requested !== activeFile) delete files[activeFile];
deleted.delete(requested.toLowerCase());
activeFile = requested;
if (elements.programName) elements.programName.value = requested;
if (elements.activeFileLabel) elements.activeFileLabel.textContent = requested;
persistWorkspace();
renderFileList();
refreshEditor();
}
async function importPickedFiles() {
const picked = Array.from(elements.filePicker?.files || []);
if (!picked.length) return;
saveEditor();
let first = null;
let firstProgram = null;
for (const file of picked) {
const source = await file.text();
let requested = file.name || 'opened-file.txt';
if (/\.flbio\.txt$/i.test(requested)) requested = requested.replace(/\.txt$/i, '');
if (looksLikeProgram(source) && !looksLikeProgramName(requested)) {
requested = normalizeProgramFilename(requested);
}
const lower = requested.toLowerCase();
let name;
if (deleted.has(lower)) {
const hidden = matchingName(requested);
if (hidden) delete files[hidden];
deleted.delete(lower);
name = requested;
} else {
name = uniqueName(requested);
}
files[name] = source;
if (!first) first = name;
if (!firstProgram && looksLikeProgram(source)) firstProgram = name;
}
if (elements.filePicker) elements.filePicker.value = '';
persistWorkspace();
renderFileList();
activateFile(firstProgram || first || activeFile);
}
function exactDownloadName(name) {
return /\.flbio(?:\.txt)?$/i.test(name)
? name.replace(/\.flbio(?:\.txt)?$/i, '.flbio')
: name;
}
function mimeType(name) {
if (looksLikeProgramName(name)) return 'application/octet-stream';
if (name.toLowerCase().endsWith('.csv')) return 'text/csv;charset=utf-8';
if (name.toLowerCase().endsWith('.tsv')) return 'text/tab-separated-values;charset=utf-8';
return 'text/plain;charset=utf-8';
}
function downloadText(name, content) {
const filename = exactDownloadName(name);
const blob = new Blob([content], { type: mimeType(filename) });
const url = URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = filename;
document.body.append(link);
link.click();
link.remove();
setTimeout(() => URL.revokeObjectURL(url), 0);
}
function downloadActiveFile() {
saveEditor();
downloadText(activeFile, files[activeFile] || '');
if (elements.saveStatus) elements.saveStatus.textContent = `Saved as ${exactDownloadName(activeFile)}`;
}
function updateLineNumbers() {
const count = Math.max(1, elements.editor.value.split('\n').length);
if (elements.lineNumbers) {
elements.lineNumbers.textContent = Array.from({ length: count }, (_, index) => index + 1).join('\n');
elements.lineNumbers.scrollTop = elements.editor.scrollTop;
elements.lineNumbers.style.height = '100%';
}
if (elements.editorWrap) {
const digits = String(count).length;
elements.editorWrap.style.setProperty('--line-number-width', `${Math.max(52, 34 + digits * 10)}px`);
}
}
function updateCursorStatus() {
if (!elements.cursorStatus) return;
const before = elements.editor.value.slice(0, elements.editor.selectionStart);
elements.cursorStatus.textContent = `Line ${before.split('\n').length}`;
}
function syncScroll() {
if (highlight) {
highlight.scrollTop = elements.editor.scrollTop;
highlight.scrollLeft = elements.editor.scrollLeft;
}
if (elements.lineNumbers) elements.lineNumbers.scrollTop = elements.editor.scrollTop;
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
function valid(parts) {
return `<span class="syntax-valid">${parts.join('')}</span>`;
}
function highlightSentence(sentence) {
const rules = [
[/^(Run this program )([1-9][0-9]*)( times?)(\.)$/i, ['command', 'value', 'command', 'punctuation']],
[/^(Open the file )(.+)(\.)$/i, ['command', 'file', 'punctuation']],
[/^(Keep only rows marked )(.+?)( under )([^.,]+)(\.)$/i, ['command', 'value', 'word', 'field', 'punctuation']],
[/^(Remove rows marked )(.+?)( under )([^.,]+)(\.)$/i, ['command', 'value', 'word', 'field', 'punctuation']],
[/^(Keep only the columns )(.+)(\.)$/i, ['command', 'field', 'punctuation']],
[/^(Rename the column )(.+?)( to )(.+)(\.)$/i, ['command', 'field', 'word', 'field', 'punctuation']],
[/^(Put the rows in order by )(.+)(\.)$/i, ['command', 'field', 'punctuation']],
[/^(Put the (?:largest|smallest) )(.+?)( first)(\.)$/i, ['command', 'field', 'command', 'punctuation']],
[/^(Remove duplicate rows using )(.+)(\.)$/i, ['command', 'field', 'punctuation']],
[/^(Replace empty values under )(.+?)( with )(.+)(\.)$/i, ['command', 'field', 'word', 'value', 'punctuation']],
[/^(Combine it with )(.+)( using )([^.,]+)(\.)$/i, ['command', 'file', 'word', 'field', 'punctuation']],
[/^(Change )(.+?)( to )(.+?)( under )([^.,]+)(\.)$/i, ['command', 'value', 'word', 'value', 'word', 'field', 'punctuation']],
[/^(Count the (?:rows|sequences|reads|bases))(\.)$/i, ['command', 'punctuation']],
[/^(Show the (?:result|file|sequences|reads|sequence names))(\.)$/i, ['command', 'punctuation']],
[/^(Keep (?:sequences|reads) at least )([1-9][0-9]*)( bases long)(\.)$/i, ['command', 'value', 'command', 'punctuation']],
[/^(Remove (?:sequences|reads) shorter than )([1-9][0-9]*)( bases)(\.)$/i, ['command', 'value', 'command', 'punctuation']],
[/^(Keep reads with average quality at least )([0-9]+(?:\.[0-9]+)?)(\.)$/i, ['command', 'value', 'punctuation']],
[/^(Remove reads with average quality below )([0-9]+(?:\.[0-9]+)?)(\.)$/i, ['command', 'value', 'punctuation']],
[/^(Trim )([1-9][0-9]*)( bases from the (?:start|end))(\.)$/i, ['command', 'value', 'command', 'punctuation']],
[/^(Keep sequences containing )(.+)(\.)$/i, ['command', 'value', 'punctuation']],
[/^(Remove sequences containing )(.+)(\.)$/i, ['command', 'value', 'punctuation']],
[/^((?:Convert the sequences to (?:RNA|DNA)|Find the reverse complement|Translate the sequences|Calculate the GC content))(\.)$/i, ['command', 'punctuation']],
[/^(Compare (?:the sequences|it) with )(.+)(\.)$/i, ['command', 'file', 'punctuation']],
[/^(Save the (?:result|sequences|reads) as )(.+)(\.)$/i, ['command', 'file', 'punctuation']],
[/^(Say )(.+)(\.)$/i, ['command', 'value', 'punctuation']]
];
for (const [pattern, classes] of rules) {
const match = sentence.match(pattern);
if (!match) continue;
return valid(match.slice(1).map((part, index) => token(`syntax-${classes[index]}`, part)));
}
return token('syntax-invalid', sentence);
}
function looksLikeData(name, source) {
if (isTableName(name) || isFastaName(name) || isFastqName(name)) return true;
const trimmed = source.trimStart();
if (trimmed.startsWith('>') || /^@[^\n]+\n[^\n]+\n\+/m.test(trimmed)) return true;
const lines = source.split(/\r?\n/).filter((line) => line.trim()).slice(0, 3);
if (lines.length >= 2) {
const delimiter = lines[0].includes('\t') ? '\t' : (lines[0].includes(',') ? ',' : '');
if (delimiter && lines.slice(1).every((line) => line.includes(delimiter))) return true;
}
return false;
}
function renderHighlight() {
if (!highlight) return;
const colorAsProgram = !looksLikeData(activeFile, elements.editor.value);
highlight.innerHTML = elements.editor.value.split('\n').map((line) => {
if (!colorAsProgram) return escapeHtml(line);
if (!line.trim()) return '';
if (line.trimStart().startsWith('#')) return token('syntax-comment', line);
const leading = line.match(/^\s*/)?.[0] || '';
const trailing = line.match(/\s*$/)?.[0] || '';
const end = trailing ? line.length - trailing.length : line.length;
const middle = line.slice(leading.length, end);
return `${escapeHtml(leading)}${highlightSentence(middle)}${escapeHtml(trailing)}`;
}).join('\n') + '\n';
syncScroll();
}
function refreshEditor() {
updateLineNumbers();
updateCursorStatus();
renderHighlight();
syncScroll();
}
const instructionPatterns = [
['repeat', /^Run this program ([1-9][0-9]*) times?$/i],
['open', /^Open the file (.+)$/i],
['keep', /^Keep only rows marked (.+) under ([^.,]+)$/i],
['remove', /^Remove rows marked (.+) under ([^.,]+)$/i],
['keepColumns', /^Keep only the columns (.+)$/i],
['renameColumn', /^Rename the column (.+?) to (.+)$/i],
['orderRows', /^Put the rows in order by (.+)$/i],
['largestFirst', /^Put the largest (.+) first$/i],
['smallestFirst', /^Put the smallest (.+) first$/i],
['removeDuplicates', /^Remove duplicate rows using (.+)$/i],
['replaceEmpty', /^Replace empty values under (.+?) with (.+)$/i],
['combine', /^Combine it with (.+) using ([^.,]+)$/i],
['changeValue', /^Change (.+?) to (.+?) under ([^.,]+)$/i],
['countRows', /^Count the rows$/i],
['countSequences', /^Count the (?:sequences|reads)$/i],
['countBases', /^Count the bases$/i],
['showNames', /^Show the sequence names$/i],
['showSequences', /^Show the (?:sequences|reads)$/i],
['keepMinLength', /^Keep (?:sequences|reads) at least ([1-9][0-9]*) bases long$/i],
['removeShorter', /^Remove (?:sequences|reads) shorter than ([1-9][0-9]*) bases$/i],
['keepQuality', /^Keep reads with average quality at least ([0-9]+(?:\.[0-9]+)?)$/i],
['removeQuality', /^Remove reads with average quality below ([0-9]+(?:\.[0-9]+)?)$/i],
['trimStart', /^Trim ([1-9][0-9]*) bases from the start$/i],
['trimEnd', /^Trim ([1-9][0-9]*) bases from the end$/i],
['keepMotif', /^Keep sequences containing (.+)$/i],
['removeMotif', /^Remove sequences containing (.+)$/i],
['toRna', /^Convert the sequences to RNA$/i],
['toDna', /^Convert the sequences to DNA$/i],
['reverseComplement', /^Find the reverse complement$/i],
['translate', /^Translate the sequences$/i],
['gcContent', /^Calculate the GC content$/i],
['compare', /^Compare (?:the sequences|it) with (.+)$/i],
['show', /^Show the (?:result|file)$/i],
['saveSequences', /^Save the (?:sequences|reads) as (.+)$/i],
['save', /^Save the result as (.+)$/i],
['say', /^Say (.+)$/i]
];
function splitInstructions(source) {
const instructions = [];
source.split(/\r?\n/).forEach((rawLine, index) => {
const lineNumber = index + 1;
const text = rawLine.trim();
if (!text || text.startsWith('#')) return;
if (!text.endsWith('.')) {
throw new PlainError(`This instruction needs a period at the end.\n\nI read: ${text}`, lineNumber);
}
instructions.push(parseInstruction({ sentence: text.slice(0, -1).trim(), lineNumber }));
});
return instructions;
}
function parseInstruction(item) {
for (const [action, pattern] of instructionPatterns) {
const match = item.sentence.match(pattern);
if (match) return { action, values: match.slice(1).map((value) => value.trim()), lineNumber: item.lineNumber };
}
throw new PlainError(
`I do not understand this instruction yet.\n\nI read: ${item.sentence}.\n\nTry writing it as one plain instruction, such as:\nOpen the file reads.fastq.`,
item.lineNumber
);
}
function parseDelimited(text, delimiter) {
const records = [];
let record = [];
let field = '';
let quoted = false;
for (let index = 0; index < text.length; index += 1) {
const character = text[index];
if (quoted) {
if (character === '"') {
if (text[index + 1] === '"') {
field += '"';
index += 1;
} else quoted = false;
} else field += character;
} else if (character === '"' && field === '') quoted = true;
else if (character === delimiter) {
record.push(field);
field = '';
} else if (character === '\n') {
record.push(field.replace(/\r$/, ''));
records.push(record);
record = [];
field = '';
} else field += character;
}
if (field.length || record.length) {
record.push(field.replace(/\r$/, ''));
records.push(record);
}
const nonEmpty = records.filter((row) => row.some((value) => value !== ''));
if (!nonEmpty.length) throw new PlainError('The file is empty.');
const columns = nonEmpty[0].map((column) => column.trim());
if (columns.some((column) => !column)) throw new PlainError('The file contains an empty column name.');
return {
kind: 'table',
columns,
rows: nonEmpty.slice(1).map((values) => Object.fromEntries(columns.map((column, index) => [column, values[index] ?? '']))),
delimiter
};
}
function encodeDelimited(data) {
const escape = (value) => {
const text = String(value ?? '');
return text.includes(data.delimiter) || /["\r\n]/.test(text)
? `"${text.replaceAll('"', '""')}"`
: text;
};
const lines = [data.columns.map(escape).join(data.delimiter)];
for (const row of data.rows) lines.push(data.columns.map((column) => escape(row[column])).join(data.delimiter));
return `${lines.join('\n')}\n`;
}
function parseFasta(text, name) {
const records = [];
let current = null;
for (const raw of text.split(/\r?\n/)) {
const line = raw.trim();
if (!line) continue;
if (line.startsWith('>')) {
if (current) records.push(current);
const header = line.slice(1).trim();
if (!header) throw new PlainError(`${name} contains a FASTA header without a name.`);
const space = header.search(/\s/);
current = {
name: space < 0 ? header : header.slice(0, space),
description: space < 0 ? '' : header.slice(space + 1).trim(),
sequence: '',
quality: null
};
} else {
if (!current) throw new PlainError(`${name} contains sequence text before its first FASTA header.`);
current.sequence += line.replace(/\s/g, '').toUpperCase();
}
}
if (current) records.push(current);
if (!records.length) throw new PlainError(`${name} does not contain any FASTA sequences.`);
return { kind: 'sequences', format: 'fasta', records };
}
function parseFastq(text, name) {
const lines = text.split(/\r?\n/);
const records = [];
let index = 0;
while (index < lines.length) {
if (!lines[index].trim()) {
index += 1;
continue;
}
if (index + 3 >= lines.length) throw new PlainError(`${name} ends in the middle of a FASTQ record.`);
const header = lines[index].trim();
const sequence = lines[index + 1].trim().toUpperCase();
const plus = lines[index + 2].trim();
const quality = lines[index + 3].replace(/\r$/, '');
if (!header.startsWith('@') || !plus.startsWith('+')) {
throw new PlainError(`${name} contains a FASTQ record with a missing @ header or + line.`);
}
if (sequence.length !== quality.length) {
throw new PlainError(`${name} contains a read whose sequence and quality have different lengths.`);
}
const headerText = header.slice(1).trim();
const space = headerText.search(/\s/);
records.push({
name: space < 0 ? headerText : headerText.slice(0, space),
description: space < 0 ? '' : headerText.slice(space + 1).trim(),
sequence,
quality
});
index += 4;
}
if (!records.length) throw new PlainError(`${name} does not contain any FASTQ reads.`);
return { kind: 'sequences', format: 'fastq', records };
}
function encodeSequences(data, outputName) {
if (isFastaName(outputName)) {
const lines = [];
for (const record of data.records) {
lines.push(`>${record.name}${record.description ? ` ${record.description}` : ''}`);
lines.push(record.sequence);
}
return `${lines.join('\n')}\n`;
}
if (isFastqName(outputName)) {
if (data.records.some((record) => record.quality === null || record.quality === undefined)) {
throw new PlainError('This result no longer has FASTQ quality scores.\n\nSave it as a FASTA file instead.');
}
const lines = [];
for (const record of data.records) {
lines.push(`@${record.name}${record.description ? ` ${record.description}` : ''}`);
lines.push(record.sequence, '+', record.quality || '');
}
return `${lines.join('\n')}\n`;
}
throw new PlainError(`I cannot save the sequences as ${outputName}.\n\nUse a FASTA or FASTQ filename.`);
}
function findColumn(data, requested, lineNumber) {
const actual = data.columns.find((column) => column.toLowerCase() === requested.toLowerCase());
if (!actual) throw new PlainError(`I could not find a column called ${requested}.\n\nI found these columns:\n${data.columns.join('\n')}`, lineNumber);
return actual;
}
function naturalList(text) {
let cleaned = text.trim().replace(/,\s+and\s+/i, ', ');
if (!cleaned.includes(',') && /\s+and\s+/i.test(cleaned)) cleaned = cleaned.replace(/\s+and\s+/i, ', ');
return cleaned.split(',').map((item) => item.trim()).filter(Boolean);
}
function averageQuality(record) {
if (!record.quality) return 0;
return Array.from(record.quality).reduce((sum, character) => sum + character.charCodeAt(0) - 33, 0) / record.quality.length;
}
function requireSequences(data, lineNumber) {
if (!data || data.kind !== 'sequences') throw new PlainError('There is no open sequence file yet.\n\nStart with an instruction such as:\nOpen the file reads.fastq.', lineNumber);
return data;
}
function requireTable(data, lineNumber) {
if (!data || data.kind !== 'table') throw new PlainError('There is no open table yet.\n\nStart with an instruction such as:\nOpen the file samples.csv.', lineNumber);
return data;
}
function addSection(target, title, options = {}) {
const section = document.createElement('section');
section.className = `result-section${options.kind ? ` ${options.kind}` : ''}`;
const heading = document.createElement('h3');
heading.textContent = title;
section.append(heading);
for (const paragraphText of options.paragraphs || []) {
const paragraph = document.createElement('p');
paragraph.textContent = paragraphText;
section.append(paragraph);
}
if (options.bigValue !== undefined) {
const big = document.createElement('p');
big.className = 'big-value';
big.textContent = options.bigValue;
section.append(big);
}
if (options.table) appendTable(section, options.table);
if (options.file) {
const file = document.createElement('div');
file.className = 'result-file';
const strong = document.createElement('strong');
strong.textContent = options.file.name;
const span = document.createElement('span');
span.textContent = options.file.description || 'Saved in Files';
file.append(strong, span);
section.append(file);
}
target.append(section);
return section;
}
function appendTable(section, table) {
const wrap = document.createElement('div');
wrap.className = 'result-table-wrap';
const htmlTable = document.createElement('table');
htmlTable.className = 'result-table';
const head = document.createElement('thead');
const headRow = document.createElement('tr');
for (const column of table.columns) {
const th = document.createElement('th');
th.textContent = column;
headRow.append(th);
}
head.append(headRow);
htmlTable.append(head);
const body = document.createElement('tbody');
const shown = table.rows.slice(0, 100);
for (const row of shown) {
const tr = document.createElement('tr');
for (const column of table.columns) {
const td = document.createElement('td');
td.textContent = row[column] ?? '';
tr.append(td);
}
body.append(tr);
}
htmlTable.append(body);
wrap.append(htmlTable);
section.append(wrap);
if (table.rows.length > shown.length) {
const note = document.createElement('p');
note.textContent = `Showing the first ${shown.length.toLocaleString()} of ${table.rows.length.toLocaleString()} rows.`;
section.append(note);
} else if (!table.rows.length) {
const note = document.createElement('p');
note.textContent = 'No rows found.';
section.append(note);
}
}
function setRunStatus(text, mode = '') {
if (!elements.runStatus) return;
elements.runStatus.textContent = text;
elements.runStatus.className = `status-pill${mode ? ` ${mode}` : ''}`;
persistResults();
}
function showError(message, lineNumber = null) {
elements.results.replaceChildren();
addSection(elements.results, lineNumber ? `Line ${lineNumber}` : 'Could not run the program', { kind: 'error', paragraphs: [message] });
setRunStatus('Needs attention', 'error');
persistResults();
}
function clearResults() {
elements.results.replaceChildren();
const section = document.createElement('section');
section.className = 'empty-results';
const strong = document.createElement('strong');
strong.textContent = 'Nothing has run yet.';
const span = document.createElement('span');
span.textContent = 'Press Run to see the result here.';
section.append(strong, span);
elements.results.append(section);
setRunStatus('Ready');
persistResults();
}
function numberedName(name, runNumber, totalRuns) {
if (totalRuns <= 1) return name;
const slash = Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\'));
const folder = slash >= 0 ? name.slice(0, slash + 1) : '';
const file = slash >= 0 ? name.slice(slash + 1) : name;
const dot = file.lastIndexOf('.');
const stem = dot > 0 ? file.slice(0, dot) : file;
const extension = dot > 0 ? file.slice(dot) : '';
return `${folder}${stem}-${runNumber}${extension}`;
}
function openWorkspaceFile(requested, lineNumber) {
const found = matchingName(requested);
if (!found || deleted.has(found.toLowerCase())) {
throw new PlainError(`I could not find ${requested}.\n\nOpen the file in the Files panel first.`, lineNumber);
}
if (isTableName(found)) return parseDelimited(files[found], found.toLowerCase().endsWith('.tsv') ? '\t' : ',');
if (isFastaName(found)) return parseFasta(files[found], found);
if (isFastqName(found)) return parseFastq(files[found], found);
throw new PlainError(`I cannot open ${found} yet.\n\nUse CSV, TSV, FASTA, or FASTQ files.`, lineNumber);
}
const CODON_TABLE = {
TTT:'F',TTC:'F',TTA:'L',TTG:'L',TCT:'S',TCC:'S',TCA:'S',TCG:'S',TAT:'Y',TAC:'Y',TAA:'*',TAG:'*',TGT:'C',TGC:'C',TGA:'*',TGG:'W',
CTT:'L',CTC:'L',CTA:'L',CTG:'L',CCT:'P',CCC:'P',CCA:'P',CCG:'P',CAT:'H',CAC:'H',CAA:'Q',CAG:'Q',CGT:'R',CGC:'R',CGA:'R',CGG:'R',
ATT:'I',ATC:'I',ATA:'I',ATG:'M',ACT:'T',ACC:'T',ACA:'T',ACG:'T',AAT:'N',AAC:'N',AAA:'K',AAG:'K',AGT:'S',AGC:'S',AGA:'R',AGG:'R',
GTT:'V',GTC:'V',GTA:'V',GTG:'V',GCT:'A',GCC:'A',GCA:'A',GCG:'A',GAT:'D',GAC:'D',GAA:'E',GAG:'E',GGT:'G',GGC:'G',GGA:'G',GGG:'G'
};
function reverseComplement(sequence) {
const isRna = /U/i.test(sequence) && !/T/i.test(sequence);
const dna = { A:'T', C:'G', G:'C', T:'A', U:'A', R:'Y', Y:'R', K:'M', M:'K', S:'S', W:'W', B:'V', V:'B', D:'H', H:'D', N:'N' };
const rna = { ...dna, A:'U' };
const map = isRna ? rna : dna;
return Array.from(sequence.toUpperCase()).reverse().map((base) => map[base] || base).join('');
}
async function runSingle(instructions, runNumber, totalRuns, target) {
let data = null;
for (const instruction of instructions) {
const { action, values, lineNumber } = instruction;
if (action === 'say') {
addSection(target, 'Message', { paragraphs: [values[0]] });
continue;
}
if (action === 'open') {
data = openWorkspaceFile(values[0], lineNumber);
if (data.kind === 'table') {
addSection(target, 'Opened the file', { paragraphs: [values[0], '', 'Rows'], bigValue: data.rows.length.toLocaleString() });
addSection(target, 'Columns', { bigValue: data.columns.length.toLocaleString() });
} else {
addSection(target, 'Opened the file', { paragraphs: [values[0], '', 'Sequences'], bigValue: data.records.length.toLocaleString() });
addSection(target, 'Bases', { bigValue: data.records.reduce((sum, record) => sum + record.sequence.length, 0).toLocaleString() });
}
continue;
}
if (action === 'keep') {
const table = requireTable(data, lineNumber);
const column = findColumn(table, values[1], lineNumber);
table.rows = table.rows.filter((row) => row[column] === values[0]);
} else if (action === 'remove') {
const table = requireTable(data, lineNumber);
const column = findColumn(table, values[1], lineNumber);
table.rows = table.rows.filter((row) => row[column] !== values[0]);
} else if (action === 'keepColumns') {
const table = requireTable(data, lineNumber);
const columns = naturalList(values[0]).map((column) => findColumn(table, column, lineNumber));
table.columns = columns;
table.rows = table.rows.map((row) => Object.fromEntries(columns.map((column) => [column, row[column] ?? ''])));
} else if (action === 'renameColumn') {
const table = requireTable(data, lineNumber);
const column = findColumn(table, values[0], lineNumber);
const newName = values[1];
if (table.columns.some((name) => name.toLowerCase() === newName.toLowerCase() && name !== column)) {
throw new PlainError(`A column called ${newName} already exists.`, lineNumber);
}
table.columns = table.columns.map((name) => name === column ? newName : name);
table.rows = table.rows.map((row) => {
const next = {};
for (const name of table.columns) next[name] = name === newName ? (row[column] ?? '') : (row[name] ?? '');
return next;
});
} else if (['orderRows', 'largestFirst', 'smallestFirst'].includes(action)) {
const table = requireTable(data, lineNumber);
const column = findColumn(table, values[0], lineNumber);
const nonempty = table.rows.filter((row) => String(row[column] ?? '').trim());
const empty = table.rows.filter((row) => !String(row[column] ?? '').trim());
const numeric = nonempty.length > 0 && nonempty.every((row) => Number.isFinite(Number(String(row[column]).trim())));
nonempty.sort((left, right) => {
const comparison = numeric
? Number(left[column]) - Number(right[column])
: String(left[column]).localeCompare(String(right[column]), undefined, { numeric: true, sensitivity: 'base' });
return action === 'largestFirst' ? -comparison : comparison;
});
table.rows = nonempty.concat(empty);
} else if (action === 'removeDuplicates') {
const table = requireTable(data, lineNumber);
const column = findColumn(table, values[0], lineNumber);
const seen = new Set();
table.rows = table.rows.filter((row) => {
const value = row[column] ?? '';
if (seen.has(value)) return false;
seen.add(value);
return true;
});
} else if (action === 'replaceEmpty') {
const table = requireTable(data, lineNumber);
const column = findColumn(table, values[0], lineNumber);
table.rows.forEach((row) => { if (!String(row[column] ?? '').trim()) row[column] = values[1]; });
} else if (action === 'combine') {
const table = requireTable(data, lineNumber);
const other = openWorkspaceFile(values[0], lineNumber);
if (other.kind !== 'table') throw new PlainError(`${values[0]} is not a table.`, lineNumber);
const leftKey = findColumn(table, values[1], lineNumber);
const rightKey = findColumn(other, values[1], lineNumber);
const matches = new Map();
other.rows.forEach((row) => { const key = row[rightKey] ?? ''; if (key && !matches.has(key)) matches.set(key, row); });
const newColumns = other.columns.filter((column) => column !== rightKey && !table.columns.includes(column));
table.columns.push(...newColumns);
table.rows.forEach((row) => {
const match = matches.get(row[leftKey] ?? '');
other.columns.forEach((column) => {
if (column === rightKey) return;
const incoming = match?.[column] ?? '';
if (!(column in row)) row[column] = incoming;
else if (!String(row[column] ?? '').trim() && incoming) row[column] = incoming;
});
});
} else if (action === 'changeValue') {
const table = requireTable(data, lineNumber);
const column = findColumn(table, values[2], lineNumber);
table.rows.forEach((row) => { if (row[column] === values[0]) row[column] = values[1]; });
} else if (action === 'countRows') {
const table = requireTable(data, lineNumber);
addSection(target, 'Rows', { bigValue: table.rows.length.toLocaleString() });
} else if (action === 'countSequences') {
const sequences = requireSequences(data, lineNumber);
addSection(target, 'Sequences', { bigValue: sequences.records.length.toLocaleString() });
} else if (action === 'countBases') {
const sequences = requireSequences(data, lineNumber);
addSection(target, 'Bases', { bigValue: sequences.records.reduce((sum, record) => sum + record.sequence.length, 0).toLocaleString() });
} else if (action === 'showNames') {
const sequences = requireSequences(data, lineNumber);
addSection(target, 'Sequence names', { paragraphs: [sequences.records.map((record) => record.name).join('\n')] });
} else if (action === 'showSequences') {
const sequences = requireSequences(data, lineNumber);
addSection(target, 'The sequences', { table: sequenceTable(sequences) });
} else if (action === 'keepMinLength' || action === 'removeShorter') {
const sequences = requireSequences(data, lineNumber);
const minimum = Number(values[0]);
sequences.records = sequences.records.filter((record) => record.sequence.length >= minimum);
} else if (action === 'keepQuality' || action === 'removeQuality') {
const sequences = requireSequences(data, lineNumber);
if (sequences.records.some((record) => record.quality === null)) throw new PlainError('This instruction needs FASTQ quality scores.\n\nOpen a FASTQ file first.', lineNumber);
const minimum = Number(values[0]);
sequences.records = sequences.records.filter((record) => averageQuality(record) >= minimum);
} else if (action === 'trimStart' || action === 'trimEnd') {
const sequences = requireSequences(data, lineNumber);
const amount = Number(values[0]);
sequences.records.forEach((record) => {
if (action === 'trimStart') {
record.sequence = record.sequence.slice(amount);
if (record.quality !== null) record.quality = record.quality.slice(amount);
} else {
record.sequence = amount < record.sequence.length ? record.sequence.slice(0, -amount) : '';
if (record.quality !== null) record.quality = amount < record.quality.length ? record.quality.slice(0, -amount) : '';
}
});
} else if (action === 'keepMotif' || action === 'removeMotif') {
const sequences = requireSequences(data, lineNumber);
const motif = values[0].toUpperCase().replaceAll('U', 'T');
sequences.records = sequences.records.filter((record) => {
const contains = record.sequence.toUpperCase().replaceAll('U', 'T').includes(motif);
return action === 'keepMotif' ? contains : !contains;
});
} else if (action === 'toRna') {
const sequences = requireSequences(data, lineNumber);
sequences.records.forEach((record) => { record.sequence = record.sequence.replaceAll('T', 'U').replaceAll('t', 'u'); });
} else if (action === 'toDna') {
const sequences = requireSequences(data, lineNumber);
sequences.records.forEach((record) => { record.sequence = record.sequence.replaceAll('U', 'T').replaceAll('u', 't'); });
} else if (action === 'reverseComplement') {
const sequences = requireSequences(data, lineNumber);
sequences.records.forEach((record) => {
record.sequence = reverseComplement(record.sequence);
if (record.quality !== null) record.quality = Array.from(record.quality).reverse().join('');
});
} else if (action === 'translate') {
const sequences = requireSequences(data, lineNumber);
sequences.records.forEach((record) => {
const dna = record.sequence.toUpperCase().replaceAll('U', 'T');
let protein = '';
for (let index = 0; index <= dna.length - 3; index += 3) protein += CODON_TABLE[dna.slice(index, index + 3)] || 'X';
record.sequence = protein;
record.quality = null;
});
sequences.format = 'fasta';
} else if (action === 'gcContent') {
const sequences = requireSequences(data, lineNumber);
addSection(target, 'GC content', { table: {
columns: ['name', 'length', 'gc_percent'],
rows: sequences.records.map((record) => {
const sequence = record.sequence.toUpperCase().replaceAll('U', 'T');
const gc = Array.from(sequence).filter((base) => base === 'G' || base === 'C').length;
return { name: record.name, length: String(sequence.length), gc_percent: (sequence.length ? gc / sequence.length * 100 : 0).toFixed(2) };
})
}});
} else if (action === 'compare') {
const sequences = requireSequences(data, lineNumber);
const other = openWorkspaceFile(values[0], lineNumber);
if (other.kind !== 'sequences') throw new PlainError(`${values[0]} is not a FASTA or FASTQ file.`, lineNumber);
const byName = new Map(other.records.map((record) => [record.name, record]));
const rows = [];
const identities = [];
let exactMatches = 0;
sequences.records.forEach((record) => {
const partner = byName.get(record.name);
if (!partner) {
rows.push({ name: record.name, other_length: '', identity_percent: '', exact_match: 'no match' });
return;
}
const denominator = Math.max(record.sequence.length, partner.sequence.length);
let matching = 0;
for (let index = 0; index < Math.min(record.sequence.length, partner.sequence.length); index += 1) {
if (record.sequence[index].toUpperCase() === partner.sequence[index].toUpperCase()) matching += 1;
}
const identity = denominator ? matching / denominator * 100 : 100;
const exact = record.sequence.toUpperCase() === partner.sequence.toUpperCase();
exactMatches += exact ? 1 : 0;
identities.push(identity);
rows.push({ name: record.name, other_length: String(partner.sequence.length), identity_percent: identity.toFixed(2), exact_match: exact ? 'yes' : 'no' });
});
addSection(target, 'Sequence comparison', { paragraphs: [values[0], '', `Named pairs\n${identities.length.toLocaleString()}`, '', `Exact matches\n${exactMatches.toLocaleString()}`, '', `Average identity\n${(identities.length ? identities.reduce((a, b) => a + b, 0) / identities.length : 0).toFixed(2)}%`] });
addSection(target, 'Comparison details', { table: { columns: ['name', 'other_length', 'identity_percent', 'exact_match'], rows } });
} else if (action === 'show') {
if (!data) throw new PlainError('There is no open file yet.', lineNumber);
if (data.kind === 'table') addSection(target, 'The result', { table: data });
else addSection(target, 'The sequences', { table: sequenceTable(data) });
} else if (action === 'save' || action === 'saveSequences') {
if (!data) throw new PlainError('There is no result to save yet.', lineNumber);
const outputName = numberedName(values[0], runNumber, totalRuns);
let output;
if (data.kind === 'table') {
if (!isTableName(outputName)) throw new PlainError(`I cannot save the table as ${outputName}.\n\nUse a CSV or TSV filename.`, lineNumber);
output = encodeDelimited({ ...data, delimiter: outputName.toLowerCase().endsWith('.tsv') ? '\t' : ',' });
} else output = encodeSequences(data, outputName);
files[outputName] = output;
deleted.delete(outputName.toLowerCase());
persistWorkspace();
renderFileList();
addSection(target, data.kind === 'table' ? 'Saved the result' : 'Saved the sequences', { file: { name: outputName, description: 'Saved in Files' } });
}
}
return data;
}
function sequenceTable(data) {
const includeQuality = data.records.some((record) => record.quality !== null);
const columns = ['name', 'length', 'sequence'];
if (includeQuality) columns.push('average_quality');
return {
columns,
rows: data.records.map((record) => {
const row = { name: record.name, length: String(record.sequence.length), sequence: record.sequence };
if (includeQuality) row.average_quality = record.quality !== null ? averageQuality(record).toFixed(2) : '';
return row;
})
};
}
async function runProgram() {
saveEditor();
if (!looksLikeProgramName(activeFile)) {
if (!looksLikeProgram(elements.editor.value)) {
showError('Open a FigureLoom Bio program before pressing Run.');
return;
}
const normalized = normalizeProgramFilename(activeFile);
if (normalized !== activeFile) {
files[normalized] = elements.editor.value;
delete files[activeFile];
activeFile = normalized;
if (elements.programName) elements.programName.value = normalized;
if (elements.activeFileLabel) elements.activeFileLabel.textContent = normalized;
persistWorkspace();
renderFileList();
}
}
elements.runButton.disabled = true;
elements.results.replaceChildren();
setRunStatus('Running', 'running');
try {
const instructions = splitInstructions(elements.editor.value);
let repeatCount = 1;
let body = instructions;
const repeats = instructions.filter((instruction) => instruction.action === 'repeat');
if (repeats.length > 1) throw new PlainError('Use only one instruction that says how many times to run the program.', repeats[1].lineNumber);
if (repeats.length) {
if (instructions[0] !== repeats[0]) throw new PlainError('Put the repeat instruction at the beginning of the program.', repeats[0].lineNumber);
repeatCount = Number(repeats[0].values[0]);
if (repeatCount > MAX_BROWSER_RUNS) throw new PlainError(`The browser IDE can run a program at most ${MAX_BROWSER_RUNS} times at once.`, repeats[0].lineNumber);
body = instructions.slice(1);
}
if (!body.length) throw new PlainError('Add at least one instruction to the program.');
for (let runNumber = 1; runNumber <= repeatCount; runNumber += 1) {
setRunStatus(repeatCount > 1 ? `Run ${runNumber} of ${repeatCount}` : 'Running', 'running');
const target = repeatCount > 1 ? document.createElement('div') : elements.results;
if (repeatCount > 1) {
const group = document.createElement('section');
group.className = 'repeat-run-group';
const heading = document.createElement('h3');
heading.textContent = `Run ${runNumber} of ${repeatCount}`;
target.className = 'repeat-run-results';
group.append(heading, target);
elements.results.append(group);
}
await runSingle(body, runNumber, repeatCount, target);
if (repeatCount > 1) await new Promise((resolve) => requestAnimationFrame(resolve));
}
setRunStatus(repeatCount > 1 ? `Finished ${repeatCount} runs` : 'Finished');
} catch (error) {
if (error instanceof PlainError) showError(error.message, error.lineNumber);
else {
console.error(error);
showError('Something unexpected stopped the program.\n\nTry the instruction again or open the manual.');
}
} finally {
elements.runButton.disabled = false;
persistWorkspace();
renderFileList();
persistResults();
}
}
const builderTemplates = [
{ group: 'Files and messages', id: 'say', label: 'Show a message', fields: [['message', 'Message', 'Starting the analysis']], build: (v) => `Say ${v.message}.` },
{ group: 'Files and messages', id: 'open', label: 'Open a file', fields: [['file', 'Filename', 'reads.fastq']], build: (v) => `Open the file ${v.file}.` },
{ group: 'Tables', id: 'keep', label: 'Keep matching rows', fields: [['value', 'Value', 'treated'], ['column', 'Column', 'condition']], build: (v) => `Keep only rows marked ${v.value} under ${v.column}.` },
{ group: 'Tables', id: 'remove', label: 'Remove matching rows', fields: [['value', 'Value', 'failed'], ['column', 'Column', 'status']], build: (v) => `Remove rows marked ${v.value} under ${v.column}.` },
{ group: 'Tables', id: 'columns', label: 'Keep selected columns', fields: [['columns', 'Columns', 'sample, condition, and status']], build: (v) => `Keep only the columns ${v.columns}.` },
{ group: 'Tables', id: 'rename', label: 'Rename a column', fields: [['column', 'Current column', 'condition'], ['newName', 'New name', 'group']], build: (v) => `Rename the column ${v.column} to ${v.newName}.` },
{ group: 'Tables', id: 'order', label: 'Put rows in order', fields: [['column', 'Column', 'age']], build: (v) => `Put the rows in order by ${v.column}.` },
{ group: 'Tables', id: 'duplicates', label: 'Remove duplicates', fields: [['column', 'Column', 'sample']], build: (v) => `Remove duplicate rows using ${v.column}.` },
{ group: 'Tables', id: 'empty', label: 'Fill empty values', fields: [['column', 'Column', 'status'], ['value', 'Replacement', 'unknown']], build: (v) => `Replace empty values under ${v.column} with ${v.value}.` },
{ group: 'Tables', id: 'combine', label: 'Combine another table', fields: [['file', 'Filename', 'metadata.csv'], ['column', 'Matching column', 'sample']], build: (v) => `Combine it with ${v.file} using ${v.column}.` },
{ group: 'Sequences and reads', id: 'countSequences', label: 'Count sequences or reads', fields: [], build: () => 'Count the sequences.' },
{ group: 'Sequences and reads', id: 'countBases', label: 'Count bases', fields: [], build: () => 'Count the bases.' },
{ group: 'Sequences and reads', id: 'showNames', label: 'Show sequence names', fields: [], build: () => 'Show the sequence names.' },
{ group: 'Sequences and reads', id: 'minLength', label: 'Keep a minimum length', fields: [['length', 'Minimum bases', '50']], build: (v) => `Keep sequences at least ${v.length} bases long.` },
{ group: 'Sequences and reads', id: 'quality', label: 'Keep a minimum read quality', fields: [['quality', 'Minimum average quality', '20']], build: (v) => `Keep reads with average quality at least ${v.quality}.` },
{ group: 'Sequences and reads', id: 'trimStart', label: 'Trim from the start', fields: [['amount', 'Bases to trim', '5']], build: (v) => `Trim ${v.amount} bases from the start.` },
{ group: 'Sequences and reads', id: 'trimEnd', label: 'Trim from the end', fields: [['amount', 'Bases to trim', '5']], build: (v) => `Trim ${v.amount} bases from the end.` },
{ group: 'Sequences and reads', id: 'motif', label: 'Keep a sequence pattern', fields: [['motif', 'Sequence pattern', 'ATG']], build: (v) => `Keep sequences containing ${v.motif}.` },
{ group: 'Sequences and reads', id: 'rna', label: 'Convert to RNA', fields: [], build: () => 'Convert the sequences to RNA.' },
{ group: 'Sequences and reads', id: 'dna', label: 'Convert to DNA', fields: [], build: () => 'Convert the sequences to DNA.' },
{ group: 'Sequences and reads', id: 'reverse', label: 'Reverse complement', fields: [], build: () => 'Find the reverse complement.' },
{ group: 'Sequences and reads', id: 'translate', label: 'Translate to protein', fields: [], build: () => 'Translate the sequences.' },
{ group: 'Sequences and reads', id: 'gc', label: 'Calculate GC content', fields: [], build: () => 'Calculate the GC content.' },
{ group: 'Sequences and reads', id: 'compare', label: 'Compare sequences', fields: [['file', 'Reference filename', 'reference.fasta']], build: (v) => `Compare the sequences with ${v.file}.` },
{ group: 'Results', id: 'countRows', label: 'Count table rows', fields: [], build: () => 'Count the rows.' },
{ group: 'Results', id: 'show', label: 'Show the result', fields: [], build: () => 'Show the result.' },
{ group: 'Results', id: 'save', label: 'Save the result', fields: [['file', 'Filename', 'result.csv']], build: (v) => `Save the result as ${v.file}.` },
{ group: 'Results', id: 'saveSequences', label: 'Save sequences or reads', fields: [['file', 'Filename', 'cleaned.fastq']], build: (v) => `Save the sequences as ${v.file}.` },
{ group: 'Other', id: 'custom', label: 'Write another instruction', fields: [['sentence', 'Complete instruction', 'Check the quality.']], build: (v) => v.sentence.trim().endsWith('.') ? v.sentence.trim() : `${v.sentence.trim()}.` }
];
const builderPresets = {
blank: [],
fastq: [
'Say Cleaning the reads.',
'Open the file reads.fastq.',
'Keep reads with average quality at least 20.',
'Remove reads shorter than 50 bases.',
'Trim 5 bases from the start.',
'Count the reads.',
'Calculate the GC content.',
'Save the reads as cleaned-reads.fastq.',
'Say The reads are ready.'
],
fasta: [
'Say Preparing the sequences.',
'Open the file sequences.fasta.',
'Keep sequences at least 100 bases long.',
'Remove sequences containing N.',
'Calculate the GC content.',
'Show the sequences.',
'Save the sequences as prepared-sequences.fasta.'
],
table: [
'Open the file samples.csv.',
'Remove duplicate rows using sample.',
'Replace empty values under status with unknown.',
'Put the rows in order by sample.',
'Show the result.',
'Save the result as prepared-samples.csv.'
]
};
let builderSteps = [];
function setupBuilder() {
if (!elements.builder || !elements.builderStepType) return;
elements.builderStepType.replaceChildren();
const groups = new Map();
for (const template of builderTemplates) {
if (!groups.has(template.group)) {
const group = document.createElement('optgroup');
group.label = template.group;
groups.set(template.group, group);
elements.builderStepType.append(group);
}
const option = document.createElement('option');
option.value = template.id;
option.textContent = template.label;
groups.get(template.group).append(option);
}
renderBuilderFields();
renderBuilderSteps();
}
function selectedBuilderTemplate() {
return builderTemplates.find((template) => template.id === elements.builderStepType?.value) || builderTemplates[0];
}
function renderBuilderFields() {
if (!elements.builderFields) return;
elements.builderFields.replaceChildren();
for (const [key, labelText, placeholder] of selectedBuilderTemplate().fields) {
const label = document.createElement('label');
const span = document.createElement('span');
span.textContent = labelText;
const input = document.createElement('input');
input.name = key;
input.placeholder = placeholder;
input.value = placeholder;
label.append(span, input);
elements.builderFields.append(label);
}
}
function renderBuilderSteps() {
if (!elements.builderSteps) return;
elements.builderSteps.replaceChildren();
if (!builderSteps.length) {
const empty = document.createElement('li');
empty.className = 'builder-empty';
empty.textContent = 'Choose a starter or add instructions below.';
elements.builderSteps.append(empty);
return;
}
builderSteps.forEach((sentence, index) => {
const item = document.createElement('li');
const text = document.createElement('code');
text.textContent = sentence;
const actions = document.createElement('span');
actions.className = 'builder-step-actions';
const up = document.createElement('button');
up.type = 'button';
up.textContent = '↑';
up.disabled = index === 0;
up.addEventListener('click', () => { [builderSteps[index - 1], builderSteps[index]] = [builderSteps[index], builderSteps[index - 1]]; renderBuilderSteps(); });
const down = document.createElement('button');
down.type = 'button';
down.textContent = '↓';
down.disabled = index === builderSteps.length - 1;
down.addEventListener('click', () => { [builderSteps[index + 1], builderSteps[index]] = [builderSteps[index], builderSteps[index + 1]]; renderBuilderSteps(); });
const remove = document.createElement('button');
remove.type = 'button';
remove.textContent = '×';
remove.addEventListener('click', () => { builderSteps.splice(index, 1); renderBuilderSteps(); });
actions.append(up, down, remove);
item.append(text, actions);
elements.builderSteps.append(item);
});
}
function builderSource() {
const runs = Math.max(1, Math.min(MAX_BROWSER_RUNS, Number(elements.builderRuns?.value) || 1));
const body = builderSteps.join('\n');
return runs > 1 ? `Run this program ${runs} times.\n\n${body}\n` : `${body}\n`;
}
function builderFilename() {
return normalizeProgramFilename(elements.builderName?.value || 'new-program.flbio');
}
function openBuilder() {
const lines = elements.editor.value.split(/\r?\n/);
let runs = 1;
const first = lines.findIndex((line) => line.trim() && !line.trim().startsWith('#'));
if (first >= 0) {
const match = lines[first].trim().match(/^Run this program ([1-9][0-9]*) times?\.$/i);
if (match) {
runs = Number(match[1]);
lines.splice(first, 1);
}
}
builderSteps = lines.map((line) => line.trim()).filter(Boolean);
if (elements.builderRuns) elements.builderRuns.value = String(Math.min(MAX_BROWSER_RUNS, runs));
if (elements.builderName) elements.builderName.value = activeFile || 'new-program.flbio';
renderBuilderSteps();
if (typeof elements.builder.showModal === 'function') elements.builder.showModal();
else elements.builder.setAttribute('open', '');
}
function closeBuilder() {
if (!elements.builder) return;
if (typeof elements.builder.close === 'function') elements.builder.close();
else elements.builder.removeAttribute('open');
}
function addBuilderStep() {
const values = {};
for (const input of elements.builderFields?.querySelectorAll('input') || []) values[input.name] = input.value.trim();
if (Object.values(values).some((value) => !value)) return;
const sentence = selectedBuilderTemplate().build(values).trim();
if (sentence) builderSteps.push(sentence);
renderBuilderSteps();
}
function loadBuilderPreset() {
const preset = elements.builderPreset?.value || 'blank';
builderSteps = [...(builderPresets[preset] || [])];
if (preset === 'fastq') {
if (elements.builderName) elements.builderName.value = 'clean-fastq.flbio';
if (elements.builderRuns) elements.builderRuns.value = '10';
} else if (preset === 'fasta') {
if (elements.builderName) elements.builderName.value = 'prepare-fasta.flbio';
if (elements.builderRuns) elements.builderRuns.value = '1';
} else if (preset === 'table') {
if (elements.builderName) elements.builderName.value = 'prepare-table.flbio';
if (elements.builderRuns) elements.builderRuns.value = '1';
}
renderBuilderSteps();
}
function useBuilderProgram() {
if (!builderSteps.length) return;
saveEditor();
const name = builderFilename();
const collision = matchingName(name);
if (collision && collision !== activeFile && !deleted.has(collision.toLowerCase())) {
if (!window.confirm(`${name} already exists. Replace it?`)) return;
}
files[name] = builderSource();
deleted.delete(name.toLowerCase());
persistWorkspace();
renderFileList();
activateFile(name);
closeBuilder();
}
function loadExamples() {
saveEditor();
for (const [name, source] of Object.entries(defaults)) {
files[name] = source;
deleted.delete(name.toLowerCase());
}
persistWorkspace();
renderFileList();
activateFile('example.flbio');
}
function tidySentences() {
if (!looksLikeProgram(elements.editor.value) && !looksLikeProgramName(activeFile)) {
showError('Open a FigureLoom Bio program before tidying its sentences.');
return;
}
elements.editor.value = elements.editor.value.split(/\r?\n/).map((line) => {
const text = line.trim();
if (!text || text.startsWith('#')) return text;
return text.endsWith('.') ? text : `${text}.`;
}).join('\n');
saveEditor();
refreshEditor();
}
function toggleTheme() {
const dark = document.documentElement.dataset.figureloomTheme === 'dark';
const next = dark ? 'light' : 'dark';
document.documentElement.dataset.figureloomTheme = next;
localStorage.setItem(THEME_KEY, next);
}
elements.editor.addEventListener('input', () => {
files[activeFile] = elements.editor.value;
persistWorkspace();
refreshEditor();
});
elements.editor.addEventListener('scroll', syncScroll);
elements.editor.addEventListener('click', updateCursorStatus);
elements.editor.addEventListener('keyup', updateCursorStatus);
elements.programName?.addEventListener('change', renameActiveFile);
elements.programName?.addEventListener('keydown', (event) => {
if (event.key === 'Enter') {
event.preventDefault();
elements.programName.blur();
}
});
elements.newButton?.addEventListener('click', () => createBlankProgram(true));
elements.openButton?.addEventListener('click', () => elements.filePicker?.click());
elements.addFileButton?.addEventListener('click', () => elements.filePicker?.click());
elements.filePicker?.addEventListener('change', importPickedFiles);
elements.saveButton?.addEventListener('click', downloadActiveFile);
elements.formatButton?.addEventListener('click', tidySentences);
elements.clearResultsButton?.addEventListener('click', clearResults);
elements.runButton.addEventListener('click', runProgram);
elements.themeButton?.addEventListener('click', toggleTheme);
elements.exampleButton?.addEventListener('click', loadExamples);
elements.builderButton?.addEventListener('click', openBuilder);
elements.builderClose?.addEventListener('click', closeBuilder);
elements.builderStepType?.addEventListener('change', renderBuilderFields);
elements.builderAddStep?.addEventListener('click', addBuilderStep);
elements.builderClear?.addEventListener('click', () => { builderSteps = []; renderBuilderSteps(); });
elements.builderLoadPreset?.addEventListener('click', loadBuilderPreset);
elements.builderDownload?.addEventListener('click', () => { if (builderSteps.length) downloadText(builderFilename(), builderSource()); });
elements.builderUse?.addEventListener('click', useBuilderProgram);
elements.builder?.addEventListener('click', (event) => { if (event.target === elements.builder) closeBuilder(); });
document.addEventListener('keydown', (event) => {
const command = event.ctrlKey || event.metaKey;
if (command && event.key.toLowerCase() === 's') {
event.preventDefault();
downloadActiveFile();
}
if (command && event.key === 'Enter') {
event.preventDefault();
runProgram();
}
});
window.addEventListener('pagehide', () => { saveEditor(); persistResults(); });
window.addEventListener('beforeunload', () => { saveEditor(); persistResults(); });
document.addEventListener('visibilitychange', () => {
if (document.visibilityState === 'hidden') {
saveEditor();
persistResults();
}
});
new MutationObserver(persistResults).observe(elements.results, { childList: true, subtree: true, characterData: true });
setupBuilder();
renderFileList();
elements.editor.value = files[activeFile] || '';
if (elements.programName) elements.programName.value = activeFile;
if (elements.activeFileLabel) elements.activeFileLabel.textContent = activeFile;
restoreResults();
persistWorkspace();
refreshEditor();
})();
