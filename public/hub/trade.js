(()=>{'use strict';const $=id=>document.getElementById(id),bridge=()=>window.MINER_HUB_ONLINE;let state=null,stock=[];
 const live=()=>state&&['invited','open'].includes(state.status);
 function send(action,extra={}){return bridge().send('trade',{action,id:state?.id,revision:state?.revision,...extra});}
 function render(){if(!state)return;const me=state.users.indexOf(bridge().user.id),them=1-me,open=state.status==='open';$('hubTradeTitle').textContent='Intercambio con '+state.names[them];
 $('hubTradeNote').textContent=state.status==='invited'?(me===1?'Te invita a intercambiar o recibir un regalo.':'Esperando que acepte la invitación…'):'Ambos deben aceptar. Si cambia la oferta, deben aceptar de nuevo.';
 const columns=$('hubTradeOffers');columns.replaceChildren();
 for(const index of [me,them]){const column=document.createElement('section'),title=document.createElement('h3');title.textContent=(index===me?'Vos':state.names[index])+(state.accepted[index]?' · Aceptado':'');column.append(title);
  if(!state.offers[index].length){const empty=document.createElement('p');empty.textContent='Sin objetos';column.append(empty);}
  for(const item of state.offers[index]){const row=document.createElement('div');row.className='hub-trade-item';const art=document.createElement('canvas');art.width=72;art.height=72;art.setAttribute('aria-hidden','true');bridge().preview(item,art);const label=document.createElement('span');label.textContent=item.name+' ×'+item.count;row.append(art,label);
   if(index===me&&open){const remove=document.createElement('button');remove.type='button';remove.textContent='Quitar';remove.onclick=()=>send('offer',{items:state.offers[me].filter(i=>i.id!==item.id).map(i=>({id:i.id,count:i.count}))});row.append(remove);}column.append(row);
  }columns.append(column);
 }
 const select=$('hubTradeItem'),selected=select.value;select.replaceChildren();for(const item of stock){const option=document.createElement('option');option.value=item.id;option.textContent=item.name+' · '+item.count+' disponibles';select.append(option);}if(stock.some(i=>i.id===selected))select.value=selected;
 $('hubTradeAdd').hidden=!open||!stock.length;
 $('hubTradeStatus').textContent=state.message||(open&&!stock.length?'No tenés premios disponibles para ofrecer. Podés recibir un regalo. Los objetos en uso y el acceso de admin no se transfieren.':open?'Dejá un lado vacío para regalar.':'');
 const accept=$('hubTradeAccept');accept.hidden=!live();accept.disabled=state.status==='invited'?me===0:state.accepted[me]||!state.offers.some(a=>a.length);accept.textContent=state.status==='invited'?'Aceptar invitación':state.accepted[me]?'Esperando al otro jugador…':state.offers[me].length&&!state.offers[them].length?'Aceptar regalo a '+state.names[them]:'Aceptar intercambio';$('hubTradeCancel').textContent=live()?'Cancelar':'Cerrar';
 }
 function cancel(){if(live())send('cancel');else $('hubTradeDialog').close();}
 $('hubTradeCancel').onclick=cancel;$('hubTradeDialog').addEventListener('cancel',e=>{if(live()){e.preventDefault();cancel();}});
 $('hubTradeAccept').onclick=()=>{if(!live())return;send(state.status==='invited'?'join':'accept');$('hubTradeAccept').disabled=true;};
 $('hubTradeAdd').onsubmit=e=>{e.preventDefault();if(state?.status!=='open')return;const me=state.users.indexOf(bridge().user.id),id=$('hubTradeItem').value,count=Number($('hubTradeCount').value),item=stock.find(i=>i.id===id);if(!item||!Number.isInteger(count)||count<1||count>Math.min(99,item.count)){$('hubTradeStatus').textContent='Revisá la cantidad disponible.';return;}const items=state.offers[me].filter(i=>i.id!==id).map(i=>({id:i.id,count:i.count}));items.push({id,count});send('offer',{items});};
 window.HubTrade={invite(target){bridge().send('trade',{action:'invite',target});},receive(m){if(live()&&state.id!==m.trade.id&&!['invited','open'].includes(m.trade.status))return;state=m.trade;stock=m.available||[];render();if(!$('hubTradeDialog').open)$('hubTradeDialog').showModal();},error(message){if($('hubTradeDialog').open){render();$('hubTradeStatus').textContent=message;}},disconnected(){if(live()){state.status='cancelled';state.message='Se cortó la conexión. No se confirma ningún intercambio pendiente.';render();}}};
})();
