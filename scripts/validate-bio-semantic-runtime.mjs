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

console.log('Run authority and syntax validation use the semantic parser without canonical sentence rewriting.');
