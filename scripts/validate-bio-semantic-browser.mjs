import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const root = process.cwd();
const indexPath = path.join(root, 'ide', 'index.html');
const index = fs.readFileSync(indexPath, 'utf8');
const scripts = [...index.matchAll(/<script[^>]+src="([^"]+)"[^>]*><\/script>/g)].map((match) => match[1]);
const html = index
  .replace(/<script[^>]*>.*?<\/script>/gs, '')
  .replace(/<link[^>]+rel="stylesheet"[^>]*>/g, '');
const resources = {};
for (const [url, filename] of Object.entries({
  '../figureloom-bio/figureloom_bio/language_grammar.json':'figureloom-bio/figureloom_bio/language_grammar.json',
  '../figureloom-bio/figureloom_bio/language_manifest.json':'figureloom-bio/figureloom_bio/language_manifest.json',
  '../figureloom-bio/figureloom_bio/language_aliases.json':'figureloom-bio/figureloom_bio/language_aliases.json',
  '../figureloom-bio/figureloom_bio/language_vocabulary.json':'figureloom-bio/figureloom_bio/language_vocabulary.json',
  './ide-large-file-vault.js':'ide/ide-large-file-vault.js',
  './ide-core-language-runtime.js':'ide/ide-core-language-runtime.js',
})) {
  if (fs.existsSync(path.join(root,filename))) resources[url] = fs.readFileSync(path.join(root,filename),'utf8');
}
for (let index = 0; index < 5; index += 1) {
  const name = `ide/ide-control-flow-runtime.part${String(index).padStart(2,'0')}`;
  if (fs.existsSync(path.join(root,name))) resources[`./${path.basename(name)}`] = fs.readFileSync(path.join(root,name),'utf8');
}

const high = 'I'.repeat(60);
const low = '!'.repeat(60);
const scenarios = [
  {
    name:'genes',
    program:'Open the file genes.fasta.\nFind genes.\nCount the genes.\nShow the genes.\nSave the genes as genes.csv.\nList the files.\n',
    files:{'genes.fasta':`>seq1\nAAAATG${'A'.repeat(90)}TAACCCC\n>seq2\nATG${'G'.repeat(96)}TAG\n`},
    outputs:['genes.csv'],
  },
  {
    name:'sample-loop',
    program:'Open all FASTQ files as samples.\nFor every sample in samples:\n    Open the sample.\n    Remove reads with low quality.\n    Save the result using the sample name.\n',
    files:{
      'alpha.fastq':`@alpha-good\n${'A'.repeat(60)}\n+\n${high}\n@alpha-bad\n${'C'.repeat(60)}\n+\n${low}\n`,
      'beta.fastq':`@beta-good\n${'G'.repeat(60)}\n+\n${high}\n@beta-bad\n${'T'.repeat(60)}\n+\n${low}\n`,
    },
    outputs:['alpha-result.fastq','beta-result.fastq'],
  },
  {
    name:'microbiology',
    program:'Open the files forward.fastq and reverse.fastq as a pair.\nPrepare bacterial reads.\nAssemble the bacterial genome from forward.fastq and reverse.fastq into assembly.\nCheck the assembly assembly/contigs.fasta into assembly-quality.\nAnnotate the bacterial genome assembly/contigs.fasta into annotation.\n',
    files:{
      'forward.fastq':`@f1\n${'A'.repeat(30)}${'C'.repeat(30)}${'G'.repeat(30)}\n+\n${'I'.repeat(90)}\n`,
      'reverse.fastq':`@r1\n${'G'.repeat(30)}${'T'.repeat(30)}${'A'.repeat(30)}\n+\n${'I'.repeat(90)}\n`,
    },
    outputs:['assembly/contigs.fasta','assembly-quality/assembly-summary.csv','annotation/browser-orfs.csv'],
  },
];

const browser = await chromium.launch({headless:true});
try {
  for (const scenario of scenarios) {
    const page = await browser.newPage();
    const browserErrors = [];
    page.on('pageerror', (error) => browserErrors.push(`pageerror:${error}`));
    page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(`console:${message.text()}`); });
    await page.setContent(html, {waitUntil:'domcontentloaded'});
    const files = {'test.flbio':scenario.program,...scenario.files};
    await page.evaluate(({resources,files}) => {
      const makeStorage = () => {
        const data = new Map();
        return {getItem:key=>data.has(String(key))?data.get(String(key)):null,setItem:(key,value)=>data.set(String(key),String(value)),removeItem:key=>data.delete(String(key)),clear:()=>data.clear(),key:index=>[...data.keys()][index]??null,get length(){return data.size;}};
      };
      Object.defineProperty(window,'localStorage',{value:makeStorage(),configurable:true});
      Object.defineProperty(window,'sessionStorage',{value:makeStorage(),configurable:true});
      localStorage.setItem('figureloom-bio-ide-files-v1',JSON.stringify(files));
      localStorage.setItem('figureloom-bio-ide-active-v1','test.flbio');
      localStorage.setItem('figureloom-bio-ide-deleted-files-v1','[]');
      window.fetch = async (url) => {
        const key = String(url).split('?')[0];
        if (Object.prototype.hasOwnProperty.call(resources,key)) {
          const body = resources[key];
          return {ok:true,status:200,text:async()=>body,json:async()=>JSON.parse(body)};
        }
        return {ok:false,status:404,text:async()=>'',json:async()=>({})};
      };
      window.__semanticErrors = [];
      window.addEventListener('error', event => window.__semanticErrors.push(`error:${event.message}`));
      window.addEventListener('unhandledrejection', event => window.__semanticErrors.push(`rejection:${String(event.reason?.stack || event.reason)}`));
    }, {resources,files});
    for (const source of scripts) {
      const clean = source.split('?')[0];
      const filename = path.resolve(root,'ide',clean);
      assert.ok(fs.existsSync(filename),`Missing production script ${source}`);
      await page.addScriptTag({path:filename});
    }
    await page.waitForFunction(() => Boolean(window.FigureLoomBioSemanticLanguageReady));
    await page.evaluate(() => window.FigureLoomBioSemanticLanguageReady);
    await page.evaluate(() => window.FigureLoomBioFlowLoading);
    await page.waitForTimeout(250);
    const original = await page.locator('#programEditor').inputValue();
    await page.locator('#runButton').click();
    await page.waitForFunction(() => ['Finished','Needs attention'].some(value => document.getElementById('runStatus').textContent.trim().startsWith(value)),null,{timeout:15000});
    const status = await page.locator('#runStatus').innerText();
    const stored = JSON.parse(await page.evaluate(() => localStorage.getItem('figureloom-bio-ide-files-v1')));
    assert.ok(status.startsWith('Finished'),`${scenario.name}: ${status}\n${await page.locator('#results').innerText()}`);
    assert.equal(await page.locator('#programEditor').inputValue(),original,`${scenario.name}: Run changed the user's source`);
    assert.deepEqual(await page.evaluate(() => window.__semanticErrors),[],`${scenario.name}: window errors`);
    assert.deepEqual(browserErrors,[],`${scenario.name}: browser errors`);
    for (const output of scenario.outputs) assert.ok(Object.prototype.hasOwnProperty.call(stored,output),`${scenario.name}: missing ${output}`);
    await page.close();
    console.log(`${scenario.name}: real Run button passed with source preserved and ${scenario.outputs.length} expected output(s).`);
  }
} finally {
  await browser.close();
}
