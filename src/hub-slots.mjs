import {validRoomId} from './hub-community.mjs';
import {C} from './hub-rules.mjs';
import {balance} from './hub-economy.mjs';
import {SLOTS,slotStops,slotPrize,slotMultiplier} from '../public/hub/slots-rules.mjs';
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
async function machine(world,user,input){
 if(!validRoomId(input?.roomId)||!Number.isSafeInteger(input.itemId))fail('Máquina inválida.');
 if(!world.ownSockets(user.id).some(ws=>ws.deserializeAttachment()?.roomId===input.roomId))fail('Entrá a la sala y tocá una tragamonedas.',403);
 const room=await world.ctx.storage.get('room:'+input.roomId);
 if(!room?.scene.items.some(i=>i.id===input.itemId&&C.TYPES[i.type]?.interaction==='slots'))fail('Esta tragamonedas ya no está colocada en la sala.',409);
}
export async function openSlots(world,user,input){await machine(world,user,input);return {rules:SLOTS,last:await world.ctx.storage.get('slots-last:'+user.id)||null,serverNow:Date.now()};}
export async function betSlots(world,user,input){
 if(!Number.isSafeInteger(input?.amount)||input.amount<SLOTS.min||input.amount>SLOTS.max||typeof input.requestId!=='string'||!/^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(input.requestId))fail('Elegí una apuesta de 1 a 100 créditos enteros.');
 const storage=world.ctx.storage,key='slots-bet:'+user.id+':'+input.requestId,prior=await storage.get(key);
 if(prior){if(['roomId','itemId','amount'].some(k=>prior[k]!==input[k]))fail('Ese intento ya corresponde a otra apuesta.',409);return prior;}
 await machine(world,user,input);
 const now=Date.now(),last=await storage.get('slots-last:'+user.id);
 if(last&&now-last.at<SLOTS.duration)fail('Esperá a que terminen de girar los rodillos.',429);
 const before=balance(user);if(before<input.amount)fail('No tenés créditos suficientes.',409);
 if(before-input.amount+input.amount*SLOTS.maxMultiplier>2000000000)fail('Tu saldo está demasiado cerca del límite para esta apuesta.',409);
 const stops=slotStops(),prize=slotPrize(stops,input.amount),multiplier=slotMultiplier(stops);
 const receipt={requestId:input.requestId,userId:user.id,roomId:input.roomId,itemId:input.itemId,amount:input.amount,stops,multiplier,prize,before,after:before-input.amount+prize,at:now};
 user.credits=receipt.after;user.walletVersion=(user.walletVersion||0)+1;
 // HubWorld serializes all wallet actions. Debit, prize and retry receipt are atomic.
 await storage.transaction(async tx=>tx.put({['user:'+user.id]:user,[key]:receipt,['slots-last:'+user.id]:receipt}));
 await world.notifyUser(user.id);return receipt;
}
