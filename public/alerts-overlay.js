(()=>{
  'use strict';
  const params=new URLSearchParams(location.search);
  const key=params.get('key')||'';
  const previewMode=params.get('preview')==='1';
  const stage=document.getElementById('alerts-stage');
  const card=document.getElementById('miner-alert');
  const label=document.getElementById('alert-label');
  const username=document.getElementById('alert-username');
  const description=document.getElementById('alert-description');
  const queue=[];
  const seen=new Set();
  const sound=new Audio('/assets/alerts/notification_sound.mp3');
  sound.preload='auto';
  let settings={alerts_enabled:true,alerts_sound_enabled:true,alerts_volume:.75,alerts_duration_seconds:5,alerts_scale_percent:100};
  let cursor=0;
  let demoAlert={type:'follow',username:'lucasfan'};
  const designDefaults={
    alerts_bg_color:'#101116',alerts_gradient_percent:25,alerts_logo_size:68,
    alerts_gap:12,alerts_padding_x:17,alerts_padding_y:12,
    alerts_card_width:560,alerts_name_size:29,alerts_label_size:11,alerts_message_size:14
  };
  const bounded=(value,min,max,fallback)=>{
    const n=Number(value);
    return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback;
  };
  function applyDesign(){
    const css=card.style;
    const bg=String(settings.alerts_bg_color||designDefaults.alerts_bg_color);
    css.setProperty('--alert-bg',/^#[0-9a-f]{6}$/i.test(bg)?bg:'#101116');
    css.setProperty('--alert-gradient-opacity',String(bounded(settings.alerts_gradient_percent,0,100,25)/100));
    for(const [key,min,max,def,variable] of [
      ['alerts_logo_size',35,120,68,'--alert-logo-size'],
      ['alerts_gap',0,40,12,'--alert-gap'],
      ['alerts_padding_x',4,40,17,'--alert-padding-x'],
      ['alerts_padding_y',4,32,12,'--alert-padding-y'],
      ['alerts_card_width',300,820,560,'--alert-card-width'],
      ['alerts_name_size',16,48,29,'--alert-name-size'],
      ['alerts_label_size',8,22,11,'--alert-label-size'],
      ['alerts_message_size',10,28,14,'--alert-message-size'],
    ])css.setProperty(variable,`${bounded(settings[key],min,max,def)}px`);
  }

  let initialized=false;
  let playing=false;
  let ws=null;
  let reconnectMs=900;
  let pendingPoll=null;
  let disconnecting=false;

  const templates={
    follow:['NUEVO SEGUIDOR','¡Gracias por seguir el canal!'],
    sub:['NUEVO SUSCRIPTOR','¡Gracias por suscribirte!'],
    renewal:['SUSCRIPCIÓN RENOVADA','¡Gracias por renovar tu sub!'],
    gift:['SUBS REGALADAS',a=>`Regaló ${a.count||1} ${Number(a.count)===1?'suscripción':'suscripciones'}`],
    kicks:['KICKS RECIBIDOS',a=>`Envió ${Number(a.count||1).toLocaleString('es-AR')} KICKs${a.giftName?' · '+a.giftName:''}`],
    raid:['RAID RECIBIDA',a=>`¡Nos trajo ${a.count||1} viewers!`],
    host:['NUEVO HOST','¡Está hosteando el canal!'],
  };

  function scale(){
    const width=Math.max(1,innerWidth),height=Math.max(1,innerHeight);
    const auto=Math.max(.48,Math.min(1.7,width/820,height/195));
    const factor=Math.max(.6,Math.min(1.7,Number(settings.alerts_scale_percent||100)/100));
    stage.style.setProperty('--s',String(Math.max(.40,Math.min(2,auto*factor))));
  }
  window.addEventListener('resize',scale);
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
  function populate(a){
    const template=templates[a.type]||templates.follow;
    label.textContent=template[0];
    username.textContent=String(a.username||'Anónimo').slice(0,85);
    description.textContent=typeof template[1]==='function'?template[1](a):template[1];
    card.style.setProperty('--duration',`${duration()}ms`);
    applyDesign();
  }
  function staticPreview(){
    populate(demoAlert);
    card.hidden=false;
    card.className='alert';
  }
  function playNext(){
    if(playing||!queue.length||!settings.alerts_enabled)return;
    playing=true;
    const a=queue.shift();
    populate(a);
    card.hidden=false;
    card.style.setProperty('--duration',`${duration()}ms`);
    card.className='alert';
    // Forzar el reinicio de las animaciones incluso cuando llegan avisos seguidos.
    void card.offsetWidth;
    card.classList.add('enter','running');
    if(!previewMode)playSound();
    const wait=duration();
    setTimeout(()=>{
      card.classList.remove('enter','running');
      card.classList.add('leave');
      setTimeout(()=>{
        card.hidden=true;
        card.className='alert';
        playing=false;
        if(previewMode && !queue.length)staticPreview();
        else playNext();
      },210);
    },Math.max(800,wait-210));
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
        if(!playing)queue.push(demoAlert),playNext();
      }
    });
    window.parent.postMessage({source:'minerbot-alert-preview',kind:'ready'},location.origin);
  }else{
    poll(true).then(connect);
    setInterval(()=>poll(),4000);
  }
})();
