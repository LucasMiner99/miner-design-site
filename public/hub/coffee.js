(()=>{'use strict';
 const $=id=>document.getElementById(id),dialog=$('hubCoffeeDialog'),bridge=()=>window.MINER_HUB_ONLINE;
 const ingredients=[['coffee','Café','☕'],['milk','Leche','🥛'],['ice','Hielo','🧊'],['sugar','Azúcar','▧'],['cocoa','Cacao','🍫']];
 let table=null,data=null,chosen=[],busy=false,generation=0,frame=0,serverAt=0,localAt=0,startId=null,audio=null;
 const now=()=>serverAt+performance.now()-localAt;
 const text=(id,value)=>{if($(id).textContent!==value)$(id).textContent=value;};
 function status(value){text('hubCoffeeStatus',value);}
 function sound(){try{audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{});const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(660,audio.currentTime);o.frequency.exponentialRampToValueAtTime(990,audio.currentTime+.1);g.gain.setValueAtTime(.035,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.18);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+.2);}catch{}}
 function receive(next,elapsed){
  const old=data?.session;data=next;serverAt=next.serverNow+Math.min(250,elapsed/2);localAt=performance.now();
  if(old?.id!==next.session?.id||old?.index!==next.session?.index)chosen=[];
  if(next.session?.pour)chosen=[...next.session.order.ingredients];
 }
 async function request(action,extra={}){
  const token=generation,at=performance.now();busy=true;controls();
  try{const result=await bridge().coffee(action,{...table,...extra});if(token!==generation||!dialog.open)return null;receive(result,performance.now()-at);return result;}
  catch(e){if(token===generation){status(e.message);if(e.status===409){const at=performance.now();try{const fresh=await bridge().coffee('open',table);if(token===generation)receive(fresh,performance.now()-at);}catch{}}}return null;}
  finally{if(token===generation){busy=false;render();}}
 }
 function controls(){
  const s=data?.session,active=!!s&&!s.done&&s.roomId===table?.roomId&&s.itemId===table?.itemId,expired=s&&now()>=s.expiresAt,pour=s?.pour;
  for(const button of $('hubCoffeeIngredients').children){button.disabled=busy||!active||!!pour||expired||chosen.includes(button.dataset.ingredient);button.setAttribute('aria-pressed',String(chosen.includes(button.dataset.ingredient)));}
  $('hubCoffeeEmpty').disabled=busy||!active||!!pour||!chosen.length||expired;
  $('hubCoffeeServe').disabled=busy||!active||expired||(!pour&&!chosen.length)||(!!pour&&now()<pour.start);
  text('hubCoffeeServe',busy?'Un momento…':pour?(now()<pour.start?'Preparando…':'Servir'):'Preparar');
  $('hubCoffeeStart').disabled=busy||!data;$('hubCoffeeAgain').disabled=busy;
 }
 function render(){
  const s=data?.session,active=!!s&&!s.done&&s.roomId===table?.roomId&&s.itemId===table?.itemId;
  $('hubCoffeeWelcome').hidden=active||!!s?.done;$('hubCoffeePlay').hidden=!active;$('hubCoffeeResult').hidden=!s?.done;
  if(data){text('hubCoffeeDaily',data.daily.remaining?`${data.daily.remaining} créditos disponibles hoy`:'Modo práctica · ya alcanzaste el límite de hoy');const r=data.rules;text('hubCoffeeRules',`${r.orderReward} por pedido · +${r.completionReward} al completar · +${r.perfectReward} por café perfecto`);}
  if(s&&!s.done&&!active)status('Tenés un turno empezado en otra cafetera. Podés volver allí o esperar cinco minutos.');
  if(active){
   text('hubCoffeeCount',`PEDIDO ${s.index+1} DE 3`);text('hubCoffeeRecipe',s.order.name);text('hubCoffeeTotal','+'+s.total);
   const parts=$('hubCoffeeRecipeParts');parts.replaceChildren();for(const id of s.order.ingredients){const item=ingredients.find(i=>i[0]===id),el=document.createElement('span');el.textContent=item[2]+' '+item[1];parts.append(el);}
   $('hubCoffeeLiquid').style.height=chosen.length?Math.min(82,chosen.length*24)+'%':'0%';$('hubCoffeeLiquid').style.background=chosen.includes('milk')?'#b8916e':'#563b29';
   $('hubCoffeeIce').hidden=!chosen.includes('ice');$('hubCoffeeSteam').hidden=!chosen.includes('coffee')||chosen.includes('ice');
   text('hubCoffeeCupLabel',chosen.length?chosen.map(id=>ingredients.find(i=>i[0]===id)[1]).join(' + '):'Taza vacía');
   $('hubCoffeeTiming').hidden=!s.pour;
   if(s.pour){$('hubCoffeeTarget').style.left=s.pour.target*100+'%';$('hubCoffeeTarget').style.width=s.pour.width*100+'%';}
  }
  if(s?.done){text('hubCoffeeResultTotal','+'+s.total+' créditos');const perfect=s.results.filter(r=>r.perfect).length;text('hubCoffeeResultDetail',`${perfect} ${perfect===1?'café perfecto':'cafés perfectos'} · ${data.daily.remaining?'¿Servimos otra ronda?':'Podés seguir practicando sin premios.'}`);}
  controls();cancelAnimationFrame(frame);if(active&&dialog.open)frame=requestAnimationFrame(tick);
 }
 function tick(){
  const s=data?.session;if(!dialog.open||!s||s.done)return;
  if(now()>=s.expiresAt){status('El turno terminó. Empezá uno nuevo cuando quieras.');data.session=null;startId=null;render();return;}
  if(s.pour){const progress=Math.max(0,Math.min(1,(now()-s.pour.start)/s.pour.duration));$('hubCoffeeNeedle').style.left=progress*100+'%';text('hubCoffeeTimingHint',now()<s.pour.start?'Preparando tu café…':progress>=1?'Tu café está listo. Servilo para cobrar el pedido.':'Frená en la zona marcada para el bonus.');}
  controls();frame=requestAnimationFrame(tick);
 }
 async function start(){if(busy)return;startId??=crypto.randomUUID();status('');const result=await request('start',{requestId:startId});if(result)startId=null;}
 for(const [id,label,icon] of ingredients){const b=document.createElement('button');b.type='button';b.dataset.ingredient=id;b.setAttribute('aria-label','Agregar '+label);const mark=document.createElement('span');mark.textContent=icon;mark.setAttribute('aria-hidden','true');const name=document.createElement('small');name.textContent=label;b.append(mark,name);b.onclick=()=>{if(busy||data?.session?.pour||chosen.includes(id))return;chosen.push(id);status('');render();};$('hubCoffeeIngredients').append(b);}
 $('hubCoffeeEmpty').onclick=()=>{if(busy||data?.session?.pour)return;chosen=[];status('');render();};
 $('hubCoffeeServe').onclick=async()=>{
  const s=data?.session;if(busy||!s||s.done)return;status('');
  const result=await request(s.pour?'serve':'pour',{sessionId:s.id,index:s.index,ingredients:chosen});
  if(result?.receipt){sound();status((result.receipt.perfect?'¡Café perfecto! ':'¡Pedido servido! ')+(result.receipt.amount?'+'+result.receipt.amount+' créditos':'Modo práctica'));}
 };
 $('hubCoffeeStart').onclick=$('hubCoffeeAgain').onclick=start;
 $('hubCoffeeClose').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>{generation++;busy=false;table=null;data=null;chosen=[];startId=null;cancelAnimationFrame(frame);});
 window.HubCoffee={async open(item){if(dialog.open)return;generation++;table={roomId:bridge().room.id,itemId:item.id};data=null;chosen=[];status('Abriendo cafetería…');render();dialog.showModal();const cv=$('hubCoffeeMachine');cv.getContext('2d').clearRect(0,0,cv.width,cv.height);bridge().preview({kind:'object',type:item.type,id:'object:'+item.type},cv);const result=await request('open');if(result&&(!result.session||result.session.roomId===table?.roomId&&result.session.itemId===table?.itemId))status('');},close(){if(dialog.open)dialog.close();}};
})();
