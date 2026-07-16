(() => {
  if (typeof createDrawer !== 'function' || typeof renderObject !== 'function') return;

  const GREEK={alpha:'α',beta:'β',gamma:'γ',delta:'δ',epsilon:'ε',theta:'θ',lambda:'λ',mu:'μ',pi:'π',rho:'ρ',sigma:'σ',tau:'τ',phi:'φ',chi:'χ',psi:'ψ',omega:'ω',Delta:'Δ',Sigma:'Σ',Omega:'Ω',pm:'±',times:'×',rightarrow:'→',leftrightarrow:'↔',degree:'°'};
  const SUB={'0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉','+':'₊','-':'₋','=':'₌','(':'₍',')':'₎','a':'ₐ','e':'ₑ','h':'ₕ','i':'ᵢ','j':'ⱼ','k':'ₖ','l':'ₗ','m':'ₘ','n':'ₙ','o':'ₒ','p':'ₚ','r':'ᵣ','s':'ₛ','t':'ₜ','x':'ₓ'};
  const SUP={'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','+':'⁺','-':'⁻','=':'⁼','(':'⁽',')':'⁾','n':'ⁿ','i':'ⁱ'};
  function formatEquation(source=''){
    let text=String(source).replace(/\\([A-Za-z]+)/g,(match,name)=>GREEK[name]||match);
    text=text.replace(/_\{([^}]+)\}/g,(match,value)=>[...value].map(char=>SUB[char]||char).join(''));
    text=text.replace(/\^\{([^}]+)\}/g,(match,value)=>[...value].map(char=>SUP[char]||char).join(''));
    text=text.replace(/([A-Za-z\)])([0-9]+)(?![A-Za-z0-9]*\})/g,(match,base,digits)=>base+[...digits].map(char=>SUB[char]||char).join(''));
    return text;
  }
  function textNode(text,x,y,attrs={}){const node=createSvg('text',{x,y,fill:'#24364b','font-family':'Inter,Segoe UI,sans-serif','font-size':16,...attrs});node.textContent=text;return node;}

  function annotationGroup(item){
    const group=createSvg('g',{class:'canvas-object annotation-object','data-id':item.id,transform:`translate(${item.x} ${item.y}) rotate(${item.rotation||0} ${item.width/2} ${item.height/2})`,opacity:item.opacity??1});
    const W=item.width,H=item.height,color=item.fill||'#2563eb',stroke=item.stroke||'#26324a',kind=item.annotationKind||'callout';
    if(kind==='panel'){
      group.appendChild(textNode(item.annotationText||'A',8,Math.min(H-4,H*.78),{'font-size':Math.max(24,Math.min(74,H*.82)),'font-weight':850,fill:color}));
    } else if(kind==='callout'){
      group.appendChild(createSvg('rect',{x:12,y:4,width:W-24,height:H*.68,rx:12,fill:item.background||'#ffffff',stroke:color,'stroke-width':3}));
      group.appendChild(createSvg('path',{d:`M ${W*.42} ${H*.68+4} L ${W*.52} ${H-4} L ${W*.62} ${H*.68+4}`,fill:item.background||'#ffffff',stroke:color,'stroke-width':3,'stroke-linejoin':'round'}));
      group.appendChild(textNode(item.annotationText||'Callout',W/2,H*.37,{'text-anchor':'middle','font-size':Math.max(12,Math.min(22,W*.065)),'font-weight':650,fill:stroke}));
    } else if(kind==='scale'){
      const y=H*.55;group.appendChild(createSvg('line',{x1:12,y1:y,x2:W-12,y2:y,stroke:color,'stroke-width':Math.max(4,H*.12),'stroke-linecap':'butt'}));
      group.appendChild(textNode(`${item.annotationValue||'10'} ${item.annotationUnit||'μm'}`,W/2,y-12,{'text-anchor':'middle','font-size':Math.max(12,H*.22),'font-weight':650,fill:stroke}));
    } else if(kind==='measurement'){
      const y=H*.56;group.appendChild(createSvg('line',{x1:16,y1:y,x2:W-16,y2:y,stroke:color,'stroke-width':3}));
      group.appendChild(createSvg('path',{d:`M16 ${y} L30 ${y-8} L30 ${y+8}Z M${W-16} ${y} L${W-30} ${y-8} L${W-30} ${y+8}Z`,fill:color}));
      group.appendChild(textNode(`${item.annotationValue||'25'} ${item.annotationUnit||'mm'}`,W/2,y-13,{'text-anchor':'middle','font-size':Math.max(12,H*.22),'font-weight':650,fill:stroke}));
    } else if(kind==='significance'){
      const y=H*.62;group.appendChild(createSvg('path',{d:`M 10 ${y} L 10 ${H*.22} L ${W-10} ${H*.22} L ${W-10} ${y}`,fill:'none',stroke:color,'stroke-width':3,'stroke-linecap':'round','stroke-linejoin':'round'}));
      group.appendChild(textNode(item.annotationText||'***',W/2,H*.18,{'text-anchor':'middle','font-size':Math.max(18,H*.28),'font-weight':800,fill:stroke}));
    } else if(kind==='bracket'){
      group.appendChild(createSvg('path',{d:`M ${W*.22} 8 L 10 8 L 10 ${H-8} L ${W*.22} ${H-8} M ${W*.78} 8 L ${W-10} 8 L ${W-10} ${H-8} L ${W*.78} ${H-8}`,fill:'none',stroke:color,'stroke-width':3}));
      group.appendChild(textNode(item.annotationText||'Group',W/2,H*.56,{'text-anchor':'middle','font-size':Math.max(12,H*.24),'font-weight':650,fill:stroke}));
    } else if(kind==='number'){
      const r=Math.min(W,H)*.42;group.appendChild(createSvg('circle',{cx:W/2,cy:H/2,r,fill:color,stroke,'stroke-width':2}));group.appendChild(textNode(item.annotationText||'1',W/2,H/2+r*.34,{'text-anchor':'middle','font-size':r*1.05,'font-weight':800,fill:'#ffffff'}));
    } else if(kind==='legend'){
      group.appendChild(createSvg('rect',{width:W,height:H,rx:10,fill:item.background||'#ffffff',stroke:item.stroke||'#94a3b8','stroke-width':2}));
      const lines=String(item.annotationText||'Control: #4f7fe5\nTreatment: #37a37d').split(/\n/).filter(Boolean);const rowH=Math.min(28,(H-16)/Math.max(1,lines.length));
      lines.forEach((line,index)=>{const parts=line.split(':');const label=(parts[0]||line).trim();const swatch=(parts[1]||['#4f7fe5','#37a37d','#e6904e','#a36ad8'][index%4]).trim();const y=12+index*rowH;group.appendChild(createSvg('rect',{x:12,y:y+3,width:16,height:16,rx:3,fill:/^#[0-9a-f]{3,8}$/i.test(swatch)?swatch:color,stroke:'#64748b','stroke-width':1}));group.appendChild(textNode(label,36,y+17,{'font-size':Math.max(10,Math.min(15,rowH*.55)),fill:stroke}));});
    } else if(kind==='equation'){
      group.appendChild(createSvg('rect',{width:W,height:H,rx:8,fill:item.background||'transparent',stroke:item.showBox?(item.stroke||'#cbd5e1'):'none','stroke-width':1.5}));
      group.appendChild(textNode(formatEquation(item.annotationText||'E = mc^{2}'),W/2,H*.62,{'text-anchor':'middle','font-size':Math.max(16,Math.min(42,H*.48)),'font-family':'Georgia,Times New Roman,serif','font-style':'italic',fill:stroke}));
    }
    group.addEventListener('pointerdown',event=>beginDrag(event,item.id));group.addEventListener('click',event=>{event.stopPropagation();select(item.id);});group.addEventListener('dblclick',event=>{event.stopPropagation();openAnnotationLab(item);});return group;
  }
  const baseRenderObject=renderObject;
  renderObject=function renderAnnotationObject(item){return item.type==='annotation'?annotationGroup(item):baseRenderObject(item);};

  const drawer=createDrawer('annotationLabDrawer','Scientific annotation','Labels, callouts, scale bars, equations and figure conventions');
  drawer.classList.add('annotation-lab-drawer');
  drawer.querySelector('.utility-body').innerHTML=`
    <div class="annotation-grid"><label>Annotation<select id="annotationKind"><option value="panel">Panel label · A–F</option><option value="callout">Callout</option><option value="scale">Scale bar</option><option value="measurement">Measurement line</option><option value="significance">Significance bracket</option><option value="bracket">Grouping bracket</option><option value="number">Numbered marker</option><option value="legend">Legend</option><option value="equation">Equation / chemical formula</option></select></label><label>Color<input id="annotationColor" type="color" value="#2563eb"></label></div>
    <label class="annotation-full">Text / equation / legend entries<textarea id="annotationText" rows="4" placeholder="A, ***, explanatory text, or E = mc^{2}"></textarea></label>
    <div class="annotation-grid"><label>Value<input id="annotationValue" type="text" value="10"></label><label>Unit<input id="annotationUnit" type="text" value="μm"></label></div>
    <div class="symbol-palette" id="annotationSymbols"></div>
    <div class="annotation-actions"><button id="insertAnnotation" class="primary">Insert annotation</button><button id="updateAnnotation" disabled>Update selected</button></div>
    <p class="tool-note">Equation input supports commands such as \\alpha, \\Delta, _{2}, and ^{2}. Common chemical digits are automatically rendered as subscripts. Double-click an annotation to edit it.</p>
  `;
  const kind=drawer.querySelector('#annotationKind'),text=drawer.querySelector('#annotationText'),value=drawer.querySelector('#annotationValue'),unit=drawer.querySelector('#annotationUnit'),color=drawer.querySelector('#annotationColor'),updateButton=drawer.querySelector('#updateAnnotation');
  const symbolValues=['α','β','γ','δ','Δ','λ','μ','σ','Ω','±','×','→','↔','°','₂','³','⁻¹','p < 0.05'];
  symbolValues.forEach(symbol=>{const button=document.createElement('button');button.type='button';button.textContent=symbol;button.addEventListener('click',()=>{const start=text.selectionStart??text.value.length;const end=text.selectionEnd??start;text.value=text.value.slice(0,start)+symbol+text.value.slice(end);text.focus();text.selectionStart=text.selectionEnd=start+symbol.length;});drawer.querySelector('#annotationSymbols').appendChild(button);});

  const defaults={panel:{text:'A',w:90,h:90},callout:{text:'Key finding',w:280,h:130},scale:{text:'',w:210,h:75},measurement:{text:'',w:250,h:80},significance:{text:'***',w:220,h:100},bracket:{text:'Group',w:220,h:120},number:{text:'1',w:72,h:72},legend:{text:'Control: #4f7fe5\nTreatment: #37a37d',w:250,h:130},equation:{text:'E = mc^{2}',w:300,h:90}};
  function annotationFromControls(existing=null){const preset=defaults[kind.value]||defaults.callout;const dimensions=window.currentCanvasSize?.()||{width:1200,height:750};return{id:existing?.id||uid(),type:'annotation',annotationKind:kind.value,name:`${kind.options[kind.selectedIndex].text}`,annotationText:text.value||preset.text,annotationValue:value.value,annotationUnit:unit.value,x:existing?.x??Math.max(20,(dimensions.width-preset.w)/2),y:existing?.y??Math.max(20,(dimensions.height-preset.h)/2),width:existing?.width??preset.w,height:existing?.height??preset.h,fill:color.value,stroke:existing?.stroke||'#26324a',background:existing?.background||'#ffffff',opacity:existing?.opacity??1,rotation:existing?.rotation||0,visible:existing?.visible!==false,metadata:{...(existing?.metadata||{}),role:'Scientific annotation'}};}
  function insertOrUpdate(update){const existing=update?selectedObject():null;if(update&&existing?.type!=='annotation')return;pushHistory();const item=annotationFromControls(existing);if(existing)Object.assign(existing,item);else{state.objects.push(item);state.selectedId=item.id;}render();renderPages?.();scheduleSave();drawer.classList.remove('open');}
  drawer.querySelector('#insertAnnotation').addEventListener('click',()=>insertOrUpdate(false));updateButton.addEventListener('click',()=>insertOrUpdate(true));
  kind.addEventListener('change',()=>{const preset=defaults[kind.value];if(!text.value.trim()||Object.values(defaults).some(item=>item.text===text.value))text.value=preset.text;});
  function openAnnotationLab(item=null){drawer.classList.add('open');const selected=item||selectedObject();const editable=selected?.type==='annotation';updateButton.disabled=!editable;if(editable){kind.value=selected.annotationKind||'callout';text.value=selected.annotationText||'';value.value=selected.annotationValue||'';unit.value=selected.annotationUnit||'';color.value=selected.fill||'#2563eb';}}
  window.openAnnotationLab=openAnnotationLab;
  window.SciCanvasPro?.register('annotate',()=>openAnnotationLab());
  window.SciCanvasPro?.shortcut('Double-click annotation','Edit its label, value or equation');

  const style=document.createElement('style');style.textContent=`
    .annotation-lab-drawer{width:min(610px,calc(100vw - 20px))!important}.annotation-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:9px}.annotation-grid label,.annotation-full{display:grid;gap:5px;color:#617087;font-size:10px}.annotation-grid select,.annotation-grid input,.annotation-full textarea{width:100%;min-width:0;border:1px solid #cbd5e1;border-radius:8px;background:white;padding:8px}.annotation-full textarea{resize:vertical}.symbol-palette{display:flex;flex-wrap:wrap;gap:5px;margin:10px 0}.symbol-palette button{min-width:34px;min-height:32px;border:1px solid #cbd5e1;border-radius:7px;background:#f8fafc;padding:5px}.symbol-palette button:hover{background:#edf4ff;border-color:#7899da}.annotation-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.annotation-actions button{min-height:40px;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc}.annotation-actions button.primary{background:#2563eb;border-color:#2563eb;color:white}.annotation-object{cursor:move}
    @media(max-width:450px){.annotation-grid,.annotation-actions{grid-template-columns:1fr}}
  `;document.head.appendChild(style);
})();