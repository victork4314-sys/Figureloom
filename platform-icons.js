(() => {
  if (window.__figureLoomPlatformIconsV2) return;
  window.__figureLoomPlatformIconsV2 = true;

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
  addLink('icon', './figureloom-tab-16.png?v=2', { type:'image/png', sizes:'16x16' });
  addLink('icon', './figureloom-tab-32.png?v=2', { type:'image/png', sizes:'32x32' });
  addLink('icon', './favicon.ico?v=2', { type:'image/x-icon', sizes:'16x16 32x32 48x48' });
  addLink('icon', './figureloom-mark.svg?v=1', { type:'image/svg+xml', sizes:'any' });
  addLink('apple-touch-icon', './apple-touch-icon.png?v=2', { sizes:'180x180' });
  addLink('apple-touch-icon-precomposed', './apple-touch-icon-precomposed.png?v=2', { sizes:'180x180' });
  addLink('mask-icon', './figureloom-pinned.svg?v=2', { color:'#0c2e28' });

  let manifest = head.querySelector('link[rel="manifest"]');
  if (!manifest) manifest = addLink('manifest', './manifest.webmanifest?v=11');
  else manifest.href = './manifest.webmanifest?v=11';

  const ensureMeta = (name, content) => {
    let meta = head.querySelector(`meta[name="${name}"]`);
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = name;
      head.appendChild(meta);
    }
    meta.content = content;
  };
  ensureMeta('msapplication-config', './browserconfig.xml?v=2');
  ensureMeta('msapplication-TileColor', '#0c2e28');
})();