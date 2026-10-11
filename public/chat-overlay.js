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
  let badgeOverrides = Object.create(null);
  let fontScale = 1;

  function finiteParam(name, fallback, min, max) {
    const raw = params.get(name);
    const n = raw == null || raw === '' ? Number(fallback) : Number(raw);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : fallback;
  }
  function currentLimits() {
    return {
      max: finiteParam('max', config.chat_max_messages || 5, 1, 10),
      font: finiteParam('font', config.chat_font_size || 18, 11, 38),
      seconds: finiteParam('duration', config.chat_message_seconds ?? 35, 0, 180),
      speed: finiteParam('speed', config.chat_animation_ms || 195, 100, 450),
      gap: finiteParam('gap', config.chat_gap ?? 8, 0, 24),
    };
  }
  function styleConfig() {
    const lim = currentLimits();
    // Browser sources may use the exact same URL at different OBS sizes.
    // Scale CSS-sized typography relative to viewport width while preserving crisp rendering.
    const autoScale = Math.max(0.78, Math.min(3.2, window.innerWidth / 420));
    const explicitScale = Number(params.get('scale'));
    fontScale = params.has('scale') && Number.isFinite(explicitScale) && explicitScale >= .5 && explicitScale <= 4 ? explicitScale : autoScale;
    root.style.setProperty('--font', `${(lim.font * fontScale).toFixed(2)}px`);
    root.style.setProperty('--gap', `${(lim.gap * fontScale).toFixed(2)}px`);
    root.style.setProperty('--enter', `${lim.speed}ms`);
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
    const native = /\[emote:(\d+):([^\]]+)\]|([^\s]+)|(\s+)/g;
    let match, emoteCount = 0, otherCount = 0;
    while ((match = native.exec(text))) {
      if (match[1] && config.chat_kick_emotes_enabled !== false) {
        container.append(makeImage(`https://files.kick.com/emotes/${match[1]}/fullsize`, match[2]));
        emoteCount += 1;
      } else if (match[1]) {
        container.append(document.createTextNode(match[2]));otherCount++;
      } else if (match[3] && config.chat_7tv_enabled !== false && Object.hasOwn(emotes,match[3])) {
        container.append(makeImage(emotes[match[3]], match[3]));
        emoteCount++;
      } else {
        container.append(document.createTextNode(match[3] || match[4] || ''));
        if (match[3]) otherCount++;
      }
    }
    if (emoteCount && !otherCount) container.classList.add('emote-only');
  }
  // Kick's official chat webhook contains badge types/counts, not original image URLs.
  // Default icons mirror publicly available Kick badge assets; channel subscriber tiers
  // can be overridden using public image URLs configured in MinerBot's dashboard.
  const badgeAssetBase = 'https://cpwemotes.co.uk/kick/kickBadges/';
  const globalBadgeFiles = Object.freeze({
    broadcaster:'broadcaster.svg', owner:'broadcaster.svg', founder:'founder.svg',
    moderator:'moderator.svg', mod:'moderator.svg', vip:'vip.svg', og:'og.svg',
    verified:'verified.svg', staff:'staff.svg', sidekick:'sidekick.svg',
    subscriber:'subscriber.svg', sub_gifter:'subGifter.svg', subgifter:'subGifter.svg',
    trainwreckstv:'trainwreckstv.svg'
  });
  function badgeType(b) {
    return String(b.type || '').toLowerCase().replace(/[\s-]+/g,'_').replace(/[^a-z0-9_]/g,'');
  }
  function parseBadgeOverrides(source){
    const result=Object.create(null);
    for(const line of String(source||'').split(/\r?\n/).slice(0,50)){
      const at=line.indexOf('=');if(at<1)continue;
      const key=line.slice(0,at).trim().toLowerCase();
      const url=line.slice(at+1).trim();
      if(/^[a-z0-9_]+(?::\d{1,5})?$/.test(key) && /^https:\/\/[^\s<>\"']{1,500}$/i.test(url))result[key]=url;
    }
    return result;
  }
  function badgeImageUrl(b){
    const type=badgeType(b);
    const count=Number(b.count)||0;
    if(count>0 && badgeOverrides[`${type}:${Math.floor(count)}`])return badgeOverrides[`${type}:${Math.floor(count)}`];
    // For month-based subscriber milestones use the highest configured tier <= months.
    if(type==='subscriber' && count>0){
      const tiers=Object.keys(badgeOverrides).filter(k=>k.startsWith('subscriber:')).map(k=>Number(k.slice(11))).filter(n=>Number.isInteger(n)&&n<=count).sort((a,b)=>b-a);
      if(tiers.length)return badgeOverrides[`subscriber:${tiers[0]}`];
    }
    if(badgeOverrides[type])return badgeOverrides[type];
    if(type==='sub_gifter'||type==='subgifter'){
      const level=[200,100,50,25].find(n=>count>=n);
      return badgeAssetBase+(level?`subGifter${level}.svg`:'subGifter.svg');
    }
    return globalBadgeFiles[type]?badgeAssetBase+globalBadgeFiles[type]:null;
  }
  function isDefaultBadgeUrl(url){
    return url.startsWith(badgeAssetBase) || url.startsWith('/assets/kick-badges/');
  }
  function badgeFallbackIcon(b){
    const t=badgeType(b);
    const base=(t==='mod'?'moderator':t==='owner'?'broadcaster':t==='subgifter'?'sub_gifter':t);
    return ['moderator','vip','og','verified','broadcaster','subscriber','sub_gifter','founder','staff','sidekick'].includes(base) ? `/assets/kick-badges/${base}.svg` : null;
  }
  function badgeText(b) {
    const type = String(b.type || '').toLowerCase();
    const shortNames = { moderator:'MOD',vip:'VIP',subscriber:'SUB',sub_gifter:'GIFT',verified:'✓',broadcaster:'LIVE',og:'OG',founder:'FOUNDER' };
    const name = shortNames[type] || String(b.text || b.type || 'BADGE').toUpperCase().slice(0,15);
    return name + (Number(b.count) > 0 ? ` ${Math.floor(b.count)}` : '');
  }
  function createMessage(m, animate = true) {
    const el = document.createElement('div');
    el.className = 'message'+(animate?' enter':'');
    el.dataset.id = String(m.id || '');
    const name = document.createElement('span');name.className='username';
    name.textContent=String(m.username || 'Viewer');
    name.style.color=/^#[0-9A-Fa-f]{6}$/.test(m.color) ? m.color : '#c9b4ff';
    if (config.chat_badges_enabled !== false && Array.isArray(m.badges) && m.badges.length) {
      const holder = document.createElement('span');holder.className='badges';
      for(const b of m.badges){
        const tag=document.createElement('span');
        tag.className='badge '+badgeType(b).replaceAll('_','-');
        const description=String(b.text || b.type || 'Badge')+(Number(b.count)>0?` · ${b.count}`:'');
        tag.title=description;
        const src=badgeImageUrl(b);
        if(src){
          tag.classList.add('badge-image');
          if(isDefaultBadgeUrl(src))tag.classList.add('badge-default');
          const img=document.createElement('img');img.alt=description;img.title=description;
          img.loading='eager';img.decoding='async';img.referrerPolicy='no-referrer';img.src=src;
          img.onerror=()=>{
            const fallback=badgeFallbackIcon(b);
            if(fallback && !img.dataset.fallback){
              img.dataset.fallback='1';tag.classList.add('badge-default');img.src=fallback;
            }else{tag.classList.remove('badge-image');tag.textContent=badgeText(b);}
          };
          tag.append(img);
        } else tag.textContent=badgeText(b);
        holder.append(tag);
      }
      el.append(holder);
    }
    const separator=document.createElement('span');separator.className='separator';separator.textContent=': ';
    const body=document.createElement('span');body.className='body';
    drawContent(body,m.content);
    // Badges + username + texto comparten la misma línea; el texto se ajusta al ancho del overlay.
    el.append(name,separator,body);
    return el;
  }
  function deleteEntry(id) {
    const el = entries.get(id);
    if (!el) return;
    entries.delete(id);
    messageData.delete(id);
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
    while(entries.size>lim.max) deleteEntry(entries.keys().next().value);
  }
  function addMessage(m, animate=true) {
    if (!m || !m.id || seen.has(m.id) || !config.chat_overlay_enabled) return;
    if (config.chat_hide_commands && String(m.content||'').startsWith('!')) return;
    const lim = currentLimits();
    if(lim.seconds && Date.now()-(Number(m.createdAt)||Date.now())>lim.seconds*1000) return;
    const el=createMessage(m,animate);
    el.dataset.time=String(Number(m.createdAt)||Date.now());
    seen.add(m.id);
    if (seen.size > 600) seen.delete(seen.values().next().value);
    entries.set(m.id,el);
    messageData.set(m.id,m);
    root.append(el);
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
      badgeOverrides=parseBadgeOverrides(config.chat_badge_image_map);
      root.hidden=!data.enabled;
      styleConfig();
      if(!data.enabled){for(const id of [...entries.keys()])deleteEntry(id);return;}
      for(const m of (data.messages||[]).slice(-currentLimits().max))addMessage(m,!first);
      prune();
    }catch(err){console.warn('MinerBot Chat state',err.message)}
  }
  async function loadEmotes(){
    try{
      if(!config.chat_7tv_enabled){emotes=Object.create(null);return;}
      const data=await fetchJson('/emotes');
      emotes=Object.assign(Object.create(null),data.emotes||{});
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
  window.addEventListener('resize', styleConfig, {passive:true});
  connect();
  // Fallback and emote updates. WebSocket is the normal low-latency path.
  setInterval(prune,1000);
  setInterval(refreshState,25000);
  setInterval(loadEmotes,15*60*1000);
})();
