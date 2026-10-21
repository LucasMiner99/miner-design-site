import {validRoomId} from './hub-community.mjs';
import {C} from './hub-rules.mjs';
import {balance} from './hub-economy.mjs';
import {BLACKJACK,handValue} from '../public/hub/blackjack-rules.mjs';
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
const uuid=v=>typeof v==='string'&&/^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(v);
const key=(id,hand)=>'blackjack:'+id+':'+hand,lastKey=id=>'blackjack-last:'+id;
export function shuffleShoe(fill=a=>crypto.getRandomValues(a)){
 const deck=Array.from({length:52*BLACKJACK.decks},(_,i)=>i%52),a=new Uint32Array(1);
 for(let i=deck.length-1;i>0;i--){const n=i+1,limit=Math.floor(4294967296/n)*n;do{fill(a);}while(a[0]>=limit);const j=a[0]%n;[deck[i],deck[j]]=[deck[j],deck[i]];}return deck;
}
function finish(hand){
 const p=handValue(hand.player),d=handValue(hand.dealer);let outcome;
 if(p.bust)outcome='bust';else if(p.blackjack&&d.blackjack)outcome='push';else if(p.blackjack)outcome='blackjack';else if(d.blackjack)outcome='dealer-blackjack';else if(d.bust||p.total>d.total)outcome='win';else outcome=p.total===d.total?'push':'loss';
 // Completed receipts need the visible cards and actions, not the unused shoe.
 const {deck,cursor,...receipt}=hand;
 return {...receipt,status:'finished',outcome,payout:outcome==='blackjack'?hand.amount+Math.floor(hand.amount*1.5):outcome==='win'?hand.stake*2:outcome==='push'?hand.stake:0};
}
export function newHand(id,amount,deck=shuffleShoe()){
 let h={id,amount,stake:amount,deck,cursor:4,player:[deck[0],deck[2]],dealer:[deck[1],deck[3]],status:'playing',revision:0,actions:[],at:Date.now()};
 if(handValue(h.player).blackjack||handValue(h.dealer).blackjack)h=finish(h);return h;
}
export function playHand(original,action){
 if(original.status!=='playing')fail('Esta mano ya terminó.',409);
 if(!['hit','stand','double'].includes(action))fail('Jugada inválida.');
 if(action==='double'&&original.player.length!==2)fail('Solo podés doblar con las dos primeras cartas.',409);
 let h={...original,player:[...original.player],dealer:[...original.dealer],revision:original.revision+1};
 if(action==='double')h.stake+=h.amount;
 if(action!=='stand')h.player.push(h.deck[h.cursor++]);
 if(handValue(h.player).bust)return finish(h);
 if(action==='hit'&&handValue(h.player).total<21)return h;
 while(handValue(h.dealer).total<BLACKJACK.dealerStand)h.dealer.push(h.deck[h.cursor++]);
 return finish(h);
}
export function publicHand(h,user){if(!h)return null;return {id:h.id,amount:h.amount,stake:h.stake,player:h.player,dealer:h.status==='finished'?h.dealer:[h.dealer[0],null],status:h.status,revision:h.revision,outcome:h.outcome||null,payout:h.payout??null,canDouble:h.status==='playing'&&h.player.length===2&&balance(user)>=h.amount};}
async function table(world,user,input){
 if(!validRoomId(input?.roomId)||!Number.isSafeInteger(input.itemId))fail('Mesa inválida.');
 if(!world.ownSockets(user.id).some(ws=>ws.deserializeAttachment()?.roomId===input.roomId))fail('Entrá a la sala y tocá una mesa de blackjack.',403);
 const room=await world.ctx.storage.get('room:'+input.roomId);
 if(!room?.scene.items.some(i=>i.id===input.itemId&&C.TYPES[i.type]?.interaction==='blackjack'))fail('Esta mesa ya no está colocada. Podés retomar tu mano en otra mesa de blackjack.',409);
}
async function current(world,user){const id=await world.ctx.storage.get(lastKey(user.id));return id?await world.ctx.storage.get(key(user.id,id)):null;}
async function commit(world,user,hand,debit,payout){
 const after=balance(user)-debit+payout;if(after<0)fail('No tenés créditos suficientes.',409);if(after>2000000000)fail('Tu saldo está cerca del límite. Usá algunos créditos antes de terminar la mano.',409);
 const wallet=debit!==0||hand.status==='finished';if(wallet){user.credits=after;user.walletVersion=(user.walletVersion||0)+1;}
 await world.ctx.storage.transaction(async tx=>tx.put({[key(user.id,hand.id)]:hand,[lastKey(user.id)]:hand.id,...(wallet?{['user:'+user.id]:user}:{})}));
 if(wallet)await world.notifyUser(user.id);return {game:publicHand(hand,user)};
}
export async function blackjack(world,user,action,input){
 if(!input||typeof input!=='object')fail('Solicitud inválida.');
 if(action==='open'){await table(world,user,input);return {game:publicHand(await current(world,user),user),rules:BLACKJACK};}
 if(!uuid(input.requestId))fail('Solicitud inválida.');
 if(action==='start'){
  if(!Number.isSafeInteger(input.amount)||input.amount<BLACKJACK.min||input.amount>BLACKJACK.max)fail('Apostá entre 1 y 100 créditos enteros.');
  const prior=await world.ctx.storage.get(key(user.id,input.requestId));
  if(prior){if(prior.amount!==input.amount||prior.roomId!==input.roomId||prior.itemId!==input.itemId)fail('Ese intento corresponde a otra apuesta.',409);return {game:publicHand(prior,user)};}
  await table(world,user,input);const previous=await current(world,user);
  if(previous?.status==='playing')fail('Terminá tu mano pendiente antes de apostar otra vez.',409);
  if(previous&&Date.now()-previous.at<1200)fail('Esperá un instante antes de repartir otra mano.',429);
  if(balance(user)<input.amount)fail('No tenés créditos suficientes.',409);
  if(balance(user)+input.amount*3>2000000000)fail('Tu saldo está demasiado cerca del límite para apostar.',409);
  const hand={...newHand(input.requestId,input.amount),roomId:input.roomId,itemId:input.itemId};return commit(world,user,hand,input.amount,hand.payout||0);
 }
 if(action!=='play'||!uuid(input.handId)||!Number.isSafeInteger(input.revision)||input.revision<0||!['hit','stand','double'].includes(input.action))fail('Jugada inválida.');
 const hand=await world.ctx.storage.get(key(user.id,input.handId));if(!hand)fail('No encontramos esa mano.',404);
 const fingerprint=JSON.stringify([input.action,input.revision,input.roomId,input.itemId]),prior=hand.actions.find(a=>a.id===input.requestId);
 if(prior){if(prior.fingerprint!==fingerprint)fail('Ese intento corresponde a otra jugada.',409);return {game:publicHand(hand,user)};}
 await table(world,user,input);
 if(hand.status!=='playing'||hand.revision!==input.revision)fail('La mano cambió. Cerrá y abrí la mesa para retomarla.',409);
 const debit=input.action==='double'?hand.amount:0;if(balance(user)<debit)fail('No tenés créditos suficientes para doblar.',409);
 const next=playHand(hand,input.action);next.actions=[...hand.actions,{id:input.requestId,fingerprint}];return commit(world,user,next,debit,next.payout||0);
}
