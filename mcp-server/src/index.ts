#!/usr/bin/env node
import { randomBytes, randomUUID } from 'node:crypto';
import http from 'node:http';
import process from 'node:process';
import express, { type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { BrowserBridgeHub } from './browser-bridge.js';
import { ScratchWorkspace } from './scratch-workspace.js';
import type { CommandDescriptor, SessionInfo, WorkspaceTarget } from './types.js';

const VERSION='0.1.0';
const HOST=process.env.FIGURELOOM_MCP_HOST||'127.0.0.1';
const PORT=Number(process.env.FIGURELOOM_MCP_PORT||3210);
const PAIRING_TOKEN=process.env.FIGURELOOM_PAIRING_TOKEN||randomBytes(24).toString('base64url');
const HTTP_AUTH_TOKEN=process.env.FIGURELOOM_MCP_AUTH_TOKEN||randomBytes(32).toString('base64url');
const DEFAULT_ACCESS=process.env.FIGURELOOM_DEFAULT_ACCESS==='read'?'read':'full';
const ALLOW_SCRATCH_DESTRUCTIVE=process.env.FIGURELOOM_ALLOW_DESTRUCTIVE_SCRATCH==='1';
const mode=process.argv.includes('--http')?'http':'stdio';

const bridge=new BrowserBridgeHub(PAIRING_TOKEN);
const activeSessions=new Map<string,SessionController>();

function refreshSessionBroadcast():void { bridge.updateSessions([...activeSessions.values()].map(session=>session.info())); }

class SessionController {
  readonly id=randomUUID();
  readonly createdAt=new Date().toISOString();
  readonly scratch=new ScratchWorkspace();
  workspace:WorkspaceTarget='scratch';
  clientName='MCP client';

  constructor(readonly transport:'stdio'|'http') { activeSessions.set(this.id,this);refreshSessionBroadcast(); }
  close():void { activeSessions.delete(this.id);refreshSessionBroadcast(); }
  info():SessionInfo {
    const currentAccess=bridge.listConnections().find(item=>item.currentProject)?.access||'read';
    return {id:this.id,clientName:this.clientName,transport:this.transport,workspace:this.workspace,access:this.workspace==='scratch'?DEFAULT_ACCESS:currentAccess,createdAt:this.createdAt};
  }

  descriptors():CommandDescriptor[] {
    if(this.workspace==='scratch')return this.scratch.listCommands();
    const connection=bridge.listConnections().find(item=>item.currentProject);
    return connection?.commands?.length?connection.commands:this.scratch.listCommands();
  }
  descriptor(name:string):CommandDescriptor {
    const descriptor=this.descriptors().find(item=>item.name===name);
    if(!descriptor)throw new Error(`Unknown FigureLoom command: ${name}`);
    return descriptor;
  }
  async execute(name:string,args:Record<string,unknown>={}):Promise<any>{
    const descriptor=this.descriptor(name);
    if(this.workspace==='scratch')return this.scratch.execute(name,args,{sessionId:this.id,readOnly:DEFAULT_ACCESS==='read',allowDestructive:ALLOW_SCRATCH_DESTRUCTIVE});
    return bridge.request(this.id,name,args,{write:descriptor.write,destructive:descriptor.destructive,timeoutMs:name.startsWith('page.render')?60000:30000});
  }
  selectWorkspace(target:WorkspaceTarget):Record<string,unknown>{
    if(target==='current'&&!bridge.hasCurrentProjectAccess(false,false))throw new Error('Open FigureLoom Settings → MCP & AI access and authorize the current project first.');
    this.workspace=target;refreshSessionBroadcast();return this.accessState();
  }
  accessState():Record<string,unknown>{
    const connections=bridge.listConnections();
    return {sessionId:this.id,workspace:this.workspace,scratchAccess:DEFAULT_ACCESS,scratchDestructive:ALLOW_SCRATCH_DESTRUCTIVE,currentProjectAvailable:connections.some(item=>item.currentProject),currentProjectConnections:connections.map(item=>({id:item.id,projectId:item.projectId,projectTitle:item.projectTitle,access:item.access,destructive:item.destructive,currentProject:item.currentProject,appVersion:item.appVersion}))};
  }
}

const jsonText=(value:unknown)=>({content:[{type:'text' as const,text:JSON.stringify(value,null,2)}],structuredContent:value as Record<string,unknown>});
const fileResult=(value:any)=>({content:[{type:'text' as const,text:JSON.stringify({fileName:value.fileName,mimeType:value.mimeType,encoding:value.encoding,data:value.data},null,2)}],structuredContent:value});

function createMcpServer(session:SessionController):McpServer {
  const server=new McpServer({name:'figureloom',version:VERSION},{capabilities:{logging:{}}});

  server.tool('get_session_access','Show this MCP session’s workspace, scopes, and available FigureLoom connections',{},async()=>jsonText(session.accessState()));
  server.tool('select_workspace','Choose the isolated scratch project or an explicitly authorized open FigureLoom project',{workspace:z.enum(['scratch','current'])},async({workspace})=>jsonText(session.selectWorkspace(workspace)));
  server.tool('list_commands','Discover every editor command registered by the current FigureLoom workspace',{},async()=>jsonText(session.descriptors()));
  server.tool('get_document_structure','Get the complete project and page structure',{},async()=>jsonText(await session.execute('document.get')));
  server.tool('get_page_state','Get the full structured object tree for a page',{page_index:z.number().int().nonnegative().optional()},async({page_index})=>jsonText(await session.execute('page.get_state',{index:page_index})));
  server.tool('get_selected_objects','Get all currently selected objects and their geometry',{},async()=>jsonText(await session.execute('selection.get')));
  server.tool('render_page','Render a page for visual verification',{format:z.enum(['svg','png']).default('png'),page_index:z.number().int().nonnegative().optional(),scale:z.number().min(.25).max(4).optional(),include_grid:z.boolean().optional()},async(args)=>{
    const rendered=await session.execute('page.render',{format:args.format,index:args.page_index,scale:args.scale,includeGrid:args.include_grid});
    if(rendered.mimeType==='image/png')return{content:[{type:'image' as const,data:rendered.data,mimeType:'image/png'},{type:'text' as const,text:JSON.stringify({width:rendered.width,height:rendered.height,encoding:rendered.encoding})}],structuredContent:rendered};
    return jsonText(rendered);
  });
  server.tool('search_assets','Search FigureLoom libraries by name, tag, or category',{query:z.string().default(''),category:z.string().optional(),limit:z.number().int().min(1).max(200).optional()},async(args)=>jsonText(await session.execute('assets.search',args)));

  server.tool('manage_project','List, create, open, save, duplicate, or delete projects',{action:z.enum(['list','create','open','save','duplicate','delete']),id:z.string().optional(),title:z.string().optional()},async({action,...args})=>jsonText(await session.execute(`project.${action}`,args)));
  server.tool('manage_page','Create, activate, duplicate, delete, reorder, or rename pages',{action:z.enum(['create','activate','duplicate','delete','reorder','rename']),index:z.number().int().nonnegative().optional(),from:z.number().int().nonnegative().optional(),to:z.number().int().nonnegative().optional(),name:z.string().optional(),background:z.record(z.string(),z.unknown()).optional()},async({action,...args})=>jsonText(await session.execute(`page.${action}`,args)));

  server.tool('create_object','Create any composable FigureLoom object and return its ID and geometry',{object:z.record(z.string(),z.unknown())},async({object})=>jsonText(await session.execute('object.create',{object})));
  server.tool('modify_object','Modify position, size, rotation, opacity, style, metadata, or content in one operation',{id:z.string(),patch:z.record(z.string(),z.unknown()),force:z.boolean().optional()},async(args)=>jsonText(await session.execute('object.modify',args)));
  server.tool('delete_objects','Delete objects and attached connectors',{ids:z.array(z.string()).min(1)},async({ids})=>jsonText(await session.execute('object.delete',{ids})));
  server.tool('duplicate_objects','Duplicate objects while preserving internal connector relationships',{ids:z.array(z.string()).min(1),offset_x:z.number().optional(),offset_y:z.number().optional()},async args=>jsonText(await session.execute('object.duplicate',{ids:args.ids,offsetX:args.offset_x,offsetY:args.offset_y})));
  server.tool('group_objects','Group or ungroup objects',{action:z.enum(['group','ungroup']),ids:z.array(z.string()).min(1)},async({action,ids})=>jsonText(await session.execute(`object.${action}`,{ids})));
  server.tool('set_object_state','Lock, unlock, hide, or show objects',{ids:z.array(z.string()).min(1),locked:z.boolean().optional(),visible:z.boolean().optional()},async(args)=>jsonText(await session.execute('object.set_state',args)));
  server.tool('edit_text','Edit plain or rich text content',{id:z.string(),text:z.string(),rich_text:z.unknown().optional()},async(args)=>jsonText(await session.execute('object.edit_text',{id:args.id,text:args.text,richText:args.rich_text})));
  server.tool('apply_style','Apply composable style properties to objects',{ids:z.array(z.string()).min(1),style:z.record(z.string(),z.unknown())},async(args)=>jsonText(await session.execute('object.apply_style',args)));
  server.tool('replace_asset','Replace image, SVG, or library content on an object',{id:z.string(),asset_id:z.string().optional(),src:z.string().optional(),svg_source:z.string().optional(),name:z.string().optional()},async(args)=>jsonText(await session.execute('object.replace_asset',{id:args.id,assetId:args.asset_id,src:args.src,svgSource:args.svg_source,name:args.name})));
  server.tool('insert_asset','Insert a FigureLoom library asset',{asset_id:z.string(),x:z.number().optional(),y:z.number().optional(),width:z.number().positive().optional(),height:z.number().positive().optional(),fill:z.string().optional(),stroke:z.string().optional()},async(args)=>jsonText(await session.execute('asset.insert',{assetId:args.asset_id,...args})));
  server.tool('import_svg','Import SVG source as an editable object',{svg_source:z.string().min(1),name:z.string().optional(),x:z.number().optional(),y:z.number().optional(),width:z.number().positive().optional(),height:z.number().positive().optional()},async(args)=>jsonText(await session.execute('svg.import',{svgSource:args.svg_source,...args})));

  server.tool('arrange_objects','Align, distribute, or change layer order',{action:z.enum(['align','distribute','order']),ids:z.array(z.string()).min(1),kind:z.enum(['left','center','right','top','middle','bottom']).optional(),axis:z.enum(['x','y']).optional(),order:z.enum(['front','back','forward','backward']).optional()},async args=>jsonText(await session.execute(`arrange.${args.action}`,{ids:args.ids,kind:args.kind,axis:args.axis,action:args.order})));
  server.tool('set_selection','Set selected object IDs',{ids:z.array(z.string()),primary_id:z.string().optional()},async(args)=>jsonText(await session.execute('selection.set',{ids:args.ids,primaryId:args.primary_id})));
  server.tool('history','Read, undo, or redo editor history',{action:z.enum(['get','undo','redo'])},async({action})=>jsonText(await session.execute(`history.${action}`)));
  server.tool('set_view','Set zoom, grid, or smart guide state',{zoom:z.number().min(.1).max(8).optional(),grid:z.boolean().optional(),smart_guides:z.boolean().optional()},async(args)=>jsonText(await session.execute('view.set',{zoom:args.zoom,grid:args.grid,smartGuides:args.smart_guides})));
  server.tool('execute_command','Execute any command discovered through list_commands',{command:z.string(),arguments:z.record(z.string(),z.unknown()).optional()},async(args)=>jsonText(await session.execute(args.command,args.arguments||{})));
  server.tool('export_document','Export SVG, PNG, PDF, or PPTX. Scratch exports are returned directly; authorized browser exports use the editor command registry.',{format:z.enum(['svg','png','pdf','pptx']),page_index:z.number().int().nonnegative().optional(),scale:z.number().min(.25).max(4).optional()},async(args)=>{
    if(session.workspace==='scratch')return fileResult(await session.scratch.exportDocument(args.format,args));
    if(args.format==='svg'||args.format==='png')return fileResult(await session.execute('page.render',{format:args.format,index:args.page_index,scale:args.scale}));
    const command=args.format==='pptx'?'export.pptx':'export.pdf';return fileResult(await session.execute(command,args));
  });

  return server;
}

const app=express();
app.use(express.json({limit:'50mb'}));
app.get('/health',(_req,res)=>res.json({ok:true,name:'FigureLoom MCP',version:VERSION,mode,browserConnections:bridge.listConnections().length,sessions:activeSessions.size}));

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

const webServer=http.createServer(app);
bridge.attach(webServer);

webServer.listen(PORT,HOST,async()=>{
  console.error(`FigureLoom MCP bridge: ws://${HOST}:${PORT}/figureloom`);
  console.error(`FigureLoom pairing token: ${PAIRING_TOKEN}`);
  if(mode==='http'){
    console.error(`FigureLoom MCP endpoint: http://${HOST}:${PORT}/mcp`);
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