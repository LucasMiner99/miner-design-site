const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('public/hub/game.js','utf8');
const handlers=source.slice(source.indexOf('  function endCameraDrag('),source.indexOf('  let spriteRasterCache='));
const zoom=source.slice(source.indexOf('  function changeZoom('),source.indexOf("  for(const key of ['wallPattern'"));
function setup(){
 const events={},windowEvents={},buttons={},sent=[],capture=new Set();
 const canvas={style:{},title:'',addEventListener:(name,fn)=>events[name]=fn,
  setPointerCapture:id=>capture.add(id),hasPointerCapture:id=>capture.has(id),
  releasePointerCapture:id=>{capture.delete(id);events.lostpointercapture?.({pointerId:id});},
  getBoundingClientRect:()=>({left:10,top:20}),classList:{remove(){}},focus(){}};
 const scope={canvas,window:{addEventListener:(name,fn)=>windowEvents[name]=fn},clearTimeout(){},setTimeout(){return 1;},performance:{now:()=>1000},
  $:id=>buttons[id]??=( {addEventListener:(type,fn)=>buttons[id][type]=fn} ),
  online:{canEdit:()=>true},C:{TYPES:[]},toWorld:e=>({x:e.clientX,y:e.clientY}),unproject:(x,y)=>({x,y}),hitAt:()=>null,
  characterAt:()=>null,doorAtPointer:()=>null,partitionAtPointer:()=>-1,tileInRoom:()=>true,
  walkClick:()=>sent.push('walk'),tryPlace:()=>sent.push('place'),cameraZoomLimit:()=>4};
 vm.createContext(scope);
 vm.runInContext(`let ready=true,cameraDrag=null,objectClickTimer=1,objectClick=null,zoom=1.5,targetZoom=2,zoomAnchor={x:4},pan={x:20,y:30},view={x:120,y:230,s:1,w:900,h:600},hoverTile=null,hoveredPartition=-1,petPointer=null,ghost=null,pointer=null,mode='walk',pendingType=null,movingId=null,reduceMotion=false;function updateView(){view.x=100+pan.x;view.y=200+pan.y;}function resetView(){endCameraDrag();zoom=targetZoom=1;zoomAnchor=null;pan={x:0,y:0};} ${handlers} ${zoom}
 globalThis.read=()=>({cameraDrag,zoom,targetZoom,zoomAnchor,pan:{...pan},view:{...view}});`,scope);
 const emit=(type,extra={})=>{let prevented=false;events[type]({pointerId:1,button:0,buttons:0,clientX:300,clientY:400,preventDefault:()=>prevented=true,...extra});return prevented;};
 return {scope,canvas,emit,capture,sent,buttons,windowEvents,read:()=>scope.read()};
}
const h=setup();
assert(h.emit('pointerdown',{button:1}),'Middle button suppresses browser autoscroll');
assert(h.capture.has(1));assert.equal(h.canvas.style.cursor,'grabbing');
assert.equal(h.read().zoomAnchor,null);assert.equal(h.read().targetZoom,h.read().zoom,'Pan stops zoom easing');
h.emit('pointermove',{buttons:4,clientX:460,clientY:320});
assert.equal(h.read().view.x,280);assert.equal(h.read().view.y,150);
h.emit('pointerdown');assert.equal(h.sent.length,0,'No walking while holding the middle button');
h.emit('pointermove',{pointerId:2,buttons:4,clientX:0});assert.equal(h.read().view.x,280,'Other pointers cannot take over');
h.emit('pointerup',{button:0});assert(h.read().cameraDrag,'Releasing another button keeps panning');
h.emit('pointerup',{button:1});assert.equal(h.read().cameraDrag,null);assert.equal(h.capture.size,0);assert.equal(h.canvas.style.cursor,'');
h.emit('pointerdown');assert.deepEqual(h.sent,['walk'],'Normal walking resumes');
assert(h.emit('auxclick',{button:1}));assert(!h.emit('auxclick',{button:2}),'Right click remains untouched');
for(const finish of ['pointercancel','lostpointercapture','blur','missing-button','wheel','reset']){
 h.emit('pointerdown',{button:1});
 if(finish==='blur')h.windowEvents.blur();else if(finish==='missing-button')h.emit('pointermove');else if(finish==='wheel')h.emit('wheel',{deltaY:-50,deltaMode:0});else if(finish==='reset')h.buttons.zoomLabel.click();else h.emit(finish);
 assert.equal(h.read().cameraDrag,null,finish+' clears camera drag');assert.equal(h.capture.size,0,finish+' releases pointer');
}
h.scope.online.canEdit=()=>false;h.emit('pointerdown',{button:1});const before=h.read().view.x;h.emit('pointermove',{buttons:4,clientX:350});assert.equal(h.read().view.x,before+50,'Visitors can pan');h.emit('pointerup',{button:1});
h.buttons.zoomLabel.click();assert.equal(h.read().view.x,100);assert.equal(h.read().view.y,200);assert.equal(h.read().zoom,1,'Reset recenters and resets zoom');
console.log('PASS camera drag, zoom cancellation, pointer lifecycle, visitors and normal walking');
