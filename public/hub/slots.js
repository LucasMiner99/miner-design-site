import {SLOTS,slotSymbols} from './slots-rules.mjs';
const $=id=>document.getElementById(id),bridge=()=>window.MINER_HUB_ONLINE,fmt=n=>n.toLocaleString('es-AR');
const dialog=$('hubSlotsDialog'),canvas=$('hubSlotsReels'),k=canvas.getContext('2d'),amount=$('hubSlotsAmount'),submit=$('hubSlotsBet');
let machine=null,busy=false,pending=null,generation=0,frame=0,finishAnimation=null;
const presets=[...document.querySelectorAll('[data-slot-bet]')],key=()=> 'minerhub.slots.'+bridge().user.id;
function remember(value){pending=value;try{if(value)sessionStorage.setItem(key(),JSON.stringify(value));else sessionStorage.removeItem(key());}catch{}}
function restore(){try{const v=JSON.parse(sessionStorage.getItem(key()));return v&&typeof v.requestId==='string'&&Number.isSafeInteger(v.amount)&&v.amount>=SLOTS.min&&v.amount<=SLOTS.max?v:null;}catch{return null;}}
function status(text){$('hubSlotsStatus').textContent=text;}
function controls(){
 $('hubSlotsBalance').textContent=busy?'Girando…':fmt(bridge().ledger.credits())+' créditos';amount.disabled=busy||!!pending;submit.disabled=busy||!machine;
 submit.textContent=busy?'Girando…':pending?'Recuperar giro':'Girar · '+fmt(Math.max(0,Number(amount.value)||0));
 for(const b of presets){b.disabled=busy||!!pending;b.setAttribute('aria-pressed',String(Number(b.dataset.slotBet)===Number(amount.value)));}
}
function ellipse(x,y,rx,ry,color){k.beginPath();k.ellipse(x,y,rx,ry,0,0,Math.PI*2);k.fillStyle=color;k.fill();}
function path(points,color,width=4){k.beginPath();points.forEach(([x,y],i)=>i?k.lineTo(x,y):k.moveTo(x,y));k.strokeStyle=color;k.lineWidth=width;k.lineCap='round';k.lineJoin='round';k.stroke();}
function symbol(id,x,y,scale=1){
 k.save();k.translate(x,y);k.scale(scale,scale);k.lineJoin='round';k.lineWidth=3;
 if(id===0){path([[-20,4],[-9,-33],[21,-42],[22,6]],'#526f39',4);ellipse(7,-36,15,6,'#71984c');ellipse(-20,17,20,21,'#9d203e');ellipse(23,19,20,21,'#c52b46');ellipse(-26,10,5,8,'#f58c8e');ellipse(17,12,5,8,'#ff9e9d');}
 else if(id===1){k.save();k.rotate(-.32);k.beginPath();k.moveTo(-44,0);k.bezierCurveTo(-33,-4,-38,-32,0,-33);k.bezierCurveTo(35,-34,33,-5,44,0);k.bezierCurveTo(33,5,35,34,0,33);k.bezierCurveTo(-37,32,-33,4,-44,0);k.fillStyle='#e9ba38';k.fill();k.strokeStyle='#b88a28';k.stroke();ellipse(-9,-12,22,7,'#ffe58b');k.restore();ellipse(21,-35,18,6,'#729550');}
 else if(id===2){path([[1,-28],[11,-45],[26,-47]],'#657a37',4);ellipse(-10,-33,23,9,'#739b50');for(const [x,y,r]of [[-20,-10,16],[12,-12,17],[-30,13,15],[0,12,17],[26,12,15],[-15,33,15],[13,33,15],[0,50,12]]){ellipse(x,y-7,r,r,'#805398');ellipse(x-4,y-12,r*.28,r*.22,'#c29bd4');}}
 else if(id===3){ellipse(0,34,10,10,'#bc802a');k.beginPath();k.moveTo(-38,28);k.quadraticCurveTo(-27,17,-26,-6);k.quadraticCurveTo(-25,-31,-5,-34);k.lineTo(-5,-42);k.lineTo(5,-42);k.lineTo(5,-34);k.quadraticCurveTo(25,-31,26,-6);k.quadraticCurveTo(27,17,38,28);k.closePath();k.fillStyle='#ecc057';k.fill();k.strokeStyle='#ad7b2e';k.stroke();path([[-15,-18],[-20,15]],'#ffe9a3',6);path([[-36,29],[36,29]],'#b38135',5);}
 else if(id===4){k.fillStyle='#29242a';k.beginPath();k.roundRect(-49,-28,98,56,7);k.fill();k.strokeStyle='#b79b5c';k.stroke();k.font='900 31px "Zalando Sans Expanded",sans-serif';k.fillStyle='#fff0c3';k.textAlign='center';k.textBaseline='middle';k.fillText('BAR',0,2);}
 else{k.font='900 103px "Zalando Sans Expanded",sans-serif';k.textAlign='center';k.textBaseline='middle';k.lineWidth=7;k.strokeStyle='#8a2035';k.strokeText('7',0,6);k.fillStyle='#df4050';k.fillText('7',0,6);k.font='900 100px "Zalando Sans Expanded",sans-serif';k.globalAlpha=.2;k.fillStyle='#fff';k.fillText('7',-2,2);}
 k.restore();
}
function draw(stops=[0,7,14],progress=null){
 const w=900,h=420,row=140;k.clearRect(0,0,w,h);k.fillStyle='#efe7d8';k.fillRect(0,0,w,h);
 for(let reel=0;reel<3;reel++){
  const x=reel*300;k.save();k.beginPath();k.rect(x+8,0,284,h);k.clip();k.fillStyle='#fff9ea';k.fillRect(x+8,row,284,row);
  const remaining=progress===null?0:1-Math.min(1,progress/(.66+reel*.15));
  const p=stops[reel]+(40+reel*10)*remaining**3,base=Math.floor(p),offset=p-base;
  for(let r=-2;r<=2;r++){const index=((base+r)%20+20)%20;symbol(SLOTS.strip[index],x+150,h/2+(r-offset)*row,.95);}
  const shade=k.createLinearGradient(0,0,0,h);shade.addColorStop(0,'#2a172966');shade.addColorStop(.32,'#2a172900');shade.addColorStop(.68,'#2a172900');shade.addColorStop(1,'#2a172966');k.fillStyle=shade;k.fillRect(x+8,0,284,h);k.restore();
  if(reel){k.fillStyle='#b99a5b';k.fillRect(x-2,0,4,h);}
 }
 k.strokeStyle='#c49b51';k.lineWidth=3;k.strokeRect(2,row,w-4,row);for(const x of [0,w]){k.beginPath();k.moveTo(x,row+55);k.lineTo(x+(x? -18:18),row+70);k.lineTo(x,row+85);k.closePath();k.fillStyle='#c0394c';k.fill();}
}
function result(r){
 const names=slotSymbols(r.stops).map(i=>SLOTS.symbols[i].name).join(' · '),delta=r.prize-r.amount;
 dialog.dataset.result=r.multiplier===100?'jackpot':r.prize?'win':'loss';draw(r.stops);canvas.setAttribute('aria-label','Línea central: '+names);
 status(r.prize?(r.multiplier===100?'¡7-7-7! Premio máximo. ':'¡Combinación ganadora! ')+fmt(r.prize)+' créditos (+'+fmt(delta)+' netos).':'Sin premio esta vez. Apostaste '+fmt(r.amount)+' '+(r.amount===1?'crédito.':'créditos.'));
}
function stopAnimation(){cancelAnimationFrame(frame);if(finishAnimation){const done=finishAnimation;finishAnimation=null;done();}}
function spin(r,serverNow,token){
 stopAnimation();const elapsed=Math.max(0,serverNow-r.at),start=performance.now()-elapsed;
 if(elapsed>=SLOTS.duration){result(r);return Promise.resolve();}
 const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 status('Rodillos girando…');dialog.dataset.result='';canvas.setAttribute('aria-label','Rodillos girando');
 return new Promise(resolve=>{finishAnimation=resolve;const paint=now=>{
  if(token!==generation||!dialog.open){stopAnimation();return;}const p=Math.min(1,Math.max(0,(now-start)/SLOTS.duration));
  draw(reduced?[0,7,14]:r.stops,reduced?null:p);
  if(p===1){result(r);finishAnimation=null;resolve();}else frame=requestAnimationFrame(paint);
 };frame=requestAnimationFrame(paint);});
}
async function open(item){
 if(busy)return;const token=++generation;machine={roomId:bridge().room.id,itemId:item.id};pending=restore();if(pending)amount.value=String(pending.amount);
 busy=true;controls();draw();status('Abriendo tragamonedas…');dialog.dataset.result='';dialog.showModal();
 try{const data=await bridge().slots('open',machine);if(token!==generation)return;
  if(pending&&data.last?.requestId===pending.requestId)remember(null);
  if(pending)status('Hay un giro pendiente. Recuperalo sin volver a pagar.');
  else if(data.last){amount.value=String(data.last.amount);await spin(data.last,data.serverNow,token);}
  else status('Elegí tu apuesta y girá los rodillos.');
 }catch(e){if(token===generation){machine=null;status(e.message);}}
 finally{busy=false;if(token===generation)controls();}
}
$('hubSlotsForm').onsubmit=async e=>{
 e.preventDefault();if(busy||!machine)return;const value=Number(amount.value);
 if(!pending&&(!Number.isSafeInteger(value)||value<SLOTS.min||value>SLOTS.max)){status('Apostá entre 1 y 100 créditos enteros.');return;}
 if(!pending&&value>bridge().ledger.credits()){status('No tenés créditos suficientes.');return;}
 const token=generation,request=pending||{...machine,amount:value,requestId:crypto.randomUUID()};remember(request);busy=true;controls();status('Confirmando apuesta…');
 try{const data=await bridge().slots('bet',request);remember(null);if(token===generation&&dialog.open)await spin(data.receipt,data.serverNow,token);}
 catch(e){if(e.status&&e.status<500)remember(null);if(token===generation)status(e.message+(pending?' Tocá «Recuperar giro» para reintentar sin pagar dos veces.':''));}
 finally{busy=false;if(token===generation)controls();}
};
for(const b of presets)b.onclick=()=>{if(busy||pending)return;amount.value=b.dataset.slotBet;controls();};
amount.oninput=controls;$('hubSlotsClose').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{generation++;machine=null;stopAnimation();});
window.HubSlots={open,close(){if(dialog.open)dialog.close();}};draw();
