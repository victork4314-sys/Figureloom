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
vm.runInContext(fs.readFileSync('ide/ide-semantic-language.js', 'utf8'), sandbox, { filename: 'ide-semantic-language.js' });
vm.runInContext(fs.readFileSync('ide/ide-semantic-runtime.js', 'utf8'), sandbox, { filename: 'ide-semantic-runtime.js' });

const language = await sandbox.window.FigureLoomBioSemanticLanguageReady;
const runtime = sandbox.window.FigureLoomBioSemanticRuntime;
assert.ok(language, 'The deterministic semantic language parser must start.');
assert.ok(runtime, 'The structured semantic runtime must start.');

const tokens = language.tokenize('If true and not false', 1);
assert.ok(tokens.some((token) => token.type === 'boolean' && token.normalized === 'true'));
assert.ok(tokens.some((token) => token.normalized === 'and' && token.semantics.some((semantic) => semantic.type === 'boolean' && semantic.kind === 'and')));
assert.ok(tokens.some((token) => token.normalized === 'not' && token.semantics.some((semantic) => semantic.type === 'boolean' && semantic.kind === 'not')));
assert.ok(tokens.some((token) => token.type === 'boolean' && token.normalized === 'false'));

const source = [
  'If false:',
  '    Say Wrong first branch.',
  'Otherwise if true and not false:',
  '    Say Correct branch.',
  'Otherwise:',
  '    Say Wrong fallback.',
  'Make a recipe called greet:',
  '    Say Recipe worked.',
  'Use the recipe greet.',
  'For every sample in samples:',
  '    Say Loop sample.',
].join('\n');

const tree = language.parseProgram(source);
assert.equal(tree.type, 'program');
assert.equal(tree.body[0].type, 'if');
assert.equal(tree.body[0].branches.length, 2);
assert.equal(tree.body[0].branches[1].condition.kind, 'boolean');
assert.equal(tree.body[0].branches[1].condition.operator, 'and');
assert.equal(tree.body[0].branches[1].condition.right.kind, 'not');
assert.equal(tree.body[1].type, 'recipe');
assert.equal(tree.body[2].type, 'instruction');
assert.equal(tree.body[2].action, 'use_recipe');
assert.equal(tree.body[3].type, 'loop');

const messages = [];
const executor = runtime.createExecutor({
  executeInstruction: async (node, context) => {
    assert.equal(node.type, 'instruction');
    if (node.action === 'say') messages.push(node.arguments.payload);
    context.lastAction = node.action;
  },
});
await executor.executeProgram(tree, {
  variables: new Map([['samples', ['one', 'two']]]),
});
assert.deepEqual(messages, [
  'Correct branch',
  'Recipe worked',
  'Loop one',
  'Loop two',
]);

const requirement = language.parseSemanticInstruction('Make sure true and not false', 1);
assert.equal(requirement.action, 'make_sure');
assert.equal(requirement.arguments.condition_ast.kind, 'boolean');
assert.equal(requirement.arguments.condition_ast.operator, 'and');
assert.equal(runtime.evaluateCondition(requirement.arguments.condition_ast, runtime.createContext()), true);

assert.throws(
  () => language.parseProgram('If true:\n  Say Wrong indentation.'),
  (error) => error?.code === 'invalid_indent',
  'Invalid indentation must produce a precise grammar error.',
);
assert.throws(
  () => language.parseProgram('If true:\n    Say Missing period'),
  (error) => error?.code === 'missing_period',
  'A missing period must produce a precise grammar error.',
);

const index = fs.readFileSync('ide/index.html', 'utf8');
const parserIndex = index.indexOf('ide-semantic-language.js');
const runtimeIndex = index.indexOf('ide-semantic-runtime.js');
const authorityIndex = index.indexOf('ide-semantic-run-authority.js');
const appIndex = index.indexOf('ide-app-v2.js');
assert.ok(parserIndex >= 0, 'The production IDE must load the semantic parser.');
assert.ok(runtimeIndex > parserIndex, 'The structured runtime must load after the parser.');
assert.ok(authorityIndex > runtimeIndex, 'The Run authority guard must load after the runtime.');
assert.ok(appIndex > authorityIndex, 'The IDE app must load after semantic Run authority.');
assert.equal(index.includes('ide-language-compiler.js'), false, 'The canonical sentence compiler must not be in the production load path.');
assert.equal(index.includes('ide-logic-compiler.js'), false, 'The logic sentence normalizer must not be in the production load path.');

const app = fs.readFileSync('ide/ide-app-v2.js', 'utf8');
const runStart = app.indexOf('async function runProgram()');
const runEnd = app.indexOf('const builderTemplates', runStart);
assert.ok(runStart >= 0 && runEnd > runStart, 'The production Run function must be inspectable.');
const runSource = app.slice(runStart, runEnd);
assert.match(runSource, /parseProgram\(elements\.editor\.value\)/);
assert.match(runSource, /semanticRuntime\.createExecutor/);
assert.equal(runSource.includes('compileSource'), false);
assert.equal(runSource.includes('normalizeSource'), false);
assert.equal(runSource.includes('compileTemporarily'), false);

console.log('Boolean logic, If/Otherwise, recipes, loops, precise grammar errors, and direct semantic Run authority are validated.');
