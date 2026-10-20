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
  const listed=(await(await req('1','rooms')).json()).rooms.find(r=>r.ownerId==='2');assert.equal(listed.appearance.hair,1,'Room portraits use the saved owner look even while offline');assert.equal(listed.inventory,undefined);assert.equal(listed.credits,undefined);assert.equal(listed.community,false);assert.deepEqual(Object.keys(listed).sort(),['active','appearance','community','id','name','online','ownerId','public']);
  assert.equal((await req('2','look','PUT',{appearance:{}},{Origin:'https://evil.example'})).status,403);
  assert.equal((await req('2','admin/rewards')).status,404);
  assert.equal((await req('2','state','GET',null,{'X-Hub-Identity':JSON.stringify({id:'1',admin:true})})).status,200);
  assert.equal((await(await req('2','state','GET',null,{'X-Hub-Identity':'{"admin":true}'})).json()).user.admin,false);
  assert.equal((await req('1','admin/rewards','PUT',{object:'obj',character:'char',environment:'env'})).status,200);
  const ns=await mf.getDurableObjectNamespace('HUB_WORLD'),stub=ns.get(ns.idFromName('minerarg-beta-v1'));
  // Feedback is private, persistent, attributed to the session, paginated and rate limited.
  const feedback={kind:'bug',text:'<img src=x onerror=alert(1)> Se trabó la puerta.',submissionId:crypto.randomUUID(),username:'Fake admin',userId:'1'};
  assert.equal((await req(null,'feedback','POST',feedback)).status,401);
  assert.equal((await req('2','feedback','POST',feedback,{Origin:'https://evil.example'})).status,403);
  assert.equal((await req('2','feedback','POST',{...feedback,text:' '})).status,400);
  assert.equal((await req('2','feedback','POST',{...feedback,text:'x'.repeat(1501)})).status,400);
  const submitted=await req('2','feedback','POST',feedback);assert.equal(submitted.status,201);const receipt=await submitted.json();
  assert.equal((await(await req('2','feedback','POST',feedback)).json()).id,receipt.id,'Retries do not duplicate feedback');
  assert.equal((await req('2','feedback','POST',{...feedback,submissionId:crypto.randomUUID()})).status,429);
  assert.equal((await req('3','admin/feedback')).status,403);
  assert.equal((await req('2','admin/feedback','PUT',{id:receipt.id,read:true})).status,403);
  let inbox=await(await req('1','admin/feedback')).json();assert.equal(inbox.entries.length,1);assert.equal(inbox.entries[0].username,'Visitante');assert.equal(inbox.entries[0].userId,'2');assert.equal(inbox.entries[0].text,feedback.text);
  assert.equal((await req('1','admin/feedback','PUT',{id:receipt.id,read:true})).status,200);
  inbox=await(await req('1','admin/feedback')).json();assert(inbox.entries[0].readAt);
  assert.equal((await req('1','admin/feedback','PUT',{id:receipt.id,read:false})).status,200);
  assert.equal((await(await req('1','admin/feedback')).json()).entries[0].readAt,null);
  for(let i=0;i<51;i++){const r=await stub.fetch('https://hub/feedback',{method:'POST',headers:{'X-Hub-Identity':JSON.stringify({id:String(1000+i),name:'Feedback '+i,admin:false,expiresAt:Date.now()+3600000})},body:JSON.stringify({kind:'idea',text:'Idea '+i,submissionId:crypto.randomUUID()})});assert.equal(r.status,201);}
  inbox=await(await req('1','admin/feedback')).json();assert.equal(inbox.entries.length,50);assert(inbox.nextCursor);
  const older=await(await req('1','admin/feedback?before='+encodeURIComponent(inbox.nextCursor))).json();assert.equal(older.entries.length,2);assert.equal(older.nextCursor,null);assert.equal(new Set([...inbox.entries,...older.entries].map(e=>e.id)).size,52);assert.equal((await req('1','admin/feedback?before=invalid')).status,400);
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
  const {C,CATALOG}=await import('../src/hub-rules.mjs');
  const scene=structuredClone(visitor.room.scene);scene.items=[{id:1,type:0,x:1,y:1}];
  assert.equal((await req('3','room','PUT',{scene,revision:0})).status,403);
  assert.equal((await req('1','room','PUT',{scene,revision:0})).status,200);
  assert.equal((await req('1','room','PUT',{scene,revision:0})).status,409);
  const empty=structuredClone(visitor.room.scene);assert.equal((await req('2','room','PUT',{scene:empty,revision:0})).status,200);
  // Real Workerd WebSockets: presence, walking, shared chat, Kick join and moderation.
  const connect=async id=>{const response=await req(id,'ws','GET',null,{Upgrade:'websocket'});assert.equal(response.status,101);const ws=response.webSocket,messages=[];ws.addEventListener('message',e=>{if(e.data!=='pong')messages.push(JSON.parse(e.data));});ws.accept();await new Promise(r=>setTimeout(r,35));return {ws,messages};};
  const a=await connect('1');assert.equal(a.messages.filter(m=>m.type==='online').at(-1).count,1);const b=await connect('2');assert.equal(a.messages.filter(m=>m.type==='online').at(-1).count,2,'Other rooms count globally');assert.equal(b.messages.filter(m=>m.type==='online').at(-1).count,2);assert(a.messages.some(m=>m.type==='room'));b.ws.send(JSON.stringify({type:'join',roomId:'1'}));await new Promise(r=>setTimeout(r,45));assert(b.messages.some(m=>m.type==='room'&&m.room.id==='1'));assert(a.messages.some(m=>m.type==='presence'&&m.players.length===2));assert.equal(a.messages.filter(m=>m.type==='online').at(-1).count,2,'Changing rooms does not add a player');
  b.ws.send(JSON.stringify({type:'walk',x:5,y:5,seq:17}));await new Promise(r=>setTimeout(r,45));assert(a.messages.some(m=>m.type==='walk'&&m.id==='2'&&m.seq===17));assert(b.messages.some(m=>m.type==='walk'&&m.id==='2'&&m.seq===17));
  b.ws.send(JSON.stringify({type:'chat',text:'<script>hola</script>'}));await new Promise(r=>setTimeout(r,45));assert(a.messages.some(m=>m.type==='chat'&&m.text==='<script>hola</script>'));
  b.ws.send(JSON.stringify({type:'join',roomId:'2'}));await new Promise(r=>setTimeout(r,35));await kick({id:'chat1',type:'chat.message.sent',payload:{message_id:'chat1',sender:{user_id:2},broadcaster:{user_id:1},content:'!entrar'}});await new Promise(r=>setTimeout(r,35));assert.equal(b.messages.filter(m=>m.type==='room').at(-1).room.id,'1');
  // Visitors can use shared objects without gaining decoration permissions.
  await new Promise(r=>setTimeout(r,1100));
  const furnished={...scene,items:[{id:1,type:0,x:1,y:1},{id:2,type:5,x:6,y:1},{id:3,type:26,wallSide:'left',wallU:6,wallZ:100}]};
  let saved=await req('1','room','PUT',{scene:furnished,revision:1});assert.equal(saved.status,200);let savedRoom=(await saved.json()).room;
  const send=async(client,value)=>{client.ws.send(JSON.stringify(value));await new Promise(r=>setTimeout(r,55));};
  await send(b,{type:'interact',itemId:2,on:true,roomId:'2'});
  assert(a.messages.some(m=>m.type==='interaction'&&m.itemId===2&&m.changes.on===false));
  assert(b.messages.some(m=>m.type==='interaction'&&m.itemId===2&&m.changes.on===false));
  assert.equal((await(await req('1','state')).json()).room.scene.items.find(i=>i.id===2).on,false);
  assert.equal((await req('2','room','PUT',{scene:furnished,revision:1})).status,403);
  await new Promise(r=>setTimeout(r,360));await send(b,{type:'interact',itemId:3});
  assert(a.messages.some(m=>m.type==='interaction'&&m.itemId===3&&m.changes.closed===true));
  await send(b,{type:'interact',itemId:1});assert.match(b.messages.at(-1).error,/no se puede usar/);
  await send(a,{type:'sit',itemId:1,slot:0,seq:31});
  assert(a.messages.some(m=>m.type==='walk'&&m.seq===31&&m.seat?.slot===0));
  await send(b,{type:'sit',itemId:1,slot:0,seq:32});assert.match(b.messages.at(-1).error,/ocupado/);
  await send(b,{type:'sit',itemId:1,slot:1,seq:33});assert(a.messages.some(m=>m.type==='walk'&&m.id==='2'&&m.seat?.slot===1));
  const c=await connect('3');await send(c,{type:'join',roomId:'1'});
  let snapshot=c.messages.filter(m=>m.type==='room').at(-1);assert.equal(snapshot.players.filter(p=>p.seat?.itemId===1).length,2,'Late join sees seats and approach paths');
  await new Promise(r=>setTimeout(r,1100));await send(b,{type:'walk',x:5,y:5,seq:34});assert.equal(b.messages.filter(m=>m.type==='walk'&&m.seq===34).at(-1).seat,null);
  await send(c,{type:'sit',itemId:1,slot:1,seq:35});assert(c.messages.some(m=>m.type==='walk'&&m.seq===35&&m.seat?.slot===1));
  await send(a,{type:'stand'});assert.equal(a.messages.filter(m=>m.type==='walk'&&m.id==='1').at(-1).seat,null);
  // An owner's stale decor snapshot cannot undo a visitor's light/curtain change.
  saved=await req('1','room','PUT',{scene:furnished,revision:savedRoom.revision});assert.equal(saved.status,200);savedRoom=(await saved.json()).room;
  assert.equal(savedRoom.scene.items.find(i=>i.id===2).on,false);assert.equal(savedRoom.scene.items.find(i=>i.id===3).closed,true);
  assert(c.messages.filter(m=>m.type==='scene').at(-1).players.some(p=>p.id==='3'&&p.seat?.slot===1));
  const removed={...furnished,items:furnished.items.filter(i=>i.id!==1)};
  saved=await req('1','room','PUT',{scene:removed,revision:savedRoom.revision});assert.equal(saved.status,200);
  await new Promise(r=>setTimeout(r,55));assert(c.messages.some(m=>m.type==='walk'&&m.id==='3'&&!m.seat&&!m.path.length),'Removing occupied furniture stands its occupant safely');
  await send(b,{type:'sit',itemId:2,slot:0});assert.match(b.messages.at(-1).error,/no está disponible/);
  await send(b,{type:'sit',itemId:999,slot:0});assert.match(b.messages.at(-1).error,/no está disponible/);
  // Shared YouTube cursor is owned by the room, volume stays client-local.
  await new Promise(r=>setTimeout(r,1100));
  savedRoom=(await(await req('1','state')).json()).room;const musicRoom={...savedRoom.scene,items:[...savedRoom.scene.items,{id:4,type:24,x:8,y:4}]};
  assert.equal((await req('1','room','PUT',{scene:musicRoom,revision:savedRoom.revision})).status,200);
  await send(b,{type:'media',action:'load',itemId:4,url:'https://youtu.be/M7lc1UVf-VE'});assert.match(b.messages.at(-1).error,/dueño/);
  await send(a,{type:'media',action:'load',itemId:2,url:'https://youtu.be/M7lc1UVf-VE'});assert.match(a.messages.at(-1).error,/Elegí/);
  await send(a,{type:'media',action:'load',itemId:4,url:'https://evil.example/watch?v=M7lc1UVf-VE'});assert.match(a.messages.at(-1).error,/enlace válido/);
  await send(a,{type:'media',action:'load',itemId:4,url:'https://youtu.be/M7lc1UVf-VE'});assert(a.messages.some(m=>m.type==='media'&&m.media?.videoId==='M7lc1UVf-VE'));assert(b.messages.some(m=>m.type==='media'&&m.media?.playing));
  await send(a,{type:'media',action:'seek',position:30,videoId:'M7lc1UVf-VE',seekToken:'seek-after-load'});assert.equal(b.messages.filter(m=>m.type==='media').at(-1).media.seekToken,'seek-after-load','Seek immediately after load is accepted');
  await new Promise(r=>setTimeout(r,600));await send(b,{type:'media',action:'sync'});assert(b.messages.filter(m=>m.type==='media').at(-1).media.position>30.5);
  await send(a,{type:'media',action:'pause'});const paused=b.messages.filter(m=>m.type==='media').at(-1).media;assert.equal(paused.playing,false);
  await new Promise(r=>setTimeout(r,600));await send(b,{type:'media',action:'sync'});assert.equal(b.messages.filter(m=>m.type==='media').at(-1).media.position,paused.position);
  await send(b,{type:'media',action:'seek',position:90,videoId:'M7lc1UVf-VE'});assert.match(b.messages.at(-1).error,/dueño/);
  await send(a,{type:'media',action:'seek',position:-1,videoId:'M7lc1UVf-VE'});assert.match(a.messages.at(-1).error,/posición válida/);
  await send(a,{type:'media',action:'seek',position:90000,videoId:'M7lc1UVf-VE'});assert.match(a.messages.at(-1).error,/posición válida/);
  await send(a,{type:'media',action:'seek',position:90,videoId:'aaaaaaaaaaa'});assert.match(a.messages.at(-1).error,/cambió/);
  await send(a,{type:'media',action:'seek',position:90,videoId:'M7lc1UVf-VE',seekToken:'seek-paused'});const seeked=b.messages.filter(m=>m.type==='media').at(-1).media;assert.equal(seeked.position,90);assert.equal(seeked.seekToken,'seek-paused');assert.equal(seeked.playing,false);assert(seeked.revision>paused.revision);
  await new Promise(r=>setTimeout(r,600));await send(b,{type:'media',action:'sync'});assert.equal(b.messages.filter(m=>m.type==='media').at(-1).media.position,90);
  await send(a,{type:'media',action:'resume'});await send(c,{type:'join',roomId:'2'});await send(c,{type:'join',roomId:'1'});assert.equal(c.messages.filter(m=>m.type==='room').at(-1).media.videoId,'M7lc1UVf-VE');
  savedRoom=(await(await req('1','state')).json()).room;assert.equal((await req('1','room','PUT',{scene:{...savedRoom.scene,items:savedRoom.scene.items.filter(i=>i.id!==4)},revision:savedRoom.revision})).status,200);
  await new Promise(r=>setTimeout(r,55));assert.equal(b.messages.filter(m=>m.type==='media').at(-1).media,null,'Removing the source stops shared audio');
  await send(a,{type:'join',roomId:'2'});await send(a,{type:'media',action:'load',itemId:4,url:'https://youtu.be/M7lc1UVf-VE'});assert.match(a.messages.at(-1).error,/dueño/,'Admin cannot control someone else’s music');await send(a,{type:'join',roomId:'1'});
  // Kick's native emote token survives the signed-chat bridge intact.
  await new Promise(r=>setTimeout(r,1100));
  await kick({id:'emote-chat',type:'chat.message.sent',payload:{message_id:'emote-chat',sender:{user_id:2},broadcaster:{user_id:1},content:'Hola [emote:123:Kappa]'}});
  await new Promise(r=>setTimeout(r,55));assert(a.messages.some(m=>m.type==='chat'&&m.text==='Hola [emote:123:Kappa]'));
  // Admin can grant catalog units; regular players still transfer only their earned stock.
  await send(b,{type:'trade',action:'invite',target:'1'});
  const tradeOf=client=>client.messages.filter(m=>m.type==='trade').at(-1).trade;
  let trade=tradeOf(b);assert.equal(trade.status,'invited');
  await send(c,{type:'trade',action:'accept',id:trade.id,revision:trade.revision});assert.match(c.messages.at(-1).error,/no disponible/);
  await send(a,{type:'trade',action:'join',id:trade.id,revision:trade.revision});trade=tradeOf(b);assert.equal(trade.status,'open');
  const action=(act,extra={})=>({type:'trade',action:act,id:trade.id,revision:trade.revision,...extra});
  const adminPrize=CATALOG.find(i=>i.kind==='object'&&!i.starter&&i.id!==prize).id;
  assert.equal(a.messages.filter(m=>m.type==='trade').at(-1).available.length,CATALOG.filter(i=>!i.starter).length);
  await send(a,action('offer',{items:[{id:adminPrize,count:1}]}));trade=tradeOf(b);assert.equal(trade.offers[1][0].id,adminPrize);
  await send(b,action('offer',{items:[{id:prize,count:2}]}));assert.match(b.messages.at(-1).error,/unidades propias/);
  await send(b,action('offer',{items:[{id:prize,count:1}]}));trade=tradeOf(b);
  await send(a,action('accept'));trade=tradeOf(b);assert.equal(trade.accepted[1],true);const stale=trade.revision;
  await send(b,action('offer',{items:[]}));trade=tradeOf(b);assert.deepEqual(trade.accepted,[false,false]);
  await new Promise(r=>setTimeout(r,1100));
  await send(b,action('offer',{items:[{id:prize,count:1}]}));trade=tradeOf(b);
  await send(a,{...action('accept'),revision:stale});assert.match(a.messages.at(-1).error,/oferta cambió/);
  a.ws.send(JSON.stringify(action('accept')));b.ws.send(JSON.stringify(action('accept')));await new Promise(r=>setTimeout(r,100));trade=tradeOf(b);assert.equal(trade.status,'completed');
  const actualInventory=async id=>(await(await stub.fetch('https://hub/state',{headers:{'X-Hub-Identity':JSON.stringify({id,name:id==='1'?'minerarg':'Visitante',admin:false,expiresAt:Date.now()+3600000})}})).json()).inventory;
  assert.equal((await actualInventory('1')).find(i=>i.id===prize).count,1);assert(!(await actualInventory('2')).some(i=>i.id===prize));assert.equal((await actualInventory('2')).find(i=>i.id===adminPrize).count,1);assert(!(await actualInventory('1')).some(i=>i.id===adminPrize),'Admin grant never creates a negative or fabricated earned balance');assert.deepEqual(trade.adminGrants,[false,true]);
  await send(b,action('accept'));assert.equal((await actualInventory('1')).find(i=>i.id===prize).count,1,'Replay never duplicates a gift');assert.equal((await actualInventory('2')).find(i=>i.id===adminPrize).count,1,'Replay cannot mint another admin grant');
  await send(a,{type:'trade',action:'invite',target:'2'});trade=tradeOf(a);
  await send(b,{type:'trade',action:'join',id:trade.id,revision:trade.revision});trade=tradeOf(a);
  await send(a,{type:'trade',action:'offer',id:trade.id,revision:trade.revision,items:[{id:prize,count:1}]});trade=tradeOf(a);
  await send(b,{type:'join',roomId:'2'});assert.equal(tradeOf(a).status,'cancelled');assert.equal((await actualInventory('1')).find(i=>i.id===prize).count,1,'Leaving cancels without moving inventory');
  await new Promise(r=>setTimeout(r,1100));await send(b,{type:'join',roomId:'1'});
  // Destination and path reservations are authoritative, even for a forged client.
  snapshot=b.messages.filter(m=>m.type==='room').at(-1);const occupied=snapshot.players.find(p=>p.id==='1');
  await send(b,{type:'walk',x:occupied.x,y:occupied.y,seq:200});assert.match(b.messages.at(-1).error,/alguien/);
  const corrected=b.messages.filter(m=>m.type==='walk'&&m.seq===200).at(-1);assert(corrected);assert.notDeepEqual(corrected.from,{x:occupied.x,y:occupied.y});
  c.ws.close();await new Promise(r=>setTimeout(r,80));assert.equal(a.messages.filter(m=>m.type==='online').at(-1).count,2,'Disconnect updates remaining rooms');
  assert.equal((await req('1','admin/moderate','POST',{id:'2',banned:true})).status,200);assert.equal((await req('2','state')).status,403);
  await new Promise(r=>setTimeout(r,80));assert.equal(a.messages.filter(m=>m.type==='online').at(-1).count,1,'Moderation disconnect updates count');const replacement=await connect('1');await new Promise(r=>setTimeout(r,80));assert.equal(replacement.messages.filter(m=>m.type==='online').at(-1).count,1,'Replacing a tab counts the account once');replacement.ws.close();a.ws.close();try{b.ws.close();}catch{}
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
  assert.deepEqual((await(await hubRewardAdmin(new Request('https://minerdesign.xyz/api/streambot/hub/rewards'),rewardEnv,fakeKick)).json()).costs,{object:2000,character:2000,environment:2000,plantation:2000});
  await assert.rejects(()=>hubRewardAdmin(priceRequest({object:2000,character:2000,environment:2000}),rewardEnv,fakeKick));
  assert.equal(rewards.length,1);assert.equal(rewards[0].is_enabled,false);
  assert.equal((await hubRewardAdmin(priceRequest({object:2000,character:2000,environment:2000}),rewardEnv,fakeKick)).status,200);assert.equal(rewards.length,6);assert(rewards.every(r=>r.is_enabled));assert.deepEqual(rewards.map(r=>r.cost),[50,100,500,1000,2000,5000]);
  await hubRewardAdmin(priceRequest({object:3000,character:4000,environment:5000}),rewardEnv,fakeKick);assert.equal(rewards.length,6);assert.deepEqual(rewards.map(r=>r.cost),[50,100,500,1000,2000,5000]);assert.equal(callLog.filter(c=>c.method==='POST').length,6);assert.deepEqual((await(await hubRewardAdmin(new Request('https://minerdesign.xyz/api/streambot/hub/rewards'),rewardEnv,fakeKick)).json()).costs,{object:3000,character:4000,environment:5000,plantation:2000});
  await assert.rejects(()=>hubRewardAdmin(priceRequest({object:-1,character:2000,environment:2000}),rewardEnv,fakeKick),e=>e.status===400);
  const crowd=[];for(let n=10;n<=30;n++){const id=String(n);sessions[id]=crypto.randomBytes(32).toString('base64url');await db.prepare('INSERT INTO hub_sessions VALUES(?,?,?,?)').bind(digest(sessions[id]),id,'Jugador'+id,Date.now()+3600000).run();const c=await connect(id);crowd.push(c);c.ws.send(JSON.stringify({type:'join',roomId:'1'}));}
  await new Promise(r=>setTimeout(r,100));assert.equal((await(await req('1','rooms')).json()).rooms.find(r=>r.id==='1').online,20);assert(crowd.at(-1).messages.some(m=>m.type==='error'&&/llena/.test(m.error)));for(const c of crowd)c.ws.close();
  // Tabletop coordinates survive the real room API and authoritative storage.
  const current=(await(await req('1','state')).json()).room;
  const fineScene={...current.scene,items:[{id:1,type:88,x:2.5,y:2.5},{id:2,type:77,x:2.5,y:2.5,parentId:1,surfaceX:6,surfaceY:2}]};
  const fineSave=await req('1','room','PUT',{scene:fineScene,revision:current.revision});assert.equal(fineSave.status,200);
  const fineRoom=(await fineSave.json()).room;assert.equal(fineRoom.scene.items[1].surfaceX,6);assert.equal((await(await req('1','state')).json()).room.scene.items[1].surfaceY,2);
  assert.equal(fineRoom.scene.items[0].x,2.5);assert.equal(fineRoom.scene.items[1].y,2.5);
  const offFloor={...fineScene,items:fineScene.items.map(i=>({...i,x:2.25}))};assert.equal((await req('1','room','PUT',{scene:offFloor,revision:fineRoom.revision})).status,400);
  const duplicate={...fineScene,items:[...fineScene.items,{...fineScene.items[1],id:3}]};assert.equal((await req('1','room','PUT',{scene:duplicate,revision:fineRoom.revision})).status,400);
  const offGrid={...fineScene,items:[fineScene.items[0],{...fineScene.items[1],surfaceX:6.5}]};assert.equal((await req('1','room','PUT',{scene:offGrid,revision:fineRoom.revision})).status,400);
  assert.equal((await req('1','look','PUT',{appearance:{top:18,hair:12,back:7}})).status,200);
  console.log('PASS: real Worker + SQLite + D1: identity/admin, CSRF, ownership, replay, concurrent box opens, room revisions, WebSockets, movement, chat, !entrar, moderation, OAuth nonce and fine tabletop persistence.');
 }finally{await mf.dispose();}
})().catch(e=>{console.error(e);process.exitCode=1;});




