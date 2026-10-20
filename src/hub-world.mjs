import {announcement,editAnnouncement} from './hub-announcements.mjs';
import {ensureCasino,canManageRoom,CASINO_ID} from './hub-community.mjs';
import {fishingAction,fishingConfig,saveFishingConfig} from './hub-fishing.mjs';
import {connect4Action,expireConnect4,scheduleConnect4,guardConnect4Tables,closeConnect4Room} from './hub-connect4.mjs';
import {openSlots,betSlots} from './hub-slots.mjs';
import {openRacing,betRacing} from './hub-racing.mjs';
import {basketAction,basketConfig,saveBasketConfig} from './hub-basket.mjs';
import {djAction,djConfig,saveDJConfig} from './hub-dj.mjs';
import {coffeeAction,coffeeConfig,saveCoffeeConfig} from './hub-coffee.mjs';
import {plantConfig,savePlantConfig,reconcilePlants,harvestPlant} from './hub-plants.mjs';
import {handlePosters,posterList} from './hub-posters.mjs';
import {giveaway} from './hub-giveaway.mjs';
import {profileText,userGroup,groupBadge,groupState,handleGroup,refreshProfiles} from './hub-groups.mjs';
import {openRoulette,betRoulette} from './hub-roulette.mjs';
import {openExchange,exchangeItem} from './hub-exchange.mjs';
import {migrateExchangeProvenance} from './hub-item-provenance.mjs';
import {C,P,R,CATALOG} from './hub-rules.mjs';
import {handleTrade,cancelTrade} from './hub-trades.mjs';
import {handleMedia,mediaSnapshot,MEDIA_TYPES} from './hub-media.mjs';
import {handleFeedback} from './hub-feedback.mjs';
import {balance,economy,publicShop,saveEconomy,creditRedemption,buyBox} from './hub-economy.mjs';
const items=new Map(CATALOG.map(i=>[i.id,i])),KINDS=['object','character','environment'];
const reply=(v,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store'}});
function reject(message,status=400){throw Object.assign(Error(message),{status});}
export async function body(request,limit=64000){
 const reader=request.body?.getReader();if(!reader)return {};let size=0,chunks=[];
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();reject('Solicitud demasiado grande.',413);}chunks.push(value);}
 const bytes=new Uint8Array(size);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.byteLength;}
 try{return JSON.parse(new TextDecoder().decode(bytes));}catch{reject('Formato inválido.');}
}
export function inventory(user,admin=false){
 const counts={...user.inventory};for(const i of CATALOG)if(i.starter)counts[i.id]=Math.max(1,counts[i.id]||0);
 if(admin)for(const i of CATALOG)counts[i.id]=i.kind==='object'?96:Math.max(1,counts[i.id]||0);
 return Object.entries(counts).filter(([id,n])=>items.has(id)&&n>0).map(([id,count])=>({...items.get(id),count}));
}
export function validateLook(look,user,admin){
 const clean=P.look(look),owned=new Set(inventory(user,admin).map(i=>i.id));
 for(const [slot,index] of Object.entries(clean))if(index!==0&&!(slot==='hair'&&index===1)&&!owned.has(`look:${slot}:${index}`))reject('Esa prenda no está en tu inventario.',403);
 return clean;
}
export function validateScene(raw,user,admin){
 if(!raw||!C.LAYOUTS.some(l=>l.id===raw.layout))reject('Sala inválida.');
 const scene=C.restore(raw);if(!scene)reject('La distribución de muebles no es válida.');
 const owned=new Map(inventory(user,admin).map(i=>[i.id,i.count]));
 for(const [key,n] of Object.entries(C.ENV_COUNTS))if(scene[key]&& !owned.has(`environment:${key}:${scene[key]}`))reject('Ese ambiente no está desbloqueado.',403);
 const layout=C.LAYOUTS.findIndex(l=>l.id===scene.layout);if(layout&&!owned.has('environment:layout:'+layout))reject('Esa sala no está desbloqueada.',403);
 const placed=new Map();for(const i of [...scene.items,...(scene.unplacedItems||[])])placed.set('object:'+i.type,(placed.get('object:'+i.type)||0)+1);
 for(const [id,count] of placed)if(count>(owned.get(id)||0))reject('No tenés suficientes unidades de '+items.get(id)?.name+'.',403);
 scene.name=user.name;return scene;
}
export function currentPosition(p,now=Date.now()){
 let point={...p.from},distance=Math.max(0,now-p.at)/1000*2.6,index=0;
 for(const goal of p.path||[]){const d=Math.hypot(goal.x-point.x,goal.y-point.y);if(distance<d&&d>0)return {point:{x:point.x+(goal.x-point.x)*distance/d,y:point.y+(goal.y-point.y)*distance/d},path:p.path.slice(index)};distance-=d;point={...goal};index++;}
 return {point,path:[]};
}
export function clipChat(value){let result='',left=120;for(const token of String(value||'').trim().slice(0,2000).match(/\[emote:\d{1,20}:[^\]\r\n]{1,80}\]|[\s\S]/gu)||[]){if(!left--)break;result+=token;}return result;}
export class HubWorld {
 constructor(ctx,env){this.ctx=ctx;this.env=env;ctx.blockConcurrencyWhile(()=>migrateExchangeProvenance(ctx.storage));if(typeof WebSocketRequestResponsePair!=='undefined')ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping','pong'));}
 async fetch(request){
  return this.ctx.blockConcurrencyWhile(async()=>{try{return await this.handle(request);}catch(e){console.error('Hub:',e.status?e.message:'operation failed');return reply({error:e.status?e.message:'No se pudo guardar. Intentá otra vez.'},e.status||500);}});
 }
 async user(id,name){let u=await this.ctx.storage.get('user:'+id);if(!u){u={id,name,appearance:P.look({}),inventory:{},collected:{},mutedUntil:0,banned:false};await this.ctx.storage.put('user:'+id,u);}else if(name&&u.name!==name){u.name=name;await this.ctx.storage.put('user:'+id,u);}if(!u.plantStarter){u.plantStarter=true;u.inventory['object:90']=(u.inventory['object:90']||0)+1;u.collected['object:90']=true;u.walletVersion=(u.walletVersion||0)+1;await this.ctx.storage.put('user:'+id,u);}return u;}
 async room(id,name){let room=await this.ctx.storage.get('room:'+id);if(!room){const scene=C.initial();scene.items=[];scene.name=name;room={id,ownerId:id,name,public:true,revision:0,scene};await this.ctx.storage.put('room:'+id,room);}else if(room.scene.switchVersion!==1){const scene=C.restore(room.scene);if(scene){room.scene=scene;room.revision++;await this.ctx.storage.put('room:'+id,room);}}return room;}
 sockets(){return this.ctx.getWebSockets().filter(ws=>ws.readyState===1);}
 send(ws,value){try{ws.send(JSON.stringify(value));}catch{try{ws.close(1011,'Conexión cerrada');}catch{}}}
 broadcast(roomId,event,except){for(const ws of this.sockets())if(ws!==except&&ws.deserializeAttachment()?.roomId===roomId)this.send(ws,event);}
 ownSockets(id){return this.sockets().filter(ws=>ws.deserializeAttachment()?.user.id===id);}
 onlineCount(except){return new Set(this.sockets().filter(ws=>ws!==except).map(ws=>ws.deserializeAttachment()).filter(a=>a?.roomId&&a.user?.id).map(a=>a.user.id)).size;}
 broadcastOnline(except){const event={type:'online',count:this.onlineCount(except)};for(const ws of this.sockets())if(ws!==except)this.send(ws,event);}
 async state(user,admin){const rows=await this.ctx.storage.list({prefix:'pending:'+user.id+':',limit:100});return {announcement:await announcement(this),serverNow:Date.now(),user:{id:user.id,name:user.name,appearance:user.appearance,petName:user.petName||'',admin,...await groupState(this,user)},credits:balance(user),walletVersion:user.walletVersion||0,shop:publicShop(await economy(this.ctx.storage)),inventory:inventory(user,admin),boxes:[...rows.values()].map(b=>({id:b.id,kind:b.kind,purchaseId:b.purchaseId})),room:await this.room(user.id,user.name)};}
 async notifyUser(id){const user=await this.user(id);for(const ws of this.ownSockets(id))this.send(ws,{type:'account',...(await this.state(user,ws.deserializeAttachment().user.admin))});}
 players(roomId){return this.sockets().map(ws=>ws.deserializeAttachment()).filter(a=>a?.roomId===roomId).map(a=>{const p=currentPosition(a.position);return {id:a.user.id,name:a.user.name,appearance:a.appearance,petName:a.petName||'',group:a.group||null,x:p.point.x,y:p.point.y,path:p.path,seat:a.seat||null};});}
 occupied(roomId,except){const cells=new Set();for(const p of this.players(roomId)){if(p.id===except)continue;for(const point of [p,...p.path])cells.add(Math.floor(point.x)+','+Math.floor(point.y));}return cells;}
 free(room,except,preferred){C.setLayout(room.scene.layout);const occupied=this.occupied(room.id,except),valid=p=>p&&!C.blocked(room.scene.items,Math.floor(p.x),Math.floor(p.y))&&!occupied.has(Math.floor(p.x)+','+Math.floor(p.y));if(valid(preferred))return preferred;for(let y=C.room().h-1;y>=0;y--)for(let x=0;x<C.room().w;x++){const p={x:x+.5,y:y+.5};if(valid(p))return p;}return null;}
 async join(ws,id){
  const a=ws.deserializeAttachment(),existing=await this.ctx.storage.get('room:'+id);if(!existing||!existing.public&&!a.user.admin&&!canManageRoom(existing,a.user))reject('Esa sala no está disponible.',404);const room=await this.room(id,existing.name);
  if(this.players(id).filter(p=>p.id!==a.user.id).length>=20)reject('La sala está llena.');
  const old=a.roomId;const p=this.free(room,a.user.id);
  if(!p)reject('La sala no tiene espacio para entrar.');await cancelTrade(this,a.user.id,'El intercambio se canceló al cambiar de sala.');a.roomId=id;a.seat=null;a.position={from:p,path:[],at:Date.now()};ws.serializeAttachment(a);
  this.send(ws,{type:'room',serverNow:Date.now(),room,players:this.players(id),position:p,media:mediaSnapshot(room.media),posters:await posterList(this,room.ownerId)});
  if(old&&old!==id)this.broadcast(old,{type:'presence',players:this.players(old)});
  this.broadcast(id,{type:'presence',players:this.players(id)},ws);
  if(a.user.admin)await this.ctx.storage.put('active-room',id);
  this.broadcastOnline();
 }
 async handle(request){
  const path=new URL(request.url).pathname;
  if(path==='/shop'&&request.method==='GET')return reply(publicShop(await economy(this.ctx.storage)));
  if(path==='/kick')return this.kick(await body(request),request.headers.get('X-Hub-Broadcaster'));
  let auth;try{auth=JSON.parse(request.headers.get('X-Hub-Identity')||'null');}catch{}
  if(!auth||!/^\d+$/.test(auth.id)||auth.expiresAt<=Date.now())reject('Volvé a iniciar sesión.',401);
  const u=await this.user(auth.id,auth.name);if(u.banned)reject('Tu acceso al juego está suspendido.',403);
  if(path.startsWith('/posters'))return handlePosters(request,this,u,auth.admin);
  if(path==='/disconnect'&&request.method==='POST'){for(const ws of this.ownSockets(u.id))ws.close(4001,'Sesión cerrada.');return reply({ok:true});}
  if(path==='/state'&&request.method==='GET'){await ensureCasino(this,auth);return reply(await this.state(u,auth.admin));}
  if(path==='/feedback'||path==='/admin/feedback')return await handleFeedback(request,this.ctx.storage,u,auth.admin,body)||reply({error:'No disponible.'},404);
  if(path==='/rooms'&&request.method==='GET'){
   const casino=await ensureCasino(this,auth);
   const all=await this.ctx.storage.list({prefix:'room:',limit:100}),active=await this.ctx.storage.get('active-room');
   if(casino&&!all.has('room:'+casino.id))all.set('room:'+casino.id,casino);
   const visible=[...all.values()].filter(r=>r.community||r.public||r.ownerId===u.id||auth.admin),owners=visible.length?await this.ctx.storage.get([...new Set(visible.map(r=>'user:'+r.ownerId))]):new Map();
   return reply({rooms:visible.map(r=>({id:r.id,name:r.name,ownerId:r.ownerId,appearance:P.look(owners.get('user:'+r.ownerId)?.appearance||{}),online:this.players(r.id).length,active:r.id===active,public:r.public,community:!!r.community}))});
  }
  if(path==='/admin/community'&&auth.admin){
   if(request.method==='GET')return reply({room:await ensureCasino(this,auth)});
   if(request.method!=='PUT')return reply({error:'No disponible.'},404);
   const b=await body(request,2048);if(b.roomId!==CASINO_ID||typeof b.public!=='boolean')reject('Sala inválida.');
   const room=await ensureCasino(this,auth);
   if(room.public!==b.public){
    if(!b.public)await closeConnect4Room(this,room.id);
    room.public=b.public;room.revision++;await this.ctx.storage.put('room:'+room.id,room);
    for(const ws of this.sockets()){
     const a=ws.deserializeAttachment();
     if(a.roomId===room.id&&!a.user.admin&&!room.public){
      await this.room(a.user.id,a.user.name);
      try{await this.join(ws,a.user.id);this.send(ws,{type:'notice',message:'El Casino cerró. Volviste a tu sala.'});}
      catch{ws.close(4001,'El Casino cerró. Volvé a entrar a tu sala.');}
     }
    }
    for(const ws of this.sockets())this.send(ws,{type:'community',roomId:room.id,public:room.public,revision:room.revision});
   }return reply({room});
  }
  if(path==='/ws'&&request.headers.get('Upgrade')?.toLowerCase()==='websocket'){
   const previous=this.ownSockets(u.id);if(this.sockets().length-previous.length>=60)reject('La beta está llena. Intentá más tarde.',503);
   for(const old of previous)try{old.close(4001,'Abriste el juego en otra pestaña.');}catch{}
   await this.room(u.id,u.name);const pair=new WebSocketPair(),[client,server]=Object.values(pair);this.ctx.acceptWebSocket(server);
   server.serializeAttachment({user:auth,appearance:u.appearance,petName:u.petName||'',group:groupBadge(await userGroup(this,u)),roomId:null,position:{from:{x:1.5,y:1.5},path:[],at:Date.now()},rateAt:0,rateCount:0,lastChat:0});await this.join(server,u.id);this.send(server,{type:'announcement',announcement:await announcement(this)});
   return new Response(null,{status:101,webSocket:client});
  }
  if(path==='/admin/announcement'){if(!auth.admin)reject('Solo el administrador puede publicar anuncios.',403);if(request.method==='GET')return reply(await announcement(this));if(request.method==='PUT')return reply(await editAnnouncement(this,auth,await body(request,2048)));}
  if(path==='/admin/giveaway'&&['GET','POST'].includes(request.method))return reply(await giveaway(this,auth,request.method==='POST'?await body(request,16000):null));
  if(path==='/groups'){if(request.method==='GET')return reply(await groupState(this,u));if(request.method==='POST')return reply(await handleGroup(this,u,await body(request,2048)));}
  if(path==='/profile'&&request.method==='PUT'){u.petName=profileText((await body(request,2048)).petName);await this.ctx.storage.put('user:'+u.id,u);await refreshProfiles(this,[u.id]);return reply(await this.state(u,auth.admin));}
  if(path==='/look'&&request.method==='PUT'){
   u.appearance=validateLook((await body(request)).appearance,u,auth.admin);await this.ctx.storage.put('user:'+u.id,u);
   for(const ws of this.ownSockets(u.id)){const a=ws.deserializeAttachment();a.appearance=u.appearance;ws.serializeAttachment(a);this.broadcast(a.roomId,{type:'presence',players:this.players(a.roomId)});}
   return reply(await this.state(u,auth.admin));
  }
  if(path==='/room'&&request.method==='PUT'){
   const b=await body(request),id=b.roomId||u.id;
   if(!b.roomId&&this.ownSockets(u.id).some(ws=>ws.deserializeAttachment()?.roomId===CASINO_ID))reject('Recargá la página para guardar la sala comunitaria.',409);
   const room=id===u.id?await this.room(u.id,u.name):await this.ctx.storage.get('room:'+id);
   if(!canManageRoom(room,auth))reject('Solo el administrador puede decorar esa sala.',403);
   if(b.revision!==room.revision)reject('La sala cambió en otra pestaña. Recargamos la última versión.',409);
   const previous=room.scene;room.scene=validateScene(b.scene,u,auth.admin);await expireConnect4(this);await guardConnect4Tables(this,room.id,room.scene);reconcilePlants(room,room.plants,await plantConfig(this.ctx.storage));
   // General lighting has its own live action; stale decoration saves cannot undo it.
   room.scene.lightsOn=previous.lightsOn!==false;
   // Decoration saves must not overwrite a visitor's more recent switch state.
   for(const item of room.scene.items){const old=previous.items.find(i=>i.id===item.id&&i.type===item.type);if(!old)continue;for(const key of ['on','closed'])if(typeof old[key]==='boolean')item[key]=old[key];}
   room.revision++;if(room.community){room.scene.name=room.name;}else{room.name=u.name;if(typeof b.public==='boolean')room.public=b.public;}
   C.setLayout(room.scene.layout);if(!C.findFree(room.scene.items))reject('Dejá un espacio libre para entrar.');
   if(room.media&&!room.scene.items.some(i=>i.id===room.media.itemId&&MEDIA_TYPES.has(i.type))){room.media=null;this.broadcast(room.id,{type:'media',roomId:room.id,media:null});}
   await this.ctx.storage.put('room:'+room.id,room);
   for(const ws of this.sockets()){const a=ws.deserializeAttachment();if(a.roomId!==room.id)continue;const current=currentPosition(a.position),oldSeat=a.seat&&previous.items.find(i=>i.id===a.seat.itemId),newSeat=a.seat&&room.scene.items.find(i=>i.id===a.seat.itemId);
    const seatChanged=a.seat&&(!oldSeat||!newSeat||['type','x','y','flip','rotation'].some(k=>oldSeat[k]!==newSeat[k]));
    if(seatChanged||C.blocked(room.scene.items,Math.floor(current.point.x),Math.floor(current.point.y))||current.path.some(p=>C.blocked(room.scene.items,Math.floor(p.x),Math.floor(p.y)))){a.seat=null;a.position={from:this.free(room,a.user.id,current.point)||current.point,path:[],at:Date.now()};ws.serializeAttachment(a);this.broadcast(room.id,{type:'walk',id:a.user.id,from:a.position.from,path:[]});}}
   this.broadcast(room.id,{type:'scene',serverNow:Date.now(),room,players:this.players(room.id)});return reply({room,serverNow:Date.now()});
  }
  if(['/fishing/open','/fishing/ranking','/fishing/start','/fishing/input','/fishing/cancel'].includes(path)&&request.method==='POST'){const result=await fishingAction(this,u,path.split('/').pop(),await body(request,2048));return reply({...result,...(result.session?.settled?{account:await this.state(u,auth.admin)}:{})});}
  if(path==='/admin/fishing'&&auth.admin){if(request.method==='GET')return reply(await fishingConfig(this.ctx.storage));if(request.method==='PUT')return reply(await saveFishingConfig(this.ctx.storage,await body(request,2048)));}
  if(path==='/connect4'&&request.method==='POST'){const result=await connect4Action(this,u,await body(request,2048));return reply({...result,account:await this.state(await this.user(u.id),auth.admin)});}
  if((path==='/slots/open'||path==='/slots/bet')&&request.method==='POST'){
   const input=await body(request,2048);if(!input||typeof input!=='object')reject('Solicitud inválida.');
   const result=path==='/slots/open'?await openSlots(this,u,input):{receipt:await betSlots(this,u,input),serverNow:Date.now()};
   return reply({...result,account:await this.state(u,auth.admin)});
  }
  if((path==='/racing/open'||path==='/racing/bet')&&request.method==='POST'){
   const input=await body(request,2048);if(!input||typeof input!=='object')reject('Solicitud inválida.');
   const result=path==='/racing/open'?await openRacing(this,u,input):{receipt:await betRacing(this,u,input),serverNow:Date.now()};
   return reply({...result,account:await this.state(u,auth.admin)});
  }
  if((path==='/roulette/open'||path==='/roulette/bet')&&request.method==='POST'){
   const input=await body(request,2048);if(!input||typeof input!=='object')reject('Solicitud inválida.');
   const result=path==='/roulette/open'?await openRoulette(this,u,input):{receipt:await betRoulette(this,u,input)};
   return reply({...result,account:await this.state(u,auth.admin)});
  }
  if(['/basket/open','/basket/start','/basket/shoot','/basket/finish'].includes(path)&&request.method==='POST'){const action=path.split('/').pop(),result=await basketAction(this,u,action,await body(request,2048));return reply({...result,...(action==='finish'?{account:await this.state(u,auth.admin)}:{})});}
  if(path==='/admin/basket'&&auth.admin){if(request.method==='GET')return reply(await basketConfig(this.ctx.storage));if(request.method==='PUT')return reply(await saveBasketConfig(this.ctx.storage,await body(request,2048)));}
  if(['/dj/open','/dj/start','/dj/hit','/dj/finish'].includes(path)&&request.method==='POST'){const action=path.split('/').pop(),result=await djAction(this,u,action,await body(request,2048));return reply({...result,...(action==='finish'?{account:await this.state(u,auth.admin)}:{})});}
  if(path==='/admin/dj'&&auth.admin){if(request.method==='GET')return reply(await djConfig(this.ctx.storage));if(request.method==='PUT')return reply(await saveDJConfig(this.ctx.storage,await body(request,2048)));}
  if(['/coffee/open','/coffee/start','/coffee/pour','/coffee/serve'].includes(path)&&request.method==='POST'){const result=await coffeeAction(this,u,path.split('/').pop(),await body(request,2048));return reply({...result,account:await this.state(u,auth.admin)});}
  if(path==='/admin/coffee'&&auth.admin){if(request.method==='GET')return reply(await coffeeConfig(this.ctx.storage));if(request.method==='PUT')return reply(await saveCoffeeConfig(this.ctx.storage,await body(request,2048)));}
  if(path==='/plants/harvest'&&request.method==='POST'){const result=await harvestPlant(this,u,await body(request,2048));return reply({...result,account:await this.state(u,auth.admin)});}
  if(path==='/admin/plants'&&auth.admin){if(request.method==='GET')return reply(await plantConfig(this.ctx.storage));if(request.method==='PUT'){const config=await savePlantConfig(this.ctx.storage,await body(request,2048));const shop=publicShop(await economy(this.ctx.storage));for(const ws of this.sockets())this.send(ws,{type:'shop',shop});return reply(config);}}
  if((path==='/exchange/open'||path==='/exchange/swap')&&request.method==='POST'){
   const input=await body(request,2048),result=path==='/exchange/open'?await openExchange(this,u,input):{receipt:await exchangeItem(this,u,input)};
   return reply({...result,account:await this.state(u,auth.admin)});
  }
  if(path==='/box/buy'&&request.method==='POST'){
   const box=await buyBox(this,u,await body(request));return reply({box:{id:box.id,kind:box.kind,opened:box.opened},...(await this.state(u,auth.admin))});
  }
  if(path==='/admin/credits'&&auth.admin){
   if(request.method==='GET')return reply(await economy(this.ctx.storage));
   if(request.method==='PUT'){const config=await saveEconomy(this.ctx.storage,await body(request));for(const ws of this.sockets())this.send(ws,{type:'shop',shop:publicShop(config)});return reply(config);}
  }
  if(path==='/box/open'&&request.method==='POST'){
   const b=await body(request),box=typeof b.id==='string'&&await this.ctx.storage.get('box:'+b.id);if(!box||box.userId!==u.id)reject('Esa caja no te pertenece.',403);
   if(!box.opened){box.opened=true;u.walletVersion=(u.walletVersion||0)+1;u.inventory[box.itemId]=(u.inventory[box.itemId]||0)+1;
    await this.ctx.storage.transaction(async tx=>{await tx.put({['box:'+box.id]:box,['user:'+u.id]:u});await tx.delete('pending:'+u.id+':'+box.id);});
   }
   return reply({receipt:{id:box.id,itemId:box.itemId,kind:box.kind,opened:true,userId:'self'},...(await this.state(u,auth.admin))});
  }
  if(path==='/admin/rewards'&&auth.admin){
   if(request.method==='GET')return reply({rewards:await this.ctx.storage.get('reward-map')||{}});
   if(request.method==='PUT'){const b=await body(request),map=await this.ctx.storage.get('reward-map')||{};for(const k of KINDS){if(b[k]===undefined)continue;if(typeof b[k]!=='string'||!/^[\w-]{1,100}$/.test(b[k]))reject('Elegí las tres recompensas.');map[k]=b[k];}if(!Object.keys(map).length||new Set(Object.values(map)).size!==Object.keys(map).length)reject('Cada caja necesita una recompensa distinta.');await this.ctx.storage.put('reward-map',map);return reply({rewards:map});}
  }
  if(path==='/admin/moderate'&&auth.admin&&request.method==='POST'){
   const b=await body(request);if(!/^\d+$/.test(b.id||'')||b.id===u.id)reject('Jugador inválido.');const target=await this.ctx.storage.get('user:'+b.id);if(!target)reject('Jugador desconocido.');
   if(typeof b.banned==='boolean')target.banned=b.banned;if(typeof b.muted==='boolean')target.mutedUntil=b.muted?Date.now()+3600000:0;await this.ctx.storage.put('user:'+target.id,target);
   if(target.banned)for(const ws of this.ownSockets(target.id))ws.close(4003,'Acceso suspendido.');return reply({ok:true});
  }
  reject('No disponible.',404);
 }
 async kick(event,broadcasterId){
  const p=event.payload;if(!p||String(p.broadcaster?.user_id)!==broadcasterId)return reply({ignored:true});
  if(event.type==='channel.reward.redemption.updated'){
   const credited=await creditRedemption(this,p);if(credited)return reply(credited);
   const map=await this.ctx.storage.get('reward-map')||{},kind=KINDS.find(k=>map[k]===String(p.reward?.id));if(!kind)return reply({ignored:true});
   const id=String(p.id||''),uid=String(p.redeemer?.user_id||'');if(!/^[\w-]{1,120}$/.test(id)||!/^\d+$/.test(uid))reject('Canje inválido.');
   const prior=await this.ctx.storage.get('box:'+id);if(prior){if(prior.userId!==uid||prior.kind!==kind)reject('Canje inconsistente.');return reply({duplicate:true});}
   if(p.status!=='accepted')return reply({ignored:true,pending:p.status==='pending',redemptionId:id});
   const u=await this.user(uid,p.redeemer.username);const item=R.draw(R.poolFor(CATALOG,kind),new Set(Object.keys(u.collected)));
   const box={id,userId:uid,kind,itemId:item.id,opened:false};u.collected[item.id]=true;
   await this.ctx.storage.put({['box:'+id]:box,['pending:'+uid+':'+id]:box,['user:'+uid]:u});await this.notifyUser(uid);return reply({ok:true});
  }
  if(event.type==='chat.message.sent'){
   const id=String(p.sender?.user_id||''),ws=this.ownSockets(id)[0];if(!ws)return reply({ignored:true});const u=await this.user(id);if(u.banned||u.mutedUntil>Date.now())return reply({ignored:true});
   const eventKey='chat-event:'+String(p.message_id||event.id);if(await this.ctx.storage.get(eventKey))return reply({duplicate:true});
   await this.ctx.storage.put(eventKey,Date.now());if(!await this.ctx.storage.getAlarm())await this.ctx.storage.setAlarm(Date.now()+3600000);
   const text=String(p.content||'').slice(0,2000).trim();
   if(text.toLowerCase()==='!entrar'){const active=await this.ctx.storage.get('active-room');if(active)await this.join(ws,active);return reply({ok:true});}
   if(!text.startsWith('!'))this.chat(ws,text);return reply({ok:true});
  }
  return reply({ignored:true});
 }
 chat(ws,text){const a=ws.deserializeAttachment();text=clipChat(text);if(!text||Date.now()-a.lastChat<1000)return;a.lastChat=Date.now();ws.serializeAttachment(a);this.broadcast(a.roomId,{type:'chat',id:a.user.id,text});}
 async webSocketMessage(ws,message){
  return this.ctx.blockConcurrencyWhile(async()=>{try{
   if(message==='ping')return;if(typeof message!=='string'||message.length>1024)reject('Mensaje inválido.');const a=ws.deserializeAttachment();
   if(a.user.expiresAt<=Date.now()){ws.close(4001,'Sesión vencida.');return;}
   if(Date.now()-a.rateAt>1000){a.rateAt=Date.now();a.rateCount=0;}if(++a.rateCount>8)reject('Esperá un momento.');ws.serializeAttachment(a);
   const user=await this.user(a.user.id);if(user.banned){ws.close(4003,'Acceso suspendido.');return;}const b=JSON.parse(message);
   if(b.type==='trade')return await handleTrade(this,ws,b);
   if(b.type==='media'){try{return await handleMedia(this,ws,b);}catch(e){e.mediaAction=b.action;e.mediaRequestId=b.seekToken;throw e;}}
   if(b.type==='join')return await this.join(ws,String(b.roomId));
   if(b.type==='chat'){if(user.mutedUntil>Date.now())reject('El chat está silenciado para tu cuenta.',403);return this.chat(ws,b.text);}
   if(b.type==='room-light'){
    const room=await this.ctx.storage.get('room:'+a.roomId);
    if(!canManageRoom(room,a.user))reject('Solo el dueño puede cambiar la luz de la sala.',403);
    if(typeof b.on!=='boolean')reject('Estado de luz inválido.');
    if(room.scene.lightsOn!==b.on){room.scene.lightsOn=b.on;await this.ctx.storage.put('room:'+room.id,room);}
    this.broadcast(room.id,{type:'room-light',roomId:room.id,on:b.on});return;
   }
   if(b.type==='interact'){
    const room=await this.ctx.storage.get('room:'+a.roomId),item=room?.scene.items.find(i=>i.id===b.itemId),kind=item&&C.TYPES[item.type].interaction;
    if(!['light','curtain'].includes(kind))reject('Ese objeto no se puede usar con esta acción.');
    if(Date.now()-(a.lastInteraction||0)<350)reject('Esperá un momento.');a.lastInteraction=Date.now();ws.serializeAttachment(a);
    const changes=kind==='curtain'?{closed:!item.closed}:{on:item.on===false};Object.assign(item,changes);
    await this.ctx.storage.put('room:'+room.id,room);this.broadcast(room.id,{type:'interaction',roomId:room.id,itemId:item.id,changes});return;
   }
   if(b.type==='stand'){
    a.seat=null;a.position={from:currentPosition(a.position).point,path:[],at:Date.now()};ws.serializeAttachment(a);this.broadcast(a.roomId,{type:'walk',id:a.user.id,from:a.position.from,path:[],seat:null,...(Number.isSafeInteger(b.seq)&&b.seq>0?{seq:b.seq}:{})});return;
   }
   if(b.type==='sit'){
    const room=await this.ctx.storage.get('room:'+a.roomId),item=room?.scene.items.find(i=>i.id===b.itemId);
    if(!item||!Number.isInteger(b.slot)||!C.seatPlaces(item)[b.slot])reject('Ese asiento no está disponible.');
    if(this.sockets().some(other=>{const p=other.deserializeAttachment();return other!==ws&&p.roomId===a.roomId&&p.seat?.itemId===item.id&&p.seat.slot===b.slot;}))reject('Ese asiento está ocupado.');
    C.setLayout(room.scene.layout);const from=currentPosition(a.position).point,approach=C.seatApproach(room.scene.items,from,item,this.occupied(a.roomId,a.user.id));
    if(!approach)reject('No hay paso hasta ese asiento.');
    a.seat={itemId:item.id,slot:b.slot};a.position={from,path:approach.path,at:Date.now()};ws.serializeAttachment(a);
    this.broadcast(a.roomId,{type:'walk',id:a.user.id,from,path:approach.path,seat:a.seat,...(Number.isSafeInteger(b.seq)&&b.seq>0?{seq:b.seq}:{})});return;
   }
   if(b.type==='walk'){
    const room=await this.ctx.storage.get('room:'+a.roomId);if(!Number.isFinite(b.x)||!Number.isFinite(b.y))reject('Destino inválido.');C.setLayout(room.scene.layout);
    const from=currentPosition(a.position).point,target={x:Math.floor(b.x)+.5,y:Math.floor(b.y)+.5};if(!C.inside(target.x,target.y)||C.blocked(room.scene.items,Math.floor(target.x),Math.floor(target.y)))return;
    const path=C.route(room.scene.items,from,target,this.occupied(a.roomId,a.user.id));if(!path){const current=currentPosition(a.position);this.send(ws,{type:'walk',id:a.user.id,from:current.point,path:current.path,seat:a.seat||null,...(Number.isSafeInteger(b.seq)&&b.seq>0?{seq:b.seq}:{})});reject('Hay alguien en el camino. Probá otra casilla.');}a.seat=null;a.position={from,path,at:Date.now()};ws.serializeAttachment(a);this.broadcast(a.roomId,{type:'walk',id:a.user.id,from,path,seat:null,...(Number.isSafeInteger(b.seq)&&b.seq>0?{seq:b.seq}:{})});
   }
  }catch(e){this.send(ws,{type:'error',error:e.status?e.message:'No pudimos completar esa acción.',...(e.mediaAction?{scope:'media',action:e.mediaAction,requestId:e.mediaRequestId}:{} )});}});
 }
 async webSocketClose(ws,code,reason){return this.ctx.blockConcurrencyWhile(async()=>{const a=ws.deserializeAttachment(),room=a?.roomId;try{ws.close(code,reason);}catch{}if(a)await cancelTrade(this,a.user.id,'El intercambio se canceló porque un jugador se desconectó.');if(room)this.broadcast(room,{type:'presence',players:this.players(room)});this.broadcastOnline(ws);});}
 webSocketError(ws){return this.webSocketClose(ws,1011,'Conexión interrumpida.');}
 async alarm(){await this.ctx.blockConcurrencyWhile(async()=>{await expireConnect4(this);const events=await this.ctx.storage.list({prefix:'chat-event:',limit:1000});const stale=[...events].filter(([,t])=>t<Date.now()-3600000).map(([key])=>key);if(stale.length)await this.ctx.storage.delete(stale);if(events.size>stale.length){const next=Date.now()+3600000,current=await this.ctx.storage.getAlarm();if(!current||current>next)await this.ctx.storage.setAlarm(next);}await scheduleConnect4(this);});}
}
