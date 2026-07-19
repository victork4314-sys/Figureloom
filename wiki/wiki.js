(() => {
  const pages = [
    ['Start','Home','Manual home'],
    ['Start','Start-Here','Start here'],
    ['Start','Visual-Interface-Guide','Visual interface guide'],
    ['Start','Quick-Task-Guides','Quick task guides'],
    ['Editor basics','Interface-and-Navigation','Interface and navigation'],
    ['Editor basics','Phone-and-Tablet','Phone and tablet'],
    ['Editor basics','Projects-Saving-and-Recovery','Projects, saving, and recovery'],
    ['Editor basics','Canvas-Pages-and-Layers','Canvas, pages, and layers'],
    ['Editor basics','Text-Shapes-Arrows-and-Connectors','Text, shapes, arrows, and connectors'],
    ['Editor basics','Images-SVG-and-Uploads','Images, SVG, and uploads'],
    ['Scientific work','Scientific-Illustrations-and-Maps','Scientific illustrations and maps'],
    ['Scientific work','Data-Tables-and-Charts','Data, tables, and charts'],
    ['Scientific work','Equations-Code-and-Scientific-Notation','Equations, code, and scientific notation'],
    ['Scientific work','Pro-Tools-and-Advanced-Science','Pro Tools and advanced science'],
    ['Scientific work','Review-References-and-Accessibility','Review, references, and accessibility'],
    ['Projects and files','Accounts-Cloud-and-Collaboration','Accounts, cloud, and collaboration'],
    ['Projects and files','Importing-PowerPoint-and-Spreadsheets','Importing PowerPoint and spreadsheets'],
    ['Projects and files','Export-Backup-and-Presentation','Export, backup, and presentation'],
    ['Projects and files','Privacy-Security-and-Offline-Use','Privacy, security, and offline use'],
    ['Help and setup','Loomy','Loomy'],
    ['Help and setup','Keyboard-Shortcuts-and-Touch-Gestures','Shortcuts and touch gestures'],
    ['Help and setup','Tutorials','Complete tutorials'],
    ['Help and setup','Supported-Formats-and-Limitations','Supported formats and limitations'],
    ['Help and setup','Troubleshooting-and-Recovery','Troubleshooting and recovery'],
    ['Help and setup','Self-Hosting-and-Deployment','Self-hosting and deployment'],
    ['Help and setup','FAQ','FAQ']
  ].map(([group,slug,title]) => ({ group, slug, title }));

  const pageMap = new Map(pages.map(page => [page.slug.toLowerCase(), page]));
  const content = document.getElementById('wikiContent');
  const nav = document.getElementById('wikiNav');
  const toc = document.getElementById('wikiToc');
  const search = document.getElementById('wikiSearch');
  const results = document.getElementById('wikiSearchResults');
  const navigation = document.getElementById('wikiNavigation');
  const navToggle = document.getElementById('wikiNavToggle');
  const themeButton = document.getElementById('wikiThemeButton');
  const errorBox = document.getElementById('wikiError');
  const cache = new Map();
  let searchIndexReady = false;

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.figureloomTheme = theme;
    themeButton.textContent = theme === 'dark' ? '☀' : '◐';
    themeButton.title = theme === 'dark' ? 'Use light appearance' : 'Use dark appearance';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#181d1c' : '#0c2e28');
  }

  function initialTheme() {
    try {
      const saved = localStorage.getItem('figureloom-interface-theme-v1');
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {}
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  applyTheme(initialTheme());
  themeButton.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('figureloom-interface-theme-v1', next); } catch {}
    applyTheme(next);
  });

  function buildNav() {
    nav.replaceChildren();
    const groups = new Map();
    pages.forEach(page => {
      if (!groups.has(page.group)) groups.set(page.group, []);
      groups.get(page.group).push(page);
    });
    groups.forEach((items, groupName) => {
      const section = document.createElement('section');
      section.className = 'wiki-nav-group';
      const heading = document.createElement('strong');
      heading.textContent = groupName;
      section.appendChild(heading);
      items.forEach(page => {
        const link = document.createElement('a');
        link.className = 'wiki-nav-link';
        link.href = `#${page.slug}`;
        link.dataset.page = page.slug;
        link.textContent = page.title;
        section.appendChild(link);
      });
      nav.appendChild(section);
    });
  }

  buildNav();

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[character]);
  }

  function safeUrl(raw) {
    const value = String(raw || '').trim();
    if (/^(https?:|mailto:|tel:|\/|\.\/|\.\.\/|#)/i.test(value)) return value;
    return `#${value.replace(/\.md$/i,'')}`;
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
    return value.toLowerCase().replace(/<[^>]+>/g,'').replace(/&[a-z]+;/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'section';
  }

  function renderMarkdown(markdown) {
    const lines = String(markdown || '').replace(/\r/g,'').split('\n');
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
        const title = heading[2].replace(/\s+#+$/,'').trim();
        const id = headingId(title);
        output.push(`<h${level} id="${id}">${inline(title)}</h${level}>`);
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
        while (index < lines.length && /^>\s?/.test(lines[index].trim())) quote.push(lines[index++].trim().replace(/^>\s?/,''));
        output.push(`<blockquote>${inline(quote.join(' '))}</blockquote>`);
        continue;
      }

      if (/^[-*+]\s+/.test(trimmed)) {
        const items = [];
        while (index < lines.length && /^[-*+]\s+/.test(lines[index].trim())) items.push(lines[index++].trim().replace(/^[-*+]\s+/,''));
        output.push(`<ul>${items.map(item => `<li>${inline(item)}</li>`).join('')}</ul>`);
        continue;
      }

      if (/^\d+\.\s+/.test(trimmed)) {
        const items = [];
        while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) items.push(lines[index++].trim().replace(/^\d+\.\s+/,''));
        output.push(`<ol>${items.map(item => `<li>${inline(item)}</li>`).join('')}</ol>`);
        continue;
      }

      if (/^\|/.test(trimmed) && index + 1 < lines.length && /^\|?\s*:?-+/.test(lines[index + 1].trim())) {
        const rows = [];
        const parseRow = row => row.trim().replace(/^\||\|$/g,'').split('|').map(cell => cell.trim());
        const headers = parseRow(lines[index]);
        index += 2;
        while (index < lines.length && /^\|/.test(lines[index].trim())) rows.push(parseRow(lines[index++]));
        output.push(`<table><thead><tr>${headers.map(cell => `<th>${inline(cell)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${headers.map((_, cellIndex) => `<td>${inline(row[cellIndex] || '')}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
        continue;
      }

      const paragraph = [trimmed];
      index += 1;
      while (index < lines.length && lines[index].trim() && !isBlockStart(lines[index], lines[index + 1] || '')) paragraph.push(lines[index++].trim());
      output.push(`<p>${inline(paragraph.join(' '))}</p>`);
    }
    return output.join('\n');
  }

  async function pageText(slug) {
    if (cache.has(slug)) return cache.get(slug);
    const response = await fetch(`./${slug}.md`, { cache:'no-cache' });
    if (!response.ok) throw new Error(`Could not open ${slug}`);
    const text = await response.text();
    cache.set(slug, text);
    return text;
  }

  function currentSlug() {
    const raw = decodeURIComponent(location.hash.replace(/^#/,''));
    return pageMap.get(raw.toLowerCase())?.slug || 'Home';
  }

  function markActive(slug) {
    document.querySelectorAll('.wiki-nav-link').forEach(link => link.classList.toggle('active', link.dataset.page === slug));
  }

  function buildToc() {
    toc.replaceChildren();
    content.querySelectorAll('h2,h3').forEach(heading => {
      const link = document.createElement('a');
      link.className = `toc-link level-${heading.tagName.slice(1)}`;
      link.href = `#${currentSlug()}:${heading.id}`;
      link.textContent = heading.textContent;
      link.addEventListener('click', event => {
        event.preventDefault();
        heading.scrollIntoView({ behavior:'smooth', block:'start' });
        history.replaceState(null,'',`#${currentSlug()}`);
      });
      toc.appendChild(link);
    });
  }

  async function openPage() {
    const slug = currentSlug();
    const page = pageMap.get(slug.toLowerCase()) || pages[0];
    markActive(slug);
    errorBox.hidden = true;
    content.innerHTML = '<div class="article-loading" role="status"><i></i><span>Opening the manual…</span></div>';
    try {
      const markdown = await pageText(slug);
      content.innerHTML = renderMarkdown(markdown);
      const firstParagraph = content.querySelector('h1 + p');
      firstParagraph?.classList.add('article-lead');
      const h1 = content.querySelector('h1');
      if (h1) {
        const meta = document.createElement('div');
        meta.className = 'page-meta';
        meta.innerHTML = `<span class="page-chip">${escapeHtml(page.group)}</span><span class="page-chip">Desktop · tablet · phone</span>`;
        h1.insertAdjacentElement('afterend', meta);
      }
      document.title = `${page.title} · FigureLoom Help`;
      buildToc();
      content.focus({ preventScroll:true });
      scrollTo({ top:0, behavior:'instant' });
      navigation.classList.remove('open');
      navToggle.setAttribute('aria-expanded','false');
    } catch (error) {
      content.innerHTML = '';
      errorBox.hidden = false;
      console.error(error);
    }
  }

  async function buildSearchIndex() {
    if (searchIndexReady) return;
    await Promise.allSettled(pages.map(async page => {
      const text = await pageText(page.slug);
      page.searchText = `${page.title} ${text.replace(/[`#*_|>[\]()]/g,' ')}`.toLowerCase();
      page.preview = text.replace(/[#*`>|\[\]()]/g,' ').replace(/\s+/g,' ').trim().slice(0,180);
    }));
    searchIndexReady = true;
  }

  function showResults(query) {
    const term = query.trim().toLowerCase();
    if (!term) { results.hidden = true; results.replaceChildren(); return; }
    const matches = pages.filter(page => (page.searchText || page.title.toLowerCase()).includes(term)).slice(0,10);
    results.innerHTML = matches.length ? matches.map(page => `<a class="search-result" href="#${page.slug}"><strong>${escapeHtml(page.title)}</strong><span>${escapeHtml(page.preview || page.group)}</span></a>`).join('') : '<div class="search-empty">No matching manual pages yet.</div>';
    results.hidden = false;
  }

  let searchTimer = 0;
  search.addEventListener('focus', () => void buildSearchIndex().then(() => showResults(search.value)));
  search.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => void buildSearchIndex().then(() => showResults(search.value)), 80);
  });
  results.addEventListener('click', () => {
    results.hidden = true;
    search.value = '';
  });

  navToggle.addEventListener('click', () => {
    const open = navigation.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(open));
  });

  document.addEventListener('click', event => {
    if (!event.target.closest('.wiki-search') && !event.target.closest('.search-results')) results.hidden = true;
    if (innerWidth <= 820 && navigation.classList.contains('open') && !event.target.closest('.wiki-navigation') && !event.target.closest('#wikiNavToggle')) {
      navigation.classList.remove('open');
      navToggle.setAttribute('aria-expanded','false');
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '')) {
      event.preventDefault();
      search.focus();
    }
    if (event.key === 'Escape') {
      results.hidden = true;
      navigation.classList.remove('open');
      navToggle.setAttribute('aria-expanded','false');
    }
  });

  addEventListener('hashchange', openPage);
  if (!location.hash) history.replaceState(null,'','#Home');
  void openPage();
  requestIdleCallback?.(() => void buildSearchIndex());
})();
