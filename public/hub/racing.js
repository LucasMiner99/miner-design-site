import {RACING,racingPrize} from './racing-rules.mjs';
const $=id=>document.getElementById(id),bridge=()=>window.MINER_HUB_ONLINE,fmt=n=>n.toLocaleString('es-AR');
const dialog=$('hubRacingDialog'),track=$('hubRacingTrack'),k=track.getContext('2d'),amount=$('hubRacingAmount'),submit=$('hubRacingBet');
let machine=null,horse=0,busy=false,pending=null,generation=0,frame=0,finishAnimation=null;
const buttons=[],key=()=> 'minerhub.racing.'+bridge().user.id;
function remember(value){pending=value;try{if(value)sessionStorage.setItem(key(),JSON.stringify(value));else sessionStorage.removeItem(key());}catch{}}
function restore(){try{const v=JSON.parse(sessionStorage.getItem(key()));return v&&typeof v.requestId==='string'&&Number.isSafeInteger(v.amount)&&RACING.horses[v.horse]?v:null;}catch{return null;}}
function status(text){$('hubRacingStatus').textContent=text;}
function controls(){
 $('hubRacingBalance').textContent=busy?'Carrera en curso':fmt(bridge().ledger.credits())+' créditos';
 for(const [i,b] of buttons.entries()){b.setAttribute('aria-pressed',String(i===horse));b.disabled=busy||!!pending;}
 amount.disabled=busy||!!pending;submit.disabled=busy||!machine;
 submit.textContent=busy?'En carrera…':pending?'Recuperar apuesta':'Apostar '+fmt(Math.max(0,Number(amount.value)||0))+' créditos';
 const value=Number(amount.value),valid=Number.isSafeInteger(value)&&value>=RACING.min&&value<=RACING.max&&value%5===0;
 $('hubRacingReturn').textContent=valid?'Si gana '+RACING.horses[horse].name+': recibís '+fmt(racingPrize(horse,value))+' créditos en total.':'Apuestas de 5 a 10.000 créditos, de a 5.';
}
for(const h of RACING.horses){
 const b=document.createElement('button');b.type='button';b.style.setProperty('--horse',h.color);
 const n=document.createElement('span');n.className='race-number';n.textContent=h.id+1;
 const name=document.createElement('strong');name.textContent=h.name;
 const chance=document.createElement('small');chance.textContent=h.chance+'% de ganar';
 const payout=document.createElement('b');payout.textContent='×'+fmt(h.payout/10);
 b.append(n,name,chance,payout);b.onclick=()=>{if(busy||pending)return;horse=h.id;controls();draw();};
 $('hubRacingHorses').append(b);buttons.push(b);
}
function line(points,color,width){k.beginPath();points.forEach(([x,y],i)=>i?k.lineTo(x,y):k.moveTo(x,y));k.strokeStyle=color;k.lineWidth=width;k.lineCap='round';k.lineJoin='round';k.stroke();}
function ellipse(x,y,rx,ry,color){k.beginPath();k.ellipse(x,y,rx,ry,0,0,Math.PI*2);k.fillStyle=color;k.fill();}
function runner(x,y,id,t,moving){
 const coat=['#b97849','#a45835','#d7c5a3','#8d6a51','#424247'][id],c=RACING.horses[id].color,phase=t*19+id*1.5;
 k.save();k.translate(x,y+(moving?Math.sin(phase*2)*1.5:0));
 ellipse(0,18,32,4,'#0003');
 for(let i=0;i<4;i++){const front=i>1,root=front?17:-18,swing=moving?Math.sin(phase+(i%2?Math.PI:0)+(front?.8:0))*12:0;
  line([[root,0],[root+swing*.55,10],[root+swing,18]],i%2?'#593f32':coat,5);line([[root+swing-3,19],[root+swing+3,19]],'#2e2824',4);}
 line([[-24,-7],[-35,-13],[-42,-5]],'#382b27',5);
 ellipse(-2,-7,28,12,coat);line([[19,-10],[26,-30],[38,-29]],coat,13);ellipse(39,-27,10,6,coat);
 line([[25,-32],[21,-37]],'#352a26',4);line([[30,-34],[33,-40]],coat,4);
 ellipse(40,-29,1.4,1.4,'#161b18');
 k.fillStyle=c;k.fillRect(-11,-18,22,15);k.fillStyle='#18201c';k.font='bold 11px sans-serif';k.textAlign='center';k.fillText(id+1,0,-6);
 line([[-3,-21],[10,-33],[23,-29]],c,8);line([[8,-32],[20,-23],[32,-25]],'#e5c09e',4);
 ellipse(18,-39,6,6,'#e5c09e');ellipse(18,-42,7,4,c);
 line([[0,-18],[-9,-8],[1,0]],'#f6eee0',5);line([[0,0],[8,0]],'#242626',4);
 line([[23,-28],[35,-22]],'#3e3029',1.4);
 k.restore();
}
function draw(receipt=null,progress=0,time=0){
 const w=1440,finish=w-80;
 k.clearRect(0,0,w,350);k.fillStyle='#28483c';k.fillRect(0,0,w,350);
 k.fillStyle='#d7dec2';k.fillRect(0,13,w,4);k.fillStyle='#122c23';k.fillRect(0,25,w,305);
 for(let i=0;i<5;i++){const y=43+i*57;k.fillStyle=i%2?'#8a7556':'#95805d';k.fillRect(42,y,w-74,54);
  k.strokeStyle='#e2d2ae38';k.lineWidth=1;k.setLineDash([8,10]);k.beginPath();k.moveTo(45,y+53);k.lineTo(w-33,y+53);k.stroke();k.setLineDash([]);
  k.fillStyle=RACING.horses[i].color;k.font='bold 15px sans-serif';k.textAlign='center';k.fillText(i+1,21,y+31);
  for(let row=0;row<6;row++)for(let col=0;col<2;col++){k.fillStyle=(row+col)%2?'#f4ecdf':'#282e29';k.fillRect(finish+col*7,y+row*9,7,9);}
 }
 k.fillStyle='#edf2df';k.font='bold 13px sans-serif';k.textAlign='center';k.fillText('SALIDA',100,32);k.fillText('META',finish+7,32);
 for(let i=0;i<5;i++){
  let p=0;if(receipt){const rank=i===receipt.winner?0:1+(i-receipt.winner+4)%5,phase=(receipt.seed%997)/997*6+i;
   p=progress+(Math.sin(progress*Math.PI*3+phase)*.075)*progress*(1-progress);
   p*=1-rank*.024*Math.pow(progress,3);p=Math.max(0,Math.min(1,p));}
  const x=100+p*(finish-138),y=76+i*57;
  if(i===horse){k.fillStyle='#ffffff18';k.fillRect(44,43+i*57,finish-47,54);}
  runner(x,y,i,time,!!receipt&&progress>0&&progress<1);
 }
 if(receipt&&progress===0){k.fillStyle='#0c151acc';k.fillRect(w/2-110,127,220,76);k.fillStyle='#fff';k.font='bold 32px sans-serif';k.textAlign='center';k.fillText('¡A largar!',w/2,175);}
}
function result(r){
 dialog.dataset.result=r.prize?'win':'loss';const delta=r.prize-r.amount;
 $('hubRacingPhase').textContent='Ganó #'+(r.winner+1)+' · '+RACING.horses[r.winner].name;
 $('hubRacingClock').textContent='Carrera finalizada';
 status(r.prize?'¡Ganó tu caballo! Recibiste '+fmt(r.prize)+' créditos (+'+fmt(delta)+' netos).':'Ganó '+RACING.horses[r.winner].name+'. Tu apuesta fue de '+fmt(r.amount)+' créditos.');
 draw(r,1,0);
}
function stopAnimation(){cancelAnimationFrame(frame);if(finishAnimation){const done=finishAnimation;finishAnimation=null;done();}}
function race(r,serverNow,token){
 stopAnimation();const elapsed=Math.max(0,serverNow-r.at),start=performance.now()-elapsed;
 if(elapsed>=RACING.duration){result(r);return Promise.resolve();}
 const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;let previous=-1;
 status('Apostaste '+fmt(r.amount)+' a '+RACING.horses[r.horse].name+'.');dialog.dataset.result='';
 return new Promise(resolve=>{finishAnimation=resolve;
  const paint=now=>{if(token!==generation||!dialog.open){stopAnimation();return;}
   const ms=Math.min(RACING.duration,now-start),p=Math.max(0,(ms-1800)/(RACING.duration-1800)),sec=Math.ceil((RACING.duration-ms)/1000);
   if(sec!==previous){previous=sec;$('hubRacingClock').textContent=sec+' s';$('hubRacingPhase').textContent=ms<1800?'En la largada…':'Carrera en vivo';}
   draw(r,reduced?Math.floor(p*10)/10:p,reduced?0:ms/1000);
   if(ms>=RACING.duration){result(r);finishAnimation=null;resolve();}else frame=requestAnimationFrame(paint);
  };frame=requestAnimationFrame(paint);
 });
}
async function open(item){
 if(busy)return;const token=++generation;machine={roomId:bridge().room.id,itemId:item.id};pending=restore();
 if(pending){horse=pending.horse;amount.value=String(pending.amount);}busy=true;controls();draw();status('Abriendo carreras…');dialog.showModal();
 try{const data=await bridge().racing('open',machine);if(token!==generation)return;
  if(pending&&data.last?.requestId===pending.requestId)remember(null);
  if(pending)status('Tenés una apuesta pendiente. Recuperala sin volver a pagar.');
  else if(data.last){horse=data.last.horse;amount.value=String(data.last.amount);controls();await race(data.last,data.serverNow,token);}
  else{status('Elegí tu caballo y mirá la carrera.');$('hubRacingPhase').textContent='Cinco caballos · Un ganador';$('hubRacingClock').textContent='12 segundos';}
 }catch(e){if(token===generation){machine=null;status(e.message);}}
 finally{busy=false;if(token===generation)controls();}
}
$('hubRacingForm').onsubmit=async e=>{
 e.preventDefault();if(busy||!machine)return;const value=Number(amount.value);
 if(!pending&&(!Number.isSafeInteger(value)||value<5||value>10000||value%5)){status('Apostá entre 5 y 10.000 créditos, de a 5.');return;}
 if(!pending&&value>bridge().ledger.credits()){status('No tenés créditos suficientes.');return;}
 const token=generation,request=pending||{...machine,horse,amount:value,requestId:crypto.randomUUID()};remember(request);busy=true;controls();status('Confirmando apuesta…');
 try{const data=await bridge().racing('bet',request);remember(null);if(token===generation&&dialog.open){horse=data.receipt.horse;await race(data.receipt,data.serverNow,token);}}
 catch(e){if(e.status&&e.status<500)remember(null);if(token===generation)status(e.message+(pending?' Tocá «Recuperar apuesta» para reintentar sin pagar dos veces.':''));}
 finally{busy=false;if(token===generation)controls();}
};
amount.oninput=controls;$('hubRacingClose').onclick=()=>dialog.close();
dialog.addEventListener('close',()=>{generation++;machine=null;stopAnimation();});
window.HubRacing={open,close(){if(dialog.open)dialog.close();}};
draw();
