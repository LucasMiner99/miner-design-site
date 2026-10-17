import {C} from './hub-rules.mjs';
import {balance} from './hub-economy.mjs';

export const ROULETTE={min:1,max:10000,cooldown:4000,multipliers:{red:2,black:2,green:36}};
const red=new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
export const rouletteColor=n=>n===0?'green':red.has(n)?'red':'black';
export function rouletteNumber(fill=a=>crypto.getRandomValues(a)){
 // Reject the incomplete tail rather than introducing modulo bias.
 const a=new Uint32Array(1),limit=Math.floor(4294967296/37)*37;
 do{fill(a);}while(a[0]>=limit);return a[0]%37;
}
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
async function table(world,user,input){
 if(typeof input.roomId!=='string'||!/^\d+$/.test(input.roomId)||!Number.isSafeInteger(input.itemId))fail('Ruleta inválida.');
 if(!world.ownSockets(user.id).some(ws=>ws.deserializeAttachment()?.roomId===input.roomId))fail('Entrá a la sala y tocá una ruleta colocada.',403);
 const room=await world.ctx.storage.get('room:'+input.roomId);
 if(!room?.scene.items.some(i=>i.id===input.itemId&&C.TYPES[i.type]?.interaction==='roulette'))fail('Esta ruleta ya no está colocada en la sala.',409);
}
export async function openRoulette(world,user,input){
 await table(world,user,input);const last=await world.ctx.storage.get('roulette-last:'+user.id);
 return {rules:ROULETTE,last:last?.roomId===input.roomId&&last?.itemId===input.itemId?last:null};
}
export async function betRoulette(world,user,input){
 if(!input||!Object.hasOwn(ROULETTE.multipliers,input.color)||!Number.isSafeInteger(input.amount)||input.amount<ROULETTE.min||input.amount>ROULETTE.max||typeof input.requestId!=='string'||!/^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(input.requestId))fail('Elegí un color y una apuesta de 1 a 10.000 créditos.');
 const storage=world.ctx.storage,key='roulette-bet:'+user.id+':'+input.requestId,prior=await storage.get(key);
 if(prior){
  if(['roomId','itemId','amount','color'].some(k=>prior[k]!==input[k]))fail('Ese intento ya corresponde a otra apuesta.',409);
  return prior;
 }
 await table(world,user,input);
 const last=await storage.get('roulette-last:'+user.id),now=Date.now();
 if(last&&now-last.at<ROULETTE.cooldown)fail('Esperá a que termine el giro anterior.',429);
 const before=balance(user),multiplier=ROULETTE.multipliers[input.color];
 if(before<input.amount)fail('No tenés créditos suficientes.',409);
 if(before+input.amount*(multiplier-1)>2000000000)fail('Tu saldo está demasiado cerca del límite para esta apuesta.',409);
 const number=rouletteNumber(),result=rouletteColor(number),prize=result===input.color?input.amount*multiplier:0;
 const receipt={requestId:input.requestId,userId:user.id,roomId:input.roomId,itemId:input.itemId,color:input.color,amount:input.amount,number,result,prize,before,after:before-input.amount+prize,at:now};
 user.credits=receipt.after;user.walletVersion=(user.walletVersion||0)+1;
 // HubWorld serializes HTTP/WS operations; debit, prize and permanent receipt commit together.
 await storage.transaction(async tx=>tx.put({['user:'+user.id]:user,[key]:receipt,['roulette-last:'+user.id]:receipt}));
 await world.notifyUser(user.id);return receipt;
}
