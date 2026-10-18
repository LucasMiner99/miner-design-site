const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {Miniflare,convertV4MiniflareOptions}=require('miniflare'),esbuild=require('esbuild');
(async()=>{
 const root=path.join(__dirname,'..');await esbuild.build({entryPoints:[root+'/src/index.js'],outfile:root+'/.test-build/coffee-test.mjs',bundle:true,format:'esm',platform:'browser',external:['cloudflare:workers']});
 const mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:'coffee-test',modules:true,scriptPath:root+'/.test-build/coffee-test.mjs',compatibilityDate:'2026-06-20',bindings:{HUB_ENABLED:'true',HUB_ORIGIN:'https://minerdesign.xyz'},d1Databases:['STREAMBOT_DB'],durableObjects:{HUB_WORLD:{className:'HubWorld',useSQLite:true},OVERLAY_ROOM:{className:'OverlayRoom',useSQLite:true}}}]}));
 const sockets=[];try{
  const db=await mf.getD1Database('STREAMBOT_DB');await db.exec("CREATE TABLE streambot_settings(key TEXT PRIMARY KEY,value TEXT); INSERT INTO streambot_settings VALUES ('kick_user_id','1'),('kick_username','minerarg');");for(const sql of fs.readFileSync(root+'/hub-schema.sql','utf8').split(';').map(s=>s.trim()).filter(Boolean))await db.prepare(sql).run();
  const sessions={};for(const id of ['1','2']){sessions[id]=crypto.randomBytes(32).toString('base64url');await db.prepare('INSERT INTO hub_sessions VALUES(?,?,?,?)').bind(crypto.createHash('sha256').update(sessions[id]).digest('hex'),id,id==='1'?'minerarg':'Visitor',Date.now()+3600000).run();}
  const req=(id,route,method='GET',body,headers={})=>mf.dispatchFetch('https://minerdesign.xyz/api/hub/'+route,{method,headers:{Cookie:'hub_session='+sessions[id],Origin:'https://minerdesign.xyz',...headers},body:body?JSON.stringify(body):undefined}),state=async id=>await(await req(id,'state')).json(),delay=ms=>new Promise(r=>setTimeout(r,Math.max(0,ms)));
  const table={roomId:'1',itemId:7},act=async(action,input={})=>{const r=await req('2','coffee/'+action,'POST',{...table,...input});const body=await r.json();assert.equal(r.status,200,JSON.stringify(body));return body;};
  assert.equal((await req(null,'coffee/open','POST',table)).status,401);assert.equal((await req('2','coffee/open','POST',table,{Origin:'https://evil.test'})).status,403);assert.equal((await req('2','admin/coffee','PUT',{dailyLimit:9999})).status,404);
  assert.equal((await req('1','admin/coffee','PUT',{dailyLimit:45,orderReward:10,completionReward:10,perfectReward:2})).status,200);assert.equal((await(await req('1','admin/coffee')).json()).dailyLimit,45);
  let owner=await state('1');owner.room.scene.items=[{id:7,type:77,x:3,y:3}];let r=await req('1','room','PUT',{scene:owner.room.scene,revision:owner.room.revision});assert.equal(r.status,200);
  assert.equal((await req('2','coffee/open','POST',table)).status,403);
  await state('2');const connected=await req('2','ws','GET',null,{Upgrade:'websocket'});assert.equal(connected.status,101);const ws=connected.webSocket,messages=[];ws.addEventListener('message',e=>{if(e.data!=='pong')messages.push(JSON.parse(e.data));});ws.accept();sockets.push(ws);await delay(100);ws.send(JSON.stringify({type:'join',roomId:'1'}));await delay(100);
  assert.equal((await act('open')).session,null);const requestId=crypto.randomUUID();let shift=await act('start',{requestId}),id=shift.session.id;
  assert.equal((await act('start',{requestId})).session.id,id);assert.equal((await act('open')).session.id,id);
  assert.equal((await req('2','coffee/serve','POST',{...table,sessionId:id,index:0,amount:99999})).status,409);
  for(let index=0;index<3;index++){
   const input={sessionId:id,index};assert.equal((await req('2','coffee/pour','POST',{...table,...input,ingredients:[]})).status,400);
   shift=await act('pour',{...input,ingredients:shift.session.order.ingredients});const p=shift.session.pour;
   assert.equal((await req('2','coffee/serve','POST',{...table,...input})).status,409);
   await delay(p.start+p.duration*(p.target+p.width/2)-Date.now());
   const replies=await Promise.all([req('2','coffee/serve','POST',{...table,...input,amount:99999,perfect:true}),req('2','coffee/serve','POST',{...table,...input})]);assert(replies.every(r=>r.status===200));shift=await replies[0].json();assert.equal(shift.receipt.perfect,true);assert.equal(shift.account.credits,index===2?45:(index+1)*12);
   assert.equal((await state('2')).credits,shift.account.credits,'Concurrent/replayed serve pays only once');
  }
  assert.equal(shift.session.done,true);assert.equal(shift.daily.remaining,0);assert.equal((await state('1')).credits,0,'Machine owner does not receive visitor wages');assert(messages.some(m=>m.type==='account'&&m.credits===45));
  shift=await act('start',{requestId:crypto.randomUUID()});assert.equal(shift.daily.remaining,0);const active=shift.session.id;
  ws.send(JSON.stringify({type:'join',roomId:'2'}));await delay(100);assert.equal((await req('2','coffee/pour','POST',{...table,sessionId:active,index:0,ingredients:shift.session.order.ingredients})).status,403);
  ws.send(JSON.stringify({type:'join',roomId:'1'}));await delay(100);assert.equal((await act('open')).session.id,active,'Room return resumes persisted shift');
  owner=await state('1');owner.room.scene.items=[];assert.equal((await req('1','room','PUT',{scene:owner.room.scene,revision:owner.room.revision})).status,200);assert.equal((await req('2','coffee/pour','POST',{...table,sessionId:active,index:0,ingredients:shift.session.order.ingredients})).status,409);
  console.log('PASS coffee real Worker/D1/DO/WebSocket: admin config, origin/auth, visitor machine, real-time preparation and precision, concurrent payment replay, daily cap, wallet broadcast, room resume/removal.');
 }finally{for(const ws of sockets)ws.close();await mf.dispose();}
})().catch(e=>{console.error(e);process.exitCode=1;});
