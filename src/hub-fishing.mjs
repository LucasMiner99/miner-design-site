import {C} from './hub-rules.mjs';
import {balance} from './hub-economy.mjs';
import {coffeeDay} from './hub-coffee.mjs';
import {FISHING,fishOf,rollFish,initialFishing,advanceFishing,fishingReward,insertRecord,compareSize,compareRarity} from '../public/hub/fishing-rules.mjs';
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
const uuid=v=>typeof v==='string'&&/^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(v);
const random=()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296;
export async function fishingConfig(storage){return {dailyLimit:400,...await storage.get('fishing-config')};}
export async function saveFishingConfig(storage,v){if(!Number.isSafeInteger(v?.dailyLimit)||v.dailyLimit<0||v.dailyLimit>100000)fail('Usá un límite entero entre 0 y 100.000.');const c={dailyLimit:v.dailyLimit};await storage.put('fishing-config',c);return c;}
const daily=(u,c,now)=>{const earned=u.fishingDaily?.day===coffeeDay(now)?u.fishingDaily.earned:0;return {earned,limit:c.dailyLimit,remaining:Math.max(0,c.dailyLimit-earned)};};
async function machine(world,u,input){
 if(!input||typeof input.roomId!=='string'||!/^\d+$/.test(input.roomId)||!Number.isSafeInteger(input.itemId))fail('Máquina inválida.');
 if(!world.ownSockets(u.id).some(ws=>ws.deserializeAttachment()?.roomId===input.roomId))fail('Entrá a la sala para pescar.',403);
 const room=await world.ctx.storage.get('room:'+input.roomId);
 if(!room?.scene.items.some(i=>i.id===input.itemId&&C.TYPES[i.type]?.interaction==='fishing'))fail('La máquina de pesca ya no está colocada.',409);
}
export async function fishingAction(world,u,action,input,now=Date.now()){
 await machine(world,u,input);
 const storage=world.ctx.storage,key='fishing-session:'+u.id,profileKey='fishing-profile:'+u.id,rankKey='fishing-ranking';
 const config=await fishingConfig(storage);let s=await storage.get(key),profile,ranking;
 async function records(){profile??=await storage.get(profileKey)||{caught:0,best:{}};ranking??=await storage.get(rankKey)||{size:[],rarity:[]};}
 if(action!=='input'||s?.state.done)await records();
 const output=()=>{const {lastBatch,...session}=s||{};return {session:s?session:null,...(profile?{profile,ranking}:{}),daily:daily(u,config,now),serverNow:now};};
 async function settle(){
  if(!s.state.done||s.settled)return;
  s.settled=true;
  if(!s.state.won){s.result={caught:false,amount:0};await storage.put(key,s);return;}
  await records();
  const f=fishOf(s),amount=Math.min(fishingReward(s),daily(u,config,now).remaining,Math.max(0,2000000000-balance(u)));
  const entry={id:s.id,userId:u.id,name:u.name,species:s.species,lengthMm:s.lengthMm,rank:f.rank,at:now};
  const previous=profile.best[s.species],personalBest=!previous||entry.lengthMm>previous.lengthMm;
  profile={caught:profile.caught+1,best:{...profile.best,...(personalBest?{[s.species]:entry}:{})}};
  ranking={size:insertRecord(ranking.size,entry,compareSize),rarity:insertRecord(ranking.rarity,entry,compareRarity)};
  s.result={caught:true,amount,fish:entry,personalBest};
  const updated={...u,credits:balance(u)+amount,walletVersion:(u.walletVersion||0)+1,fishingDaily:{day:coffeeDay(now),earned:daily(u,config,now).earned+amount}};
  await storage.transaction(async tx=>tx.put({[key]:s,[profileKey]:profile,[rankKey]:ranking,['user:'+u.id]:updated}));
  Object.assign(u,updated);await world.notifyUser(u.id);
 }
 if(s&&!s.state.done&&s.expiresAt<=now){s.state={...s.state,done:true,won:false};await settle();}
 if(action==='open'||action==='ranking')return output();
 if(action==='start'){
  if(!uuid(input.requestId))fail('Intento inválido.');
  if(s?.requestId===input.requestId)return output();
  if(s&&!s.state.done){if(s.roomId!==input.roomId||s.itemId!==input.itemId)fail('Tenés una pesca en otra máquina. Terminá allí o esperá unos segundos.',409);return output();}
  if(s&&now<s.nextCastAt)fail('Preparando la caña. Esperá unos segundos.',409);
  s={id:crypto.randomUUID(),requestId:input.requestId,roomId:input.roomId,itemId:input.itemId,...rollFish(random),startAt:now+1600,expiresAt:now+FISHING.sessionMs,nextCastAt:now+FISHING.castDelay,state:initialFishing(),settled:false};
  await storage.put(key,s);return output();
 }
 if(!s||s.id!==input.sessionId||s.roomId!==input.roomId||s.itemId!==input.itemId)fail('Esa pesca ya terminó. Volvé a abrir la máquina.',409);
 if(action==='cancel'){
  if(!s.state.done){s.state={...s.state,done:true,won:false};await settle();}return output();
 }
 if(action!=='input')fail('Acción inválida.');
 if(!uuid(input.requestId)||!Number.isSafeInteger(input.from)||!Array.isArray(input.inputs)||!input.inputs.length||input.inputs.length>FISHING.batchLimit||input.inputs.some(v=>v!==0&&v!==1))fail('Movimiento inválido.');
 const signature=JSON.stringify([input.from,input.inputs]);
 if(s.lastBatch?.id===input.requestId){if(s.lastBatch.signature!==signature)fail('Ese movimiento ya fue registrado.',409);return output();}
 if(s.state.done)return output();
 if(input.from!==s.state.tick)fail('La pesca cambió en otra ventana. Volvé a abrirla.',409);
 if(now+FISHING.leadMs<s.startAt+(input.from+input.inputs.length)*FISHING.stepMs)fail('Esperá a que avance la pesca.',409);
 // Clients submit only held/released input. Never accept scores, fish sizes,
 // catch outcomes or credit amounts. Every tick and award is computed here.
 advanceFishing(s,input.inputs);s.lastBatch={id:input.requestId,signature};
 if(s.state.done)await settle();else await storage.put(key,s);
 return output();
}
