(() => {
  if (typeof createDrawer !== 'function') return;

  const drawer = createDrawer('pathwayExchangeDrawer', 'Pathway exchange', 'Export the active page as SBGN-ML, BioPAX RDF/XML, or SBML Level 3');
  drawer.classList.add('pathway-exchange-drawer');
  const body = drawer.querySelector('.utility-body');
  body.innerHTML = `
    <div class="exchange-hero"><span>⇄</span><div><strong>Machine-readable pathway exchange</strong><small>Map editable SciCanvas objects and anchored connectors into interoperable pathway documents.</small></div></div>
    <div id="exchangeSummary" class="exchange-summary"></div>
    <div class="exchange-actions"><button id="exportSbgn" type="button" class="primary">Download SBGN-ML</button><button id="exportBiopax" type="button">Download BioPAX</button><button id="exportSbml" type="button">Download SBML</button></div>
    <label>Model identifier <input id="exchangeModelId" type="text" value="scicanvas_pathway"></label>
    <label>Model notes <textarea id="exchangeNotes" rows="3" placeholder="Study, organism, conditions, publication reference…"></textarea></label>
    <details><summary>Mapping rules</summary><p>Visible non-connector objects become entities/species. Anchored connectors become interactions or reactions. The inspector’s pathway role and identifier fields override automatic type inference. Standalone arrows are linked to their nearest left/right entities when possible.</p></details>
    <pre id="exchangePreview" class="exchange-preview"></pre>
    <p id="exchangeMessage" class="exchange-message" aria-live="polite"></p>
  `;

  const q = selector => drawer.querySelector(selector);
  const CONNECTOR_TYPES = new Set(['connector','anchored-connector']);

  function xml(value = '') {
    return String(value).replace(/[<>&"']/g, character => ({ '<':'&lt;', '>':'&gt;', '&':'&amp;', '"':'&quot;', "'":'&apos;' }[character]));
  }

  function id(value, prefix = 'item') {
    const cleaned = String(value || '').replace(/[^A-Za-z0-9_.-]/g, '_').replace(/^[^A-Za-z_]/, '_$&');
    return cleaned || `${prefix}_${Math.random().toString(36).slice(2,8)}`;
  }

  function visibleObjects() {
    window.syncPage?.();
    return (state.objects || []).filter(item => item.visible !== false);
  }

  function isConnector(item) {
    return CONNECTOR_TYPES.has(item.type) || (item.type === 'arrow' && (item.anchorStartId || item.anchorEndId || item.sourceId || item.targetId));
  }

  function center(item) {
    return { x:(Number(item.x) || 0) + (Number(item.width) || 0) / 2, y:(Number(item.y) || 0) + (Number(item.height) || 0) / 2 };
  }

  function nearestEntity(point, entities, side = 0) {
    return entities
      .filter(item => !side || Math.sign(center(item).x - point.x) === side)
      .map(item => ({ item, distance:Math.hypot(center(item).x-point.x, center(item).y-point.y) }))
      .sort((a,b) => a.distance - b.distance)[0]?.item || null;
  }

  function pathwayRole(item) {
    const explicit = item.metadata?.pathwayRole;
    if (explicit) return explicit;
    if (item.type === 'text') return 'annotation';
    if (/gene|dna|rna/i.test(`${item.name} ${item.metadata?.scientificName || ''}`)) return 'nucleic-acid-feature';
    if (/protein|enzyme|receptor|antibody/i.test(`${item.name} ${item.metadata?.scientificName || ''}`)) return 'macromolecule';
    if (/complex/i.test(item.name || '')) return 'complex';
    if (/chemical|molecule|metabolite|compound/i.test(`${item.name} ${item.metadata?.notes || ''}`)) return 'simple-chemical';
    if (/cell|organelle|compartment/i.test(`${item.name} ${item.metadata?.notes || ''}`)) return 'compartment';
    return 'unspecified-entity';
  }

  function model() {
    const objects = visibleObjects();
    const entities = objects.filter(item => !isConnector(item) && item.type !== 'arrow');
    const interactions = [];
    objects.filter(item => isConnector(item) || item.type === 'arrow').forEach(connector => {
      let source = entities.find(item => item.id === (connector.anchorStartId || connector.sourceId));
      let target = entities.find(item => item.id === (connector.anchorEndId || connector.targetId));
      if (!source || !target) {
        const point = center(connector);
        source ||= nearestEntity(point, entities, -1) || nearestEntity(point, entities);
        target ||= nearestEntity(point, entities.filter(item => item.id !== source?.id), 1) || nearestEntity(point, entities.filter(item => item.id !== source?.id));
      }
      if (source && target) interactions.push({ item:connector, source, target });
    });
    return { entities, interactions };
  }

  function entityLabel(item) {
    return item.metadata?.scientificName || item.text || item.name || 'Entity';
  }

  function identifier(item) {
    return item.metadata?.pathwayIdentifier || item.metadata?.identifier || item.metadata?.scienceIdentifier || item.id;
  }

  function sbgnClass(role) {
    return ({
      'nucleic-acid-feature':'nucleic acid feature', macromolecule:'macromolecule', complex:'complex',
      'simple-chemical':'simple chemical', compartment:'compartment', annotation:'tag', process:'process'
    })[role] || 'unspecified entity';
  }

  function makeSbgn() {
    const { entities, interactions } = model();
    const glyphs = entities.map(item => {
      const role = pathwayRole(item);
      return `    <glyph id="${id(item.id,'glyph')}" class="${xml(sbgnClass(role))}">\n      <label text="${xml(entityLabel(item))}"/>\n      <bbox x="${Number(item.x)||0}" y="${Number(item.y)||0}" w="${Math.max(1,Number(item.width)||1)}" h="${Math.max(1,Number(item.height)||1)}"/>\n    </glyph>`;
    }).join('\n');
    const arcs = interactions.map((entry,index) => `    <arc id="arc_${index+1}" class="${/inhibit|block/i.test(entry.item.name || '') ? 'inhibition' : 'production'}" source="${id(entry.source.id)}" target="${id(entry.target.id)}"/>`).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<sbgn xmlns="http://sbgn.org/libsbgn/0.3">\n  <map id="${id(q('#exchangeModelId').value,'map')}" language="process description">\n${glyphs}${arcs ? `\n${arcs}` : ''}\n  </map>\n</sbgn>\n`;
  }

  function makeBiopax() {
    const { entities, interactions } = model();
    const entityXml = entities.map(item => {
      const role = pathwayRole(item);
      const className = role === 'nucleic-acid-feature' ? 'Dna' : role === 'simple-chemical' ? 'SmallMolecule' : role === 'complex' ? 'Complex' : role === 'compartment' ? 'CellularLocationVocabulary' : 'Protein';
      return `  <bp:${className} rdf:about="#${id(item.id)}">\n    <bp:displayName>${xml(entityLabel(item))}</bp:displayName>\n    <bp:standardName>${xml(identifier(item))}</bp:standardName>\n  </bp:${className}>`;
    }).join('\n');
    const interactionXml = interactions.map((entry,index) => `  <bp:BiochemicalReaction rdf:about="#interaction_${index+1}">\n    <bp:displayName>${xml(entry.item.name || `Interaction ${index+1}`)}</bp:displayName>\n    <bp:left rdf:resource="#${id(entry.source.id)}"/>\n    <bp:right rdf:resource="#${id(entry.target.id)}"/>\n  </bp:BiochemicalReaction>`).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:bp="http://www.biopax.org/release/biopax-level3.owl#">\n  <bp:Pathway rdf:about="#${id(q('#exchangeModelId').value,'pathway')}">\n    <bp:displayName>${xml(document.getElementById('documentName')?.value || 'SciCanvas pathway')}</bp:displayName>\n    <bp:comment>${xml(q('#exchangeNotes').value)}</bp:comment>\n${interactions.map((entry,index) => `    <bp:pathwayComponent rdf:resource="#interaction_${index+1}"/>`).join('\n')}\n  </bp:Pathway>\n${entityXml}\n${interactionXml}\n</rdf:RDF>\n`;
  }

  function makeSbml() {
    const { entities, interactions } = model();
    const species = entities.filter(item => pathwayRole(item) !== 'annotation').map(item => `      <species id="${id(item.id,'species')}" name="${xml(entityLabel(item))}" compartment="default" boundaryCondition="false" constant="false" hasOnlySubstanceUnits="false"/>`).join('\n');
    const reactions = interactions.map((entry,index) => `      <reaction id="reaction_${index+1}" name="${xml(entry.item.name || `Reaction ${index+1}`)}" reversible="false" fast="false">\n        <listOfReactants><speciesReference species="${id(entry.source.id)}" constant="true"/></listOfReactants>\n        <listOfProducts><speciesReference species="${id(entry.target.id)}" constant="true"/></listOfProducts>\n      </reaction>`).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<sbml xmlns="http://www.sbml.org/sbml/level3/version2/core" level="3" version="2">\n  <model id="${id(q('#exchangeModelId').value,'model')}" name="${xml(document.getElementById('documentName')?.value || 'SciCanvas pathway')}">\n    <notes><body xmlns="http://www.w3.org/1999/xhtml"><p>${xml(q('#exchangeNotes').value || 'Exported from SciCanvas')}</p></body></notes>\n    <listOfCompartments><compartment id="default" name="Default compartment" constant="true"/></listOfCompartments>\n    <listOfSpecies>\n${species}\n    </listOfSpecies>\n    <listOfReactions>\n${reactions}\n    </listOfReactions>\n  </model>\n</sbml>\n`;
  }

  function refreshSummary() {
    const { entities, interactions } = model();
    q('#exchangeSummary').innerHTML = `<strong>${entities.length}</strong><span>entities</span><strong>${interactions.length}</strong><span>mapped interactions</span>`;
    q('#exchangePreview').textContent = JSON.stringify({
      entities:entities.map(item => ({ id:item.id, label:entityLabel(item), role:pathwayRole(item), identifier:identifier(item) })),
      interactions:interactions.map(entry => ({ source:entry.source.id, target:entry.target.id, label:entry.item.name || 'interaction' }))
    }, null, 2);
  }

  function download(contents, mime, suffix) {
    const name = (document.getElementById('documentName')?.value || 'scicanvas-pathway').trim().replace(/[^a-z0-9_-]+/gi,'-');
    downloadBlob(contents, mime, `${name}.${suffix}`);
    q('#exchangeMessage').textContent = `Downloaded ${suffix.toUpperCase()} pathway document.`;
    q('#exchangeMessage').dataset.kind = 'success';
  }

  q('#exportSbgn').addEventListener('click', () => download(makeSbgn(), 'application/xml', 'sbgn'));
  q('#exportBiopax').addEventListener('click', () => download(makeBiopax(), 'application/rdf+xml', 'owl'));
  q('#exportSbml').addEventListener('click', () => download(makeSbml(), 'application/sbml+xml', 'xml'));

  const inspector = document.createElement('section');
  inspector.id = 'pathwayMetadataInspector';
  inspector.className = 'inspector-section';
  inspector.innerHTML = `
    <h2>Pathway exchange</h2>
    <label class="full-field">Entity role <select id="pathwayRole" disabled><option value="">Auto</option><option value="macromolecule">Macromolecule / protein</option><option value="nucleic-acid-feature">Nucleic acid feature</option><option value="simple-chemical">Simple chemical</option><option value="complex">Complex</option><option value="compartment">Compartment</option><option value="annotation">Annotation only</option></select></label>
    <label class="full-field">Machine identifier <input id="pathwayIdentifier" type="text" placeholder="UniProt, ChEBI, NCBI…" disabled></label>
  `;
  document.querySelector('.right-panel')?.appendChild(inspector);
  const roleInput = inspector.querySelector('#pathwayRole');
  const idInput = inspector.querySelector('#pathwayIdentifier');
  const baseUpdateInspector = updateInspector;
  updateInspector = function updateInspectorWithPathwayMetadata() {
    baseUpdateInspector();
    const item = selectedObject();
    roleInput.disabled = !item;
    idInput.disabled = !item;
    roleInput.value = item?.metadata?.pathwayRole || '';
    idInput.value = item?.metadata?.pathwayIdentifier || item?.metadata?.identifier || '';
  };
  roleInput.addEventListener('change', event => {
    const item = selectedObject(); if (!item) return;
    item.metadata ||= {}; item.metadata.pathwayRole = event.target.value; scheduleSave(); refreshSummary();
  });
  idInput.addEventListener('change', event => {
    const item = selectedObject(); if (!item) return;
    item.metadata ||= {}; item.metadata.pathwayIdentifier = event.target.value.trim(); scheduleSave(); refreshSummary();
  });

  const style = document.createElement('style');
  style.textContent = `
    .pathway-exchange-drawer{width:min(760px,calc(100vw - 18px))!important}.exchange-hero{display:flex;align-items:center;gap:12px;padding:13px;border:1px solid #cbd9e1;border-radius:12px;background:linear-gradient(135deg,#eef7f5,#f4f1fa)}.exchange-hero>span{display:grid;place-items:center;width:44px;height:44px;border-radius:12px;background:linear-gradient(145deg,#4e8c96,#7469a0);color:white;font-size:24px}.exchange-hero strong,.exchange-hero small{display:block}.exchange-hero small{margin-top:4px;color:#6d7b8e;font-size:9px}.exchange-summary{display:grid;grid-template-columns:auto 1fr auto 1fr;gap:6px;align-items:baseline;margin-top:10px;padding:10px;border:1px solid #d5dfe7;border-radius:10px;background:white}.exchange-summary strong{font-size:18px;color:#3f6e80}.exchange-summary span{color:#738094;font-size:9px}.exchange-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:9px}.exchange-actions .primary{background:#4169b7;color:white;border-color:#4169b7}.pathway-exchange-drawer label{display:grid;gap:5px;margin-top:9px;color:#617086;font-size:10px}.pathway-exchange-drawer input,.pathway-exchange-drawer textarea{border:1px solid #cad6e1;border-radius:8px;background:white;padding:8px}.exchange-preview{max-height:260px;overflow:auto;padding:10px;border:1px solid #d5dfe7;border-radius:9px;background:#172033;color:#dce7ef;font-size:8px;line-height:1.4}.exchange-message{color:#708095;font-size:9px}.exchange-message[data-kind="success"]{color:#28745f}#pathwayMetadataInspector select,#pathwayMetadataInspector input{width:100%;border:1px solid #cfd8e3;border-radius:7px;padding:7px;background:white}`;
  document.head.appendChild(style);

  const register = () => window.SciCanvasPro?.register('exchange', () => { drawer.classList.add('open'); refreshSummary(); });
  register(); setTimeout(register, 150);
})();
