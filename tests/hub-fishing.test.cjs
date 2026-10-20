const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
(async()=>{
 const R=await import('../public/hub/fishing-rules.mjs'),{fishingAction,saveFishingConfig}=await import('../src/hub-fishing.mjs'),{C,CATALOG,R:rewards}=await import('../src/hub-rules.mjs');
 assert.equal(C.TYPES[106].interaction,'fishing');assert(rewards.poolFor(CATALOG,'object').some(i=>i.id==='object:106'));
 assert.equal(R.FISH.reduce((n,f)=>n+f.weight,0),100);assert.deepEqual(R.FISH.map(f=>f.weight),[46,28,16,8,2]);
 let lower=0;for(const f of R.FISH){
  const rolls=[(lower+.1)/100,0,.3];assert.equal(R.rollFish(()=>rolls.shift()).species,f.id);lower+=f.weight;
  const s={species:f.id,lengthMm:f.min*10,seed:9836,state:R.initialFishing()},big={...s,lengthMm:f.max*10};
  assert(R.barHeight(s)>R.barHeight(big));assert(R.fishingReward(big)>R.fishingReward(s));
  const copy=structuredClone(s),inputs=[];while(!s.state.done){const v=R.clamp((R.fishPosition(s,s.state.tick+3)-s.state.y)*5,-.8,.8),held=Number(s.state.v>v);inputs.push(held);s.state=R.stepFishing(s,held);}
  assert(s.state.won,f.name+' must be catchable');for(let i=0;i<inputs.length;i+=17)R.advanceFishing(copy,inputs.slice(i,i+17));assert.deepEqual(copy.state,s.state,'Network batching cannot change simulation');
  const idle={...big,state:R.initialFishing()};R.advanceFishing(idle,Array(R.FISHING.maxTicks).fill(0));assert(idle.state.done&&!idle.state.won,'Idle players cannot farm');
 }
 const base={userId:'a',name:'A',species:'trout',lengthMm:400,rank:2,at:100};
 let rows=R.insertRecord([],base,R.compareSize);assert.equal(R.insertRecord(rows,{...base,lengthMm:200},R.compareSize)[0].lengthMm,400);rows=R.insertRecord(rows,{...base,lengthMm:450},R.compareSize);assert.equal(rows.length,1);assert.equal(rows[0].lengthMm,450);
 for(let i=0;i<40;i++)rows=R.insertRecord(rows,{...base,userId:String(i),lengthMm:200+i},R.compareSize);assert.equal(rows.length,20);
 assert(R.compareRarity({...base,rank:5,lengthMm:100},{...base,rank:4,lengthMm:999})<0);assert.equal(R.sizeLabel(1234),'123,4 cm');
 const map=new Map(),storage={async get(k){return structuredClone(map.get(k));},async put(k,v){if(typeof k==='object')for(const [key,value] of Object.entries(k))map.set(key,structuredClone(value));else map.set(k,structuredClone(v));},async transaction(fn){await fn(storage);}};
 const u={id:'2',name:'Pescador',credits:0},table={roomId:'1',itemId:7};let roomId='1',notifications=0;
 const world={ctx:{storage},ownSockets:()=>[{deserializeAttachment:()=>({roomId})}],notifyUser:async()=>notifications++};
 await storage.put('room:1',{scene:{items:[{id:7,type:106}]}});await saveFishingConfig(storage,{dailyLimit:25});
 await assert.rejects(()=>saveFishingConfig(storage,{dailyLimit:-1}));await assert.rejects(()=>saveFishingConfig(storage,{dailyLimit:1.5}));
 let now=Date.UTC(2026,9,20,15),s=(await fishingAction(world,u,'start',{...table,requestId:crypto.randomUUID()},now)).session;
 assert.equal((await fishingAction(world,u,'start',{...table,requestId:crypto.randomUUID()},now)).session.id,s.id,'No re-rolling active fish');
 await assert.rejects(()=>fishingAction(world,u,'input',{...table,sessionId:s.id,requestId:crypto.randomUUID(),from:0,inputs:[1]},now),e=>e.status===409);
 const predicted=structuredClone(s);let last,result;
 while(!predicted.state.done){
  const from=predicted.state.tick,inputs=[];for(let n=0;n<20&&!predicted.state.done;n++){const v=R.clamp((R.fishPosition(predicted,predicted.state.tick+3)-predicted.state.y)*5,-.8,.8),held=Number(predicted.state.v>v);inputs.push(held);predicted.state=R.stepFishing(predicted,held);}
  last={...table,sessionId:s.id,requestId:crypto.randomUUID(),from,inputs,amount:999999,lengthMm:99999,won:true};now=s.startAt+(from+inputs.length)*50;
  result=await fishingAction(world,u,'input',last,now);assert.deepEqual(result.session.state,predicted.state);
 }
 assert(result.session.result.caught);assert(u.credits>0&&u.credits<=25);const earned=u.credits;
 await fishingAction(world,u,'input',last,now);await fishingAction(world,u,'cancel',{...table,sessionId:s.id},now);assert.equal(u.credits,earned);assert.equal(notifications,1);
 const record=(await storage.get('fishing-ranking')).size[0];assert.equal(record.lengthMm,s.lengthMm);assert.notEqual(record.lengthMm,99999);
 await assert.rejects(()=>fishingAction(world,u,'input',{...last,inputs:last.inputs.map((v,i)=>i===0?1-v:v)},now),e=>e.status===409);
 roomId='2';await assert.rejects(()=>fishingAction(world,u,'open',table,now),e=>e.status===403);roomId='1';
 now+=50000;s=(await fishingAction(world,u,'start',{...table,requestId:crypto.randomUUID()},now)).session;
 result=await fishingAction(world,u,'open',table,s.expiresAt+1);assert(result.session.state.done&&!result.session.state.won);assert.equal(u.credits,earned);
 assert.equal((await fishingAction(world,u,'open',table,Date.UTC(2026,9,21,3))).daily.remaining,25,'Argentina daily reset');
 await saveFishingConfig(storage,{dailyLimit:0});now+=100000;
 s=(await fishingAction(world,u,'start',{...table,requestId:crypto.randomUUID()},now)).session;
 // Deterministic rare fixture exercises ranking updates even in practice mode.
 s.species='astral';s.lengthMm=2200;s.seed=81;await storage.put('fishing-session:2',s);
 while(!s.state.done){
  const from=s.state.tick,inputs=[];for(let i=0;i<20&&!s.state.done;i++){const target=R.clamp((R.fishPosition(s,s.state.tick+3)-s.state.y)*5,-.8,.8),held=Number(s.state.v>target);inputs.push(held);s.state=R.stepFishing(s,held);}
  result=await fishingAction(world,u,'input',{...table,sessionId:s.id,requestId:crypto.randomUUID(),from,inputs},s.startAt+(from+inputs.length)*50);
 }
 assert(result.session.result.caught);assert.equal(result.session.result.amount,0);assert.equal(u.credits,earned);assert.equal(result.profile.caught,2);
 assert.equal(result.ranking.rarity[0].species,'astral');assert.equal(result.ranking.size[0].lengthMm,2200);assert.equal(result.ranking.size.length,1);
 await storage.put('room:1',{scene:{items:[]}});await assert.rejects(()=>fishingAction(world,u,'open',table,now),e=>e.status===409);
 const root=path.resolve(__dirname,'..'),html=fs.readFileSync(root+'/public/hub/index.html','utf8'),client=fs.readFileSync(root+'/public/hub/fishing.js','utf8');
 for(const id of [...client.matchAll(/\$\('([^']+)'\)/g)].map(m=>m[1]).filter(id=>!id.endsWith('-')))assert(html.includes('id="'+id+'"'),'Missing UI '+id);
 assert(!client.includes('innerHTML'),'Player names must be rendered as text');assert(client.includes('pointercancel')&&client.includes('visibilitychange'));
 assert(client.includes('window.HubFishing=')&&fs.readFileSync(root+'/public/hub/online.js','utf8').includes('window.HubFishing?.close()'));
 console.log('PASS fishing physics, rarity/size difficulty, deterministic batched inputs, five catchable species, idle loss, catalog, bounded rankings, server credits/cap/replay, spoofed sizes, expiry, daily reset, presence and UI wiring.');
})().catch(e=>{console.error(e);process.exitCode=1;});
