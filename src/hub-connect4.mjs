import {C} from './hub-rules.mjs';
import {balance} from './hub-economy.mjs';
import {CONNECT4,drop} from '../public/hub/connect4-rules.mjs';
const fail=(message,status=409)=>{throw Object.assign(Error(message),{status});};
const live=m=>m&&['invited','playing'].includes(m.status);
const key=id=>'connect4:'+id,active=id=>'connect4-user:'+id,table=m=>'connect4-table:'+m.roomId+':'+m.itemId,deadline=id=>'connect4-deadline:'+id;
const present=(w,id,room)=>w.ownSockets(id).some(ws=>ws.deserializeAttachment()?.roomId===room);
async function machine(w,u,b){
 if(typeof b.roomId!=='string'||!/^\d+$/.test(b.roomId)||!Number.isSafeInteger(b.itemId))fail('Mesa inválida.',400);
 if(!present(w,u.id,b.roomId))fail('Entrá a la sala para jugar.',403);
 const room=await w.ctx.storage.get('room:'+b.roomId);
 if(!room?.scene.items.some(i=>i.id===b.itemId&&C.TYPES[i.type]?.interaction==='connect4'))fail('Esta mesa ya no está colocada.');
}
export async function scheduleConnect4(w){
 const storage=w.ctx.storage,entries=await storage.list({prefix:'connect4-deadline:'});
 if(entries.size){const next=Math.min(...entries.values()),alarm=await storage.getAlarm();if(!alarm||alarm>next)await storage.setAlarm(next);}
}
function publish(w,m){
 const event={type:'connect4',match:m,serverNow:Date.now()};
 w.broadcast(m.roomId,event);
 for(const id of m.users)for(const ws of w.ownSockets(id))if(ws.deserializeAttachment()?.roomId!==m.roomId)w.send(ws,event);
}
async function save(w,m){
 await w.ctx.storage.put({[key(m.id)]:m,[deadline(m.id)]:m.deadline});
 await scheduleConnect4(w);publish(w,m);
}
// Escrow is debited once when both players agree. Settlement and release of
// all reservations commit atomically, including timeout and retry paths.
async function finish(w,m,status,winner=null,reason=''){
 const s=w.ctx.storage;
 const committed=await s.get(key(m.id));if(!live(committed))return committed;
 m={...m,status,winner,reason,revision:m.revision+1,endedAt:Date.now(),deadline:null};
 const users=await Promise.all(m.users.map(id=>w.user(id)));
 await s.transaction(async tx=>{
  if(committed.status==='playing')for(let i=0;i<2;i++){
   const payout=status==='draw'?m.stake:winner===i?m.stake*2:0;
   // A later unrelated income must never truncate money already in escrow.
   // The maximum escrow is 20,000; these exact integer credits remain spendable.
   if(payout){users[i].credits=balance(users[i])+payout;users[i].walletVersion=(users[i].walletVersion||0)+1;await tx.put('user:'+users[i].id,users[i]);}
  }
  await tx.put(key(m.id),m);
  await tx.delete([deadline(m.id),table(m),...m.users.map(active)]);
 });
 for(const id of m.users)await w.notifyUser(id);publish(w,m);return m;
}
export async function expireConnect4(w,now=Date.now()){
 const s=w.ctx.storage,rows=await s.list({prefix:'connect4-deadline:'});
 for(const [k,at] of rows)if(at<=now){
  const m=await s.get(key(k.slice('connect4-deadline:'.length)));
  if(!live(m)){await s.delete(k);continue;}
  if(m.deadline<=now)await finish(w,m,m.status==='invited'?'cancelled':'won',m.status==='playing'?1-m.turn:null,m.status==='invited'?'La invitación venció. No se cobraron créditos.':'Se agotó el tiempo del turno.');
 }
 await scheduleConnect4(w);
}
export async function guardConnect4Tables(w,roomId,scene){
 for(const [,id] of await w.ctx.storage.list({prefix:'connect4-table:'+roomId+':'})){
  const m=await w.ctx.storage.get(key(id));
  if(live(m)&&!scene.items.some(i=>i.id===m.itemId&&C.TYPES[i.type]?.interaction==='connect4'))fail('Terminá o cancelá la partida antes de guardar esa mesa.');
 }
}
export async function connect4Action(w,u,b){
 if(!b||typeof b!=='object'||Array.isArray(b))fail('Solicitud inválida.',400);
 await expireConnect4(w);
 const s=w.ctx.storage,now=Date.now();
 if(b.action==='sync'){
  const id=await s.get(active(u.id))||await s.get('connect4-last:'+u.id);
  return {match:id?await s.get(key(id)):null,serverNow:now};
 }
 if(b.action==='open'){
  await machine(w,u,b);const id=await s.get(active(u.id))||await s.get(table(b));
  const players=w.players(b.roomId).filter(p=>p.id!==u.id);
  return {match:id?await s.get(key(id)):null,players:players.map(p=>({id:p.id,name:p.name})),serverNow:now};
 }
 if(b.action==='invite'){
  if(typeof b.requestId!=='string'||!/^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(b.requestId)||typeof b.target!=='string'||!/^\d+$/.test(b.target)||b.target===u.id||!Number.isSafeInteger(b.stake)||b.stake<CONNECT4.min||b.stake>CONNECT4.max)fail('Elegí un jugador y una apuesta de 5 a 10.000 créditos.',400);
  const prior=await s.get(key(b.requestId));
  if(prior){if(prior.users[0]!==u.id||prior.users[1]!==b.target||prior.stake!==b.stake||prior.roomId!==b.roomId||prior.itemId!==b.itemId)fail('Esta invitación ya corresponde a otra partida.');return {match:prior,serverNow:now};}
  await machine(w,u,b);
  if(!present(w,b.target,b.roomId))fail('Ese jugador ya no está en la sala.');
  if(await s.get(active(u.id))||await s.get(active(b.target)))fail('Uno de los jugadores ya tiene una partida o invitación pendiente.');
  if(await s.get(table(b)))fail('La mesa está ocupada.');
  if(now-(await s.get('connect4-rate:'+u.id)||0)<5000)fail('Esperá unos segundos antes de volver a invitar.',429);
  const other=await w.user(b.target);if(other.banned)fail('Ese jugador no está disponible.');
  if(balance(u)<b.stake)fail('No tenés créditos suficientes.');
  if(balance(other)<b.stake)fail('El otro jugador no tiene créditos suficientes.');
  const m={id:b.requestId,roomId:b.roomId,itemId:b.itemId,users:[u.id,b.target],names:[u.name,other.name],stake:b.stake,status:'invited',revision:0,board:Array(42).fill(0),line:[],turn:0,deadline:now+CONNECT4.inviteMs,createdAt:now};
  await s.transaction(async tx=>tx.put({[key(m.id)]:m,[active(u.id)]:m.id,[active(b.target)]:m.id,[table(m)]:m.id,[deadline(m.id)]:m.deadline,['connect4-last:'+u.id]:m.id,['connect4-last:'+b.target]:m.id,['connect4-rate:'+u.id]:now}));
  await scheduleConnect4(w);publish(w,m);return {match:m,serverNow:now};
 }
 if(!['accept','decline','move','resign'].includes(b.action)||typeof b.id!=='string'||b.id.length>50)fail('Acción inválida.',400);
 let m=await s.get(key(b.id));const player=m?.users.indexOf(u.id);
 if(!m||player<0)fail('No participás en esta partida.',403);
 if(!live(m))return {match:m,serverNow:now};
 if(b.revision!==m.revision)fail('La partida cambió. Esperá la actualización.');
 if(b.action==='decline'){
  if(m.status!=='invited')fail('La partida ya empezó.');
  m=await finish(w,m,'cancelled',null,'Invitación cancelada. No se cobraron créditos.');
 }else if(b.action==='accept'){
  if(player!==1||m.status!=='invited')fail('Esta invitación no está pendiente.',403);
  await machine(w,u,m);
  if(!present(w,m.users[0],m.roomId))fail('El otro jugador tiene que estar en la sala.');
  const users=await Promise.all(m.users.map(id=>w.user(id)));
  if(users.some(v=>v.banned||balance(v)<m.stake)){await finish(w,m,'cancelled',null,'No hay saldo suficiente para empezar.');fail('Alguno de los jugadores ya no tiene créditos suficientes.');}
  m={...m,status:'playing',turn:crypto.getRandomValues(new Uint8Array(1))[0]%2,revision:m.revision+1,deadline:now+CONNECT4.turnMs};
  await s.transaction(async tx=>{
   for(const v of users){v.credits=balance(v)-m.stake;v.walletVersion=(v.walletVersion||0)+1;await tx.put('user:'+v.id,v);}
   await tx.put({[key(m.id)]:m,[deadline(m.id)]:m.deadline});
  });
  await scheduleConnect4(w);for(const id of m.users)await w.notifyUser(id);publish(w,m);
 }else if(b.action==='resign'){
  if(m.status!=='playing')fail('La partida todavía no empezó.');
  m=await finish(w,m,'won',1-player,m.names[player]+' abandonó la partida.');
 }else{
  if(m.status!=='playing'||m.turn!==player)fail('Esperá tu turno.');
  await machine(w,u,m);
  let result;try{result=drop(m.board,b.column,player+1);}catch(e){fail(e.message,400);}
  m={...m,board:result.board,line:result.line,last:result.index,revision:m.revision+1,turn:1-player,deadline:now+CONNECT4.turnMs};
  // Persist the last move and any payout within one transaction boundary. The
  // DO also serializes every route, WebSocket message and alarm.
  if(result.won||result.draw){
   m=await finish(w,m,result.won?'won':'draw',result.won?player:null,result.won?'Cuatro en línea.':'Empate: se devuelve la apuesta.');
  }else await save(w,m);
 }
 return {match:m,serverNow:Date.now()};
}
