(() => {
  if (window.__figureLoomProCodeToolsV2) return;
  window.__figureLoomProCodeToolsV2 = true;

  let drawer = null;
  let controls = null;
  let activeId = '';
  let inspectorWrapped = false;
  let inputTimer = 0;

  function api() { return window.FigureLoomCodeWindows; }

  function editableItems() {
    const found = [];
    const seen = new Set();
    const add = item => {
      if (!item || !['code','instruction'].includes(item.type) || seen.has(item)) return;
      seen.add(item);
      found.push(item);
    };
    (state?.objects || []).forEach(add);
    (state?.pages || []).forEach(page => (page.objects || []).forEach(add));
    return found;
  }

  function findItem(id) {
    return editableItems().find(item => item.id === id) || null;
  }

  function selectedEditable() {
    try {
      const selected = typeof selectedObject === 'function' ? selectedObject() : null;
      if (selected && ['code','instruction'].includes(selected.type)) {
        activeId = selected.id;
        return selected;
      }
    } catch {}
    const active = findItem(activeId);
    if (active) return active;
    const fallback = editableItems().at(-1) || null;
    if (fallback) activeId = fallback.id;
    return fallback;
  }

  function removeLegacyEntries() {
    document.getElementById('addCodeWindowButton')?.remove();
    document.querySelectorAll('[data-insert-code-window]').forEach(node => node.remove());
    document.getElementById('codeWindowInspector')?.remove();
  }

  function redraw() {
    try { render?.(); } catch {}
    try { renderLayers?.(); } catch {}
    try { renderPages?.(); } catch {}
    try { scheduleSave?.(); } catch {}
  }

  function mutate(mutator, { history = true, immediate = true } = {}) {
    const item = selectedEditable();
    if (!item) return;
    if (history) try { pushHistory?.(); } catch {}
    if (item.type === 'code') api()?.codeDefaults?.(item);
    else api()?.instructionDefaults?.(item);
    mutator(item);
    item.name = item.type === 'code' ? (item.codeTitle || controls?.language?.selectedOptions?.[0]?.textContent || 'Code') : (item.instructionTitle || 'Workflow instructions');
    if (immediate) redraw();
    sync();
  }

  function mutateInput(mutator) {
    mutate(mutator, { history:false, immediate:false });
    clearTimeout(inputTimer);
    inputTimer = setTimeout(redraw, 90);
  }

  function setDisabled(nodes, disabled) {
    nodes.forEach(node => {
      node.disabled = disabled;
      node.setAttribute('aria-disabled', String(disabled));
    });
  }

  function sync() {
    if (!controls) return;
    const item = selectedEditable();
    const active = Boolean(item);
    controls.status.textContent = active ? `${item.type === 'instruction' ? 'Instruction block' : 'Code window'} · ${item.name || 'Untitled'}` : 'Add or select a code window or instruction block.';
    controls.codePanel.hidden = item?.type !== 'code';
    controls.instructionPanel.hidden = item?.type !== 'instruction';
    controls.empty.hidden = active;
    controls.copy.disabled = !active;
    controls.large.disabled = item?.type !== 'code';
    if (!active) return;
    activeId = item.id;

    if (item.type === 'code') {
      api()?.codeDefaults?.(item);
      setDisabled(controls.codeInputs, false);
      controls.mode.value = item.codeMode || 'code';
      controls.title.value = item.codeTitle || '';
      controls.language.value = item.language || 'plain';
      controls.theme.value = item.codeTheme || 'dark';
      controls.font.value = item.codeFontFamily || controls.font.options[0].value;
      controls.fontSize.value = String(item.codeFontSize || 16);
      controls.tabSize.value = String(item.codeTabSize || 4);
      controls.indentTabs.checked = item.codeIndentWithTabs === true;
      controls.lines.checked = item.codeLineNumbers !== false;
      controls.wrap.checked = item.codeWrap !== false;
      controls.header.checked = item.codeHeader !== false;
      controls.copyToggle.checked = item.codeCopyButton !== false;
      controls.radius.value = String(item.codeBorderRadius ?? 12);
      controls.padding.value = String(item.codePadding ?? 11);
      controls.highlight.value = item.codeHighlightLines || '';
      controls.code.value = item.code || '';
      controls.before.value = item.diffBefore || '';
      controls.after.value = item.diffAfter || '';
      controls.normalEditor.hidden = item.codeMode === 'diff';
      controls.diffEditor.hidden = item.codeMode !== 'diff';
    } else {
      api()?.instructionDefaults?.(item);
      setDisabled(controls.instructionInputs, false);
      controls.instructionTitle.value = item.instructionTitle || '';
      controls.purpose.value = item.instructionPurpose || '';
      controls.prerequisites.value = item.instructionPrerequisites || '';
      controls.steps.value = Array.isArray(item.instructionSteps) ? item.instructionSteps.join('\n') : String(item.instructionSteps || '');
      controls.warnings.value = item.instructionWarnings || '';
      controls.expected.value = item.instructionExpected || '';
      controls.notes.value = item.instructionNotes || '';
      controls.instructionTheme.value = item.instructionTheme || 'light';
      controls.accent.value = item.instructionAccent || '#315ec7';
      controls.instructionCopy.checked = item.instructionCopyButton !== false;
      controls.instructionRadius.value = String(item.instructionBorderRadius ?? 12);
      controls.instructionFontSize.value = String(item.instructionFontSize ?? 15);
    }
  }

  function addAndSelect(kind) {
    const id = kind === 'instruction' ? api()?.addInstruction?.() : api()?.add?.({ mode:kind });
    if (!id) return;
    activeId = id;
    state.selectedId = id;
    sync();
    drawer?.classList.add('open');
  }

  function ensureDrawer() {
    if (drawer) return drawer;
    if (typeof createDrawer !== 'function') return null;
    drawer = createDrawer('codeToolsDrawer', 'Code & instructions', 'Code windows, diffs, terminal snippets and structured workflows');
    drawer.classList.add('pro-code-tools-drawer');
    const body = drawer.querySelector('.utility-body');
    body.innerHTML = `
      <div class="pro-code-add-grid">
        <button type="button" data-add="code"><strong>Code window</strong><small>Syntax-highlighted code</small></button>
        <button type="button" data-add="terminal"><strong>Terminal</strong><small>Commands and output</small></button>
        <button type="button" data-add="diff"><strong>Diff</strong><small>Before and after changes</small></button>
        <button type="button" data-add="instruction"><strong>Instructions</strong><small>Purpose, steps and result</small></button>
      </div>
      <section class="pro-code-selected">
        <div class="pro-code-heading">
          <div><strong>Selected object</strong><small id="proCodeStatus">Add or select an object.</small></div>
          <div class="pro-code-heading-actions"><button type="button" id="proCopyCurrent" disabled>Copy</button><button type="button" id="proOpenCodeEditor" disabled>Large editor</button></div>
        </div>
        <p id="proCodeEmpty" class="tool-note">Choose an option above or select an existing code/instruction object on the canvas.</p>
        <div id="proCodePanel" hidden>
          <div class="pro-code-grid three">
            <label>Display mode<select id="proCodeMode"><option value="code">Code</option><option value="terminal">Terminal</option><option value="diff">Diff</option></select></label>
            <label>Language<select id="proCodeLanguage"></select></label>
            <label>Theme<select id="proCodeTheme"><option value="dark">Dark</option><option value="light">Light</option></select></label>
          </div>
          <label>Window title<input id="proCodeTitle" type="text"></label>
          <div id="proNormalCodeEditor"><label>Code<textarea id="proCodeContent" rows="12" spellcheck="false" autocapitalize="off"></textarea></label></div>
          <div id="proDiffCodeEditor" hidden class="pro-code-diff-grid">
            <label>Before<textarea id="proDiffBefore" rows="9" spellcheck="false" autocapitalize="off"></textarea></label>
            <label>After<textarea id="proDiffAfter" rows="9" spellcheck="false" autocapitalize="off"></textarea></label>
          </div>
          <details open class="pro-code-options"><summary>Formatting and behavior</summary>
            <div class="pro-code-grid three">
              <label>Font<select id="proCodeFont"><option value="SFMono-Regular, Consolas, Liberation Mono, monospace">System mono</option><option value="JetBrains Mono, SFMono-Regular, Consolas, monospace">JetBrains Mono</option><option value="Fira Code, SFMono-Regular, Consolas, monospace">Fira Code</option><option value="ui-monospace, SFMono-Regular, Menlo, monospace">UI monospace</option></select></label>
              <label>Font size<input id="proCodeFontSize" type="number" min="9" max="36" step="1"></label>
              <label>Tab width<input id="proCodeTabSize" type="number" min="1" max="8" step="1"></label>
              <label>Corner radius<input id="proCodeRadius" type="number" min="0" max="32" step="1"></label>
              <label>Inner padding<input id="proCodePadding" type="number" min="4" max="30" step="1"></label>
              <label>Highlight lines<input id="proCodeHighlight" type="text" placeholder="2, 4-7"></label>
            </div>
            <div class="pro-code-checks">
              <label><input id="proCodeIndentTabs" type="checkbox"> Insert tabs</label>
              <label><input id="proCodeLines" type="checkbox"> Line numbers</label>
              <label><input id="proCodeWrap" type="checkbox"> Wrap long lines</label>
              <label><input id="proCodeHeader" type="checkbox"> Header</label>
              <label><input id="proCodeCopyToggle" type="checkbox"> Copy button</label>
            </div>
          </details>
        </div>
        <div id="proInstructionPanel" hidden>
          <div class="pro-code-grid three">
            <label>Theme<select id="proInstructionTheme"><option value="light">Light</option><option value="dark">Dark</option></select></label>
            <label>Accent<input id="proInstructionAccent" type="color"></label>
            <label>Font size<input id="proInstructionFontSize" type="number" min="10" max="28" step="1"></label>
          </div>
          <label>Title<input id="proInstructionTitle" type="text"></label>
          <label>Purpose<textarea id="proInstructionPurpose" rows="3"></textarea></label>
          <label>Prerequisites<textarea id="proInstructionPrerequisites" rows="3"></textarea></label>
          <label>Numbered steps <small>One step per line</small><textarea id="proInstructionSteps" rows="7"></textarea></label>
          <label>Warnings<textarea id="proInstructionWarnings" rows="3"></textarea></label>
          <label>Expected result<textarea id="proInstructionExpected" rows="3"></textarea></label>
          <label>Notes<textarea id="proInstructionNotes" rows="3"></textarea></label>
          <div class="pro-code-grid two"><label>Corner radius<input id="proInstructionRadius" type="number" min="0" max="32" step="1"></label><label class="pro-inline-check"><input id="proInstructionCopy" type="checkbox"> Copy button</label></div>
        </div>
      </section>`;

    const byId = id => body.querySelector(`#${id}`);
    controls = {
      status:byId('proCodeStatus'), empty:byId('proCodeEmpty'), copy:byId('proCopyCurrent'), large:byId('proOpenCodeEditor'), codePanel:byId('proCodePanel'), instructionPanel:byId('proInstructionPanel'),
      mode:byId('proCodeMode'), language:byId('proCodeLanguage'), theme:byId('proCodeTheme'), title:byId('proCodeTitle'), code:byId('proCodeContent'), before:byId('proDiffBefore'), after:byId('proDiffAfter'), normalEditor:byId('proNormalCodeEditor'), diffEditor:byId('proDiffCodeEditor'), font:byId('proCodeFont'), fontSize:byId('proCodeFontSize'), tabSize:byId('proCodeTabSize'), indentTabs:byId('proCodeIndentTabs'), lines:byId('proCodeLines'), wrap:byId('proCodeWrap'), header:byId('proCodeHeader'), copyToggle:byId('proCodeCopyToggle'), radius:byId('proCodeRadius'), padding:byId('proCodePadding'), highlight:byId('proCodeHighlight'),
      instructionTitle:byId('proInstructionTitle'), purpose:byId('proInstructionPurpose'), prerequisites:byId('proInstructionPrerequisites'), steps:byId('proInstructionSteps'), warnings:byId('proInstructionWarnings'), expected:byId('proInstructionExpected'), notes:byId('proInstructionNotes'), instructionTheme:byId('proInstructionTheme'), accent:byId('proInstructionAccent'), instructionCopy:byId('proInstructionCopy'), instructionRadius:byId('proInstructionRadius'), instructionFontSize:byId('proInstructionFontSize')
    };
    controls.codeInputs = [controls.mode,controls.language,controls.theme,controls.title,controls.code,controls.before,controls.after,controls.font,controls.fontSize,controls.tabSize,controls.indentTabs,controls.lines,controls.wrap,controls.header,controls.copyToggle,controls.radius,controls.padding,controls.highlight];
    controls.instructionInputs = [controls.instructionTitle,controls.purpose,controls.prerequisites,controls.steps,controls.warnings,controls.expected,controls.notes,controls.instructionTheme,controls.accent,controls.instructionCopy,controls.instructionRadius,controls.instructionFontSize];
    setDisabled(controls.codeInputs, true);
    setDisabled(controls.instructionInputs, true);
    const languageOptions = api()?.languages || [['plain','Plain text'],['python','Python'],['r','R'],['bash','Bash'],['javascript','JavaScript'],['html','HTML'],['css','CSS'],['sql','SQL'],['json','JSON'],['yaml','YAML'],['matlab','MATLAB'],['julia','Julia'],['cpp','C / C++'],['java','Java']];
    languageOptions.forEach(([value,label]) => controls.language.add(new Option(label,value)));
    body.querySelectorAll('[data-add]').forEach(button => button.addEventListener('click', () => addAndSelect(button.dataset.add)));

    controls.mode.addEventListener('change', event => mutate(item => { item.codeMode = event.target.value; if (item.codeMode === 'terminal') { item.codeLineNumbers = false; item.language = item.language === 'plain' ? 'bash' : item.language; } }));
    controls.language.addEventListener('change', event => mutate(item => { item.language = event.target.value; }));
    controls.theme.addEventListener('change', event => mutate(item => { item.codeTheme = event.target.value; }));
    controls.title.addEventListener('input', event => mutateInput(item => { item.codeTitle = event.target.value; }));
    controls.code.addEventListener('input', event => mutateInput(item => { item.code = event.target.value; }));
    controls.before.addEventListener('input', event => mutateInput(item => { item.diffBefore = event.target.value; }));
    controls.after.addEventListener('input', event => mutateInput(item => { item.diffAfter = event.target.value; }));
    controls.code.addEventListener('keydown', event => { const item = selectedEditable(); if (item?.type === 'code') api()?.textareaTabHandler?.(event,item); });
    controls.before.addEventListener('keydown', event => { const item = selectedEditable(); if (item?.type === 'code') api()?.textareaTabHandler?.(event,item); });
    controls.after.addEventListener('keydown', event => { const item = selectedEditable(); if (item?.type === 'code') api()?.textareaTabHandler?.(event,item); });
    controls.font.addEventListener('change', event => mutate(item => { item.codeFontFamily = event.target.value; }));
    controls.fontSize.addEventListener('change', event => mutate(item => { item.codeFontSize = Number(event.target.value) || 16; }));
    controls.tabSize.addEventListener('change', event => mutate(item => { item.codeTabSize = Number(event.target.value) || 4; }));
    controls.indentTabs.addEventListener('change', event => mutate(item => { item.codeIndentWithTabs = event.target.checked; }));
    controls.lines.addEventListener('change', event => mutate(item => { item.codeLineNumbers = event.target.checked; }));
    controls.wrap.addEventListener('change', event => mutate(item => { item.codeWrap = event.target.checked; }));
    controls.header.addEventListener('change', event => mutate(item => { item.codeHeader = event.target.checked; }));
    controls.copyToggle.addEventListener('change', event => mutate(item => { item.codeCopyButton = event.target.checked; }));
    controls.radius.addEventListener('change', event => mutate(item => { item.codeBorderRadius = Number(event.target.value) || 0; }));
    controls.padding.addEventListener('change', event => mutate(item => { item.codePadding = Number(event.target.value) || 11; }));
    controls.highlight.addEventListener('input', event => mutateInput(item => { item.codeHighlightLines = event.target.value; }));

    controls.instructionTitle.addEventListener('input', event => mutateInput(item => { item.instructionTitle = event.target.value; }));
    controls.purpose.addEventListener('input', event => mutateInput(item => { item.instructionPurpose = event.target.value; }));
    controls.prerequisites.addEventListener('input', event => mutateInput(item => { item.instructionPrerequisites = event.target.value; }));
    controls.steps.addEventListener('input', event => mutateInput(item => { item.instructionSteps = event.target.value.split(/\r?\n/); }));
    controls.warnings.addEventListener('input', event => mutateInput(item => { item.instructionWarnings = event.target.value; }));
    controls.expected.addEventListener('input', event => mutateInput(item => { item.instructionExpected = event.target.value; }));
    controls.notes.addEventListener('input', event => mutateInput(item => { item.instructionNotes = event.target.value; }));
    controls.instructionTheme.addEventListener('change', event => mutate(item => { item.instructionTheme = event.target.value; }));
    controls.accent.addEventListener('input', event => mutateInput(item => { item.instructionAccent = event.target.value; }));
    controls.instructionCopy.addEventListener('change', event => mutate(item => { item.instructionCopyButton = event.target.checked; }));
    controls.instructionRadius.addEventListener('change', event => mutate(item => { item.instructionBorderRadius = Number(event.target.value) || 0; }));
    controls.instructionFontSize.addEventListener('change', event => mutate(item => { item.instructionFontSize = Number(event.target.value) || 15; }));
    controls.large.addEventListener('click', () => { const item = selectedEditable(); if (item?.type === 'code') api()?.edit?.(item.id); });
    controls.copy.addEventListener('click', () => { const item = selectedEditable(); if (!item) return; const text = item.type === 'instruction' ? api()?.instructionPlain?.(item) : item.codeMode === 'diff' ? `${item.diffBefore || ''}\n---\n${item.diffAfter || ''}` : item.code; api()?.copyText?.(text); });

    const style = document.createElement('style');
    style.id = 'figureloomProCodeToolsStyleV2';
    style.textContent = `.pro-code-tools-drawer{width:min(880px,calc(100vw - 20px))!important}.pro-code-tools-drawer .utility-body{overscroll-behavior:contain}.pro-code-add-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:11px}.pro-code-add-grid button{display:grid;gap:4px;min-height:64px;padding:10px;border:1px solid #cfd7e3;border-radius:10px;background:#f8fafc;color:#26344a;text-align:left;touch-action:manipulation}.pro-code-add-grid button:hover{border-color:#7899da;background:#eef4ff}.pro-code-add-grid strong{font-size:11px}.pro-code-add-grid small{color:#748095;font-size:9px;line-height:1.3}.pro-code-selected{display:grid;gap:10px;padding:12px;border:1px solid #d9e0e9;border-radius:11px;background:#fff}.pro-code-heading{display:flex;align-items:center;justify-content:space-between;gap:10px}.pro-code-heading strong,.pro-code-heading small{display:block}.pro-code-heading strong{font-size:12px}.pro-code-heading small{margin-top:3px;color:#748095;font-size:9px}.pro-code-heading-actions{display:flex;gap:6px}.pro-code-heading button{border:1px solid #cfd7e3;border-radius:7px;background:#f8fafc;padding:7px 9px;font-size:10px}#proCodePanel,#proInstructionPanel{display:grid;gap:10px}#proCodePanel[hidden],#proInstructionPanel[hidden],#proCodeEmpty[hidden],#proNormalCodeEditor[hidden],#proDiffCodeEditor[hidden]{display:none!important}.pro-code-selected label,.pro-code-options label{display:grid;gap:5px;color:#657287;font-size:10px}.pro-code-selected label small{font-size:8px;font-weight:500}.pro-code-selected input,.pro-code-selected select,.pro-code-selected textarea{position:relative;z-index:1;width:100%;min-width:0;box-sizing:border-box;border:1px solid #cfd7e3;border-radius:7px;background:#fff;color:#253044;padding:7px;pointer-events:auto!important;touch-action:manipulation!important}.pro-code-selected select{min-height:36px}.pro-code-selected textarea{resize:vertical}.pro-code-selected textarea[id^="proCode"],.pro-code-selected textarea[id^="proDiff"]{background:#111827;color:#e5e7eb;font:12px/1.5 SFMono-Regular,Consolas,Liberation Mono,monospace;tab-size:4}.pro-code-grid{display:grid;gap:8px}.pro-code-grid.two{grid-template-columns:repeat(2,minmax(0,1fr))}.pro-code-grid.three{grid-template-columns:repeat(3,minmax(0,1fr))}.pro-code-diff-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.pro-code-checks{display:flex;flex-wrap:wrap;gap:12px;margin-top:9px;color:#657287;font-size:10px}.pro-code-checks label,.pro-inline-check{display:flex!important;align-items:center;gap:6px}.pro-code-checks input,.pro-inline-check input{width:auto!important}.pro-code-options{padding:9px;border:1px solid #e1e6ee;border-radius:9px;background:#f8fafc}.pro-code-options summary{cursor:pointer;color:#52627a;font-size:10px;font-weight:700;margin-bottom:9px}html[data-figureloom-theme="dark"] .pro-code-selected{border-color:#454c57;background:#30353d;color:#eef1f4}html[data-figureloom-theme="dark"] .pro-code-add-grid button,html[data-figureloom-theme="dark"] .pro-code-heading button,html[data-figureloom-theme="dark"] .pro-code-options{border-color:#505864;background:#373d46;color:#eef1f4}html[data-figureloom-theme="dark"] .pro-code-selected label,html[data-figureloom-theme="dark"] .pro-code-heading small,html[data-figureloom-theme="dark"] .pro-code-checks{color:#aab2bd}html[data-figureloom-theme="dark"] .pro-code-selected input,html[data-figureloom-theme="dark"] .pro-code-selected select,html[data-figureloom-theme="dark"] .pro-code-selected textarea:not([id^="proCode"]):not([id^="proDiff"]){border-color:#505864;background:#343a43;color:#eef1f4}@media(max-width:760px){.pro-code-add-grid{grid-template-columns:1fr 1fr}.pro-code-grid.three,.pro-code-diff-grid{grid-template-columns:1fr}.pro-code-heading{align-items:flex-start;flex-direction:column}.pro-code-heading-actions{width:100%}.pro-code-heading-actions button{flex:1}}`;
    document.head.appendChild(style);
    return drawer;
  }

  function wrapInspector() {
    if (inspectorWrapped || typeof updateInspector !== 'function') return;
    inspectorWrapped = true;
    const base = updateInspector;
    updateInspector = function updateInspectorWithProCodeTools() { base(); removeLegacyEntries(); sync(); };
  }

  function openWorkspace(preferredId = '') {
    if (preferredId && findItem(preferredId)) activeId = preferredId;
    else selectedEditable();
    removeLegacyEntries();
    ensureDrawer()?.classList.add('open');
    sync();
  }

  function setup() {
    removeLegacyEntries();
    const codeDrawer = ensureDrawer();
    wrapInspector();
    if (!window.SciCanvasPro || !api() || !codeDrawer) { setTimeout(setup, 60); return; }
    if (codeDrawer.dataset.proCodeRegistered !== '1') {
      codeDrawer.dataset.proCodeRegistered = '1';
      window.SciCanvasPro.register('code', () => openWorkspace(), { title:'Code & instructions' });
    }
    window.FigureLoomCodeWindows.openWorkspace = openWorkspace;
    document.getElementById('canvas')?.addEventListener('pointerup', () => setTimeout(sync, 0), true);
    sync();
    setTimeout(removeLegacyEntries, 700);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(setup, 0), { once:true });
  else setTimeout(setup, 0);
})();