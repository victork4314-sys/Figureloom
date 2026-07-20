function cleanCanvasClone(includeGrid = false) {
  const copy = canvas.cloneNode(true);
  copy.setAttribute("xmlns", svgNS);
  copy.removeAttribute("style");
  copy.setAttribute("width", "1200");
  copy.setAttribute("height", "750");
  copy.querySelector("#selectionLayer")?.remove();
  if (!includeGrid) copy.querySelector("#gridLayer")?.remove();
  return copy;
}

function safeFileName(extension) {
  const name = (documentName.value.trim() || "SciCanvas-figure")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  return `${name}.${extension}`;
}

function createCleanSvgSource(includeGrid = false) {
  const copy = cleanCanvasClone(includeGrid);
  return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(copy)}`;
}

function downloadCleanSvg(includeGrid = false) {
  downloadBlob(createCleanSvgSource(includeGrid), "image/svg+xml", safeFileName("svg"));
}

window.FigureLoomEditableSvgExport = Object.freeze({
  createSource: createCleanSvgSource,
  download: downloadCleanSvg
});

function downloadPng(scale = 2, includeGrid = false) {
  const copy = cleanCanvasClone(includeGrid);
  const source = new XMLSerializer().serializeToString(copy);
  const url = URL.createObjectURL(new Blob([source], { type:"image/svg+xml;charset=utf-8" }));
  const image = new Image();

  image.onload = () => {
    const bitmap = document.createElement("canvas");
    bitmap.width = 1200 * scale;
    bitmap.height = 750 * scale;
    const context = bitmap.getContext("2d");
    context.scale(scale, scale);
    context.fillStyle = document.getElementById("canvasBackground").getAttribute("fill") || "#ffffff";
    context.fillRect(0, 0, 1200, 750);
    context.drawImage(image, 0, 0, 1200, 750);
    URL.revokeObjectURL(url);

    bitmap.toBlob(blob => {
      if (!blob) {
        alert("PNG export failed in this browser. SVG export is still available.");
        return;
      }
      const link = document.createElement("a");
      const blobUrl = URL.createObjectURL(blob);
      link.href = blobUrl;
      link.download = safeFileName("png");
      link.click();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 0);
    }, "image/png");
  };

  image.onerror = () => {
    URL.revokeObjectURL(url);
    alert("PNG export could not render one of the embedded images. Export SVG or remove the incompatible upload.");
  };
  image.src = url;
}

const exportMenu = document.createElement("div");
exportMenu.id = "exportMenu";
exportMenu.innerHTML = `
  <strong>Export figure</strong>
  <label><input id="exportGrid" type="checkbox"> Include editor grid</label>
  <button type="button" data-export="svg">Editable SVG</button>
  <button type="button" data-export="png1">PNG · 1200 × 750</button>
  <button type="button" data-export="png2">PNG · 2400 × 1500</button>
  <small>Project backups are under the Data tab.</small>
`;
document.body.appendChild(exportMenu);

const exportStyle = document.createElement("style");
exportStyle.textContent = `
  #exportMenu{position:fixed;z-index:50;top:52px;right:16px;width:230px;display:none;padding:10px;border:1px solid #cdd6e2;border-radius:10px;background:white;box-shadow:0 16px 40px rgba(30,42,61,.22)}#exportMenu.open{display:grid;gap:7px}#exportMenu strong{font-size:13px}#exportMenu label{font-size:11px;color:#697589}#exportMenu button{padding:8px;border:1px solid #d1dae6;border-radius:7px;background:#f8fafc;text-align:left}#exportMenu button:hover{border-color:#7195df;background:#f1f6ff}#exportMenu small{color:#7b8798;font-size:10px;line-height:1.35}
`;
document.head.appendChild(exportStyle);

const exportButton = document.getElementById("exportButton");
exportButton.addEventListener("click", event => {
  event.preventDefault();
  event.stopImmediatePropagation();
  exportMenu.classList.toggle("open");
}, true);

exportMenu.addEventListener("click", event => {
  const action = event.target.dataset.export;
  if (!action) return;
  const grid = document.getElementById("exportGrid").checked;
  if (action === "svg") downloadCleanSvg(grid);
  if (action === "png1") downloadPng(1, grid);
  if (action === "png2") downloadPng(2, grid);
  exportMenu.classList.remove("open");
});

document.addEventListener("click", event => {
  if (!exportMenu.contains(event.target) && event.target !== exportButton) exportMenu.classList.remove("open");
});
