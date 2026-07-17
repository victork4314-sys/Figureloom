(() => {
  if (window.__figureloomIntuitiveInterface) return;
  window.__figureloomIntuitiveInterface = true;

  const START_DISMISSED_KEY = "figureloom-start-card-dismissed-v1";
  const canvasArea = document.querySelector(".canvas-area");
  const titleActions = document.querySelector(".title-actions");
  const rightPanel = document.querySelector(".right-panel");
  const saveStatus = document.getElementById("saveStatus");

  function toast(message, kind = "info") {
    if (typeof window.SciCanvasToast === "function") {
      window.SciCanvasToast(message, kind);
      return;
    }
    const note = document.createElement("div");
    note.className = "figureloom-simple-toast";
    note.textContent = message;
    document.body.appendChild(note);
    requestAnimationFrame(() => note.classList.add("show"));
    setTimeout(() => {
      note.classList.remove("show");
      setTimeout(() => note.remove(), 180);
    }, 2200);
  }

  function selectedItem() {
    return state.objects?.find(item => item.id === state.selectedId) || null;
  }

  function setButtonCopy(selector, label, help) {
    const button = document.querySelector(selector);
    if (!button) return null;
    if (label) button.textContent = label;
    if (help) {
      button.title = help;
      button.dataset.help = help;
      button.setAttribute("aria-description", help);
    }
    return button;
  }

  function setLabelCopy(inputId, label, help) {
    const input = document.getElementById(inputId);
    const host = input?.closest("label");
    if (!input || !host) return;
    host.replaceChildren(document.createTextNode(`${label} `), input);
    if (help) {
      host.title = help;
      input.setAttribute("aria-label", `${label}. ${help}`);
    }
  }

  function installPlainLanguage() {
    const tabCopy = {
      insert: ["Add", "Add images, maps, files, charts, and other content"],
      science: ["Illustrations", "Search scientific illustrations and chemical structures"],
      layout: ["Arrange", "Align, space, group, and position objects"],
      design: ["Style", "Change colors, type, themes, and visual appearance"],
      data: ["Data", "Create charts, tables, and data-driven figures"],
      review: ["Check", "Check accessibility, quality, and export readiness"]
    };
    Object.entries(tabCopy).forEach(([tab, [label, help]]) => {
      const button = document.querySelector(`.ribbon-tab[data-tab="${tab}"]`);
      if (!button) return;
      button.textContent = label;
      button.title = help;
      button.dataset.help = help;
    });

    setButtonCopy("#collaborateRibbonButton", "Share", "Invite people or manage project access");
    setButtonCopy("#addTextButton", "Text", "Add words to the page. Tap the new text to type.");
    setButtonCopy("#addShapeButton", "Shape", "Add a rounded box for panels, backgrounds, and grouping");
    setButtonCopy("#addArrowButton", "Arrow", "Add an arrow to show direction, flow, or cause and effect");
    setButtonCopy("#bringForwardButton", "Bring forward", "Move the selected object one layer closer to the front");
    setButtonCopy("#sendBackwardButton", "Send backward", "Move the selected object one layer farther behind");
    setButtonCopy("#deleteButton", "Delete", "Remove the selected object");
    setButtonCopy("#fitButton", "Fit page", "Fit the whole page into the workspace");
    setButtonCopy("#undoButton", "Undo", "Undo the last change");
    setButtonCopy("#redoButton", "Redo", "Redo the change you just undid");
    setButtonCopy("#exportButton", "Export", "Download the finished figure in a publication-ready format");
    setButtonCopy("#addPageButton", "+", "Add another page to this project");

    const quickAddLabel = document.querySelector(".tool-group:first-child .tool-group-label");
    if (quickAddLabel) quickAddLabel.textContent = "Quick add";

    const layersHeading = document.querySelector(".layers-heading h2");
    if (layersHeading) layersHeading.textContent = "Objects";

    setLabelCopy("positionX", "Left", "Distance from the left edge of the page");
    setLabelCopy("positionY", "Top", "Distance from the top edge of the page");
    setLabelCopy("objectWidth", "Width", "How wide the selected object is");
    setLabelCopy("objectHeight", "Height", "How tall the selected object is");

    const grid = document.getElementById("gridToggle")?.closest("label");
    if (grid) {
      grid.title = "Show or hide the page grid";
      grid.dataset.help = grid.title;
    }
    const snap = document.getElementById("snapToggle")?.closest("label");
    if (snap) {
      snap.title = "Make objects line up neatly while you move them";
      snap.dataset.help = snap.title;
    }

    const statusText = document.querySelector(".statusbar span:nth-child(3)");
    if (statusText) statusText.textContent = "Changes save automatically on this device";

    document.querySelectorAll("[data-close],#closeScience,.utility-head button,.science-head button").forEach(button => {
      button.setAttribute("aria-label", "Close panel");
      button.title = "Close";
    });
  }

  function openIllustrations() {
    const tab = document.querySelector('[data-tab="science"]');
    const drawer = document.getElementById("scienceDrawer");
    if (!drawer?.classList.contains("open")) tab?.click();
    setTimeout(() => document.getElementById("scienceSearch")?.focus({ preventScroll: true }), 80);
  }

  function openAddPanel() {
    document.querySelector('[data-tab="insert"]')?.click();
    setTimeout(() => {
      const drawer = document.getElementById("insertDrawer");
      if (drawer && !drawer.classList.contains("open")) drawer.classList.add("open");
      drawer?.querySelector("input[type=search]")?.focus({ preventScroll: true });
    }, 30);
  }

  function openMap() {
    if (typeof window.openMapStudio === "function") {
      window.openMapStudio();
      return;
    }
    document.getElementById("insertMapStudio")?.click();
  }

  function addText() {
    document.getElementById("addTextButton")?.click();
    setTimeout(() => toast("Text added. Tap the words on the page to type.", "success"), 20);
  }

  function addShape() {
    document.getElementById("addShapeButton")?.click();
    setTimeout(() => toast("Shape added. Drag it to move it; use Format to change it.", "success"), 20);
  }

  function createHelpDrawer() {
    if (document.getElementById("figureloomHelpDrawer") || typeof createDrawer !== "function") return;
    const drawer = createDrawer(
      "figureloomHelpDrawer",
      "Help",
      "The shortest route from an empty page to a finished figure"
    );
    drawer.classList.add("figureloom-help-drawer");
    drawer.querySelector(".utility-body").innerHTML = `
      <section class="figureloom-help-intro">
        <strong>Figureloom works in four moves</strong>
        <p>Add something, select it, change it, then export. Everything else is optional.</p>
      </section>
      <section class="figureloom-help-steps">
        <article><b>1</b><span><strong>Add</strong><small>Use Add for files, maps, and charts. Use Illustrations for scientific artwork.</small></span></article>
        <article><b>2</b><span><strong>Select</strong><small>Tap any object on the page. The Format panel then shows the controls for it.</small></span></article>
        <article><b>3</b><span><strong>Edit</strong><small>Drag objects to move them. Tap text to type. Use the handles and Format panel for size and appearance.</small></span></article>
        <article><b>4</b><span><strong>Export</strong><small>Press Export when the figure looks right. Your editable project continues saving automatically.</small></span></article>
      </section>
      <section class="figureloom-help-actions">
        <button type="button" data-help-action="illustrations"><strong>Find an illustration</strong><small>Search cells, molecules, equipment, chemistry, and more</small></button>
        <button type="button" data-help-action="text"><strong>Add text</strong><small>Add a label, heading, or explanation</small></button>
        <button type="button" data-help-action="map"><strong>Create a map</strong><small>Search, zoom, add sites, and annotate them</small></button>
        <button type="button" data-help-action="add"><strong>See everything you can add</strong><small>Files, charts, tables, equations, diagrams, and more</small></button>
      </section>
      <details class="figureloom-help-details">
        <summary>Useful gestures and shortcuts</summary>
        <p><strong>Move:</strong> drag an object. <strong>Zoom:</strong> pinch or use +/−. <strong>Pan:</strong> use the hand tool or hold Space while dragging. <strong>Delete:</strong> select an object and press Delete. <strong>Undo:</strong> Ctrl/⌘ Z.</p>
      </details>
      <button id="figureloomResetStartCard" class="utility-action" type="button">Show the Start a figure card again</button>
    `;

    drawer.querySelector('[data-help-action="illustrations"]')?.addEventListener("click", () => {
      drawer.classList.remove("open");
      openIllustrations();
    });
    drawer.querySelector('[data-help-action="text"]')?.addEventListener("click", () => {
      drawer.classList.remove("open");
      addText();
    });
    drawer.querySelector('[data-help-action="map"]')?.addEventListener("click", () => {
      drawer.classList.remove("open");
      openMap();
    });
    drawer.querySelector('[data-help-action="add"]')?.addEventListener("click", () => {
      drawer.classList.remove("open");
      openAddPanel();
    });
    drawer.querySelector("#figureloomResetStartCard")?.addEventListener("click", () => {
      localStorage.removeItem(START_DISMISSED_KEY);
      updateInterface();
      drawer.classList.remove("open");
    });
  }

  function addHelpButton() {
    if (!titleActions || document.getElementById("figureloomHelpButton")) return;
    const button = document.createElement("button");
    button.id = "figureloomHelpButton";
    button.type = "button";
    button.textContent = "Help";
    button.title = "Open a quick guide to Figureloom";
    button.dataset.help = button.title;
    button.addEventListener("click", () => document.getElementById("figureloomHelpDrawer")?.classList.add("open"));
    titleActions.insertBefore(button, document.getElementById("exportButton"));
  }

  function createStartCard() {
    if (!canvasArea || document.getElementById("figureloomStartCard")) return;
    const card = document.createElement("section");
    card.id = "figureloomStartCard";
    card.setAttribute("aria-label", "Start a figure");
    card.innerHTML = `
      <button class="figureloom-start-close" type="button" aria-label="Dismiss start card" title="Dismiss">×</button>
      <div class="figureloom-start-copy">
        <strong>Start a figure</strong>
        <span>Choose what you want to put on the page first.</span>
      </div>
      <div class="figureloom-start-actions">
        <button type="button" data-start="illustrations"><strong>Illustration</strong><small>Search scientific artwork</small></button>
        <button type="button" data-start="text"><strong>Text</strong><small>Add a label or heading</small></button>
        <button type="button" data-start="shape"><strong>Shape</strong><small>Add a panel or background</small></button>
        <button type="button" data-start="map"><strong>Map</strong><small>Search and annotate places</small></button>
      </div>
      <button class="figureloom-start-more" type="button" data-start="more">See everything you can add</button>
    `;
    canvasArea.appendChild(card);

    card.querySelector('[data-start="illustrations"]')?.addEventListener("click", openIllustrations);
    card.querySelector('[data-start="text"]')?.addEventListener("click", addText);
    card.querySelector('[data-start="shape"]')?.addEventListener("click", addShape);
    card.querySelector('[data-start="map"]')?.addEventListener("click", openMap);
    card.querySelector('[data-start="more"]')?.addEventListener("click", openAddPanel);
    card.querySelector(".figureloom-start-close")?.addEventListener("click", () => {
      localStorage.setItem(START_DISMISSED_KEY, "yes");
      updateInterface();
    });
  }

  function createCoach() {
    if (!canvasArea || document.getElementById("figureloomCoach")) return;
    const coach = document.createElement("div");
    coach.id = "figureloomCoach";
    coach.innerHTML = `<span></span><button type="button">Help</button>`;
    coach.querySelector("button")?.addEventListener("click", () => document.getElementById("figureloomHelpDrawer")?.classList.add("open"));
    canvasArea.appendChild(coach);
  }

  function hintFor(item) {
    if (!state.objects?.length) return "Add an illustration, text, shape, arrow, map, or file to begin.";
    if (!item) return "Select anything on the page to move or edit it.";
    if (item.type === "text" || item.type === "annotation") return "Tap the words to type. Drag to move. Use Format to change the text.";
    if (item.type === "arrow" || item.type === "connector") return "Drag to move. Use Format and the quick controls to change the line or arrow.";
    if (["image", "science", "svg", "component"].includes(item.type)) return "Drag to move. Use the handles to resize. Use Format for appearance.";
    if (item.type === "shape") return "Drag to move. Use Format to change its fill, outline, size, and opacity.";
    return "Drag to move. Use Format for size and appearance.";
  }

  function updateSelectionControls(item) {
    if (rightPanel) rightPanel.classList.toggle("has-selection", Boolean(item));
    const selectionName = document.getElementById("selectionName");
    if (selectionName && !item) selectionName.textContent = "Nothing selected";

    let note = document.getElementById("figureloomSelectionNote");
    if (!note && selectionName) {
      note = document.createElement("small");
      note.id = "figureloomSelectionNote";
      selectionName.insertAdjacentElement("afterend", note);
    }
    if (note) {
      note.hidden = Boolean(item);
      note.textContent = "Tap something on the page to edit it.";
    }

    const index = item ? state.objects.findIndex(candidate => candidate.id === item.id) : -1;
    const deleteButton = document.getElementById("deleteButton");
    const forwardButton = document.getElementById("bringForwardButton");
    const backwardButton = document.getElementById("sendBackwardButton");
    if (deleteButton) {
      deleteButton.disabled = !item;
      deleteButton.title = item ? "Remove the selected object" : "Select an object first";
    }
    if (forwardButton) {
      forwardButton.disabled = !item || index >= state.objects.length - 1;
      forwardButton.title = !item ? "Select an object first" : index >= state.objects.length - 1 ? "This object is already at the front" : "Move the selected object one layer closer to the front";
    }
    if (backwardButton) {
      backwardButton.disabled = !item || index <= 0;
      backwardButton.title = !item ? "Select an object first" : index <= 0 ? "This object is already at the back" : "Move the selected object one layer farther behind";
    }
  }

  function translateSaveStatus() {
    if (!saveStatus) return;
    if (saveStatus.textContent.trim() === "Saved locally") saveStatus.textContent = "Saved on this device";
  }

  function updateInterface() {
    const item = selectedItem();
    const startCard = document.getElementById("figureloomStartCard");
    const showStart = !state.objects?.length && localStorage.getItem(START_DISMISSED_KEY) !== "yes";
    if (startCard) startCard.hidden = !showStart;

    const coach = document.getElementById("figureloomCoach");
    if (coach) {
      coach.hidden = showStart;
      const copy = coach.querySelector("span");
      if (copy) copy.textContent = hintFor(item);
    }
    updateSelectionControls(item);
    translateSaveStatus();

    const empty = document.querySelector("#layersList .empty-state");
    if (empty) empty.textContent = "Things you add to the page appear here.";
  }

  function installTooltips() {
    const tooltip = document.createElement("div");
    tooltip.id = "figureloomTooltip";
    tooltip.setAttribute("role", "tooltip");
    document.body.appendChild(tooltip);
    let timer = 0;

    function show(target) {
      const text = target?.dataset?.help;
      if (!text || target.disabled) return;
      clearTimeout(timer);
      timer = window.setTimeout(() => {
        tooltip.textContent = text;
        tooltip.hidden = false;
        const rect = target.getBoundingClientRect();
        const own = tooltip.getBoundingClientRect();
        const left = Math.max(8, Math.min(window.innerWidth - own.width - 8, rect.left + rect.width / 2 - own.width / 2));
        const top = rect.bottom + own.height + 12 < window.innerHeight ? rect.bottom + 8 : rect.top - own.height - 8;
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${Math.max(8, top)}px`;
      }, 360);
    }
    function hide() {
      clearTimeout(timer);
      tooltip.hidden = true;
    }
    document.addEventListener("pointerover", event => show(event.target.closest?.("[data-help]")));
    document.addEventListener("pointerout", hide);
    document.addEventListener("focusin", event => show(event.target.closest?.("[data-help]")));
    document.addEventListener("focusout", hide);
    document.addEventListener("pointerdown", hide, true);
  }

  function installDrawerBehavior() {
    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type !== "attributes" || mutation.attributeName !== "class") continue;
        const drawer = mutation.target;
        if (!drawer.classList?.contains("open")) continue;
        drawer.setAttribute("role", "dialog");
        drawer.setAttribute("aria-modal", "false");
        drawer.querySelector("[data-close],#closeScience")?.setAttribute("aria-label", "Close panel");
        setTimeout(() => drawer.querySelector('input[type="search"]')?.focus({ preventScroll: true }), 70);
      }
    });
    observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["class"] });

    document.addEventListener("keydown", event => {
      if (event.key !== "Escape") return;
      const open = [...document.querySelectorAll(".utility-drawer.open,.packs-drawer.open,#scienceDrawer.open")].pop();
      if (open) {
        open.classList.remove("open");
        event.stopPropagation();
      }
    }, true);
  }

  function installActionFeedback() {
    document.getElementById("addArrowButton")?.addEventListener("click", () => {
      setTimeout(() => toast("Arrow added. Drag it to position it between the things it connects.", "success"), 20);
    });
    document.addEventListener("click", event => {
      if (event.target.closest?.(".science-card")) {
        setTimeout(() => toast("Illustration added. Drag it to move it and use the handles to resize it.", "success"), 30);
      }
    });
  }

  const style = document.createElement("style");
  style.id = "figureloomIntuitiveStyle";
  style.textContent = `
    .canvas-area{position:relative}
    #figureloomStartCard{position:absolute;z-index:12;left:50%;top:50%;transform:translate(-50%,-48%);width:min(540px,calc(100% - 42px));box-sizing:border-box;padding:20px;border:1px solid var(--delight-line,rgba(105,125,151,.22));border-radius:16px;background:var(--delight-glass,rgba(250,252,255,.94));box-shadow:var(--delight-shadow,0 16px 44px rgba(38,55,80,.14));backdrop-filter:blur(16px);color:var(--delight-ink,#1d2939)}
    #figureloomStartCard[hidden]{display:none!important}.figureloom-start-close{position:absolute;right:9px;top:9px;width:32px;height:32px;border:0;background:transparent;font-size:20px;color:var(--delight-muted,#66758a)}
    .figureloom-start-copy{display:grid;gap:4px;padding-right:34px}.figureloom-start-copy strong{font-size:21px;letter-spacing:-.025em}.figureloom-start-copy span{color:var(--delight-muted,#66758a);font-size:12px}
    .figureloom-start-actions{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:15px}.figureloom-start-actions button{display:grid;gap:4px;min-height:78px;padding:11px 9px;border:1px solid var(--delight-line,rgba(105,125,151,.22));border-radius:10px;background:rgba(255,255,255,.78);color:inherit;text-align:left}.figureloom-start-actions button:hover{background:rgba(255,255,255,.98)}.figureloom-start-actions strong{font-size:12px}.figureloom-start-actions small{color:var(--delight-muted,#66758a);font-size:9px;line-height:1.35}
    .figureloom-start-more{width:100%;margin-top:8px;min-height:36px;border:1px solid transparent;background:transparent;color:var(--delight-blue,#4169c1);font-size:10px;font-weight:700}
    #figureloomCoach{position:absolute;z-index:11;left:50%;bottom:11px;transform:translateX(-50%);display:flex;align-items:center;gap:10px;max-width:calc(100% - 30px);padding:7px 8px 7px 12px;border:1px solid var(--delight-line,rgba(105,125,151,.22));border-radius:999px;background:var(--delight-glass,rgba(250,252,255,.9));box-shadow:0 8px 22px rgba(38,55,80,.09);backdrop-filter:blur(12px);color:var(--delight-muted,#66758a);font-size:10px;pointer-events:auto}#figureloomCoach[hidden]{display:none!important}#figureloomCoach span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#figureloomCoach button{flex:0 0 auto;min-height:28px;padding:4px 8px;border:1px solid var(--delight-line,rgba(105,125,151,.22));border-radius:999px;background:white;color:var(--delight-blue,#4169c1);font-size:9px;font-weight:700}
    #figureloomSelectionNote{display:block;margin-top:4px;color:var(--delight-muted,#66758a);font-size:10px;line-height:1.4}.right-panel:not(.has-selection) .inspector-section:not(:first-of-type){display:none}
    #figureloomHelpButton{white-space:nowrap}.figureloom-help-intro{padding:12px;border:1px solid var(--delight-line,rgba(105,125,151,.22));border-radius:11px;background:rgba(255,255,255,.62)}.figureloom-help-intro strong{font-size:14px}.figureloom-help-intro p{margin:5px 0 0;color:var(--delight-muted,#66758a);font-size:11px;line-height:1.5}
    .figureloom-help-steps{display:grid;gap:7px;margin:10px 0}.figureloom-help-steps article{display:grid;grid-template-columns:30px 1fr;gap:9px;align-items:start;padding:9px;border:1px solid var(--delight-line,rgba(105,125,151,.22));border-radius:9px;background:rgba(255,255,255,.62)}.figureloom-help-steps article>b{display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:rgba(65,105,193,.1);color:var(--delight-blue,#4169c1);font-size:11px}.figureloom-help-steps strong,.figureloom-help-steps small{display:block}.figureloom-help-steps strong{font-size:11px}.figureloom-help-steps small{margin-top:2px;color:var(--delight-muted,#66758a);font-size:9px;line-height:1.4}
    .figureloom-help-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px}.figureloom-help-actions button{display:grid;gap:3px;text-align:left;padding:9px;border:1px solid var(--delight-line,rgba(105,125,151,.22));border-radius:9px;background:rgba(255,255,255,.7);color:inherit}.figureloom-help-actions strong,.figureloom-help-actions small{display:block}.figureloom-help-actions strong{font-size:10px}.figureloom-help-actions small{color:var(--delight-muted,#66758a);font-size:8.5px;line-height:1.35}.figureloom-help-details{margin:10px 0;padding:9px;border:1px solid var(--delight-line,rgba(105,125,151,.22));border-radius:9px}.figureloom-help-details summary{cursor:pointer;font-size:10px;font-weight:700}.figureloom-help-details p{margin:8px 0 0;color:var(--delight-muted,#66758a);font-size:9px;line-height:1.55}
    #figureloomTooltip{position:fixed;z-index:2147483646;max-width:260px;padding:7px 9px;border:1px solid var(--delight-line,rgba(105,125,151,.22));border-radius:8px;background:rgba(29,41,57,.96);box-shadow:0 8px 24px rgba(20,32,48,.22);color:white;font-size:10px;line-height:1.4;pointer-events:none}#figureloomTooltip[hidden]{display:none!important}
    .figureloom-simple-toast{position:fixed;z-index:2147483647;left:50%;bottom:42px;transform:translate(-50%,12px);max-width:calc(100vw - 30px);padding:9px 12px;border-radius:9px;background:rgba(29,41,57,.96);color:white;font-size:11px;opacity:0;transition:opacity .16s ease,transform .16s ease}.figureloom-simple-toast.show{opacity:1;transform:translate(-50%,0)}
    button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:3px solid rgba(65,105,193,.24)!important;outline-offset:2px}
    button:disabled{cursor:not-allowed;opacity:.5}
    @media(max-width:760px){#figureloomStartCard{top:48%;width:min(460px,calc(100% - 24px));padding:15px}.figureloom-start-actions{grid-template-columns:1fr 1fr}.figureloom-start-actions button{min-height:66px}.figureloom-help-actions{grid-template-columns:1fr}#figureloomCoach{bottom:7px;max-width:calc(100% - 14px)}}
  `;
  document.head.appendChild(style);

  installPlainLanguage();
  createHelpDrawer();
  addHelpButton();
  createStartCard();
  createCoach();
  installTooltips();
  installDrawerBehavior();
  installActionFeedback();

  const observer = new MutationObserver(updateInterface);
  if (document.getElementById("objectLayer")) observer.observe(document.getElementById("objectLayer"), { childList: true, subtree: true });
  if (saveStatus) observer.observe(saveStatus, { childList: true, characterData: true, subtree: true });
  if (document.getElementById("selectionName")) observer.observe(document.getElementById("selectionName"), { childList: true, characterData: true, subtree: true });
  document.addEventListener("click", () => setTimeout(updateInterface, 0));
  document.addEventListener("input", () => setTimeout(updateInterface, 0));
  requestAnimationFrame(updateInterface);
})();
