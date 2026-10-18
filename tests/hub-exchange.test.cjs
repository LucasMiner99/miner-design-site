const assert=require('node:assert/strict'),crypto=require('node:crypto');
(async()=>{
 const {C,CATALOG}=await import('../src/hub-rules.mjs'),{openExchange,exchangeItem}=await import('../src/hub-exchange.mjs');
 const {transferItemCopies,migrateExchangeProvenance}=await import('../src/hub-item-provenance.mjs');
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
 assert.equal(f.user.exchangeLocked[receipt.rewardId],1,'Machine prize is marked');
 await exchangeItem(f.world,f.user,input('object:0'));await exchangeItem(f.world,f.user,input('object:0'));
 assert.equal(f.user.inventory['object:0'],1);await assert.rejects(exchangeItem(f.world,f.user,input('object:0')),/copia repetida/);
 f.user.inventory['object:0']++;await exchangeItem(f.world,f.user,input('object:0'));assert.equal(f.user.inventory['object:0'],1,'A fresh box copy of the same type may be exchanged');
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
 const marked=fixture();marked.user.exchangeLocked={'object:0':4};assert(!(await openExchange(marked.world,marked.user,table)).items.some(i=>i.id==='object:0'));await assert.rejects(exchangeItem(marked.world,marked.user,input('object:0')),/no haya salido/);
 marked.user.inventory['object:0']++;marked.own.scene.items=[{id:4,type:0,x:1,y:1}];assert.equal((await openExchange(marked.world,marked.user,table)).items.find(i=>i.id==='object:0').available,1);await exchangeItem(marked.world,marked.user,input('object:0'));assert.equal(marked.user.inventory['object:0'],4);assert.equal(marked.user.exchangeLocked['object:0'],4,'Consumes only fresh unit, preserving locked and placed stock');
 const players=[{inventory:{a:3},exchangeLocked:{a:2},collected:{}},{inventory:{a:2},exchangeLocked:{a:1},collected:{}}];
 assert.deepEqual(transferItemCopies(players,[{a:2},{a:1}],[false,false]),[{a:2},{a:1}]);assert.deepEqual(players.map(u=>u.inventory.a),[2,3]);assert.deepEqual(players.map(u=>u.exchangeLocked.a),[1,2],'Both outgoing bundles fixed before receiving');
 transferItemCopies(players,[{a:2},{}],[false,false]);assert.deepEqual(players.map(u=>u.exchangeLocked.a),[0,3]);transferItemCopies(players,[{},{a:3}],[false,false]);assert.deepEqual(players.map(u=>u.exchangeLocked.a),[3,0],'Marks survive gifts and return trips');
 transferItemCopies(players,[{a:2},{}],[true,false]);assert.deepEqual(players.map(u=>u.exchangeLocked.a),[3,0],'Admin catalog grants cannot debit or launder marked earned units');
 // Upgrade the already-live implementation, including a prize gifted to another account.
 const legacy=new Map([['exchange:2:old',{userId:'2',sourceId:'object:0',rewardId:'object:9',at:10}],['trade:old',{status:'completed',completedAt:11,users:['2','3'],offers:[{'object:9':1},{}],adminGrants:[false,false]}],['user:2',{inventory:{'object:0':2},exchangeUsed:{'object:0':'old'}}],['user:3',{inventory:{'object:9':2}}]]);
 for(let i=0;i<1001;i++)legacy.set('trade:earlier-'+i,{status:'cancelled'});
 let lists=0;const storage={get:async k=>structuredClone(legacy.get(k)),list:async({prefix,limit,startAfter})=>{lists++;return new Map([...legacy].filter(([k])=>k.startsWith(prefix)&&(!startAfter||k>startAfter)).sort(([a],[b])=>a<b?-1:a>b?1:0).slice(0,limit));},transaction:async fn=>{const pending=new Map(legacy);await fn({put:async(k,v)=>{for(const [key,value] of typeof k==='string'?[[k,v]]:Object.entries(k))pending.set(key,structuredClone(value));}});legacy.clear();for(const [k,v] of pending)legacy.set(k,v);}};
 await migrateExchangeProvenance(storage);assert.equal(legacy.get('user:3').exchangeLocked['object:9'],1);assert.equal(legacy.get('user:2').exchangeUsed['object:0'],'old','Historical receipts/usage preserved without blocking future copies');assert.equal(lists,3,'All paginated transfer history read');
 await migrateExchangeProvenance(storage);assert.equal(lists,3,'Migration idempotent and skipped on subsequent starts');
 console.log('PASS exchange: per-copy eligibility, unique prizes, kept/placed copies, new box copies, locked-prize gifts/return trips, simultaneous transfers, admin grants, legacy migration, replay, collection limits and atomic failure.');
})().catch(e=>{console.error(e);process.exitCode=1;});
