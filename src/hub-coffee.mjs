import {C} from './hub-rules.mjs';
import {balance} from './hub-economy.mjs';

export const DEFAULT_COFFEE={dailyLimit:400,orderReward:10,completionReward:10,perfectReward:2};
export const RECIPES=[
 {id:'espresso',name:'Café solo',ingredients:['coffee']},
 {id:'sweet',name:'Café dulce',ingredients:['coffee','sugar']},
 {id:'latte',name:'Café con leche',ingredients:['coffee','milk']},
 {id:'iced',name:'Café helado',ingredients:['coffee','milk','ice']},
 {id:'mocha',name:'Moca',ingredients:['coffee','milk','cocoa']}
];
export const PREP_MS=6000,SESSION_MS=300000,POUR_MS=1800;
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
const uuid=v=>typeof v==='string'&&/^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(v);
const random=()=>{const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]/4294967296;};
export const coffeeDay=now=>new Date(now-3*3600000).toISOString().slice(0,10);
export async function coffeeConfig(storage){return {...DEFAULT_COFFEE,...await storage.get('coffee-config')};}
export async function saveCoffeeConfig(storage,value){
 const result={};for(const key of Object.keys(DEFAULT_COFFEE)){const n=value?.[key];if(!Number.isSafeInteger(n)||n<0||n>100000)fail('Usá valores enteros entre 0 y 100.000 créditos.');result[key]=n;}
 await storage.put('coffee-config',result);return result;
}
function daily(user,config,now){const earned=user.coffeeDaily?.day===coffeeDay(now)?user.coffeeDaily.earned:0;return {earned,limit:config.dailyLimit,remaining:Math.max(0,config.dailyLimit-earned)};}
function view(session,now){
 if(!session||session.expiresAt<=now)return null;
 return {id:session.id,roomId:session.roomId,itemId:session.itemId,index:session.index,done:session.index===3,expiresAt:session.expiresAt,
  order:session.index<3?RECIPES.find(r=>r.id===session.recipes[session.index]):null,
  prepareAt:session.orderAt+PREP_MS,pour:session.pour||null,total:session.total,results:session.results,rules:session.rules};
}
async function machine(world,user,input){
 if(!input||typeof input.roomId!=='string'||!/^\d+$/.test(input.roomId)||!Number.isSafeInteger(input.itemId))fail('Cafetera inválida.');
 if(!world.ownSockets(user.id).some(ws=>ws.deserializeAttachment()?.roomId===input.roomId))fail('Entrá a la sala para usar la cafetera.',403);
 const room=await world.ctx.storage.get('room:'+input.roomId);
 if(!room?.scene.items.some(i=>i.id===input.itemId&&C.TYPES[i.type]?.interaction==='coffee'))fail('Esta cafetera ya no está colocada.',409);
}
// One persisted shift per user, across every room/machine. Only server recipes,
// receipt times and saved rules determine awards; client amounts are ignored.
export async function coffeeAction(world,user,action,input,now=Date.now()){
 await machine(world,user,input);
 const storage=world.ctx.storage,key='coffee-session:'+user.id,config=await coffeeConfig(storage);
 let session=await storage.get(key),receipt=null;
 const output=()=>({session:view(session,now),daily:daily(user,config,now),rules:config,serverNow:now,receipt});
 if(action==='open')return output();
 if(action==='start'){
  if(!uuid(input.requestId))fail('Turno inválido.');
  if(session?.requestId===input.requestId)return output();
  if(session&&session.expiresAt>now&&session.index<3){
   if(session.roomId!==input.roomId||session.itemId!==input.itemId)fail('Terminá tu turno en la otra cafetera o esperá cinco minutos.',409);
   return output();
  }
  session={id:crypto.randomUUID(),requestId:input.requestId,roomId:input.roomId,itemId:input.itemId,recipes:[random()<.5?'espresso':'sweet','latte',random()<.5?'iced':'mocha'],index:0,orderAt:now,expiresAt:now+SESSION_MS,total:0,results:[],rules:config};
  await storage.put(key,session);return output();
 }
 if(!['pour','serve'].includes(action))fail('Acción inválida.');
 if(!session||session.id!==input.sessionId||session.expiresAt<=now||session.roomId!==input.roomId||session.itemId!==input.itemId)fail('El turno terminó. Volvé a abrir la cafetera.',409);
 if(!Number.isInteger(input.index)||input.index<0||input.index>2)fail('Pedido inválido.');
 if(action==='serve'&&input.index<session.index){receipt=session.results[input.index];return output();}
 if(input.index!==session.index)fail('Este pedido ya cambió.',409);
 if(action==='pour'){
  const recipe=RECIPES.find(r=>r.id===session.recipes[session.index]);
  if(!Array.isArray(input.ingredients)||input.ingredients.length!==recipe.ingredients.length||new Set(input.ingredients).size!==input.ingredients.length||!recipe.ingredients.every(i=>input.ingredients.includes(i)))fail('Revisá los ingredientes del pedido. Podés vaciar la taza y volver a probar.');
  if(!session.pour){const start=Math.max(now+700,session.orderAt+PREP_MS);session.pour={start,duration:POUR_MS,target:.36+random()*.22,width:.2};await storage.put(key,session);}
  return output();
 }
 if(!session.pour||now<session.pour.start)fail('Esperá a que termine de prepararse.',409);
 const p=session.pour,phase=(now-p.start)/p.duration,perfect=phase>=p.target&&phase<=p.target+p.width;
 const requested=session.rules.orderReward+(perfect?session.rules.perfectReward:0)+(session.index===2?session.rules.completionReward:0);
 const amount=Math.min(requested,daily(user,config,now).remaining),before=balance(user);
 if(before+amount>2000000000)fail('Tu saldo alcanzó el límite.',409);
 receipt={index:session.index,perfect,amount,completion:session.index===2,at:now};session.results.push(receipt);session.total+=amount;session.index++;session.pour=null;session.orderAt=now;
 const updated={...user,credits:before+amount,walletVersion:(user.walletVersion||0)+1,coffeeDaily:{day:coffeeDay(now),earned:daily(user,config,now).earned+amount}};
 await storage.transaction(async tx=>tx.put({[key]:session,['user:'+user.id]:updated}));Object.assign(user,updated);await world.notifyUser(user.id);return output();
}
