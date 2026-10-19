import {C} from './hub-rules.mjs';
import {balance} from './hub-economy.mjs';
import {coffeeDay} from './hub-coffee.mjs';
import {COURT,trajectory,judgeShot} from '../public/hub/basket-physics.mjs';
export const DEFAULT_BASKET={dailyLimit:400,creditsPerPoint:5};
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
const uuid=v=>typeof v==='string'&&/^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(v);
export async function basketConfig(storage){let c=await storage.get('basket-config');if(c&&c.rewardVersion!==2){c={...c,creditsPerPoint:5,rewardVersion:2};await storage.put('basket-config',c);}return {...DEFAULT_BASKET,...c};}
export async function saveBasketConfig(storage,v){if(!v||['dailyLimit','creditsPerPoint'].some(k=>!Number.isSafeInteger(v[k])||v[k]<0||v[k]>100000))fail('Usá valores enteros de 0 a 100.000.');const c={dailyLimit:v.dailyLimit,creditsPerPoint:v.creditsPerPoint,rewardVersion:2};await storage.put('basket-config',c);return c;}
const daily=(u,c,now)=>{const earned=u.basketDaily?.day===coffeeDay(now)?u.basketDaily.earned:0;return {earned,limit:c.dailyLimit,remaining:Math.max(0,c.dailyLimit-earned)};};
function snapshot(s,now){if(!s||s.expiresAt<=now)return null;const {requests,...view}=s;return view;}
async function machine(world,u,input){if(!input||typeof input.roomId!=='string'||!/^\d+$/.test(input.roomId)||!Number.isSafeInteger(input.itemId))fail('Máquina inválida.');if(!world.ownSockets(u.id).some(ws=>ws.deserializeAttachment()?.roomId===input.roomId))fail('Entrá a la sala para jugar.',403);const room=await world.ctx.storage.get('room:'+input.roomId);if(!room?.scene.items.some(i=>i.id===input.itemId&&C.TYPES[i.type]?.interaction==='basket'))fail('La máquina de básquet ya no está colocada.',409);}
export async function basketAction(world,u,action,input,now=Date.now()){
 await machine(world,u,input);const storage=world.ctx.storage,key='basket-session:'+u.id,recordKey='basket-record:'+input.roomId,config=await basketConfig(storage);let s=await storage.get(key),record=await storage.get(recordKey),receipt=null;if(record?.day!==coffeeDay(now))record=null;
 const output=()=>({session:snapshot(s,now),record,daily:daily(u,config,now),rules:config,serverNow:now,receipt});
 if(action==='open')return output();
 if(action==='start'){
  if(!uuid(input.requestId))fail('Intento inválido.');if(s?.requestId===input.requestId)return output();
  if(s&&!s.finished&&s.expiresAt>now){if(s.roomId!==input.roomId||s.itemId!==input.itemId)fail('Terminá la partida en la otra máquina o esperá dos minutos.',409);return output();}
  const random=new Uint32Array(1);crypto.getRandomValues(random);const start=now+3000;
  s={id:crypto.randomUUID(),requestId:input.requestId,roomId:input.roomId,itemId:input.itemId,start,end:start+COURT.duration,expiresAt:now+120000,phase:random[0]/4294967296*Math.PI*2,score:0,streak:0,bestStreak:0,baskets:0,attempts:0,version:0,requests:{},lastShot:null,finished:false,creditsPerPoint:config.creditsPerPoint};await storage.put(key,s);return output();
 }
 if(!s||s.id!==input.sessionId||s.expiresAt<=now||s.roomId!==input.roomId||s.itemId!==input.itemId)fail('La partida terminó. Volvé a abrir la máquina.',409);
 if(action==='shoot'){
  if(!uuid(input.requestId)||!Number.isFinite(input.dx)||!Number.isFinite(input.dy)||input.dx< -180||input.dx>180||input.dy< -360||input.dy> -60)fail('Tiro inválido.');
  if(s.requests[input.requestId]){const old=s.requests[input.requestId];if(old.dx!==input.dx||old.dy!==input.dy)fail('Ese tiro ya se registró.',409);receipt=old;return output();}
  if(s.finished||now<s.start||now>=s.end)fail('La partida no está en juego.',409);if(s.attempts>=30||s.lastShot&&now<s.lastShot.land+COURT.resetDelay)fail('Esperá a que vuelva la pelota.',409);
  const shot={...trajectory(input.dx,input.dy,now),id:input.requestId,dx:input.dx,dy:input.dy};shot.hit=judgeShot(shot,s.start,s.phase);s.streak=shot.hit?s.streak+1:0;shot.multiplier=s.streak>=6?3:s.streak>=3?2:1;shot.points=shot.hit?2*shot.multiplier:0;s.score+=shot.points;s.baskets+=Number(shot.hit);s.attempts++;s.bestStreak=Math.max(s.bestStreak,s.streak);s.version++;s.lastShot=shot;s.requests[input.requestId]=shot;receipt=shot;await storage.put(key,s);return output();
 }
 if(action!=='finish')fail('Acción inválida.');if(s.finished){receipt=s.result;return output();}
 if(now<Math.max(s.end,s.lastShot?.land||0))fail('Esperá a que termine la partida.',409);
 const amount=Math.min(s.score*s.creditsPerPoint,daily(u,config,now).remaining),before=balance(u);if(before+amount>2000000000)fail('Tu saldo alcanzó el límite.',409);
 const newRecord=s.score>0&&(!record||s.score>record.score);if(newRecord)record={day:coffeeDay(now),userId:u.id,name:u.name,score:s.score};
 receipt={amount,score:s.score,baskets:s.baskets,attempts:s.attempts,bestStreak:s.bestStreak,newRecord};s.result=receipt;s.finished=true;s.version++;
 const updated={...u,credits:before+amount,walletVersion:(u.walletVersion||0)+1,basketDaily:{day:coffeeDay(now),earned:daily(u,config,now).earned+amount}};
 await storage.transaction(async tx=>tx.put({[key]:s,['user:'+u.id]:updated,...(newRecord?{[recordKey]:record}:{})}));Object.assign(u,updated);await world.notifyUser(u.id);return output();
}
