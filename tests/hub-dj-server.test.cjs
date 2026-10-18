const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {Miniflare,convertV4MiniflareOptions}=require('miniflare'),esbuild=require('esbuild');
(async()=>{
 const root=path.join(__dirname,'..');await esbuild.build({entryPoints:[root+'/src/index.js'],outfile:root+'/.test-build/dj-test.mjs',bundle:true,format:'esm',platform:'browser',external:['cloudflare:workers']});
 const mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:'dj-test',modules:true,scriptPath:root+'/.test-build/dj-test.mjs',compatibilityDate:'2026-06-20',bindings:{HUB_ENABLED:'true',HUB_ORIGIN:'https://minerdesign.xyz'},d1Databases:['STREAMBOT_DB'],durableObjects:{HUB_WORLD:{className:'HubWorld',useSQLite:true},OVERLAY_ROOM:{className:'OverlayRoom',useSQLite:true}}}]}));
 let ws;try{
  const db=await mf.getD1Database('STREAMBOT_DB');await db.exec("CREATE TABLE streambot_settings(key TEXT PRIMARY KEY,value TEXT); INSERT INTO streambot_settings VALUES ('kick_user_id','1'),('kick_username','minerarg');");for(const sql of fs.readFileSync(root+'/hub-schema.sql','utf8').split(';').map(s=>s.trim()).filter(Boolean))await db.prepare(sql).run();
  const sessions={};for(const id of ['1','2']){sessions[id]=crypto.randomBytes(32).toString('base64url');await db.prepare('INSERT INTO hub_sessions VALUES(?,?,?,?)').bind(crypto.createHash('sha256').update(sessions[id]).digest('hex'),id,id==='1'?'minerarg':'Visitor',Date.now()+3600000).run();}
  const req=(id,route,method='GET',body,headers={})=>mf.dispatchFetch('https://minerdesign.xyz/api/hub/'+route,{method,headers:{Cookie:'hub_session='+sessions[id],Origin:'https://minerdesign.xyz',...headers},body:body?JSON.stringify(body):undefined}),state=async id=>await(await req(id,'state')).json(),delay=ms=>new Promise(r=>setTimeout(r,Math.max(0,ms)));
  const table={roomId:'1',itemId:7},act=async(action,input={})=>{const r=await req('2','dj/'+action,'POST',{...table,...input}),body=await r.json();assert.equal(r.status,200,JSON.stringify(body));return body;};
  assert.equal((await req(null,'dj/open','POST',table)).status,401);assert.equal((await req('2','dj/open','POST',table,{Origin:'https://evil.test'})).status,403);assert.equal((await req('2','admin/dj','PUT',{dailyLimit:9999})).status,404);
  assert.equal((await req('1','admin/dj','PUT',{dailyLimit:95,rewards:[20,30,50]})).status,200);
  let owner=await state('1');owner.room.scene.items=[{id:7,type:72,x:3,y:3}];assert.equal((await req('1','room','PUT',{scene:owner.room.scene,revision:owner.room.revision})).status,200);assert.equal((await req('2','dj/open','POST',table)).status,403);
  await state('2');const connection=await req('2','ws','GET',null,{Upgrade:'websocket'});assert.equal(connection.status,101);ws=connection.webSocket;ws.accept();await delay(100);ws.send(JSON.stringify({type:'join',roomId:'1'}));await delay(100);
  for(let level=0;level<3;level++){
   const requestId=crypto.randomUUID(),s=await act('start',{requestId}),r=s.session.round,input={sessionId:s.session.id,level};assert.equal(r.level,level);assert.equal((await act('start',{requestId})).session.id,s.session.id);assert.equal((await req('2','dj/finish','POST',{...table,...input,amount:99999})).status,409);
   for(let i=0;i<r.count;i++){const n=r.notes[i];await delay(n.at-Date.now());const hit={...input,seq:i+1,lane:n.lane,at:0,perfect:true};const result=await act('hit',hit);assert(result.receipt.hit);if(!i){const replay=await act('hit',hit);assert.equal(replay.session.hits,1);}}
   await delay(r.end+30-Date.now());const results=await Promise.all([req('2','dj/finish','POST',{...table,...input}),req('2','dj/finish','POST',{...table,...input})]);assert(results.every(r=>r.status===200));assert.equal((await results[0].json()).receipt.amount,[20,30,45][level]);assert.equal((await state('2')).credits,[20,50,95][level]);
  }
  const s=await act('start',{requestId:crypto.randomUUID()});assert.equal(s.daily.remaining,0);ws.send(JSON.stringify({type:'join',roomId:'2'}));await delay(100);assert.equal((await req('2','dj/hit','POST',{...table,sessionId:s.session.id,level:0,seq:1,lane:0})).status,403);
  ws.send(JSON.stringify({type:'join',roomId:'1'}));await delay(100);assert.equal((await act('open')).session.id,s.session.id);owner=await state('1');owner.room.scene.items=[];assert.equal((await req('1','room','PUT',{scene:owner.room.scene,revision:owner.room.revision})).status,200);assert.equal((await req('2','dj/open','POST',table)).status,409);
  console.log('PASS DJ real Worker/D1/SQLiteDO/WS: auth/admin/origin, visitor table, 36 timed notes/3 levels, receipt dedupe, concurrent credit payout, cap95, room change/removal and resume.');
 }finally{ws?.close();await mf.dispose();}
})().catch(e=>{console.error(e);process.exitCode=1;});
