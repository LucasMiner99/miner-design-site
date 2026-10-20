const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
(async()=>{
 const {C,CATALOG,R}=await import('../src/hub-rules.mjs'),{validateScene}=await import('../src/hub-world.mjs');
 await import('../public/hub/perimeter.js');await import('../public/hub/lighting.js');const P=globalThis.HubPerimeter,L=globalThis.HubLighting,scope={};vm.runInNewContext(fs.readFileSync(__dirname+'/../public/hub/core.js','utf8'),scope);
 for(const [id,w,seats] of [[111,1,1],[112,1,1],[113,2,2]]){assert.equal(C.TYPES[id].w,w);assert.equal(C.TYPES[id].h,1);assert.equal(C.seatPlaces({type:id}).length,seats);
  for(let rotation=0;rotation<4;rotation++){const item={id:1,type:id,x:4,y:4,rotation};const scene={...C.initial(),items:[item],unplacedItems:[]};assert.equal(C.restore(scene).items.length,1);assert(C.seatApproach([item],{x:2.5,y:2.5},item));assert.equal(C.dimensions(item).w,rotation%2?1:w);}
 }
 const raw={...C.initial(),items:[],unplacedItems:[],wall:16,led:1,ledColor:'#FA2288'},user={name:'Test',inventory:{'environment:wall:16':1,'environment:led:1':1}};
 const scene=validateScene(raw,user,false);assert.equal(scene.ledColor,'#fa2288');assert.deepEqual(JSON.parse(JSON.stringify(scope.VeredaCore.restore(raw))),C.restore(raw));
 assert.throws(()=>validateScene(raw,{name:'Test',inventory:{}},false),e=>e.status===403);
 assert.equal(C.restore({...raw,ledColor:'url(https://example.com)'}).ledColor,'#52dfff');assert.equal(C.restore({...raw,ledColor:{x:1}}).ledColor,'#52dfff');assert.equal(C.restore({...raw,led:5}).led,0);assert.equal(C.restore({...raw,led:undefined,ledColor:undefined}).led,0);
 assert.equal(C.reflow(scene,'grand').ledColor,'#fa2288');
 for(const l of C.LAYOUTS){const paths=P.geometry(C,l);assert(paths.length>=2);for(const p of paths){assert(Object.values(p.a).every(Number.isFinite));assert(Object.values(p.b).every(Number.isFinite));if(p.partition){const mid={x:(p.a.x+p.b.x)/2,y:(p.a.y+p.b.y)/2};assert(!l.doors?.some(d=>mid.x>=d.x&&mid.x<d.x+d.w&&mid.y>=d.y&&mid.y<d.y+d.h));}}}
 const hall=P.geometry(C,'hall');assert.equal(hall.length,2);assert.equal(hall[0].b.y,18);assert.equal(hall[1].b.x,24);
 const grand=P.geometry(C,'grand');assert(grand.some(p=>!p.partition&&p.a.z!==p.b.z),'LED follows vertical level joins');
 const cv=createCanvas(400,300),ctx=cv.getContext('2d'),map=L.create(()=>createCanvas(1,1)),options={enabled:true,bounds:[],extraLights:P.sources([{a:{x:20,y:30},b:{x:320,y:180}}],'#ff0088'),view:{x:0,y:0,s:1},dpr:1,width:400,height:300};
 map.apply(ctx,cv,options);for(let i=0;i<12;i++)map.apply(ctx,cv,{...options,view:{x:i,y:i,s:1+i/10}});assert.equal(map.stats().builds,1);
 let bytes=0;for(const [id,name] of [[111,'banquito-casino'],[112,'sillon-casino'],[113,'sofa-casino'],[114,'lampara-gala'],[115,'lampara-rubi']]){
  assert(R.poolFor(CATALOG,'object').some(i=>i.type===id));for(const f of ['v66-'+name+'.webp',...(id<114?['rotations/'+id+'.webp']:[])]){const file=__dirname+'/../public/hub/assets/'+f;bytes+=fs.statSync(file).size;const im=await loadImage(file),c=createCanvas(im.width,im.height),k=c.getContext('2d');k.drawImage(im,0,0);const p=k.getImageData(0,0,c.width,c.height).data;assert(p.some((v,i)=>i%4===3&&v===0));assert(p.some((v,i)=>i%4===3&&v>240));}
  if(id>=114){assert(L.sources({x:0,y:0,w:28,h:60,item:{type:id}}).length);assert.equal(L.sources({x:0,y:0,w:28,h:60,item:{type:id,on:false}}).length,0);}
 }
 assert(bytes<500000);for(const id of ['environment:wall:16','environment:led:1'])assert(R.poolFor(CATALOG,'environment').some(i=>i.id===id));
 console.log('PASS lounge footprints/seats, rotations, ownership, LED color validation, all layouts/door gaps, stable light cache and compressed assets ('+bytes+' bytes).');
})().catch(e=>{console.error(e);process.exitCode=1;});
