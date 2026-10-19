const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const scope={};vm.createContext(scope);for(const name of ['core','people','generator'])vm.runInContext(fs.readFileSync(__dirname+'/../public/hub/'+name+'.js','utf8'),scope);
(async()=>{const shared=await import('../src/hub-rules.mjs');for(const C of [scope.VeredaCore,shared.C]){
 const parent={id:1,type:88,x:2,y:2,flip:false},center={id:2,type:77,x:2,y:2,parentId:1,surfaceX:6,surfaceY:2};
 assert(C.surfaceGrid(parent).length>20);assert(C.canPlace([parent],center));assert.deepEqual(C.surfaceUV(parent,center),C.TYPES[88].surfaceArea.c);
 for(const bad of [{surfaceX:0},{surfaceX:12},{surfaceX:6.5},{surfaceY:Infinity},{surfaceX:NaN},{surfaceX:'6'},{slot:0}])assert(!C.canPlace([parent],{...center,...bad}),'Reject invalid surface coordinates '+JSON.stringify(bad));
 assert(!C.canPlace([parent,center],{...center,id:3}),'No stacking duplicate positions');
 assert(!C.canPlace([parent,center],{...center,id:3,surfaceX:7}),'Prop bases cannot intersect');
 assert(C.canPlace([parent,center],{...center,id:3,surfaceX:10}),'Separated props share one surface');
 const legacy={id:3,type:21,x:2,y:2,parentId:1,slot:0};assert(C.canPlace([parent],legacy));
 const nearest=C.surfaceGrid(parent).map(p=>({...center,...p})).sort((a,b)=>{const uv=C.surfaceUV(parent,legacy),dist=i=>Math.hypot(C.surfaceUV(parent,i).u-uv.u,C.surfaceUV(parent,i).v-uv.v);return dist(a)-dist(b);})[0];
 assert(!C.canPlace([parent,legacy],nearest),'New grid respects legacy occupied slots');
 const scene={...C.initial(),items:[parent,center],unplacedItems:[]},saved=C.restore(JSON.parse(JSON.stringify(scene)));assert(saved);assert.equal(saved.items[1].surfaceX,6);assert.equal(saved.items[1].surfaceY,2);
 const oldScene=C.initial(),oldPositions=JSON.stringify(oldScene.items);assert.equal(JSON.stringify(C.restore(oldScene).items),oldPositions,'Legacy scenes retain every coordinate');
 const items=[{...parent},{...center}];C.moveItem(items,{...parent,x:5,y:5,rotation:2});assert.equal(items[1].x,5);assert.equal(items[1].surfaceX,6);
 C.moveItem(items,{id:2,type:77,x:9,y:9,flip:false});assert.equal(items[1].parentId,undefined);assert.equal(items[1].surfaceX,undefined);
 assert.equal(C.removeItem([parent,center],1).length,0);
 for(let rotation=0;rotation<4;rotation++)assert(C.restore({...scene,items:[{...parent,rotation,flip:!!(rotation%2)},center]}));
 assert(C.restore(C.reflow(scene,'square')),'Reflow preserves valid surface placements');
 assert.equal(C.MAX_ITEMS,128);assert.equal(C.restore({...C.initial(),items:Array.from({length:129},(_,n)=>({id:n+1,type:0,x:0,y:0}))}),null,'Oversized rooms remain bounded');
 for(let i=0;i<5;i++){const room=C.restore({...C.initial(),wallPattern:6+i,floorPattern:7+i});assert.equal(room.wallPattern,6+i);assert.equal(room.floorPattern,7+i);}
 assert.equal(C.TYPES.length,99);assert.equal(shared.CATALOG.filter(i=>i.kind==='object').length,99);
 }
 assert.equal(shared.P.choices.pet.length,12);assert.equal(new Set(shared.CATALOG.map(i=>i.id)).size,shared.CATALOG.length);
 for(let i=0;i<5;i++)for(const id of ['object:'+(94+i),'look:top:'+(19+i),'look:pet:'+(7+i),'environment:wallPattern:'+(6+i),'environment:floorPattern:'+(7+i)])assert(shared.CATALOG.some(i=>i.id===id&&!i.starter),'New content unlocks through inventory: '+id);
 assert.equal(shared.P.choices.top.length,24);assert.equal(shared.P.choices.hair.length,13);assert.equal(shared.P.choices.back.length,8);
 for(const id of ['look:top:16','look:top:17','look:top:18','look:hair:11','look:hair:12','look:back:7','object:84','object:89'])assert(shared.CATALOG.find(i=>i.id===id&&!i.starter));
 for(const layout of ['square','grand']){const room=scope.VeredaGenerator.generate(scope.VeredaCore,{seed:45,layout});assert(scope.VeredaCore.restore(room));assert.equal(room.items.length+(room.unplacedItems?.length||0),99,'Generation keeps every object, placed or reserved');}
 console.log('Fine surfaces: center, boundaries, collisions, legacy saves, rotations, reflow, authoritative catalog OK.');
})();
