(() => {
  if (window.__figureLoomUnifiedAiChatFixes) return;
  window.__figureLoomUnifiedAiChatFixes = true;

  const body = document.getElementById('figureAssistantDrawer')?.querySelector('.utility-body');
  if (body) {
    body.style.flex = '1 1 auto';
    body.style.minHeight = '0';
  }

  if (!document.querySelector('script[data-loomy-reliability]')) {
    const script = document.createElement('script');
    script.src = 'loomy-reliability.js?v=1';
    script.dataset.loomyReliability = '1';
    document.head.appendChild(script);
  }
})();