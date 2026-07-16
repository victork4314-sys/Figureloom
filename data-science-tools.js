(() => {
  if (typeof createDrawer !== 'function' || typeof renderObject !== 'function') return;

  function parseDelimited(text) {
    const clean = String(text || '').trim();
    if (!clean) return { headers:[], rows:[] };
    const delimiter = clean.includes('\t') ? '\t' : ',';
    function parseLine(line) {
      const cells=[]; let value=''; let quoted=false;
      for (let index=0; index<line.length; index++) {
        const char=line[index];
        if (char==='"') {
          if (quoted && line[index+1]==='"') { value+='"'; index++; }
          else quoted=!quoted;
        } else if (char===delimiter && !quoted) { cells.push(value.trim()); value=''; }
        else value+=char;
      }
      cells.push(value.trim());
      return cells;
    }
    const lines=clean.split(/\r?\n/).filter(line=>line.trim());
    const matrix=lines.map(parseLine);
    const width=Math.max(...matrix.map(row=>row.length));
    matrix.forEach(row=>{ while(row.length<width) row.push(''); });
    return { headers:matrix[0]||[], rows:matrix.slice(1) };
  }

  function numeric(value) {
    const number=Number(String(value).replace(',','.'));
    return Number.isFinite(number) ? number : null;
  }
  function columnValues(item,index) { return item.dataRows.map(row=>numeric(row[index])).filter(value=>value!==null); }
  function extent(values) {
    if (!values.length) return [0,1];
    let min=Math.min(...values), max=Math.max(...values);
    if (min===max) { min-=1; max+=1; }
    return [min,max];
  }
  function scale(value,min,max,start,end) { return start+(value-min)/(max-min)*(end-start); }
  function quartiles(values) {
    const sorted=[...values].sort((a,b)=>a-b);
    if (!sorted.length) return null;
    const q=p=>{
      const position=(sorted.length-1)*p;
      const base=Math.floor(position);
      const rest=position-base;
      return sorted[base]+(sorted[base+1]!==undefined ? rest*(sorted[base+1]-sorted[base]) : 0);
    };
    return { min:sorted[0], q1:q(.25), median:q(.5), q3:q(.75), max:sorted.at(-1) };
  }
  function pointFraction(index,total) { return total===1 ? .5 : index/(total-1); }
  function svgText(parent,text,x,y,attrs={}) {
    const node=createSvg('text',{x,y,fill:'#334155','font-size':13,'font-family':'Inter,Segoe UI,sans-serif',...attrs});
    node.textContent=text;
    parent.appendChild(node);
    return node;
  }

  function chartGroup(item) {
    const group=createSvg('g',{class:'canvas-object data-object','data-id':item.id,transform:`translate(${item.x} ${item.y}) rotate(${item.rotation||0} ${item.width/2} ${item.height/2})`,opacity:item.opacity??1});
    const W=item.width,H=item.height,margin={left:58,right:24,top:52,bottom:48};
    group.appendChild(createSvg('rect',{width:W,height:H,rx:12,fill:item.background||'#ffffff',stroke:item.stroke||'#94a3b8','stroke-width':2}));
    svgText(group,item.chartTitle||item.name||'Chart',W/2,28,{'text-anchor':'middle','font-size':Math.max(15,Math.min(24,W*.035)),'font-weight':750,fill:item.textColor||'#1e293b'});
    const headers=item.dataHeaders||[],rows=item.dataRows||[];
    if (!headers.length || !rows.length) {
      svgText(group,'No data',W/2,H/2,{'text-anchor':'middle',fill:'#94a3b8'});
      return group;
    }
    const plot={x:margin.left,y:margin.top,w:Math.max(40,W-margin.left-margin.right),h:Math.max(40,H-margin.top-margin.bottom)};
    group.appendChild(createSvg('line',{x1:plot.x,y1:plot.y+plot.h,x2:plot.x+plot.w,y2:plot.y+plot.h,stroke:'#64748b','stroke-width':1.4}));
    group.appendChild(createSvg('line',{x1:plot.x,y1:plot.y,x2:plot.x,y2:plot.y+plot.h,stroke:'#64748b','stroke-width':1.4}));
    const type=item.chartType||'bar';
    const palette=item.palette||['#4f7fe5','#37a37d','#e6904e','#a36ad8','#d9576f','#45a3bd'];

    if (type==='heatmap') {
      const numericRows=rows.map(row=>row.slice(1).map(numeric));
      const values=numericRows.flat().filter(value=>value!==null);
      const [min,max]=extent(values);
      const columns=Math.max(1,headers.length-1),cellW=plot.w/columns,cellH=plot.h/Math.max(1,rows.length);
      numericRows.forEach((row,rowIndex)=>row.forEach((value,columnIndex)=>{
        const ratio=value===null ? 0 : (value-min)/(max-min);
        const hue=220-ratio*190;
        group.appendChild(createSvg('rect',{x:plot.x+columnIndex*cellW,y:plot.y+rowIndex*cellH,width:cellW+1,height:cellH+1,fill:value===null?'#f1f5f9':`hsl(${hue} 72% ${82-ratio*34}%)`,stroke:'#ffffff','stroke-width':1}));
        if (cellW>35 && cellH>22 && value!==null) svgText(group,String(value),plot.x+(columnIndex+.5)*cellW,plot.y+(rowIndex+.6)*cellH,{'text-anchor':'middle','font-size':10});
      }));
      headers.slice(1).forEach((header,columnIndex)=>svgText(group,header,plot.x+(columnIndex+.5)*cellW,plot.y+plot.h+18,{'text-anchor':'middle','font-size':10}));
      rows.forEach((row,rowIndex)=>svgText(group,row[0]||String(rowIndex+1),plot.x-8,plot.y+(rowIndex+.6)*cellH,{'text-anchor':'end','font-size':10}));
    } else if (type==='box') {
      const series=headers.slice(1).map((header,index)=>({header,stats:quartiles(columnValues(item,index+1))})).filter(entry=>entry.stats);
      const all=series.flatMap(entry=>Object.values(entry.stats));
      const [min,max]=extent(all);
      const step=plot.w/Math.max(1,series.length);
      series.forEach((entry,index)=>{
        const x=plot.x+(index+.5)*step,s=entry.stats;
        const y=value=>scale(value,min,max,plot.y+plot.h,plot.y);
        const boxW=Math.min(48,step*.52);
        group.appendChild(createSvg('line',{x1:x,y1:y(s.min),x2:x,y2:y(s.max),stroke:palette[index%palette.length],'stroke-width':2}));
        group.appendChild(createSvg('rect',{x:x-boxW/2,y:y(s.q3),width:boxW,height:Math.max(2,y(s.q1)-y(s.q3)),fill:palette[index%palette.length],opacity:.45,stroke:palette[index%palette.length],'stroke-width':2}));
        group.appendChild(createSvg('line',{x1:x-boxW/2,y1:y(s.median),x2:x+boxW/2,y2:y(s.median),stroke:'#1e293b','stroke-width':2}));
        svgText(group,entry.header,x,plot.y+plot.h+20,{'text-anchor':'middle','font-size':10});
      });
    } else {
      const labels=rows.map((row,index)=>row[0]||String(index+1));
      const series=headers.slice(1).map((header,index)=>({header,index:index+1,values:rows.map(row=>numeric(row[index+1]))}));
      const allValues=series.flatMap(seriesItem=>seriesItem.values).filter(value=>value!==null);
      const [min,max]=extent(allValues.concat([0]));
      const y=value=>scale(value,min,max,plot.y+plot.h,plot.y);
      const zero=y(0);
      for (let tick=0; tick<=4; tick++) {
        const value=min+(max-min)*tick/4, yy=y(value);
        group.appendChild(createSvg('line',{x1:plot.x,y1:yy,x2:plot.x+plot.w,y2:yy,stroke:'#e2e8f0','stroke-width':1}));
        svgText(group,value.toFixed(Math.abs(max-min)<10?1:0),plot.x-8,yy+4,{'text-anchor':'end','font-size':9,fill:'#64748b'});
      }
      if (type==='bar') {
        const groupW=plot.w/Math.max(1,labels.length),barW=Math.max(3,groupW*.72/Math.max(1,series.length));
        labels.forEach((label,rowIndex)=>{
          series.forEach((seriesItem,seriesIndex)=>{
            const value=seriesItem.values[rowIndex];
            if (value===null) return;
            const x=plot.x+rowIndex*groupW+groupW*.14+seriesIndex*barW, yy=y(value);
            group.appendChild(createSvg('rect',{x,y:Math.min(yy,zero),width:Math.max(1,barW-2),height:Math.max(1,Math.abs(zero-yy)),rx:2,fill:palette[seriesIndex%palette.length]}));
          });
          if (labels.length<=12) svgText(group,label,plot.x+(rowIndex+.5)*groupW,plot.y+plot.h+18,{'text-anchor':'middle','font-size':9});
        });
      } else {
        series.forEach((seriesItem,seriesIndex)=>{
          const points=[];
          seriesItem.values.forEach((value,rowIndex)=>{
            if (value===null) return;
            const x=plot.x+pointFraction(rowIndex,labels.length)*plot.w, yy=y(value);
            points.push([x,yy]);
            group.appendChild(createSvg('circle',{cx:x,cy:yy,r:type==='scatter'?4.5:3.5,fill:palette[seriesIndex%palette.length],stroke:'#fff','stroke-width':1.5}));
          });
          if (type==='line' && points.length>1) {
            const path=createSvg('path',{d:`M ${points.map(point=>point.join(' ')).join(' L ')}`,fill:'none',stroke:palette[seriesIndex%palette.length],'stroke-width':3,'stroke-linejoin':'round'});
            group.insertBefore(path,group.children[2]||null);
          }
        });
        labels.forEach((label,index)=>{
          if (labels.length<=12) svgText(group,label,plot.x+pointFraction(index,labels.length)*plot.w,plot.y+plot.h+18,{'text-anchor':'middle','font-size':9});
        });
      }
      series.forEach((seriesItem,index)=>{
        const x=plot.x+index*110;
        group.appendChild(createSvg('rect',{x,y:H-20,width:12,height:12,rx:2,fill:palette[index%palette.length]}));
        svgText(group,seriesItem.header,x+17,H-10,{'font-size':9});
      });
    }
    group.addEventListener('pointerdown',event=>beginDrag(event,item.id));
    group.addEventListener('click',event=>{event.stopPropagation();select(item.id);});
    group.addEventListener('dblclick',event=>{event.stopPropagation();openDataLab(item);});
    return group;
  }

  function tableGroup(item) {
    const group=createSvg('g',{class:'canvas-object data-object','data-id':item.id,transform:`translate(${item.x} ${item.y}) rotate(${item.rotation||0} ${item.width/2} ${item.height/2})`,opacity:item.opacity??1});
    const headers=item.dataHeaders||[],rows=item.dataRows||[],all=[headers,...rows];
    const columns=Math.max(1,headers.length),cellW=item.width/columns,cellH=item.height/Math.max(1,all.length);
    all.forEach((row,rowIndex)=>{
      for (let columnIndex=0; columnIndex<columns; columnIndex++) {
        group.appendChild(createSvg('rect',{x:columnIndex*cellW,y:rowIndex*cellH,width:cellW,height:cellH,fill:rowIndex===0?(item.headerFill||'#dce8f8'):(rowIndex%2?(item.rowFill||'#ffffff'):'#f7f9fc'),stroke:item.stroke||'#94a3b8','stroke-width':1}));
        const value=String(row?.[columnIndex]??'');
        svgText(group,value,columnIndex*cellW+7,rowIndex*cellH+Math.min(cellH-5,Math.max(14,cellH*.62)),{'font-size':Math.max(8,Math.min(13,cellH*.35)),'font-weight':rowIndex===0?700:450});
      }
    });
    group.addEventListener('pointerdown',event=>beginDrag(event,item.id));
    group.addEventListener('click',event=>{event.stopPropagation();select(item.id);});
    group.addEventListener('dblclick',event=>{event.stopPropagation();openDataLab(item);});
    return group;
  }

  const baseRenderObject=renderObject;
  renderObject=function renderDataObject(item) {
    if (item.type==='chart') return chartGroup(item);
    if (item.type==='table') return tableGroup(item);
    return baseRenderObject(item);
  };

  const drawer=createDrawer('dataLabDrawer','Data & charts','Paste spreadsheet data into editable scientific visuals');
  drawer.classList.add('data-lab-drawer');
  drawer.querySelector('.utility-body').innerHTML=`
    <label class="data-full">Data · first row becomes column names<textarea id="dataPaste" rows="10" placeholder="Condition,Control,Treatment\nDay 1,4.2,6.8\nDay 2,5.1,8.4"></textarea></label>
    <div class="data-control-grid"><label>Visual<select id="dataVisual"><option value="bar">Bar chart</option><option value="line">Line chart</option><option value="scatter">Scatter plot</option><option value="box">Box plot</option><option value="heatmap">Heatmap</option><option value="table">Table</option></select></label><label>Title<input id="dataTitle" type="text" value="Results"></label></div>
    <div class="data-preview-summary" id="dataPreviewSummary">Paste CSV or tab-separated data.</div>
    <div class="data-actions"><button id="insertDataVisual" class="primary" type="button">Insert visual</button><button id="updateDataVisual" type="button" disabled>Update selected</button></div>
    <p class="tool-note">Charts and tables remain editable data objects. Double-click one later to reopen its source data. CSV quoting and tab-separated spreadsheet paste are supported.</p>
  `;
  const paste=drawer.querySelector('#dataPaste'),visual=drawer.querySelector('#dataVisual'),title=drawer.querySelector('#dataTitle'),summary=drawer.querySelector('#dataPreviewSummary'),updateButton=drawer.querySelector('#updateDataVisual');
  function summarize() {
    const parsed=parseDelimited(paste.value);
    summary.textContent=parsed.headers.length ? `${parsed.rows.length} data rows · ${parsed.headers.length} columns · ${visual.options[visual.selectedIndex].text}` : 'Paste CSV or tab-separated data.';
  }
  paste.addEventListener('input',summarize);
  visual.addEventListener('change',summarize);

  function objectFromControls(existing=null) {
    const parsed=parseDelimited(paste.value);
    if (parsed.headers.length<2 || !parsed.rows.length) throw new Error('Add a header row and at least one data row.');
    const dimensions=window.currentCanvasSize?.()||{width:1200,height:750};
    const type=visual.value==='table'?'table':'chart';
    const width=Math.min(dimensions.width*.68,760),height=Math.min(dimensions.height*.58,470);
    return {id:existing?.id||uid(),type,name:title.value.trim()||visual.options[visual.selectedIndex].text,x:existing?.x??Math.max(30,(dimensions.width-width)/2),y:existing?.y??Math.max(30,(dimensions.height-height)/2),width:existing?.width??width,height:existing?.height??height,fill:existing?.fill||'#4f7fe5',stroke:existing?.stroke||'#94a3b8',opacity:existing?.opacity??1,rotation:existing?.rotation||0,visible:existing?.visible!==false,dataHeaders:parsed.headers,dataRows:parsed.rows,chartType:visual.value==='table'?null:visual.value,chartTitle:title.value.trim()||'Results',background:existing?.background||'#ffffff',metadata:{...(existing?.metadata||{}),source:'Pasted data',notes:'Editable SciCanvas data visual'}};
  }
  function insertOrUpdate(update) {
    try {
      const existing=update?selectedObject():null;
      if (update && !['chart','table'].includes(existing?.type)) return;
      pushHistory();
      const item=objectFromControls(existing);
      if (existing) Object.assign(existing,item);
      else { state.objects.push(item); state.selectedId=item.id; }
      render(); renderPages?.(); scheduleSave(); drawer.classList.remove('open');
    } catch (error) { alert(error.message); }
  }
  drawer.querySelector('#insertDataVisual').addEventListener('click',()=>insertOrUpdate(false));
  updateButton.addEventListener('click',()=>insertOrUpdate(true));

  function openDataLab(item=null) {
    drawer.classList.add('open');
    const selected=item||selectedObject();
    const editable=['chart','table'].includes(selected?.type);
    updateButton.disabled=!editable;
    if (editable) {
      paste.value=[selected.dataHeaders,...selected.dataRows].map(row=>row.map(value=>String(value).includes(',')?`"${String(value).replaceAll('"','""')}"`:value).join(',')).join('\n');
      visual.value=selected.type==='table'?'table':selected.chartType||'bar';
      title.value=selected.chartTitle||selected.name||'Results';
    }
    summarize();
  }
  window.openDataLab=openDataLab;
  document.querySelector('[data-tab="data"]')?.addEventListener('click',()=>openDataLab());
  window.SciCanvasPro?.register('data',()=>openDataLab());
  window.SciCanvasPro?.shortcut('Double-click chart','Edit its source data');

  const style=document.createElement('style');
  style.textContent=`
    .data-lab-drawer{width:min(680px,calc(100vw - 20px))!important}.data-full{display:grid;gap:5px;color:#617087;font-size:10px}.data-full textarea{width:100%;min-height:180px;border:1px solid #cbd5e1;border-radius:9px;padding:9px;font:11px ui-monospace,SFMono-Regular,Menlo,monospace;resize:vertical}.data-control-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:9px}.data-control-grid label{display:grid;gap:5px;color:#617087;font-size:10px}.data-control-grid select,.data-control-grid input{width:100%;min-height:37px;border:1px solid #cbd5e1;border-radius:8px;background:white;padding:7px}.data-preview-summary{margin:10px 0;padding:8px;border-radius:8px;background:#f1f5f9;color:#52627a;font-size:10px}.data-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.data-actions button{min-height:40px;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc}.data-actions button.primary{background:#2563eb;border-color:#2563eb;color:white}.data-object{cursor:move}
    @media(max-width:480px){.data-control-grid,.data-actions{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
})();