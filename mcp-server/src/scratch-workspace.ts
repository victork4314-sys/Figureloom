import { randomUUID } from 'node:crypto';
import { Resvg } from '@resvg/resvg-js';
import { PDFDocument } from 'pdf-lib';
import PptxGenJS from 'pptxgenjs';
import type { CommandContext, CommandDescriptor, FigureObject, FigurePage, FigureProject, RenderResult } from './types.js';

const ASSETS = [
  { id:'bacterium', name:'Rod bacterium', category:'Microbiology', tags:'bacteria bacillus gram cell pili flagella' },
  { id:'coccus', name:'Coccus cluster', category:'Microbiology', tags:'bacteria cocci cluster gram positive' },
  { id:'virus', name:'Enveloped virus', category:'Virology', tags:'virus virion envelope spike pathogen' },
  { id:'phage', name:'Bacteriophage', category:'Virology', tags:'phage virus capsid tail bacteria' },
  { id:'cell', name:'Eukaryotic cell', category:'Cell biology', tags:'cell nucleus membrane cytoplasm organelle' },
  { id:'mitochondrion', name:'Mitochondrion', category:'Cell biology', tags:'mitochondria organelle cristae energy atp' },
  { id:'dna', name:'DNA helix', category:'Molecular biology', tags:'dna double helix genome genetics nucleotide' },
  { id:'plasmid', name:'Plasmid map', category:'Molecular biology', tags:'plasmid vector circular dna cloning' },
  { id:'protein', name:'Protein complex', category:'Molecular biology', tags:'protein enzyme complex receptor molecule' },
  { id:'antibody', name:'Antibody', category:'Immunology', tags:'antibody immunoglobulin igg immune' },
  { id:'petri', name:'Petri dish', category:'Laboratory', tags:'petri dish culture agar colonies lab' },
  { id:'pipette', name:'Micropipette', category:'Laboratory', tags:'pipette liquid lab equipment' },
  { id:'tube', name:'Microcentrifuge tube', category:'Laboratory', tags:'tube eppendorf sample lab' },
  { id:'microscope', name:'Microscope', category:'Laboratory', tags:'microscope imaging objective lab equipment' },
  { id:'membrane', name:'Lipid membrane', category:'Cell biology', tags:'membrane phospholipid bilayer receptor' },
  { id:'biofilm', name:'Biofilm', category:'Microbiology', tags:'biofilm bacteria matrix community surface' }
] as const;

const COMMANDS: CommandDescriptor[] = [
  ['commands.list','List every available command','discovery',false,false],
  ['project.list','List scratch projects','projects',false,false],
  ['project.create','Create a scratch project','projects',true,false],
  ['project.open','Open a scratch project','projects',true,false],
  ['project.save','Get a complete portable project snapshot','projects',false,false],
  ['project.duplicate','Duplicate a scratch project','projects',true,false],
  ['project.delete','Delete a scratch project','projects',true,true],
  ['document.get','Get document structure','reads',false,false],
  ['document.rename','Rename the document','document',true,false],
  ['document.clear','Clear the current page','document',true,true],
  ['page.get_state','Get a full structured page tree','reads',false,false],
  ['page.render','Render a page to SVG or PNG','reads',false,false],
  ['page.activate','Activate a page','pages',false,false],
  ['page.create','Create a page','pages',true,false],
  ['page.duplicate','Duplicate a page','pages',true,false],
  ['page.delete','Delete a page','pages',true,true],
  ['page.reorder','Reorder pages','pages',true,false],
  ['page.rename','Rename a page','pages',true,false],
  ['selection.get','Get selected objects','reads',false,false],
  ['selection.set','Set selected objects','selection',false,false],
  ['assets.search','Search the science asset library','reads',false,false],
  ['object.create','Create an object','objects',true,false],
  ['object.modify','Modify an object','objects',true,false],
  ['object.delete','Delete objects','objects',true,true],
  ['object.duplicate','Duplicate objects','objects',true,false],
  ['object.group','Group objects','objects',true,false],
  ['object.ungroup','Ungroup objects','objects',true,false],
  ['object.set_state','Lock, unlock, hide or show objects','objects',true,false],
  ['object.edit_text','Edit object text','objects',true,false],
  ['object.apply_style','Apply object styles','objects',true,false],
  ['object.replace_asset','Replace an object asset','objects',true,false],
  ['asset.insert','Insert a library asset','assets',true,false],
  ['svg.import','Import SVG source','assets',true,false],
  ['arrange.order','Change layer order','arrange',true,false],
  ['arrange.align','Align objects','arrange',true,false],
  ['arrange.distribute','Distribute objects','arrange',true,false],
  ['history.get','Get undo and redo state','history',false,false],
  ['history.undo','Undo the previous command','history',true,false],
  ['history.redo','Redo the next command','history',true,false],
  ['view.get','Get view state','view',false,false],
  ['view.set','Set view state','view',false,false]
].map(([name, description, category, write, destructive]) => ({
  name:String(name), description:String(description), category:String(category), write:Boolean(write), destructive:Boolean(destructive)
}));

const descriptorMap = new Map(COMMANDS.map(command => [command.name, command]));
const clone = <T>(value:T):T => structuredClone(value);
const esc = (value:unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&apos;' }[char] || char));
const finite = (value:unknown, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

function createProject(title = 'MCP scratch project'): FigureProject {
  return {
    format:'FigureLoom', version:2, id:`scratch-${randomUUID()}`, title,
    pages:[{ id:`page-${randomUUID()}`, name:'Figure 1', objects:[] }],
    activePage:0, projectSize:{ width:1200, height:750, widthMm:304.8, heightMm:190.5 }, metadata:{ scratch:true }
  };
}

export class ScratchWorkspace {
  private readonly projects = new Map<string, FigureProject>();
  private currentProjectId:string;
  private selectedIds:string[] = [];
  private readonly history:string[] = [];
  private readonly future:string[] = [];
  private view = { zoom:1, grid:false, smartGuides:true };

  constructor() {
    const project = createProject();
    this.projects.set(project.id, project);
    this.currentProjectId = project.id;
  }

  listCommands():CommandDescriptor[] { return clone(COMMANDS); }
  project():FigureProject {
    const value = this.projects.get(this.currentProjectId);
    if (!value) throw new Error('The scratch project is unavailable.');
    return value;
  }
  pages():FigurePage[] { return this.project().pages; }
  page(index = this.project().activePage):FigurePage {
    const page = this.pages()[Math.max(0, Math.min(finite(index), this.pages().length - 1))];
    if (!page) throw new Error('Page not found.');
    return page;
  }
  objects():FigureObject[] { return this.page().objects; }
  object(id:string):FigureObject | null { return this.objects().find(item => item.id === id) || null; }

  private snapshot():string {
    return JSON.stringify({ projects:[...this.projects.entries()], currentProjectId:this.currentProjectId, selectedIds:this.selectedIds, view:this.view });
  }
  private restore(serialized:string):void {
    const data = JSON.parse(serialized) as { projects:[string,FigureProject][]; currentProjectId:string; selectedIds:string[]; view:typeof this.view };
    this.projects.clear();
    data.projects.forEach(([id, project]) => this.projects.set(id, project));
    this.currentProjectId = data.currentProjectId;
    this.selectedIds = data.selectedIds || [];
    this.view = data.view || this.view;
  }
  private pushHistory():void {
    this.history.push(this.snapshot());
    if (this.history.length > 100) this.history.shift();
    this.future.length = 0;
  }
  private geometry(item:FigureObject) {
    return { x:finite(item.x), y:finite(item.y), w:finite(item.width), h:finite(item.height), rotation:finite(item.rotation) };
  }
  private objectResult(item:FigureObject) {
    return { id:item.id, type:item.type, name:item.name || item.type, geometry:this.geometry(item), object:clone(item) };
  }
  private documentState() {
    const project = this.project();
    return {
      format:project.format, version:project.version, id:project.id, title:project.title,
      activePage:project.activePage, pageCount:project.pages.length,
      pages:project.pages.map((page,index) => ({ id:page.id, name:page.name || `Page ${index+1}`, objectCount:page.objects.length, background:page.background || null, notes:page.notes || '' })),
      projectSize:clone(project.projectSize), metadata:clone(project.metadata)
    };
  }
  pageState(index = this.project().activePage) {
    const page = this.page(index);
    return {
      document:this.documentState(),
      page:{ id:page.id, name:page.name, index:this.pages().indexOf(page), background:clone(page.background || null), notes:page.notes || '' },
      objects:clone(page.objects), selectedIds:[...this.selectedIds], view:{ ...this.view }
    };
  }

  async execute(name:string, args:Record<string, any> = {}, context:CommandContext):Promise<any> {
    const descriptor = descriptorMap.get(name);
    if (!descriptor) throw new Error(`Unknown FigureLoom command: ${name}`);
    if (descriptor.write && context.readOnly) throw new Error('This MCP session is read-only.');
    if (descriptor.destructive && !context.allowDestructive) throw new Error('This destructive action is not authorized.');
    if (descriptor.write && !name.startsWith('history.')) this.pushHistory();

    switch (name) {
      case 'commands.list': return this.listCommands();
      case 'project.list': return [...this.projects.values()].map(project => ({ id:project.id, title:project.title, pageCount:project.pages.length, active:project.id === this.currentProjectId }));
      case 'project.create': {
        const project = createProject(String(args.title || 'MCP scratch project'));
        this.projects.set(project.id, project); this.currentProjectId = project.id; this.selectedIds = [];
        return this.documentState();
      }
      case 'project.open': {
        if (!this.projects.has(String(args.id))) throw new Error('Scratch project not found.');
        this.currentProjectId = String(args.id); this.selectedIds = [];
        return this.documentState();
      }
      case 'project.save': return clone({ ...this.project(), savedAt:new Date().toISOString() });
      case 'project.duplicate': {
        const source = this.projects.get(String(args.id || this.currentProjectId));
        if (!source) throw new Error('Scratch project not found.');
        const project = clone(source); project.id = `scratch-${randomUUID()}`; project.title = String(args.title || `${source.title} copy`);
        project.pages.forEach(page => { page.id=`page-${randomUUID()}`; const idMap=new Map<string,string>(); page.objects.forEach(item=>{ const old=item.id; item.id=`obj-${randomUUID()}`; idMap.set(old,item.id); }); page.objects.forEach(item=>{ if(item.fromId&&idMap.has(item.fromId)) item.fromId=idMap.get(item.fromId); if(item.toId&&idMap.has(item.toId)) item.toId=idMap.get(item.toId); }); });
        this.projects.set(project.id, project); this.currentProjectId = project.id; this.selectedIds=[];
        return this.documentState();
      }
      case 'project.delete': {
        const id = String(args.id || this.currentProjectId);
        if (!this.projects.has(id)) throw new Error('Scratch project not found.');
        if (this.projects.size === 1) { const replacement=createProject(); this.projects.set(replacement.id,replacement); }
        this.projects.delete(id); if (id === this.currentProjectId) this.currentProjectId = [...this.projects.keys()][0];
        this.selectedIds=[]; return { deletedProjectId:id, projects:await this.execute('project.list',{},context) };
      }
      case 'document.get': return this.documentState();
      case 'document.rename': this.project().title=String(args.title || '').trim() || this.project().title; return this.documentState();
      case 'document.clear': this.page().objects=[]; this.selectedIds=[]; return this.pageState();
      case 'page.get_state': return this.pageState(args.index);
      case 'page.render': return this.renderPage(finite(args.index,this.project().activePage), args.format || 'svg', args);
      case 'page.activate': {
        const index=finite(args.index,-1); if(!this.pages()[index]) throw new Error('Page not found.'); this.project().activePage=index; this.selectedIds=[]; return this.pageState(index);
      }
      case 'page.create': {
        const page:FigurePage={ id:`page-${randomUUID()}`, name:String(args.name || `Figure ${this.pages().length+1}`), objects:[], background:clone(args.background || null) };
        this.pages().push(page); this.project().activePage=this.pages().length-1; this.selectedIds=[]; return this.pageState();
      }
      case 'page.duplicate': {
        const index=Number.isInteger(Number(args.index))?Number(args.index):this.project().activePage; const source=this.pages()[index]; if(!source) throw new Error('Page not found.');
        const page=clone(source); page.id=`page-${randomUUID()}`; page.name=String(args.name || `${source.name} copy`); const idMap=new Map<string,string>();
        page.objects.forEach(item=>{const old=item.id; item.id=`obj-${randomUUID()}`; idMap.set(old,item.id);}); page.objects.forEach(item=>{if(item.fromId&&idMap.has(item.fromId))item.fromId=idMap.get(item.fromId);if(item.toId&&idMap.has(item.toId))item.toId=idMap.get(item.toId);});
        this.pages().splice(index+1,0,page); this.project().activePage=index+1; this.selectedIds=[]; return this.pageState();
      }
      case 'page.delete': {
        if(this.pages().length<=1) throw new Error('A project must keep at least one page.'); const index=Number.isInteger(Number(args.index))?Number(args.index):this.project().activePage; const [removed]=this.pages().splice(index,1); if(!removed) throw new Error('Page not found.'); this.project().activePage=Math.min(index,this.pages().length-1); this.selectedIds=[]; return {deletedPageId:removed.id,current:this.pageState()};
      }
      case 'page.reorder': {
        const from=finite(args.from,-1),to=finite(args.to,-1);if(!this.pages()[from]||to<0||to>=this.pages().length)throw new Error('Invalid page order.');const [page]=this.pages().splice(from,1);this.pages().splice(to,0,page);this.project().activePage=to;return this.documentState();
      }
      case 'page.rename': { const page=this.page(Number.isInteger(Number(args.index))?Number(args.index):this.project().activePage);page.name=String(args.name||'').trim()||page.name;return this.pageState(this.pages().indexOf(page)); }
      case 'selection.get': return this.selectedIds.map(id=>this.object(id)).filter(Boolean).map(item=>this.objectResult(item!));
      case 'selection.set': this.selectedIds=[...new Set((args.ids||[]).filter((id:string)=>this.object(id)))];return [...this.selectedIds];
      case 'assets.search': {
        const query=String(args.query||'').toLowerCase();const category=String(args.category||'').toLowerCase();return ASSETS.filter(asset=>{const text=`${asset.id} ${asset.name} ${asset.category} ${asset.tags}`.toLowerCase();return(!query||text.includes(query))&&(!category||asset.category.toLowerCase()===category);}).slice(0,Math.max(1,Math.min(200,finite(args.limit,50))));
      }
      case 'object.create': {
        const input=clone(args.object||args);const type=String(input.type||'shape');const item:FigureObject={id:`obj-${randomUUID()}`,type,name:String(input.name||type),x:finite(input.x),y:finite(input.y),width:Math.max(1,finite(input.width??input.w,type==='text'?220:200)),height:Math.max(1,finite(input.height??input.h,type==='text'?60:120)),rotation:finite(input.rotation),opacity:finite(input.opacity,1),fill:String(input.fill||'#8ea0ff'),stroke:String(input.stroke||'#26324a'),visible:input.visible!==false,locked:Boolean(input.locked),...input};item.id=`obj-${randomUUID()}`;this.objects().push(item);this.selectedIds=[item.id];return this.objectResult(item);
      }
      case 'object.modify': {
        const item=this.object(String(args.id));if(!item)throw new Error('Object not found.');if(item.locked&&!args.force)throw new Error('Object is locked.');const patch=clone(args.patch||{});if('w'in patch&&!('width'in patch))patch.width=patch.w;if('h'in patch&&!('height'in patch))patch.height=patch.h;delete patch.id;delete patch.type;delete patch.w;delete patch.h;Object.assign(item,patch);item.width=Math.max(1,finite(item.width,1));item.height=Math.max(1,finite(item.height,1));return this.objectResult(item);
      }
      case 'object.delete': {
        const ids=new Set<string>(args.ids||[args.id].filter(Boolean));const deleted=this.objects().filter(item=>ids.has(item.id)).map(item=>item.id);this.page().objects=this.objects().filter(item=>!ids.has(item.id)&&!(item.type==='connector'&&(ids.has(String(item.fromId))||ids.has(String(item.toId)))));this.selectedIds=[];return{deletedIds:deleted,page:this.pageState()};
      }
      case 'object.duplicate': {
        const ids=new Set<string>(args.ids||[args.id].filter(Boolean));const selected=this.objects().filter(item=>ids.has(item.id));if(!selected.length)throw new Error('No objects found.');const idMap=new Map<string,string>();const copies=selected.map(item=>{const copy=clone(item);idMap.set(item.id,`obj-${randomUUID()}`);copy.id=idMap.get(item.id)!;copy.name=`${item.name||item.type} copy`;copy.x=finite(copy.x)+finite(args.offsetX,24);copy.y=finite(copy.y)+finite(args.offsetY,24);return copy;});copies.forEach(item=>{if(item.fromId&&idMap.has(item.fromId))item.fromId=idMap.get(item.fromId);if(item.toId&&idMap.has(item.toId))item.toId=idMap.get(item.toId);});this.objects().push(...copies);this.selectedIds=copies.map(item=>item.id);return copies.map(item=>this.objectResult(item));
      }
      case 'object.group': {
        const ids=[...new Set<string>(args.ids||this.selectedIds)].filter(id=>this.object(id)?.type!=='connector');if(ids.length<2)throw new Error('At least two objects are required.');const groupId=`group-${randomUUID()}`;ids.forEach(id=>{this.object(id)!.groupId=groupId;});this.selectedIds=ids;return{groupId,objects:ids.map(id=>this.objectResult(this.object(id)!))};
      }
      case 'object.ungroup': { const ids=[...new Set<string>(args.ids||this.selectedIds)];ids.forEach(id=>{const item=this.object(id);if(item)delete item.groupId;});return ids.map(id=>this.object(id)).filter(Boolean).map(item=>this.objectResult(item!)); }
      case 'object.set_state': { const ids=[...new Set<string>(args.ids||[args.id].filter(Boolean))];ids.forEach(id=>{const item=this.object(id);if(!item)return;if(typeof args.locked==='boolean')item.locked=args.locked;if(typeof args.visible==='boolean')item.visible=args.visible;});return ids.map(id=>this.object(id)).filter(Boolean).map(item=>this.objectResult(item!)); }
      case 'object.edit_text': { const item=this.object(String(args.id));if(!item)throw new Error('Object not found.');item.text=String(args.text??'');if(args.richText!==undefined)item.richText=clone(args.richText);return this.objectResult(item); }
      case 'object.apply_style': { const ids=[...new Set<string>(args.ids||[args.id].filter(Boolean))];ids.forEach(id=>{const item=this.object(id);if(item&&!item.locked)Object.assign(item,clone(args.style||{}));});return ids.map(id=>this.object(id)).filter(Boolean).map(item=>this.objectResult(item!)); }
      case 'object.replace_asset': { const item=this.object(String(args.id));if(!item)throw new Error('Object not found.');if(args.assetId!==undefined)item.asset=String(args.assetId);if(args.src!==undefined)item.src=String(args.src);if(args.svgSource!==undefined)item.svgSource=String(args.svgSource);if(args.name)item.name=String(args.name);return this.objectResult(item); }
      case 'asset.insert': { const asset=ASSETS.find(item=>item.id===String(args.assetId));if(!asset)throw new Error('Asset not found.');return this.execute('object.create',{object:{type:'science',asset:asset.id,name:asset.name,x:args.x??470,y:args.y??300,width:args.width??200,height:args.height??120,fill:args.fill||'#7c8cf5',stroke:args.stroke||'#26324a'}},{...context,readOnly:false}); }
      case 'svg.import': return this.execute('object.create',{object:{type:'svg',name:args.name||'Imported SVG',svgSource:String(args.svgSource||''),x:args.x||0,y:args.y||0,width:args.width||300,height:args.height||200}},{...context,readOnly:false});
      case 'arrange.order': {
        const ids=new Set<string>(args.ids||this.selectedIds);const chosen=this.objects().filter(item=>ids.has(item.id));const rest=this.objects().filter(item=>!ids.has(item.id));if(args.action==='back')this.page().objects=[...chosen,...rest];else if(args.action==='front')this.page().objects=[...rest,...chosen];else chosen.forEach(item=>{const index=this.objects().indexOf(item);const target=args.action==='backward'?Math.max(0,index-1):Math.min(this.objects().length-1,index+1);this.objects().splice(index,1);this.objects().splice(target,0,item);});return this.pageState();
      }
      case 'arrange.align': {
        const items=(args.ids||this.selectedIds).map((id:string)=>this.object(id)).filter((item:FigureObject|null):item is FigureObject=>Boolean(item&&!item.locked&&item.type!=='connector'));if(items.length<2)throw new Error('At least two unlocked objects are required.');const left=Math.min(...items.map(i=>i.x)),top=Math.min(...items.map(i=>i.y)),right=Math.max(...items.map(i=>i.x+i.width)),bottom=Math.max(...items.map(i=>i.y+i.height)),cx=(left+right)/2,cy=(top+bottom)/2;items.forEach(item=>{if(args.kind==='left')item.x=left;if(args.kind==='center')item.x=cx-item.width/2;if(args.kind==='right')item.x=right-item.width;if(args.kind==='top')item.y=top;if(args.kind==='middle')item.y=cy-item.height/2;if(args.kind==='bottom')item.y=bottom-item.height;});return items.map(item=>this.objectResult(item));
      }
      case 'arrange.distribute': {
        const axis=args.axis==='y'?'y':'x',sizeKey=axis==='x'?'width':'height';const items=(args.ids||this.selectedIds).map((id:string)=>this.object(id)).filter((item:FigureObject|null):item is FigureObject=>Boolean(item&&!item.locked&&item.type!=='connector')).sort((a,b)=>finite(a[axis])-finite(b[axis]));if(items.length<3)throw new Error('At least three unlocked objects are required.');const start=finite(items[0][axis]),end=finite(items.at(-1)![axis])+finite(items.at(-1)![sizeKey]),total=items.reduce((sum,item)=>sum+finite(item[sizeKey]),0),gap=(end-start-total)/(items.length-1);let cursor=start;items.forEach(item=>{item[axis]=cursor;cursor+=finite(item[sizeKey])+gap;});return items.map(item=>this.objectResult(item));
      }
      case 'history.get': return {undoCount:this.history.length,redoCount:this.future.length};
      case 'history.undo': { if(!this.history.length)return{undoCount:0,redoCount:this.future.length,page:this.pageState()};this.future.push(this.snapshot());this.restore(this.history.pop()!);return{undoCount:this.history.length,redoCount:this.future.length,page:this.pageState()}; }
      case 'history.redo': { if(!this.future.length)return{undoCount:this.history.length,redoCount:0,page:this.pageState()};this.history.push(this.snapshot());this.restore(this.future.pop()!);return{undoCount:this.history.length,redoCount:this.future.length,page:this.pageState()}; }
      case 'view.get': return { ...this.view };
      case 'view.set': { if(Number.isFinite(Number(args.zoom)))this.view.zoom=Math.max(.1,Math.min(8,Number(args.zoom)));if(typeof args.grid==='boolean')this.view.grid=args.grid;if(typeof args.smartGuides==='boolean')this.view.smartGuides=args.smartGuides;return{...this.view}; }
      default: throw new Error(`Scratch command is not implemented: ${name}`);
    }
  }

  private objectSvg(item:FigureObject):string {
    if (item.visible === false) return '';
    const x=finite(item.x),y=finite(item.y),w=Math.max(1,finite(item.width,1)),h=Math.max(1,finite(item.height,1)),rotation=finite(item.rotation),opacity=Math.max(0,Math.min(1,finite(item.opacity,1))),fill=esc(item.fill||'#8ea0ff'),stroke=esc(item.stroke||'#26324a');
    const transform=`translate(${x} ${y}) rotate(${rotation} ${w/2} ${h/2})`;
    const common=`data-id="${esc(item.id)}" opacity="${opacity}" transform="${transform}"`;
    if(item.type==='connector'){
      const from=this.object(String(item.fromId)),to=this.object(String(item.toId));if(!from||!to)return'';const x1=from.x+from.width/2,y1=from.y+from.height/2,x2=to.x+to.width/2,y2=to.y+to.height/2;return`<g data-id="${esc(item.id)}" opacity="${opacity}"><defs><marker id="arrow-${esc(item.id)}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${fill}"/></marker></defs><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${fill}" stroke-width="${finite(item.strokeWidth,5)}" marker-end="url(#arrow-${esc(item.id)})"/></g>`;}
    if(item.type==='text'||item.type==='richtext')return`<g ${common}><text x="0" y="${Math.min(h-4,finite(item.fontSize,30))}" fill="${fill}" font-size="${finite(item.fontSize,30)}" font-family="${esc(item.fontFamily||'Arial, sans-serif')}" font-weight="${finite(item.fontWeight,600)}">${esc(item.text||'')}</text></g>`;
    if(item.type==='arrow')return`<g ${common}><defs><marker id="arrow-${esc(item.id)}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${fill}"/></marker></defs><line x1="0" y1="${h/2}" x2="${w}" y2="${h/2}" stroke="${fill}" stroke-width="${finite(item.strokeWidth,8)}" marker-end="url(#arrow-${esc(item.id)})"/></g>`;
    if(item.type==='image'&&item.src)return`<g ${common}><image href="${esc(item.src)}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/></g>`;
    if(item.type==='svg'&&item.svgSource){const data=Buffer.from(String(item.svgSource)).toString('base64');return`<g ${common}><image href="data:image/svg+xml;base64,${data}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/></g>`;}
    const label=item.type==='science'?String(item.name||item.asset||'Illustration'):String(item.text||item.name||'');
    return`<g ${common}><rect width="${w}" height="${h}" rx="${finite(item.rx,12)}" fill="${fill}" stroke="${stroke}" stroke-width="${finite(item.strokeWidth,2)}"/>${label?`<text x="${w/2}" y="${h/2}" dominant-baseline="middle" text-anchor="middle" fill="${esc(item.textColor||'#172033')}" font-family="Arial, sans-serif" font-size="${Math.max(10,Math.min(24,h/4))}">${esc(label)}</text>`:''}</g>`;
  }

  renderSvg(index = this.project().activePage):string {
    const page=this.page(index),size=this.project().projectSize,bg=page.background||{},primary=String((bg as any).primary||(bg as any).color||'#ffffff');
    return`<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}" viewBox="0 0 ${size.width} ${size.height}"><metadata>${esc(JSON.stringify({format:'FigureLoom MCP scratch SVG',projectId:this.project().id,pageId:page.id,pageName:page.name}))}</metadata><rect width="100%" height="100%" fill="${esc(primary)}"/><g id="objectLayer">${page.objects.map(item=>this.objectSvg(item)).join('')}</g></svg>`;
  }

  async renderPage(index:number, format:string, options:Record<string, any> = {}):Promise<RenderResult> {
    const svg=this.renderSvg(index);
    if(format==='svg')return{mimeType:'image/svg+xml',data:svg,encoding:'utf8'};
    if(format!=='png')throw new Error(`Unsupported render format: ${format}`);
    const scale=Math.max(.25,Math.min(4,finite(options.scale,1)));const rendered=new Resvg(svg,{fitTo:{mode:'zoom',value:scale}}).render();const png=rendered.asPng();
    return{mimeType:'image/png',data:Buffer.from(png).toString('base64'),encoding:'base64',width:rendered.width,height:rendered.height};
  }

  async exportDocument(format:'svg'|'png'|'pdf'|'pptx', options:Record<string, any> = {}) {
    const project=this.project();
    if(format==='svg'){
      const index=Number.isInteger(Number(options.pageIndex))?Number(options.pageIndex):project.activePage;return{mimeType:'image/svg+xml',fileName:`${project.title}-page-${index+1}.svg`,data:this.renderSvg(index),encoding:'utf8'};
    }
    if(format==='png'){
      const index=Number.isInteger(Number(options.pageIndex))?Number(options.pageIndex):project.activePage;const rendered=await this.renderPage(index,'png',options);return{...rendered,fileName:`${project.title}-page-${index+1}.png`};
    }
    const pngPages=[] as Buffer[];
    for(let index=0;index<project.pages.length;index+=1){const rendered=await this.renderPage(index,'png',{scale:options.scale||1});pngPages.push(Buffer.from(rendered.data,'base64'));}
    if(format==='pdf'){
      const pdf=await PDFDocument.create();for(const png of pngPages){const image=await pdf.embedPng(png);const page=pdf.addPage([project.projectSize.width,project.projectSize.height]);page.drawImage(image,{x:0,y:0,width:project.projectSize.width,height:project.projectSize.height});}const bytes=await pdf.save();return{mimeType:'application/pdf',fileName:`${project.title}.pdf`,data:Buffer.from(bytes).toString('base64'),encoding:'base64'};
    }
    const pptx=new PptxGenJS();const width=(project.projectSize.widthMm||304.8)/25.4,height=(project.projectSize.heightMm||190.5)/25.4;pptx.defineLayout({name:'FIGURELOOM',width,height});pptx.layout='FIGURELOOM';pptx.author='FigureLoom';pptx.title=project.title;pngPages.forEach((png,index)=>{const slide=pptx.addSlide();slide.addImage({data:`data:image/png;base64,${png.toString('base64')}`,x:0,y:0,w:width,h:height,altText:project.pages[index].name});});const output=await (pptx as any).write({outputType:'nodebuffer'});return{mimeType:'application/vnd.openxmlformats-officedocument.presentationml.presentation',fileName:`${project.title}.pptx`,data:Buffer.from(output).toString('base64'),encoding:'base64'};
  }
}