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
  structuredClone,
  Event: class { constructor(type, options = {}) { this.type = type; this.bubbles = Boolean(options.bubbles); } },
  document: {
    getElementById: () => ({ dispatchEvent() {} }),
    createElement: () => ({ setAttribute() {}, append() {}, appendChild() {}, style:{}, dataset:{} }),
  },
  setTimeout,
  clearTimeout,
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

vm.runInContext(fs.readFileSync('ide/ide-core-language-runtime.js', 'utf8'), sandbox);
vm.runInContext(fs.readFileSync('ide/ide-semantic-microbiology-runtime.js', 'utf8'), sandbox);

const sections = [];
const datasets = new Map([
  ['alpha.fastq',{kind:'sequences',format:'fastq',records:[
    {name:'good',sequence:'A'.repeat(60),quality:'I'.repeat(60)},
    {name:'bad',sequence:'C'.repeat(60),quality:'!'.repeat(60)},
  ]}],
  ['beta.fastq',{kind:'sequences',format:'fastq',records:[
    {name:'good',sequence:'G'.repeat(60),quality:'I'.repeat(60)},
    {name:'bad',sequence:'T'.repeat(60),quality:'!'.repeat(60)},
  ]}],
  ['forward.fastq',{kind:'sequences',format:'fastq',records:[
    {name:'forward',sequence:'A'.repeat(30)+'C'.repeat(30)+'G'.repeat(30),quality:'I'.repeat(90)},
  ]}],
  ['reverse.fastq',{kind:'sequences',format:'fastq',records:[
    {name:'reverse',sequence:'G'.repeat(30)+'T'.repeat(30)+'A'.repeat(30),quality:'I'.repeat(90)},
  ]}],
]);
const helpers = {
  Error: class TestError extends Error { constructor(message,line){super(message);this.lineNumber=line;} },
  section: (title,details={}) => sections.push({title,details}),
  open: (name) => {
    if (!datasets.has(name)) throw new Error(`missing ${name}`);
    return structuredClone(datasets.get(name));
  },
  encode: (value) => JSON.stringify(value),
  listFiles: () => [...datasets.keys()],
  save: (name,value) => { datasets.set(name,structuredClone(value)); return name; },
  execute: async () => null,
};

const sampleProgram = language.parseProgram(`
Open all FASTQ files as samples.
For every sample in samples:
    Open the sample.
    Remove reads with low quality.
    Save the result using the sample name.
`);
const sampleExecutor = runtime.createExecutor({
  executeInstruction: async (node, context) => {
    const handler = runtime.getActionHandler(node.action);
    assert.ok(handler, `Missing structured handler for ${node.action}`);
    await handler({node,context,line:node.line_number,helpers});
    return context.data;
  },
});
const sampleContext = await sampleExecutor.executeProgram(sampleProgram, {
  files:Object.fromEntries([...datasets.keys()].map((name)=>[name,'stored'])),
});
assert.ok(sampleContext.files['alpha-result.fastq']);
assert.ok(sampleContext.files['beta-result.fastq']);
assert.equal(sampleProgram.body[1].type,'loop');
assert.equal(sampleContext.currentSample,null);

const microContext = runtime.createContext({
  files:{'forward.fastq':'stored','reverse.fastq':'stored'},
});
await runtime.getActionHandler('builtin_microbiology_assemble_paired')({
  node:{action:'builtin_microbiology_assemble_paired',arguments:{runtime_values:['forward.fastq','reverse.fastq','assembly']}},
  context:microContext,
  line:1,
  helpers,
});
assert.ok(microContext.files['assembly/contigs.fasta']);
assert.equal(microContext.data.kind,'sequences');
console.log('Structured sample loop and microbiology actions execute from AST values without sentence rewriting.');

sandbox.window.FigureLoomApprovedBio = { registerHighlight() {} };
vm.runInContext(fs.readFileSync('ide/ide-analysis-language.js', 'utf8'), sandbox);
vm.runInContext(fs.readFileSync('ide/ide-complete-language.js', 'utf8'), sandbox);

const manifest = JSON.parse(fs.readFileSync('figureloom-bio/figureloom_bio/language_manifest.json','utf8'));
const runSingleStart = appSource.indexOf('async function runSingle');
const runSingleEnd = appSource.indexOf('function sequenceTable', runSingleStart);
const appRun = appSource.slice(runSingleStart, runSingleEnd);
const directActions = new Set();
for (const match of appRun.matchAll(/action\s*===\s*'([^']+)'/g)) directActions.add(match[1]);
for (const arrayMatch of appRun.matchAll(/\[([^\]]+)\]\.includes\(action\)/g)) {
  for (const valueMatch of arrayMatch[1].matchAll(/'([^']+)'/g)) directActions.add(valueMatch[1]);
}
const registeredActions = new Set(runtime.listRegisteredActions());
const runtimeSpecial = new Set(['make_sure','use_recipe','call_result','name_result','use_result','repeat_program']);
const missing = [];
for (const command of manifest.commands.filter((item)=>item.kind==='instruction')) {
  const parsed = language.parseInstruction(command.example.replace(/\.$/,''),1);
  if (directActions.has(parsed.action) || registeredActions.has(parsed.semanticAction) || runtimeSpecial.has(parsed.semanticAction)) continue;
  missing.push(`${command.id}:${parsed.semanticAction}`);
}
assert.deepEqual(missing,[]);
const advertisedActions = new Set(grammar.capabilities.map((capability) => capability.action));
const semanticLanguageSource = fs.readFileSync('ide/ide-semantic-language.js', 'utf8');
const browserActionBlock = semanticLanguageSource.match(/const browserAction\s*=\s*\{([\s\S]*?)\n\s*\};/)?.[1] || '';
const mappedSemanticActions = new Set([...browserActionBlock.matchAll(/\b([A-Za-z0-9_]+)\s*:/g)].map((match) => match[1]));
const allStructuredRoutes = new Set([...mappedSemanticActions, ...registeredActions, ...runtimeSpecial, 'legacy_capability_declaration', 'use_reference']);
const missingAdvertisedActions = [...advertisedActions].filter((action) => !allStructuredRoutes.has(action)).sort();
assert.deepEqual(missingAdvertisedActions, []);
assert.equal(indexSource.includes('ide-semantic-extended-actions.js'),false);
assert.ok(indexSource.indexOf('ide-core-language-runtime.js') > semanticRuntimeIndex);
assert.ok(indexSource.indexOf('ide-semantic-microbiology-runtime.js') > semanticRuntimeIndex);
assert.equal(fs.readFileSync('ide/ide-current-file-language.js','utf8').includes('normalizeSource'),false);
assert.equal(fs.readFileSync('ide/ide-generated-current-file.js','utf8').includes('normalizeSource'),false);
console.log(`All ${manifest.commands.filter((item)=>item.kind==='instruction').length} published instructions and all ${advertisedActions.size} advertised semantic actions have direct structured browser execution coverage.`);
