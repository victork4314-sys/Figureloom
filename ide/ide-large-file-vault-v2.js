(() => {
  'use strict';

  if (window.FigureLoomBioLargeFileVaultLoading) return;

  const SOURCE = './ide-large-file-vault.js?v=1';

  function patchStreamingRoute(source) {
    const before = `  function shouldUseStreaming(program) {
    const large = manifest();
    return genomicsPattern.test(program) || referencedNames(program).some((name) => Object.prototype.hasOwnProperty.call(large, name));
  }`;
    const after = `  function shouldUseStreaming(program) {
    const largeNames = new Set(Object.keys(manifest()).map((name) => name.toLowerCase()));
    return referencedNames(program).some((name) => largeNames.has(name.toLowerCase()));
  }`;

    if (!source.includes(before)) {
      throw new Error('The FigureLoom Bio large-file runtime is missing its routing hook.');
    }
    return source.replace(before, after);
  }

  async function fetchSource() {
    let lastError = null;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const response = await fetch(SOURCE, { cache:'no-store' });
        if (!response.ok) throw new Error(`Could not load ${SOURCE} (${response.status})`);
        return await response.text();
      } catch (error) {
        lastError = error;
        if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 250));
      }
    }
    throw lastError || new Error(`Could not load ${SOURCE}`);
  }

  window.FigureLoomBioLargeFileVaultLoading = fetchSource()
    .then((source) => {
      const script = document.createElement('script');
      script.id = 'figureloomBioLargeFileVaultPatched';
      script.textContent = patchStreamingRoute(source);
      document.head.append(script);
      return true;
    })
    .catch((error) => {
      console.error('Could not load FigureLoom Bio large-file support', error);
      throw error;
    });

  window.FigureLoomBioLargeFileVaultPatches = Object.freeze({ patchStreamingRoute });
})();
