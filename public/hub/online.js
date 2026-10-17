/* Online bootstrap. Identity, rewards and persistence always come from the server. */
(()=>{'use strict';
 const $=id=>document.getElementById(id);let account,room,game,socket,connected=false,reconnect=0,stopped=false,queue=Promise.resolve(),saving=0;
 const memory=new Map();
 function status(text){$('hubStatus').textContent=text;}
 async function api(path,method='GET',value){const response=await fetch('/api/hub/'+path,{method,credentials:'same-origin',headers:value?{'Content-Type':'application/json'}:{},body:value?JSON.stringify(value):undefined});const data=await response.json().catch(()=>({}));if(!response.ok)throw Object.assign(Error(data.error||'No pudimos conectar.'),{status:response.status});return data;}
 function seed(){window.HubEmotes?.load();memory.set('vereda.room.v1',JSON.stringify(account.room.scene));memory.set('vereda.people.v1',JSON.stringify({version:1,actors:[],me:account.user.appearance}));}
 function canEdit(){return connected&&room?.ownerId===account.user.id;}
 function affordances(){document.body.classList.toggle('hub-visiting',room?.ownerId!==account.user.id);$('hubHome').disabled=!connected||room?.ownerId===account.user.id;$('decorateBtn').disabled=!canEdit();$('roomTab').disabled=!canEdit();$('hubAdmin').hidden=!account.user.admin;$('hubFeedbackInbox').hidden=!account.user.admin;}
 function updateAccount(data){account={...account,...data};game?.account(account.user.appearance);affordances();}
 function schedule(task){saving++;let failed=false;status('Guardando…');queue=queue.then(task).catch(async e=>{failed=true;status(e.message);try{const fresh=await api('state');updateAccount(fresh);seed();if(room?.ownerId===account.user.id){room=fresh.room;game?.room(room.scene);}}catch{status('Sin conexión. Tus cambios no se guardaron.');}}).finally(()=>{saving--;if(!saving&&connected&&!failed)status('Conectado');});return queue;}
 const bridge=window.MINER_HUB_ONLINE={
  get user(){return account.user;},get room(){return room;},canEdit,preview:(item,canvas)=>game?.preview(item,canvas),
  placedCount(type){return [...account.room.scene.items,...(account.room.scene.unplacedItems||[])].filter(i=>i.type===type).length;},
  storage:{getItem:key=>memory.has(key)?memory.get(key):key==='vereda.theme.v1'?window.localStorage.getItem(key):null,setItem(key,value){
   if(memory.get(key)===value)return;memory.set(key,value);if(!game)return;
   if(key==='vereda.room.v1'){if(!canEdit())return;const scene=JSON.parse(value);schedule(async()=>{const result=await api('room','PUT',{scene,revision:account.room.revision});account.room=result.room;if(room.ownerId===account.user.id)room=result.room;});}
   else if(key==='vereda.people.v1'){const appearance=JSON.parse(value).me;schedule(async()=>updateAccount(await api('look','PUT',{appearance})));}
   else if(key==='vereda.theme.v1')window.localStorage.setItem(key,value);
  }},
  ledger:{inventory:()=>account.inventory,pending:(user,kind)=>account.boxes.filter(b=>b.kind===kind),owns:(user,id)=>account.inventory.some(i=>i.id===id),item:id=>account.inventory.find(i=>i.id===id),receipts:()=>[],grant(){throw Error('Las cajas se reclaman en Kick.');},async open(id){const data=await api('box/open','POST',{id});updateAccount(data);return data.receipt;}},
  send(type,value={}){if(!connected){status('Reconectando…');return false;}socket.send(JSON.stringify({type,...value}));return true;},
  visit(id){if(saving){status('Esperá a que termine el guardado.');return;}bridge.send('join',{roomId:id});},
  ready(value){game=value;connect();},
 };
 function connect(){if(stopped)return;status('Conectando…');socket=new WebSocket(location.origin.replace(/^http/,'ws')+'/api/hub/ws');
  socket.onopen=()=>{connected=true;reconnect=0;affordances();status('Conectado');};
  socket.onmessage=e=>{if(e.data==='pong')return;let m;try{m=JSON.parse(e.data);}catch{return;}
   if(m.type==='room'){room=m.room;if(room.ownerId===account.user.id)account.room=room;game.room(room.scene,m.position);game.players(m.players);affordances();status('Sala de '+room.name);window.HubMedia?.room(room,m.media);}
   else if(m.type==='trade')window.HubTrade?.receive(m);
   else if(m.type==='media'&&m.roomId===room?.id)window.HubMedia?.receive(m.media);
   else if(m.type==='presence')game.players(m.players);
   else if(m.type==='walk')game.walk(m.id,m.from,m.path,m.seq,m.seat);
   else if(m.type==='interaction'&&m.roomId===room?.id){const item=room.scene.items.find(i=>i.id===m.itemId);if(item)Object.assign(item,m.changes);if(account.room.id===room.id){const own=account.room.scene.items.find(i=>i.id===m.itemId);if(own)Object.assign(own,m.changes);}game.interaction(m.itemId,m.changes);}
   else if(m.type==='chat')game.chat(m.id===account.user.id?'self':m.id,m.text);
   else if(m.type==='account')updateAccount(m);
   else if(m.type==='scene'&&m.room.id===room?.id&&room.ownerId!==account.user.id){room=m.room;game.scene(room.scene);game.players(m.players);}
   else if(m.type==='error'){status(m.error);window.HubTrade?.error(m.error);window.HubMedia?.error(m.error,m);}
  };
  socket.onclose=e=>{connected=false;window.HubTrade?.disconnected();window.HubMedia?.disconnected();game?.stop();affordances();if(e.code===4001||e.code===4003){stopped=true;status(e.reason||'Sesión cerrada. Recargá para entrar.');return;}status('Conexión interrumpida. Reconectando…');setTimeout(async()=>{try{updateAccount(await api('state'));connect();}catch(err){if(err.status===401||err.status===403){stopped=true;status(err.message);}else connect();}},Math.min(15000,1000*2**Math.min(++reconnect,4)));};
 }
 setInterval(()=>{if(connected)socket.send('ping');},25000);
 window.addEventListener('beforeunload',e=>{if(saving){e.preventDefault();e.returnValue='';}});
 async function rooms(){try{const result=await api('rooms'),list=$('hubRoomsList');list.replaceChildren();for(const r of result.rooms){const b=document.createElement('button');b.className='secondary-button';b.textContent=(r.active?'● ':'')+r.name+' · '+r.online+'/20';b.onclick=()=>{bridge.visit(r.id);$('hubRoomsDialog').close();};list.append(b);}$('hubRoomsDialog').showModal();}catch(e){status(e.message);}}
 $('hubRooms').onclick=rooms;$('hubHome').onclick=()=>bridge.visit(account.user.id);$('hubLogout').onclick=async()=>{stopped=true;try{await api('logout','POST');location.reload();}catch(e){status(e.message);}};
 $('hubAdmin').onclick=async()=>{try{const [data,available]=await Promise.all([api('admin/rewards'),api('admin/kick-rewards')]);for(const kind of ['object','character','environment']){const select=$('hubReward-'+kind);select.replaceChildren();const empty=document.createElement('option');empty.value='';empty.textContent='Elegir recompensa';select.append(empty);for(const reward of available.rewards){const option=document.createElement('option');option.value=reward.id;option.textContent=reward.title+' · '+reward.cost+' puntos';select.append(option);}select.value=data.rewards[kind]||'';}$('hubAdminDialog').showModal();}catch(e){status(e.message);}};
 $('hubRewardForm').onsubmit=async e=>{e.preventDefault();try{await api('admin/rewards','PUT',Object.fromEntries(['object','character','environment'].map(k=>[k,$('hubReward-'+k).value.trim()])));$('hubAdminDialog').close();status('Recompensas vinculadas.');}catch(e){$('hubAdminError').textContent=e.message;}};
 $('hubModerateForm').onsubmit=async e=>{e.preventDefault();try{const action=$('hubModerateAction').value;await api('admin/moderate','POST',{id:$('hubModerateId').value.trim(),...(action==='ban'?{banned:true}:action==='unban'?{banned:false}:action==='mute'?{muted:true}:{muted:false})});$('hubAdminError').textContent='Listo.';}catch(e){$('hubAdminError').textContent=e.message;}};
 for(const b of document.querySelectorAll('[data-hub-close]'))b.onclick=()=>$(b.dataset.hubClose).close();
 api('state').then(data=>{account=data;room=data.room;seed();$('lookName').readOnly=true;$('hubLogin').hidden=true;const script=document.createElement('script');script.src='game.js';script.onerror=()=>status('No pudimos cargar el juego. Recargá la página.');document.body.append(script);}).catch(e=>{$('loading').hidden=true;$('hubLogin').hidden=false;$('hubLoginStatus').textContent=e.status===401?'Tu usuario de Kick será tu nombre en el juego.':e.message;$('hubLoginLink').hidden=e.status!==401;status('');});
})();
