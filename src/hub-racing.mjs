import {C} from './hub-rules.mjs';
import {balance} from './hub-economy.mjs';
import {RACING,racingPrize,racingWinner} from '../public/hub/racing-rules.mjs';
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
async function machine(world,user,input){
 if(typeof input?.roomId!=='string'||!/^\d+$/.test(input.roomId)||!Number.isSafeInteger(input.itemId))fail('Máquina inválida.');
 if(!world.ownSockets(user.id).some(ws=>ws.deserializeAttachment()?.roomId===input.roomId))fail('Entrá a la sala y tocá una máquina de carreras.',403);
 const room=await world.ctx.storage.get('room:'+input.roomId);
 if(!room?.scene.items.some(i=>i.id===input.itemId&&C.TYPES[i.type]?.interaction==='racing'))fail('Esta máquina ya no está colocada en la sala.',409);
}
export async function openRacing(world,user,input){
 await machine(world,user,input);
 // The last personal receipt follows the player, even between machines.
 return {rules:RACING,last:await world.ctx.storage.get('racing-last:'+user.id)||null,serverNow:Date.now()};
}
export async function betRacing(world,user,input){
 if(!Number.isInteger(input?.horse)||!RACING.horses[input.horse]||!Number.isSafeInteger(input.amount)||input.amount<RACING.min||input.amount>RACING.max||input.amount%RACING.step||typeof input.requestId!=='string'||!/^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(input.requestId))fail('Elegí un caballo y una apuesta de 5 a 10.000 créditos, de a 5.');
 const storage=world.ctx.storage,key='racing-bet:'+user.id+':'+input.requestId,prior=await storage.get(key);
 if(prior){if(['roomId','itemId','horse','amount'].some(k=>prior[k]!==input[k]))fail('Ese intento ya corresponde a otra apuesta.',409);return prior;}
 await machine(world,user,input);
 const now=Date.now(),last=await storage.get('racing-last:'+user.id);
 if(last&&now-last.at<RACING.duration)fail('Esperá a que termine tu carrera anterior.',429);
 const before=balance(user),possible=racingPrize(input.horse,input.amount);
 if(before<input.amount)fail('No tenés créditos suficientes.',409);
 if(before-input.amount+possible>2000000000)fail('Tu saldo está demasiado cerca del límite para esta apuesta.',409);
 const winner=racingWinner(),prize=winner===input.horse?possible:0;
 const receipt={requestId:input.requestId,userId:user.id,roomId:input.roomId,itemId:input.itemId,horse:input.horse,amount:input.amount,winner,prize,before,after:before-input.amount+prize,at:now,seed:crypto.getRandomValues(new Uint32Array(1))[0]};
 user.credits=receipt.after;user.walletVersion=(user.walletVersion||0)+1;
 // HubWorld serializes requests. Stake, payout and retry receipt commit together;
 // closing the window or losing the connection can never reroll or pay twice.
 await storage.transaction(async tx=>tx.put({['user:'+user.id]:user,[key]:receipt,['racing-last:'+user.id]:receipt}));
 await world.notifyUser(user.id);return receipt;
}
