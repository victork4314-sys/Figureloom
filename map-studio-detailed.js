(() => {
  if (document.querySelector('script[data-figureloom-map-engine="google-v3"]')) return;
  const script = document.createElement('script');
  script.src = './map-studio-simple-v3.js?v=3';
  script.dataset.figureloomMapEngine = 'google-v3';
  script.async = false;
  script.addEventListener('error', () => {
    console.error('Figureloom interactive Map Studio v3 could not be loaded.');
  }, { once:true });
  document.head.appendChild(script);
})();
