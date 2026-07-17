(() => {
  const WIDTH = 900;
  const HEIGHT = 560;
  const PLOT = { x: 28, y: 44, width: WIDTH - 56, height: HEIGHT - 80 };
  const BASEMAPS = {
    vector: null,
    satellite: "World_Imagery",
    streets: "World_Street_Map",
    terrain: "World_Topo_Map"
  };
  const imageCache = new Map();
  let lastProjection = null;
  let importedGeoJson = null;
  let importedGeoJsonName = "";
  let applying = false;
  let basemapVersion = 0;
  let previewObserver = null;

  const colors = {
    primary: "#2563eb",
    primaryDark: "#1d4ed8",
    text: "#253044",
    muted: "#6b7280",
    line: "#cfd7e3",
    white: "#ffffff",
    panel: "#f9fbfd",
    surface: "#f4f7fb"
  };

  function waitForDrawer() {
    const drawer = document.getElementById("mapStudioReliableDrawer");
    if (drawer) {
      install(drawer);
      return;
    }
    const observer = new MutationObserver(() => {
      const found = document.getElementById("mapStudioReliableDrawer");
      if (!found) return;
      observer.disconnect();
      install(found);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function install(drawer) {
    if (drawer.dataset.cityBasemapUpgrade === "true") return;
    drawer.dataset.cityBasemapUpgrade = "true";

    const mode = drawer.querySelector("#maprMode");
    const focus = drawer.querySelector("#maprFocus");
    const focusLabel = drawer.querySelector("#maprFocusLabel");
    const selectedCities = drawer.querySelector("#maprSelectedCities");
    const preview = drawer.querySelector("#maprPreview");
    const status = drawer.querySelector("#maprStatus");
    const addButton = drawer.querySelector("#maprAdd");
    const refreshButton = drawer.querySelector("#maprRefresh");
    const customLabel = drawer.querySelector("#maprCustomLabel");
    const customLat = drawer.querySelector("#maprCustomLat");
    const customLon = drawer.querySelector("#maprCustomLon");
    const addCustom = drawer.querySelector("#maprAddCustom");
    const titleInput = drawer.querySelector("#maprTitle");
    if (!mode || !focus || !preview || !addButton) return;

    const controlsSection = document.createElement("section");
    controlsSection.className = "mapr-section mapr-view-section";
    controlsSection.innerHTML = `
      <div class="mapr-heading">
        <strong>Local view and basemap</strong>
        <span>City maps open tightly around the selected marker. Satellite, streets, and terrain are embedded into the finished map.</span>
      </div>
      <div class="mapr-grid mapr-grid-3">
        <label>City extent
          <select id="maprCityExtent">
            <option value="2">2 km · neighbourhood</option>
            <option value="5">5 km · city centre</option>
            <option value="10" selected>10 km · city</option>
            <option value="25">25 km · municipality</option>
            <option value="50">50 km · region</option>
            <option value="100">100 km · wide region</option>
            <option value="fit">Fit all selected markers</option>
          </select>
        </label>
        <label>Basemap
          <select id="maprBasemap">
            <option value="vector">Figureloom vector</option>
            <option value="satellite">Satellite imagery</option>
            <option value="streets">Street map</option>
            <option value="terrain">Terrain / topographic</option>
          </select>
        </label>
        <label>Basemap strength
          <input id="maprBasemapOpacity" type="range" min="30" max="100" value="100">
        </label>
      </div>
      <div class="mapr-inline-options">
        <label><input id="maprVectorOverlay" type="checkbox" checked> Keep borders and water layers over basemap</label>
        <label><input id="maprClickPin" type="checkbox" checked> Tap map to add an exact marker</label>
      </div>
    `;

    const firstSection = drawer.querySelector(".mapr-section");
    firstSection?.insertAdjacentElement("beforebegin", controlsSection);

    const geoSection = document.createElement("section");
    geoSection.className = "mapr-section";
    geoSection.innerHTML = `
      <div class="mapr-heading">
        <strong>Detailed GIS overlay</strong>
        <span>Bring back actual streets, districts, coastlines, watersheds, routes, or study boundaries from GeoJSON.</span>
      </div>
      <div class="mapr-geo-actions">
        <button id="maprImportGeoJson" type="button">Import GeoJSON</button>
        <button id="maprClearGeoJson" type="button" disabled>Clear overlay</button>
        <input id="maprGeoJsonFile" type="file" accept="application/geo+json,application/json,.geojson,.json" hidden>
      </div>
      <p id="maprGeoJsonName" class="tool-note">No GeoJSON overlay loaded.</p>
    `;
    controlsSection.insertAdjacentElement("afterend", geoSection);

    const extent = controlsSection.querySelector("#maprCityExtent");
    const basemap = controlsSection.querySelector("#maprBasemap");
    const opacity = controlsSection.querySelector("#maprBasemapOpacity");
    const vectorOverlay = controlsSection.querySelector("#maprVectorOverlay");
    const clickPin = controlsSection.querySelector("#maprClickPin");
    const importButton = geoSection.querySelector("#maprImportGeoJson");
    const clearButton = geoSection.querySelector("#maprClearGeoJson");
    const fileInput = geoSection.querySelector("#maprGeoJsonFile");
    const fileName = geoSection.querySelector("#maprGeoJsonName");

    function cityHasMarkers() {
      return !!selectedCities?.querySelector(".mapr-city-chip");
    }

    function forceLocalCityView() {
      if (mode.value !== "city" || !cityHasMarkers()) return;
      if (focus.value !== "local") {
        focus.value = "local";
        focus.dispatchEvent(new Event("change", { bubbles: true }));
      }
      if (focusLabel) focusLabel.hidden = false;
    }

    const cityObserver = new MutationObserver(() => {
      if (!cityHasMarkers()) return;
      mode.value = "city";
      forceLocalCityView();
      scheduleDecorate(50);
    });
    if (selectedCities) cityObserver.observe(selectedCities, { childList: true, subtree: true });

    mode.addEventListener("change", () => {
      if (mode.value === "city" && cityHasMarkers()) requestAnimationFrame(forceLocalCityView);
      extent.closest("label").hidden = mode.value !== "city";
      scheduleDecorate(50);
    });

    focus.addEventListener("change", () => scheduleDecorate(50));
    extent.addEventListener("change", () => {
      if (mode.value === "city") {
        focus.value = "local";
        focus.dispatchEvent(new Event("change", { bubbles: true }));
      }
      scheduleDecorate(20);
    });
    basemap.addEventListener("change", () => scheduleDecorate(20));
    opacity.addEventListener("input", () => scheduleDecorate(20));
    vectorOverlay.addEventListener("change", () => scheduleDecorate(20));
    refreshButton?.addEventListener("click", () => scheduleDecorate(100));

    function patchD3() {
      if (!window.d3 || window.d3.__figureloomCityZoomPatched) return;
      const originalGeoMercator = window.d3.geoMercator;
      window.d3.geoMercator = function(...args) {
        const projection = originalGeoMercator.apply(this, args);
        const originalFitExtent = projection.fitExtent;
        projection.fitExtent = function(targetExtent, object) {
          originalFitExtent.call(projection, targetExtent, object);
          const activeDrawer = document.getElementById("mapStudioReliableDrawer");
          const currentMode = activeDrawer?.querySelector("#maprMode")?.value;
          const currentFocus = activeDrawer?.querySelector("#maprFocus")?.value;
          const extentValue = activeDrawer?.querySelector("#maprCityExtent")?.value;
          if (currentMode === "city" && currentFocus === "local" && extentValue && extentValue !== "fit") {
            const km = Number(extentValue);
            const originalKm = 64;
            const multiplier = Math.max(1, Math.min(35, originalKm / Math.max(1, km)));
            projection.scale(projection.scale() * multiplier);
          }
          lastProjection = projection;
          window.__figureloomLastMapProjection = projection;
          return projection;
        };
        return projection;
      };
      window.d3.__figureloomCityZoomPatched = true;
    }

    const d3Timer = setInterval(() => {
      if (!window.d3) return;
      clearInterval(d3Timer);
      patchD3();
    }, 50);
    patchD3();

    function plotBounds() {
      const projection = lastProjection || window.__figureloomLastMapProjection;
      if (!projection || typeof projection.invert !== "function") return null;
      const southwest = projection.invert([PLOT.x, PLOT.y + PLOT.height]);
      const northeast = projection.invert([PLOT.x + PLOT.width, PLOT.y]);
      if (!southwest || !northeast) return null;
      let [west, south] = southwest;
      let [east, north] = northeast;
      if (![west, south, east, north].every(Number.isFinite)) return null;
      south = Math.max(-85, Math.min(85, south));
      north = Math.max(-85, Math.min(85, north));
      if (east < west) {
        west = -180;
        east = 180;
      }
      return { west, south, east, north };
    }

    function blobToDataUrl(blob) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error || new Error("Could not read basemap image."));
        reader.readAsDataURL(blob);
      });
    }

    async function fetchBasemapDataUrl(kind, bounds) {
      const service = BASEMAPS[kind];
      if (!service || !bounds) return null;
      const key = [kind, bounds.west.toFixed(5), bounds.south.toFixed(5), bounds.east.toFixed(5), bounds.north.toFixed(5)].join(":");
      if (imageCache.has(key)) return imageCache.get(key);
      const params = new URLSearchParams({
        bbox: `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`,
        bboxSR: "4326",
        imageSR: "3857",
        size: `${Math.round(PLOT.width)},${Math.round(PLOT.height)}`,
        format: kind === "satellite" ? "jpg" : "png32",
        transparent: "false",
        dpi: "96",
        f: "image"
      });
      const url = `https://services.arcgisonline.com/ArcGIS/rest/services/${service}/MapServer/export?${params}`;
      const promise = fetch(url, { mode: "cors", cache: "force-cache" })
        .then(response => {
          if (!response.ok) throw new Error(`Basemap returned ${response.status}.`);
          return response.blob();
        })
        .then(blobToDataUrl)
        .catch(error => {
          imageCache.delete(key);
          throw error;
        });
      imageCache.set(key, promise);
      return promise;
    }

    function removeDecoration() {
      preview.querySelectorAll("[data-figureloom-basemap],[data-figureloom-geojson]").forEach(node => node.remove());
    }

    function addGeoJsonOverlay() {
      if (!importedGeoJson || !lastProjection || !window.d3) return;
      const path = window.d3.geoPath(lastProjection);
      const features = importedGeoJson.type === "FeatureCollection"
        ? importedGeoJson.features
        : importedGeoJson.type === "Feature"
          ? [importedGeoJson]
          : [{ type: "Feature", properties: {}, geometry: importedGeoJson }];
      const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
      group.dataset.figureloomGeojson = "true";
      group.setAttribute("class", "mapr-imported-geojson");
      for (const feature of features) {
        const d = path(feature);
        if (!d) continue;
        const geometryType = feature.geometry?.type || "";
        const element = document.createElementNS("http://www.w3.org/2000/svg", "path");
        element.setAttribute("d", d);
        element.setAttribute("vector-effect", "non-scaling-stroke");
        element.setAttribute("stroke", colors.primaryDark);
        element.setAttribute("stroke-width", geometryType.includes("Line") ? "2.2" : "1.5");
        element.setAttribute("fill", geometryType.includes("Polygon") ? colors.primary : "none");
        element.setAttribute("fill-opacity", geometryType.includes("Polygon") ? "0.13" : "0");
        group.appendChild(element);
      }
      preview.appendChild(group);
    }

    let decorationPromise = null;
    async function decoratePreview() {
      if (applying) return decorationPromise;
      if (!preview.childNodes.length) return;
      const version = ++basemapVersion;
      applying = true;
      previewObserver?.disconnect();
      decorationPromise = (async () => {
        try {
          removeDecoration();
          const selected = basemap.value;
          if (selected !== "vector") {
            const bounds = plotBounds();
            if (!bounds) {
              status.textContent = `${status.textContent} · basemap waits for map projection`;
            } else {
              status.textContent = "Loading embedded basemap…";
              const dataUrl = await fetchBasemapDataUrl(selected, bounds);
              if (version !== basemapVersion || basemap.value !== selected) return;
              const image = document.createElementNS("http://www.w3.org/2000/svg", "image");
              image.dataset.figureloomBasemap = selected;
              image.setAttribute("x", String(PLOT.x));
              image.setAttribute("y", String(PLOT.y));
              image.setAttribute("width", String(PLOT.width));
              image.setAttribute("height", String(PLOT.height));
              image.setAttribute("preserveAspectRatio", "none");
              image.setAttribute("opacity", String(Number(opacity.value) / 100));
              image.setAttribute("href", dataUrl);
              const firstMapLayer = preview.querySelector(".map-land,.map-graticule");
              if (firstMapLayer) preview.insertBefore(image, firstMapLayer);
              else preview.insertBefore(image, preview.firstChild?.nextSibling || preview.firstChild);
              const landPaths = preview.querySelectorAll(".map-land path");
              landPaths.forEach(path => {
                path.setAttribute("fill", vectorOverlay.checked ? colors.white : "none");
                path.setAttribute("fill-opacity", vectorOverlay.checked ? "0.12" : "0");
              });
              const attribution = document.createElementNS("http://www.w3.org/2000/svg", "text");
              attribution.dataset.figureloomBasemap = "attribution";
              attribution.setAttribute("x", String(WIDTH - 15));
              attribution.setAttribute("y", String(HEIGHT - 24));
              attribution.setAttribute("text-anchor", "end");
              attribution.setAttribute("fill", colors.muted);
              attribution.setAttribute("font-size", "8");
              attribution.textContent = `Basemap: Esri ${BASEMAPS[selected].replaceAll("_", " ")}`;
              preview.appendChild(attribution);
              status.textContent = `Map ready · ${selected} basemap embedded · local extent ${extent.value === "fit" ? "fits markers" : `${extent.value} km`}.`;
            }
          }
          addGeoJsonOverlay();
        } catch (error) {
          console.error(error);
          status.classList.add("error");
          status.textContent = `Vector map ready, but ${basemap.value} basemap could not load: ${error.message}`;
        } finally {
          applying = false;
          previewObserver?.observe(preview, { childList: true, subtree: false });
        }
      })();
      return decorationPromise;
    }

    let decorateTimer = 0;
    function scheduleDecorate(delay = 80) {
      clearTimeout(decorateTimer);
      decorateTimer = setTimeout(decoratePreview, delay);
    }

    previewObserver = new MutationObserver(mutations => {
      if (applying) return;
      const onlyDecoration = mutations.every(mutation =>
        [...mutation.addedNodes, ...mutation.removedNodes].every(node =>
          node.nodeType !== 1 ||
          node.hasAttribute?.("data-figureloom-basemap") ||
          node.hasAttribute?.("data-figureloom-geojson")
        )
      );
      if (!onlyDecoration) scheduleDecorate(70);
    });
    previewObserver.observe(preview, { childList: true, subtree: false });

    importButton.addEventListener("click", () => fileInput.click());
    clearButton.addEventListener("click", () => {
      importedGeoJson = null;
      importedGeoJsonName = "";
      clearButton.disabled = true;
      fileName.textContent = "No GeoJSON overlay loaded.";
      scheduleDecorate(0);
    });
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        const valid = ["FeatureCollection", "Feature", "Polygon", "MultiPolygon", "LineString", "MultiLineString", "Point", "MultiPoint"].includes(data?.type);
        if (!valid) throw new Error("The file is not supported GeoJSON.");
        importedGeoJson = data;
        importedGeoJsonName = file.name;
        fileName.textContent = `${file.name} loaded · editable vector overlay`;
        clearButton.disabled = false;
        scheduleDecorate(0);
      } catch (error) {
        importedGeoJson = null;
        importedGeoJsonName = "";
        clearButton.disabled = true;
        fileName.textContent = `Could not import: ${error.message}`;
      } finally {
        fileInput.value = "";
      }
    });

    preview.addEventListener("pointerdown", event => {
      if (!clickPin.checked || mode.value === "world" || !lastProjection || typeof lastProjection.invert !== "function") return;
      const rect = preview.getBoundingClientRect();
      const x = (event.clientX - rect.left) * WIDTH / rect.width;
      const y = (event.clientY - rect.top) * HEIGHT / rect.height;
      if (x < PLOT.x || x > PLOT.x + PLOT.width || y < PLOT.y || y > PLOT.y + PLOT.height) return;
      const coordinates = lastProjection.invert([x, y]);
      if (!coordinates?.every(Number.isFinite)) return;
      customLabel.value = customLabel.value.trim() || "Map site";
      customLon.value = coordinates[0].toFixed(6);
      customLat.value = coordinates[1].toFixed(6);
      addCustom.click();
    });

    addButton.addEventListener("click", event => {
      if (basemap.value === "vector" && !importedGeoJson) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      Promise.resolve(decoratePreview()).then(() => {
        const canvasSize = window.currentCanvasSize?.() || { width: 1200, height: 750 };
        const width = Math.min(canvasSize.width * 0.78, 850);
        const height = width * HEIGHT / WIDTH;
        const title = titleInput.value.trim() || "Map";
        const item = {
          id: uid(), type: "svg", name: title,
          x: Math.max(20, (canvasSize.width - width) / 2),
          y: Math.max(20, (canvasSize.height - height) / 2),
          width, height,
          svgMarkup: preview.innerHTML,
          svgViewBox: `0 0 ${WIDTH} ${HEIGHT}`,
          svgColorMode: "original",
          fill: colors.primary, stroke: colors.text, opacity: 1, rotation: 0, visible: true,
          metadata: {
            sourcePack: basemap.value === "vector" ? "Natural Earth" : "Natural Earth + ArcGIS Online",
            sourceName: title,
            sourceUrl: basemap.value === "vector"
              ? "https://www.naturalearthdata.com/"
              : `https://services.arcgisonline.com/ArcGIS/rest/services/${BASEMAPS[basemap.value]}/MapServer`,
            license: "Review source attribution for publication",
            attribution: basemap.value === "vector"
              ? "Map layers from Natural Earth, public domain."
              : `Vector overlays: Natural Earth. Basemap: Esri ${BASEMAPS[basemap.value].replaceAll("_", " ")}.`,
            notes: `Figureloom map with ${basemap.value} basemap${importedGeoJsonName ? ` and GeoJSON overlay ${importedGeoJsonName}` : ""}.`
          }
        };
        pushHistory();
        state.objects.push(item);
        state.selectedId = item.id;
        render();
        renderPages?.();
        scheduleSave();
        drawer.classList.remove("open");
      }).catch(error => alert(`Could not add map: ${error.message}`));
    }, true);

    const style = document.createElement("style");
    style.textContent = `
      .mapr-view-section{background:${colors.panel}}
      .mapr-inline-options{display:flex;flex-wrap:wrap;gap:12px}
      .mapr-inline-options label{display:flex;align-items:center;gap:6px;color:#596579;font-size:10px}
      .mapr-geo-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      .mapr-geo-actions button{border:1px solid ${colors.line};border-radius:8px;background:${colors.white};color:${colors.text};padding:8px 11px}
      .mapr-geo-actions button:hover{background:${colors.surface}}
      .mapr-geo-actions button:disabled{opacity:.5}
      #maprBasemapOpacity{padding:0;accent-color:${colors.primary}}
      @media(max-width:680px){.mapr-geo-actions{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);

    extent.closest("label").hidden = mode.value !== "city";
    if (mode.value === "city" && cityHasMarkers()) forceLocalCityView();
    scheduleDecorate(100);
  }

  waitForDrawer();
})();
