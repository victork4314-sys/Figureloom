import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = (file) => fs.readFileSync(file, 'utf8');
const vocabulary = JSON.parse(read('figureloom-bio/figureloom_bio/language_vocabulary.json'));

const windowListeners = {};
const documentListeners = {};

class FakeElement {
  constructor(id = '') {
    this.id = id;
    this.value = '';
    this.selectionStart = 0;
    this.selectionEnd = 0;
  }
  addEventListener(type, listener) {
    (this.listeners ||= {})[type] ||= [];
    this.listeners[type].push(listener);
  }
  closest(selector) {
    return selector === `#${this.id}` ? this : null;
  }
  setSelectionRange(start, end) {
    this.selectionStart = start;
    this.selectionEnd = end;
  }
  dispatchEvent() {}
  click() {
    const event = {
      target:this,
      defaultPrevented:false,
      stopped:false,
      preventDefault() { this.defaultPrevented = true; },
      stopImmediatePropagation() { this.stopped = true; },
    };
    for (const listener of windowListeners.click || []) {
      listener(event);
      if (event.stopped) break;
    }
    for (const listener of this.listeners?.click || []) {
      listener(event);
      if (event.stopped) break;
    }
  }
}

const editor = new FakeElement('programEditor');
const runButton = new FakeElement('runButton');
const elements = { programEditor:editor, runButton };

const windowObject = {
  addEventListener(type, listener) {
    (windowListeners[type] ||= []).push(listener);
  },
  dispatchEvent() {},
  FigureLoomBioStatementRecognizers:[() => true],
  FigureLoomBioCompleteLanguage:{ uses:() => true },
  FigureLoomBioCurrentFile:{ normalizeSource:(source) => `${source}\n` },
  FigureLoomBioLanguage:{ commands:[{ example:'anything.' }] },
};

const documentObject = {
  getElementById(id) { return elements[id] || null; },
  addEventListener(type, listener) {
    (documentListeners[type] ||= []).push(listener);
  },
};

const context = vm.createContext({
  console,
  window:windowObject,
  document:documentObject,
  Element:FakeElement,
  Event:class Event { constructor(type, options = {}) { this.type = type; this.bubbles = Boolean(options.bubbles); } },
  CustomEvent:class CustomEvent { constructor(type, options = {}) { this.type = type; this.detail = options.detail; } },
  fetch:async () => ({ ok:true, status:200, json:async () => vocabulary }),
  queueMicrotask,
  Promise,
  Map,
  Set,
  Object,
  String,
  Number,
  RegExp,
});
windowObject.window = windowObject;
windowObject.document = documentObject;

new vm.Script(read('ide/ide-language-compiler.js'), { filename:'ide-language-compiler.js' }).runInContext(context);
await windowObject.FigureLoomBioCompilerReady;

windowObject.FigureLoomBioLanguageAliases = {
  recognizes:() => true,
  normalizeSource:(source) => String(source),
};

new vm.Script(read('ide/ide-logic-compiler.js'), { filename:'ide-logic-compiler.js' }).runInContext(context);

const source = [
  'Read the file example-samples.csv.',
  'Retain records where condition equals treated.',
  'Filter out records where status equals failed.',
  'Total the records.',
  'Display the output.',
].join('\n');

const expected = [
  'Open the file example-samples.csv.',
  'Keep only rows marked treated under condition.',
  'Remove rows marked failed under status.',
  'Count the rows.',
  'Show the result.',
].join('\n');

assert.equal(
  windowObject.FigureLoomBioLogicCompiler.normalizeSource(source),
  expected,
  'Every red sentence from the screenshot must compile before broad runtime recognition.',
);

const freeformRecognizer = windowObject.FigureLoomBioStatementRecognizers.at(-1);
assert.equal(typeof freeformRecognizer, 'function');
assert.equal(freeformRecognizer(source), true, 'The syntax layer must recognize the free-form program as valid.');

let runtimeSaw = null;
windowListeners.click.push(() => { runtimeSaw = editor.value; });
editor.value = source;
editor.selectionStart = source.length;
editor.selectionEnd = source.length;
runButton.click();

assert.equal(runtimeSaw, expected, 'The later production runtime must receive canonical instructions.');
await Promise.resolve();
assert.equal(editor.value, source, 'The editor must keep the exact wording the user wrote.');

const html = read('ide/index.html');
assert.match(html, /ide-logic-compiler\.js\?v=3&freeform=1/);

console.log('The exact red stress-test lines compile before runtime recognition, appear valid to the highlighter, execute canonically, and remain unchanged in the editor.');
