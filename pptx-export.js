(() => {
  const PPTXGEN_CDN = "https://cdn.jsdelivr.net/gh/gitbrent/pptxgenjs/dist/pptxgen.bundle.js";
  const svgNamespace = "http://www.w3.org/2000/svg";

  function loadPptxGenJs() {
    if (window.PptxGenJS) return Promise.resolve(window.PptxGenJS);
    if (loadPptxGenJs.promise) return loadPptxGenJs.promise;

    loadPptxGenJs.promise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = PPTXGEN_CDN;
      script.async = true;
      script.onload = () => window.PptxGenJS ? resolve(window.PptxGenJS) : reject(new Error("PowerPoint library loaded without its browser export."));
      script.onerror = () => reject(new Error("Could not load the PowerPoint export library. Check your internet connection and try again."));
      document.head.appendChild(script);
    });
    return loadPptxGenJs.promise;
  }

  function cloneValue(value) {
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function frozenPages() {
    syncPage();
    const pages = Array.isArray(state.pages) && state.pages.length
      ? state.pages
      : [{ id:"export-page-1", name:documentName.value || "Figure 1", objects:state.objects || [] }];
    return cloneValue(pages);
  }

  function ensureDefs(svg) {
    let defs = svg.querySelector("defs");
    if (!defs) {
      defs = document.createElementNS(svgNamespace, "defs");
      svg.prepend(defs);
    }
    return defs;
  }

  function gradientCoordinates(angle) {
    const radians = ((Number(angle) || 0) - 90) * Math.PI / 180;
    const x = Math.cos(radians);
    const y = Math.sin(radians);
    return {
      x1:`${50 - x * 50}%`,
      y1:`${50 - y * 50}%`,
      x2:`${50 + x * 50}%`,
      y2:`${50 + y * 50}%`
    };
  }

  function addPageBackground(svg, page, index, width, height, transparent) {
    const background = page?.background || {};
    const mode = background.mode || background.type || "solid";
    if (transparent || mode === "transparent") return;

    const primary = background.primary || background.color || "#ffffff";
    let fill = primary;
    if (mode === "gradient") {
      const id = `figureloom-pptx-background-${index}`;
      const gradient = document.createElementNS(svgNamespace, "linearGradient");
      gradient.id = id;
      Object.entries(gradientCoordinates(background.angle)).forEach(([key, value]) => gradient.setAttribute(key, value));
      const first = document.createElementNS(svgNamespace, "stop");
      first.setAttribute("offset", "0%");
      first.setAttribute("stop-color", primary);
      const second = document.createElementNS(svgNamespace, "stop");
      second.setAttribute("offset", "100%");
      second.setAttribute("stop-color", background.secondary || primary);
      gradient.append(first, second);
      ensureDefs(svg).appendChild(gradient);
      fill = `url(#${id})`;
    }

    const rect = document.createElementNS(svgNamespace, "rect");
    rect.setAttribute("x", "0");
    rect.setAttribute("y", "0");
    rect.setAttribute("width", String(width));
    rect.setAttribute("height", String(height));
    rect.setAttribute("fill", fill);
    svg.appendChild(rect);
  }

  function detachedPageSvg(page, index, { includeGrid = false, transparent = false } = {}) {
    const dimensions = window.currentCanvasSize?.() || { width:1200, height:750 };
    const width = Number(dimensions.width) || 1200;
    const height = Number(dimensions.height) || 750;
    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("xmlns", svgNamespace);
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(height));
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

    const sourceDefs = document.getElementById("canvas")?.querySelector("defs");
    if (sourceDefs) svg.appendChild(sourceDefs.cloneNode(true));
    addPageBackground(svg, page, index, width, height, transparent);

    if (includeGrid) {
      const grid = document.getElementById("gridLayer")?.cloneNode(true);
      if (grid) {
        grid.removeAttribute("id");
        grid.setAttribute("width", String(width));
        grid.setAttribute("height", String(height));
        svg.appendChild(grid);
      }
    }

    const layer = document.createElementNS(svgNamespace, "g");
    layer.setAttribute("data-export-page", String(index + 1));
    for (const item of Array.isArray(page?.objects) ? page.objects : []) {
      if (!item || item.visible === false) continue;
      try {
        const rendered = renderObject(item);
        if (rendered) layer.appendChild(rendered);
      } catch (error) {
        console.warn("PowerPoint could not render one page object", item, error);
      }
    }
    svg.appendChild(layer);
    return { svg, width, height };
  }

  function svgToPng(svg, width, height, { scale = 2, transparent = false } = {}) {
    return new Promise((resolve, reject) => {
      const source = new XMLSerializer().serializeToString(svg);
      const sourceUrl = URL.createObjectURL(new Blob([source], { type:"image/svg+xml;charset=utf-8" }));
      const image = new Image();
      image.decoding = "async";

      image.onload = () => {
        try {
          const bitmap = document.createElement("canvas");
          bitmap.width = Math.round(width * scale);
          bitmap.height = Math.round(height * scale);
          const context = bitmap.getContext("2d");
          if (!context) throw new Error("This browser could not create the PowerPoint image canvas.");
          context.scale(scale, scale);
          if (!transparent) {
            context.fillStyle = "#ffffff";
            context.fillRect(0, 0, width, height);
          }
          context.drawImage(image, 0, 0, width, height);
          URL.revokeObjectURL(sourceUrl);
          resolve(bitmap.toDataURL("image/png"));
        } catch (error) {
          URL.revokeObjectURL(sourceUrl);
          reject(error);
        }
      };

      image.onerror = () => {
        URL.revokeObjectURL(sourceUrl);
        reject(new Error("A page contains an image that this browser could not render into PowerPoint."));
      };
      image.src = sourceUrl;
    });
  }

  async function renderPagePngData(page, index, options = {}) {
    const built = detachedPageSvg(page, index, options);
    await document.fonts?.ready;
    return svgToPng(built.svg, built.width, built.height, options);
  }

  function renderCurrentPagePngData(options = {}) {
    const page = state.pages?.[state.activePage] || { name:"Figure 1", objects:state.objects || [] };
    return renderPagePngData(page, Number(state.activePage) || 0, options);
  }

  async function exportPowerPoint(options = {}) {
    const originalPages = state.pages;
    const originalPage = state.activePage;
    const originalObjects = state.objects;
    const originalSelected = state.selectedId;
    const exportPages = frozenPages();
    const button = document.querySelector('[data-export="pptx"]');
    const oldText = button?.textContent;

    try {
      state.pages = exportPages;
      if (button) {
        button.disabled = true;
        button.textContent = "Preparing PowerPoint…";
      }

      const Pptx = await loadPptxGenJs();
      const pptx = new Pptx();
      const dimensions = window.currentCanvasSize?.() || { widthMm:304.8, heightMm:190.5 };
      const slideWidth = dimensions.widthMm / 25.4;
      const slideHeight = dimensions.heightMm / 25.4;
      pptx.defineLayout({ name:"SCICANVAS", width:slideWidth, height:slideHeight });
      pptx.layout = "SCICANVAS";
      pptx.author = "FigureLoom";
      pptx.company = "FigureLoom";
      pptx.subject = "Scientific illustration presentation";
      pptx.title = documentName.value.trim() || "FigureLoom figure";
      pptx.lang = "en-US";

      for (let index = 0; index < exportPages.length; index += 1) {
        const page = exportPages[index];
        state.activePage = index;
        state.objects = page.objects || [];
        state.selectedId = null;
        if (button) button.textContent = `Rendering slide ${index + 1} of ${exportPages.length}…`;
        const png = await renderPagePngData(page, index, options);
        const slide = pptx.addSlide();
        slide.background = { color:"FFFFFF" };
        slide.addImage({
          data:png,
          x:0,
          y:0,
          w:slideWidth,
          h:slideHeight,
          altText:page.name || `FigureLoom page ${index + 1}`
        });
        if (page.notes) slide.addNotes?.(String(page.notes));
      }

      if (button) button.textContent = "Building .pptx…";
      await pptx.writeFile({ fileName:safeFileName("pptx"), compression:true });
    } catch (error) {
      console.error("PowerPoint export failed", error);
      if (options.rethrow) throw error;
      alert(`PowerPoint export failed: ${error.message}\n\nSVG and PNG export are still available.`);
    } finally {
      state.pages = originalPages;
      state.activePage = Math.min(originalPage, originalPages?.length ? originalPages.length - 1 : 0);
      state.objects = originalPages?.[state.activePage]?.objects || originalObjects;
      state.selectedId = originalSelected && state.objects.some(item => item.id === originalSelected) ? originalSelected : null;
      render();
      renderPages?.();
      window.applyPageBackground?.();
      if (button) {
        button.disabled = false;
        button.textContent = oldText;
      }
    }
  }

  window.renderCurrentPagePngData = renderCurrentPagePngData;
  window.FigureLoomExportPowerPointAllPages = options => exportPowerPoint({ ...options, rethrow:true });

  const options = document.createElement("label");
  options.className = "pptx-export-option";
  options.innerHTML = '<input id="pptxTransparent" type="checkbox"> Transparent figure background';

  const pptxButton = document.createElement("button");
  pptxButton.type = "button";
  pptxButton.dataset.export = "pptx";
  pptxButton.innerHTML = '<strong>PowerPoint · all pages</strong><small>Uses the selected project/poster dimensions</small>';
  pptxButton.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    exportMenu.classList.remove("open");
    exportPowerPoint({
      includeGrid:Boolean(document.getElementById("exportGrid")?.checked),
      transparent:Boolean(document.getElementById("pptxTransparent")?.checked),
      scale:2
    });
  });

  const note = exportMenu.querySelector("small");
  exportMenu.insertBefore(options, note);
  exportMenu.insertBefore(pptxButton, note);

  const style = document.createElement("style");
  style.textContent = `
    #exportMenu{width:275px}.pptx-export-option{font-size:11px;color:#697589}.pptx-export-option input{vertical-align:middle}.pptx-export-option+button{display:grid;gap:2px;border-color:#8da9df!important;background:#eef4ff!important}.pptx-export-option+button strong{font-size:12px;color:#204c9e}.pptx-export-option+button small{font-size:10px;color:#60749a}.pptx-export-option+button:disabled{opacity:.65;cursor:progress}
  `;
  document.head.appendChild(style);
})();