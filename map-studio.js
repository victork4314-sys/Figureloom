(() => {
  if (typeof createDrawer !== 'function') return;

  const MAP_WIDTH = 800;
  const MAP_HEIGHT = 500;
  const WORLD_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
  const D3_URL = 'https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js';
  const TOPOJSON_URL = 'https://cdn.jsdelivr.net/npm/topojson-client@3/dist/topojson-client.min.js';
  let worldTopology = null;
  let worldFeatures = [];
  let importedGeoJson = null;
  let pinPoint = null;
  let lastProjection = null;
  let lastMapMarkup = '';
  let loadingPromise = null;

  const STYLES = {
    scientific:{ land:'#dce8f6', border:'#49627e', highlight:'#4f7fe5', water:'#f7fbff', text:'#24364b' },
    monochrome:{ land:'#e7e7e7', border:'#3f4852', highlight:'#737f8c', water:'#ffffff', text:'#222831' },
    ocean:{ land:'#d8e9d2', border:'#385d55', highlight:'#ef9d57', water:'#dff3fb', text:'#244552' },
    dark:{ land:'#354256', border:'#d2dfef', highlight:'#73b7ff', water:'#182231', text:'#eef6ff' },
    poster:{ land:'#f4e8cb', border:'#5a4432', highlight:'#d65353', water:'#f8fbff', text:'#3f3025' }
  };

  function loadScript(url, globalName) {
    if (window[globalName]) return Promise.resolve(window[globalName]);
    return new Promise((resolve, reject) => {
      const existing = [...document.scripts].find(script => script.src === url);
      if (existing) {
        existing.addEventListener('load', () => resolve(window[globalName]), { once:true });
        existing.addEventListener('error', reject, { once:true });
        return;
      }
      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.addEventListener('load', () => resolve(window[globalName]), { once:true });
      script.addEventListener('error', () => reject(new Error(`Could not load ${globalName}.`)), { once:true });
      document.head.appendChild(script);
    });
  }

  async function ensureMapData() {
    if (worldTopology && window.d3 && window.topojson) return;
    if (loadingPromise) return loadingPromise;
    loadingPromise = (async () => {
      await Promise.all([loadScript(D3_URL, 'd3'), loadScript(TOPOJSON_URL, 'topojson')]);
      const response = await fetch(WORLD_URL, { cache:'force-cache' });
      if (!response.ok) throw new Error(`World map data could not be loaded (${response.status}).`);
      worldTopology = await response.json();
      const collection = window.topojson.feature(worldTopology, worldTopology.objects.countries);
      worldFeatures = collection.features
        .filter(feature => feature?.properties?.name)
        .sort((a, b) => a.properties.name.localeCompare(b.properties.name));
    })().finally(() => { loadingPromise = null; });
    return loadingPromise;
  }

  const drawer = createDrawer('mapStudioDrawer', 'Map Studio', 'Editable world, country, locator, and GeoJSON maps');
  drawer.classList.add('map-studio-drawer');
  drawer.querySelector('.utility-body').innerHTML = `
    <div class="map-control-grid">
      <label>Map type
        <select id="mapMode">
          <option value="world">World political map</option>
          <option value="country">Country silhouette</option>
          <option value="highlight">Highlight country on world map</option>
          <option value="locator">City / site locator map</option>
          <option value="geojson">City, region, route, or study area · GeoJSON</option>
        </select>
      </label>
      <label>Visual style
        <select id="mapStyle">
          <option value="scientific">Scientific blue</option>
          <option value="monochrome">Monochrome</option>
          <option value="ocean">Ocean and land</option>
          <option value="dark">Dark map</option>
          <option value="poster">Warm poster</option>
        </select>
      </label>
    </div>
    <label class="map-full-field" id="mapCountryField">Country
      <select id="mapCountry"><option>Loading countries…</option></select>
    </label>
    <div id="mapLocatorFields" class="map-locator-fields">
      <label>City / site label <input id="mapCityLabel" type="text" placeholder="Stavanger, sampling site, hospital…"></label>
      <div class="map-control-grid">
        <label>Latitude · optional <input id="mapLatitude" type="number" min="-90" max="90" step="0.0001" placeholder="58.97"></label>
        <label>Longitude · optional <input id="mapLongitude" type="number" min="-180" max="180" step="0.0001" placeholder="5.73"></label>
      </div>
      <p class="tool-note">Enter coordinates for an exact pin, or tap the preview to place it visually. No geocoding account or API key is required.</p>
    </div>
    <div id="mapGeoJsonFields" class="map-geojson-fields">
      <button id="importGeoJson" class="utility-action primary" type="button">Import GeoJSON map</button>
      <input id="mapGeoJsonFile" type="file" accept="application/geo+json,application/json,.geojson,.json" hidden>
      <p id="mapGeoJsonName" class="tool-note">Import actual city streets, districts, routes, coastlines, watersheds, or study boundaries exported from GIS or OpenStreetMap-compatible tools.</p>
    </div>
    <div class="map-options">
      <label><input id="mapGraticule" type="checkbox" checked> Graticule on world maps</label>
      <label><input id="mapNorthArrow" type="checkbox" checked> North arrow</label>
      <label><input id="mapTitleToggle" type="checkbox" checked> Include title</label>
    </div>
    <label class="map-full-field">Map title <input id="mapTitle" type="text" placeholder="Study area"></label>
    <div class="map-preview-wrap">
      <svg id="mapPreview" viewBox="0 0 800 500" role="img" aria-label="Map preview"></svg>
      <span class="map-preview-hint">Tap preview to place locator pin</span>
    </div>
    <div class="map-actions">
      <button id="refreshMapPreview" type="button">Refresh preview</button>
      <button id="addMapToCanvas" class="primary" type="button">Add editable map</button>
    </div>
    <p id="mapStatus" class="tool-note">Loading Natural Earth country boundaries…</p>
  `;

  const mode = drawer.querySelector('#mapMode');
  const styleSelect = drawer.querySelector('#mapStyle');
  const countrySelect = drawer.querySelector('#mapCountry');
  const countryField = drawer.querySelector('#mapCountryField');
  const locatorFields = drawer.querySelector('#mapLocatorFields');
  const geoJsonFields = drawer.querySelector('#mapGeoJsonFields');
  const cityLabel = drawer.querySelector('#mapCityLabel');
  const latitude = drawer.querySelector('#mapLatitude');
  const longitude = drawer.querySelector('#mapLongitude');
  const titleInput = drawer.querySelector('#mapTitle');
  const preview = drawer.querySelector('#mapPreview');
  const status = drawer.querySelector('#mapStatus');
  const graticuleToggle = drawer.querySelector('#mapGraticule');
  const northArrowToggle = drawer.querySelector('#mapNorthArrow');
  const titleToggle = drawer.querySelector('#mapTitleToggle');

  function svgNode(tag, attributes = {}) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, String(value)));
    return node;
  }

  function selectedCountryFeature() {
    return worldFeatures.find(feature => feature.properties.name === countrySelect.value) || worldFeatures[0] || null;
  }

  function selectedFeatureCollection() {
    const selected = selectedCountryFeature();
    if (mode.value === 'geojson') return importedGeoJson;
    if (mode.value === 'country' || mode.value === 'locator') return selected;
    return { type:'FeatureCollection', features:worldFeatures };
  }

  function mapProjection(feature) {
    const projection = mode.value === 'world' || mode.value === 'highlight'
      ? window.d3.geoNaturalEarth1()
      : window.d3.geoMercator();
    projection.fitExtent([[28, 48], [MAP_WIDTH - 28, MAP_HEIGHT - 42]], feature);
    return projection;
  }

  function titleForMap() {
    if (titleInput.value.trim()) return titleInput.value.trim();
    if (mode.value === 'world') return 'World map';
    if (mode.value === 'highlight') return `${countrySelect.value} in the world`;
    if (mode.value === 'locator') return cityLabel.value.trim() || `${countrySelect.value} locator`;
    if (mode.value === 'geojson') return 'Study area';
    return countrySelect.value || 'Country map';
  }

  function appendNorthArrow(root, colors) {
    const group = svgNode('g', { transform:'translate(744 74)' });
    group.append(svgNode('path', { d:'M0 30 L14 -8 L28 30 L14 22Z', fill:colors.highlight, stroke:colors.border, 'stroke-width':2 }));
    const text = svgNode('text', { x:14, y:-14, 'text-anchor':'middle', fill:colors.text, 'font-size':16, 'font-weight':700 });
    text.textContent = 'N';
    group.append(text);
    root.append(group);
  }

  function appendLocatorPin(root, projection, colors) {
    if (mode.value !== 'locator') return;
    let point = null;
    const lat = Number(latitude.value);
    const lon = Number(longitude.value);
    if (Number.isFinite(lat) && Number.isFinite(lon) && latitude.value !== '' && longitude.value !== '') point = projection([lon, lat]);
    if (!point && pinPoint) point = [pinPoint.x, pinPoint.y];
    if (!point) return;
    const [x, y] = point;
    const group = svgNode('g', { transform:`translate(${x} ${y})` });
    group.append(svgNode('path', { d:'M0 14 C-16 -4 -17 -24 0 -31 C17 -24 16 -4 0 14Z', fill:colors.highlight, stroke:colors.border, 'stroke-width':2 }));
    group.append(svgNode('circle', { cx:0, cy:-16, r:5, fill:'#ffffff' }));
    const label = cityLabel.value.trim();
    if (label) {
      const boxWidth = Math.max(88, Math.min(250, label.length * 8 + 22));
      group.append(svgNode('rect', { x:12, y:-34, width:boxWidth, height:27, rx:7, fill:'#ffffff', stroke:colors.border, 'stroke-width':1.5, opacity:.96 }));
      const text = svgNode('text', { x:23, y:-16, fill:colors.text, 'font-size':14, 'font-weight':650 });
      text.textContent = label;
      group.append(text);
    }
    root.append(group);
  }

  function featurePaths(root, feature, projection, colors) {
    const path = window.d3.geoPath(projection);
    const selected = selectedCountryFeature();
    const features = feature.type === 'FeatureCollection' ? feature.features : [feature];
    features.forEach(item => {
      const selectedOnWorld = mode.value === 'highlight' && selected && item.properties?.name === selected.properties.name;
      const element = svgNode('path', {
        d:path(item) || '',
        fill:selectedOnWorld ? colors.highlight : colors.land,
        stroke:colors.border,
        'stroke-width':selectedOnWorld ? 1.8 : .8,
        'vector-effect':'non-scaling-stroke',
        'data-country':item.properties?.name || ''
      });
      root.append(element);
    });
  }

  function createMapSvg() {
    const feature = selectedFeatureCollection();
    if (!feature) throw new Error(mode.value === 'geojson' ? 'Import a GeoJSON file first.' : 'Country map data is not ready.');
    const colors = STYLES[styleSelect.value] || STYLES.scientific;
    const root = svgNode('svg', { xmlns:'http://www.w3.org/2000/svg', viewBox:`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}` });
    root.append(svgNode('rect', { width:MAP_WIDTH, height:MAP_HEIGHT, rx:14, fill:colors.water }));
    const projection = mapProjection(feature);
    lastProjection = projection;

    if (graticuleToggle.checked && (mode.value === 'world' || mode.value === 'highlight')) {
      const graticule = window.d3.geoPath(projection)(window.d3.geoGraticule10());
      root.append(svgNode('path', { d:graticule || '', fill:'none', stroke:colors.border, 'stroke-width':.45, opacity:.25, 'vector-effect':'non-scaling-stroke' }));
    }

    featurePaths(root, feature, projection, colors);
    appendLocatorPin(root, projection, colors);
    if (northArrowToggle.checked && mode.value !== 'world') appendNorthArrow(root, colors);

    if (titleToggle.checked) {
      const title = svgNode('text', { x:28, y:30, fill:colors.text, 'font-size':22, 'font-weight':750 });
      title.textContent = titleForMap();
      root.append(title);
    }

    const source = svgNode('text', { x:MAP_WIDTH - 16, y:MAP_HEIGHT - 13, 'text-anchor':'end', fill:colors.text, 'font-size':10, opacity:.72 });
    source.textContent = mode.value === 'geojson' ? 'User-supplied GeoJSON · verify source licence' : 'Natural Earth · public domain';
    root.append(source);
    return root;
  }

  function updateModeVisibility() {
    const needsCountry = ['country','highlight','locator'].includes(mode.value);
    countryField.hidden = !needsCountry;
    locatorFields.hidden = mode.value !== 'locator';
    geoJsonFields.hidden = mode.value !== 'geojson';
    drawer.querySelector('.map-preview-hint').hidden = mode.value !== 'locator';
    graticuleToggle.closest('label').hidden = !['world','highlight'].includes(mode.value);
  }

  async function updatePreview() {
    status.classList.remove('error');
    status.textContent = 'Rendering editable vector map…';
    try {
      await ensureMapData();
      if (!countrySelect.options.length || countrySelect.options[0]?.value === '') populateCountries();
      const root = createMapSvg();
      preview.replaceChildren(...[...root.childNodes].map(node => document.importNode(node, true)));
      lastMapMarkup = root.innerHTML;
      status.textContent = mode.value === 'geojson'
        ? 'GeoJSON rendered as an editable vector map.'
        : 'Natural Earth map ready · editable, recolorable, resizable, and exportable.';
    } catch (error) {
      console.error(error);
      status.classList.add('error');
      status.textContent = error.message;
    }
  }

  function populateCountries() {
    const previous = countrySelect.value;
    countrySelect.replaceChildren(...worldFeatures.map(feature => new Option(feature.properties.name, feature.properties.name)));
    const preferred = worldFeatures.some(feature => feature.properties.name === previous) ? previous
      : worldFeatures.some(feature => feature.properties.name === 'Norway') ? 'Norway'
      : worldFeatures[0]?.properties?.name;
    if (preferred) countrySelect.value = preferred;
  }

  async function addMap() {
    await ensureMapData();
    if (!lastMapMarkup) await updatePreview();
    if (!lastMapMarkup) return;
    const dimensions = window.currentCanvasSize?.() || { width:1200, height:750 };
    const width = Math.min(dimensions.width * .72, 760);
    const height = width * MAP_HEIGHT / MAP_WIDTH;
    const item = {
      id:uid(), type:'svg', name:titleForMap(),
      x:Math.max(20, (dimensions.width - width) / 2),
      y:Math.max(20, (dimensions.height - height) / 2),
      width, height,
      svgMarkup:lastMapMarkup, svgViewBox:`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`, svgColorMode:'original',
      fill:'#7c8cf5', stroke:'#26324a', opacity:1, rotation:0, visible:true,
      metadata: mode.value === 'geojson' ? {
        sourcePack:'User GeoJSON map', sourceName:titleForMap(), license:'Not specified',
        notes:'Rendered from a user-supplied GeoJSON file. Verify the original data licence and attribution requirements.'
      } : {
        sourcePack:'Natural Earth', sourceName:titleForMap(), sourceUrl:'https://www.naturalearthdata.com/',
        license:'Public domain', attribution:'Map boundaries from Natural Earth, public domain.',
        notes:'Generated by SciCanvas Map Studio from Natural Earth country boundaries.'
      }
    };
    pushHistory();
    state.objects.push(item);
    state.selectedId = item.id;
    window.styleNewObjectFromTheme?.(item);
    item.svgColorMode = 'original';
    render();
    renderPages?.();
    scheduleSave();
    drawer.classList.remove('open');
  }

  preview.addEventListener('pointerdown', event => {
    if (mode.value !== 'locator') return;
    const rect = preview.getBoundingClientRect();
    pinPoint = {
      x:(event.clientX - rect.left) * MAP_WIDTH / rect.width,
      y:(event.clientY - rect.top) * MAP_HEIGHT / rect.height
    };
    latitude.value = '';
    longitude.value = '';
    updatePreview();
  });

  drawer.querySelector('#importGeoJson').addEventListener('click', () => drawer.querySelector('#mapGeoJsonFile').click());
  drawer.querySelector('#mapGeoJsonFile').addEventListener('change', async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!['Feature','FeatureCollection'].includes(data?.type)) throw new Error('The file must contain a GeoJSON Feature or FeatureCollection.');
      importedGeoJson = data;
      drawer.querySelector('#mapGeoJsonName').textContent = `${file.name} loaded · ${data.type}.`;
      mode.value = 'geojson';
      updateModeVisibility();
      await updatePreview();
    } catch (error) {
      alert(`Could not import GeoJSON: ${error.message}`);
    }
  });

  [mode, styleSelect, countrySelect, graticuleToggle, northArrowToggle, titleToggle].forEach(control => control.addEventListener('change', () => {
    if (control === mode) {
      pinPoint = null;
      updateModeVisibility();
    }
    updatePreview();
  }));
  [cityLabel, latitude, longitude, titleInput].forEach(control => control.addEventListener('change', updatePreview));
  drawer.querySelector('#refreshMapPreview').addEventListener('click', updatePreview);
  drawer.querySelector('#addMapToCanvas').addEventListener('click', () => addMap().catch(error => alert(`Could not add map: ${error.message}`)));

  function openMapStudio() {
    drawer.classList.add('open');
    updateModeVisibility();
    ensureMapData().then(() => {
      populateCountries();
      updatePreview();
    }).catch(error => {
      status.classList.add('error');
      status.textContent = error.message;
    });
  }
  window.openMapStudio = openMapStudio;

  function addInsertButton() {
    const grid = document.getElementById('insertFileGrid') || document.getElementById('insertScienceGrid');
    if (!grid || document.getElementById('insertMapStudio')) return false;
    const button = document.createElement('button');
    button.id = 'insertMapStudio';
    button.type = 'button';
    button.className = 'insert-action';
    button.innerHTML = '<strong>Maps</strong><small>World, country, city locator, and GeoJSON maps</small>';
    button.addEventListener('click', () => {
      document.getElementById('insertDrawer')?.classList.remove('open');
      openMapStudio();
    });
    grid.appendChild(button);
    return true;
  }
  if (!addInsertButton()) new MutationObserver((_, observer) => { if (addInsertButton()) observer.disconnect(); }).observe(document.body, { childList:true, subtree:true });

  const style = document.createElement('style');
  style.textContent = `
    #mapStudioDrawer{width:min(720px,calc(100vw - 20px))}.map-control-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:9px}.map-control-grid label,.map-full-field,.map-locator-fields>label{display:grid;gap:5px;color:#647187;font-size:10px}.map-control-grid select,.map-control-grid input,.map-full-field select,.map-full-field input,.map-locator-fields input{width:100%;min-width:0;min-height:36px;border:1px solid #cbd5e1;border-radius:8px;background:white;padding:7px}.map-locator-fields,.map-geojson-fields{margin:9px 0;padding:9px;border:1px solid #dbe3ed;border-radius:9px;background:#f8fafc}.map-options{display:flex;flex-wrap:wrap;gap:7px 13px;margin:10px 0;color:#657286;font-size:10px}.map-options label{display:flex;align-items:center;gap:6px}.map-preview-wrap{position:relative;margin-top:10px;border:1px solid #cbd5e1;border-radius:10px;overflow:hidden;background:#eef3f8}.map-preview-wrap svg{display:block;width:100%;height:auto;min-height:260px;max-height:430px;cursor:crosshair}.map-preview-hint{position:absolute;left:10px;bottom:9px;padding:5px 7px;border-radius:6px;background:rgba(255,255,255,.9);color:#52627a;font-size:9px;pointer-events:none}.map-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:9px}.map-actions button{min-height:39px;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc;padding:8px;white-space:normal}.map-actions button.primary{background:#2563eb;border-color:#2563eb;color:white}
    @media(max-width:560px){.map-control-grid,.map-actions{grid-template-columns:1fr}.map-preview-wrap svg{min-height:210px}.map-options{display:grid;grid-template-columns:1fr 1fr}}
  `;
  document.head.appendChild(style);

  updateModeVisibility();
  ensureMapData().then(() => {
    populateCountries();
    updatePreview();
  }).catch(error => { status.textContent = `Map data loads when Map Studio is opened: ${error.message}`; });
})();