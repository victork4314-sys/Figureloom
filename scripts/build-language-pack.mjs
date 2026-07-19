import fs from 'node:fs';

const input = JSON.parse(fs.readFileSync('complete-interface-translations.json', 'utf8'));
const languages = ['en','nb','pl','de','fr','es','it','pt','nl'];
const seen = new Set();
const rows = [];

for (const item of input.translations) {
  if (!item.phrase || seen.has(item.phrase)) continue;
  seen.add(item.phrase);
  const row = [item.phrase, ...languages.slice(1).map(language => String(item[language] || '').trim())];
  if (row.some(value => !value)) throw new Error(`Blank language value for ${item.phrase}`);
  const placeholderCount = (item.phrase.match(/\{value\}/g) || []).length;
  row.slice(1).forEach((value, index) => {
    if ((value.match(/\{value\}/g) || []).length !== placeholderCount) {
      throw new Error(`Placeholder mismatch for ${languages[index + 1]}: ${item.phrase}`);
    }
  });
  rows.push(row);
}

rows.sort((a,b) => a[0].localeCompare(b[0]));
const serialized = JSON.stringify(rows);
const source = `(() => {
  if (window.__figureLoomCompleteLanguagePackV1) return;
  window.__figureLoomCompleteLanguagePackV1 = true;

  const languages=${JSON.stringify(languages)};
  const rows=${serialized};
  const escape=value=>String(value).replace(/[.*+?^\${}()|[\\]\\]/g,'\\\\$&');
  const normalize=code=>{
    const value=String(code||'en').toLowerCase();
    return languages.find(language=>value===language||value.startsWith(language+'-'))||'en';
  };
  const tables=Object.fromEntries(languages.map((language,index)=>[
    language,new Map(rows.map(row=>[row[0],row[index]]))
  ]));
  const dynamic=rows.filter(row=>row[0].includes('{value}')).map(row=>({
    row,
    regex:new RegExp('^'+row[0].split('{value}').map(escape).join('(.+?)')+'$')
  }));

  function dynamicTranslation(code,phrase){
    for(const entry of dynamic){
      const match=String(phrase).match(entry.regex);
      if(!match)continue;
      let index=1;
      return entry.row[languages.indexOf(code)].replace(/\\{value\\}/g,()=>match[index++]??'');
    }
    return null;
  }

  function install(){
    const base=window.FigureLoomInterfacePhrases;
    if(!base||base.__figureLoomCompleteLanguagePack)return;
    const api=Object.freeze({
      __figureLoomExtraPhrases:true,
      __figureLoomCompleteLanguagePack:true,
      translate(code,phrase){
        const language=normalize(code);
        const clean=String(phrase??'');
        const exact=tables[language].get(clean);
        if(exact!=null)return exact;
        const matched=dynamicTranslation(language,clean);
        if(matched!=null)return matched;
        return base.translate(code,phrase);
      },
      has(phrase){
        const clean=String(phrase??'');
        if(tables.en.has(clean))return true;
        if(dynamic.some(entry=>entry.regex.test(clean)))return true;
        return base.has(clean);
      }
    });
    window.FigureLoomInterfacePhrases=api;
    dispatchEvent(new CustomEvent('figureloom-interface-phrases-ready'));
  }

  if(window.FigureLoomInterfacePhrases)install();
  else addEventListener('figureloom-interface-phrases-ready',install,{once:true});
})();
`;

fs.writeFileSync('language-complete-pack.js', source);
console.log(`Built language-complete-pack.js with ${rows.length} exact/contextual phrases.`);
