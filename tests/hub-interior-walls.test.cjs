const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
(async()=>{
 const {C}=await import('../src/hub-rules.mjs'),scope={};scope.globalThis=scope;vm.runInNewContext(fs.readFileSync('public/hub/core.js','utf8'),scope);const client=scope.VeredaCore;
 let placements=0;
 for(const l of C.LAYOUTS){
  for(const surface of C.wallSurfaces(l).filter(s=>s.index>=0)){
   for(let type=0;type<C.TYPES.length;type++){
    if(!C.TYPES[type]?.wall)continue;
    const item={id:1,type,x:0,y:0,wallSide:surface.id,wallU:(surface.start+surface.end)/2,wallZ:84};
    assert(C.canPlace([],item,null,l),l.id+' '+surface.id+' '+type);assert(client.canPlace([],item,null,l));placements++;
    assert(!C.canPlace([item],{...item,id:2},null,l),'Overlapping art rejected');
    assert(!C.canPlace([],{...item,wallU:surface.end},null,l),'Door/edge clearance');
    assert(!C.canPlace([],{...item,wallZ:155},null,l),'Cannot stick above wall');
    const stored=C.restore({...C.initial(),layout:l.id,switchVersion:1,items:[item]});assert(stored);assert.equal(stored.items[0].wallSide,item.wallSide);assert.deepEqual(C.restore(stored),stored);
    const a=C.wallAnchor(item,l);assert.equal(a.z,surface.z);assert.equal(a.side,surface.side);
    const point={x:1000+(a.x-a.y)*32,y:300+(a.x+a.y)*16-a.z-item.wallZ};
    const picked=C.wallPick(point,1000,300,l);assert(C.wallSurface(picked.wallSide,l).index>=0);
    const hit=C.wallAnchor(picked,l);assert(Math.abs(1000+(hit.x-hit.y)*32-point.x)<=4);assert(Math.abs(300+(hit.x+hit.y)*16-hit.z-picked.wallZ-point.y)<=4);
    assert.equal(JSON.stringify(picked),JSON.stringify(client.wallPick(point,1000,300,l)));
    assert(['left','right'].includes(C.wallPick(point,1000,300,l,false).wallSide),'Explicit reveal permits targeting the back walls');
   }
  }
 }
 for(const side of ['inner:-1','inner:999','inner:1.5','inner:00','door:0',null,{}])assert(!C.canPlace([],{id:1,type:27,x:0,y:0,wallSide:side,wallU:4,wallZ:80},null,'suite'));
 const item={id:1,type:27,x:0,y:0,wallSide:'inner:0',wallU:3,wallZ:80};
 const converted=C.reflow({...C.initial(),layout:'duplex',items:[item]},'square');assert.equal(converted.items.length,1);assert(['left','right'].includes(converted.items[0].wallSide));
 console.log('PASS interior walls: '+placements+' placements across all partition layouts/types, client/server parity, projection, elevation, door clearance, collisions, persistence and layout migration.');
})().catch(e=>{console.error(e);process.exitCode=1;});
