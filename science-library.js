const scienceAssets = [
  { id: "bacterium", name: "Rod bacterium", category: "Microbiology", tags: "bacteria bacillus gram cell pili flagella" },
  { id: "coccus", name: "Coccus cluster", category: "Microbiology", tags: "bacteria cocci staphylococcus cluster gram positive" },
  { id: "virus", name: "Enveloped virus", category: "Virology", tags: "virus virion envelope spike pathogen" },
  { id: "phage", name: "Bacteriophage", category: "Virology", tags: "phage virus capsid tail bacteria" },
  { id: "cell", name: "Eukaryotic cell", category: "Cell biology", tags: "cell nucleus membrane cytoplasm organelle" },
  { id: "mitochondrion", name: "Mitochondrion", category: "Cell biology", tags: "mitochondria organelle cristae energy atp" },
  { id: "dna", name: "DNA helix", category: "Molecular biology", tags: "dna double helix genome genetics nucleotide" },
  { id: "plasmid", name: "Plasmid map", category: "Molecular biology", tags: "plasmid vector circular dna cloning" },
  { id: "protein", name: "Protein complex", category: "Molecular biology", tags: "protein enzyme complex receptor molecule" },
  { id: "antibody", name: "Antibody", category: "Immunology", tags: "antibody immunoglobulin igg immune" },
  { id: "petri", name: "Petri dish", category: "Laboratory", tags: "petri dish culture agar colonies lab" },
  { id: "pipette", name: "Micropipette", category: "Laboratory", tags: "pipette micropipette liquid lab equipment" },
  { id: "tube", name: "Microcentrifuge tube", category: "Laboratory", tags: "tube eppendorf sample lab" },
  { id: "microscope", name: "Microscope", category: "Laboratory", tags: "microscope imaging objective lab equipment" },
  { id: "membrane", name: "Lipid membrane", category: "Cell biology", tags: "membrane phospholipid bilayer receptor" },
  { id: "biofilm", name: "Biofilm", category: "Microbiology", tags: "biofilm bacteria matrix community surface" }
];

const baseRenderObject = renderObject;
renderObject = function renderSciCanvasObject(item) {
  if (item.type !== "science" && item.type !== "image") return baseRenderObject(item);

  const group = createSvg("g", {
    class: "canvas-object",
    "data-id": item.id,
    transform: `translate(${item.x} ${item.y})`,
    opacity: item.opacity
  });

  if (item.type === "image") {
    group.appendChild(createSvg("image", {
      href: item.src,
      width: item.width,
      height: item.height,
      preserveAspectRatio: "xMidYMid meet"
    }));
  } else {
    const art = createSvg("g", {
      transform: `scale(${item.width / 200} ${item.height / 120})`
    });
    drawScienceAsset(art, item.asset, item.fill, item.stroke);
    group.appendChild(art);
  }

  group.addEventListener("pointerdown", event => beginDrag(event, item.id));
  group.addEventListener("click", event => {
    event.stopPropagation();
    select(item.id);
  });
  return group;
};

function node(tag, attrs, parent) {
  const element = createSvg(tag, attrs);
  parent.appendChild(element);
  return element;
}

function drawScienceAsset(g, kind, fill, stroke) {
  const sw = 3;
  if (kind === "bacterium") {
    node("rect", { x: 28, y: 25, width: 140, height: 70, rx: 35, fill, stroke, "stroke-width": sw }, g);
    for (let x = 48; x < 165; x += 25) node("circle", { cx: x, cy: 60, r: 5, fill: stroke, opacity: .45 }, g);
    node("path", { d: "M168 48 C190 25 194 86 178 104 C165 117 180 124 194 112", fill: "none", stroke, "stroke-width": 4, "stroke-linecap": "round" }, g);
    [40,62,87,112,137,158].forEach((x,i) => node("line", { x1:x, y1:i%2?25:95, x2:x+(i%2?5:-5), y2:i%2?10:110, stroke, "stroke-width":2 }, g));
  } else if (kind === "coccus") {
    [[75,42],[105,38],[133,55],[83,72],[115,72],[145,84],[59,83]].forEach(([cx,cy]) => node("circle", { cx, cy, r: 24, fill, stroke, "stroke-width": sw }, g));
  } else if (kind === "virus") {
    node("circle", { cx:100, cy:60, r:38, fill, stroke, "stroke-width":sw }, g);
    for (let a=0;a<360;a+=30) {
      const r=a*Math.PI/180, x1=100+38*Math.cos(r), y1=60+38*Math.sin(r), x2=100+54*Math.cos(r), y2=60+54*Math.sin(r);
      node("line", { x1,y1,x2,y2,stroke,"stroke-width":3 }, g); node("circle", { cx:x2, cy:y2, r:5, fill:stroke }, g);
    }
    node("path", { d:"M75 62 C88 38 111 85 128 55", fill:"none", stroke, "stroke-width":4 }, g);
  } else if (kind === "phage") {
    node("polygon", { points:"100,10 132,30 122,65 78,65 68,30", fill, stroke, "stroke-width":sw }, g);
    node("line", { x1:100,y1:65,x2:100,y2:98,stroke,"stroke-width":7 }, g);
    node("line", { x1:80,y1:101,x2:120,y2:101,stroke,"stroke-width":5 }, g);
    node("path", { d:"M82 101 L65 116 M90 102 L82 118 M110 102 L118 118 M118 101 L135 116", fill:"none", stroke,"stroke-width":3 }, g);
  } else if (kind === "cell") {
    node("path", { d:"M30 62 C30 23 68 8 108 15 C153 5 181 34 168 74 C181 105 132 116 99 106 C62 119 24 100 30 62Z", fill, stroke,"stroke-width":sw }, g);
    node("circle", { cx:105,cy:58,r:28,fill:"white",stroke,"stroke-width":sw }, g);
    node("circle", { cx:111,cy:53,r:9,fill:stroke,opacity:.55 }, g);
    [[57,49],[66,82],[143,48],[136,88]].forEach(([cx,cy])=>node("ellipse",{cx,cy,rx:13,ry:7,fill:"white",stroke,"stroke-width":2},g));
  } else if (kind === "mitochondrion") {
    node("path", { d:"M24 63 C28 24 74 14 116 22 C158 15 181 40 174 69 C170 100 127 108 90 99 C49 111 20 91 24 63Z", fill, stroke,"stroke-width":sw }, g);
    node("path", { d:"M46 62 C60 35 68 91 83 61 C96 35 107 91 121 59 C136 32 143 88 158 55", fill:"none",stroke,"stroke-width":4 }, g);
  } else if (kind === "dna") {
    node("path", { d:"M55 10 C145 35 55 84 145 110 M145 10 C55 35 145 84 55 110", fill:"none",stroke,"stroke-width":6,"stroke-linecap":"round" }, g);
    for(let y=18;y<108;y+=15) node("line",{x1:70+(y%30?8:0),y1:y,x2:130-(y%30?8:0),y2:y,stroke:fill,"stroke-width":4},g);
  } else if (kind === "plasmid") {
    node("circle", { cx:100,cy:60,r:43,fill:"none",stroke,"stroke-width":12 }, g);
    node("path", { d:"M100 17 A43 43 0 0 1 139 42", fill:"none",stroke:fill,"stroke-width":12 }, g);
    node("path", { d:"M66 87 A43 43 0 0 1 58 54", fill:"none",stroke:"#f59e0b","stroke-width":12 }, g);
  } else if (kind === "protein") {
    [[67,47,23],[100,34,20],[128,58,25],[99,79,24],[60,82,18],[146,91,15]].forEach(([cx,cy,r],i)=>node("circle",{cx,cy,r,fill:i%2?fill:"white",stroke,"stroke-width":sw},g));
  } else if (kind === "antibody") {
    node("path", { d:"M100 106 L100 61 M100 66 L56 20 M100 66 L144 20", fill:"none",stroke,"stroke-width":14,"stroke-linecap":"round" }, g);
    node("path", { d:"M56 20 L42 8 M56 20 L68 7 M144 20 L132 7 M144 20 L158 8", fill:"none",stroke:fill,"stroke-width":8,"stroke-linecap":"round" }, g);
  } else if (kind === "petri") {
    node("ellipse", { cx:100,cy:74,rx:72,ry:28,fill,stroke,"stroke-width":sw }, g);
    node("ellipse", { cx:100,cy:57,rx:72,ry:28,fill:"white",stroke,"stroke-width":sw }, g);
    [[64,53],[91,65],[115,48],[137,65],[77,43]].forEach(([cx,cy])=>node("circle",{cx,cy,r:6,fill},g));
  } else if (kind === "pipette") {
    node("path", { d:"M45 94 L122 17 L150 45 L73 109 Z", fill,stroke,"stroke-width":sw }, g);
    node("rect", { x:120,y:12,width:47,height:18,rx:7,transform:"rotate(45 120 12)",fill:"white",stroke,"stroke-width":sw }, g);
    node("path", { d:"M45 94 L25 114",stroke,"stroke-width":5 }, g);
  } else if (kind === "tube") {
    node("path", { d:"M70 20 L132 20 L122 101 Q100 117 78 101 Z", fill,stroke,"stroke-width":sw }, g);
    node("rect", { x:62,y:10,width:78,height:18,rx:5,fill:"white",stroke,"stroke-width":sw }, g);
    node("path", { d:"M77 77 Q100 92 124 77 L122 101 Q100 117 78 101Z",fill:"#60a5fa",opacity:.7 }, g);
  } else if (kind === "microscope") {
    node("path", { d:"M68 18 L111 18 L121 35 L81 55 Z",fill,stroke,"stroke-width":sw },g);
    node("path", { d:"M104 48 C133 62 121 98 91 98 L58 98",fill:"none",stroke,"stroke-width":12,"stroke-linecap":"round" },g);
    node("rect", { x:49,y:70,width:72,height:10,rx:4,fill,stroke,"stroke-width":2 },g);
    node("rect", { x:39,y:101,width:120,height:12,rx:6,fill:stroke },g);
  } else if (kind === "membrane") {
    for(let x=20;x<190;x+=18){ node("circle",{cx:x,cy:40,r:7,fill,stroke,"stroke-width":1.5},g); node("circle",{cx:x,cy:82,r:7,fill,stroke,"stroke-width":1.5},g); node("line",{x1:x-3,y1:47,x2:x-5,y2:75,stroke,"stroke-width":2},g); node("line",{x1:x+3,y1:47,x2:x+5,y2:75,stroke,"stroke-width":2},g); }
  } else if (kind === "biofilm") {
    node("rect", { x:15,y:96,width:170,height:12,rx:3,fill:stroke },g);
    [[45,83],[75,68],[106,82],[137,61],[158,84],[93,45]].forEach(([cx,cy],i)=>node("rect",{x:cx-18,y:cy-10,width:36,height:20,rx:10,fill:i%2?fill:"#f59e0b",stroke,"stroke-width":2},g));
    node("path",{d:"M27 91 C50 41 75 106 97 50 C118 18 145 104 176 48",fill:"none",stroke:fill,"stroke-width":8,opacity:.25},g);
  }
}

function addScienceAsset(asset) {
  pushHistory();
  const item = {
    id: uid(), type: "science", asset: asset.id, name: asset.name,
    x: 470, y: 300, width: 200, height: 120,
    fill: "#7c8cf5", stroke: "#26324a", opacity: 1
  };
  state.objects.push(item);
  state.selectedId = item.id;
  render();
  scheduleSave();
}

function createScienceDrawer() {
  const drawer = document.createElement("section");
  drawer.id = "scienceDrawer";
  drawer.innerHTML = `
    <div class="science-head"><div><strong>Science Library</strong><span>Editable scientific objects</span></div><button id="closeScience" type="button">×</button></div>
    <div class="science-search"><input id="scienceSearch" type="search" placeholder="Search bacteria, DNA, equipment…"><button id="uploadAsset" type="button">Upload</button></div>
    <div id="scienceCategories" class="science-categories"></div>
    <div id="scienceGrid" class="science-grid"></div>
    <input id="assetFile" type="file" accept="image/*,.svg" hidden>
  `;
  document.body.appendChild(drawer);

  const style = document.createElement("style");
  style.textContent = `
    #scienceDrawer{position:fixed;z-index:30;top:96px;left:14px;bottom:42px;width:360px;display:none;flex-direction:column;background:#fff;border:1px solid #ccd6e3;border-radius:12px;box-shadow:0 22px 55px rgba(28,39,58,.25);overflow:hidden}
    #scienceDrawer.open{display:flex}.science-head{display:flex;justify-content:space-between;align-items:center;padding:14px 15px;border-bottom:1px solid #e1e6ee}.science-head strong,.science-head span{display:block}.science-head span{font-size:11px;color:#788397;margin-top:2px}.science-head button{border:0;background:transparent;font-size:25px;color:#586477}.science-search{display:grid;grid-template-columns:1fr auto;gap:7px;padding:11px}.science-search input{min-width:0;padding:9px 10px;border:1px solid #cad4e1;border-radius:8px}.science-search button{border:1px solid #cad4e1;border-radius:8px;background:#f7f9fc;padding:0 10px}.science-categories{display:flex;gap:6px;overflow:auto;padding:0 11px 9px}.science-categories button{white-space:nowrap;border:1px solid #d4dce7;border-radius:999px;background:white;padding:5px 9px;font-size:11px}.science-categories button.active{background:#2563eb;border-color:#2563eb;color:white}.science-grid{overflow:auto;padding:10px;display:grid;grid-template-columns:1fr 1fr;gap:8px}.science-card{min-height:108px;display:grid;place-items:center;gap:4px;border:1px solid #d6dee9;border-radius:9px;background:white;padding:8px;color:#2e3a4e}.science-card:hover{border-color:#6f97e7;background:#f5f8ff}.science-card .preview{font-size:35px}.science-card small{font-size:11px;text-align:center}
  `;
  document.head.appendChild(style);

  let category = "All";
  const categories = ["All", ...new Set(scienceAssets.map(item => item.category))];
  const categoryBar = drawer.querySelector("#scienceCategories");
  categories.forEach(name => {
    const button = document.createElement("button");
    button.type = "button"; button.textContent = name; button.className = name === "All" ? "active" : "";
    button.addEventListener("click", () => { category = name; [...categoryBar.children].forEach(x=>x.classList.toggle("active",x===button)); drawCards(); });
    categoryBar.appendChild(button);
  });

  const emoji = {bacterium:"🦠",coccus:"🔵",virus:"☀️",phage:"🛸",cell:"🧫",mitochondrion:"🥐",dna:"🧬",plasmid:"⭕",protein:"🫧",antibody:"Y",petri:"🧫",pipette:"🧪",tube:"🧪",microscope:"🔬",membrane:"≋",biofilm:"🦠"};
  function drawCards() {
    const query = drawer.querySelector("#scienceSearch").value.toLowerCase().trim();
    const grid = drawer.querySelector("#scienceGrid");
    grid.replaceChildren();
    scienceAssets.filter(item => (category === "All" || item.category === category) && `${item.name} ${item.tags} ${item.category}`.toLowerCase().includes(query)).forEach(asset => {
      const button = document.createElement("button");
      button.type = "button"; button.className = "science-card";
      button.innerHTML = `<span class="preview">${emoji[asset.id]}</span><small>${asset.name}</small>`;
      button.addEventListener("click", () => addScienceAsset(asset));
      grid.appendChild(button);
    });
  }
  drawer.querySelector("#scienceSearch").addEventListener("input", drawCards);
  drawer.querySelector("#closeScience").addEventListener("click", () => drawer.classList.remove("open"));
  drawer.querySelector("#uploadAsset").addEventListener("click", () => drawer.querySelector("#assetFile").click());
  drawer.querySelector("#assetFile").addEventListener("change", event => {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      pushHistory();
      const item = { id:uid(),type:"image",name:file.name,x:420,y:240,width:300,height:220,src:reader.result,fill:"#ffffff",stroke:"#26324a",opacity:1 };
      state.objects.push(item); state.selectedId=item.id; render(); scheduleSave();
    };
    reader.readAsDataURL(file); event.target.value="";
  });
  drawCards();
  return drawer;
}

const scienceDrawer = createScienceDrawer();
document.querySelector('[data-tab="science"]').addEventListener("click", () => scienceDrawer.classList.toggle("open"));
document.querySelectorAll(".ribbon-tab").forEach(tab => tab.addEventListener("click", () => {
  document.querySelectorAll(".ribbon-tab").forEach(item => item.classList.remove("active"));
  tab.classList.add("active");
}));
