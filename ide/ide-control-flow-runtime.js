(() => {
  'use strict';
  const parts = [0,1,2,3,4].map((number) => `./ide-control-flow-runtime.part${String(number).padStart(2,'0')}?v=1`);
  Promise.all(parts.map(async (url) => {
    const response = await fetch(url, { cache:'no-store' });
    if (!response.ok) throw new Error(`Could not load ${url}`);
    return response.text();
  })).then((sources) => {
    const script = document.createElement('script');
    script.id = 'figureloomBioControlFlowCombined';
    script.textContent = sources.join('');
    document.head.append(script);
  }).catch((error) => {
    console.error('Could not load FigureLoom Bio decisions', error);
    const status = document.getElementById('runStatus');
    if (status) {
      status.textContent = 'Decision tools did not load';
      status.className = 'status-pill error';
    }
  });
})();
