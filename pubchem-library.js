(() => {
  const API_ROOT = "https://pubchem.ncbi.nlm.nih.gov/rest/pug";
  const AUTOCOMPLETE_ROOT = "https://pubchem.ncbi.nlm.nih.gov/rest/autocomplete/compound";
  const SOURCE_ROOT = "https://pubchem.ncbi.nlm.nih.gov/compound";
  const MAX_RESULTS = 12;
  const resultCache = new Map();
  let searchController = null;
  let mainSearchTimer = 0;

  function encode(value) {
    return encodeURIComponent(String(value || "").trim());
  }

  function imageUrl(cid, size = "500x400") {
    return `${API_ROOT}/compound/cid/${cid}/PNG?record_type=2d&image_size=${size}`;
  }

  function sourceUrl(cid) {
    return `${SOURCE_ROOT}/${cid}`;
  }

  function humanWeight(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? `${numeric.toLocaleString(undefined, { maximumFractionDigits: 4 })} g/mol` : String(value || "");
  }

  async function fetchJson(url, signal) {
    const response = await fetch(url, {
      signal,
      headers: { Accept: "application/json" },
      cache: "no-cache"
    });
    if (!response.ok) {
      const error = new Error(response.status === 404 ? "No matching compound was found." : `PubChem returned ${response.status}.`);
      error.status = response.status;
      throw error;
    }
    return response.json();
  }

  async function resolveCids(query, signal) {
    const cidMatch = String(query).trim().match(/^(?:cid\s*[:#-]?\s*)?(\d+)$/i);
    if (cidMatch) return [Number(cidMatch[1])];
    const data = await fetchJson(`${API_ROOT}/compound/name/${encode(query)}/cids/JSON`, signal);
    return (data.IdentifierList?.CID || []).slice(0, MAX_RESULTS);
  }

  async function fetchProperties(cids, signal) {
    if (!cids.length) return [];
    const joined = cids.join(",");
    const data = await fetchJson(
      `${API_ROOT}/compound/cid/${joined}/property/Title,MolecularFormula,MolecularWeight,IUPACName/JSON`,
      signal
    );
    return (data.PropertyTable?.Properties || []).map(record => ({
      cid: record.CID,
      title: record.Title || record.IUPACName || `PubChem CID ${record.CID}`,
      formula: record.MolecularFormula || "",
      molecularWeight: record.MolecularWeight || "",
      iupacName: record.IUPACName || ""
    }));
  }

  async function autocomplete(query, signal) {
    const data = await fetchJson(`${AUTOCOMPLETE_ROOT}/${encode(query)}/json?limit=10`, signal);
    return data.dictionary_terms?.compound || [];
  }

  async function searchCompounds(query, signal) {
    const key = query.trim().toLowerCase();
    if (resultCache.has(key)) return resultCache.get(key);
    try {
      const cids = await resolveCids(query, signal);
      const result = { compounds: await fetchProperties(cids, signal), suggestions: [] };
      resultCache.set(key, result);
      return result;
    } catch (error) {
      if (error.name === "AbortError") throw error;
      if (error.status !== 404) throw error;
      const result = { compounds: [], suggestions: await autocomplete(query, signal) };
      resultCache.set(key, result);
      return result;
    }
  }

  async function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error("The chemical structure image could not be read."));
      reader.readAsDataURL(blob);
    });
  }

  async function addCompound(compound, button) {
    const previous = button.textContent;
    button.disabled = true;
    button.textContent = "Embedding…";
    try {
      const assetUrl = imageUrl(compound.cid, "700x520");
      const response = await fetch(assetUrl, { cache: "force-cache" });
      if (!response.ok) throw new Error(`Structure download failed (${response.status}).`);
      const src = await blobToDataUrl(await response.blob());
      pushHistory();
      const item = {
        id: uid(),
        type: "image",
        name: compound.title,
        x: 410,
        y: 220,
        width: 350,
        height: 260,
        src,
        fill: "#ffffff",
        stroke: "#26324a",
        opacity: 1,
        rotation: 0,
        visible: true,
        metadata: {
          sourcePack: "PubChem",
          sourceName: compound.title,
          sourceUrl: sourceUrl(compound.cid),
          sourceAssetUrl: assetUrl,
          author: "PubChem · NIH/NLM/NCBI",
          license: "PubChem open chemistry data; review record provenance",
          licenseUrl: "https://pubchem.ncbi.nlm.nih.gov/docs/about",
          attribution: `${compound.title} chemical structure, PubChem CID ${compound.cid}.`,
          pubchemCid: compound.cid,
          molecularFormula: compound.formula,
          molecularWeight: compound.molecularWeight,
          iupacName: compound.iupacName,
          notes: "The 2D depiction is embedded in the Figureloom project. PubChem records aggregate data from multiple contributors; consult the linked record for provenance."
        }
      };
      state.objects.push(item);
      state.selectedId = item.id;
      render();
      scheduleSave();
      window.syncPage?.();
      button.textContent = "Added ✓";
      setTimeout(() => {
        button.textContent = previous;
        button.disabled = false;
      }, 1100);
    } catch (error) {
      console.error(error);
      alert(`Could not add this chemical structure: ${error.message}`);
      button.textContent = previous;
      button.disabled = false;
    }
  }

  function compoundCard(compound, compact = false) {
    const card = document.createElement("article");
    card.className = compact ? "pubchem-card pubchem-card-compact" : "pubchem-card";

    const preview = document.createElement("div");
    preview.className = "pubchem-preview";
    const image = document.createElement("img");
    image.loading = "lazy";
    image.alt = `${compound.title} 2D chemical structure`;
    image.src = imageUrl(compound.cid, compact ? "300x220" : "500x400");
    preview.appendChild(image);

    const copy = document.createElement("div");
    copy.className = "pubchem-copy";
    const title = document.createElement("strong");
    title.textContent = compound.title;
    title.title = compound.title;
    const formula = document.createElement("span");
    formula.textContent = compound.formula || `CID ${compound.cid}`;
    const details = document.createElement("small");
    details.textContent = `CID ${compound.cid}${compound.molecularWeight ? ` · ${humanWeight(compound.molecularWeight)}` : ""}`;
    copy.append(title, formula, details);

    const actions = document.createElement("div");
    actions.className = "pubchem-actions";
    const add = document.createElement("button");
    add.type = "button";
    add.textContent = "Add structure";
    add.addEventListener("click", () => addCompound(compound, add));
    const source = document.createElement("a");
    source.href = sourceUrl(compound.cid);
    source.target = "_blank";
    source.rel = "noopener noreferrer";
    source.textContent = "PubChem record";
    actions.append(add, source);

    card.append(preview, copy, actions);
    return card;
  }

  function renderSuggestions(container, suggestions, onChoose) {
    container.replaceChildren();
    const note = document.createElement("p");
    note.className = "pubchem-empty";
    note.textContent = suggestions.length ? "No exact record matched. Try one of these PubChem suggestions:" : "No PubChem compound matched that search.";
    container.appendChild(note);
    if (!suggestions.length) return;
    const list = document.createElement("div");
    list.className = "pubchem-suggestions";
    suggestions.forEach(term => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = term;
      button.addEventListener("click", () => onChoose(term));
      list.appendChild(button);
    });
    container.appendChild(list);
  }

  const drawer = createDrawer(
    "pubchemDrawer",
    "Chemical structure library",
    "Search PubChem by compound name, synonym or CID"
  );
  drawer.classList.add("pubchem-drawer");
  drawer.querySelector(".utility-body").innerHTML = `
    <div class="pubchem-hero">
      <div><strong>PubChem inside Figureloom</strong><span>Search the NIH open chemistry database, then embed the selected 2D structure into your figure.</span></div>
      <a href="https://pubchem.ncbi.nlm.nih.gov/" target="_blank" rel="noopener noreferrer">Open PubChem</a>
    </div>
    <form id="pubchemSearchForm" class="pubchem-search">
      <input id="pubchemSearchInput" type="search" autocomplete="off" placeholder="Try dopamine, serotonin, caffeine, ATP or CID 681" aria-label="Search PubChem compounds">
      <button type="submit">Search</button>
    </form>
    <div class="pubchem-quick" aria-label="Popular chemical searches"></div>
    <p id="pubchemStatus" class="pubchem-status">Search millions of chemical records without adding them to the repository.</p>
    <div id="pubchemResults" class="pubchem-grid"></div>
    <p class="tool-note">Results are retrieved on demand. Added structures are embedded into the project for reliable export and offline reopening. PubChem asks applications to stay below five requests per second; Figureloom uses only a few requests per search.</p>
  `;

  const style = document.createElement("style");
  style.textContent = `
    .pubchem-drawer{width:min(860px,calc(100vw - 28px))}
    .pubchem-hero{display:flex;justify-content:space-between;gap:14px;align-items:center;padding:12px;border:1px solid #bfd4cf;border-radius:11px;background:linear-gradient(135deg,#edf8f5,#fbfefd);margin-bottom:10px}
    .pubchem-hero strong,.pubchem-hero span{display:block}.pubchem-hero strong{font-size:14px;color:#123f37}.pubchem-hero span{margin-top:3px;font-size:11px;line-height:1.4;color:#5d756f}.pubchem-hero a{white-space:nowrap;border:1px solid #9bbdb5;border-radius:8px;padding:7px 9px;background:white;color:#176252;text-decoration:none;font-size:10px}
    .pubchem-search{display:grid;grid-template-columns:1fr auto;gap:8px}.pubchem-search input{min-width:0;border:1px solid #bdcac7;border-radius:9px;padding:10px 11px;background:white}.pubchem-search button{border:1px solid #176252;border-radius:9px;padding:0 15px;background:#176252;color:white;font-weight:700}
    .pubchem-quick{display:flex;flex-wrap:wrap;gap:6px;margin:9px 0}.pubchem-quick button,.pubchem-suggestions button{border:1px solid #cbd8d5;border-radius:999px;background:#fff;padding:6px 9px;color:#315d54;font-size:10px}.pubchem-quick button:hover,.pubchem-suggestions button:hover{border-color:#39786d;background:#eff8f6}
    .pubchem-status{margin:8px 0;color:#657a75;font-size:11px}.pubchem-status.error{color:#a63749}.pubchem-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.pubchem-card{min-width:0;display:flex;flex-direction:column;border:1px solid #d4dfdc;border-radius:10px;background:white;overflow:hidden}.pubchem-preview{height:165px;display:grid;place-items:center;background:#fff;padding:8px;border-bottom:1px solid #edf1f0}.pubchem-preview img{display:block;max-width:100%;max-height:100%;object-fit:contain}.pubchem-copy{display:grid;gap:3px;padding:9px}.pubchem-copy strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px}.pubchem-copy span{font-family:Georgia,serif;font-size:12px;color:#213f39}.pubchem-copy small{font-size:9px;color:#758681}.pubchem-actions{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:0 9px 9px;margin-top:auto}.pubchem-actions button,.pubchem-actions a{display:grid;place-items:center;border:1px solid #c5d4d0;border-radius:7px;background:#f7fbfa;padding:7px;color:#275b50;text-decoration:none;font-size:9px}.pubchem-actions button:hover{background:#eaf5f2;border-color:#69998e}.pubchem-empty{font-size:11px;color:#667a75}.pubchem-suggestions{display:flex;flex-wrap:wrap;gap:7px}
    #scienceGrid .pubchem-card-compact{grid-column:span 1;min-height:154px}.pubchem-card-compact .pubchem-preview{height:92px}.pubchem-card-compact .pubchem-copy{padding:6px}.pubchem-card-compact .pubchem-actions{grid-template-columns:1fr;padding:0 6px 6px}.pubchem-card-compact .pubchem-actions a{display:none}
    .pubchem-inline-status{grid-column:1/-1;padding:10px;border:1px dashed #b9cbc6;border-radius:9px;background:#f7fbfa;color:#58736c;font-size:10px}
    @media(max-width:760px){.pubchem-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.pubchem-hero{align-items:flex-start}.pubchem-hero a{display:none}}
  `;
  document.head.appendChild(style);

  const input = drawer.querySelector("#pubchemSearchInput");
  const status = drawer.querySelector("#pubchemStatus");
  const results = drawer.querySelector("#pubchemResults");

  function setStatus(message, error = false) {
    status.textContent = message;
    status.classList.toggle("error", error);
  }

  async function runDrawerSearch(query) {
    const clean = String(query || "").trim();
    if (!clean) return;
    input.value = clean;
    drawer.classList.add("open");
    searchController?.abort();
    searchController = new AbortController();
    results.replaceChildren();
    setStatus(`Searching PubChem for “${clean}”…`);
    try {
      const data = await searchCompounds(clean, searchController.signal);
      if (data.compounds.length) {
        results.replaceChildren(...data.compounds.map(compound => compoundCard(compound)));
        setStatus(`${data.compounds.length.toLocaleString()} matching compound${data.compounds.length === 1 ? "" : "s"} · structures load directly from PubChem`);
      } else {
        renderSuggestions(results, data.suggestions, runDrawerSearch);
        setStatus(data.suggestions.length ? "No exact match; suggestions found." : "No matching compound found.", !data.suggestions.length);
      }
    } catch (error) {
      if (error.name === "AbortError") return;
      console.error(error);
      results.replaceChildren();
      setStatus(`PubChem search failed: ${error.message}`, true);
    }
  }

  drawer.querySelector("#pubchemSearchForm").addEventListener("submit", event => {
    event.preventDefault();
    runDrawerSearch(input.value);
  });

  ["Dopamine", "Serotonin", "Adrenaline", "Caffeine", "Aspirin", "Glucose", "ATP", "Cholesterol"].forEach(term => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = term;
    button.addEventListener("click", () => runDrawerSearch(term));
    drawer.querySelector(".pubchem-quick").appendChild(button);
  });

  const scienceDrawer = document.getElementById("scienceDrawer");
  const scienceSearchRow = scienceDrawer?.querySelector(".science-search");
  const scienceSearch = document.getElementById("scienceSearch");
  if (scienceSearch) scienceSearch.placeholder = "Search bacteria, DNA, dopamine, chemicals…";

  if (scienceSearchRow && !document.getElementById("openPubChemLibrary")) {
    const button = document.createElement("button");
    button.id = "openPubChemLibrary";
    button.type = "button";
    button.textContent = "Chemicals";
    button.title = "Search the integrated PubChem chemical structure library";
    button.addEventListener("click", () => {
      drawer.classList.toggle("open");
      if (drawer.classList.contains("open")) setTimeout(() => input.focus(), 50);
    });
    scienceSearchRow.appendChild(button);
    scienceSearchRow.style.gridTemplateColumns = "1fr auto auto auto auto";
  }

  const packSources = document.getElementById("packSources");
  if (packSources && !packSources.querySelector('[data-pack="pubchem"]')) {
    const card = document.createElement("article");
    card.className = "pack-source";
    card.dataset.pack = "pubchem";
    card.innerHTML = `<h3>PubChem</h3><strong>Massive live chemical database</strong><p>Search named compounds and identifiers, preview standardized 2D structures, and embed them directly into Figureloom.</p><div class="pack-links"></div>`;
    const open = document.createElement("button");
    open.type = "button";
    open.className = "primary";
    open.textContent = "Open integrated library";
    Object.assign(open.style, { border:"1px solid #176252", borderRadius:"7px", padding:"6px 8px", background:"#176252", color:"white", fontSize:"10px" });
    open.addEventListener("click", () => {
      drawer.classList.add("open");
      setTimeout(() => input.focus(), 50);
    });
    card.querySelector(".pack-links").appendChild(open);
    packSources.prepend(card);
  }

  async function renderInlineResults(query) {
    const grid = document.getElementById("scienceGrid");
    if (!grid) return;
    grid.querySelectorAll(".pubchem-card,.pubchem-inline-status").forEach(node => node.remove());
    const statusNode = document.createElement("p");
    statusNode.className = "pubchem-inline-status";
    statusNode.textContent = `Searching PubChem for “${query}”…`;
    grid.appendChild(statusNode);
    try {
      const data = await searchCompounds(query, new AbortController().signal);
      statusNode.remove();
      if (document.getElementById("scienceSearch")?.value.trim().toLowerCase() !== query.toLowerCase()) return;
      if (data.compounds.length) {
        data.compounds.slice(0, 6).forEach(compound => grid.appendChild(compoundCard(compound, true)));
      } else {
        const open = document.createElement("button");
        open.type = "button";
        open.className = "pubchem-inline-status";
        open.textContent = data.suggestions.length ? `No exact match. Open chemical search for suggestions →` : `No PubChem compound matched “${query}”.`;
        if (data.suggestions.length) open.addEventListener("click", () => runDrawerSearch(query));
        grid.appendChild(open);
      }
    } catch (error) {
      statusNode.textContent = "PubChem is temporarily unavailable. Open the Chemicals library to try again.";
      statusNode.classList.add("error");
    }
  }

  scienceSearch?.addEventListener("input", () => {
    clearTimeout(mainSearchTimer);
    const query = scienceSearch.value.trim();
    const grid = document.getElementById("scienceGrid");
    grid?.querySelectorAll(".pubchem-card,.pubchem-inline-status").forEach(node => node.remove());
    if (query.length < 3) return;
    mainSearchTimer = setTimeout(() => {
      const localCards = [...(grid?.querySelectorAll(".science-card") || [])]
        .filter(card => !card.classList.contains("pubchem-card"));
      if (!localCards.length) renderInlineResults(query);
    }, 650);
  });

  window.openPubChemLibrary = query => {
    drawer.classList.add("open");
    if (query) runDrawerSearch(query);
    else setTimeout(() => input.focus(), 50);
  };
})();
