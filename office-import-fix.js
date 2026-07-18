(() => {
  if (window.__figureLoomImporterCoreLoaderV1) return;
  window.__figureLoomImporterCoreLoaderV1 = true;

  const CORE_URL = 'office-import-core.js?v=background-lock-v1';

  function setImportBusy(busy) {
    const input = document.getElementById('officePptxFile');
    const button = document.getElementById('officeImportPptx');
    if (input) input.disabled = busy;
    if (button) button.disabled = busy;
  }

  function loadScriptSource(source) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(new Blob([source], { type:'text/javascript' }));
      const script = document.createElement('script');
      script.src = url;
      script.onload = () => {
        URL.revokeObjectURL(url);
        resolve();
      };
      script.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('The presentation importer could not start.'));
      };
      document.head.appendChild(script);
    });
  }

  function loadCoreDirectly() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = CORE_URL;
      script.onload = resolve;
      script.onerror = () => reject(new Error('The presentation importer core could not load.'));
      document.head.appendChild(script);
    });
  }

  function replaceExactly(source, before, after, label) {
    if (!source.includes(before)) throw new Error(`Importer patch point missing: ${label}`);
    return source.replace(before, after);
  }

  function addBackgroundLockRules(source) {
    source = replaceExactly(
      source,
      `    for (const node of drawableChildren(spTree)) await parseNode(node, context);\n    return { objects, placeholders:placeholderMap(part.doc) };`,
      `    for (const node of drawableChildren(spTree)) await parseNode(node, context);\n\n    if (options.lockVisuals) {\n      objects.forEach(item => {\n        const isText = item.type === 'text';\n        item.metadata = {\n          ...(item.metadata || {}),\n          importRole:isText ? 'background-text' : (options.backgroundRole || 'background-visual')\n        };\n        item.groupId = null;\n        item.locked = !isText;\n      });\n    }\n\n    return { objects, placeholders:placeholderMap(part.doc) };`,
      'background object finalization'
    );

    source = replaceExactly(
      source,
      `          : (await parsePowerPointPart(zip, masterPart, theme, colorMap, context, [], { skipPlaceholders:true })).objects;`,
      `          : (await parsePowerPointPart(zip, masterPart, theme, colorMap, context, [], { skipPlaceholders:true, lockVisuals:true, backgroundRole:'master-background' })).objects;`,
      'slide master lock'
    );

    source = replaceExactly(
      source,
      `        const layoutObjects = (await parsePowerPointPart(zip, layoutPart, theme, colorMap, context, [masterMap], { skipPlaceholders:true })).objects;`,
      `        const layoutObjects = (await parsePowerPointPart(zip, layoutPart, theme, colorMap, context, [masterMap], { skipPlaceholders:true, lockVisuals:true, backgroundRole:'layout-background' })).objects;`,
      'slide layout lock'
    );

    source = replaceExactly(
      source,
      `        const masterObjects = (await parsePowerPointPart(zip, masterPart, theme, colorMap, context, [], { skipPlaceholders:true })).objects;`,
      `        const masterObjects = (await parsePowerPointPart(zip, masterPart, theme, colorMap, context, [], { skipPlaceholders:true, lockVisuals:true, backgroundRole:'master-background' })).objects;`,
      'template master lock'
    );

    source = replaceExactly(
      source,
      `        const layoutObjects = (await parsePowerPointPart(zip, layoutPart, theme, colorMap, context, [masterMap])).objects;`,
      `        const layoutObjects = (await parsePowerPointPart(zip, layoutPart, theme, colorMap, context, [masterMap], { lockVisuals:true, backgroundRole:'layout-background' })).objects;`,
      'template layout lock'
    );

    return source;
  }

  async function start() {
    setImportBusy(true);
    try {
      const response = await fetch(CORE_URL, { cache:'no-store' });
      if (!response.ok) throw new Error(`Importer core request failed (${response.status}).`);
      const source = addBackgroundLockRules(await response.text());
      await loadScriptSource(source);
    } catch (error) {
      console.warn('FigureLoom used the unchanged importer because the background-lock patch could not be applied.', error);
      await loadCoreDirectly();
    } finally {
      setImportBusy(false);
    }
  }

  void start();
})();