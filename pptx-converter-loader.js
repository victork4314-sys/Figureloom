(() => {
  if (window.__figureLoomPowerPointConverterLoaderV1) return;
  window.__figureLoomPowerPointConverterLoaderV1 = true;

  const GLOBAL_NAME = 'PptxGenJS';
  const PROMISE_KEY = `__figureLoomLibraryPromise_${GLOBAL_NAME}`;
  const SOURCES = [
    'https://cdn.jsdelivr.net/npm/pptxgenjs@4.0.1/dist/pptxgen.bundle.js',
    'https://unpkg.com/pptxgenjs@4.0.1/dist/pptxgen.bundle.js',
    'https://cdn.jsdelivr.net/gh/gitbrent/PptxGenJS@v4.0.1/dist/pptxgen.bundle.js',
    'https://cdn.jsdelivr.net/gh/gitbrent/PptxGenJS@3.12.0/dist/pptxgen.bundle.js'
  ];

  let activeLoad = null;
  let successfulSource = '';

  function converterReady() {
    return typeof window[GLOBAL_NAME] === 'function';
  }

  function removeFailedScript(script) {
    try {
      script.remove();
    } catch {}
  }

  function loadOne(url, timeoutMs = 15000) {
    if (converterReady()) return Promise.resolve(window[GLOBAL_NAME]);

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      let settled = false;
      const finish = (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        script.onload = null;
        script.onerror = null;
        if (converterReady()) {
          successfulSource = url;
          resolve(window[GLOBAL_NAME]);
          return;
        }
        removeFailedScript(script);
        reject(error || new Error(`The converter did not start after loading ${url}.`));
      };

      script.src = url;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.referrerPolicy = 'no-referrer';
      script.dataset.figureloomPptxConverterSource = url;
      script.onload = () => finish();
      script.onerror = () => finish(new Error(`Could not load ${url}.`));
      const timer = setTimeout(() => finish(new Error(`Timed out loading ${url}.`)), timeoutMs);
      document.head.appendChild(script);
    });
  }

  async function loadConverter() {
    if (converterReady()) return window[GLOBAL_NAME];
    if (activeLoad) return activeLoad;

    activeLoad = (async () => {
      const failures = [];
      for (const source of SOURCES) {
        try {
          return await loadOne(source);
        } catch (error) {
          failures.push(error?.message || String(error));
          console.warn('FigureLoom PowerPoint converter source failed; trying the next source.', source, error);
        }
      }
      throw new Error(`The PowerPoint converter could not load from any backup source. ${failures.join(' ')}`);
    })();

    try {
      return await activeLoad;
    } finally {
      if (!converterReady()) activeLoad = null;
    }
  }

  const retryableThenable = {
    then(onFulfilled, onRejected) {
      return loadConverter().then(onFulfilled, onRejected);
    },
    catch(onRejected) {
      return loadConverter().catch(onRejected);
    },
    finally(onFinally) {
      return loadConverter().finally(onFinally);
    }
  };

  window[PROMISE_KEY] = retryableThenable;
  window.FigureLoomPowerPointConverter = Object.freeze({
    load:loadConverter,
    sources:[...SOURCES],
    get successfulSource() {
      return successfulSource;
    }
  });
})();
