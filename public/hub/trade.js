(()=>{'use strict';
 const $=id=>document.getElementById(id),bridge=()=>window.MINER_HUB_ONLINE;
 let state=null,stock=[],busy=false,dragged=null;
 const live=()=>state&&['invited','open'].includes(state.status);
 const mine=()=>state?.users.indexOf(bridge().user.id);
 function send(action,extra={}){const sent=bridge().send('trade',{action,id:state?.id,revision:state?.revision,...extra});if(sent!==false){busy=true;render();}return sent;}
 function change(id,delta){
  if(busy||state?.status!=='open')return;
  const offer=state.offers[mine()],item=stock.find(i=>i.id===id),current=offer.find(i=>i.id===id)?.count||0,count=current+delta;
  if(delta>0&&(!item||count>Math.min(99,item.count)))return;
  if(delta>0&&!current&&offer.length>=6){$('hubTradeStatus').textContent='Podés ofrecer hasta 6 objetos distintos.';return;}
  const items=offer.filter(i=>i.id!==id).map(i=>({id:i.id,count:i.count}));if(count>0)items.push({id,count});send('offer',{items});
 }
 function card(item,count,action){
  const el=document.createElement(action?'button':'div');if(action)el.type='button';el.className='hub-trade-card';
  const art=document.createElement('canvas');art.width=96;art.height=88;art.setAttribute('aria-hidden','true');bridge().preview(item,art);
  const name=document.createElement('span'),badge=document.createElement('b');name.textContent=item.name;badge.textContent='×'+count;el.append(art,name,badge);el.title=item.name+' · '+count+' unidades';
  if(action){el.disabled=busy;el.setAttribute('aria-label',action+' una unidad de '+item.name+'. '+count+' unidades.');}return el;
 }
 function inventory(){
  const grid=$('hubTradeStock'),scroll=grid.scrollTop,offer=state.offers[mine()],query=$('hubTradeSearch').value.trim().toLocaleLowerCase();grid.replaceChildren();
  for(const item of stock){const count=item.count-(offer.find(i=>i.id===item.id)?.count||0);if(count<=0||!item.name.toLocaleLowerCase().includes(query))continue;
   const el=card(item,count,'Agregar');el.draggable=!busy;el.onclick=()=>change(item.id,1);
   el.ondragstart=e=>{if(busy){e.preventDefault();return;}dragged=item.id;e.dataTransfer.setData('text/plain',item.id);e.dataTransfer.effectAllowed='copy';};
   el.ondragend=()=>{dragged=null;document.getElementById('hubTradeOwnOffer')?.classList.remove('is-over');};grid.append(el);
  }
  if(!grid.children.length){const empty=document.createElement('p');empty.className='hub-trade-empty';empty.textContent=query?'No hay coincidencias.':'No quedan unidades disponibles. Los objetos en uso no se pueden intercambiar.';grid.append(empty);}grid.scrollTop=scroll;
 }
 function render(){if(!state)return;const me=mine(),them=1-me,open=state.status==='open';$('hubTradeTitle').textContent='Intercambio con '+state.names[them];
  $('hubTradeNote').textContent=state.status==='invited'?(me===1?'Te invita a intercambiar o recibir un regalo.':'Esperando que acepte la invitación…'):live()?'Los dos aceptan para confirmar. Cambiar objetos reinicia la aceptación.':'';
  const columns=$('hubTradeOffers');columns.replaceChildren();
  for(const index of [me,them]){const column=document.createElement('section'),header=document.createElement('header'),title=document.createElement('h3'),accepted=document.createElement('span'),grid=document.createElement('div');
   title.textContent=index===me?'Tu oferta':state.names[index];accepted.textContent=state.accepted[index]?'✓ Aceptado':'';header.append(title,accepted);grid.className='hub-trade-slots';column.append(header,grid);
   if(index===me){column.id='hubTradeOwnOffer';if(open){
    column.ondragover=e=>{if(dragged&&!busy){e.preventDefault();e.dataTransfer.dropEffect='copy';column.classList.add('is-over');}};
    column.ondragleave=e=>{if(!column.contains(e.relatedTarget))column.classList.remove('is-over');};
    column.ondrop=e=>{e.preventDefault();column.classList.remove('is-over');const id=dragged;dragged=null;if(id)change(id,1);};
   }}
   for(const item of state.offers[index]){const el=card(item,item.count,index===me&&open?'Quitar':null);if(index===me&&open)el.onclick=()=>change(item.id,-1);grid.append(el);}
   for(let n=state.offers[index].length;n<6;n++){const empty=document.createElement('div');empty.className='hub-trade-slot';empty.setAttribute('aria-hidden','true');empty.textContent=n===0&&index===me&&open?'Arrastrá acá':'';grid.append(empty);}columns.append(column);
  }
  $('hubTradeInventory').hidden=!open;if(open)inventory();
  $('hubTradeStatus').textContent=state.message||(open?'Dejá una oferta vacía para regalar.':'');
  const accept=$('hubTradeAccept');accept.hidden=!live();accept.disabled=busy||(state.status==='invited'?me===0:state.accepted[me]||!state.offers.some(a=>a.length));accept.textContent=state.status==='invited'?'Aceptar invitación':state.accepted[me]?'Aceptado · esperando…':state.offers[me].length&&!state.offers[them].length?'Confirmar regalo':'Aceptar intercambio';$('hubTradeCancel').textContent=live()?'Cancelar':'Cerrar';
 }
 function cancel(){if(live()){bridge().send('trade',{action:'cancel',id:state.id,revision:state.revision});}else $('hubTradeDialog').close();}
 $('hubTradeSearch').oninput=()=>{if(state?.status==='open')inventory();};
 $('hubTradeCancel').onclick=cancel;$('hubTradeDialog').addEventListener('cancel',e=>{if(live()){e.preventDefault();cancel();}});
 $('hubTradeAccept').onclick=()=>{if(!live()||busy)return;send(state.status==='invited'?'join':'accept');};
 window.HubTrade={invite(target){bridge().send('trade',{action:'invite',target});},receive(m){if(live()&&state.id!==m.trade.id&&!['invited','open'].includes(m.trade.status))return;if(state?.id!==m.trade.id)$('hubTradeSearch').value='';state=m.trade;stock=m.available||[];busy=false;dragged=null;render();if(!$('hubTradeDialog').open)$('hubTradeDialog').showModal();},error(message){if($('hubTradeDialog').open){busy=false;render();$('hubTradeStatus').textContent=message;}},disconnected(){if(live()){busy=false;state.status='cancelled';state.message='Se cortó la conexión. No se confirma ningún intercambio pendiente.';render();}}};
})();
