(() => {
  const DEFAULT_BACKGROUND = {
    mode: "solid",
    primary: "#ffffff",
    secondary: "#edf3ff",
    angle: 135
  };

  const PRESETS = [
    { name: "Paper", mode: "solid", primary: "#ffffff", secondary: "#f4f7fb", angle: 135 },
    { name: "Lab blue", mode: "gradient", primary: "#eef5ff", secondary: "#dbe8ff", angle: 135 },
    { name: "Agar peach", mode: "gradient", primary: "#fff5eb", secondary: "#ffe0c2", angle: 135 },
    { name: "Mint culture", mode: "gradient", primary: "#effcf7", secondary: "#d3f2e4", angle: 135 },
    { name: "Lilac assay", mode: "gradient", primary: "#f7f1ff", secondary: "#e7d8ff", angle: 135 },
    { name: "Night lab", mode: "gradient", primary: "#172033", secondary: "#293b63", angle: 135 },
    { name: "Warm paper", mode: "solid", primary: "#fffdf6", secondary: "#f4ead1", angle: 135 },
    { name: "Transparent", mode: "transparent", primary: "#ffffff", secondary: "#ffffff", angle: 135 }
  ];

  const RANDOM_PALETTES = PRESETS.filter(preset => preset.mode !== "transparent");

  function pageBackground(page = currentPage()) {
    if (!page) return structuredClone(DEFAULT_BACKGROUND);
    page.background = { ...DEFAULT_BACKGROUND, ...(page.background || {}) };
    return page.background;
  }

  function gradientCoordinates(angle) {
    const radians = ((Number(angle) || 0) - 90) * Math.PI / 180;
    const x = Math.cos(radians);
    const y = Math.sin(radians);
    return {
      x1: `${50 - x * 50}%`,
      y1: `${50 - y * 50}%`,
      x2: `${50 + x * 50}%`,
      y2: `${50 + y * 50}%`
    };
  }

  function ensurePageGradient(background) {
    const defs = canvas.querySelector("defs");
    let gradient = defs.querySelector("#scicanvasPageGradient");
    if (!gradient) {
      gradient = createSvg("linearGradient", { id: "scicanvasPageGradient" });
      gradient.append(
        createSvg("stop", { offset: "0%" }),
        createSvg("stop", { offset: "100%" })
      );
      defs.appendChild(gradient);
    }

    const coordinates = gradientCoordinates(background.angle);
    Object.entries(coordinates).forEach(([key, value]) => gradient.setAttribute(key, value));
    const stops = gradient.querySelectorAll("stop");
    stops[0].setAttribute("stop-color", background.primary);
    stops[1].setAttribute("stop-color", background.secondary);
    return gradient;
  }

  function applyPageBackground() {
    const background = pageBackground();
    const canvasBackground = document.getElementById("canvasBackground");
    if (!canvasBackground) return;

    if (background.mode === "transparent") {
      canvasBackground.setAttribute("fill", "transparent");
    } else if (background.mode === "gradient") {
      ensurePageGradient(background);
      canvasBackground.setAttribute("fill", "url(#scicanvasPageGradient)");
    } else {
      canvasBackground.setAttribute("fill", background.primary);
    }

    state.settings ??= {};
    state.settings.background = background.primary;
    syncBackgroundControls();
  }

  const designBody = designDrawer?.querySelector(".utility-body");
  if (!designBody) return;

  const backgroundPanel = document.createElement("section");
  backgroundPanel.className = "page-background-panel";
  backgroundPanel.innerHTML = `
    <h3>Page background</h3>
    <div class="background-mode-row" role="group" aria-label="Background type">
      <button type="button" data-background-mode="solid">Solid</button>
      <button type="button" data-background-mode="gradient">Gradient</button>
      <button type="button" data-background-mode="transparent">Transparent</button>
    </div>
    <div class="background-fields">
      <label>Color A <input id="pageBackgroundPrimary" type="color" value="#ffffff"></label>
      <label>Color B <input id="pageBackgroundSecondary" type="color" value="#edf3ff"></label>
      <label>Angle
        <select id="pageBackgroundAngle">
          <option value="0">↑ 0°</option>
          <option value="45">↗ 45°</option>
          <option value="90">→ 90°</option>
          <option value="135" selected>↘ 135°</option>
          <option value="180">↓ 180°</option>
          <option value="225">↙ 225°</option>
          <option value="270">← 270°</option>
          <option value="315">↖ 315°</option>
        </select>
      </label>
    </div>
    <div id="backgroundPresets" class="background-presets"></div>
    <button id="randomBackground" class="utility-action" type="button">🎲 Surprise me</button>
    <p class="tool-note">Backgrounds are saved separately for every page and included in SVG, PNG and PowerPoint exports.</p>
  `;
  designBody.insertBefore(backgroundPanel, designBody.firstChild);

  const controls = {
    primary: backgroundPanel.querySelector("#pageBackgroundPrimary"),
    secondary: backgroundPanel.querySelector("#pageBackgroundSecondary"),
    angle: backgroundPanel.querySelector("#pageBackgroundAngle")
  };

  function syncBackgroundControls() {
    if (!controls.primary) return;
    const background = pageBackground();
    controls.primary.value = background.primary;
    controls.secondary.value = background.secondary;
    controls.angle.value = String(background.angle);
    controls.secondary.disabled = background.mode !== "gradient";
    controls.angle.disabled = background.mode !== "gradient";
    backgroundPanel.querySelectorAll("[data-background-mode]").forEach(button => {
      button.classList.toggle("active", button.dataset.backgroundMode === background.mode);
    });
    const legacyColor = document.getElementById("canvasColor");
    if (legacyColor) legacyColor.value = background.primary;
  }

  function updateBackground(mutator) {
    pushHistory();
    mutator(pageBackground());
    applyPageBackground();
    renderPages();
    scheduleSave();
  }

  backgroundPanel.querySelectorAll("[data-background-mode]").forEach(button => {
    button.addEventListener("click", () => updateBackground(background => {
      background.mode = button.dataset.backgroundMode;
    }));
  });

  controls.primary.addEventListener("input", event => updateBackground(background => {
    background.primary = event.target.value;
    if (background.mode === "transparent") background.mode = "solid";
  }));
  controls.secondary.addEventListener("input", event => updateBackground(background => {
    background.secondary = event.target.value;
    background.mode = "gradient";
  }));
  controls.angle.addEventListener("change", event => updateBackground(background => {
    background.angle = Number(event.target.value) || 0;
    background.mode = "gradient";
  }));

  const presets = backgroundPanel.querySelector("#backgroundPresets");
  PRESETS.forEach(preset => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "background-preset";
    button.title = preset.name;
    button.style.setProperty("--preset-a", preset.mode === "transparent" ? "#ffffff" : preset.primary);
    button.style.setProperty("--preset-b", preset.mode === "gradient" ? preset.secondary : preset.primary);
    if (preset.mode === "transparent") button.classList.add("transparent-preset");
    button.innerHTML = `<span></span><small>${preset.name}</small>`;
    button.addEventListener("click", () => updateBackground(background => Object.assign(background, preset)));
    presets.appendChild(button);
  });

  backgroundPanel.querySelector("#randomBackground").addEventListener("click", () => {
    const preset = RANDOM_PALETTES[Math.floor(Math.random() * RANDOM_PALETTES.length)];
    updateBackground(background => Object.assign(background, preset));
  });

  const legacyColor = document.getElementById("canvasColor");
  legacyColor?.addEventListener("input", event => {
    const background = pageBackground();
    background.mode = "solid";
    background.primary = event.target.value;
    applyPageBackground();
    renderPages();
  });

  const baseApplyGridDesign = applyGridDesign;
  applyGridDesign = function applyGridAndPageBackground() {
    baseApplyGridDesign();
    applyPageBackground();
  };

  const baseSwitchPage = switchPage;
  switchPage = function switchPageWithBackground(index) {
    baseSwitchPage(index);
    applyPageBackground();
  };

  document.getElementById("addPageButton")?.addEventListener("click", () => {
    pageBackground();
    applyPageBackground();
    scheduleSave();
  });

  const backgroundStyle = document.createElement("style");
  backgroundStyle.textContent = `
    .page-background-panel{margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid #e1e6ee}.page-background-panel h3{margin:0 0 9px;font-size:13px;color:#2f3b50}.background-mode-row{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:9px}.background-mode-row button{border:1px solid #ccd6e3;border-radius:7px;background:#f8fafc;padding:7px 4px;font-size:11px}.background-mode-row button.active{background:#2563eb;border-color:#2563eb;color:white}.background-fields{display:grid;grid-template-columns:1fr 1fr 1.25fr;gap:7px;margin-bottom:10px}.background-fields label{display:grid;gap:4px;font-size:10px;color:#6e798c}.background-fields input,.background-fields select{width:100%;height:34px;border:1px solid #ccd6e3;border-radius:7px;background:white;padding:3px}.background-presets{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-bottom:9px}.background-preset{min-width:0;border:1px solid #d2dae5;border-radius:8px;background:white;padding:5px}.background-preset>span{display:block;height:34px;border-radius:5px;background:linear-gradient(135deg,var(--preset-a),var(--preset-b));box-shadow:inset 0 0 0 1px rgba(30,42,61,.08)}.background-preset small{display:block;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:9px;color:#697589}.background-preset:hover{border-color:#7295df}.transparent-preset>span{background-color:#fff;background-image:linear-gradient(45deg,#dfe4eb 25%,transparent 25%),linear-gradient(-45deg,#dfe4eb 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#dfe4eb 75%),linear-gradient(-45deg,transparent 75%,#dfe4eb 75%);background-size:12px 12px;background-position:0 0,0 6px,6px -6px,-6px 0}
  `;
  document.head.appendChild(backgroundStyle);

  pageBackground();
  applyPageBackground();
  window.applyPageBackground = applyPageBackground;
})();