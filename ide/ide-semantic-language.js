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
  function tokenize(source, grammar, lineNumber = 1) {
    const raw = String(source).trim().replace(/[.:]$/, '');
    const pieces = raw.match(/[^\s,]+|,/g) || [];
    const basic = pieces.map((text, index) => {
      const cleaned = text.replace(/^['"]|['"]$/g, '');
      const norm = normalize(cleaned);
      let type = 'word';
      if (text === ',') type = 'comma';
      else if (/^\d+(?:\.\d+)?$/.test(cleaned)) type = 'number';
      else if (filenamePattern.test(cleaned)) type = 'filename';
      else if ((grammar.articles || []).includes(norm)) type = 'article';
      else if ((grammar.fillers || []).includes(norm)) type = 'filler';
      else if (['true','false'].includes(norm)) type = 'boolean';
      else if (['and','or','not'].includes(norm)) type = 'boolean_operator';
      return { type, text:cleaned, normalized:norm, index, lineNumber, semantics:[] };
    });
    const phraseGroups = [
      ['operation', phraseEntries(grammar.operations)], ['target', phraseEntries(grammar.targets)],
      ['comparison', phraseEntries(grammar.comparisons)], ['role', phraseEntries(grammar.roles)],
      ['modifier', phraseEntries(grammar.modifiers)], ['unit', phraseEntries(grammar.units)], ['boolean', phraseEntries(grammar.booleans)]
    ];
    for (const [type, entries] of phraseGroups) {
      for (let i=0;i<basic.length;i++) {
        for (const entry of entries) {
          const segment = basic.slice(i, i + entry.words.length);
          if (segment.length === entry.words.length && segment.every((token,j) => token.normalized === entry.words[j])) {
            basic[i].semantics.push({ type, kind:entry.kind, form:entry.form, length:entry.words.length });
          }
        }
      }
    }
    return basic;
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
    if (!leftText) throw new LanguageError('missing_left_operand','The condition is missing what should be compared.',work[cmpIndex],lineNumber);
    if (!rightText) throw new LanguageError('missing_right_operand',`The comparison “${comparison.form}” is missing a value.`,work[cmpIndex],lineNumber);
    const numericRight = /^\d+(?:\.\d+)?$/.test(rightText) ? Number(rightText) : null;
    let left = { kind:'value', value:leftText.replace(/^(?:the\s+)?/i,'') };
    const metricTarget = targets.find((target)=>['read','sequence','row','base','assembly'].includes(target));
    if (metricTarget && numericRight !== null) {
      left = { kind:'metric', target:metricTarget, metric:targets.includes('quality')?'average_quality':targets.includes('gc_content')?'gc_content':'count' };
    } else if (targets.includes('column')) {
      left = { kind:'column', name:leftText.replace(/^(?:the\s+)?(?:column\s+)?/i,'') };
    }
    return { type:'condition', kind:'comparison', left, operator:comparison.kind, right:numericRight !== null ? numericRight : rightText, source };
  }
  function unique(values) { return [...new Set(values.filter((value) => value !== null && value !== undefined && value !== ''))]; }
  function extractFrame(tokens, grammar, lineNumber) {
    const operations = semanticTokens(tokens,'operation').sort((a,b)=>b.length-a.length || a.token.index-b.token.index);
    if (!operations.length) throw new LanguageError('missing_operation','This instruction is missing an operation such as Open, Keep, Remove, Show, Save, or Calculate.',tokens[0]||null,lineNumber);
    const operationSemantic = operations[0], operationToken = operationSemantic.token, operation = operationSemantic.kind;
    const numbers = tokens.filter((token)=>token.type==='number').map((token)=>token.text);
    const files = tokens.filter((token)=>token.type==='filename').map((token)=>token.text);
    const tailStart = operationToken.index + operationSemantic.length;
    const targetSemantics = semanticTokens(tokens,'target').filter((entry)=>{
      if (entry.token.index < tailStart) return false;
      const isUnit = entry.token.semantics.some((semantic)=>semantic.type==='unit');
      const previous = tokens[entry.token.index - 1];
      return !(isUnit && previous?.type === 'number');
    }).sort((a,b)=>a.token.index-b.token.index || b.length-a.length);
    let targets = unique(targetSemantics.map((entry)=>entry.kind));
    const modifiers = unique(semanticTokens(tokens,'modifier').filter((entry)=>entry.token.index>=tailStart).map((entry)=>entry.kind));
    const comparisonSemantic = semanticTokens(tokens,'comparison').sort((a,b)=>b.length-a.length || a.token.index-b.token.index)[0] || null;
    const roleSemantics = semanticTokens(tokens,'role').sort((a,b)=>a.token.index-b.token.index || b.length-a.length);
    const roleIndex = (kind) => firstIndex(tokens,(token)=>token.semantics.some((semantic)=>semantic.type==='role'&&semantic.kind===kind));
    const roleAt = (index,kind) => tokens[index]?.semantics.filter((semantic)=>semantic.type==='role'&&semantic.kind===kind).sort((a,b)=>b.length-a.length)[0] || null;
    const roleEnd = (startIndex) => {
      const later = roleSemantics.map((entry)=>entry.token.index).filter((index)=>index>startIndex);
      return later.length ? Math.min(...later) : tokens.length;
    };
    const roles = {};
    for (const entry of roleSemantics) {
      const start = entry.token.index + entry.length;
      const end = roleEnd(entry.token.index);
      const value = wordsBetween(tokens,start,end).replace(/^(?:the|a|an)\s+/i,'').replace(/\s+column$/i,'').trim();
      if (value && roles[entry.kind] === undefined) roles[entry.kind] = value;
    }
    if (files.length) {
      const sourceRole = roleIndex('source'), inRole = roleIndex('in'), destinationRole = roleIndex('destination');
      if (sourceRole>=0 || inRole>=0 || ['open','find','compare','assemble','annotate','check'].includes(operation)) roles.source = files[0];
      if (destinationRole>=0 || operation==='save' || operation==='copy' || operation==='rename') roles.destination = files.at(-1);
    }
    let condition = null;
    const whereIndex = roleIndex('where');
    if (whereIndex>=0) condition=parseCondition(tokens.slice(whereIndex+roleAt(whereIndex,'where').length),grammar,lineNumber);
    const columnIndex = roleIndex('column');
    if (columnIndex>=0) roles.column=wordsBetween(tokens,columnIndex+roleAt(columnIndex,'column').length,tokens.length).replace(/^(?:the\s+)?/i,'').replace(/\s+column$/i,'').trim();
    const withIndex=roleIndex('with'), destinationIndex=roleIndex('destination');
    if ((operation==='replace'||operation==='rename') && !roles.column) {
      const inIndex=roleIndex('in');
      if(inIndex>=0 && targets.includes('column')) roles.column=wordsBetween(tokens,inIndex+roleAt(inIndex,'in').length,tokens.length).replace(/^(?:the\s+)?/i,'').replace(/\s+column$/i,'').trim();
    }
    if (operation==='replace' || operation==='rename') {
      const split=withIndex>=0?withIndex:destinationIndex;
      const operationEnd=operationToken.index+operationSemantic.length;
      if (split>=0) {
        roles.source_value=wordsBetween(tokens,operationEnd,split).replace(/^(?:the\s+)?(?:column\s+)?/i,'').trim();
        const inIndex=roleIndex('in');
        const effectiveColumnIndex=columnIndex>=0?columnIndex:((inIndex>=0)?inIndex:tokens.length);
        const end=effectiveColumnIndex;
        const splitRole=withIndex>=0?'with':'destination';
        roles.destination_value=wordsBetween(tokens,split+roleAt(split,splitRole).length,end).replace(/^(?:the\s+)?/i,'').trim();
      }
    }
    if (condition?.kind==='comparison' && condition.left?.kind==='value' && targets.includes('row')) {
      condition.left={kind:'column',name:condition.left.value};
      roles.condition={column:condition.left.name,comparison:condition.operator,value:condition.right};
    }
    if (!condition && ['keep','remove'].includes(operation) && targets.includes('row')) {
      const marked=firstIndex(tokens,(token)=>['marked'].includes(token.normalized));
      if (marked>=0 && roles.column) {
        const value=wordsBetween(tokens,marked+1,columnIndex>=0?columnIndex:tokens.length);
        condition={type:'condition',kind:'comparison',operator:'equal',left:{kind:'column',name:roles.column},right:value,source:wordsBetween(tokens,marked,tokens.length)};
        roles.condition={column:roles.column,comparison:'equal',value};
      }
    }
    if (comparisonSemantic?.kind==='less' && numbers.length && roles.column && !targets.includes('row')) delete roles.column;
    if ((operation==='replace'||operation==='rename') && roles.column) targets=targets.filter((target)=>target!=='column');
    const comparison = comparisonSemantic && !(comparisonSemantic.kind==='less' && roles.column && !numbers.length) ? comparisonSemantic.kind : null;
    const comparisonValue = comparisonSemantic ? wordsBetween(tokens,comparisonSemantic.token.index+comparisonSemantic.length,tokens.length) : null;
    const payload = operation==='say' || operation==='warn' ? wordsBetween(tokens,operationToken.index+operationSemantic.length,tokens.length) : null;
    const bareValues=tokens.filter((token)=>token.index>operationToken.index && !['article','filler','comma','number','filename'].includes(token.type) && !token.semantics.some((semantic)=>['operation','target','comparison','role','modifier','unit','boolean'].includes(semantic.type))).map((token)=>token.text);
    if(operation==='use'&&!roles.name&&bareValues.length)roles.name=bareValues.join(' ');
    return {type:'instruction',operation,targets,modifiers,files,numbers,roles,condition,comparison,comparison_value:comparisonValue,payload,bare_values:bareValues,tokens,line_number:lineNumber,source_text:tokens.map((token)=>token.text).join(' ')};
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
      else if(['source_list','of_list','using_list'].includes(binding))value=splitValues(frame.roles[binding.replace('_list','')]);
      else if(binding==='list')value=splitValues(frame.roles.of||frame.bare_values.join(' '));
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
