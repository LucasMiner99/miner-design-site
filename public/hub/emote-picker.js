(()=>{'use strict';
 const $=id=>document.getElementById(id),panel=$('hubEmotePicker'),toggle=$('hubEmoteToggle'),input=$('chatInput');
 let generation=0;
 function close(){panel.hidden=true;toggle.setAttribute('aria-expanded','false');generation++;}
 function insert(name){const start=input.selectionStart??input.value.length,end=input.selectionEnd??start,left=input.value.slice(0,start),right=input.value.slice(end),piece=(left&&!/\s$/.test(left)?' ':'')+name+' ';
  if(left.length+piece.length+right.length>input.maxLength){$('hubEmoteStatus').textContent='No entra en el mensaje. Borrá un poco de texto.';return;}
  input.value=left+piece+right;input.setSelectionRange(left.length+piece.length,left.length+piece.length);input.dispatchEvent(new Event('input',{bubbles:true}));close();input.focus();
 }
 function render(){const grid=$('hubEmoteGrid'),q=$('hubEmoteSearch').value.trim().toLocaleLowerCase();grid.replaceChildren();const all=window.HubEmotes.entries().filter(([name])=>name.toLocaleLowerCase().includes(q));
  for(const [name,url] of all.slice(0,120)){const b=document.createElement('button');b.type='button';b.title=name;b.setAttribute('aria-label',name);const img=document.createElement('img');img.src=url;img.alt=name;img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';img.onerror=()=>img.replaceWith(document.createTextNode(name));b.append(img);b.onclick=()=>insert(name);grid.append(b);}
  $('hubEmoteStatus').textContent=all.length>120?'Mostrando 120. Buscá para filtrar.':all.length?'':q?'No hay coincidencias.':'No se pudieron cargar los emotes. Cerrá y volvé a abrir para reintentar.';
 }
 toggle.onclick=async()=>{if(!panel.hidden){close();return;}panel.hidden=false;toggle.setAttribute('aria-expanded','true');const token=++generation;$('hubEmoteStatus').textContent='Cargando…';await window.HubEmotes.load();if(token!==generation)return;render();$('hubEmoteSearch').focus();};
 $('hubEmoteSearch').oninput=render;$('hubEmoteClose').onclick=()=>{close();input.focus();};
 panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();input.focus();}});
 document.addEventListener('pointerdown',e=>{if(!panel.hidden&&!panel.contains(e.target)&&!toggle.contains(e.target))close();});
})();
