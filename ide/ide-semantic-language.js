(() => {
  'use strict';
  const GRAMMAR_URL = '../figureloom-bio/figureloom_bio/language_grammar.json?v=1';
  class LanguageError extends Error {
    constructor(code, message, token = null, lineNumber = null) {
      super(message); this.name = 'FigureLoomBioLanguageError'; this.code = code; this.token = token; this.lineNumber = lineNumber;
    }
  }
  const esc = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const normalize = (value) => String(value).toLowerCase().replace(/[’]/g, "'").replace(/\s+/g, ' ').trim();
  const filenamePattern = /^(?:[^\s]+\.)+(?:csv|tsv|txt|fa|fasta|fna|ffn|faa|frn|fq|fastq|nwk|svg)$/i;
  function phraseEntries(group) {
    const entries = [];
    Object.entries(group || {}).forEach(([kind, forms]) => forms.forEach((form) => entries.push({ kind, form:normalize(form), words:normalize(form).split(' ') })));
    return entries.sort((a,b) => b.words.length - a.words.length || b.form.length - a.form.length);
  }
  function phraseMap(grammar) {
    const map = new Map();
    for (const category of ['operations','targets','comparisons','roles','modifiers','units','booleans']) {
      const type = category.endsWith('s') ? category.slice(0,-1) : category;
      for (const [kind, forms] of Object.entries(grammar[category] || {})) {
        for (const form of forms) {
          const key = normalize(form);
          const list = map.get(key) || [];
          list.push({ type, kind, form:key });
          map.set(key, list);
        }
      }
    }
    return map;
  }
  function isFilename(text, grammar) {
    let leaf=String(text).replace(/^['"]|['"]$/g,'').split(/[\\/]/).at(-1) || '';
    if (leaf.toLowerCase().endsWith('.gz')) leaf=leaf.slice(0,-3);
    if (!leaf.includes('.')) return false;
    return (grammar.file_extensions || []).map((value)=>String(value).toLowerCase()).includes(leaf.split('.').at(-1).toLowerCase());
  }
  function tokenize(source, grammar, lineNumber = 1) {
    const raw=[];
    const matcher=/"[^"\n]*"|'[^'\n]*'|[A-Za-z0-9_./\\:+-]+|[,()]/g;
    for (const match of String(source).matchAll(matcher)) {
      const text=match[0];
      if (text.endsWith(':') && text.length>1 && !/^[A-Za-z]:$/.test(text)) {
        raw.push({text:text.slice(0,-1)}); raw.push({text:':'});
      } else raw.push({text});
    }
    const phrases=phraseMap(grammar);
    const maxWords=Math.max(1,...[...phrases.keys()].map((key)=>key.split(' ').length));
    const primaryOrder={operation:0,comparison:1,role:2,target:3,modifier:4,unit:5,boolean:6};
    const output=[];
    for (let cursor=0; cursor<raw.length;) {
      const original=raw[cursor].text;
      const cleaned=original.replace(/^['"]|['"]$/g,'');
      const norm=normalize(cleaned);
      const index=output.length;
      if ([',','(',')',':'].includes(original)) { output.push({type:'punctuation',text:original,normalized:norm,index,lineNumber,semantics:[]}); cursor++; continue; }
      if (/^\d+(?:\.\d+)?$/.test(cleaned)) { output.push({type:'number',text:cleaned,normalized:norm,index,lineNumber,semantics:[]}); cursor++; continue; }
      if (isFilename(cleaned,grammar)) { output.push({type:'filename',text:cleaned,normalized:norm,index,lineNumber,semantics:[]}); cursor++; continue; }
      let match=null;
      for (let size=Math.min(maxWords,raw.length-cursor); size>=1; size--) {
        const words=raw.slice(cursor,cursor+size).map((item)=>normalize(item.text.replace(/^['"]|['"]$/g,'')));
        const key=words.join(' '), tags=phrases.get(key);
        if (tags) { match={size,key,tags}; break; }
      }
      if (match) {
        const text=raw.slice(cursor,cursor+match.size).map((item)=>item.text.replace(/^['"]|['"]$/g,'')).join(' ');
        const primary=[...match.tags].sort((a,b)=>(primaryOrder[a.type]??99)-(primaryOrder[b.type]??99))[0];
        output.push({type:primary.type,text,normalized:normalize(text),index,lineNumber,semantics:match.tags.map((tag)=>({...tag,length:1}))});
        cursor+=match.size; continue;
      }
      let type=(grammar.articles||[]).includes(norm)?'article':(grammar.fillers||[]).includes(norm)?'filler':'identifier';
      if (['and','or','not'].includes(norm)) type='boolean_operator';
      output.push({type,text:cleaned,normalized:norm,index,lineNumber,semantics:[]}); cursor++;
    }
    return output;
  }
  function semanticTokens(tokens, type) {
    return tokens.flatMap((token) => token.semantics.filter((semantic) => semantic.type === type).map((semantic) => ({ ...semantic, token })));
  }
  function wordsBetween(tokens, start, end) {
    return tokens.slice(start, end).filter((t) => t.type !== 'comma').map((t) => t.text).join(' ').trim();
  }
  function firstIndex(tokens, predicate, from = 0) {
    for (let i=from;i<tokens.length;i++) if (predicate(tokens[i], i)) return i;
    return -1;
  }
  function parseCondition(tokens, grammar, lineNumber) {
    const work = tokens.filter((token) => !grammar.articles.includes(token.normalized) && !grammar.fillers.includes(token.normalized));
    if (!work.length) throw new LanguageError('missing_condition', 'A condition is required after If.', null, lineNumber);
    const source = wordsBetween(work, 0, work.length);
    const logicalIndex = (word) => firstIndex(work, (token) => token.normalized === word && (token.type === 'boolean_operator' || token.semantics.some((semantic) => semantic.type === 'boolean' && semantic.kind === word)));
    const orIndex = logicalIndex('or');
    if (orIndex >= 0) return { type:'condition', kind:'boolean', operator:'or', left:parseCondition(work.slice(0,orIndex),grammar,lineNumber), right:parseCondition(work.slice(orIndex+1),grammar,lineNumber), source };
    const andIndex = logicalIndex('and');
    if (andIndex >= 0) return { type:'condition', kind:'boolean', operator:'and', left:parseCondition(work.slice(0,andIndex),grammar,lineNumber), right:parseCondition(work.slice(andIndex+1),grammar,lineNumber), source };
    if (work[0]?.normalized === 'not') return { type:'condition', kind:'not', value:parseCondition(work.slice(1),grammar,lineNumber), source };
    if (work.length === 1 && work[0].normalized === 'true') return { type:'condition', kind:'literal', value:true, source };
    if (work.length === 1 && work[0].normalized === 'false') return { type:'condition', kind:'literal', value:false, source };
    const lower = work.map((token) => token.normalized).join(' ');
    const targets = unique(semanticTokens(work,'target').map((entry)=>entry.kind));
    if (lower.includes('exists')) {
      const filename = work.find((token)=>token.type==='filename')?.text || wordsBetween(work,0,work.findIndex((token)=>token.normalized==='exists'));
      return { type:'condition', kind:'predicate', left:{kind:'file',name:filename}, operator:'exists', right:true, source };
    }
    if (lower.includes('empty') && targets.includes('result')) return { type:'condition', kind:'predicate', left:{kind:'result'}, operator:lower.includes('not empty')?'not_empty':'empty', right:true, source };
    if (lower.includes('empty') && targets.includes('file')) return { type:'condition', kind:'predicate', left:{kind:'file',name:'current'}, operator:lower.includes('not empty')?'not_empty':'empty', right:true, source };
    if (lower.includes('found')) return { type:'condition', kind:'predicate', left:{kind:'flag',name:targets[0]||source.replace(/\b(?:was|were|is|are|found|not|no)\b/gi,'').trim()}, operator:/^(?:no|not)\b/.test(lower)?'not_found':'found', right:true, source };
    const cmpIndex = firstIndex(work, (token) => token.semantics.some((semantic) => semantic.type === 'comparison'));
    if (cmpIndex < 0) throw new LanguageError('invalid_condition', `The condition could not be parsed into a Boolean value or comparison: ${source}`, work[0] || null, lineNumber);
    const comparison = work[cmpIndex].semantics.filter((semantic) => semantic.type === 'comparison').sort((a,b)=>b.length-a.length)[0];
    const leftText = wordsBetween(work,0,cmpIndex);
    const rightStart = cmpIndex + comparison.length;
    const rightText = wordsBetween(work,rightStart,work.length);
    const numberToken = work.find((token)=>token.type==='number');
    const metricTarget = targets.find((target)=>['read','sequence','row','base','assembly'].includes(target));
    if (metricTarget && numberToken) {
      const numericValue=Number(numberToken.text);
      return {type:'condition',kind:'comparison',left:{kind:'metric',target:metricTarget,metric:targets.includes('quality')?'average_quality':targets.includes('gc_content')?'gc_content':'count'},operator:comparison.kind,right:numericValue,source};
    }
    if (!leftText) throw new LanguageError('missing_left_operand','The condition is missing what should be compared.',work[cmpIndex],lineNumber);
    if (!rightText) throw new LanguageError('missing_right_operand',`The comparison “${comparison.form}” is missing a value.`,work[cmpIndex],lineNumber);
    const numericRight = /^\d+(?:\.\d+)?$/.test(rightText) ? Number(rightText) : null;
    let left = { kind:'value', value:leftText.replace(/^(?:the\s+)?/i,'') };
    if (targets.includes('column')) left = { kind:'column', name:leftText.replace(/^(?:the\s+)?(?:column\s+)?/i,'') };
    return { type:'condition', kind:'comparison', left, operator:comparison.kind, right:numericRight !== null ? numericRight : rightText, source };
  }
  function unique(values) { return [...new Set(values.filter((value) => value !== null && value !== undefined && value !== ''))]; }
  function hasTag(token,type,kind=null){
    return !!token && token.semantics.some((semantic)=>semantic.type===type&&(kind===null||semantic.kind===kind));
  }
  function tagValues(tokens,type){
    return unique(tokens.flatMap((token)=>token.semantics.filter((semantic)=>semantic.type===type).map((semantic)=>semantic.kind)));
  }
  function targetValues(tokens){
    const output=[];
    for(const token of tokens){
      const tagged=token.semantics.filter((semantic)=>semantic.type==='target').map((semantic)=>semantic.kind);
      for(const value of tagged) if(!output.includes(value)) output.push(value);
      for(const value of ['sequence','read','name']) if(tagged.includes(value)&&!output.includes(value)) output.push(value);
    }
    return output;
  }
  function meaningful(tokens,{keepTargets=false}={}){
    return tokens.filter((token)=>{
      if(['article','filler','punctuation'].includes(token.type))return false;
      if(!keepTargets&&token.semantics.some((semantic)=>['target','modifier','unit','operation'].includes(semantic.type)))return false;
      return true;
    });
  }
  function textOf(tokens,{keepTargets=false}={}){return meaningful(tokens,{keepTargets}).map((token)=>token.text).join(' ').trim().replace(/^[ ,]+|[ ,]+$/g,'');}
  function valueText(tokens){return tokens.filter((token)=>!['article','filler','punctuation'].includes(token.type)).map((token)=>token.text).join(' ').trim().replace(/^[ ,]+|[ ,]+$/g,'');}
  function stripRoleTarget(value,target){return String(value).replace(new RegExp(`\\b${esc(target)}s?\\b`,'ig'),'').replace(/\s+/g,' ').trim().replace(/^[ ,]+|[ ,]+$/g,'');}
  function parseRowCondition(tokens,roles,lineNumber){
    const whereIndex=tokens.findIndex((token)=>hasTag(token,'role','where'));
    if(whereIndex>=0){
      const body=tokens.slice(whereIndex+1);
      const comparisonIndex=body.findIndex((token)=>hasTag(token,'comparison','equals')||hasTag(token,'comparison','not_equals'));
      if(comparisonIndex<0)throw new LanguageError('missing_condition_comparison','The condition after where is missing a comparison such as is, equals, or is not.',tokens[0]||null,lineNumber);
      const column=textOf(body.slice(0,comparisonIndex));
      const value=textOf(body.slice(comparisonIndex+1));
      const comparator=body[comparisonIndex].semantics.find((semantic)=>semantic.type==='comparison')?.kind;
      if(!column||!value)throw new LanguageError('incomplete_row_condition','A row condition needs both a column and a value.',tokens[0]||null,lineNumber);
      return {column,comparison:comparator,value};
    }
    const column=roles.column;
    const markedIndex=tokens.findIndex((token)=>token.normalized==='marked');
    if(column&&markedIndex>=0){
      let value=textOf(tokens.slice(markedIndex+1));
      if(value.toLowerCase().includes(String(column).toLowerCase()))value=value.split(/\b(?:under|in)\b/i,1)[0].trim();
      return {column:String(column),comparison:'equals',value};
    }
    if(column&&roles.comparison)return {column:String(column),comparison:'equals',value:String(roles.comparison)};
    return null;
  }
  function extractFrame(tokens, grammar, lineNumber) {
    const operationIndex=tokens.findIndex((token)=>hasTag(token,'operation'));
    if(operationIndex<0)throw new LanguageError('missing_operation','This instruction is missing an operation such as Open, Keep, Remove, Show, Save, or Calculate.',tokens[0]||null,lineNumber);
    const operationToken=tokens[operationIndex];
    const operation=operationToken.semantics.find((semantic)=>semantic.type==='operation').kind;
    const tail=tokens.slice(operationIndex+1);
    const sourceText=tokens.map((token)=>token.text).join(' ');
    const numbers=tail.filter((token)=>token.type==='number').map((token)=>token.text);
    const units=tagValues(tail,'unit');
    const files=unique(tail.filter((token)=>token.type==='filename').map((token)=>token.text));
    const modifiers=tagValues(tail,'modifier');
    const lowerSource=sourceText.toLowerCase();
    if(lowerSource.split(/\s+/).some((word)=>['all','every','each'].includes(word))&&!modifiers.includes('all'))modifiers.push('all');
    if((lowerSource.includes('as a pair')||lowerSource.includes('read pair'))&&!modifiers.includes('pair'))modifiers.push('pair');
    if(operation==='show'&&operationToken.normalized==='list'&&targetValues(tail).includes('file')&&!modifiers.includes('all'))modifiers.push('all');

    const structural=(token,index)=>{
      const role=token.semantics.find((semantic)=>semantic.type==='role')?.kind||null;
      const comparisonTag=token.semantics.find((semantic)=>semantic.type==='comparison')?.kind||null;
      const following=tail.slice(index+1).find((item)=>!['article','filler','punctuation'].includes(item.type));
      if(token.normalized==='under'&&comparisonTag==='less')return following?.type==='number'?['comparison','less']:['role','column'];
      if(token.normalized==='to'&&targetValues(tail).includes('base')&&numbers.length>=2)return null;
      if(role){if(role==='in'&&following&&hasTag(following,'operation','sort'))return null;return ['role',role];}
      if(comparisonTag)return ['comparison',comparisonTag];
      return null;
    };
    let firstStructure=tail.findIndex((token,index)=>structural(token,index));
    if(firstStructure<0)firstStructure=tail.length;
    let head=tail.slice(0,firstStructure);
    const namedTarget=['result','recipe','sequence'].find((target)=>targetValues(head).includes(target))||null;
    let nameTokens=[];
    if(['use','rename'].includes(operation)&&namedTarget){
      const targetIndex=head.findIndex((token)=>hasTag(token,'target',namedTarget));
      if(targetIndex>=0){nameTokens=head.slice(targetIndex+1);head=head.slice(0,targetIndex+1);}
    }
    let targets=targetValues(head);
    const headValueTokens=head.filter((token)=>!['article','filler','punctuation'].includes(token.type)&&!token.semantics.some((semantic)=>['target','modifier','operation'].includes(semantic.type)));
    if(targets.includes('quality_report')&&!targets.includes('quality'))targets.push('quality');
    if(targets.includes('duplicate')&&!modifiers.includes('duplicate'))modifiers.push('duplicate');
    if(targets.includes('minimum')&&['sort','find'].includes(operation)&&!modifiers.includes('smallest'))modifiers.push('smallest');
    if(targets.includes('maximum')&&['sort','find'].includes(operation)&&!modifiers.includes('largest'))modifiers.push('largest');

    const roleSegments={};
    const bareTokens=[...nameTokens,...headValueTokens];
    let active=null;
    for(let index=firstStructure;index<tail.length;index++){
      const token=tail[index], marker=structural(token,index);
      if(marker){active=marker;const key=marker[0]==='role'?marker[1]:'comparison';(roleSegments[key]??=[]).push([]);continue;}
      if(token.type==='operation'&&token.normalized==='order'&&operation==='sort')continue;
      if(active){const key=active[0]==='role'?active[1]:'comparison';roleSegments[key].at(-1).push(token);}
      else if(!head.includes(token))bareTokens.push(token);
    }
    const roles={};
    for(const [role,segments] of Object.entries(roleSegments)){
      const texts=segments.map((segment)=>valueText(segment)).filter(Boolean);
      if(texts.length)roles[role]=role==='destination'?texts.at(-1):(texts.length===1?texts[0]:texts);
    }
    let comparison=null, comparisonValue=null;
    for(let index=0;index<tail.length;index++){const marker=structural(tail[index],index);if(marker?.[0]==='comparison'){comparison=marker[1];break;}}
    if(roleSegments.comparison?.length){comparisonValue=valueText(roleSegments.comparison[0])||null;if(comparisonValue&&numbers.length&&comparisonValue===numbers[0])comparisonValue=null;}

    for(const token of tail){
      if(nameTokens.includes(token))continue;
      const tagged=token.semantics.filter((semantic)=>semantic.type==='target').map((semantic)=>semantic.kind);
      for(const target of ['name','sequence','read'])if(tagged.includes(target)&&!targets.includes(target))targets.push(target);
      if(token.normalized.includes('names')&&!targets.includes('name'))targets.push('name');
      for(const descriptor of ['ambiguous','quality','gap','adapter'])if(tagged.includes(descriptor)&&!targets.includes(descriptor))targets.push(descriptor);
    }
    if(operation==='convert'){
      const sourceTarget=targetValues(head).find((target)=>['dna','rna','sequence'].includes(target));
      const destinationTokens=roleSegments.destination?.[0]||[];
      const destinationTarget=targetValues(destinationTokens).find((target)=>['dna','rna','protein'].includes(target));
      if(sourceTarget)roles.source_target=sourceTarget;
      if(destinationTarget)roles.destination_target=destinationTarget;
      for(const target of [sourceTarget,destinationTarget])if(target&&!targets.includes(target))targets.push(target);
    }
    const bareText=valueText(bareTokens);
    let bareValues=splitValues(bareText);
    const statisticTargets=new Set(['average','median','standard_deviation','minimum','maximum','confidence_interval']);
    if(['calculate','find','show'].includes(operation)&&targets.some((target)=>statisticTargets.has(target))&&!roles.of){
      const statisticValue=bareText.replace(/^(?:how\s+)?(?:out\s+)?/i,'').replace(/\s+is$/i,'').trim();
      if(statisticValue)roles.of=statisticValue;
      if(comparison==='equals'&&!comparisonValue)comparison=null;
    }
    if(['calculate','find','show'].includes(operation)&&targets.some((target)=>statisticTargets.has(target))&&roles.of){
      const subject=String(roles.of).toLowerCase();
      if(subject.includes('quality')&&!targets.includes('quality'))targets.push('quality');
      if(subject.includes('length')&&!targets.includes('length'))targets.push('length');
    }
    if(targets.includes('p_value')&&comparison==='between'){const values=splitValues(comparisonValue||'');if(values.length)bareValues=values;}

    if(roles.in!==undefined){const value=String(roles.in);delete roles.in;if(isFilename(value,grammar)||['find','open','compare','assemble','annotate','check'].includes(operation))roles.source??=value;else roles.column??=value;}
    if(roles.with!==undefined&&operation==='combine'&&files.length)roles.source??=files[0];
    if(roles.using!==undefined&&['sort','remove','combine','normalize','compare','calculate'].includes(operation))roles.column??=String(roles.using);
    if(roles.using!==undefined&&operation==='create')roles.source??=String(roles.using);
    if(roles.column!==undefined)roles.column=stripRoleTarget(String(roles.column),'column');
    if(roles.source!==undefined){const original=String(roles.source),cleaned=stripRoleTarget(original,'file');if(cleaned)roles.source=cleaned;else{delete roles.source;if(/\bfile\b/i.test(original)&&!targets.includes('file'))targets.push('file');}}
    if(roles.destination!==undefined){const cleaned=stripRoleTarget(String(roles.destination),'file');if(cleaned)roles.destination=cleaned;}

    if(['replace','rename'].includes(operation)){
      let firstRole=tail.findIndex((token)=>token.semantics.some((semantic)=>semantic.type==='role'));if(firstRole<0)firstRole=tail.length;
      let literalSource=textOf(tail.slice(0,firstRole),{keepTargets:true}).replace(/^(?:the\s+)?(?:column\s+)?/i,'').trim();
      if(namedTarget)literalSource=stripRoleTarget(literalSource,namedTarget);
      if(literalSource)roles.source_value??=literalSource;
      const destinationValue=roles.destination??roles.with;if(destinationValue)roles.destination_value=String(destinationValue);
    }
    if(['use','rename'].includes(operation)&&namedTarget){const name=valueText(nameTokens)||String(roles.named||'');if(name)roles.name=name;}
    if(operation==='use'&&!roles.name){const reference=valueText(tail);if(reference)roles.name=reference;}
    if(operation==='normalize'&&!roles.column){const candidate=valueText(tail).replace(/^(?:the\s+)?counts?\s+(?:in|of|under)\s+/i,'').trim();if(candidate)roles.column=candidate;}
    if(operation==='sort'){if(roles.using)roles.column=String(roles.using);else if(bareValues.length)roles.column=bareValues[0];}
    if(operation==='remove'&&modifiers.includes('duplicate')&&roles.using)roles.column=String(roles.using);
    if(operation==='keep'&&targets.includes('base')&&numbers.length>=2)roles.range=numbers.slice(0,2);
    if(['continue','skip'].includes(operation)&&tail.some((token)=>hasTag(token,'target','sample'))&&!targets.includes('sample'))targets.push('sample');
    if(operation==='mark'&&tail.some((token)=>hasTag(token,'target','review'))&&!targets.includes('review'))targets.push('review');
    if(operation==='save'&&targets.some((target)=>['result','read','sequence'].includes(target))&&tail.some((token)=>hasTag(token,'target','sample'))&&!targets.includes('sample'))targets.push('sample');
    if(operation==='combine'&&modifiers.some((value)=>['start','end'].includes(value))){for(const target of ['sequence','name'])if(tail.some((token)=>hasTag(token,'target',target))&&!targets.includes(target))targets.push(target);}
    if(operation==='assemble'){
      const destinationTokens=roleSegments.destination?.[0]||[];
      if(destinationTokens.some((token)=>hasTag(token,'target','assembly'))&&!targets.includes('assembly'))targets.push('assembly');
      if(files.length>=2&&!modifiers.includes('pair'))modifiers.push('pair');
    }
    if(comparison==='contains'&&comparisonValue===null){comparisonValue=valueText(roleSegments.comparison?.[0]||[])||null;}
    if(targets.includes('row')){const rowCondition=parseRowCondition(tail,roles,lineNumber);if(rowCondition)roles.condition=rowCondition;}
    if(operation==='open'&&modifiers.includes('all')){
      const extensions=new Set((grammar.file_extensions||[]).map((value)=>String(value).toLowerCase()));
      const fileType=tail.find((token)=>extensions.has(token.normalized))?.text.toUpperCase();if(fileType)roles.file_type=fileType;
      const name=valueText(roleSegments.destination?.[0]||[]);if(name)roles.name=name;
    }
    if(operation==='run'&&targets.includes('tool')){
      const toolIndex=head.findIndex((token)=>hasTag(token,'target','tool'));if(toolIndex>=0){const name=valueText(head.slice(toolIndex+1));if(name)roles.name=name;}
      if(roles.with)roles.using=roles.with;
    }
    if(files.length){
      if(operation==='open'&&!targets.includes('file'))targets.push('file');
      if(['save','copy','rename'].includes(operation))roles.destination??=files.at(-1);
      if(['open','find','compare','combine','assemble','annotate','check'].includes(operation))roles.source??=files[0];
    }
    if(operation==='assert'){
      const conditionSource=valueText(tail);roles.condition_source=conditionSource;roles.condition_ast=parseCondition(tokenize(conditionSource,grammar,lineNumber),grammar,lineNumber);
    }
    let payload=null;
    if(['say','warn'].includes(operation)||(operation==='show'&&targets.includes('warning'))){
      const words=[];let started=['say','warn'].includes(operation);
      for(const token of tail){
        if(!started&&(hasTag(token,'target','warning')||token.type==='article'))continue;
        if(token.normalized==='saying'){started=true;continue;}
        if(!started&&hasTag(token,'target','warning')){started=true;continue;}
        started=true;if(token.type!=='punctuation')words.push(token.text);
      }
      payload=words.join(' ').trim();
    }
    return {type:'instruction',operation,targets:unique(targets),modifiers:unique(modifiers),files,numbers,units,roles,condition:roles.condition_ast||null,comparison,comparison_value:comparisonValue,payload,bare_values:bareValues,tokens,line_number:lineNumber,source_text:sourceText};
  }
  function semanticRoleSet(frame) {
    const roles=new Set(Object.keys(frame.roles));
    if(frame.condition)roles.add('condition');
    if(frame.roles.source_value)roles.add('source_value');
    if(frame.roles.destination_value)roles.add('destination_value');
    if(frame.roles.name||frame.roles.named)roles.add('name');
    return roles;
  }
  function selectCapability(frame,grammar) {
    const targetSet=new Set(frame.targets), modifierSet=new Set(frame.modifiers), roleSet=semanticRoleSet(frame), matches=[];
    for(const rule of grammar.capabilities){
      if(rule.operation!==frame.operation)continue;
      if((rule.all_targets||[]).some((target)=>!targetSet.has(target)))continue;
      const anyTargets=new Set(rule.any_targets||[]); if(anyTargets.size&&![...anyTargets].some((target)=>targetSet.has(target)))continue;
      if((rule.no_targets||[]).some((target)=>targetSet.has(target)))continue;
      if((rule.comparisons||[]).length&&!(rule.comparisons||[]).includes(frame.comparison))continue;
      if((rule.modifiers||[]).some((modifier)=>!modifierSet.has(modifier)))continue;
      if((rule.roles||[]).some((role)=>!roleSet.has(role)))continue;
      if(Object.entries(rule.role_equals||{}).some(([role,value])=>frame.roles[role]!==value))continue;
      if(frame.files.length<Number(rule.files||0)||frame.numbers.length<Number(rule.numbers||0))continue;
      const score=Number(rule.priority||0)+4*(rule.all_targets||[]).length+2*(rule.roles||[]).length+2*Object.keys(rule.role_equals||{}).length+(rule.modifiers||[]).length+(rule.comparisons||[]).length;
      matches.push([score,rule]);
    }
    if(!matches.length){
      if(!frame.targets.length)throw new LanguageError('missing_target',`${frame.operation[0].toUpperCase()+frame.operation.slice(1)} needs a target.`,null,frame.line_number);
      if(frame.operation==='save'&&!frame.files.length)throw new LanguageError('missing_destination','Save needs a destination filename with a supported format.',null,frame.line_number);
      throw new LanguageError('incompatible_operation_target',`The operation ${frame.operation} cannot be applied to ${frame.targets.join(', ')} with the provided roles and modifiers.`,null,frame.line_number);
    }
    matches.sort((a,b)=>b[0]-a[0]); const topScore=matches[0][0], top=matches.filter(([score])=>score===topScore).map(([,rule])=>rule), actions=new Set(top.map((rule)=>rule.action));
    if(actions.size>1)throw new LanguageError('ambiguous_instruction',`This instruction has more than one valid meaning: ${[...actions].sort().join(', ')}.`,null,frame.line_number);
    return top[0];
  }
  function splitValues(value){if(!value)return[];const cleaned=String(value).replace(/,\s+and\s+/i,',');return (cleaned.includes(',')?cleaned.split(','):cleaned.split(/\s+and\s+/i)).map((item)=>item.trim()).filter(Boolean);}
  function bind(rule,frame){
    const args={files:[...frame.files],numbers:[...frame.numbers]}, values=[];
    for(const binding of rule.bind||[]){let value=null;
      if(binding==='payload')value=frame.payload;
      else if(binding==='number')value=frame.numbers[0];
      else if(/^number\d+$/.test(binding))value=frame.numbers[Number(binding.slice(6))];
      else if(/^file\d+$/.test(binding))value=frame.files[Number(binding.slice(4))];
      else if(binding==='destination')value=frame.roles.destination||frame.files.at(-1);
      else if(binding==='source')value=frame.roles.source||frame.files[0];
      else if(binding==='condition_ast')value=frame.condition;
      else if(binding==='condition_value')value=frame.roles.condition?.value;
      else if(binding==='condition_column')value=frame.roles.condition?.column;
      else if(binding==='comparison_value')value=frame.comparison_value;
      else if(binding==='column')value=frame.roles.column||frame.roles.using||frame.roles.of;
      else if(binding==='name')value=frame.roles.name||frame.roles.named;
      else if(binding==='source_value')value=frame.roles.source_value;
      else if(binding==='destination_value')value=frame.roles.destination_value||frame.roles.destination||frame.roles.with;
      else if(binding==='bare_value')value=frame.bare_values[0];
      else if(/^bare_value\d+$/.test(binding))value=frame.bare_values[Number(binding.slice(10))];
      else if(binding==='using')value=frame.roles.using;
      else if(binding==='of')value=frame.roles.of;
      else if(binding==='statistic'){
        value=frame.targets.find((target)=>['average','median','standard_deviation','minimum','maximum','confidence_interval'].includes(target));
        if(value==='standard_deviation')value='standard deviation';
        else if(value==='confidence_interval')value='confidence interval';
      }
      else if(binding==='metric')value=frame.targets.find((target)=>['quality','length'].includes(target));
      else if(binding==='file_type')value=frame.roles.file_type;
      else if(['source_list','of_list','using_list'].includes(binding))value=splitValues(frame.roles[binding.replace('_list','')]);
      else if(binding==='list'){
        const start=Math.max(1,frame.tokens.findIndex((token)=>hasTag(token,'target','column'))+1);
        const pieces=[];
        for(const token of frame.tokens.slice(start)){
          if(['article','filler'].includes(token.type))continue;
          if(token.text===',')pieces.push(',');
          else if(hasTag(token,'boolean','and')||token.normalized==='and')pieces.push('and');
          else if(!token.semantics.some((semantic)=>['operation','modifier','unit'].includes(semantic.type))||hasTag(token,'target'))pieces.push(token.text);
        }
        value=splitValues(pieces.join(' ').replace(/ ,/g,','));
        if(value.length)value=value.join(', ');
      }
      else value=frame.roles[binding];
      if(value===null||value===undefined||value===''||(Array.isArray(value)&&!value.length))throw new LanguageError(`missing_${binding}`,`${frame.operation[0].toUpperCase()+frame.operation.slice(1)} is missing the required ${binding.replaceAll('_',' ')}.`,null,frame.line_number);
      args[binding]=value;if(binding!=='condition_ast'){if(Array.isArray(value))values.push(...value.map(String));else values.push(String(value));}
    }
    args.runtime_values=values;return args;
  }
  const browserAction = {
    repeat_program:'repeat',open_file:'open',keep_rows:'keep',remove_rows:'remove',keep_columns:'keepColumns',rename_column:'renameColumn',order_rows:'orderRows',largest_first:'largestFirst',smallest_first:'smallestFirst',remove_duplicates:'removeDuplicates',replace_empty:'replaceEmpty',combine_file:'combine',change_value:'changeValue',count_rows:'countRows',count_sequences:'countSequences',count_bases:'countBases',show_sequence_names:'showNames',show_sequences:'showSequences',keep_strict_length:'keepMinLength',keep_min_length:'keepMinLength',remove_shorter:'removeShorter',keep_min_quality:'keepQuality',remove_low_quality:'removeQuality',trim_start:'trimStart',trim_end:'trimEnd',keep_motif:'keepMotif',remove_motif:'removeMotif',to_rna:'toRna',to_dna:'toDna',reverse_complement:'reverseComplement',translate:'translate',gc_content:'gcContent',compare_sequences:'compare',show_result:'show',show_file:'show',save_sequences:'saveSequences',save_result:'save',call_result:'callResult',use_result:'useResult',use_recipe:'useRecipe',say:'say'
  };
  function parseSemanticInstruction(source,grammar,lineNumber=1){const frame=extractFrame(tokenize(source,grammar,lineNumber),grammar,lineNumber), rule=selectCapability(frame,grammar), argumentsValue=bind(rule,frame);return {type:'instruction',...frame,action:rule.action,arguments:argumentsValue};}
  function toRuntime(node){return {type:'instruction',operation:node.operation,targets:[...node.targets],action:browserAction[node.action]||node.action,semanticAction:node.action,arguments:node.arguments,modifiers:[...node.modifiers],roles:{...node.roles},comparison:node.comparison,source:node.source_text,line:node.line_number,column:1,values:[...(node.arguments.runtime_values||[])],lineNumber:node.line_number,semantic:node};}
  function parser(grammar) {
    const parseSemantic=(source,lineNumber=1)=>parseSemanticInstruction(source,grammar,lineNumber);
    const parseInstruction=(source,lineNumber=1)=>toRuntime(parseSemantic(source,lineNumber));
    const parseProgram = (source) => {
      const root={type:'program',body:[],recipes:{}};
      const stack=[{indent:-4,body:root.body}];
      const lastIf=new Map();
      String(source).split(/\r?\n/).forEach((raw,index)=>{
        const line=index+1, trimmed=raw.trim();
        if(!trimmed||trimmed.startsWith('#'))return;
        const leading=(raw.match(/^\s*/)||[''])[0];
        if(leading.includes('\t')||leading.length%4)throw new LanguageError('invalid_indent','Indent blocks with four spaces.',null,line);
        const indent=leading.length;
        while(stack.length>1&&indent<=stack.at(-1).indent)stack.pop();
        const parent=stack.at(-1);
        if(indent!==parent.indent+4)throw new LanguageError('invalid_indent','This line is indented farther than the block above it.',null,line);
        if(trimmed.endsWith(':')) {
          const header=trimmed.slice(0,-1).trim();
          const lower=header.toLowerCase();
          if(lower.startsWith('make a recipe called ')){
            const name=header.slice('Make a recipe called '.length).trim();
            if(!name)throw new LanguageError('missing_recipe_name','A recipe header needs a name.',null,line);
            const node={type:'recipe',name,body:[],line,line_number:line};
            parent.body.push(node);root.recipes[name.toLowerCase()]=node;stack.push({indent,body:node.body});lastIf.delete(indent);return;
          }
          if(lower.startsWith('if ')){
            const branch={condition:parseCondition(tokenize(header.slice(3),grammar,line),grammar,line),body:[],line};
            const node={type:'if',branches:[branch],otherwise:[],line,line_number:line};
            parent.body.push(node);lastIf.set(indent,node);stack.push({indent,body:branch.body});return;
          }
          if(lower.startsWith('otherwise if ')||lower.startsWith('else if ')){
            const prefix=lower.startsWith('otherwise if ')?'otherwise if ':'else if ';
            const node=lastIf.get(indent);
            if(!node)throw new LanguageError('orphan_else_if','Put Else if directly after an If block.',null,line);
            const branch={condition:parseCondition(tokenize(header.slice(prefix.length),grammar,line),grammar,line),body:[],line};
            node.branches.push(branch);stack.push({indent,body:branch.body});return;
          }
          if(lower==='otherwise'||lower==='else'){
            const node=lastIf.get(indent);
            if(!node)throw new LanguageError('orphan_else','Put Else directly after an If block.',null,line);
            stack.push({indent,body:node.otherwise});return;
          }
          if(lower.startsWith('for every ')){
            const rest=header.slice('For every '.length);
            const match=rest.match(/^(.*?)\s+in\s+(.+)$/i);
            const item=(match?.[1]||rest).trim()||'item';
            const collection=(match?.[2]||`${item}s`).trim().toLowerCase();
            const node={type:'loop',item,iterator:item,collection,body:[],line,line_number:line};
            parent.body.push(node);stack.push({indent,body:node.body});lastIf.delete(indent);return;
          }
          throw new LanguageError('unknown_block',`I could not parse the block header “${header}”.`,null,line);
        }
        if(!trimmed.endsWith('.'))throw new LanguageError('missing_period','This instruction needs a period at the end.',null,line);
        const node=parseSemantic(trimmed.slice(0,-1),line);
        node.line=line;node.line_number=line;node.column=1;node.source=node.source_text;
        parent.body.push(node);lastIf.delete(indent);
      });
      return root;
    };
    return Object.freeze({version:grammar.version,tokenize:(s,l)=>tokenize(s,grammar,l),parseSemanticInstruction:parseSemantic,parseInstruction,parseProgram,toRuntime,LanguageError});
  }
  const ready=fetch(GRAMMAR_URL,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(`Could not load language grammar (${r.status}).`);return r.json();}).then(g=>{const api=parser(g);window.FigureLoomBioSemanticLanguage=api;window.dispatchEvent(new CustomEvent('figureloom-bio-semantic-language-ready',{detail:api}));return api;});
  window.FigureLoomBioSemanticLanguageReady=ready;
})();
