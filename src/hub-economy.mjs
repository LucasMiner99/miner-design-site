import {CATALOG,R} from './hub-rules.mjs';
export const CREDIT_TIERS=Object.freeze([500,1000,2000,5000]);
export const DEFAULT_COSTS=Object.freeze({object:2000,character:2000,environment:2000});
const MAX_BALANCE=2000000000;
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
export const balance=user=>Number.isSafeInteger(user.credits)&&user.credits>=0?user.credits:0;
export function validCosts(value){const out={};for(const key of Object.keys(DEFAULT_COSTS)){const n=value?.[key];if(!Number.isSafeInteger(n)||n<1||n>1000000)fail('Cada precio debe ser un entero entre 1 y 1.000.000.');out[key]=n;}return out;}
export async function economy(storage){return {costs:{...DEFAULT_COSTS},rewards:{},ready:false,...await storage.get('economy-config')};}
export function publicShop(config){return {costs:config.costs,tiers:CREDIT_TIERS,ready:config.ready};}
export async function saveEconomy(storage,input){
 const config=await economy(storage);
 if(input.costs!==undefined)config.costs=validCosts(input.costs);
 if(input.rewards!==undefined){for(const [tier,id] of Object.entries(input.rewards)){if(!CREDIT_TIERS.includes(Number(tier))||typeof id!=='string'||!/^[\w-]{1,100}$/.test(id))fail('Recompensa de créditos inválida.');config.rewards[tier]=id;}
  if(new Set(Object.values(config.rewards)).size!==Object.keys(config.rewards).length)fail('Cada paquete necesita una recompensa distinta.');}
 if(input.ready!==undefined){if(typeof input.ready!=='boolean'||input.ready&&!CREDIT_TIERS.every(t=>config.rewards[t]))fail('Faltan recompensas por configurar.');config.ready=input.ready;}
 await storage.put('economy-config',config);return config;
}
export async function creditRedemption(world,p){
 const storage=world.ctx.storage,config=await economy(storage),rewardId=String(p.reward?.id||''),tier=CREDIT_TIERS.find(n=>config.rewards[n]===rewardId);
 const id=String(p.id||''),uid=String(p.redeemer?.user_id||'');
 // Receipts survive reward remapping and inbox retention, so replays can never credit twice.
 const prior=/^[\w-]{1,120}$/.test(id)&&await storage.get('credit-redemption:'+id);
 if(prior){if(prior.userId!==uid||prior.rewardId!==rewardId)fail('Canje inconsistente.');return {duplicate:true};}
 if(!tier)return null;
 if(!/^[\w-]{1,120}$/.test(id)||!/^\d+$/.test(uid))fail('Canje inválido.');
 if(p.status!=='accepted')return {ignored:true,pending:p.status==='pending',redemptionId:id};
 if(await storage.get('box:'+id))fail('El canje ya fue aplicado a una caja.');
 const user=await world.user(uid,p.redeemer.username),before=balance(user),after=before+tier;if(after>MAX_BALANCE)fail('El saldo alcanzó el límite. Contactá al administrador.',409);
 user.credits=after;user.walletVersion=(user.walletVersion||0)+1;
 const receipt={id,userId:uid,rewardId,amount:tier,before,after,at:Date.now()};
 await storage.transaction(async tx=>tx.put({['credit-redemption:'+id]:receipt,['user:'+uid]:user}));await world.notifyUser(uid);return {ok:true,credits:tier};
}
export async function buyBox(world,user,input){
 if(!Object.hasOwn(DEFAULT_COSTS,input.kind)||typeof input.requestId!=='string'||!/^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(input.requestId))fail('Compra inválida.');
 const storage=world.ctx.storage,key='purchase:'+user.id+':'+input.requestId,prior=await storage.get(key);
 if(prior){if(prior.kind!==input.kind)fail('Esta compra ya corresponde a otra caja.',409);return await storage.get('box:'+prior.boxId);}
 const config=await economy(storage),cost=config.costs[input.kind],before=balance(user);if(input.expectedCost!==cost)fail('El precio cambió. Actualizá las cajas y probá de nuevo.',409);if(before<cost)fail('No tenés créditos suficientes.',409);
 const pending=await storage.list({prefix:'pending:'+user.id+':',limit:100});if(pending.size>=100)fail('Abrí alguna de tus cajas antes de comprar más.',409);
 const item=R.draw(CATALOG.filter(i=>i.kind===input.kind&&!i.starter),new Set(Object.keys(user.collected))),id='credits-'+user.id+'-'+input.requestId;
 const box={id,userId:user.id,kind:input.kind,itemId:item.id,opened:false,purchaseId:input.requestId};user.credits=before-cost;user.walletVersion=(user.walletVersion||0)+1;user.collected[item.id]=true;
 await storage.transaction(async tx=>tx.put({['user:'+user.id]:user,['box:'+id]:box,['pending:'+user.id+':'+id]:box,[key]:{requestId:input.requestId,userId:user.id,kind:input.kind,boxId:id,cost,before,after:user.credits,at:Date.now()}}));
 await world.notifyUser(user.id);return box;
}
