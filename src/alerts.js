// MinerBot v18 · alertas OBS. El bot guarda un pequeño historial D1 para recuperar
// eventos perdidos en reconexiones WebSocket, sin migraciones manuales.
const MAX_EVENT_AGE_MS = 60_000;
const BASE_KINDS = new Set(['follow','sub','renewal','gift','kicks','raid','host']);
const REAL_KINDS = Object.freeze({
  'channel.followed': 'follow',
  'channel.subscription.new': 'sub',
  'channel.subscription.renewal': 'renewal',
  'channel.subscription.gifts': 'gift',
  'kicks.gifted': 'kicks',
});

export function publicAlertConfig(c) {
  return Object.fromEntries(Object.entries(c).filter(([key]) => key.startsWith('alerts_')));
}

function cleanName(raw) {
  return String(raw || 'Anónimo').trim().slice(0, 85) || 'Anónimo';
}
function positiveInt(value, fallback=1) {
  const n=Number(value);
  return Number.isFinite(n) && n>0 ? Math.min(1_000_000,Math.floor(n)) : fallback;
}

export function alertFromKick(eventType,payload={}) {
  const type=REAL_KINDS[eventType];
  if(!type)return null;
  if(type==='follow')return {type,username:cleanName(payload.follower?.username)};
  if(type==='sub'||type==='renewal')return {type,username:cleanName(payload.subscriber?.username)};
  if(type==='gift'){
    const count=Array.isArray(payload.giftees) ? payload.giftees.length : 1;
    return {type,username:payload.gifter?.is_anonymous?'Anónimo':cleanName(payload.gifter?.username),count:positiveInt(count)};
  }
  if(type==='kicks')return {type,username:cleanName(payload.sender?.username),count:positiveInt(payload.gift?.amount),giftName:String(payload.gift?.name||'').slice(0,70)};
  return null;
}

export function manualAlert(data={}) {
  const type=String(data.type||'').toLowerCase();
  if(!BASE_KINDS.has(type))return null;
  const result={type,username:cleanName(data.username||({follow:'lucasfan',sub:'Sofi',renewal:'Sofi',gift:'Dasher',kicks:'Dasher',raid:'StreamerAmigo',host:'StreamerAmigo'}[type]))};
  if(['gift','kicks','raid'].includes(type))result.count=positiveInt(data.count,{gift:5,kicks:500,raid:120}[type]);
  if(type==='kicks')result.giftName=String(data.giftName||'Rage Quit').slice(0,70);
  return result;
}

export function allowedAlert(config,alert){
  return Boolean(alert && config.alerts_enabled && config[`alerts_${alert.type}`] !== false);
}

export async function ensureAlertTable(env){
  await env.STREAMBOT_DB.prepare(`CREATE TABLE IF NOT EXISTS streambot_alert_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at_ms INTEGER NOT NULL,
    payload TEXT NOT NULL
  )`).run();
}

export async function publishAlert(env,alert,broadcast){
  await ensureAlertTable(env);
  const timestamp=Date.now();
  const safeAlert={type:alert.type,username:alert.username,count:alert.count||0,giftName:alert.giftName||'',createdAt:timestamp};
  const result=await env.STREAMBOT_DB.prepare('INSERT INTO streambot_alert_events (created_at_ms,payload) VALUES (?,?)').bind(timestamp,JSON.stringify(safeAlert)).run();
  const id=Number(result.meta?.last_row_id||0);
  const saved={...safeAlert,id};
  // La limpieza es oportunista y económica: solo se retienen hasta 100 avisos.
  if(id>0 && id%25===0){
    await env.STREAMBOT_DB.prepare('DELETE FROM streambot_alert_events WHERE id NOT IN (SELECT id FROM streambot_alert_events ORDER BY id DESC LIMIT 100)').run();
  }
  await broadcast({type:'alerts.event',alert:saved});
  return saved;
}

export async function readAlertState(env, since){
  await ensureAlertTable(env);
  const latest=await env.STREAMBOT_DB.prepare('SELECT COALESCE(MAX(id),0) AS latest FROM streambot_alert_events').first();
  const cursor=Number(latest?.latest||0);
  const from=Number.isSafeInteger(Number(since))&&Number(since)>0 ? Math.floor(Number(since)) : 0;
  let events=[];
  if(from>0){
    const response=await env.STREAMBOT_DB.prepare('SELECT id,created_at_ms,payload FROM streambot_alert_events WHERE id>? AND created_at_ms>? ORDER BY id ASC LIMIT 35')
      .bind(from,Date.now()-MAX_EVENT_AGE_MS).all();
    events=(response.results||[]).flatMap(item=>{
      try {return [{...JSON.parse(item.payload),id:Number(item.id),createdAt:Number(item.created_at_ms)}]}
      catch {return []}
    });
  }
  return {latestId:cursor,alerts:events};
}
