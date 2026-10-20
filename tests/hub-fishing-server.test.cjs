const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const {Miniflare,convertV4MiniflareOptions}=require('miniflare'),esbuild=require('esbuild');
(async()=>{
 const root=path.resolve(__dirname,'..'),R=await import('../public/hub/fishing-rules.mjs');
 await esbuild.build({entryPoints:[root+'/src/index.js'],outfile:root+'/.test-build/fishing-test.mjs',bundle:true,format:'esm',platform:'browser',external:['cloudflare:workers']});
 const mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:'fishing-test',modules:true,scriptPath:root+'/.test-build/fishing-test.mjs',compatibilityDate:'2026-06-20',bindings:{HUB_ENABLED:'true',HUB_ORIGIN:'https://minerdesign.xyz'},d1Databases:['STREAMBOT_DB'],durableObjects:{HUB_WORLD:{className:'HubWorld',useSQLite:true},OVERLAY_ROOM:{className:'OverlayRoom',useSQLite:true}}}]})),sockets=[];
 try{
  const db=await mf.getD1Database('STREAMBOT_DB');await db.exec("CREATE TABLE streambot_settings(key TEXT PRIMARY KEY,value TEXT); INSERT INTO streambot_settings VALUES ('kick_user_id','1'),('kick_username','minerarg');");
  for(const sql of fs.readFileSync(root+'/hub-schema.sql','utf8').split(';').map(s=>s.trim()).filter(Boolean))await db.prepare(sql).run();
  const sessions={};for(const id of ['1','2','3']){sessions[id]=crypto.randomBytes(32).toString('base64url');await db.prepare('INSERT INTO hub_sessions VALUES(?,?,?,?)').bind(crypto.createHash('sha256').update(sessions[id]).digest('hex'),id,id==='1'?'minerarg':'Pescador '+id,Date.now()+3600000).run();}
  const req=(id,route,method='GET',body,headers={})=>mf.dispatchFetch('https://minerdesign.xyz/api/hub/'+route,{method,headers:{Cookie:'hub_session='+sessions[id],Origin:'https://minerdesign.xyz',...headers},body:body?JSON.stringify(body):undefined}),state=async id=>(await req(id,'state')).json(),delay=ms=>new Promise(r=>setTimeout(r,Math.max(0,ms))),table={roomId:'1',itemId:7};
  const act=async(action,input={},user='2')=>{const r=await req(user,'fishing/'+action,'POST',{...table,...input}),b=await r.json();assert.equal(r.status,200,JSON.stringify(b));return b;};
  assert.equal((await req(null,'fishing/open','POST',table)).status,401);assert.equal((await req('2','fishing/open','POST',table,{Origin:'https://evil.test'})).status,403);
  assert.equal((await req('2','admin/fishing','PUT',{dailyLimit:9999})).status,404);assert.equal((await req('1','admin/fishing','PUT',{dailyLimit:15})).status,200);
  let owner=await state('1');assert(owner.inventory.some(i=>i.id==='object:106'));owner.room.scene.items=[{id:7,type:106,x:3,y:3}];
  assert.equal((await req('1','room','PUT',{scene:owner.room.scene,revision:owner.room.revision})).status,200);
  assert(!(await state('2')).inventory.some(i=>i.id==='object:106'));assert.equal((await req('2','fishing/start','POST',{...table,requestId:crypto.randomUUID()})).status,403);
  for(const id of ['2','3']){await state(id);const r=await req(id,'ws','GET',null,{Upgrade:'websocket'});assert.equal(r.status,101);const ws=r.webSocket;ws.accept();sockets.push(ws);await delay(50);ws.send(JSON.stringify({type:'join',roomId:'1'}));await delay(70);}
  const requestId=crypto.randomUUID(),start=await act('start',{requestId}),s=structuredClone(start.session);assert.equal((await act('start',{requestId})).session.id,s.id);
  assert.equal((await req('3','fishing/input','POST',{...table,sessionId:s.id,requestId:crypto.randomUUID(),from:0,inputs:[1]})).status,409);
  assert.equal((await req('2','fishing/input','POST',{...table,sessionId:s.id,requestId:crypto.randomUUID(),from:0,inputs:[1]})).status,409);
  let result,last;
  while(!s.state.done){
   const from=s.state.tick,inputs=[];for(let i=0;i<40&&!s.state.done;i++){const target=R.clamp((R.fishPosition(s,s.state.tick+3)-s.state.y)*5,-.8,.8),held=Number(s.state.v>target);inputs.push(held);s.state=R.stepFishing(s,held);}
   last={sessionId:s.id,requestId:crypto.randomUUID(),from,inputs,score:99999,lengthMm:99999,amount:99999};await delay(s.startAt+(from+inputs.length)*50+35-Date.now());
   const responses=await Promise.all([act('input',last),act('input',last)]);result=responses[0];assert.deepEqual(result.session.state,s.state);assert.deepEqual(responses[1].session.result,result.session.result);
  }
  assert(result.session.result.caught);assert.equal(result.session.result.amount,15);assert.equal((await state('2')).credits,15);assert.equal((await state('1')).credits,0);
  const ranking=await act('ranking',{},'3');assert.equal(ranking.ranking.size[0].userId,'2');assert.equal(ranking.ranking.size[0].lengthMm,s.lengthMm);assert.equal(ranking.ranking.rarity[0].species,s.species);
  assert.equal((await act('open')).profile.caught,1);await act('input',last);assert.equal((await state('2')).credits,15);
  const again=await act('start',{requestId:crypto.randomUUID()});assert.equal(again.daily.remaining,0);
  sockets[0].send(JSON.stringify({type:'join',roomId:'2'}));await delay(80);assert.equal((await req('2','fishing/open','POST',table)).status,403);
  sockets[0].send(JSON.stringify({type:'join',roomId:'1'}));await delay(80);assert.equal((await act('open')).session.id,again.session.id);await act('cancel',{sessionId:again.session.id});assert.equal((await state('2')).credits,15);
  owner=await state('1');owner.room.scene.items=[];assert.equal((await req('1','room','PUT',{scene:owner.room.scene,revision:owner.room.revision})).status,200);assert.equal((await req('2','fishing/open','POST',table)).status,409);
  console.log('PASS fishing real Worker/D1/DO/WS: collectible ownership, visitors, auth/origin/admin, elapsed input validation, cross-user rejection, atomic concurrent payout once/cap15, global rankings across users, persisted records, cancel/reconnect and removed machine.');
 }finally{for(const ws of sockets)ws.close();await mf.dispose();}
})().catch(e=>{console.error(e);process.exitCode=1;});
