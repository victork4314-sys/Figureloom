const interactionBaseGenericGroup = genericGroup;
genericGroup = function visibleGenericGroup(item) {
  const group = interactionBaseGenericGroup(item);
  if (item.visible === false) group.style.display = "none";
  return group;
};

const interactionBaseGridDesign = applyGridDesign;
applyGridDesign = function correctedGridDesign() {
  interactionBaseGridDesign();
  const spacing = Number(state.settings.gridSpacing) || 20;
  const large = document.getElementById("grid");
  const rect = large.querySelector("rect");
  const path = large.querySelector("path");
  rect?.setAttribute("width", spacing * 5);
  rect?.setAttribute("height", spacing * 5);
  path?.setAttribute("d", `M ${spacing * 5} 0 L 0 0 0 ${spacing * 5}`);
};

function connectorEndpoints(item) {
  const source = state.objects.find(object => object.id === item.fromId);
  const target = state.objects.find(object => object.id === item.toId);
  if (!source || !target) return null;
  return {
    source,
    target,
    x1: source.x + source.width / 2,
    y1: source.y + source.height / 2,
    x2: target.x + target.width / 2,
    y2: target.y + target.height / 2
  };
}

const interactionBaseRenderObject = renderObject;
renderObject = function renderConnectorObject(item) {
  if (item.type !== "connector") return interactionBaseRenderObject(item);
  const points = connectorEndpoints(item);
  if (!points) return createSvg("g");

  item.x = Math.min(points.x1, points.x2);
  item.y = Math.min(points.y1, points.y2);
  item.width = Math.max(8, Math.abs(points.x2 - points.x1));
  item.height = Math.max(8, Math.abs(points.y2 - points.y1));

  const group = createSvg("g", {
    class: "canvas-object",
    "data-id": item.id,
    opacity: item.opacity ?? 1
  });
  if (item.visible === false) group.style.display = "none";

  const angle = Math.atan2(points.y2 - points.y1, points.x2 - points.x1);
  const endX = points.x2 - Math.cos(angle) * 18;
  const endY = points.y2 - Math.sin(angle) * 18;
  group.appendChild(createSvg("line", {
    x1: points.x1,
    y1: points.y1,
    x2: endX,
    y2: endY,
    stroke: item.fill || "#536fc2",
    "stroke-width": 7,
    "stroke-linecap": "round"
  }));

  if (item.connectorStyle === "inhibition") {
    const perpendicular = angle + Math.PI / 2;
    const half = 14;
    group.appendChild(createSvg("line", {
      x1: points.x2 + Math.cos(perpendicular) * half,
      y1: points.y2 + Math.sin(perpendicular) * half,
      x2: points.x2 - Math.cos(perpendicular) * half,
      y2: points.y2 - Math.sin(perpendicular) * half,
      stroke: item.fill || "#c13f54",
      "stroke-width": 7,
      "stroke-linecap": "round"
    }));
  } else {
    const size = 18;
    const a1 = angle + Math.PI * 0.82;
    const a2 = angle - Math.PI * 0.82;
    group.appendChild(createSvg("path", {
      d: `M ${points.x2} ${points.y2} L ${points.x2 + Math.cos(a1) * size} ${points.y2 + Math.sin(a1) * size} L ${points.x2 + Math.cos(a2) * size} ${points.y2 + Math.sin(a2) * size} Z`,
      fill: item.fill || "#536fc2"
    }));
  }

  group.addEventListener("click", event => {
    event.stopPropagation();
    select(item.id);
  });
  return group;
};

const connectorDrawer = createDrawer("connectorDrawer", "Attach connector", "Keep an arrow or inhibition line attached while objects move");
connectorDrawer.querySelector(".utility-body").innerHTML = `
  <p id="connectorSource" class="tool-note"></p>
  <label class="full-field">Target object <select id="connectorTarget"></select></label>
  <label class="full-field">Connector type
    <select id="connectorStyle"><option value="arrow">Activation arrow</option><option value="inhibition">Inhibition line</option></select>
  </label>
  <label class="full-field">Color <input id="connectorColor" type="color" value="#536fc2"></label>
  <button id="createConnector" class="utility-action primary" type="button">Create attached connector</button>
`;

const connectorButton = document.createElement("button");
connectorButton.type = "button";
connectorButton.textContent = "Connect";
connectorButton.addEventListener("click", () => {
  const source = selectedObject();
  if (!source || source.type === "connector") {
    alert("Select the source object first, then choose Connect.");
    return;
  }
  const candidates = state.objects.filter(item => item.id !== source.id && item.type !== "connector");
  if (!candidates.length) {
    alert("Add at least one other object before creating a connector.");
    return;
  }
  connectorDrawer.dataset.sourceId = source.id;
  connectorDrawer.querySelector("#connectorSource").textContent = `Source: ${source.name}`;
  const select = connectorDrawer.querySelector("#connectorTarget");
  select.replaceChildren(...candidates.map(item => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.name;
    return option;
  }));
  connectorDrawer.classList.add("open");
});
document.querySelectorAll(".tool-group")[0].appendChild(connectorButton);

connectorDrawer.querySelector("#createConnector").addEventListener("click", () => {
  const sourceId = connectorDrawer.dataset.sourceId;
  const targetId = connectorDrawer.querySelector("#connectorTarget").value;
  if (!state.objects.some(item => item.id === sourceId) || !state.objects.some(item => item.id === targetId)) return;
  const style = connectorDrawer.querySelector("#connectorStyle").value;
  pushHistory();
  const connector = {
    id: uid(),
    type: "connector",
    name: style === "inhibition" ? "Inhibition connector" : "Activation connector",
    fromId: sourceId,
    toId: targetId,
    connectorStyle: style,
    x: 0, y: 0, width: 10, height: 10,
    fill: connectorDrawer.querySelector("#connectorColor").value,
    stroke: "#26324a",
    opacity: 1,
    visible: true,
    rotation: 0,
    metadata: { notes:"Attached object-to-object connector" }
  };
  state.objects.push(connector);
  state.selectedId = connector.id;
  render();
  scheduleSave();
  connectorDrawer.classList.remove("open");
});

function appendGuide(x1, y1, x2, y2) {
  selectionLayer.appendChild(createSvg("line", {
    x1, y1, x2, y2,
    stroke: "#ef4b8c",
    "stroke-width": 1.5,
    "stroke-dasharray": "6 5",
    "pointer-events": "none"
  }));
}

canvas.addEventListener("pointermove", () => {
  if (!state.drag || !document.getElementById("snapToggle").checked) return;
  const item = selectedObject();
  if (!item || item.type === "connector") return;
  const threshold = 8;
  let guideX = null;
  let guideY = null;
  const others = state.objects.filter(other => other.id !== item.id && other.type !== "connector" && other.visible !== false);

  const xCandidates = [
    { value:item.x, set:value => item.x = value },
    { value:item.x + item.width / 2, set:value => item.x = value - item.width / 2 },
    { value:item.x + item.width, set:value => item.x = value - item.width }
  ];
  const yCandidates = [
    { value:item.y, set:value => item.y = value },
    { value:item.y + item.height / 2, set:value => item.y = value - item.height / 2 },
    { value:item.y + item.height, set:value => item.y = value - item.height }
  ];

  const targetXs = [600, ...others.flatMap(other => [other.x, other.x + other.width / 2, other.x + other.width])];
  const targetYs = [375, ...others.flatMap(other => [other.y, other.y + other.height / 2, other.y + other.height])];

  outerX: for (const candidate of xCandidates) {
    for (const target of targetXs) {
      if (Math.abs(candidate.value - target) <= threshold) {
        candidate.set(target);
        guideX = target;
        break outerX;
      }
    }
  }
  outerY: for (const candidate of yCandidates) {
    for (const target of targetYs) {
      if (Math.abs(candidate.value - target) <= threshold) {
        candidate.set(target);
        guideY = target;
        break outerY;
      }
    }
  }

  if (guideX !== null || guideY !== null) {
    render();
    if (guideX !== null) appendGuide(guideX, 0, guideX, 750);
    if (guideY !== null) appendGuide(0, guideY, 1200, guideY);
  }
});

canvas.addEventListener("pointerup", () => renderSelection());
canvas.addEventListener("pointercancel", () => {
  state.drag = null;
  renderSelection();
  scheduleSave();
});

function recoverAdvancedLocalSnapshot() {
  if (!currentProjectIsEmpty()) return;
  const raw = localStorage.getItem("scicanvas-document");
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    if (Array.isArray(data.pages) && data.pages.length) restore(data);
  } catch {}
}

applyGridDesign();
recoverAdvancedLocalSnapshot();
render();
