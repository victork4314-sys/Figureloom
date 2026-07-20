(() => {
  if (window.__figureLoomFinalSessionPolishV1) return;
  window.__figureLoomFinalSessionPolishV1 = true;

  const root = document.documentElement;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const cursors = new Map();
  let scheduled = false;
  let finalRenderObject = null;

  const style = document.createElement('style');
  style.id = 'figureloomFinalSessionPolishStyle';
  style.textContent = `
    /* The project title and close X are one visible tab box. */
    html[data-figureloom-device-class="desktop"] body #projectTabRail .project-tab-wrap{
      position:relative!important;
      display:grid!important;
      grid-template-columns:minmax(0,1fr) 22px!important;
      align-items:center!important;
      column-gap:0!important;
      flex:0 1 190px!important;
      min-width:92px!important;
      max-width:190px!important;
      height:29px!important;
      min-height:29px!important;
      margin:0!important;
      padding:0!important;
      overflow:hidden!important;
      border:1px solid transparent!important;
      border-bottom:0!important;
      border-radius:9px 9px 0 0!important;
      background:transparent!important;
      color:var(--figureloom-ui-muted,#60706c)!important;
      box-shadow:none!important;
      box-sizing:border-box!important;
    }
    html[data-figureloom-device-class="desktop"] body #projectTabRail .project-tab-wrap:hover{
      background:var(--figureloom-ui-soft,#edf3f1)!important;
      color:var(--figureloom-ui-text,#172321)!important;
    }
    html[data-figureloom-device-class="desktop"] body #projectTabRail .project-tab-wrap.active{
      border-color:var(--figureloom-ui-line,#cddbd7)!important;
      background:var(--figureloom-ui-surface,#fff)!important;
      color:var(--figureloom-ui-text,#172321)!important;
      box-shadow:0 -3px 10px var(--figureloom-ui-shadow-soft,rgba(12,46,40,.08))!important;
    }
    html[data-figureloom-device-class="desktop"] body #projectTabRail .project-tab-wrap>.project-tab{
      position:static!important;
      grid-column:1!important;
      display:flex!important;
      align-items:center!important;
      gap:7px!important;
      width:100%!important;
      min-width:0!important;
      height:28px!important;
      min-height:28px!important;
      margin:0!important;
      padding:4px 6px 4px 9px!important;
      overflow:hidden!important;
      border:0!important;
      border-radius:0!important;
      background:transparent!important;
      color:inherit!important;
      box-shadow:none!important;
      box-sizing:border-box!important;
    }
    html[data-figureloom-device-class="desktop"] body #projectTabRail .project-tab-wrap>.project-tab:hover,
    html[data-figureloom-device-class="desktop"] body #projectTabRail .project-tab-wrap>.project-tab.active{
      border:0!important;
      background:transparent!important;
      box-shadow:none!important;
    }
    html[data-figureloom-device-class="desktop"] body #projectTabRail .project-tab-wrap>.project-tab-close{
      position:static!important;
      grid-column:2!important;
      align-self:center!important;
      justify-self:center!important;
      display:grid!important;
      place-items:center!important;
      width:20px!important;
      min-width:20px!important;
      max-width:20px!important;
      height:20px!important;
      min-height:20px!important;
      max-height:20px!important;
      margin:0!important;
      padding:0!important;
      inset:auto!important;
      transform:none!important;
      border:0!important;
      border-radius:5px!important;
      background:transparent!important;
      color:inherit!important;
      box-shadow:none!important;
      font-size:14px!important;
      line-height:1!important;
      opacity:.78!important;
    }
    html[data-figureloom-device-class="desktop"] body #projectTabRail .project-tab-wrap.active>.project-tab-close,
    html[data-figureloom-device-class="desktop"] body #projectTabRail .project-tab-wrap:hover>.project-tab-close,
    html[data-figureloom-device-class="desktop"] body #projectTabRail .project-tab-wrap:focus-within>.project-tab-close{opacity:1!important}
    html[data-figureloom-device-class="desktop"] body #projectTabRail .project-tab-wrap>.project-tab-close:hover:not(:disabled){
      background:var(--figureloom-ui-soft-strong,#e2ebe8)!important;
      color:var(--figureloom-ui-text,#172321)!important;
    }
    html[data-figureloom-device-class="desktop"] body #projectTabRail .project-tab-scroll>.project-tab-add{
      align-self:end!important;
      flex:0 0 29px!important;
      display:grid!important;
      place-items:center!important;
      width:29px!important;
      min-width:29px!important;
      max-width:29px!important;
      height:29px!important;
      min-height:29px!important;
      max-height:29px!important;
      margin:0 0 0 2px!important;
      padding:0!important;
      border:1px solid var(--figureloom-ui-line,#cddbd7)!important;
      border-bottom:0!important;
      border-radius:9px 9px 0 0!important;
      background:var(--figureloom-ui-soft,#edf3f1)!important;
      color:var(--figureloom-ui-text,#172321)!important;
      box-shadow:none!important;
      font-size:16px!important;
      font-weight:700!important;
      line-height:1!important;
    }

    /* Recovery History must use the same compact desktop density as the other drawers. */
    html[data-figureloom-device-class="desktop"] body #historyDrawer{
      width:min(420px,calc(100vw - 48px))!important;
      max-width:min(420px,calc(100vw - 48px))!important;
      top:72px!important;
      right:16px!important;
      bottom:auto!important;
      max-height:calc(100vh - 96px)!important;
      border-radius:11px!important;
      font-size:9px!important;
    }
    html[data-figureloom-device-class="desktop"] body #historyDrawer .utility-head{min-height:44px!important;padding:8px 10px!important;gap:8px!important}
    html[data-figureloom-device-class="desktop"] body #historyDrawer .utility-head strong{font-size:10px!important;line-height:1.2!important}
    html[data-figureloom-device-class="desktop"] body #historyDrawer .utility-head span{margin-top:2px!important;font-size:8px!important;line-height:1.25!important}
    html[data-figureloom-device-class="desktop"] body #historyDrawer .utility-head button{width:27px!important;min-width:27px!important;max-width:27px!important;height:27px!important;min-height:27px!important;max-height:27px!important;padding:0!important;border-radius:7px!important;font-size:18px!important;line-height:1!important}
    html[data-figureloom-device-class="desktop"] body #historyDrawer .utility-body{padding:8px 10px!important;font-size:9px!important;line-height:1.3!important}
    html[data-figureloom-device-class="desktop"] body #historyDrawer .tool-note{margin:0!important;font-size:8.5px!important;line-height:1.35!important}
    html[data-figureloom-device-class="desktop"] body #historyDrawer .snapshot{grid-template-columns:minmax(0,1fr) auto!important;gap:6px!important;padding:7px 0!important;font-size:8.5px!important;line-height:1.25!important}
    html[data-figureloom-device-class="desktop"] body #historyDrawer .snapshot strong{font-size:9px!important;line-height:1.25!important}
    html[data-figureloom-device-class="desktop"] body #historyDrawer .snapshot small{margin-top:2px!important;font-size:7.5px!important;line-height:1.25!important}
    html[data-figureloom-device-class="desktop"] body #historyDrawer .snapshot button{min-height:27px!important;height:27px!important;padding:0 7px!important;border-radius:6px!important;font-size:8px!important;line-height:1!important}

    /* Do not let the direct text editor shave off descenders or the final line. */
    .figureloom-direct-label-editor[data-figureloom-text-id]{
      overflow-x:hidden!important;
      overflow-y:auto!important;
      scrollbar-width:thin;
    }
    #figureloomRichTextOverlay .rich-editable{
      overflow-y:auto!important;
      line-height:1.35!important;
      padding-bottom:12px!important;
      box-sizing:border-box!important;
    }

    /* MCP agent presence. Paw icon adapted from Lucide PawPrint (ISC). */
    .figureloom-mcp-agent-cursor{
      position:fixed;
      z-index:2147483600;
      left:0;
      top:0;
      display:flex;
      align-items:flex-start;
      gap:5px;
      pointer-events:none;
      opacity:0;
      transform:translate3d(-120px,-120px,0);
      transition:transform .34s cubic-bezier(.2,.8,.2,1),opacity .16s ease;
      filter:drop-shadow(0 5px 10px rgba(0,0,0,.18));
      will-change:transform,opacity;
    }
    .figureloom-mcp-agent-cursor.visible{opacity:1}
    .figureloom-mcp-agent-cursor .mcp-paw{
      display:grid;
      place-items:center;
      width:25px;
      height:25px;
      border:1px solid color-mix(in srgb,var(--figureloom-ui-accent,#2f7468) 55%,#fff);
      border-radius:50% 50% 50% 8px;
      background:var(--figureloom-ui-accent,#2f7468);
      color:#fff;
      transform:rotate(-14deg);
    }
    .figureloom-mcp-agent-cursor .mcp-paw svg{width:17px;height:17px;display:block}
    .figureloom-mcp-agent-cursor .mcp-agent-label{
      display:grid;
      gap:1px;
      max-width:190px;
      padding:5px 7px;
      border:1px solid var(--figureloom-ui-line,#cddbd7);
      border-radius:8px;
      background:var(--figureloom-ui-surface-glass,rgba(255,255,255,.96));
      color:var(--figureloom-ui-text,#172321);
      box-shadow:0 7px 18px var(--figureloom-ui-shadow-soft,rgba(12,46,40,.16));
      backdrop-filter:blur(8px);
      font:700 9px/1.15 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
      white-space:nowrap;
    }
    .figureloom-mcp-agent-cursor .mcp-agent-label small{
      max-width:175px;
      overflow:hidden;
      text-overflow:ellipsis;
      color:var(--figureloom-ui-muted,#60706c);
      font-size:7.5px;
      font-weight:600;
    }
    html[data-figureloom-theme="dark"] .figureloom-mcp-agent-cursor .mcp-agent-label{
      background:rgba(36,44,42,.96);
      border-color:#50605c;
      color:#eef7f4;
    }
    @media(max-width:760px){.figureloom-mcp-agent-cursor .mcp-agent-label small{display:none}}
    @media(prefers-reduced-motion:reduce){.figureloom-mcp-agent-cursor{transition:opacity .12s ease}}
  `;

  function keepStyleLast() {
    if (!style.isConnected || document.head.lastElementChild !== style) document.head.appendChild(style);
  }

  function desktop() {
    return root.dataset.figureloomDeviceClass === 'desktop';
  }

  function enforceTabsAndRecovery() {
    if (!desktop()) return;
    const rail = document.getElementById('projectTabRail');
    const scroll = rail?.querySelector('.project-tab-scroll');
    const add = rail?.querySelector('.project-tab-add');

    rail?.querySelectorAll('.project-tab-wrap').forEach(wrapper => {
      const tab = wrapper.querySelector(':scope>.project-tab');
      wrapper.classList.toggle('active', Boolean(tab?.classList.contains('active')));
      wrapper.classList.toggle('disconnected', Boolean(tab?.classList.contains('disconnected')));
    });

    scroll?.querySelectorAll('.project-tab-add-inline').forEach(node => {
      if (node !== add) node.remove();
    });
    if (scroll && add && (add.parentElement !== scroll || scroll.lastElementChild !== add)) scroll.appendChild(add);

    const history = document.getElementById('historyDrawer');
    if (history) history.dataset.figureloomCompactRecovery = '1';
  }

  function textSafetyHeight(item, group) {
    if (!item || item.type !== 'text' || !group) return;
    const fontSize = Math.max(6, Number(item.fontSize) || 30);
    const lineHeight = fontSize * Math.max(1, Number(item.lineHeight) || 1.25);
    const padding = Math.max(0, Number(item.textPadding) || 0);
    const lineCount = Math.max(1, group.querySelectorAll('text tspan').length || String(item.text || '').split('\n').length);
    const descenderGuard = Math.max(5, Math.ceil(fontSize * .24));
    const required = Math.max(30, Math.ceil(lineCount * lineHeight + padding * 2 + descenderGuard));

    if (item.textFlow === 'auto-height' && Number(item.height) < required) {
      item.height = required;
      item.textBoxHeight = required;
    }

    const clipRect = group.querySelector('clipPath[data-figureloom-text-clip="1"] rect');
    if (clipRect) {
      const upperGuard = Math.max(2, Math.ceil(fontSize * .08));
      clipRect.setAttribute('y', String(-upperGuard));
      clipRect.setAttribute('height', String(Math.max(required, Number(item.height) || required) + upperGuard + descenderGuard));
    }

    const width = Math.max(1, Number(item.width) || 1);
    const height = Math.max(required, Number(item.height) || required);
    group.setAttribute('transform', `translate(${Number(item.x) || 0} ${Number(item.y) || 0}) rotate(${Number(item.rotation) || 0} ${width / 2} ${height / 2})`);
  }

  function installTextRenderGuard() {
    if (finalRenderObject || typeof window.renderObject !== 'function') return;
    const previous = window.renderObject;
    finalRenderObject = function renderObjectWithFinalTextSafety(item) {
      const group = previous(item);
      if (item?.type === 'text') textSafetyHeight(item, group);
      return group;
    };
    window.renderObject = finalRenderObject;
  }

  function fitDirectEditor(editor) {
    if (!(editor instanceof HTMLElement)) return;
    requestAnimationFrame(() => {
      if (!editor.isConnected) return;
      const computed = getComputedStyle(editor);
      const fontSize = Math.max(6, Number.parseFloat(computed.fontSize) || 16);
      const extra = Math.max(8, Math.ceil(fontSize * .32));
      const top = editor.getBoundingClientRect().top;
      const maximum = Math.max(32, window.innerHeight - top - 8);
      const height = Math.min(maximum, Math.max(editor.scrollHeight + extra, editor.getBoundingClientRect().height));
      editor.style.setProperty('height', `${Math.ceil(height)}px`, 'important');
      editor.style.setProperty('overflow-y', 'auto', 'important');
      editor.style.setProperty('padding-bottom', `${extra}px`, 'important');
      editor.style.setProperty('box-sizing', 'border-box', 'important');
    });
  }

  function normalizedAgentName(value) {
    const raw = String(value || '').trim();
    if (/claude|anthropic/i.test(raw)) return 'Claude';
    if (/codex/i.test(raw)) return 'Codex';
    if (/chatgpt|openai/i.test(raw)) return 'ChatGPT';
    if (/gemini|google/i.test(raw)) return 'Gemini';
    if (/cursor/i.test(raw)) return 'Cursor';
    return raw && !/^mcp client$/i.test(raw) ? raw.slice(0, 32) : 'MCP agent';
  }

  function friendlyCommand(command) {
    const value = String(command || 'Working').replace(/[._-]+/g, ' ').trim();
    return value ? value.replace(/\b\w/g, letter => letter.toUpperCase()).slice(0, 58) : 'Working';
  }

  function targetForCommand(command, args = {}) {
    const name = String(command || '').toLowerCase();
    const selectors = [];
    if (/export|render/.test(name)) selectors.push('#exportButton','.export-button');
    if (/share|comment|review/.test(name)) selectors.push('[data-tab="review"]','#shareButton','#reviewProDrawer');
    if (/template/.test(name)) selectors.push('[data-tab="templates"]','#templateDrawer');
    if (/asset|svg|image|illustration/.test(name)) selectors.push('[data-tab="illustrations"]','#scienceDrawer');
    if (/project|document/.test(name)) selectors.push('#projectTabRail','#projectsRibbonHost','#documentName');
    if (/page/.test(name)) selectors.push('#pagesList','.left-panel');
    if (/history|undo|redo/.test(name)) selectors.push('#undoButton','#redoButton');
    if (/view|zoom|grid|guide/.test(name)) selectors.push('.canvas-toolbar','#canvas');
    if (/text/.test(name)) selectors.push('#textInspector','#textContent');
    if (/ai\.|loomy|builder|gemini/.test(name)) selectors.push('#proToolsDrawer','[data-pro-tool="ai"]');

    const objectId = String(args.id || args.objectId || args.object_id || args.primaryId || '');
    if (objectId) selectors.unshift(`#canvas .canvas-object[data-id="${CSS.escape(objectId)}"]`);
    if (/object|selection|arrange|connector|clipboard/.test(name)) selectors.push('#canvas .canvas-object[data-id]','#canvas');
    selectors.push('#canvas','.canvas-area');

    for (const selector of selectors) {
      try {
        const node = document.querySelector(selector);
        if (node && node.getClientRects().length) return node;
      } catch {}
    }
    return document.body;
  }

  function targetPoint(target, sessionId) {
    const rect = target?.getBoundingClientRect?.() || { left:innerWidth / 2, top:innerHeight / 2, width:0, height:0, right:innerWidth / 2, bottom:innerHeight / 2 };
    const index = [...cursors.keys()].indexOf(sessionId);
    const stagger = Math.max(0, index) * 18;
    const x = Math.min(innerWidth - 150, Math.max(8, rect.left + Math.min(Math.max(12, rect.width * .62), Math.max(12, rect.width - 18)) + stagger));
    const y = Math.min(innerHeight - 54, Math.max(8, rect.top + Math.min(Math.max(10, rect.height * .34), Math.max(10, rect.height - 18)) + stagger));
    return { x, y };
  }

  function createAgentCursor(sessionId) {
    const cursor = document.createElement('div');
    cursor.className = 'figureloom-mcp-agent-cursor';
    cursor.dataset.sessionId = sessionId;
    cursor.innerHTML = `
      <span class="mcp-paw" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="4" r="2"></circle>
          <circle cx="18" cy="8" r="2"></circle>
          <circle cx="20" cy="16" r="2"></circle>
          <path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"></path>
        </svg>
      </span>
      <span class="mcp-agent-label"><b>MCP agent</b><small>Working</small></span>`;
    document.body.appendChild(cursor);
    const state = { element:cursor, hideTimer:0 };
    cursors.set(sessionId, state);
    return state;
  }

  function showAgentActivity(detail = {}) {
    const sessionId = String(detail.sessionId || 'mcp-agent');
    const state = cursors.get(sessionId) || createAgentCursor(sessionId);
    clearTimeout(state.hideTimer);
    const name = normalizedAgentName(detail.clientName);
    const command = friendlyCommand(detail.command);
    state.element.querySelector('b').textContent = name;
    state.element.querySelector('small').textContent = detail.phase === 'end' ? `${command} · done` : command;
    const target = targetForCommand(detail.command, detail.args || {});
    const point = targetPoint(target, sessionId);
    state.element.style.transform = `translate3d(${Math.round(point.x)}px,${Math.round(point.y)}px,0)`;
    state.element.classList.add('visible');
    state.element.dataset.phase = detail.phase || 'start';
    if (detail.phase === 'end') {
      state.hideTimer = setTimeout(() => state.element.classList.remove('visible'), detail.ok === false ? 1800 : 1000);
    }
  }

  function refresh() {
    scheduled = false;
    keepStyleLast();
    enforceTabsAndRecovery();
    installTextRenderGuard();
    document.querySelectorAll('.figureloom-direct-label-editor[data-figureloom-text-id]').forEach(fitDirectEditor);
  }

  function scheduleRefresh() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(refresh);
  }

  document.getElementById(style.id)?.remove();
  document.head.appendChild(style);

  document.addEventListener('focusin', event => {
    const editor = event.target.closest?.('.figureloom-direct-label-editor[data-figureloom-text-id]');
    if (editor) fitDirectEditor(editor);
  }, true);
  document.addEventListener('input', event => {
    const editor = event.target.closest?.('.figureloom-direct-label-editor[data-figureloom-text-id]');
    if (editor) fitDirectEditor(editor);
  }, true);
  addEventListener('figureloom-mcp-agent-activity', event => showAgentActivity(event.detail || {}));
  addEventListener('figureloom-settings-change', scheduleRefresh);
  addEventListener('resize', scheduleRefresh, { passive:true });
  new MutationObserver(scheduleRefresh).observe(document.documentElement, { childList:true, subtree:true, attributes:true, attributeFilter:['class','aria-selected'] });

  refresh();
  window.FigureLoomFinalSessionPolish = Object.freeze({ refresh, showAgentActivity, enforceTabsAndRecovery, textSafetyHeight });
})();
