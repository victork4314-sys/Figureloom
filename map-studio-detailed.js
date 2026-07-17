(() => {
  if (typeof createDrawer !== 'function') return;

  const W = 900;
  const H = 560;
  const RAW = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson';
  const D3_URL = 'https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js';
  const cache = new Map();
  const selectedCities = [];
  let currentMarkup = '';
  let citySearchTimer = 0;

  const PALETTE = {
    water:'#f4f7fb', land:'#eef4ff', border:'#4b5563', primary:'#2563eb',
    primaryDark:'#1d4ed8', text:'#253044', muted:'#6b7280', line:'#cfd7e3', white:'#ffffff'
  };

  const FILES = {
    countries: detail => `ne_${detail}_admin_0_countries.geojson`,
    states: () => 'ne_10m_admin_1_states_provinces.geojson',
    lakes: detail => `ne_${detail}_lakes.geojson`,
    rivers: detail => `ne_${detail}_rivers_lake_centerlines.geojson`,
    marine: detail => `ne_${detail}_geography_marine_polys.geojson`,
    cities: () => 'ne_10m_populated_places.geojson'
  };

  function loadScript(url, globalName) {
    if (window[globalName]) return Promise.resolve(window[globalName]);
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.onload = () => resolve(window[globalName]);
      script.onerror = () => reject(new Error(`Could not load ${globalName}.`));
      document.head.appendChild(script);
    });
  }

  async function getData(key, detail = '110m') {
    const file = FILES[key](detail);
    const cacheKey = `${key}:${file}`;
    if (cache.has(cacheKey)) return cache.get(cacheKey);
    const promise = fetch(`${RAW}/${file}`, { cache:'force-cache' }).then(async response => {
      if (!response.ok) throw new Error(`${key} data could not be loaded (${response.status}).`);
      return response.json();
    }).catch(error => {
      cache.delete(cacheKey);
      throw error;
    });
    cache.set(cacheKey, promise);
    return promise;
  }

  const drawer = createDrawer('mapStudioDetailedDrawer', 'Map Studio', 'Detailed editable maps with cities, water, and administrative layers');
  drawer.classList.add('map-studio-detailed');
  drawer.querySelector('.utility-body').innerHTML = `
    <div class="map-intro"><strong>Build the map from layers</strong><span>Choose the area, then turn cities, states, lakes, rivers, seas, labels, and map furniture on or off.</span></div>
    <div class="mapd-grid mapd-grid-3">
      <label>View<select id="mapdMode"><option value="world">World</option><option value="country" selected>Country / region</option><option value="city">City / local area</option></select></label>
      <label>Detail<select id="mapdDetail"><option value="110m">Fast overview</option><option value="50m" selected>Detailed</option><option value="10m">Ultra detailed</option></select></label>
      <label>Country<select id="mapdCountry"><option>Loading…</option></select></label>
    </div>
    <section class="mapd-section">
      <div class="mapd-heading"><strong>Cities and sites</strong><span>Search Natural Earth places and add as many markers as needed.</span></div>
      <div class="mapd-city-search"><input id="mapdCitySearch" type="search" placeholder="Search Stavanger, Oslo, Tokyo…"><button id="mapdFindCity" type="button">Find</button></div>
      <div id="mapdCityResults" class="mapd-city-results"></div>
      <div id="mapdSelectedCities" class="mapd-city-chips"><span class="mapd-empty">No city markers yet.</span></div>
    </section>
    <section class="mapd-section">
      <div class="mapd-heading"><strong>Map layers</strong><span>Every layer remains vector artwork in the finished map.</span></div>
      <div class="mapd-layers">
        <label><input id="mapdBorders" type="checkbox" checked> Country borders</label>
        <label><input id="mapdStates" type="checkbox"> States / provinces</label>
        <label><input id="mapdLakes" type="checkbox" checked> Lakes</label>
        <label><input id="mapdRivers" type="checkbox"> Rivers</label>
        <label><input id="mapdMarine" type="checkbox" checked> Oceans / seas</label>
        <label><input id="mapdCityLabels" type="checkbox" checked> City labels</label>
        <label><input id="mapdGraticule" type="checkbox"> Latitude / longitude grid</label>
        <label><input id="mapdNorth" type="checkbox" checked> North arrow</label>
        <label><input id="mapdScale" type="checkbox" checked> Scale bar</label>
        <label><input id="mapdTitleToggle" type="checkbox" checked> Title</label>
      </div>
    </section>
    <div class="mapd-grid">
      <label>Title<input id="mapdTitle" type="text" placeholder="Study area"></label>
      <label>City focus<select id="mapdFocus"><option value="country">Show country context</option><option value="local">Zoom around selected cities</option></select></label>
    </div>
    <div class="mapd-preview-wrap"><svg id="mapdPreview" viewBox="0 0 900 560" role="img" aria-label="Detailed map preview"></svg><span id="mapdHint">Changes update automatically</span></div>
    <div class="mapd-actions"><button id="mapdRefresh" type="button">Refresh preview</button><button id="mapdAdd" class="primary" type="button">Add editable map</button></div>
    <p id="mapdStatus" class="tool-note">Loading Natural Earth map data…</p>
  `;

  const q = selector => drawer.querySelector(selector);
  const controls = {
    mode:q('#mapdMode'), detail:q('#mapdDetail'), country:q('#mapdCountry'), citySearch:q('#mapdCitySearch'),
    results:q('#mapdCityResults'), selected:q('#mapdSelectedCities'), borders:q('#mapdBorders'), states:q('#mapdStates'),
    lakes:q('#mapdLakes'), rivers:q('#mapdRivers'), marine:q('#mapdMarine'), cityLabels:q('#mapdCityLabels'),
    graticule:q('#mapdGraticule'), north:q('#mapdNorth'), scale:q('#mapdScale'), titleToggle:q('#mapdTitleToggle'),
    title:q('#mapdTitle'), focus:q('#mapdFocus'), preview:q('#mapdPreview'), status:q('#mapdStatus')
  };

  function node(tag, attrs = {}, text = '') {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, String(value)));
    if (text) el.textContent = text;
    return el;
  }

  function countryName(feature) {
    const p = feature?.properties || {};
    return p.NAME || p.ADMIN || p.SOVEREIGNT || p.NAME_EN || '';
  }

  function countryCode(feature) {
    const p = feature?.properties || {};
    return p.ADM0_A3 || p.SOV_A3 || p.ISO_A3 || '';
  }

  function cityInfo(feature) {
    const p = feature.properties || {};
    const coordinates = feature.geometry?.coordinates || [Number(p.LONGITUDE), Number(p.LATITUDE)];
    return {
      id:String(p.NE_ID || p.WIKIDATAID || `${coordinates[0]}:${coordinates[1]}:${p.NAME || ''}`),
      name:p.NAME || p.NAMEPAR || p.NAMEASCII || 'Unnamed place',
      country:p.ADM0NAME || p.SOV0NAME || '',
      admin:p.ADM1NAME || '',
      population:Number(p.POP_MAX || p.POP_MIN || 0),
      coordinates
    };
  }

  function featureCollection(features) {
    return { type:'FeatureCollection', features };
  }

  async function populateCountries() {
    const data = await getData('countries', controls.detail.value);
    const previous = controls.country.value;
    const features = [...data.features].sort((a,b) => countryName(a).localeCompare(countryName(b)));
    controls.country.replaceChildren(...features.map(feature => new Option(countryName(feature), countryCode(feature) || countryName(feature))));
    const norway = features.find(feature => countryName(feature) === 'Norway');
    const preferred = features.find(feature => (countryCode(feature) || countryName(feature)) === previous) || norway || features[0];
    if (preferred) controls.country.value = countryCode(preferred) || countryName(preferred);
  }

  async function selectedCountry() {
    const data = await getData('countries', controls.detail.value);
    return data.features.find(feature => (countryCode(feature) || countryName(feature)) === controls.country.value) || data.features[0];
  }

  function boundsPolygon(bounds, padding = 0) {
    const [[x0,y0],[x1,y1]] = bounds;
    return { type:'Polygon', coordinates:[[
      [x0-padding,y0-padding],[x1+padding,y0-padding],[x1+padding,y1+padding],[x0-padding,y1+padding],[x0-padding,y0-padding]
    ]] };
  }

  async function focusGeometry(countries, selected) {
    if (controls.mode.value === 'world') return countries;
    if (controls.mode.value === 'city' && controls.focus.value === 'local' && selectedCities.length) {
      const lons = selectedCities.map(city => city.coordinates[0]);
      const lats = selectedCities.map(city => city.coordinates[1]);
      const span = Math.max(Math.max(...lons)-Math.min(...lons), Math.max(...lats)-Math.min(...lats), 0.8);
      const pad = Math.max(0.4, span * .7);
      return boundsPolygon([[Math.min(...lons),Math.min(...lats)],[Math.max(...lons),Math.max(...lats)]], pad);
    }
    return selected;
  }

  function intersects(feature, bounds) {
    try {
      const b = window.d3.geoBounds(feature);
      return !(b[1][0] < bounds[0][0] || b[0][0] > bounds[1][0] || b[1][1] < bounds[0][1] || b[0][1] > bounds[1][1]);
    } catch { return true; }
  }

  function addPathGroup(root, features, projection, attrs, className) {
    const path = window.d3.geoPath(projection);
    const group = node('g', { class:className });
    features.forEach(feature => {
      const d = path(feature);
      if (d) group.append(node('path', { d, ...attrs, 'vector-effect':'non-scaling-stroke' }));
    });
    root.append(group);
  }

  function addScaleBar(root, projection) {
    if (!controls.scale.checked || controls.mode.value === 'world') return;
    const center = projection.invert([W/2,H/2]) || [0,0];
    const kmPerDegree = 111.32 * Math.cos(center[1] * Math.PI / 180);
    const p1 = projection(center);
    const p2 = projection([center[0]+1,center[1]]);
    const pixelsPerKm = Math.abs(p2[0]-p1[0]) / Math.max(1,kmPerDegree);
    const choices = [10,20,50,100,200,500,1000];
    const km = choices.reduce((best,value) => Math.abs(value*pixelsPerKm-120) < Math.abs(best*pixelsPerKm-120) ? value : best, choices[0]);
    const px = Math.max(35,Math.min(180,km*pixelsPerKm));
    const g = node('g',{transform:`translate(34 ${H-36})`});
    g.append(node('line',{x1:0,y1:0,x2:px,y2:0,stroke:PALETTE.text,'stroke-width':4}));
    g.append(node('line',{x1:0,y1:-5,x2:0,y2:5,stroke:PALETTE.text,'stroke-width':2}));
    g.append(node('line',{x1:px,y1:-5,x2:px,y2:5,stroke:PALETTE.text,'stroke-width':2}));
    g.append(node('text',{x:px/2,y:-9,'text-anchor':'middle',fill:PALETTE.text,'font-size':12},`${km} km`));
    root.append(g);
  }

  function addNorthArrow(root) {
    if (!controls.north.checked || controls.mode.value === 'world') return;
    const g = node('g',{transform:`translate(${W-64} 72)`});
    g.append(node('path',{d:'M0 30 L14 -10 L28 30 L14 21Z',fill:PALETTE.primary,stroke:PALETTE.text,'stroke-width':2}));
    g.append(node('text',{x:14,y:-18,'text-anchor':'middle',fill:PALETTE.text,'font-size':16,'font-weight':700},'N'));
    root.append(g);
  }

  function addCityMarkers(root, projection) {
    const group = node('g',{class:'map-city-markers'});
    selectedCities.forEach(city => {
      const point = projection(city.coordinates);
      if (!point) return;
      const [x,y] = point;
      group.append(node('circle',{cx:x,cy:y,r:6,fill:PALETTE.primary,stroke:PALETTE.white,'stroke-width':2}));
      group.append(node('circle',{cx:x,cy:y,r:9,fill:'none',stroke:PALETTE.primary,'stroke-width':1,opacity:.6}));
      if (controls.cityLabels.checked) {
        const label = `${city.name}${city.admin ? `, ${city.admin}` : ''}`;
        const width = Math.max(60,Math.min(210,label.length*6.4+16));
        group.append(node('rect',{x:x+9,y:y-20,width,height:24,rx:6,fill:PALETTE.white,stroke:PALETTE.line,'stroke-width':1,opacity:.96}));
        group.append(node('text',{x:x+17,y:y-4,fill:PALETTE.text,'font-size':11,'font-weight':650},label));
      }
    });
    root.append(group);
  }

  async function buildMap() {
    await loadScript(D3_URL,'d3');
    const detail = controls.detail.value;
    const countries = await getData('countries',detail);
    const selected = await selectedCountry();
    const focus = await focusGeometry(countries,selected);
    const projection = controls.mode.value === 'world' ? window.d3.geoNaturalEarth1() : window.d3.geoMercator();
    projection.fitExtent([[28,44],[W-28,H-34]],focus);
    const root = node('svg',{xmlns:'http://www.w3.org/2000/svg',viewBox:`0 0 ${W} ${H}`});
    root.append(node('rect',{width:W,height:H,rx:12,fill:PALETTE.water}));

    if (controls.graticule.checked) {
      const d = window.d3.geoPath(projection)(window.d3.geoGraticule10());
      root.append(node('path',{d:d||'',fill:'none',stroke:PALETTE.line,'stroke-width':.55,opacity:.8,'vector-effect':'non-scaling-stroke'}));
    }

    const visibleBounds = window.d3.geoBounds(focus);
    const countryFeatures = controls.mode.value === 'world' ? countries.features : [selected];
    addPathGroup(root,countryFeatures,projection,{fill:PALETTE.land,stroke:controls.borders.checked?PALETTE.border:'none','stroke-width':controls.mode.value==='world'?.7:1.1},'map-land');

    if (controls.states.checked && controls.mode.value !== 'world') {
      const states = await getData('states','10m');
      const code = countryCode(selected);
      const name = countryName(selected);
      const features = states.features.filter(feature => {
        const p = feature.properties || {};
        return p.adm0_a3 === code || p.ADM0_A3 === code || p.admin === name || p.ADMIN === name || intersects(feature,visibleBounds);
      }).filter(feature => intersects(feature,visibleBounds));
      addPathGroup(root,features,projection,{fill:'none',stroke:PALETTE.border,'stroke-width':.55,opacity:.75},'map-states');
    }

    if (controls.lakes.checked) {
      const lakes = await getData('lakes',detail);
      addPathGroup(root,lakes.features.filter(feature=>intersects(feature,visibleBounds)),projection,{fill:PALETTE.white,stroke:PALETTE.line,'stroke-width':.55},'map-lakes');
    }

    if (controls.rivers.checked) {
      const rivers = await getData('rivers',detail);
      addPathGroup(root,rivers.features.filter(feature=>intersects(feature,visibleBounds)),projection,{fill:'none',stroke:PALETTE.primary,'stroke-width':.65,opacity:.72},'map-rivers');
    }

    if (controls.marine.checked) {
      const marine = await getData('marine',detail);
      const labels = node('g',{class:'map-marine-labels'});
      marine.features.filter(feature=>intersects(feature,visibleBounds)).forEach(feature => {
        const p = feature.properties || {};
        const label = p.name || p.NAME || p.name_en || p.NAME_EN;
        if (!label) return;
        const centroid = projection(window.d3.geoCentroid(feature));
        if (!centroid) return;
        labels.append(node('text',{x:centroid[0],y:centroid[1],'text-anchor':'middle',fill:PALETTE.muted,'font-size':10,'font-style':'italic',opacity:.8},label));
      });
      root.append(labels);
    }

    addCityMarkers(root,projection);
    addNorthArrow(root);
    addScaleBar(root,projection);

    if (controls.titleToggle.checked) {
      const title = controls.title.value.trim() || (controls.mode.value==='world'?'World map':controls.mode.value==='city'&&selectedCities.length?selectedCities.map(city=>city.name).join(' · '):countryName(selected));
      root.append(node('text',{x:28,y:29,fill:PALETTE.text,'font-size':22,'font-weight':750},title));
    }
    root.append(node('text',{x:W-15,y:H-12,'text-anchor':'end',fill:PALETTE.muted,'font-size':9},'Natural Earth · public domain'));
    return root;
  }

  async function updatePreview() {
    controls.status.classList.remove('error');
    controls.status.textContent = 'Loading selected map layers…';
    try {
      const root = await buildMap();
      controls.preview.replaceChildren(...[...root.childNodes].map(child=>document.importNode(child,true)));
      currentMarkup = root.innerHTML;
      controls.status.textContent = `Map ready · ${controls.detail.options[controls.detail.selectedIndex].text} · ${selectedCities.length} city marker${selectedCities.length===1?'':'s'}.`;
    } catch (error) {
      console.error(error);
      controls.status.classList.add('error');
      controls.status.textContent = error.message;
    }
  }

  function renderSelectedCities() {
    controls.selected.replaceChildren();
    if (!selectedCities.length) {
      const empty = document.createElement('span'); empty.className='mapd-empty'; empty.textContent='No city markers yet.'; controls.selected.appendChild(empty); return;
    }
    selectedCities.forEach(city => {
      const chip = document.createElement('button'); chip.type='button'; chip.className='mapd-city-chip'; chip.textContent=`${city.name}${city.country?`, ${city.country}`:''} ×`;
      chip.title='Remove city marker';
      chip.onclick=()=>{selectedCities.splice(selectedCities.findIndex(item=>item.id===city.id),1);renderSelectedCities();updatePreview();};
      controls.selected.appendChild(chip);
    });
  }

  async function findCities() {
    const query = controls.citySearch.value.trim().toLowerCase();
    controls.results.replaceChildren();
    if (query.length < 2) return;
    controls.results.textContent='Searching cities…';
    try {
      const data = await getData('cities','10m');
      const country = controls.country.options[controls.country.selectedIndex]?.text || '';
      const matches = data.features.map(cityInfo).filter(city => `${city.name} ${city.admin} ${city.country}`.toLowerCase().includes(query))
        .sort((a,b)=>(b.country===country)-(a.country===country)||b.population-a.population).slice(0,12);
      controls.results.replaceChildren();
      matches.forEach(city => {
        const button=document.createElement('button');button.type='button';button.className='mapd-city-result';
        button.innerHTML=`<strong></strong><span></span>`;button.querySelector('strong').textContent=city.name;button.querySelector('span').textContent=[city.admin,city.country,city.population?city.population.toLocaleString():null].filter(Boolean).join(' · ');
        button.onclick=()=>{if(!selectedCities.some(item=>item.id===city.id))selectedCities.push(city);controls.citySearch.value='';controls.results.replaceChildren();controls.mode.value='city';renderSelectedCities();updateMode();updatePreview();};
        controls.results.appendChild(button);
      });
      if (!matches.length) controls.results.textContent='No matching Natural Earth city found. Try a nearby larger place or add coordinates through GeoJSON.';
    } catch(error){controls.results.textContent=error.message;}
  }

  function updateMode() {
    controls.country.closest('label').hidden = controls.mode.value==='world';
    controls.focus.closest('label').hidden = controls.mode.value!=='city';
    controls.states.closest('label').hidden = controls.mode.value==='world';
    controls.north.closest('label').hidden = controls.mode.value==='world';
    controls.scale.closest('label').hidden = controls.mode.value==='world';
  }

  async function addMap() {
    if (!currentMarkup) await updatePreview();
    if (!currentMarkup) return;
    const size=window.currentCanvasSize?.()||{width:1200,height:750};
    const width=Math.min(size.width*.78,850),height=width*H/W;
    const title=controls.title.value.trim()||(controls.mode.value==='world'?'World map':controls.mode.value==='city'&&selectedCities.length?selectedCities.map(city=>city.name).join(' · '):controls.country.options[controls.country.selectedIndex]?.text||'Map');
    const item={id:uid(),type:'svg',name:title,x:Math.max(20,(size.width-width)/2),y:Math.max(20,(size.height-height)/2),width,height,svgMarkup:currentMarkup,svgViewBox:`0 0 ${W} ${H}`,svgColorMode:'original',fill:PALETTE.primary,stroke:PALETTE.text,opacity:1,rotation:0,visible:true,metadata:{sourcePack:'Natural Earth',sourceName:title,sourceUrl:'https://www.naturalearthdata.com/',license:'Public domain',attribution:'Map layers from Natural Earth, public domain.',notes:`Figureloom detailed map with ${selectedCities.length} city marker(s), lakes, rivers, administrative and marine layers as selected.`}};
    pushHistory();state.objects.push(item);state.selectedId=item.id;render();renderPages?.();scheduleSave();drawer.classList.remove('open');
  }

  const style=document.createElement('style');
  style.textContent=`
    #mapStudioDetailedDrawer{width:min(860px,calc(100vw - 20px))}.map-intro{padding:10px 11px;border:1px solid #d9e0e9;border-radius:9px;background:#f4f7fb;margin-bottom:10px}.map-intro strong,.map-intro span,.mapd-heading strong,.mapd-heading span{display:block}.map-intro strong,.mapd-heading strong{color:#253044;font-size:12px}.map-intro span,.mapd-heading span{margin-top:2px;color:#6b7280;font-size:10px}.mapd-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:9px}.mapd-grid-3{grid-template-columns:repeat(3,1fr)}.mapd-grid label,.mapd-section label{display:grid;gap:5px;color:#596579;font-size:10px}.mapd-grid select,.mapd-grid input,.mapd-city-search input{min-width:0;min-height:37px;border:1px solid #cfd7e3;border-radius:8px;background:white;padding:7px 9px;color:#253044}.mapd-section{margin:9px 0;padding:10px;border:1px solid #d9e0e9;border-radius:9px;background:#f9fbfd}.mapd-heading{margin-bottom:8px}.mapd-city-search{display:grid;grid-template-columns:1fr auto;gap:7px}.mapd-city-search button,.mapd-actions button{border:1px solid #cfd7e3;border-radius:8px;background:white;color:#253044;padding:8px 11px}.mapd-city-results{display:grid;gap:5px;max-height:180px;overflow:auto;margin-top:7px}.mapd-city-result{display:grid;gap:2px;text-align:left;border:1px solid #d9e0e9;border-radius:7px;background:white;padding:7px 9px;color:#253044}.mapd-city-result:hover{background:#f4f7fb;border-color:#7aa0ed}.mapd-city-result strong{font-size:11px}.mapd-city-result span{font-size:9px;color:#6b7280}.mapd-city-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.mapd-city-chip{border:1px solid #7aa0ed;border-radius:999px;background:#eef4ff;color:#1d4ed8;padding:5px 8px;font-size:9px}.mapd-empty{color:#8a94a3;font-size:10px}.mapd-layers{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.mapd-layers label{display:flex;align-items:center;gap:6px}.mapd-preview-wrap{position:relative;border:1px solid #cfd7e3;border-radius:10px;overflow:hidden;background:#f4f7fb}.mapd-preview-wrap svg{display:block;width:100%;height:auto;min-height:280px;max-height:480px}.mapd-preview-wrap>span{position:absolute;right:9px;bottom:8px;border:1px solid #d9e0e9;border-radius:6px;background:rgba(255,255,255,.94);padding:5px 7px;color:#6b7280;font-size:9px}.mapd-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:9px}.mapd-actions .primary{background:#2563eb;border-color:#2563eb;color:white}@media(max-width:650px){.mapd-grid,.mapd-grid-3,.mapd-layers{grid-template-columns:1fr}.mapd-preview-wrap svg{min-height:220px}}
  `;
  document.head.appendChild(style);

  q('#mapdFindCity').onclick=findCities;
  controls.citySearch.addEventListener('input',()=>{clearTimeout(citySearchTimer);citySearchTimer=setTimeout(findCities,350);});
  controls.citySearch.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();findCities();}});
  q('#mapdRefresh').onclick=updatePreview;
  q('#mapdAdd').onclick=()=>addMap().catch(error=>alert(`Could not add map: ${error.message}`));

  [controls.mode,controls.detail,controls.country,controls.borders,controls.states,controls.lakes,controls.rivers,controls.marine,controls.cityLabels,controls.graticule,controls.north,controls.scale,controls.titleToggle,controls.focus].forEach(control=>control.addEventListener('change',async()=>{
    if(control===controls.detail) await populateCountries();
    if(control===controls.mode) updateMode();
    updatePreview();
  }));
  controls.title.addEventListener('input',()=>{clearTimeout(citySearchTimer);citySearchTimer=setTimeout(updatePreview,250);});

  function openDetailedMapStudio() {
    document.getElementById('mapStudioDrawer')?.classList.remove('open');
    drawer.classList.add('open');
    updateMode();
    loadScript(D3_URL,'d3').then(populateCountries).then(updatePreview).catch(error=>{controls.status.classList.add('error');controls.status.textContent=error.message;});
  }
  window.openMapStudio=window.openDetailedMapStudio=openDetailedMapStudio;

  document.addEventListener('click',event=>{
    const button=event.target.closest?.('#insertMapStudio');
    if(!button)return;
    event.preventDefault();event.stopImmediatePropagation();document.getElementById('insertDrawer')?.classList.remove('open');openDetailedMapStudio();
  },true);

  loadScript(D3_URL,'d3').then(populateCountries).then(()=>{updateMode();updatePreview();}).catch(error=>{controls.status.textContent=`Map data loads when Map Studio is opened: ${error.message}`;});
})();
