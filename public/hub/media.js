(()=>{'use strict';const $=id=>document.getElementById(id),bridge=()=>window.MINER_HUB_ONLINE,types=new Set([13,24,43,48,61,72]);let room=null,state=null,sampled=0,source=null,player=null,ready=false,apiPromise=null,loaded=null,closed=false,generation=0,failed=null;
 const owner=()=>room&&(bridge().user.id===room.ownerId||bridge().user.admin);
 const status=text=>$('hubMediaStatus').textContent=text;
 const position=()=>state?Math.min(86400,state.position+(state.playing?(performance.now()-sampled)/1000:0)):0;
 function controls(){$('hubMusic').hidden=!state;$('hubMediaForm').hidden=!owner();$('hubMediaControls').hidden=!owner()||!state;$('hubMediaListen').disabled=!state;$('hubMediaPause').textContent=state?.playing?'Pausar sala':'Reanudar sala';}
 function destroy(){generation++;if(player)try{player.destroy();}catch{}player=null;ready=false;loaded=null;$('hubYouTubeMount').replaceChildren();}
 function api(){if(window.YT?.Player)return Promise.resolve();if(apiPromise)return apiPromise;apiPromise=new Promise((resolve,reject)=>{const script=document.createElement('script'),prior=window.onYouTubeIframeAPIReady;window.onYouTubeIframeAPIReady=()=>{prior?.();resolve();};script.src='https://www.youtube.com/iframe_api';script.onerror=()=>{apiPromise=null;script.remove();reject(Error('No pudimos conectar con YouTube.'));};document.head.append(script);});return apiPromise;}
 function apply(force=false){if(!ready||!player||!state||closed||failed===state.videoId)return;const at=position();
  if(loaded!==state.videoId){loaded=state.videoId;player[state.playing?'loadVideoById':'cueVideoById']({videoId:loaded,startSeconds:at});}
  else{if(Math.abs((player.getCurrentTime()||0)-at)>2)player.seekTo(at,true);if(!state.playing)player.pauseVideo();else if(force)player.playVideo();}
  player.setVolume(Number($('hubMediaVolume').value));
 }
 async function ensure(){if(player||!state||closed)return;const token=++generation;try{await api();if(token!==generation||!state||closed)return;const mount=document.createElement('div');$('hubYouTubeMount').replaceChildren(mount);
  player=new window.YT.Player(mount,{width:320,height:200,playerVars:{origin:location.origin,playsinline:1,controls:0,disablekb:1},events:{
   onReady:e=>{if(token!==generation)return;player=e.target;ready=true;const iframe=player.getIframe();iframe.setAttribute('tabindex','-1');iframe.setAttribute('aria-hidden','true');iframe.setAttribute('referrerpolicy','strict-origin-when-cross-origin');apply(true);},
   onAutoplayBlocked:()=>{if(token===generation)status('Tocá «Activar audio» para escuchar.');},
   onStateChange:e=>{if(token!==generation)return;if(e.data===1)status('Escuchando la música de la sala.');if(e.data===0&&owner()&&state?.playing)bridge().send('media',{action:'pause'});},
   onError:e=>{if(token!==generation)return;failed=state?.videoId;status([101,150].includes(e.data)?'Este video no permite reproducirse fuera de YouTube. Probá otro enlace.':e.data===100?'El video no existe, es privado o fue eliminado.':e.data===153?'YouTube rechazó la reproducción en esta página. Probá otro enlace.':'No se pudo reproducir este video. Probá otro enlace.');}
  }});
 }catch(e){status(e.message);}}
 function receive(next){const changed=state?.videoId!==next?.videoId||state?.revision!==next?.revision;state=next;sampled=performance.now();controls();if(!state){destroy();status('La sala no está reproduciendo música.');return;}source=room?.scene.items.find(i=>i.id===state.itemId)||source;if(changed){failed=null;status(state.playing?'Conectando con YouTube…':'Música pausada.');}if(!closed){$('hubMediaDock').hidden=false;ensure();apply(changed);}}
 function open(item){if(item)source=item;closed=false;$('hubMediaDock').hidden=false;$('hubMediaTitle').textContent=item?window.VeredaCore.TYPES[item.type].name:'Música de la sala';controls();if(state){ensure();apply(true);}else status(owner()?'Pegá un enlace para compartir música con la sala.':'El dueño de la sala puede elegir la música.');}
 $('hubMediaClose').onclick=()=>{closed=true;destroy();$('hubMediaDock').hidden=true;};$('hubMusic').onclick=()=>open();
 $('hubMediaForm').onsubmit=e=>{e.preventDefault();if(!source){status('Tocá una compu, radio o tocadiscos de la sala.');return;}bridge().send('media',{action:'load',itemId:source.id,url:$('hubMediaURL').value.trim()});};
 $('hubMediaPause').onclick=()=>bridge().send('media',{action:state?.playing?'pause':'resume'});$('hubMediaStop').onclick=()=>bridge().send('media',{action:'stop'});
 $('hubMediaVolume').oninput=()=>{if(ready)player.setVolume(Number($('hubMediaVolume').value));};$('hubMediaListen').onclick=()=>{closed=false;failed=null;ensure();if(ready){player.unMute();apply(true);}bridge().send('media',{action:'sync'});};
 setInterval(()=>{if(state&&!closed&&ready)bridge().send('media',{action:'sync'});},15000);
 window.HubMedia={supports:type=>types.has(type),open,receive,room(next,media){destroy();room=next;source=null;closed=false;state=null;$('hubMediaDock').hidden=true;receive(media);},error(text){if(!$('hubMediaDock').hidden)status(text);},disconnected(){destroy();state=null;controls();status('Audio detenido: se perdió la conexión.');}};
})();
