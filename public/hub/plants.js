(function(root){
 'use strict';
 let roomId=null,plants={},stamp=0,received=0,busy=new Set();const nodes=new Map();
 const clock=()=>stamp+Math.max(0,performance.now()-received);
 function receive(room,serverNow){if(roomId!==room.id){for(const n of nodes.values())n.el.remove();nodes.clear();}roomId=room.id;plants=room.plants||{};stamp=Number.isFinite(serverNow)?serverNow:Date.now();received=performance.now();}
 function progress(item){const p=plants[item.id];return p?.type===item.type?Math.max(0,Math.min(1,(clock()-p.startedAt)/(p.readyAt-p.startedAt))):0;}
 async function harvest(item){const online=root.MINER_HUB_ONLINE,p=plants[item.id];if(!online.canEdit()||busy.has(item.id)||!p)return;
  if(progress(item)<1){root.HubPlantToast?.('Todavía está creciendo.');return;}
  busy.add(item.id);try{const result=await online.harvest({roomId,itemId:item.id,cycle:p.cycle});root.HubPlantToast?.('+'+result.amount.toLocaleString('es-AR')+' créditos · ¡Cosecha lista!');}catch(e){root.HubPlantToast?.(e.message);}finally{busy.delete(item.id);}
 }
 function paint(items,bounds,view,visible){const container=document.getElementById('hubPlantLabels'),present=new Set();if(!container)return;
  for(const item of items){if(!root.VeredaCore.TYPES[item.type].plantation||!visible||!plants[item.id])continue;present.add(item.id);let node=nodes.get(item.id);
   if(!node){const el=document.createElement('div'),bar=document.createElement('progress'),button=document.createElement('button');el.className='hub-plant-label';bar.max=1;bar.setAttribute('aria-label','Crecimiento de la planta');button.type='button';button.onclick=e=>{e.stopPropagation();harvest(node.item);};button.onpointerdown=e=>e.stopPropagation();el.append(bar,button);container.append(el);node={el,bar,button,item};nodes.set(item.id,node);}node.item=item;
   const b=bounds(item),x=view.x+(b.x+b.w/2)*view.s,y=view.y+(b.y+b.h)*view.s+4,p=progress(item),transform='translate('+Math.round(x)+'px,'+Math.round(y)+'px) translateX(-50%)',value=Math.floor(p*1000)/1000,text=busy.has(item.id)?'…':'Cosechar +'+plants[item.id].amount.toLocaleString('es-AR');node.el.hidden=x<20||x>view.w-20||y<0||y>view.h-30;if(node.el.style.transform!==transform)node.el.style.transform=transform;if(node.bar.value!==value)node.bar.value=value;node.bar.hidden=p>=1;node.button.hidden=p<1;node.button.disabled=busy.has(item.id);if(node.button.textContent!==text)node.button.textContent=text;
  }
  for(const [id,node] of nodes)if(!present.has(id)){node.el.remove();nodes.delete(id);}
 }
 root.HubPlants={receive,progress,stage:item=>progress(item)>=1?2:progress(item)>=.5?1:0,harvest,paint};
})(window);
