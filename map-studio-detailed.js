(() => {
  if (document.querySelector('script[data-figureloom-map-engine="reliable"]')) return;
  const script = document.createElement('script');
  script.src = './map-studio-reliable.js';
  script.dataset.figureloomMapEngine = 'reliable';
  script.async = false;
  script.addEventListener('error', () => {
    console.error('Figureloom detailed Map Studio could not be loaded.');
  }, { once:true });
  document.head.appendChild(script);
})();
