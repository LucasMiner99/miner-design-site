(()=>{'use strict';
 const $=id=>document.getElementById(id),dialog=$('hubDJDialog'),bridge=()=>window.MINER_HUB_ONLINE,keys=['a','s','d','f'],marks=['●','◆','■','▲'];
 let table=null,item=null,data=null,generation=0,busy=false,pending=0,seq=0,frame=0,stamp=0,local=0,startId=null,finishAttempted=false,sound=true,audio=null,played=new Set(),nodes=[],tones=new Set(),flashes=new Map();
 const now=()=>stamp+performance.now()-local;
 const text=(id,value)=>{if($(id).textContent!==value)$(id).textContent=value;};
 const status=value=>text('hubDJStatus',value);
 function enableAudio(){if(!sound)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{});}catch{}}
 function tone(frequency,when=0,beat=false){if(!sound||audio?.state!=='running')return;try{const o=audio.createOscillator(),g=audio.createGain(),at=audio.currentTime+Math.max(0,when);o.type=beat?'sine':'triangle';o.frequency.setValueAtTime(frequency,at);if(beat)o.frequency.exponentialRampToValueAtTime(45,at+.08);g.gain.setValueAtTime(beat?.12:.035,at);g.gain.exponentialRampToValueAtTime(.001,at+(beat?.1:.16));o.connect(g);g.connect(audio.destination);o.onended=()=>tones.delete(o);tones.add(o);o.start(at);o.stop(at+.18);}catch{}}
 function stopAudio(){for(const o of tones)try{o.stop();}catch{}tones.clear();}
 function apply(next,at,calibrate){
  const previous=data?.session,s=next.session;
  if(previous&&s?.id===previous.id&&(s.round.level<previous.round.level||s.round.level===previous.round.level&&s.round.version<previous.round.version))return;
  if(calibrate){stamp=next.serverNow+performance.now()-at;local=performance.now();}
  const changed=previous?.id!==s?.id||previous?.round.level!==s?.round.level;data=next;
  if(changed){seq=Math.max(0,...Object.values(s?.round.hits||{}).map(()=>0));played.clear();finishAttempted=false;stopAudio();buildTrack();}
  // Reopening resumes after all previously accepted sequence numbers.
  seq=Math.max(seq,s?.round.lastSeq||0);render();
 }
 function buildTrack(){const holder=$('hubDJNotes');holder.replaceChildren();nodes=[];for(const n of data?.session?.round.notes||[]){const el=document.createElement('i');el.className='hub-dj-note';el.textContent=marks[n.lane];el.style.left=(n.lane*25+2)+'%';holder.append(el);nodes.push(el);}}
 async function request(action,extra={}){
  const token=generation,at=performance.now();const next=await bridge().dj(action,{...table,...extra});if(token!==generation||!dialog.open)return null;apply(next,at,action==='open'||action==='start');return next;
 }
 function controls(){const s=data?.session,r=s?.round,active=r&&!r.finished&&s.roomId===table?.roomId&&s.itemId===table?.itemId;
  const enabled=active&&!busy&&now()>=r.start-r.window&&now()<=r.end&&seq<64;
  for(const b of $('hubDJPads').children)b.disabled=!enabled;
  $('hubDJStart').disabled=busy||!data;$('hubDJFinish').disabled=busy||pending>0||!active||now()<r.end;
 }
 function render(){
  const s=data?.session,r=s?.round,matching=s?.roomId===table?.roomId&&s?.itemId===table?.itemId,active=matching&&r&&!r.finished;
  $('hubDJWelcome').hidden=!!s&&matching;$('hubDJPlay').hidden=!active;$('hubDJResult').hidden=!matching||!r?.finished;$('hubDJStart').hidden=!!active;$('hubDJFinish').hidden=!active||!finishAttempted;
  if(data)text('hubDJDaily',data.daily.remaining?data.daily.remaining+' créditos disponibles hoy':'Modo práctica · límite de hoy alcanzado');
  if(s&&!matching)status('Tenés una partida en otra mesa. Volvé allí o esperá cinco minutos.');
  if(active){text('hubDJRound',`${r.level+1}/3 · ${r.name} · ${r.bpm} BPM`);text('hubDJAccuracy',`${s.hits}/${r.count} aciertos · ${r.faults} errores`);}
  if(matching&&r?.finished){const result=s.results[r.level];text('hubDJResultTitle',s.done?'¡Set completo!':result.passed?'¡Ronda superada!':'Seguí practicando');text('hubDJResultCredits','+'+(s.done?s.total:result.amount)+' créditos');text('hubDJResultDetail',result.accuracy+' % de precisión'+(s.done?' · Total de las tres rondas':result.passed?' · Subimos la dificultad.':' · Necesitás 65 %. Podés continuar.'));text('hubDJStart',s.done?'Otra partida':'Siguiente ronda');}
  else text('hubDJStart','Empezar');controls();cancelAnimationFrame(frame);if(active)frame=requestAnimationFrame(tick);
 }
 function tick(){
  const s=data?.session,r=s?.round;if(!dialog.open||!r||r.finished)return;const at=now();
  if(at>s.expiresAt){data.session=null;status('La partida terminó. Podés empezar otra.');render();return;}
  const height=$('hubDJTrack').clientHeight||250,line=height-32;
  for(let i=0;i<nodes.length;i++){const n=r.notes[i],delta=n.at-at,y=line-delta/1800*(height-20),el=nodes[i];el.hidden=!!r.hits[i]||y<-20||y>height+15;el.style.transform='translateY('+Math.round(y-10)+'px)';
   if(!played.has(i)&&delta<=100){played.add(i);if(delta>=-60)tone(i%4===0?140:90,delta/1000,true);}
  }
  const countdown=at<r.start?String(Math.max(1,Math.ceil((r.start-at)/1000))):'';text('hubDJCountdown',countdown);
  for(const [lane,until]of flashes)if(at>=until){$('hubDJPads').children[lane].classList.remove('is-hit');flashes.delete(lane);}
  controls();if(at>r.end+300&&pending===0&&!finishAttempted){void finish();return;}frame=requestAnimationFrame(tick);
 }
 async function finish(){const s=data?.session;if(busy||pending||!s||s.round.finished)return;const token=generation;finishAttempted=true;busy=true;controls();status('Confirmando ronda…');try{const result=await request('finish',{sessionId:s.id,level:s.round.level});if(result)status('');}catch(e){if(token===generation)status(e.message+' Tocá Confirmar resultado para reintentar.');}finally{if(token===generation){busy=false;render();}}}
 async function hit(lane){const s=data?.session,r=s?.round,button=$('hubDJPads').children[lane];if(!s||r.finished||button.disabled)return;
  const token=generation;seq++;pending++;button.classList.add('is-hit');flashes.set(lane,now()+130);tone([262,330,392,523][lane]);
  try{const result=await request('hit',{sessionId:s.id,level:r.level,seq,lane});if(result)status(result.receipt?.hit?'¡Bien!':'Fuera de ritmo');}
  catch(e){if(token===generation)status(e.message);}
  finally{if(token===generation){pending--;controls();}}
 }
 for(let lane=0;lane<4;lane++){const b=document.createElement('button');b.type='button';b.setAttribute('aria-label','Pista '+keys[lane].toUpperCase());b.innerHTML='<span>'+marks[lane]+'</span><strong>'+keys[lane].toUpperCase()+'</strong>';b.addEventListener('pointerdown',e=>{if(e.button===0){e.preventDefault();void hit(lane);}});b.onclick=e=>{if(!e.detail)void hit(lane);};$('hubDJPads').append(b);}
 document.addEventListener('keydown',e=>{if(!dialog.open||e.repeat||e.ctrlKey||e.altKey||e.metaKey)return;const lane=keys.indexOf(e.key.toLowerCase());if(lane>=0){e.preventDefault();void hit(lane);}});
 $('hubDJStart').onclick=async()=>{if(busy)return;enableAudio();const token=generation;busy=true;startId??=crypto.randomUUID();controls();status('');try{const result=await request('start',{requestId:startId});if(result)startId=null;}catch(e){if(token===generation)status(e.message);}finally{if(token===generation){busy=false;render();}}};
 $('hubDJFinish').onclick=finish;$('hubDJClose').onclick=()=>dialog.close();
 $('hubDJSound').onclick=()=>{sound=!sound;$('hubDJSound').setAttribute('aria-pressed',String(sound));text('hubDJSound',sound?'Sonido: sí':'Sonido: no');if(sound)enableAudio();else stopAudio();};
 $('hubDJMusic').onclick=()=>{const source=item;dialog.close();window.HubMedia?.open(source);};
 dialog.addEventListener('close',()=>{generation++;busy=false;pending=0;data=null;table=null;item=null;startId=null;seq=0;played.clear();flashes.clear();for(const b of $('hubDJPads').children)b.classList.remove('is-hit');cancelAnimationFrame(frame);stopAudio();});
 window.HubDJ={async open(source){if(dialog.open)return;generation++;const token=generation;item=source;table={roomId:bridge().room.id,itemId:source.id};data=null;busy=true;render();dialog.showModal();bridge().preview({kind:'object',type:source.type,id:'object:'+source.type},$('hubDJArt'));status('Abriendo mesa…');try{const result=await request('open');if(result&&(!result.session||result.session.roomId===table?.roomId&&result.session.itemId===table?.itemId))status('');}catch(e){if(token===generation)status(e.message);}finally{if(token===generation){busy=false;render();}}},close(){if(dialog.open)dialog.close();}};
})();
