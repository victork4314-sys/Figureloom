(() => {
  if (window.__figureLoomHostedWikiMcpV1) return;
  window.__figureLoomHostedWikiMcpV1 = true;

  const SLUG = 'MCP-and-AI-Access';
  const TITLE = 'MCP and AI access';
  const GROUP = 'Projects and files';
  const content = document.getElementById('wikiContent');
  const nav = document.getElementById('wikiNav');
  const toc = document.getElementById('wikiToc');
  const navigation = document.getElementById('wikiNavigation');
  const navToggle = document.getElementById('wikiNavToggle');
  const errorBox = document.getElementById('wikiError');
  let rendering = false;
  let queued = false;

  function currentSlug() {
    return decodeURIComponent(location.hash.replace(/^#/, '')).split(':')[0];
  }

  function isMcpRoute() {
    return currentSlug().toLowerCase() === SLUG.toLowerCase();
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
    })[character]);
  }

  function safeUrl(raw) {
    const value = String(raw || '').trim();
    if (/^(https?:|mailto:|tel:|\/|\.\/|\.\.\/|#)/i.test(value)) return value;
    return `#${value.replace(/\.md$/i, '')}`;
  }

  function inline(text) {
    const codeTokens = [];
    let output = escapeHtml(text).replace(/`([^`]+)`/g, (_, code) => {
      const token = `@@CODE${codeTokens.length}@@`;
      codeTokens.push(`<code>${code}</code>`);
      return token;
    });
    output = output.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => `<img src="${escapeHtml(safeUrl(url))}" alt="${alt}" loading="lazy">`);
    output = output.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
      const href = safeUrl(url);
      const external = /^https?:/i.test(href);
      return `<a href="${escapeHtml(href)}"${external ? ' target="_blank" rel="noreferrer"' : ''}>${label}</a>`;
    });
    output = output.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    output = output.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    output = output.replace(/(^|\s)\*([^*]+)\*/g, '$1<em>$2</em>');
    output = output.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    codeTokens.forEach((code, index) => { output = output.replace(`@@CODE${index}@@`, code); });
    return output;
  }

  function slugify(value) {
    return value.toLowerCase().replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section';
  }

  function renderMarkdown(markdown) {
    const lines = String(markdown || '').replace(/\r/g, '').split('\n');
    const output = [];
    const usedIds = new Map();
    let index = 0;

    function headingId(text) {
      const base = slugify(text);
      const count = usedIds.get(base) || 0;
      usedIds.set(base, count + 1);
      return count ? `${base}-${count + 1}` : base;
    }

    function isBlockStart(line, next = '') {
      return /^#{1,6}\s/.test(line) || /^```/.test(line) || /^>\s?/.test(line) || /^[-*+]\s+/.test(line) || /^\d+\.\s+/.test(line) || /^---+$/.test(line.trim()) || (/^\|/.test(line.trim()) && /^\|?\s*:?-+/.test(next.trim()));
    }

    while (index < lines.length) {
      const line = lines[index];
      const trimmed = line.trim();
      if (!trimmed) { index += 1; continue; }

      const fence = trimmed.match(/^```([^`]*)$/);
      if (fence) {
        const language = fence[1].trim();
        const code = [];
        index += 1;
        while (index < lines.length && !/^```/.test(lines[index].trim())) code.push(lines[index++]);
        index += 1;
        output.push(`<pre${language ? ` data-language="${escapeHtml(language)}"` : ''}><code>${escapeHtml(code.join('\n'))}</code></pre>`);
        continue;
      }

      const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
      if (heading) {
        const level = heading[1].length;
        const title = heading[2].replace(/\s+#+$/, '').trim();
        output.push(`<h${level} id="${headingId(title)}">${inline(title)}</h${level}>`);
        index += 1;
        continue;
      }

      if (/^---+$/.test(trimmed)) {
        output.push('<hr>');
        index += 1;
        continue;
      }

      if (/^>\s?/.test(trimmed)) {
        const quote = [];
        while (index < lines.length && /^>\s?/.test(lines[index].trim())) quote.push(lines[index++].trim().replace(/^>\s?/, ''));
        output.push(`<blockquote>${inline(quote.join(' '))}</blockquote>`);
        continue;
      }

      if (/^[-*+]\s+/.test(trimmed)) {
        const items = [];
        while (index < lines.length && /^[-*+]\s+/.test(lines[index].trim())) items.push(lines[index++].trim().replace(/^[-*+]\s+/, ''));
        output.push(`<ul>${items.map(item => `<li>${inline(item)}</li>`).join('')}</ul>`);
        continue;
      }

      if (/^\d+\.\s+/.test(trimmed)) {
        const items = [];
        while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) items.push(lines[index++].trim().replace(/^\d+\.\s+/, ''));
        output.push(`<ol>${items.map(item => `<li>${inline(item)}</li>`).join('')}</ol>`);
        continue;
      }

      const paragraph = [trimmed];
      index += 1;
      while (index < lines.length && lines[index].trim() && !isBlockStart(lines[index], lines[index + 1] || '')) paragraph.push(lines[index++].trim());
      output.push(`<p>${inline(paragraph.join(' '))}</p>`);
    }

    return output.join('\n');
  }

  function addNavLink() {
    if (!nav || nav.querySelector(`[data-page="${SLUG}"]`)) return;
    const groups = [...nav.querySelectorAll('.wiki-nav-group')];
    const section = groups.find(group => group.querySelector('strong')?.textContent?.trim() === GROUP);
    if (!section) return;
    const link = document.createElement('a');
    link.className = 'wiki-nav-link';
    link.href = `#${SLUG}`;
    link.dataset.page = SLUG;
    link.textContent = TITLE;
    const accountLink = section.querySelector('[data-page="Accounts-Cloud-and-Collaboration"]');
    accountLink?.insertAdjacentElement('afterend', link) || section.appendChild(link);
  }

  function markActive() {
    document.querySelectorAll('.wiki-nav-link').forEach(link => link.classList.toggle('active', link.dataset.page === SLUG));
  }

  function buildToc() {
    if (!toc || !content) return;
    toc.replaceChildren();
    content.querySelectorAll('h2,h3').forEach(heading => {
      const link = document.createElement('a');
      link.className = `toc-link level-${heading.tagName.slice(1)}`;
      link.href = `#${SLUG}:${heading.id}`;
      link.textContent = heading.textContent;
      link.addEventListener('click', event => {
        event.preventDefault();
        heading.scrollIntoView({ behavior:'smooth', block:'start' });
        history.replaceState(null, '', `#${SLUG}`);
      });
      toc.appendChild(link);
    });
  }

  async function renderPage() {
    if (!isMcpRoute() || !content || rendering) return;
    rendering = true;
    errorBox && (errorBox.hidden = true);
    content.innerHTML = '<div data-figureloom-mcp-page class="article-loading" role="status"><i></i><span>Opening the MCP guide…</span></div>';
    try {
      const response = await fetch(`./${SLUG}.md`, { cache:'no-cache' });
      if (!response.ok) throw new Error(`Could not open ${SLUG}`);
      const markdown = await response.text();
      if (!isMcpRoute()) return;
      content.innerHTML = `<div data-figureloom-mcp-page>${renderMarkdown(markdown)}</div>`;
      content.querySelector('h1 + p')?.classList.add('article-lead');
      const h1 = content.querySelector('h1');
      if (h1) {
        const meta = document.createElement('div');
        meta.className = 'page-meta';
        meta.innerHTML = `<span class="page-chip">${GROUP}</span><span class="page-chip">Desktop · tablet · phone</span>`;
        h1.insertAdjacentElement('afterend', meta);
      }
      document.title = `${TITLE} · FigureLoom Help`;
      markActive();
      buildToc();
      content.focus({ preventScroll:true });
      scrollTo({ top:0, behavior:'instant' });
      navigation?.classList.remove('open');
      navToggle?.setAttribute('aria-expanded', 'false');
    } catch {
      content.innerHTML = '<div data-figureloom-mcp-page><h1>MCP and AI access</h1><p>This guide could not be opened. Reload the help center and try again.</p></div>';
    } finally {
      rendering = false;
    }
  }

  function queueRender() {
    if (!isMcpRoute() || queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      if (!content?.querySelector('[data-figureloom-mcp-page]')) void renderPage();
    });
  }

  document.addEventListener('click', event => {
    const link = event.target.closest?.(`a[href="#${SLUG}"]`);
    if (!link) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    history.pushState(null, '', `#${SLUG}`);
    void renderPage();
  }, true);

  addEventListener('hashchange', () => setTimeout(queueRender, 0));
  addEventListener('popstate', () => setTimeout(queueRender, 0));

  const observer = new MutationObserver(() => {
    addNavLink();
    queueRender();
  });
  if (nav) observer.observe(nav, { childList:true, subtree:true });
  if (content) observer.observe(content, { childList:true, subtree:true });

  addNavLink();
  if (isMcpRoute()) setTimeout(queueRender, 0);
})();
