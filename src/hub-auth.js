const ORIGIN='https://minerdesign.xyz',API='https://api.kick.com/public/v1',ISSUER='https://id.kick.com';
export const hubJSON=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export const enabled=env=>env.HUB_ENABLED==='true'&&!!env.HUB_WORLD;
export function hubOrigin(env){return env.HUB_ORIGIN||ORIGIN;}
export async function hash(value){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return [...new Uint8Array(bytes)].map(n=>n.toString(16).padStart(2,'0')).join('');}
function random(){const bytes=crypto.getRandomValues(new Uint8Array(32));return btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');}
function cookie(req,key){return req.headers.get('Cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(key+'='))?.slice(key.length+1)||'';}
function setCookie(name,value,seconds){return `${name}=${value}; Path=/api/hub; HttpOnly; Secure; SameSite=Lax; Max-Age=${seconds}`;}
export async function broadcaster(env){
 const rows=await env.STREAMBOT_DB.prepare("SELECT key,value FROM streambot_settings WHERE key IN ('kick_user_id','kick_username')").all();
 const values=Object.fromEntries((rows.results||[]).map(r=>[r.key,r.value]));
 if(!/^\d+$/.test(values.kick_user_id||'')||values.kick_username?.toLowerCase()!=='minerarg')throw Error('Conectá minerarg en el dashboard del bot antes de habilitar el juego.');
 return values.kick_user_id;
}
export async function hubSession(request,env){
 const token=cookie(request,'hub_session');if(!/^[\w-]{43}$/.test(token))return null;
 const row=await env.STREAMBOT_DB.prepare('SELECT kick_id,username,expires_at FROM hub_sessions WHERE token_hash=? AND expires_at>?').bind(await hash(token),Date.now()).first();
 if(!row)return null;
 return {id:row.kick_id,name:row.username,expiresAt:row.expires_at,admin:row.kick_id===await broadcaster(env)};
}
export function sameOrigin(request,env){return request.headers.get('Origin')===hubOrigin(env);}
export async function hubAuth(request,env){
 const url=new URL(request.url),path=url.pathname;
 if(path==='/api/hub/login'&&request.method==='GET'){
  if(!env.KICK_CLIENT_ID||!env.KICK_CLIENT_SECRET)return hubJSON({error:'Falta configurar Kick en Cloudflare.'},503);
  await broadcaster(env);
  const state=random(),browser=random(),verifier=random(),now=Date.now();
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier));
  const challenge=btoa(String.fromCharCode(...new Uint8Array(digest))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
  await env.STREAMBOT_DB.batch([
   env.STREAMBOT_DB.prepare('DELETE FROM hub_oauth_states WHERE expires_at<?').bind(now),
   env.STREAMBOT_DB.prepare('DELETE FROM hub_sessions WHERE expires_at<?').bind(now),
   env.STREAMBOT_DB.prepare('INSERT INTO hub_oauth_states(state_hash,browser_hash,verifier,expires_at) VALUES(?,?,?,?)').bind(await hash(state),await hash(browser),verifier,now+600000)
  ]);
  const target=new URL(ISSUER+'/oauth/authorize');target.search=new URLSearchParams({client_id:env.KICK_CLIENT_ID,response_type:'code',redirect_uri:hubOrigin(env)+'/api/hub/callback',scope:'user:read',state,code_challenge:challenge,code_challenge_method:'S256'});
  return new Response(null,{status:302,headers:{Location:target.href,'Set-Cookie':setCookie('hub_login',browser,600),'Cache-Control':'no-store'}});
 }
 if(path==='/api/hub/callback'&&request.method==='GET'){
  const state=url.searchParams.get('state'),code=url.searchParams.get('code'),browser=cookie(request,'hub_login');
  if(!state||!code||!browser)return hubJSON({error:'Login incompleto. Volvé a /hub/ e intentá otra vez.'},400);
  // DELETE RETURNING consumes a browser-bound nonce exactly once, including concurrent callbacks.
  const row=await env.STREAMBOT_DB.prepare('DELETE FROM hub_oauth_states WHERE state_hash=? AND browser_hash=? AND expires_at>? RETURNING verifier').bind(await hash(state),await hash(browser),Date.now()).first();
  if(!row)return hubJSON({error:'Login vencido o utilizado. Volvé a entrar.'},400);
  const tokenResponse=await fetch(ISSUER+'/oauth/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:env.KICK_CLIENT_ID,client_secret:env.KICK_CLIENT_SECRET,grant_type:'authorization_code',code,code_verifier:row.verifier,redirect_uri:hubOrigin(env)+'/api/hub/callback'})});
  if(!tokenResponse.ok)return hubJSON({error:'Kick no pudo completar el login. Intentá otra vez.'},502);
  const token=await tokenResponse.json();
  const response=await fetch(API+'/users',{headers:{Authorization:'Bearer '+token.access_token}});
  if(!response.ok)return hubJSON({error:'No pudimos verificar tu usuario en Kick.'},502);
  const data=await response.json(),user=Array.isArray(data.data)?data.data[0]:data.data,id=String(user?.user_id||''),name=String(user?.name||user?.username||'').trim();
  if(!/^[1-9]\d{0,19}$/.test(id)||!name||name.length>80)return hubJSON({error:'Kick devolvió un usuario inválido.'},502);
  const session=random(),expires=Date.now()+7*86400000;
  await env.STREAMBOT_DB.prepare('INSERT INTO hub_sessions(token_hash,kick_id,username,expires_at) VALUES(?,?,?,?)').bind(await hash(session),id,name,expires).run();
  const headers=new Headers({Location:hubOrigin(env)+'/hub/','Cache-Control':'no-store'});headers.append('Set-Cookie',setCookie('hub_session',session,7*86400));headers.append('Set-Cookie',setCookie('hub_login','',0));
  return new Response(null,{status:302,headers});
 }
 if(path==='/api/hub/logout'&&request.method==='POST'){
  if(!sameOrigin(request,env))return hubJSON({error:'Origen no permitido.'},403);
  const token=cookie(request,'hub_session');if(token)await env.STREAMBOT_DB.prepare('DELETE FROM hub_sessions WHERE token_hash=?').bind(await hash(token)).run();
  return new Response(null,{status:204,headers:{'Set-Cookie':setCookie('hub_session','',0),'Cache-Control':'no-store'}});
 }
 return null;
}
