(() => {
  if (window.__figureLoomUnifiedAiChatFixes) return;
  window.__figureLoomUnifiedAiChatFixes = true;

  const body = document.getElementById('figureAssistantDrawer')?.querySelector('.utility-body');
  if (body) {
    body.style.flex = '1 1 auto';
    body.style.minHeight = '0';
  }

  // Puter is the independent backup now. Prevent the older reliability layer
  // from invoking the quota-counted Edge Function twice for one user action.
  const cloud = window.SciCanvasCloud;
  if (cloud && !cloud.__loomyReliableGetClient) {
    Object.defineProperty(cloud, '__loomyReliableGetClient', { value:true, configurable:true });
  }

  function loadHelperFit() {
    if (window.__figureLoomHelperFit || document.querySelector('script[data-loomy-helper-fit]')) return;
    const script = document.createElement('script');
    script.src = 'loomy-helper-fit.js?v=1';
    script.dataset.loomyHelperFit = '1';
    document.head.appendChild(script);
  }

  function loadDirectPuterSelector() {
    if (window.__figureLoomPuterDirectSelector) {
      loadHelperFit();
      return;
    }

    const existing = document.querySelector('script[data-loomy-puter-selector]');
    if (existing) {
      existing.addEventListener('load', loadHelperFit, { once:true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'puter-direct-selector.js?v=1';
    script.dataset.loomyPuterSelector = '1';
    script.addEventListener('load', loadHelperFit, { once:true });
    document.head.appendChild(script);
  }

  function loadPuterFallback() {
    if (window.__figureLoomPuterFallback) {
      loadDirectPuterSelector();
      return;
    }

    const existing = document.querySelector('script[data-loomy-puter-fallback]');
    if (existing) {
      existing.addEventListener('load', loadDirectPuterSelector, { once:true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'puter-fallback.js?v=2';
    script.dataset.loomyPuterFallback = '1';
    script.addEventListener('load', loadDirectPuterSelector, { once:true });
    document.head.appendChild(script);
  }

  const existingReliability = document.querySelector('script[data-loomy-reliability]');
  if (existingReliability) {
    if (window.__figureLoomLoomyReliability) loadPuterFallback();
    else existingReliability.addEventListener('load', loadPuterFallback, { once:true });
    return;
  }

  const reliability = document.createElement('script');
  reliability.src = 'loomy-reliability.js?v=1';
  reliability.dataset.loomyReliability = '1';
  reliability.addEventListener('load', loadPuterFallback, { once:true });
  document.head.appendChild(reliability);
})();
