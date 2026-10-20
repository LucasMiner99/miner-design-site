const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
(async()=>{
 const {C}=await import('../src/hub-rules.mjs');const client={};client.globalThis=client;vm.runInNewContext(fs.readFileSync(__dirname+'/../public/hub/core.js','utf8'),client);
 for(const layout of C.LAYOUTS){
  const spot=C.wallSwitch(layout),poster={id:101,type:80,x:0,y:0,posterSlot:3,wallSide:spot.wallSide,wallU:spot.wallU-.25,wallZ:spot.wallZ};
  assert(!C.canPlace([],poster,null,layout));assert(C.canPlace([],poster,null,layout,true));
  assert.equal(client.VeredaCore.canPlace([],poster,null,layout),false);
  const untouched={id:102,type:27,x:0,y:0,wallSide:'right',wallU:3,wallZ:90},old={...C.initial(),layout:layout.id,items:[poster,untouched],switchVersion:undefined},copy=JSON.stringify(old);
  const room=C.restore(old);assert(room,layout.id+' old rooms still load');assert.equal(room.switchVersion,1);assert.equal(JSON.stringify(old),copy,'Migration does not mutate its input');
  const migrated=room.items.find(i=>i.id===101);assert(migrated);assert.equal(migrated.posterSlot,3);assert(!C.overlapsSwitch(migrated,layout));
  assert.equal(room.items.find(i=>i.id===102).wallU,3,'Unaffected wall art stays in place');
  assert.deepEqual(C.restore(room),room,'Repeated loads are stable');
  assert.equal(C.restore({...old,switchVersion:1}),null,'Current clients cannot cover the switch');
  const packed=C.reflow(old,layout.id,true);assert.equal(packed.items.length+(packed.unplacedItems||[]).length,2);assert(packed.items.every(i=>!C.overlapsSwitch(i,layout)));
 }
 const ids=new Map();function element(){return {children:[],disabled:true,open:false,append(...items){this.children.push(...items);},showModal(){this.open=true;this.opens=(this.opens||0)+1;},close(){this.open=false;}};}
 const get=id=>{if(!ids.has(id))ids.set(id,element());return ids.get(id);};const timers=[];let other=false;
 const scope={document:{getElementById:get,createElement:element,querySelector:()=>other?{}:get('hubNewsDialog').open?get('hubNewsDialog'):null},setTimeout:fn=>timers.push(fn)};scope.window=scope;
 vm.runInNewContext(fs.readFileSync(__dirname+'/../public/hub/news.js','utf8'),scope);
 assert(!get('hubNewsDialog').open,'No popup before entering the game');other=true;scope.HubNews.arrive();assert(!get('hubNewsDialog').open,'Do not interrupt another dialog');other=false;timers.shift()();assert(get('hubNewsDialog').open);assert(!get('hubNewsButton').disabled);
 const count=get('hubNewsEntries').children.length;assert(count>=3,'Keep the original notes while adding new releases');get('hubNewsPlay').onclick();scope.HubNews.arrive();assert(!get('hubNewsDialog').open,'Changing rooms does not reopen notes');get('hubNewsButton').onclick();assert(get('hubNewsDialog').open);assert.equal(get('hubNewsEntries').children.length,count,'Reopening does not duplicate notes');
 console.log('PASS wall switch in every layout: shared reservations, safe migration, stable IDs/poster slots and reflow; release notes first entry, dialog coordination and reopening.');
})().catch(e=>{console.error(e);process.exitCode=1;});
