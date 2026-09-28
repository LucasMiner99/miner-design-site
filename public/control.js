const API = "/api/streambot/mod";
const $ = (id) => document.getElementById(id);
const state = {
  me:null, assets:[], items:[], selectedId:null, interacting:false, mediaReady:false, socket:null,
  snap: localStorage.getItem("minerbot.overlay.snap") !== "0",
  aspectLock: localStorage.getItem("minerbot.overlay.aspectLock") !== "0",
};
let reconnectTimer = null;
let saveTimer = null;
let previewTimer = null;
let lastPreviewAt = 0;
let pendingPreview = null;
let uploadFile = null;

async function api(path, options={}) {
  const res = await fetch(`${API}${path}`, { credentials:"same-origin", cache:"no-store", ...options });
  const text = await res.text();
  let data={}; try{data=text?JSON.parse(text):{}}catch{data={error:text||`Error ${res.status}`}}
  if(!res.ok){const e=new Error(data.error||`Error ${res.status}`);e.status=res.status;throw e}
  return data;
}

function toast(message,error=false){const el=$("toast");el.textContent=message;el.classList.toggle("error",error);el.classList.remove("hidden");clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.add("hidden"),2800)}
function esc(v){return String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]))}
function bytes(v){const n=Number(v||0);if(n<1024)return`${n} B`;if(n<1024**2)return`${(n/1024).toFixed(1)} KB`;return`${(n/1024**2).toFixed(1)} MB`}
function clamp(n,min,max){return Math.max(min,Math.min(max,n))}

function realtimeUrl(){const proto=location.protocol==="https:"?"wss":"ws";return `${proto}://${location.host}/api/streambot/realtime/ws?role=control`}
function connectRealtime(){
  clearTimeout(reconnectTimer);
  try{if(state.socket&&state.socket.readyState<=1)state.socket.close()}catch{}
  let ws;try{ws=new WebSocket(realtimeUrl())}catch{return scheduleReconnect()}
  state.socket=ws;
  ws.addEventListener("message",event=>{let msg;try{msg=JSON.parse(event.data)}catch{return}
    if(msg.type==="scene.preview"&&msg.item){applyRemotePreview(msg.item);return}
    if(msg.type==="scene.refresh"){refreshScene();return}
    if(msg.type==="library.refresh"){refreshAll();return}
  });
  ws.addEventListener("close",scheduleReconnect);
  ws.addEventListener("error",()=>{try{ws.close()}catch{}});
}
function scheduleReconnect(){clearTimeout(reconnectTimer);reconnectTimer=setTimeout(connectRealtime,1500)}
function previewPayload(item){return{id:item.id,...itemPayload(item)}}
function sendPreview(item){
  pendingPreview=previewPayload(item);const now=performance.now();const wait=Math.max(0,34-(now-lastPreviewAt));
  if(previewTimer)return;previewTimer=setTimeout(()=>{previewTimer=null;const ws=state.socket;if(!pendingPreview||!ws||ws.readyState!==WebSocket.OPEN)return;lastPreviewAt=performance.now();try{ws.send(JSON.stringify({type:"scene.preview",item:pendingPreview}))}catch{}pendingPreview=null},wait)
}
function applyRemotePreview(preview){const item=state.items.find(x=>x.id===String(preview.id||""));if(!item)return;for(const key of ["x","y","width","height","rotation","opacity","volume","zIndex"]){if(key in preview&&Number.isFinite(Number(preview[key])))item[key]=Number(preview[key])}updateItemElement(item)}

async function login(){try{const d=await api("/oauth/start?json=1");if(d.url)location.href=d.url}catch(e){$("loginMessage").textContent=e.message}}
async function logout(){try{await api("/logout",{method:"POST"})}catch{}location.reload()}

async function boot(){
  $("snapToggle").checked=state.snap;$("aspectLock").checked=state.aspectLock;
  if(new URLSearchParams(location.search).get("denied")){ $("loginMessage").textContent="Tu cuenta de Kick no está autorizada para este panel."; history.replaceState(null,"","/control.html"); }
  try{
    const d=await api("/bootstrap");
    state.me=d.me; state.assets=d.assets||[]; state.items=d.items||[]; state.mediaReady=Boolean(d.mediaReady);
    $("loginScreen").classList.add("hidden"); $("app").classList.remove("hidden");
    paintHeader(d); paintLibrary(); paintStage(); paintInspector(); paintFileSelection();
    connectRealtime();
  }catch(e){
    if(e.status!==401) $("loginMessage").textContent=e.message;
    $("loginScreen").classList.remove("hidden");
  }
}

function paintHeader(d){
  $("whoami").textContent=`@${state.me.username}${state.me.isOwner?" · owner":""}`;
  const status=$("liveStatus");
  status.textContent=d.controlEnabled||state.me.isOwner?"Control habilitado":"Control pausado";
  status.classList.toggle("online",Boolean(d.controlEnabled||state.me.isOwner));status.classList.toggle("paused",!d.controlEnabled&&!state.me.isOwner);
  $("r2Warning").classList.toggle("hidden",state.mediaReady);
  $("uploadBox").classList.toggle("hidden",!state.me.permissions.upload);
  $("hideAll").disabled=!state.me.permissions.control;
}

function paintLibrary(){
  const host=$("assetList");host.innerHTML="";$("assetCount").textContent=String(state.assets.length);
  for(const asset of state.assets){
    const card=document.createElement("div");card.className="asset-card";
    const preview=asset.media_type==="video"?`<video src="${esc(asset.fileUrl)}" muted preload="metadata"></video>`:`<img src="${esc(asset.fileUrl)}" alt=""/>`;
    const typeLabel=asset.media_type==="video"?"VIDEO":"IMAGEN";
    card.innerHTML=`<div class="asset-thumb">${preview}<span class="asset-type">${typeLabel}</span></div><div class="asset-body"><div class="asset-info"><b title="${esc(asset.name)}">${esc(asset.name)}</b><small>${bytes(asset.size_bytes)}</small></div><div class="asset-actions"><button class="secondary add">＋ Agregar</button>${state.me.permissions.delete?'<button class="danger delete" title="Borrar de la biblioteca">×</button>':''}</div></div>`;
    const add=card.querySelector(".add");add.disabled=!state.me.permissions.control;add.onclick=()=>addAsset(asset.id);
    card.ondblclick=()=>{if(state.me.permissions.control)addAsset(asset.id)};
    const del=card.querySelector(".delete");if(del)del.onclick=()=>deleteAsset(asset);
    host.appendChild(card);
  }
  if(!state.assets.length)host.innerHTML='<div class="library-empty"><b>Biblioteca vacía</b><span>Subí una imagen o video para empezar.</span></div>';
}

function selectUploadFile(file){
  if(!file){uploadFile=null;$("mediaFile").value="";paintFileSelection();return}
  if(file.size>25*1024*1024){toast("El archivo supera el máximo de 25 MB.",true);return}
  const allowed=["image/png","image/jpeg","image/webp","image/gif","video/webm","video/mp4"];
  if(!allowed.includes(file.type)){toast("Formato no compatible.",true);return}
  uploadFile=file;paintFileSelection();
}
function paintFileSelection(){
  const box=$("fileSelection");box.classList.toggle("hidden",!uploadFile);$("uploadButton").disabled=!uploadFile;
  if(uploadFile){$("selectedFileName").textContent=uploadFile.name;$("selectedFileMeta").textContent=`${bytes(uploadFile.size)} · ${uploadFile.type.includes("video")?"video":"imagen"}`}
}
async function upload(){
  const file=uploadFile;if(!file)return toast("Elegí un archivo.",true);
  const fd=new FormData();fd.append("file",file);
  try{$("uploadButton").disabled=true;$("uploadButton").textContent="Subiendo…";await api("/assets",{method:"POST",body:fd});selectUploadFile(null);toast("Archivo subido.");await refreshAll()}catch(e){toast(e.message,true)}finally{$("uploadButton").textContent="Subir a biblioteca";$("uploadButton").disabled=!uploadFile}
}

async function deleteAsset(asset){if(!confirm(`¿Borrar ${asset.name} de la biblioteca?`))return;try{await api(`/assets/${encodeURIComponent(asset.id)}`,{method:"DELETE"});if(state.items.some(x=>x.assetId===asset.id))state.selectedId=null;await refreshAll();toast("Archivo borrado.")}catch(e){toast(e.message,true)}}
async function addAsset(assetId){try{const d=await api("/items",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({assetId})});await refreshScene();state.selectedId=d.id;paintStage();paintInspector();toast("Asset agregado al canvas.")}catch(e){toast(e.message,true)}}

function itemAsset(item){return state.assets.find(a=>a.id===item.assetId)}
function itemFileUrl(item){return itemAsset(item)?.fileUrl||""}

function paintStage(){
  const stage=$("stage");stage.querySelectorAll(".scene-item").forEach(el=>el.remove());stage.classList.remove("snap-x","snap-y");
  $("emptyStage").classList.toggle("hidden",Boolean(state.items.length));
  for(const item of state.items){
    const el=document.createElement("div");el.className=`scene-item${item.id===state.selectedId?" selected":""}${item.visible?"":" hidden-live"}`;el.dataset.id=item.id;
    Object.assign(el.style,{left:`${item.x*100}%`,top:`${item.y*100}%`,width:`${item.width*100}%`,height:`${item.height*100}%`,transform:`rotate(${item.rotation}deg)`,opacity:String(item.opacity),zIndex:String(item.zIndex)});
    const src=itemFileUrl(item);el.innerHTML=item.mediaType==="video"?`<video src="${esc(src)}" muted preload="metadata"></video><i class="resize-handle"></i>`:`<img src="${esc(src)}" alt=""/><i class="resize-handle"></i>`;
    el.addEventListener("pointerdown",e=>startDrag(e,item.id));
    el.querySelector(".resize-handle").addEventListener("pointerdown",e=>startResize(e,item.id));
    stage.appendChild(el);
  }
}

function selectItem(id){state.selectedId=id;paintStage();paintInspector()}
function snapPosition(x,y,item,stageRect){
  if(!state.snap)return{x,y,sx:false,sy:false};
  const tx=Math.max(7/stageRect.width,.006),ty=Math.max(7/stageRect.height,.008);let sx=false,sy=false;
  const xTargets=[0,.5-item.width/2,1-item.width];const yTargets=[0,.5-item.height/2,1-item.height];
  for(const target of xTargets){if(Math.abs(x-target)<=tx){x=target;sx=true;break}}
  for(const target of yTargets){if(Math.abs(y-target)<=ty){y=target;sy=true;break}}
  return{x,y,sx,sy};
}
function setSnapGuides(sx,sy){$("stage").classList.toggle("snap-x",Boolean(sx));$("stage").classList.toggle("snap-y",Boolean(sy))}

function startDrag(e,id){
  if(!state.me.permissions.control)return;if(e.target.classList.contains("resize-handle"))return;
  e.preventDefault();selectItem(id);state.interacting=true;
  const stage=$("stage").getBoundingClientRect();const item=state.items.find(x=>x.id===id);const sx=e.clientX,sy=e.clientY,ox=item.x,oy=item.y;
  const move=ev=>{let x=ox+(ev.clientX-sx)/stage.width,y=oy+(ev.clientY-sy)/stage.height;const snapped=snapPosition(x,y,item,stage);item.x=snapped.x;item.y=snapped.y;setSnapGuides(snapped.sx,snapped.sy);updateItemElement(item);sendPreview(item)};
  const up=()=>{window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",up);state.interacting=false;setSnapGuides(false,false);sendPreview(item);saveItem(item,true)};
  window.addEventListener("pointermove",move);window.addEventListener("pointerup",up,{once:true});
}

function startResize(e,id){
  if(!state.me.permissions.control)return;e.preventDefault();e.stopPropagation();selectItem(id);state.interacting=true;
  const stage=$("stage").getBoundingClientRect();const item=state.items.find(x=>x.id===id);const sx=e.clientX,sy=e.clientY,ow=item.width,oh=item.height;const ratio=ow/Math.max(.0001,oh);
  const move=ev=>{
    const dx=(ev.clientX-sx)/stage.width,dy=(ev.clientY-sy)/stage.height;
    if(state.aspectLock){
      if(Math.abs(dx)>=Math.abs(dy)){item.width=Math.max(.02,ow+dx);item.height=Math.max(.02,item.width/ratio)}
      else{item.height=Math.max(.02,oh+dy);item.width=Math.max(.02,item.height*ratio)}
    }else{item.width=Math.max(.02,ow+dx);item.height=Math.max(.02,oh+dy)}
    updateItemElement(item);sendPreview(item)
  };
  const up=()=>{window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",up);state.interacting=false;sendPreview(item);saveItem(item,true)};
  window.addEventListener("pointermove",move);window.addEventListener("pointerup",up,{once:true});
}

function updateItemElement(item){const el=document.querySelector(`.scene-item[data-id="${CSS.escape(item.id)}"]`);if(!el)return;Object.assign(el.style,{left:`${item.x*100}%`,top:`${item.y*100}%`,width:`${item.width*100}%`,height:`${item.height*100}%`,transform:`rotate(${item.rotation}deg)`,opacity:String(item.opacity),zIndex:String(item.zIndex)})}
function itemPayload(item){return{x:item.x,y:item.y,width:item.width,height:item.height,rotation:item.rotation,opacity:item.opacity,volume:item.volume,zIndex:item.zIndex,loop:item.loop,durationMs:item.durationMs}}
function scheduleSave(item){sendPreview(item);clearTimeout(saveTimer);saveTimer=setTimeout(()=>saveItem(item,true),450)}
async function saveItem(item,quiet=true){try{await api(`/items/${encodeURIComponent(item.id)}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(itemPayload(item))})}catch(e){if(!quiet)toast(e.message,true)}}

function paintInspector(){
  const item=state.items.find(x=>x.id===state.selectedId);$("inspector").classList.toggle("hidden",!item);$("inspectorEmpty").classList.toggle("hidden",Boolean(item));$("selectedStatus").classList.toggle("hidden",!item);
  if(!item){$("selectedName").textContent="Nada seleccionado";return}
  $("selectedName").textContent=item.assetName;
  const status=$("selectedStatus");status.textContent=item.visible?"EN VIVO":"OCULTO";status.classList.toggle("live",Boolean(item.visible));
  $("duration").value=(item.durationMs/1000).toString();$("volume").value=Math.round(item.volume*100);$("opacity").value=Math.round(item.opacity*100);$("rotation").value=Math.round(item.rotation);$("loop").checked=Boolean(item.loop);$("loopRow").classList.toggle("hidden",item.mediaType!=="video");
  paintRangeValues();
}
function paintRangeValues(){$("volumeValue").textContent=`${$("volume").value}%`;$("opacityValue").textContent=`${$("opacity").value}%`;$("rotationValue").textContent=`${$("rotation").value}°`}

function selected(){return state.items.find(x=>x.id===state.selectedId)}
async function showSelected(){const item=selected();if(!item)return;item.durationMs=Math.max(0,Number($("duration").value||0)*1000);await saveItem(item);try{await api(`/items/${encodeURIComponent(item.id)}/show`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({durationMs:item.durationMs})});item.visible=true;item.playNonce=(item.playNonce||0)+1;paintStage();paintInspector();toast(item.mediaType==="video"?"Video enviado al stream.":"Imagen mostrada en stream.")}catch(e){toast(e.message,true)}}
async function hideSelected(){const item=selected();if(!item)return;try{await api(`/items/${encodeURIComponent(item.id)}/hide`,{method:"POST"});item.visible=false;paintStage();paintInspector();toast("Elemento ocultado.")}catch(e){toast(e.message,true)}}
async function removeSelected(){const item=selected();if(!item||!confirm("¿Quitar este elemento del canvas?"))return;try{await api(`/items/${encodeURIComponent(item.id)}`,{method:"DELETE"});state.selectedId=null;await refreshScene()}catch(e){toast(e.message,true)}}
async function setZ(front){const item=selected();if(!item)return;const zs=state.items.map(x=>Number(x.zIndex)||0);item.zIndex=front?Math.max(0,...zs)+1:Math.min(0,...zs)-1;sendPreview(item);await saveItem(item);paintStage()}
async function hideAll(){if(!confirm("¿Ocultar todo lo que está puesto sobre el stream?"))return;try{await api("/clear",{method:"POST"});state.items.forEach(i=>i.visible=false);paintStage();paintInspector();toast("Overlay limpio.")}catch(e){toast(e.message,true)}}

async function duplicateSelected(){
  const item=selected();if(!item)return;
  try{
    const created=await api("/items",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({assetId:item.assetId})});
    const zs=state.items.map(x=>Number(x.zIndex)||0);
    const copy={...item,id:created.id,x:item.x+.025,y:item.y+.025,zIndex:Math.max(0,...zs)+1,visible:false};
    await api(`/items/${encodeURIComponent(created.id)}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(itemPayload(copy))});
    await refreshScene();state.selectedId=created.id;paintStage();paintInspector();toast("Elemento duplicado.");
  }catch(e){toast(e.message,true)}
}

function applyPreset(name){
  const item=selected();if(!item)return;const m=.025;
  const positions={
    tl:[m,m],tc:[.5-item.width/2,m],tr:[1-item.width-m,m],
    ml:[m,.5-item.height/2],cc:[.5-item.width/2,.5-item.height/2],mr:[1-item.width-m,.5-item.height/2],
    bl:[m,1-item.height-m],bc:[.5-item.width/2,1-item.height-m],br:[1-item.width-m,1-item.height-m]
  };
  const p=positions[name];if(!p)return;item.x=p[0];item.y=p[1];updateItemElement(item);sendPreview(item);saveItem(item,true)
}
function fullscreenSelected(){const item=selected();if(!item)return;Object.assign(item,{x:0,y:0,width:1,height:1,rotation:0});updateItemElement(item);sendPreview(item);saveItem(item,true);paintInspector()}
function resetSelected(){const item=selected();if(!item)return;Object.assign(item,{x:.35,y:.30,width:.30,height:.30,rotation:0,opacity:1});updateItemElement(item);sendPreview(item);saveItem(item,true);paintInspector()}

function bindInspector(){
  $("duration").addEventListener("change",()=>{const i=selected();if(!i)return;i.durationMs=Math.max(0,Number($("duration").value||0)*1000);saveItem(i)});
  $("volume").addEventListener("input",()=>{const i=selected();if(!i)return;i.volume=Number($("volume").value)/100;paintRangeValues();scheduleSave(i)});
  $("opacity").addEventListener("input",()=>{const i=selected();if(!i)return;i.opacity=Number($("opacity").value)/100;paintRangeValues();updateItemElement(i);scheduleSave(i)});
  $("rotation").addEventListener("input",()=>{const i=selected();if(!i)return;i.rotation=Number($("rotation").value);paintRangeValues();updateItemElement(i);scheduleSave(i)});
  for(const id of ["volume","opacity","rotation"]){$(id).addEventListener("change",()=>{const i=selected();if(i)saveItem(i,true)})}
  $("loop").addEventListener("change",()=>{const i=selected();if(!i)return;i.loop=$("loop").checked;saveItem(i)});
  $("aspectLock").addEventListener("change",()=>{state.aspectLock=$("aspectLock").checked;localStorage.setItem("minerbot.overlay.aspectLock",state.aspectLock?"1":"0")});
  document.querySelectorAll(".preset").forEach(btn=>btn.addEventListener("click",()=>applyPreset(btn.dataset.preset)));
}

function bindUpload(){
  const input=$("mediaFile"),zone=$("dropZone");
  zone.addEventListener("click",()=>input.click());
  input.addEventListener("change",()=>selectUploadFile(input.files?.[0]||null));
  $("clearFile").addEventListener("click",()=>selectUploadFile(null));
  for(const type of ["dragenter","dragover"]){zone.addEventListener(type,e=>{e.preventDefault();zone.classList.add("dragover")})}
  for(const type of ["dragleave","drop"]){zone.addEventListener(type,e=>{e.preventDefault();zone.classList.remove("dragover")})}
  zone.addEventListener("drop",e=>selectUploadFile(e.dataTransfer?.files?.[0]||null));
}

async function refreshAll(){if(state.interacting)return;try{const d=await api("/bootstrap");state.me=d.me;state.assets=d.assets||[];state.items=d.items||[];state.mediaReady=Boolean(d.mediaReady);paintHeader(d);paintLibrary();if(state.selectedId&&!state.items.some(x=>x.id===state.selectedId))state.selectedId=null;paintStage();paintInspector()}catch(e){if(e.status===401)location.reload()}}
async function refreshScene(){if(state.interacting)return;try{const d=await api("/bootstrap");state.items=d.items||[];state.assets=d.assets||state.assets;if(state.selectedId&&!state.items.some(x=>x.id===state.selectedId))state.selectedId=null;paintStage();paintInspector()}catch(e){if(e.status===401)location.reload()}}

$("loginKick").onclick=login;$("logout").onclick=logout;$("uploadButton").onclick=upload;$("refreshScene").onclick=refreshAll;$("hideAll").onclick=hideAll;$("showItem").onclick=showSelected;$("hideItem").onclick=hideSelected;$("removeItem").onclick=removeSelected;$("bringFront").onclick=()=>setZ(true);$("sendBack").onclick=()=>setZ(false);$("duplicateItem").onclick=duplicateSelected;$("fitFullscreen").onclick=fullscreenSelected;$("resetTransform").onclick=resetSelected;
$("snapToggle").addEventListener("change",()=>{state.snap=$("snapToggle").checked;localStorage.setItem("minerbot.overlay.snap",state.snap?"1":"0")});
bindUpload();bindInspector();boot();
