(() => {
  'use strict';

  const editor = document.getElementById('programEditor');
  const dialog = document.getElementById('blockEditor');
  const workspace = document.getElementById('blocksWorkspace');
  const reloadButton = document.getElementById('blocksReload');
  if (!editor || !dialog || !workspace || !reloadButton) return;

  const manualUrl = '../wiki/#FigureLoom-Bio';
  const topManual = document.querySelector('.header-actions .secondary-link[href*="wiki"]');
  if (topManual) {
    topManual.href = manualUrl;
    topManual.setAttribute('aria-label', 'Open the FigureLoom Bio manual');
  }
  const blockManual = dialog.querySelector('.blocks-header-actions a');
  if (blockManual) blockManual.href = manualUrl;

  const style = document.createElement('style');
  style.textContent = `
    .program-block-handle {
      min-width: 44px;
      min-height: 44px;
      border-radius: 9px;
      touch-action: none;
      -webkit-touch-callout: none;
    }
    .program-block-handle:active {
      cursor: grabbing;
      background: color-mix(in srgb, var(--block) 20%, transparent);
    }
    .program-block.touch-drag-source {
      opacity: .28;
    }
    .program-block.touch-drop-target {
      outline: 3px solid var(--accent);
      outline-offset: 3px;
      transform: translateX(8px);
    }
    .program-block.touch-drag-ghost {
      position: fixed !important;
      inset: auto !important;
      z-index: 2147483646;
      margin: 0 !important;
      pointer-events: none !important;
      opacity: .94;
      transform: scale(1.025) rotate(.35deg);
      box-shadow: 0 22px 50px rgba(8, 24, 21, .28);
    }
    .program-block.touch-drag-ghost .program-block-actions {
      visibility: hidden;
    }
    body.blocks-touch-dragging,
    body.blocks-touch-dragging * {
      user-select: none !important;
      -webkit-user-select: none !important;
    }
    .blocks-touch-hint {
      color: var(--accent-strong) !important;
      font-weight: 750;
    }
    @media (pointer: coarse) {
      .program-block {
        grid-template-columns: 48px minmax(0, 1fr) auto;
      }
      .program-block-handle {
        font-size: 18px;
        letter-spacing: -3px;
      }
    }
    @media (pointer: coarse) and (max-width: 760px) {
      .program-block {
        grid-template-columns: 48px minmax(0, 1fr);
      }
    }
  `;
  document.head.append(style);

  const toolbarCopy = dialog.querySelector('.blocks-workspace-toolbar > div');
  if (toolbarCopy && !dialog.querySelector('.blocks-touch-hint')) {
    const hint = document.createElement('span');
    hint.className = 'blocks-touch-hint';
    hint.textContent = 'On iPad, drag the ⋮⋮ handle with one finger.';
    toolbarCopy.append(hint);
  }

  let drag = null;

  function programLines() {
    return editor.value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function reorderProgram(fromIndex, toIndex) {
    const lines = programLines();
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= lines.length ||
      toIndex >= lines.length ||
      fromIndex === toIndex
    ) return;

    const [line] = lines.splice(fromIndex, 1);
    lines.splice(toIndex, 0, line);
    editor.value = lines.length ? `${lines.join('\n')}\n` : '';
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    reloadButton.click();

    requestAnimationFrame(() => {
      const moved = workspace.querySelector(`.program-block[data-index="${toIndex}"]`);
      moved?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  }

  function clearTarget() {
    workspace.querySelectorAll('.touch-drop-target').forEach((element) => {
      element.classList.remove('touch-drop-target');
    });
  }

  function cleanup() {
    if (!drag) return;
    clearTarget();
    drag.source.classList.remove('touch-drag-source');
    drag.ghost.remove();
    document.body.classList.remove('blocks-touch-dragging');
    try {
      if (drag.handle.hasPointerCapture(drag.pointerId)) {
        drag.handle.releasePointerCapture(drag.pointerId);
      }
    } catch {}
    drag = null;
  }

  function articleAtPoint(x, y) {
    const element = document.elementFromPoint(x, y);
    const article = element?.closest?.('.program-block');
    return article && workspace.contains(article) ? article : null;
  }

  function autoScroll(y) {
    const rect = workspace.getBoundingClientRect();
    const edge = Math.min(90, Math.max(54, rect.height * .14));
    if (y < rect.top + edge) {
      workspace.scrollTop -= Math.ceil((rect.top + edge - y) * .34);
    } else if (y > rect.bottom - edge) {
      workspace.scrollTop += Math.ceil((y - (rect.bottom - edge)) * .34);
    }
  }

  workspace.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' || event.button !== 0) return;
    const handle = event.target.closest?.('.program-block-handle');
    if (!handle || !workspace.contains(handle)) return;
    const source = handle.closest('.program-block');
    if (!source) return;

    const fromIndex = Number(source.dataset.index);
    if (!Number.isInteger(fromIndex)) return;

    event.preventDefault();
    event.stopPropagation();

    const rect = source.getBoundingClientRect();
    const ghost = source.cloneNode(true);
    ghost.classList.remove('dragging', 'touch-drag-source', 'touch-drop-target');
    ghost.classList.add('touch-drag-ghost');
    ghost.removeAttribute('draggable');
    ghost.style.width = `${rect.width}px`;
    ghost.style.left = `${rect.left}px`;
    ghost.style.top = `${rect.top}px`;
    document.body.append(ghost);

    drag = {
      pointerId: event.pointerId,
      handle,
      source,
      ghost,
      fromIndex,
      toIndex: fromIndex,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top
    };

    source.classList.add('touch-drag-source');
    document.body.classList.add('blocks-touch-dragging');
    handle.setPointerCapture(event.pointerId);
  }, { passive: false });

  workspace.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    event.preventDefault();

    drag.ghost.style.left = `${event.clientX - drag.offsetX}px`;
    drag.ghost.style.top = `${event.clientY - drag.offsetY}px`;
    autoScroll(event.clientY);

    const target = articleAtPoint(event.clientX, event.clientY);
    if (!target || target === drag.source) return;
    const toIndex = Number(target.dataset.index);
    if (!Number.isInteger(toIndex)) return;

    drag.toIndex = toIndex;
    clearTarget();
    target.classList.add('touch-drop-target');
  }, { passive: false });

  function finish(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    event.preventDefault();
    const { fromIndex, toIndex } = drag;
    cleanup();
    reorderProgram(fromIndex, toIndex);
  }

  workspace.addEventListener('pointerup', finish, { passive: false });
  workspace.addEventListener('pointercancel', (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    cleanup();
  });

  dialog.addEventListener('close', cleanup);
})();
