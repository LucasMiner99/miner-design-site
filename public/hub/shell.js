(()=>{'use strict';
 const $=id=>document.getElementById(id),panel=$('hubCollection'),handle=$('hubPanelHandle');
 let selected='inventory',drag=null,opener=null;
 function sync(){for(const name of ['inventory','rewards'])$(name+'Tab').setAttribute('aria-expanded',String(!panel.hidden&&selected===name));$('hubPanelTitle').textContent=selected==='rewards'?'Cajas':'Inventario';}
 function position(x,y){const r=panel.getBoundingClientRect();panel.style.left=Math.max(8,Math.min(x,window.innerWidth-r.width-8))+'px';panel.style.top=Math.max(8,Math.min(y,window.innerHeight-r.height-8))+'px';panel.style.right='auto';}
 function close(focus=true){panel.hidden=true;drag=null;sync();if(focus)opener?.focus({preventScroll:true});}
 for(const name of ['inventory','rewards'])$(name+'Tab').addEventListener('click',()=>{opener=$(name+'Tab');if(!panel.hidden&&name===selected){close();return;}selected=name;panel.hidden=false;sync();if(panel.style.left){const r=panel.getBoundingClientRect();position(r.left,r.top);}});
 $('hubPanelClose').onclick=()=>close();
 handle.addEventListener('pointerdown',e=>{if(e.button!==0)return;const r=panel.getBoundingClientRect();drag={id:e.pointerId,x:e.clientX-r.left,y:e.clientY-r.top};handle.setPointerCapture(e.pointerId);e.preventDefault();});
 handle.addEventListener('pointermove',e=>{if(drag?.id===e.pointerId)position(e.clientX-drag.x,e.clientY-drag.y);});
 for(const type of ['pointerup','pointercancel','lostpointercapture'])handle.addEventListener(type,()=>{drag=null;});
 handle.addEventListener('keydown',e=>{const d={ArrowLeft:[-20,0],ArrowRight:[20,0],ArrowUp:[0,-20],ArrowDown:[0,20]}[e.key];if(!d)return;e.preventDefault();e.stopPropagation();const r=panel.getBoundingClientRect();position(r.left+d[0],r.top+d[1]);});
 panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}});
 window.addEventListener('resize',()=>{if(!panel.hidden&&panel.style.left){const r=panel.getBoundingClientRect();position(r.left,r.top);}});
 if(window.ResizeObserver)new ResizeObserver(()=>{if(!panel.hidden&&panel.style.left){const r=panel.getBoundingClientRect();position(r.left,r.top);}}).observe(panel);
 window.HubPanels={close,select(name){if(['inventory','rewards'].includes(name)){selected=name;sync();}},ready(){for(const name of ['inventory','rewards'])$(name+'Tab').disabled=false;}};
 sync();
})();
