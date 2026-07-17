(() => {
  if (window.__figureLoomCollabChat) return;
  window.__figureLoomCollabChat = true;
  const drawer=document.getElementById('collaborationDrawer'), status=drawer?.querySelector('#collabStatus'), toggle=drawer?.querySelector('#collabSessionToggle'), actions=document.querySelector('.title-actions');
  if(!drawer||!status||!toggle||!actions) return;

  const id=`chat-${crypto.randomUUID()}`;
  let channel=null,client=null,project='',connected=false,connecting=false,unread=0;
  const people=new Map(),seen=new Set();

  const button=document.createElement('button');
  button.id='collabChatBubble'; button.type='button'; button.hidden=true;
  button.innerHTML='<span class="cc-avatars"></span><span class="cc-label">Chat</span><b hidden>0</b>';
  actions.insertBefore(button,document.getElementById('exportButton'));

  const panel=document.createElement('section');
  panel.id='collabChatPanel'; panel.hidden=true;
  panel.innerHTML='<header><span><strong>Project chat</strong><small id="ccOnline">Waiting for collaborators…</small></span><button type="button" id="ccClose">×</button></header><div id="ccMessages"><p class="cc-empty">Messages appear here while this live session is connected.</p></div><form id="ccForm"><textarea id="ccInput" rows="2" maxlength="1200" placeholder="Message everyone in this project…"></textarea><button type="submit">Send</button></form><small class="cc-note">Live chat is temporary. Use review comments for notes that must stay with the project.</small>';
  document.body.appendChild(panel);

  const avatars=button.querySelector('.cc-avatars'), badge=button.querySelector('b'), online=panel.querySelector('#ccOnline'), host=panel.querySelector('#ccMessages'), form=panel.querySelector('#ccForm'), input=panel.querySelector('#ccInput');
  const cloud=()=>window.SciCanvasCloud, user=()=>cloud()?.getUser?.()||null;
  const projectId=()=>cloud()?.currentProjectId||localStorage.getItem('scicanvas-current-cloud-project-v1')||'';
  const live=()=>/realtime session active/i.test(status.textContent||'')||/^Stop review session$/i.test(toggle.textContent||'');
  const nameOf=u=>u?.user_metadata?.full_name||u?.user_metadata?.name||u?.email?.split('@')[0]||'Collaborator';
  const avatarOf=u=>u?.user_metadata?.avatar_url||u?.user_metadata?.picture||'';
  const initials=n=>String(n||'?').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();
  function color(v){let h=0;for(const c of String(v||'figureloom'))h=((h<<5)-h+c.charCodeAt(0))|0;return`hsl(${Math.abs(h)%360} 52% 48%)`}
  function esc(v){return String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function face(p){return p.avatar?`<span class="cc-face" title="${esc(p.name)}"><img src="${esc(p.avatar)}" alt=""></span>`:`<span class="cc-face cc-init" style="--c:${p.color||color(p.userId)}" title="${esc(p.name)}">${initials(p.name)}</span>`}

  function renderPeople(){
    const mine=user()?.id, remote=[...people.values()].filter(p=>p.userId&&p.userId!==mine);
    avatars.innerHTML=remote.slice(0,3).map(face).join('');
    button.hidden=!connected||!remote.length;
    online.textContent=remote.length?`${remote.length} collaborator${remote.length===1?'':'s'} online`:connected?'Nobody else is here yet':'Chat is offline';
    if(!remote.length) panel.hidden=true;
  }
  async function syncPeople(){
    people.clear();Object.values(channel?.presenceState?.()||{}).flat().forEach(p=>{if(!p?.userId)return;const old=people.get(p.userId);people.set(p.userId,old?.avatar&&!p.avatar?old:p)});renderPeople();
    const ids=[...people.keys()];if(!client||!ids.length)return;
    try{const {data}=await client.from('profiles').select('id,display_name,avatar_url').in('id',ids);for(const profile of data||[]){const p=people.get(profile.id);if(p){p.name=profile.display_name||p.name;p.avatar=profile.avatar_url||p.avatar}}renderPeople()}catch{}
  }
  function addMessage(p){
    if(!p?.id||seen.has(p.id))return;seen.add(p.id);host.querySelector('.cc-empty')?.remove();
    const mine=p.userId===user()?.id,a=document.createElement('article');a.className=mine?'mine':'';
    a.innerHTML=`${face({name:p.name,avatar:p.avatar,color:p.color,userId:p.userId})}<div><small><strong>${mine?'You':esc(p.name||'Collaborator')}</strong><time>${new Date(p.sentAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</time></small><p></p></div>`;
    a.querySelector('p').textContent=String(p.text||'');host.appendChild(a);host.scrollTop=host.scrollHeight;
    if(!mine&&panel.hidden){badge.textContent=String(++unread);badge.hidden=false}
  }
  async function disconnect(){connected=false;people.clear();renderPeople();if(client&&channel)try{await client.removeChannel(channel)}catch{}channel=null;client=null;project=''}
  async function connect(){
    const next=projectId(),u=user();if(!live()||!next||!u||!cloud()?.configured?.())return disconnect();
    if(connecting||(channel&&project===next))return;connecting=true;
    try{await disconnect();client=await cloud().getClient();await client.realtime.setAuth();project=next;
      channel=client.channel(`project-room:${next}`,{config:{private:true,broadcast:{self:true,ack:true},presence:{key:id}}})
        .on('broadcast',{event:'chat-message'},({payload})=>addMessage(payload))
        .on('presence',{event:'sync'},syncPeople).on('presence',{event:'join'},syncPeople).on('presence',{event:'leave'},syncPeople);
      await new Promise((ok,no)=>channel.subscribe(s=>{if(s==='SUBSCRIBED')ok();if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(s))no(new Error(s))}));connected=true;syncPeople();
    }finally{connecting=false}
  }
  async function send(text){
    if(!channel||!connected)throw new Error('Start live collaboration first.');const u=user(),p={id:crypto.randomUUID(),userId:u.id,name:nameOf(u),avatar:avatarOf(u),color:color(u.id),text:text.slice(0,1200),sentAt:new Date().toISOString()};
    const r=await channel.send({type:'broadcast',event:'chat-message',payload:p});if(r!=='ok'&&r!=='timed out')throw new Error('Message did not send.');
  }

  button.onclick=()=>{panel.hidden=!panel.hidden;if(!panel.hidden){unread=0;badge.hidden=true;input.focus()}};
  panel.querySelector('#ccClose').onclick=()=>panel.hidden=true;
  form.onsubmit=e=>{e.preventDefault();const t=input.value.trim();if(!t)return;input.value='';send(t).catch(x=>{input.value=t;online.textContent=x.message})};
  input.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();form.requestSubmit()}};
  const watch=new MutationObserver(()=>setTimeout(()=>connect().catch(()=>disconnect()),50));watch.observe(status,{childList:true,subtree:true,characterData:true});watch.observe(toggle,{childList:true,subtree:true,characterData:true,attributes:true});
  window.addEventListener('scicanvas-cloud-opened',disconnect);window.addEventListener('beforeunload',()=>{watch.disconnect();void disconnect()});

  const style=document.createElement('style');style.textContent=`
  #collabChatBubble{position:relative;display:flex;align-items:center;gap:6px;min-width:70px;padding-left:7px}#collabChatBubble[hidden]{display:none}.cc-avatars{display:flex}.cc-face{display:grid;place-items:center;width:24px;height:24px;margin-left:-7px;overflow:hidden;border:2px solid #fff;border-radius:50%;background:#dfe7f2;color:#fff;font-size:8px;font-weight:800}.cc-face:first-child{margin-left:0}.cc-face img{width:100%;height:100%;object-fit:cover}.cc-init{background:var(--c)}.cc-label{font-size:10px;font-weight:750}#collabChatBubble>b{position:absolute;right:-5px;top:-6px;min-width:17px;height:17px;padding:2px 4px;border:2px solid #fff;border-radius:20px;background:#df3f58;color:#fff;font-size:8px}
  #collabChatPanel{position:fixed;right:18px;top:66px;z-index:120;width:min(360px,calc(100vw - 28px));height:min(520px,calc(100vh - 92px));display:grid;grid-template-rows:auto minmax(0,1fr) auto auto;overflow:hidden;border:1px solid #cfd9e6;border-radius:15px;background:#f8faff;box-shadow:0 24px 70px #1e2b4047}#collabChatPanel[hidden]{display:none}#collabChatPanel>header{display:flex;justify-content:space-between;padding:12px;border-bottom:1px solid #dce4ee;background:#fff}#collabChatPanel>header strong,#collabChatPanel>header small{display:block}#collabChatPanel>header small{color:#778497;font-size:8px}#ccClose{width:28px;height:28px;padding:0;font-size:18px}#ccMessages{display:flex;flex-direction:column;gap:9px;padding:12px;overflow:auto}.cc-empty{margin:auto;color:#7d8999;font-size:9px;text-align:center}#ccMessages article{display:grid;grid-template-columns:auto minmax(0,1fr);gap:7px;align-items:end}#ccMessages article.mine{grid-template-columns:minmax(0,1fr) auto}#ccMessages article.mine>.cc-face{grid-column:2}#ccMessages article.mine>div{grid-column:1;grid-row:1;text-align:right}#ccMessages article>.cc-face{margin:0}#ccMessages article small{display:flex;justify-content:space-between;gap:8px;margin:0 4px 3px;color:#788598;font-size:8px}#ccMessages article p{display:inline-block;margin:0;padding:8px 10px;border:1px solid #d5dfeb;border-radius:13px 13px 13px 4px;background:#fff;color:#344258;font-size:10px;line-height:1.4;text-align:left;white-space:pre-wrap;word-break:break-word}#ccMessages article.mine p{border-color:#5f78cf;border-radius:13px 13px 4px 13px;background:#6076cc;color:#fff}
  #ccForm{display:grid;grid-template-columns:1fr auto;gap:7px;padding:10px;border-top:1px solid #dce4ee;background:#fff}#ccForm textarea{resize:none;padding:8px;border:1px solid #cdd8e6;border-radius:10px}#ccForm button{border-color:#536fc2;background:#536fc2;color:#fff}.cc-note{padding:0 11px 10px;background:#fff;color:#7b8798;font-size:7px}html[data-figureloom-theme=dark] #collabChatPanel{background:#171f29;border-color:#3a4758;box-shadow:0 26px 75px #0008}html[data-figureloom-theme=dark] #collabChatPanel>header,html[data-figureloom-theme=dark] #ccForm,html[data-figureloom-theme=dark] .cc-note{background:#1c2531;border-color:#3a4758}html[data-figureloom-theme=dark] #ccMessages article p{background:#222c39;border-color:#3c4959;color:#e8edf5}html[data-figureloom-theme=dark] #ccMessages article.mine p{background:#5268bd;color:#fff}html[data-figureloom-theme=dark] .cc-face{border-color:#1a222d}@media(max-width:700px){.cc-label{display:none}#collabChatBubble{min-width:42px}#collabChatPanel{right:10px;top:60px;height:calc(100vh - 72px)}}`;
  document.head.appendChild(style);
})();
