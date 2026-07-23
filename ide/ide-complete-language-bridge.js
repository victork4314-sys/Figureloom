(() => {
  'use strict';

  const api = window.FigureLoomBioCompleteLanguage;
  if (!api?.run || !api?.uses) {
    throw new Error('The completed FigureLoom Bio language loaded without its browser runtime.');
  }

  const handler = ({ text, context, line, helpers }) => api.run(
    text,
    context,
    line,
    {
      X:helpers.Error,
      enc:helpers.encode,
      sec:helpers.section,
    },
  );
  const recognizer = (source) => api.uses(source);

  window.FigureLoomBioStatementHandlers = window.FigureLoomBioStatementHandlers || [];
  window.FigureLoomBioStatementRecognizers = window.FigureLoomBioStatementRecognizers || [];

  if (!window.FigureLoomBioStatementHandlers.includes(handler)) {
    window.FigureLoomBioStatementHandlers.push(handler);
  }
  if (!window.FigureLoomBioStatementRecognizers.includes(recognizer)) {
    window.FigureLoomBioStatementRecognizers.push(recognizer);
  }

  window.FigureLoomBioCompleteLanguageBridge = Object.freeze({ handler, recognizer });
})();
