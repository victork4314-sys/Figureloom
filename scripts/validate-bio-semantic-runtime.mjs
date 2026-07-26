// Post-application verification anchor: this file exercises the pushed semantic parser and AST runtime.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const grammar = JSON.parse(fs.readFileSync('figureloom-bio/figureloom_bio/language_grammar.json', 'utf8'));
const sandbox = {
  window: { dispatchEvent() {} },
  CustomEvent: class {},
  fetch: async () => ({ ok: true, json: async () => grammar }),
  console,
  Map,
  Set,
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('ide/ide-semantic-language.js', 'utf8'), sandbox);
vm.runInContext(fs.readFileSync('ide/ide-semantic-runtime.js', 'utf8'), sandbox);
const language = await sandbox.window.FigureLoomBioSemanticLanguageReady;
const runtime = sandbox.window.FigureLoomBioSemanticRuntime;

const bases = language.parseSemanticInstruction('Count the bases', 1);
assert.equal(bases.action, 'count_bases');
assert.equal(bases.type, 'instruction');

const program = language.parseProgram(`
Make a recipe called greet:
    Say Hello.
If true:
    Use the recipe greet.
Otherwise:
    Say Wrong branch.
For every sample in samples:
    Say Loop item.
`);
assert.equal(program.type, 'program');
assert.equal(program.body[0].type, 'recipe');
assert.equal(program.body[1].type, 'if');
assert.equal(program.body[1].branches[0].condition.kind, 'literal');
assert.equal(program.body[2].type, 'loop');

const messages = [];
const executor = runtime.createExecutor({
  executeInstruction: async (node, context) => {
    assert.equal(node.type, 'instruction');
    if (node.action === 'say') messages.push(node.arguments.payload);
    context.lastAction = node.action;
  },
});
const context = await executor.executeProgram(program, {
  variables: new Map([['samples', ['one', 'two']]]),
});
assert.equal(context.lastAction, 'say');
assert.deepEqual(messages, ['Hello', 'Loop item', 'Loop item']);

const browserShape = JSON.parse(JSON.stringify(program));
assert.equal(browserShape.body[1].branches.length, 1);
assert.equal(browserShape.body[1].otherwise.length, 1);
assert.equal(browserShape.body[2].item, 'sample');
assert.equal(browserShape.body[2].collection, 'samples');

console.log('Semantic tokenizer, grammar AST, Boolean branch, recipe, loop, and direct dispatcher passed.');

const indexSource = fs.readFileSync('ide/index.html', 'utf8');
const semanticLanguageIndex = indexSource.indexOf('ide-semantic-language.js');
const semanticRuntimeIndex = indexSource.indexOf('ide-semantic-runtime.js');
const semanticAuthorityIndex = indexSource.indexOf('ide-semantic-run-authority.js');
const firstCompatibilityIndex = indexSource.indexOf('ide-current-file-language.js');
assert.ok(semanticLanguageIndex >= 0 && semanticRuntimeIndex > semanticLanguageIndex);
assert.ok(semanticAuthorityIndex > semanticRuntimeIndex && semanticAuthorityIndex < firstCompatibilityIndex);
assert.equal(indexSource.includes('ide-language-compiler.js'), false);
assert.equal(indexSource.includes('ide-logic-compiler.js'), false);

const appSource = fs.readFileSync('ide/ide-app-v2.js', 'utf8');
const runStart = appSource.indexOf('async function runProgram()');
const runEnd = appSource.indexOf('const builderTemplates', runStart);
const runSource = appSource.slice(runStart, runEnd);
assert.match(runSource, /api\.parseProgram\(elements\.editor\.value\)/);
assert.match(runSource, /semanticRuntime\.createExecutor/);
assert.equal(runSource.includes('compileLine'), false);
assert.equal(runSource.includes('normalizeSource'), false);
assert.equal(runSource.includes('splitInstructions(elements.editor.value)'), false);

const highlighterSource = fs.readFileSync('ide/ide-language-highlighter.js', 'utf8');
assert.match(highlighterSource, /FigureLoomBioSemanticLanguage/);
assert.match(highlighterSource, /parseProgram/);
assert.equal(highlighterSource.includes('canonicalizeSentence'), false);
assert.equal(highlighterSource.includes('FigureLoomBioLanguageAliases'), false);

const captureListeners = { click: [] };
const keyListeners = { keydown: [] };
let semanticRequests = 0;
let legacyRuns = 0;
const editorState = { value: 'Read the file example-samples.csv.' };
class FakeElement {
  constructor(id) { this.id = id; }
  closest(selector) { return selector === `#${this.id}` ? this : null; }
}
class FakeCustomEvent {
  constructor(type) { this.type = type; }
}
const authorityWindow = {
  addEventListener(type, listener) {
    (captureListeners[type] ||= []).push(listener);
  },
  dispatchEvent(event) {
    if (event.type === 'figureloom-bio-semantic-run-requested') semanticRequests += 1;
  },
};
const authorityDocument = {
  addEventListener(type, listener) {
    (keyListeners[type] ||= []).push(listener);
  },
};
const authoritySandbox = {
  window: authorityWindow,
  document: authorityDocument,
  Element: FakeElement,
  CustomEvent: FakeCustomEvent,
};
vm.createContext(authoritySandbox);
vm.runInContext(fs.readFileSync('ide/ide-semantic-run-authority.js', 'utf8'), authoritySandbox);

authorityWindow.addEventListener('click', () => {
  legacyRuns += 1;
  editorState.value = 'Open the file example-samples.csv.';
}, true);

const runButton = new FakeElement('runButton');
const clickEvent = {
  target: runButton,
  defaultPrevented: false,
  immediateStopped: false,
  preventDefault() { this.defaultPrevented = true; },
  stopImmediatePropagation() { this.immediateStopped = true; },
};
for (const listener of captureListeners.click) {
  listener(clickEvent);
  if (clickEvent.immediateStopped) break;
}
assert.equal(clickEvent.defaultPrevented, true);
assert.equal(clickEvent.immediateStopped, true);
assert.equal(semanticRequests, 1);
assert.equal(legacyRuns, 0);
assert.equal(editorState.value, 'Read the file example-samples.csv.');

const keyEvent = {
  ctrlKey: true,
  metaKey: false,
  key: 'Enter',
  defaultPrevented: false,
  immediateStopped: false,
  preventDefault() { this.defaultPrevented = true; },
  stopImmediatePropagation() { this.immediateStopped = true; },
};
for (const listener of keyListeners.keydown) {
  listener(keyEvent);
  if (keyEvent.immediateStopped) break;
}
assert.equal(keyEvent.defaultPrevented, true);
assert.equal(keyEvent.immediateStopped, true);
assert.equal(semanticRequests, 2);
assert.equal(legacyRuns, 0);
assert.equal(editorState.value, 'Read the file example-samples.csv.');

console.log('Run authority blocks later legacy interceptors before they can execute or rewrite the source.');
console.log('Run authority and syntax validation use the semantic parser without canonical sentence rewriting.');
