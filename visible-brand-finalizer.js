(() => {
  if (window.__figureLoomVisibleBrandFinalizerV1) return;
  window.__figureLoomVisibleBrandFinalizerV1 = true;

  const BRAND_PATTERN = /SciCanvas/gi;
  const EXTENSION_PATTERN = /\.scicanvas\b/gi;
  const ATTRIBUTES = [
    'title', 'aria-label', 'aria-description', 'aria-valuetext',
    'placeholder', 'alt', 'data-tooltip', 'data-title', 'data-label'
  ];
  const ATTRIBUTE_SELECTOR = ATTRIBUTES.map(name => `[${name}]`).join(',');
  const USER_CONTENT_SELECTOR = [
    '#canvas', '#objectLayer', '.canvas-object', '.canvas-text',
    '#documentName', '#userGreetingButton',
    '[contenteditable="true"]', '[data-user-content="true"]',
    '[data-project-content="true"]', '[data-imported-content="true"]',
    '.project-tab', '.projects-open-chip', '.project-name',
    '.project-card-title', '.project-gallery-card', '.gallery-project-name',
    '.page-thumbnail', '.page-name', '.layer-name',
    '.chat-message', '.collaboration-message', '.collab-chat-message',
    '.code-window', '.instruction-block', 'pre', 'code'
  ].join(',');
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE']);
  let observer = null;
  let scheduled = false;
  const pending = new Set();

  function replaceVisibleBrand(value) {
    return String(value ?? '')
      .replace(EXTENSION_PATTERN, '.figureloom')
      .replace(BRAND_PATTERN, 'FigureLoom')
      .replace(/Figureloom/g, 'FigureLoom');
  }

  function isUserContent(element) {
    if (!(element instanceof Element)) return false;
    return Boolean(element.closest(USER_CONTENT_SELECTOR));
  }

  function shouldSkipElement(element) {
    if (!(element instanceof Element)) return true;
    return SKIP_TAGS.has(element.tagName) || isUserContent(element);
  }

  function cleanTextNode(node) {
    if (!(node instanceof Text)) return;
    const parent = node.parentElement;
    if (!parent || shouldSkipElement(parent)) return;
    const current = node.nodeValue || '';
    if (!/scicanvas/i.test(current)) return;
    const next = replaceVisibleBrand(current);
    if (next !== current) node.nodeValue = next;
  }

  function cleanFileInput(input) {
    if (!(input instanceof HTMLInputElement) || input.type !== 'file') return;
    const accept = input.getAttribute('accept') || '';
    if (!/\.scicanvas\b/i.test(accept) || /\.figureloom\b/i.test(accept)) return;
    input.setAttribute('accept', `${accept},.figureloom`);
  }

  function cleanElement(element) {
    if (!(element instanceof Element) || shouldSkipElement(element)) return;
    for (const attribute of ATTRIBUTES) {
      if (!element.hasAttribute(attribute)) continue;
      const current = element.getAttribute(attribute) || '';
      if (!/scicanvas/i.test(current)) continue;
      const next = replaceVisibleBrand(current);
      if (next !== current) element.setAttribute(attribute, next);
    }
    if (element instanceof HTMLInputElement) {
      cleanFileInput(element);
      if (['button', 'submit', 'reset'].includes(element.type) && /scicanvas/i.test(element.value || '')) {
        element.value = replaceVisibleBrand(element.value);
      }
    }
  }

  function cleanSubtree(root) {
    if (!root) return;
    if (root instanceof Text) {
      cleanTextNode(root);
      return;
    }
    if (!(root instanceof Element || root instanceof Document || root instanceof DocumentFragment)) return;
    if (root instanceof Element && shouldSkipElement(root)) return;

    if (root instanceof Element) cleanElement(root);

    const textWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return node.parentElement && !shouldSkipElement(node.parentElement)
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      }
    });
    while (textWalker.nextNode()) cleanTextNode(textWalker.currentNode);

    root.querySelectorAll?.(`${ATTRIBUTE_SELECTOR},input[type="file"],input[type="button"],input[type="submit"],input[type="reset"]`)
      .forEach(cleanElement);
  }

  function cleanHead() {
    document.title = replaceVisibleBrand(document.title);
    document.querySelectorAll('meta[name="description"],meta[property="og:title"],meta[property="og:description"],meta[name="twitter:title"],meta[name="twitter:description"],meta[name="application-name"],meta[name="apple-mobile-web-app-title"]')
      .forEach(meta => {
        const current = meta.getAttribute('content') || '';
        const next = replaceVisibleBrand(current);
        if (next !== current) meta.setAttribute('content', next);
      });
  }

  function flush() {
    scheduled = false;
    cleanHead();
    const roots = [...pending];
    pending.clear();
    roots.forEach(cleanSubtree);
  }

  function schedule(root = document.body) {
    if (root) pending.add(root);
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(flush);
  }

  function installObserver() {
    if (observer || !document.documentElement) return;
    observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === 'characterData') {
          schedule(mutation.target);
          continue;
        }
        if (mutation.type === 'attributes') {
          schedule(mutation.target);
          continue;
        }
        mutation.addedNodes.forEach(schedule);
      }
    });
    observer.observe(document.documentElement, {
      subtree:true,
      childList:true,
      characterData:true,
      attributes:true,
      attributeFilter:[...ATTRIBUTES, 'accept', 'value']
    });
  }

  function wrapBrowserDialogs() {
    if (window.__figureLoomBrandDialogsWrapped) return;
    window.__figureLoomBrandDialogsWrapped = true;
    const baseAlert = window.alert?.bind(window);
    const baseConfirm = window.confirm?.bind(window);
    const basePrompt = window.prompt?.bind(window);
    if (baseAlert) window.alert = message => baseAlert(replaceVisibleBrand(message));
    if (baseConfirm) window.confirm = message => baseConfirm(replaceVisibleBrand(message));
    if (basePrompt) window.prompt = (message, defaultValue) => basePrompt(replaceVisibleBrand(message), defaultValue);
  }

  function installDownloadCompatibility() {
    const prototype = window.HTMLAnchorElement?.prototype;
    if (!prototype || prototype.__figureLoomDownloadBranding) return;
    const baseClick = prototype.click;
    Object.defineProperty(prototype, '__figureLoomDownloadBranding', { value:true });
    prototype.click = function figureLoomBrandedDownloadClick(...args) {
      if (this.download && /scicanvas/i.test(this.download)) {
        this.download = replaceVisibleBrand(this.download);
      }
      return baseClick.apply(this, args);
    };
  }

  function refresh() {
    cleanHead();
    cleanSubtree(document.body);
  }

  function init() {
    wrapBrowserDialogs();
    installDownloadCompatibility();
    installObserver();
    refresh();
    requestAnimationFrame(refresh);
    setTimeout(refresh, 250);
    setTimeout(refresh, 1000);
    window.FigureLoomVisibleBranding = Object.freeze({
      refresh,
      replace:replaceVisibleBrand,
      isUserContent
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();