(() => {
  'use strict';

  if (window.FigureLoomBioFlowLoading) return;

  const parts = [0, 1, 2, 3, 4].map(
    (number) => `./ide-control-flow-runtime.part${String(number).padStart(2, '0')}?v=5`,
  );

  async function fetchPart(url) {
    let lastError = null;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const response = await fetch(url, { cache:'no-store' });
        if (!response.ok) throw new Error(`Could not load ${url} (${response.status})`);
        return await response.text();
      } catch (error) {
        lastError = error;
        if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 250));
      }
    }
    throw lastError || new Error(`Could not load ${url}`);
  }

  function applyCoreLanguageSupport(source) {
    const edits = [
      [
        "else if(m=t.match(/^Otherwise(?:,)? if (.+):$/i))",
        "else if(m=t.match(/^(?:Else|Otherwise)(?:,)? if (.+):$/i))",
      ],
      [
        "else if(/^Otherwise:$/i.test(t))",
        "else if(/^(?:Else|Otherwise):$/i.test(t))",
      ],
      [
        "function cond(q,c,l){let a=",
        "function cond(q,c,l){q=String(q).trim();if(/^true$/i.test(q))return true;if(/^false$/i.test(q))return false;let a=",
      ],
      [
        "else c.data.records=c.data.records.filter(x=>x.sequence.length>=q);return}",
        "else{let r=c.data?.records;if(!Array.isArray(r))throw new X('This instruction needs an open FASTA or FASTQ file.',n.l);c.data.records=r.filter(x=>x.sequence.length>=q)}return}",
      ],
      [
        "if(m=t.match(/^Show a warning(?: saying (.+))?$/i))",
        "if(m=t.match(/^(?:Show a warning(?: saying)?|Warning|Warn)(?:(?::|\\s)+(.+))?$/i))",
      ],
    ];

    let patched = source;
    for (const [before, after] of edits) {
      if (!patched.includes(before)) {
        throw new Error(`The FigureLoom Bio browser runtime is missing a required language hook: ${before}`);
      }
      patched = patched.replace(before, after);
    }
    return patched;
  }

  window.FigureLoomBioFlowLoading = Promise.all(parts.map(fetchPart))
    .then((sources) => {
      const existing = document.getElementById('figureloomBioControlFlowCombined');
      if (existing) existing.remove();
      const script = document.createElement('script');
      script.id = 'figureloomBioControlFlowCombined';
      script.textContent = applyCoreLanguageSupport(sources.join(''));
      document.head.append(script);
      if (!window.FigureLoomBioFlow) {
        throw new Error('The FigureLoom Bio decision runtime loaded without starting.');
      }
      window.dispatchEvent(new CustomEvent('figureloom-bio-flow-ready'));
      return window.FigureLoomBioFlow;
    })
    .catch((error) => {
      console.error('Could not load FigureLoom Bio decisions', error);
      const status = document.getElementById('runStatus');
      if (status) {
        status.textContent = 'Decision tools did not load';
        status.className = 'status-pill error';
      }
      throw error;
    });

  window.FigureLoomBioCoreRuntimePatches = Object.freeze({ applyCoreLanguageSupport });
})();
