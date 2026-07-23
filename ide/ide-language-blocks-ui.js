(() => {
  'use strict';

  const editor = document.getElementById('programEditor');
  const blocksButton = document.getElementById('blocksButton');
  const dialog = document.getElementById('blockEditor');
  if (!editor || !blocksButton || !dialog || !window.FigureLoomBioLanguageReady) return;

  const palette = dialog.querySelector('#blocksPaletteList');
  const workspace = dialog.querySelector('#blocksWorkspace');
  const reload = dialog.querySelector('#blocksReload');
  if (!palette || !reload) return;

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
    find_variants:'variants', show_variants:'variants', find_genes:'genes', show_genes:'genes',
    find_signal_peptides:'proteins', find_transmembrane_regions:'proteins',
    find_pcr_primers:'pcr', check_primers:'pcr', show_primers:'pcr',
    build_phylogenetic_tree:'phylogenetics', show_tree:'phylogenetics',
    summary_statistic:'statistics', calculate_minimum:'statistics', calculate_maximum:'statistics',
    normalize_counts:'statistics', compare_groups:'statistics', permutation_p_value:'statistics',
    histogram:'figures', create_histogram:'figures', bar_chart:'figures', create_bar_chart:'figures',
    scatter_plot:'figures', create_scatter_plot:'figures', grouped_box_plot:'figures', box_plot:'figures',
    heat_map_columns:'figures', heat_map:'figures', pca_plot:'figures', volcano_plot:'figures',
  });

  function sourceFor(command) {
    const completeBlocks = {
      if_header:'If the result is not empty:\n    Say The condition matched.',
      otherwise_if_header:'If the result is empty:\n    Say No result was found.\nOtherwise if the result is not empty:\n    Say A result was found.',
      otherwise_header:'If the result is empty:\n    Say No result was found.\nOtherwise:\n    Say A result was found.',
      for_every_header:'Open all FASTQ files as samples.\n\nFor every sample in samples:\n    Open the sample.',
      recipe_header:'Make a recipe called Clean reads:\n    Check the quality.\n\nUse the recipe Clean reads.',
    };
    return completeBlocks[command.id] || command.example;
  }

  function appendSource(source) {
    const before = editor.value.replace(/\s*$/, '');
    editor.value = before ? `${before}\n${source}\n` : `${source}\n`;
    editor.selectionStart = editor.selectionEnd = editor.value.length;
    editor.dispatchEvent(new Event('input', { bubbles:true }));
    reload.click();
    workspace?.lastElementChild?.scrollIntoView?.({ block:'nearest', behavior:'smooth' });
  }

  function categoryClass(themeId) {
    return `category-${String(themeId).replace(/[^a-z0-9-]/gi, '-').toLowerCase()}`;
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
          acceptedForm:true,
        }));
      }
    }
    return output;
  }

  function commandsFor(themeId) {
    return [...manifest.commands, ...aliases].filter((command) => command.theme === themeId);
  }

  function renderPalette() {
    if (!manifest) return;
    palette.replaceChildren();
    for (const theme of manifest.themes) {
      const commands = commandsFor(theme.id);
      if (!commands.length) continue;
      const section = document.createElement('section');
      section.className = 'blocks-palette-group';
      section.dataset.category = theme.id;
      const heading = document.createElement('h3');
      heading.textContent = theme.title;
      section.append(heading);

      for (const command of commands) {
        const add = document.createElement('button');
        add.type = 'button';
        add.className = `palette-block ${categoryClass(theme.id)}`;
        add.dataset.languageCommand = command.id;
        if (command.acceptedForm) add.dataset.acceptedWording = 'true';
        add.dataset.search = `${theme.title} ${command.id} ${command.example} ${command.acceptedForm ? 'accepted wording natural synonym' : 'canonical'}`.toLowerCase();
        add.textContent = command.example.replace(/[.:]$/, '');
        add.title = command.acceptedForm ? `Accepted wording: ${command.example}` : command.example;
        add.addEventListener('click', () => appendSource(sourceFor(command)));
        section.append(add);
      }
      palette.append(section);
    }
    palette.dataset.canonicalLanguageCatalog = 'true';
    if (aliases.length) palette.dataset.exhaustiveLanguageVocabulary = 'true';
  }

  blocksButton.addEventListener('click', () => queueMicrotask(renderPalette));
  window.FigureLoomBioLanguageReady.then((loaded) => {
    manifest = loaded;
    renderPalette();
  });

  const aliasReady = window.FigureLoomBioLanguageAliasesReady;
  if (aliasReady) {
    aliasReady.then((api) => {
      aliases = aliasCommands(api);
      renderPalette();
    });
  }
})();
