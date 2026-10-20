(()=>{
 'use strict';
 const $=id=>document.getElementById(id),bridge=()=>window.MINER_HUB_ONLINE;
 let rooms=[],busy=false;
 const status=value=>{$('hubCommunityStatus').textContent=value;};
 function current(room,user){
  const b=$('hubCommunityToggle');b.hidden=!room?.community||!user?.admin;
  b.disabled=busy;b.textContent=room?.public?'Cerrar Casino':'Abrir Casino';
  b.title=room?.public?'Cerrar la sala y devolver a los visitantes a sus casas':'Permitir que todos entren a jugar';
 }
 async function toggle(room){
  if(busy||!bridge().user.admin)return;busy=true;status('Guardando…');render(rooms);current(bridge().room,bridge().user);
  try{const result=await bridge().communityAction({roomId:room.id,public:!room.public});rooms=rooms.map(r=>r.id===room.id?{...r,public:result.room.public}:r);status(result.room.public?'El Casino está abierto.':'El Casino está cerrado. Podés entrar a decorarlo.');}
  catch(e){status(e.message);}finally{busy=false;render(rooms);current(bridge().room,bridge().user);}
 }
 function render(list){
  rooms=list;const root=$('hubCommunityList');root.replaceChildren();
  for(const r of rooms){
   const card=document.createElement('article');card.className='hub-community-card';card.dataset.roomId=r.id;
   const artwork=document.createElement('div');artwork.className='hub-community-art';artwork.setAttribute('aria-hidden','true');
   for(const src of ['assets/v59-horse-racing.webp','assets/v62-fishing-machine.webp']){const img=document.createElement('img');img.src=src;img.alt='';artwork.append(img);}
   const title=document.createElement('h4');title.textContent=r.name;
   const state=document.createElement('span');state.className='hub-community-state';state.dataset.open=String(r.public);state.textContent=r.public?'Abierto · '+r.online+'/20':'Cerrado';
   const description=document.createElement('p');description.textContent='Todos los minijuegos, un lugar para encontrarse.';
   const enter=document.createElement('button');enter.className='primary-button';enter.textContent=bridge().room?.id===r.id?'Estás acá':r.public?'Entrar a jugar':'Entrar a decorar';enter.disabled=bridge().room?.id===r.id||!r.public&&!bridge().user.admin;
   if(!r.public&&!bridge().user.admin)enter.textContent='Abre pronto';
   enter.onclick=()=>{bridge().visit(r.id);$('hubRoomsDialog').close();};
   card.append(artwork,title,state,description,enter);
   if(bridge().user.admin){const control=document.createElement('button');control.className='secondary-button';control.textContent=r.public?'Cerrar Casino':'Abrir Casino';control.disabled=busy;control.onclick=()=>toggle(r);card.append(control);}
   root.append(card);
  }
  if(!rooms.length){const p=document.createElement('p');p.textContent='Próximamente.';root.append(p);}
 }
 $('hubCommunityToggle').onclick=()=>toggle(bridge().room);
 window.HubCommunity={render(list){status('');render(list);},current,update(event){rooms=rooms.map(r=>r.id===event.roomId?{...r,public:event.public,online:event.public?r.online:0}:r);if($('hubRoomsDialog').open)render(rooms);}};
})();
