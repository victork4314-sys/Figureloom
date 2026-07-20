import { randomUUID, timingSafeEqual } from 'node:crypto';
import type { Server as HttpServer, IncomingMessage } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import type { BrowserConnectionInfo, BrowserHello, SessionInfo } from './types.js';

function secureEqual(left:string, right:string):boolean {
  const a=Buffer.from(left);const b=Buffer.from(right);
  return a.length===b.length&&timingSafeEqual(a,b);
}

export class BrowserBridgeHub {
  private readonly wss = new WebSocketServer({ noServer:true });
  private readonly connections = new Map<string,{ socket:WebSocket; info:BrowserConnectionInfo }>();
  private readonly pending = new Map<string,{ resolve:(value:any)=>void; reject:(error:Error)=>void; timer:NodeJS.Timeout }>();
  private sessions:SessionInfo[]=[];

  constructor(readonly pairingToken:string) {
    this.wss.on('connection',(socket,request)=>this.accept(socket,request));
  }

  attach(server:HttpServer):void {
    server.on('upgrade',(request,socket,head)=>{
      const url=new URL(request.url||'/',`http://${request.headers.host||'127.0.0.1'}`);
      if(url.pathname!=='/figureloom'){socket.destroy();return;}
      this.wss.handleUpgrade(request,socket,head,ws=>this.wss.emit('connection',ws,request));
    });
  }

  private send(socket:WebSocket,message:unknown):void {
    if(socket.readyState===WebSocket.OPEN)socket.send(JSON.stringify(message));
  }

  private accept(socket:WebSocket,_request:IncomingMessage):void {
    let connectionId='';
    const helloTimer=setTimeout(()=>{this.send(socket,{type:'pairing_error',error:'FigureLoom pairing timed out.'});socket.close(4401,'Pairing required');},10000);
    socket.on('message',raw=>{
      let message:any;
      try{message=JSON.parse(raw.toString());}catch{return;}
      if(!connectionId){
        if(message?.type!=='browser_hello')return;
        const hello=message as BrowserHello;
        if(!secureEqual(String(hello.token||''),this.pairingToken)){
          clearTimeout(helloTimer);this.send(socket,{type:'pairing_error',error:'Invalid pairing token.'});socket.close(4403,'Invalid token');return;
        }
        clearTimeout(helloTimer);connectionId=randomUUID();
        const info:BrowserConnectionInfo={
          id:connectionId,appName:hello.app?.name||'FigureLoom',appVersion:hello.app?.version||'web',
          projectId:hello.project?.id||'',projectTitle:hello.project?.title||'Untitled project',
          access:hello.access?.mode==='full'?'full':'read',destructive:Boolean(hello.access?.destructive),currentProject:Boolean(hello.access?.currentProject),
          commands:Array.isArray(hello.commands)?hello.commands:[],connectedAt:new Date().toISOString()
        };
        this.connections.set(connectionId,{socket,info});
        this.send(socket,{type:'paired',connectionId,sessions:this.sessions});
        return;
      }
      if(message?.type==='browser_hello'){
        const record=this.connections.get(connectionId);if(!record)return;
        const hello=message as BrowserHello;
        record.info={...record.info,appName:hello.app?.name||record.info.appName,appVersion:hello.app?.version||record.info.appVersion,projectId:hello.project?.id||record.info.projectId,projectTitle:hello.project?.title||record.info.projectTitle,access:hello.access?.mode==='full'?'full':'read',destructive:Boolean(hello.access?.destructive),currentProject:Boolean(hello.access?.currentProject),commands:Array.isArray(hello.commands)?hello.commands:record.info.commands};
        this.send(socket,{type:'paired',connectionId,sessions:this.sessions});return;
      }
      if(message?.type==='browser_response'){
        const pending=this.pending.get(String(message.requestId));if(!pending)return;
        clearTimeout(pending.timer);this.pending.delete(String(message.requestId));
        if(message.ok)pending.resolve(message.result);else pending.reject(new Error(message.error||'FigureLoom command failed.'));
      }
    });
    socket.on('close',()=>{clearTimeout(helloTimer);if(connectionId)this.connections.delete(connectionId);});
    socket.on('error',()=>{});
  }

  updateSessions(sessions:SessionInfo[]):void {
    this.sessions=sessions.map(session=>({...session}));
    this.connections.forEach(({socket})=>this.send(socket,{type:'sessions',sessions:this.sessions}));
  }

  listConnections():BrowserConnectionInfo[]{return[...this.connections.values()].map(record=>structuredClone(record.info));}

  authorizedConnection(command:string,write:boolean,destructive:boolean):{socket:WebSocket;info:BrowserConnectionInfo}|null {
    for(const record of this.connections.values()){
      if(!record.info.currentProject)continue;
      if(write&&record.info.access!=='full')continue;
      if(destructive&&!record.info.destructive)continue;
      if(record.info.commands.length&&!record.info.commands.some(entry=>entry.name===command))continue;
      return record;
    }
    return null;
  }

  hasCurrentProjectAccess(write=false,destructive=false):boolean{return Boolean(this.authorizedConnection('document.get',write,destructive));}

  async request(sessionId:string,command:string,args:Record<string,unknown>,options:{write:boolean;destructive:boolean;timeoutMs?:number}):Promise<any>{
    const record=this.authorizedConnection(command,options.write,options.destructive);
    if(!record)throw new Error(options.write?'No FigureLoom window has authorized full access to its current project.':'No FigureLoom window has authorized its current project.');
    const requestId=randomUUID();
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{this.pending.delete(requestId);reject(new Error(`FigureLoom did not answer ${command} within the timeout.`));},options.timeoutMs||30000);
      this.pending.set(requestId,{resolve,reject,timer});
      this.send(record.socket,{type:'browser_request',requestId,sessionId,workspace:'current',command,args});
    });
  }
}