(() => {
  if (window.__figureLoomMcpSecurityOverridesV1) return;
  window.__figureLoomMcpSecurityOverridesV1 = true;

  const clone = value => typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
  const payload = () => {
    if (typeof projectData === 'function') return clone(projectData());
    if (typeof snapshot === 'function') return JSON.parse(snapshot());
    return window.FigureLoomCommands?.execute?.('document.get_full') || null;
  };

  function install() {
    const commands = window.FigureLoomCommands;
    if (!commands?.register) return false;

    if (!commands.get('project.snapshot')) {
      commands.register('project.snapshot', {
        description:'Return a complete portable snapshot without persisting it.',
        category:'projects',
        run:() => payload()
      });
    }

    commands.register('project.save', {
      write:true,
      description:'Persist the active project to the authorized cloud vault and return its portable snapshot.',
      category:'projects',
      run:async args => {
        if (args.destination && args.destination !== 'cloud') return payload();
        const saved = await window.SciCanvasCloud?.saveCurrentProject?.({forceNew:Boolean(args.forceNew)});
        if (!saved) throw new Error('Sign in before saving to the cloud vault.');
        return {saved,...saved,project:payload()};
      }
    });

    ['import.project','template.apply'].forEach(name => {
      const existing = commands.get(name);
      if (!existing?.run) return;
      commands.register(name, {
        ...existing,
        write:true,
        destructive:true,
        run:existing.run
      });
    });

    return true;
  }

  function attempt() {
    if (!install()) setTimeout(attempt,100);
  }
  attempt();
})();