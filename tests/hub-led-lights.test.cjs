const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
(async()=>{
 const {C,CATALOG,R}=await import('../src/hub-rules.mjs');
 await import('../public/hub/scenery.js');await import('../public/hub/lighting.js');
 const S=globalThis.VeredaScenery,L=globalThis.HubLighting,document={createElement:()=>createCanvas(1,1)};
 let bytes=0;
 for(const [n,name] of ['barra-led','tira-led','panel-hexagonal','arco-neon','farol-moderno'].entries()){
  const id=101+n,t=C.TYPES[id];assert.equal(t.interaction,'light');assert(t.lightAtlas);
  assert(R.poolFor(CATALOG,'object').some(i=>i.id==='object:'+id));assert(!R.poolFor(CATALOG,'plantation').some(i=>i.id==='object:'+id));
  for(const file of ['v61-'+name+'.webp',...(!t.wall?['rotations/'+id+'.webp']:[])]){
   const p=path.join(__dirname,'../public/hub/assets',file);bytes+=fs.statSync(p).size;
   const image=await loadImage(p),states=S.lightFrames(document,image);assert.equal(states.length,2);
   assert.equal(states[0].width,states[1].width);assert.equal(states[0].height,states[1].height);
   assert(states.every(s=>s.alpha.some(a=>a===0)&&s.alpha.some(a=>a>200)));
   const a=states[0].canvas.getContext('2d').getImageData(0,0,states[0].width,states[0].height).data,b=states[1].canvas.getContext('2d').getImageData(0,0,states[1].width,states[1].height).data;
   assert(a.some((v,i)=>v!==b[i]),'Each state is distinct art');
   if(t.wall){const wall=states.map(s=>S.wall(document,s,t));assert.equal(wall[0].height,wall[1].height);assert.equal(wall[0].wallPlane.slope,.5);}
  }
  const b={x:100,y:80,w:t.width,h:90,flip:false,ground:{x:114,y:165},item:{type:id}};
  const source=L.sources(b);assert(source.length>0);assert(source.every(s=>s.radius>0));assert.equal(L.sources({...b,item:{type:id,on:false}}).length,0);
  const cache=L.create(()=>createCanvas(1,1)),screen=createCanvas(900,640),k=screen.getContext('2d'),scene=createCanvas(900,640),options={enabled:true,bounds:[b],view:{x:0,y:0,s:1},dpr:1,width:900,height:640};
  cache.glow(k,b);cache.apply(k,scene,options);
  for(let i=0;i<20;i++){cache.glow(k,{...b,x:b.x+i});cache.apply(k,scene,{...options,view:{x:i,y:i,s:1+i/10}});}
  assert.equal(cache.stats().builds,1,'Zoom does not rebuild lighting');assert.equal(cache.stats().haloBuilds,1,'Movement reuses the glow');
  cache.apply(k,scene,{...options,bounds:[{...b,item:{type:id,on:false}}]});assert.equal(cache.stats().builds,2);
 }
 const strip={x:0,y:0,w:116,h:66,item:{type:102}},left=L.sources({...strip,flip:true}),right=L.sources({...strip,flip:false});
 assert.equal(left[0].x,right.at(-1).x);assert.equal(left[0].y,right[0].y,'Wall mirroring moves emitters with their artwork');
 assert(bytes<500000,'New light states stay below 500 KB total');
 console.log('PASS five lights: catalog, front/rear on/off artwork, alpha, registered bounds, wall projection, mirrored emitters, cached zoom/pan and compression; '+bytes+' bytes.');
})().catch(e=>{console.error(e);process.exitCode=1;});
