(() => {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", async () => {
    try {
      await navigator.serviceWorker.register("./service-worker.js", { scope: "./" });
    } catch (error) {
      console.warn("SciCanvas offline mode could not be enabled.", error);
    }
  });
})();

(() => {
  const SVG_NS = "http://www.w3.org/2000/svg";

  function makeScientificPreview(asset) {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 200 120");
    svg.setAttribute("aria-hidden", "true");
    svg.classList.add("science-preview-svg");

    const art = createSvg("g", {});
    drawScienceAsset(art, asset.id, "#7c8cf5", "#26324a");
    svg.appendChild(art);
    return svg;
  }

  function enhanceBuiltInCards() {
    if (typeof scienceAssets === "undefined" || typeof drawScienceAsset !== "function") return;

    document.querySelectorAll("#scienceGrid .science-card").forEach(card => {
      if (card.dataset.vectorPreview === "true") return;
      const label = card.querySelector("small")?.textContent?.trim();
      const asset = scienceAssets.find(item => item.name === label);
      const preview = card.querySelector(".preview");
      if (!asset || !preview) return;

      preview.replaceChildren(makeScientificPreview(asset));
      preview.classList.add("vector-preview");
      card.dataset.vectorPreview = "true";
    });
  }

  function addLibraryShortcut() {
    const drawer = document.getElementById("scienceDrawer");
    const searchRow = drawer?.querySelector(".science-search");
    if (!drawer || !searchRow || drawer.querySelector(".real-library-shortcut")) return;

    const packsButton = [...searchRow.querySelectorAll("button")]
      .find(button => button.textContent.trim() === "Packs");

    if (packsButton) {
      packsButton.textContent = "2,829 SVGs";
      packsButton.title = "Browse 2,829 real licensed scientific SVG illustrations";
    }

    const shortcut = document.createElement("button");
    shortcut.type = "button";
    shortcut.className = "real-library-shortcut";
    shortcut.innerHTML = `
      <span class="shortcut-art" aria-hidden="true">◉</span>
      <span><strong>Browse 2,829 real scientific illustrations</strong><small>Bioicons · searchable SVGs with creator and licence metadata</small></span>
      <span class="shortcut-arrow" aria-hidden="true">→</span>
    `;
    shortcut.addEventListener("click", () => {
      const currentPacksButton = [...searchRow.querySelectorAll("button")]
        .find(button => button.textContent.includes("SVG") || button.textContent.trim() === "Packs");
      currentPacksButton?.click();
    });
    searchRow.insertAdjacentElement("afterend", shortcut);
  }

  const style = document.createElement("style");
  style.textContent = `
    .science-card .preview.vector-preview{width:100%;height:70px;display:grid;place-items:center;font-size:0}
    .science-preview-svg{display:block;width:100%;height:70px;overflow:visible}
    .real-library-shortcut{margin:0 11px 10px;padding:10px 11px;display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;text-align:left;border:1px solid #9bb5eb;border-radius:10px;background:linear-gradient(135deg,#edf3ff,#f8fbff);color:#263a64}
    .real-library-shortcut:hover{border-color:#547fd5;background:#e7efff}
    .real-library-shortcut .shortcut-art{width:34px;height:34px;display:grid;place-items:center;border-radius:9px;background:#2563eb;color:white;font-size:18px}
    .real-library-shortcut strong,.real-library-shortcut small{display:block}
    .real-library-shortcut strong{font-size:12px}
    .real-library-shortcut small{margin-top:2px;color:#687896;font-size:10px;line-height:1.3}
    .real-library-shortcut .shortcut-arrow{font-size:20px;color:#2563eb}
  `;
  document.head.appendChild(style);

  addLibraryShortcut();
  enhanceBuiltInCards();

  const grid = document.getElementById("scienceGrid");
  if (grid) {
    new MutationObserver(enhanceBuiltInCards).observe(grid, { childList: true });
  }
})();
