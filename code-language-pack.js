(() => {
  if (window.__figureLoomCodeLanguagePackV1) return;
  window.__figureLoomCodeLanguagePackV1 = true;

  const GROUPS = [
    ['Popular', [
      ['plain','Plain text'], ['python','Python'], ['javascript','JavaScript'], ['typescript','TypeScript'],
      ['html','HTML'], ['css','CSS'], ['sql','SQL'], ['bash','Bash / Shell'], ['json','JSON'], ['yaml','YAML']
    ]],
    ['Web & app', [
      ['jsx','JSX'], ['tsx','TSX'], ['vue','Vue'], ['svelte','Svelte'], ['astro','Astro'],
      ['php','PHP'], ['ruby','Ruby'], ['dart','Dart'], ['scss','SCSS'], ['sass','Sass'],
      ['less','Less'], ['graphql','GraphQL'], ['mdx','MDX']
    ]],
    ['Systems & native', [
      ['c','C'], ['cpp','C++'], ['csharp','C#'], ['rust','Rust'], ['go','Go'], ['zig','Zig'],
      ['swift','Swift'], ['objectivec','Objective-C'], ['assembly','Assembly'], ['wasm','WebAssembly text'],
      ['cuda','CUDA'], ['opencl','OpenCL'], ['arduino','Arduino']
    ]],
    ['JVM, .NET & functional', [
      ['java','Java'], ['kotlin','Kotlin'], ['scala','Scala'], ['groovy','Groovy'], ['clojure','Clojure'],
      ['fsharp','F#'], ['vbnet','Visual Basic .NET'], ['haskell','Haskell'], ['ocaml','OCaml'],
      ['elm','Elm'], ['purescript','PureScript'], ['commonlisp','Common Lisp'], ['scheme','Scheme'], ['racket','Racket']
    ]],
    ['Scripting & automation', [
      ['powershell','PowerShell'], ['batch','Windows Batch'], ['zsh','Zsh'], ['fish','Fish'],
      ['perl','Perl'], ['lua','Lua'], ['tcl','Tcl'], ['coffeescript','CoffeeScript'],
      ['elixir','Elixir'], ['erlang','Erlang']
    ]],
    ['Data, science & research', [
      ['r','R'], ['julia','Julia'], ['matlab','MATLAB'], ['wolfram','Wolfram Language'],
      ['sas','SAS'], ['stata','Stata'], ['spss','SPSS Syntax'], ['fortran','Fortran'],
      ['nextflow','Nextflow'], ['snakemake','Snakemake'], ['cython','Cython']
    ]],
    ['Databases & queries', [
      ['plsql','PL/SQL'], ['tsql','T-SQL'], ['postgresql','PostgreSQL'], ['mysql','MySQL'],
      ['sqlite','SQLite'], ['cypher','Cypher'], ['sparql','SPARQL'], ['promql','PromQL']
    ]],
    ['Config, build & infrastructure', [
      ['json5','JSON5'], ['toml','TOML'], ['ini','INI'], ['xml','XML'], ['svg','SVG'],
      ['dockerfile','Dockerfile'], ['makefile','Makefile'], ['cmake','CMake'], ['gradle','Gradle'],
      ['terraform','Terraform / HCL'], ['nix','Nix'], ['nginx','Nginx'], ['apache','Apache config'],
      ['kubernetes','Kubernetes YAML'], ['ansible','Ansible'], ['githubactions','GitHub Actions'],
      ['gitlabci','GitLab CI']
    ]],
    ['Docs & diagrams', [
      ['markdown','Markdown'], ['latex','LaTeX'], ['bibtex','BibTeX'], ['rst','reStructuredText'],
      ['asciidoc','AsciiDoc'], ['mermaid','Mermaid'], ['plantuml','PlantUML']
    ]],
    ['Hardware, games & smart contracts', [
      ['verilog','Verilog'], ['systemverilog','SystemVerilog'], ['vhdl','VHDL'],
      ['gdscript','GDScript'], ['solidity','Solidity'], ['move','Move'], ['vyper','Vyper']
    ]]
  ];

  const ALIASES = {
    typescript:'javascript', jsx:'javascript', tsx:'javascript', purescript:'javascript', coffeescript:'javascript',
    vue:'html', svelte:'html', astro:'html', mdx:'html', xml:'html', svg:'html',
    scss:'css', sass:'css', less:'css',
    c:'cpp', csharp:'java', rust:'cpp', go:'cpp', zig:'cpp', swift:'cpp', objectivec:'cpp',
    assembly:'cpp', wasm:'cpp', cuda:'cpp', opencl:'cpp', arduino:'cpp',
    kotlin:'java', scala:'java', groovy:'java', fsharp:'cpp', vbnet:'cpp',
    powershell:'yaml', perl:'yaml', tcl:'yaml', elixir:'yaml',
    zsh:'bash', fish:'bash', batch:'bash',
    ruby:'python', cython:'python', snakemake:'python', gdscript:'python', vyper:'python',
    lua:'sql', haskell:'sql', plsql:'sql', tsql:'sql', postgresql:'sql', mysql:'sql',
    sqlite:'sql', cypher:'sql', sparql:'sql', promql:'sql',
    json5:'json', toml:'yaml', ini:'yaml', dockerfile:'yaml', makefile:'yaml', cmake:'yaml',
    terraform:'yaml', nix:'yaml', nginx:'yaml', apache:'yaml', kubernetes:'yaml',
    ansible:'yaml', githubactions:'yaml', gitlabci:'yaml', nextflow:'groovy',
    solidity:'cpp', move:'cpp', verilog:'cpp', systemverilog:'cpp', vhdl:'cpp',
    markdown:'plain', latex:'plain', bibtex:'plain', rst:'plain', asciidoc:'plain',
    mermaid:'plain', plantuml:'plain', wolfram:'plain', sas:'plain', stata:'plain',
    spss:'plain', fortran:'plain', erlang:'plain', ocaml:'plain', elm:'plain',
    commonlisp:'plain', scheme:'plain', racket:'plain', clojure:'plain'
  };

  const ALL_LANGUAGES = GROUPS.flatMap(([, entries]) => entries);
  const LABELS = new Map(ALL_LANGUAGES);

  function enhanceSelect() {
    const select = document.getElementById('proCodeLanguage');
    if (!select || select.dataset.languagePack === '1') return false;
    const selected = select.value;
    select.replaceChildren();
    GROUPS.forEach(([label, entries]) => {
      const group = document.createElement('optgroup');
      group.label = label;
      entries.forEach(([value, text]) => group.appendChild(new Option(text, value)));
      select.appendChild(group);
    });
    if (selected && LABELS.has(selected)) select.value = selected;
    select.dataset.languagePack = '1';
    return true;
  }

  function patchRenderer() {
    if (window.__figureLoomCodeLanguageRendererV1 || typeof renderObject !== 'function') return;
    window.__figureLoomCodeLanguageRendererV1 = true;
    const baseRenderObject = renderObject;
    renderObject = function renderObjectWithExpandedCodeLanguages(item) {
      if (item?.type !== 'code') return baseRenderObject(item);
      const originalLanguage = item.language;
      const alias = ALIASES[originalLanguage];
      if (!alias || alias === originalLanguage) return baseRenderObject(item);

      const originalTitle = item.codeTitle;
      item.language = alias;
      if (!originalTitle) item.codeTitle = LABELS.get(originalLanguage) || 'Code';
      try {
        return baseRenderObject(item);
      } finally {
        item.language = originalLanguage;
        item.codeTitle = originalTitle;
      }
    };
    window.renderObject = renderObject;
  }

  function install() {
    const api = window.FigureLoomCodeWindows;
    if (!api?.languages) {
      setTimeout(install, 40);
      return;
    }

    api.languages.splice(0, api.languages.length, ...ALL_LANGUAGES);
    api.languageGroups = GROUPS;
    api.languageAliases = ALIASES;
    patchRenderer();

    if (enhanceSelect()) return;
    const observer = new MutationObserver(() => {
      if (enhanceSelect()) observer.disconnect();
    });
    observer.observe(document.body, { childList:true, subtree:true });
    setTimeout(() => observer.disconnect(), 12000);
  }

  window.FigureLoomCodeLanguagePack = { groups:GROUPS, languages:ALL_LANGUAGES, aliases:ALIASES };
  install();
})();