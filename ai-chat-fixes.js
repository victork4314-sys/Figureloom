(() => {
  if (window.__figureLoomUnifiedAiChatFixes) return;
  window.__figureLoomUnifiedAiChatFixes = true;

  const body = document.getElementById('figureAssistantDrawer')?.querySelector('.utility-body');
  if (body) {
    body.style.flex = '1 1 auto';
    body.style.minHeight = '0';
  }

  function loadPuterFallback() {
    if (window.__figureLoomPuterFallback || document.querySelector('script[data-loomy-puter-fallback]')) return;
    const script = document.createElement('script');
    script.src = 'puter-fallback.js?v=1';
    script.dataset.loomyPuterFallback = '1';
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