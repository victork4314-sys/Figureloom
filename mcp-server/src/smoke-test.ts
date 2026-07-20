import assert from 'node:assert/strict';
import { ExtendedScratchWorkspace } from './extended-scratch-workspace.js';
import type { CommandContext } from './types.js';

const full:CommandContext={sessionId:'smoke-full',readOnly:false,allowDestructive:true};
const readOnly:CommandContext={sessionId:'smoke-read',readOnly:true,allowDestructive:false};
const noDestructive:CommandContext={sessionId:'smoke-safe',readOnly:false,allowDestructive:false};

async function run():Promise<void>{
  const workspace=new ExtendedScratchWorkspace();
  const commands=workspace.listCommands().map(command=>command.name);
  for(const required of [
    'document.get_full','document.settings.set','page.update','connector.create','template.apply',
    'import.data_table','review.audit','ai.run','project.snapshot'
  ])assert(commands.includes(required),`Missing scratch command: ${required}`);

  const document=await workspace.execute('document.get',{},full);
  assert.equal(document.pageCount,1);
  assert.equal(document.metadata.scratch,true);

  const first=await workspace.execute('object.create',{object:{type:'shape',name:'Input',x:80,y:160,width:220,height:140,fill:'#eef4ff'}},full);
  const second=await workspace.execute('object.create',{object:{type:'shape',name:'Output',x:700,y:160,width:220,height:140,fill:'#ecfbf4'}},full);
  assert(first.id&&second.id);
  assert.deepEqual(first.geometry,{x:80,y:160,w:220,h:140,rotation:0});

  const connector=await workspace.execute('connector.create',{fromId:first.id,toId:second.id,name:'Flow',markerEnd:'arrow'},full);
  assert.equal(connector.object.fromId,first.id);
  assert.equal(connector.object.toId,second.id);

  const modified=await workspace.execute('object.modify',{id:first.id,patch:{x:120,rotation:15}},full);
  assert.equal(modified.geometry.x,120);
  assert.equal(modified.geometry.rotation,15);

  const beforeSettings=await workspace.execute('document.settings.get',{},full);
  await workspace.execute('document.settings.set',{defaultFont:'IBM Plex Sans',grid:true,zoom:1.25,guides:[{axis:'x',position:600}]},full);
  const changedSettings=await workspace.execute('document.settings.get',{},full);
  assert.equal(changedSettings.defaultFont,'IBM Plex Sans');
  assert.equal(changedSettings.grid,true);
  await workspace.execute('history.undo',{},full);
  const restoredSettings=await workspace.execute('document.settings.get',{},full);
  assert.equal(restoredSettings.defaultFont,beforeSettings.defaultFont);

  const state=await workspace.execute('page.get_state',{},full);
  assert(state.objects.length>=3);
  assert(state.objects.some((item:{type:string})=>item.type==='connector'));

  const rendered=await workspace.execute('page.render',{format:'png',scale:.5},full);
  assert.equal(rendered.mimeType,'image/png');
  assert.equal(rendered.encoding,'base64');
  assert(rendered.data.length>100);

  const templates=await workspace.execute('template.list',{},full);
  assert(templates.some((template:{id:string})=>template.id==='workflow'));
  await workspace.execute('template.apply',{id:'workflow',destination:'new-page'},full);
  assert.equal((await workspace.execute('document.get',{},full)).pageCount,2);

  const aiPage=await workspace.execute('ai.run',{action:'build',prompt:'Sample then extraction then amplification then analysis',layout:'workflow'},full);
  assert(aiPage.objects.length>=5);
  assert.equal((await workspace.execute('document.get',{},full)).pageCount,3);

  const table=await workspace.execute('import.data_table',{name:'Measurements',rows:[{sample:'A',value:1},{sample:'B',value:2}]},full);
  assert.equal(table.type,'table');

  const audit=await workspace.execute('review.audit',{},full);
  assert.equal(audit.pageCount,3);
  assert(Array.isArray(audit.issues));

  const snapshot=await workspace.execute('project.snapshot',{},full);
  assert.equal(snapshot.pages.length,3);
  assert(snapshot.savedAt);

  const pdf=await workspace.exportDocument('pdf',{scale:.25});
  assert.equal(pdf.mimeType,'application/pdf');
  assert.equal(pdf.encoding,'base64');
  assert(pdf.data.length>100);

  await assert.rejects(
    workspace.execute('object.create',{object:{type:'shape'}},readOnly),
    /read-only/i
  );
  await assert.rejects(
    workspace.execute('page.delete',{index:0},noDestructive),
    /destructive/i
  );

  console.log(JSON.stringify({
    ok:true,
    commands:commands.length,
    pages:snapshot.pages.length,
    objects:snapshot.pages.reduce((sum:number,page:{objects:unknown[]})=>sum+page.objects.length,0),
    pngBytes:Math.floor(rendered.data.length*3/4),
    pdfBytes:Math.floor(pdf.data.length*3/4)
  }));
}

run().catch(error=>{
  console.error(error);
  process.exitCode=1;
});