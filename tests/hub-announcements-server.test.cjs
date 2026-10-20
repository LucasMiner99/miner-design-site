const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {Miniflare,convertV4MiniflareOptions}=require('miniflare'),esbuild=require('esbuild');
(async()=>{
 const site=path.join(__dirname,'..');await esbuild.build({entryPoints:[site+'/src/index.js'],outfile:site+'/.test-build/announcements-test.mjs',bundle:true,format:'esm',platform:'browser',external:['cloudflare:workers']});
 const mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:'announcements-test',modules:true,scriptPath:site+'/.test-build/announcements-test.mjs',compatibilityDate:'2026-06-20',bindings:{HUB_ENABLED:'true',HUB_ORIGIN:'https://minerdesign.xyz'},d1Databases:['STREAMBOT_DB'],durableObjects:{HUB_WORLD:{className:'HubWorld',useSQLite:true},OVERLAY_ROOM:{className:'OverlayRoom',useSQLite:true}}}]}));
 try{
  const db=await mf.getD1Database('STREAMBOT_DB');await db.exec("CREATE TABLE streambot_settings(key TEXT PRIMARY KEY,value TEXT); INSERT INTO streambot_settings VALUES ('kick_user_id','1'),('kick_username','minerarg');");
  for(const sql of fs.readFileSync(site+'/hub-schema.sql','utf8').split(';').map(s=>s.trim()).filter(Boolean))await db.prepare(sql).run();
  const sessions={};for(const id of ['1','2','3']){sessions[id]=crypto.randomBytes(32).toString('base64url');await db.prepare('INSERT INTO hub_sessions VALUES(?,?,?,?)').bind(crypto.createHash('sha256').update(sessions[id]).digest('hex'),id,id==='1'?'minerarg':'Player'+id,Date.now()+3600000).run();}
  const req=(id,route,method='GET',body,headers={})=>mf.dispatchFetch('https://minerdesign.xyz/api/hub/'+route,{method,headers:{Cookie:'hub_session='+sessions[id],Origin:'https://minerdesign.xyz',...headers},body:body===undefined?undefined:JSON.stringify(body)});

  const state=async id=>await(await req(id,'state')).json();
  assert.deepEqual((await state('1')).announcement,{text:'',revision:0});await state('2');await state('3');
  const sockets=[],events=[];
  for(const id of ['1','2']){const r=await req(id,'ws','GET',undefined,{Upgrade:'websocket'});assert.equal(r.status,101);const ws=r.webSocket,list=[];ws.accept();ws.addEventListener('message',e=>list.push(JSON.parse(e.data)));sockets.push(ws);events.push(list);}
  const put=(id,b,headers)=>req(id,'admin/announcement','PUT',b,headers),delay=()=>new Promise(r=>setTimeout(r,100));await delay();
  assert.equal((await put(null,{text:'bad',revision:0})).status,401);
  assert.equal((await req('2','admin/announcement')).status,403);
  assert.equal((await put('2',{text:'bad',revision:0,admin:true})).status,403);
  assert.equal((await put('1',{text:'bad',revision:0},{Origin:'https://evil.test'})).status,403);
  for(const text of [null,[],{},'x'.repeat(281),'bad\ntext','bad\u202Etext'])assert.equal((await put('1',{text,revision:0})).status,400);
  assert.equal((await put('1',null)).status,400);
  const first=await(await put('1',{text:'  El casino está abierto 🎰  ',revision:0})).json();assert.deepEqual(first,{text:'El casino está abierto 🎰',revision:1});await delay();
  for(const list of events)assert.deepEqual(list.filter(e=>e.type==='announcement').at(-1).announcement,first,'Every room receives the message');
  assert.deepEqual((await state('3')).announcement,first,'New visitors receive persisted announcement');
  const late=await req('3','ws','GET',undefined,{Upgrade:'websocket'}),lateEvents=[];late.webSocket.accept();late.webSocket.addEventListener('message',e=>lateEvents.push(JSON.parse(e.data)));sockets.push(late.webSocket);await delay();assert.deepEqual(lateEvents.find(e=>e.type==='announcement').announcement,first);
  assert.equal((await put('1',{text:'stale',revision:0})).status,409);
  const edited=await(await put('1',{text:'<img src=x onerror=alert(1)>',revision:1})).json();assert.equal(edited.revision,2);
  const cleared=await(await put('1',{text:'',revision:2})).json();assert.deepEqual(cleared,{text:'',revision:3});await delay();
  for(const list of [...events,lateEvents])assert.deepEqual(list.filter(e=>e.type==='announcement').at(-1).announcement,cleared);
  assert.deepEqual((await state('2')).announcement,cleared);assert.deepEqual(await(await req('1','admin/announcement')).json(),cleared);
  for(const ws of sockets)ws.close();
  console.log('PASS announcements server: authentication, administrator-only writes, origin checks, validation, persisted state, all-room live broadcast, late joins, revisions and removal.');
 }finally{await mf.dispose();}
})().catch(e=>{console.error(e);process.exitCode=1;});
