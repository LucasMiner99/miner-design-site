const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
(async()=>{
 const {C,CATALOG,R}=await import('../src/hub-rules.mjs');await import('../public/hub/scenery.js');await import('../public/hub/lighting.js');
 const S=globalThis.VeredaScenery,L=globalThis.HubLighting,document={createElement:()=>createCanvas(1,1)},client={};
 vm.runInNewContext(fs.readFileSync(__dirname+'/../public/hub/core.js','utf8'),client);
 assert.equal(client.VeredaCore.TYPES.length,C.TYPES.length);assert.equal(new Set(CATALOG.map(i=>i.id)).size,CATALOG.length);
 let bytes=0;
 for(const [n,name] of ['valla-terciopelo','bandeja-fichas','dados-fortuna','cartel-casino'].entries()){
  const id=107+n,t=C.TYPES[id];assert.equal(t.sprite,id);assert(R.poolFor(CATALOG,'object').some(i=>i.type===id));assert(!R.poolFor(CATALOG,'plantation').some(i=>i.type===id));
  for(const file of ['v64-'+name+'.webp',...(t.wall?[]:['rotations/'+id+'.webp'])]){
   const p=path.join(__dirname,'../public/hub/assets',file);bytes+=fs.statSync(p).size;const image=await loadImage(p),cv=createCanvas(image.width,image.height);cv.getContext('2d').drawImage(image,0,0);
   const a=S.sprite(cv).alpha;assert(a.some(v=>v===0)&&a.some(v=>v>240),'Transparent cutout with solid artwork');
   if(t.wall){const states=S.lightFrames(document,image).map(s=>S.wall(document,s,t));assert.equal(states[0].width,states[1].width);assert.equal(states[0].height,states[1].height);assert.notDeepEqual(states[0].canvas.toBuffer('image/png'),states[1].canvas.toBuffer('image/png'));assert.equal(states[0].wallPlane.slope,.5);}
  }
  for(let rotation=0;rotation<4;rotation++){
   const item=t.wall?{id:1,type:id,wallSide:rotation%2?'left':'right',wallU:5,wallZ:85,on:false}:{id:1,type:id,x:4,y:4,rotation};
   const scene={...C.initial(),items:[item],unplacedItems:[],floor:12,floorPattern:12,wallPattern:11};
   const restored=C.restore(scene);assert.equal(restored.items.length,1);assert.equal(restored.items[0].type,id);assert.equal(restored.floor,12);assert.equal(restored.floorPattern,12);assert.equal(restored.wallPattern,11);
   assert.deepEqual(JSON.parse(JSON.stringify(client.VeredaCore.restore(scene))),restored);
  }
 }
 const scene={...C.initial(),items:[{id:1,type:2,x:3,y:3},{id:2,type:108,x:3,y:3,parentId:1,surfaceX:4,surfaceY:4}],unplacedItems:[]};assert.equal(C.restore(scene).items[1].parentId,1,'Chip tray uses the fine tabletop grid');
 for(const id of ['environment:floor:12','environment:wallPattern:11','environment:floorPattern:12'])assert(R.poolFor(CATALOG,'environment').some(i=>i.id===id));
 const sample=createCanvas(100,50),q=sample.getContext('2d');q.fillStyle='#ff0000';q.fillRect(0,0,50,50);q.fillStyle='#0000ff';q.fillRect(50,0,50,50);
 for(const side of [-1,1]){const art=S.wall(document,S.sprite(sample),C.TYPES[110],side),k=art.canvas.getContext('2d');assert.equal(art.wallPlane.slope,side*.5);for(const x of [64,448]){const y=Math.floor(art.wallPlane.height/2+(side>0?x*.5:256-x*.5)),p=k.getImageData(x,y,1,1).data;assert(p[x<256?0:2]>240,'Both wall planes preserve left-to-right lettering');}}
 const b={x:0,y:0,w:108,h:100,flip:false,item:{type:110}};assert(L.sources(b).length);assert.equal(L.sources({...b,item:{type:110,on:false}}).length,0);
 assert(bytes<400000,'Complete pack, including rear and lighting states, stays compact');
 console.log('PASS casino pack: client/server catalog, box pools, four rotations, tabletop placement, new environment persistence, transparent art, wall lighting states and compressed size ('+bytes+' bytes).');
})().catch(e=>{console.error(e);process.exitCode=1;});
