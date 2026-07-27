import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';

const read = (path) => fs.readFileSync(path, 'utf8');
const baseGrammar = JSON.parse(read('figureloom-bio/figureloom_bio/language_grammar.json'));
const grammar = JSON.parse(read('figureloom-bio/figureloom_bio/bio_expansion_grammar.json'));

const actions = [
  'calculate_codon_use','calculate_gc_skew','find_sequence_repeats','find_telomeres','summarize_copy_number','find_structural_variants',
  'normalize_expression','summarize_differential_expression','find_marker_genes','summarize_splicing','count_isoforms','calculate_gene_correlation',
  'calculate_protein_weight','count_peptides','summarize_protein_coverage','find_protein_domains','find_missed_cleavages','create_peptide_length_plot',
  'summarize_taxa','calculate_richness','calculate_shannon_diversity','find_resistance_genes','summarize_abundance','find_unclassified_reads',
  'count_tree_tips','summarize_branch_lengths','find_long_branches','create_distance_matrix','summarize_phylogenetic_tree','compare_phylogenetic_trees',
  'summarize_methylation','find_methylated_sites','summarize_peaks','find_promoter_peaks','calculate_peak_widths','summarize_chromatin_accessibility',
  'summarize_cells','count_umis','summarize_cell_clusters','find_doublets','summarize_mitochondrial_reads','normalize_single_cell_counts',
  'calculate_allele_frequency','calculate_heterozygosity','count_haplotypes','summarize_populations','find_rare_variants','summarize_genotypes',
  'count_residues','count_protein_chains','find_residue_contacts','summarize_secondary_structure','find_surface_residues','summarize_coordinates',
];
assert.equal(actions.length, 54, 'The broad scientific expansion must contain 54 new actions.');

const rules = grammar.capabilities.filter((rule) => actions.includes(rule.action));
assert.equal(rules.length, actions.length, 'Every broad scientific action must have exactly one operation-target rule.');
assert.deepEqual(new Set(rules.map((rule) => rule.action)), new Set(actions));

const capitalize = (value) => value ? value[0].toUpperCase() + value.slice(1) : value;
const pick = (group, key, index) => {
  const values = grammar[group]?.[key];
  assert.ok(values?.length, `Missing ${group}.${key}`);
  return values[index % values.length];
};
const sourceFile = (action) => action === 'compare_phylogenetic_trees' ? 'other-tree.csv' : 'support.csv';
const actionNumber = (action, index) => ({
  find_long_branches:0.5,
  find_methylated_sites:0.7,
  find_doublets:0.5,
  find_rare_variants:0.05,
  find_residue_contacts:8,
  find_surface_residues:20,
}[action] ?? 5 + index);

const sources = rules.map((rule, index) => {
  const parts = [pick('operations', rule.operation, index), pick('targets', rule.target, index + 1)];
  if (rule.needs_number) parts.push(String(actionNumber(rule.action, index)));
  if (rule.needs_file) parts.push(pick('roles', 'using', index), sourceFile(rule.action));
  return `${capitalize(parts.join(' '))}.`;
});
assert.equal(new Set(sources).size, sources.length, 'Generated scientific instructions must all be distinct.');
for (const source of sources) {
  assert.ok(!JSON.stringify(grammar).includes(source), `A complete generated instruction was stored in the grammar: ${source}`);
}

const windowObject = { dispatchEvent() {} };
const sandbox = {
  window:windowObject,
  globalThis:null,
  CustomEvent:class CustomEvent { constructor(type, options={}) { this.type=type; this.detail=options.detail; } },
  fetch:async (url) => ({
    ok:true,
    status:200,
    json:async () => String(url).includes('bio_expansion_grammar') ? structuredClone(grammar) : structuredClone(baseGrammar),
  }),
  structuredClone,
  Promise,
  Map,
  Set,
  Object,
  String,
  Number,
  Math,
  RegExp,
  Array,
  JSON,
  console,
};
sandbox.globalThis = sandbox;
windowObject.window = windowObject;
vm.createContext(sandbox);
vm.runInContext(read('ide/ide-semantic-language.js'), sandbox);
vm.runInContext(read('ide/ide-bio-expansion-language.js'), sandbox);
vm.runInContext(read('ide/ide-semantic-runtime.js'), sandbox);
vm.runInContext(read('ide/ide-bio-expansion-runtime.js'), sandbox);
vm.runInContext(read('ide/ide-bio-expansion-runtime-2.js'), sandbox);
vm.runInContext(read('ide/ide-scientific-informatics-runtime.js'), sandbox);
const api = await windowObject.FigureLoomBioSemanticLanguageReady;
const runtime = windowObject.FigureLoomBioSemanticRuntime;

const browserNodes = sources.map((source, index) => api.parseSemanticInstruction(source.slice(0, -1), index + 1));
assert.deepEqual(browserNodes.map((node) => node.action), rules.map((rule) => rule.action));
assert.ok(browserNodes.every((node) => node.type === 'instruction' && node.operation && node.targets.length));
for (const action of actions) assert.equal(typeof runtime.getActionHandler(action), 'function', `Missing browser handler for ${action}`);

const python = spawnSync('python3', ['-c', `
import json
from figureloom_bio.parser import parse
sources=json.loads(input())
print(json.dumps([{"action":item.action,"operation":item.operation,"targets":list(item.targets)} for item in parse("\\n".join(sources))]))
`], {
  cwd:'figureloom-bio',
  input:JSON.stringify(sources),
  encoding:'utf8',
  env:{ ...process.env, PYTHONPATH:'.' },
});
assert.equal(python.status, 0, python.stderr);
const pythonNodes = JSON.parse(python.stdout);
for (let index = 0; index < browserNodes.length; index += 1) {
  assert.equal(browserNodes[index].action, pythonNodes[index].action, sources[index]);
  assert.equal(browserNodes[index].operation, pythonNodes[index].operation, sources[index]);
  assert.deepEqual(Array.from(browserNodes[index].targets), pythonNodes[index].targets, sources[index]);
}

const dnaData = () => ({ kind:'sequences', format:'fasta', records:[
  { name:'dna_a', sequence:'ATGATGATGTTAGGGTTAGGGCCCTAA', quality:null },
  { name:'dna_b', sequence:'ATGCCCGGGAAATAGTAA', quality:null },
  { name:'dna_c', sequence:'ACGTACGTACGT', quality:null },
] });
const proteinData = () => ({ kind:'sequences', format:'fasta', records:[
  { name:'protein_a', sequence:'MKWVTFISLLFLFSSAYSR', quality:null },
  { name:'protein_b', sequence:'MKRPTKRRK', quality:null },
] });
const variantData = () => ({ kind:'table', delimiter:',', columns:['chrom','pos','ref','alt','svtype','copy_number','AC','AN','population','sample_a','sample_b'], rows:[
  { chrom:'1', pos:'100', ref:'A', alt:'G', svtype:'', copy_number:'2', AC:'1', AN:'4', population:'north', sample_a:'0/1', sample_b:'0/0' },
  { chrom:'1', pos:'200', ref:'A', alt:'<DEL>', svtype:'DEL', copy_number:'1', AC:'3', AN:'4', population:'south', sample_a:'1/1', sample_b:'0/1' },
  { chrom:'2', pos:'300', ref:'C', alt:'T', svtype:'', copy_number:'4', AC:'0', AN:'4', population:'north', sample_a:'0/0', sample_b:'0/0' },
] });
const expressionData = () => ({ kind:'table', delimiter:',', columns:['gene','sample_a','sample_b','log2fc','padj','event','psi','isoform','transcript_id'], rows:[
  { gene:'g1', sample_a:'10', sample_b:'20', log2fc:'2.1', padj:'0.01', event:'SE', psi:'0.8', isoform:'i1', transcript_id:'t1' },
  { gene:'g2', sample_a:'30', sample_b:'15', log2fc:'-1.5', padj:'0.03', event:'A5SS', psi:'0.4', isoform:'i2', transcript_id:'t2' },
  { gene:'g3', sample_a:'5', sample_b:'5', log2fc:'0.1', padj:'0.9', event:'SE', psi:'0.5', isoform:'i3', transcript_id:'t3' },
] });
const proteinTable = () => ({ kind:'table', delimiter:',', columns:['protein','coverage','domain'], rows:[
  { protein:'p1', coverage:'80', domain:'PF00001' },
  { protein:'p2', coverage:'55', domain:'' },
] });
const metagenomeData = () => ({ kind:'table', delimiter:',', columns:['read','taxon','abundance','gene','product','classification'], rows:[
  { read:'r1', taxon:'Escherichia coli', abundance:'40', gene:'blaTEM', product:'beta-lactam resistance', classification:'classified' },
  { read:'r2', taxon:'Bacillus subtilis', abundance:'20', gene:'abc', product:'enzyme', classification:'classified' },
  { read:'r3', taxon:'unclassified', abundance:'5', gene:'', product:'', classification:'unclassified' },
] });
const treeData = () => ({ kind:'table', delimiter:',', columns:['parent','child','branch_length'], rows:[
  { parent:'root', child:'clade_a', branch_length:'0.2' },
  { parent:'clade_a', child:'tip_1', branch_length:'0.8' },
  { parent:'clade_a', child:'tip_2', branch_length:'0.3' },
] });
const otherTreeData = () => ({ kind:'table', delimiter:',', columns:['parent','child','branch_length'], rows:[
  { parent:'root', child:'tip_1', branch_length:'0.4' },
  { parent:'root', child:'tip_3', branch_length:'0.6' },
] });
const epigenomeData = () => ({ kind:'table', delimiter:',', columns:['chrom','start','end','methylation','annotation','accessibility'], rows:[
  { chrom:'1', start:'100', end:'180', methylation:'0.9', annotation:'promoter', accessibility:'25' },
  { chrom:'1', start:'220', end:'270', methylation:'0.3', annotation:'enhancer', accessibility:'10' },
] });
const singleCellData = () => ({ kind:'table', delimiter:',', columns:['cell','cluster','umis','doublet_score','percent_mt','gene_a','gene_b'], rows:[
  { cell:'c1', cluster:'0', umis:'1000', doublet_score:'0.1', percent_mt:'4', gene_a:'10', gene_b:'2' },
  { cell:'c2', cluster:'1', umis:'2000', doublet_score:'0.8', percent_mt:'12', gene_a:'3', gene_b:'20' },
] });
const structureData = () => ({ kind:'table', delimiter:',', columns:['chain','residue','x','y','z','secondary_structure','sasa'], rows:[
  { chain:'A', residue:'1', x:'0', y:'0', z:'0', secondary_structure:'helix', sasa:'35' },
  { chain:'A', residue:'2', x:'3', y:'0', z:'0', secondary_structure:'helix', sasa:'10' },
  { chain:'B', residue:'3', x:'6', y:'0', z:'0', secondary_structure:'sheet', sasa:'45' },
] });

const groups = {
  dna:new Set(['calculate_codon_use','calculate_gc_skew','find_sequence_repeats','find_telomeres','create_distance_matrix','count_haplotypes']),
  protein:new Set(['calculate_protein_weight','count_peptides','find_missed_cleavages','create_peptide_length_plot','count_residues']),
  proteinTable:new Set(['summarize_protein_coverage','find_protein_domains']),
  variant:new Set(['summarize_copy_number','find_structural_variants','calculate_allele_frequency','calculate_heterozygosity','summarize_populations','find_rare_variants','summarize_genotypes']),
  expression:new Set(['normalize_expression','summarize_differential_expression','find_marker_genes','summarize_splicing','count_isoforms','calculate_gene_correlation']),
  metagenome:new Set(['summarize_taxa','calculate_richness','calculate_shannon_diversity','find_resistance_genes','summarize_abundance','find_unclassified_reads']),
  tree:new Set(['count_tree_tips','summarize_branch_lengths','find_long_branches','summarize_phylogenetic_tree','compare_phylogenetic_trees']),
  epigenome:new Set(['summarize_methylation','find_methylated_sites','summarize_peaks','find_promoter_peaks','calculate_peak_widths','summarize_chromatin_accessibility']),
  singleCell:new Set(['summarize_cells','count_umis','summarize_cell_clusters','find_doublets','summarize_mitochondrial_reads','normalize_single_cell_counts']),
  structure:new Set(['count_protein_chains','find_residue_contacts','summarize_secondary_structure','find_surface_residues','summarize_coordinates']),
};
const dataFor = (action) => {
  if (groups.dna.has(action)) return dnaData();
  if (groups.protein.has(action)) return proteinData();
  if (groups.proteinTable.has(action)) return proteinTable();
  if (groups.variant.has(action)) return variantData();
  if (groups.expression.has(action)) return expressionData();
  if (groups.metagenome.has(action)) return metagenomeData();
  if (groups.tree.has(action)) return treeData();
  if (groups.epigenome.has(action)) return epigenomeData();
  if (groups.singleCell.has(action)) return singleCellData();
  if (groups.structure.has(action)) return structureData();
  throw new Error(`No execution dataset for ${action}`);
};

for (let index = 0; index < browserNodes.length; index += 1) {
  const node = browserNodes[index];
  const context = { data:dataFor(node.action) };
  const sections = [];
  const helpers = {
    Error:class TestError extends Error {},
    section:(title, details={}) => sections.push({ title, details }),
    open:(name) => name === 'other-tree.csv' ? otherTreeData() : null,
  };
  await runtime.getActionHandler(node.action)({ node, context, helpers, line:index + 1 });
  assert.ok(sections.length, `The direct handler for ${node.action} produced no result.`);
}

const html = read('ide/index.html');
assert.ok(html.indexOf('ide-scientific-informatics-runtime.js') > html.indexOf('ide-semantic-runtime.js'));
assert.ok(html.indexOf('ide-scientific-informatics-runtime.js') < html.indexOf('ide-semantic-run-authority.js'));
assert.ok(html.indexOf('ide-scientific-informatics-runtime.js') < html.indexOf('ide-app-v2.js'));

console.log(`Generated, parsed, parity-checked, and directly executed ${actions.length} scientific informatics actions without a stored sentence catalog.`);
