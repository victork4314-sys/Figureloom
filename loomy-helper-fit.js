(() => {
  if (window.__figureLoomHelperFitV3) return;
  window.__figureLoomHelperFitV3 = true;
  window.__figureLoomHelperFit = true;

  const drawer = document.getElementById('figureAssistantDrawer');
  const shell = drawer?.querySelector('.figureloom-chat-shell');
  const messages = shell?.querySelector('#figureloomChatMessages');
  const sendButton = shell?.querySelector('#figureloomChatSend');
  const input = shell?.querySelector('#figureloomChatInput');
  const builderStatus = drawer?.querySelector('#assistantBuildStatus');
  if (!drawer || !shell || !messages || !sendButton || !input) return;

  const subtitle = drawer.querySelector('.utility-head span');
  const safety = shell.querySelector('.figureloom-chat-safety');
  const assistantButton = document.querySelector('.figure-assistant-button');
  const initialMessage = messages.querySelector('.figureloom-chat-message.assistant .figureloom-chat-bubble p');

  if (subtitle) subtitle.textContent = 'A small optional helper to get your figure started';
  if (assistantButton) assistantButton.title = 'Open Loomy, an optional helper for getting started';
  if (initialMessage && /^Tell Gemini\b/i.test(initialMessage.textContent.trim())) {
    initialMessage.textContent = 'Loomy is a small optional helper for getting a first draft started. Pick Gemini, Puter, or Builder, then edit everything yourself in FigureLoom.';
  }
  if (safety) {
    safety.textContent = 'Loomy only helps you get started. FigureLoom remains a manual editor. Generated drafts open on a new page and cannot delete or replace existing work. Shared quota is used only when you deliberately send with Gemini; Puter and Builder never use it.';
  }

  function selectedSource() {
    return shell.querySelector('.figureloom-chat-source.active')?.dataset.source || 'gemini';
  }

  function clearIrrelevantQuotaNoise() {
    if (selectedSource() === 'gemini') return;
    messages.querySelectorAll('.figureloom-chat-quota').forEach(line => line.remove());
    messages.querySelectorAll('.figureloom-chat-message.error').forEach(article => {
      const text = article.textContent || '';
      if (/daily shared AI limit|shared requests? left|shared Gemini.{0,30}limit|FigureLoom quota|quota (?:was )?reached|reached.{0,20}quota/i.test(text)) article.remove();
    });
  }

  shell.querySelector('.figureloom-chat-sources')?.addEventListener('click', () => {
    window.setTimeout(clearIrrelevantQuotaNoise, 0);
    window.setTimeout(clearIrrelevantQuotaNoise, 350);
  }, true);
  sendButton.addEventListener('click', () => {
    if (selectedSource() === 'gemini') return;
    window.setTimeout(clearIrrelevantQuotaNoise, 0);
    window.setTimeout(clearIrrelevantQuotaNoise, 1200);
  }, true);

  const quotaObserver = new MutationObserver(clearIrrelevantQuotaNoise);
  quotaObserver.observe(messages, { childList:true, subtree:true, characterData:true });

  function appState() {
    if (typeof state !== 'undefined' && state) return state;
    return window.state || null;
  }

  function canvasSize() {
    const value = window.currentCanvasSize?.() || { width:1200, height:750 };
    const width = Number(value.width);
    const height = Number(value.height);
    return {
      width:Number.isFinite(width) && width > 100 ? width : 1200,
      height:Number.isFinite(height) && height > 100 ? height : 750
    };
  }

  function number(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function isIllustration(item) {
    const type = String(item?.type || '').toLowerCase();
    return ['science','image','svg','illustration'].includes(type) || Boolean(item?.asset || item?.svg || item?.imageData || item?.dataUrl);
  }

  function fitIllustration(item, size, count) {
    if (!isIllustration(item)) return;
    const width = Math.max(1, number(item.width, 1));
    const height = Math.max(1, number(item.height, 1));
    const maxWidth = size.width * (count >= 4 ? 0.22 : count >= 2 ? 0.3 : 0.48);
    const maxHeight = size.height * (count >= 4 ? 0.3 : count >= 2 ? 0.38 : 0.58);
    const scale = Math.min(1, maxWidth / width, maxHeight / height);
    if (scale >= 1) return;
    const centerX = number(item.x) + width / 2;
    const centerY = number(item.y) + height / 2;
    item.width = width * scale;
    item.height = height * scale;
    item.x = centerX - item.width / 2;
    item.y = centerY - item.height / 2;
  }

  function objectBounds(item) {
    const x = number(item.x);
    const y = number(item.y);
    const width = Math.max(1, number(item.width, 1));
    const height = Math.max(1, number(item.height, 1));
    const rotation = Math.abs(number(item.rotation)) % 180;
    if (!rotation) return { x, y, width, height, right:x + width, bottom:y + height };
    const radians = rotation * Math.PI / 180;
    const rotatedWidth = Math.abs(width * Math.cos(radians)) + Math.abs(height * Math.sin(radians));
    const rotatedHeight = Math.abs(width * Math.sin(radians)) + Math.abs(height * Math.cos(radians));
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const left = centerX - rotatedWidth / 2;
    const top = centerY - rotatedHeight / 2;
    return { x:left, y:top, width:rotatedWidth, height:rotatedHeight, right:left + rotatedWidth, bottom:top + rotatedHeight };
  }

  function normalizeGeneratedPage(objects) {
    if (!Array.isArray(objects) || objects.length < 2) return false;
    const size = canvasSize();
    const margin = Math.max(28, Math.min(size.width, size.height) * 0.055);
    const safeWidth = Math.max(100, size.width - margin * 2);
    const safeHeight = Math.max(100, size.height - margin * 2);
    const illustrationCount = objects.filter(isIllustration).length;

    objects.forEach(item => fitIllustration(item, size, illustrationCount));

    const visible = objects.filter(item => item && item.visible !== false);
    if (!visible.length) return false;
    const boxes = visible.map(objectBounds);
    const minX = Math.min(...boxes.map(box => box.x));
    const minY = Math.min(...boxes.map(box => box.y));
    const maxX = Math.max(...boxes.map(box => box.right));
    const maxY = Math.max(...boxes.map(box => box.bottom));
    const groupWidth = Math.max(1, maxX - minX);
    const groupHeight = Math.max(1, maxY - minY);
    const scale = Math.min(1, safeWidth / groupWidth, safeHeight / groupHeight);
    const fittedWidth = groupWidth * scale;
    const fittedHeight = groupHeight * scale;
    const targetX = margin + (safeWidth - fittedWidth) / 2;
    const targetY = margin + (safeHeight - fittedHeight) / 2;

    objects.forEach(item => {
      if (!item) return;
      const oldX = number(item.x);
      const oldY = number(item.y);
      item.x = targetX + (oldX - minX) * scale;
      item.y = targetY + (oldY - minY) * scale;
      item.width = Math.max(8, number(item.width, 8) * scale);
      item.height = Math.max(8, number(item.height, 8) * scale);
      if (Number.isFinite(Number(item.fontSize))) item.fontSize = Math.max(10, Number(item.fontSize) * scale);

      if (item.width > safeWidth || item.height > safeHeight) {
        const itemScale = Math.min(1, safeWidth / item.width, safeHeight / item.height);
        item.width *= itemScale;
        item.height *= itemScale;
        if (Number.isFinite(Number(item.fontSize))) item.fontSize = Math.max(10, Number(item.fontSize) * itemScale);
      }
      item.x = Math.min(size.width - margin - item.width, Math.max(margin, item.x));
      item.y = Math.min(size.height - margin - item.height, Math.max(margin, item.y));
    });

    if (typeof syncPage === 'function') syncPage();
    else window.syncPage?.();
    if (typeof render === 'function') render();
    else window.render?.();
    if (typeof renderPages === 'function') renderPages();
    else window.renderPages?.();
    if (typeof scheduleSave === 'function') scheduleSave();
    else window.scheduleSave?.();
    return true;
  }

  window.FigureLoomFitGeneratedPage = () => normalizeGeneratedPage(appState()?.objects);

  function signatureFor(objects) {
    return objects.map(item => `${item?.id || ''}:${number(item?.x)}:${number(item?.y)}:${number(item?.width)}:${number(item?.height)}:${number(item?.rotation)}`).join('|');
  }

  function startFitWatch(mode = selectedSource()) {
    const initialState = appState();
    const initialPageCount = Array.isArray(initialState?.pages) ? initialState.pages.length : 0;
    const initialPage = Number(initialState?.activePage ?? -1);
    const started = Date.now();
    let previousSignature = '';
    let lastFittedSignature = '';
    let lastChange = started;
    let lastFit = 0;
    let fitted = false;

    const timer = window.setInterval(() => {
      const currentState = appState();
      const pages = Array.isArray(currentState?.pages) ? currentState.pages : [];
      const activePage = Number(currentState?.activePage ?? -1);
      const pageChanged = pages.length > initialPageCount || activePage !== initialPage;
      const objects = Array.isArray(currentState?.objects) ? currentState.objects : [];
      const builderDone = /^Built\b/i.test(String(builderStatus?.textContent || ''));
      const now = Date.now();

      if (pageChanged && objects.length >= 2) {
        const signature = signatureFor(objects);
        if (signature !== previousSignature) {
          previousSignature = signature;
          lastChange = now;
        }

        const quietFor = now - lastChange;
        const ready = builderDone || quietFor >= (mode === 'builder' ? 1400 : 700) || now - started > 9000;
        if (ready && signature !== lastFittedSignature && (!lastFit || now - lastFit > 700)) {
          normalizeGeneratedPage(objects);
          fitted = true;
          lastFit = now;
          lastFittedSignature = signatureFor(objects);
          previousSignature = lastFittedSignature;
          lastChange = now;
        }

        const settledAfterFit = fitted && now - lastFit > (mode === 'builder' ? 2600 : 1800);
        if ((builderDone && settledAfterFit) || (mode !== 'builder' && settledAfterFit)) {
          window.clearInterval(timer);
          return;
        }
      }

      if (now - started > 95000) window.clearInterval(timer);
    }, 240);
  }

  messages.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    const text = button.textContent.trim();
    if (/Use Builder instead/i.test(text)) startFitWatch('builder');
    else if (/Create .*figure on new page|Build .*plan on new page/i.test(text)) startFitWatch(selectedSource());
  }, true);

  sendButton.addEventListener('click', () => {
    const builderSelected = selectedSource() === 'builder';
    if (builderSelected && input.value.trim()) startFitWatch('builder');
  }, true);
  input.addEventListener('keydown', event => {
    const builderSelected = selectedSource() === 'builder';
    if (builderSelected && event.key === 'Enter' && !event.shiftKey && input.value.trim()) startFitWatch('builder');
  }, true);

  window.addEventListener('beforeunload', () => quotaObserver.disconnect());
})();
