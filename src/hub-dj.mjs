import {validRoomId} from './hub-community.mjs';
import {C} from './hub-rules.mjs';
import {balance} from './hub-economy.mjs';
import {coffeeDay} from './hub-coffee.mjs';
export const DJ_LEVELS=[{name:'Entrada',bpm:90,count:8,window:190},{name:'Mezcla',bpm:115,count:12,window:155},{name:'Principal',bpm:140,count:16,window:125}];
export const DEFAULT_DJ={dailyLimit:400,rewards:[20,30,50]};
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
const uuid=v=>typeof v==='string'&&/^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(v);
export async function djConfig(storage){return {...DEFAULT_DJ,...await storage.get('dj-config')};}
export async function saveDJConfig(storage,v){if(!Number.isSafeInteger(v?.dailyLimit)||v.dailyLimit<0||v.dailyLimit>100000||!Array.isArray(v.rewards)||v.rewards.length!==3||v.rewards.some(n=>!Number.isSafeInteger(n)||n<0||n>100000))fail('Usá premios y límite enteros de 0 a 100.000 créditos.');const c={dailyLimit:v.dailyLimit,rewards:v.rewards};await storage.put('dj-config',c);return c;}
const daily=(u,c,now)=>{const earned=u.djDaily?.day===coffeeDay(now)?u.djDaily.earned:0;return {earned,limit:c.dailyLimit,remaining:Math.max(0,c.dailyLimit-earned)};};
export function makeDJRound(level,now){const config=DJ_LEVELS[level],random=new Uint32Array(config.count);crypto.getRandomValues(random);const start=now+4000,step=60000/config.bpm;return {level,...config,start,end:start+(config.count-1)*step+config.window+250,notes:[...random].map((n,i)=>({lane:n%4,at:start+i*step})),hits:{},presses:{},faults:0,version:0,finished:false};}
export function djScore(r){const hits=Object.keys(r.hits).length,net=Math.max(0,hits-r.faults);return {hits,faults:r.faults,accuracy:Math.round(net/r.count*100),passed:net>=Math.ceil(r.count*.65)};}
function publicSession(s,now){if(!s||s.expiresAt<=now)return null;const {presses,...round}=s.round;return {id:s.id,roomId:s.roomId,itemId:s.itemId,expiresAt:s.expiresAt,round,results:s.results,total:s.total,done:s.results.length===3,...djScore(s.round)};}
async function machine(world,u,input){if(!input||!validRoomId(input?.roomId)||!Number.isSafeInteger(input.itemId))fail('Mesa inválida.');if(!world.ownSockets(u.id).some(ws=>ws.deserializeAttachment()?.roomId===input.roomId))fail('Entrá a la sala para jugar.',403);const room=await world.ctx.storage.get('room:'+input.roomId);if(!room?.scene.items.some(i=>i.id===input.itemId&&C.TYPES[i.type]?.interaction==='dj'))fail('La mesa DJ ya no está colocada.',409);}
export async function djAction(world,u,action,input,now=Date.now()){
 await machine(world,u,input);const storage=world.ctx.storage,key='dj-session:'+u.id,config=await djConfig(storage);let s=await storage.get(key),receipt=null;
 const output=()=>({session:publicSession(s,now),daily:daily(u,config,now),rules:config,serverNow:now,receipt});
 if(action==='open')return output();
 if(action==='start'){
  if(!uuid(input.requestId))fail('Intento inválido.');
  if(s?.requests.includes(input.requestId))return output();
  if(s&&s.expiresAt>now&&!s.round.finished){if(s.roomId!==input.roomId||s.itemId!==input.itemId)fail('Terminá la ronda en tu otra mesa o esperá cinco minutos.',409);return output();}
  if(!s||s.expiresAt<=now||s.results.length===3)s={id:crypto.randomUUID(),requests:[],roomId:input.roomId,itemId:input.itemId,expiresAt:now+300000,results:[],total:0,rewards:config.rewards};
  if(s.roomId!==input.roomId||s.itemId!==input.itemId)fail('Terminá las tres rondas en la misma mesa.',409);
  s.requests.push(input.requestId);s.round=makeDJRound(s.results.length,now);await storage.put(key,s);return output();
 }
 if(!s||s.id!==input.sessionId||s.expiresAt<=now||s.roomId!==input.roomId||s.itemId!==input.itemId)fail('La partida terminó. Volvé a abrir la mesa.',409);
 if(!Number.isInteger(input.level)||input.level<0||input.level>2)fail('Ronda inválida.');
 if(action==='finish'&&s.results[input.level]){receipt=s.results[input.level];return output();}
 if(input.level!==s.round.level)fail('Esta ronda ya cambió.',409);const r=s.round;
 if(action==='hit'){
  if(!Number.isInteger(input.seq)||input.seq<1||input.seq>64||!Number.isInteger(input.lane)||input.lane<0||input.lane>3)fail('Pulsación inválida.');
  if(r.presses[input.seq]){if(r.presses[input.seq].lane!==input.lane)fail('Esta pulsación ya se registró.',409);receipt=r.presses[input.seq];return output();}
  if(r.finished||now>r.end||now<r.start-1500)fail('La ronda no está en juego.',409);
  const note=r.notes.findIndex((n,i)=>!r.hits[i]&&n.lane===input.lane&&Math.abs(n.at-now)<=r.window);
  receipt={seq:input.seq,lane:input.lane,note,hit:note>=0};if(note>=0)r.hits[note]=true;else r.faults++;r.presses[input.seq]=receipt;r.lastSeq=Math.max(r.lastSeq||0,input.seq);r.version++;await storage.put(key,s);return output();
 }
 if(action!=='finish')fail('Acción inválida.');if(now<r.end)fail('Esperá a que termine la ronda.',409);
 const score=djScore(r),amount=Math.min(score.passed?s.rewards[r.level]:0,daily(u,config,now).remaining),before=balance(u);if(before+amount>2000000000)fail('Tu saldo alcanzó el límite.',409);
 receipt={level:r.level,...score,amount,at:now};r.finished=true;r.version++;s.results.push(receipt);s.total+=amount;
 const updated={...u,credits:before+amount,walletVersion:(u.walletVersion||0)+1,djDaily:{day:coffeeDay(now),earned:daily(u,config,now).earned+amount}};
 await storage.transaction(async tx=>tx.put({[key]:s,['user:'+u.id]:updated}));Object.assign(u,updated);await world.notifyUser(u.id);return output();
}
