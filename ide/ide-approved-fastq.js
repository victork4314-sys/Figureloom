(() => {
  const api = window.FigureLoomApprovedBio;
  if (!api) return;
  const FASTQ = ['.fq','.fastq'];
  const ADAPTERS = ['AGATCGGAAGAGCACACGTCTGAACTCCAGTCA','AGATCGGAAGAGCGTCGTGTAGGGAAAGAGTGT','CTGTCTCTTATACACATCT'];
  const rules = [
    ['openPair', /^Open the files (.+?) and (.+?) as a pair$/i], ['open', /^Open the file (.+)$/i],
    ['check', /^Check the quality(?: again)?$/i], ['report', /^Show the quality report$/i],
    ['low', /^Remove reads with low quality$/i], ['short', /^Remove reads shorter than ([1-9][0-9]*) bases?$/i],
    ['adapters', /^Remove adapter sequences$/i], ['cutStart', /^Cut ([1-9][0-9]*) bases? from the beginning of each read$/i],
    ['cutEnd', /^Cut ([1-9][0-9]*) bases? from the end of each read$/i], ['savePair', /^Save the pair as (.+?) and (.+)$/i],
    ['show', /^Show the (?:result|file)$/i], ['save', /^Save the result as (.+)$/i], ['say', /^Say (.+)$/i]
  ];
  const exactOnly = [
    /^Open the files .+ and .+ as a pair$/i, /^Check the quality(?: again)?$/i,
    /^Show the quality report$/i, /^Remove reads with low quality$/i,
    /^Remove adapter sequences$/i, /^Cut [1-9][0-9]* bases? from the (?:beginning|end) of each read$/i,
    /^Save the pair as .+ and .+$/i
  ];
  const isFastq = (name) => FASTQ.some((extension) => name.toLowerCase().endsWith(extension));
  function detect(items) { return items.some((item) => exactOnly.some((pattern) => pattern.test(item.sentence))); }
  function parse(item) {
    for (const [action, pattern] of rules) {
      const match = item.sentence.match(pattern);
      if (match) return { action,values:match.slice(1).map((value) => value.trim()),lineNumber:item.lineNumber };
    }
    throw new api.PlainError(`I do not understand this FASTQ instruction yet.\n\nI read: ${item.sentence}.`,item.lineNumber);
  }
  function parseFastq(text,filename) {
    const lines = text.replace(/\r/g,'').split('\n'); if (lines.at(-1) === '') lines.pop();
    if (lines.length % 4 !== 0) throw new api.PlainError(`${filename} is incomplete. FASTQ reads need four lines each.`);
    const reads = [];
    for (let index = 0; index < lines.length; index += 4) {
      const [header,sequence,plus,quality] = lines.slice(index,index + 4);
      if (!header?.startsWith('@') || !plus?.startsWith('+')) throw new api.PlainError(`${filename} contains a broken FASTQ read near line ${index + 1}.`);
      if (sequence.length !== quality.length) throw new api.PlainError(`The read ${header.slice(1)} in ${filename} has different sequence and quality lengths.`);
      reads.push({ name:header.slice(1).trim(),sequence,quality });
    }
    if (!reads.length) throw new api.PlainError(`${filename} does not contain any FASTQ reads.`);
    return reads;
  }
  const encodeFastq = (reads) => reads.map((read) => `@${read.name}\n${read.sequence}\n+\n${read.quality}`).join('\n') + '\n';
  function averageQuality(read) {
    if (!read.quality.length) return 0;
    return Array.from(read.quality).reduce((sum,character) => sum + character.charCodeAt(0) - 33,0) / read.quality.length;
  }
  function allReads(data) { return data.kind === 'pair' ? data.forward.concat(data.reverse) : data.reads; }
  function summary(data) {
    const reads = allReads(data); const lengths = reads.map((read) => read.sequence.length); const qualities = reads.map(averageQuality);
    const count = data.kind === 'pair' ? data.forward.length : data.reads.length;
    if (!reads.length) return { count,quality:0,length:0,shortest:0,longest:0 };
    return { count,quality:qualities.reduce((sum,value) => sum + value,0) / qualities.length,
      length:lengths.reduce((sum,value) => sum + value,0) / lengths.length,shortest:Math.min(...lengths),longest:Math.max(...lengths) };
  }
  function showReads(data) {
    if (data.kind === 'pair') {
      const rows = data.forward.slice(0,10).map((read,index) => ({ Forward:read.name,'Forward length':String(read.sequence.length),Reverse:data.reverse[index]?.name || '','Reverse length':String(data.reverse[index]?.sequence.length || 0) }));
      api.addSection('The result',{ table:{ columns:['Forward','Forward length','Reverse','Reverse length'],rows } });
    } else {
      const rows = data.reads.slice(0,10).map((read) => ({ Name:read.name,Length:String(read.sequence.length),'Average quality':averageQuality(read).toFixed(1),Sequence:api.preview(read.sequence) }));
      api.addSection('The result',{ table:{ columns:['Name','Length','Average quality','Sequence'],rows } });
    }
  }
  function run(items,context) {
    const instructions = items.map(parse); let data = null; let report = null;
    for (const instruction of instructions) {
      const [first,second] = instruction.values;
      if (instruction.action === 'say') { api.addSection('Message',{ paragraphs:[first] }); continue; }
      if (instruction.action === 'open') {
        const found = api.findFile(context.files,first);
        if (!found) throw new api.PlainError(`I could not find ${first}.\n\nOpen the file in the Files panel first.`,instruction.lineNumber);
        if (!isFastq(found)) throw new api.PlainError(`${found} is not a FASTQ file.`,instruction.lineNumber);
        data = { kind:'single',reads:parseFastq(context.files[found],found) }; report = null;
        api.addSection('Opened the file',{ paragraphs:[found],bigValue:data.reads.length.toLocaleString() }); continue;
      }
      if (instruction.action === 'openPair') {
        const forwardName = api.findFile(context.files,first); const reverseName = api.findFile(context.files,second);
        if (!forwardName) throw new api.PlainError(`I could not find ${first}.`,instruction.lineNumber);
        if (!reverseName) throw new api.PlainError(`I could not find ${second}.`,instruction.lineNumber);
        if (!isFastq(forwardName) || !isFastq(reverseName)) throw new api.PlainError('Both paired files must be FASTQ files.',instruction.lineNumber);
        const forward = parseFastq(context.files[forwardName],forwardName); const reverse = parseFastq(context.files[reverseName],reverseName);
        if (forward.length !== reverse.length) throw new api.PlainError('The paired files do not contain the same number of reads.',instruction.lineNumber);
        data = { kind:'pair',forward,reverse }; report = null;
        api.addSection('Opened the pair',{ paragraphs:[forwardName,reverseName],bigValue:forward.length.toLocaleString() }); continue;
      }
      if (!data) throw new api.PlainError('There is no open FASTQ file yet.',instruction.lineNumber);
      if (instruction.action === 'check') {
        report = summary(data); api.addSection('Quality checked',{ paragraphs:[data.kind === 'pair' ? 'Read pairs' : 'Reads'],bigValue:report.count.toLocaleString() });
      } else if (instruction.action === 'report') {
        report ||= summary(data);
        api.addSection('Quality report',{ paragraphs:[`${data.kind === 'pair' ? 'Read pairs' : 'Reads'}\n${report.count.toLocaleString()}`,
          `Average quality\n${report.quality.toFixed(1)}`,`Average length\n${report.length.toFixed(1)}`,
          `Shortest read\n${report.shortest.toLocaleString()}`,`Longest read\n${report.longest.toLocaleString()}`] });
      } else if (instruction.action === 'low') {
        if (data.kind === 'pair') {
          const kept = data.forward.map((read,index) => [read,data.reverse[index]]).filter(([left,right]) => averageQuality(left) >= 20 && averageQuality(right) >= 20);
          data.forward = kept.map(([left]) => left); data.reverse = kept.map(([,right]) => right);
        } else data.reads = data.reads.filter((read) => averageQuality(read) >= 20);
        report = null;
      } else if (instruction.action === 'short') {
        const minimum = Number(first);
        if (data.kind === 'pair') {
          const kept = data.forward.map((read,index) => [read,data.reverse[index]]).filter(([left,right]) => left.sequence.length >= minimum && right.sequence.length >= minimum);
          data.forward = kept.map(([left]) => left); data.reverse = kept.map(([,right]) => right);
        } else data.reads = data.reads.filter((read) => read.sequence.length >= minimum);
        report = null;
      } else if (instruction.action === 'adapters') {
        for (const read of allReads(data)) {
          const upper = read.sequence.toUpperCase(); const positions = ADAPTERS.map((adapter) => upper.indexOf(adapter)).filter((position) => position >= 0);
          if (positions.length) { const end = Math.min(...positions); read.sequence = read.sequence.slice(0,end); read.quality = read.quality.slice(0,end); }
        }
        report = null;
      } else if (instruction.action === 'cutStart' || instruction.action === 'cutEnd') {
        const count = Number(first);
        for (const read of allReads(data)) {
          if (instruction.action === 'cutStart') { read.sequence = read.sequence.slice(count); read.quality = read.quality.slice(count); }
          else if (count >= read.sequence.length) { read.sequence = ''; read.quality = ''; }
          else { read.sequence = read.sequence.slice(0,-count); read.quality = read.quality.slice(0,-count); }
        }
        report = null;
      } else if (instruction.action === 'show') showReads(data);
      else if (instruction.action === 'save') {
        if (data.kind === 'pair') throw new api.PlainError('Use “Save the pair as … and …” for paired reads.',instruction.lineNumber);
        if (!isFastq(first)) throw new api.PlainError('Save reads with a FASTQ filename such as clean.fastq.',instruction.lineNumber);
        const name = context.numberedName(first,context.runNumber,context.repeatCount);
        context.files[name] = encodeFastq(data.reads); api.addSection('Saved the result',{ file:{ name,description:'Saved in Files' } });
      } else if (instruction.action === 'savePair') {
        if (data.kind !== 'pair') throw new api.PlainError('There is no open FASTQ pair yet.',instruction.lineNumber);
        if (!isFastq(first) || !isFastq(second)) throw new api.PlainError('Paired reads must be saved as FASTQ files.',instruction.lineNumber);
        const forwardName = context.numberedName(first,context.runNumber,context.repeatCount);
        const reverseName = context.numberedName(second,context.runNumber,context.repeatCount);
        context.files[forwardName] = encodeFastq(data.forward); context.files[reverseName] = encodeFastq(data.reverse);
        api.addSection('Saved the pair',{ paragraphs:[forwardName,reverseName] });
      }
    }
  }
  api.registerRunner({ detect,run });
  const highlights = [
    [/^(Open the files )(.+?)( and )(.+?)( as a pair)(\.)$/i,['c','f','w','f','c','p']],
    [/^(Check the quality(?: again)?)(\.)$/i,['c','p']], [/^(Show the quality report)(\.)$/i,['c','p']],
    [/^(Remove reads with low quality)(\.)$/i,['c','p']], [/^(Remove adapter sequences)(\.)$/i,['c','p']],
    [/^(Cut )([0-9]+)( bases? from the (?:beginning|end) of each read)(\.)$/i,['c','v','c','p']],
    [/^(Save the pair as )(.+?)( and )(.+)(\.)$/i,['c','f','w','f','p']]
  ];
  for (const rule of highlights) api.registerHighlight(...rule);
})();
