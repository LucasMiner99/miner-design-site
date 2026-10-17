(()=>{'use strict';
 const $=id=>document.getElementById(id),bridge=()=>window.MINER_HUB_ONLINE;
 const order=[0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
 const red=new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
 const names={red:'rojo',black:'negro',green:'verde'},fmt=n=>n.toLocaleString('es-AR');
 const dialog=$('hubRouletteDialog'),wheel=$('hubRouletteWheel'),form=$('hubRouletteForm'),amount=$('hubRouletteAmount'),submit=$('hubRouletteBet');
 let table=null,color='red',busy=false,pending=null,generation=0,rotation=0;
 const key=()=> 'minerhub.roulette.'+bridge().user.id;
 function remember(value){pending=value;try{if(value)sessionStorage.setItem(key(),JSON.stringify(value));else sessionStorage.removeItem(key());}catch{}}
 function restore(){try{const v=JSON.parse(sessionStorage.getItem(key()));return v&&typeof v.requestId==='string'&&Number.isSafeInteger(v.amount)&&Object.hasOwn(names,v.color)?v:null;}catch{return null;}}
 function status(text){$('hubRouletteStatus').textContent=text;}
 function controls(){
  $('hubRouletteBalance').textContent=fmt(bridge().ledger.credits())+' créditos';
  for(const b of document.querySelectorAll('[data-roulette-color]')){b.setAttribute('aria-pressed',String(b.dataset.rouletteColor===color));b.disabled=busy||!!pending;}
  amount.disabled=busy||!!pending;submit.disabled=busy||!table;
  submit.textContent=busy?'Girando…':pending?'Recuperar apuesta':'Apostar '+fmt(Math.max(0,Number(amount.value)||0))+' al '+names[color];
 }
 function paint(){
  const k=wheel.getContext('2d'),step=Math.PI*2/37;k.clearRect(0,0,400,400);
  order.forEach((n,i)=>{const start=-Math.PI/2+(i-.5)*step;k.beginPath();k.moveTo(200,200);k.arc(200,200,188,start,start+step);k.closePath();k.fillStyle=n===0?'#237c58':red.has(n)?'#b44343':'#242424';k.fill();k.strokeStyle='#cba76b';k.lineWidth=.6;k.stroke();k.save();k.translate(200,200);k.rotate(i*step);k.fillStyle='#fff';k.textAlign='center';k.font='bold 13px sans-serif';k.fillText(String(n),0,-160);k.restore();});
  k.beginPath();k.arc(200,200,112,0,Math.PI*2);k.fillStyle='#61432d';k.fill();k.strokeStyle='#cba76b';k.lineWidth=6;k.stroke();
  k.beginPath();k.arc(200,200,20,0,Math.PI*2);k.fillStyle='#d9b97e';k.fill();
 }
 function result(receipt){const delta=receipt.prize-receipt.amount;status('Salió '+receipt.number+' · '+names[receipt.result]+'. '+(delta>0?'Ganaste '+fmt(delta):'Perdiste '+fmt(-delta))+' créditos.');}
 async function spin(receipt,token){
  const target=-order.indexOf(receipt.number)*360/37;
  rotation+=1440+((target-rotation)%360+360)%360;
  wheel.style.transition=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'none':'transform 3.8s cubic-bezier(.12,.64,.16,1)';
  wheel.style.transform='rotate('+rotation+'deg)';status('La ruleta está girando…');
  await new Promise(resolve=>setTimeout(resolve,4000));
  if(token===generation&&dialog.open)result(receipt);
 }
 async function open(item){
  if(busy)return;const token=++generation;table={roomId:bridge().room.id,itemId:item.id};pending=restore();
  if(pending){color=pending.color;amount.value=String(pending.amount);}
  busy=true;controls();status('Abriendo ruleta…');dialog.showModal();
  try{const data=await bridge().roulette('open',table);if(token!==generation)return;
   if(pending&&data.last?.requestId===pending.requestId){remember(null);result(data.last);}
   else if(pending)status('Hay una apuesta pendiente. Recuperala para conocer el resultado sin cobrarla otra vez.');
   else if(data.last)result(data.last);else status('Elegí un color y cuántos créditos apostar.');
  }catch(e){if(token===generation){table=null;status(e.message);}}
  finally{busy=false;if(token===generation)controls();}
 }
 form.onsubmit=async e=>{
  e.preventDefault();if(busy||!table)return;
  const value=Number(amount.value);if(!pending&&(!Number.isSafeInteger(value)||value<1||value>10000)){status('La apuesta debe ser un entero entre 1 y 10.000.');return;}
  if(!pending&&value>bridge().ledger.credits()){status('No tenés créditos suficientes.');return;}
  const token=generation,request=pending||{...table,color,amount:value,requestId:crypto.randomUUID()};remember(request);busy=true;controls();status('Confirmando apuesta…');
  try{const data=await bridge().roulette('bet',request);remember(null);if(token===generation&&dialog.open)await spin(data.receipt,token);}
  catch(e){if(e.status&&e.status<500)remember(null);if(token===generation)status(e.message+(pending?' Tocá «Recuperar apuesta» para reintentar el mismo giro.':''));}
  finally{busy=false;if(token===generation)controls();}
 };
 for(const b of document.querySelectorAll('[data-roulette-color]'))b.onclick=()=>{if(busy||pending)return;color=b.dataset.rouletteColor;controls();};
 amount.oninput=controls;
 $('hubRouletteClose').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{generation++;table=null;});
 window.HubRoulette={open,close(){generation++;table=null;if(dialog.open)dialog.close();}};
 paint();
})();
