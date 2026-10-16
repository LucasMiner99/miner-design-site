import {C,P,R,CATALOG} from './hub-rules.mjs';
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
export class HubWorld {
 constructor(ctx,env){this.ctx=ctx;this.env=env;if(typeof WebSocketRequestResponsePair!=='undefined')ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping','pong'));}
 async fetch(request){
  return this.ctx.blockConcurrencyWhile(async()=>{try{return await this.handle(request);}catch(e){console.error('Hub:',e.status?e.message:'operation failed');return reply({error:e.status?e.message:'No se pudo guardar. Intentá otra vez.'},e.status||500);}});
 }
 async user(id,name){let u=await this.ctx.storage.get('user:'+id);if(!u){u={id,name,appearance:P.look({}),inventory:{},collected:{},mutedUntil:0,banned:false};await this.ctx.storage.put('user:'+id,u);}else if(name&&u.name!==name){u.name=name;await this.ctx.storage.put('user:'+id,u);}return u;}
 async room(id,name){let room=await this.ctx.storage.get('room:'+id);if(!room){const scene=C.initial();scene.items=[];scene.name=name;room={id,ownerId:id,name,public:true,revision:0,scene};await this.ctx.storage.put('room:'+id,room);}return room;}
 sockets(){return this.ctx.getWebSockets().filter(ws=>ws.readyState===1);}
 send(ws,value){try{ws.send(JSON.stringify(value));}catch{try{ws.close(1011,'Conexión cerrada');}catch{}}}
 broadcast(roomId,event,except){for(const ws of this.sockets())if(ws!==except&&ws.deserializeAttachment()?.roomId===roomId)this.send(ws,event);}
 ownSockets(id){return this.sockets().filter(ws=>ws.deserializeAttachment()?.user.id===id);}
 async state(user,admin){const rows=await this.ctx.storage.list({prefix:'pending:'+user.id+':',limit:100});return {user:{id:user.id,name:user.name,appearance:user.appearance,admin},inventory:inventory(user,admin),boxes:[...rows.values()].map(b=>({id:b.id,kind:b.kind})),room:await this.room(user.id,user.name)};}
 async notifyUser(id){const user=await this.user(id);for(const ws of this.ownSockets(id))this.send(ws,{type:'account',...(await this.state(user,ws.deserializeAttachment().user.admin))});}
 players(roomId){return this.sockets().map(ws=>ws.deserializeAttachment()).filter(a=>a?.roomId===roomId).map(a=>{const p=currentPosition(a.position);return {id:a.user.id,name:a.user.name,appearance:a.appearance,x:p.point.x,y:p.point.y,path:p.path};});}
 async join(ws,id){
  const a=ws.deserializeAttachment(),room=await this.ctx.storage.get('room:'+id);if(!room||!room.public&&room.ownerId!==a.user.id&&!a.user.admin)reject('Esa sala no está disponible.',404);
  if(this.players(id).filter(p=>p.id!==a.user.id).length>=20)reject('La sala está llena.');
  const old=a.roomId;C.setLayout(room.scene.layout);const others=this.players(id);let p=C.findFree(room.scene.items);
  outer:for(let y=C.room().h-1;y>=0;y--)for(let x=0;x<C.room().w;x++)if(!C.blocked(room.scene.items,x,y)&&!others.some(o=>Math.hypot(o.x-x-.5,o.y-y-.5)<.8)){p={x:x+.5,y:y+.5};break outer;}
  if(!p)reject('La sala no tiene espacio para entrar.');a.roomId=id;a.position={from:p,path:[],at:Date.now()};ws.serializeAttachment(a);
  this.send(ws,{type:'room',room,players:this.players(id),position:p});
  if(old&&old!==id)this.broadcast(old,{type:'presence',players:this.players(old)});
  this.broadcast(id,{type:'presence',players:this.players(id)},ws);
  if(a.user.admin)await this.ctx.storage.put('active-room',id);
 }
 async handle(request){
  const path=new URL(request.url).pathname;
  if(path==='/kick')return this.kick(await body(request),request.headers.get('X-Hub-Broadcaster'));
  let auth;try{auth=JSON.parse(request.headers.get('X-Hub-Identity')||'null');}catch{}
  if(!auth||!/^\d+$/.test(auth.id)||auth.expiresAt<=Date.now())reject('Volvé a iniciar sesión.',401);
  const u=await this.user(auth.id,auth.name);if(u.banned)reject('Tu acceso al juego está suspendido.',403);
  if(path==='/disconnect'&&request.method==='POST'){for(const ws of this.ownSockets(u.id))ws.close(4001,'Sesión cerrada.');return reply({ok:true});}
  if(path==='/state'&&request.method==='GET')return reply(await this.state(u,auth.admin));
  if(path==='/rooms'&&request.method==='GET'){
   const all=await this.ctx.storage.list({prefix:'room:',limit:100}),active=await this.ctx.storage.get('active-room');
   return reply({rooms:[...all.values()].filter(r=>r.public||r.ownerId===u.id||auth.admin).map(r=>({id:r.id,name:r.name,ownerId:r.ownerId,online:this.players(r.id).length,active:r.id===active,public:r.public}))});
  }
  if(path==='/ws'&&request.headers.get('Upgrade')?.toLowerCase()==='websocket'){
   const previous=this.ownSockets(u.id);if(this.sockets().length-previous.length>=60)reject('La beta está llena. Intentá más tarde.',503);
   for(const old of previous)try{old.close(4001,'Abriste el juego en otra pestaña.');}catch{}
   await this.room(u.id,u.name);const pair=new WebSocketPair(),[client,server]=Object.values(pair);this.ctx.acceptWebSocket(server);
   server.serializeAttachment({user:auth,appearance:u.appearance,roomId:null,position:{from:{x:1.5,y:1.5},path:[],at:Date.now()},rateAt:0,rateCount:0,lastChat:0});await this.join(server,u.id);
   return new Response(null,{status:101,webSocket:client});
  }
  if(path==='/look'&&request.method==='PUT'){
   u.appearance=validateLook((await body(request)).appearance,u,auth.admin);await this.ctx.storage.put('user:'+u.id,u);
   for(const ws of this.ownSockets(u.id)){const a=ws.deserializeAttachment();a.appearance=u.appearance;ws.serializeAttachment(a);this.broadcast(a.roomId,{type:'presence',players:this.players(a.roomId)});}
   return reply(await this.state(u,auth.admin));
  }
  if(path==='/room'&&request.method==='PUT'){
   const b=await body(request),room=await this.room(u.id,u.name);if(b.revision!==room.revision)reject('La sala cambió en otra pestaña. Recargamos la última versión.',409);
   room.scene=validateScene(b.scene,u,auth.admin);room.revision++;room.name=u.name;if(typeof b.public==='boolean')room.public=b.public;
   C.setLayout(room.scene.layout);if(!C.findFree(room.scene.items))reject('Dejá un espacio libre para entrar.');
   await this.ctx.storage.put('room:'+u.id,room);
   for(const ws of this.sockets()){const a=ws.deserializeAttachment();if(a.roomId!==u.id)continue;const current=currentPosition(a.position);if(C.blocked(room.scene.items,Math.floor(current.point.x),Math.floor(current.point.y))||current.path.some(p=>C.blocked(room.scene.items,Math.floor(p.x),Math.floor(p.y)))){a.position={from:C.findFree(room.scene.items,current.point),path:[],at:Date.now()};ws.serializeAttachment(a);this.broadcast(u.id,{type:'walk',id:a.user.id,from:a.position.from,path:[]});}}
   this.broadcast(u.id,{type:'scene',room,players:this.players(u.id)});return reply({room});
  }
  if(path==='/box/open'&&request.method==='POST'){
   const b=await body(request),box=typeof b.id==='string'&&await this.ctx.storage.get('box:'+b.id);if(!box||box.userId!==u.id)reject('Esa caja no te pertenece.',403);
   if(!box.opened){box.opened=true;u.inventory[box.itemId]=(u.inventory[box.itemId]||0)+1;
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
   const map=await this.ctx.storage.get('reward-map')||{},kind=KINDS.find(k=>map[k]===String(p.reward?.id));if(!kind)return reply({ignored:true});
   const id=String(p.id||''),uid=String(p.redeemer?.user_id||'');if(!/^[\w-]{1,120}$/.test(id)||!/^\d+$/.test(uid))reject('Canje inválido.');
   const prior=await this.ctx.storage.get('box:'+id);if(prior){if(prior.userId!==uid||prior.kind!==kind)reject('Canje inconsistente.');return reply({duplicate:true});}
   if(p.status!=='accepted')return reply({ignored:true,pending:p.status==='pending',redemptionId:id});
   const u=await this.user(uid,p.redeemer.username);const item=R.draw(CATALOG.filter(i=>i.kind===kind&&!i.starter),new Set(Object.keys(u.collected)));
   const box={id,userId:uid,kind,itemId:item.id,opened:false};u.collected[item.id]=true;
   await this.ctx.storage.put({['box:'+id]:box,['pending:'+uid+':'+id]:box,['user:'+uid]:u});await this.notifyUser(uid);return reply({ok:true});
  }
  if(event.type==='chat.message.sent'){
   const id=String(p.sender?.user_id||''),ws=this.ownSockets(id)[0];if(!ws)return reply({ignored:true});const u=await this.user(id);if(u.banned||u.mutedUntil>Date.now())return reply({ignored:true});
   const eventKey='chat-event:'+String(p.message_id||event.id);if(await this.ctx.storage.get(eventKey))return reply({duplicate:true});
   await this.ctx.storage.put(eventKey,Date.now());if(!await this.ctx.storage.getAlarm())await this.ctx.storage.setAlarm(Date.now()+3600000);
   const text=String(p.content||'').replace(/\[emote:\d+:([^\]]+)\]/g,'$1').trim();
   if(text.toLowerCase()==='!entrar'){const active=await this.ctx.storage.get('active-room');if(active)await this.join(ws,active);return reply({ok:true});}
   if(!text.startsWith('!'))this.chat(ws,text);return reply({ok:true});
  }
  return reply({ignored:true});
 }
 chat(ws,text){const a=ws.deserializeAttachment();text=String(text||'').trim().slice(0,120);if(!text||Date.now()-a.lastChat<1000)return;a.lastChat=Date.now();ws.serializeAttachment(a);this.broadcast(a.roomId,{type:'chat',id:a.user.id,text});}
 async webSocketMessage(ws,message){
  return this.ctx.blockConcurrencyWhile(async()=>{try{
   if(message==='ping')return;if(typeof message!=='string'||message.length>1024)reject('Mensaje inválido.');const a=ws.deserializeAttachment();
   if(a.user.expiresAt<=Date.now()){ws.close(4001,'Sesión vencida.');return;}
   if(Date.now()-a.rateAt>1000){a.rateAt=Date.now();a.rateCount=0;}if(++a.rateCount>8)reject('Esperá un momento.');ws.serializeAttachment(a);
   const user=await this.user(a.user.id);if(user.banned){ws.close(4003,'Acceso suspendido.');return;}const b=JSON.parse(message);
   if(b.type==='join')return await this.join(ws,String(b.roomId));
   if(b.type==='chat'){if(user.mutedUntil>Date.now())reject('El chat está silenciado para tu cuenta.',403);return this.chat(ws,b.text);}
   if(b.type==='walk'){
    const room=await this.ctx.storage.get('room:'+a.roomId);if(!Number.isFinite(b.x)||!Number.isFinite(b.y))reject('Destino inválido.');C.setLayout(room.scene.layout);
    const from=currentPosition(a.position).point,target={x:Math.floor(b.x)+.5,y:Math.floor(b.y)+.5};if(!C.inside(target.x,target.y)||C.blocked(room.scene.items,Math.floor(target.x),Math.floor(target.y)))return;
    const path=C.route(room.scene.items,from,target);if(!path)return;a.position={from,path,at:Date.now()};ws.serializeAttachment(a);this.broadcast(a.roomId,{type:'walk',id:a.user.id,from,path});
   }
  }catch(e){this.send(ws,{type:'error',error:e.status?e.message:'No pudimos completar esa acción.'});}});
 }
 async webSocketClose(ws,code,reason){const room=ws.deserializeAttachment()?.roomId;try{ws.close(code,reason);}catch{}if(room)this.broadcast(room,{type:'presence',players:this.players(room)});}
 webSocketError(ws){return this.webSocketClose(ws,1011,'Conexión interrumpida.');}
 async alarm(){await this.ctx.blockConcurrencyWhile(async()=>{const events=await this.ctx.storage.list({prefix:'chat-event:',limit:1000});const stale=[...events].filter(([,t])=>t<Date.now()-3600000).map(([key])=>key);if(stale.length)await this.ctx.storage.delete(stale);if(events.size>stale.length)await this.ctx.storage.setAlarm(Date.now()+3600000);});}
}
