(()=>{'use strict';
 const $=id=>document.getElementById(id),bridge=()=>window.MINER_HUB_ONLINE,dialog=$('hubExchangeDialog');
 const labels={object:'Objeto',character:'Personaje',environment:'Ambiente'},art=new Map();
 let table=null,items=[],selected=null,pending=null,busy=false,generation=0,spin=null,frame=0;
 const key=()=> 'minerhub.exchange.'+bridge().user.id;
 function remember(value){pending=value;try{if(value)sessionStorage.setItem(key(),JSON.stringify(value));else sessionStorage.removeItem(key());}catch{}}
 function status(text){$('hubExchangeStatus').textContent=text;}
 function preview(item){if(!art.has(item.id)){const cv=document.createElement('canvas');cv.width=180;cv.height=180;bridge().preview(item,cv);art.set(item.id,cv);}return art.get(item.id);}
 function paint(k,item,x,y,w,h){const size=Math.min(w,h);k.drawImage(preview(item),x+(w-size)/2,y+(h-size)/2,size,size);}
 function controls(){const button=$('hubExchangeSwap');button.disabled=busy||!!spin||!table||!pending&&!selected;button.textContent=pending?'Recuperar canje':'Cambiar por uno nuevo';for(const b of $('hubExchangeItems').children)b.disabled=busy||!!spin||!!pending||b.dataset.complete==='true';}
 function render(){
  const list=$('hubExchangeItems');list.replaceChildren();selected=null;
  for(const item of items){
   const button=document.createElement('button');button.type='button';button.className='hub-exchange-item';button.dataset.complete=String(item.complete);button.setAttribute('aria-pressed','false');
   const cv=document.createElement('canvas');cv.width=120;cv.height=110;paint(cv.getContext('2d'),item,0,0,120,110);
   const name=document.createElement('strong');name.textContent=item.name;const detail=document.createElement('small');detail.textContent=item.complete?'Categoría completa':labels[item.kind]+' · '+item.available+' para cambiar';
   button.append(cv,name,detail);button.onclick=()=>{if(busy||spin||pending||item.complete)return;selected=item;for(const b of list.children)b.setAttribute('aria-pressed',String(b===button));status('Entregás 1 '+item.name+'. Conservás al menos una copia.');controls();};list.append(button);
  }
  $('hubExchangeEmpty').hidden=!!items.length;controls();
 }
 async function load(token){
  busy=true;controls();status('Buscando repetidos…');
  try{const data=await bridge().exchange('open',table);if(token!==generation)return;items=data.items;render();status(pending?'Tenés un canje pendiente. Recuperalo sin gastar otra copia.':items.length?'Elegí el repetido que querés cambiar.':'Necesitás una copia extra libre. Los premios de esta máquina no se pueden volver a canjear acá.');}
  catch(e){if(token===generation){table=null;status(e.message);}}
  finally{busy=false;if(token===generation)controls();}
 }
 function finish(){
  if(!spin)return;cancelAnimationFrame(frame);const item=spin.item;spin=null;$('hubExchangeAnimation').hidden=true;$('hubExchangeReel').setAttribute('aria-busy','false');
  $('hubExchangeResult').hidden=false;$('hubExchangeResultName').textContent=item.name;const cv=$('hubExchangeResultArt'),k=cv.getContext('2d');k.clearRect(0,0,cv.width,cv.height);paint(k,item,0,0,cv.width,cv.height);status('¡Nuevo! Guardado en tu inventario.');controls();
 }
 function animate(receipt){
  const catalog=window.VeredaRewards.catalog(window.VeredaCore,window.VeredaPeople),item=bridge().ledger.item(receipt.rewardId);
  // Environment definitions live in the authoritative inventory, which now includes the prize.
  const pool=(receipt.kind==='environment'?bridge().ledger.inventory():catalog).filter(i=>i.kind===receipt.kind&&!i.starter);
  const entries=Array.from({length:39},()=>pool[Math.floor(Math.random()*pool.length)]||item);entries[32]=item;
  spin={item,entries,at:performance.now()};$('hubExchangePick').hidden=true;$('hubExchangeResult').hidden=true;$('hubExchangeAnimation').hidden=false;$('hubExchangeReel').setAttribute('aria-busy','true');status('Intercambiando…');
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){finish();return;}
  function tick(now){if(!spin)return;const progress=Math.min(1,(now-spin.at)/4000);window.HubRewardReel.draw($('hubExchangeReel'),spin.entries,32,progress,paint);if(progress>=1)finish();else frame=requestAnimationFrame(tick);}frame=requestAnimationFrame(tick);controls();
 }
 async function open(item){
  if(busy||dialog.open)return;const token=++generation;table={roomId:bridge().room.id,itemId:item.id};items=[];selected=null;art.clear();
  pending=null;try{const saved=JSON.parse(sessionStorage.getItem(key())||'null');if(saved?.requestId&&saved.sourceId&&saved.roomId&&Number.isSafeInteger(saved.itemId))pending=saved;}catch{}
  $('hubExchangePick').hidden=false;$('hubExchangeAnimation').hidden=true;$('hubExchangeResult').hidden=true;render();dialog.showModal();await load(token);
 }
 $('hubExchangeSwap').onclick=async()=>{
  if(busy||spin||!table||!pending&&!selected)return;
  const token=generation,request=pending||{...table,sourceId:selected.id,requestId:crypto.randomUUID()};remember(request);busy=true;controls();status('Confirmando canje…');
  try{const data=await bridge().exchange('swap',request);remember(null);if(token===generation&&dialog.open)animate(data.receipt);}
  catch(e){if(e.status&&e.status<500)remember(null);if(token===generation)status(e.message+(pending?' Recuperá el mismo canje para conocer el resultado.':''));}
  finally{busy=false;if(token===generation)controls();}
 };
 $('hubExchangeAgain').onclick=()=>{if(busy)return;$('hubExchangePick').hidden=false;$('hubExchangeResult').hidden=true;load(generation);};
 $('hubExchangeSkip').onclick=finish;$('hubExchangeClose').onclick=$('hubExchangeDone').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>{generation++;table=null;spin=null;cancelAnimationFrame(frame);});
 window.HubExchange={open,close(){if(dialog.open)dialog.close();}};
})();
