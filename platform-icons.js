(() => {
  if (window.__figureLoomPlatformIconsV3) return;
  window.__figureLoomPlatformIconsV3 = true;

  const head = document.head;
  const addLink = (rel, href, attributes = {}) => {
    const link = document.createElement('link');
    link.rel = rel;
    link.href = href;
    Object.entries(attributes).forEach(([name, value]) => link.setAttribute(name, value));
    head.appendChild(link);
    return link;
  };

  head.querySelectorAll('link[rel="icon"],link[rel="shortcut icon"],link[rel="apple-touch-icon"],link[rel="apple-touch-icon-precomposed"],link[rel="mask-icon"]').forEach(node => node.remove());
  addLink('icon', './favicon.ico?v=3', { type:'image/x-icon', sizes:'32x32' });
  addLink('icon', './figureloom-mark.svg?v=2', { type:'image/svg+xml', sizes:'any' });
  addLink('apple-touch-icon', './apple-touch-icon.png?v=3', { sizes:'180x180' });
  addLink('apple-touch-icon-precomposed', './apple-touch-icon-precomposed.png?v=3', { sizes:'180x180' });
  addLink('mask-icon', './figureloom-pinned.svg?v=3', { color:'#0c2e28' });

  let manifest = head.querySelector('link[rel="manifest"]');
  if (!manifest) manifest = addLink('manifest', './manifest.webmanifest?v=12');
  else manifest.href = './manifest.webmanifest?v=12';

  const ensureMeta = (name, content) => {
    let meta = head.querySelector(`meta[name="${name}"]`);
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = name;
      head.appendChild(meta);
    }
    meta.content = content;
  };
  ensureMeta('msapplication-config', './browserconfig.xml?v=3');
  ensureMeta('msapplication-TileColor', '#0c2e28');
})();
