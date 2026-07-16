const svgNS = "http://www.w3.org/2000/svg";
const canvas = document.getElementById("canvas");
const objectLayer = document.getElementById("objectLayer");
const selectionLayer = document.getElementById("selectionLayer");
const layersList = document.getElementById("layersList");
const saveStatus = document.getElementById("saveStatus");
const objectCount = document.getElementById("objectCount");
const documentName = document.getElementById("documentName");

const state = {
  objects: [],
  selectedId: null,
  zoom: 1,
  drag: null,
  history: [],
  future: []
};

const controls = {
  x: document.getElementById("positionX"),
  y: document.getElementById("positionY"),
  w: document.getElementById("objectWidth"),
  h: document.getElementById("objectHeight"),
  fill: document.getElementById("fillColor"),
  stroke: document.getElementById("strokeColor"),
  opacity: document.getElementById("opacity")
};

function uid() {
  return `obj-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function selectedObject() {
  return state.objects.find(item => item.id === state.selectedId) || null;
}

function snapshot() {
  return JSON.stringify({ objects: state.objects, documentName: documentName.value });
}

function pushHistory() {
  state.history.push(snapshot());
  if (state.history.length > 50) state.history.shift();
  state.future = [];
  updateHistoryButtons();
}

function restore(serialized) {
  const data = JSON.parse(serialized);
  state.objects = data.objects || [];
  documentName.value = data.documentName || "Untitled figure";
  state.selectedId = null;
  render();
  scheduleSave();
}

function undo() {
  if (!state.history.length) return;
  state.future.push(snapshot());
  restore(state.history.pop());
  updateHistoryButtons();
}

function redo() {
  if (!state.future.length) return;
  state.history.push(snapshot());
  restore(state.future.pop());
  updateHistoryButtons();
}

function updateHistoryButtons() {
  document.getElementById("undoButton").disabled = !state.history.length;
  document.getElementById("redoButton").disabled = !state.future.length;
}

function makeObject(type) {
  const base = {
    id: uid(),
    type,
    name: type === "text" ? "Text label" : type === "arrow" ? "Arrow" : "Rounded rectangle",
    x: 420,
    y: 280,
    width: type === "arrow" ? 220 : type === "text" ? 190 : 210,
    height: type === "arrow" ? 50 : type === "text" ? 55 : 125,
    fill: type === "arrow" ? "#2563eb" : type === "text" ? "#172033" : "#8ea0ff",
    stroke: "#26324a",
    opacity: 1,
    text: type === "text" ? "Scientific label" : ""
  };
  pushHistory();
  state.objects.push(base);
  state.selectedId = base.id;
  render();
  scheduleSave();
}

function createSvg(tag, attrs = {}) {
  const element = document.createElementNS(svgNS, tag);
  Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

function renderObject(item) {
  const group = createSvg("g", {
    class: "canvas-object",
    "data-id": item.id,
    transform: `translate(${item.x} ${item.y})`,
    opacity: item.opacity
  });

  if (item.type === "shape") {
    group.appendChild(createSvg("rect", {
      width: item.width,
      height: item.height,
      rx: 22,
      fill: item.fill,
      stroke: item.stroke,
      "stroke-width": 3
    }));
  }

  if (item.type === "text") {
    const text = createSvg("text", {
      x: 0,
      y: 34,
      fill: item.fill,
      "font-size": 30,
      "font-weight": 650,
      "font-family": "Segoe UI, sans-serif"
    });
    text.textContent = item.text;
    group.appendChild(text);
  }

  if (item.type === "arrow") {
    group.appendChild(createSvg("line", {
      x1: 0,
      y1: 25,
      x2: item.width - 24,
      y2: 25,
      stroke: item.fill,
      "stroke-width": 10,
      "stroke-linecap": "round"
    }));
    group.appendChild(createSvg("path", {
      d: `M ${item.width - 42} 4 L ${item.width} 25 L ${item.width - 42} 46 Z`,
      fill: item.fill
    }));
  }

  group.addEventListener("pointerdown", event => beginDrag(event, item.id));
  group.addEventListener("click", event => {
    event.stopPropagation();
    select(item.id);
  });
  return group;
}

function renderSelection() {
  selectionLayer.replaceChildren();
  const item = selectedObject();
  if (!item) return;
  selectionLayer.appendChild(createSvg("rect", {
    class: "selection-box",
    x: item.x - 8,
    y: item.y - 8,
    width: item.width + 16,
    height: item.height + 16,
    rx: 8
  }));
}

function renderLayers() {
  layersList.replaceChildren();
  if (!state.objects.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No objects yet.";
    layersList.appendChild(empty);
    return;
  }
  [...state.objects].reverse().forEach(item => {
    const row = document.createElement("button");
    row.type = "button";
    row.className = `layer-item${item.id === state.selectedId ? " active" : ""}`;
    row.textContent = item.name;
    row.addEventListener("click", () => select(item.id));
    layersList.appendChild(row);
  });
}

function updateInspector() {
  const item = selectedObject();
  document.getElementById("selectionName").textContent = item ? item.name : "Nothing selected";
  Object.values(controls).forEach(control => control.disabled = !item);
  if (!item) return;
  controls.x.value = Math.round(item.x);
  controls.y.value = Math.round(item.y);
  controls.w.value = Math.round(item.width);
  controls.h.value = Math.round(item.height);
  controls.fill.value = item.fill;
  controls.stroke.value = item.stroke;
  controls.opacity.value = Math.round(item.opacity * 100);
}

function render() {
  objectLayer.replaceChildren(...state.objects.map(renderObject));
  renderSelection();
  renderLayers();
  updateInspector();
  objectCount.textContent = `${state.objects.length} object${state.objects.length === 1 ? "" : "s"}`;
}

function select(id) {
  state.selectedId = id;
  render();
}

function beginDrag(event, id) {
  event.preventDefault();
  event.stopPropagation();
  select(id);
  const item = selectedObject();
  const point = canvasPoint(event);
  pushHistory();
  state.drag = { id, dx: point.x - item.x, dy: point.y - item.y };
  canvas.setPointerCapture(event.pointerId);
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * 1200 / rect.width,
    y: (event.clientY - rect.top) * 750 / rect.height
  };
}

canvas.addEventListener("pointermove", event => {
  if (!state.drag) return;
  const item = selectedObject();
  const point = canvasPoint(event);
  const snap = document.getElementById("snapToggle").checked ? 10 : 1;
  item.x = Math.max(0, Math.min(1200 - item.width, Math.round((point.x - state.drag.dx) / snap) * snap));
  item.y = Math.max(0, Math.min(750 - item.height, Math.round((point.y - state.drag.dy) / snap) * snap));
  render();
});

canvas.addEventListener("pointerup", () => {
  if (!state.drag) return;
  state.drag = null;
  scheduleSave();
});

canvas.addEventListener("click", () => {
  state.selectedId = null;
  render();
});

function deleteSelected() {
  if (!state.selectedId) return;
  pushHistory();
  state.objects = state.objects.filter(item => item.id !== state.selectedId);
  state.selectedId = null;
  render();
  scheduleSave();
}

function reorder(direction) {
  const index = state.objects.findIndex(item => item.id === state.selectedId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= state.objects.length) return;
  pushHistory();
  [state.objects[index], state.objects[target]] = [state.objects[target], state.objects[index]];
  render();
  scheduleSave();
}

function setZoom(next) {
  state.zoom = Math.max(.4, Math.min(1.8, next));
  canvas.style.width = `${1200 * state.zoom}px`;
  document.getElementById("zoomValue").textContent = `${Math.round(state.zoom * 100)}%`;
}

function scheduleSave() {
  saveStatus.textContent = "Saving…";
  clearTimeout(scheduleSave.timer);
  scheduleSave.timer = setTimeout(() => {
    localStorage.setItem("scicanvas-document", snapshot());
    saveStatus.textContent = "Saved locally";
  }, 250);
}

function loadSaved() {
  const saved = localStorage.getItem("scicanvas-document");
  if (!saved) return;
  try { restore(saved); } catch { localStorage.removeItem("scicanvas-document"); }
}

function exportSvg() {
  const copy = canvas.cloneNode(true);
  copy.querySelector("#selectionLayer")?.remove();
  if (!document.getElementById("gridToggle").checked) copy.querySelector("#gridLayer")?.remove();
  const blob = new Blob([new XMLSerializer().serializeToString(copy)], { type: "image/svg+xml" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${documentName.value.trim() || "scicanvas-figure"}.svg`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function bindInspector() {
  const numeric = { positionX: "x", positionY: "y", objectWidth: "width", objectHeight: "height" };
  Object.entries(numeric).forEach(([id, key]) => {
    document.getElementById(id).addEventListener("change", event => {
      const item = selectedObject();
      if (!item) return;
      pushHistory();
      item[key] = Math.max(0, Number(event.target.value) || 0);
      render();
      scheduleSave();
    });
  });
  controls.fill.addEventListener("input", event => updateStyle("fill", event.target.value));
  controls.stroke.addEventListener("input", event => updateStyle("stroke", event.target.value));
  controls.opacity.addEventListener("input", event => updateStyle("opacity", Number(event.target.value) / 100));
}

function updateStyle(key, value) {
  const item = selectedObject();
  if (!item) return;
  item[key] = value;
  render();
  scheduleSave();
}

document.getElementById("addTextButton").addEventListener("click", () => makeObject("text"));
document.getElementById("addShapeButton").addEventListener("click", () => makeObject("shape"));
document.getElementById("addArrowButton").addEventListener("click", () => makeObject("arrow"));
document.getElementById("deleteButton").addEventListener("click", deleteSelected);
document.getElementById("bringForwardButton").addEventListener("click", () => reorder(1));
document.getElementById("sendBackwardButton").addEventListener("click", () => reorder(-1));
document.getElementById("undoButton").addEventListener("click", undo);
document.getElementById("redoButton").addEventListener("click", redo);
document.getElementById("zoomInButton").addEventListener("click", () => setZoom(state.zoom + .1));
document.getElementById("zoomOutButton").addEventListener("click", () => setZoom(state.zoom - .1));
document.getElementById("fitButton").addEventListener("click", () => setZoom(.8));
document.getElementById("gridToggle").addEventListener("change", event => {
  document.getElementById("gridLayer").style.display = event.target.checked ? "" : "none";
});
document.getElementById("exportButton").addEventListener("click", exportSvg);
documentName.addEventListener("input", scheduleSave);
document.addEventListener("keydown", event => {
  if ((event.key === "Delete" || event.key === "Backspace") && document.activeElement.tagName !== "INPUT") deleteSelected();
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") event.shiftKey ? redo() : undo();
});

bindInspector();
loadSaved();
render();
setZoom(.8);
