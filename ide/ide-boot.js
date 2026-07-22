(() => {
  const FILES_KEY = 'figureloom-bio-ide-files-v1';
  const ACTIVE_KEY = 'figureloom-bio-ide-active-v1';
  const EXAMPLE_READY_KEY = 'figureloom-bio-ide-example-ready-v2';
  const EXAMPLE_PROGRAM = 'example.flbio';
  const EXAMPLE_DATA = 'example-samples.csv';

  const exampleProgram = `Say Starting the example.

Open the file example-samples.csv.
Keep only rows marked treated under condition.
Remove rows marked failed under status.
Count the rows.
Show the result.
Save the result as example-result.csv.

Say The example is finished.
`;

  const exampleData = `sample,condition,status
sample-01,treated,passed
sample-02,control,passed
sample-03,treated,failed
sample-04,treated,passed
sample-05,control,failed
`;

  let files = {};
  try {
    const saved = JSON.parse(localStorage.getItem(FILES_KEY) || '{}');
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) files = saved;
  } catch {}

  if (typeof files[EXAMPLE_PROGRAM] !== 'string') files[EXAMPLE_PROGRAM] = exampleProgram;
  if (typeof files[EXAMPLE_DATA] !== 'string') files[EXAMPLE_DATA] = exampleData;

  try {
    localStorage.setItem(FILES_KEY, JSON.stringify(files));

    const savedActive = localStorage.getItem(ACTIVE_KEY) || '';
    const savedActiveIsProgram =
      savedActive.toLowerCase().endsWith('.flbio') &&
      typeof files[savedActive] === 'string';

    if (!localStorage.getItem(EXAMPLE_READY_KEY) || !savedActiveIsProgram) {
      localStorage.setItem(ACTIVE_KEY, EXAMPLE_PROGRAM);
      localStorage.setItem(EXAMPLE_READY_KEY, '1');
    }
  } catch {}
})();
