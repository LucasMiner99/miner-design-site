(()=>{
  'use strict';
  const online=window.MINER_HUB_ONLINE,localStorage=online.storage;
  const C=window.VeredaCore, $=id=>document.getElementById(id), KEY='vereda.room.v1';
  const ASSETS={furniture:'assets/furniture-cohesive.png',avatar:'assets/avatar.png',parts:'assets/avatar-parts.png',sofa:'assets/sofa-backrest.png',chair:'assets/chair-backrest.png',heads:'assets/heads-unified.png',bodyA:'assets/body-salvia-v12.png',bodyB:'assets/body-lila-v12.png',bodyC:'assets/body-jacket-v15.png',bodyD:'assets/body-shirt-v15.png',walkApproved:'assets/walk-classic-v15.png',walkNew:'assets/walk-new-v15.png',headsNew:'assets/heads-new-v15.png',headsGlasses:'assets/heads-glasses-v15.png',furnitureNew:'assets/furniture-new-v15.png',bodyE:'assets/body-varsity-v16.png',bodyF:'assets/body-stripes-v16.png',walkV16:'assets/walk-new-v16.png',hairV16:'assets/heads-new-v16.png',facesV16:'assets/heads-laugh-v16.png',furnitureV16:'assets/furniture-new-v16.png',radioV17:'assets/radio-v17.png',bodyG:'assets/body-night-v18.png',bodyH:'assets/body-vest-v18.png',walkV18:'assets/walk-new-v18.png',hairV18:'assets/heads-new-v18.png',wallV18:'assets/wall-decor-v18.png',bonsaiV19:'assets/bonsai-v19.png',cartV19:'assets/cart-v19.png',chestV20:'assets/chest-v20.png',tankV20:'assets/aquarium-v20.png',fishV20:'assets/fish-v20.png',wallStateV20:'assets/wall-states-v20.png',furnitureV21:'assets/furniture-v21.png',bodyI:'assets/body-knit-v21.png',walkV21:'assets/walk-knit-v21.png',hairV21:'assets/heads-peach-v21.png',bodyJ:'assets/body-hood-v22.png',bodyK:'assets/body-coat-v22.png',walkV22:'assets/walk-outfits-v22-fixed.png',hairV22:'assets/heads-hats-v22.png',furnitureV22:'assets/furniture-v22.png',furnitureV23:'assets/furniture-v23.png',upperZip:'assets/upper-zip-v24.png',upperCross:'assets/upper-cross-v24.png',upperTank:'assets/upper-tank-v24.png',pantsBaggy:'assets/pants-baggy-v24.png',pantsCross:'assets/pants-cross-v24.png',shoeStrap:'assets/shoes-strap-v24.png',shoePanel:'assets/shoes-panel-v24.png',shoeTall:'assets/shoes-tall-v24.png',shoeLaces:'assets/shoes-laces-v24.png',chainV24:'assets/chain-v24.png',upperNight:'assets/upper-night-v24.png',gamingV27:'assets/gaming-v27.png',wallV27:'assets/wall-v27.png',backV27:'assets/back-v28.png',catV27:'assets/cat-v27.png',dogV27:'assets/dog-v27.png',lightsV27:'assets/lights-v27.png',catGray:'assets/cat-gray-v28.png',catTux:'assets/cat-tux-v28.png',dogChocolate:'assets/dog-chocolate-v28.png',dogBlack:'assets/dog-black-v28.png',upperCream:'assets/upper-cream-v28.png',upperWine:'assets/upper-wine-v28.png',furnitureV28:'assets/furniture-v28.png',v29Wall:'assets/v29-wall.png',v29Windows:'assets/v29-windows.png',v29Tank:'assets/v29-tank.png',v29DarkBasic:'assets/v29-darkbasic.png',v29DarkNew:'assets/v29-darknew.png',v29DarkBench:'assets/v29-darkbench-clean.png',v29DarkGaming:'assets/v29-darkgaming.png',v29DarkSofa:'assets/v29-darksofa-clean.png',v29DarkChair:'assets/v29-darkchair.png',v29DarkCafe:'assets/v29-darkcafe.png',v29DarkKitchen:'assets/v29-darkkitchen-clean.png',v29DarkAux:'assets/v29-darkaux.png',v29DarkChest:'assets/v29-darkchest.png',v29DarkCart:'assets/v29-darkcart-clean.png',v29DarkMusic:'assets/v29-darkmusic.png',furnitureV30:'assets/furniture-v30.png',furnitureV35:'assets/furniture-v35.png',propsV35:'assets/props-v35.png',doorV32:'assets/door-v32.png',doorsV33:'assets/doors-v33.png',chainsV33:'assets/chains-v33.png',headsSunglasses:'assets/heads-sunglasses-v34.png',headsMoustache:'assets/heads-moustache-v34.png',headsBeard:'assets/heads-beard-v34.png',rouletteV1:'assets/roulette-v1.png',exchangeMachine:'assets/exchange-machine.webp',dressLilac:'assets/v46-dress-lilac.webp',dressBlack:'assets/v46-dress-black.webp',dressDenim:'assets/v46-dress-denim.webp',hairBraids:'assets/v45-hair-braids.webp',hairBlue:'assets/v45-hair-blue.webp',backSkate:'assets/v46-back-skate.webp',monitorWide:'assets/v45-monitor-wide.webp',monitorPortrait:'assets/v45-monitor-portrait.webp',tvCinema:'assets/v45-tv-cinema.webp',tvWall:'assets/v45-tv-wall.webp',tableWorkshop:'assets/v45-table-workshop.webp',lampMoon:'assets/v45-lamp-moon.webp',plantSun:'assets/v47-plant-sun.webp',plantRose:'assets/v47-plant-rose.webp',plantEpic:'assets/v47-plant-epic.webp',basketMachine:'assets/v51-basket.webp',pet530:'assets/v53-pet-chick.webp',pet531:'assets/v53-pet-frog.webp',pet532:'assets/v53-pet-rabbit.webp',pet533:'assets/v53-pet-capybara.webp',pet534:'assets/v53-pet-turtle.webp',top530:'assets/v53-top-bomber.webp',top531:'assets/v53-top-cardigan.webp',top532:'assets/v53-top-tropical.webp',top533:'assets/v53-top-stars.webp',top534:'assets/v53-top-denim.webp',object530:'assets/v53-object-terrarium.webp',object531:'assets/v53-object-telescope.webp',object532:'assets/v53-object-tea-cart.webp',object533:'assets/v53-object-records.webp',object534:'assets/v53-object-herbarium.webp',...Object.fromEntries((window.VEREDA_WARDROBE_CACHE?.sheets||[]).map((file,i)=>['wardrobeCache'+i,file])),...window.VEREDA_ASSETS};
  const canvas=$('game'),ctx=canvas.getContext('2d'),stage=$('stage');
  let renderDensity=2,sceneW=900,sceneH=640;
  const scene=document.createElement('canvas');scene.width=900*renderDensity;scene.height=640*renderDensity;const g=scene.getContext('2d');g.scale(renderDensity,renderDensity);
  const floorCache=document.createElement('canvas');floorCache.width=900*renderDensity;floorCache.height=640*renderDensity;const bg=floorCache.getContext('2d');bg.scale(renderDensity,renderDensity);
  const floorView=document.createElement('canvas'),floorViewContext=floorView.getContext('2d');let floorViewKey='';
  let floorLevels=[];
  const wallThemes=[{name:'Salvia',light:'#e4e4c7',dark:'#d5d8b6',panel:'#b6bd94',trim:'#7f936d',swatch:'#bcc79e'},{name:'Durazno',light:'#f0ddbe',dark:'#e3c9a7',panel:'#d5ad90',trim:'#a27c64',swatch:'#dbb99e'},{name:'Lavanda',light:'#e5dfe4',dark:'#d3ccd9',panel:'#b8b0c9',trim:'#8b829c',swatch:'#c4bbd1'}];
  const floorThemes=[{name:'Roble cálido',base:'#c39a65',light:'#ddb880',dark:'#af814f',rim:'#8c6645',swatch:'#cba16b'},{name:'Madera clara',base:'#d6bc89',light:'#e9d5a8',dark:'#bca174',rim:'#9d825e',swatch:'#e1c998'},{name:'Nogal',base:'#a27b58',light:'#bc976d',dark:'#896344',rim:'#6a503c',swatch:'#aa815a'}];
  wallThemes.push(...[
    ['Azul bruma','#d6e5e7','#bed1d8','#93afb9','#627d8d'],
    ['Crema','#f2e9d5','#e6d9ba','#cabb98','#a2916d'],
    ['Rosa té','#eddbdc','#d9bdc7','#bd98a6','#926a7c'],
    ['Grafito','#68727b','#505b65','#424c56','#303a44'],
    ['Bosque','#a6bfae','#89a391','#6f8c76','#47644f']
  ].map(([name,light,dark,panel,trim])=>({name,light,dark,panel,trim,swatch:dark})));
  floorThemes.push(...[
    ['Cerezo','#ad765c','#c89576','#905a43','#714831'],
    ['Gris niebla','#a7aaa6','#c4c8c1','#878e86','#676e68'],
    ['Piedra crema','#c9c3b5','#e4dfd1','#aaa394','#817c70']
  ].map(([name,base,light,dark,rim])=>({name,base,light,dark,rim,swatch:base})));
  wallThemes.push(...[
    ['Terracota','#cd9279','#b87e67','#9d6652','#754b3e'],
    ['Azul noche','#566482','#414e6b','#35415d','#252f45'],
    ['Petróleo','#699e9a','#548681','#416c69','#2e504f'],
    ['Cielo','#c1dcf1','#a7c8e3','#81a5c6','#5b7f9e'],
    ['Lila','#d3c5eb','#baacd6','#9c8bbd','#75658f'],
    ['Borgoña','#a77787','#8d5c70','#75465a','#543344'],
    ['Blanco tiza','#f3f0e9','#e3dfd6','#cbc6bb','#a39d93'],
    ['Gris perla','#d5d5d7','#bebfc3','#a3a6ae','#7a7e88']
  ].map(([name,light,dark,panel,trim])=>({name,light,dark,panel,trim,swatch:dark})));
  floorThemes.push(...[
    ['Carbón','#56575b','#707277','#414347','#303236'],
    ['Blanco lavado','#dedbd2','#f0ede4','#c4c0b6','#9b978d'],
    ['Arcilla','#b98068','#d09b80','#9b6653','#744a3c'],
    ['Verde piedra','#9eafa2','#becabd','#7e9384','#5f7465'],
    ['Azul pizarra','#879bac','#abbcc8','#687e92','#4b5e73'],
    ['Malva','#b4a1b1','#d2c2cd','#937e91','#715f70']
  ].map(([name,base,light,dark,rim])=>({name,base,light,dark,rim,swatch:base})));
  let state=C.initial(),storageAvailable=true,restoreNotice='';
  try{const saved=localStorage.getItem(KEY);if(saved){const loaded=C.restore(JSON.parse(saved));if(loaded){state=loaded;if(loaded.unplacedItems?.length)restoreNotice='Algunos objetos quedaron en reserva. Probá una sala más grande para recuperarlos.';}else restoreNotice='No pudimos recuperar el guardado anterior. Abrimos un rincón nuevo.';}}catch(e){storageAvailable=false;restoreNotice='El guardado no está disponible aquí. Podés jugar durante esta sesión.';}
  C.setLayout(state.layout);
  let player={...C.findFree(state.items),dir:0,path:[],step:0,moving:false};
  let mode='walk',selectedId=null,pendingType=null,ghost=null,hoverTile=null,zoom=1,targetZoom=1,zoomAnchor=null,pan={x:0,y:0},view={s:1,x:0,y:0,w:900,h:640};
  let cameraDrag=null;
  let fishSprite=null,windowClosed=null,doorSprite=null,doorStates=[];
  const S=window.VeredaScenery,darkFurniture=new Map(),windowStates=new Map();
  const lightStates=new Map();let petSheets=[];const rotationArt=new Map(),rotationLoads=new Map();
  // Symmetric pieces keep their exact materials and existing on/off artwork.
  const plantArt=new Map();
  const symmetricRotation=new Set([90,91,92,2,5,18,21,46]);
  let furniture=[],avatar=[],ready=false,drawBounds=[],history=[],pointer=null,toastTimer,saveTimer,latestTime=0,arrivalMarker=null,filter='all',walkSoundTimer=0;
  let petBounds=[],petPointer=null;
  for(const key of Object.keys(ASSETS))ASSETS[key]=window.HUB_OPTIMIZED_ASSETS?.[ASSETS[key]]||ASSETS[key];
  let bubbles=[],soundEnabled=false,audioCtx=null,lastChatAt=0;const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const animationEnabled=true;let effectsTime=0,clockStill=Date.now();

  let movingId=null,seatedId=null,pendingSeat=null,seatedSlot=0,pendingSeatSlot=0;
  const P=window.VeredaPeople,PEOPLE_KEY='vereda.people.v1';
  const people=P.create(C,()=>state.items,()=>player);
  let wardrobe=null,myAppearance=P.look({}),actorBounds=[],editingActor=null,draftLook=null,previewDir=0,lookSerial=0;
  const pets=window.VeredaPets.create(C,()=>state.items,()=>[{...player,id:'self',name:online.user.name,petName:online.user.petName||'',appearance:myAppearance},...people.actors.values()]);
  function drawPet(pet){
    const sheet=petSheets[pet.kind-1];if(!sheet)return;
    const s=sheet[window.VeredaPets.frameIndex(pet)],idle=sheet[pet.dir];
    const scale=27/Math.max(idle.width,idle.height),w=s.width*scale,h=s.height*scale,p=groundProject(pet.x,pet.y),x=p.x-w/2,y=p.y-h+3;
    ellipse(g,p.x,p.y,7,3,'#51482d24');spriteAt(s,g,x,y,w);petBounds.push({x,y,w,h,pet,s});
  }
  function savePeople(){try{localStorage.setItem(PEOPLE_KEY,JSON.stringify({version:1,actors:people.serialize(),me:myAppearance}));}catch(e){toast('Los personajes no pudieron guardarse. Siguen disponibles durante esta sesión.');}}
  function restorePeople(){try{const saved=JSON.parse(localStorage.getItem(PEOPLE_KEY)||'null');if(saved?.version===1){people.restore(saved.actors);myAppearance=P.look(saved.me);}}catch(e){toast('No pudimos recuperar los visitantes guardados.');}renderPeople();}
  function actorSeat(actor){return !actor.path.length&&actor.seat&&state.items.find(i=>i.id===actor.seat.itemId&&C.seatPlaces(i)[actor.seat.slot]);}
  function seatDirection(seat,place){const r=C.rotation(seat);if(r<2)return r?(place.dir===0?1:0):place.dir;return r===2?(place.dir===0?2:3):(place.dir===0?3:2);}
  function seatPoint(seat,place,b){if(C.rotation(seat)<2||![0,1,17,49].includes(seat.type))return {x:b.x+b.w*(b.flip?1-place.u:place.u),y:b.y+b.h*place.v};const places=C.seatPlaces(seat),index=places.indexOf(place),u=places.length>1?(index===0?.35:.65):.5;return {x:b.x+b.w*(b.flip?1-u:u),y:b.y+b.h*(places.length>1?(index===0?.46:.62):.56)};}
  function seatForeground(item){if(![0,1,17,49].includes(item.type))return;const b=itemPosition(item);if(C.rotation(item)>=2){spriteAt(b.sprite,g,b.x,b.y,b.w,b.flip);return;}g.save();g.translate(b.x+(b.flip?b.w:0),b.y);if(b.flip)g.scale(-1,1);g.beginPath();for(const [i,p] of [[.78,.38],[1,.48],[1,1],[.77,1],[.69,.78],[.70,.55]].entries())i?g.lineTo(p[0]*b.w,p[1]*b.h):g.moveTo(p[0]*b.w,p[1]*b.h);g.closePath();g.clip();spriteAt(b.sprite,g,0,0,b.w);g.restore();}
  function actorVisual(actor){
    const seat=actorSeat(actor),b=seat&&itemPosition(seat),place=seat&&C.seatPlaces(seat)[actor.seat.slot],dir=seat?seatDirection(seat,place):actor.dir;
    const s=wardrobe.frame(actor.appearance,dir,seat?'seat':actor.moving?Math.floor(actor.step)%8:null),scale=s.worldScale??1,w=s.width*scale,h=s.height*scale;
    const p=seat?seatPoint(seat,place,b):groundProject(actor.x,actor.y);
    return {sprite:s,p,seat,x:p.x-(seat?(s.seatX??.5)*w:s.anchorX),y:p.y-(seat?(s.seatY??.72)*h:s.anchorY),w,h};
  }
  function drawActor(actor){const v=actorVisual(actor);if(!v.seat)ellipse(g,v.p.x,v.p.y,11,4.5,'#51482d36');spriteAt(v.sprite,g,v.x,v.y,v.w);actorBounds.push({...v,id:actor.id,depth:actor.x+actor.y});}
  function characterAt(world,hit){const frontDepth=hit&&!C.TYPES[hit.type].wall?hit.x+hit.y+(C.TYPES[hit.type].w+C.TYPES[hit.type].h)/2:-Infinity;for(const b of actorBounds.slice().reverse()){if(frontDepth>b.depth+.1)continue;const x=world.x-b.x,y=world.y-b.y;if(x<0||y<0||x>=b.w||y>=b.h)continue;const cv=b.sprite.canvas,px=Math.floor(x/b.w*cv.width),py=Math.floor(y/b.h*cv.height);if(cv.getContext('2d').getImageData(px,py,1,1).data[3]>64)return b.id;}return null;}
  function renderPeople(){const list=$('peopleList');list.textContent='';for(const a of people.actors.values()){const b=document.createElement('button');b.className='person-row';b.setAttribute('aria-label','Editar a '+a.name);const cv=document.createElement('canvas');cv.width=72;cv.height=96;const s=wardrobe.frame(a.appearance,0);cv.getContext('2d').drawImage(s.canvas,0,0,72,96);const name=document.createElement('span');name.textContent=a.name;const edit=document.createElement('small');edit.textContent='Vestir →';b.append(cv,name,edit);b.addEventListener('click',()=>openLook(a.id));list.appendChild(b);}const count=people.actors.size;$('peopleCount').textContent=count+' / '+P.LIMIT+' visitantes';$('spawnOne').disabled=count>=P.LIMIT;$('spawnThree').disabled=count>=P.LIMIT;}
  function spawnVisitors(count){if(!ready)return;let added=0;for(let n=0;n<count;n++)if(people.demo())added++;renderPeople();savePeople();if(!added)toast('No queda espacio libre para otro visitante.');}
  function owns(user,id){return rewardsUI?.owns(user,id)||false;}
  function lookOptions(user,key){return P.choices[key].map((_,i)=>i).filter(i=>i===0||key==='hair'&&i===1||owns(user,'look:'+key+':'+i));}
  function ownedLook(user,look){const a=P.look(look);return Object.fromEntries(Object.keys(P.choices).map(key=>[key,lookOptions(user,key).includes(a[key])?a[key]:0]));}
  function roomOptions(picker){return picker.options.map((o,index)=>({...o,index})).filter(o=>o.index===0||owns('self','environment:'+picker.key+':'+o.index));}
  function openLook(id){if(!ready)return;if(id!=='self'){const person=people.actors.get(id);if(!person)return;$('hubPlayerName').textContent=person.name;window.HubGroups?.player(id);$('hubPlayerVisit').onclick=()=>{online.visit(id);$('hubPlayerDialog').close();};$('hubPlayerTrade').onclick=()=>{$('hubPlayerDialog').close();window.HubTrade?.invite(id);};$('hubPlayerDialog').showModal();return;}const a=id==='self'?{name:online.user.name,appearance:myAppearance||P.look({})}:people.actors.get(id);if(!a)return;editingActor=id;draftLook=ownedLook(id,a.appearance);previewDir=0;$('lookStatus').textContent='';$('lookTitle').textContent=id==='self'?'Tu look':'El look de '+a.name;$('lookName').value=a.name;$('lookPetName').value=online.user.petName||'';$('removePerson').hidden=id==='self';$('originalLook').hidden=id!=='self';$('visitorChatForm').hidden=id==='self';syncLook();$('lookDialog').showModal();}
  function syncLook(){
    if(!draftLook)return;draftLook=ownedLook(editingActor,draftLook);
    for(const [key,labels] of Object.entries(P.choices)){const id='look'+key[0].toUpperCase()+key.slice(1);$(id).textContent=labels[draftLook[key]];$(id).title=labels[draftLook[key]];const available=lookOptions(editingActor,key);$(id+'Count').textContent=(available.indexOf(draftLook[key])+1)+' / '+available.length;$(id+'Prev').disabled=$(id+'Next').disabled=available.length<2;}
    drawLook();
  }
  function cycleLook(key,delta){
    if(!draftLook)return;const labels=P.choices[key],available=lookOptions(editingActor,key),at=available.indexOf(draftLook[key]);draftLook={...draftLook,[key]:available[(Math.max(0,at)+delta+available.length)%available.length]};syncLook();
    const id='look'+key[0].toUpperCase()+key.slice(1);$('lookStatus').textContent=$(id+'Label').textContent+': '+labels[draftLook[key]];
  }
  function drawLook(){if(!draftLook||!wardrobe)return;const cv=$('lookPreview'),k=cv.getContext('2d'),s=wardrobe.frame(draftLook,previewDir);k.clearRect(0,0,cv.width,cv.height);k.imageSmoothingEnabled=true;k.drawImage(s.canvas,0,0,cv.width,cv.height);if(draftLook.pet&&petSheets[draftLook.pet-1]){const pet=petSheets[draftLook.pet-1][previewDir],w=cv.width*.24,h=w*pet.height/pet.width;k.drawImage(pet.canvas,cv.width*.03,cv.height*.89-h,w,h);}}
  function refreshMe(){thumbnail('avatarThumb');thumbnail('chatThumb');}
  const bubbleSizes=new ResizeObserver(entries=>{for(const entry of entries){const b=bubbles.find(b=>b.el===entry.target);if(b)b.measure=true;}});
  function removeBubble(b){bubbleSizes.unobserve?.(b.el);b.el.remove();}
  function messageFor(id,text){const actor=id==='self'?{name:online.user.name}:people.actors.get(id);if(!actor||typeof text!=='string'||!ready)return false;text=text.trim().slice(0,2000);if(!text)return false;const now=performance.now(),recent=bubbles.filter(b=>b.actorId===id);if(recent.length&&now-recent[recent.length-1].at<600)return false;const el=document.createElement('div');el.className='chat-bubble';const name=document.createElement('span');name.className='bubble-name';name.textContent=actor.name+': ';const group=id==='self'?online.user.group:actor.group;if(group&&window.HubGroups)name.prepend(window.HubGroups.badge(group));const content=document.createElement('span');if(window.HubEmotes)window.HubEmotes.render(content,text);else content.textContent=text;el.append(name,content);$('bubbleLayer').appendChild(el);const v=id==='self'?playerVisual():actorVisual(actor);bubbles.push({el,actorId:id,at:now,until:now+35000,anchor:{x:v.p.x,y:v.y},measure:true});bubbleSizes.observe(el);while(bubbles.length>60)removeBubble(bubbles.shift());return true;}
  function forgetActor(id){if(!people.remove(id))return false;renderPeople();savePeople();return true;}
  $('spawnOne').addEventListener('click',()=>spawnVisitors(1));$('spawnThree').addEventListener('click',()=>spawnVisitors(3));
  $('pausePeople').addEventListener('click',()=>{people.pause(!people.isPaused());$('pausePeople').textContent=people.isPaused()?'Reanudar paseos':'Pausar paseos';$('pausePeople').setAttribute('aria-pressed',String(people.isPaused()));});
  $('peopleTab').addEventListener('click',()=>showPanel('people'));$('editMe').addEventListener('click',()=>openLook('self'));
  $('lookRotate').addEventListener('click',()=>{previewDir=(previewDir+1)%4;drawLook();});
  for(const key of Object.keys(P.choices)){
    const id='look'+key[0].toUpperCase()+key.slice(1);
    for(const [suffix,delta] of [['Prev',-1],['Next',1]]){
      const button=$(id+suffix);button.addEventListener('click',()=>cycleLook(key,delta));
      button.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();cycleLook(key,e.key==='ArrowLeft'?-1:1);}});
    }
  }
  $('cancelLook').addEventListener('click',()=>$('lookDialog').close());
  $('randomLook').addEventListener('click',()=>{draftLook=Object.fromEntries(Object.keys(P.choices).map(key=>{const values=lookOptions(editingActor,key);return [key,values[Math.floor(Math.random()*values.length)]];}));syncLook();$('lookStatus').textContent='Nueva combinación al azar.';});
  $('lookForm').addEventListener('submit',e=>{e.preventDefault();if(editingActor==='self'){myAppearance=ownedLook('self',draftLook);online.profile?.({petName:$('lookPetName').value.trim()}).catch(e=>toast(e.message));updateName();refreshMe();}else{const a=people.actors.get(editingActor);if(!a)return;a.appearance=ownedLook(editingActor,draftLook);a.name=C.cleanName($('lookName').value);}savePeople();renderPeople();$('lookDialog').close();});
  $('originalLook').addEventListener('click',()=>{draftLook=P.look({});syncLook();$('lookStatus').textContent='Look inicial.';});
  $('removePerson').addEventListener('click',()=>{forgetActor(editingActor);$('lookDialog').close();});
  $('visitorChatForm').addEventListener('submit',e=>{e.preventDefault();if(messageFor(editingActor,$('visitorMessage').value)){$('visitorMessage').value='';$('lookDialog').close();}});

  // Legacy original avatar only. Customized characters use wardrobe.js and
  // the illustrated full-body contact frames, independently of this fallback.
  const AVATAR_FRAMES=['SE','SW','NW','NE'].map((direction,dir)=>({
    direction,idle:dir*4,seat:dir*4+3,walk:Array.from({length:8},(_,n)=>16+dir*8+n)
  }));
  const origin=()=>Math.max(450,C.room().h*32+66);
  const baseY=()=>200+C.maxHeight();
  const project=(x,y,z=0)=>({x:origin()+(x-y)*32,y:baseY()+(x+y)*16-z});
  const groundProject=(x,y)=>project(x,y,C.walkHeight(x,y));
  function tilePoints(x,y){const z=C.tileHeight(x,y);return [project(x,y,z),project(x+1,y,z),project(x+1,y+1,z),project(x,y+1,z)];}
  function unproject(x,y){
    const inverse=z=>{const a=(x-origin())/32,b=(y+z-baseY())/16;return {x:(a+b)/2,y:(b-a)/2};};
    if(!C.maxHeight())return inverse(0);
    // Reverse the floor paint order; a vertical riser is not a walk target.
    for(let ty=C.room().h-1;ty>=0;ty--)for(let tx=C.room().w-1;tx>=0;tx--){
      if(!C.inside(tx,ty))continue;const z=C.tileHeight(tx,ty),p=tilePoints(tx,ty),q=inverse(z);
      if(q.x>=tx&&q.x<tx+1&&q.y>=ty&&q.y<ty+1)return q;
      for(const [a,b,nx,ny] of [[1,2,tx+1,ty],[2,3,tx,ty+1]]){const drop=C.inside(nx,ny)?z-C.tileHeight(nx,ny):z+15;if(drop>0&&insidePolygon({x,y},[p[a],p[b],{x:p[b].x,y:p[b].y+drop},{x:p[a].x,y:p[a].y+drop}]))return {x:-1,y:-1};}
    }return {x:-1,y:-1};
  }
  function footprint(item){if(C.TYPES[item.type].wall){const t=C.TYPES[item.type],left=item.wallSide==='left',p=project(left?0:item.wallU,left?item.wallU:0,C.wallHeight(item.wallSide,item.wallU)),sign=left?-1:1,w=t.width/2,h=t.mountH/2;return [{x:p.x-w,y:p.y-item.wallZ-sign*w*.5-h},{x:p.x+w,y:p.y-item.wallZ+sign*w*.5-h},{x:p.x+w,y:p.y-item.wallZ+sign*w*.5+h},{x:p.x-w,y:p.y-item.wallZ-sign*w*.5+h}];}const t=C.dimensions(item);const z=C.tileHeight(item.x,item.y);return [project(item.x,item.y,z),project(item.x+t.w,item.y,z),project(item.x+t.w,item.y+t.h,z),project(item.x,item.y+t.h,z)];}
  function poly(k,points,fill,stroke){k.beginPath();k.moveTo(points[0].x,points[0].y);points.slice(1).forEach(p=>k.lineTo(p.x,p.y));k.closePath();if(fill){k.fillStyle=fill;k.fill();}if(stroke){k.strokeStyle=stroke;k.lineWidth=1;k.stroke();}}
  function line(k,x1,y1,x2,y2,color,width=1){k.strokeStyle=color;k.lineWidth=width;k.beginPath();k.moveTo(x1,y1);k.lineTo(x2,y2);k.stroke();}
  function rect(k,x,y,w,h,color){k.fillStyle=color;k.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
  function ellipse(k,x,y,rx,ry,color){k.fillStyle=color;k.beginPath();k.ellipse(x,y,rx,ry,0,0,Math.PI*2);k.fill();}
  function rand(x,y){let n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n);}
  function buildRoom(preserveMotion=false){
    floorViewKey='';
    partitionGeometryCache.clear();
    partitionStripCache=null;
    if(!preserveMotion){hoveredPartition=-1;partitionOpacity.clear();doorOpenness.clear();}
    const k=bg,w=wallThemes[state.wall],f=floorThemes[state.floor],room=C.room(),ox=origin(),worldProject=project;
    k.clearRect(0,0,sceneW,sceneH);k.imageSmoothingEnabled=true;k.imageSmoothingQuality='high';
    const center=project(room.w/2,room.h/2);
    ellipse(k,center.x,center.y+42,(room.w+room.h)*15,(room.w+room.h)*6.8,'#9f9d7918');
    for(let y=0;y<room.h;y++)for(let x=0;x<room.w;x++){
      if(!C.inside(x,y))continue;
      const height=C.tileHeight(x,y),project=(u,v)=>worldProject(u,v,height),p=[project(x,y),project(x+1,y),project(x+1,y+1),project(x,y+1)];
      for(const [edge,nx,ny] of [[[p[1],p[2]],x+1,y],[[p[2],p[3]],x,y+1]]){
        const drop=C.inside(nx,ny)?height-C.tileHeight(nx,ny):height+15;
        if(drop>0){poly(k,[...edge,...edge.slice().reverse().map(q=>({x:q.x,y:q.y+drop}))],nx>x?f.dark:f.rim,nx>x?f.dark:f.rim);line(k,edge[0].x,edge[0].y+2,edge[1].x,edge[1].y+2,f.light,2);}
      }
      const pattern=state.floorPattern||0;
      poly(k,p,pattern===2?((x+y)%2?f.light:f.base):[f.base,f.light,f.base,f.base][(x*3+y*5)%4],f.dark+'66');
      if(pattern>=7)S.floorDesign(k,pattern,f,project,x,y);
      if(pattern<2){
        const boards=pattern===0?4:2;
        for(let j=1;j<boards;j++){const l=project(x+j/boards,y),r=project(x+j/boards,y+1);line(k,l.x,l.y,r.x,r.y,f.dark+'55');}
        for(let z=0;z<3;z++){const q=project(x+.12+rand(x+z,y)*.65,y+.1+rand(y+z,x)*.6);line(k,q.x,q.y,q.x+6,q.y+3,z%2?f.light+'88':f.dark+'55');}
      }else if(pattern===3){poly(k,[project(x+.05,y+.05),project(x+.95,y+.05),project(x+.95,y+.95),project(x+.05,y+.95)],null,f.light+'cc');}
      else if(pattern===4){
        for(let j=0;j<4;j++){const a=j/4,b=(j+1)/4,along=(x+y)%2;poly(k,along?[project(x+a,y),project(x+b,y),project(x+b,y+1),project(x+a,y+1)]:[project(x,y+a),project(x+1,y+a),project(x+1,y+b),project(x,y+b)],j%2?f.base:f.light,f.dark+'88');}
      }else if(pattern===5){
        for(let a=0;a<2;a++)for(let b=0;b<2;b++)poly(k,[project(x+a/2+.025,y+b/2+.025),project(x+(a+1)/2-.025,y+b/2+.025),project(x+(a+1)/2-.025,y+(b+1)/2-.025),project(x+a/2+.025,y+(b+1)/2-.025)],(x+y+a+b)%3?f.light:f.dark,null);
      }else if(pattern===6){
        for(let j=0;j<9;j++){const u=x+.10+rand(x*13+j,y)*.8,v=y+.10+rand(y*17+j,x)*.8;poly(k,[project(u,v),project(u+.035,v+.015),project(u+.015,v+.065)],j%3?f.light:f.dark);}
      }
    }
    function wall(side,start,span,height){
      k.save();k.transform(side,.5,0,1,ox+side*start,baseY()-155+start*.5-height);rect(k,0,0,span,155,side<0?w.dark:w.light);
      if(state.wallPattern>=6)S.wallDesign(k,state.wallPattern,w,span,148);
      if(state.wallPattern===2)for(let x=0;x<span;x+=24)rect(k,x,0,12,148,'#ffffff15');
      if(state.wallPattern===3)for(let y=0;y<148;y+=18){line(k,0,y,span,y,w.trim+'66');for(let x=(y/18%2)*22;x<span;x+=44)line(k,x,y,x,Math.min(y+18,148),w.trim+'66');}
      if(state.wallPattern===4)for(let y=8;y<145;y+=24)for(let x=12;x<span;x+=24)poly(k,[{x,y:y-5},{x:x+3,y},{x,y:y+5},{x:x-3,y}],w.trim+'55');
      if(state.wallPattern===5){rect(k,0,83,span,65,w.panel);rect(k,0,82,span,2,w.trim);}
      if(!state.wallPattern){rect(k,0,112,span,43,w.panel);rect(k,0,111,span,4,w.trim);for(let x=0;x<span;x+=20){rect(k,x,116,1,31,'#ffffff25');rect(k,x+2,116,1,31,'#6b755f25');}}
      rect(k,0,148,span,7,w.trim);rect(k,0,-3,span,5,side<0?'#e7dfbf':'#f2e8cc');
      k.restore();const end=start+span;line(k,ox+side*end,baseY()-155+end/2-height,ox+side*end,baseY()+end/2-height,w.trim,2);
    }
    for(const [side,name] of [[-1,'left'],[1,'right']]){const count=C.wallSpan(name);let start=0;while(start<count){const z=C.wallHeight(name,start+.5);let end=start+1;while(end<count&&C.wallHeight(name,end+.5)===z)end++;wall(side,start*32,(end-start)*32,z);start=end;}}
    const z=C.tileHeight(0,0);line(k,ox,baseY()-155-z,ox,baseY()-2-z,w.trim,2);
    // Build background mipmaps only when the room changes, never while zooming.
    // Each frame samples the smallest level that still covers its screen pixels.
    floorLevels=[floorCache];
    while(floorLevels[0].width/sceneW>.75){
      const source=floorLevels[0],level=document.createElement('canvas');
      level.width=Math.ceil(source.width/2);level.height=Math.ceil(source.height/2);
      const q=level.getContext('2d');q.imageSmoothingQuality='high';q.drawImage(source,0,0,level.width,level.height);floorLevels.unshift(level);
    }
  }
  window.HubPlantToast=message=>toast(message);
  function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3200);}
  function save(){if(!online.canEdit())return;
    rewardsUI?.refreshInventory();
    clearTimeout(saveTimer);
    try{localStorage.setItem(KEY,JSON.stringify(state));storageAvailable=true;$('saveStatus').className='save-status saving';$('saveStatus').lastChild.textContent=' Guardado';saveTimer=setTimeout(()=>{$('saveStatus').className='save-status';$('saveStatus').lastChild.textContent=' Guardado en tu cuenta';},1600);}
    catch(e){storageAvailable=false;$('saveStatus').className='save-status warning';$('saveStatus').lastChild.textContent=' Sin guardado · solo esta sesión';}
  }
  function checkpoint(){history.push(JSON.stringify(state));if(history.length>30)history.shift();$('undoBtn').disabled=false;}
  function rehomeActors(){
    for(const a of people.actors.values()){
      a.path=[];a.moving=false;
      if(!C.blocked(state.items,Math.floor(a.x),Math.floor(a.y)))continue;
      let found=false;
      for(let y=0;y<C.room().h&&!found;y++)for(let x=0;x<C.room().w&&!found;x++){
        if(C.blocked(state.items,x,y)||Math.hypot(player.x-x-.5,player.y-y-.5)<.8||[...people.actors.values()].some(other=>other!==a&&Math.hypot(other.x-x-.5,other.y-y-.5)<.8))continue;
        a.x=x+.5;a.y=y+.5;found=true;
      }
    }
  }
  function undo(){if(!history.length)return;standUp();state=JSON.parse(history.pop());C.setLayout(state.layout);resetView();player={...player,...C.findFree(state.items,player),path:[],moving:false};rehomeActors();cancelSelection();resize();buildRoom();updateName();updateSwatches();save();$('undoBtn').disabled=!history.length;toast('Último cambio deshecho.');sfx('place');}
  function updateName(){$('profileName').textContent=online.user.name;$('roomOwner').textContent='El rincón de '+state.name;}
  function sfx(kind){
    if(!soundEnabled)return;
    try{if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();const at=audioCtx.currentTime;const tones=kind==='chat'?[520,650]:kind==='place'?[390,490]:kind==='step'?[140]:[340];tones.forEach((freq,i)=>{let o=audioCtx.createOscillator(),v=audioCtx.createGain();o.type=kind==='step'?'triangle':'sine';o.frequency.setValueAtTime(freq,at+i*.055);o.frequency.exponentialRampToValueAtTime(freq*.8,at+i*.055+.09);v.gain.setValueAtTime(.0001,at+i*.055);v.gain.exponentialRampToValueAtTime(kind==='step'?.012:.04,at+i*.055+.01);v.gain.exponentialRampToValueAtTime(.0001,at+i*.055+.12);o.connect(v);v.connect(audioCtx.destination);o.start(at+i*.055);o.stop(at+i*.055+.13);});}catch(e){soundEnabled=false;updateSound();}
  }
  function updateSound(){$('soundBtn').setAttribute('aria-pressed',String(soundEnabled));$('soundBtn').setAttribute('aria-label',soundEnabled?'Silenciar sonidos':'Activar sonidos');$('soundBtn').title=soundEnabled?'Silenciar sonidos':'Activar sonidos';$('soundBtn').querySelector('use').setAttribute('href',soundEnabled?'#i-sound':'#i-muted');}
  function modeHint(){
    $('modeHint').textContent=mode==='walk'?(seatedId?'Estás sentado. Hacé clic en el piso para levantarte.':'Clic: caminar, sentarte, encender luces o abrir cortinas.'):(movingId!==null||pendingType!==null?(C.TYPES[pendingType??state.items.find(i=>i.id===movingId)?.type]?.wall?'Apuntá a una pared y elegí la altura. Esc cancela.':'Elegí dónde colocarlo. Esc cancela sin cambiar nada.'):'Seleccioná un mueble y apretá Mover.');
  }
  function standUp(){seatedId=null;pendingSeat=null;seatedSlot=0;pendingSeatSlot=0;modeHint();}
  function setMode(next){if(next==='decorate'&&!online.canEdit()){toast('Podés decorar tu propia sala.');return;}if((seatedId||pendingSeat||pendingWalk)&&next==='decorate'){const seq=++walkSequence;if(online.send('stand',{seq}))pendingWalk=seq;}mode=next;standUp();cancelSelection(false);if(mode==='decorate'){player.path=[];player.moving=false;snapPlayer();}canvas.classList.toggle('decorating',mode==='decorate');$('walkBtn').classList.toggle('active',mode==='walk');$('walkBtn').setAttribute('aria-pressed',String(mode==='walk'));modeHint();}
  function snapPlayer(){const p=C.findFree(state.items,{x:Math.floor(player.x)+.5,y:Math.floor(player.y)+.5});player.x=p.x;player.y=p.y;}
  function cancelSelection(walk=true){clearTimeout(objectClickTimer);objectClick=null;if(walk){mode='walk';canvas.classList.remove('decorating');$('walkBtn').classList.add('active');$('walkBtn').setAttribute('aria-pressed','true');}selectedId=null;pendingType=null;movingId=null;ghost=null;pointer=null;canvas.classList.remove('dragging','placing');$('contextBar').hidden=true;document.querySelectorAll('.item-card').forEach(b=>b.classList.remove('selected'));modeHint();}
  function selectItem(id){pendingType=null;movingId=null;ghost=null;canvas.classList.remove('placing');selectedId=id;const item=state.items.find(i=>i.id===id);if(!item)return cancelSelection();if(!C.TYPES[item.type].wall)loadRotation(item.type).catch(()=>{});$('selectedName').textContent=C.TYPES[item.type].name;$('posterImageBtn').hidden=!C.TYPES[item.type].poster;updateInteraction(item);$('finishPicker').hidden=!C.TYPES[item.type].finishes;$('finishName').textContent=item.finish===1?'Nogal y negro':'Original';$('contextBar').hidden=false;$('moveBtn').disabled=false;const onWall=!!C.TYPES[item.type].wall;$('wallUpBtn').hidden=$('wallDownBtn').hidden=!onWall;$('flipBtn').title=onWall?'Cambiar de pared (R)':'Girar (R)';document.querySelectorAll('.item-card').forEach(b=>b.classList.remove('selected'));modeHint();}
  function cycleFinish(){const item=state.items.find(i=>i.id===selectedId);if(!item||!C.TYPES[item.type].finishes||movingId!==null)return;checkpoint();if(item.finish===1)delete item.finish;else item.finish=1;selectItem(item.id);save();}
  $('finishPrev').addEventListener('click',cycleFinish);$('finishNext').addEventListener('click',cycleFinish);
  function beginMove(){if(selectedId===null)return;movingId=selectedId;ghost=null;canvas.classList.add('placing');$('moveBtn').disabled=true;$('interactBtn').disabled=true;modeHint();}
  function canInteract(item){const t=C.TYPES[item.type];return t.plantation?online.canEdit():!!(t.interaction||window.HubMedia?.supports(item.type));}
  function interactionLabel(item){if(C.TYPES[item.type].interaction==='basket')return 'Jugar al básquet';if(C.TYPES[item.type].interaction==='dj')return 'Jugar al DJ';if(C.TYPES[item.type].interaction==='coffee')return 'Preparar café';if(C.TYPES[item.type].plantation)return online.canEdit()?'Cosechar':'';if(C.TYPES[item.type].interaction==='exchange')return 'Cambiar repetido';if(C.TYPES[item.type].interaction==='roulette')return 'Abrir ruleta';if(window.HubMedia?.supports(item.type))return 'Abrir música';return C.TYPES[item.type].interaction==='curtain'?(item.closed?'Abrir cortinas':'Cerrar cortinas'):(item.on===false?'Encender':'Apagar');}
  function updateInteraction(item){$('interactBtn').disabled=false;$('interactBtn').hidden=!canInteract(item);$('interactBtn').textContent=interactionLabel(item);}
  function interact(item){
    if(item&&C.TYPES[item.type].interaction==='basket'){if(movingId===null&&pendingType===null)window.HubBasket?.open(item);return;}
    if(item&&C.TYPES[item.type].interaction==='dj'){if(movingId===null&&pendingType===null)window.HubDJ?.open(item);return;}
    if(item&&C.TYPES[item.type].interaction==='coffee'){if(movingId===null&&pendingType===null)window.HubCoffee?.open(item);return;}
    if(item&&C.TYPES[item.type].plantation){if(movingId===null&&pendingType===null)window.HubPlants?.harvest(item);return;}
    if(item&&C.TYPES[item.type].interaction==='exchange'){if(movingId===null&&pendingType===null)window.HubExchange?.open(item);return;}
    if(item&&C.TYPES[item.type].interaction==='roulette'){if(movingId===null&&pendingType===null)window.HubRoulette?.open(item);return;}
    if(item&&window.HubMedia?.supports(item.type)){window.HubMedia.open(item);return;}
    if(!item||!C.TYPES[item.type].interaction||movingId!==null||pendingType!==null)return;
    if(online.send('interact',{itemId:item.id}))sfx('click');
  }
  function placedCount(type){return [...state.items,...(state.unplacedItems||[])].filter(i=>i.type===type).length;}
  function availableCount(type){return Math.max(0,(rewardsUI?.count('self','object:'+type)||0)-placedCount(type));}
  function startPlacement(type){if(!online.canEdit()){toast('Volvé a tu sala para colocar muebles.');return false;}if(!ready||availableCount(type)<1){toast('Ya colocaste todas tus unidades de este objeto.');return false;}if(state.items.length+(state.unplacedItems?.length||0)>=C.MAX_ITEMS){toast('Por ahora entran hasta 128 objetos. Guardá alguno para hacer lugar.');return;}if(mode!=='decorate')setMode('decorate');cancelSelection(false);pendingType=type;ghost=null;canvas.classList.add('placing');modeHint();document.querySelectorAll('.item-card').forEach(b=>b.classList.toggle('selected',+b.dataset.type===type));sfx('click');window.HubPanels?.close(false);return true;}
  function placementCandidate(tile,base){const t=C.dimensions(base);return {...base,x:Math.round((tile.x-t.w/2)*2)/2,y:Math.round((tile.y-t.h/2)*2)/2};}
  function tryPlace(item,isNew){if(C.TYPES[item.type].plantation&&state.items.filter(i=>i.id!==item.id&&C.TYPES[i.type].plantation).length>=3){toast('Podés tener hasta tres plantas produciendo. Guardá una antes de colocar otra.');return false;}if(isNew&&availableCount(item.type)<1){toast('No quedan unidades disponibles.');cancelSelection();return false;}if(!item.parentId&&!C.TYPES[item.type].flat&&[...people.actors.values()].some(a=>C.covers(item,Math.floor(a.x),Math.floor(a.y)))){toast('Hay un visitante ahí. Elegí otro lugar o esperá a que pase.');return false;}if(!C.canPlace(state.items,item,player)){toast(C.TYPES[item.type].wall?'Buscá un espacio libre dentro de la pared. Podés cambiar la altura.':item.parentId?'Ese lugar está ocupado. Corré el objeto un poco.':'Ahí no entra. Probá un espacio libre del piso.');return false;}const old=state.items.find(i=>i.id===item.id);if(old&&old.x===item.x&&old.y===item.y&&old.parentId===item.parentId&&old.slot===item.slot&&old.surfaceX===item.surfaceX&&old.surfaceY===item.surfaceY&&old.wallSide===item.wallSide&&old.wallU===item.wallU&&old.wallZ===item.wallZ){selectItem(item.id);return true;}checkpoint();C.moveItem(state.items,item);pendingType=null;ghost=null;selectItem(item.id);save();sfx('place');toast(item.parentId?'Listo, quedó apoyado.':'Listo. El mueble quedó en su lugar.');return true;}
  function removeSelected(){const item=state.items.find(i=>i.id===selectedId);if(!item)return;const children=state.items.filter(i=>i.parentId===item.id).length;checkpoint();state.items=C.removeItem(state.items,selectedId);cancelSelection();save();sfx('place');toast(children?'Guardamos el mueble y sus objetos. Siguen disponibles en el catálogo.':'Mueble guardado. Podés colocarlo de nuevo desde el inventario.');}
  async function flipSelected(){
    const item=state.items.find(i=>i.id===selectedId);if(!item||movingId!==null)return;
    const rotated=C.TYPES[item.type].wall?{...item,wallSide:item.wallSide==='left'?'right':'left'}:{...item,rotation:(C.rotation(item)+1)%4,flip:!((C.rotation(item)+1)%2===0)};
    if(!C.canPlace(state.items,rotated,player)||(!item.parentId&&!C.TYPES[item.type].flat&&[...people.actors.values()].some(a=>C.covers(rotated,Math.floor(a.x),Math.floor(a.y))))){toast('No hay espacio para girarlo. Movelo a un lugar libre.');return;}
    if(!C.TYPES[item.type].wall){try{await loadRotation(item.type);}catch{toast('No se pudo cargar esa vista. Probá de nuevo.');return;}if(state.items.find(i=>i.id===item.id)!==item||!online.canEdit())return;}
    if(!C.canPlace(state.items,rotated,player)||(!item.parentId&&!C.TYPES[item.type].flat&&[...people.actors.values()].some(a=>C.covers(rotated,Math.floor(a.x),Math.floor(a.y))))){toast('No hay espacio para girarlo. Movelo a un lugar libre.');return;}checkpoint();C.moveItem(state.items,rotated);save();sfx('place');
  }
  function raiseWall(delta){const item=state.items.find(i=>i.id===selectedId);if(!item||!C.TYPES[item.type].wall||movingId!==null)return;tryPlace({...item,wallZ:item.wallZ+delta},false);}
  function toWorld(event){const b=canvas.getBoundingClientRect();return {x:(event.clientX-b.left-view.x)/view.s,y:(event.clientY-b.top-view.y)/view.s};}
  function hitAt(p){for(let j=drawBounds.length-1;j>=0;j--){const b=drawBounds[j];if(p.x<b.x||p.y<b.y||p.x>=b.x+b.w||p.y>=b.y+b.h)continue;const sx=Math.floor((p.x-b.x)/b.w*b.sprite.width),sy=Math.floor((p.y-b.y)/b.h*b.sprite.height),px=b.flip?b.sprite.width-1-sx:sx;if(b.sprite.alpha[(sy*b.sprite.width+px)]>48)return b.item;}return null;}
  let walkSequence=0,pendingWalk=0;
  function occupiedPeople(){const cells=new Set();for(const a of people.actors.values())for(const p of [a,...a.path])cells.add(Math.floor(p.x)+','+Math.floor(p.y));return cells;}
  function movePlayer(tile){const path=C.route(state.items,player,tile,occupiedPeople());if(path===null){toast('No hay paso por ahí. Elegí un lugar libre.');return;}const seq=++walkSequence;if(!online.send('walk',{x:tile.x,y:tile.y,seq}))return;pendingWalk=seq;standUp();player.path=path;arrivalMarker={x:Math.floor(tile.x),y:Math.floor(tile.y),at:performance.now()};}
  // Keep progress already predicted along an approved route instead of rewinding on its echo.
  function confirmedRemainder(from,path,point){
    let previous=from,best=Math.hypot(point.x-from.x,point.y-from.y),next=0;
    for(let i=0;i<path.length;i++){const target=path[i],dx=target.x-previous.x,dy=target.y-previous.y,length=dx*dx+dy*dy;
      const t=length?Math.max(0,Math.min(1,((point.x-previous.x)*dx+(point.y-previous.y)*dy)/length)):1;
      const distance=Math.hypot(point.x-previous.x-dx*t,point.y-previous.y-dy*t);
      if(distance<=best+1e-8){best=distance;next=t>=.999999?i+1:i;}previous=target;
    }
    return best<=.08?path.slice(next):null;
  }
  function sitOn(item,world){
    const b=itemPosition(item),u=world?(world.x-b.x)/b.w:.5,v=world?(world.y-b.y)/b.h:.5;
    const target=world||{x:b.x+b.w/2,y:b.y+b.h/2},places=C.seatPlaces(item),slot=places.map((place,index)=>({index,p:seatPoint(item,place,b)})).sort((a,c)=>Math.hypot(a.p.x-target.x,a.p.y-target.y)-Math.hypot(c.p.x-target.x,c.p.y-target.y))[0].index,seq=++walkSequence;
    if(online.send('sit',{itemId:item.id,slot,seq}))pendingWalk=seq;
  }
  function finishSitting(){if(!pendingSeat)return;seatedId=pendingSeat;seatedSlot=pendingSeatSlot;pendingSeat=null;player.moving=false;modeHint();sfx('place');}
  function surfacePoint(item,spot){
    const b=itemPosition(item),t=C.TYPES[item.type];if(typeof spot==='number')spot={slot:spot};
    if(spot.surfaceX!==undefined){const c=b.sprite.surfaceCenter||t.surfaceCenter,offset=C.surfaceOffset(item,spot);return {x:b.x+b.w*(b.flip?1-c.u:c.u)+offset.x,y:b.y+b.h*c.v+offset.y};}
    const p=C.surfaceUV(item,spot),a=t.surfaceArea;if(!p)return {x:b.x+b.w/2,y:b.y};
    if(C.rotation(item)<2)return {x:b.x+b.w*(b.flip?1-p.u:p.u),y:b.y+b.h*p.v};
    const u=2*a.c.u-p.u;return {x:b.x+b.w*(C.rotation(item)===3?1-u:u),y:b.y+b.h*(2*a.c.v-p.v)};
  }
  function drawSurfaceGrid(parent){
    const t=C.TYPES[parent.type],nx=t.w*4,ny=t.h*4,point=(x,y)=>surfacePoint(parent,{surfaceX:x,surfaceY:y});
    g.save();g.lineWidth=.5;g.strokeStyle='#ffffff55';
    for(let x=1;x<nx;x++){g.beginPath();const a=point(x,.5),b=point(x,ny-.5);g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();}
    for(let y=1;y<ny;y++){g.beginPath();const a=point(.5,y),b=point(nx-.5,y);g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();}
    if(ghost?.parentId===parent.id){const x=ghost.surfaceX,y=ghost.surfaceY;if(x!==undefined)poly(g,[point(x-.5,y-.5),point(x+.5,y-.5),point(x+.5,y+.5),point(x-.5,y+.5)],C.canPlace(state.items,ghost,player)?'#ffffff44':'#e45e5e66','#ffffffaa');}
    g.restore();
  }
  function candidateAt(world,base){
    const tile=unproject(world.x,world.y),clean={...base};delete clean.parentId;delete clean.slot;delete clean.surfaceX;delete clean.surfaceY;
    if(C.TYPES[base.type].wall){const u=Math.abs(world.x-origin())/32;return {...clean,x:0,y:0,flip:false,wallSide:world.x<origin()?'left':'right',wallU:Math.round(u*4)/4,wallZ:Math.round((baseY()+u*16-C.wallHeight(world.x<origin()?'left':'right',u)-world.y)/4)*4};}
    if(C.TYPES[base.type].tabletop){
      const targets=drawBounds.filter(b=>b.item.id!==base.id&&!b.item.parentId&&C.TYPES[b.item.type].surface).reverse();
      for(const b of targets){
        const points=C.surfaceGrid(b.item).map(spot=>({...surfacePoint(b.item,spot),...spot}));
        if(world.x<b.x-8||world.x>b.x+b.w+8||world.y<b.y-12||world.y>b.y+b.h*.7)continue;
        points.sort((a,b)=>Math.hypot(a.x-world.x,a.y-world.y)-Math.hypot(b.x-world.x,b.y-world.y));
        if(!points.length||Math.hypot(points[0].x-world.x,points[0].y-world.y)>14)continue;
        return {...clean,x:b.item.x,y:b.item.y,parentId:b.item.id,surfaceX:points[0].surfaceX,surfaceY:points[0].surfaceY};
      }
    }
    return placementCandidate(tile,clean);
  }
  function tileInRoom(tile){return C.inside(tile.x,tile.y);}
  let objectClick=null,objectClickTimer=null;
  function walkClick(world,tile,hit){const door=doorAtPointer(world);if(door){movePlayer(doorTarget(door));return;}const person=characterAt(world,hit);if(person){if(person!=='self')openLook(person);return;}if(hit&&canInteract(hit)){interact(hit);return;}if(hit&&C.TYPES[hit.type].seat)sitOn(hit,world);else if(tileInRoom(tile))movePlayer(tile);}
  $('posterImageBtn').onclick=()=>{const item=state.items.find(i=>i.id===selectedId);if(item&&C.TYPES[item.type].poster&&online.canEdit())window.HubPosters.open(item,slot=>{if(!online.canEdit()||!state.items.includes(item))return;checkpoint();item.posterSlot=slot;save();});};
  function positionMusicLabel(){const label=$('hubNowPlaying'),media=window.HubMedia?.nowPlaying(),item=media?.playing&&state.items.find(i=>i.id===media.itemId);label.hidden=!item;if(!item)return;const b=itemPosition(item);const text='♫ '+(media.title||'YouTube');if(label.textContent!==text){label.textContent=text;label.title=media.title||'YouTube';}label.style.left=Math.max(90,Math.min(view.w-90,view.x+(b.x+b.w/2)*view.s))+'px';label.style.top=Math.max(12,view.y+b.y*view.s-12)+'px';}
  function positionObjectMenu(){if(selectedId===null||$('contextBar').hidden)return;const item=state.items.find(i=>i.id===selectedId);if(!item)return cancelSelection();const b=itemPosition(item),bar=$('contextBar'),w=bar.offsetWidth||320,h=bar.offsetHeight||50;const x=view.x+(b.x+b.w/2)*view.s,y=view.y+(b.y+b.h)*view.s+10;bar.style.left=Math.max(8,Math.min(view.w-w-8,x-w/2))+'px';bar.style.top=Math.max(8,Math.min(view.h-h-8,y))+'px';}
  function endCameraDrag(e){
    if(!cameraDrag||e?.pointerId!==undefined&&e.pointerId!==cameraDrag.id)return;
    const id=cameraDrag.id;cameraDrag=null;canvas.style.cursor='';
    if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);
  }
  canvas.addEventListener('pointerdown',e=>{
    if(!ready)return;
    if(e.button===1){
      e.preventDefault();clearTimeout(objectClickTimer);objectClick=null;
      targetZoom=zoom;zoomAnchor=null;cameraDrag={id:e.pointerId,x:e.clientX,y:e.clientY,panX:pan.x,panY:pan.y};
      hoverTile=null;hoveredPartition=-1;petPointer=null;ghost=null;
      canvas.setPointerCapture(e.pointerId);canvas.style.cursor='grabbing';canvas.title='';updateView();return;
    }
    if(e.button!==0||cameraDrag)return;e.preventDefault();canvas.focus({preventScroll:true});const world=toWorld(e),tile=unproject(world.x,world.y),hit=hitAt(world);
    if(mode==='walk'){
      const person=characterAt(world,hit);
      if(hit&&online.canEdit()&&!person&&!doorAtPointer(world)){
        const now=performance.now();if(objectClick?.id===hit.id&&now-objectClick.at<420){clearTimeout(objectClickTimer);objectClick=null;setMode('decorate');selectItem(hit.id);positionObjectMenu();return;}
        clearTimeout(objectClickTimer);objectClick={id:hit.id,at:now};objectClickTimer=setTimeout(()=>{objectClick=null;if(mode==='walk'&&state.items.includes(hit))walkClick(world,tile,hit);},420);return;
      }
      clearTimeout(objectClickTimer);objectClick=null;walkClick(world,tile,hit);return;
    }
    if(!online.canEdit()){cancelSelection();return;}
    if(pendingType!==null){const id=Math.max(0,...state.items.map(i=>i.id),...(state.unplacedItems||[]).map(i=>i.id))+1;tryPlace(candidateAt(world,{id,type:pendingType,flip:false}),true);return;}
    if(movingId!==null){tryPlace(candidateAt(world,state.items.find(i=>i.id===movingId)),false);return;}
    if(hit)selectItem(hit.id);else {cancelSelection();if(tileInRoom(tile))movePlayer(tile);}
  });
  canvas.addEventListener('pointermove',e=>{
    if(cameraDrag){if(e.pointerId!==cameraDrag.id)return;if(!(e.buttons&4)){endCameraDrag(e);return;}e.preventDefault();pan.x=cameraDrag.panX+e.clientX-cameraDrag.x;pan.y=cameraDrag.panY+e.clientY-cameraDrag.y;updateView();return;}
    if(!ready)return;const world=toWorld(e),tile=unproject(world.x,world.y);hoverTile=tileInRoom(tile)?{x:Math.floor(tile.x),y:Math.floor(tile.y)}:null;
    hoveredPartition=partitionAtPointer(world);petPointer=world;
    const hit=mode==='walk'?hitAt(world):null,door=mode==='walk'&&doorAtPointer(world),usable=door||hit&&canInteract(hit);canvas.title=door?'Pasar por la puerta':usable?interactionLabel(hit):hit&&C.TYPES[hit.type].seat?'Sentarse':'';canvas.style.cursor=usable||hit&&C.TYPES[hit.type].seat?'pointer':'';
    if(mode!=='decorate')return;
    if(pendingType!==null)ghost=candidateAt(world,{id:-1,type:pendingType,flip:false});
    else if(movingId!==null)ghost=candidateAt(world,state.items.find(i=>i.id===movingId));
  });
  canvas.addEventListener('pointerup',e=>{if(cameraDrag){if(e.button===1)endCameraDrag(e);return;}if(!pointer||pointer.id!==e.pointerId)return;const didDrag=pointer.dragging;if(didDrag&&ghost)tryPlace(ghost,false);if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);pointer=null;ghost=null;canvas.classList.remove('dragging');});
  canvas.addEventListener('pointercancel',e=>{endCameraDrag(e);pointer=null;ghost=null;canvas.classList.remove('dragging');});
  canvas.addEventListener('lostpointercapture',endCameraDrag);
  canvas.addEventListener('auxclick',e=>{if(e.button===1)e.preventDefault();});
  window.addEventListener('blur',()=>endCameraDrag());
  canvas.addEventListener('pointerleave',()=>{hoverTile=null;hoveredPartition=-1;petPointer=null;if(!pointer)ghost=null;});

  let spriteRasterCache=new WeakMap(),rewardsUI=null;
  function spriteAt(sprite,k,x,y,width,flip=false,opacity=1){
    const h=width*sprite.height/sprite.width;let art=sprite.canvas;
    if(k===g){
      let entries=spriteRasterCache.get(sprite);if(!entries){entries=new Map();spriteRasterCache.set(sprite,entries);}
      // Prepare fixed mip levels together, once. Changing camera scale only
      // selects a level: no mass allocations or high-quality resizes mid-zoom.
      const levels=[.5,1,renderDensity].filter((d,i,a)=>d<=renderDensity&&a.indexOf(d)===i).sort((a,b)=>a-b);
      if(!entries.has(width)){
        const rasters=levels.map(density=>{const cv=document.createElement('canvas');cv.width=Math.max(1,Math.ceil(width*density));cv.height=Math.max(1,Math.ceil(h*density));const q=cv.getContext('2d');q.imageSmoothingQuality='high';q.drawImage(art,0,0,cv.width,cv.height);return cv;});
        entries.set(width,rasters);if(entries.size>4)entries.delete(entries.keys().next().value);
      }
      const required=view.s*Math.min(window.devicePixelRatio||1,3),level=levels.findIndex(d=>d>=required);
      art=entries.get(width)[level<0?levels.length-1:level];
    }
    k.save();k.globalAlpha=opacity;k.imageSmoothingEnabled=true;k.imageSmoothingQuality=k===g?'low':'high';if(flip){k.translate(x+width,y);k.scale(-1,1);k.drawImage(art,0,0,width,h);}else k.drawImage(art,x,y,width,h);k.restore();return h;
  }
  function furniturePerspective(art,type,rear=false){
    const t=C.TYPES[type],axes=t.artAxes;if(!axes||rear)return art;
    const result=S.volume(document,art,...axes),c=t.surfaceCenter;
    if(c){const a=1/(axes[0]-axes[1]),b=.5-a*axes[0];result.surfaceCenter={u:c.u,v:(a*c.v*art.height+b*c.u*art.width)/result.height};}
    return result;
  }
  function loadRotation(type){if(C.TYPES[type].wall||C.TYPES[type].flat||symmetricRotation.has(type))return Promise.resolve();if(rotationLoads.has(type))return rotationLoads.get(type);const load=loadImage(ASSETS['rotation'+type]||'assets/rotations/'+type+'.webp').then(img=>{const frames=extractAtlas(img,false,C.TYPES[type].finishes||C.TYPES[type].rotationLight?2:1,1).map(art=>C.TYPES[type].rearAxes?S.volume(document,art,...C.TYPES[type].rearAxes):art);rotationArt.set(type,frames);return frames;}).catch(e=>{setTimeout(()=>rotationLoads.delete(type),10000);throw e;});rotationLoads.set(type,load);return load;}
  function itemPosition(item){
    const t=C.TYPES[item.type],rot=C.rotation(item),rear=rot>=2&&!t.wall&&!t.flat&&!symmetricRotation.has(item.type),views=rotationArt.get(item.type);if(rear&&!views)loadRotation(item.type).catch(()=>{});const sprite=t.plantation?plantArt.get(item.type)[window.HubPlants?.stage(item)||0]:t.poster?window.HubPosters.sprite(item,t):rear&&views?views[t.rotationLight?(item.on===false?0:1):item.finish===1&&t.finishes?1:0]:lightStates.has(item.type)?lightStates.get(item.type)[item.on===false?0:1]:windowStates.has(item.type)?windowStates.get(item.type)[item.closed?1:0]:item.finish===1&&darkFurniture.has(item.type)?darkFurniture.get(item.type):furniture[t.sprite],w=t.width,h=w*sprite.height/sprite.width,flip=rear&&views?(rot===3)!==!!t.rearArtFlip:!!item.flip!==!!t.artFlip;
    if(t.wall){const left=item.wallSide==='left',p=project(left?0:item.wallU,left?item.wallU:0,C.wallHeight(item.wallSide,item.wallU));return {x:p.x-w/2,y:p.y-item.wallZ-h/2,w,h,sprite,item,flip:left,ground:p,baseWidth:0,anchorX:w/2,anchorY:h/2};}
    const d=C.dimensions(item);let ground=project(item.x+d.w/2,item.y+d.h/2,C.tileHeight(item.x,item.y));
    if(item.parentId){const parent=state.items.find(i=>i.id===item.parentId);if(parent)ground=surfacePoint(parent,item);}
    // The center of a 2:1 ground footprint is a quarter of its width above its
    // frontmost contact. Flat sprites instead anchor at their geometric center.
    const baseWidth=w*t.base.span,anchorY=t.flat?h*.5:h-baseWidth*.25,anchorX=w*(flip?1-t.base.u:t.base.u);
    return {x:ground.x-anchorX,y:ground.y-anchorY,w,h,sprite,item,flip,ground,baseWidth,anchorX,anchorY};
  }
  function drawItem(item,opacity=1,record=true){const t=C.TYPES[item.type],b=itemPosition(item);if(!t.wall&&!t.flat&&!item.parentId){
    if(t.base.shape==='oval')ellipse(g,b.ground.x,b.ground.y,b.baseWidth*.5,b.baseWidth*.25,'#51482d1b');
    else{const d=C.dimensions(item),scale=b.baseWidth/(32*(d.w+d.h)),cx=item.x+d.w/2,cy=item.y+d.h/2,dx=d.w*scale/2,dy=d.h*scale/2;const z=C.tileHeight(item.x,item.y);poly(g,[project(cx-dx,cy-dy,z),project(cx+dx,cy-dy,z),project(cx+dx,cy+dy,z),project(cx-dx,cy+dy,z)],'#51482d14');}
  }
    const light=t.interaction==='light';
    if(light&&item.on!==false){const cx=b.x+b.w*.5,cy=b.y+b.h*(item.type===21?.60:item.type===57||item.type===87?.50:.18),r=b.w*(item.type===87?.55:item.type===57?.85:item.type===21?1.1:1.35);g.save();g.globalAlpha=opacity*(item.type===57?S.pulse(effectsTime,item.id):1);const glow=g.createRadialGradient(cx,cy,0,cx,cy,r);const color=item.type===57?'#c988ff':item.type===53||item.type===87?'#e2eeff':'#ffcf6a';glow.addColorStop(0,color+'88');glow.addColorStop(1,color+'00');g.fillStyle=glow;g.fillRect(cx-r,cy-r,r*2,r*2);g.restore();}
    if(item.type===57&&item.on!==false){spriteAt(lightStates.get(57)[0],g,b.x,b.y,b.w,b.flip,opacity);spriteAt(b.sprite,g,b.x,b.y,b.w,b.flip,opacity*S.pulse(effectsTime,item.id));}else spriteAt(b.sprite,g,b.x,b.y,b.w,b.flip,opacity);
    if(C.rotation(item)<2||t.wall||item.type===32)drawDetails(g,b,opacity);if(record)drawBounds.push(b);
  }
  function drawDetails(k,b,opacity=1){
    S.screenEffects(k,b,effectsTime,opacity);
    if(b.item.type!==29&&b.item.type!==32)return;
    k.save();k.globalAlpha=opacity;k.translate(b.x+(b.flip?b.w:0),b.y);if(b.flip)k.scale(-1,1);
    if(b.item.type===32&&fishSprite){
      // Fish stay in the front glass plane, with the same world projection as
      // the illustration. The background contains no baked-in fish.
      const left=.035*b.w,right=.73*b.w,top=.245*b.h,depth=.30*b.h,glassY=x=>top+(x-left)*.5;
      k.beginPath();k.moveTo(left,glassY(left));k.lineTo(right,glassY(right));k.lineTo(right,glassY(right)+depth);k.lineTo(left,glassY(left)+depth);k.closePath();k.clip();
      for(let j=0;j<2;j++){
        const phase=effectsTime*.00038+j*2.6+b.item.id*.2,u=.39+Math.sin(phase)*.22,v=(glassY(u*b.w)+depth*(.45+j*.2+Math.sin(phase*1.7)*.035))/b.h;
        const fw=b.w*(j?.15:.18),fh=fw*fishSprite.height/fishSprite.width;
        spriteAt(fishSprite,k,u*b.w-fw/2,v*b.h-fh/2,fw,Math.cos(phase)<0);
      }
      for(let j=0;j<3;j++){const travel=(effectsTime*.00013+j/3)%1,u=.12+j*.022,v=(glassY(u*b.w)+depth*(1-travel))/b.h;ellipse(k,u*b.w,v*b.h,b.w*.011,b.w*.014,'#d8ffff70');}
    }else if(b.item.type===29){
      const date=new Date(animationEnabled?Date.now():clockStill),seconds=date.getSeconds()+date.getMilliseconds()/1000,minutes=date.getMinutes()+seconds/60,hours=date.getHours()%12+minutes/60;
      // Coordinates on the clock face, not in an axis-aligned screen circle.
      const fh=b.h-b.w*.5;k.transform(1,.5,0,1,0,0);k.translate(b.w*.5,fh*.5);k.scale(b.w*.37,fh*.37);
      const hand=(value,period,length,color,width)=>{const a=value/period*Math.PI*2;line(k,0,0,(b.flip?-1:1)*Math.sin(a)*length,-Math.cos(a)*length,color,width);};
      k.lineCap='round';hand(hours,12,.54,'#5c3d23',.105);hand(minutes,60,.80,'#5c3d23',.065);hand(seconds,60,.86,'#bb7354',.025);ellipse(k,0,0,.085,.065,'#a8793e');
    }
    k.restore();
  }
  function playerVisual(){
    const seat=state.items.find(i=>i.id===seatedId),t=seat&&C.TYPES[seat.type];
    const b=seat&&itemPosition(seat),place=seat&&C.seatPlaces(seat)[seatedSlot],dir=seat?seatDirection(seat,place):player.dir;
    const poses=AVATAR_FRAMES[dir],frame=seat?poses.seat:player.moving?poses.walk[Math.floor(player.step)%poses.walk.length]:poses.idle,sprite=myAppearance?wardrobe.frame(myAppearance,dir,seat?'seat':player.moving?Math.floor(player.step)%8:null):avatar[frame];
      const scale=sprite.worldScale??1,w=sprite.width*scale,h=sprite.height*scale;
    const p=seat?seatPoint(seat,place,b):groundProject(player.x,player.y);
    const bob=0; // The contact and passing poses supply the movement; no added bouncing.
      return {sprite,w,h,x:p.x-(seat?(sprite.seatX??.5)*w:(sprite.anchorX??w/2)),y:seat?p.y-(sprite.seatY??.72)*h:p.y-(sprite.anchorY??h)+bob,seat,p};
  }
  function drawPlayer(now){
    const v=playerVisual();if(!v.seat)ellipse(g,v.p.x,v.p.y,11,4.5,'#51482d36');spriteAt(v.sprite,g,v.x,v.y,v.w,false);actorBounds.push({...v,id:'self',depth:player.x+player.y});
  }
  function drawGrid(){for(let y=0;y<C.room().h;y++)for(let x=0;x<C.room().w;x++)if(C.inside(x,y)&&!C.partitionAt(x,y))poly(g,tilePoints(x,y),null,C.stairAccess(x,y)?'#ffffffbb':'#ffffff66');}
  const PARTITION_HEIGHT=155,partitionOpacity=new Map(),partitionGeometryCache=new Map();let hoveredPartition=-1,revealPartitions=false,partitionStripCache=null;
  $('revealWalls').addEventListener('click',()=>{revealPartitions=!revealPartitions;$('revealWalls').setAttribute('aria-pressed',String(revealPartitions));$('revealWalls').textContent=revealPartitions?'Mostrar paredes':'Ver detrás';});
  function partitionGeometry(cell){
    const key=cell.x+":"+cell.y;if(partitionGeometryCache.has(key))return partitionGeometryCache.get(key);
    const x=cell.x,y=cell.y,h=PARTITION_HEIGHT;
    const block=C.room().partitions.find(b=>x>=b.x&&y>=b.y&&x<b.x+b.w&&y<b.y+b.h),vertical=block.h>1;
    // The outer face sits exactly on the platform edge; collision cells stay unchanged.
    const edge=C.tileHeight(x,y)>C.tileHeight(x+(vertical?1:0),y+(vertical?0:1)),lo=edge?.76:.38,hi=edge?1:.62;
    const x0=x+(vertical?lo:0),x1=x+(vertical?hi:1),y0=y+(vertical?0:lo),y1=y+(vertical?1:hi);
    const z=C.tileHeight(x,y),p=[project(x0,y0,z),project(x1,y0,z),project(x1,y1,z),project(x0,y1,z)],top=p.map(v=>({x:v.x,y:v.y-h}));
    const result={p,top,index:C.room().partitions.indexOf(block),depth:(x0+x1+y0+y1)/2,outer:{x:x1,y:y1}};partitionGeometryCache.set(key,result);return result;
  }
  function insidePolygon(point,vertices){let inside=false;for(let i=0,j=vertices.length-1;i<vertices.length;j=i++){const a=vertices[i],b=vertices[j];if((a.y>point.y)!==(b.y>point.y)&&point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x)inside=!inside;}return inside;}
  function partitionAtPointer(point){
    const cells=C.partitionCells().sort((a,b)=>b.x+b.y-a.x-a.y);
    for(const cell of cells){const {p,top,index}=partitionGeometry(cell);if([top,[p[1],p[2],top[2],top[1]],[p[2],p[3],top[3],top[2]]].some(face=>insidePolygon(point,face)))return index;}
    return -1;
  }
  function drawPartition(cell){
    drawPartitionStrip(cell.x+':'+cell.y);
  }
  function partitionStrips(){
    if(partitionStripCache)return partitionStripCache;
    const groups=new Map(),room=C.room(),w=wallThemes[state.wall],density=renderDensity;
    function add(axis,fixed,start,end,z,edge,index,door){
      const key=[axis,fixed,z,edge].join(':'),a=groups.get(key)||[];a.push({axis,fixed,start,end,z,edge,index,door});groups.set(key,a);
    }
    (room.partitions||[]).forEach((b,index)=>{const axis=b.h>1?'y':'x',z=C.tileHeight(b.x,b.y),edge=z>C.tileHeight(b.x+(axis==='y'?1:0),b.y+(axis==='x'?1:0));add(axis,axis==='x'?b.y:b.x,axis==='x'?b.x:b.y,axis==='x'?b.x+b.w:b.y+b.h,z,edge,index,null);});
    (room.doors||[]).forEach(d=>{const geo=doorGeometry(d),axis=geo.along?'x':'y';add(axis,axis==='x'?d.y:d.x,axis==='x'?d.x:d.y,axis==='x'?d.x+d.w:d.y+d.h,geo.z,geo.edge,-1,d);});
    const cache=new Map();
    for(const list of groups.values()){
      list.sort((a,b)=>a.start-b.start);const runs=[];
      for(const s of list){let run=runs[runs.length-1];if(!run||s.start>run.end){run={...s,segments:[],end:s.end};runs.push(run);}run.end=Math.max(run.end,s.end);run.segments.push(s);}
      for(const run of runs){
        const {axis,fixed,start,end,z,edge}=run,lo=fixed+(edge?.76:.38),hi=lo+.24;
        const point=(u,v,h=0)=>axis==='x'?project(u,v,z+h):project(v,u,z+h);
        const near=(u,h=0)=>point(u,hi,h),far=(u,h=0)=>point(u,lo,h);
        const outline=[far(start,155),far(end,155),near(end,155),near(start,155),far(start),far(end),near(end),near(start)];
        const left=Math.floor(Math.min(...outline.map(p=>p.x))*density)-3,top=Math.floor(Math.min(...outline.map(p=>p.y))*density)-3,right=Math.ceil(Math.max(...outline.map(p=>p.x))*density)+3,bottom=Math.ceil(Math.max(...outline.map(p=>p.y))*density)+3;
        const cv=document.createElement('canvas');cv.width=right-left;cv.height=bottom-top;const k=cv.getContext('2d');k.setTransform(density,0,0,density,-left,-top);
        const holes=run.segments.filter(s=>s.door).sort((a,b)=>b.start-a.start),face=[near(start,155),near(end,155),near(end)];
        for(const d of holes)face.push(near(d.end),near(d.end,112),near(d.start,112),near(d.start));face.push(near(start));
        k.save();poly(k,face,axis==='x'?w.dark:w.light);k.clip();
        if(state.wallPattern===0||state.wallPattern===5){const h=state.wallPattern===0?26:42;poly(k,[near(start),near(end),near(end,h),near(start,h)],w.panel);const a=near(start,h),b=near(end,h);line(k,a.x,a.y,b.x,b.y,w.trim,2);}
        if(state.wallPattern>=6){const origin=near(start,155),target=near(end,155),span=(end-start)*32;k.save();k.transform((target.x-origin.x)/span,(target.y-origin.y)/span,0,1,origin.x,origin.y);S.wallDesign(k,state.wallPattern,w,span,155);k.restore();}
        if(state.wallPattern===2)for(let u=start+.5;u<end;u++){const a=near(u,8),b=near(u,155);line(k,a.x,a.y,b.x,b.y,'#ffffff22',6);}
        const a=near(start,5),b=near(end,5);line(k,a.x,a.y,b.x,b.y,w.trim,4);k.restore();
        // Only physical end faces are shaded. No tile boundaries are painted.
        poly(k,[far(end),near(end),near(end,155),far(end,155)],axis==='x'?w.light:w.dark);
        poly(k,[far(start,155),far(end,155),near(end,155),near(start,155)],'#eee4cd');
        const ta=near(start,155),tb=near(end,155);line(k,ta.x,ta.y,tb.x,tb.y,w.trim,1);
        for(const d of holes){const a=near(d.start,112),b=near(d.end,112);line(k,a.x,a.y,b.x,b.y,'#b5844d',5);}
        const indices=run.segments.filter(s=>s.index>=0).map(s=>s.index),tiles=[];
        for(let u=start;u<end;u++)tiles.push({u,x:point(u+.5,(lo+hi)/2).x});tiles.sort((a,b)=>a.x-b.x);
        // Copy disjoint integer pixel columns from ONE continuous surface.
        // This keeps depth ordering without AA cracks or doubled fade alpha.
        // Crop transparent rows once, not the full tall wall image every frame.
        const pixels=k.getImageData(0,0,cv.width,cv.height).data;
        tiles.forEach((t,i)=>{
          const x0=i?Math.round((tiles[i-1].x+t.x)/2*density):left,x1=i<tiles.length-1?Math.round((t.x+tiles[i+1].x)/2*density):right;
          let y0=cv.height,y1=0;for(let y=0;y<cv.height;y++)for(let x=x0-left;x<x1-left;x++)if(pixels[(y*cv.width+x)*4+3]){y0=Math.min(y0,y);y1=y;break;}
          const slice=document.createElement('canvas');slice.width=x1-x0;slice.height=Math.max(1,y1-y0+1);slice.getContext('2d').drawImage(cv,x0-left,y0,slice.width,slice.height,0,0,slice.width,slice.height);
          cache.set(axis==='x'?t.u+':'+fixed:fixed+':'+t.u,{canvas:cv,slice,sliceY:top+y0,left,top,x0,x1,indices});
        });
      }
    }
    return partitionStripCache=cache;
  }
  function drawPartitionStrip(key){
    const s=partitionStrips().get(key);if(!s)return;
    g.save();g.setTransform(1,0,0,1,0,0);g.globalAlpha=revealPartitions?.16:Math.min(1,...s.indices.map(i=>partitionOpacity.get(i)??1));
    const scale=view.s*Math.min(window.devicePixelRatio||1,3)/renderDensity,dx=view.x*Math.min(window.devicePixelRatio||1,3),dy=view.y*Math.min(window.devicePixelRatio||1,3);
    const x=Math.round(s.x0*scale+dx),y=Math.round(s.sliceY*scale+dy),right=Math.round(s.x1*scale+dx),bottom=Math.round((s.sliceY+s.slice.height)*scale+dy);
    g.drawImage(s.slice,x,y,right-x,bottom-y);g.restore();
  }
  const doorOpenness=new Map(),doorRasterCache=new Map();
  function doorGeometry(d){
    const along=d.axis==='y',z=C.tileHeight(d.x,d.y);
    const edge=(C.room().stairs||[]).some(s=>s.axis===d.axis&&(along?s.y===d.y+1&&s.x===d.x:s.x===d.x+1&&s.y===d.y));
    const offset=edge?.88:.5,a={x:d.x+(along?0:offset),y:d.y+(along?offset:0)},b={x:a.x+(along?d.w:0),y:a.y+(along?0:d.h)};
    return {a,b,z,along,edge};
  }
  function doorPoints(d,height=0){const {a,b,z}=doorGeometry(d);return [project(a.x,a.y,z+height),project(b.x,b.y,z+height)];}
  function doorAtPointer(p){return [...(C.room().doors||[])].reverse().find(d=>{const low=doorPoints(d),high=doorPoints(d,112);return insidePolygon(p,[low[0],low[1],high[1],high[0]]);});}
  function doorTarget(d){const along=d.axis==='y';return along?{x:d.x+Math.min(d.w-.5,Math.max(.5,Math.floor(player.x)-d.x+.5)),y:player.y<d.y+.5?d.y+1.5:d.y-.5}:{x:player.x<d.x+.5?d.x+1.5:d.x-.5,y:d.y+Math.min(d.h-.5,Math.max(.5,Math.floor(player.y)-d.y+.5))};}
  function doorDrawParts(dt){
    const objects=[],actors=[player,...people.actors.values(),...pets.actors.values()];
    for(const [index,d] of (C.room().doors||[]).entries()){
      const {a,b,z,along}=doorGeometry(d),center={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
      const near=actors.some(p=>Math.hypot(p.x-center.x,p.y-center.y)<2.6&&Math.abs(C.walkHeight(p.x,p.y)-z)<27);
      const target=near?1:0,current=doorOpenness.get(index)??0,open=animationEnabled?current+(target-current)*(1-Math.exp(-15*dt)):target;doorOpenness.set(index,open);
      const opened=open>.5,angle=opened?Math.PI/2:0,length=along?d.w:d.h,tip={x:a.x+(along?Math.cos(angle):-Math.sin(angle))*length,y:a.y+(along?-Math.sin(angle):Math.cos(angle))*length};
      // The leaf sorts at its swung position, independently of both jambs.
      // Keep each painted surface whole to avoid seams along the illustration.
      objects.push({kind:'doorPart',part:'leaf',d,a,b:tip,z,opened,u0:0,u1:1,depth:(a.x+a.y+tip.x+tip.y)/2});
      objects.push({kind:'doorPart',part:'lintel',d,a,b,z,u0:0,u1:1,depth:(a.x+a.y+b.x+b.y)/2});
      for(const p of [a,b])objects.push({kind:'doorPart',part:'jamb',d,a:p,z,depth:p.x+p.y});
    }return objects;
  }
  function drawDoorPart(o){
    const {part,d,a,b,z,u0,u1}=o,w=wallThemes[state.wall];g.save();if(revealPartitions)g.globalAlpha=.2;
    if(part==='jamb'){
      const p=project(a.x,a.y,z),q=project(a.x,a.y,z+112);line(g,p.x,p.y,q.x,q.y,'#634327',5);line(g,p.x-1,p.y,q.x-1,q.y,'#c18b49',2);
    }else{
      const at=(u,h)=>project(a.x+(b.x-a.x)*u,a.y+(b.y-a.y)*u,z+h);
      if(part==='lintel'){
        for(let x=d.x;x<d.x+d.w;x++)for(let y=d.y;y<d.y+d.h;y++)drawPartitionStrip(x+':'+y);
      }else{
        const art=doorStates[o.opened?1:0];
        if(art){
          const p=at(0,2),q=at(1,2),dx=Math.round(q.x-p.x),dy=Math.round(q.y-p.y),key=[o.opened,dx,dy].join(':');
          if(!doorRasterCache.has(key))doorRasterCache.set(key,window.VeredaScenery.door(document,art,o.opened,dx,dy));
          const sprite=doorRasterCache.get(key);g.drawImage(sprite.canvas,p.x+sprite.left,p.y+sprite.top,sprite.width,sprite.height);
        }
      }
    }g.restore();
  }
  function paint(now,dt=1/60){
    $('revealWalls').hidden=!(C.room().partitions||[]).length;
    for(let i=0;i<(C.room().partitions||[]).length;i++){const target=(revealPartitions||hoveredPartition===i)? .16 : 1,current=partitionOpacity.get(i)??1;partitionOpacity.set(i,animationEnabled?current+(target-current)*.22:target);}
    const dpr=Math.min(window.devicePixelRatio||1,3);
    g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,scene.width,scene.height);
    // Bilinear sampling during motion; refine once the camera settles.
    const movingCamera=!!cameraDrag||Math.abs(targetZoom-zoom)>.0001;
    const backgroundQuality=movingCamera?'low':'high';
    const backgroundKey=[view.x,view.y,view.s,dpr,backgroundQuality].join(':');
    if(floorViewKey!==backgroundKey){
      floorViewContext.setTransform(1,0,0,1,0,0);floorViewContext.clearRect(0,0,floorView.width,floorView.height);
      const density=view.s*dpr,source=floorLevels.find(level=>level.width/sceneW>=density)||floorCache;
      // Crop to the viewport before scaling, including a pixel of sampling bleed.
      const x=Math.max(0,-view.x/view.s-1),y=Math.max(0,-view.y/view.s-1),right=Math.min(sceneW,(view.w-view.x)/view.s+1),bottom=Math.min(sceneH,(view.h-view.y)/view.s+1);
      floorViewContext.setTransform(density,0,0,density,view.x*dpr,view.y*dpr);floorViewContext.imageSmoothingEnabled=true;floorViewContext.imageSmoothingQuality=backgroundQuality;
      if(right>x&&bottom>y)floorViewContext.drawImage(source,x*source.width/sceneW,y*source.height/sceneH,(right-x)*source.width/sceneW,(bottom-y)*source.height/sceneH,x,y,right-x,bottom-y);
      floorViewKey=backgroundKey;
    }
    g.drawImage(floorView,0,0);
    g.setTransform(view.s*dpr,0,0,view.s*dpr,view.x*dpr,view.y*dpr);
    g.imageSmoothingEnabled=true;g.imageSmoothingQuality=backgroundQuality;drawBounds=[];actorBounds=[];
    state.items.filter(i=>C.TYPES[i.type].wall).forEach(i=>drawItem(i,ghost?.id===i.id ? .36 : 1));
    const flat=state.items.filter(i=>C.TYPES[i.type].flat).sort((a,b)=>a.x+a.y-b.x-b.y);flat.forEach(i=>drawItem(i,selectedId===i.id&&ghost?.id===i.id ? .5 : 1));
    if(movingId!==null||pendingType!==null)drawGrid();
    if(mode==='walk'&&hoverTile&&!C.blocked(state.items,hoverTile.x,hoverTile.y))poly(g,tilePoints(hoverTile.x,hoverTile.y),'#ffffff22','#ffffff66');
    if(arrivalMarker&&now-arrivalMarker.at<1400){const p=groundProject(arrivalMarker.x+.5,arrivalMarker.y+.5);g.save();g.globalAlpha=Math.max(0,1-(now-arrivalMarker.at)/1400);poly(g,[{x:p.x,y:p.y-9},{x:p.x+17,y:p.y},{x:p.x,y:p.y+9},{x:p.x-17,y:p.y}],'#ffffff2a','#eeeeee');g.restore();}
    if(mode==='decorate'&&selectedId!==null){const selected=state.items.find(i=>i.id===selectedId);if(selected&&!selected.parentId)poly(g,footprint(selected),'#ffffff45','#ffffff');}
    if(ghost&&mode==='decorate'){const valid=C.canPlace(state.items,ghost,player)&&(ghost.parentId||C.TYPES[ghost.type].flat||![...people.actors.values()].some(a=>C.covers(ghost,Math.floor(a.x),Math.floor(a.y))));if(!ghost.parentId)poly(g,footprint(ghost),valid?'#ffffff59':'#00000059',valid?'#ffffff':'#333333');}
    const placingType=pendingType!==null?pendingType:state.items.find(i=>i.id===movingId)?.type;

    petBounds=[];const objects=state.items.filter(i=>!i.parentId&&!C.TYPES[i.type].flat&&!C.TYPES[i.type].wall).map(i=>({kind:'item',item:i,depth:i.x+i.y+(C.TYPES[i.type].w+C.TYPES[i.type].h)/2}));if(!seatedId)objects.push({kind:'player',depth:player.x+player.y});const seatedVisitors=new Map();for(const a of people.actors.values()){const seat=actorSeat(a);if(seat){if(!seatedVisitors.has(seat.id))seatedVisitors.set(seat.id,[]);seatedVisitors.get(seat.id).push(a);}else objects.push({kind:'visitor',actor:a,depth:a.x+a.y});}for(const pet of pets.actors.values())objects.push({kind:'pet',pet,depth:pet.x+pet.y});for(const cell of C.partitionCells())objects.push({kind:'partition',cell,depth:partitionGeometry(cell).depth});objects.push(...doorDrawParts(dt));objects.sort((a,b)=>a.depth-b.depth||(a.kind==='player'?1:-1));
    objects.forEach(o=>{if(o.kind==='doorPart')drawDoorPart(o);else if(o.kind==='partition')drawPartition(o.cell);else if(o.kind==='player')drawPlayer(now);else if(o.kind==='visitor')drawActor(o.actor);else if(o.kind==='pet')drawPet(o.pet);else {const fading=ghost&&ghost.id===o.item.id;drawItem(o.item,fading ? .36 : 1);state.items.filter(i=>i.parentId===o.item.id).sort((a,b)=>surfacePoint(o.item,a).y-surfacePoint(o.item,b).y).forEach(i=>drawItem(i,(fading||ghost?.id===i.id) ? .36 : 1));const occupants=(seatedVisitors.get(o.item.id)||[]).map(a=>({actor:a,y:actorVisual(a).p.y}));if(seatedId===o.item.id)occupants.push({self:true,y:playerVisual().p.y});occupants.sort((a,b)=>a.y-b.y);for(const occupant of occupants)occupant.self?drawPlayer(now):drawActor(occupant.actor);if(occupants.length)seatForeground(o.item);}});
    if(mode==='decorate'&&C.TYPES[placingType]?.tabletop&&ghost?.parentId){const parent=state.items.find(i=>i.id===ghost.parentId);if(parent)drawSurfaceGrid(parent);}
    if(ghost&&mode==='decorate')drawItem(ghost,C.canPlace(state.items,ghost,player)?.75:.4,false);
    ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(scene,0,0);ctx.setTransform(dpr,0,0,dpr,0,0);drawNames(now);updateBubbles(now);positionObjectMenu();positionMusicLabel();window.HubPlants?.paint(state.items,itemPosition,view,online.canEdit()&&mode==='walk');
  }
  function drawNames(now){
    const label=$('petHoverLabel'),pet=petPointer&&petBounds.slice().reverse().find(b=>{const x=petPointer.x-b.x,y=petPointer.y-b.y;if(x<0||y<0||x>=b.w||y>=b.h||!b.pet.name)return false;return b.s.alpha[Math.floor(y/b.h*b.s.height)*b.s.width+Math.floor(x/b.w*b.s.width)]>48;});label.hidden=!pet;if(pet){label.textContent=pet.pet.name;label.style.left=(view.x+(pet.x+pet.w/2)*view.s)+'px';label.style.top=(view.y+pet.y*view.s-5)+'px';}

    ctx.save();ctx.font='900 12px "Zalando Sans Expanded", Arial';ctx.textAlign='center';ctx.textBaseline='middle';
    for(const v of [...actorBounds].sort((a,b)=>a.y-b.y)){
      if(bubbles.some(b=>b.actorId===v.id&&now-b.at<2500&&!b.el.hidden))continue;
      const name=v.id==='self'?online.user.name:people.actors.get(v.id)?.name;if(!name)continue;const group=v.id==='self'?online.user.group:people.actors.get(v.id)?.group;
      const x=view.x+v.p.x*view.s,y=view.y+v.y*view.s-7;if(x<0||x>view.w||y<0||y>view.h)continue;
      const nw=Math.min(230,ctx.measureText(name).width+14),tag=group?'['+group.name+']':'',tw=group?Math.min(130,ctx.measureText(tag).width+12):0,w=nw+(tw?tw+3:0),left=Math.max(3,Math.min(view.w-w-3,x-w/2)),nx=left+(tw?tw+3:0);
      ctx.fillStyle='#ffffffed';ctx.strokeStyle='#2225';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(nx,y-10,nw,21,6);ctx.fill();ctx.stroke();ctx.fillStyle='#171717';ctx.fillText(name,nx+nw/2,y+.5,nw-14);
      if(group){const n=parseInt(group.color.slice(1),16),l=(n>>16)*.2126+((n>>8)&255)*.7152+(n&255)*.0722;ctx.fillStyle=l<115?'#fff':'#202020';ctx.beginPath();ctx.roundRect(left,y-10,tw,21,5);ctx.fill();ctx.fillStyle=group.color;ctx.fillText(tag,left+tw/2,y+.5,tw-10);}
    }ctx.restore();
  }
  if(document.fonts)Promise.all([document.fonts.load('900 12px "Zalando Sans Expanded"'),document.fonts.load('300 15px "Zalando Sans Expanded"')]).catch(()=>{});
  function resetView(){endCameraDrag();zoom=targetZoom=1;zoomAnchor=null;pan={x:0,y:0};}
  function cameraFit(room=C.room()){const sum=room.w+room.h;return Math.min((view.w-22)/(sum*32+50),(view.h-65)/(sum*16+210+C.maxHeight(room)));}
  // Equal maximum on-screen object size, even when fitting a much bigger room.
  function cameraZoomLimit(){return Math.max(1.8,1.8*cameraFit(C.layoutFor('square'))/cameraFit());}
  function updateView(){
    const room=C.room(),sum=room.w+room.h;
    view.s=cameraFit(room)*zoom;
    const bx=view.w/2-(origin()+(room.w-room.h)*16)*view.s,by=(view.h-45)/2-(135+C.maxHeight()/2+sum*8)*view.s;
    if(zoomAnchor){pan.x=zoomAnchor.x-zoomAnchor.wx*view.s-bx;pan.y=zoomAnchor.y-zoomAnchor.wy*view.s-by;}
    view.x=bx+pan.x;view.y=by+pan.y;
    const label=Math.round(zoom*100)+'%';if($('zoomLabel').textContent!==label)$('zoomLabel').textContent=label;$('zoomOut').disabled=targetZoom<=.65;$('zoomIn').disabled=targetZoom>=cameraZoomLimit()-1e-7;
  }
  let viewportKey='';
  function resize(force=true){
    const r=stage.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,3),room=C.room();
    if(r.width<=0||r.height<=0)return false;
    const key=[r.width,r.height,dpr,room.id].join(':');
    // Sidebar layout notifications must not clear the game surface or caches.
    if(!force&&key===viewportKey)return false;
    viewportKey=key;
    endCameraDrag();
    canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);view.w=r.width;view.h=r.height;
    zoom=Math.min(zoom,cameraZoomLimit());targetZoom=Math.min(targetZoom,cameraZoomLimit());
    sceneW=Math.max(900,origin()+room.w*32+66);sceneH=Math.max(640,baseY()+(room.w+room.h)*16+70);
    zoomAnchor=null;updateView();
    // Uniform sprite detail across room sizes. Only the visible viewport is
    // repainted each frame; static architecture keeps a bounded world cache.
    renderDensity=Math.min(3,Math.max(1,Math.ceil(cameraFit(C.layoutFor('square'))*1.8*dpr*4)/4));
    scene.width=canvas.width;scene.height=canvas.height;
    floorView.width=canvas.width;floorView.height=canvas.height;floorViewKey='';
    const floorDensity=Math.min(renderDensity,Math.sqrt(16000000/(sceneW*sceneH)));
    floorCache.width=Math.ceil(sceneW*floorDensity);floorCache.height=Math.ceil(sceneH*floorDensity);bg.setTransform(floorCache.width/sceneW,0,0,floorCache.height/sceneH,0,0);
    spriteRasterCache=new WeakMap();zoomAnchor=null;updateView();buildRoom(!force);
    // Canvas resizing clears its bitmap. Present the resized frame in this
    // same task, before the browser can display an empty surface.
    if(ready)paint(performance.now(),0);
    return true;
  }
  function updatePlayer(dt,now){
    player.moving=false;if(mode!=='walk'||seatedId)return;
    let budget=dt*2.6;
    while(player.path.length&&budget>0){const target=player.path[0],dx=target.x-player.x,dy=target.y-player.y,dist=Math.hypot(dx,dy);
      if(dist<.001){player.x=target.x;player.y=target.y;player.path.shift();continue;}
      const step=Math.min(budget,dist);player.x+=dx/dist*step;player.y+=dy/dist*step;budget-=step;const dir=Math.abs(dx)>Math.abs(dy)?(dx>0?0:2):(dy>0?1:3);if(dir!==player.dir)player.step=0;player.dir=dir;player.moving=true;player.step+=step*6.4;
      if(step===dist){player.x=target.x;player.y=target.y;player.path.shift();}
    }
    if(!player.path.length){player.moving=false;finishSitting();}
    if(player.moving){walkSoundTimer+=dt;if(walkSoundTimer>.22){sfx('step');walkSoundTimer=0;}}
  }
  function tick(now){const dt=Math.min((now-latestTime)/1000||0,.05);latestTime=now;if(ready){if(animationEnabled)effectsTime+=dt*1000;if(Math.abs(targetZoom-zoom)>.0001){zoom=reduceMotion?targetZoom:zoom+(targetZoom-zoom)*(1-Math.exp(-12*dt));if(Math.abs(targetZoom-zoom)<.0001)zoom=targetZoom;updateView();if(zoom===targetZoom)zoomAnchor=null;}updatePlayer(dt,now);people.update(dt);pets.update(dt,true);rewardsUI?.tick(now);paint(now,dt);}requestAnimationFrame(tick);}
  function updateBubbles(now){
    const boxes=[];
    // Batch measurements before position writes to avoid per-message layout work.
    for(const b of bubbles)if(b.measure){b.width=b.el.offsetWidth||300;b.height=b.el.offsetHeight||36;b.measure=false;}
    for(let j=bubbles.length-1;j>=0;j--){
      const b=bubbles[j];if(now>=b.until){removeBubble(b);bubbles.splice(j,1);continue;}
      b.el.hidden=false;const w=Math.min(b.width,view.w-16),h=b.height;
      const x=Math.max(w/2+8,Math.min(view.w-w/2-8,view.x+b.anchor.x*view.s));
      const base=Math.min(view.h-12,view.y+b.anchor.y*view.s-22);let y=base-(b.rise||0);
      // Preserve the place where each message was spoken. Only overlapping
      // horizontal lanes push earlier messages upward; they never jump sideways.
      for(const q of boxes)if(x-w/2<q.right+6&&x+w/2+6>q.left&&y>q.top-7)y=q.top-7;
      b.rise=Math.max(b.rise||0,base-y);b.y=y;
      const opacity=Math.max(0,Math.min(1,(b.until-now)/4000,(b.y-8)/60));
      b.el.hidden=b.y<0;b.el.setAttribute('aria-hidden',String(b.el.hidden));b.el.style.opacity=String(opacity);b.el.style.left=x+'px';b.el.style.top=b.y+'px';
      boxes.push({left:x-w/2,right:x+w/2,top:y-h,bottom:y});
    }
  }
  function sendChat(e){e.preventDefault();const input=$('chatInput');if(input.value.trim()&&online.send('chat',{text:input.value})){input.value='';updateInput();sfx('chat');}}
  function updateInput(){$('charCount').textContent=$('chatInput').value.length+'/120';$('sendBtn').disabled=!$('chatInput').value.trim()||!ready;}
  function showPanel(name){window.HubPanels?.select(name);if(['furniture','people'].includes(name))return;for(const panel of ['inventory','rewards','furniture','room','people']){const active=panel===name;$(panel+'Panel').hidden=!active;$(panel+'Tab').classList.toggle('active',active);$(panel+'Tab').setAttribute('aria-selected',String(active));}rewardsUI?.showPanel(name);}
  function buildCatalog(){if(!ready&&furniture.length!==C.TYPES.length)return;const catalog=$('catalog'),normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es'),query=normalize($('catalogSearch').value.trim());let matches=0;catalog.textContent='';C.TYPES.forEach((t,index)=>{if((filter!=='all'&&t.category!==filter)||!normalize(t.name).includes(query))return;matches++;const button=document.createElement('button');button.className='item-card';button.dataset.type=index;button.setAttribute('aria-label','Colocar '+t.name);button.title='Colocar '+t.name;const preview=document.createElement('canvas');preview.width=168;preview.height=132;const k=preview.getContext('2d'),s=furniture[t.sprite],ratio=Math.min(136/s.width,112/s.height);k.imageSmoothingEnabled=true;k.imageSmoothingQuality="high";spriteAt(s,k,(168-s.width*ratio)/2,66-s.height*ratio/2,s.width*ratio,!!t.artFlip);drawDetails(k,{item:{id:0,type:index},x:(168-s.width*ratio)/2,y:66-s.height*ratio/2,w:s.width*ratio,h:s.height*ratio,flip:!!t.artFlip});const label=document.createElement('span');label.className='item-name';label.textContent=t.name;const plus=document.createElement('span');plus.className='card-plus';plus.textContent='+';button.append(preview,label,plus);button.addEventListener('click',()=>startPlacement(index));catalog.appendChild(button);});$('catalogEmpty').hidden=matches!==0;$('catalogCount').textContent=matches+' / '+C.TYPES.length;}
  const roomPickers=[
    {id:'roomWall',key:'wall',options:wallThemes},
    {id:'roomFloor',key:'floor',options:floorThemes},
    {id:'roomWallPattern',key:'wallPattern',options:['Paneles de madera','Liso','Papel a rayas','Ladrillos','Rombos','Dos tonos','Arcos Art Déco','Escamas','Jardín Botánico','Listones Acanalados','Constelaciones'].map(name=>({name}))},
    {id:'roomFloorPattern',key:'floorPattern',options:['Parquet fino','Tablones anchos','Damero','Baldosas','Parquet entrelazado','Mosaico','Terrazo','Mosaico Estrella','Hexágonos','Espiga','Corcho Natural','Piedra Rústica'].map(name=>({name}))},
    {id:'roomLayout',key:'layout',options:C.LAYOUTS}
  ];
  const environmentPreviews=new Map();
  function environmentPreview(item){
    if(environmentPreviews.has(item.id))return environmentPreviews.get(item.id);
    const cv=document.createElement('canvas');cv.width=180;cv.height=180;const k=cv.getContext('2d'),wall=item.slot.startsWith('wall'),theme=(wall?wallThemes:floorThemes)[item.slot==='wall'||item.slot==='floor'?item.index:0],pattern=item.slot.includes('Pattern')?item.index:1;
    if(item.slot==='layout'){
      const layout=C.LAYOUTS[item.index],scale=150/(layout.w+layout.h),point=(x,y,z=0)=>({x:90+(x-y+(layout.h-layout.w)/2)*scale,y:30+(x+y)*scale*.5-z*.35});
      for(let y=0;y<layout.h;y++)for(let x=0;x<layout.w;x++)if(C.inside(x,y,layout)){const z=C.tileHeight(x,y,layout);poly(k,[point(x,y,z),point(x+1,y,z),point(x+1,y+1,z),point(x,y+1,z)],z?'#999':'#ddd','#777');}
      k.fillStyle='#222';k.font='900 17px "Zalando Sans Expanded"';k.textAlign='center';k.fillText(layout.w+' × '+layout.h,90,142);
    }else{
      k.save();if(wall)k.transform(.82,.41,0,.82,32,7);else k.transform(1,.5,-1,.5,90,55);
      const size=wall?130:70;k.fillStyle=wall?theme.light:theme.base;k.fillRect(0,0,size,size);
      k.strokeStyle=theme.trim||theme.dark;k.lineWidth=1;
      if(wall){
        if(pattern>=6)S.wallDesign(k,pattern,theme,size,size);
        if(pattern===0||pattern===5){k.fillStyle=theme.panel;k.fillRect(0,pattern===0?90:66,size,pattern===0?40:64);k.fillStyle=theme.trim;k.fillRect(0,pattern===0?90:66,size,3);if(pattern===0)for(let x=0;x<size;x+=16)k.strokeRect(x,94,16,36);}
        if(pattern===2){k.fillStyle='#ffffff33';for(let x=0;x<size;x+=20)k.fillRect(x,0,10,size);}
        if(pattern===3)for(let y=0;y<size;y+=16)for(let x=-(y/16%2)*20;x<size;x+=40)k.strokeRect(x,y,40,16);
        if(pattern===4)for(let y=12;y<size;y+=24)for(let x=12;x<size;x+=24)poly(k,[{x,y:y-5},{x:x+4,y},{x,y:y+5},{x:x-4,y}],theme.trim+'88');
        k.fillStyle=theme.trim;k.fillRect(0,126,size,4);
      }else{
        for(let y=0;y<4;y++)for(let x=0;x<4;x++){
          const u=x*17.5,v=y*17.5;k.fillStyle=pattern===2?(x+y)%2?theme.light:theme.base:(x*3+y*5)%4===1?theme.light:theme.base;k.fillRect(u,v,17.5,17.5);k.strokeRect(u,v,17.5,17.5);
          if(pattern<2)for(let n=1;n<(pattern===0?4:2);n++){const t=n*17.5/(pattern===0?4:2);line(k,u+t,v,u+t,v+17.5,theme.dark+'88');}
          if(pattern===3){k.strokeStyle=theme.light;k.strokeRect(u+1,v+1,15.5,15.5);k.strokeStyle=theme.dark;}
          if(pattern===4)for(let n=1;n<4;n++)line(k,u+((x+y)%2?n*4.375:0),v+((x+y)%2?0:n*4.375),u+((x+y)%2?n*4.375:17.5),v+((x+y)%2?17.5:n*4.375),theme.dark);
          if(pattern===5)for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){k.fillStyle=(x+y+dx+dy)%3?theme.light:theme.dark;k.fillRect(u+dx*8.75+1,v+dy*8.75+1,6.75,6.75);}
          if(pattern>=7)S.floorDesign(k,pattern,theme,(a,b)=>({x:a*17.5,y:b*17.5}),x,y);
          if(pattern===6)for(let n=0;n<7;n++){k.fillStyle=n%3?theme.light:theme.dark;k.fillRect(u+rand(x*7+n,y)*15,v+rand(y*7+n,x)*15,1.5,2);}
        }
      }
      k.restore();
    }
    const result={canvas:cv,width:180,height:180};environmentPreviews.set(item.id,result);return result;
  }
  function updateRoomPickers(){
    for(const picker of roomPickers){const value=state[picker.key],index=picker.options.findIndex((o,i)=>(o.id??i)===value),selected=picker.options[Math.max(0,index)];$(picker.id).textContent=selected.name;const available=roomOptions(picker),at=available.findIndex(o=>o.index===index);$(picker.id+'Count').textContent=at<0?'Actual':(at+1)+' / '+available.length;$(picker.id+'Prev').disabled=$(picker.id+'Next').disabled=available.length<2;if(selected.swatch)$(picker.id+'Chip').style.background=selected.swatch;}
  }
  function setEnvironment(key,value){if(!online.canEdit())return;if(value!==0&&!owns('self','environment:'+key+':'+value))return;if(!Number.isInteger(value)||value<0||value>=C.ENV_COUNTS[key]||value===state[key])return;checkpoint();state[key]=value;buildRoom();updateSwatches();save();sfx('place');}
  function updateSwatches(){for(const key of ['wallPattern','floorPattern','layout'])$(key==='layout'?'roomShape':key).value=String(state[key]??0);for(const [id,key,themes] of [['wallSwatches','wall',wallThemes],['floorSwatches','floor',floorThemes]]){$(id).textContent='';themes.forEach((t,index)=>{const b=document.createElement('button');b.className='swatch';b.style.background=t.swatch;b.title=t.name;b.setAttribute('aria-label',t.name);b.setAttribute('aria-pressed',String(state[key]===index));if(state[key]===index)b.innerHTML='<svg><use href="#i-check"/></svg>';b.addEventListener('click',()=>setEnvironment(key,index));$(id).appendChild(b);});}updateRoomPickers();}
  function portrait(cv,appearance){const k=cv.getContext('2d'),s=appearance&&wardrobe?wardrobe.frame(P.look(appearance),0):avatar[0];k.clearRect(0,0,cv.width,cv.height);k.imageSmoothingEnabled=true;k.imageSmoothingQuality='high';const sourceScale=s.canvas.width/s.width,cropHeight=62,ratio=(cv.height-1)/cropHeight;k.drawImage(s.canvas,0,0,s.canvas.width,cropHeight*sourceScale,(cv.width-s.width*ratio)/2,1,s.width*ratio,cropHeight*ratio);}
  function thumbnail(id){portrait($(id),myAppearance);}
  async function loadImage(src){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('No se pudo cargar una imagen del juego.'));img.src=src;});}
  function extractAtlas(img,isAvatar,cols=4,rows=4,retainCellParts=false){
    const full=document.createElement('canvas');full.width=img.width;full.height=img.height;const k=full.getContext('2d',{willReadFrequently:true});k.drawImage(img,0,0);const iw=img.width,ih=img.height,cellW=iw/cols,cellH=ih/rows,out=[];
    // Detect complete connected shapes before cropping. Generated atlases may have an object
    // extending a few pixels beyond its nominal cell; rigid cuts would clip its legs.
    const pixels=k.getImageData(0,0,iw,ih).data,seen=new Int32Array(iw*ih),stack=new Int32Array(iw*ih),bins=Array.from({length:cols*rows},()=>[]);let component=0;
    for(let pos=0;pos<seen.length;pos++){
      if(seen[pos]||pixels[pos*4+3]<=64)continue;
      let length=0,area=0,x0=iw,y0=ih,x1=0,y1=0;const label=++component;stack[length++]=pos;seen[pos]=label;
      while(length){const q=stack[--length],x=q%iw,y=Math.floor(q/iw);area++;x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);
        for(const n of [x>0?q-1:-1,x<iw-1?q+1:-1,y>0?q-iw:-1,y<ih-1?q+iw:-1])if(n>=0&&!seen[n]&&pixels[n*4+3]>64){seen[n]=label;stack[length++]=n;}
      }
      if(area>=12){const col=Math.min(cols-1,Math.floor((x0+x1)/2/cellW)),row=Math.min(rows-1,Math.floor((y0+y1)/2/cellH));bins[row*cols+col].push({x0,y0,x1,y1,area,label});}
    }
    for(const [cell,parts] of bins.entries()){parts.sort((a,b)=>b.area-a.area);if(!parts.length)throw new Error(`Una pieza de arte está vacía (${cols}×${rows}, casilla ${cell}).`);const main=parts[0],keep=new Set([main.label]);let {x0,y0,x1,y1}=main;
      for(const p of parts.slice(1)){if(retainCellParts&&p.area>64||p.x1>=main.x0-14&&p.x0<=main.x1+14&&p.y1>=main.y0-14&&p.y0<=main.y1+14){keep.add(p.label);x0=Math.min(x0,p.x0);x1=Math.max(x1,p.x1);y0=Math.min(y0,p.y0);y1=Math.max(y1,p.y1);}}
      x0=Math.max(0,x0-1);y0=Math.max(0,y0-1);x1=Math.min(iw-1,x1+1);y1=Math.min(ih-1,y1+1);
      const cv=document.createElement('canvas');cv.width=x1-x0+1;cv.height=y1-y0+1;const dest=cv.getContext('2d',{willReadFrequently:true}),data=dest.createImageData(cv.width,cv.height),alpha=new Uint8Array(cv.width*cv.height);
      // Copy only this sprite's components, excluding neighbouring art inside the crop rectangle.
      for(let y=0;y<cv.height;y++)for(let x=0;x<cv.width;x++){const source=(y+y0)*iw+x+x0,target=y*cv.width+x;if(!keep.has(seen[source]))continue;for(let c=0;c<4;c++)data.data[target*4+c]=pixels[source*4+c];alpha[target]=pixels[source*4+3];}
      dest.putImageData(data,0,0);out.push({canvas:cv,width:cv.width,height:cv.height,alpha});}
    return out;
  }
  $('catalogSearch').addEventListener('input',buildCatalog);
  $('walkBtn').addEventListener('click',()=>setMode('walk'));
  $('undoBtn').addEventListener('click',undo);$('moveBtn').addEventListener('click',beginMove);$('interactBtn').addEventListener('click',()=>interact(state.items.find(i=>i.id===selectedId)));$('flipBtn').addEventListener('click',flipSelected);$('wallUpBtn').addEventListener('click',()=>raiseWall(8));$('wallDownBtn').addEventListener('click',()=>raiseWall(-8));$('storeBtn').addEventListener('click',removeSelected);$('deselectBtn').addEventListener('click',cancelSelection);
  $('chatForm').addEventListener('submit',sendChat);$('chatInput').addEventListener('input',updateInput);
  $('soundBtn').addEventListener('click',()=>{soundEnabled=!soundEnabled;updateSound();sfx('place');});
  $('helpBtn').addEventListener('click',()=>$('helpDialog').showModal());$('profileBtn').addEventListener('click',()=>openLook('self'));$('hubLook').addEventListener('click',()=>openLook('self'));
  $('profileForm').addEventListener('submit',e=>{e.preventDefault();$('profileDialog').close();});
  document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>$(button.dataset.close).close()));
  document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const b=d.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)d.close();}}));
  for(const panel of ['inventory','rewards'])$(panel+'Tab').addEventListener('click',()=>showPanel(panel));
  $('furnitureTab').addEventListener('click',()=>showPanel('furniture'));$('roomTab').addEventListener('click',()=>showPanel('room'));
  document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{filter=button.dataset.filter;document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('active',b===button));buildCatalog();}));
  $('quickGenerate').addEventListener('click',()=>{showPanel('room');$('generateRoom').focus();});
  $('generateRoom').addEventListener('click',()=>{
    if(!ready)return;
    try{
      const next=window.VeredaGenerator.generate(C,{excludeLayout:state.layout,seed:Date.now()+Math.floor(Math.random()*1000000),name:online.user.name});
      checkpoint();standUp();cancelSelection();state=next;C.setLayout(state.layout);
      player={...player,...C.findFree(state.items,{x:C.room().w/2+.5,y:C.room().h/2+.5}),path:[],moving:false};rehomeActors();
      bubbles.forEach(removeBubble);bubbles=[];resetView();resize();updateName();updateSwatches();save();savePeople();
      toast('Sala lista: '+state.items.length+' piezas.'+(state.unplacedItems?.length?' '+state.unplacedItems.length+' en reserva.':'')+' Podés deshacer el cambio.');
    }catch(error){console.error(error);toast('No pudimos generar esa sala. Tu decoración sigue guardada.');}
  });
  $('resetBtn').addEventListener('click',()=>$('resetDialog').showModal());$('confirmReset').addEventListener('click',()=>{checkpoint();standUp();const name=state.name;state=C.initial();state.name=name;C.setLayout(state.layout);resetView();resize();player={...player,...C.findFree(state.items),path:[],moving:false};rehomeActors();cancelSelection();buildRoom();updateSwatches();save();$('resetDialog').close();toast('Tu rincón vuelve a estar como al principio.');});
  function changeZoom(delta,event){
    endCameraDrag();
    const r=canvas.getBoundingClientRect(),x=event?event.clientX-r.left:view.w/2,y=event?event.clientY-r.top:view.h/2;
    zoomAnchor={x,y,wx:(x-view.x)/view.s,wy:(y-view.y)/view.s};targetZoom=Math.max(.65,Math.min(cameraZoomLimit(),targetZoom+delta));
    if(reduceMotion){zoom=targetZoom;updateView();zoomAnchor=null;}
  }
  canvas.addEventListener('wheel',e=>{if(!ready)return;e.preventDefault();const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?view.h:1);changeZoom(targetZoom*(Math.exp(-Math.max(-180,Math.min(180,delta))*.0015)-1),e);},{passive:false});
  $('zoomLabel').addEventListener('click',()=>{resetView();updateView();});
  for(const key of ['wallPattern','floorPattern'])$(key).addEventListener('change',e=>setEnvironment(key,Number(e.target.value)));
  C.LAYOUTS.forEach(l=>{const option=document.createElement('option');option.value=l.id;option.textContent=l.name;$('roomShape').appendChild(option);});
  function changeRoomLayout(value){if(!online.canEdit())return;
    const layout=C.layoutFor(value),index=C.LAYOUTS.findIndex(l=>l.id===layout.id);if(index!==0&&!owns('self','environment:layout:'+index))return;if(layout.id===state.layout)return;
    const next=C.reflow(state,layout.id);
    checkpoint();standUp();cancelSelection();state=next;C.setLayout(layout);player={...player,...C.findFree(state.items,player),path:[],moving:false};
    toast(next.unplacedItems?.length?'Sala reacomodada. '+next.unplacedItems.length+' objetos en reserva.':'Sala reacomodada. Podés deshacer el cambio.');
    rehomeActors();
    resetView();resize();updateSwatches();save();
  }
  $('roomShape').addEventListener('change',e=>changeRoomLayout(e.target.value));
  function cycleRoom(picker,delta){
    const options=roomOptions(picker),key=picker.key,value=state[key],index=options.findIndex(o=>(o.id??o.index)===value),next=options[(Math.max(0,index)+delta+options.length)%options.length];
    if(key==='layout')changeRoomLayout(next.id);else setEnvironment(key,next.index);
    $('roomStatus').textContent=$(picker.id+'Label').textContent+': '+next.name;
  }
  for(const picker of roomPickers)for(const [suffix,delta] of [['Prev',-1],['Next',1]]){
    const b=$(picker.id+suffix);b.addEventListener('click',()=>cycleRoom(picker,delta));b.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();e.stopPropagation();cycleRoom(picker,e.key==='ArrowLeft'?-1:1);}else if(e.key==='Enter'||e.key===' ')e.stopPropagation();});
  }
  let theme='light';try{theme=localStorage.getItem('vereda.theme.v1')==='dark'?'dark':'light';}catch(e){}
  function applyTheme(){document.documentElement.setAttribute('data-theme',theme);$('themeBtn').textContent=theme==='dark'?'☀ Modo claro':'☾ Modo oscuro';$('themeBtn').setAttribute('aria-pressed',String(theme==='dark'));}
  $('themeBtn').addEventListener('click',()=>{theme=theme==='dark'?'light':'dark';applyTheme();try{localStorage.setItem('vereda.theme.v1',theme);}catch(e){}});applyTheme();
  $('zoomOut').addEventListener('click',()=>changeZoom(-.1));$('zoomIn').addEventListener('click',()=>changeZoom(.1));
  document.addEventListener('keydown',e=>{
    if(document.querySelector('dialog[open]')||e.defaultPrevented)return;const editing=/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
    if(editing){if(e.key==='Escape'){document.activeElement.blur();canvas.focus({preventScroll:true});}return;}
    if(e.key==='Enter'){e.preventDefault();$('chatInput').focus();return;}if(e.key==='Escape'){cancelSelection();return;}
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();undo();return;}
    if(mode==='decorate'){if(e.key.toLowerCase()==='m'){e.preventDefault();beginMove();}if(e.key.toLowerCase()==='r'){e.preventDefault();flipSelected();}if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();removeSelected();}}
    const directions={ArrowDown:[1,0],ArrowLeft:[0,1],ArrowUp:[-1,0],ArrowRight:[0,-1]};
    if(mode==='walk'&&directions[e.key]&&ready){e.preventDefault();if(player.path.length>1)return;const [dx,dy]=directions[e.key],end={x:Math.floor(player.x)+dx,y:Math.floor(player.y)+dy};if(!C.blocked(state.items,end.x,end.y))movePlayer(end);}
  });
  new ResizeObserver(()=>resize(false)).observe(stage);updateName();updateSwatches();resize();
  function crossSection(s,v){
    const y=Math.min(s.height-1,Math.floor(s.height*v));let left=s.width,right=0;
    for(let x=0;x<s.width;x++)if(s.alpha[y*s.width+x]>128){left=Math.min(left,x);right=Math.max(right,x);}
    return left<=right?{u:(left+right)/2/s.width,width:(right-left+1)/s.width}:{u:.5,width:.5};
  }
  // Audited against the painted shoulder openings, ears, cuffs and heel directions.
  // Back-facing NW/NE retain the near side of their respective world axis.
  // NW arm drawings are explicitly assigned in reversed atlas order; no limb is mirrored.
  const RIG_VIEWS=[
    {body:0,legs:[1,2],arms:[3,4],nearScreen:-1,axis:{x:1,y:.5}},
    {body:5,legs:[6,7],arms:[8,9],nearScreen:1,axis:{x:-1,y:.5}},
    {body:10,legs:[11,12],arms:[14,13],nearScreen:-1,axis:{x:-1,y:-.5}},
    {body:15,legs:[16,17],arms:[18,19],nearScreen:1,axis:{x:1,y:-.5}}
  ];
  function rigPose(parts,dir,phase=null){
    // Keep source detail through compositing; logical dimensions remain in room units.
    const cv=document.createElement('canvas');cv.width=72*4;cv.height=96*4;
    const k=cv.getContext('2d');k.scale(4,4);k.imageSmoothingEnabled=true;k.imageSmoothingQuality='high';
    const mapping=parts.modular?{...RIG_VIEWS[dir],arms:parts.armOrder[dir]}:RIG_VIEWS[dir],body=parts[mapping.body],axis=mapping.axis,joints=parts.joints?.[dir];
    const sitting=phase==='seat',moving=typeof phase==='number',bob=moving?Math.abs(Math.cos(phase))*.45:0;
    const bh=58,bw=bh*body.width/body.height,bx=36-bw/2,by=6-bob;
    const waist=crossSection(body,.95),pelvis=bx+bw*waist.u;
    // The camera-near side is screen-left for SE/NW and screen-right for SW/NE.
    // This lateral vector, like the forward stride, is projected on the 2:1 floor.
    const nearSign=mapping.nearScreen,halfHip=3,hipBase=60,legHeight=25;
    const legs=[0,1].map(side=>{
      const screenSide=nearSign*(side?1:-1),s=parts[mapping.legs[screenSide<0?0:1]],t=moving?phase+side*Math.PI:0;
      const stride=moving?Math.sin(t)*3.8:0,lateral=(side?1:-1);
      const hipX=pelvis+nearSign*halfHip*lateral,hipY=hipBase+lateral*halfHip*.5-bob;
      const depth=lateral*halfHip*.5+axis.y*stride;
      return {s,side,t,stride,hipX,hipY,depth};
    });
    function leg(l){
      const {s,stride,hipX,hipY,t}=l,dx=axis.x*(sitting?8:stride),dy=(sitting?-8:axis.y*stride)-(moving?Math.max(0,Math.cos(t))*1.4:0);
      const h=legHeight,w=h*s.width/s.height,upperH=h*.64,cut=Math.round(s.height*.64);
      // Anchor the actual trouser opening, not the bounding box that includes the toe.
      const x=hipX-w*crossSection(s,.08).u,y=hipY;
      k.save();k.translate(x,y);k.transform(1,0,dx/upperH,(upperH+dy)/upperH,0,0);
      k.drawImage(s.canvas,0,0,s.width,cut,0,0,w,upperH+.12);k.restore();
      k.drawImage(s.canvas,0,cut,s.width,s.height-cut,x+dx,y+upperH+dy,w,h-upperH);
    }
    const ordered=legs.slice().sort((a,b)=>a.depth-b.depth);ordered.forEach(leg);
    function arm(side){
      const screenSide=nearSign*(side?1:-1),s=parts[mapping.arms[screenSide<0?0:1]];
      const h=joints?.armHeight??23,w=h*s.width/s.height,t=moving?phase+side*Math.PI:0;
      // Counter-swing follows the same ground-plane axes as the opposite foot.
      // Adding the vertical projection avoids an in/out flapping motion.
      const swing=moving?-Math.sin(t)*4.5:0,dx=axis.x*swing,dy=axis.y*swing;
      const shoulder=joints?.shoulders[screenSide<0?0:1],pivotV=joints?.armPivotV??.08;
      k.save();k.translate(shoulder?bx+bw*shoulder.u:pelvis+screenSide*8.8,shoulder?by+bh*shoulder.v+(side?.6:-.6):by+bh*.63+(side?1.3:-1.3));k.transform(1,0,dx/h,(h+dy)/h,0,0);
      k.drawImage(s.canvas,-w*crossSection(s,joints?pivotV:.12).u,-h*pivotV,w,h);k.restore();
    }
    arm(0);k.drawImage(body.canvas,bx,by,bw,bh);arm(1);
    return {canvas:cv,width:72,height:96,anchorX:pelvis,anchorY:hipBase+legHeight-.5,worldScale:1,rig:{dir,phase,pelvis,hipBase,legHeight,joints,parts:{body:mapping.body,legs:mapping.legs,arms:mapping.arms},legs:legs.map(({side,hipX,hipY,depth})=>({side,hipX,hipY,depth})),drawOrder:ordered.map(l=>l.side)}};
  }
  function buildAvatar(a,parts){
    avatar=extractAtlas(a,true);
    for(let dir=0;dir<4;dir++){
      const originalHeight=avatar[dir*4].height;
      avatar[dir*4+3].worldScale=82/originalHeight;
      // Seat support is the pelvis, not the center of the head-to-shoes box.
      avatar[dir*4+3].seatX=[.35,.65,.56,.44][dir];avatar[dir*4+3].seatY=.72;
      avatar[dir*4]=rigPose(parts,dir);
      AVATAR_FRAMES[dir].walk.forEach((frame,n)=>avatar[frame]=rigPose(parts,dir,n*Math.PI/4));
    }
  }
  Promise.all(['furniture','avatar','parts','sofa','chair','heads','bodyA','bodyB','walkApproved','bodyC','bodyD','walkNew','headsNew','headsGlasses','furnitureNew','bodyE','bodyF','walkV16','hairV16','facesV16','furnitureV16','radioV17','bodyG','bodyH','walkV18','hairV18','wallV18','bonsaiV19','cartV19','chestV20','tankV20','fishV20','wallStateV20','furnitureV21','bodyI','walkV21','hairV21','bodyJ','bodyK','walkV22','hairV22','furnitureV22','furnitureV23','upperZip','upperCross','upperTank','pantsBaggy','pantsCross','shoeStrap','shoePanel','shoeTall','shoeLaces','chainV24','upperNight','gamingV27','wallV27','backV27','catV27','dogV27','lightsV27','catGray','catTux','dogChocolate','dogBlack','upperCream','upperWine','furnitureV28','v29Wall','v29Windows','v29Tank','v29DarkBasic','v29DarkNew','v29DarkBench','v29DarkGaming','v29DarkSofa','v29DarkChair','v29DarkCafe','v29DarkKitchen','v29DarkAux','v29DarkChest','v29DarkCart','v29DarkMusic','furnitureV30','furnitureV35','propsV35','doorV32','doorsV33','chainsV33','headsSunglasses','headsMoustache','headsBeard','rouletteV1','exchangeMachine','dressLilac','dressBlack','dressDenim','hairBraids','hairBlue','backSkate','monitorWide','monitorPortrait','tvCinema','tvWall','tableWorkshop','lampMoon','plantSun','plantRose','plantEpic','basketMachine','pet530','pet531','pet532','pet533','pet534','top530','top531','top532','top533','top534','object530','object531','object532','object533','object534',...(window.VEREDA_WARDROBE_CACHE?.sheets||[]).map((_,i)=>'wardrobeCache'+i)].map(key=>loadImage(ASSETS[key]))).then(([f,a,parts,sofa,chair,heads,bodyA,bodyB,walkApproved,bodyC,bodyD,walkNew,headsNew,headsGlasses,furnitureNew,bodyE,bodyF,walkV16,hairV16,facesV16,furnitureV16,radioV17,bodyG,bodyH,walkV18,hairV18,wallV18,bonsaiV19,cartV19,chestV20,tankV20,fishV20,wallStateV20,furnitureV21,bodyI,walkV21,hairV21,bodyJ,bodyK,walkV22,hairV22,furnitureV22,furnitureV23,upperZip,upperCross,upperTank,pantsBaggy,pantsCross,shoeStrap,shoePanel,shoeTall,shoeLaces,chainV24,upperNight,gamingV27,wallV27,backV27,catV27,dogV27,lightsV27,catGray,catTux,dogChocolate,dogBlack,upperCream,upperWine,furnitureV28,v29Wall,v29Windows,v29Tank,v29DarkBasic,v29DarkNew,v29DarkBench,v29DarkGaming,v29DarkSofa,v29DarkChair,v29DarkCafe,v29DarkKitchen,v29DarkAux,v29DarkChest,v29DarkCart,v29DarkMusic,furnitureV30,furnitureV35,propsV35,doorV32,doorsV33,chainsV33,headsSunglasses,headsMoustache,headsBeard,rouletteV1,exchangeMachine,dressLilac,dressBlack,dressDenim,hairBraids,hairBlue,backSkate,monitorWide,monitorPortrait,tvCinema,tvWall,tableWorkshop,lampMoon,plantSun,plantRose,plantEpic,basketMachine,pet530,pet531,pet532,pet533,pet534,top530,top531,top532,top533,top534,object530,object531,object532,object533,object534,...compiledImages])=>{
    doorSprite=extractAtlas(doorV32,false,1,1)[0];doorStates=extractAtlas(doorsV33,false,2,1);
    furniture=[...extractAtlas(f,false),...extractAtlas(furnitureNew,false,3,2),...extractAtlas(furnitureV16,false,2,2),...extractAtlas(wallV18,false,3,2),...extractAtlas(tankV20,false,1,1),...extractAtlas(bonsaiV19,false,1,1),...extractAtlas(chestV20,false,1,1),...extractAtlas(cartV19,false,1,1),...extractAtlas(furnitureV21,false,2,2),...extractAtlas(furnitureV22,false,2,2),...extractAtlas(furnitureV23,false,2,2),...extractAtlas(gamingV27,false,4,2),...extractAtlas(wallV27,false,2,2),...extractAtlas(furnitureV28,false,2,2)];fishSprite=extractAtlas(fishV20,false,1,1)[0];const wallStates=extractAtlas(wallStateV20,false,3,2);windowClosed=wallStates[0];furniture[29]=wallStates[3];furniture[24]=extractAtlas(radioV17,false,1,1)[0];furniture[0]=extractAtlas(sofa,false,1,1)[0];furniture[1]=extractAtlas(chair,false,1,1)[0];
    const lights=extractAtlas(lightsV27,false,4,2);
    [5,21,53,57].forEach((type,col)=>{
      const off=lights[col],on=lights[4+col];
      // Same outer bounds in both states: switching cannot move a fixture or
      // change its hit target. Keep the original art proportions within them.
      const width=Math.max(off.width,on.width),height=Math.max(off.height,on.height);
      const states=[off,on].map(s=>{const cv=document.createElement('canvas');cv.width=width;cv.height=height;const k=cv.getContext('2d'),scale=Math.min(width/s.width,height/s.height);k.drawImage(s.canvas,(width-s.width*scale)/2,height-s.height*scale,s.width*scale,s.height*scale);const pixels=k.getImageData(0,0,width,height).data,alpha=new Uint8Array(width*height);for(let i=0;i<alpha.length;i++)alpha[i]=pixels[i*4+3];return {canvas:cv,width,height,alpha};});
      lightStates.set(type,states);furniture[type]=states[1];
    });
    const wallArt=extractAtlas(v29Wall,false,4,3,true),projectWall=(art,type)=>S.wall(document,art,C.TYPES[type]);
    [27,28,56,59,62,63,31,29,26].forEach((type,i)=>{if(type!==56&&type!==62)furniture[type]=projectWall(wallArt[i],type);});
    // Raised acoustic slats and hexagons keep their native bevels and side faces.
    furniture[56]=S.volume(document,furniture[56],.455,-.5);
    furniture[62]=S.volume(document,furniture[62],.5,-.5);
    windowStates.set(26,[furniture[26],projectWall(wallArt[9],26)]);
    lightStates.set(57,[projectWall(wallArt[10],57),projectWall(wallArt[11],57)]);furniture[57]=lightStates.get(57)[1];
    const modern=extractAtlas(v29Windows,false,3,2);for(let i=0;i<3;i++){const type=64+i;windowStates.set(type,[projectWall(modern[i],type),projectWall(modern[3+i],type)]);furniture[type]=windowStates.get(type)[0];}
    furniture[32]=S.tank(document,extractAtlas(v29Tank,false,1,1)[0]);
    furniture[9]=furniturePerspective(furniture[9],9);
    const darkAtlases=[[v29DarkBasic,4,4,0],[v29DarkNew,3,2,16],[v29DarkBench,2,2,22],[v29DarkCafe,2,2,36],[v29DarkKitchen,2,2,40],[v29DarkMusic,2,2,44],[v29DarkGaming,4,2,48],[v29DarkAux,2,2,60],[v29DarkSofa,1,1,0],[v29DarkChair,1,1,1],[v29DarkChest,1,1,34],[v29DarkCart,1,1,35]];
    for(const [image,cols,rows,offset] of darkAtlases)extractAtlas(image,false,cols,rows).forEach((art,i)=>{const type=offset+i;if(C.TYPES[type]?.finishes)darkFurniture.set(type,S.fit(document,furniturePerspective(art,type),furniture[type]));});
    furniture.push(...extractAtlas(furnitureV30,false,2,2).map((art,i)=>i<3?S.volume(document,art,i===2?.25:.32):art));
    const newFloor=extractAtlas(furnitureV35,false,2,2);
    furniture.push(S.volume(document,newFloor[0],.35,-.68),S.volume(document,newFloor[1],.42,-.60),S.volume(document,newFloor[2],.34,-.54),newFloor[3]);
    const newProps=extractAtlas(propsV35,false,2,2);
    furniture.push(S.volume(document,newProps[0],.35,-.60),projectWall(newProps[1],76),S.volume(document,newProps[2],.34,-.50),newProps[3]);
    furniture.push(S.volume(document,extractAtlas(rouletteV1,false,1,1)[0],.60,-.60));
    for(let type=80;type<=82;type++)furniture.push(window.HubPosters.sprite({type},C.TYPES[type]));
    furniture.push(extractAtlas(exchangeMachine,false,1,1)[0]);
    const plasma=extractAtlas(tvWall,false,2,1).map(s=>projectWall(s,87)),moon=extractAtlas(lampMoon,false,2,1);
    furniture.push(extractAtlas(monitorWide,false,1,1)[0],extractAtlas(monitorPortrait,false,1,1)[0],furniturePerspective(extractAtlas(tvCinema,false,1,1)[0],86),plasma[1],furniturePerspective(extractAtlas(tableWorkshop,false,1,1)[0],88),moon[1]);
    [plantSun,plantRose,plantEpic].forEach((img,n)=>{const frames=[];for(let i=0;i<3;i++){const cv=document.createElement('canvas');cv.width=Math.round(img.width/3);cv.height=img.height;cv.getContext('2d').drawImage(img,i*img.width/3,0,img.width/3,img.height,0,0,cv.width,cv.height);frames.push(S.sprite(cv));}plantArt.set(90+n,frames);furniture.push(frames[2]);});
    furniture.push(furniturePerspective(extractAtlas(basketMachine,false,1,1)[0],93));
    furniture.push(...[object530,object531,object532,object533].map((img,i)=>furniturePerspective(extractAtlas(img,false,1,1)[0],94+i)),projectWall(extractAtlas(object534,false,1,1)[0],98));
    lightStates.set(87,plasma);lightStates.set(89,moon);
    petSheets=[catV27,dogV27,catGray,catTux,dogChocolate,dogBlack,pet530,pet531,pet532,pet533,pet534].map(img=>extractAtlas(img,true,4,3));
    buildAvatar(a,extractAtlas(parts,true,5,4));
    // Each head atlas declares which face/hair combinations it supplies.
    // One output order is shared by the renderer, validation and saved appearances.
    const allHeads=Array(P.choices.face.length*P.choices.hair.length*4);
    function addHeads(image,faces,hairs){const sheet=extractAtlas(image,true,4,faces.length*hairs.length);let row=0;
      for(const face of faces)for(const hair of hairs){for(let dir=0;dir<4;dir++)allHeads[(face*P.choices.hair.length+hair)*4+dir]=sheet[row*4+dir];row++;}}
    addHeads(heads,[0,1],[0,1]);addHeads(headsNew,[0,1],[2,3]);addHeads(headsGlasses,[2],[0,1,2,3]);
    addHeads(hairV16,[0,1,2],[4,5]);addHeads(facesV16,[3],[0,1,2,3,4,5]);addHeads(hairV18,[0,1,2,3],[6,7]);addHeads(hairV21,[0,1,2,3],[8]);addHeads(hairV22,[0,1,2,3],[9,10]);
    // New expressions are complete illustrated heads, never facial overlays.
    [headsSunglasses,headsMoustache,headsBeard].forEach((image,index)=>{
      const sheet=extractAtlas(image,true,6,4);
      for(let hair=0;hair<11;hair++)for(let dir=0;dir<4;dir++){
        const base=allHeads[hair*4+dir],head=dir<2?sheet[hair*2+dir]:base;
        if(dir<2)head.registrationReference=base;
        allHeads[((index+4)*P.choices.hair.length+hair)*4+dir]=head;
      }
    });
    [hairBraids,hairBlue].forEach((image,n)=>{const sheet=extractAtlas(image,true,4,4),fronts=[0,4,6,8,10,12,14];for(let face=0;face<7;face++)for(let dir=0;dir<4;dir++){const head=sheet[dir<2?fronts[face]+dir:dir];if(dir<2&&face)head.registrationReference=sheet[dir];allHeads[(face*P.choices.hair.length+n+11)*4+dir]=head;}});
    wardrobe=window.VeredaWardrobe.create(document,allHeads,[bodyA,bodyB,bodyC,bodyD,bodyE,bodyF,bodyG,bodyH,bodyI,bodyJ,bodyK].map(img=>extractAtlas(img,true,4,4)),[...extractAtlas(walkApproved,true,4,2),...extractAtlas(walkNew,true,4,2),...extractAtlas(walkV16,true,4,2),...extractAtlas(walkV18,true,4,2),...extractAtlas(walkV21,true,4,2).slice(0,4),...extractAtlas(walkV22,true,4,2)],{dresses:[dressLilac,dressBlack,dressDenim].map(img=>extractAtlas(img,true,4,4)),chainsNew:extractAtlas(chainsV33,true,4,3,true),compiled:window.VEREDA_WARDROBE_CACHE?{entries:window.VEREDA_WARDROBE_CACHE.entries,images:compiledImages}:null,back:[...extractAtlas(backV27,true,4,6),...extractAtlas(backSkate,true,4,1)],night:extractAtlas(upperNight,true,4,4,true),tops:[upperZip,upperCross,upperTank,upperCream,upperWine,top530,top531,top532,top533,top534].map(img=>extractAtlas(img,true,4,4,true)),pants:[pantsBaggy,pantsCross].map(img=>extractAtlas(img,true,4,4,true)),shoes:[shoeStrap,shoePanel,shoeTall,shoeLaces].map(img=>extractAtlas(img,true,4,4,true)),chain:extractAtlas(chainV24,true,4,1)});
    restorePeople();buildRoom();buildCatalog();thumbnail('avatarThumb');thumbnail('chatThumb');ready=true;
    rewardsUI=window.VeredaRewardsUI.create({document,C,P,storage:localStorage,placed:(user,type)=>user==='self'?(online.canEdit()?placedCount(type):online.placedCount(type)):0,environment:roomPickers.map(p=>({...p,label:{wall:'Pared',floor:'Piso',wallPattern:'Diseño de pared',floorPattern:'Diseño de piso',layout:'Sala'}[p.key]})),onChange:()=>updateRoomPickers(),applyEnvironment:item=>{if(!online.canEdit())return false;if(item.slot==='layout')changeRoomLayout(item.value);else setEnvironment(item.slot,item.index);return true;},
      players:()=>[{id:'self',name:online.user.name}],appearance:id=>id==='self'?P.look(myAppearance):P.look(people.actors.get(id)?.appearance),
      sprite:(item,look)=>item.kind==='environment'?environmentPreview(item):item.kind==='object'?furniture[item.type]:item.slot==='pet'?petSheets[item.index-1][0]:wardrobe.rewardPreview(item.slot,item.index,look),
      reducedMotion:()=>reduceMotion||!animationEnabled,now:()=>performance.now(),
      equip:(id,item)=>{if(!owns(id,item.id))return false;if(id==='self'){myAppearance=P.look({...P.look(myAppearance),[item.slot]:item.index});refreshMe();}else{const actor=people.actors.get(id);if(!actor)return false;actor.appearance=P.look({...actor.appearance,[item.slot]:item.index});renderPeople();}savePeople();toast(item.name+' equipado.');return true;},
      place:type=>{if(!owns('self','object:'+type))return false;if(state.items.length+(state.unplacedItems?.length||0)>=C.MAX_ITEMS){toast('Tu sala está llena. El premio sigue en el inventario.');return false;}return startPlacement(type);}
    });
myAppearance=ownedLook('self',myAppearance);for(const actor of people.actors.values())actor.appearance=ownedLook(actor.id,actor.appearance);refreshMe();renderPeople();savePeople();updateRoomPickers();showPanel('inventory');$('loading').hidden=true;updateInput();if(restoreNotice)toast(restoreNotice);if(!storageAvailable){$('saveStatus').className='save-status warning';$('saveStatus').lastChild.textContent=' Sin guardado · solo esta sesión';}else save();window.HubPanels?.ready();online.ready(networkGame);}).catch(error=>{ready=false;console.error(error);$('loading').querySelector('b').textContent='No pudimos abrir minerhub';$('loading').querySelector('span:last-child').textContent=error?.message==='No se pudo cargar una imagen del juego.'?'No se pudo cargar una imagen. Abrí VEREDA-jugar.html o conservá la carpeta assets junto al proyecto.':'Error al iniciar: '+(error?.message||'Error desconocido.');});

  const networkGame={
   portrait,
   room(raw,position){pendingWalk=0;const next=C.restore(raw);if(!next)return;state=next;C.setLayout(state.layout);standUp();cancelSelection();history=[];$('undoBtn').disabled=true;player={...player,...(position||C.findFree(state.items,player)),path:[],moving:false};for(const b of bubbles)removeBubble(b);bubbles=[];people.actors.clear();pets.actors.clear();mode='walk';updateName();buildRoom();updateSwatches();updateRoomPickers();resetView();resize();rewardsUI?.refreshInventory();},
   scene(raw){const next=C.restore(raw);if(!next)return;const changed=state.layout!==next.layout;state=next;C.setLayout(state.layout);buildRoom();if(changed){resetView();resize();}updateName();},
   players(rows){const present=new Set();for(const row of rows){if(row.id===online.user.id)continue;present.add(row.id);let a=people.actors.get(row.id)||people.join(row);if(a)Object.assign(a,{name:row.name,appearance:P.look(row.appearance),petName:row.petName||'',group:row.group||null,x:row.x,y:row.y,path:row.path||[],seat:row.seat||null,moving:false});}for(const id of people.actors.keys())if(!present.has(id))people.remove(id);},
   walk(id,from,path,seq,seat=null){const a=id===online.user.id?player:people.actors.get(id);if(!a)return;
    if(a===player){if(Number.isSafeInteger(seq)&&seq!==pendingWalk)return;pendingWalk=0;standUp();if(mode!=='walk'&&(path.length||seat))setMode('walk');
      const remainder=Number.isSafeInteger(seq)?confirmedRemainder(from,path,player):null;
      if(seat){pendingSeat=seat.itemId;pendingSeatSlot=seat.slot;}
      if(remainder!==null){player.path=remainder;if(!player.path.length)finishSitting();return;}
    }else a.seat=seat;
    Object.assign(a,from,{path:path.slice()});if(a===player&&!player.path.length)finishSitting();
   },
   interaction(itemId,changes){const item=state.items.find(i=>i.id===itemId);if(!item)return;Object.assign(item,changes);if(selectedId===itemId)updateInteraction(item);},
   preview(item,canvas){const s=item.kind==='environment'?environmentPreview(item):item.kind==='object'?furniture[item.type]:item.slot==='pet'?petSheets[item.index-1]?.[0]:wardrobe.rewardPreview(item.slot,item.index,myAppearance);if(!s)return;const k=canvas.getContext('2d'),scale=Math.min((canvas.width-8)/s.width,(canvas.height-8)/s.height);k.clearRect(0,0,canvas.width,canvas.height);k.drawImage(s.canvas,(canvas.width-s.width*scale)/2,(canvas.height-s.height*scale)/2,s.width*scale,s.height*scale);},
   chat:messageFor,
   account(look){myAppearance=P.look(look);refreshMe();updateRoomPickers();rewardsUI?.showPanel(document.getElementById('rewardsPanel').hidden?'inventory':'rewards');},
   stop(){pendingWalk=0;player.path=[];player.moving=false;for(const a of people.actors.values()){a.path=[];a.moving=false;}},
  };
  requestAnimationFrame(tick);
  // Local adapter boundary. A future network connector can call this without coupling identity to rendering.
  window.veredaVisitors={join:entry=>{if(!ready)return null;const a=people.join(entry);if(!a)return null;a.appearance=ownedLook(a.id,a.appearance);renderPeople();savePeople();return {id:a.id,name:a.name,appearance:{...a.appearance}};},leave:forgetActor,message:messageFor,list:()=>people.serialize(),setAppearance:(id,look)=>{const a=people.actors.get(id);if(!a)return false;a.appearance=ownedLook(id,look);renderPeople();savePeople();return true;}};
  // Read-only diagnostics for verifying the demo and keeping future iterations measurable.
  window.veredaRewardsDemo={snapshot:()=>rewardsUI?.snapshot()};
  window.vereda={getState:()=>JSON.parse(JSON.stringify({room:state,visitors:people.serialize(),myAppearance,player:{x:player.x,y:player.y,dir:player.dir,moving:player.moving,path:player.path},mode,selectedId,movingId,pendingType,seatedId,pendingSeat,seatedSlot,pendingSeatSlot,ready,zoom,targetZoom,maxZoom:cameraZoomLimit(),theme,animationEnabled,effectsTime,view,geometry:{origin:origin(),baseY:baseY(),heightMax:C.maxHeight(),width:sceneW,height:sceneH},bubbles:bubbles.length,storageAvailable,doors:[...doorOpenness.values()],wallReveal:{hoveredPartition,revealPartitions,height:PARTITION_HEIGHT,opacity:[...partitionOpacity.values()]}})),screenForTile:(x,y)=>{const p=groundProject(x,y),r=canvas.getBoundingClientRect();return {x:r.left+view.x+p.x*view.s,y:r.top+view.y+p.y*view.s};},getItemBounds:()=>drawBounds.map(b=>({id:b.item.id,type:b.item.type,x:b.x,y:b.y,w:b.w,h:b.h})),core:C};
})();

