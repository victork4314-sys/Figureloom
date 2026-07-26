(() => {
  'use strict';

  const originalAdd = document.addEventListener.bind(document);
  let wrappedLargeImport = false;

  document.addEventListener = function addEventListener(type, listener, options) {
    const capture = options === true || Boolean(options && typeof options === 'object' && options.capture);
    if (!wrappedLargeImport && type === 'change' && capture && typeof listener === 'function') {
      wrappedLargeImport = true;
      const wrapped = function wrappedLargeImportListener(event) {
        const picker = event?.target;
        const files = picker?.id === 'filePicker' ? Array.from(picker.files || []) : [];
        const hasLargeProgram = files.some((file) => /\.flbio(?:\.txt)?$/i.test(file.name || '') && Number(file.size || 0) >= 8 * 1024);
        if (hasLargeProgram) return;
        return listener.call(this, event);
      };
      return originalAdd(type, wrapped, options);
    }
    return originalAdd(type, listener, options);
  };

  window.FigureLoomBioLargeProgramImportPre = Object.freeze({
    restore() {
      document.addEventListener = originalAdd;
    },
  });
})();