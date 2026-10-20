const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const {Miniflare,convertV4MiniflareOptions}=require('miniflare'),esbuild=require('esbuild');
(async()=>{
 const root=path.resolve(__dirname,'..');
 await esbuild.build({entryPoints:[root+'/src/index.js'],outfile:root+'/.test-build/community-test.mjs',bundle:true,format:'esm',platform:'browser',external:['cloudflare:workers']});
 const mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:'community-test',modules:true,scriptPath:root+'/.test-build/community-test.mjs',compatibilityDate:'2026-06-20',bindings:{HUB_ENABLED:'true',HUB_ORIGIN:'https://minerdesign.xyz'},d1Databases:['STREAMBOT_DB'],durableObjects:{HUB_WORLD:{className:'HubWorld',useSQLite:true},OVERLAY_ROOM:{className:'OverlayRoom',useSQLite:true}}}]})),sockets=[];
 try{
  const db=await mf.getD1Database('STREAMBOT_DB');await db.exec("CREATE TABLE streambot_settings(key TEXT PRIMARY KEY,value TEXT); INSERT INTO streambot_settings VALUES ('kick_user_id','1'),('kick_username','minerarg');");
  for(const sql of fs.readFileSync(root+'/hub-schema.sql','utf8').split(';').map(s=>s.trim()).filter(Boolean))await db.prepare(sql).run();
  const sessions={};for(const id of ['1','2','3']){sessions[id]=crypto.randomBytes(32).toString('base64url');await db.prepare('INSERT INTO hub_sessions VALUES(?,?,?,?)').bind(crypto.createHash('sha256').update(sessions[id]).digest('hex'),id,id==='1'?'minerarg':'Jugador'+id,Date.now()+3600000).run();}
  const req=(id,route,method='GET',body,extra={})=>mf.dispatchFetch('https://minerdesign.xyz/api/hub/'+route,{method,headers:{Cookie:'hub_session='+sessions[id],Origin:'https://minerdesign.xyz',...extra},body:body===undefined?undefined:JSON.stringify(body)});
  const ok=async p=>{const r=await p,b=await r.json();assert.equal(r.status,200,JSON.stringify(b));return b;},state=id=>ok(req(id,'state')),pause=()=>new Promise(r=>setTimeout(r,90)),messages=[];
  const home=(await state('1')).room;await state('2');await state('3');
  let casino=(await ok(req('1','admin/community'))).room;
  assert.equal(casino.id,'casino');assert(casino.community);assert.equal(casino.ownerId,'1');assert.equal(casino.public,false);assert.equal(casino.scene.items.length,17);
  assert.deepEqual((await ok(req('1','admin/community'))).room,casino,'Seed never overwrites saved room');
  assert((await ok(req('2','rooms'))).rooms.some(r=>r.community&&!r.public),'Closed community stays visible');
  for(const id of [null,'2'])assert.equal((await req(id,'admin/community','PUT',{roomId:'casino',public:true})).status,id?404:401);
  assert.equal((await req('1','admin/community','PUT',{roomId:'casino',public:true},{Origin:'https://evil.test'})).status,403);
  assert.equal((await req('2','room','PUT',{roomId:'casino',revision:casino.revision,scene:casino.scene})).status,403);
  assert.equal((await req('1','room','PUT',{roomId:'2',revision:0,scene:casino.scene})).status,403,'Admin cannot accidentally replace another personal room');
  const decorated={...casino.scene,wall:3};
  casino=(await ok(req('1','room','PUT',{roomId:'casino',revision:casino.revision,scene:decorated,public:true}))).room;
  assert.equal(casino.public,false,'Decoration cannot open the room');assert.equal(casino.name,'Casino');assert.equal(casino.scene.name,'Casino');assert.deepEqual((await state('1')).room,home,'Casino never overwrites personal room');
  for(const id of ['1','2','3']){const r=await req(id,'ws','GET',undefined,{Upgrade:'websocket'});assert.equal(r.status,101);const ws=r.webSocket;ws.accept();ws.addEventListener('message',e=>{if(e.data!=='pong')messages.push({id,...JSON.parse(e.data)});});sockets.push(ws);}
  await pause();sockets[1].send(JSON.stringify({type:'join',roomId:'casino'}));await pause();assert(messages.some(m=>m.id==='2'&&m.type==='error'));
  sockets[0].send(JSON.stringify({type:'join',roomId:'casino'}));await pause();assert(messages.some(m=>m.id==='1'&&m.type==='room'&&m.room.id==='casino'),'Admin can decorate closed room');
  assert.equal((await req('1','room','PUT',{revision:home.revision,scene:casino.scene})).status,409,'An old tab cannot save the community scene over the personal home');
  assert.deepEqual((await state('1')).room,home);
  casino=(await ok(req('1','admin/community','PUT',{roomId:'casino',public:true}))).room;
  assert.equal((await req('1','room','PUT',{roomId:'casino',revision:casino.revision-1,scene:decorated})).status,409,'Closing/opening protects against stale writes');
  for(const ws of sockets.slice(1))ws.send(JSON.stringify({type:'join',roomId:'casino'}));await pause();
  for(const id of ['2','3'])assert(messages.some(m=>m.id===id&&m.type==='room'&&m.room.id==='casino'));
  const {C}=await import('../src/hub-rules.mjs');
  for(const route of ['fishing','basket','dj','coffee','racing','roulette','exchange']){
   const item=casino.scene.items.find(i=>C.TYPES[i.type].interaction===route);assert(item,route);
   await ok(req('2',route+'/open','POST',{roomId:'casino',itemId:item.id}));
  }
  const table=casino.scene.items.find(i=>C.TYPES[i.type].interaction==='connect4'),base={roomId:'casino',itemId:table.id};
  await ok(req('2','connect4','POST',{...base,action:'open'}));
  sockets[1].send(JSON.stringify({type:'room-light',on:true}));await pause();assert.equal((await ok(req('1','admin/community'))).room.scene.lightsOn,false);
  sockets[0].send(JSON.stringify({type:'room-light',on:true}));await pause();assert.equal((await ok(req('1','admin/community'))).room.scene.lightsOn,true);
  await ok(req('1','admin/credits','PUT',{rewards:{5000:'credits'}}));const ns=await mf.getDurableObjectNamespace('HUB_WORLD'),stub=ns.get(ns.idFromName('minerarg-beta-v1'));
  for(const uid of ['2','3'])await stub.fetch('https://hub/kick',{method:'POST',headers:{'X-Hub-Broadcaster':'1'},body:JSON.stringify({type:'channel.reward.redemption.updated',payload:{id:'fund-'+uid,status:'accepted',reward:{id:'credits'},redeemer:{user_id:Number(uid),username:'Jugador'+uid},broadcaster:{user_id:1}}})});
  let match=(await ok(req('2','connect4','POST',{...base,action:'invite',target:'3',stake:100,requestId:crypto.randomUUID()}))).match;
  match=(await ok(req('3','connect4','POST',{action:'accept',id:match.id,revision:match.revision}))).match;
  assert.equal((await state('2')).credits,4900);
  const close={roomId:'casino',public:false};
  await Promise.all([ok(req('1','admin/community','PUT',close)),ok(req('1','admin/community','PUT',close))]);await pause();
  for(const id of ['2','3']){assert.equal((await state(id)).credits,5000,'Exactly one refund');assert(messages.some(m=>m.id===id&&m.type==='notice'));assert(messages.some(m=>m.id===id&&m.type==='room'&&m.room.id===id));}
  const final=(await ok(req('2','connect4','POST',{action:'sync'}))).match;assert.equal(final.status,'draw');assert.equal(final.winner,null);
  assert.equal((await req('2','fishing/open','POST',{roomId:'casino',itemId:2})).status,403);
  sockets[1].send(JSON.stringify({type:'join',roomId:'casino'}));await pause();
  assert.equal((await ok(req('2','rooms'))).rooms.find(r=>r.id==='casino').online,1,'Only admin remains inside');
  await ok(req('1','admin/community','PUT',{roomId:'casino',public:true}));
  sockets[1].send(JSON.stringify({type:'join',roomId:'casino'}));await pause();await ok(req('2','fishing/open','POST',{roomId:'casino',itemId:2}));
  assert.equal((await ok(req('1','admin/community'))).room.scene.wall,3,'Reopening preserves custom decoration');assert.deepEqual((await state('1')).room,home);
  console.log('PASS community real Worker/D1/DO/WS: seed/persistence, admin-only edit/open, personal room isolation, closed visibility/admission, all eight interactive games, lighting, stale saves, eject/reopen, concurrent close and exact wager refunds.');
 }finally{for(const ws of sockets)ws.close();await mf.dispose();}
})().catch(e=>{console.error(e);process.exitCode=1;});
