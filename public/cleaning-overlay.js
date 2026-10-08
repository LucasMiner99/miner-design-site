'use strict';
// Dibujamos dos spritesheets PNG *estáticos*: la velocidad de animación se
// controla manualmente. No depende del FPS fijado dentro de un archivo GIF.
const qs = new URLSearchParams(location.search);
const key = qs.get('key') || '';
const $ = id => document.getElementById(id);
const c = $('penguin');
const context = c.getContext('2d', { alpha: true });
const mop = new Image(), dance = new Image();
mop.src = '/assets/cleaning/mop-sheet.png';
dance.src = '/assets/cleaning/dance-sheet.png';
const SPRITES = { mop:{image:mop,frames:13}, dance:{image:dance,frames:43} };
const COLS = 7, W = 498, H = 403;
let data = null, serverOffset = 0, ws = null;
let lastMode = '', animStart = performance.now(), lastPaint = 0;
let reconnectDelay = 1800;

function liveNow() { return Date.now() + serverOffset; }
// Integra localmente entre consultas: el servidor guarda el estado oficial en D1.
function current(now) {
  if (!data) return null;
  const s = { ...data };
  if (!s.enabled) return s;
  let t = Number(data.updatedMs || data.now);
  const limit = Math.max(t,now);
  const viewers = Math.max(0,Number(s.viewers) || 0);
  const rate = 100 / (s.floorMinutes * 60000) * (1 + viewers / 100 * s.bonusPer100 / 100);
  let guard = 0;
  while (t < limit && ++guard < 20000) {
    if (s.celebrationUntilMs) {
      if (s.celebrationUntilMs <= t) { s.celebrationUntilMs = 0; s.progress = 0; continue; }
      t = Math.min(limit,s.celebrationUntilMs);
      if (t >= s.celebrationUntilMs) {s.celebrationUntilMs=0;s.progress=0;}
      continue;
    }
    const boosted = t < s.boostUntilMs;
    const effectiveRate = rate * (boosted ? s.boostMultiplier : 1);
    const stepEnd = boosted ? Math.min(limit,s.boostUntilMs) : limit;
    const finishAt = t + (100 - s.progress) / effectiveRate;
    if (finishAt <= stepEnd + 0.00001) {
      t = Math.min(limit,Math.max(t,finishAt));
      s.progress=100; s.floors++;
      s.celebrationUntilMs=t+s.celebrationMs;
    } else {s.progress=Math.min(100,s.progress+effectiveRate*(stepEnd-t));t=stepEnd;}
  }
  return s;
}
function drawAnimation(mode, fps, timestamp) {
  if (mode !== lastMode) {lastMode=mode;animStart=timestamp;lastPaint=-1;}
  const entry = SPRITES[mode];
  if (!entry.image.complete || !entry.image.naturalWidth) return;
  const frame = Math.floor(Math.max(0,timestamp-animStart) * fps / 1000) % entry.frames;
  if (frame === lastPaint) return;
  lastPaint=frame;
  const x=(frame%COLS)*W,y=Math.floor(frame/COLS)*H;
  context.clearRect(0,0,W,H);
  context.drawImage(entry.image,x,y,W,H,0,0,W,H);
}
function render(timestamp) {
  const now=liveNow();
  const state=current(now);
  if (state) {
    $('panel').style.display = state.enabled ? 'flex' : 'none';
    const celebrate = state.celebrationUntilMs > now;
    const turbo = !celebrate && state.boostUntilMs > now;
    const progress=Math.max(0,Math.min(100,state.progress));
    $('viewers').textContent = state.viewers == null ? '—' : Math.round(state.viewers).toLocaleString('es-AR');
    $('pct').textContent = `${Math.floor(progress)}%`;
    $('fill').style.width = `${progress}%`;
    $('dirty').style.opacity = String(1 - progress / 100);
    $('floors').textContent = Math.round(state.floors).toLocaleString('es-AR');
    $('popup').classList.toggle('show',celebrate);
    $('turbo').hidden = !turbo;
    drawAnimation(celebrate?'dance':'mop',celebrate?60:(turbo?state.boostFps:state.normalFps),timestamp);
    // El personaje se desplaza muy suavemente sin tapar los bordes del piso.
    const sway = celebrate ? 0 : Math.sin(timestamp / 1450) * 15;
    const bounce = celebrate ? Math.sin(timestamp / 180) * 4 : 0;
    c.style.transform = `translateX(calc(-50% + ${sway}px)) translateY(${-bounce}px)`;
  } else {
    drawAnimation('mop',25,timestamp);
  }
  requestAnimationFrame(render);
}
async function poll() {
  if (!key) { $('panel').style.display='none'; return; }
  try {
    const r=await fetch(`/api/streambot/cleaning/state?key=${encodeURIComponent(key)}`,{cache:'no-store'});
    if (!r.ok) { if(r.status===401) $('panel').style.display='none'; return; }
    const state=await r.json();
    serverOffset=Number(state.now)-Date.now();
    data=state;
  } catch (err) {console.warn('Limpieza: no se pudo sincronizar',err);}
}
function connect() {
  if (!key) return;
  const proto=location.protocol==='https:'?'wss':'ws';
  try {ws=new WebSocket(`${proto}://${location.host}/api/streambot/realtime/ws?role=overlay&key=${encodeURIComponent(key)}`);}
  catch {return;}
  ws.addEventListener('open',()=>{reconnectDelay=1800;poll();});
  ws.addEventListener('message',e=>{
    try {if(JSON.parse(e.data).type==='cleaning.refresh') poll();}catch {}
  });
  ws.addEventListener('close',()=>{setTimeout(connect,reconnectDelay);reconnectDelay=Math.min(15000,Math.round(reconnectDelay*1.5));});
  ws.addEventListener('error',()=>{try{ws.close();}catch{}});
}
// Consultas de respaldo cada 10 s; animación a 60 Hz local y sin consultas a D1 por fotograma.
setInterval(poll,10000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden) poll();});
poll();connect();requestAnimationFrame(render);
