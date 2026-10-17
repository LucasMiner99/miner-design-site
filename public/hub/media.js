(()=>{'use strict';
 const $=id=>document.getElementById(id),bridge=()=>window.MINER_HUB_ONLINE,types=new Set([13,24,43,48,61,72]);
 let room=null,state=null,sampled=0,source=null,player=null,ready=false,apiPromise=null,loaded=null,minimized=false,generation=0,failed=null,blocked=false,duration=0,scrubbing=false;
 const owner=()=>room&&bridge().user.id===room.ownerId;
 const status=text=>$('hubMediaStatus').textContent=text;
 const position=()=>state?Math.min(86400,state.position+(state.playing?Math.max(0,performance.now()-sampled)/1000:0)):0;
 const time=value=>{const n=Math.max(0,Math.floor(value));return n>=3600?Math.floor(n/3600)+':'+String(Math.floor(n/60)%60).padStart(2,'0')+':'+String(n%60).padStart(2,'0'):Math.floor(n/60)+':'+String(n%60).padStart(2,'0');};
 function timeline(){
  if(ready&&loaded===state?.videoId){const next=player.getDuration?.();if(Number.isFinite(next)&&next>0)duration=Math.min(next,86400);}
  const seek=$('hubMediaSeek');seek.max=duration||0;seek.disabled=!owner()||!state||!duration||!!failed;seek.title=owner()?'Adelantar o retroceder para toda la sala':'El dueño controla la reproducción';
  const at=scrubbing?Number(seek.value):Math.min(position(),duration||86400);if(!scrubbing)seek.value=at;seek.setAttribute('aria-valuetext',time(at)+' de '+(duration?time(duration):'duración pendiente'));
  $('hubMediaElapsed').textContent=time(at);$('hubMediaDuration').textContent=duration?time(duration):'—';
 }
 function controls(){
  $('hubMusic').hidden=!state;$('hubMediaForm').hidden=!owner();$('hubMediaControls').hidden=!owner()||!state;$('hubMediaTimeline').hidden=!state;
  $('hubMediaListen').hidden=!state||!blocked;$('hubMediaPause').textContent=state?.playing?'Pausar':'Reproducir';timeline();
 }
 function destroy(){generation++;if(player)try{player.destroy();}catch{}player=null;ready=false;loaded=null;duration=0;scrubbing=false;blocked=false;$('hubYouTubeMount').replaceChildren();}
 function api(){if(window.YT?.Player)return Promise.resolve();if(apiPromise)return apiPromise;apiPromise=new Promise((resolve,reject)=>{const script=document.createElement('script'),prior=window.onYouTubeIframeAPIReady;window.onYouTubeIframeAPIReady=()=>{prior?.();resolve();};script.src='https://www.youtube.com/iframe_api';script.onerror=()=>{apiPromise=null;script.remove();reject(Error('No pudimos conectar con YouTube.'));};document.head.append(script);});return apiPromise;}
 function apply(force=false){if(!ready||!player||!state||failed===state.videoId)return;const at=position();
  if(loaded!==state.videoId){loaded=state.videoId;duration=0;player[state.playing?'loadVideoById':'cueVideoById']({videoId:loaded,startSeconds:at});}
  else{if(force||Math.abs((player.getCurrentTime()||0)-at)>2)player.seekTo(at,true);if(!state.playing)player.pauseVideo();else if(force&&!blocked)player.playVideo();}
  player.setVolume(Number($('hubMediaVolume').value));timeline();
 }
 async function ensure(){if(player||!state)return;const token=++generation;try{await api();if(token!==generation||!state)return;const mount=document.createElement('div');$('hubYouTubeMount').replaceChildren(mount);
  player=new window.YT.Player(mount,{width:320,height:200,playerVars:{origin:location.origin,playsinline:1,controls:0,disablekb:1},events:{
   onReady:e=>{if(token!==generation)return;player=e.target;ready=true;const iframe=player.getIframe();iframe.setAttribute('tabindex','-1');iframe.setAttribute('aria-hidden','true');iframe.setAttribute('referrerpolicy','strict-origin-when-cross-origin');apply(true);},
   onAutoplayBlocked:()=>{if(token!==generation)return;blocked=true;$('hubMediaDock').hidden=false;minimized=false;controls();status('Tu navegador necesita un toque para empezar a escuchar.');},
   onStateChange:e=>{if(token!==generation)return;if(e.data===1){blocked=false;controls();status('Sonando en la sala.');}if(e.data===0&&owner()&&state?.playing)bridge().send('media',{action:'pause'});timeline();},
   onError:e=>{if(token!==generation)return;failed=state?.videoId;blocked=false;controls();status([101,150].includes(e.data)?'Este video no permite reproducirse fuera de YouTube. Probá otro enlace.':e.data===100?'El video no existe, es privado o fue eliminado.':e.data===153?'YouTube rechazó la reproducción en esta página. Probá otro enlace.':'No se pudo reproducir este video. Probá otro enlace.');}
  }});
 }catch(e){status(e.message);}}
 function receive(next){
  const changed=state?.videoId!==next?.videoId||state?.revision!==next?.revision,newVideo=state?.videoId!==next?.videoId;
  state=next;sampled=performance.now();if(newVideo){duration=0;failed=null;blocked=false;scrubbing=false;}
  if(!state){destroy();controls();status(owner()?'Pegá un enlace para poner música.':'El dueño de la sala elige la música.');return;}
  source=room?.scene.items.find(i=>i.id===state.itemId)||source;controls();
  if(changed&&!failed)status(state.playing?'Sonando en la sala.':'En pausa.');if(!minimized)$('hubMediaDock').hidden=false;ensure();apply(changed);
 }
 function open(item){if(item)source=item;minimized=false;$('hubMediaDock').hidden=false;$('hubMediaTitle').textContent='Música de la sala';controls();if(state){ensure();}else status(owner()?'Pegá un enlace para poner música.':'El dueño de la sala elige la música.');}
 $('hubMediaClose').onclick=()=>{minimized=true;$('hubMediaDock').hidden=true;};$('hubMusic').onclick=()=>open();
 $('hubMediaForm').onsubmit=e=>{e.preventDefault();if(!owner())return;if(!source){status('Tocá una compu, radio o tocadiscos de la sala.');return;}bridge().send('media',{action:'load',itemId:source.id,url:$('hubMediaURL').value.trim()});};
 $('hubMediaPause').onclick=()=>{if(owner()&&state)bridge().send('media',{action:state.playing?'pause':'resume'});};$('hubMediaStop').onclick=()=>{if(owner())bridge().send('media',{action:'stop'});};
 $('hubMediaSeek').oninput=()=>{if(!owner()||!state)return;scrubbing=true;timeline();};
 $('hubMediaSeek').onchange=()=>{const at=Number($('hubMediaSeek').value);scrubbing=false;if(owner()&&state&&duration&&Number.isFinite(at))bridge().send('media',{action:'seek',videoId:state.videoId,position:Math.min(duration,Math.max(0,at))});};
 $('hubMediaSeek').addEventListener('pointercancel',()=>{scrubbing=false;timeline();});
 $('hubMediaVolume').oninput=()=>{if(ready)player.setVolume(Number($('hubMediaVolume').value));};
 $('hubMediaListen').onclick=()=>{if(!state)return;blocked=false;controls();ensure();if(ready){player.unMute();apply(true);}};
 setInterval(()=>{if(state&&ready)bridge().send('media',{action:'sync'});},15000);
 setInterval(()=>{if(state&&!minimized)timeline();},500);
 window.HubMedia={supports:type=>types.has(type),open,receive,room(next,media){destroy();room=next;source=null;minimized=false;state=null;failed=null;$('hubMediaDock').hidden=true;receive(media);},error(text){scrubbing=false;if(!$('hubMediaDock').hidden)status(text);},disconnected(){destroy();state=null;controls();status('Audio detenido: se perdió la conexión.');}};
})();
