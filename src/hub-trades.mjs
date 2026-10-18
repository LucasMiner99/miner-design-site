import {balance} from './hub-economy.mjs';
import {transferItemCopies} from './hub-item-provenance.mjs';
import {C,CATALOG} from './hub-rules.mjs';
const catalog=new Map(CATALOG.map(i=>[i.id,i]));
const fail=message=>{throw Object.assign(Error(message),{status:400});};
export function tradeInventory(user,room,admin=false){
 // Admin catalog units are grants, not the player's earned inventory.
 if(admin)return CATALOG.filter(i=>!i.starter).map(i=>({...i,count:i.kind==='object'?96:1}));
 const used=new Map(),take=id=>used.set(id,(used.get(id)||0)+1);
 for(const i of [...room.scene.items,...(room.scene.unplacedItems||[])])take('object:'+i.type);
 for(const [slot,index] of Object.entries(user.appearance))take(`look:${slot}:${index}`);
 for(const [slot,index] of Object.entries(room.scene))if(Object.hasOwn(C.ENV_COUNTS,slot))take(`environment:${slot}:${index}`);
 take('environment:layout:'+C.LAYOUTS.findIndex(l=>l.id===room.scene.layout));
 return Object.entries(user.inventory).flatMap(([id,count])=>{const item=catalog.get(id),available=Math.max(0,count-(used.get(id)||0));return item&&!item.starter&&available?[{...item,count:available}]:[];});
}
function adminAccess(world,id){return world.ownSockets(id).some(ws=>{const u=ws.deserializeAttachment()?.user;return u?.id===id&&u.admin===true;});}
async function available(world,id){const user=await world.user(id);return tradeInventory(user,await world.room(id,user.name),adminAccess(world,id));}
function view(t){return {...t,offers:t.offers.map(offer=>Object.entries(offer).map(([id,count])=>({...catalog.get(id),count})))};}
async function publish(world,t){for(const id of t.users)for(const ws of world.ownSockets(id))world.send(ws,{type:'trade',trade:view(t),available:await available(world,id),creditsAvailable:balance(await world.user(id))});}
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
  const t={id:crypto.randomUUID(),users:[uid,target],names:[actor.user.name,other.deserializeAttachment().user.name],roomId:actor.roomId,offers:[{},{}],credits:[0,0],accepted:[false,false],status:'invited',revision:0,expiresAt:Date.now()+300000};
  await storage.put({['trade:'+t.id]:t,['active-trade:'+uid]:t.id,['active-trade:'+target]:t.id});await publish(world,t);return;
 }
 const t=typeof b.id==='string'&&await storage.get('trade:'+b.id);if(!t||!t.users.includes(uid))fail('Intercambio no disponible.');
 if(!['invited','open'].includes(t.status)){world.send(ws,{type:'trade',trade:view(t),available:await available(world,uid),creditsAvailable:balance(await world.user(uid))});return;}
 if(t.expiresAt<Date.now()){await close(world,t,'cancelled','El intercambio venció.');return;}
 if(t.users.some(id=>!world.ownSockets(id).some(s=>s.deserializeAttachment().roomId===t.roomId))){await close(world,t,'cancelled','Un jugador salió de la sala.');return;}
 t.credits??=[0,0];
 const index=t.users.indexOf(uid);
 if(b.action==='cancel'){await close(world,t,'cancelled','Intercambio cancelado. No se movieron objetos ni créditos.');return;}
 if(b.revision!==t.revision)fail('La oferta cambió. Revisá la oferta antes de aceptar.');
 if(b.action==='join'&&t.status==='invited'&&index===1){t.status='open';t.revision++;}
 else if(b.action==='offer'&&t.status==='open'){
  if(!Array.isArray(b.items)||b.items.length>6)fail('Podés ofrecer hasta seis objetos distintos.');const stock=new Map((await available(world,uid)).map(i=>[i.id,i.count])),offer={};
  for(const item of b.items){if(!item||!catalog.has(item.id)||Object.hasOwn(offer,item.id)||!Number.isInteger(item.count)||item.count<1||item.count>99||item.count>(stock.get(item.id)||0))fail('Solo podés ofrecer unidades propias que no estén en uso.');offer[item.id]=item.count;}
  const credits=b.credits===undefined?t.credits[index]:b.credits;
  if(!Number.isSafeInteger(credits)||credits<0||credits>2000000000||credits>balance(await world.user(uid)))fail('Solo podés ofrecer créditos disponibles en tu saldo.');
  t.credits[index]=credits;t.offers[index]=offer;t.accepted=[false,false];t.revision++;
 }else if(b.action==='accept'&&t.status==='open'){
  if(!Object.keys(t.offers[0]).length&&!Object.keys(t.offers[1]).length&&!t.credits.some(Boolean))fail('Agregá objetos o créditos para intercambiar o regalar.');
  t.accepted[index]=true;
  if(t.accepted.every(Boolean)){
   // Recheck ownership inside the same serialized world operation, then commit both inventories atomically.
   const users=await Promise.all(t.users.map(id=>world.user(id)));
   for(let n=0;n<2;n++){if(users[n].banned)fail('El jugador no está disponible.');const stock=new Map((await available(world,t.users[n])).map(i=>[i.id,i.count]));for(const [id,count] of Object.entries(t.offers[n]))if(count>(stock.get(id)||0)){t.accepted=[false,false];t.revision++;await storage.put('trade:'+t.id,t);await publish(world,t);fail('Un objeto ya no está disponible. Revisen las ofertas.');}}
   for(let n=0;n<2;n++){const after=balance(users[n])-t.credits[n]+t.credits[1-n];if(balance(users[n])<t.credits[n]||after>2000000000){t.accepted=[false,false];t.revision++;await storage.put('trade:'+t.id,t);await publish(world,t);fail('El saldo cambió o supera el límite. Revisen los créditos ofrecidos.');}}
   for(let n=0;n<2;n++){users[n].credits=balance(users[n])-t.credits[n]+t.credits[1-n];users[n].walletVersion=(users[n].walletVersion||0)+1;}
   t.adminGrants=t.users.map(id=>adminAccess(world,id));
   t.exchangeLocked=transferItemCopies(users,t.offers,t.adminGrants);
   t.status='completed';t.completedAt=Date.now();t.message='¡Intercambio completado!';
   await storage.transaction(async tx=>{await tx.put({['user:'+users[0].id]:users[0],['user:'+users[1].id]:users[1],['trade:'+t.id]:t});await tx.delete(t.users.map(id=>'active-trade:'+id));});
   for(const id of t.users)await world.notifyUser(id);await publish(world,t);return;
  }
 }else fail('Acción de intercambio inválida.');
 await storage.put('trade:'+t.id,t);await publish(world,t);
}
