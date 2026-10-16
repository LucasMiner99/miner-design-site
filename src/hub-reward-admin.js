import {broadcaster,enabled,hubJSON} from './hub-auth.js';
import {world} from './hub-gateway.js';
import {body} from './hub-world.mjs';
export const DEFAULT_COSTS=Object.freeze({object:2000,character:2000,environment:2000});
const titles={object:'miner hub · Caja de objetos',character:'miner hub · Caja de personaje',environment:'miner hub · Caja de ambiente'};
export function validCosts(value){const out={};for(const key of Object.keys(titles)){const n=value?.[key];if(!Number.isSafeInteger(n)||n<1||n>1000000)throw Object.assign(Error('Cada precio debe ser un entero entre 1 y 1.000.000.'),{status:400});out[key]=n;}return out;}
// Called by the existing dashboard only after its admin key has been checked.
export async function hubRewardAdmin(request,env,kick){
 const stored=await env.STREAMBOT_DB.prepare("SELECT value FROM streambot_settings WHERE key='hub_reward_costs'").first();
 const costs=stored?JSON.parse(stored.value):{...DEFAULT_COSTS};
 if(request.method==='GET')return hubJSON({costs,enabled:!!enabled(env)});
 if(request.method!=='POST')return hubJSON({error:'Método no permitido.'},405);
 const next=validCosts((await body(request)).costs);
 if(!enabled(env))return hubJSON({error:'Primero habilitá la beta para poder sincronizar las cajas con Kick.'},409);
 const channel=await broadcaster(env),now=Date.now(),lease=crypto.randomUUID();
 const lock=await env.STREAMBOT_DB.prepare("INSERT INTO hub_config_lock(id,owner,until_ms) VALUES('rewards',?,?) ON CONFLICT(id) DO UPDATE SET owner=excluded.owner,until_ms=excluded.until_ms WHERE until_ms<=? RETURNING owner").bind(lease,now+120000,now).first();
 if(lock?.owner!==lease)return hubJSON({error:'Ya se están sincronizando las recompensas. Esperá un momento.'},409);
 try{
  const headers={'X-Hub-Identity':JSON.stringify({id:channel,name:'minerarg',admin:true,expiresAt:now+180000})};
  const read=await world(env).fetch(new Request('https://hub/admin/rewards',{headers}));if(!read.ok)throw Error('No pudimos leer las recompensas.');
  const map=(await read.json()).rewards,available=(await kick('/channels/rewards')).data||[];
  for(const kind of Object.keys(titles)){
   let id=map[kind];
   if(!id){const candidates=available.filter(r=>r.title===titles[kind]);if(candidates.length>1)throw Error('Hay recompensas duplicadas. Vinculá la correcta desde Administrar en el juego.');id=candidates[0]?.id;}
   if(!id){const created=await kick('/channels/rewards','POST',{title:titles[kind],description:'Una caja para tu cuenta de miner hub.',cost:next[kind],is_enabled:false,is_user_input_required:false,should_redemptions_skip_request_queue:false,background_color:'#202020'});id=created.data?.id;if(!id)throw Error('Kick no devolvió el ID de la recompensa.');}
   // Persist the mapping while a new reward is disabled, before anyone can redeem it.
   map[kind]=id;const saved=await world(env).fetch(new Request('https://hub/admin/rewards',{method:'PUT',headers,body:JSON.stringify(map)}));if(!saved.ok)throw Error('No pudimos vincular la recompensa.');
   await kick('/channels/rewards/'+encodeURIComponent(id),'PATCH',{cost:next[kind],is_enabled:true,is_user_input_required:false,should_redemptions_skip_request_queue:false});
  }
  await env.STREAMBOT_DB.prepare("INSERT INTO streambot_settings(key,value) VALUES('hub_reward_costs',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(JSON.stringify(next)).run();
  return hubJSON({costs:next,enabled:true,synced:true});
 }finally{await env.STREAMBOT_DB.prepare("DELETE FROM hub_config_lock WHERE id='rewards' AND owner=?").bind(lease).run();}
}
