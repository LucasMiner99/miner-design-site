(()=>{
  'use strict';
  const params=new URLSearchParams(location.search);
  const key=params.get('key')||'';
  const previewMode=params.get('preview')==='1';
  const stage=document.getElementById('alerts-stage');
  const card=document.getElementById('miner-alert');
  const label=document.getElementById('alert-label');
  const username=document.getElementById('alert-username');
  const mark=document.getElementById('alert-icon');
  const copy=card.querySelector('.copy');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const queue=[];
  const seen=new Set();
  const sound=new Audio('/assets/alerts/notification_sound.mp3');
  sound.preload='auto';
  let settings={alerts_enabled:true,alerts_sound_enabled:true,alerts_volume:.75,alerts_duration_seconds:5,alerts_scale_percent:100};
  let cursor=0;
  let demoAlert={type:'follow',username:'lucasfan'};
  const bounded=(value,min,max,fallback)=>{
    const n=Number(value);
    return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback;
  };
  function applyDesign(){
    for(const [key,min,max,def,variable] of [
      ['alerts_gap',0,40,21,'--alert-gap'],
      ['alerts_card_width',300,820,580,'--alert-card-width'],
      ['alerts_name_size',16,60,44,'--alert-name-size'],
      ['alerts_label_size',8,32,23,'--alert-label-size'],
    ])card.style.setProperty(variable,`${bounded(settings[key],min,max,def)}px`);
    fit();
  }
  function fit(){
    if(card.hidden)return;
    const factor=Number(stage.style.getPropertyValue('--s'))||1;
    const size=bounded(settings.alerts_name_size,16,60,44)*factor;
    const ctx=document.createElement('canvas').getContext('2d');
    ctx.font=`600 ${size}px AlertDM`;
    const measured=ctx.measureText(username.textContent).width;
    for(let pass=0;pass<4;pass++){
      username.style.fontSize=size+'px';
      if(measured>username.clientWidth)username.style.fontSize=Math.max(16*factor,size*username.clientWidth/measured)+'px';
      card.style.setProperty('--icon-size',(copy.offsetHeight/1.114416)+'px');
    }
  }
  document.fonts.ready.then(fit);

  let initialized=false;
  let playing=false;
  let ws=null;
  let reconnectMs=900;
  let pendingPoll=null;
  let disconnecting=false;

  const templates={
    follow:['Nuevo seguidor','follow','person'],
    sub:['Nueva suscripción','subscription','star'],
    renewal:['Suscripción renovada','subscription','star'],
    gift:[a=>`${a.count||1} ${Number(a.count)===1?'sub regalada':'subs regaladas'}`,'subscription','star'],
    kicks:[a=>`${Number(a.count||1).toLocaleString('es-AR')} KICKs recibidos`,'subscription','star'],
    raid:['Nueva raid','raid','flag'],
    host:['Nuevo hosteo','raid','flag'],
  };

  function scale(){
    const width=Math.max(1,innerWidth),height=Math.max(1,innerHeight);
    const auto=Math.max(.48,Math.min(1.7,width/820,height/195));
    const factor=Math.max(.6,Math.min(1.7,Number(settings.alerts_scale_percent||100)/100));
    stage.style.setProperty('--s',String(Math.max(.40,Math.min(2,auto*factor))));
  }
  window.addEventListener('resize',()=>{scale();fit()});
  function duration(){return Math.max(2,Math.min(15,Number(settings.alerts_duration_seconds)||5))*1000}
  function enabled(a){return settings.alerts_enabled !== false && settings[`alerts_${a.type}`] !== false}
  function accept(a){
    if(!a || !templates[a.type] || !Number.isFinite(Number(a.id)))return;
    const id=Number(a.id);
    if(seen.has(id))return;
    seen.add(id);if(seen.size>300)seen.delete(seen.values().next().value);
    cursor=Math.max(cursor,id);
    if(!enabled(a))return;
    // No reanimar alertas muy antiguas si OBS estuvo desconectado.
    if(Date.now()-Number(a.createdAt||0)>60000)return;
    queue.push(a);
    if(queue.length>35)queue.splice(0,queue.length-35);
    playNext();
  }
  function playSound(){
    if(!settings.alerts_sound_enabled)return;
    sound.pause();sound.currentTime=0;
    sound.volume=Math.max(0,Math.min(1,Number(settings.alerts_volume)||0));
    sound.play().catch(()=>{}); // algunos navegadores requieren interacción; OBS permite audio en fuente de navegador.
  }
  const effects=[];
  const fx=document.createElement('div');fx.className='fx';fx.setAttribute('aria-hidden','true');
  const light=document.createElement('div');light.className='light';fx.append(light);
  const sparks=Array.from({length:18},(_,i)=>{
    const el=document.createElement('span');el.className='spark'+(i%5===1||i%5===3?' dot':i%5===4?' shard':'');fx.append(el);return el;
  });
  card.prepend(fx);
    function burst(){
      fx.style.setProperty('--origin-x',(mark.offsetLeft+mark.offsetWidth/2)+'px');
      fx.style.setProperty('--origin-y',(mark.offsetTop+mark.offsetHeight/2)+'px');
      effects.push(light.animate([{opacity:0,transform:'scale(.6)'},{opacity:.95,transform:'scale(1)',offset:.07},{opacity:.42,transform:'scale(.92)',offset:.24},{opacity:.42,transform:'scale(.92)',offset:.95},{opacity:0,transform:'scale(.85)'}],{duration:Math.max(1000,duration()-200),delay:90,easing:'ease-out'}));
      const radius=Math.min(88,card.offsetLeft+mark.offsetLeft+mark.offsetWidth/2-8);
      sparks.forEach((el,i)=>{
        const angle=(i/sparks.length)*Math.PI*2+(Math.random()-.5)*.25;
        const distance=radius*(.64+Math.random()*.33),start=mark.offsetWidth*.24;
        const peak=.65+Math.random()*.35,spin=el.classList.contains('shard')?.78:0;
        el.style.setProperty('--trail-length',(6+Math.random()*11)+'px');
        el.style.setProperty('--grain-size',(2.5+Math.random()*3)+'px');
        const pose=(r,scale)=>`translate(${Math.cos(angle)*r}px,${Math.sin(angle)*r}px) translate(-50%,-50%) rotate(${angle+spin*r/distance}rad) scale(${scale})`;
        effects.push(el.animate([
          {opacity:0,transform:pose(start,.7),offset:0,easing:'cubic-bezier(.16,.65,.3,1)'},
          {opacity:peak,transform:pose(distance*.7,1),offset:.28,easing:'ease-out'},
          {opacity:peak*.7,transform:pose(distance*.9,.8),offset:.58,easing:'ease-out'},
          {opacity:0,transform:pose(distance,.25),offset:1}
        ],{duration:540+Math.random()*330,delay:105+Math.random()*85,easing:'linear'}));
      });
    }
  function populate(a){
    const template=templates[a.type]||templates.follow;
    label.textContent=typeof template[0]==='function'?template[0](a):template[0];
    username.textContent=String(a.username||'Anónimo').slice(0,85);
    card.dataset.theme=template[1];
    for(const icon of mark.children)icon.toggleAttribute('hidden',icon.dataset.icon!==template[2]);
    applyDesign();
  }
  function staticPreview(){
    card.hidden=false;
    populate(demoAlert);
  }
  function playNext(){
    if(playing||!queue.length||!settings.alerts_enabled)return;
    const a=queue.shift();
    if(!enabled(a)){playNext();return;}
    playing=true;
    card.hidden=false;
    populate(a);
    if(!previewMode)playSound();
    const wait=duration();
    const finish=()=>{
      card.hidden=true;
      effects.splice(0).forEach(effect=>effect.cancel());
      playing=false;
      if(previewMode && !queue.length)staticPreview();
      else playNext();
    };
    if(reduced.matches){setTimeout(finish,wait);return;}
    burst();
    const entry=300/wait;
    const animation=card.animate([
      {opacity:0,transform:'translateY(18px) scale(.9)',offset:0,easing:'cubic-bezier(.22,.65,.25,1)'},
      {opacity:1,offset:entry*.2},
      {opacity:1,transform:'translateY(-3px) scale(1.025)',offset:entry*.58,easing:'ease-out'},
      {opacity:1,transform:'translateY(1px) scale(.995)',offset:entry*.82,easing:'ease-out'},
      {opacity:1,transform:'translateY(0) scale(1)',offset:entry},
      {opacity:1,transform:'translateY(0) scale(1)',offset:1-500/wait,easing:'cubic-bezier(.4,0,.6,1)'},
      {opacity:0,transform:'translateY(12px) scale(1)',offset:1}
    ],{duration:wait,easing:'linear'});
    effects.push(animation);
    animation.onfinish=finish;
  }
  async function poll(first=false){
    if(pendingPoll)return pendingPoll;
    pendingPoll=(async()=>{
      try{
        const res=await fetch(`/api/streambot/alerts/state?key=${encodeURIComponent(key)}&since=${first?0:cursor}`,{cache:'no-store'});
        if(!res.ok)throw new Error(`Alertas: ${res.status}`);
        const data=await res.json();
        settings={...settings,...(data.config||{}),alerts_enabled:data.enabled};
        scale();
        applyDesign();
        if(!initialized){cursor=Number(data.latestId||0);initialized=true;return}
        for(const event of data.alerts||[])accept(event);
        // cursor *no* salta al último si se truncó el historial de eventos;
        // en condiciones normales la cola de <35 eventos permite ponerse al día.
      }catch(err){console.warn('MinerBot Alertas',err.message)}
      finally{pendingPoll=null}
    })();
    return pendingPoll;
  }
  function connect(){
    if(disconnecting)return;
    const proto=location.protocol==='https:'?'wss:':'ws:';
    ws=new WebSocket(`${proto}//${location.host}/api/streambot/realtime/ws?key=${encodeURIComponent(key)}`);
    ws.addEventListener('open',()=>{reconnectMs=900;poll()});
    ws.addEventListener('message',e=>{
      try{
        const event=JSON.parse(e.data);
        if(event.type==='alerts.event')accept(event.alert);
        if(event.type==='alerts.refresh')poll();
      }catch{}
    });
    ws.addEventListener('close',()=>{ws=null;setTimeout(connect,reconnectMs);reconnectMs=Math.min(12000,reconnectMs*1.65)});
    ws.addEventListener('error',()=>{try{ws.close()}catch{}});
  }
  window.addEventListener('pagehide',()=>{disconnecting=true;try{ws?.close()}catch{}});
  scale();
  applyDesign();
  if(previewMode){
    // Preview runs in an isolated iframe: NEVER connect, poll, emit or send to OBS.
    staticPreview();
    window.addEventListener('message',event=>{
      if(event.origin!==location.origin || event.source!==window.parent)return;
      const data=event.data;
      if(!data || data.source!=='minerbot-alert-editor')return;
      if(data.kind==='config' && data.settings && typeof data.settings==='object'){
        settings={...settings,...data.settings};
        scale();
        applyDesign();
        if(!playing)staticPreview();
      } else if(data.kind==='test'){
        const type=String(data.type||'follow');
        if(!templates[type])return;
        demoAlert={type,username:({follow:'lucasfan',sub:'Sofi',renewal:'Sofi',gift:'Dasher',kicks:'Dasher',raid:'StreamerAmigo',host:'StreamerAmigo'})[type],count:({gift:5,kicks:500,raid:120})[type],giftName:'Rage Quit'};
        queue.length=0;
        queue.push(demoAlert);playNext();
      }
    });
    window.parent.postMessage({source:'minerbot-alert-preview',kind:'ready'},location.origin);
  }else{
    poll(true).then(connect);
    setInterval(()=>poll(),4000);
  }
})();
