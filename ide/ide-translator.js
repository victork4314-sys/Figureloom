(() => {
'use strict';
const editor=document.getElementById('programEditor'),format=document.getElementById('formatButton'),label=document.getElementById('activeFileLabel');
if(!editor||!format||!label)return;
const targets={python:['Python','.py'],r:['R','.R'],bash:['Bash','.sh'],snakemake:['Snakemake','.smk'],nextflow:['Nextflow','.nf'],julia:['Julia','.jl'],ruby:['Ruby','.rb'],perl:['Perl','.pl'],powershell:['PowerShell','.ps1']};
const button=document.createElement('button');button.type='button';button.textContent='Translate';button.id='translateProgramButton';format.parentElement?.insertBefore(button,format);
const dialog=document.createElement('dialog');dialog.className='translator-dialog';dialog.innerHTML=`<div class="translator-shell"><header><div><span>Interoperability</span><h2>Translate this program</h2></div><button class="translator-close" type="button" aria-label="Close">×</button></header><div class="translator-body"><aside class="translator-options"><label>Target language<select class="translator-target">${Object.entries(targets).map(([key,value])=>`<option value="${key}">${value[0]}</option>`).join('')}</select></label><div class="translator-note"></div></aside><section class="translator-preview"><div class="translator-preview-bar"><strong class="translator-filename"></strong><span>Generated from the open .flbio program</span></div><pre class="translator-code"></pre></section></div><footer><button class="translator-copy" type="button">Copy code</button><button class="translator-done" type="button">Done</button><button class="translator-download primary-button" type="button">Download translation</button></footer></div>`;document.body.append(dialog);
const select=dialog.querySelector('.translator-target'),note=dialog.querySelector('.translator-note'),filename=dialog.querySelector('.translator-filename'),preview=dialog.querySelector('.translator-code');let current=null;
class RuntimeTranslation extends Error{}
const q=value=>`'${String(value).replaceAll("'",`'\\''`)}'`;
const list=text=>{let value=String(text).trim().replace(', and ',', ');if(!value.includes(',')&&value.includes(' and ')){const at=value.lastIndexOf(' and ');value=`${value.slice(0,at)}, ${value.slice(at+5)}`;}return value.split(',').map(item=>item.trim()).filter(Boolean);};
const kind=name=>{let lower=String(name).toLowerCase().replace(/\.gz$/,'');if(/\.(csv|tsv)$/.test(lower))return'table';if(/\.(fa|fasta|fna|ffn|faa|frn)$/.test(lower))return'fasta';if(/\.(fq|fastq)$/.test(lower))return'fastq';return'unknown';};
const extension=name=>String(name).match(/(\.[^.]+(?:\.gz)?)$/i)?.[1]||'.tmp';
const usesBlocks=source=>/(^|\n)\s*(?:If .+:|Otherwise(?:,? if .+)?:|For every .+:|Make a recipe called .+:)/im.test(source);
function compile(source,program){
 const p={lines:[],warnings:[],tools:new Set(['bash']),inputs:[],outputs:[],current:null,kind:null,ext:'.tmp',step:0,runs:1,forward:null,reverse:null};
 const add=line=>p.lines.push(line),warn=(sentence,reason)=>{throw new RuntimeTranslation(`${sentence}: ${reason}`);};
 const temp=(ext=p.ext)=>`$FLBIO_WORKDIR/step-${String(++p.step).padStart(3,'0')}${ext}`;
 const open=name=>{p.current=name;p.kind=kind(name);p.ext=extension(name);p.forward=p.reverse=null;if(!p.inputs.includes(name))p.inputs.push(name);add(`CURRENT=${q(name)}`);add('test -f "$CURRENT"');};
 const seqkit=args=>{const next=temp();add(`seqkit ${args} "$CURRENT" -o "${next}"`);add(`CURRENT="${next}"`);p.tools.add('seqkit');};
 const fastp=(args='')=>{if(p.forward&&p.reverse){const left=temp('.fastq'),right=temp('.fastq');add(`fastp -i "$FORWARD" -I "$REVERSE" -o "${left}" -O "${right}" ${args}`.trim());add(`FORWARD="${left}"`);add(`REVERSE="${right}"`);}else{const next=temp('.fastq');add(`fastp -i "$CURRENT" -o "${next}" ${args}`.trim());add(`CURRENT="${next}"`);}p.tools.add('fastp');};
 const pandas=operation=>{const next=temp('.csv'),code=`import pandas as pd,sys; src,dst=sys.argv[1:3]; df=pd.read_csv(src,sep='\\t' if src.lower().endswith('.tsv') else ','); ${operation}; df.to_csv(dst,index=False)`;add(`python3 -c ${q(code)} "$CURRENT" "${next}"`);add(`CURRENT="${next}"`);p.tools.add('python3');p.tools.add('pandas');};
 const merge=(name,sentence,rows=false)=>{if(!p.current){warn(sentence,'there is no open file before the merge');return;}if(!p.inputs.includes(name))p.inputs.push(name);if(rows||p.kind==='table'){const next=temp('.csv');add(`csvstack "$CURRENT" ${q(name)} > "${next}"`);add(`CURRENT="${next}"`);p.kind='table';p.ext='.csv';p.tools.add('csvstack');}else if(['fasta','fastq'].includes(p.kind)&&kind(name)===p.kind){const next=temp();add(`cat "$CURRENT" ${q(name)} > "${next}"`);add(`CURRENT="${next}"`);}else warn(sentence,'the file types are not clearly compatible');};
 const save=name=>{if(!p.outputs.includes(name))p.outputs.push(name);add(`OUTPUT=$(flbio_numbered_output ${q(name)})`);add('cp "$CURRENT" "$OUTPUT"');};
 const raw=source.split(/\r?\n/).map((line,index)=>({text:line.trim(),line:index+1})).filter(item=>item.text&&!item.text.startsWith('#'));
 for(const item of raw){if(!item.text.endsWith('.'))throw new Error(`Line ${item.line} needs a period. Decision, loop, and recipe headers end with a colon.`);const s=item.text.slice(0,-1).trim();let m;
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
  if(/^Validate the sequences$/i.test(s)){warn(s,'native validation is required for exact counters');continue;}
  if(/^Remove gaps from the sequences$/i.test(s)){seqkit('seq -g');continue;}
  if((m=s.match(/^Keep sequences with names containing (.+)$/i))){seqkit(`grep -n -r -p ${q(m[1])}`);continue;}
  if((m=s.match(/^Remove sequences with names containing (.+)$/i))){seqkit(`grep -n -r -v -p ${q(m[1])}`);continue;}
  if(/^Make duplicate sequence names unique$/i.test(s)){seqkit('rename');continue;}
  if(/^Remove sequences containing ambiguous bases$/i.test(s)){seqkit(`grep -s -v -r -p '[^ACGTUacgtu]'`);continue;}
  if(/^Keep sequences with at most [0-9]+ ambiguous bases$/i.test(s)){warn(s,'native ambiguous-base counting is required');continue;}
  if(/^Split the sequences into files with [1-9][0-9]* sequences each as .+$/i.test(s)){warn(s,'native output naming is required');continue;}
  if(/^Remove adapter sequences$/i.test(s)){fastp(p.forward?'--detect_adapter_for_pe':'');continue;}
  if(/^(?:Keep reads with average quality at least|Remove reads with average quality below) \d+(?:\.\d+)?$/i.test(s)){warn(s,'native average-read quality filtering is required');continue;}
  if(/^Remove reads with low quality$/i.test(s)){fastp('--qualified_quality_phred 20');continue;}
  if(/^(?:Check the quality(?: again)?|Show the quality report)$/i.test(s)){add('seqkit stats -T "$CURRENT"');p.tools.add('seqkit');continue;}
  if((m=s.match(/^Save the (?:result|sequences|reads) as (.+)$/i))){save(m[1]);continue;}
  if((m=s.match(/^Save the pair as (.+?) and (.+)$/i))){if(!p.forward)warn(s,'there is no paired result');else{for(const name of[m[1],m[2]])if(!p.outputs.includes(name))p.outputs.push(name);add(`OUT_FORWARD=$(flbio_numbered_output ${q(m[1])})`);add(`OUT_REVERSE=$(flbio_numbered_output ${q(m[2])})`);add('cp "$FORWARD" "$OUT_FORWARD"');add('cp "$REVERSE" "$OUT_REVERSE"');}continue;}
  throw new RuntimeTranslation(`The standalone ${program} translation does not have an exact rule for: ${s}.`);
 }
 const body=p.lines.map(line=>`  ${line}`).join('\n')||'  :';
 const shell=`#!/usr/bin/env bash\nset -euo pipefail\n\n# Generated from ${program} by FigureLoom Bio.\n# Required commands: ${[...p.tools].sort().join(', ')}\nFLBIO_TOTAL_RUNS=${p.runs}\nFLBIO_BASE_WORKDIR=\${FLBIO_BASE_WORKDIR:-$(mktemp -d "\${TMPDIR:-/tmp}/figureloom-bio.XXXXXX")}\ntrap 'rm -rf "$FLBIO_BASE_WORKDIR"' EXIT\n\nflbio_numbered_output(){ local name=$1; if [ "$FLBIO_TOTAL_RUNS" -le 1 ]; then printf '%s\\n' "$name"; return; fi; local directory base stem suffix; directory=$(dirname "$name"); base=$(basename "$name"); if [[ "$base" == *.* ]]; then stem=\${base%.*}; suffix=.\${base##*.}; else stem=$base; suffix=; fi; printf '%s/%s-%s%s\\n' "$directory" "$stem" "$FLBIO_RUN_INDEX" "$suffix"; }\n\nfor FLBIO_RUN_INDEX in $(seq 1 "$FLBIO_TOTAL_RUNS"); do\n  FLBIO_WORKDIR="$FLBIO_BASE_WORKDIR/run-$FLBIO_RUN_INDEX"\n  mkdir -p "$FLBIO_WORKDIR"\n${body}\ndone\n`;
 return{shell,warnings:[],tools:[...p.tools].sort(),inputs:p.inputs,outputs:p.outputs,runtime:false};
}
function runtimePlan(source,program){
 let delimiter='FIGURELOOM_BIO_PROGRAM';while(source.includes(delimiter))delimiter+='_X';
 const body=source.endsWith('\n')?source:`${source}\n`;
 const shell=`#!/usr/bin/env bash\nset -euo pipefail\n\n# Generated from ${program} by FigureLoom Bio.\nFLBIO_PROGRAM=$(mktemp "./.figureloom-bio.XXXXXX.flbio")\ntrap 'rm -f "$FLBIO_PROGRAM"' EXIT\ncat > "$FLBIO_PROGRAM" <<'${delimiter}'\n${body}${delimiter}\nflbio run "$FLBIO_PROGRAM" --allow-tools\n`;
 return{shell,warnings:[],tools:['bash','flbio'],inputs:[],outputs:[],runtime:true};
}
function base64Source(source){let binary='';for(const byte of new TextEncoder().encode(source))binary+=String.fromCharCode(byte);return btoa(binary);}
function runtimeLanguage(source,target,program){
 const payload=base64Source(source),common={warnings:[],tools:['flbio'],inputs:[],outputs:[],runtime:true};
 if(target==='julia')return{...common,content:`#!/usr/bin/env julia\n# Generated from ${program} by FigureLoom Bio.\nusing Base64\nsource = String(base64decode("${payload}"))\nfile = tempname() * ".flbio"\nwrite(file, source)\ntry\n    run(\`flbio run $file --allow-tools\`)\nfinally\n    rm(file; force=true)\nend\n`};
 if(target==='ruby')return{...common,content:`#!/usr/bin/env ruby\n# Generated from ${program} by FigureLoom Bio.\nrequire "base64"\nrequire "tempfile"\nfile = Tempfile.new(["figureloom-bio-", ".flbio"])\nbegin\n  file.write(Base64.strict_decode64("${payload}"))\n  file.close\n  ok = system("flbio", "run", file.path, "--allow-tools")\n  exit(ok ? 0 : ($?.exitstatus || 1))\nensure\n  file.close! rescue nil\nend\n`};
 if(target==='perl')return{...common,content:`#!/usr/bin/env perl\n# Generated from ${program} by FigureLoom Bio.\nuse strict;\nuse warnings;\nuse File::Temp qw(tempfile);\nuse MIME::Base64 qw(decode_base64);\nmy ($handle, $file) = tempfile("figureloom-bio-XXXXXX", SUFFIX => ".flbio", UNLINK => 0);\nprint $handle decode_base64("${payload}");\nclose $handle;\nmy $status = system("flbio", "run", $file, "--allow-tools");\nunlink $file;\nexit($status == -1 ? 1 : ($status >> 8));\n`};
 return{...common,content:`# Generated from ${program} by FigureLoom Bio.\n$source = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String("${payload}"))\n$file = Join-Path ([IO.Path]::GetTempPath()) (([IO.Path]::GetRandomFileName()) + ".flbio")\ntry {\n    [IO.File]::WriteAllText($file, $source, [Text.UTF8Encoding]::new($false))\n    & flbio run $file --allow-tools\n    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }\n}\nfinally {\n    Remove-Item -LiteralPath $file -Force -ErrorAction SilentlyContinue\n}\n`};
}
function shellLanguage(p,target,program){
 if(target==='bash')return{...p,content:p.shell};
 if(target==='python')return{...p,content:`#!/usr/bin/env python3\n\"\"\"Generated from ${program} by FigureLoom Bio.\"\"\"\nimport subprocess\nWORKFLOW=${JSON.stringify(p.shell)}\nsubprocess.run(["bash","-lc",WORKFLOW],check=True)\n`};
 if(target==='r')return{...p,content:`#!/usr/bin/env Rscript\n# Generated from ${program} by FigureLoom Bio.\nworkflow <- ${JSON.stringify(p.shell)}\nstatus <- system2("bash",c("-lc",shQuote(workflow)))\nif(status!=0)quit(status=status)\n`};
 if(target==='snakemake'){const body=p.shell.split('\n').map(line=>`        ${line}`).join('\n');return{...p,content:`# Generated from ${program} by FigureLoom Bio.\nrule figureloom_bio:\n    input: [${p.inputs.map(JSON.stringify).join(', ')}]\n    output: [${(p.outputs.length?p.outputs:['figureloom-bio.done']).map(JSON.stringify).join(', ')}]\n    shell:\n        r\"\"\"\n${body}\n        \"\"\"\n`};}
 let nextflowShell=p.shell;for(const name of p.inputs)nextflowShell=nextflowShell.replaceAll(q(name),'"${launchDir}/'+name+'"');nextflowShell=nextflowShell.replaceAll('$','\\$').replaceAll('\\${launchDir}','${launchDir}');return{...p,content:`nextflow.enable.dsl=2\n// Generated from ${program} by FigureLoom Bio.\nprocess FIGURELOOM_BIO {\n  output:\n${(p.outputs.length?p.outputs:['figureloom-bio.done']).map(value=>`    path ${JSON.stringify(value)}, optional: true`).join('\n')}\n  script:\n  \"\"\"\n${nextflowShell}\n  \"\"\"\n}\nworkflow { FIGURELOOM_BIO() }\n`};
}
function render(source,target,program){
 if(['julia','ruby','perl','powershell'].includes(target))return runtimeLanguage(source,target,program);
 let plan;if(usesBlocks(source))plan=runtimePlan(source,program);else{const lowered=window.FigureLoomBioCurrentFile?.normalizeSource?.(source)||source;try{plan=compile(lowered,program);}catch(error){if(!(error instanceof RuntimeTranslation))throw error;plan=runtimePlan(source,program);}}
 return shellLanguage(plan,target,program);
}
const outputName=target=>`${(label.textContent||'program.flbio').replace(/\.flbio(?:\.txt)?$/i,'')}${targets[target][1]}`;
function update(){try{current=render(editor.value,select.value,label.textContent||'program.flbio');preview.textContent=current.content;filename.textContent=outputName(select.value);note.textContent=`Required tools\n${current.tools.join(', ')}\n\n${current.runtime?'This translation preserves the complete FigureLoom Bio program and runs it through the installed flbio engine.':'Every sentence was translated directly with no placeholders.'}`;}catch(error){current=null;preview.textContent=error.message||String(error);filename.textContent='Translation needs attention';note.textContent='Fix the program sentence shown in the preview, then try again.';}}
const close=()=>dialog.close?.();button.addEventListener('click',()=>{update();dialog.showModal?.();});select.addEventListener('change',update);dialog.querySelector('.translator-close').addEventListener('click',close);dialog.querySelector('.translator-done').addEventListener('click',close);dialog.addEventListener('click',event=>{if(event.target===dialog)close();});dialog.querySelector('.translator-copy').addEventListener('click',async()=>{if(current)await navigator.clipboard?.writeText(current.content);});dialog.querySelector('.translator-download').addEventListener('click',()=>{if(!current)return;const blob=new Blob([current.content],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=outputName(select.value);document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),0);});
window.FigureLoomBioTranslator=Object.freeze({targets,render,usesBlocks});
})();
