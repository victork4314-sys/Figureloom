(() => {
  if (window.__figureLoomHonestDrafts) return;
  window.__figureLoomHonestDrafts = true;

  const drawer = document.getElementById('figureAssistantDrawer');
  const shell = drawer?.querySelector('.figureloom-chat-shell');
  const messages = shell?.querySelector('#figureloomChatMessages');
  if (!drawer || !shell || !messages) return;

  const honestNote = 'This is a generated starting draft. Review and edit the layout, labels, and scientific details before using it.';
  const claimPattern = /\b(?:publication|journal|submission|camera)[ -]?(?:ready|quality|grade|style)\b|\bready for (?:publication|submission|a journal)\b|\bprofessional[ -]?(?:quality|grade)\b|\bpolished final\b/gi;
  const quotaPattern = /quota|rate limit|too many requests|resource exhausted|daily limit|shared requests?|request limit|usage limit|limit exceeded|exceeded.*limit|429/i;

  function selectedSource() {
    return shell.querySelector('.figureloom-chat-source.active')?.dataset.source || 'gemini';
  }

  function latestRequestTarget() {
    const labels = [...messages.querySelectorAll('.figureloom-chat-message.user > small')];
    return labels.at(-1)?.textContent || '';
  }

  function requestWasGemini() {
    return selectedSource() === 'gemini' && /to Gemini/i.test(latestRequestTarget());
  }

  function honestText(text) {
    const original = String(text || '');
    if (!claimPattern.test(original)) {
      claimPattern.lastIndex = 0;
      return original;
    }
    claimPattern.lastIndex = 0;
    const chunks = original
      .split(/(?<=[.!?])\s+|\n{2,}/)
      .map(part => part.trim())
      .filter(Boolean)
      .filter(part => {
        claimPattern.lastIndex = 0;
        return !claimPattern.test(part);
      });
    claimPattern.lastIndex = 0;
    const cleaned = chunks.join('\n\n').trim();
    return cleaned ? `${cleaned}\n\n${honestNote}` : honestNote;
  }

  function cleanAssistantClaims() {
    messages.querySelectorAll('.figureloom-chat-message.assistant .figureloom-chat-bubble p').forEach(paragraph => {
      const next = honestText(paragraph.textContent);
      if (next !== paragraph.textContent) paragraph.textContent = next;
    });
  }

  function clearWrongQuotaErrors() {
    if (requestWasGemini()) return;
    messages.querySelectorAll('.figureloom-chat-quota').forEach(line => line.remove());
    messages.querySelectorAll('.figureloom-chat-message.error').forEach(article => {
      if (quotaPattern.test(article.textContent || '')) article.remove();
    });
  }

  function applyHonestUi() {
    const subtitle = drawer.querySelector('.utility-head span');
    const safety = shell.querySelector('.figureloom-chat-safety');
    if (subtitle) subtitle.textContent = 'An optional helper for making a starting draft';
    if (safety) safety.textContent = 'Loomy makes editable starting drafts, not finished figures. Check and edit the layout, wording, illustrations, and scientific details yourself. Shared quota is used only when you deliberately send with Gemini; Puter and Builder never use it.';
    cleanAssistantClaims();
    clearWrongQuotaErrors();
  }

  const observer = new MutationObserver(applyHonestUi);
  observer.observe(messages, { childList:true, subtree:true, characterData:true });
  shell.querySelector('.figureloom-chat-sources')?.addEventListener('click', () => {
    window.setTimeout(applyHonestUi, 0);
    window.setTimeout(applyHonestUi, 450);
  }, true);

  applyHonestUi();
  window.addEventListener('beforeunload', () => observer.disconnect());
})();
