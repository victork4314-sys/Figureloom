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
    const savedActiveExists = typeof files[savedActive] === 'string';
    const savedActiveIsProgram = savedActiveExists && savedActive.toLowerCase().endsWith('.flbio');
    const activeName = (!localStorage.getItem(EXAMPLE_READY_KEY) || !savedActiveIsProgram)
      ? EXAMPLE_PROGRAM
      : savedActive;

    localStorage.setItem(ACTIVE_KEY, activeName);
    localStorage.setItem(EXAMPLE_READY_KEY, '1');

    // The main IDE saves the current editor before switching files. On first load the
    // textarea used to be empty, which overwrote the saved program during refresh.
    // Preload the saved active file so the first save can never erase it.
    const editor = document.getElementById('programEditor');
    const programName = document.getElementById('programName');
    const activeFileLabel = document.getElementById('activeFileLabel');
    if (editor) editor.value = files[activeName] || '';
    if (programName) programName.value = activeName;
    if (activeFileLabel) activeFileLabel.textContent = activeName;
  } catch {}
})();
