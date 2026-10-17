import {broadcaster,enabled,hubJSON} from './hub-auth.js';
import {world} from './hub-gateway.js';
import {body} from './hub-world.mjs';
import {CREDIT_TIERS,DEFAULT_COSTS,validCosts} from './hub-economy.mjs';
export {DEFAULT_COSTS,validCosts};
const title=n=>'miner hub · '+n+' créditos';
// Both callers authenticate the owner before entering this function.
export async function hubRewardAdmin(request,env,kick){
 if(!enabled(env))return hubJSON({error:'Primero habilitá el juego.'},409);
 const channel=await broadcaster(env),now=Date.now(),headers={'X-Hub-Identity':JSON.stringify({id:channel,name:'minerarg',admin:true,expiresAt:now+180000})};
 const read=await world(env).fetch(new Request('https://hub/admin/credits',{headers}));if(!read.ok)throw Error('No pudimos leer los créditos.');
 const config=await read.json();
 if(request.method==='GET')return hubJSON({...config,tiers:CREDIT_TIERS,enabled:true});
 if(request.method!=='POST')return hubJSON({error:'Método no permitido.'},405);
 const input=await body(request),costs=validCosts(input.costs||config.costs),lease=crypto.randomUUID();
 const lock=await env.STREAMBOT_DB.prepare("INSERT INTO hub_config_lock(id,owner,until_ms) VALUES('rewards',?,?) ON CONFLICT(id) DO UPDATE SET owner=excluded.owner,until_ms=excluded.until_ms WHERE until_ms<=? RETURNING owner").bind(lease,now+120000,now).first();
 if(lock?.owner!==lease)return hubJSON({error:'Ya se están sincronizando las recompensas. Esperá un momento.'},409);
 try{
  const save=async value=>{const r=await world(env).fetch(new Request('https://hub/admin/credits',{method:'PUT',headers,body:JSON.stringify(value)}));if(!r.ok)throw Error('No pudimos guardar los créditos.');return r.json();};
  await save({costs});
  const available=(await kick('/channels/rewards')).data||[];
  // Persist disabled new rewards before enabling redemption. Exact titles recover unknown POST outcomes.
  for(const amount of CREDIT_TIERS){
   let id=config.rewards[amount];if(id&&!available.some(r=>r.id===id))id=null;
   if(!id){const candidates=available.filter(r=>r.title===title(amount));if(candidates.length>1)throw Error('Hay paquetes duplicados en Kick. Revisá las recompensas antes de sincronizar.');id=candidates[0]?.id;}
   if(!id){const created=await kick('/channels/rewards','POST',{title:title(amount),description:amount+' créditos para usar en miner hub.',cost:amount,is_enabled:false,is_user_input_required:false,should_redemptions_skip_request_queue:false,background_color:'#202020'});id=created.data?.id;if(!id)throw Error('Kick no devolvió el ID del paquete.');}
   config.rewards[amount]=id;await save({rewards:{[amount]:id}});
   await kick('/channels/rewards/'+encodeURIComponent(id),'PATCH',{title:title(amount),description:amount+' créditos para usar en miner hub.',cost:amount,is_enabled:true,is_user_input_required:false,should_redemptions_skip_request_queue:false});
  }
  const old=await world(env).fetch(new Request('https://hub/admin/rewards',{headers}));if(!old.ok)throw Error('No pudimos leer las cajas anteriores.');
  for(const id of new Set(Object.values((await old.json()).rewards)))if(available.some(r=>r.id===id)&&!Object.values(config.rewards).includes(id))await kick('/channels/rewards/'+encodeURIComponent(id),'PATCH',{is_enabled:false});
  const saved=await save({costs,ready:true});
  await env.STREAMBOT_DB.prepare("INSERT INTO streambot_settings(key,value) VALUES('hub_credit_migration_v1','done') ON CONFLICT(key) DO UPDATE SET value=excluded.value").run();
  return hubJSON({...saved,tiers:CREDIT_TIERS,enabled:true,synced:true});
 }finally{await env.STREAMBOT_DB.prepare("DELETE FROM hub_config_lock WHERE id='rewards' AND owner=?").bind(lease).run();}
}
// One-time rollout, reusing the existing minute scheduler; failed attempts back off.
export async function ensureCreditRewards(env,kick){
 if(!enabled(env))return;
 const state=await env.STREAMBOT_DB.prepare("SELECT value FROM streambot_settings WHERE key='hub_credit_migration_v1'").first();if(state?.value==='done'||Number(state?.value)>Date.now())return;
 await env.STREAMBOT_DB.prepare("INSERT INTO streambot_settings(key,value) VALUES('hub_credit_migration_v1',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(String(Date.now()+600000)).run();
 const r=await hubRewardAdmin(new Request('https://hub/sync-credits',{method:'POST',body:JSON.stringify({})}),env,kick);if(!r.ok)throw Error('Credit reward setup pending');
}
