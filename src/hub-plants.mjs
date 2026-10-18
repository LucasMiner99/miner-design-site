import {C,CATALOG} from './hub-rules.mjs';
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
export const PLANT_TYPES=[90,91,92],PLANT_LIMIT=3;
export const DEFAULT_PLANTS={minutes:30,amounts:[100,250,500],weights:[80,17,3]};
export async function plantConfig(storage){return {...DEFAULT_PLANTS,...await storage.get('plant-config')};}
export async function savePlantConfig(storage,value){
 if(!value||!Number.isInteger(value.minutes)||value.minutes<1||value.minutes>1440)fail('Elegí entre 1 y 1440 minutos.');
 if(!Array.isArray(value.amounts)||value.amounts.length!==3||value.amounts.some(n=>!Number.isSafeInteger(n)||n<1||n>1000000))fail('Cada cosecha debe dar entre 1 y 1.000.000 de créditos.');
 if(!Array.isArray(value.weights)||value.weights.length!==3||value.weights.some(n=>!Number.isInteger(n)||n<1||n>100)||value.weights.reduce((a,b)=>a+b,0)!==100)fail('Las probabilidades deben ser enteras positivas y sumar 100 %.');
 const config={minutes:value.minutes,amounts:value.amounts,weights:value.weights};await storage.put('plant-config',config);return config;
}
export function drawPlant(config,random=()=>{const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]/4294967296;}){
 const r=random();if(!Number.isFinite(r)||r<0||r>=1)fail('Sorteo inválido.');let value=r*100;
 for(let i=0;i<3;i++){value-=config.weights[i];if(value<0)return CATALOG.find(p=>p.id==='object:'+PLANT_TYPES[i]);}return CATALOG.find(p=>p.id==='object:92');
}
function cycle(type,config,now){return {type,cycle:crypto.randomUUID(),startedAt:now,readyAt:now+config.minutes*60000,amount:config.amounts[PLANT_TYPES.indexOf(type)]};}
// Timers are authoritative room metadata, never accepted from scene JSON.
// Moving/rotating preserves a cycle; storing, replacing or trading restarts it.
export function reconcilePlants(room,previous,config,now=Date.now()){
 const placed=room.scene.items.filter(i=>C.TYPES[i.type]?.plantation);if(placed.length>PLANT_LIMIT)fail('Podés tener hasta tres plantas produciendo. Guardá una antes de colocar otra.');
 const next={};for(const item of placed){const old=previous?.[item.id];next[item.id]=old?.type===item.type?old:cycle(item.type,config,now);}room.plants=next;
}
export async function harvestPlant(world,user,input,now=Date.now()){
 if(!input||input.roomId!==user.id||!Number.isSafeInteger(input.itemId)||typeof input.cycle!=='string'||input.cycle.length>50)fail('Cosecha inválida.',403);
 if(!world.ownSockets(user.id).some(ws=>ws.deserializeAttachment()?.roomId===user.id))fail('Entrá a tu sala para cosechar.',403);
 const storage=world.ctx.storage,room=await world.room(user.id,user.name),item=room.scene.items.find(i=>i.id===input.itemId),plant=room.plants?.[input.itemId];
 if(!item||!C.TYPES[item.type]?.plantation||!plant||plant.type!==item.type)fail('La planta ya no está colocada.',409);
 if(plant.cycle!==input.cycle)fail('Esta cosecha ya fue recogida. Esperá a que crezca de nuevo.',409);
 if(now<plant.readyAt)fail('Todavía está creciendo.',409);
 const before=Number.isSafeInteger(user.credits)&&user.credits>=0?user.credits:0;if(before+plant.amount>2000000000)fail('El saldo alcanzó el límite.',409);
 const amount=plant.amount,updated={...user,credits:before+amount,walletVersion:(user.walletVersion||0)+1};
 room.plants[input.itemId]=cycle(item.type,await plantConfig(storage),now);
 await storage.transaction(async tx=>tx.put({['user:'+user.id]:updated,['room:'+room.id]:room}));Object.assign(user,updated);
 world.broadcast(room.id,{type:'plants',roomId:room.id,plants:room.plants,serverNow:now});await world.notifyUser(user.id);
 return {amount,plants:room.plants,serverNow:now,roomId:room.id};
}
