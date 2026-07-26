(() => {
  'use strict';

  const editor = document.getElementById('programEditor');
  const highlight = document.getElementById('syntaxHighlight');
  const activeFile = document.getElementById('activeFileLabel');
  if (!editor || !highlight || !activeFile) return;

  const COMMAND_WORDS = new Set([
    'open','save','show','say','keep','remove','replace','rename','put','combine','count','calculate',
    'check','prepare','trim','convert','find','translate','compare','assemble','annotate','identify',
    'make','call','create','use','sort','filter','merge','split','export','import','read','write','select',
    'group','join','reverse-complement','run','repeat','stop','continue','warn','summarize','describe',
    'extract','detect','inspect','test','retain','drop','exclude','plot','total','label'
  ]);
  const CONTROL_WORDS = new Set([
    'if','otherwise','else','when','while','until','for','each','times','true','false','and','or','not','then'
  ]);
  const STRUCTURE_WORDS = new Set([
    'the','a','an','only','all','with','without','of','in','on','at','from','to','into','as','by','under',
    'using','between','than','least','most','more','less','first','last','before','after','through','per'
  ]);
  const FIELD_PREPOSITIONS = new Set(['under','by','using','between','into','as','from','in','with']);
  const FILE_PATTERN = /(?:^|[/\\])[A-Za-z0-9_.-]+\.(?:flbio|csv|tsv|txt|fa|fasta|fna|ffn|faa|frn|fq|fastq|sam|bam|vcf|gff|gff3|gtf|bed|gb|gbk|svg|png|jpg|jpeg|json|yaml|yml)$/i;

  const escapeHtml = (value) => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  function languageApi() {
    return window.FigureLoomBioSemanticLanguage;
  }

  function acceptedProgram(source) {
    const language = languageApi();
    if (!language?.parseProgram) return false;
    try {
      language.parseProgram(String(source));
      return true;
    } catch {
      return false;
    }
  }

  function acceptedSentence(sentence) {
    const text = String(sentence).trim();
    if (!text) return false;
    return acceptedProgram(text);
  }

  function lineIsStructurallyValid(line, wholeProgramAccepted) {
    const text = String(line).trim();
    if (!text || text.startsWith('#')) return true;
    if (wholeProgramAccepted) return true;
    if (/^(?:otherwise|else)\s*:\s*$/i.test(text)) return true;
    if (/^(?:if|when|while|until|for each|for every|repeat)\b.*:\s*$/i.test(text)) return true;
    return acceptedSentence(text);
  }

  function tokenClass(token, previousWord, wordIndex) {
    const lower = token.toLowerCase();
    if (CONTROL_WORDS.has(lower)) return 'syntax-field';
    if (wordIndex === 0 || COMMAND_WORDS.has(lower)) return 'syntax-command';
    if (FILE_PATTERN.test(token) || /\.(?:csv|tsv|fastq|fq|fasta|fa|fna|bam|sam|vcf|gff3?|gtf|bed|svg)$/i.test(token)) return 'syntax-file';
    if (/^-?\d+(?:\.\d+)?$/.test(token) || /^(?:true|false|yes|no)$/i.test(token)) return 'syntax-value';
    if (FIELD_PREPOSITIONS.has(previousWord)) return 'syntax-field';
    if (STRUCTURE_WORDS.has(lower)) return 'syntax-word';
    if (/^[ACGTUNRYKMSWBDHV-]{3,}$/i.test(token)) return 'syntax-value';
    return 'syntax-value';
  }

  function paintLine(raw, valid) {
    if (!raw) return '';
    const trimmed = raw.trimStart();
    if (trimmed.startsWith('#')) {
      const leading = raw.slice(0, raw.length - trimmed.length);
      return `${escapeHtml(leading)}<span class="syntax-comment">${escapeHtml(trimmed)}</span>`;
    }
    if (!valid) return `<span class="syntax-invalid">${escapeHtml(raw)}</span>`;

    const tokens = raw.match(/\s+|(?:[A-Za-z0-9_.\\/-]+\.(?:flbio|csv|tsv|txt|fa|fasta|fna|ffn|faa|frn|fq|fastq|sam|bam|vcf|gff|gff3|gtf|bed|gb|gbk|svg|png|jpg|jpeg|json|yaml|yml))|[A-Za-z_][A-Za-z0-9_-]*|-?\d+(?:\.\d+)?|[:.,()[\]]|./g) || [];
    let previousWord = '';
    let wordIndex = 0;
    return tokens.map((token) => {
      if (/^\s+$/.test(token)) return escapeHtml(token);
      if (/^[:.,()[\]]$/.test(token)) return `<span class="syntax-punctuation">${escapeHtml(token)}</span>`;
      if (!/^[A-Za-z0-9_.\\/-]+$/.test(token)) return escapeHtml(token);
      const className = tokenClass(token, previousWord, wordIndex);
      previousWord = token.toLowerCase();
      wordIndex += 1;
      return `<span class="${className}">${escapeHtml(token)}</span>`;
    }).join('');
  }

  let scheduled = false;
  function repaint() {
    scheduled = false;
    if (!/\.flbio(?:\.txt)?$/i.test(activeFile.textContent.trim())) return;
    const source = editor.value;
    const wholeProgramAccepted = acceptedProgram(source);
    const painted = source.split('\n').map((line) => paintLine(line, lineIsStructurallyValid(line, wholeProgramAccepted))).join('\n');
    if (highlight.innerHTML !== painted) highlight.innerHTML = painted;
    highlight.scrollTop = editor.scrollTop;
    highlight.scrollLeft = editor.scrollLeft;
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(repaint);
  }

  editor.addEventListener('input', schedule);
  editor.addEventListener('scroll', schedule);
  window.addEventListener('figureloom-bio-semantic-language-ready', schedule);
  window.addEventListener('figureloom-bio-semantic-run-requested', schedule);
  new MutationObserver(schedule).observe(activeFile, { childList:true, subtree:true, characterData:true });
  new MutationObserver(schedule).observe(highlight, { childList:true, subtree:true, characterData:true });

  window.FigureLoomBioGrammar = Object.freeze({
    acceptsSentence:acceptedSentence,
    acceptsProgram:acceptedProgram,
    repaint:schedule,
  });
  schedule();
})();
