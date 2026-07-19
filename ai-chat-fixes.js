(() => {
  if (window.__figureLoomUnifiedAiChatFixesV11) return;
  window.__figureLoomUnifiedAiChatFixesV11 = true;
  window.__figureLoomUnifiedAiChatFixesV10 = true;
  window.__figureLoomUnifiedAiChatFixesV9 = true;
  window.__figureLoomUnifiedAiChatFixes = true;

  function loadCompanion(src, marker) {
    if (document.querySelector(`script[data-${marker}]`)) return;
    const script = document.createElement('script');
    script.src = src;
    script.dataset[marker.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = '1';
    document.head.appendChild(script);
  }

  loadCompanion('interface-dark-mode.js?v=3', 'figureloom-dark-mode');
  loadCompanion('dark-mode-windows.js?v=2', 'figureloom-dark-windows');
  loadCompanion('interaction-stability-fixes.js?v=1', 'figureloom-interaction-stability');
  loadCompanion('page-thumbnail-previews.js?v=1', 'figureloom-page-previews');
  loadCompanion('illustrations-ui-polish.js?v=1', 'figureloom-illustrations-polish');
  loadCompanion('collaboration-chat.js?v=2', 'figureloom-collaboration-chat');
  loadCompanion('loomy-honesty.js?v=1', 'loomy-honesty');
  loadCompanion('loomy-theme-save-guard.js?v=1', 'figureloom-loomy-theme-save');

  const body = document.getElementById('figureAssistantDrawer')?.querySelector('.utility-body');
  if (body) {
    body.style.flex = '1 1 auto';
    body.style.minHeight = '0';
  }

  const cloud = window.SciCanvasCloud;
  if (cloud && !cloud.__loomyReliableGetClient) {
    Object.defineProperty(cloud, '__loomyReliableGetClient', { value:true, configurable:true });
  }

  function loadHelperFit() {
    if (window.__figureLoomHelperFitV3 || document.querySelector('script[data-loomy-helper-fit]')) return;
    const script = document.createElement('script');
    script.src = 'loomy-helper-fit.js?v=4';
    script.dataset.loomyHelperFit = '1';
    document.head.appendChild(script);
  }

  function loadDirectPuterSelector() {
    if (window.__figureLoomPuterDirectSelector) return;
    const existing = document.querySelector('script[data-loomy-puter-selector]');
    if (existing) return;
    const script = document.createElement('script');
    script.src = 'puter-direct-selector.js?v=2';
    script.dataset.loomyPuterSelector = '1';
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
    script.src = 'puter-fallback.js?v=3';
    script.dataset.loomyPuterFallback = '1';
    script.addEventListener('load', loadDirectPuterSelector, { once:true });
    document.head.appendChild(script);
  }

  loadHelperFit();

  const existingReliability = document.querySelector('script[data-loomy-reliability]');
  if (existingReliability) {
    if (window.__figureLoomLoomyReliability) loadPuterFallback();
    else existingReliability.addEventListener('load', loadPuterFallback, { once:true });
    return;
  }

  const reliability = document.createElement('script');
  reliability.src = 'loomy-reliability.js?v=2';
  reliability.dataset.loomyReliability = '1';
  reliability.addEventListener('load', loadPuterFallback, { once:true });
  document.head.appendChild(reliability);
})();
