import {SCRATCH,scratchResult} from './scratch-rules.mjs';
const $=id=>document.getElementById(id),dialog=$('hubScratchDialog'),bridge=()=>window.MINER_HUB_ONLINE,fmt=n=>n.toLocaleString('es-AR');
let machine=null,ticket=null,busy=false,pending=null,generation=0,revealed=new Set(),cells=[];
const sessionKey=()=> 'minerhub.scratch.'+bridge().user.id;
function remember(value){pending=value;try{if(value)sessionStorage.setItem(sessionKey(),JSON.stringify(value));else sessionStorage.removeItem(sessionKey());}catch{}}
function restore(){try{const v=JSON.parse(sessionStorage.getItem(sessionKey()));return v&&['buy','claim'].includes(v.route)?v:null;}catch{return null;}}
function saveReveals(){try{sessionStorage.setItem(sessionKey()+'.reveal',JSON.stringify({id:ticket.id,cells:[...revealed]}));}catch{}}
function loadReveals(){try{const v=JSON.parse(sessionStorage.getItem(sessionKey()+'.reveal'));return new Set(v?.id===ticket?.id?v.cells.filter(i=>Number.isInteger(i)&&i>=0&&i<9):[]);}catch{return new Set();}}
function status(text){$('hubScratchStatus').textContent=text;}
const shapes=[
 '<path d="M23 27Q25 8 40 8M40 8Q42 21 41 31" fill="none" stroke="#497946" stroke-width="4"/><path d="M40 8Q27 3 28 15Q38 18 40 8" fill="#69a45b"/><circle cx="22" cy="38" r="13" fill="#d84656"/><circle cx="43" cy="41" r="12" fill="#bc304b"/><path d="M16 33l4-3M38 36l3-2" stroke="#ffb7ad" stroke-width="3" stroke-linecap="round"/>',
 '<path d="M12 41Q6 37 13 31Q17 12 37 14Q43 9 47 15Q61 23 51 42Q40 57 22 51Q17 56 12 41Z" fill="#efc24d"/><path d="M20 32Q23 20 36 21" stroke="#fff2ac" stroke-width="4" fill="none" stroke-linecap="round"/>',
 '<path d="M32 34Q15 43 13 29Q8 14 23 14Q31 14 32 27Q34 9 46 13Q59 19 48 30Q45 34 35 33Q52 34 50 47Q42 59 33 45L29 55" fill="#69a76a" stroke="#397347" stroke-width="3"/>',
 '<path d="M13 45L19 36V27Q19 13 32 13Q45 13 45 27V36L51 45Z" fill="#e4aa42"/><circle cx="32" cy="49" r="6" fill="#bc792e"/><circle cx="32" cy="11" r="4" fill="#f6d27e"/><path d="M24 31V25Q24 20 29 19" stroke="#ffe8a9" stroke-width="3" fill="none"/>',
 '<path d="M8 24L21 11H44L57 24L32 55Z" fill="#62bccc"/><path d="M8 24H57M21 11L22 24L32 55L43 24L44 11M22 24L32 11L43 24" stroke="#defcff" stroke-width="2" fill="none"/>',
 '<path d="M13 46L8 18L23 29L32 12L42 29L57 18L51 46Z" fill="#d8a24b"/><path d="M13 47H51" stroke="#ffde87" stroke-width="6"/><circle cx="32" cy="35" r="4" fill="#af4358"/>',
 '<path d="M32 7L40 23L58 26L45 39L48 57L32 48L16 57L19 39L6 26L24 23Z" fill="#edbb54"/><path d="M32 14L35 27L49 28L37 34L41 47L31 39L20 47L24 34L15 29L28 27Z" fill="#ffdc7b"/>',
 '<path d="M13 12H53V22L32 54H17L39 24H13Z" fill="#bb4558" stroke="#f5c566" stroke-width="3"/>'
];
function symbol(index){const holder=document.createElement('span');holder.className='sc-symbol';holder.innerHTML='<svg viewBox="0 0 64 64" aria-hidden="true">'+shapes[index]+'</svg>';return holder;}
function controls(){
 const active=ticket?.status==='pending';$('hubScratchBalance').textContent=fmt(bridge().ledger.credits())+' créditos';
 $('hubScratchPrice').disabled=busy||active||!!pending;$('hubScratchBuy').disabled=busy||!machine;
 $('hubScratchForm').hidden=active&&!pending;$('hubScratchBuy').hidden=active&&!pending;$('hubScratchBuy').textContent=pending?'Recuperar boleto':ticket?'Comprar otro':'Comprar boleto';
 $('hubScratchReveal').hidden=!active||!!pending;$('hubScratchReveal').disabled=busy;
 $('hubScratchReveal').textContent=revealed.size===9?'Cobrar boleto':'Rascar todo';
 $('hubScratchProgress').textContent=ticket?fmt(ticket.amount)+' créditos · '+revealed.size+'/9 casillas':'9 casillas · 3 iguales o más';
 for(const c of cells)c.canvas.tabIndex=active&&!busy&&!pending&&!revealed.has(c.index)?0:-1;
}
function reveal(index){
 if(busy||pending||ticket?.status!=='pending'||revealed.has(index))return;
 revealed.add(index);const c=cells[index];c.canvas.hidden=true;c.cell.setAttribute('aria-label',SCRATCH.symbols[ticket.symbols[index]]);c.cell.classList.add('sc-revealed');saveReveals();controls();
 if(revealed.size===9)claim();
}
function makeCell(index){
 const cell=document.createElement('div');cell.className='sc-cell';const canvas=document.createElement('canvas');canvas.width=220;canvas.height=150;canvas.setAttribute('role','button');canvas.setAttribute('aria-label','Rascar casilla '+(index+1));canvas.setAttribute('title','Arrastrá para rascar; con teclado, Enter o espacio');
 if(ticket)cell.append(symbol(ticket.symbols[index]));cell.append(canvas);
 const k=canvas.getContext('2d',{willReadFrequently:true}),g=k.createLinearGradient(0,0,220,150);g.addColorStop(0,'#c8c9c8');g.addColorStop(.5,'#f0efea');g.addColorStop(1,'#a6aaa9');k.fillStyle=g;k.fillRect(0,0,220,150);
 k.strokeStyle='#ffffff50';k.lineWidth=2;for(let x=-150;x<220;x+=15){k.beginPath();k.moveTo(x,0);k.lineTo(x+150,150);k.stroke();}k.fillStyle='#737b7b';k.font='bold 38px sans-serif';k.textAlign='center';k.textBaseline='middle';k.fillText('✦',110,75);
 let pointer=null,last=null;const point=e=>{const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*220/r.width,y:(e.clientY-r.top)*150/r.height};};
 function stroke(p){k.globalCompositeOperation='destination-out';k.strokeStyle='#000';k.fillStyle='#000';k.lineWidth=42;k.lineCap='round';k.beginPath();k.moveTo(last?.x??p.x,last?.y??p.y);k.lineTo(p.x,p.y);k.stroke();k.beginPath();k.arc(p.x,p.y,21,0,Math.PI*2);k.fill();last=p;}
 canvas.onpointerdown=e=>{if(busy||pending||ticket?.status!=='pending'||e.button!==0)return;e.preventDefault();pointer=e.pointerId;canvas.setPointerCapture(pointer);stroke(point(e));};
 canvas.onpointermove=e=>{if(pointer===e.pointerId)stroke(point(e));};
 function end(e){if(pointer!==e.pointerId)return;pointer=null;last=null;try{canvas.releasePointerCapture(e.pointerId);}catch{}const data=k.getImageData(0,0,220,150).data;let clear=0,total=0;for(let y=4;y<150;y+=8)for(let x=4;x<220;x+=8){total++;if(data[(y*220+x)*4+3]<100)clear++;}if(clear/total>.42)reveal(index);}
 canvas.onpointerup=end;canvas.onpointercancel=end;
 canvas.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();reveal(index);}};
 if(revealed.has(index)){canvas.hidden=true;cell.classList.add('sc-revealed');cell.setAttribute('aria-label',SCRATCH.symbols[ticket.symbols[index]]);}
 return {cell,canvas,index};
}
function render(){
 const grid=$('hubScratchGrid');grid.replaceChildren();cells=Array.from({length:9},(_,i)=>makeCell(i));for(const c of cells)grid.append(c.cell);
 dialog.dataset.result='';
 if(ticket?.status==='claimed'){
  const result=scratchResult(ticket.symbols),delta=ticket.prize-ticket.amount;
  if(ticket.prize){for(const c of cells)if(ticket.symbols[c.index]===result.symbol)c.cell.classList.add('sc-match');status('¡'+result.count+' iguales! Premio: '+fmt(ticket.prize)+' créditos · Ganancia +'+fmt(delta));dialog.dataset.result='win';}
  else status('Este boleto no tuvo premio.');
 }else status(ticket?'Arrastrá sobre las casillas para rascar.':'Elegí tu boleto y probá suerte.');
 controls();
}
function show(next){ticket=next;revealed=ticket?.status==='claimed'?new Set(Array.from({length:9},(_,i)=>i)):loadReveals();render();}
async function request(route,input){
 if(busy)return;const token=generation;remember({route,input});busy=true;controls();status(route==='claim'?'Guardando resultado…':'Preparando boleto…');
 try{const data=await bridge().scratch(route,input);remember(null);if(token===generation&&dialog.open)show(data.ticket);}
 catch(e){if(e.status&&e.status<500)remember(null);if(token===generation)status(e.message+(pending?' Recuperá el boleto para continuar sin volver a pagar.':''));}
 finally{busy=false;if(token===generation)controls();}
}
function claim(){if(ticket?.status==='pending')return request('claim',{ticketId:ticket.id});}
async function open(item){
 if(busy)return;const token=++generation;machine={roomId:bridge().room.id,itemId:item.id};ticket=null;pending=restore();busy=true;show(null);status('Abriendo mesa…');dialog.showModal();
 try{const data=await bridge().scratch('open',machine);if(token!==generation)return;
  if(pending?.route==='buy'&&data.ticket?.id===pending.input.requestId)remember(null);
  if(pending?.route==='claim'&&data.ticket?.id===pending.input.ticketId&&data.ticket.status==='claimed')remember(null);
  show(data.ticket);if(ticket)$('hubScratchPrice').value=String(ticket.amount);if(pending)status('Recuperá tu boleto pendiente sin volver a pagar.');
 }catch(e){if(token===generation){machine=null;status(e.message);}}
 finally{busy=false;if(token===generation)controls();}
}
function paytable(){const body=$('hubScratchPrizes');for(const t of SCRATCH.tiers.slice(1)){const row=document.createElement('tr');for(const text of [t.count+(t.count===7?'+':'' )+' iguales','×'+t.multiplier,(t.weight/100).toLocaleString('es-AR')+'%']){const cell=document.createElement('td');cell.textContent=text;row.append(cell);}body.append(row);}}
paytable();
$('hubScratchForm').onsubmit=e=>{e.preventDefault();if(busy||!machine)return;if(pending)return request(pending.route,pending.input);if(ticket?.status==='pending')return;const amount=Number($('hubScratchPrice').value);if(!SCRATCH.prices.includes(amount))return;if(amount>bridge().ledger.credits()){status('No tenés créditos suficientes.');return;}return request('buy',{...machine,amount,requestId:crypto.randomUUID()});};
$('hubScratchReveal').onclick=()=>{if(busy||pending||ticket?.status!=='pending')return;revealed=new Set(Array.from({length:9},(_,i)=>i));saveReveals();render();return claim();};
$('hubScratchClose').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{generation++;machine=null;});
window.HubScratch={open,close(){if(dialog.open)dialog.close();}};

