(() => {
  'use strict';

  const editor = document.getElementById('programEditor');
  const button = document.getElementById('sentenceLibraryButton');
  const dialog = document.getElementById('sentenceLibraryDialog');
  if (!editor || !button || !dialog || !window.FigureLoomBioLanguageReady) return;

  const grid = dialog.querySelector('.addons-grid');
  const search = dialog.querySelector('.addons-search');
  const themeSelect = dialog.querySelector('.addons-theme');
  const count = dialog.querySelector('.addons-installed-count');
  if (!grid || !search || !themeSelect || !count) return;

  let manifest = null;
  let aliases = [];

  const THEME_BY_ACTION = Object.freeze({
    say:'program', show_warning:'program',
    open_file:'files', show_file:'files', show_result:'files', save_file:'files',
    check_file:'files', count_file:'files', copy_file:'files', rename_file:'files',
    keep_rows:'tables', remove_rows:'tables', keep_columns:'tables', order_rows:'tables',
    largest_first:'tables', smallest_first:'tables', remove_duplicates:'tables', replace_empty:'tables',
    keep_min_length:'sequences', remove_shorter:'sequences', keep_strict_length:'sequences',
    find_open_reading_frames:'sequences', find_palindromes:'sequences',
    find_repeated_sequences:'sequences', join_sequences:'sequences',
    compare_current_sequences:'alignment', show_alignment:'alignment',
    read_statistic:'fastq', check_quality:'fastq', show_quality_report:'fastq',
    remove_low_quality_default:'fastq', trim_start:'fastq', trim_end:'fastq',
    builtin_microbiology_prepare_reads:'microbiology', assemble_current_bacterial_genome:'microbiology',
    annotate_current_file:'microbiology', find_resistance_current_file:'microbiology',
    find_virulence_current_file:'microbiology', identify_current_file:'microbiology',
    find_plasmids_current_file:'microbiology',
    find_variants:'variants', show_variants:'variants',
    find_genes:'genes', show_genes:'genes',
    find_signal_peptides:'proteins', find_transmembrane_regions:'proteins',
    find_pcr_primers:'pcr', check_primers:'pcr', show_primers:'pcr',
    build_phylogenetic_tree:'phylogenetics', show_tree:'phylogenetics',
    summary_statistic:'statistics', calculate_minimum:'statistics', calculate_maximum:'statistics',
    normalize_counts:'statistics', compare_groups:'statistics', permutation_p_value:'statistics',
    histogram:'figures', create_histogram:'figures', bar_chart:'figures', create_bar_chart:'figures',
    scatter_plot:'figures', create_scatter_plot:'figures', grouped_box_plot:'figures', box_plot:'figures',
    heat_map_columns:'figures', heat_map:'figures', pca_plot:'figures', volcano_plot:'figures',
  });

  function insertSource(source) {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const before = editor.value.slice(0, start);
    const after = editor.value.slice(end);
    const prefix = before && !before.endsWith('\n') ? '\n' : '';
    const suffix = after && !after.startsWith('\n') ? '\n' : '';
    const inserted = `${prefix}${source}${suffix}`;
    editor.value = `${before}${inserted}${after}`;
    const cursor = before.length + inserted.length;
    editor.setSelectionRange(cursor, cursor);
    editor.dispatchEvent(new Event('input', { bubbles:true }));
    editor.focus();
  }

  function themeTitle(themeId) {
    return manifest.themes.find((theme) => theme.id === themeId)?.title || themeId;
  }

  function icon(themeId) {
    return ({
      program:'▶', files:'📁', tables:'▦', sequences:'🧬', fastq:'≋',
      microbiology:'🦠', alignment:'⇄', variants:'◇', genes:'⌁', proteins:'∿',
      pcr:'◎', phylogenetics:'⑂', statistics:'∑', figures:'▥', decisions:'◆', tools:'⌘',
    })[themeId] || '•';
  }

  function refreshThemes() {
    const current = themeSelect.value;
    themeSelect.replaceChildren(new Option('All themes', ''));
    for (const theme of manifest.themes) themeSelect.append(new Option(theme.title, theme.id));
    if (manifest.themes.some((theme) => theme.id === current)) themeSelect.value = current;
  }

  function aliasCommands(api) {
    const canonical = new Set(manifest.commands.map((command) => command.example.toLowerCase()));
    const output = [];
    for (const rule of api.rules) {
      const theme = THEME_BY_ACTION[rule.action] || 'program';
      for (const [index, example] of (rule.examples || []).entries()) {
        if (canonical.has(String(example).toLowerCase())) continue;
        output.push(Object.freeze({
          id:`wording-${rule.id}-${index + 1}`,
          theme,
          example:String(example),
          aliasRule:rule.id,
          acceptedForm:true,
        }));
      }
    }
    return output;
  }

  function commands() {
    return manifest ? [...manifest.commands, ...aliases] : [];
  }

  function render() {
    if (!manifest) return;
    const wanted = search.value.trim().toLowerCase();
    const selectedTheme = themeSelect.value;
    const all = commands();
    const visible = all.filter((command) => {
      if (selectedTheme && command.theme !== selectedTheme) return false;
      const wording = command.acceptedForm ? 'accepted wording natural words synonym' : 'canonical';
      const haystack = `${command.id} ${themeTitle(command.theme)} ${command.example} ${wording}`.toLowerCase();
      return !wanted || haystack.includes(wanted);
    });

    grid.replaceChildren();
    for (const command of visible) {
      const card = document.createElement('article');
      card.className = 'addon-card sentence-card';
      card.dataset.languageCommand = command.id;
      if (command.acceptedForm) card.dataset.acceptedWording = 'true';
      card.innerHTML = '<div class="addon-card-icon" aria-hidden="true"></div><div class="addon-card-copy"><div class="addon-card-title"><h3></h3><code></code></div><p></p><div class="addon-card-meta"><span></span></div></div>';
      card.querySelector('.addon-card-icon').textContent = icon(command.theme);
      card.querySelector('h3').textContent = command.example.replace(/[.:]$/, '');
      card.querySelector('code').textContent = themeTitle(command.theme);
      card.querySelector('p').textContent = command.example;
      card.querySelector('.addon-card-meta span').textContent = command.acceptedForm ? 'Accepted wording' : 'Included';
      const add = document.createElement('button');
      add.type = 'button';
      add.textContent = 'Add';
      add.addEventListener('click', () => {
        insertSource(command.example);
        add.textContent = 'Added';
        setTimeout(() => { add.textContent = 'Add'; }, 800);
      });
      card.append(add);
      grid.append(card);
    }

    if (!visible.length) {
      const empty = document.createElement('div');
      empty.className = 'addons-empty';
      empty.textContent = 'No built-in sentences match that search.';
      grid.append(empty);
    }
    count.textContent = all.length.toLocaleString();
  }

  function scheduleRender() {
    queueMicrotask(render);
  }

  button.addEventListener('click', scheduleRender);
  search.addEventListener('input', render);
  themeSelect.addEventListener('change', render);

  window.FigureLoomBioLanguageReady.then((loaded) => {
    manifest = loaded;
    refreshThemes();
    render();
    dialog.dataset.canonicalLanguageCatalog = 'true';
  });

  const aliasReady = window.FigureLoomBioLanguageAliasesReady;
  if (aliasReady) {
    aliasReady.then((api) => {
      aliases = aliasCommands(api);
      render();
      dialog.dataset.exhaustiveLanguageVocabulary = 'true';
    });
  }
})();
