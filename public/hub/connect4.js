import {CONNECT4} from './connect4-rules.mjs';
const dialog=document.getElementById('hubConnect4Dialog'),resume=document.getElementById('hubConnect4Resume');
const online=()=>window.MINER_HUB_ONLINE,esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let match=null,table=null,players=[],busy=false,connected=true,offset=0,timer=0,confirmResign=false,pendingInvite=null,lastSync=0,animated='',generation=0;
const mine=()=>match?.users.indexOf(online().user.id)??-1,live=()=>match&&['invited','playing'].includes(match.status);
function setClock(){
 const seconds=live()?Math.max(0,Math.ceil((match.deadline-Date.now()-offset)/1000)):0;
 const clock=dialog.querySelector('[data-c4-clock]');if(clock)clock.textContent=connected?seconds+' s':'Reconectando…';
 resume.hidden=!(live()&&mine()>=0&&!dialog.open);
 resume.textContent='Cuatro en línea · '+(!connected?'Reconectando':match?.status==='invited'?'Invitación':mine()===match?.turn?'Tu turno · '+seconds+' s':'En partida');
 if(live()&&connected&&!seconds&&Date.now()-lastSync>3000){lastSync=Date.now();sync(false);}
}
function timers(){clearInterval(timer);timer=live()?setInterval(setClock,500):0;setClock();}
function acceptData(data,{show=false}={}){
 if(data.serverNow)offset=data.serverNow-Date.now();
 if(!show&&data.match&&match&&data.match.id!==match.id&&data.match.createdAt<match.createdAt)return;
 if(data.match&&match?.id===data.match.id&&data.match.revision<=match.revision&&!show)return;
 match=data.match||null;confirmResign=false;
 if(match?.users.includes(online().user.id))table={roomId:match.roomId,itemId:match.itemId};
 if(show&&!dialog.open)dialog.showModal();
 if(dialog.open)render();timers();
}
function error(message){const node=dialog.querySelector('[data-c4-error]');if(node)node.textContent=message;}
function controls(){
 for(const node of dialog.querySelectorAll('[data-c4="accept"],[data-c4="decline"],[data-c4="resign"],[data-c4="new"]'))node.disabled=busy||!connected;
 for(const node of dialog.querySelectorAll('[data-column]'))node.disabled=busy||!connected||match?.status!=='playing'||mine()!==match.turn||online().room.id!==match.roomId||Boolean(match.board[Number(node.dataset.column)]);
}
function headline(){
 if(!match)return 'Elegí tu rival';
 if(match.status==='invited')return mine()===1?match.names[0]+' te desafía':'Esperando a '+match.names[1];
 if(match.status==='cancelled')return 'Invitación cancelada';
 if(match.status==='draw')return '¡Empate!';
 if(match.status==='won')return mine()===match.winner?'¡Ganaste!':mine()>=0?'Ganó '+match.names[match.winner]:'Victoria de '+match.names[match.winner];
 return mine()===match.turn?'Tu turno': 'Turno de '+match.names[match.turn];
}
function render(){
 const me=mine(),playing=match?.status==='playing',participant=me>=0,active=live(),inRoom=!match||online().room?.id===match.roomId;
 const lastKey=match?.id+':'+match?.revision,newDisc=lastKey!==animated;animated=lastKey;
 dialog.innerHTML=`<button class="c4-close" data-c4="close" aria-label="Cerrar">×</button>
 <header><div><p class="c4-eyebrow">JUGADOR CONTRA JUGADOR</p><h2 id="hubConnect4Title">Cuatro en línea</h2></div><span class="c4-pot">${match?'Pozo · '+(match.stake*2).toLocaleString('es-AR'):'Tu saldo · '+online().ledger.credits().toLocaleString('es-AR')}</span></header>
 <div class="c4-status"><strong aria-live="polite">${esc(headline())}</strong>${active?'<span data-c4-clock></span>':''}</div>
 ${!match?`<form id="c4InviteForm" class="c4-invite"><label>Jugador<select name="target" required ${players.length?'':'disabled'}><option value="">Elegí alguien de esta sala</option>${players.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}</select></label>
 <label>Créditos por jugador<input name="stake" type="number" min="${CONNECT4.min}" max="${CONNECT4.max}" step="1" value="100" required></label>
 <p>${players.length?'El rival acepta el monto antes de empezar.':'Necesitás otro jugador en esta sala.'}</p>
 <button type="submit" class="primary-button" ${busy||!players.length?'disabled':''}>${busy?'Enviando…':'Invitar a jugar'}</button></form>`:`
 <div class="c4-players">${match.names.map((name,i)=>`<span class="${playing&&match.turn===i?'is-turn':''}"><i class="c4-disc c4-p${i+1}"></i><b>${esc(name)}</b>${i===me?'<small>Vos</small>':''}</span>`).join('')}</div>
 ${match.status==='invited'?`<div class="c4-invitation"><p><b>${match.stake.toLocaleString('es-AR')} créditos cada uno.</b></p><p>El ganador se lleva todo el pozo. En empate, recuperan su apuesta.</p></div>
 <div class="c4-actions">${me===1?'<button class="primary-button" data-c4="accept">Aceptar y apostar</button>':''}${participant?`<button data-c4="decline">${me===1?'Rechazar':'Cancelar invitación'}</button>`:'<p>Esperando a los jugadores.</p>'}</div>`:`
 ${match.status!=='cancelled'?`<div class="c4-board" role="group" aria-label="Tablero de siete columnas y seis filas">${Array.from({length:7},(_,col)=>`<button class="c4-column" data-column="${col}" aria-label="Columna ${col+1}: ${Array.from({length:6},(_,row)=>['vacía','roja','amarilla'][match.board[row*7+col]]).join(', ')}" ${!playing||!participant||me!==match.turn||!inRoom||busy||!connected||match.board[col]?'disabled':''}>${Array.from({length:6},(_,row)=>{const i=row*7+col,v=match.board[i];return `<span class="c4-hole"><i class="c4-disc ${v?'c4-p'+v:''} ${match.line?.includes(i)?'c4-win':''} ${newDisc&&match.last===i?'c4-drop':''}" style="--drop:${(row+1)*45}px"></i></span>`;}).join('')}</button>`).join('')}</div>`:''}
 ${!active?`<p class="c4-result">${esc(match.reason)} ${match.status==='won'?esc(match.names[match.winner])+' recibe '+(match.stake*2).toLocaleString('es-AR')+' créditos.':''}</p>`:''}
 <div class="c4-actions">${playing&&participant?`<button data-c4="resign" class="${confirmResign?'c4-danger':''}">${confirmResign?'Sí, abandonar y perder '+match.stake+' créditos':'Abandonar'}</button>${confirmResign?'<button data-c4="keep">Seguir jugando</button>':''}`:''}${!active?'<button class="primary-button" data-c4="new">Volver a la mesa</button>':''}</div>`}
 ${participant&&!inRoom?'<button class="primary-button c4-return" data-c4="return">Volver a la sala de la partida</button>':''}`}
 <p class="c4-error" data-c4-error role="alert"></p>
 <footer>Conectá cuatro fichas. 60 s por turno; al agotarse, ganará tu rival.<br>Cerrar esta ventana no detiene el reloj.</footer>`;
 controls();
 setClock();
}
async function sync(show=false){
 try{const data=await online().connect4({action:'sync'});if(data.match&&(show||mine()>=0||!match))acceptData(data,{show:show&&liveStatus(data.match)});}catch{}
}
const liveStatus=m=>m&&['playing','invited'].includes(m.status);
async function action(type,extra={}){
 if(busy||!connected||!match)return;
 busy=true;render();
 try{const data=await online().connect4({action:type,id:match.id,revision:match.revision,...extra});acceptData(data);}
 catch(e){await sync();error(e.message);}
 finally{busy=false;controls();}
}
async function open(item){
 const ticket=++generation;busy=true;table={roomId:online().room.id,itemId:item.id};
 try{const data=await online().connect4({action:'open',...table});if(ticket!==generation)return;players=data.players||[];busy=false;pendingInvite=null;acceptData(data,{show:true});}
 catch(e){busy=false;match=null;players=[];if(!dialog.open)dialog.showModal();render();error(e.message);}
}
dialog.addEventListener('submit',async e=>{
 e.preventDefault();if(busy||!connected)return;const form=new FormData(e.target),target=form.get('target'),stake=Number(form.get('stake'));
 if(!target||!Number.isSafeInteger(stake)||stake<5||stake>10000)return error('Elegí un jugador y un monto de 5 a 10.000.');
 if(!pendingInvite||pendingInvite.target!==target||pendingInvite.stake!==stake)pendingInvite={action:'invite',...table,target,stake,requestId:crypto.randomUUID()};
 busy=true;const button=e.target.querySelector('button');button.disabled=true;button.textContent='Enviando…';
 try{const data=await online().connect4(pendingInvite);pendingInvite=null;acceptData(data);}
 catch(err){if(err.status&&err.status<500)pendingInvite=null;error(err.message);}
 finally{busy=false;button.disabled=false;button.textContent='Invitar a jugar';controls();}
});
dialog.addEventListener('click',e=>{
 const column=e.target.closest('[data-column]');if(column&&!column.disabled)return action('move',{column:Number(column.dataset.column)});
 const button=e.target.closest('[data-c4]');if(!button||button.disabled)return;
 switch(button.dataset.c4){
  case 'close':dialog.close();break;
  case 'accept':case 'decline':action(button.dataset.c4);break;
  case 'resign':if(confirmResign)action('resign');else{confirmResign=true;render();}break;
  case 'keep':confirmResign=false;render();break;
  case 'return':online().visit(match.roomId);break;
  case 'new':if(online().room.id!==match.roomId){online().visit(match.roomId);dialog.close();}else open({id:match.itemId});break;
 }
});
dialog.addEventListener('close',()=>{generation++;setClock();});
resume.onclick=()=>{dialog.showModal();render();setClock();};
window.HubConnect4={
 open,
 receive(event){
  const m=event.match;if(!m)return;
  const own=m.users.includes(online().user.id),selected=table&&m.roomId===table.roomId&&m.itemId===table.itemId;
  if(!own&&!(dialog.open&&selected))return;
  const fresh=own&&m.id!==match?.id;
  if(own){table={roomId:m.roomId,itemId:m.itemId};if(fresh)generation++;}
  acceptData(event,{show:fresh&&m.status==='invited'||own&&live()&&!liveStatus(m)});
 },
 connected(){connected=true;sync(false);if(dialog.open)render();},
 disconnected(){connected=false;busy=false;if(dialog.open)render();setClock();}
};
