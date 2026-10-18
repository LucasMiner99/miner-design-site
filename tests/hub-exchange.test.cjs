const assert=require('node:assert/strict'),crypto=require('node:crypto');
(async()=>{
 const {C,CATALOG}=await import('../src/hub-rules.mjs'),{openExchange,exchangeItem}=await import('../src/hub-exchange.mjs');
 const initial=()=>({id:'2',name:'Player',appearance:{hair:0,face:0,top:0,bottom:0,shoes:0},inventory:{'object:0':4,'object:1':2,'look:top:1':2,'environment:wall:1':2},collected:{'object:0':true,'object:1':true,'look:top:1':true,'environment:wall:1':true},credits:5000});
 function fixture(){const data=new Map(),user=initial(),own={id:'2',ownerId:'2',scene:{...C.initial(),items:[]}},host={id:'1',ownerId:'1',scene:{...C.initial(),items:[{id:10,type:83,x:2,y:2}]}};data.set('room:1',host);data.set('user:2',structuredClone(user));let live=true,failCommit=false;
  const storage={get:async k=>structuredClone(data.get(k)),put:async rows=>{for(const [k,v] of Object.entries(rows))data.set(k,structuredClone(v));},transaction:async fn=>{if(failCommit)throw Error('disk failure');await fn(storage);}};
  const world={ctx:{storage},ownSockets:()=>live?[{deserializeAttachment:()=>({roomId:'1'})}]:[],room:async()=>own,notifyUser:async()=>{}};
  return {world,user,own,data,offline:()=>live=false,failCommit:()=>failCommit=true};
 }
 const table={roomId:'1',itemId:10},input=sourceId=>({...table,sourceId,requestId:crypto.randomUUID()});
 const f=fixture();assert.equal(C.TYPES[83].interaction,'exchange');assert(CATALOG.some(i=>i.id==='object:83'&&!i.starter));
 assert.equal((await openExchange(f.world,f.user,table)).items.length,4);
 f.own.scene.items=[{id:1,type:1,x:1,y:1},{id:2,type:1,x:3,y:1}];assert(!(await openExchange(f.world,f.user,table)).items.some(i=>i.id==='object:1'),'Placed copies unavailable');f.own.scene.items=[];
 const request=input('object:0'),receipt=await exchangeItem(f.world,f.user,request);assert.equal(f.user.inventory['object:0'],3);assert.equal(f.user.inventory[receipt.rewardId],1);assert(!['object:0','object:1'].includes(receipt.rewardId));assert.equal(receipt.kind,'object');assert.equal(f.user.credits,5000);
 assert.deepEqual(await exchangeItem(f.world,f.user,request),receipt,'Exact retry returns receipt');assert.equal(f.user.inventory['object:0'],3);
 await assert.rejects(exchangeItem(f.world,f.user,{...request,sourceId:'object:1'}),/otro canje/);
 await assert.rejects(exchangeItem(f.world,f.user,input('object:0')),/Ya usaste/);f.user.inventory['object:0']=10;await assert.rejects(exchangeItem(f.world,f.user,input('object:0')),/Ya usaste/);
 assert(!(await openExchange(f.world,f.user,table)).items.some(i=>i.id==='object:0'));
 for(const id of ['look:top:1','environment:wall:1']){const r=await exchangeItem(f.world,f.user,input(id));assert.equal(r.kind,id.startsWith('look')?'character':'environment');assert.equal(f.user.inventory[id],1);assert.equal(f.user.inventory[r.rewardId],1);}
 for(const bad of [null,{},input('missing'),{...input('object:1'),requestId:'not-uuid'}])await assert.rejects(exchangeItem(f.world,f.user,bad));
 const done=fixture();for(const i of CATALOG)if(i.kind==='object')done.user.collected[i.id]=true;assert((await openExchange(done.world,done.user,table)).items.find(i=>i.id==='object:0').complete);await assert.rejects(exchangeItem(done.world,done.user,input('object:0')),/completaste/);assert.equal(done.user.inventory['object:0'],4);
 const reserved=fixture();for(const i of CATALOG)if(i.kind==='object')reserved.user.collected[i.id]=true;const target='object:10';delete reserved.user.collected[target];const r=await exchangeItem(reserved.world,reserved.user,input('object:0'));assert.equal(r.rewardId,target,'Ever-collected and reserved pending prizes cannot repeat');
 const offline=fixture();offline.offline();await assert.rejects(openExchange(offline.world,offline.user,table),/Entrá/);
 const missing=fixture();missing.data.get('room:1').scene.items=[];await assert.rejects(exchangeItem(missing.world,missing.user,input('object:0')),/no está colocada/);
 const trade=fixture();trade.data.set('active-trade:2','t');trade.data.set('trade:t',{status:'open',expiresAt:Date.now()+60000});await assert.rejects(exchangeItem(trade.world,trade.user,input('object:0')),/Terminá/);
 const empty=fixture();empty.user.inventory={};assert.equal((await openExchange(empty.world,empty.user,table)).items.length,0,'Admin virtual catalog is not earned inventory');
 const broken=fixture(),snapshot=structuredClone(broken.user);broken.failCommit();await assert.rejects(exchangeItem(broken.world,broken.user,input('object:0')),/disk failure/);assert.deepEqual(broken.user,snapshot,'No in-memory grant/debit survives failed transaction');
 console.log('PASS exchange: category/unique prize, kept copy, placed/equipped stock, once-per-type, replay, completed collection, pending prizes, active trade, machine presence and atomic failure.');
})().catch(e=>{console.error(e);process.exitCode=1;});
