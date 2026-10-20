const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {createCanvas}=require('@napi-rs/canvas');
(async()=>{
 const {C,CATALOG,R}=await import('../src/hub-rules.mjs'),{validateScene}=await import('../src/hub-world.mjs');
 const client={};vm.runInNewContext(fs.readFileSync(__dirname+'/../public/hub/core.js','utf8'),client);
 const lamp={id:2,type:116,x:4,y:4,on:false},chair={id:1,type:112,x:4,y:4,rotation:3},raw={...C.initial(),items:[chair,lamp],unplacedItems:[]};
 assert(C.canPlace([chair],lamp,{x:4.5,y:4.5}),'Ceiling can overlap furniture and players');
 assert(C.canPlace([lamp],chair),'Ground objects can go below ceiling objects');
 assert(!C.blocked([lamp],4,4),'Ceiling does not block walking');assert(C.pathfind([lamp],{x:3,y:4},{x:4,y:4}));
 assert(!C.canPlace([lamp],{...lamp,id:3}),'Ceiling objects cannot overlap each other');
 assert(!C.canPlace([], {...lamp,parentId:1}));assert(!C.canPlace([],{...lamp,x:-.5}));assert(!C.canPlace([],{...lamp,x:Infinity}));
 assert.deepEqual(JSON.parse(JSON.stringify(client.VeredaCore.restore(raw))),C.restore(raw));
 for(const items of [[chair,lamp],[lamp,chair]])assert.equal(C.restore({...raw,items}).items.length,2);
 const inventory={'object:112':1,'object:116':1};assert.equal(validateScene(raw,{name:'Test',inventory},false).items.length,2);
 assert.throws(()=>validateScene(raw,{name:'Test',inventory:{'object:112':1}},false),e=>e.status===403);
 assert(R.poolFor(CATALOG,'object').some(i=>i.type===116));
 for(const l of C.LAYOUTS){const s=C.reflow(raw,l.id);assert.equal(s.items.length+(s.unplacedItems?.length||0),2);assert(C.restore(s));}
 const scope={document:{createElement:()=>createCanvas(1,1)}};vm.runInNewContext(fs.readFileSync(__dirname+'/../public/hub/disco.js','utf8'),scope);
 const cv=createCanvas(500,500),k=cv.getContext('2d'),project=(x,y)=>({x:250+(x-y)*32,y:(x+y)*16});
 const draw=(on,time)=>{k.clearRect(0,0,500,500);scope.HubDisco.floor(k,[{...lamp,on}],C,project,time,true);return cv.toBuffer('image/png');};
 const off=draw(false,0),a=draw(true,0),b=draw(true,2000);assert.notDeepEqual(a,b);assert.notDeepEqual(a,off);assert.deepEqual(draw(false,2000),off);
 await import('../public/hub/lighting.js');const lighting=globalThis.HubLighting,field=lighting.create(()=>createCanvas(1,1)),bounds=[{x:100,y:20,w:38,h:57,ground:{x:119,y:175},item:{...lamp,on:true}}];
 for(let i=0;i<10;i++)field.apply(k,cv,{enabled:true,bounds,view:{x:i,y:0,s:1+i*.1},dpr:1,width:500,height:500});assert.equal(field.stats().builds,1);
 assert.equal(lighting.sources({...bounds[0],item:lamp}).length,0);
 console.log('PASS ceiling placement, overlap layers, walking, layout changes, inventory authority, persistence, animated/off disco and stable lighting cache.');
})().catch(e=>{console.error(e);process.exitCode=1;});
