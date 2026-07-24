(() => {
  'use strict';

  const apply = () => {
    const button = document.getElementById('sentenceLibraryButton');
    const dialog = document.getElementById('sentenceLibraryDialog');
    if (!button || !dialog) return false;

    button.textContent = 'Words & terms';
    button.title = 'Search the words and scientific terms understood by FigureLoom Bio';

    const eyebrow = dialog.querySelector('.addons-header span');
    const title = dialog.querySelector('.addons-header h2');
    const intro = dialog.querySelector('.addons-header p');
    const searchLabel = dialog.querySelector('.addons-toolbar label span');
    const search = dialog.querySelector('.addons-search');
    const countLabel = dialog.querySelector('.addons-installed-count + span');
    const footer = dialog.querySelector('footer > span');

    if (eyebrow) eyebrow.textContent = 'Built into the language';
    if (title) title.textContent = 'FigureLoom Bio words and terms';
    if (intro) intro.textContent = 'Search the operations, biological terms, role words, and comparisons the compiler understands. These words combine through the grammar. They are not a list of allowed sentences.';
    if (searchLabel) searchLabel.textContent = 'Find a word or term';
    if (search) search.placeholder = 'Remove, sequence, quality, below, resistance...';
    if (countLabel) countLabel.textContent = ' words and terms';
    if (footer) footer.textContent = 'Examples teach the language. They do not limit what you can write.';
    dialog.dataset.languageVocabularyCatalog = 'true';
    delete dialog.dataset.canonicalLanguageCatalog;
    delete dialog.dataset.exhaustiveLanguageVocabulary;
    return true;
  };

  if (!apply()) {
    new MutationObserver((observer) => {
      if (apply()) observer.disconnect();
    }).observe(document.documentElement, { childList: true, subtree: true });
  }
})();
