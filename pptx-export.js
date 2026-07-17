(() => {
  const PPTXGEN_CDN = "https://cdn.jsdelivr.net/gh/gitbrent/pptxgenjs/dist/pptxgen.bundle.js";

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

  function renderCurrentPagePngData({ includeGrid = false, transparent = false, scale = 2 } = {}) {
    return new Promise((resolve, reject) => {
      const dimensions = window.currentCanvasSize?.() || { width:1200, height:750 };
      const copy = cleanCanvasClone(includeGrid);
      copy.setAttribute('width', dimensions.width);
      copy.setAttribute('height', dimensions.height);
      if (transparent) copy.querySelector("#canvasBackground")?.remove();
      const source = new XMLSerializer().serializeToString(copy);
      const sourceUrl = URL.createObjectURL(new Blob([source], { type:"image/svg+xml;charset=utf-8" }));
      const image = new Image();

      image.onload = () => {
        try {
          const bitmap = document.createElement("canvas");
          bitmap.width = Math.round(dimensions.width * scale);
          bitmap.height = Math.round(dimensions.height * scale);
          const context = bitmap.getContext("2d");
          context.scale(scale, scale);
          if (!transparent) {
            context.fillStyle = "#ffffff";
            context.fillRect(0, 0, dimensions.width, dimensions.height);
          }
          context.drawImage(image, 0, 0, dimensions.width, dimensions.height);
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

  async function exportPowerPoint(options = {}) {
    syncPage();
    const originalPage = state.activePage;
    const originalSelected = state.selectedId;
    const button = document.querySelector('[data-export="pptx"]');
    const oldText = button?.textContent;

    try {
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
      pptx.author = "SciCanvas";
      pptx.company = "SciCanvas";
      pptx.subject = "Scientific illustration presentation";
      pptx.title = documentName.value.trim() || "SciCanvas figure";
      pptx.lang = "en-US";

      for (let index = 0; index < state.pages.length; index += 1) {
        const page = state.pages[index];
        state.activePage = index;
        state.objects = page.objects;
        state.selectedId = null;
        render();
        window.applyPageBackground?.();

        if (button) button.textContent = `Rendering slide ${index + 1} of ${state.pages.length}…`;
        const png = await renderCurrentPagePngData(options);
        const slide = pptx.addSlide();
        slide.background = { color:"FFFFFF" };
        slide.addImage({
          data:png,
          x:0,
          y:0,
          w:slideWidth,
          h:slideHeight,
          altText:page.name || `SciCanvas page ${index + 1}`
        });
      }

      if (button) button.textContent = "Building .pptx…";
      await pptx.writeFile({ fileName:safeFileName("pptx"), compression:true });
    } catch (error) {
      console.error("PowerPoint export failed", error);
      if (options.rethrow) throw error;
      alert(`PowerPoint export failed: ${error.message}\n\nSVG and PNG export are still available.`);
    } finally {
      state.activePage = Math.min(originalPage, state.pages.length - 1);
      state.objects = state.pages[state.activePage].objects;
      state.selectedId = originalSelected && state.objects.some(item => item.id === originalSelected) ? originalSelected : null;
      render();
      renderPages();
      window.applyPageBackground?.();
      scheduleSave();
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
      includeGrid:document.getElementById("exportGrid").checked,
      transparent:document.getElementById("pptxTransparent").checked,
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