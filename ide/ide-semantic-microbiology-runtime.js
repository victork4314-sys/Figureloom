(() => {
  'use strict';
  const runtime=window.FigureLoomBioSemanticRuntime;
  if(!runtime||window.FigureLoomBioSemanticMicrobiologyRuntime)return;
  const actions=[
    'builtin_microbiology_prepare_reads','builtin_microbiology_assemble_paired','builtin_microbiology_assemble_single','assemble_current_bacterial_genome',
    'builtin_microbiology_check_assembly','builtin_microbiology_annotate','annotate_current_file','find_genes_current_file',
    'builtin_microbiology_resistance','find_resistance_current_file','builtin_microbiology_virulence','find_virulence_current_file',
    'builtin_microbiology_classify','identify_current_file','builtin_microbiology_plasmids','find_plasmids_current_file'
  ];
  const adapters=['AGATCGGAAGAGCACACGTCTGAACTCCAGTCA','AGATCGGAAGAGCGTCGTGTAGGGAAAGAGTGT','CTGTCTCTTATACACATCT'];
  const values=(node)=>node?.arguments?.runtime_values||[];
  const fail=(helpers,line,message)=>{throw new helpers.Error(message,line);};
  const seq=(data)=>data&&['seq','sequences'].includes(data.kind);
  const sets=(data,helpers,line)=>{if(!data)fail(helpers,line,'Open FASTA or FASTQ data first.');if(data.kind==='pair')return[data.a,data.b];if(!seq(data))fail(helpers,line,'This instruction needs FASTA or FASTQ sequence data.');return[data];};
  const records=(data,helpers,line)=>sets(data,helpers,line).flatMap((item)=>item.records||[]);
  const aq=(record)=>record.quality?[...record.quality].reduce((sum,ch)=>sum+ch.charCodeAt(0)-33,0)/record.quality.length:0;
  const rc=(sequence)=>{const map={A:'T',C:'G',G:'C',T:'A',U:'A',R:'Y',Y:'R',K:'M',M:'K',S:'S',W:'W',B:'V',V:'B',D:'H',H:'D',N:'N'};return[...String(sequence).toUpperCase()].reverse().map((base)=>map[base]||base).join('');};
  const overlap=(a,b,min=18)=>{for(let n=Math.min(a.length,b.length,180);n>=min;n--)if(a.slice(-n)===b.slice(0,n))return n;return 0;};
  const statistics=(data,helpers,line)=>{const all=records(data,helpers,line),lengths=all.map((record)=>record.sequence.length).sort((a,b)=>b-a),total=lengths.reduce((a,b)=>a+b,0);let running=0,n50=0;for(const length of lengths){running+=length;if(running>=total/2){n50=length;break;}}const sequence=all.map((record)=>record.sequence).join('').toUpperCase().replaceAll('U','T'),gc=sequence.length?[...sequence].filter((base)=>base==='G'||base==='C').length/sequence.length*100:0;return{count:all.length,total,n50,longest:lengths[0]||0,shortest:lengths.at(-1)||0,gc};};
  const findFile=(files,name)=>{const wanted=String(name).toLowerCase();return Object.keys(files||{}).find((key)=>key.toLowerCase()===wanted)||null;};
  const save=(context,helpers,name,data)=>{context.files[name]=helpers.encode(data,name);context.changed=1;};
  const outputFolder=(value,fallback)=>String(value||fallback).replace(/[\\/]$/,'');

  function prepare(context,helpers,line){
    const data=context.data,before=statistics(data,helpers,line);
    for(const record of records(data,helpers,line)){const positions=adapters.map((adapter)=>record.sequence.toUpperCase().indexOf(adapter)).filter((position)=>position>=0);if(positions.length){const end=Math.min(...positions);record.sequence=record.sequence.slice(0,end);if(record.quality!=null)record.quality=record.quality.slice(0,end);}}
    if(data.kind==='pair'){
      const kept=[];for(let i=0;i<data.a.records.length;i++){const left=data.a.records[i],right=data.b.records[i];if(aq(left)>=20&&aq(right)>=20&&left.sequence.length>=50&&right.sequence.length>=50)kept.push([left,right]);}data.a.records=kept.map((pair)=>pair[0]);data.b.records=kept.map((pair)=>pair[1]);
    }else data.records=data.records.filter((record)=>aq(record)>=20&&record.sequence.length>=50);
    const after=statistics(data,helpers,line);helpers.section('Bacterial reads prepared',{p:['Browser method: adapter trimming, Q20 filtering, and a 50-base minimum.',`Reads before\n${before.count}`,`Reads remaining\n${after.count}`]});
  }
  function assemble(context,helpers,line,inputSets,folder){
    const all=inputSets.flatMap((data)=>records(data,helpers,line));
    if(all.length>8000||all.reduce((sum,record)=>sum+record.sequence.length,0)>4000000)fail(helpers,line,'This browser assembly is limited to 8,000 reads or 4,000,000 bases. Run the same program in the desktop app or terminal for larger datasets.');
    let contigs=[...new Set(all.map((record)=>record.sequence.toUpperCase()))].sort((a,b)=>b.length-a.length).slice(0,900);
    for(let pass=0;pass<6;pass++){let best=[-1,-1,0,''];for(let i=0;i<contigs.length;i++)for(let j=0;j<contigs.length;j++)if(i!==j){const amount=overlap(contigs[i],contigs[j]);if(amount>best[2])best=[i,j,amount,contigs[i]+contigs[j].slice(amount)];}if(best[2]<18)break;contigs=contigs.filter((_,index)=>index!==best[0]&&index!==best[1]);contigs.push(best[3]);contigs.sort((a,b)=>b.length-a.length);}
    const out=`${outputFolder(folder,'assembly')}/contigs.fasta`;context.data={kind:'sequences',format:'fasta',records:contigs.map((sequence,index)=>({name:`contig-${index+1}`,description:'',sequence,quality:null})),sourceName:out};save(context,helpers,out,context.data);const summary=statistics(context.data,helpers,line);helpers.section('Bacterial genome assembled',{p:['Browser method: exact suffix-overlap assembly for small datasets.',`Contigs\n${summary.count}`,`Assembly bases\n${summary.total}`,`N50\n${summary.n50}`],file:out});
  }
  function quality(context,helpers,line,data,folder){const summary=statistics(data,helpers,line),rows=[{contigs:String(summary.count),total_bases:String(summary.total),n50:String(summary.n50),longest:String(summary.longest),shortest:String(summary.shortest),gc_percent:summary.gc.toFixed(2)}],out=`${outputFolder(folder,'assembly-quality')}/assembly-summary.csv`;context.data={kind:'table',columns:Object.keys(rows[0]),rows,delimiter:',',sourceName:out};save(context,helpers,out,context.data);helpers.section('Assembly quality',{p:['Browser method: direct contig statistics.'],table:{c:context.data.columns,r:rows},file:out});}
  function annotate(context,helpers,line,data,folder){
    const rows=[];for(const record of records(data,helpers,line))for(const [strand,sequence] of [['+',record.sequence.toUpperCase()],['-',rc(record.sequence)]])for(let frame=0;frame<3;frame++){let start=-1;for(let i=frame;i<=sequence.length-3;i+=3){const codon=sequence.slice(i,i+3);if(start<0&&codon==='ATG')start=i;if(start>=0&&['TAA','TAG','TGA'].includes(codon)){if(i+3-start>=90)rows.push({gene:`orf-${rows.length+1}`,contig:record.name,strand,start:String(start+1),end:String(i+3),length:String(i+3-start)});start=-1;}}}
    const out=`${outputFolder(folder,'annotation')}/browser-orfs.csv`;context.data={kind:'table',columns:['gene','contig','strand','start','end','length'],rows,delimiter:',',sourceName:out};save(context,helpers,out,context.data);helpers.section('Bacterial genome annotated',{p:['Browser method: six-frame start-to-stop ORF scan.',`Open reading frames\n${rows.length}`],table:{c:context.data.columns,r:rows},file:out});
  }
  function screen(context,helpers,line,data,database,kind){
    const refName=findFile(context.files,database)||findFile(context.files,`${database}.fasta`)||findFile(context.files,`${database}.fa`);
    if(!refName){context.flags.set(kind,0);helpers.section(`${kind[0].toUpperCase()+kind.slice(1)} marker screening`,{kind:'warning',p:[`Add a local FASTA named ${database}.fasta to Files for browser screening.`]});return;}
    const reference=helpers.open(refName),rows=[];for(const marker of records(reference,helpers,line))for(const sequence of records(data,helpers,line))if(sequence.sequence.toUpperCase().includes(marker.sequence.toUpperCase())||rc(sequence.sequence).includes(marker.sequence.toUpperCase()))rows.push({marker:marker.name,sequence:sequence.name,match:'exact contained sequence'});
    context.flags.set(kind,rows.length);context.data={kind:'table',columns:['marker','sequence','match'],rows,delimiter:',',sourceName:null};const out=`${kind}-markers.csv`;save(context,helpers,out,context.data);helpers.section(`${kind[0].toUpperCase()+kind.slice(1)} markers`,{p:['Browser method: exact contained-sequence matches against a local FASTA.',`Matches\n${rows.length}`],table:{c:context.data.columns,r:rows},file:out});
  }
  function classify(context,helpers,line,data,database){
    const refName=findFile(context.files,database)||findFile(context.files,`${database}.fasta`)||findFile(context.files,`${database}.fa`);
    if(!refName){helpers.section('Organism identification',{kind:'warning',p:[`Add a local FASTA named ${database}.fasta for a browser comparison.`]});return;}
    const reference=helpers.open(refName),kmers=new Set();for(const record of records(data,helpers,line).slice(0,4000))for(let i=0;i<=record.sequence.length-15;i+=5)kmers.add(record.sequence.slice(i,i+15));
    const rows=records(reference,helpers,line).map((record)=>{let total=0,hits=0;for(let i=0;i<=record.sequence.length-15;i+=5){total++;if(kmers.has(record.sequence.slice(i,i+15)))hits++;}return{reference:record.name,shared_kmers:String(hits),score_percent:(total?hits/total*100:0).toFixed(2)};}).sort((a,b)=>Number(b.score_percent)-Number(a.score_percent));
    context.data={kind:'table',columns:['reference','shared_kmers','score_percent'],rows,delimiter:',',sourceName:'browser-classification.csv'};save(context,helpers,'browser-classification.csv',context.data);helpers.section('Organism identification',{p:['Browser method: small local 15-mer comparison.',rows[0]?`Best local reference\n${rows[0].reference} (${rows[0].score_percent}%)`:'No references compared.'],table:{c:context.data.columns,r:rows},file:'browser-classification.csv'});
  }
  function plasmids(context,helpers,line,data,folder){const candidates=records(data,helpers,line).filter((record)=>record.sequence.length>=100&&overlap(record.sequence.slice(-60),record.sequence.slice(0,60))>=18),out=`${outputFolder(folder,'plasmids')}/plasmid-candidates.fasta`;context.data={kind:'sequences',format:'fasta',records:candidates.map((record)=>structuredClone(record)),sourceName:out};save(context,helpers,out,context.data);context.flags.set('plasmids',candidates.length);helpers.section('Plasmid candidates',{p:['Browser method: circular-end-overlap candidate scan.',`Candidates\n${candidates.length}`],file:out});}

  async function handler({node,context,line,helpers}){
    const action=node.action,args=values(node);
    if(action==='builtin_microbiology_prepare_reads'){prepare(context,helpers,line);return true;}
    if(action==='builtin_microbiology_assemble_paired'){assemble(context,helpers,line,[helpers.open(args[0]),helpers.open(args[1])],args[2]);return true;}
    if(action==='builtin_microbiology_assemble_single'){assemble(context,helpers,line,[helpers.open(args[0])],args[1]);return true;}
    if(action==='assemble_current_bacterial_genome'){assemble(context,helpers,line,[context.data], 'assembly');return true;}
    if(action==='builtin_microbiology_check_assembly'){quality(context,helpers,line,helpers.open(args[0]),args[1]);return true;}
    if(action==='builtin_microbiology_annotate'){annotate(context,helpers,line,helpers.open(args[0]),args[1]);return true;}
    if(action==='annotate_current_file'||action==='find_genes_current_file'){annotate(context,helpers,line,context.data,'annotation');return true;}
    if(action==='builtin_microbiology_resistance'){screen(context,helpers,line,helpers.open(args[0]),args[1],'resistance');return true;}
    if(action==='find_resistance_current_file'){screen(context,helpers,line,context.data,'resistance-markers','resistance');return true;}
    if(action==='builtin_microbiology_virulence'){screen(context,helpers,line,helpers.open(args[0]),'virulence-markers','virulence');return true;}
    if(action==='find_virulence_current_file'){screen(context,helpers,line,context.data,'virulence-markers','virulence');return true;}
    if(action==='builtin_microbiology_classify'){classify(context,helpers,line,helpers.open(args[0]),args[1]);return true;}
    if(action==='identify_current_file'){classify(context,helpers,line,context.data,args[0]);return true;}
    if(action==='builtin_microbiology_plasmids'){plasmids(context,helpers,line,helpers.open(args[0]),args[1]);return true;}
    if(action==='find_plasmids_current_file'){plasmids(context,helpers,line,context.data,'plasmids');return true;}
    return false;
  }
  runtime.registerAction(actions,handler);
  window.FigureLoomBioSemanticMicrobiologyRuntime=Object.freeze({actions:[...actions],handler});
})();
