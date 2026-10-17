import {C,CATALOG} from './hub-rules.mjs';
const catalog=new Map(CATALOG.map(i=>[i.id,i]));
const fail=message=>{throw Object.assign(Error(message),{status:400});};
export function tradeInventory(user,room){
 const used=new Map(),take=id=>used.set(id,(used.get(id)||0)+1);
 for(const i of [...room.scene.items,...(room.scene.unplacedItems||[])])take('object:'+i.type);
 for(const [slot,index] of Object.entries(user.appearance))take(`look:${slot}:${index}`);
 for(const [slot,index] of Object.entries(room.scene))if(Object.hasOwn(C.ENV_COUNTS,slot))take(`environment:${slot}:${index}`);
 take('environment:layout:'+C.LAYOUTS.findIndex(l=>l.id===room.scene.layout));
 return Object.entries(user.inventory).flatMap(([id,count])=>{const item=catalog.get(id),available=Math.max(0,count-(used.get(id)||0));return item&&!item.starter&&available?[{...item,count:available}]:[];});
}
async function available(world,id){const user=await world.user(id);return tradeInventory(user,await world.room(id,user.name));}
function view(t){return {...t,offers:t.offers.map(offer=>Object.entries(offer).map(([id,count])=>({...catalog.get(id),count})))};}
async function publish(world,t){for(const id of t.users)for(const ws of world.ownSockets(id))world.send(ws,{type:'trade',trade:view(t),available:await available(world,id)});}
async function close(world,t,status,message){t.status=status;t.message=message;await world.ctx.storage.put('trade:'+t.id,t);await world.ctx.storage.delete(t.users.map(id=>'active-trade:'+id));await publish(world,t);}
export async function cancelTrade(world,id,message='El intercambio se canceló.'){
 const tid=await world.ctx.storage.get('active-trade:'+id),t=tid&&await world.ctx.storage.get('trade:'+tid);if(t&&['invited','open'].includes(t.status))await close(world,t,'cancelled',message);
}
export async function handleTrade(world,ws,b){
 const actor=ws.deserializeAttachment(),uid=actor.user.id,storage=world.ctx.storage;
 if(b.action==='invite'){
  const target=String(b.target||''),other=world.ownSockets(target)[0];if(target===uid||!other||other.deserializeAttachment().roomId!==actor.roomId)fail('Ese jugador ya no está en la sala.');
  for(const id of [uid,target]){const prior=await storage.get('active-trade:'+id),t=prior&&await storage.get('trade:'+prior);if(t&&t.expiresAt>Date.now()&&['invited','open'].includes(t.status))fail('Uno de los jugadores ya está intercambiando.');if(t)await close(world,t,'cancelled','La invitación venció.');}
  if(Date.now()-(actor.lastTrade||0)<5000)fail('Esperá unos segundos para invitar otra vez.');actor.lastTrade=Date.now();ws.serializeAttachment(actor);
  const t={id:crypto.randomUUID(),users:[uid,target],names:[actor.user.name,other.deserializeAttachment().user.name],roomId:actor.roomId,offers:[{},{}],accepted:[false,false],status:'invited',revision:0,expiresAt:Date.now()+300000};
  await storage.put({['trade:'+t.id]:t,['active-trade:'+uid]:t.id,['active-trade:'+target]:t.id});await publish(world,t);return;
 }
 const t=typeof b.id==='string'&&await storage.get('trade:'+b.id);if(!t||!t.users.includes(uid))fail('Intercambio no disponible.');
 if(!['invited','open'].includes(t.status)){world.send(ws,{type:'trade',trade:view(t),available:await available(world,uid)});return;}
 if(t.expiresAt<Date.now()){await close(world,t,'cancelled','El intercambio venció.');return;}
 if(t.users.some(id=>!world.ownSockets(id).some(s=>s.deserializeAttachment().roomId===t.roomId))){await close(world,t,'cancelled','Un jugador salió de la sala.');return;}
 const index=t.users.indexOf(uid);
 if(b.action==='cancel'){await close(world,t,'cancelled','Intercambio cancelado. No se movió ningún objeto.');return;}
 if(b.revision!==t.revision)fail('La oferta cambió. Revisá los objetos antes de aceptar.');
 if(b.action==='join'&&t.status==='invited'&&index===1){t.status='open';t.revision++;}
 else if(b.action==='offer'&&t.status==='open'){
  if(!Array.isArray(b.items)||b.items.length>6)fail('Podés ofrecer hasta seis objetos distintos.');const stock=new Map((await available(world,uid)).map(i=>[i.id,i.count])),offer={};
  for(const item of b.items){if(!item||!catalog.has(item.id)||Object.hasOwn(offer,item.id)||!Number.isInteger(item.count)||item.count<1||item.count>99||item.count>(stock.get(item.id)||0))fail('Solo podés ofrecer unidades propias que no estén en uso.');offer[item.id]=item.count;}
  t.offers[index]=offer;t.accepted=[false,false];t.revision++;
 }else if(b.action==='accept'&&t.status==='open'){
  if(!Object.keys(t.offers[0]).length&&!Object.keys(t.offers[1]).length)fail('Agregá un objeto para intercambiar o regalar.');
  t.accepted[index]=true;
  if(t.accepted.every(Boolean)){
   // Recheck ownership inside the same serialized world operation, then commit both inventories atomically.
   const users=await Promise.all(t.users.map(id=>world.user(id)));
   for(let n=0;n<2;n++){if(users[n].banned)fail('El jugador no está disponible.');const stock=new Map((await available(world,t.users[n])).map(i=>[i.id,i.count]));for(const [id,count] of Object.entries(t.offers[n]))if(count>(stock.get(id)||0)){t.accepted=[false,false];t.revision++;await storage.put('trade:'+t.id,t);await publish(world,t);fail('Un objeto ya no está disponible. Revisen las ofertas.');}}
   for(let n=0;n<2;n++)for(const [id,count] of Object.entries(t.offers[n])){users[n].inventory[id]-=count;users[1-n].inventory[id]=(users[1-n].inventory[id]||0)+count;users[1-n].collected[id]=true;}
   t.status='completed';t.completedAt=Date.now();t.message='¡Intercambio completado!';
   await storage.transaction(async tx=>{await tx.put({['user:'+users[0].id]:users[0],['user:'+users[1].id]:users[1],['trade:'+t.id]:t});await tx.delete(t.users.map(id=>'active-trade:'+id));});
   for(const id of t.users)await world.notifyUser(id);await publish(world,t);return;
  }
 }else fail('Acción de intercambio inválida.');
 await storage.put('trade:'+t.id,t);await publish(world,t);
}
