(() => {
'use strict';
const editor=document.getElementById('programEditor'),format=document.getElementById('formatButton'),label=document.getElementById('activeFileLabel');
if(!editor||!format||!label)return;
const targets={python:['Python','.py'],r:['R','.R'],bash:['Bash','.sh'],snakemake:['Snakemake','.smk'],nextflow:['Nextflow','.nf']};
const button=document.createElement('button');button.type='button';button.textContent='Translate';button.id='translateProgramButton';format.parentElement?.insertBefore(button,format);
const dialog=document.createElement('dialog');dialog.className='translator-dialog';dialog.innerHTML=`<div class="translator-shell"><header><div><span>Interoperability</span><h2>Translate this program</h2></div><button class="translator-close" type="button" aria-label="Close">×</button></header><div class="translator-body"><aside class="translator-options"><label>Target language<select class="translator-target">${Object.entries(targets).map(([key,value])=>`<option value="${key}">${value[0]}</option>`).join('')}</select></label><div class="translator-note"></div></aside><section class="translator-preview"><div class="translator-preview-bar"><strong class="translator-filename"></strong><span>Generated from the open .flbio program</span></div><pre class="translator-code"></pre></section></div><footer><button class="translator-copy" type="button">Copy code</button><button class="translator-done" type="button">Done</button><button class="translator-download primary-button" type="button">Download translation</button></footer></div>`;document.body.append(dialog);
const select=dialog.querySelector('.translator-target'),note=dialog.querySelector('.translator-note'),filename=dialog.querySelector('.translator-filename'),preview=dialog.querySelector('.translator-code');let current=null;
const q=value=>`'${String(value).replaceAll("'",`'\\''`)}'`;
const list=text=>{let value=String(text).trim().replace(', and ',', ');if(!value.includes(',')&&value.includes(' and ')){const at=value.lastIndexOf(' and ');value=`${value.slice(0,at)}, ${value.slice(at+5)}`;}return value.split(',').map(item=>item.trim()).filter(Boolean);};
const kind=name=>{let lower=String(name).toLowerCase().replace(/\.gz$/,'');if(/\.(csv|tsv)$/.test(lower))return'table';if(/\.(fa|fasta|fna|ffn|faa|frn)$/.test(lower))return'fasta';if(/\.(fq|fastq)$/.test(lower))return'fastq';return'unknown';};
const extension=name=>String(name).match(/(\.[^.]+(?:\.gz)?)$/i)?.[1]||'.tmp';
function compile(source,program){
 const p={lines:[],warnings:[],tools:new Set(['bash']),inputs:[],outputs:[],current:null,kind:null,ext:'.tmp',step:0,runs:1,forward:null,reverse:null};
 const add=line=>p.lines.push(line),warn=(sentence,reason)=>{const value=`${sentence}: ${reason}`;if(!p.warnings.includes(value))p.warnings.push(value);add(`# TODO: ${value}`);};
 const temp=(ext=p.ext)=>`$FLBIO_WORKDIR/step-${String(++p.step).padStart(3,'0')}${ext}`;
 const open=name=>{p.current=name;p.kind=kind(name);p.ext=extension(name);p.forward=p.reverse=null;if(!p.inputs.includes(name))p.inputs.push(name);add(`CURRENT=${q(name)}`);add('test -f "$CURRENT"');};
 const seqkit=args=>{const next=temp();add(`seqkit ${args} "$CURRENT" -o "${next}"`);add(`CURRENT="${next}"`);p.tools.add('seqkit');};
 const fastp=(args='')=>{if(p.forward&&p.reverse){const left=temp('.fastq'),right=temp('.fastq');add(`fastp -i "$FORWARD" -I "$REVERSE" -o "${left}" -O "${right}" ${args}`.trim());add(`FORWARD="${left}"`);add(`REVERSE="${right}"`);}else{const next=temp('.fastq');add(`fastp -i "$CURRENT" -o "${next}" ${args}`.trim());add(`CURRENT="${next}"`);}p.tools.add('fastp');};
 const pandas=operation=>{const next=temp('.csv'),code=`import pandas as pd,sys; src,dst=sys.argv[1:3]; df=pd.read_csv(src,sep='\\t' if src.lower().endswith('.tsv') else ','); ${operation}; df.to_csv(dst,index=False)`;add(`python3 -c ${q(code)} "$CURRENT" "${next}"`);add(`CURRENT="${next}"`);p.tools.add('python3');p.tools.add('pandas');};
 const merge=(name,sentence,rows=false)=>{if(!p.current){warn(sentence,'there is no open file before the merge');return;}if(!p.inputs.includes(name))p.inputs.push(name);if(rows||p.kind==='table'){const next=temp('.csv');add(`csvstack "$CURRENT" ${q(name)} > "${next}"`);add(`CURRENT="${next}"`);p.kind='table';p.ext='.csv';p.tools.add('csvstack');}else if(['fasta','fastq'].includes(p.kind)&&kind(name)===p.kind){const next=temp();add(`cat "$CURRENT" ${q(name)} > "${next}"`);add(`CURRENT="${next}"`);}else warn(sentence,'the file types are not clearly compatible');};
 const save=name=>{if(!p.outputs.includes(name))p.outputs.push(name);add(`OUTPUT=$(flbio_numbered_output ${q(name)})`);add('cp "$CURRENT" "$OUTPUT"');};
 const raw=source.split(/\r?\n/).map((line,index)=>({text:line.trim(),line:index+1})).filter(item=>item.text&&!item.text.startsWith('#'));
 for(const item of raw){if(!item.text.endsWith('.'))throw new Error(`Line ${item.line} needs a period.`);const s=item.text.slice(0,-1).trim();let m;
  if((m=s.match(/^Run this program ([1-9]\d*) times?$/i))){p.runs=Number(m[1]);continue;}
  if((m=s.match(/^Say (.+)$/i))){add(`printf '%s\\n' ${q(m[1])}`);continue;}
  if((m=s.match(/^Open the file (.+)$/i))){open(m[1]);continue;}
  if((m=s.match(/^Open the files (.+?) and (.+?) as a pair$/i))){p.forward=m[1];p.reverse=m[2];p.current=null;p.kind='fastq-pair';for(const name of[m[1],m[2]])if(!p.inputs.includes(name))p.inputs.push(name);add(`FORWARD=${q(m[1])}`);add(`REVERSE=${q(m[2])}`);continue;}
  if((m=s.match(/^(?:Open the files (.+) together|Merge the files (.+))$/i))){const names=list(m[1]||m[2]);if(names.length){open(names[0]);for(const name of names.slice(1))merge(name,s);}else warn(s,'no files were named');continue;}
  if((m=s.match(/^Merge (?:the result|it|the sequences) with (.+)$/i))){merge(m[1],s);continue;}
  if((m=s.match(/^Add the rows from (.+)$/i))){merge(m[1],s,true);continue;}
  if((m=s.match(/^Run the tool ([^ ]+) with (.+)$/i))){add(`${q(m[1])} ${m[2]}`);p.tools.add(m[1]);continue;}
  if(!p.current&&!p.forward){warn(s,'there is no open file before this instruction');continue;}
  if((m=s.match(/^Keep only rows marked (.+) under ([^.,]+)$/i))){const next=temp('.csv');add(`csvgrep -c ${q(m[2])} -m ${q(m[1])} "$CURRENT" > "${next}"`);add(`CURRENT="${next}"`);p.tools.add('csvgrep');continue;}
  if((m=s.match(/^Remove rows marked (.+) under ([^.,]+)$/i))){const next=temp('.csv');add(`csvgrep -i -c ${q(m[2])} -m ${q(m[1])} "$CURRENT" > "${next}"`);add(`CURRENT="${next}"`);p.tools.add('csvgrep');continue;}
  if((m=s.match(/^Keep only the columns (.+)$/i))){const next=temp('.csv');add(`csvcut -c ${q(list(m[1]).join(','))} "$CURRENT" > "${next}"`);add(`CURRENT="${next}"`);p.tools.add('csvcut');continue;}
  if((m=s.match(/^Rename the column (.+?) to (.+)$/i))){pandas(`df=df.rename(columns={${JSON.stringify(m[1])}:${JSON.stringify(m[2])}})`);continue;}
  if((m=s.match(/^Put the rows in order by (.+)$/i))){const next=temp('.csv');add(`csvsort -c ${q(m[1])} "$CURRENT" > "${next}"`);add(`CURRENT="${next}"`);p.tools.add('csvsort');continue;}
  if((m=s.match(/^Put the (largest|smallest) (.+) first$/i))){const next=temp('.csv'),reverse=m[1].toLowerCase()==='largest'?' -r':'';add(`csvsort${reverse} -c ${q(m[2])} "$CURRENT" > "${next}"`);add(`CURRENT="${next}"`);p.tools.add('csvsort');continue;}
  if((m=s.match(/^Remove duplicate rows using (.+)$/i))){pandas(`df=df.drop_duplicates(subset=[${JSON.stringify(m[1])}],keep='first')`);continue;}
  if((m=s.match(/^Replace empty values under (.+?) with (.+)$/i))){pandas(`df[${JSON.stringify(m[1])}]=df[${JSON.stringify(m[1])}].replace('',pd.NA).fillna(${JSON.stringify(m[2])})`);continue;}
  if((m=s.match(/^Combine it with (.+) using ([^.,]+)$/i))){const next=temp('.csv'),code="import pandas as pd,sys; a,b,d,k=sys.argv[1:5]; x=pd.read_csv(a); y=pd.read_csv(b); x.merge(y,on=k,how='left',suffixes=('','_incoming')).to_csv(d,index=False)";add(`python3 -c ${q(code)} "$CURRENT" ${q(m[1])} "${next}" ${q(m[2])}`);add(`CURRENT="${next}"`);p.tools.add('python3');p.tools.add('pandas');if(!p.inputs.includes(m[1]))p.inputs.push(m[1]);continue;}
  if((m=s.match(/^Change (.+?) to (.+?) under ([^.,]+)$/i))){pandas(`df.loc[df[${JSON.stringify(m[3])}]==${JSON.stringify(m[1])},${JSON.stringify(m[3])}]=${JSON.stringify(m[2])}`);continue;}
  if(/^Count the rows$/i.test(s)){add('csvstat --count "$CURRENT"');p.tools.add('csvstat');continue;}
  if(/^Count the (?:sequences|reads|bases)$/i.test(s)){add('seqkit stats -T "$CURRENT"');p.tools.add('seqkit');continue;}
  if(/^Show the sequence names$/i.test(s)){add('seqkit seq -n "$CURRENT" | head -n 100');p.tools.add('seqkit');continue;}
  if((m=s.match(/^Show the first ([1-9]\d*) sequences?$/i))){add(`seqkit head -n ${m[1]} "$CURRENT"`);p.tools.add('seqkit');continue;}
  if(/^Show the (?:sequences|reads|result|file)$/i.test(s)){add('seqkit head -n 100 "$CURRENT" 2>/dev/null || head -n 101 "$CURRENT"');p.tools.add('seqkit');continue;}
  if((m=s.match(/^Keep only sequences longer than (\d+) bases?$/i))){seqkit(`seq -m ${Number(m[1])+1}`);continue;}
  if((m=s.match(/^(?:Keep (?:sequences|reads) at least|Remove (?:sequences|reads) shorter than) ([1-9]\d*) bases(?: long)?$/i))){seqkit(`seq -m ${m[1]}`);continue;}
  if((m=s.match(/^Keep (?:only )?sequences containing (.+)$/i))){seqkit(`grep -s -p ${q(m[1])}`);continue;}
  if((m=s.match(/^Remove sequences containing (.+)$/i))){seqkit(`grep -s -v -p ${q(m[1])}`);continue;}
  if((m=s.match(/^Use the sequence named (.+)$/i))){seqkit(`grep -n -p ${q(m[1])}`);continue;}
  if((m=s.match(/^Remove the sequence named (.+)$/i))){seqkit(`grep -n -v -p ${q(m[1])}`);continue;}
  if((m=s.match(/^Rename the sequence (.+?) to (.+)$/i))){seqkit(`replace -n -p ${q(`^${m[1]}$`)} -r ${q(m[2])}`);continue;}
  if((m=s.match(/^Add (.+) to the start of every sequence name$/i))){seqkit(`replace -n -p '^' -r ${q(m[1])}`);continue;}
  if((m=s.match(/^Add (.+) to the end of every sequence name$/i))){seqkit(`replace -n -p '$' -r ${q(m[1])}`);continue;}
  if(/^Remove duplicate sequences$/i.test(s)){seqkit('rmdup -s');continue;}
  if(/^Put the shortest sequences first$/i.test(s)){seqkit(`sort -l${p.kind==='fasta'?' -2':''}`);continue;}
  if(/^Put the longest sequences first$/i.test(s)){seqkit(`sort -l -r${p.kind==='fasta'?' -2':''}`);continue;}
  if(/^Show the sequence lengths$/i.test(s)){add('seqkit fx2tab -n -l "$CURRENT" | head -n 100');p.tools.add('seqkit');continue;}
  if(/^Find the shortest sequence$/i.test(s)){add('seqkit sort -l "$CURRENT" | seqkit head -n 1');p.tools.add('seqkit');continue;}
  if(/^Find the longest sequence$/i.test(s)){add('seqkit sort -l -r "$CURRENT" | seqkit head -n 1');p.tools.add('seqkit');continue;}
  if((m=s.match(/^Keep bases ([1-9]\d*) to ([1-9]\d*)$/i))){seqkit(`subseq -r ${m[1]}:${m[2]}`);continue;}
  if((m=s.match(/^(?:Trim ([1-9]\d*) bases from the start|Cut ([1-9]\d*) bases? from the beginning of each read)$/i))){seqkit(`subseq -r ${Number(m[1]||m[2])+1}:-1`);continue;}
  if((m=s.match(/^(?:Trim ([1-9]\d*) bases from the end|Cut ([1-9]\d*) bases? from the end of each read)$/i))){seqkit(`subseq -r 1:${-(Number(m[1]||m[2])+1)}`);continue;}
  if(/^Convert (?:the DNA|the sequences) to RNA$/i.test(s)){seqkit('seq --dna2rna');continue;}
  if(/^Convert (?:the RNA|the sequences) to DNA$/i.test(s)){seqkit('seq --rna2dna');continue;}
  if(/^Find the reverse complement$/i.test(s)){seqkit('seq -r -p');continue;}
  if(/^Translate (?:the DNA into protein|the sequences)$/i.test(s)){seqkit('translate');p.ext='.fasta';continue;}
  if(/^Calculate the GC content$/i.test(s)){add('seqkit fx2tab -n -l -g "$CURRENT"');p.tools.add('seqkit');continue;}
  if(/^Calculate sequence statistics$/i.test(s)){add('seqkit stats -a -T "$CURRENT"');p.tools.add('seqkit');continue;}
  if(/^Validate the sequences$/i.test(s)){add('seqkit stats -a -T "$CURRENT"');p.tools.add('seqkit');warn(s,'SeqKit statistics do not reproduce every native validation counter');continue;}
  if(/^Remove gaps from the sequences$/i.test(s)){seqkit('seq -g');continue;}
  if((m=s.match(/^Keep sequences with names containing (.+)$/i))){seqkit(`grep -n -r -p ${q(m[1])}`);continue;}
  if((m=s.match(/^Remove sequences with names containing (.+)$/i))){seqkit(`grep -n -r -v -p ${q(m[1])}`);continue;}
  if(/^Make duplicate sequence names unique$/i.test(s)){seqkit('rename');continue;}
  if(/^Remove sequences containing ambiguous bases$/i.test(s)){seqkit(`grep -s -v -r -p '[^ACGTUacgtu]'`);continue;}
  if((m=s.match(/^Keep sequences with at most ([0-9]+) ambiguous bases$/i))){warn(s,'the exact ambiguous-base count needs a target-specific helper');continue;}
  if((m=s.match(/^Split the sequences into files with ([1-9][0-9]*) sequences each as (.+)$/i))){const folder=temp('-split');add(`mkdir -p "${folder}"`);add(`seqkit split2 -s ${m[1]} -O "${folder}" "$CURRENT"`);p.tools.add('seqkit');warn(s,`SeqKit controls split filenames inside ${folder}; rename them to match ${m[2]} if needed`);continue;}
  if(/^Remove adapter sequences$/i.test(s)){fastp(p.forward?'--detect_adapter_for_pe':'');continue;}
  if((m=s.match(/^(?:Keep reads with average quality at least|Remove reads with average quality below) (\d+(?:\.\d+)?)$/i))){fastp(`--qualified_quality_phred ${m[1]}`);warn(s,'fastp uses a base-quality threshold; review it against the original average-read rule');continue;}
  if(/^Remove reads with low quality$/i.test(s)){fastp('--qualified_quality_phred 20');continue;}
  if(/^(?:Check the quality(?: again)?|Show the quality report)$/i.test(s)){add('seqkit stats -T "$CURRENT"');p.tools.add('seqkit');continue;}
  if((m=s.match(/^Save the (?:result|sequences|reads) as (.+)$/i))){save(m[1]);continue;}
  if((m=s.match(/^Save the pair as (.+?) and (.+)$/i))){if(!p.forward)warn(s,'there is no paired result');else{for(const name of[m[1],m[2]])if(!p.outputs.includes(name))p.outputs.push(name);add(`OUT_FORWARD=$(flbio_numbered_output ${q(m[1])})`);add(`OUT_REVERSE=$(flbio_numbered_output ${q(m[2])})`);add('cp "$FORWARD" "$OUT_FORWARD"');add('cp "$REVERSE" "$OUT_REVERSE"');}continue;}
  warn(s,'this command needs a target-specific helper and was preserved as a TODO');
 }
 const warnings=p.warnings.map(value=>`# WARNING: ${value}`).join('\n'),body=p.lines.map(line=>`  ${line}`).join('\n')||'  :';
 const shell=`#!/usr/bin/env bash\nset -euo pipefail\n\n# Generated from ${program} by FigureLoom Bio.\n# Required commands: ${[...p.tools].sort().join(', ')}\n${warnings?`${warnings}\n`:''}FLBIO_TOTAL_RUNS=${p.runs}\nFLBIO_BASE_WORKDIR=\${FLBIO_BASE_WORKDIR:-$(mktemp -d "\${TMPDIR:-/tmp}/figureloom-bio.XXXXXX")}\ntrap 'rm -rf "$FLBIO_BASE_WORKDIR"' EXIT\n\nflbio_numbered_output(){ local name=$1; if [ "$FLBIO_TOTAL_RUNS" -le 1 ]; then printf '%s\\n' "$name"; return; fi; local directory base stem suffix; directory=$(dirname "$name"); base=$(basename "$name"); if [[ "$base" == *.* ]]; then stem=\${base%.*}; suffix=.\${base##*.}; else stem=$base; suffix=; fi; printf '%s/%s-%s%s\\n' "$directory" "$stem" "$FLBIO_RUN_INDEX" "$suffix"; }\n\nfor FLBIO_RUN_INDEX in $(seq 1 "$FLBIO_TOTAL_RUNS"); do\n  FLBIO_WORKDIR="$FLBIO_BASE_WORKDIR/run-$FLBIO_RUN_INDEX"\n  mkdir -p "$FLBIO_WORKDIR"\n${body}\ndone\n`;
 return{shell,warnings:p.warnings,tools:[...p.tools].sort(),inputs:p.inputs,outputs:p.outputs};
}
function render(source,target,program){
 const p=compile(source,program);
 if(target==='bash')return{...p,content:p.shell};
 if(target==='python')return{...p,content:`#!/usr/bin/env python3\n\"\"\"Generated from ${program} by FigureLoom Bio.\"\"\"\nimport subprocess\nWORKFLOW=${JSON.stringify(p.shell)}\nsubprocess.run([\"bash\",\"-lc\",WORKFLOW],check=True)\n`};
 if(target==='r')return{...p,content:`#!/usr/bin/env Rscript\n# Generated from ${program} by FigureLoom Bio.\nworkflow <- ${JSON.stringify(p.shell)}\nstatus <- system2(\"bash\",c(\"-lc\",shQuote(workflow)))\nif(status!=0)quit(status=status)\n`};
 if(target==='snakemake'){
  const body=p.shell.split('\n').map(line=>`        ${line}`).join('\n');
  return{...p,content:`# Generated from ${program} by FigureLoom Bio.\nrule figureloom_bio:\n    input: [${p.inputs.map(JSON.stringify).join(', ')}]\n    output: [${(p.outputs.length?p.outputs:['figureloom-bio.done']).map(JSON.stringify).join(', ')}]\n    shell:\n        r\"\"\"\n${body}\n        \"\"\"\n`};
 }
 let nextflowShell=p.shell;
 for(const name of p.inputs)nextflowShell=nextflowShell.replaceAll(q(name),'"${launchDir}/'+name+'"');
 nextflowShell=nextflowShell.replaceAll('$','\\$').replaceAll('\\${launchDir}','${launchDir}');
 return{...p,content:`nextflow.enable.dsl=2\n// Generated from ${program} by FigureLoom Bio.\nprocess FIGURELOOM_BIO {\n  output:\n${(p.outputs.length?p.outputs:['figureloom-bio.done']).map(value=>`    path ${JSON.stringify(value)}, optional: true`).join('\n')}\n  script:\n  \"\"\"\n${nextflowShell}\n  \"\"\"\n}\nworkflow { FIGURELOOM_BIO() }\n`};
}
const outputName=target=>`${(label.textContent||'program.flbio').replace(/\.flbio(?:\.txt)?$/i,'')}${targets[target][1]}`;
function update(){try{current=render(editor.value,select.value,label.textContent||'program.flbio');preview.textContent=current.content;filename.textContent=outputName(select.value);note.textContent=`Required tools\n${current.tools.join(', ')}${current.warnings.length?`\n\nWarnings (${current.warnings.length})\n${current.warnings.map(value=>`• ${value}`).join('\n')}`:'\n\nAll recognized commands have a translation rule.'}`;}catch(error){current=null;preview.textContent=error.message||String(error);filename.textContent='Translation needs attention';note.textContent='Fix the program sentence shown in the preview, then try again.';}}
const close=()=>dialog.close?.();button.addEventListener('click',()=>{update();dialog.showModal?.();});select.addEventListener('change',update);dialog.querySelector('.translator-close').addEventListener('click',close);dialog.querySelector('.translator-done').addEventListener('click',close);dialog.addEventListener('click',event=>{if(event.target===dialog)close();});dialog.querySelector('.translator-copy').addEventListener('click',async()=>{if(current)await navigator.clipboard?.writeText(current.content);});dialog.querySelector('.translator-download').addEventListener('click',()=>{if(!current)return;const blob=new Blob([current.content],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=outputName(select.value);document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),0);});
})();
