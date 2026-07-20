#!/usr/bin/env node
import { randomBytes, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import process from 'node:process';
import express, { type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { BrowserBridgeHub } from './browser-bridge.js';
import { ExtendedScratchWorkspace } from './extended-scratch-workspace.js';
import type { CommandDescriptor, SessionInfo, WorkspaceTarget } from './types.js';

const VERSION='0.2.0';
const HOST=process.env.FIGURELOOM_MCP_HOST||'127.0.0.1';
const PORT=Number(process.env.FIGURELOOM_MCP_PORT||3210);
const PAIRING_TOKEN=process.env.FIGURELOOM_PAIRING_TOKEN||randomBytes(24).toString('base64url');
const HTTP_AUTH_TOKEN=process.env.FIGURELOOM_MCP_AUTH_TOKEN||randomBytes(32).toString('base64url');
const DEFAULT_ACCESS=process.env.FIGURELOOM_DEFAULT_ACCESS==='read'?'read':'full';
const ALLOW_SCRATCH_DESTRUCTIVE=process.env.FIGURELOOM_ALLOW_DESTRUCTIVE_SCRATCH==='1';
const TLS_CERT_PATH=process.env.FIGURELOOM_TLS_CERT||'';
const TLS_KEY_PATH=process.env.FIGURELOOM_TLS_KEY||'';
const TLS_ENABLED=Boolean(TLS_CERT_PATH&&TLS_KEY_PATH);
const mode=process.argv.includes('--http')?'http':'stdio';

const bridge=new BrowserBridgeHub(PAIRING_TOKEN);
const activeSessions=new Map<string,SessionController>();

function refreshSessionBroadcast():void { bridge.updateSessions([...activeSessions.values()].map(session=>session.info())); }

class SessionController {
  readonly id=randomUUID();
  readonly createdAt=new Date().toISOString();
  readonly scratch=new ExtendedScratchWorkspace();
  workspace:WorkspaceTarget='scratch';
  selectedProjectId='';
  clientName='MCP client';

  constructor(readonly transport:'stdio'|'http') { activeSessions.set(this.id,this);refreshSessionBroadcast(); }
  close():void { activeSessions.delete(this.id);refreshSessionBroadcast(); }
  selectedConnection(){return this.selectedProjectId?bridge.connectionForProject(this.selectedProjectId):null;}
  info():SessionInfo {
    const connection=this.selectedConnection();
    return {id:this.id,clientName:this.clientName,transport:this.transport,workspace:this.workspace,access:this.workspace==='scratch'?DEFAULT_ACCESS:(connection?.access||'read'),createdAt:this.createdAt};
  }

  descriptors():CommandDescriptor[] {
    if(this.workspace==='scratch')return this.scratch.listCommands();
    const connection=this.selectedConnection();
    if(!connection)throw new Error('The selected FigureLoom project is no longer connected or authorized.');
    return connection.commands;
  }
  descriptor(name:string):CommandDescriptor {
    const descriptor=this.descriptors().find(item=>item.name===name);
    if(!descriptor)throw new Error(`Unknown FigureLoom command: ${name}`);
    return descriptor;
  }
  async execute(name:string,args:Record<string,unknown>={}):Promise<any>{
    const descriptor=this.descriptor(name);
    if(this.workspace==='scratch')return this.scratch.execute(name,args,{sessionId:this.id,readOnly:DEFAULT_ACCESS==='read',allowDestructive:ALLOW_SCRATCH_DESTRUCTIVE});
    return bridge.request(this.id,name,args,{projectId:this.selectedProjectId,write:descriptor.write,destructive:descriptor.destructive,timeoutMs:name.startsWith('page.render')||name.startsWith('export.')||name==='ai.run'?120000:30000});
  }
  selectWorkspace(target:WorkspaceTarget,projectId?:string):Record<string,unknown>{
    if(target==='scratch'){
      this.workspace='scratch';this.selectedProjectId='';refreshSessionBroadcast();return this.accessState();
    }
    const available=bridge.listConnections().filter(item=>item.currentProject&&item.projectId);
    const selected=projectId?available.find(item=>item.projectId===projectId):available.length===1?available[0]:null;
    if(!selected){
      if(!available.length)throw new Error('Open FigureLoom Settings → MCP & AI access and authorize the current project first.');
      throw new Error('More than one FigureLoom project is authorized. Pass project_id from get_session_access.');
    }
    if(!bridge.hasProjectAccess(selected.projectId,false,false))throw new Error('The selected FigureLoom project is not authorized.');
    this.workspace='current';this.selectedProjectId=selected.projectId;refreshSessionBroadcast();return this.accessState();
  }
  accessState():Record<string,unknown>{
    const connections=bridge.listConnections();
    return {sessionId:this.id,workspace:this.workspace,selectedProjectId:this.selectedProjectId||null,scratchAccess:DEFAULT_ACCESS,scratchDestructive:ALLOW_SCRATCH_DESTRUCTIVE,currentProjectAvailable:connections.some(item=>item.currentProject),currentProjectConnections:connections.map(item=>({id:item.id,projectId:item.projectId,projectTitle:item.projectTitle,access:item.access,destructive:item.destructive,currentProject:item.currentProject,appVersion:item.appVersion,selected:item.projectId===this.selectedProjectId}))};
  }
}

const jsonText=(value:unknown)=>({content:[{type:'text' as const,text:JSON.stringify(value,null,2)}],structuredContent:value as Record<string,unknown>});
const fileResult=(value:any)=>({content:[{type:'text' as const,text:JSON.stringify({fileName:value.fileName,mimeType:value.mimeType,encoding:value.encoding,data:value.data},null,2)}],structuredContent:value});
const recordSchema=z.record(z.string(),z.unknown());

function createMcpServer(session:SessionController):McpServer {
  const server=new McpServer({name:'figureloom',version:VERSION},{capabilities:{logging:{}}});

  server.tool('get_session_access','Show this MCP session’s workspace, scopes, and available FigureLoom projects',{},async()=>jsonText(session.accessState()));
  server.tool('select_workspace','Choose the isolated scratch project or an explicitly authorized FigureLoom project',{workspace:z.enum(['scratch','current']),project_id:z.string().optional()},async({workspace,project_id})=>jsonText(session.selectWorkspace(workspace,project_id)));
  server.tool('list_commands','Discover every editor command registered by the selected FigureLoom workspace',{},async()=>jsonText(session.descriptors()));
  server.tool('get_document_structure','Get the complete project and page structure',{},async()=>jsonText(await session.execute('document.get')));
  server.tool('get_full_project','Get the full portable project payload including all pages and objects',{},async()=>jsonText(await session.execute(session.descriptors().some(item=>item.name==='document.get_full')?'document.get_full':'project.save')));
  server.tool('get_page_state','Get the full structured object tree for a page',{page_index:z.number().int().nonnegative().optional()},async({page_index})=>jsonText(await session.execute('page.get_state',{index:page_index})));
  server.tool('get_selected_objects','Get all currently selected objects and their geometry',{},async()=>jsonText(await session.execute('selection.get')));
  server.tool('render_page','Render a page for visual verification',{format:z.enum(['svg','png']).default('png'),page_index:z.number().int().nonnegative().optional(),scale:z.number().min(.25).max(4).optional(),include_grid:z.boolean().optional()},async(args)=>{
    const rendered=await session.execute('page.render',{format:args.format,index:args.page_index,scale:args.scale,includeGrid:args.include_grid});
    if(rendered.mimeType==='image/png')return{content:[{type:'image' as const,data:rendered.data,mimeType:'image/png'},{type:'text' as const,text:JSON.stringify({width:rendered.width,height:rendered.height,encoding:rendered.encoding})}],structuredContent:rendered};
    return jsonText(rendered);
  });
  server.tool('search_assets','Search FigureLoom libraries by name, tag, or category',{query:z.string().default(''),category:z.string().optional(),limit:z.number().int().min(1).max(200).optional(),online:z.boolean().optional()},async(args)=>jsonText(await session.execute(session.descriptors().some(item=>item.name==='assets.search_all')?'assets.search_all':'assets.search',args)));

  server.tool('manage_project','List, create, open, save, duplicate, or delete projects',{action:z.enum(['list','create','open','save','duplicate','delete']),id:z.string().optional(),title:z.string().optional(),data:recordSchema.optional(),destination:z.enum(['local','cloud']).optional(),force_new:z.boolean().optional()},async({action,force_new,...args})=>jsonText(await session.execute(`project.${action}`,{...args,forceNew:force_new})));
  server.tool('manage_page','Create, activate, duplicate, delete, reorder, rename, or update pages',{action:z.enum(['create','activate','duplicate','delete','reorder','rename','update']),index:z.number().int().nonnegative().optional(),from:z.number().int().nonnegative().optional(),to:z.number().int().nonnegative().optional(),name:z.string().optional(),notes:z.string().optional(),background:recordSchema.optional(),metadata:recordSchema.optional()},async({action,...args})=>jsonText(await session.execute(`page.${action}`,args)));
  server.tool('document_settings','Read or modify document size, fonts, theme, grid, guides, snap and view settings',{action:z.enum(['get','set']),settings:recordSchema.optional()},async({action,settings})=>jsonText(await session.execute(`document.settings.${action}`,settings||{})));
  server.tool('document_metadata','Read or modify project metadata',{action:z.enum(['get','set']),metadata:recordSchema.optional(),replace:z.boolean().optional()},async args=>jsonText(await session.execute(`document.metadata.${args.action}`,{metadata:args.metadata,replace:args.replace})));

  server.tool('create_object','Create any composable FigureLoom object and return its ID and geometry',{object:recordSchema},async({object})=>jsonText(await session.execute('object.create',{object})));
  server.tool('modify_object','Modify position, size, rotation, opacity, style, metadata, or content in one operation',{id:z.string(),patch:recordSchema,force:z.boolean().optional()},async(args)=>jsonText(await session.execute('object.modify',args)));
  server.tool('delete_objects','Delete objects and attached connectors',{ids:z.array(z.string()).min(1)},async({ids})=>jsonText(await session.execute('object.delete',{ids})));
  server.tool('duplicate_objects','Duplicate objects while preserving internal connector relationships',{ids:z.array(z.string()).min(1),offset_x:z.number().optional(),offset_y:z.number().optional()},async args=>jsonText(await session.execute('object.duplicate',{ids:args.ids,offsetX:args.offset_x,offsetY:args.offset_y})));
  server.tool('group_objects','Group or ungroup objects',{action:z.enum(['group','ungroup']),ids:z.array(z.string()).min(1)},async({action,ids})=>jsonText(await session.execute(`object.${action}`,{ids})));
  server.tool('set_object_state','Lock, unlock, hide, or show objects',{ids:z.array(z.string()).min(1),locked:z.boolean().optional(),visible:z.boolean().optional()},async(args)=>jsonText(await session.execute('object.set_state',args)));
  server.tool('edit_text','Edit plain or rich text content',{id:z.string(),text:z.string(),rich_text:z.unknown().optional()},async(args)=>jsonText(await session.execute('object.edit_text',{id:args.id,text:args.text,richText:args.rich_text})));
  server.tool('apply_style','Apply composable style properties to objects',{ids:z.array(z.string()).min(1),style:recordSchema},async(args)=>jsonText(await session.execute('object.apply_style',args)));
  server.tool('replace_asset','Replace image, SVG, or library content on an object',{id:z.string(),asset_id:z.string().optional(),src:z.string().optional(),svg_source:z.string().optional(),name:z.string().optional()},async(args)=>jsonText(await session.execute('object.replace_asset',{id:args.id,assetId:args.asset_id,src:args.src,svgSource:args.svg_source,name:args.name})));
  server.tool('insert_asset','Insert a FigureLoom library asset or expanded search result',{asset_id:z.string().optional(),entry:recordSchema.optional(),x:z.number().optional(),y:z.number().optional(),width:z.number().positive().optional(),height:z.number().positive().optional(),fill:z.string().optional(),stroke:z.string().optional()},async(args)=>jsonText(await session.execute(args.entry?'asset.insert_external':'asset.insert',{assetId:args.asset_id,...args})));
  server.tool('import_svg','Import SVG source as an editable object',{svg_source:z.string().min(1),name:z.string().optional(),x:z.number().optional(),y:z.number().optional(),width:z.number().positive().optional(),height:z.number().positive().optional()},async(args)=>jsonText(await session.execute('svg.import',{svgSource:args.svg_source,...args})));
  server.tool('manage_connector','List, create, or modify connectors',{action:z.enum(['list','create','modify']),id:z.string().optional(),from_id:z.string().optional(),to_id:z.string().optional(),patch:recordSchema.optional(),style:recordSchema.optional()},async args=>jsonText(await session.execute(`connector.${args.action}`,{id:args.id,fromId:args.from_id,toId:args.to_id,patch:args.patch,...(args.style||{})})));

  server.tool('manage_templates','List, get, or apply editable templates',{action:z.enum(['list','get','apply']),id:z.string().optional(),destination:z.enum(['current-page','new-page']).optional(),name:z.string().optional()},async({action,...args})=>jsonText(await session.execute(`template.${action}`,args)));
  server.tool('import_content','Import a project, image, or structured data table',{kind:z.enum(['project','image','data_table']),content:recordSchema},async({kind,content})=>jsonText(await session.execute(`import.${kind}`,content)));
  server.tool('review_project','Run review and accessibility checks',{options:recordSchema.optional()},async({options})=>jsonText(await session.execute('review.audit',options||{})));
  server.tool('manage_share','Read status, start or stop a private session, invite someone, or use review comments',{action:z.enum(['status','start','stop','invite','list_comments','add_comment']),email:z.string().optional(),role:z.enum(['viewer','reviewer','editor']).optional(),text:z.string().optional()},async args=>{
    const names:Record<string,string>={status:'share.status',start:'share.session.start',stop:'share.session.stop',invite:'share.invite',list_comments:'review.comments.list',add_comment:'review.comments.add'};
    return jsonText(await session.execute(names[args.action],args));
  });
  server.tool('run_ai_helper','Run FigureLoom Builder or Gemini using the existing editable-object pipeline',{source:z.enum(['builder','gemini']).default('builder'),action:z.enum(['build','feedback','rewrite']).default('build'),prompt:z.string().min(1),layout:z.enum(['auto','workflow','comparison','cycle']).optional(),online:z.boolean().optional(),apply:z.boolean().optional(),object_id:z.string().optional(),title:z.string().optional(),api_key:z.string().optional(),model:z.string().optional()},async(args)=>jsonText(await session.execute('ai.run',{...args,objectId:args.object_id,apiKey:args.api_key})));

  server.tool('arrange_objects','Align, distribute, or change layer order',{action:z.enum(['align','distribute','order']),ids:z.array(z.string()).min(1),kind:z.enum(['left','center','right','top','middle','bottom']).optional(),axis:z.enum(['x','y']).optional(),order:z.enum(['front','back','forward','backward']).optional()},async args=>jsonText(await session.execute(`arrange.${args.action}`,{ids:args.ids,kind:args.kind,axis:args.axis,action:args.order})));
  server.tool('set_selection','Set selected object IDs',{ids:z.array(z.string()),primary_id:z.string().optional()},async(args)=>jsonText(await session.execute('selection.set',{ids:args.ids,primaryId:args.primary_id})));
  server.tool('clipboard','Copy, cut, paste, read, or write clipboard content',{action:z.enum(['copy','cut','paste','get','write_text']),ids:z.array(z.string()).optional(),text:z.string().optional(),offset_x:z.number().optional(),offset_y:z.number().optional()},async(args)=>jsonText(await session.execute(`clipboard.${args.action}`,{ids:args.ids,text:args.text,offsetX:args.offset_x,offsetY:args.offset_y})));
  server.tool('history','Read, undo, or redo editor history',{action:z.enum(['get','undo','redo'])},async({action})=>jsonText(await session.execute(`history.${action}`)));
  server.tool('set_view','Set zoom, grid, or smart guide state',{zoom:z.number().min(.1).max(8).optional(),grid:z.boolean().optional(),smart_guides:z.boolean().optional()},async(args)=>jsonText(await session.execute('view.set',{zoom:args.zoom,grid:args.grid,smartGuides:args.smart_guides})));
  server.tool('execute_command','Execute any command discovered through list_commands',{command:z.string(),arguments:recordSchema.optional()},async(args)=>jsonText(await session.execute(args.command,args.arguments||{})));
  server.tool('export_document','Export SVG, PNG, PDF, or PPTX. Scratch exports are returned directly; authorized browser exports use the editor command registry.',{format:z.enum(['svg','png','pdf','pptx']),page_index:z.number().int().nonnegative().optional(),scale:z.number().min(.25).max(4).optional()},async(args)=>{
    if(session.workspace==='scratch')return fileResult(await session.scratch.exportDocument(args.format,args));
    if(args.format==='svg'||args.format==='png')return fileResult(await session.execute('page.render',{format:args.format,index:args.page_index,scale:args.scale}));
    const command=args.format==='pptx'?'export.pptx':'export.pdf';return fileResult(await session.execute(command,args));
  });

  return server;
}

const app=express();
app.use(express.json({limit:'50mb'}));
app.get('/health',(_req,res)=>res.json({ok:true,name:'FigureLoom MCP',version:VERSION,mode,tls:TLS_ENABLED,browserConnections:bridge.listConnections().length,sessions:activeSessions.size}));

function requireHttpAuth(req:Request,res:Response,next:NextFunction):void {
  const auth=req.header('authorization')||'';
  if(auth!==`Bearer ${HTTP_AUTH_TOKEN}`){res.status(401).json({error:'Unauthorized'});return;}
  next();
}

const httpTransports=new Map<string,{transport:StreamableHTTPServerTransport;server:McpServer;session:SessionController}>();
app.all('/mcp',requireHttpAuth,async(req:Request,res:Response)=>{
  try{
    const sessionId=req.header('mcp-session-id');
    let record=sessionId?httpTransports.get(sessionId):undefined;
    if(!record){
      if(req.method!=='POST'||!isInitializeRequest(req.body)){res.status(400).json({error:'A valid MCP initialize request is required.'});return;}
      const session=new SessionController('http');
      let transport:StreamableHTTPServerTransport;
      let mcp:McpServer;
      transport=new StreamableHTTPServerTransport({
        sessionIdGenerator:()=>randomUUID(),
        onsessioninitialized:id=>{httpTransports.set(id,{transport,server:mcp,session});refreshSessionBroadcast();}
      });
      mcp=createMcpServer(session);
      transport.onclose=()=>{for(const[id,value]of httpTransports){if(value.transport===transport)httpTransports.delete(id);}session.close();};
      await mcp.connect(transport);
      record={transport,server:mcp,session};
    }
    await record.transport.handleRequest(req,res,req.body);
  }catch(error){if(!res.headersSent)res.status(500).json({error:error instanceof Error?error.message:String(error)});}
});

const webServer=TLS_ENABLED
  ? https.createServer({cert:fs.readFileSync(TLS_CERT_PATH),key:fs.readFileSync(TLS_KEY_PATH)},app)
  : http.createServer(app);
bridge.attach(webServer);

webServer.listen(PORT,HOST,async()=>{
  const webScheme=TLS_ENABLED?'https':'http';
  const socketScheme=TLS_ENABLED?'wss':'ws';
  console.error(`FigureLoom MCP bridge: ${socketScheme}://${HOST}:${PORT}/figureloom`);
  console.error(`FigureLoom pairing token: ${PAIRING_TOKEN}`);
  if(mode==='http'){
    console.error(`FigureLoom MCP endpoint: ${webScheme}://${HOST}:${PORT}/mcp`);
    console.error(`FigureLoom MCP bearer token: ${HTTP_AUTH_TOKEN}`);
    return;
  }
  const session=new SessionController('stdio');
  const server=createMcpServer(session);
  const transport=new StdioServerTransport();
  process.once('exit',()=>session.close());
  await server.connect(transport);
});

process.on('SIGINT',()=>{httpTransports.forEach(record=>record.session.close());webServer.close(()=>process.exit(0));});
process.on('SIGTERM',()=>{httpTransports.forEach(record=>record.session.close());webServer.close(()=>process.exit(0));});