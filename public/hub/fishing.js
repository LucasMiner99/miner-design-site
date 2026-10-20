import {FISH,FISHING,fishOf,barHeight,fishPosition,stepFishing,sizeRatio,sizeLabel} from './fishing-rules.mjs';
(()=>{
 'use strict';
 const $=id=>document.getElementById(id),dialog=$('hubFishingDialog'),bridge=()=>window.MINER_HUB_ONLINE;
 let table=null,data=null,sim=null,held=false,queue=[],acked=0,payload=null,pending=false,busy=false,generation=0,frame=0,clock=0,local=0,lastSend=0,retryAt=0,tab='play',rankTab='size',startId=null,shownResult=null;
 const now=()=>clock+performance.now()-local,text=(id,v)=>{if($(id).textContent!==v)$(id).textContent=v;},status=v=>text('hubFishingStatus',v);
 const matches=s=>s?.roomId===table?.roomId&&s?.itemId===table?.itemId;
 const playing=()=>matches(data?.session)&&!data.session.state.done;
 const imagePath=id=>'assets/v62-fish-'+id+'.webp';
 function merge(next,at,calibrate=false){
  if(calibrate){clock=next.serverNow+(performance.now()-at)/2;local=performance.now();}
  const old=data?.session,s=next.session;if(old&&s&&old.id===s.id&&s.state.tick<old.state.tick)return;
  data={...data,...next};
  if(s&&matches(s)){
   if(!sim||sim.id!==s.id){sim=structuredClone(s);queue=[];acked=s.state.tick;held=false;shownResult=null;}
   if(s.state.done){sim=structuredClone(s);queue=[];payload=null;held=false;}
  }else sim=null;
  render();
 }
 async function request(action,extra={},calibrate=false){
  const token=generation,at=performance.now(),next=await bridge().fishing(action,{...table,...extra});
  if(token!==generation||!dialog.open)return null;merge(next,at,calibrate);return next;
 }
 function collection(){
  const root=$('hubFishingCollection');root.replaceChildren();
  for(const f of FISH){
   const card=document.createElement('div'),img=document.createElement('img'),label=document.createElement('strong'),size=document.createElement('small'),best=data?.profile?.best?.[f.id];
   card.className='hub-fish-collection-item'+(best?' caught':'');img.src=imagePath(f.id);img.alt=f.name;label.textContent=f.name;size.textContent=best?sizeLabel(best.lengthMm):f.rarity;
   card.append(img,label,size);root.append(card);
  }
 }
 function rankings(){
  const root=$('hubFishingRankList');root.replaceChildren();
  const rows=data?.ranking?.[rankTab]||[];
  if(!rows.length){const empty=document.createElement('p');empty.className='hub-fish-empty';empty.textContent='Todavía no hay capturas. ¡El primer puesto puede ser tuyo!';root.append(empty);return;}
  rows.forEach((r,i)=>{
   const f=FISH.find(f=>f.id===r.species);if(!f)return;
   const row=document.createElement('li'),pos=document.createElement('span'),img=document.createElement('img'),who=document.createElement('div'),name=document.createElement('strong'),detail=document.createElement('small'),size=document.createElement('b');
   row.className='hub-fish-rank-row';pos.textContent=String(i+1).padStart(2,'0');img.src=imagePath(f.id);img.alt='';name.textContent=r.name;detail.textContent=f.name+' · '+f.rarity;size.textContent=sizeLabel(r.lengthMm);who.append(name,detail);row.append(pos,img,who,size);root.append(row);
  });
 }
 function render(){
  const s=data?.session,active=playing(),finished=matches(s)&&s.state.done;
  $('hubFishingPlayTab').setAttribute('aria-selected',String(tab==='play'));$('hubFishingRankTab').setAttribute('aria-selected',String(tab==='ranking'));$('hubFishingRankTab').disabled=active;
  $('hubFishingPlayPanel').hidden=tab!=='play';$('hubFishingRanking').hidden=tab!=='ranking';
  $('hubFishingWelcome').hidden=active||finished;$('hubFishingRound').hidden=!active;$('hubFishingResult').hidden=!finished;
  $('hubFishingCollection').hidden=active;
  $('hubFishingStart').hidden=active;$('hubFishingStart').disabled=busy||!data||!!s&&!matches(s)&&!s.state.done;
  $('hubFishingHold').disabled=!active||!!sim?.state.done;$('hubFishingHold').setAttribute('aria-pressed',String(held));
  $('hubFishingRefresh').disabled=busy;
  if(data){text('hubFishingDaily',data.daily.remaining?data.daily.remaining+' créditos disponibles hoy':'Límite de créditos alcanzado · Podés seguir sumando récords');const count=data.profile?.caught||0;text('hubFishingCount',count+(count===1?' captura':' capturas'));}
  if(s&&!matches(s)&&!s.state.done)status('Tenés una pesca en otra máquina. Terminá allí o esperá unos segundos.');
  if(finished&&shownResult!==s.id){
   shownResult=s.id;const r=s.result,caught=r?.caught;const f=fishOf(s);
   $('hubFishingResult').dataset.caught=String(!!caught);$('hubFishingResultArt').hidden=!caught;
   $('hubFishingResultArt').src=imagePath(f.id);$('hubFishingResultArt').alt=f.name;$('hubFishingResultArt').style.width=(130+sizeRatio(s)*85)+'px';
   text('hubFishingResultTitle',caught?'¡Lo pescaste!':'Se escapó…');text('hubFishingFishName',caught?f.name:'La próxima es tuya');text('hubFishingSize',caught?sizeLabel(s.lengthMm):'');
   text('hubFishingRarity',caught?f.rarity:'Probá con pulsaciones cortas para frenar la barra.');$('hubFishingRarity').style.color=caught?f.color:'';
   text('hubFishingPrize',caught?'+'+r.amount+' créditos':'');text('hubFishingBest',caught&&r.personalBest?'Nuevo récord personal de esta especie':'');
   status('');collection();rankings();
  }
  text('hubFishingStart',finished?'Volver a pescar':'Lanzar la caña');
  if(active&&!frame)frame=requestAnimationFrame(tick);
 }
 function draw(){
  if(!sim)return;const p=sim.state,half=barHeight(sim)/2,at=now();
  $('hubFishingZone').style.height=(half*200)+'%';$('hubFishingZone').style.top=((p.y-half)*100)+'%';
  $('hubFishingTarget').style.top=(fishPosition(sim,p.tick)*100)+'%';
  const inside=Math.abs(fishPosition(sim,p.tick)-p.y)<=half+.018;
  $('hubFishingTrack').dataset.inside=String(inside);$('hubFishingFill').style.height=(p.progress*100)+'%';
  $('hubFishingProgress').setAttribute('aria-valuenow',String(Math.round(p.progress*100)));
  text('hubFishingProgressText',Math.round(p.progress*100)+' %');
  text('hubFishingPhase',at<sim.startAt?'¡Picó! '+Math.max(1,Math.ceil((sim.startAt-at)/1000)):p.done?'Confirmando captura…':inside?'¡Mantenelo ahí!':'Seguí al pez');
  text('hubFishingTimer',Math.max(0,Math.ceil((FISHING.maxTicks-p.tick)*FISHING.stepMs/1000))+' s');
  $('hubFishingHold').setAttribute('aria-pressed',String(held));$('hubFishingHold').disabled=p.done;
 }
 async function flush(){
  if(pending||!sim||!queue.length||performance.now()<retryAt)return;
  payload??={sessionId:sim.id,requestId:crypto.randomUUID(),from:acked,inputs:queue.slice(0,FISHING.batchLimit)};
  const sent=payload,token=generation;pending=true;lastSend=performance.now();
  try{
   const next=await bridge().fishing('input',{...table,...sent});
   if(token!==generation||!dialog.open)return;
   const accepted=next.session.state.tick-sent.from;
   queue.splice(0,Math.max(0,accepted));acked=next.session.state.tick;payload=null;retryAt=0;
   merge(next,0);if(!next.session.state.done)status('');
  }catch(e){
   if(token===generation){retryAt=performance.now()+1000;status('Reconectando la captura…');
    if(e.status&&e.status<500&&e.status!==409){status(e.message);void cancelRound();}
    else if(e.status===409&&!/avance/.test(e.message)){status(e.message);void recover();}
   }
  }finally{if(token===generation)pending=false;}
 }
 function tick(){
  frame=0;if(!dialog.open||!playing()||!sim)return;
  const desired=Math.min(FISHING.maxTicks,Math.max(0,Math.floor((now()-sim.startAt)/FISHING.stepMs)));
  let steps=0;
  while(sim.state.tick<desired&&!sim.state.done&&queue.length<80&&steps++<80){queue.push(held?1:0);sim.state=stepFishing(sim,held);}
  draw();
  if((performance.now()-lastSend>=900||sim.state.done)&&queue.length)void flush();
  if(now()>sim.expiresAt+1000){void recover();return;}
  frame=requestAnimationFrame(tick);
 }
 async function recover(){if(busy)return;busy=true;held=false;try{const next=await request('open',{},true);if(next){sim=null;queue=[];payload=null;merge(next,0);}}catch(e){status(e.message);}finally{busy=false;render();}}
 async function cancelRound(){
  if(!playing())return;held=false;const token=generation;
  try{await request('cancel',{sessionId:data.session.id});}catch(e){if(token===generation)status(e.message);}
 }
 $('hubFishingStart').onclick=async()=>{
  if(busy)return;busy=true;startId??=crypto.randomUUID();status('');render();const token=generation;
  try{const next=await request('start',{requestId:startId},true);if(next){startId=null;tab='play';$('hubFishingHold').focus({preventScroll:true});}}
  catch(e){if(token===generation)status(e.message);}finally{if(token===generation){busy=false;render();}}
 };
 const hold=$('hubFishingHold');
 hold.addEventListener('pointerdown',e=>{if(e.button!==0||!playing()||sim?.state.done)return;e.preventDefault();held=true;hold.setPointerCapture(e.pointerId);hold.focus({preventScroll:true});});
 for(const name of ['pointerup','pointercancel','lostpointercapture'])hold.addEventListener(name,()=>{held=false;});
 dialog.addEventListener('keydown',e=>{e.stopPropagation();if(playing()&&(e.code==='Space'||e.code==='ArrowUp')){e.preventDefault();held=true;}});
 dialog.addEventListener('keyup',e=>{e.stopPropagation();if(e.code==='Space'||e.code==='ArrowUp'){if(playing())e.preventDefault();held=false;}});
 window.addEventListener('blur',()=>{held=false;});document.addEventListener('visibilitychange',()=>{if(document.hidden&&dialog.open){held=false;void cancelRound();}});
 $('hubFishingPlayTab').onclick=()=>{tab='play';render();};
 $('hubFishingRankTab').onclick=()=>{if(playing())return;tab='ranking';rankings();render();};
 for(const name of ['size','rarity'])$('hubFishingRank-'+name).onclick=()=>{rankTab=name;for(const id of ['size','rarity'])$('hubFishingRank-'+id).setAttribute('aria-pressed',String(id===name));rankings();};
 $('hubFishingRefresh').onclick=async()=>{if(busy)return;busy=true;render();try{await request('ranking');rankings();status('');}catch(e){status(e.message);}finally{busy=false;render();}};
 $('hubFishingClose').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>{
  const cancel=playing()?{...table,sessionId:data.session.id}:null;generation++;cancelAnimationFrame(frame);frame=0;held=false;table=null;data=null;sim=null;queue=[];payload=null;pending=false;busy=false;startId=null;shownResult=null;
  if(cancel)void bridge().fishing('cancel',cancel).catch(()=>{});
 });
 window.HubFishing={
  async open(item){
   if(dialog.open)return;generation++;const token=generation;table={roomId:bridge().room.id,itemId:item.id};data=null;sim=null;tab='play';busy=true;retryAt=0;lastSend=0;shownResult=null;
   status('Abriendo la laguna…');render();collection();dialog.showModal();bridge().preview({kind:'object',type:item.type,id:'object:'+item.type},$('hubFishingArt'));
   try{const next=await request('open',{},true);if(next){collection();rankings();status('');}}catch(e){if(token===generation)status(e.message);}
   finally{if(token===generation){busy=false;render();}}
  },
  close(){if(dialog.open)dialog.close();}
 };
})();
