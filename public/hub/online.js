/* Online bootstrap. Identity, rewards and persistence always come from the server. */
(()=>{'use strict';
 const $=id=>document.getElementById(id);let account,room,game,socket,connected=false,reconnect=0,stopped=false,queue=Promise.resolve(),saving=0;
 const memory=new Map();
 function status(text){$('hubStatus').textContent=text;}
 function onlineCount(count){const badge=$('hubOnlineCount'),known=Number.isSafeInteger(count)&&count>=0;badge.dataset.connected=String(known);$('hubOnlineText').textContent=known?count.toLocaleString('es-AR')+' online':'Sin conexión';badge.setAttribute('aria-label',known?count+' '+(count===1?'jugador conectado':'jugadores conectados')+' en minerhub':'Sin conexión al juego');}
 async function api(path,method='GET',value){const response=await fetch('/api/hub/'+path,{method,credentials:'same-origin',headers:value?{'Content-Type':'application/json'}:{},body:value?JSON.stringify(value):undefined});const data=await response.json().catch(()=>({}));if(!response.ok)throw Object.assign(Error(data.error||'No pudimos conectar.'),{status:response.status});return data;}
 function seed(){window.HubEmotes?.load();memory.set('vereda.room.v1',JSON.stringify(account.room.scene));memory.set('vereda.people.v1',JSON.stringify({version:1,actors:[],me:account.user.appearance}));}
 function canEdit(){return connected&&room?.ownerId===account.user.id;}
 function affordances(){document.body.classList.toggle('hub-visiting',room?.ownerId!==account.user.id);$('hubHome').disabled=!connected||room?.ownerId===account.user.id;$('roomTab').disabled=!canEdit();$('hubAdmin').hidden=!account.user.admin;$('hubGiveaway').hidden=!account.user.admin;$('hubFeedbackInbox').hidden=!account.user.admin;}
 function updateAccount(data){if(account&&data.walletVersion!==undefined&&data.walletVersion<(account.walletVersion||0)){data={...data,credits:account.credits,walletVersion:account.walletVersion,boxes:account.boxes};}account={...account,...data};for(const box of account.boxes||[]){if(box.purchaseId){const key='minerhub.purchase.'+account.user.id+'.'+box.kind;try{if(sessionStorage.getItem(key)===box.purchaseId)sessionStorage.removeItem(key);}catch{}}}$('hubCredits').textContent=(account.credits||0).toLocaleString('es-AR')+' créditos';game?.account(account.user.appearance);window.HubGroups?.account(account.user);affordances();}
 function schedule(task){saving++;let failed=false;status('Guardando…');queue=queue.then(task).catch(async e=>{failed=true;status(e.message);try{const fresh=await api('state');updateAccount(fresh);seed();if(room?.ownerId===account.user.id){room=fresh.room;window.HubPlants?.receive(room,fresh.serverNow);game?.room(room.scene);}}catch{status('Sin conexión. Tus cambios no se guardaron.');}}).finally(()=>{saving--;if(!saving&&connected&&!failed)status('Conectado');});return queue;}
 const bridge=window.MINER_HUB_ONLINE={
  get user(){return account.user;},get shop(){return account.shop;},get room(){return room;},canEdit,async giveaway(value){return api('admin/giveaway',value?'POST':'GET',value);},async groupAction(value){return api('groups',value?'POST':'GET',value);},async profile(value){return schedule(async()=>updateAccount(await api('profile','PUT',value)));},preview:(item,canvas)=>game?.preview(item,canvas),
  async harvest(input){if(!connected||saving)throw Error('Esperá a que termine el guardado y se conecte la sala.');try{const data=await api('plants/harvest','POST',input);updateAccount(data.account);if(room?.id===data.roomId){room.plants=data.plants;window.HubPlants?.receive(room,data.serverNow);}return data;}catch(e){try{const data=await api('state');updateAccount(data);if(room?.id===data.room.id){room.plants=data.room.plants;window.HubPlants?.receive(room,data.serverNow);}}catch{}throw e;}},
  async basket(action,input){if(!connected||saving)throw Error('Esperá a conectar la sala.');const data=await api('basket/'+action,'POST',input);if(data.account)updateAccount(data.account);return data;},
  async dj(action,input){if(!connected||saving)throw Error('Esperá a conectar la sala.');const data=await api('dj/'+action,'POST',input);if(data.account)updateAccount(data.account);return data;},
  async coffee(action,input){if(!connected||saving)throw Error('Esperá a que termine el guardado y se conecte la sala.');const data=await api('coffee/'+action,'POST',input);if(data.account)updateAccount(data.account);return data;},
  async exchange(action,input){if(!connected)throw Error('Esperá a reconectar para usar la máquina.');const data=await api('exchange/'+action,'POST',input);if(data.account)updateAccount(data.account);return data;},
  async roulette(action,input){if(!connected)throw Error('Esperá a reconectar para jugar.');const data=await api('roulette/'+action,'POST',input);if(data.account)updateAccount(data.account);return data;},
  placedCount(type){return [...account.room.scene.items,...(account.room.scene.unplacedItems||[])].filter(i=>i.type===type).length;},
  storage:{getItem:key=>memory.has(key)?memory.get(key):key==='vereda.theme.v1'?window.localStorage.getItem(key):null,setItem(key,value){
   if(memory.get(key)===value)return;memory.set(key,value);if(!game)return;
   if(key==='vereda.room.v1'){if(!canEdit())return;const scene=JSON.parse(value);schedule(async()=>{const result=await api('room','PUT',{scene,revision:account.room.revision});account.room=result.room;if(room.ownerId===account.user.id){room=result.room;window.HubPlants?.receive(room,result.serverNow);}});}
   else if(key==='vereda.people.v1'){const appearance=JSON.parse(value).me;schedule(async()=>updateAccount(await api('look','PUT',{appearance})));}
   else if(key==='vereda.theme.v1')window.localStorage.setItem(key,value);
  }},
  ledger:{credits:()=>account.credits||0,price:kind=>account.shop?.costs[kind]||2000,async buy(kind){const key='minerhub.purchase.'+account.user.id+'.'+kind;let id;try{id=sessionStorage.getItem(key);}catch{}if(!id)id=crypto.randomUUID();try{sessionStorage.setItem(key,id);}catch{}try{const data=await api('box/buy','POST',{kind,requestId:id,expectedCost:account.shop.costs[kind]});updateAccount(data);try{sessionStorage.removeItem(key);}catch{}return data.box;}catch(e){if(e.status&&e.status<500){try{sessionStorage.removeItem(key);}catch{}try{updateAccount(await api('state'));}catch{}}throw e;}},inventory:()=>account.inventory,pending:(user,kind)=>account.boxes.filter(b=>b.kind===kind),owns:(user,id)=>account.inventory.some(i=>i.id===id),item:id=>account.inventory.find(i=>i.id===id),receipts:()=>[],grant(){throw Error('Los créditos se reclaman en Kick.');},async open(id){const data=await api('box/open','POST',{id});updateAccount(data);return data.receipt;}},
  send(type,value={}){if(!connected){status('Reconectando…');return false;}socket.send(JSON.stringify({type,...value}));return true;},
  visit(id){if(saving){status('Esperá a que termine el guardado.');return;}bridge.send('join',{roomId:id});},
  ready(value){game=value;$('hubRooms').disabled=false;connect();},
 };
 function connect(){if(stopped)return;status('Conectando…');socket=new WebSocket(location.origin.replace(/^http/,'ws')+'/api/hub/ws');
  socket.onopen=()=>{connected=true;reconnect=0;affordances();status('Conectado');};
  socket.onmessage=e=>{if(e.data==='pong')return;let m;try{m=JSON.parse(e.data);}catch{return;}
   if(m.type==='room'){room=m.room;window.HubPlants?.receive(room,m.serverNow);if(room.ownerId===account.user.id)account.room=room;game.room(room.scene,m.position);game.players(m.players);affordances();status('Sala de '+room.name);window.HubMedia?.room(room,m.media);window.HubPosters?.room(room,m.posters);window.HubRoulette?.close();window.HubExchange?.close();window.HubCoffee?.close();window.HubDJ?.close();window.HubBasket?.close();$('game').title='';}
   else if(m.type==='plants'&&m.roomId===room?.id){room.plants=m.plants;if(account.room.id===room.id)account.room.plants=m.plants;window.HubPlants?.receive(room,m.serverNow);}
   else if(m.type==='posters'&&m.roomId===room?.id)window.HubPosters?.receive(m.slots);
   else if(m.type==='trade')window.HubTrade?.receive(m);
   else if(m.type==='media'&&m.roomId===room?.id)window.HubMedia?.receive(m.media);
   else if(m.type==='online')onlineCount(m.count);
   else if(m.type==='presence')game.players(m.players);
   else if(m.type==='walk')game.walk(m.id,m.from,m.path,m.seq,m.seat);
   else if(m.type==='interaction'&&m.roomId===room?.id){const item=room.scene.items.find(i=>i.id===m.itemId);if(item)Object.assign(item,m.changes);if(account.room.id===room.id){const own=account.room.scene.items.find(i=>i.id===m.itemId);if(own)Object.assign(own,m.changes);}game.interaction(m.itemId,m.changes);}
   else if(m.type==='chat')game.chat(m.id===account.user.id?'self':m.id,m.text);
   else if(m.type==='account')updateAccount(m);
   else if(m.type==='shop'){account.shop=m.shop;game?.account(account.user.appearance);}
   else if(m.type==='scene'&&m.room.id===room?.id&&room.ownerId!==account.user.id){room=m.room;window.HubPlants?.receive(room,m.serverNow);game.scene(room.scene);game.players(m.players);}
   else if(m.type==='error'){status(m.error);window.HubTrade?.error(m.error);window.HubMedia?.error(m.error,m);}
  };
  socket.onclose=e=>{connected=false;onlineCount(null);window.HubTrade?.disconnected();window.HubMedia?.disconnected();window.HubRoulette?.close();window.HubExchange?.close();window.HubCoffee?.close();window.HubDJ?.close();window.HubBasket?.close();$('game').title='';game?.stop();affordances();if(e.code===4001||e.code===4003){stopped=true;status(e.reason||'Sesión cerrada. Recargá para entrar.');return;}status('Conexión interrumpida. Reconectando…');setTimeout(async()=>{try{updateAccount(await api('state'));connect();}catch(err){if(err.status===401||err.status===403){stopped=true;status(err.message);}else connect();}},Math.min(15000,1000*2**Math.min(++reconnect,4)));};
 }
 setInterval(()=>{if(connected)socket.send('ping');},25000);
 window.addEventListener('beforeunload',e=>{if(saving){e.preventDefault();e.returnValue='';}});
 const roomSearchKey=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').trim();
 function filterRooms(){
  const query=roomSearchKey($('hubRoomsSearch').value),list=$('hubRoomsList');let count=0;
  for(const card of list.children){card.hidden=!card.dataset.searchName.includes(query);if(!card.hidden)count++;}
  list.scrollTop=0;$('hubRoomsCount').textContent=count?count+(count===1?' sala':' salas'):query?'No encontramos salas con ese nombre.':'Todavía no hay salas disponibles.';
 }
 $('hubRoomsSearch').addEventListener('input',filterRooms);
 async function rooms(){
  if($('hubRoomsDialog').open)return;
  $('hubRooms').disabled=true;
  try{
   const result=await api('rooms'),list=$('hubRoomsList');list.replaceChildren();$('hubRoomsSearch').value='';
   for(const r of result.rooms){
    const b=document.createElement('button');b.type='button';b.className='hub-room-card';b.dataset.searchName=roomSearchKey(r.name);
    const current=r.id===room?.id;b.setAttribute('aria-current',String(current));b.disabled=current;
    const mark=document.createElement('span');mark.className='hub-room-card-mark';const portrait=document.createElement('canvas');portrait.width=144;portrait.height=160;portrait.setAttribute('aria-hidden','true');game?.portrait(portrait,r.appearance);mark.append(portrait);
    const copy=document.createElement('span');copy.className='hub-room-card-copy';const name=document.createElement('strong');name.textContent=r.name;
    const detail=document.createElement('small');detail.textContent=r.online+'/20 en la sala';copy.append(name,detail);
    const badge=document.createElement('span');badge.className='hub-room-card-state';badge.textContent=current?'Estás acá':r.active?'En actividad':'Visitar sala';
    b.append(mark,copy,badge);b.onclick=()=>{bridge.visit(r.id);$('hubRoomsDialog').close();};list.append(b);
   }
   filterRooms();$('hubRoomsDialog').showModal();$('hubRoomsSearch').focus();
  }catch(e){status(e.message);}finally{$('hubRooms').disabled=!game;}
 }
 $('hubRooms').onclick=rooms;$('hubHome').onclick=()=>bridge.visit(account.user.id);$('hubLogout').onclick=async()=>{stopped=true;try{await api('logout','POST');location.reload();}catch(e){status(e.message);}};
 $('hubAdmin').onclick=async()=>{try{const data=await api('admin/credit-rewards');for(const kind of ['object','character','environment','plantation'])$('hubBoxCost-'+kind).value=data.costs[kind];$('hubAdminError').textContent=data.ready?'Paquetes de créditos activos en Kick.':'Los paquetes se activarán al sincronizar.';const p=await api('admin/plants');$('hubPlantMinutes').value=p.minutes;for(let i=0;i<3;i++){$('hubPlantAmount'+i).value=p.amounts[i];$('hubPlantWeight'+i).value=p.weights[i];}const c=await api('admin/coffee');for(const key of ['dailyLimit','orderReward','completionReward','perfectReward'])$('hubCoffeeConfig-'+key).value=c[key];const dj=await api('admin/dj');$('hubDJLimit').value=dj.dailyLimit;for(let i=0;i<3;i++)$('hubDJReward'+i).value=dj.rewards[i];const basket=await api('admin/basket');for(const key of ['dailyLimit','creditsPerPoint'])$('hubBasketConfig-'+key).value=basket[key];$('hubAdminDialog').showModal();}catch(e){status(e.message);}};
 $('hubRewardForm').onsubmit=async e=>{e.preventDefault();const button=e.target.querySelector('button');button.disabled=true;try{const costs=Object.fromEntries(['object','character','environment','plantation'].map(k=>[k,Number($('hubBoxCost-'+k).value)]));await api('admin/credit-rewards','POST',{costs});updateAccount(await api('state'));$('hubAdminError').textContent='Precios guardados y paquetes de créditos activos.';}catch(e){$('hubAdminError').textContent=e.message;}finally{button.disabled=false;}};
 $('hubBasketForm').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;try{await api('admin/basket','PUT',Object.fromEntries(['dailyLimit','creditsPerPoint'].map(k=>[k,Number($('hubBasketConfig-'+k).value)])));$('hubAdminError').textContent='Básquet guardado. Premio para la próxima partida; límite diario inmediato.';}catch(e){$('hubAdminError').textContent=e.message;}finally{b.disabled=false;}};
 $('hubDJForm').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;try{await api('admin/dj','PUT',{dailyLimit:Number($('hubDJLimit').value),rewards:[0,1,2].map(i=>Number($('hubDJReward'+i).value))});$('hubAdminError').textContent='DJ guardado. Premios para la próxima partida; límite diario inmediato.';}catch(e){$('hubAdminError').textContent=e.message;}finally{b.disabled=false;}};
 $('hubCoffeeForm').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;try{const value=Object.fromEntries(['dailyLimit','orderReward','completionReward','perfectReward'].map(k=>[k,Number($('hubCoffeeConfig-'+k).value)]));await api('admin/coffee','PUT',value);$('hubAdminError').textContent='Cafetería guardada. Los premios se aplican al próximo turno; el límite diario, inmediatamente.';}catch(e){$('hubAdminError').textContent=e.message;}finally{b.disabled=false;}};
 $('hubPlantForm').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;try{await api('admin/plants','PUT',{minutes:Number($('hubPlantMinutes').value),amounts:[0,1,2].map(i=>Number($('hubPlantAmount'+i).value)),weights:[0,1,2].map(i=>Number($('hubPlantWeight'+i).value))});$('hubAdminError').textContent='Plantaciones guardadas. Los cambios se aplican a las próximas siembras y cosechas.';}catch(e){$('hubAdminError').textContent=e.message;}finally{b.disabled=false;}};
 $('hubModerateForm').onsubmit=async e=>{e.preventDefault();try{const action=$('hubModerateAction').value;await api('admin/moderate','POST',{id:$('hubModerateId').value.trim(),...(action==='ban'?{banned:true}:action==='unban'?{banned:false}:action==='mute'?{muted:true}:{muted:false})});$('hubAdminError').textContent='Listo.';}catch(e){$('hubAdminError').textContent=e.message;}};
 for(const b of document.querySelectorAll('[data-hub-close]'))b.onclick=()=>$(b.dataset.hubClose).close();
 api('state').then(data=>{account=data;room=data.room;updateAccount(data);seed();$('lookName').readOnly=true;$('hubLogin').hidden=true;const script=document.createElement('script');script.src='game.js';script.onerror=()=>status('No pudimos cargar el juego. Recargá la página.');document.body.append(script);}).catch(e=>{$('loading').hidden=true;$('hubLogin').hidden=false;$('hubLoginStatus').textContent=e.status===401?'Tu usuario de Kick será tu nombre en el juego.':e.message;$('hubLoginLink').hidden=e.status!==401;status('');});
})();
