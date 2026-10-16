const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {Miniflare,convertV4MiniflareOptions}=require('miniflare');
const esbuild=require('esbuild');
const site=path.join(__dirname,'..');
const digest=s=>crypto.createHash('sha256').update(s).digest('hex');
(async()=>{
 await esbuild.build({entryPoints:[site+'/src/index.js'],outfile:site+'/.test-build/hub-test-bundle.mjs',bundle:true,format:'esm',platform:'browser',external:['cloudflare:workers']});
 const mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:"hub-test",modules:true,scriptPath:site+'/.test-build/hub-test-bundle.mjs',compatibilityDate:'2026-06-20',bindings:{HUB_ENABLED:'true',HUB_ORIGIN:'https://minerdesign.xyz',KICK_CLIENT_ID:'fixture-client',KICK_CLIENT_SECRET:'fixture-secret'},d1Databases:['STREAMBOT_DB'],durableObjects:{HUB_WORLD:{className:'HubWorld',useSQLite:true},OVERLAY_ROOM:{className:'OverlayRoom',useSQLite:true}}}]}));
 try{
  const db=await mf.getD1Database('STREAMBOT_DB');
  await db.exec("CREATE TABLE streambot_settings(key TEXT PRIMARY KEY,value TEXT); INSERT INTO streambot_settings VALUES ('kick_user_id','1'),('kick_username','minerarg');");
  for(const sql of fs.readFileSync(site+'/hub-schema.sql','utf8').split(';').map(s=>s.trim()).filter(Boolean))await db.prepare(sql).run();
  const sessions={};for(const [id,name] of [['1','minerarg'],['2','Visitante'],['3','minerarg']]){sessions[id]=crypto.randomBytes(32).toString('base64url');await db.prepare('INSERT INTO hub_sessions VALUES(?,?,?,?)').bind(digest(sessions[id]),id,name,Date.now()+3600000).run();}
  const req=async(id,route,method='GET',body,headers={})=>mf.dispatchFetch('https://minerdesign.xyz/api/hub/'+route,{method,redirect:'manual',headers:{Cookie:'hub_session='+sessions[id],Origin:'https://minerdesign.xyz',...headers},body:body?JSON.stringify(body):undefined});
  assert.equal((await req(null,'state')).status,401);
  const admin=await(await req('1','state')).json(),visitor=await(await req('2','state')).json(),impostor=await(await req('3','state')).json();
  assert.equal(admin.user.admin,true);assert.equal(impostor.user.admin,false);assert.equal(visitor.room.scene.items.length,0);assert.equal(visitor.user.appearance.pet,0);assert.equal(visitor.user.appearance.back,0);
  assert(visitor.inventory.some(i=>i.id==='look:hair:1'));assert.equal((await req('2','look','PUT',{appearance:{top:12}})).status,403);
  assert.equal((await req('2','look','PUT',{appearance:{hair:1}})).status,200);
  assert.equal((await req('2','look','PUT',{appearance:{}},{Origin:'https://evil.example'})).status,403);
  assert.equal((await req('2','admin/rewards')).status,404);
  assert.equal((await req('2','state','GET',null,{'X-Hub-Identity':JSON.stringify({id:'1',admin:true})})).status,200);
  assert.equal((await(await req('2','state','GET',null,{'X-Hub-Identity':'{"admin":true}'})).json()).user.admin,false);
  assert.equal((await req('1','admin/rewards','PUT',{object:'obj',character:'char',environment:'env'})).status,200);
  const ns=await mf.getDurableObjectNamespace('HUB_WORLD'),stub=ns.get(ns.idFromName('minerarg-beta-v1'));
  const event={id:'event1',type:'channel.reward.redemption.updated',payload:{id:'canje1',status:'accepted',reward:{id:'obj'},redeemer:{user_id:2,username:'Visitante'},broadcaster:{user_id:1}}};
  const kick=(e,channel='1')=>stub.fetch('https://hub/kick',{method:'POST',headers:{'X-Hub-Broadcaster':channel},body:JSON.stringify(e)});
  assert.equal((await(await kick(event,'99')).json()).ignored,true);
  await Promise.all([kick(event),kick(event),kick(event)]);
  let data=await(await req('2','state')).json();assert.equal(data.boxes.length,1);assert(!('itemId' in data.boxes[0]));
  assert.equal((await req('3','box/open','POST',{id:'canje1'})).status,403);
  const opened=await Promise.all([req('2','box/open','POST',{id:'canje1'}),req('2','box/open','POST',{id:'canje1'})]);
  const prize=(await opened[0].json()).receipt.itemId;data=await(await req('2','state')).json();assert.equal(data.inventory.find(i=>i.id===prize).count,1);assert.equal(data.boxes.length,0);
  event.id='event2';event.payload.id='canje2';event.payload.status='pending';assert.equal((await(await kick(event)).json()).pending,true);assert.equal((await(await req('2','state')).json()).boxes.length,0);
  // Both valid and oversubscribed rooms are checked by the server using the real geometry rules.
  const {C}=await import('../src/hub-rules.mjs');
  const scene=structuredClone(visitor.room.scene);scene.items=[{id:1,type:0,x:1,y:1}];
  assert.equal((await req('3','room','PUT',{scene,revision:0})).status,403);
  assert.equal((await req('1','room','PUT',{scene,revision:0})).status,200);
  assert.equal((await req('1','room','PUT',{scene,revision:0})).status,409);
  const empty=structuredClone(visitor.room.scene);assert.equal((await req('2','room','PUT',{scene:empty,revision:0})).status,200);
  // Real Workerd WebSockets: presence, walking, shared chat, Kick join and moderation.
  const connect=async id=>{const response=await req(id,'ws','GET',null,{Upgrade:'websocket'});assert.equal(response.status,101);const ws=response.webSocket,messages=[];ws.addEventListener('message',e=>{if(e.data!=='pong')messages.push(JSON.parse(e.data));});ws.accept();await new Promise(r=>setTimeout(r,35));return {ws,messages};};
  const a=await connect('1'),b=await connect('2');assert(a.messages.some(m=>m.type==='room'));b.ws.send(JSON.stringify({type:'join',roomId:'1'}));await new Promise(r=>setTimeout(r,45));assert(b.messages.some(m=>m.type==='room'&&m.room.id==='1'));assert(a.messages.some(m=>m.type==='presence'&&m.players.length===2));
  b.ws.send(JSON.stringify({type:'walk',x:5,y:5}));await new Promise(r=>setTimeout(r,45));assert(a.messages.some(m=>m.type==='walk'&&m.id==='2'));
  b.ws.send(JSON.stringify({type:'chat',text:'<script>hola</script>'}));await new Promise(r=>setTimeout(r,45));assert(a.messages.some(m=>m.type==='chat'&&m.text==='<script>hola</script>'));
  b.ws.send(JSON.stringify({type:'join',roomId:'2'}));await new Promise(r=>setTimeout(r,35));await kick({id:'chat1',type:'chat.message.sent',payload:{message_id:'chat1',sender:{user_id:2},broadcaster:{user_id:1},content:'!entrar'}});await new Promise(r=>setTimeout(r,35));assert.equal(b.messages.filter(m=>m.type==='room').at(-1).room.id,'1');
  assert.equal((await req('1','admin/moderate','POST',{id:'2',banned:true})).status,200);assert.equal((await req('2','state')).status,403);
  a.ws.close();try{b.ws.close();}catch{}
  // OAuth state is browser-bound and consumed once; no real OAuth credentials used.
  const login=await req(null,'login'),url=new URL(login.headers.get('location'));assert.equal(url.searchParams.get('scope'),'user:read');assert.equal(url.searchParams.get('code_challenge_method'),'S256');
  const callbackURL='https://minerdesign.xyz/api/streambot/oauth/callback';assert.equal(url.searchParams.get('redirect_uri'),callbackURL);assert.match(login.headers.get('set-cookie'),/Path=\/api\/;/);const state=url.searchParams.get('state');assert.match(state,/^hub\.[\w-]{43}$/);const denied=await mf.dispatchFetch('https://minerdesign.xyz/api/streambot/oauth/callback?state='+state+'&code=fixture');assert.equal(denied.status,400);
  const stored=await db.prepare('SELECT * FROM hub_oauth_states').all();assert.equal(stored.results.length,1);assert.notEqual(stored.results[0].state_hash,state);assert.equal(stored.results[0].state_hash,digest(state));
  const env={STREAMBOT_DB:db,HUB_WORLD:ns,HUB_ENABLED:'true',KICK_CLIENT_ID:'fixture-client',KICK_CLIENT_SECRET:'fixture-secret'};
  const {hubAuth,hubSession}=await import('../src/hub-auth.js');const {handleHub}=await import('../src/hub-gateway.js');const finish=()=>hubAuth(callback,env);
  const loginCookie=login.headers.get('set-cookie').split(';')[0],callback=new Request('https://minerdesign.xyz/api/streambot/oauth/callback?state='+state+'&code=fixture',{headers:{Cookie:loginCookie}});
  const botDenied=await mf.dispatchFetch(callbackURL);assert.equal(botDenied.status,400);assert.match(await botDenied.text(),/Kick no devolvi/);const disabled=await handleHub(callback,{...env,HUB_ENABLED:'false'});assert.equal(disabled.status,503);const wrongBrowser=await hubAuth(new Request(callback.url,{headers:{Cookie:'hub_login=wrong'}}),env);assert.equal(wrongBrowser.status,400);const originalFetch=global.fetch;let exchanges=0;
  try{global.fetch=async(url,options)=>{if(String(url)==='https://id.kick.com/oauth/token'){exchanges++;assert.equal(options.body.get('redirect_uri'),callbackURL);assert.equal(crypto.createHash('sha256').update(options.body.get('code_verifier')).digest('base64url'),new URL(login.headers.get('location')).searchParams.get('code_challenge'));return Response.json({access_token:'fixture-token'});}if(String(url)==='https://api.kick.com/public/v1/users')return Response.json({data:[{user_id:4,name:'RealKickName'}]});throw Error('Unexpected outbound URL');};
   const callbackResult=await finish();assert.equal(callbackResult.status,302);assert.equal(callbackResult.headers.get('location'),'https://minerdesign.xyz/hub/');assert.match(callbackResult.headers.getSetCookie().find(c=>c.startsWith('hub_login=')),/Path=\/api\/;.*Max-Age=0/);const sessionCookie=callbackResult.headers.getSetCookie().find(c=>c.startsWith('hub_session=')).split(';')[0];const identity=await hubSession(new Request('https://minerdesign.xyz/api/hub/state',{headers:{Cookie:sessionCookie}}),env);assert.match(callbackResult.headers.getSetCookie().find(c=>c.startsWith('hub_session=')),/Path=\/api\/hub;/);assert.equal((await db.prepare("SELECT value FROM streambot_settings WHERE key='kick_user_id'").first()).value,'1');assert.equal(identity.name,'RealKickName');assert.equal(identity.admin,false);assert.equal((await finish()).status,400);assert.equal(exchanges,1);
  }finally{global.fetch=originalFetch;}
  const {enqueueHubEvent,drainHubInbox}=await import('../src/hub-gateway.js');
  const pending={id:'retry-canje',status:'pending',reward:{id:'char'},redeemer:{user_id:3,username:'minerarg'},broadcaster:{user_id:1}};
  await enqueueHubEvent(env,'retry-event','channel.reward.redemption.updated',pending);await enqueueHubEvent(env,'retry-event','channel.reward.redemption.updated',pending);
  await drainHubInbox(env,async()=>{throw Error('Transient Kick failure');});assert.equal((await db.prepare("SELECT done FROM hub_event_inbox WHERE id='retry-event'").first()).done,0);
  await db.prepare("UPDATE hub_event_inbox SET next_try=0 WHERE id='retry-event'").run();await drainHubInbox(env,async()=>true);
  assert.equal((await db.prepare("SELECT done FROM hub_event_inbox WHERE id='retry-event'").first()).done,1);assert.equal((await(await req('3','state')).json()).boxes.length,1);
  const {validateScene}=await import('../src/hub-world.mjs');const unitScene={...empty,items:[{id:1,type:0,x:1,y:1}]},one={name:'test',inventory:{'object:0':1}};assert.equal(validateScene(unitScene,one,false).items.length,1);assert.throws(()=>validateScene({...unitScene,items:[...unitScene.items,{id:2,type:0,x:5,y:5}]},one,false),e=>e.status===403);
  const {hubRewardAdmin}=await import('../src/hub-reward-admin.js');
  const rewardEnv={...env,HUB_WORLD:{idFromName:()=>ns.idFromName('price-tests'),get:id=>ns.get(id)}};
  const rewards=[],callLog=[];let failOnce=true;
  const fakeKick=async(route,method='GET',payload)=>{callLog.push({route,method,payload});if(method==='GET')return {data:structuredClone(rewards)};if(method==='POST'){const r={id:'price-'+(rewards.length+1),...payload};rewards.push(r);return {data:r};}if(method==='PATCH'){if(failOnce){failOnce=false;throw Error('temporary interruption');}const r=rewards.find(r=>route.endsWith('/'+r.id));Object.assign(r,payload);return {data:r};}throw Error('Unexpected call');};
  const priceRequest=costs=>new Request('https://minerdesign.xyz/api/streambot/hub/rewards',{method:'POST',body:JSON.stringify({costs})});
  assert.deepEqual((await(await hubRewardAdmin(new Request('https://minerdesign.xyz/api/streambot/hub/rewards'),rewardEnv,fakeKick)).json()).costs,{object:2000,character:2000,environment:2000});
  await assert.rejects(()=>hubRewardAdmin(priceRequest({object:2000,character:2000,environment:2000}),rewardEnv,fakeKick));
  assert.equal(rewards.length,1);assert.equal(rewards[0].is_enabled,false);
  assert.equal((await hubRewardAdmin(priceRequest({object:2000,character:2000,environment:2000}),rewardEnv,fakeKick)).status,200);assert.equal(rewards.length,3);assert(rewards.every(r=>r.is_enabled&&r.cost===2000));
  await hubRewardAdmin(priceRequest({object:3000,character:4000,environment:5000}),rewardEnv,fakeKick);assert.equal(rewards.length,3);assert.deepEqual(rewards.map(r=>r.cost),[3000,4000,5000]);assert.equal(callLog.filter(c=>c.method==='POST').length,3);
  await assert.rejects(()=>hubRewardAdmin(priceRequest({object:-1,character:2000,environment:2000}),rewardEnv,fakeKick),e=>e.status===400);
  const crowd=[];for(let n=10;n<=30;n++){const id=String(n);sessions[id]=crypto.randomBytes(32).toString('base64url');await db.prepare('INSERT INTO hub_sessions VALUES(?,?,?,?)').bind(digest(sessions[id]),id,'Jugador'+id,Date.now()+3600000).run();const c=await connect(id);crowd.push(c);c.ws.send(JSON.stringify({type:'join',roomId:'1'}));}
  await new Promise(r=>setTimeout(r,100));assert.equal((await(await req('1','rooms')).json()).rooms.find(r=>r.id==='1').online,20);assert(crowd.at(-1).messages.some(m=>m.type==='error'&&/llena/.test(m.error)));for(const c of crowd)c.ws.close();
  console.log('PASS: real Worker + SQLite + D1: identity/admin, CSRF, ownership, replay, concurrent box opens, room revisions, WebSockets, movement, chat, !entrar, moderation and OAuth nonce.');
 }finally{await mf.dispose();}
})().catch(e=>{console.error(e);process.exitCode=1;});




