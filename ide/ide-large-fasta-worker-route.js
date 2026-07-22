(() => {
  'use strict';

  const NativeWorker = window.Worker;
  if (!NativeWorker || window.__figureloomLargeFastaWorkerRoute) return;
  window.__figureloomLargeFastaWorkerRoute = true;

  function FigureLoomWorker(url, options) {
    const requested = String(url);
    const routed = requested.includes('ide-large-fasta-worker.js')
      ? requested.replace('ide-large-fasta-worker.js?v=1', 'ide-large-fasta-worker-v2.js?v=1')
      : url;
    return new NativeWorker(routed, options);
  }

  FigureLoomWorker.prototype = NativeWorker.prototype;
  Object.setPrototypeOf(FigureLoomWorker, NativeWorker);
  window.Worker = FigureLoomWorker;
})();
