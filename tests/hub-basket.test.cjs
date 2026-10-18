const assert=require('node:assert/strict');
(async()=>{
 const {basketAction,saveBasketConfig,DEFAULT_BASKET}=await import('../src/hub-basket.mjs'),{C,CATALOG}=await import('../src/hub-rules.mjs'),{hoopX,trajectory,ballAt,judgeShot}=await import('../public/hub/basket-physics.mjs');
 const clone=v=>v===undefined?v:structuredClone(v),records=new Map([['room:1',{scene:{items:[{id:7,type:93}]}}],['room:2',{scene:{items:[{id:8,type:93}]}}]]);
 const storage={get:async k=>clone(records.get(k)),put:async(k,v)=>{if(typeof k==='string')records.set(k,clone(v));else for(const[a,b]of Object.entries(k))records.set(a,clone(b));},transaction:async fn=>fn(storage)};
 let roomId='1',now=Date.UTC(2026,9,18,12);const u={id:'3',name:'Jugador',credits:0},world={ctx:{storage},ownSockets:()=>roomId?[{deserializeAttachment:()=>({roomId})}]:[],async notifyUser(){}};
 const act=(action,input={})=>basketAction(world,u,action,{roomId:'1',itemId:7,...input},now);
 assert.equal(C.TYPES[93].interaction,'basket');assert(CATALOG.some(i=>i.id==='object:93'&&!i.starter&&!i.plantation));for(let rotation=0;rotation<4;rotation++)assert(C.restore({...C.initial(),items:[{id:7,type:93,x:3,y:3,rotation}]}));
 assert.equal(hoopX(5000,0,1),200);assert.notEqual(hoopX(15000,0,1),200);const path=trajectory(0,-245,0);assert.deepEqual(ballAt(path,0),{x:200,y:380,radius:22,t:0});assert.equal(ballAt(path,path.land).y,135);assert(judgeShot(path,0,1));
 for(const bad of [{...DEFAULT_BASKET,dailyLimit:-1},{...DEFAULT_BASKET,creditsPerPoint:1.5},{dailyLimit:4}])await assert.rejects(saveBasketConfig(storage,bad));
 roomId=null;await assert.rejects(act('open'),/Entrá/);roomId='1';await assert.rejects(act('open',{itemId:8}),/colocada/);
 const startId=crypto.randomUUID();let out=await act('start',{requestId:startId}),s=out.session;assert(!('requests'in s));assert.equal((await act('start',{requestId:startId})).session.id,s.id);await assert.rejects(act('shoot',{sessionId:s.id,requestId:crypto.randomUUID(),dx:0,dy:-245}),/juego/);
 roomId='2';await assert.rejects(act('start',{roomId:'2',itemId:8,requestId:crypto.randomUUID()}),/otra máquina/);roomId='1';
 now=s.start;for(const bad of [{dx:181,dy:-245},{dx:0,dy:-361},{dx:0,dy:1},{dx:NaN,dy:-245},{dx:0,dy:Infinity}])await assert.rejects(act('shoot',{sessionId:s.id,requestId:crypto.randomUUID(),...bad}));await assert.rejects(act('finish',{sessionId:s.id,score:99999}),/termine/);
 for(let i=0;i<7;i++){
  const shot={sessionId:s.id,requestId:crypto.randomUUID(),dx:0,dy:-245,score:99999,amount:999999,at:0};out=await act('shoot',shot);assert(out.receipt.hit);assert.equal(out.receipt.multiplier,i<2?1:i<5?2:3);const score=out.session.score;
  assert.equal((await act('shoot',shot)).session.score,score);await assert.rejects(act('shoot',{...shot,dx:1}),/registró/);await assert.rejects(act('shoot',{...shot,requestId:crypto.randomUUID()}),/vuelva/);now=out.receipt.land+121;
 }
 out=await act('shoot',{sessionId:s.id,requestId:crypto.randomUUID(),dx:-170,dy:-80});assert(!out.receipt.hit);assert.equal(out.session.streak,0);assert.equal(out.session.score,28);assert.equal(u.credits,0,'No pay before finish');
 now=s.end+1000;const tx=storage.transaction;storage.transaction=async()=>{throw Error('disk');};await assert.rejects(act('finish',{sessionId:s.id}),/disk/);assert.equal(u.credits,0);assert(!records.get('basket-session:3').finished);assert(!records.has('basket-record:1'));storage.transaction=tx;
 out=await act('finish',{sessionId:s.id,score:99999});assert.equal(out.receipt.amount,56);assert.equal(out.record.name,'Jugador');assert.equal(out.record.score,28);assert(out.receipt.newRecord);assert.equal(u.credits,56);await act('finish',{sessionId:s.id});assert.equal(u.credits,56);
 await saveBasketConfig(storage,{dailyLimit:58,creditsPerPoint:2});out=await act('start',{requestId:crypto.randomUUID()});s=out.session;now=s.start;await act('shoot',{sessionId:s.id,requestId:crypto.randomUUID(),dx:0,dy:-245});now=s.end+1;out=await act('finish',{sessionId:s.id});assert.equal(out.receipt.amount,2);assert.equal(out.record.score,28,'Lower score cannot overwrite record');
 out=await act('start',{requestId:crypto.randomUUID()});s=out.session;assert.equal(out.daily.remaining,0);now=s.start;await act('shoot',{sessionId:s.id,requestId:crypto.randomUUID(),dx:0,dy:-245});now=s.end+100;out=await act('finish',{sessionId:s.id});assert.equal(out.receipt.amount,0);
 now+=86400000;out=await act('open');assert.equal(out.record,null);assert.equal(out.daily.remaining,58);assert.equal(out.session,null);await assert.rejects(act('finish',{sessionId:s.id}),/terminó/);
 console.log('PASS basketball: physics, four rotations/catalog, presence, server-clock shots, cadence/replay/forgery, streaks, atomic wallet+record, idempotent finish, daily cap/reset and expiry.');
})().catch(e=>{console.error(e);process.exitCode=1;});
