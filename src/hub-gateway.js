import {enabled,broadcaster,hubJSON,hubAuth,hubSession,sameOrigin} from './hub-auth.js';
import {hubRewardAdmin} from './hub-reward-admin.js';
import {sevenTvMap} from './chat.js';
import {posterBytes,posterImage} from './hub-posters.mjs';
import {body} from './hub-world.mjs';
export function world(env){return env.HUB_WORLD.get(env.HUB_WORLD.idFromName('minerarg-beta-v1'));}
export async function handleHub(request,env,services={}){
 try{
  if(!enabled(env))return hubJSON({error:'La beta todavía no está habilitada.'},503);
  if(request.method!=='GET'&&!sameOrigin(request,env))return hubJSON({error:'Origen no permitido.'},403);
  const path=new URL(request.url).pathname;
  if(path==='/api/hub/shop'&&request.method==='GET')return world(env).fetch(new Request('https://hub/shop'));
  if(path==='/api/hub/logout'){
   const auth=await hubSession(request,env);if(auth)await world(env).fetch(new Request('https://hub/disconnect',{method:'POST',headers:{'X-Hub-Identity':JSON.stringify(auth)}}));
  }
  const authResult=await hubAuth(request,env);if(authResult)return authResult;
  const auth=await hubSession(request,env);if(!auth)return hubJSON({error:'Iniciá sesión con Kick.'},401);
  const route=path.slice('/api/hub'.length);
  if(route==='/emotes'&&request.method==='GET')return hubJSON({emotes:await sevenTvMap(env,{chat_7tv_enabled:true,kick_user_id:await broadcaster(env)})});
  if(route==='/admin/kick-rewards'&&auth.admin&&request.method==='GET')return hubJSON({rewards:await services.listRewards()});
  if(route==='/admin/credit-rewards'&&auth.admin&&['GET','POST'].includes(request.method))return hubRewardAdmin(request,env,services.kick);
  if((route==='/posters'&&request.method==='GET')||(/^\/posters\/[0-4]$/.test(route)&&request.method==='PUT')||(/^\/posters\/image\/\d{1,30}\/[0-4]$/.test(route)&&request.method==='GET')){
   const headers={'X-Hub-Identity':JSON.stringify(auth),'Content-Type':'image/jpeg'};
   const response=await world(env).fetch(new Request('https://hub'+route,{method:request.method,headers,body:request.method==='PUT'?await posterBytes(request):undefined}));
   if(request.method==='GET'&&route.startsWith('/posters/image/')&&response.ok){
    // Durable Objects and the gateway can run different revisions during rollout.
    // Older room versions return JPEG bytes directly; newer ones authorize an R2 key.
    if(response.headers.get('Content-Type')?.split(';')[0]==='image/jpeg')return response;
    return await posterImage(env,(await response.json()).key);
   }
   return response;
  }
  const allowed={'slots/open':['POST'],'slots/bet':['POST'],'admin/community':['GET','PUT'],'fishing/open':['POST'],'fishing/ranking':['POST'],'fishing/start':['POST'],'fishing/input':['POST'],'fishing/cancel':['POST'],'admin/fishing':['GET','PUT'],connect4:['POST'],'racing/open':['POST'],'racing/bet':['POST'],'basket/open':['POST'],'basket/start':['POST'],'basket/shoot':['POST'],'basket/finish':['POST'],'admin/basket':['GET','PUT'],'dj/open':['POST'],'dj/start':['POST'],'dj/hit':['POST'],'dj/finish':['POST'],'admin/dj':['GET','PUT'],'coffee/open':['POST'],'coffee/start':['POST'],'coffee/pour':['POST'],'coffee/serve':['POST'],'admin/coffee':['GET','PUT'],'plants/harvest':['POST'],'admin/plants':['GET','PUT'],'admin/giveaway':['GET','POST'],groups:['GET','POST'],profile:['PUT'],state:['GET'],feedback:['POST'],'admin/feedback':['GET','PUT'],rooms:['GET'],ws:['GET'],look:['PUT'],room:['PUT'],'box/open':['POST'],'box/buy':['POST'],'exchange/open':['POST'],'exchange/swap':['POST'],'roulette/open':['POST'],'roulette/bet':['POST'],'admin/credits':['GET','PUT'],'admin/rewards':['GET','PUT'],'admin/moderate':['POST']};
  if(!allowed[route.slice(1)]?.includes(request.method))return hubJSON({error:'No disponible.'},404);
  if(route==='/ws'&&!sameOrigin(request,env))return hubJSON({error:'Origen no permitido.'},403);
  const headers=new Headers({'X-Hub-Identity':JSON.stringify(auth)});
  if(request.headers.get('Upgrade')?.toLowerCase()==='websocket')headers.set('Upgrade','websocket');
  let data;if(!['GET','HEAD'].includes(request.method))data=JSON.stringify(await body(request));
  return await world(env).fetch(new Request('https://hub'+route+new URL(request.url).search,{method:request.method,headers,body:data}));
 }catch(e){console.error('Hub gateway:',e.status?e.message:'request failed');return hubJSON({error:e.status?e.message:'No pudimos conectar el juego. Revisá la configuración de la beta.'},e.status||503);}
}
// Called only after the existing bot has verified the Kick signature.
export async function enqueueHubEvent(env,id,type,payload){
 if(!enabled(env)||!['chat.message.sent','channel.reward.redemption.updated'].includes(type))return;
 if(String(payload.broadcaster?.user_id)!==await broadcaster(env))return;
 if(typeof id!=='string'||id.length>150||!id)throw Error('Event ID missing');
 await env.STREAMBOT_DB.prepare('INSERT OR IGNORE INTO hub_event_inbox(id,event_type,payload,created_at) VALUES(?,?,?,?)').bind(id,type,JSON.stringify(payload),Date.now()).run();
}
export async function drainHubInbox(env,accept){
 if(!enabled(env))return;
 const channel=await broadcaster(env),now=Date.now();
 const rows=await env.STREAMBOT_DB.prepare('SELECT id,event_type,payload FROM hub_event_inbox WHERE done=0 AND next_try<=? ORDER BY created_at LIMIT 30').bind(now).all();
 for(const row of rows.results||[]){
  const claimed=await env.STREAMBOT_DB.prepare('UPDATE hub_event_inbox SET attempts=attempts+1,next_try=? WHERE id=? AND done=0 AND next_try<=?').bind(now+60000,row.id,now).run();if(!claimed.meta?.changes)continue;
  try{
   const event={id:row.id,type:row.event_type,payload:JSON.parse(row.payload)},send=()=>world(env).fetch(new Request('https://hub/kick',{method:'POST',headers:{'X-Hub-Broadcaster':channel},body:JSON.stringify(event)}));
   let res=await send();if(!res.ok)throw Error('World delivery failed');let result=await res.json();
   if(result.pending){const accepted=await accept(result.redemptionId);if(accepted){event.payload.status='accepted';res=await send();if(!res.ok)throw Error('Award failed');}}
   await env.STREAMBOT_DB.prepare('UPDATE hub_event_inbox SET done=1 WHERE id=?').bind(row.id).run();
  }catch{console.warn('Hub canje/evento pendiente; se reintentará:',row.id);}
 }
 await env.STREAMBOT_DB.prepare('DELETE FROM hub_event_inbox WHERE done=1 AND created_at<?').bind(now-7*86400000).run();
}
