import { randomUUID } from 'node:crypto';
import { Resvg } from '@resvg/resvg-js';
import { PDFDocument } from 'pdf-lib';
import PptxGenJSImport from 'pptxgenjs';
import type { CommandContext, CommandDescriptor, FigureObject, FigurePage, FigureProject, RenderResult } from './types.js';

const PptxGenJS = (((PptxGenJSImport as unknown as { default?: unknown }).default ?? PptxGenJSImport) as unknown) as new () => any;

type ViewState = { zoom:number; grid:boolean; smartGuides:boolean };
type WorkspaceSnapshot = {
  projects:Array<[string, FigureProject]>;
  currentProjectId:string;
  selectedIds:string[];
  view:ViewState;
};

type LibraryAsset = { id:string; name:string; category:string; tags:string };

const ASSETS:LibraryAsset[] = [
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
];

function descriptor(name:string, description:string, category:string, write=false, destructive=false):CommandDescriptor {
  return { name, description, category, write, destructive, inputSchema:{} };
}

const COMMANDS:CommandDescriptor[] = [
  descriptor('commands.list','List every available command','discovery'),
  descriptor('project.list','List scratch projects','projects'),
  descriptor('project.create','Create a scratch project','projects',true),
  descriptor('project.open','Open a scratch project','projects',true),
  descriptor('project.save','Get a complete portable project snapshot','projects'),
  descriptor('project.duplicate','Duplicate a scratch project','projects',true),
  descriptor('project.delete','Delete a scratch project','projects',true,true),
  descriptor('document.get','Get document structure','reads'),
  descriptor('document.rename','Rename the document','document',true),
  descriptor('document.clear','Clear the current page','document',true,true),
  descriptor('page.get_state','Get a full structured page tree','reads'),
  descriptor('page.render','Render a page to SVG or PNG','reads'),
  descriptor('page.activate','Activate a page','pages'),
  descriptor('page.create','Create a page','pages',true),
  descriptor('page.duplicate','Duplicate a page','pages',true),
  descriptor('page.delete','Delete a page','pages',true,true),
  descriptor('page.reorder','Reorder pages','pages',true),
  descriptor('page.rename','Rename a page','pages',true),
  descriptor('selection.get','Get selected objects','reads'),
  descriptor('selection.set','Set selected objects','selection'),
  descriptor('assets.search','Search the science asset library','reads'),
  descriptor('object.create','Create an object','objects',true),
  descriptor('object.modify','Modify an object','objects',true),
  descriptor('object.delete','Delete objects','objects',true,true),
  descriptor('object.duplicate','Duplicate objects','objects',true),
  descriptor('object.group','Group objects','objects',true),
  descriptor('object.ungroup','Ungroup objects','objects',true),
  descriptor('object.set_state','Lock, unlock, hide or show objects','objects',true),
  descriptor('object.edit_text','Edit object text','objects',true),
  descriptor('object.apply_style','Apply object styles','objects',true),
  descriptor('object.replace_asset','Replace an object asset','objects',true),
  descriptor('asset.insert','Insert a library asset','assets',true),
  descriptor('svg.import','Import SVG source','assets',true),
  descriptor('arrange.order','Change layer order','arrange',true),
  descriptor('arrange.align','Align objects','arrange',true),
  descriptor('arrange.distribute','Distribute objects','arrange',true),
  descriptor('history.get','Get undo and redo state','history'),
  descriptor('history.undo','Undo the previous command','history',true),
  descriptor('history.redo','Redo the next command','history',true),
  descriptor('view.get','Get view state','view'),
  descriptor('view.set','Set view state','view')
];

const descriptorMap = new Map(COMMANDS.map(command => [command.name, command]));

function clone<T>(value:T):T {
  return structuredClone(value);
}

function finite(value:unknown, fallback=0):number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function escapeXml(value:unknown):string {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&apos;'
  }[character] || character));
}

function idsFrom(value:unknown, fallback:string[]=[]):string[] {
  if (!Array.isArray(value)) return [...fallback];
  return value.map(String);
}

function createProject(title='MCP scratch project'):FigureProject {
  return {
    format:'FigureLoom',
    version:2,
    id:`scratch-${randomUUID()}`,
    title,
    pages:[{ id:`page-${randomUUID()}`, name:'Figure 1', objects:[] }],
    activePage:0,
    projectSize:{ width:1200, height:750, widthMm:304.8, heightMm:190.5 },
    metadata:{ scratch:true }
  };
}

export class ScratchWorkspace {
  private readonly projects = new Map<string, FigureProject>();
  private currentProjectId:string;
  private selectedIds:string[]=[];
  private readonly history:string[]=[];
  private readonly future:string[]=[];
  private view:ViewState={ zoom:1, grid:false, smartGuides:true };

  constructor() {
    const project=createProject();
    this.projects.set(project.id,project);
    this.currentProjectId=project.id;
  }

  listCommands():CommandDescriptor[] {
    return clone(COMMANDS);
  }

  project():FigureProject {
    const project=this.projects.get(this.currentProjectId);
    if (!project) throw new Error('The scratch project is unavailable.');
    return project;
  }

  pages():FigurePage[] {
    return this.project().pages;
  }

  page(index=this.project().activePage):FigurePage {
    const safeIndex=Math.max(0,Math.min(Math.trunc(finite(index)),this.pages().length-1));
    const page=this.pages()[safeIndex];
    if (!page) throw new Error('Page not found.');
    return page;
  }

  objects():FigureObject[] {
    return this.page().objects;
  }

  object(id:string):FigureObject|null {
    return this.objects().find(item=>item.id===id)||null;
  }

  private snapshot():string {
    const value:WorkspaceSnapshot={
      projects:[...this.projects.entries()],
      currentProjectId:this.currentProjectId,
      selectedIds:this.selectedIds,
      view:this.view
    };
    return JSON.stringify(value);
  }

  private restore(serialized:string):void {
    const data=JSON.parse(serialized) as WorkspaceSnapshot;
    this.projects.clear();
    data.projects.forEach(([id,project])=>this.projects.set(id,project));
    this.currentProjectId=data.currentProjectId;
    this.selectedIds=data.selectedIds||[];
    this.view=data.view||{zoom:1,grid:false,smartGuides:true};
  }

  private pushHistory():void {
    this.history.push(this.snapshot());
    if (this.history.length>100) this.history.shift();
    this.future.length=0;
  }

  private geometry(item:FigureObject) {
    return { x:finite(item.x), y:finite(item.y), w:finite(item.width), h:finite(item.height), rotation:finite(item.rotation) };
  }

  private objectResult(item:FigureObject) {
    return { id:item.id, type:item.type, name:item.name||item.type, geometry:this.geometry(item), object:clone(item) };
  }

  private projectList() {
    return [...this.projects.values()].map(project=>({
      id:project.id,
      title:project.title,
      pageCount:project.pages.length,
      active:project.id===this.currentProjectId
    }));
  }

  private documentState() {
    const project=this.project();
    return {
      format:project.format,
      version:project.version,
      id:project.id,
      title:project.title,
      activePage:project.activePage,
      pageCount:project.pages.length,
      pages:project.pages.map((page,index)=>({
        id:page.id,
        name:page.name||`Page ${index+1}`,
        objectCount:page.objects.length,
        background:page.background||null,
        notes:page.notes||''
      })),
      projectSize:clone(project.projectSize),
      metadata:clone(project.metadata)
    };
  }

  pageState(index=this.project().activePage) {
    const page=this.page(index);
    return {
      document:this.documentState(),
      page:{
        id:page.id,
        name:page.name,
        index:this.pages().indexOf(page),
        background:clone(page.background||null),
        notes:page.notes||''
      },
      objects:clone(page.objects),
      selectedIds:[...this.selectedIds],
      view:{...this.view}
    };
  }

  private validIds(value:unknown, fallback=this.selectedIds):string[] {
    return [...new Set(idsFrom(value,fallback).filter(id=>this.object(id)))];
  }

  private createObject(inputValue:unknown) {
    const input=(inputValue&&typeof inputValue==='object'?clone(inputValue):{}) as Record<string,unknown>;
    const type=String(input.type||'shape');
    const item:FigureObject={
      id:`obj-${randomUUID()}`,
      type,
      name:String(input.name||type),
      x:finite(input.x),
      y:finite(input.y),
      width:Math.max(1,finite(input.width??input.w,type==='text'?220:200)),
      height:Math.max(1,finite(input.height??input.h,type==='text'?60:120)),
      rotation:finite(input.rotation),
      opacity:finite(input.opacity,1),
      fill:String(input.fill||'#8ea0ff'),
      stroke:String(input.stroke||'#26324a'),
      visible:input.visible!==false,
      locked:Boolean(input.locked),
      ...input
    } as FigureObject;
    item.id=`obj-${randomUUID()}`;
    item.type=type;
    item.width=Math.max(1,finite(item.width,1));
    item.height=Math.max(1,finite(item.height,1));
    this.objects().push(item);
    this.selectedIds=[item.id];
    return this.objectResult(item);
  }

  async execute(name:string,args:Record<string,any>={},context:CommandContext):Promise<any> {
    const command=descriptorMap.get(name);
    if (!command) throw new Error(`Unknown FigureLoom command: ${name}`);
    if (command.write&&context.readOnly) throw new Error('This MCP session is read-only.');
    if (command.destructive&&!context.allowDestructive) throw new Error('This destructive action is not authorized.');
    if (command.write&&!name.startsWith('history.')) this.pushHistory();

    switch(name) {
      case 'commands.list': return this.listCommands();
      case 'project.list': return this.projectList();
      case 'project.create': {
        const project=createProject(String(args.title||'MCP scratch project'));
        this.projects.set(project.id,project);
        this.currentProjectId=project.id;
        this.selectedIds=[];
        return this.documentState();
      }
      case 'project.open': {
        const id=String(args.id||'');
        if (!this.projects.has(id)) throw new Error('Scratch project not found.');
        this.currentProjectId=id;
        this.selectedIds=[];
        return this.documentState();
      }
      case 'project.save': return clone({...this.project(),savedAt:new Date().toISOString()});
      case 'project.duplicate': {
        const source=this.projects.get(String(args.id||this.currentProjectId));
        if (!source) throw new Error('Scratch project not found.');
        const project=clone(source);
        project.id=`scratch-${randomUUID()}`;
        project.title=String(args.title||`${source.title} copy`);
        project.pages.forEach(page=>{
          page.id=`page-${randomUUID()}`;
          const idMap=new Map<string,string>();
          const groupMap=new Map<string,string>();
          page.objects.forEach(item=>{
            const oldId=item.id;
            item.id=`obj-${randomUUID()}`;
            idMap.set(oldId,item.id);
            if (item.groupId&&!groupMap.has(item.groupId)) groupMap.set(item.groupId,`group-${randomUUID()}`);
          });
          page.objects.forEach(item=>{
            if (item.fromId&&idMap.has(item.fromId)) item.fromId=idMap.get(item.fromId);
            if (item.toId&&idMap.has(item.toId)) item.toId=idMap.get(item.toId);
            if (item.groupId&&groupMap.has(item.groupId)) item.groupId=groupMap.get(item.groupId);
          });
        });
        this.projects.set(project.id,project);
        this.currentProjectId=project.id;
        this.selectedIds=[];
        return this.documentState();
      }
      case 'project.delete': {
        const id=String(args.id||this.currentProjectId);
        if (!this.projects.has(id)) throw new Error('Scratch project not found.');
        if (this.projects.size===1) {
          const replacement=createProject();
          this.projects.set(replacement.id,replacement);
        }
        this.projects.delete(id);
        if (id===this.currentProjectId) this.currentProjectId=[...this.projects.keys()][0];
        this.selectedIds=[];
        return {deletedProjectId:id,projects:this.projectList()};
      }
      case 'document.get': return this.documentState();
      case 'document.rename': {
        const title=String(args.title||'').trim();
        if (title) this.project().title=title;
        return this.documentState();
      }
      case 'document.clear': {
        this.page().objects=[];
        this.selectedIds=[];
        return this.pageState();
      }
      case 'page.get_state': return this.pageState(args.index);
      case 'page.render': return this.renderPage(Math.trunc(finite(args.index,this.project().activePage)),String(args.format||'svg'),args);
      case 'page.activate': {
        const index=Math.trunc(finite(args.index,-1));
        if (!this.pages()[index]) throw new Error('Page not found.');
        this.project().activePage=index;
        this.selectedIds=[];
        return this.pageState(index);
      }
      case 'page.create': {
        const page:FigurePage={id:`page-${randomUUID()}`,name:String(args.name||`Figure ${this.pages().length+1}`),objects:[],background:clone(args.background||null)};
        this.pages().push(page);
        this.project().activePage=this.pages().length-1;
        this.selectedIds=[];
        return this.pageState();
      }
      case 'page.duplicate': {
        const index=Number.isInteger(Number(args.index))?Number(args.index):this.project().activePage;
        const source=this.pages()[index];
        if (!source) throw new Error('Page not found.');
        const page=clone(source);
        page.id=`page-${randomUUID()}`;
        page.name=String(args.name||`${source.name} copy`);
        const idMap=new Map<string,string>();
        page.objects.forEach(item=>{const oldId=item.id;item.id=`obj-${randomUUID()}`;idMap.set(oldId,item.id);});
        page.objects.forEach(item=>{
          if (item.fromId&&idMap.has(item.fromId)) item.fromId=idMap.get(item.fromId);
          if (item.toId&&idMap.has(item.toId)) item.toId=idMap.get(item.toId);
        });
        this.pages().splice(index+1,0,page);
        this.project().activePage=index+1;
        this.selectedIds=[];
        return this.pageState();
      }
      case 'page.delete': {
        if (this.pages().length<=1) throw new Error('A project must keep at least one page.');
        const index=Number.isInteger(Number(args.index))?Number(args.index):this.project().activePage;
        const [removed]=this.pages().splice(index,1);
        if (!removed) throw new Error('Page not found.');
        this.project().activePage=Math.min(index,this.pages().length-1);
        this.selectedIds=[];
        return {deletedPageId:removed.id,current:this.pageState()};
      }
      case 'page.reorder': {
        const from=Math.trunc(finite(args.from,-1));
        const to=Math.trunc(finite(args.to,-1));
        if (!this.pages()[from]||to<0||to>=this.pages().length) throw new Error('Invalid page order.');
        const [page]=this.pages().splice(from,1);
        this.pages().splice(to,0,page);
        this.project().activePage=to;
        return this.documentState();
      }
      case 'page.rename': {
        const page=this.page(Number.isInteger(Number(args.index))?Number(args.index):this.project().activePage);
        const nameValue=String(args.name||'').trim();
        if (nameValue) page.name=nameValue;
        return this.pageState(this.pages().indexOf(page));
      }
      case 'selection.get': return this.selectedIds.map(id=>this.object(id)).filter((item):item is FigureObject=>Boolean(item)).map(item=>this.objectResult(item));
      case 'selection.set': {
        this.selectedIds=this.validIds(args.ids,[]);
        return [...this.selectedIds];
      }
      case 'assets.search': {
        const query=String(args.query||'').toLowerCase();
        const category=String(args.category||'').toLowerCase();
        const limit=Math.max(1,Math.min(200,Math.trunc(finite(args.limit,50))));
        return ASSETS.filter(asset=>{
          const text=`${asset.id} ${asset.name} ${asset.category} ${asset.tags}`.toLowerCase();
          return (!query||text.includes(query))&&(!category||asset.category.toLowerCase()===category);
        }).slice(0,limit);
      }
      case 'object.create': return this.createObject(args.object||args);
      case 'object.modify': {
        const item=this.object(String(args.id||''));
        if (!item) throw new Error('Object not found.');
        if (item.locked&&!args.force) throw new Error('Object is locked.');
        const patch=(args.patch&&typeof args.patch==='object'?clone(args.patch):{}) as Record<string,unknown>;
        if ('w' in patch&&!('width' in patch)) patch.width=patch.w;
        if ('h' in patch&&!('height' in patch)) patch.height=patch.h;
        delete patch.id;delete patch.type;delete patch.w;delete patch.h;
        Object.assign(item,patch);
        item.width=Math.max(1,finite(item.width,1));
        item.height=Math.max(1,finite(item.height,1));
        return this.objectResult(item);
      }
      case 'object.delete': {
        const ids=new Set(this.validIds(args.ids??[args.id],[]));
        const deletedIds=this.objects().filter(item=>ids.has(item.id)).map(item=>item.id);
        this.page().objects=this.objects().filter(item=>!ids.has(item.id)&&!(item.type==='connector'&&(ids.has(String(item.fromId))||ids.has(String(item.toId)))));
        this.selectedIds=[];
        return {deletedIds,page:this.pageState()};
      }
      case 'object.duplicate': {
        const ids=new Set(this.validIds(args.ids??[args.id],[]));
        const selected=this.objects().filter(item=>ids.has(item.id));
        if (!selected.length) throw new Error('No objects found.');
        const idMap=new Map<string,string>();
        const copies:FigureObject[]=selected.map(item=>{
          const copy=clone(item);
          const id=`obj-${randomUUID()}`;
          idMap.set(item.id,id);
          copy.id=id;
          copy.name=`${item.name||item.type} copy`;
          copy.x=finite(copy.x)+finite(args.offsetX,24);
          copy.y=finite(copy.y)+finite(args.offsetY,24);
          return copy;
        });
        copies.forEach(item=>{
          if (item.fromId&&idMap.has(item.fromId)) item.fromId=idMap.get(item.fromId);
          if (item.toId&&idMap.has(item.toId)) item.toId=idMap.get(item.toId);
        });
        this.objects().push(...copies);
        this.selectedIds=copies.map(item=>item.id);
        return copies.map(item=>this.objectResult(item));
      }
      case 'object.group': {
        const ids=this.validIds(args.ids).filter(id=>this.object(id)?.type!=='connector');
        if (ids.length<2) throw new Error('At least two objects are required.');
        const groupId=`group-${randomUUID()}`;
        ids.forEach(id=>{const item=this.object(id);if(item)item.groupId=groupId;});
        this.selectedIds=ids;
        return {groupId,objects:ids.map(id=>this.objectResult(this.object(id)!))};
      }
      case 'object.ungroup': {
        const ids=this.validIds(args.ids);
        ids.forEach(id=>{const item=this.object(id);if(item)delete item.groupId;});
        return ids.map(id=>this.objectResult(this.object(id)!));
      }
      case 'object.set_state': {
        const ids=this.validIds(args.ids??[args.id],[]);
        ids.forEach(id=>{
          const item=this.object(id);
          if (!item) return;
          if (typeof args.locked==='boolean') item.locked=args.locked;
          if (typeof args.visible==='boolean') item.visible=args.visible;
        });
        return ids.map(id=>this.objectResult(this.object(id)!));
      }
      case 'object.edit_text': {
        const item=this.object(String(args.id||''));
        if (!item) throw new Error('Object not found.');
        item.text=String(args.text??'');
        if (args.richText!==undefined) item.richText=clone(args.richText);
        return this.objectResult(item);
      }
      case 'object.apply_style': {
        const ids=this.validIds(args.ids??[args.id],[]);
        const style=(args.style&&typeof args.style==='object'?clone(args.style):{}) as Record<string,unknown>;
        ids.forEach(id=>{const item=this.object(id);if(item&&!item.locked)Object.assign(item,style);});
        return ids.map(id=>this.objectResult(this.object(id)!));
      }
      case 'object.replace_asset': {
        const item=this.object(String(args.id||''));
        if (!item) throw new Error('Object not found.');
        if (args.assetId!==undefined) item.asset=String(args.assetId);
        if (args.src!==undefined) item.src=String(args.src);
        if (args.svgSource!==undefined) item.svgSource=String(args.svgSource);
        if (args.name) item.name=String(args.name);
        return this.objectResult(item);
      }
      case 'asset.insert': {
        const asset=ASSETS.find(item=>item.id===String(args.assetId||''));
        if (!asset) throw new Error('Asset not found.');
        return this.createObject({
          type:'science',asset:asset.id,name:asset.name,
          x:args.x??470,y:args.y??300,width:args.width??200,height:args.height??120,
          fill:args.fill||'#7c8cf5',stroke:args.stroke||'#26324a'
        });
      }
      case 'svg.import': return this.createObject({
        type:'svg',name:args.name||'Imported SVG',svgSource:String(args.svgSource||''),
        x:args.x||0,y:args.y||0,width:args.width||300,height:args.height||200
      });
      case 'arrange.order': {
        const ids=new Set(this.validIds(args.ids));
        const chosen=this.objects().filter(item=>ids.has(item.id));
        const rest=this.objects().filter(item=>!ids.has(item.id));
        if (args.action==='back') this.page().objects=[...chosen,...rest];
        else if (args.action==='front') this.page().objects=[...rest,...chosen];
        else chosen.forEach(item=>{
          const index=this.objects().indexOf(item);
          const target=args.action==='backward'?Math.max(0,index-1):Math.min(this.objects().length-1,index+1);
          this.objects().splice(index,1);
          this.objects().splice(target,0,item);
        });
        return this.pageState();
      }
      case 'arrange.align': {
        const items:FigureObject[]=this.validIds(args.ids).map(id=>this.object(id)).filter((item):item is FigureObject=>Boolean(item&&!item.locked&&item.type!=='connector'));
        if (items.length<2) throw new Error('At least two unlocked objects are required.');
        const left=Math.min(...items.map(item=>item.x));
        const top=Math.min(...items.map(item=>item.y));
        const right=Math.max(...items.map(item=>item.x+item.width));
        const bottom=Math.max(...items.map(item=>item.y+item.height));
        const cx=(left+right)/2;
        const cy=(top+bottom)/2;
        items.forEach(item=>{
          if (args.kind==='left') item.x=left;
          if (args.kind==='center') item.x=cx-item.width/2;
          if (args.kind==='right') item.x=right-item.width;
          if (args.kind==='top') item.y=top;
          if (args.kind==='middle') item.y=cy-item.height/2;
          if (args.kind==='bottom') item.y=bottom-item.height;
        });
        return items.map(item=>this.objectResult(item));
      }
      case 'arrange.distribute': {
        const axis:'x'|'y'=args.axis==='y'?'y':'x';
        const sizeKey:'width'|'height'=axis==='x'?'width':'height';
        const items:FigureObject[]=this.validIds(args.ids)
          .map(id=>this.object(id))
          .filter((item):item is FigureObject=>Boolean(item&&!item.locked&&item.type!=='connector'))
          .sort((a,b)=>a[axis]-b[axis]);
        if (items.length<3) throw new Error('At least three unlocked objects are required.');
        const start=items[0][axis];
        const last=items.at(-1)!;
        const end=last[axis]+last[sizeKey];
        const total=items.reduce((sum,item)=>sum+item[sizeKey],0);
        const gap=(end-start-total)/(items.length-1);
        let cursor=start;
        items.forEach(item=>{item[axis]=cursor;cursor+=item[sizeKey]+gap;});
        return items.map(item=>this.objectResult(item));
      }
      case 'history.get': return {undoCount:this.history.length,redoCount:this.future.length};
      case 'history.undo': {
        if (!this.history.length) return {undoCount:0,redoCount:this.future.length,page:this.pageState()};
        this.future.push(this.snapshot());
        this.restore(this.history.pop()!);
        return {undoCount:this.history.length,redoCount:this.future.length,page:this.pageState()};
      }
      case 'history.redo': {
        if (!this.future.length) return {undoCount:this.history.length,redoCount:0,page:this.pageState()};
        this.history.push(this.snapshot());
        this.restore(this.future.pop()!);
        return {undoCount:this.history.length,redoCount:this.future.length,page:this.pageState()};
      }
      case 'view.get': return {...this.view};
      case 'view.set': {
        if (Number.isFinite(Number(args.zoom))) this.view.zoom=Math.max(.1,Math.min(8,Number(args.zoom)));
        if (typeof args.grid==='boolean') this.view.grid=args.grid;
        if (typeof args.smartGuides==='boolean') this.view.smartGuides=args.smartGuides;
        return {...this.view};
      }
      default: throw new Error(`Scratch command is not implemented: ${name}`);
    }
  }

  private objectSvg(item:FigureObject):string {
    if (item.visible===false) return '';
    const x=finite(item.x),y=finite(item.y),width=Math.max(1,finite(item.width,1)),height=Math.max(1,finite(item.height,1));
    const rotation=finite(item.rotation),opacity=Math.max(0,Math.min(1,finite(item.opacity,1)));
    const fill=escapeXml(item.fill||'#8ea0ff'),stroke=escapeXml(item.stroke||'#26324a');
    const transform=`translate(${x} ${y}) rotate(${rotation} ${width/2} ${height/2})`;
    const common=`data-id="${escapeXml(item.id)}" opacity="${opacity}" transform="${transform}"`;

    if (item.type==='connector') {
      const from=this.object(String(item.fromId||''));
      const to=this.object(String(item.toId||''));
      if (!from||!to) return '';
      const x1=from.x+from.width/2,y1=from.y+from.height/2,x2=to.x+to.width/2,y2=to.y+to.height/2;
      return `<g data-id="${escapeXml(item.id)}" opacity="${opacity}"><defs><marker id="arrow-${escapeXml(item.id)}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${fill}"/></marker></defs><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${fill}" stroke-width="${finite(item.strokeWidth,5)}" marker-end="url(#arrow-${escapeXml(item.id)})"/></g>`;
    }
    if (item.type==='text'||item.type==='richtext') {
      return `<g ${common}><text x="0" y="${Math.min(height-4,finite(item.fontSize,30))}" fill="${fill}" font-size="${finite(item.fontSize,30)}" font-family="${escapeXml(item.fontFamily||'Arial, sans-serif')}" font-weight="${finite(item.fontWeight,600)}">${escapeXml(item.text||'')}</text></g>`;
    }
    if (item.type==='arrow') {
      return `<g ${common}><defs><marker id="arrow-${escapeXml(item.id)}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${fill}"/></marker></defs><line x1="0" y1="${height/2}" x2="${width}" y2="${height/2}" stroke="${fill}" stroke-width="${finite(item.strokeWidth,8)}" marker-end="url(#arrow-${escapeXml(item.id)})"/></g>`;
    }
    if (item.type==='image'&&item.src) {
      return `<g ${common}><image href="${escapeXml(item.src)}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet"/></g>`;
    }
    if (item.type==='svg'&&item.svgSource) {
      const data=Buffer.from(String(item.svgSource)).toString('base64');
      return `<g ${common}><image href="data:image/svg+xml;base64,${data}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet"/></g>`;
    }
    const label=item.type==='science'?String(item.name||item.asset||'Illustration'):String(item.text||item.name||'');
    return `<g ${common}><rect width="${width}" height="${height}" rx="${finite(item.rx,12)}" fill="${fill}" stroke="${stroke}" stroke-width="${finite(item.strokeWidth,2)}"/>${label?`<text x="${width/2}" y="${height/2}" dominant-baseline="middle" text-anchor="middle" fill="${escapeXml(item.textColor||'#172033')}" font-family="Arial, sans-serif" font-size="${Math.max(10,Math.min(24,height/4))}">${escapeXml(label)}</text>`:''}</g>`;
  }

  renderSvg(index=this.project().activePage):string {
    const page=this.page(index);
    const size=this.project().projectSize;
    const background=(page.background||{}) as Record<string,unknown>;
    const primary=String(background.primary||background.color||'#ffffff');
    const metadata=escapeXml(JSON.stringify({format:'FigureLoom MCP scratch SVG',projectId:this.project().id,pageId:page.id,pageName:page.name}));
    return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}" viewBox="0 0 ${size.width} ${size.height}"><metadata>${metadata}</metadata><rect width="100%" height="100%" fill="${escapeXml(primary)}"/><g id="objectLayer">${page.objects.map(item=>this.objectSvg(item)).join('')}</g></svg>`;
  }

  async renderPage(index:number,format:string,options:Record<string,unknown>={}):Promise<RenderResult> {
    const svg=this.renderSvg(index);
    if (format==='svg') return {mimeType:'image/svg+xml',data:svg,encoding:'utf8'};
    if (format!=='png') throw new Error(`Unsupported render format: ${format}`);
    const scale=Math.max(.25,Math.min(4,finite(options.scale,1)));
    const rendered=new Resvg(svg,{fitTo:{mode:'zoom',value:scale}}).render();
    const png=rendered.asPng();
    return {mimeType:'image/png',data:Buffer.from(png).toString('base64'),encoding:'base64',width:rendered.width,height:rendered.height};
  }

  async exportDocument(format:'svg'|'png'|'pdf'|'pptx',options:Record<string,unknown>={}) {
    const project=this.project();
    const pageIndex=Number.isInteger(Number(options.pageIndex))?Number(options.pageIndex):project.activePage;
    if (format==='svg') return {mimeType:'image/svg+xml',fileName:`${project.title}-page-${pageIndex+1}.svg`,data:this.renderSvg(pageIndex),encoding:'utf8'};
    if (format==='png') {
      const rendered=await this.renderPage(pageIndex,'png',options);
      return {...rendered,fileName:`${project.title}-page-${pageIndex+1}.png`};
    }

    const pngPages:Buffer[]=[];
    for (let index=0;index<project.pages.length;index+=1) {
      const rendered=await this.renderPage(index,'png',{scale:options.scale||1});
      pngPages.push(Buffer.from(rendered.data,'base64'));
    }

    if (format==='pdf') {
      const pdf=await PDFDocument.create();
      for (const png of pngPages) {
        const image=await pdf.embedPng(png);
        const page=pdf.addPage([project.projectSize.width,project.projectSize.height]);
        page.drawImage(image,{x:0,y:0,width:project.projectSize.width,height:project.projectSize.height});
      }
      const bytes=await pdf.save();
      return {mimeType:'application/pdf',fileName:`${project.title}.pdf`,data:Buffer.from(bytes).toString('base64'),encoding:'base64'};
    }

    const pptx=new PptxGenJS();
    const width=(project.projectSize.widthMm||304.8)/25.4;
    const height=(project.projectSize.heightMm||190.5)/25.4;
    pptx.defineLayout({name:'FIGURELOOM',width,height});
    pptx.layout='FIGURELOOM';
    pptx.author='FigureLoom';
    pptx.title=project.title;
    pngPages.forEach((png,index)=>{
      const slide=pptx.addSlide();
      slide.addImage({data:`data:image/png;base64,${png.toString('base64')}`,x:0,y:0,w:width,h:height,altText:project.pages[index].name});
    });
    const output=await pptx.write({outputType:'nodebuffer'});
    return {mimeType:'application/vnd.openxmlformats-officedocument.presentationml.presentation',fileName:`${project.title}.pptx`,data:Buffer.from(output).toString('base64'),encoding:'base64'};
  }
}