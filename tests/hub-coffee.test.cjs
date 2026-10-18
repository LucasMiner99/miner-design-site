const assert=require('node:assert/strict');
(async()=>{
 const {coffeeAction,coffeeConfig,saveCoffeeConfig,DEFAULT_COFFEE,coffeeDay}=await import('../src/hub-coffee.mjs');
 const {C}=await import('../src/hub-rules.mjs'),type=C.TYPES.findIndex(t=>t.interaction==='coffee');assert.equal(type,77);
 const clone=v=>v===undefined?v:structuredClone(v),records=new Map([['room:1',{scene:{items:[{id:7,type}]}}],['room:2',{scene:{items:[{id:8,type}]}}]]);
 const storage={get:async k=>clone(records.get(k)),put:async(k,v)=>{if(typeof k==='string')records.set(k,clone(v));else for(const[a,b]of Object.entries(k))records.set(a,clone(b));},transaction:async fn=>fn(storage)};
 let roomId='1',time=Date.UTC(2026,9,18,12),user={id:'3',credits:0,walletVersion:0};
 const world={ctx:{storage},ownSockets:()=>roomId?[{deserializeAttachment:()=>({roomId})}]:[],async notifyUser(){}};
 const table={roomId:'1',itemId:7},run=(action,input={})=>coffeeAction(world,user,action,{...table,...input},time);
 assert.deepEqual(await coffeeConfig(storage),DEFAULT_COFFEE);
 for(const bad of [{...DEFAULT_COFFEE,dailyLimit:-1},{...DEFAULT_COFFEE,orderReward:1.5},{dailyLimit:400}])await assert.rejects(saveCoffeeConfig(storage,bad));
 let opened=await run('open');assert.equal(opened.session,null);assert.equal(opened.daily.remaining,400);
 roomId=null;await assert.rejects(run('start',{requestId:crypto.randomUUID()}),/Entrá/);roomId='1';await assert.rejects(run('open',{itemId:999}),/colocada/);
 const requestId=crypto.randomUUID();let r=await run('start',{requestId});const id=r.session.id;assert.equal((await run('start',{requestId})).session.id,id);assert.equal((await run('start',{requestId:crypto.randomUUID()})).session.id,id,'Cannot reset an active shift');
 roomId='2';await assert.rejects(run('start',{roomId:'2',itemId:8,requestId:crypto.randomUUID()}),/otra cafetera/);roomId='1';
 const request={sessionId:id,index:0};await assert.rejects(run('serve',request),/prepararse/);
 await assert.rejects(run('pour',{...request,ingredients:['coffee','milk','sugar','ice']}),/ingredientes/);
 await assert.rejects(run('pour',{...request,ingredients:['coffee','coffee']}),/ingredientes/);
 let earned=0;
 for(let index=0;index<3;index++){
  const input={sessionId:id,index};r=await run('open');r=await run('pour',{...input,ingredients:r.session.order.ingredients});const pour=r.session.pour;
  assert.deepEqual((await run('pour',{...input,ingredients:r.session.order.ingredients})).session.pour,pour,'Repeated pour cannot reset precision window');
  await assert.rejects(run('serve',input),/prepararse/);time=pour.start+pour.duration*(pour.target+pour.width/2);
  if(index===1){const tx=storage.transaction;storage.transaction=async()=>{throw Error('disk');};await assert.rejects(run('serve',input),/disk/);assert.equal(user.credits,earned);assert.equal(records.get('coffee-session:3').index,1);storage.transaction=tx;}
  r=await run('serve',{...input,amount:100000,perfect:false,now:0});assert.equal(r.receipt.perfect,true);earned+=index===2?22:12;assert.equal(user.credits,earned);
  const repeat=await run('serve',input);assert.equal(repeat.receipt.amount,r.receipt.amount);assert.equal(user.credits,earned,'Replayed award cannot pay twice');
 }
 assert.equal(r.session.done,true);assert.equal(r.session.total,46);assert.equal((await run('start',{requestId})).session.id,id);
 await saveCoffeeConfig(storage,{...DEFAULT_COFFEE,dailyLimit:50});r=await run('start',{requestId:crypto.randomUUID()});let input={sessionId:r.session.id,index:0};r=await run('pour',{...input,ingredients:r.session.order.ingredients});time=r.session.pour.start+4000;r=await run('serve',{...input,perfect:true,amount:999});assert.equal(r.receipt.perfect,false,'Client cannot award precision bonus');assert.equal(r.receipt.amount,4,'Exact remaining daily cap');assert.equal(user.credits,50);
 input={sessionId:r.session.id,index:1};r=await run('pour',{...input,ingredients:r.session.order.ingredients});time=r.session.pour.start+4000;r=await run('serve',input);assert.equal(r.receipt.amount,0,'Practice after cap');
 time+=301000;await assert.rejects(run('serve',input),/terminó/);assert.equal((await run('open')).session,null);
 roomId='2';r=await run('start',{roomId:'2',itemId:8,requestId:crypto.randomUUID()});assert.equal(r.daily.remaining,0,'Daily cap follows account across rooms and machines');
 assert.equal(coffeeDay(Date.UTC(2026,9,19,2,59)), '2026-10-18');assert.equal(coffeeDay(Date.UTC(2026,9,19,3)), '2026-10-19');
 time=Date.UTC(2026,9,19,3);r=await run('open',{roomId:'2',itemId:8});assert.equal(r.daily.remaining,50,'Argentina midnight reset');
 console.log('PASS coffee: machine/presence, session resume, correct recipes, prep and server precision, atomic failure, three payments, replay, forged prizes, global daily cap, practice, expiry and Argentina reset.');
})().catch(e=>{console.error(e);process.exitCode=1;});
