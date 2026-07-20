import { randomUUID } from 'node:crypto';
import { ScratchWorkspace } from './scratch-workspace.js';
import type { CommandContext, CommandDescriptor, FigureObject, FigurePage, FigureProject } from './types.js';

type ExtraDefinition={description:string;category:string;write?:boolean;destructive?:boolean};
type TemplateDefinition={id:string;name:string;description:string;objects:Array<Record<string,unknown>>};
type ScratchComment={id:string;text:string;author:string;createdAt:string};
type ScratchSettings={defaultFont:string;theme:unknown;guides:unknown[];snap:boolean};

const EXTRA_DEFINITIONS:Record<string,ExtraDefinition>={
  'project.snapshot':{description:'Return a complete portable scratch project snapshot',category:'projects'},
  'document.get_full':{description:'Get the complete portable scratch project',category:'reads'},
  'document.metadata.get':{description:'Get project metadata',category:'document'},
  'document.metadata.set':{description:'Set project metadata',category:'document',write:true},
  'document.settings.get':{description:'Get document and view settings',category:'document'},
  'document.settings.set':{description:'Set document and view settings',category:'document',write:true},
  'page.update':{description:'Update page name, notes, background or metadata',category:'pages',write:true},
  'page.list_objects':{description:'List page objects and geometry',category:'reads'},
  'connector.list':{description:'List page connectors',category:'connectors'},
  'connector.create':{description:'Create a connector between objects',category:'connectors',write:true},
  'connector.modify':{description:'Modify a connector',category:'connectors',write:true},
  'clipboard.copy':{description:'Copy objects to the scratch clipboard',category:'clipboard'},
  'clipboard.cut':{description:'Cut objects to the scratch clipboard',category:'clipboard',write:true,destructive:true},
  'clipboard.paste':{description:'Paste objects from the scratch clipboard',category:'clipboard',write:true},
  'clipboard.get':{description:'Read scratch clipboard text',category:'clipboard'},
  'clipboard.write_text':{description:'Write scratch clipboard text',category:'clipboard'},
  'assets.search_all':{description:'Search every isolated scratch asset',category:'assets'},
  'asset.insert_external':{description:'Insert an asset search result',category:'assets',write:true},
  'template.list':{description:'List editable scratch templates',category:'templates'},
  'template.get':{description:'Get an editable scratch template',category:'templates'},
  'template.apply':{description:'Apply a template to the current or a new page',category:'templates',write:true,destructive:true},
  'import.project':{description:'Import a complete project into scratch',category:'import',write:true,destructive:true},
  'import.image':{description:'Import an image into scratch',category:'import',write:true},
  'import.data_table':{description:'Import structured data as an editable table',category:'import',write:true},
  'review.audit':{description:'Audit the scratch project for structural and accessibility issues',category:'review'},
  'review.comments.list':{description:'List scratch review comments',category:'review'},
  'review.comments.add':{description:'Add a scratch review comment',category:'review',write:true},
  'share.status':{description:'Get scratch sharing status',category:'share'},
  'share.session.start':{description:'Start scratch sharing',category:'share'},
  'share.session.stop':{description:'Stop scratch sharing',category:'share'},
  'share.invite':{description:'Invite a collaborator to scratch',category:'share',write:true},
  'ai.status':{description:'Get deterministic scratch AI helper status',category:'ai'},
  'ai.run':{description:'Build, review, or rewrite using the deterministic scratch helper',category:'ai',write:true},
  'pro_tools.list':{description:'List advanced scratch capability groups',category:'discovery'}
};

const TEMPLATES:TemplateDefinition[]=[
  {
    id:'graphical-abstract',name:'Graphical abstract',description:'Question, mechanism and outcome.',objects:[
      {type:'text',name:'Title',x:80,y:50,width:1040,height:60,text:'Graphical abstract',fill:'#172033',fontSize:36,fontWeight:700},
      {type:'shape',name:'Question panel',x:70,y:155,width:280,height:390,fill:'#eef4ff',stroke:'#5f78b8'},
      {type:'shape',name:'Mechanism panel',x:460,y:155,width:280,height:390,fill:'#f4efff',stroke:'#7c5fb8'},
      {type:'shape',name:'Outcome panel',x:850,y:155,width:280,height:390,fill:'#ecfbf4',stroke:'#4e9270'},
      {type:'arrow',name:'Flow arrow',x:365,y:320,width:80,height:50,fill:'#536fc2'},
      {type:'arrow',name:'Flow arrow',x:755,y:320,width:80,height:50,fill:'#536fc2'},
      {type:'text',name:'Question',x:110,y:190,width:200,height:50,text:'Question',fill:'#32405d',fontSize:25,fontWeight:700},
      {type:'text',name:'Mechanism',x:500,y:190,width:200,height:50,text:'Mechanism',fill:'#473761',fontSize:25,fontWeight:700},
      {type:'text',name:'Outcome',x:900,y:190,width:180,height:50,text:'Outcome',fill:'#315e48',fontSize:25,fontWeight:700}
    ]
  },
  {
    id:'workflow',name:'Experimental workflow',description:'Editable horizontal methods sequence.',objects:[
      {type:'text',name:'Title',x:80,y:55,width:1040,height:60,text:'Experimental workflow',fill:'#172033',fontSize:36,fontWeight:700},
      {type:'science',asset:'tube',name:'Sample',x:85,y:280,width:150,height:110,fill:'#8ea0ff'},
      {type:'arrow',name:'Step',x:245,y:310,width:110,height:50,fill:'#536fc2'},
      {type:'science',asset:'pipette',name:'Preparation',x:365,y:280,width:170,height:110,fill:'#8fd2c3'},
      {type:'arrow',name:'Step',x:545,y:310,width:110,height:50,fill:'#536fc2'},
      {type:'science',asset:'petri',name:'Culture',x:665,y:280,width:180,height:110,fill:'#f3cc72'},
      {type:'arrow',name:'Step',x:855,y:310,width:110,height:50,fill:'#536fc2'},
      {type:'science',asset:'microscope',name:'Analysis',x:975,y:275,width:170,height:115,fill:'#a88ee8'}
    ]
  },
  {
    id:'publication-panels',name:'Publication panels',description:'Four editable labelled panels.',objects:[
      {type:'shape',name:'Panel A',x:75,y:90,width:500,height:255,fill:'#ffffff',stroke:'#7a8494'},
      {type:'shape',name:'Panel B',x:625,y:90,width:500,height:255,fill:'#ffffff',stroke:'#7a8494'},
      {type:'shape',name:'Panel C',x:75,y:405,width:500,height:255,fill:'#ffffff',stroke:'#7a8494'},
      {type:'shape',name:'Panel D',x:625,y:405,width:500,height:255,fill:'#ffffff',stroke:'#7a8494'},
      {type:'text',name:'Panel label A',x:95,y:105,width:50,height:50,text:'A',fill:'#172033',fontSize:30,fontWeight:700},
      {type:'text',name:'Panel label B',x:645,y:105,width:50,height:50,text:'B',fill:'#172033',fontSize:30,fontWeight:700},
      {type:'text',name:'Panel label C',x:95,y:420,width:50,height:50,text:'C',fill:'#172033',fontSize:30,fontWeight:700},
      {type:'text',name:'Panel label D',x:645,y:420,width:50,height:50,text:'D',fill:'#172033',fontSize:30,fontWeight:700}
    ]
  }
];

const EXTRA_COMMANDS:CommandDescriptor[]=Object.entries(EXTRA_DEFINITIONS).map(([name,value])=>({
  name,description:value.description,category:value.category,write:Boolean(value.write),destructive:Boolean(value.destructive),inputSchema:{}
}));
const EXTRA_MAP=new Map(EXTRA_COMMANDS.map(command=>[command.name,command]));
const clone=<T>(value:T):T=>structuredClone(value);
const finite=(value:unknown,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
const unique=(values:unknown):string[]=>Array.isArray(values)?[...new Set(values.map(String))]:[];

export class ExtendedScratchWorkspace extends ScratchWorkspace {
  private objectClipboard:FigureObject[]=[];
  private textClipboard='';
  private sharing=false;

  override listCommands():CommandDescriptor[] {
    const merged=new Map(super.listCommands().map(command=>[command.name,command]));
    EXTRA_COMMANDS.forEach(command=>merged.set(command.name,command));
    return [...merged.values()].sort((a,b)=>a.name.localeCompare(b.name));
  }

  private geometryOf(item:FigureObject){return{x:finite(item.x),y:finite(item.y),w:finite(item.width),h:finite(item.height),rotation:finite(item.rotation)};}
  private result(item:FigureObject){return{id:item.id,type:item.type,name:item.name||item.type,geometry:this.geometryOf(item),object:clone(item)};}
  private ids(value:unknown){return unique(value).filter(id=>this.object(id));}
  private metadata():Record<string,unknown>{this.project().metadata??={};return this.project().metadata;}
  private settings():ScratchSettings {
    const value=this.metadata().mcpScratchSettings;
    return {defaultFont:'Inter',theme:null,guides:[],snap:true,...(value&&typeof value==='object'?clone(value as Partial<ScratchSettings>):{})};
  }
  private saveSettings(value:ScratchSettings):void {this.metadata().mcpScratchSettings=clone(value);}
  private comments():ScratchComment[]{const value=this.metadata().mcpScratchComments;return Array.isArray(value)?clone(value as ScratchComment[]):[];}
  private saveComments(value:ScratchComment[]):void {this.metadata().mcpScratchComments=clone(value);}
  private newObject(input:Record<string,unknown>):FigureObject {
    const type=String(input.type||'shape');
    const item={
      id:`obj-${randomUUID()}`,type,name:String(input.name||type),x:finite(input.x),y:finite(input.y),
      width:Math.max(1,finite(input.width??input.w,type==='text'?220:200)),height:Math.max(1,finite(input.height??input.h,type==='text'?60:120)),
      rotation:finite(input.rotation),opacity:Math.max(0,Math.min(1,finite(input.opacity,1))),fill:String(input.fill||'#8ea0ff'),stroke:String(input.stroke||'#26324a'),visible:input.visible!==false,locked:Boolean(input.locked),...clone(input)
    } as FigureObject;
    item.id=`obj-${randomUUID()}`;
    item.type=type;
    item.width=Math.max(1,finite(item.width,1));
    item.height=Math.max(1,finite(item.height,1));
    return item;
  }
  private async checkpoint(context:CommandContext):Promise<void> {await super.execute('document.rename',{title:this.project().title},context);}
  private assertExtra(command:CommandDescriptor,context:CommandContext):void {
    if(command.write&&context.readOnly)throw new Error('This MCP session is read-only.');
    if(command.destructive&&!context.allowDestructive)throw new Error('This destructive action is not authorized.');
  }
  private fullProject():FigureProject&{savedAt:string}{return clone({...this.project(),savedAt:new Date().toISOString()});}

  private audit(){
    const issues:Array<Record<string,unknown>>=[];
    this.pages().forEach((page,pageIndex)=>page.objects.forEach(item=>{
      const where={pageIndex,pageId:page.id,objectId:item.id,objectName:item.name||item.type};
      if(finite(item.width)<=0||finite(item.height)<=0)issues.push({severity:'error',code:'invalid-size',message:'Object has an invalid size.',...where});
      if(finite(item.opacity,1)<=0)issues.push({severity:'warning',code:'zero-opacity',message:'Object opacity is zero.',...where});
      if(item.type==='text'&&!String(item.text||'').trim())issues.push({severity:'warning',code:'empty-text',message:'Text object is empty.',...where});
      if((item.type==='image'||item.type==='svg')&&!item.name)issues.push({severity:'warning',code:'missing-name',message:'Visual asset has no accessible name.',...where});
      if(item.type==='connector'&&(!item.fromId||!item.toId||!this.object(String(item.fromId))||!this.object(String(item.toId))))issues.push({severity:'error',code:'broken-connector',message:'Connector has a missing endpoint.',...where});
    }));
    return{source:'FigureLoom MCP scratch audit',pageCount:this.pages().length,objectCount:this.pages().reduce((sum,page)=>sum+page.objects.length,0),issues,summary:{errors:issues.filter(issue=>issue.severity==='error').length,warnings:issues.filter(issue=>issue.severity==='warning').length}};
  }

  private buildObjects(prompt:string,layout:string):FigureObject[]{
    const stages=prompt.replace(/\b(?:followed by|then|next|after that)\b/gi,'→').split(/\s*(?:→|->|=>|;|\n)\s*/).map(value=>value.trim()).filter(Boolean).slice(0,7);
    const labels=stages.length>=2?stages:['Input','Preparation','Processing','Analysis','Result'];
    const width=this.project().projectSize.width,height=this.project().projectSize.height;
    const objects:FigureObject[]=[this.newObject({type:'text',name:'Title',text:prompt.slice(0,120),x:width*.07,y:height*.05,width:width*.86,height:60,fill:'#172033',fontSize:36,fontWeight:700})];
    const mode=layout==='auto'?(/cycle|loop|circular/i.test(prompt)?'cycle':/compare|versus|vs\.?/i.test(prompt)?'comparison':'workflow'):layout;
    if(mode==='cycle'){
      const cx=width/2,cy=height*.57,rx=width*.31,ry=height*.28,cardW=Math.min(width*.2,250),cardH=Math.min(height*.2,160);
      labels.slice(0,6).forEach((label,index)=>{const angle=-Math.PI/2+index*Math.PI*2/Math.min(labels.length,6);const x=cx+Math.cos(angle)*rx-cardW/2,y=cy+Math.sin(angle)*ry-cardH/2;objects.push(this.newObject({type:'shape',name:`${label} panel`,x,y,width:cardW,height:cardH,fill:index%2?'#ecfbf4':'#eef4ff'}));objects.push(this.newObject({type:'text',name:label,text:label,x:x+16,y:y+cardH*.36,width:cardW-32,height:48,fill:'#172033',fontSize:18,fontWeight:650}));});
    }else if(mode==='comparison'){
      labels.slice(0,4).forEach((label,index)=>{const column=index%2,row=Math.floor(index/2),x=75+column*(width/2),y=150+row*260;objects.push(this.newObject({type:'shape',name:`${label} panel`,x,y,width:width/2-115,height:215,fill:index%2?'#ecfbf4':'#eef4ff'}));objects.push(this.newObject({type:'text',name:label,text:label,x:x+30,y:y+75,width:width/2-175,height:55,fill:'#172033',fontSize:24,fontWeight:700}));});
    }else{
      const margin=60,gap=18,usable=width-margin*2-gap*(labels.length-1),cardW=Math.max(105,usable/labels.length),top=height*.28;
      labels.forEach((label,index)=>{const x=margin+index*(cardW+gap);objects.push(this.newObject({type:'shape',name:`${label} panel`,x,y:top,width:cardW,height:height*.38,fill:index%2?'#ecfbf4':'#eef4ff'}));objects.push(this.newObject({type:'text',name:label,text:label,x:x+12,y:top+height*.15,width:cardW-24,height:50,fill:'#172033',fontSize:Math.max(14,Math.min(22,cardW/8)),fontWeight:650}));if(index<labels.length-1)objects.push(this.newObject({type:'arrow',name:'Step',x:x+cardW+2,y:top+height*.18,width:Math.max(30,gap-4),height:40,fill:'#536fc2'}));});
    }
    return objects;
  }

  override async execute(name:string,args:Record<string,any>={},context:CommandContext):Promise<any>{
    const extra=EXTRA_MAP.get(name);
    if(!extra)return super.execute(name,args,context);
    this.assertExtra(extra,context);
    if(extra.write)await this.checkpoint(context);

    switch(name){
      case'project.snapshot':case'document.get_full':return this.fullProject();
      case'document.metadata.get':return clone(this.project().metadata||{});
      case'document.metadata.set':this.project().metadata=args.replace?clone(args.metadata||{}):{...(this.project().metadata||{}),...clone(args.metadata||{})};return clone(this.project().metadata);
      case'document.settings.get':{const settings=this.settings();return{projectSize:clone(this.project().projectSize),...settings,...await super.execute('view.get',{},context)};}
      case'document.settings.set':{
        const settings=this.settings();
        if(args.projectSize&&typeof args.projectSize==='object')this.project().projectSize={...this.project().projectSize,...clone(args.projectSize)};
        if(typeof args.defaultFont==='string'&&args.defaultFont.trim())settings.defaultFont=args.defaultFont.trim();
        if(args.theme!==undefined)settings.theme=clone(args.theme);
        if(Array.isArray(args.guides))settings.guides=clone(args.guides);
        if(typeof args.snap==='boolean')settings.snap=args.snap;
        this.saveSettings(settings);
        await super.execute('view.set',{zoom:args.zoom,grid:args.grid,smartGuides:args.smartGuides},context);
        return this.execute('document.settings.get',{},context);
      }
      case'page.update':{
        const page=this.page(Number.isInteger(Number(args.index))?Number(args.index):this.project().activePage);
        if(typeof args.name==='string'&&args.name.trim())page.name=args.name.trim();
        if(typeof args.notes==='string')page.notes=args.notes;
        if(args.background!==undefined)page.background=clone(args.background);
        if(args.metadata!==undefined)(page as FigurePage&{metadata?:Record<string,unknown>}).metadata=args.replaceMetadata?clone(args.metadata):{...((page as FigurePage&{metadata?:Record<string,unknown>}).metadata||{}),...clone(args.metadata||{})};
        return this.pageState(this.pages().indexOf(page));
      }
      case'page.list_objects':{const page=this.page(Number.isInteger(Number(args.index))?Number(args.index):this.project().activePage);return page.objects.map(item=>({id:item.id,type:item.type,name:item.name||item.type,geometry:this.geometryOf(item),visible:item.visible!==false,locked:Boolean(item.locked),groupId:item.groupId||null,fromId:item.fromId||null,toId:item.toId||null}));}
      case'connector.list':return this.objects().filter(item=>item.type==='connector').map(item=>this.result(item));
      case'connector.create':{
        const from=this.object(String(args.fromId||'')),to=this.object(String(args.toId||''));if(!from||!to)throw new Error('Both connector endpoints must exist.');
        const item=this.newObject({type:'connector',name:args.name||'Connector',fromId:from.id,toId:to.id,routing:args.routing||'straight',startAnchor:args.startAnchor||'auto',endAnchor:args.endAnchor||'auto',stroke:args.stroke||'#536fc2',fill:args.fill||args.stroke||'#536fc2',strokeWidth:Math.max(1,finite(args.strokeWidth,4)),markerStart:args.markerStart||'',markerEnd:args.markerEnd||'arrow',opacity:finite(args.opacity,1),metadata:clone(args.metadata||{})});this.objects().push(item);await super.execute('selection.set',{ids:[item.id]},context);return this.result(item);
      }
      case'connector.modify':{const item=this.object(String(args.id||''));if(!item||item.type!=='connector')throw new Error('Connector not found.');const patch=clone(args.patch||{});if(patch.fromId&&!this.object(String(patch.fromId)))throw new Error('Connector start object not found.');if(patch.toId&&!this.object(String(patch.toId)))throw new Error('Connector end object not found.');Object.assign(item,patch);return this.result(item);}
      case'clipboard.copy':{const ids=this.ids(args.ids);this.objectClipboard=this.objects().filter(item=>ids.includes(item.id)).map(clone);return{count:this.objectClipboard.length};}
      case'clipboard.cut':{const ids=this.ids(args.ids);this.objectClipboard=this.objects().filter(item=>ids.includes(item.id)).map(clone);this.page().objects=this.objects().filter(item=>!ids.includes(item.id)&&!(item.type==='connector'&&(ids.includes(String(item.fromId))||ids.includes(String(item.toId)))));await super.execute('selection.set',{ids:[]},context);return{count:this.objectClipboard.length,deletedIds:ids,page:this.pageState()};}
      case'clipboard.paste':{if(!this.objectClipboard.length)throw new Error('The scratch object clipboard is empty.');const idMap=new Map<string,string>();const copies=this.objectClipboard.map(source=>{const item=clone(source);const old=item.id;item.id=`obj-${randomUUID()}`;idMap.set(old,item.id);item.x=finite(item.x)+finite(args.offsetX,24);item.y=finite(item.y)+finite(args.offsetY,24);return item;});copies.forEach(item=>{if(item.fromId&&idMap.has(item.fromId))item.fromId=idMap.get(item.fromId);if(item.toId&&idMap.has(item.toId))item.toId=idMap.get(item.toId);});this.objects().push(...copies);await super.execute('selection.set',{ids:copies.map(item=>item.id)},context);return copies.map(item=>this.result(item));}
      case'clipboard.get':return{available:true,text:this.textClipboard};
      case'clipboard.write_text':this.textClipboard=String(args.text||'');return{written:true,length:this.textClipboard.length};
      case'assets.search_all':return super.execute('assets.search',args,context);
      case'asset.insert_external':{
        const entry=args.entry||{};const assetId=String(entry.asset?.id||entry.id||args.assetId||'');
        const item=assetId
          ?this.newObject({type:'science',asset:assetId,name:entry.name||entry.label||assetId,x:finite(args.x,420),y:finite(args.y,240),width:Math.max(1,finite(args.width,230)),height:Math.max(1,finite(args.height,180)),fill:args.fill||'#7c8cf5',stroke:args.stroke||'#26324a',metadata:clone(entry.metadata||{})})
          :this.newObject({type:'svg',name:entry.name||entry.label||'Imported asset',svgSource:String(entry.svgSource||''),x:finite(args.x,420),y:finite(args.y,240),width:Math.max(1,finite(args.width,230)),height:Math.max(1,finite(args.height,180)),metadata:clone(entry.metadata||{})});
        this.objects().push(item);await super.execute('selection.set',{ids:[item.id]},context);return this.result(item);
      }
      case'template.list':return TEMPLATES.map(template=>({id:template.id,name:template.name,description:template.description,objectCount:template.objects.length}));
      case'template.get':{const template=TEMPLATES.find(item=>item.id===String(args.id));if(!template)throw new Error('Template not found.');return clone(template);}
      case'template.apply':{const template=TEMPLATES.find(item=>item.id===String(args.id));if(!template)throw new Error('Template not found.');const objects=template.objects.map(value=>this.newObject(value));if(args.destination==='new-page'){const page:FigurePage={id:`page-${randomUUID()}`,name:String(args.name||template.name),objects};this.pages().push(page);this.project().activePage=this.pages().length-1;}else{this.page().objects=objects;if(args.rename!==false)this.page().name=String(args.name||template.name);}await super.execute('selection.set',{ids:[]},context);return this.pageState();}
      case'import.project':{
        const source=clone(args.project||args.data) as Partial<FigureProject>&{documentName?:string};
        if(!source||!Array.isArray(source.pages)||!source.pages.length)throw new Error('A complete project payload with at least one page is required.');
        const current=this.project();current.title=String(source.title||source.documentName||'Imported scratch project');current.pages=source.pages.map(page=>({...clone(page),id:page.id||`page-${randomUUID()}`,objects:(page.objects||[]).map(item=>({...clone(item),id:item.id||`obj-${randomUUID()}`}))}));current.activePage=Math.max(0,Math.min(finite(source.activePage),current.pages.length-1));if(source.projectSize)current.projectSize={...current.projectSize,...clone(source.projectSize)};if(source.metadata)current.metadata=clone(source.metadata);await super.execute('selection.set',{ids:[]},context);return this.pageState();
      }
      case'import.image':{const src=String(args.src||'');if(!src)throw new Error('An image source is required.');const item=this.newObject({type:'image',name:args.name||'Imported image',src,x:finite(args.x),y:finite(args.y),width:Math.max(1,finite(args.width,320)),height:Math.max(1,finite(args.height,220)),rotation:finite(args.rotation),opacity:finite(args.opacity,1),metadata:clone(args.metadata||{})});this.objects().push(item);await super.execute('selection.set',{ids:[item.id]},context);return this.result(item);}
      case'import.data_table':{const rows=Array.isArray(args.rows)?clone(args.rows):[];if(!rows.length)throw new Error('At least one data row is required.');const columns=Array.isArray(args.columns)&&args.columns.length?clone(args.columns):Object.keys(rows[0]||{});const item=this.newObject({type:'table',name:args.name||'Data table',columns,rows,x:finite(args.x,120),y:finite(args.y,120),width:Math.max(1,finite(args.width,720)),height:Math.max(1,finite(args.height,360)),fill:args.fill||'#ffffff',stroke:args.stroke||'#7a8494',metadata:clone(args.metadata||{})});this.objects().push(item);await super.execute('selection.set',{ids:[item.id]},context);return this.result(item);}
      case'review.audit':return this.audit();
      case'review.comments.list':return this.comments();
      case'review.comments.add':{const text=String(args.text||'').trim();if(!text)throw new Error('A comment is required.');const comments=this.comments();const comment={id:`comment-${randomUUID()}`,text,author:'MCP scratch session',createdAt:new Date().toISOString()};comments.push(comment);this.saveComments(comments);return clone(comment);}
      case'share.status':return{available:false,scratch:true,live:this.sharing,message:'Scratch projects are isolated inside the MCP process and are not shared with cloud collaborators.'};
      case'share.session.start':this.sharing=true;return{available:false,scratch:true,live:true,message:'Scratch state remains isolated to this MCP session.'};
      case'share.session.stop':this.sharing=false;return{available:false,scratch:true,live:false};
      case'share.invite':throw new Error('Scratch projects cannot invite cloud collaborators. Authorize and select a persisted FigureLoom project first.');
      case'ai.status':return{available:true,deterministic:true,sources:['builder'],actions:['build','feedback','rewrite']};
      case'ai.run':{
        const action=String(args.action||'build');const prompt=String(args.prompt||'').trim();if(!prompt)throw new Error('An AI prompt is required.');
        if(action==='feedback')return{action,audit:this.audit(),message:'Deterministic scratch review completed without an external AI service.'};
        if(action==='rewrite'){const item=this.object(String(args.objectId||''));const replacement=String(args.replacementText||args.text||prompt).trim();if(args.apply===false)return{action,text:replacement};if(!item||item.type!=='text')throw new Error('A text object ID is required to apply a rewrite.');item.text=replacement;item.name=replacement.slice(0,40)||item.name;return{action,object:this.result(item)};}
        const objects=this.buildObjects(prompt,String(args.layout||'auto'));const page:FigurePage={id:`page-${randomUUID()}`,name:String(args.title||prompt).slice(0,60),objects};this.pages().push(page);this.project().activePage=this.pages().length-1;await super.execute('selection.set',{ids:[]},context);return this.pageState();
      }
      case'pro_tools.list':return[
        {id:'arrange',title:'Layouts & templates',available:true},{id:'data',title:'Data & charts',available:true},{id:'review',title:'Review & accessibility',available:true},{id:'publish',title:'Export & render',available:true},{id:'workspace',title:'Workspace & recovery',available:true}
      ];
      default:throw new Error(`Scratch extension command is not implemented: ${name}`);
    }
  }
}