(() => {
  const NAME_KEY = 'scicanvas-user-name-v1';
  const WELCOME_KEY = 'scicanvas-welcome-v1';
  const TOUR_KEY = 'scicanvas-guided-tour-v3';
  const OLD_TOUR_KEY = 'scicanvas-guided-tour-v2';
  const LAB_KEY = 'scicanvas-lab-focus-v1';

  // The original tour schedules itself after script evaluation. Mark it replaced now,
  // then install the richer passive tour once the rest of the interface has initialized.
  if (!localStorage.getItem(OLD_TOUR_KEY)) localStorage.setItem(OLD_TOUR_KEY, 'replaced-by-v3');

  function cleanName(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 32);
  }

  function currentName() {
    return cleanName(localStorage.getItem(NAME_KEY));
  }

  function reducedMotion() {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  }

  function installStyle() {
    if (document.getElementById('polishDelightStyle')) return;
    const style = document.createElement('style');
    style.id = 'polishDelightStyle';
    style.textContent = `
      :root{
        --delight-ink:#1d2939;
        --delight-muted:#66758a;
        --delight-line:rgba(105,125,151,.22);
        --delight-glass:rgba(250,252,255,.84);
        --delight-blue:#4169c1;
        --delight-cyan:#58a9b8;
        --delight-moss:#789978;
        --delight-lilac:#8f82b8;
        --delight-shadow:0 16px 44px rgba(38,55,80,.12);
      }
      body{
        color:var(--delight-ink);
        background:
          radial-gradient(circle at 8% 8%,rgba(104,169,177,.13),transparent 26%),
          radial-gradient(circle at 92% 12%,rgba(143,130,184,.12),transparent 29%),
          linear-gradient(145deg,#edf3f5 0%,#f5f4f8 48%,#edf2f7 100%);
      }
      .app-shell{background:transparent!important}
      .titlebar{
        background:linear-gradient(115deg,rgba(251,253,255,.94),rgba(242,248,249,.9) 50%,rgba(248,246,252,.92))!important;
        border-bottom:1px solid var(--delight-line)!important;
        box-shadow:0 8px 26px rgba(48,65,90,.07)!important;
        backdrop-filter:blur(16px) saturate(1.15);
      }
      .brand-mark{
        background:linear-gradient(145deg,#365eae,#5d91a0 56%,#8175a8)!important;
        box-shadow:0 7px 18px rgba(65,105,193,.24)!important;
        border:1px solid rgba(255,255,255,.65)!important;
      }
      .brand strong{letter-spacing:-.025em}.brand span{color:#718095!important}
      .document-title input{
        border-color:rgba(104,126,154,.23)!important;
        background:rgba(255,255,255,.72)!important;
        box-shadow:inset 0 1px 0 rgba(255,255,255,.72)!important;
      }
      .ribbon-tabs{
        background:rgba(248,251,253,.8)!important;
        border-bottom:1px solid var(--delight-line)!important;
        backdrop-filter:blur(12px);
      }
      .ribbon-tab{position:relative;color:#65738a!important;transition:color .16s ease,background .16s ease,transform .16s ease}
      .ribbon-tab:hover{color:#334e79!important;background:rgba(75,116,165,.07)!important}
      .ribbon-tab.active{color:#294d91!important;background:linear-gradient(180deg,rgba(237,245,250,.8),rgba(240,241,250,.88))!important}
      .ribbon-tab.active::after{content:'';position:absolute;left:18%;right:18%;bottom:0;height:2px;border-radius:999px;background:linear-gradient(90deg,var(--delight-cyan),var(--delight-blue),var(--delight-lilac))}
      .ribbon{
        background:rgba(251,253,255,.76)!important;
        border-bottom:1px solid var(--delight-line)!important;
        backdrop-filter:blur(12px);
      }
      .tool-group{border-color:rgba(111,132,158,.18)!important}
      .tool-group-label,.panel-heading h2{letter-spacing:.075em;text-transform:uppercase;color:#748198!important;font-size:9px!important}
      .left-panel,.right-panel{
        background:linear-gradient(180deg,rgba(251,253,255,.88),rgba(245,248,250,.86))!important;
        border-color:var(--delight-line)!important;
        backdrop-filter:blur(16px);
      }
      .panel-heading,.inspector-tabs{border-color:var(--delight-line)!important}
      .canvas-area{
        background:
          radial-gradient(circle at 24% 12%,rgba(85,159,173,.08),transparent 30%),
          radial-gradient(circle at 78% 78%,rgba(137,123,177,.07),transparent 34%),
          linear-gradient(145deg,#e8eef2,#eef1f5 48%,#e8edf1)!important;
      }
      #canvas{filter:drop-shadow(0 18px 28px rgba(28,43,65,.13))}
      button,input,select,textarea{font-family:Inter,'Avenir Next','Segoe UI',system-ui,sans-serif}
      button{transition:transform .14s ease,box-shadow .14s ease,border-color .14s ease,background .14s ease,color .14s ease}
      button:not(:disabled):hover{border-color:rgba(68,103,169,.43)!important;box-shadow:0 5px 14px rgba(48,70,105,.09)}
      button:not(:disabled):active{transform:translateY(1px) scale(.985)}
      .science-card,.pack-icon,.component-card,.template-card,.pro-workspace-card,.utility-card,.page-thumbnail{
        border-color:rgba(103,125,153,.22)!important;
        background:linear-gradient(150deg,rgba(255,255,255,.94),rgba(246,249,251,.91))!important;
        box-shadow:0 5px 16px rgba(45,64,91,.06)!important;
        transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease!important;
      }
      .science-card:hover,.pack-icon:hover,.component-card:hover,.template-card:hover,.pro-workspace-card:hover,.page-thumbnail:hover{
        transform:translateY(-2px);box-shadow:0 11px 26px rgba(45,64,91,.12)!important;border-color:rgba(72,113,171,.38)!important;
      }
      .utility-drawer,.packs-drawer,#scienceDrawer{
        border-color:rgba(100,122,150,.25)!important;
        background:linear-gradient(145deg,rgba(251,253,255,.96),rgba(242,247,249,.95))!important;
        box-shadow:var(--delight-shadow)!important;
        backdrop-filter:blur(18px) saturate(1.08);
      }
      .statusbar{background:rgba(248,251,252,.86)!important;border-top:1px solid var(--delight-line)!important;color:#718095!important;backdrop-filter:blur(10px)}
      .empty-state{color:#8591a2!important;text-align:center!important;padding:18px 10px!important}
      .empty-state::before{content:'⌬';display:block;margin:0 auto 6px;font-size:20px;color:#8da7aa}
      *{scrollbar-color:#a8b9c5 transparent}
      ::selection{background:rgba(86,151,173,.25)}

      #userGreetingButton{
        display:inline-flex;align-items:center;gap:5px;max-width:150px!important;min-width:0!important;padding:6px 10px!important;
        border-color:rgba(91,128,150,.24)!important;border-radius:999px!important;background:linear-gradient(135deg,rgba(235,247,247,.94),rgba(241,239,249,.94))!important;
        color:#405871!important;font-size:11px!important;font-weight:700;white-space:nowrap!important;overflow:hidden;text-overflow:ellipsis;
      }
      #userGreetingButton::before{content:'●';font-size:7px;color:#6ea2a0;box-shadow:0 0 0 3px rgba(110,162,160,.13);border-radius:50%}
      .greeting-arrival{animation:greetingArrival .55s cubic-bezier(.2,.8,.2,1)}
      @keyframes greetingArrival{from{opacity:0;transform:translateY(-7px)}to{opacity:1;transform:none}}

      #scWelcome{position:fixed;inset:0;z-index:1400;display:none;place-items:center;padding:18px;background:rgba(20,32,48,.38);backdrop-filter:blur(15px);isolation:isolate;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
      #scWelcome.open{display:grid}
      .welcome-orbit{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:-1}
      .welcome-orbit span{position:absolute;display:grid;place-items:center;width:54px;height:54px;border:1px solid rgba(224,245,245,.26);border-radius:50%;color:rgba(236,250,250,.58);font-size:21px;animation:welcomeFloat 9s ease-in-out infinite}
      .welcome-orbit span:nth-child(1){left:8%;top:18%}.welcome-orbit span:nth-child(2){right:10%;top:12%;animation-delay:-2s}.welcome-orbit span:nth-child(3){left:16%;bottom:12%;animation-delay:-4s}.welcome-orbit span:nth-child(4){right:15%;bottom:18%;animation-delay:-6s}
      @keyframes welcomeFloat{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-15px) rotate(8deg)}}
      .welcome-card{width:min(570px,calc(100vw - 28px));max-height:calc(100vh - 36px);max-height:calc(100dvh - 36px);overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;touch-action:pan-y;padding:28px;border:1px solid rgba(211,226,234,.72);border-radius:24px;background:linear-gradient(145deg,rgba(252,254,255,.98),rgba(241,248,248,.97) 54%,rgba(246,243,250,.98));box-shadow:0 38px 110px rgba(15,27,43,.36);color:var(--delight-ink)}
      .welcome-kicker{display:inline-flex;align-items:center;gap:7px;margin-bottom:15px;padding:6px 10px;border-radius:999px;background:rgba(80,143,153,.1);color:#547d83;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
      .welcome-card h1{margin:0;font-size:clamp(28px,6vw,46px);line-height:1.02;letter-spacing:-.045em;background:linear-gradient(110deg,#263e67,#4c7d85 56%,#786b9e);-webkit-background-clip:text;background-clip:text;color:transparent}
      .welcome-card>p{margin:12px 0 20px;color:#66758a;line-height:1.55;font-size:14px}
      .welcome-name-label{display:grid;gap:7px;color:#546479;font-size:11px;font-weight:800}
      .welcome-name-label input{width:100%;min-height:48px;padding:11px 13px;border:1px solid #bfcdd9;border-radius:12px;background:rgba(255,255,255,.88);font-size:17px;color:#24344b;outline:none}
      .welcome-name-label input:focus{border-color:#5a8dac;box-shadow:0 0 0 4px rgba(90,141,172,.13)}
      .welcome-actions{display:flex;justify-content:flex-end;gap:9px;margin-top:20px}.welcome-actions button{min-height:42px;padding:9px 15px;border-radius:10px}.welcome-actions .welcome-primary{background:linear-gradient(135deg,#3e68b9,#5c8e9a)!important;border-color:transparent!important;color:white!important;font-weight:800}
      .welcome-privacy{margin-top:12px!important;font-size:10px!important;color:#8591a2!important}

      #scicanvasTour{position:fixed;inset:0;z-index:1300;display:none;pointer-events:none}#scicanvasTour.open{display:block}
      #scicanvasTour .tour-shade{position:absolute;inset:0;background:rgba(23,34,50,.14);pointer-events:none;backdrop-filter:blur(1.5px)}
      #scicanvasTour .tour-highlight{position:fixed;z-index:1;border:2px solid #5c91a2;border-radius:13px;box-shadow:0 0 0 5px rgba(92,145,162,.16),0 12px 34px rgba(36,61,81,.17);pointer-events:none;transition:left .13s ease,top .13s ease,width .13s ease,height .13s ease}
      #scicanvasTour .tour-card{position:absolute;z-index:2;left:50%;bottom:22px;transform:translateX(-50%);width:min(560px,calc(100vw - 24px));padding:19px;border:1px solid rgba(181,202,212,.75);border-radius:18px;background:linear-gradient(145deg,rgba(253,254,255,.98),rgba(242,248,248,.98));box-shadow:0 28px 90px rgba(17,30,47,.3);pointer-events:auto}
      #scicanvasTour .tour-progress{display:flex;justify-content:space-between;align-items:center;color:#587c86;font-size:10px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
      #scicanvasTour .tour-progress-bar{height:4px;margin:9px 0 14px;border-radius:999px;background:#dfe8eb;overflow:hidden}.tour-progress-fill{height:100%;border-radius:inherit;background:linear-gradient(90deg,#5c9aa2,#5277bd,#8a79ab);transition:width .16s ease}
      #scicanvasTour h2{margin:0 0 7px;color:#23344d;font-size:21px;letter-spacing:-.025em}#scicanvasTour p{margin:0;color:#607086;line-height:1.52}
      #scicanvasTour .tour-passive-note{margin-top:9px;font-size:10px;color:#8290a2}
      #scicanvasTour .tour-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:17px;flex-wrap:wrap}#scicanvasTour .tour-actions button{min-height:38px;padding:8px 13px;border-radius:9px}.tour-primary{background:linear-gradient(135deg,#426dbd,#588c98)!important;border-color:transparent!important;color:white!important;font-weight:800}

      .delight-toast{position:fixed;z-index:1800;left:50%;bottom:24px;transform:translate(-50%,12px);max-width:min(430px,calc(100vw - 24px));padding:10px 14px;border:1px solid rgba(137,164,177,.42);border-radius:999px;background:rgba(244,250,250,.96);box-shadow:0 14px 42px rgba(25,43,61,.2);color:#40566b;font-size:12px;font-weight:750;opacity:0;pointer-events:none;transition:opacity .18s ease,transform .18s ease}.delight-toast.open{opacity:1;transform:translate(-50%,0)}
      #dnaEasterEgg{position:fixed;inset:0;z-index:1700;pointer-events:none;overflow:hidden;background:radial-gradient(circle at 50% 50%,rgba(31,53,73,.12),transparent 55%)}
      .dna-ribbon{position:absolute;left:50%;top:50%;width:min(760px,94vw);height:260px;transform:translate(-50%,-50%) rotate(-7deg)}
      .dna-pair{position:absolute;left:calc(var(--i) * 4.15%);top:50%;width:3px;height:calc(28px + var(--wave) * 1px);background:linear-gradient(#5a9da3,#7c72a4);transform:translateY(-50%) rotate(calc(var(--rot) * 1deg));border-radius:999px;animation:dnaShimmer 1.5s ease-in-out infinite alternate;animation-delay:calc(var(--i) * -45ms)}
      .dna-pair::before,.dna-pair::after{content:'';position:absolute;left:50%;width:13px;height:13px;border-radius:50%;transform:translateX(-50%);box-shadow:0 0 18px currentColor}.dna-pair::before{top:-7px;background:#70b1b3;color:#70b1b3}.dna-pair::after{bottom:-7px;background:#8d7eb4;color:#8d7eb4}
      @keyframes dnaShimmer{to{filter:hue-rotate(18deg) brightness(1.12);transform:translateY(-50%) rotate(calc(var(--rot) * 1deg)) scaleY(1.08)}}

      body.lab-focus-mode{background:radial-gradient(circle at 18% 12%,#173e45,#0b1723 46%,#090f18)!important}
      body.lab-focus-mode .titlebar,body.lab-focus-mode .ribbon-tabs,body.lab-focus-mode .ribbon,body.lab-focus-mode .left-panel,body.lab-focus-mode .right-panel,body.lab-focus-mode .statusbar{background:rgba(11,26,36,.92)!important;border-color:rgba(80,207,210,.24)!important;color:#ccecef!important}
      body.lab-focus-mode .brand strong,body.lab-focus-mode .ribbon-tab,body.lab-focus-mode .panel-heading h2,body.lab-focus-mode .tool-group-label{color:#acd9df!important}
      body.lab-focus-mode .ribbon-tab.active{background:rgba(52,158,167,.14)!important;color:#81e2df!important}
      body.lab-focus-mode .canvas-area{background:radial-gradient(circle at 50% 25%,#173340,#0d1c29 62%,#09131d)!important}
      body.lab-focus-mode .document-title input,body.lab-focus-mode button,body.lab-focus-mode input,body.lab-focus-mode select,body.lab-focus-mode textarea{background:#102633!important;border-color:rgba(91,196,201,.28)!important;color:#d9f0f1!important}
      body.lab-focus-mode #canvas{filter:drop-shadow(0 20px 30px rgba(0,0,0,.45))}

      @media(max-width:640px){#userGreetingButton{max-width:92px!important;padding-inline:8px!important}#scWelcome{padding:max(10px,env(safe-area-inset-top)) max(10px,env(safe-area-inset-right)) max(10px,env(safe-area-inset-bottom)) max(10px,env(safe-area-inset-left))}.welcome-card{width:100%;max-height:calc(100vh - 20px);max-height:calc(100dvh - 20px);padding:22px;border-radius:20px}.welcome-actions{justify-content:stretch}.welcome-actions button{flex:1}.welcome-card h1{font-size:34px}#scicanvasTour .tour-card{bottom:9px;padding:15px}}
      @media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important}.welcome-orbit span{animation:none!important}}
    `;
    document.head.appendChild(style);
  }

  function toast(message) {
    let node = document.getElementById('delightToast');
    if (!node) {
      node = document.createElement('div');
      node.id = 'delightToast';
      node.className = 'delight-toast';
      node.setAttribute('role', 'status');
      node.setAttribute('aria-live', 'polite');
      document.body.appendChild(node);
    }
    node.textContent = message;
    node.classList.remove('open');
    requestAnimationFrame(() => node.classList.add('open'));
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.remove('open'), 2600);
  }

  function greetingText(name) {
    const hour = new Date().getHours();
    const hello = hour < 5 ? 'Hi' : hour < 12 ? 'Morning' : hour < 18 ? 'Hi' : 'Evening';
    return `${hello}, ${name}`;
  }

  function installGreeting() {
    const name = currentName();
    document.getElementById('userGreetingButton')?.remove();
    if (!name) return;
    const button = document.createElement('button');
    button.id = 'userGreetingButton';
    button.type = 'button';
    button.textContent = greetingText(name);
    button.title = 'Edit the name stored on this device';
    button.classList.add('greeting-arrival');
    button.addEventListener('click', () => window.openSciCanvasWelcome?.({ edit:true }));
    const actions = document.querySelector('.title-actions');
    const help = document.getElementById('tourHelpButton');
    if (help) actions?.insertBefore(button, help);
    else actions?.prepend(button);
  }

  function createWelcome() {
    document.getElementById('scWelcome')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'scWelcome';
    overlay.innerHTML = `
      <div class="welcome-orbit" aria-hidden="true"><span>⌬</span><span>🧬</span><span>◌</span><span>⚗</span></div>
      <form class="welcome-card" aria-labelledby="welcomeTitle">
        <div class="welcome-kicker">SciCanvas · local-first scientific studio</div>
        <h1 id="welcomeTitle">Beautiful figures, without the software-induced despair.</h1>
        <p class="welcome-copy">A calm workspace for posters, pathways, maps, data, presentations, and gloriously specific scientific nonsense.</p>
        <label class="welcome-name-label">What should SciCanvas call you?<input id="welcomeNameInput" type="text" maxlength="32" autocomplete="name" placeholder="Your name" required /></label>
        <div class="welcome-actions"><button class="welcome-secondary" type="button">Cancel</button><button class="welcome-primary" type="submit">Continue</button></div>
        <p class="welcome-privacy">Your name stays in this browser. No account, upload, or tracking is involved.</p>
      </form>`;
    document.body.appendChild(overlay);
    const form = overlay.querySelector('form');
    const input = overlay.querySelector('input');
    const cancel = overlay.querySelector('.welcome-secondary');
    let editMode = false;

    function close() {
      overlay.classList.remove('open');
    }
    window.openSciCanvasWelcome = ({ edit = false } = {}) => {
      editMode = Boolean(edit);
      const existing = currentName();
      input.value = existing;
      overlay.querySelector('#welcomeTitle').textContent = edit ? 'What should SciCanvas call you?' : 'Beautiful figures, without the software-induced despair.';
      overlay.querySelector('.welcome-copy').textContent = edit ? 'This display name is stored only on this device.' : 'A calm workspace for posters, pathways, maps, data, presentations, and gloriously specific scientific nonsense.';
      overlay.querySelector('.welcome-primary').textContent = edit ? 'Save name' : 'Continue';
      cancel.hidden = !edit;
      overlay.classList.add('open');
      setTimeout(() => input.focus({ preventScroll:true }), 40);
    };
    cancel.addEventListener('click', close);
    form.addEventListener('submit', event => {
      event.preventDefault();
      const name = cleanName(input.value);
      if (!name) {
        input.focus({ preventScroll:true });
        return;
      }
      localStorage.setItem(NAME_KEY, name);
      localStorage.setItem(WELCOME_KEY, 'complete');
      installGreeting();
      close();
      toast(`Hi, ${name}. Your lab bench is ready.`);
      if (!editMode && !localStorage.getItem(TOUR_KEY)) setTimeout(() => window.openSciCanvasTour?.(), 260);
    });
  }

  function createTour() {
    document.getElementById('scicanvasTour')?.remove();
    document.getElementById('tourHelpButton')?.remove();
    const name = currentName() || 'scientist';
    const steps = [
      { selector:'.titlebar', title:`Hi, ${name}. This is your studio.`, text:'Rename the project, watch the save status, replay this tour, and export from the top line. Your work remains local unless you download or share it.' },
      { selector:'.ribbon-tabs', title:'The calm top-level map', text:'Home handles everyday editing. Insert adds files and objects. Science opens the illustration libraries. Layout, Design, Data, and Review keep specialist controls separated.' },
      { selector:'[data-tab="insert"]', title:'Insert almost anything', text:'Add text, shapes, images, editable SVGs, maps, spreadsheet data, pages, and reusable assets without leaving the project.' },
      { selector:'[data-tab="science"]', title:'The scientific library', text:'Search original SciCanvas artwork, Water 32, Bioicons, Healthicons, and general diagram symbols. Added vectors stay editable and retain source metadata.' },
      { selector:'.canvas-toolbar', title:'Move through enormous posters', text:'Pinch to zoom, use the Hand tool to pan, open the navigator, or drag and collapse this floating control bubble wherever it is comfortable.' },
      { selector:'.left-panel', title:'Pages and layers', text:'Create, rename, reorder, hide, lock, move, copy, or delete pages and objects. The final page is protected from accidental deletion.' },
      { selector:'.right-panel', title:'Context, not clutter', text:'The inspector changes with the selected object: size, position, color, metadata, chart data, SVG settings, and other relevant controls appear only when useful.' },
      { selector:'#proToolsButton', fallback:'.title-actions', title:'Pro Tools stays behind one door', text:'Arrange, data, annotations, components, review, publishing, Office import, recovery, advanced science plots, and diagnostics live in focused workspaces.' },
      { selector:'#proToolsButton', fallback:'.title-actions', title:'PowerPoint and spreadsheets', text:'Open Pro Tools → Office bridge to import PPTX or Excel/ODS/CSV/TSV. Export offers editable-first and compatibility PowerPoint options with honest fallback reporting.' },
      { selector:'#saveStatus', fallback:'.document-title', title:'Refresh-safe and recoverable', text:'SciCanvas saves before refresh or suspension, keeps a last-known-good copy, and maintains rotating recovery snapshots. Download a .scicanvas backup for storage outside this browser.' },
      { selector:'#exportButton', title:'Publish without mystery', text:'Export SVG, PNG, editable or compatible PowerPoint, spreadsheet data, reports, and complete editable project backups. Run diagnostics before important publication exports.' },
      { selector:'#tourHelpButton', fallback:'.title-actions', title:`You are ready, ${name}.`, text:'Press ? to replay this guide. Ctrl/⌘ K opens command search. Everything advanced is discoverable, but the ordinary editor can stay pleasantly boring.' }
    ];

    const overlay = document.createElement('div');
    overlay.id = 'scicanvasTour';
    overlay.innerHTML = `
      <div class="tour-shade"></div><div class="tour-highlight" aria-hidden="true"></div>
      <div class="tour-card" role="dialog" aria-modal="false" aria-labelledby="delightTourTitle">
        <div class="tour-progress"><span class="tour-counter"></span><span>Passive guide</span></div><div class="tour-progress-bar"><div class="tour-progress-fill"></div></div>
        <h2 id="delightTourTitle"></h2><p class="tour-text"></p><p class="tour-passive-note">Nothing is opened, moved, selected, or scrolled by this guide.</p>
        <div class="tour-actions"><button data-tour="close" type="button">Close</button><button data-tour="back" type="button">Back</button><button data-tour="next" class="tour-primary" type="button">Next</button></div>
      </div>`;
    document.body.appendChild(overlay);
    const highlight = overlay.querySelector('.tour-highlight');
    let index = 0;

    function targetFor(step) {
      return document.querySelector(step.selector) || (step.fallback ? document.querySelector(step.fallback) : null);
    }
    function positionHighlight(target) {
      if (!target) return highlight.hidden = true;
      const rect = target.getBoundingClientRect();
      const visible = rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth && rect.width > 2 && rect.height > 2;
      if (!visible) return highlight.hidden = true;
      const pad = 5;
      highlight.hidden = false;
      const left = Math.max(4, rect.left - pad);
      const top = Math.max(4, rect.top - pad);
      highlight.style.left = `${left}px`;
      highlight.style.top = `${top}px`;
      highlight.style.width = `${Math.max(4, Math.min(innerWidth - left - 4, rect.width + pad * 2))}px`;
      highlight.style.height = `${Math.max(4, Math.min(innerHeight - top - 4, rect.height + pad * 2))}px`;
    }
    function show() {
      const step = steps[index];
      positionHighlight(targetFor(step));
      overlay.querySelector('#delightTourTitle').textContent = step.title;
      overlay.querySelector('.tour-text').textContent = step.text;
      overlay.querySelector('.tour-counter').textContent = `${index + 1} of ${steps.length}`;
      overlay.querySelector('.tour-progress-fill').style.width = `${(index + 1) / steps.length * 100}%`;
      overlay.querySelector('[data-tour="back"]').disabled = index === 0;
      overlay.querySelector('[data-tour="next"]').textContent = index === steps.length - 1 ? 'Done' : 'Next';
    }
    function close(completed = false) {
      overlay.classList.remove('open');
      highlight.hidden = true;
      if (completed) localStorage.setItem(TOUR_KEY, 'complete');
    }
    overlay.querySelector('[data-tour="close"]').addEventListener('click', () => close(true));
    overlay.querySelector('[data-tour="back"]').addEventListener('click', () => { if (index) index -= 1; show(); });
    overlay.querySelector('[data-tour="next"]').addEventListener('click', () => {
      if (index === steps.length - 1) return close(true);
      index += 1;
      show();
    });
    window.openSciCanvasTour = () => { index = 0; overlay.classList.add('open'); show(); };
    window.addEventListener('resize', () => { if (overlay.classList.contains('open')) positionHighlight(targetFor(steps[index])); }, { passive:true });

    const help = document.createElement('button');
    help.id = 'tourHelpButton';
    help.type = 'button';
    help.textContent = '?';
    help.title = 'Welcome, tour and shortcuts';
    help.setAttribute('aria-label', 'Open the SciCanvas guide');
    help.addEventListener('click', window.openSciCanvasTour);
    document.querySelector('.title-actions')?.prepend(help);
    installGreeting();
  }

  function launchDna() {
    document.getElementById('dnaEasterEgg')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'dnaEasterEgg';
    overlay.setAttribute('aria-hidden', 'true');
    const ribbon = document.createElement('div');
    ribbon.className = 'dna-ribbon';
    for (let i = 0; i < 24; i += 1) {
      const pair = document.createElement('span');
      pair.className = 'dna-pair';
      const wave = Math.round(58 + Math.sin(i * .8) * 35);
      const rot = Math.round(Math.sin(i * .65) * 20);
      pair.style.setProperty('--i', i);
      pair.style.setProperty('--wave', wave);
      pair.style.setProperty('--rot', rot);
      ribbon.appendChild(pair);
    }
    overlay.appendChild(ribbon);
    document.body.appendChild(overlay);
    toast('Genome unlocked. Peer review remains undefeated. 🧬');
    setTimeout(() => overlay.remove(), reducedMotion() ? 900 : 3600);
  }

  function installEasterEggs() {
    const sequence = ['arrowup','arrowup','arrowdown','arrowdown','arrowleft','arrowright','arrowleft','arrowright','b','a'];
    let position = 0;
    document.addEventListener('keydown', event => {
      const key = event.key.toLowerCase();
      if (key === sequence[position]) position += 1;
      else position = key === sequence[0] ? 1 : 0;
      if (position === sequence.length) {
        position = 0;
        launchDna();
      }

      if (event.key !== 'Enter') return;
      const palette = document.getElementById('scCommandPalette');
      const input = palette?.querySelector('input');
      if (!palette?.classList.contains('open') || input?.value.trim().toLowerCase() !== 'microscope') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const enabled = !document.body.classList.contains('lab-focus-mode');
      document.body.classList.toggle('lab-focus-mode', enabled);
      localStorage.setItem(LAB_KEY, enabled ? '1' : '0');
      palette.classList.remove('open');
      toast(enabled ? 'Microscope mode enabled. The canvas itself stays publication-safe.' : 'Microscope mode disabled.');
    }, true);
    document.body.classList.toggle('lab-focus-mode', localStorage.getItem(LAB_KEY) === '1');
  }

  function setup() {
    installStyle();
    createWelcome();
    createTour();
    installEasterEggs();
    const brandSubtitle = document.querySelector('.brand span');
    if (brandSubtitle) brandSubtitle.textContent = 'Scientific illustration studio';

    if (!currentName()) {
      window.openSciCanvasWelcome?.();
    } else {
      installGreeting();
      if (!localStorage.getItem(TOUR_KEY)) setTimeout(() => window.openSciCanvasTour?.(), 900);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(setup, 80), { once:true });
  else setTimeout(setup, 80);
})();