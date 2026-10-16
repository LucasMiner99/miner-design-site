(function(root){
 'use strict';
 function create({document:doc,C,P,storage,players,appearance,sprite,equip,place,reducedMotion,now,environment=[],applyEnvironment,onChange,placed=()=>0}){
  const $=id=>doc.getElementById(id),catalog=root.VeredaRewards.catalog(C,P,environment);
  let ledger,owner='self',opening=null,result=null,serial=0,error='',panel='inventory',inventoryKey='';
  try{ledger=root.MINER_HUB_ONLINE.ledger;}catch(e){error=e.message;}
  const labels={hair:'Pelo y gorros',face:'Cara',top:'Torso',bottom:'Pantalón',shoes:'Calzado',accessory:'Cadena',back:'Espalda',pet:'Mascota'};
  const title=i=>i.kind==='object'?'Objeto':i.kind==='environment'?'Ambiente':labels[i.slot];
  function status(text){$('rewardStatus').textContent=text;$('rewardStatus').hidden=!text||!['inventory','rewards'].includes(panel);}
  // Cache isolated artwork, also reused by the moving reel.
  const previews=new WeakMap();
  function canvasSprite(k,item,x,y,w,h){const s=sprite(item,appearance(owner));let art=previews.get(s.canvas);if(!art){art=doc.createElement('canvas');art.width=180;art.height=180;const q=art.getContext('2d'),scale=Math.min(164/s.width,164/s.height);q.imageSmoothingQuality='high';q.drawImage(s.canvas,(180-s.width*scale)/2,(180-s.height*scale)/2,s.width*scale,s.height*scale);previews.set(s.canvas,art);}const size=Math.min(w,h);k.drawImage(art,x+(w-size)/2,y+(h-size)/2,size,size);}
  function use(item){if(opening||!ledger?.inventory(owner).some(i=>i.id===item.id))return;
   if(item.kind==='object'){if(owner!=='self'){status('Elegí tu inventario para colocar objetos.');return;}status(place(item.type)?'Elegí dónde colocarlo.':'Sin unidades libres o sin espacio. El objeto sigue en tu inventario.');}
   else if(item.kind==='environment')status(owner==='self'&&applyEnvironment(item)?'Ambiente aplicado.':'Elegí tu inventario.');
   else status(equip(owner,item)?item.name+' equipado.':'El visitante ya no está en la sala.');
  }
  function card(item,count){const available=item.kind==='object'?Math.max(0,count-placed(owner,item.type)):count;const b=doc.createElement('button');b.className='reward-inventory-item';b.type='button';b.disabled=!!opening||item.kind==='object'&&available===0;b.setAttribute('aria-label',(item.kind==='object'?'Colocar ':item.kind==='environment'?'Aplicar ':'Equipar ')+item.name+', '+count+' obtenido'+(count===1?'':'s'));b.title=item.kind==='object'?'Colocar':item.kind==='environment'?'Aplicar':'Equipar';const cv=doc.createElement('canvas');cv.width=160;cv.height=140;canvasSprite(cv.getContext('2d'),item,0,0,160,140);const label=doc.createElement('span');label.textContent=item.name;const qty=doc.createElement('small');qty.textContent=title(item)+(item.starter?' · Inicial':item.kind==='object'?' · '+available+' / '+count+' libres':' · ×'+count);b.append(cv,label,qty);b.addEventListener('click',()=>use(item));return b;}
  function refreshInventory(){
   const list=$('rewardInventory');const inventory=ledger?.inventory(owner)||[],filter=$('inventoryFilter').value||'all',query=($('inventorySearch').value||'').trim().toLocaleLowerCase('es');
   const key=JSON.stringify([owner,filter,query,!!opening,appearance(owner).hair,inventory.map(i=>[i.id,i.count,i.kind==='object'?placed(owner,i.type):0])]);if(key===inventoryKey)return;inventoryKey=key;list.textContent='';
   const shown=inventory.filter(i=>(filter==='all'||i.kind===filter)&&i.name.toLocaleLowerCase('es').includes(query));for(const i of shown)list.appendChild(card(i,i.count));
   $('rewardEmpty').hidden=shown.length>0;$('rewardEmpty').textContent=inventory.length?'No hay coincidencias.':'Abrí una caja para empezar tu colección.';
   $('rewardInventoryCount').textContent=inventory.reduce((sum,i)=>sum+i.count,0)+' obtenidos';
  }
  function refresh(){let total=0;
   for(const [kind,id] of [['object','Object'],['character','Character'],['environment','Environment']]){const count=ledger?.pending(owner,kind).length||0;total+=count;$('pending'+id).textContent=count+' disponibles';$('open'+id+'Box').disabled=!!opening||!count||!ledger;$('test'+id+'Claim').disabled=!!opening||!ledger;}
   $('pendingTotal').textContent=String(total);$('pendingTotal').hidden=!total;$('rewardOwner').disabled=!!opening;refreshInventory();
  }
  function refreshOwners(){const options=$('rewardOwner'),rows=players();options.textContent='';if(!rows.some(p=>p.id===owner)&&!opening){owner='self';result=null;$('rewardResult').hidden=true;$('rewardAnimation').hidden=true;}for(const p of rows){const o=doc.createElement('option');o.value=p.id;o.textContent=p.name;options.appendChild(o);}options.value=owner;}
  function showResult(item){result=item;$('rewardResult').hidden=false;$('rewardResultName').textContent=item.name;$('rewardResultType').textContent=title(item);
   const cv=$('rewardResultArt'),k=cv.getContext('2d');k.clearRect(0,0,cv.width,cv.height);canvasSprite(k,item,0,0,cv.width,cv.height);
   $('useReward').textContent=item.kind==='object'?'Colocar':item.kind==='environment'?'Aplicar':'Equipar';$('useReward').hidden=item.kind!=='character'&&owner!=='self';status('Guardado en tu inventario.');
  }
  function finish(){if(!opening)return;const item=opening.item;opening=null;$('rewardAnimation').hidden=true;$('skipReward').hidden=true;$('rewardReel').setAttribute('aria-busy','false');refresh();onChange?.();showResult(item);}
  function drawReel(progress){if(!opening)return;const cv=$('rewardReel'),k=cv.getContext('2d'),w=cv.width,h=cv.height,cardW=190,gap=12,step=cardW+gap;
   const start=step*2,end=opening.winner*step+cardW/2-w/2,offset=start+(end-start)*(1-Math.pow(1-progress,4));
   k.clearRect(0,0,w,h);k.fillStyle='#eee';k.fillRect(0,0,w,h);
   for(let j=0;j<opening.entries.length;j++){const x=j*step-offset;if(x+cardW<0||x>w)continue;const item=opening.entries[j];k.fillStyle='#fff';k.fillRect(x,10,cardW,h-20);k.strokeStyle='#ccc';k.strokeRect(x+.5,10.5,cardW-1,h-21);canvasSprite(k,item,x+8,18,cardW-16,h-65);k.fillStyle='#171717';k.font='900 15px "Zalando Sans Expanded"';k.textAlign='center';k.fillText(item.name,x+cardW/2,h-28,cardW-14);}
   k.fillStyle='#171717';k.beginPath();k.moveTo(w/2-10,0);k.lineTo(w/2+10,0);k.lineTo(w/2,22);k.fill();k.fillRect(w/2-2,h-15,4,15);
  }
  let requesting=false;
  async function open(kind){if(opening||requesting||!ledger)return;const pending=ledger.pending(owner,kind)[0];if(!pending)return;
   requesting=true;try{const receipt=await ledger.open(pending.id,owner),item=ledger.item(receipt.itemId),pool=catalog.filter(i=>i.kind===kind&&!i.starter),entries=Array.from({length:39},()=>pool[Math.floor(Math.random()*pool.length)]),winner=32;entries[winner]=item;opening={item,entries,winner,at:now()};result=null;$('rewardResult').hidden=true;$('rewardAnimation').hidden=false;$('skipReward').hidden=false;$('rewardReel').setAttribute('aria-busy','true');status('Abriendo…');refresh();drawReel(0);if(reducedMotion())finish();}catch(e){status('No se pudo guardar. '+e.message);}finally{requesting=false;refresh();}
  }
  function claim(kind){if(opening||!ledger)return;try{const id='demo-'+Date.now()+'-'+(++serial)+'-'+Math.random().toString(36).slice(2);ledger.grant({id,userId:owner,kind,status:'accepted'});refresh();status('Caja de prueba lista.');}catch(e){status('No se pudo guardar. '+e.message);}}
  $('rewardOwner').addEventListener('change',()=>{if(opening)return;owner=$('rewardOwner').value;result=null;$('rewardResult').hidden=true;$('rewardAnimation').hidden=true;refresh();status('Inventario de '+(players().find(p=>p.id===owner)?.name||'jugador')+'.');});
  $('inventoryFilter').addEventListener('change',refreshInventory);$('inventorySearch').addEventListener('input',refreshInventory);
  for(const [kind,id] of [['object','Object'],['character','Character'],['environment','Environment']]){$('test'+id+'Claim').addEventListener('click',()=>claim(kind));$('open'+id+'Box').addEventListener('click',()=>open(kind));}
  $('skipReward').addEventListener('click',finish);$('useReward').addEventListener('click',()=>{if(result)use(result);});
  refreshOwners();refresh();status(error);
  return {refreshInventory,count:(user,id)=>ledger?.inventory(user).find(i=>i.id===id)?.count||0,owns:(user,id)=>ledger?.owns(user,id)||!!catalog.find(i=>i.id===id)?.starter,showPanel(name){panel=name;refreshOwners();refresh();status(error||$('rewardStatus').textContent);},tick(t){if(opening){const p=Math.min(1,(t-opening.at)/4000);if(p>=1)finish();else if(panel==='rewards')drawReel(p);}},snapshot:()=>({owner,opening:!!opening,result:result?.id,receipts:ledger?.receipts()||[]})};
 }
 root.VeredaRewardsUI={create};
})(typeof window!=='undefined'?window:globalThis);
