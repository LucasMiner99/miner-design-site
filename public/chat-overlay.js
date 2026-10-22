(() => {
  'use strict';
  const root = document.getElementById('chat');
  const params = new URLSearchParams(location.search);
  const key = params.get('key') || '';
  const API = '/api/streambot/chat';
  const entries = new Map();
  const seen = new Set();
  const messageData = new Map();
  let config = {};
  let ws = null;
  let reconnectMs = 850;
  let reloadTimer = null;
  let emotes = Object.create(null);
  let emotePattern = null;
  let fontScale = 1;
  const shifts = new WeakMap();
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');

  function motionEnabled() {
    return !reducedMotion?.matches && typeof root.animate === 'function';
  }
  function capturePositions() {
    if(!motionEnabled())return null;
    const positions = new Map([...entries.values()].map(el=>[el,el.getBoundingClientRect().top]));
    for(const el of positions.keys())shifts.get(el)?.cancel();
    return positions;
  }
  function animateArrival(el, positions, duration) {
    if(!positions)return;
    // Read the current visual positions before cancelling an interrupted move.
    // A new burst continues from there while each message keeps its own entry animation.
    for(const [row,top] of positions){
      if(!row.isConnected)continue;
      const delta = top-row.getBoundingClientRect().top;
      if(Math.abs(delta)>.1)shifts.set(row,row.animate([
        {transform:`translateY(${delta}px)`},{transform:'translateY(0)'}
      ],{duration,easing:'cubic-bezier(.2,.8,.2,1)'}));
    }
    // Keep the horizontal overshoot inside the source even for a full-width message.
    const available = root.clientWidth-el.offsetLeft-parseFloat(getComputedStyle(root).paddingRight||0);
    const peakX = Math.min(1.025,Math.max(1,available/Math.max(1,el.offsetWidth)));
    el.querySelector('.message-content').animate([
      {opacity:0,transform:'translateY(18px) scale(.9)',offset:0},
      {opacity:1,offset:.2},
      {opacity:1,transform:`translateY(-3px) scale(${peakX},1.025)`,offset:.58},
      {opacity:1,transform:'translateY(1px) scale(.995)',offset:.82},
      {opacity:1,transform:'translateY(0) scale(1)',offset:1}
    ],{duration,easing:'cubic-bezier(.22,.65,.25,1)'});
  }
  function stopMotion() {
    for(const el of entries.values()){
      shifts.get(el)?.cancel();
      el.querySelector('.message-content')?.getAnimations?.().forEach(animation=>animation.cancel());
    }
  }

  function finiteParam(name, fallback, min, max) {
    const raw = params.get(name);
    const n = raw == null || raw === '' ? Number(fallback) : Number(raw);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : fallback;
  }
  function currentLimits() {
    return {
      font: finiteParam('font', config.chat_font_size || 32, 11, 38),
      seconds: finiteParam('duration', config.chat_message_seconds ?? 35, 0, 180),
      speed: finiteParam('speed', config.chat_animation_ms || 300, 100, 450),
      gap: finiteParam('gap', config.chat_gap ?? 3, 0, 24),
    };
  }
  function styleConfig() {
    const lim = currentLimits();
    // Match the approved preview in CSS pixels regardless of OBS source width.
    // An explicit scale remains available for sources rendered at higher resolution.
    const explicitScale = Number(params.get('scale'));
    fontScale = params.has('scale') && Number.isFinite(explicitScale) && explicitScale >= .5 && explicitScale <= 4 ? explicitScale : 1;
    root.style.setProperty('--font', `${(lim.font * fontScale).toFixed(2)}px`);
    root.style.setProperty('--gap', `${(lim.gap * fontScale).toFixed(2)}px`);
    root.style.setProperty('--enter', `${lim.speed}ms`);
    root.style.setProperty('--scale', String(fontScale));
    // The OBS browser source owns the width, including URLs with a legacy width parameter.
  }
  function makeImage(src, title) {
    const img = document.createElement('img');
    img.className = 'emote';
    img.alt = title;
    img.title = title;
    img.loading = 'eager';
    img.referrerPolicy = 'no-referrer';
    img.src = src;
    img.onerror = () => { img.replaceWith(document.createTextNode(title)); };
    return img;
  }
  function drawContent(container, content) {
    const text = String(content || '');
    let emoteCount = 0, otherCount = 0;
    const appendText = value => {
      if (!value) return;
      container.append(document.createTextNode(value));
      if (/\S/.test(value)) otherCount++;
    };
    const appendPlain = value => {
      if (config.chat_7tv_enabled === false || !emotePattern) { appendText(value); return; }
      // Prefer the longest exact emote name; spaces are not required. Keep URLs intact.
      emotePattern.lastIndex = 0;
      let match, end = 0;
      while ((match = emotePattern.exec(value))) {
        appendText(value.slice(end, match.index));
        if (match[1]) appendText(match[0]);
        else { container.append(makeImage(emotes[match[0]], match[0])); emoteCount++; }
        end = emotePattern.lastIndex;
      }
      appendText(value.slice(end));
    };
    // Match native markers first: a greedy word token used to swallow a marker
    // when it followed text or another emote without whitespace.
    const native = /\[emote:(\d+):([^\]]+)\]/g;
    let match, end = 0;
    while ((match = native.exec(text))) {
      appendPlain(text.slice(end, match.index));
      if (config.chat_kick_emotes_enabled !== false) {
        container.append(makeImage(`https://files.kick.com/emotes/${match[1]}/fullsize`, match[2]));
        emoteCount++;
      } else appendText(match[2]);
      end = native.lastIndex;
    }
    appendPlain(text.slice(end));
    if (emoteCount && !otherCount) container.classList.add('emote-only');
  }
  function createMessage(m) {
    const el = document.createElement('div');
    el.className = 'message';
    const content = document.createElement('div');content.className='message-content';
    el.append(content);
    el.dataset.id = String(m.id || '');
    const name = document.createElement('span');name.className='username';
    name.textContent=String(m.username || 'Viewer');
    name.style.color=/^#[0-9A-Fa-f]{6}$/.test(m.color) ? m.color : '#c9b4ff';
    const body=document.createElement('span');body.className='body';
    drawContent(body,m.content);
    // Username and message share a line; badges are intentionally omitted in OBS.
    content.append(name,body);
    return el;
  }
  function deleteEntry(id, immediate = false) {
    const el = entries.get(id);
    if (!el) return;
    entries.delete(id);
    messageData.delete(id);
    shifts.get(el)?.cancel();
    if(immediate){el.remove();return;}
    el.classList.add('leaving');
    setTimeout(() => el.remove(), 160);
  }
  function prune() {
    const lim=currentLimits();
    const all=[...entries.entries()];
    if(lim.seconds){
      for(const [id,el] of all){
        if(Date.now()-Number(el.dataset.time || 0)>=lim.seconds*1000) deleteEntry(id);
      }
    }
    // No message-count cap: discard only rows that have scrolled fully above the source.
    if(root.clientHeight > 0){
      for(const [id,el] of entries){
        if(entries.size <= 1 || el.offsetTop + el.offsetHeight > 0) break;
        if(shifts.get(el)?.playState==='running' && el.getBoundingClientRect().bottom>root.getBoundingClientRect().top)break;
        deleteEntry(id,true);
      }
    }
  }
  function addMessage(m, animate=true) {
    if (!m || !m.id || seen.has(m.id) || !config.chat_overlay_enabled) return;
    if (config.chat_hide_commands && String(m.content||'').startsWith('!')) return;
    const lim = currentLimits();
    if(lim.seconds && Date.now()-(Number(m.createdAt)||Date.now())>lim.seconds*1000) return;
    const positions=animate?capturePositions():null;
    const el=createMessage(m);
    el.dataset.time=String(Number(m.createdAt)||Date.now());
    seen.add(m.id);
    if (seen.size > 600) seen.delete(seen.values().next().value);
    entries.set(m.id,el);
    messageData.set(m.id,m);
    root.append(el);
    animateArrival(el,positions,lim.speed);
    prune();
  }
  async function fetchJson(route){
    const res=await fetch(`${API}${route}?key=${encodeURIComponent(key)}`,{cache:'no-store'});
    if(!res.ok)throw new Error(`Chat API ${res.status}`);
    return res.json();
  }
  async function refreshState(first=false){
    try{
      const data=await fetchJson('/state');
      config=data.config||{};
      root.hidden=!data.enabled;
      styleConfig();
      if(!data.enabled){for(const id of [...entries.keys()])deleteEntry(id);return;}
      for(const m of (data.messages||[]))addMessage(m,!first);
      prune();
    }catch(err){console.warn('MinerBot Chat state',err.message)}
  }
  async function loadEmotes(){
    try{
      if(!config.chat_7tv_enabled){emotes=Object.create(null);emotePattern=null;return;}
      const data=await fetchJson('/emotes');
      emotes=Object.assign(Object.create(null),data.emotes||{});
      const names=Object.keys(emotes).filter(Boolean).sort((a,b)=>b.length-a.length);
      const escaped=names.map(name=>name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
      emotePattern=escaped.length?new RegExp('(https?://[^\\s]+)|'+escaped.join('|'),'g'):null;
      // Messages arrived before the 7TV set finished loading: upgrade them in place.
      for(const [id,el] of entries){
        const m=messageData.get(id);
        const body=el.querySelector('.body');
        if(m && body){body.replaceChildren();body.classList.remove('emote-only');drawContent(body,m.content);}
      }
    }catch(err){console.warn('MinerBot 7TV',err.message)}
  }
  function connect(){
    if(!key)return;
    const scheme=location.protocol==='https:'?'wss':'ws';
    const url=`${scheme}://${location.host}/api/streambot/realtime/ws?role=overlay&key=${encodeURIComponent(key)}`;
    ws=new WebSocket(url);
    ws.onopen=()=>{reconnectMs=850;refreshState();};
    ws.onmessage=ev=>{
      let value;try{value=JSON.parse(ev.data)}catch{return}
      if(value.type==='chat.message')addMessage(value.message);
      if(value.type==='chat.refresh'){
        refreshState().then(loadEmotes);
      }
    };
    ws.onerror=()=>ws?.close();
    ws.onclose=()=>{setTimeout(connect,reconnectMs);reconnectMs=Math.min(12000,Math.floor(reconnectMs*1.65));};
  }
  if(!key){console.warn('Falta key en URL del chat de MinerBot');return;}
  refreshState(true).then(loadEmotes);
  window.addEventListener('resize', () => {stopMotion();styleConfig();prune();}, {passive:true});
  reducedMotion?.addEventListener?.('change',stopMotion);
  connect();
  // Fallback and emote updates. WebSocket is the normal low-latency path.
  setInterval(prune,1000);
  setInterval(refreshState,25000);
  setInterval(loadEmotes,15*60*1000);
})();
