const assert=require('node:assert/strict');
(async()=>{const {C}=await import('../src/hub-rules.mjs');
 const table={id:1,type:60,x:2.5,y:3.5},tv={id:2,type:86,x:5.5,y:2},scene={...C.initial(),items:[table,tv]};
 assert(C.canPlace([],table));assert(C.restore(scene));assert.equal(C.restore(scene).items[0].x,2.5);
 for(const invalid of [.25,2.1,NaN,Infinity,-.5,'2.5'])assert(!C.canPlace([],{...table,x:invalid}));
 assert(!C.canPlace([],{...table,x:10.5}),'Partial cell outside the room is rejected');
 assert(!C.canPlace([],{...table,x:11.5}));
 assert(C.blocked([table],2,3),'Leading partial tile blocks walking');assert(C.blocked([table],4,4),'Trailing partial tile blocks walking');assert(!C.blocked([table],5,4));
 assert(!C.canPlace([table],{id:3,type:23,x:4,y:3.5}),'Fractional furniture footprints collide');
 assert(C.canPlace([table],{id:3,type:23,x:4.5,y:3.5}),'Touching edges are permitted');
 assert(!C.canPlace([],table,{x:2.5,y:3.5}),'Cannot place furniture on a player');
 assert(!C.canPlace([],{...table,x:11.5,y:4},null,'duplex'),'Partial intersection with a partition is rejected');
 assert(!C.canPlace([],{...table,x:11.5,y:7},null,'duplex'),'Partial intersection with a door is rejected');
 const sofa={id:4,type:0,x:3.5,y:5.5};assert(C.seatApproach([sofa],{x:1.5,y:8.5,path:[]},sofa));
 const route=C.pathfind([table],{x:1.5,y:3.5},{x:6.5,y:3.5});assert(route);for(const p of route)assert(!C.blocked([table],Math.floor(p.x),Math.floor(p.y)));
 for(const rotation of [0,1,2,3])for(const type of [2,6,9,16,19,23,34,35,60,88]){
  const parent={type,rotation},a=C.surfaceOffset(parent,{surfaceX:2,surfaceY:2}),b=C.surfaceOffset(parent,{surfaceX:3,surfaceY:2}),d=C.surfaceOffset(parent,{surfaceX:2,surfaceY:3});
  for(const p of [b,d]){assert.equal(Math.abs(p.x-a.x),8);assert.equal(Math.abs(p.y-a.y),4);}
 }
 const prop={id:5,type:77,parentId:1,x:table.x,y:table.y,surfaceX:4,surfaceY:2};assert(C.restore({...scene,items:[table,prop,tv]}));
 const reserve=C.reflow({...scene,items:[table,prop,tv]},'square',true);assert(C.restore(reserve));
 console.log('PASS half-cell placement: bounds, walls, doors, avatar and furniture collisions, walking, seats, save/reflow and identical quarter-cell surface projection.');
})();
