import {COURT,hoopX,trajectory,ballAt,shotVisual} from './basket-physics.mjs';
(()=>{'use strict';
 const $=id=>document.getElementById(id),dialog=$('hubBasketDialog'),canvas=$('hubBasketCourt'),ctx=canvas.getContext('2d'),bridge=()=>window.MINER_HUB_ONLINE;
 let table=null,data=null,generation=0,busy=false,pending=false,frame=0,stamp=0,local=0,startId=null,retry=null,drag=null,aim={x:200,y:135},shot=null,announced=null,effect=null,finishAttempted=false;
 const now=()=>stamp+performance.now()-local,text=(id,value)=>{if($(id).textContent!==value)$(id).textContent=value;},status=value=>text('hubBasketStatus',value);
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 function matching(){return data?.session?.roomId===table?.roomId&&data?.session?.itemId===table?.itemId;}
 function active(){return matching()&&!data.session.finished&&now()<data.session.expiresAt;}
 function canShoot(){const s=data?.session;return active()&&!busy&&!pending&&!retry&&now()>=s.start&&now()<s.end&&(!shot||now()>=shot.land+COURT.resetDelay);}
 function apply(next,at,calibrate){const old=data?.session,s=next.session;if(old&&s&&old.id===s.id&&s.version<old.version)return;if(calibrate){stamp=next.serverNow+performance.now()-at;local=performance.now();}const changed=old?.id!==s?.id;data=next;if(changed){announced=null;effect=null;finishAttempted=false;aim={x:200,y:135};}shot=matching()?s?.lastShot:null;render();}
 async function request(action,extra={}){const token=generation,at=performance.now(),next=await bridge().basket(action,{...table,...extra});if(token!==generation||!dialog.open)return null;apply(next,at,action==='open'||action==='start');return next;}
 function render(){
  const s=data?.session,playing=active();$('hubBasketWelcome').hidden=!!s&&matching();$('hubBasketPlay').hidden=!playing;$('hubBasketResult').hidden=!matching()||!s?.finished;$('hubBasketStart').hidden=playing;$('hubBasketStart').disabled=busy||!data;$('hubBasketRetry').hidden=!retry;$('hubBasketRetry').disabled=busy||pending;
  if(data){text('hubBasketDaily',data.daily.remaining?data.daily.remaining+' créditos disponibles hoy':'Modo práctica · límite de hoy alcanzado');const r=data.record;text('hubBasketRecord',r?'Récord de hoy en esta sala · '+r.name+' · '+r.score+' puntos':'Récord de hoy en esta sala · ¡Sé el primero!');}
  if(s&&!matching())status('Tenés una partida en otra máquina. Volvé allí o esperá dos minutos.');
  if(matching()&&s?.finished){text('hubBasketResultTitle',s.result.newRecord?'¡Nuevo récord de la sala!':'¡Tiempo!');text('hubBasketCredits','+'+s.result.amount+' créditos');text('hubBasketDetail',s.score+' puntos · '+s.baskets+' encestes · Mejor racha: '+s.bestStreak);text('hubBasketStart','Otra partida');}else text('hubBasketStart','Jugar');
  cancelAnimationFrame(frame);if(playing)frame=requestAnimationFrame(tick);
 }
 function ball(x,y,r,rotation=0){
  ctx.save();ctx.translate(x,y);ctx.rotate(rotation);const g=ctx.createRadialGradient(-r*.35,-r*.4,1,0,0,r);g.addColorStop(0,'#ffc06a');g.addColorStop(.65,'#eb872e');g.addColorStop(1,'#ba501c');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();
  ctx.save();ctx.clip();ctx.strokeStyle='#633417';ctx.lineWidth=Math.max(1,r*.065);ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(-r,0);ctx.bezierCurveTo(-r*.35,-r*.2,r*.35,-r*.2,r,0);ctx.moveTo(0,-r);ctx.bezierCurveTo(r*.15,-r*.35,r*.15,r*.35,0,r);ctx.stroke();
  for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(side*r*.55,-r);ctx.bezierCurveTo(side*r*.05,-r*.45,side*r*.05,r*.45,side*r*.55,r);ctx.stroke();}ctx.restore();ctx.strokeStyle='#663819';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.stroke();ctx.restore();
 }
 function hoop(x,front=false,glow=0){ctx.save();ctx.translate(x,135);ctx.lineCap='round';ctx.beginPath();ctx.ellipse(0,0,45,14,0,front?0:Math.PI,front?Math.PI:Math.PI*2);ctx.strokeStyle='#714020';ctx.lineWidth=8;ctx.stroke();ctx.strokeStyle=glow?'#ffe0a0':front?'#ffae51':'#d67d32';ctx.lineWidth=4.5;ctx.stroke();ctx.restore();}
 function net(x,pulse=0){
  const height=45+pulse*9,point=(column,row)=>({x:x+(column/8*2-1)*(42-row*4)+Math.sin(row*.8)*pulse*3,y:138+row*height/4});ctx.save();ctx.strokeStyle='#f4eee0b0';ctx.lineWidth=1.1;ctx.lineCap='round';
  // Small tapered diamonds: adjacent strands, not lines across the whole net.
  for(let row=0;row<4;row++)for(let col=0;col<8;col++){const a=point(col,row),b=point(col+1,row+1),c=point(col+1,row),d=point(col,row+1);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.moveTo(c.x,c.y);ctx.lineTo(d.x,d.y);ctx.stroke();}
  for(const col of [0,8]){const a=point(col,0),b=point(col,4);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}ctx.beginPath();ctx.ellipse(x+Math.sin(3.2)*pulse*3,138+height,26,5,0,0,Math.PI*2);ctx.stroke();ctx.restore();
 }
 function feedback(at){if(!effect)return;const age=at-effect.at;if(age>1150)return;const fade=Math.min(1,(1150-age)/250),y=222-Math.min(age/50,12);ctx.save();ctx.globalAlpha=fade;ctx.fillStyle=effect.hit?'#ffe1aa':'#22282eee';ctx.beginPath();ctx.roundRect(87,y,226,62,14);ctx.fill();ctx.textAlign='center';ctx.fillStyle=effect.hit?'#43250e':'#ffffff';ctx.font='bold 21px Salando, sans-serif';ctx.fillText(effect.hit?'¡EN CESTA!':'AFUERA',200,y+26);ctx.font='bold 14px Salando, sans-serif';ctx.fillText(effect.hit?'+'+effect.points+' puntos'+(effect.multiplier>1?' · ×'+effect.multiplier:''):'Probá de nuevo',200,y+48);ctx.restore();}
 function draw(at){
  const s=data.session,hx=hoopX(at,s.start,s.phase),w=COURT.width,h=COURT.height,pulse=effect?.hit?Math.max(0,1-(at-effect.at)/650):0;ctx.setTransform(2,0,0,2,0,0);ctx.clearRect(0,0,w,h);
  const bg=ctx.createLinearGradient(0,0,0,h);bg.addColorStop(0,'#24282b');bg.addColorStop(1,'#111315');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
  // Cabinet side cage and return lane stay fixed while the backboard moves.
  ctx.strokeStyle='#414548';ctx.lineWidth=1;for(let i=0;i<7;i++){const y=65+i*42;ctx.beginPath();ctx.moveTo(22,y);ctx.lineTo(22,410);ctx.moveTo(378,y);ctx.lineTo(378,410);ctx.moveTo(22,y);ctx.lineTo(72,y-25);ctx.moveTo(378,y);ctx.lineTo(328,y-25);ctx.stroke();}
  const floor=ctx.createLinearGradient(0,165,0,440);floor.addColorStop(0,'#68462b');floor.addColorStop(1,'#bd844a');ctx.fillStyle=floor;ctx.beginPath();ctx.moveTo(72,165);ctx.lineTo(328,165);ctx.lineTo(378,440);ctx.lineTo(22,440);ctx.closePath();ctx.fill();ctx.strokeStyle='#e3c9a47a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(113,440);ctx.lineTo(140,240);ctx.lineTo(260,240);ctx.lineTo(287,440);ctx.stroke();ctx.beginPath();ctx.ellipse(200,300,56,32,0,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle='#e6d9be';ctx.strokeStyle=pulse?'#ffe1aa':'#575552';ctx.lineWidth=5;ctx.beginPath();ctx.roundRect(hx-74,45,148,94,7);ctx.fill();ctx.stroke();ctx.strokeStyle='#b26031';ctx.lineWidth=3;ctx.strokeRect(hx-27,83,54,38);
  net(hx,pulse);hoop(hx,false,pulse);
  const flying=shot&&at<shot.land+COURT.resetDelay;
  if((drag||canvas===document.activeElement)&&!flying&&at>=s.start&&at<s.end){const guide=trajectory(aim.x-200,aim.y-380,0);ctx.strokeStyle='#ffffffa8';ctx.lineWidth=2;ctx.setLineDash([4,6]);ctx.beginPath();for(let i=0;i<=24;i++){const p=ballAt(guide,guide.land*i/24);if(i)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y);}ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.arc(aim.x,aim.y,9,0,Math.PI*2);ctx.stroke();}
  if(flying){const b=shotVisual(shot,at,s.start,s.phase);ctx.save();ctx.globalAlpha=b.alpha;ball(b.x,b.y,b.radius,(at-shot.start)/1000*1.2);ctx.restore();}
  hoop(hx,true,pulse);
  if(!flying&&at>=s.start&&at<s.end){ctx.fillStyle='#00000038';ctx.beginPath();ctx.ellipse(200,410,24,7,0,0,Math.PI*2);ctx.fill();ball(200,380,22);}
  feedback(at);if(at<s.start){ctx.fillStyle='#ffffff';ctx.font='bold 48px Salando, sans-serif';ctx.textAlign='center';ctx.fillText(String(Math.max(1,Math.ceil((s.start-at)/1000))),200,290);}
 }
 function tick(){
  if(!dialog.open)return;if(matching()&&now()>=data.session.expiresAt){data.session=null;status('La partida terminó. Podés empezar otra.');render();return;}if(!active())return;const s=data.session,at=now();draw(at);const inFlight=shot&&at<shot.land;const score=s.score-(inFlight?shot.points||0:0);text('hubBasketScore',score+' puntos');text('hubBasketTimer',Math.max(0,Math.min(30,Math.ceil((s.end-at)/1000)))+' s');text('hubBasketStreak','Racha ×'+(s.streak>=6?3:s.streak>=3?2:1));
  if(shot&&!shot.provisional&&at>=shot.land&&announced!==shot.id){announced=shot.id;if(at-shot.land<1500)effect={...shot,at};status(shot.hit?'¡EN CESTA! +'+shot.points+' puntos'+(shot.multiplier>1?' · Racha ×'+shot.multiplier:''):'AFUERA · Probá de nuevo.');}
  if(at>=Math.max(s.end,(shot?.land||0)+1100)+200&&!pending&&!retry&&!finishAttempted){void finish();return;}frame=requestAnimationFrame(tick);
 }
 async function shoot(input){
  if(!input&&!canShoot())return;const s=data?.session;if(!s)return;const payload=input||{sessionId:s.id,requestId:crypto.randomUUID(),dx:Math.round(clamp(aim.x-200,-180,180)),dy:Math.round(clamp(aim.y-380,-360,-60))},token=generation;
  pending=true;retry=null;status('');render();
  shot={...trajectory(payload.dx,payload.dy,now()),id:payload.requestId,provisional:true,points:0};
  try{const result=await request('shoot',payload);if(result)shot=result.session.lastShot;}
  catch(e){if(token===generation){shot=data.session.lastShot;retry=e.status&&e.status<500?null:{action:'shoot',payload};status(e.message+(retry?' Reintentá para confirmar el mismo tiro.':''));}}
  finally{if(token===generation){pending=false;render();}}
 }
 async function finish(){if(busy||pending||!data?.session)return;const token=generation;finishAttempted=true;busy=true;retry=null;status('Contando los puntos…');try{const result=await request('finish',{sessionId:data.session.id});if(result)status('');}catch(e){if(token===generation){retry={action:'finish'};status(e.message);}}finally{if(token===generation){busy=false;render();}}}
 function coordinates(e){const b=canvas.getBoundingClientRect();return {x:(e.clientX-b.left)*400/b.width,y:(e.clientY-b.top)*440/b.height};}
 function cancelDrag(){if(drag){try{canvas.releasePointerCapture(drag.id);}catch{}drag=null;}}
 canvas.addEventListener('pointerdown',e=>{if(e.button!==0||!canShoot())return;const p=coordinates(e);if(Math.hypot(p.x-200,p.y-380)>45){status('Arrastrá desde la pelota hacia el aro.');return;}e.preventDefault();drag={id:e.pointerId,x:p.x,y:p.y};aim={x:200,y:380};canvas.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});});
 canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const p=coordinates(e);aim={x:clamp(200+p.x-drag.x,20,380),y:clamp(380+p.y-drag.y,20,380)};});
 canvas.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;const p=coordinates(e);aim={x:clamp(200+p.x-drag.x,20,380),y:clamp(380+p.y-drag.y,20,380)};cancelDrag();if(aim.y<=320)void shoot();});
 canvas.addEventListener('pointercancel',cancelDrag);canvas.addEventListener('lostpointercapture',()=>{drag=null;});
 canvas.addEventListener('keydown',e=>{if(!active()||e.repeat||e.ctrlKey||e.metaKey||e.altKey)return;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();aim.x=clamp(aim.x+(e.key==='ArrowLeft'?-10:e.key==='ArrowRight'?10:0),20,380);aim.y=clamp(aim.y+(e.key==='ArrowUp'?-10:e.key==='ArrowDown'?10:0),20,320);}if(e.key===' '||e.key==='Enter'){e.preventDefault();void shoot();}});
 $('hubBasketStart').onclick=async()=>{if(busy)return;const token=generation;busy=true;startId??=crypto.randomUUID();status('');render();try{const result=await request('start',{requestId:startId});if(result){startId=null;canvas.focus({preventScroll:true});}}catch(e){if(token===generation)status(e.message);}finally{if(token===generation){busy=false;render();}}};
 $('hubBasketRetry').onclick=()=>{if(retry?.action==='shoot')void shoot(retry.payload);else if(retry)void finish();};$('hubBasketClose').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>{generation++;cancelDrag();cancelAnimationFrame(frame);data=null;table=null;busy=false;pending=false;shot=null;effect=null;retry=null;startId=null;finishAttempted=false;});
 window.HubBasket={async open(source){if(dialog.open)return;generation++;const token=generation;table={roomId:bridge().room.id,itemId:source.id};data=null;busy=true;render();dialog.showModal();bridge().preview({kind:'object',type:source.type,id:'object:'+source.type},$('hubBasketArt'));status('Abriendo cancha…');try{const result=await request('open');if(result&&(!result.session||matching()))status('');}catch(e){if(token===generation)status(e.message);}finally{if(token===generation){busy=false;render();}}},close(){if(dialog.open)dialog.close();}};
})();
