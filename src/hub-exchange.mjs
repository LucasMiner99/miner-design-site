import {C,CATALOG} from './hub-rules.mjs';
import {tradeInventory} from './hub-trades.mjs';
import {lockedCopies} from './hub-item-provenance.mjs';
const catalog=new Map(CATALOG.map(i=>[i.id,i]));
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
async function machine(world,user,input){
 if(!input||typeof input.roomId!=='string'||!/^\d+$/.test(input.roomId)||!Number.isSafeInteger(input.itemId))fail('Máquina inválida.');
 if(!world.ownSockets(user.id).some(ws=>ws.deserializeAttachment()?.roomId===input.roomId))fail('Entrá a la sala y tocá una máquina de intercambio.',403);
 const room=await world.ctx.storage.get('room:'+input.roomId);
 if(!room?.scene.items.some(i=>i.id===input.itemId&&C.TYPES[i.type]?.interaction==='exchange'))fail('La máquina ya no está colocada en esta sala.',409);
}
function unseen(user,kind){
 return CATALOG.filter(i=>i.kind===kind&&!i.starter&&!i.plantation&&!user.collected?.[i.id]&&!(user.inventory?.[i.id]>0));
}
async function choices(world,user){
 const own=await world.room(user.id,user.name),free=new Map(tradeInventory(user,own,false).map(i=>[i.id,i.count]));
 const kinds=new Set(['object','character','environment'].filter(kind=>unseen(user,kind).length));
 return Object.entries(user.inventory||{}).flatMap(([id,count])=>{
  const item=catalog.get(id),available=Math.min(count-1,free.get(id)||0,count-lockedCopies(user,id));
  return item&&!item.starter&&!item.plantation&&available>0?[{...item,count,available,complete:!kinds.has(item.kind)}]:[];
 });
}
export async function openExchange(world,user,input){
 await machine(world,user,input);
 return {items:await choices(world,user)};
}
export async function exchangeItem(world,user,input){
 if(!input||typeof input.sourceId!=='string'||!catalog.has(input.sourceId)||typeof input.requestId!=='string'||!/^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(input.requestId))fail('Elegí un repetido disponible.');
 const storage=world.ctx.storage,key='exchange:'+user.id+':'+input.requestId,prior=await storage.get(key);
 if(prior){if(['roomId','itemId','sourceId'].some(k=>prior[k]!==input[k]))fail('Este intento ya corresponde a otro canje.',409);return prior;}
 await machine(world,user,input);
 const tid=await storage.get('active-trade:'+user.id),trade=tid&&await storage.get('trade:'+tid);
 if(trade&&['invited','open'].includes(trade.status)&&trade.expiresAt>Date.now())fail('Terminá o cancelá el intercambio con otro jugador antes de usar la máquina.',409);
 const source=(await choices(world,user)).find(i=>i.id===input.sourceId);
 if(!source)fail('Necesitás una copia repetida libre que no haya salido de la máquina.',409);
 const pool=unseen(user,source.kind);if(!pool.length)fail('Ya completaste esta categoría. No consumimos tu objeto.',409);
 // Uniform server-side draw with rejection sampling; the browser never chooses the reward.
 const random=new Uint32Array(1),limit=Math.floor(4294967296/pool.length)*pool.length;
 do{crypto.getRandomValues(random);}while(random[0]>=limit);
 const prize=pool[random[0]%pool.length];
 const receipt={requestId:input.requestId,userId:user.id,roomId:input.roomId,itemId:input.itemId,sourceId:source.id,rewardId:prize.id,kind:prize.kind,at:Date.now(),copyOriginVersion:1};
 const updated={...user,inventory:{...user.inventory,[source.id]:user.inventory[source.id]-1,[prize.id]:(user.inventory[prize.id]||0)+1},collected:{...user.collected,[prize.id]:true},exchangeLocked:{...user.exchangeLocked,[prize.id]:lockedCopies(user,prize.id)+1},walletVersion:(user.walletVersion||0)+1};
 // HTTP and WebSocket operations share HubWorld's serialization. Debit, grant,
 // copy provenance and permanent replay receipt commit atomically.
 await storage.transaction(async tx=>tx.put({['user:'+user.id]:updated,[key]:receipt}));
 Object.assign(user,updated);await world.notifyUser(user.id);return receipt;
}
