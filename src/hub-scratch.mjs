import {validRoomId} from './hub-community.mjs';
import {C} from './hub-rules.mjs';
import {balance} from './hub-economy.mjs';
import {SCRATCH,scratchTicket,scratchResult} from '../public/hub/scratch-rules.mjs';
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
const uuid=v=>typeof v==='string'&&/^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(v);
const key=(user,id)=>'scratch:'+user+':'+id,lastKey=user=>'scratch-last:'+user;
const publicTicket=t=>t?{id:t.id,amount:t.amount,symbols:t.symbols,status:t.status,...(t.status==='claimed'?{prize:t.prize,multiplier:t.multiplier}:{})}:null;
async function table(world,user,input){
 if(!validRoomId(input?.roomId)||!Number.isSafeInteger(input.itemId))fail('Mesa inválida.');
 if(!world.ownSockets(user.id).some(ws=>ws.deserializeAttachment()?.roomId===input.roomId))fail('Entrá a la sala y tocá una mesa de raspaditas.',403);
 const room=await world.ctx.storage.get('room:'+input.roomId);
 if(!room?.scene.items.some(i=>i.id===input.itemId&&C.TYPES[i.type]?.interaction==='scratch'))fail('Esta mesa ya no está colocada.',409);
}
async function current(storage,user){const id=await storage.get(lastKey(user));return id?await storage.get(key(user,id)):null;}
export async function scratch(world,user,action,input){
 if(!input||typeof input!=='object')fail('Solicitud inválida.');const storage=world.ctx.storage;
 if(action==='open'){await table(world,user,input);return {ticket:publicTicket(await current(storage,user.id))};}
 if(action==='buy'){
  if(!uuid(input.requestId)||!SCRATCH.prices.includes(input.amount))fail('Elegí un boleto de 10, 25, 50 o 100 créditos.');
  const prior=await storage.get(key(user.id,input.requestId));
  if(prior){if(['roomId','itemId','amount'].some(k=>prior[k]!==input[k]))fail('Ese intento corresponde a otro boleto.',409);return {ticket:publicTicket(prior)};}
  await table(world,user,input);const previous=await current(storage,user.id);
  if(previous?.status==='pending')fail('Terminá de rascar tu boleto antes de comprar otro.',409);
  if(previous&&Date.now()-previous.at<1200)fail('Esperá un instante antes de comprar otro boleto.',429);
  if(balance(user)<input.amount)fail('No tenés créditos suficientes.',409);
  if(balance(user)-input.amount+input.amount*SCRATCH.maxMultiplier>2000000000)fail('Tu saldo está demasiado cerca del límite para comprar este boleto.',409);
  const symbols=scratchTicket(),{multiplier}=scratchResult(symbols),ticket={id:input.requestId,roomId:input.roomId,itemId:input.itemId,amount:input.amount,symbols,multiplier,prize:input.amount*multiplier,status:'pending',at:Date.now()};
  user.credits=balance(user)-input.amount;user.walletVersion=(user.walletVersion||0)+1;
  // Debit and immutable ticket are written together; retrying cannot buy a second ticket.
  await storage.transaction(async tx=>tx.put({['user:'+user.id]:user,[key(user.id,ticket.id)]:ticket,[lastKey(user.id)]:ticket.id}));
  await world.notifyUser(user.id);return {ticket:publicTicket(ticket)};
 }
 if(action!=='claim'||!uuid(input.ticketId))fail('Boleto inválido.');
 const ticket=await storage.get(key(user.id,input.ticketId));if(!ticket)fail('No encontramos ese boleto.',404);
 if(ticket.status==='claimed')return {ticket:publicTicket(ticket)};
 const after=balance(user)+ticket.prize;if(after>2000000000)fail('Usá algunos créditos antes de cobrar este boleto. Tu premio queda guardado.',409);
 // Claiming an owned, paid ticket is allowed even if its table was removed. No client prize is trusted.
 const claimed={...ticket,status:'claimed'};user.credits=after;user.walletVersion=(user.walletVersion||0)+1;
 await storage.transaction(async tx=>tx.put({['user:'+user.id]:user,[key(user.id,ticket.id)]:claimed}));
 await world.notifyUser(user.id);return {ticket:publicTicket(claimed)};
}
