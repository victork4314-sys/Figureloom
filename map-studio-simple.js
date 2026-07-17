(() => {
  if (typeof createDrawer !== "function") return;

  const LEAFLET_JS = "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js";
  const LEAFLET_CSS = "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css";
  const SEARCH_URL = "https://nominatim.openstreetmap.org/search";
  const EXPORT_WIDTH = 1200;

  const COLORS = Object.freeze({
    primary: "#2563eb",
    primaryDark: "#1d4ed8",
    text: "#253044",
    muted: "#6b7280",
    line: "#cfd7e3",
    white: "#ffffff",
    panel: "#f9fbfd",
    surface: "#f4f7fb"
  });

  const BASEMAPS = {
    streets: {
      label: "Streets",
      service: "World_Street_Map",
      tile: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
      attribution: "Tiles © Esri"
    },
    satellite: {
      label: "Satellite",
      service: "World_Imagery",
      tile: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      referenceService: "Reference/World_Boundaries_and_Places",
      referenceTile: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      attribution: "Imagery © Esri"
    },
    terrain: {
      label: "Terrain",
      service: "World_Topo_Map",
      tile: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
      attribution: "Tiles © Esri"
    }
  };

  let map = null;
  let baseLayer = null;
  let referenceLayer = null;
  let markerMode = false;
  let markerCounter = 0;
  let searchController = null;
  const markers = [];

  function loadStyle(url) {
    if ([...document.styleSheets].some(sheet => sheet.href === url)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = url;
    document.head.appendChild(link);
  }

  function loadScript(url, globalName) {
    if (window[globalName]) return Promise.resolve(window[globalName]);
    const existing = [...document.scripts].find(script => script.src === url);
    if (existing) {
      return new Promise((resolve, reject) => {
        existing.addEventListener("load", () => resolve(window[globalName]), { once: true });
        existing.addEventListener("error", () => reject(new Error(`Could not load ${globalName}.`)), { once: true });
      });
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = url;
      script.async = true;
      script.addEventListener("load", () => resolve(window[globalName]), { once: true });
      script.addEventListener("error", () => reject(new Error(`Could not load ${globalName}.`)), { once: true });
      document.head.appendChild(script);
    });
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error || new Error("Could not read map image."));
      reader.readAsDataURL(blob);
    });
  }

  const drawer = createDrawer(
    "mapStudioSimpleDrawer",
    "Map Studio",
    "Search, drag, zoom, and add markers like a normal map"
  );
  drawer.classList.add("map-studio-simple");
  drawer.querySelector(".utility-body").innerHTML = `
    <div class="mapg-topbar">
      <form id="mapgSearchForm" class="mapg-search">
        <input id="mapgSearchInput" type="search" autocomplete="off" placeholder="Search Stavanger, Oslo, a hospital, an address…" aria-label="Search map">
        <button type="submit">Search</button>
      </form>
      <label class="mapg-basemap">Map
        <select id="mapgBasemap">
          <option value="streets">Streets</option>
          <option value="satellite">Satellite</option>
          <option value="terrain">Terrain</option>
        </select>
      </label>
    </div>
    <div id="mapgSearchResults" class="mapg-results"></div>
    <div class="mapg-markerbar">
      <input id="mapgMarkerLabel" type="text" placeholder="Marker label · optional" aria-label="Marker label">
      <button id="mapgMarkerButton" type="button">Add marker</button>
      <button id="mapgClearMarkers" type="button">Clear markers</button>
      <span id="mapgModeHint">Drag to move · pinch or scroll to zoom</span>
    </div>
    <div id="mapgMap" class="mapg-map" aria-label="Interactive map"></div>
    <div id="mapgMarkerList" class="mapg-marker-list"><span>No markers yet.</span></div>
    <details class="mapg-options">
      <summary>Map options</summary>
      <div class="mapg-option-grid">
        <label>Title<input id="mapgTitle" type="text" placeholder="Study area"></label>
        <label><input id="mapgShowTitle" type="checkbox" checked> Show title</label>
        <label><input id="mapgShowNorth" type="checkbox" checked> North arrow</label>
        <label><input id="mapgSatelliteLabels" type="checkbox" checked> Labels on satellite</label>
      </div>
    </details>
    <div class="mapg-actions">
      <button id="mapgReset" type="button">Reset world view</button>
      <button id="mapgAddToCanvas" class="primary" type="button">Add map to canvas</button>
    </div>
    <p id="mapgStatus" class="tool-note">Search for a place or move around the map. Nothing adds a marker until you press “Add marker.”</p>
  `;

  const q = selector => drawer.querySelector(selector);
  const controls = {
    searchForm: q("#mapgSearchForm"),
    searchInput: q("#mapgSearchInput"),
    results: q("#mapgSearchResults"),
    basemap: q("#mapgBasemap"),
    markerLabel: q("#mapgMarkerLabel"),
    markerButton: q("#mapgMarkerButton"),
    clearMarkers: q("#mapgClearMarkers"),
    modeHint: q("#mapgModeHint"),
    markerList: q("#mapgMarkerList"),
    title: q("#mapgTitle"),
    showTitle: q("#mapgShowTitle"),
    showNorth: q("#mapgShowNorth"),
    satelliteLabels: q("#mapgSatelliteLabels"),
    reset: q("#mapgReset"),
    add: q("#mapgAddToCanvas"),
    status: q("#mapgStatus")
  };

  function setStatus(message, error = false) {
    controls.status.textContent = message;
    controls.status.classList.toggle("error", error);
  }

  function markerIcon() {
    return window.L.divIcon({
      className: "mapg-leaflet-marker",
      html: '<span class="mapg-pin-dot"></span>',
      iconSize: [28, 36],
      iconAnchor: [14, 34],
      popupAnchor: [0, -32]
    });
  }

  function setMarkerMode(enabled) {
    markerMode = enabled;
    controls.markerButton.classList.toggle("active", enabled);
    controls.markerButton.textContent = enabled ? "Cancel marker" : "Add marker";
    q("#mapgMap").classList.toggle("placing-marker", enabled);
    controls.modeHint.textContent = enabled
      ? "Tap once on the map to place the marker"
      : "Drag to move · pinch or scroll to zoom";
  }

  function renderMarkerList() {
    controls.markerList.replaceChildren();
    if (!markers.length) {
      const empty = document.createElement("span");
      empty.textContent = "No markers yet.";
      controls.markerList.appendChild(empty);
      return;
    }
    markers.forEach(record => {
      const row = document.createElement("div");
      row.className = "mapg-marker-row";
      const name = document.createElement("button");
      name.type = "button";
      name.className = "mapg-marker-name";
      name.textContent = record.label;
      name.title = "Move map to this marker";
      name.addEventListener("click", () => map.flyTo(record.marker.getLatLng(), Math.max(map.getZoom(), 15), { duration: 0.45 }));
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "mapg-marker-remove";
      remove.textContent = "Remove";
      remove.addEventListener("click", () => {
        map.removeLayer(record.marker);
        const index = markers.indexOf(record);
        if (index >= 0) markers.splice(index, 1);
        renderMarkerList();
      });
      row.append(name, remove);
      controls.markerList.appendChild(row);
    });
  }

  function addMarker(latlng, requestedLabel = "") {
    const label = requestedLabel.trim() || `Marker ${++markerCounter}`;
    const marker = window.L.marker(latlng, { icon: markerIcon(), draggable: true }).addTo(map);
    marker.bindTooltip(label, { permanent: true, direction: "right", offset: [10, -15], className: "mapg-marker-tooltip" });
    const record = { id: `marker:${Date.now()}:${Math.random()}`, label, marker };
    marker.on("dragend", renderMarkerList);
    markers.push(record);
    renderMarkerList();
    controls.markerLabel.value = "";
    setMarkerMode(false);
    setStatus(`${label} added. Drag the marker to adjust it, or drag the map normally.`);
  }

  function removeBasemapLayers() {
    if (baseLayer) map.removeLayer(baseLayer);
    if (referenceLayer) map.removeLayer(referenceLayer);
    baseLayer = null;
    referenceLayer = null;
  }

  function setBasemap(kind) {
    if (!map) return;
    removeBasemapLayers();
    const config = BASEMAPS[kind] || BASEMAPS.streets;
    baseLayer = window.L.tileLayer(config.tile, {
      maxZoom: 19,
      attribution: config.attribution,
      crossOrigin: true
    }).addTo(map);
    if (kind === "satellite" && controls.satelliteLabels.checked && config.referenceTile) {
      referenceLayer = window.L.tileLayer(config.referenceTile, {
        maxZoom: 19,
        attribution: "Reference © Esri",
        crossOrigin: true,
        pane: "overlayPane"
      }).addTo(map);
    }
    markers.forEach(record => record.marker.bringToFront?.());
  }

  async function ensureMap() {
    loadStyle(LEAFLET_CSS);
    await loadScript(LEAFLET_JS, "L");
    if (map) {
      requestAnimationFrame(() => map.invalidateSize());
      return map;
    }
    map = window.L.map("mapgMap", {
      center: [20, 0],
      zoom: 2,
      minZoom: 2,
      maxZoom: 19,
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: true,
      touchZoom: true,
      dragging: true,
      doubleClickZoom: true,
      boxZoom: true,
      keyboard: true,
      worldCopyJump: true
    });
    window.L.control.scale({ imperial: false, position: "bottomleft" }).addTo(map);
    setBasemap(controls.basemap.value);
    map.on("click", event => {
      if (!markerMode) return;
      addMarker(event.latlng, controls.markerLabel.value);
    });
    map.on("moveend zoomend", () => {
      const center = map.getCenter();
      setStatus(`Map centred at ${center.lat.toFixed(4)}, ${center.lng.toFixed(4)} · zoom ${map.getZoom()}.`);
    });
    requestAnimationFrame(() => map.invalidateSize());
    return map;
  }

  function zoomForResult(result) {
    const type = String(result.type || "").toLowerCase();
    const category = String(result.category || "").toLowerCase();
    if (["house", "building", "hospital", "school", "station", "amenity"].some(value => type.includes(value) || category.includes(value))) return 17;
    if (["city", "town", "village", "municipality", "suburb", "neighbourhood"].some(value => type.includes(value))) return 14;
    if (["county", "state", "province", "region"].some(value => type.includes(value))) return 9;
    if (type.includes("country")) return 5;
    return 13;
  }

  async function searchPlaces(query) {
    const clean = String(query || "").trim();
    if (!clean) return;
    await ensureMap();
    searchController?.abort();
    searchController = new AbortController();
    controls.results.replaceChildren();
    const loading = document.createElement("p");
    loading.textContent = `Searching for “${clean}”…`;
    controls.results.appendChild(loading);
    setStatus(`Searching for “${clean}”…`);
    try {
      const params = new URLSearchParams({
        q: clean,
        format: "jsonv2",
        addressdetails: "1",
        limit: "8",
        dedupe: "1"
      });
      const response = await fetch(`${SEARCH_URL}?${params}`, {
        signal: searchController.signal,
        headers: { Accept: "application/json" },
        cache: "no-cache"
      });
      if (!response.ok) throw new Error(`Place search returned ${response.status}.`);
      const results = await response.json();
      controls.results.replaceChildren();
      if (!results.length) {
        const empty = document.createElement("p");
        empty.textContent = "No place matched that search.";
        controls.results.appendChild(empty);
        setStatus("No place matched that search.", true);
        return;
      }
      results.forEach(result => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "mapg-result";
        const title = document.createElement("strong");
        title.textContent = result.name || String(result.display_name || "").split(",")[0] || "Place";
        const description = document.createElement("span");
        description.textContent = result.display_name || "";
        button.append(title, description);
        button.addEventListener("click", () => {
          const lat = Number(result.lat);
          const lon = Number(result.lon);
          const label = title.textContent;
          controls.markerLabel.value = label;
          controls.title.value = label;
          controls.results.replaceChildren();
          map.flyTo([lat, lon], zoomForResult(result), { duration: 0.7 });
          setStatus(`${label} selected. The map moved there; no marker was added.`);
        });
        controls.results.appendChild(button);
      });
    } catch (error) {
      if (error.name === "AbortError") return;
      console.error(error);
      controls.results.replaceChildren();
      const failed = document.createElement("p");
      failed.textContent = `Search failed: ${error.message}`;
      controls.results.appendChild(failed);
      setStatus(`Search failed: ${error.message}`, true);
    }
  }

  async function exportServiceImage(servicePath, bounds, width, height, transparent = false) {
    const params = new URLSearchParams({
      bbox: `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`,
      bboxSR: "4326",
      imageSR: "3857",
      size: `${width},${height}`,
      format: transparent ? "png32" : "png32",
      transparent: transparent ? "true" : "false",
      dpi: "96",
      f: "image"
    });
    const url = `https://services.arcgisonline.com/ArcGIS/rest/services/${servicePath}/MapServer/export?${params}`;
    const response = await fetch(url, { mode: "cors", cache: "no-cache" });
    if (!response.ok) throw new Error(`Map image returned ${response.status}.`);
    return blobToDataUrl(await response.blob());
  }

  function svgNode(tag, attrs = {}, text = "") {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
    if (text) node.textContent = text;
    return node;
  }

  async function addMapToCanvas() {
    await ensureMap();
    controls.add.disabled = true;
    const originalText = controls.add.textContent;
    controls.add.textContent = "Embedding current view…";
    setStatus("Embedding the exact current map view…");
    try {
      const size = map.getSize();
      const exportHeight = Math.max(500, Math.round(EXPORT_WIDTH * size.y / Math.max(1, size.x)));
      const config = BASEMAPS[controls.basemap.value] || BASEMAPS.streets;
      const bounds = map.getBounds();
      const mainImage = await exportServiceImage(config.service, bounds, EXPORT_WIDTH, exportHeight, false);
      let referenceImage = null;
      if (controls.basemap.value === "satellite" && controls.satelliteLabels.checked && config.referenceService) {
        referenceImage = await exportServiceImage(config.referenceService, bounds, EXPORT_WIDTH, exportHeight, true);
      }

      const root = svgNode("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: `0 0 ${EXPORT_WIDTH} ${exportHeight}`
      });
      root.appendChild(svgNode("image", {
        href: mainImage,
        x: 0,
        y: 0,
        width: EXPORT_WIDTH,
        height: exportHeight,
        preserveAspectRatio: "none"
      }));
      if (referenceImage) {
        root.appendChild(svgNode("image", {
          href: referenceImage,
          x: 0,
          y: 0,
          width: EXPORT_WIDTH,
          height: exportHeight,
          preserveAspectRatio: "none"
        }));
      }

      const scaleX = EXPORT_WIDTH / Math.max(1, size.x);
      const scaleY = exportHeight / Math.max(1, size.y);
      markers.forEach(record => {
        const point = map.latLngToContainerPoint(record.marker.getLatLng());
        const x = point.x * scaleX;
        const y = point.y * scaleY;
        const group = svgNode("g", { transform: `translate(${x} ${y})` });
        group.appendChild(svgNode("path", {
          d: "M0 16 C-17 -3 -18 -25 0 -34 C18 -25 17 -3 0 16Z",
          fill: COLORS.primary,
          stroke: COLORS.text,
          "stroke-width": 2
        }));
        group.appendChild(svgNode("circle", { cx: 0, cy: -18, r: 5, fill: COLORS.white }));
        const labelWidth = Math.max(82, Math.min(280, record.label.length * 8 + 24));
        group.appendChild(svgNode("rect", {
          x: 13,
          y: -38,
          width: labelWidth,
          height: 29,
          rx: 7,
          fill: COLORS.white,
          stroke: COLORS.line,
          "stroke-width": 1.2,
          opacity: 0.96
        }));
        group.appendChild(svgNode("text", {
          x: 24,
          y: -19,
          fill: COLORS.text,
          "font-size": 14,
          "font-weight": 650
        }, record.label));
        root.appendChild(group);
      });

      const title = controls.title.value.trim() || "Map";
      if (controls.showTitle.checked) {
        const titleWidth = Math.max(180, Math.min(700, title.length * 14 + 36));
        root.appendChild(svgNode("rect", {
          x: 22,
          y: 20,
          width: titleWidth,
          height: 48,
          rx: 10,
          fill: COLORS.white,
          opacity: 0.9
        }));
        root.appendChild(svgNode("text", {
          x: 40,
          y: 52,
          fill: COLORS.text,
          "font-size": 25,
          "font-weight": 750
        }, title));
      }
      if (controls.showNorth.checked) {
        const group = svgNode("g", { transform: `translate(${EXPORT_WIDTH - 78} 76)` });
        group.appendChild(svgNode("path", {
          d: "M0 34 L15 -12 L30 34 L15 24Z",
          fill: COLORS.primary,
          stroke: COLORS.text,
          "stroke-width": 2
        }));
        group.appendChild(svgNode("text", {
          x: 15,
          y: -21,
          "text-anchor": "middle",
          fill: COLORS.text,
          "font-size": 17,
          "font-weight": 750
        }, "N"));
        root.appendChild(group);
      }
      root.appendChild(svgNode("text", {
        x: EXPORT_WIDTH - 14,
        y: exportHeight - 12,
        "text-anchor": "end",
        fill: COLORS.white,
        stroke: COLORS.text,
        "stroke-width": 2.5,
        "paint-order": "stroke",
        "font-size": 10
      }, `${config.label} basemap © Esri`));

      const canvasSize = window.currentCanvasSize?.() || { width: 1200, height: 750 };
      const objectWidth = Math.min(canvasSize.width * 0.82, 900);
      const objectHeight = objectWidth * exportHeight / EXPORT_WIDTH;
      const item = {
        id: uid(),
        type: "svg",
        name: title,
        x: Math.max(20, (canvasSize.width - objectWidth) / 2),
        y: Math.max(20, (canvasSize.height - objectHeight) / 2),
        width: objectWidth,
        height: objectHeight,
        svgMarkup: root.innerHTML,
        svgViewBox: `0 0 ${EXPORT_WIDTH} ${exportHeight}`,
        svgColorMode: "original",
        fill: COLORS.primary,
        stroke: COLORS.text,
        opacity: 1,
        rotation: 0,
        visible: true,
        metadata: {
          sourcePack: "Interactive Map Studio",
          sourceName: title,
          sourceUrl: `https://services.arcgisonline.com/ArcGIS/rest/services/${config.service}/MapServer`,
          license: "Esri basemap attribution required",
          attribution: `${config.label} basemap © Esri. Place search © OpenStreetMap contributors.`,
          notes: `Exact current map view embedded with ${markers.length} marker(s).`
        }
      };
      pushHistory();
      state.objects.push(item);
      state.selectedId = item.id;
      render();
      renderPages?.();
      scheduleSave();
      drawer.classList.remove("open");
    } catch (error) {
      console.error(error);
      setStatus(`Could not add map: ${error.message}`, true);
      alert(`Could not add map: ${error.message}`);
    } finally {
      controls.add.disabled = false;
      controls.add.textContent = originalText;
    }
  }

  controls.searchForm.addEventListener("submit", event => {
    event.preventDefault();
    searchPlaces(controls.searchInput.value);
  });
  controls.basemap.addEventListener("change", () => setBasemap(controls.basemap.value));
  controls.satelliteLabels.addEventListener("change", () => {
    if (controls.basemap.value === "satellite") setBasemap("satellite");
  });
  controls.markerButton.addEventListener("click", () => setMarkerMode(!markerMode));
  controls.clearMarkers.addEventListener("click", () => {
    markers.splice(0).forEach(record => map?.removeLayer(record.marker));
    renderMarkerList();
    setMarkerMode(false);
    setStatus("All markers cleared. The map position and zoom were not changed.");
  });
  controls.reset.addEventListener("click", () => {
    ensureMap().then(() => map.setView([20, 0], 2));
  });
  controls.add.addEventListener("click", addMapToCanvas);

  const style = document.createElement("style");
  style.textContent = `
    #mapStudioDrawer,#mapStudioDetailedDrawer,#mapStudioReliableDrawer{display:none!important}
    #mapStudioSimpleDrawer{width:min(980px,calc(100vw - 18px))}
    .mapg-topbar{display:grid;grid-template-columns:1fr 130px;gap:8px;align-items:end}
    .mapg-search{display:grid;grid-template-columns:1fr auto;gap:7px}
    .mapg-search input,.mapg-markerbar input,.mapg-basemap select,.mapg-option-grid input[type=text]{min-width:0;min-height:39px;border:1px solid ${COLORS.line};border-radius:8px;background:${COLORS.white};padding:8px 10px;color:${COLORS.text}}
    .mapg-search button,.mapg-markerbar button,.mapg-actions button{min-height:39px;border:1px solid ${COLORS.line};border-radius:8px;background:${COLORS.white};padding:8px 11px;color:${COLORS.text}}
    .mapg-search button:hover,.mapg-markerbar button:hover,.mapg-actions button:hover{background:${COLORS.surface}}
    .mapg-basemap{display:grid;gap:5px;color:#596579;font-size:10px}
    .mapg-results{display:grid;gap:5px;max-height:190px;overflow:auto;margin:7px 0}
    .mapg-results>p{margin:0;padding:8px;color:${COLORS.muted};font-size:10px}
    .mapg-result{display:grid;gap:2px;text-align:left;border:1px solid #d9e0e9;border-radius:7px;background:${COLORS.white};padding:8px 10px;color:${COLORS.text}}
    .mapg-result:hover{background:${COLORS.surface};border-color:#7aa0ed}
    .mapg-result strong{font-size:11px}.mapg-result span{font-size:9px;color:${COLORS.muted};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .mapg-markerbar{display:grid;grid-template-columns:minmax(140px,1fr) auto auto minmax(180px,auto);gap:7px;align-items:center;margin:8px 0}
    .mapg-markerbar>span{color:${COLORS.muted};font-size:10px;text-align:right}
    .mapg-markerbar button.active{background:${COLORS.primary};border-color:${COLORS.primary};color:${COLORS.white}}
    .mapg-map{height:min(58vh,560px);min-height:360px;border:1px solid ${COLORS.line};border-radius:10px;overflow:hidden;background:${COLORS.surface};touch-action:none}
    .mapg-map.placing-marker,.mapg-map.placing-marker .leaflet-grab{cursor:crosshair!important}
    .mapg-leaflet-marker{background:none!important;border:none!important}
    .mapg-leaflet-marker::before{content:"";display:block;width:24px;height:32px;border-radius:50% 50% 50% 0;background:${COLORS.primary};border:2px solid ${COLORS.text};transform:rotate(-45deg);box-sizing:border-box;box-shadow:0 2px 5px rgba(0,0,0,.24)}
    .mapg-pin-dot{position:absolute;left:8px;top:7px;width:8px;height:8px;border-radius:50%;background:${COLORS.white};z-index:2}
    .mapg-marker-tooltip{border:1px solid ${COLORS.line};border-radius:7px;background:rgba(255,255,255,.96);box-shadow:none;color:${COLORS.text};font-size:11px;font-weight:650;padding:5px 8px}
    .mapg-marker-list{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0;min-height:28px;align-items:center;color:${COLORS.muted};font-size:10px}
    .mapg-marker-row{display:flex;border:1px solid #d9e0e9;border-radius:999px;overflow:hidden;background:${COLORS.white}}
    .mapg-marker-row button{border:0;background:transparent;padding:6px 9px;font-size:9px;color:${COLORS.text}}
    .mapg-marker-name{font-weight:650}.mapg-marker-remove{border-left:1px solid #e2e8f0!important;color:${COLORS.muted}!important}
    .mapg-options{margin:8px 0;border:1px solid #d9e0e9;border-radius:9px;background:${COLORS.panel};padding:8px 10px}
    .mapg-options summary{cursor:pointer;color:${COLORS.text};font-size:10px;font-weight:650}
    .mapg-option-grid{display:grid;grid-template-columns:1fr auto auto auto;gap:10px;align-items:center;margin-top:9px}
    .mapg-option-grid label{display:flex;align-items:center;gap:6px;color:#596579;font-size:10px}.mapg-option-grid label:first-child{display:grid;gap:5px}
    .mapg-actions{display:grid;grid-template-columns:1fr 2fr;gap:8px;margin-top:9px}
    .mapg-actions .primary{background:${COLORS.primary};border-color:${COLORS.primary};color:${COLORS.white};font-weight:700}
    .mapg-actions .primary:hover{background:${COLORS.primaryDark}}
    @media(max-width:760px){
      .mapg-topbar{grid-template-columns:1fr}.mapg-markerbar{grid-template-columns:1fr 1fr}.mapg-markerbar input,.mapg-markerbar>span{grid-column:1/-1}.mapg-markerbar>span{text-align:left}.mapg-option-grid{grid-template-columns:1fr 1fr}.mapg-option-grid label:first-child{grid-column:1/-1}.mapg-map{min-height:330px}.mapg-actions{grid-template-columns:1fr}
    }
  `;
  document.head.appendChild(style);

  async function openSimpleMapStudio() {
    document.getElementById("mapStudioDrawer")?.classList.remove("open");
    document.getElementById("mapStudioDetailedDrawer")?.classList.remove("open");
    document.getElementById("mapStudioReliableDrawer")?.classList.remove("open");
    drawer.classList.add("open");
    setStatus("Loading interactive map…");
    try {
      await ensureMap();
      setTimeout(() => map.invalidateSize(), 80);
      setStatus("Search for a place or drag the map. Press “Add marker” only when you actually want one.");
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  window.openMapStudio = openSimpleMapStudio;
  window.openDetailedMapStudio = openSimpleMapStudio;
  window.openReliableMapStudio = openSimpleMapStudio;
  window.openSimpleMapStudio = openSimpleMapStudio;

  document.addEventListener("click", event => {
    const button = event.target.closest?.("#insertMapStudio");
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    document.getElementById("insertDrawer")?.classList.remove("open");
    openSimpleMapStudio();
  }, true);

  function polishInsertButton() {
    const button = document.getElementById("insertMapStudio");
    if (!button) return false;
    button.innerHTML = "<strong>Interactive maps</strong><small>Search, drag, zoom, satellite, terrain, and explicit markers</small>";
    return true;
  }
  if (!polishInsertButton()) {
    new MutationObserver((_, observer) => {
      if (polishInsertButton()) observer.disconnect();
    }).observe(document.body, { childList: true, subtree: true });
  }
})();
