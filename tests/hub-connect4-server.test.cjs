const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {Miniflare,convertV4MiniflareOptions}=require('miniflare'),esbuild=require('esbuild');
(async()=>{
 const site=path.join(__dirname,'..');await esbuild.build({entryPoints:[site+'/src/index.js'],outfile:site+'/.test-build/connect4-test.mjs',bundle:true,format:'esm',platform:'browser',external:['cloudflare:workers']});
 const mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:'connect4-test',modules:true,scriptPath:site+'/.test-build/connect4-test.mjs',compatibilityDate:'2026-06-20',bindings:{HUB_ENABLED:'true',HUB_ORIGIN:'https://minerdesign.xyz'},d1Databases:['STREAMBOT_DB'],durableObjects:{HUB_WORLD:{className:'HubWorld',useSQLite:true},OVERLAY_ROOM:{className:'OverlayRoom',useSQLite:true}}}]}));
 try{
  const db=await mf.getD1Database('STREAMBOT_DB');await db.exec("CREATE TABLE streambot_settings(key TEXT PRIMARY KEY,value TEXT); INSERT INTO streambot_settings VALUES ('kick_user_id','1'),('kick_username','minerarg');");
  for(const sql of fs.readFileSync(site+'/hub-schema.sql','utf8').split(';').map(s=>s.trim()).filter(Boolean))await db.prepare(sql).run();
  const sessions={};for(const id of ['1','2','3']){sessions[id]=crypto.randomBytes(32).toString('base64url');await db.prepare('INSERT INTO hub_sessions VALUES(?,?,?,?)').bind(crypto.createHash('sha256').update(sessions[id]).digest('hex'),id,id==='1'?'minerarg':'Player'+id,Date.now()+3600000).run();}
  const req=(id,route,method='GET',body,headers={})=>mf.dispatchFetch('https://minerdesign.xyz/api/hub/'+route,{method,headers:{Cookie:'hub_session='+sessions[id],Origin:'https://minerdesign.xyz',...headers},body:body===undefined?undefined:JSON.stringify(body)});
  const state=async id=>await(await req(id,'state')).json(),act=(id,b)=>req(id,'connect4','POST',b),ok=async promise=>{const response=await promise,data=await response.json();assert.equal(response.status,200,JSON.stringify(data));return data;};
  const admin=await state('1'),scene={...admin.room.scene,items:[{id:1,type:100,x:2,y:2}]};
  assert(admin.inventory.some(i=>i.id==='object:100'));assert(!(await state('2')).inventory.some(i=>i.id==='object:100'));await state('3');
  assert.equal((await req('2','room','PUT',{scene,revision:0})).status,403);
  await ok(req('1','room','PUT',{scene,revision:0}));
  const open={action:'open',roomId:'1',itemId:1};
  assert.equal((await act(null,open)).status,401);
  assert.equal((await req('2','connect4','POST',open,{Origin:'https://evil.test'})).status,403);
  assert.equal((await act('2',null)).status,400);
  assert.equal((await act('2',open)).status,403);
  const messages=[],connect=async id=>{const r=await req(id,'ws','GET',undefined,{Upgrade:'websocket'});assert.equal(r.status,101);const ws=r.webSocket;ws.accept();ws.addEventListener('message',e=>{if(e.data!=='pong')messages.push({id,...JSON.parse(e.data)});});ws.send(JSON.stringify({type:'join',roomId:'1'}));await new Promise(r=>setTimeout(r,80));return ws;};
  const sockets=await Promise.all(['1','2','3'].map(connect));
  assert.equal((await ok(act('2',open))).players.length,2);
  assert.equal((await act('2',{...open,itemId:2})).status,409);
  const invite={action:'invite',roomId:'1',itemId:1,target:'3',stake:100,requestId:crypto.randomUUID()};
  assert.equal((await act('2',invite)).status,409,'No forged funds');
  for(const stake of [0,-1,.5,'100',10001])assert.equal((await act('2',{...invite,stake})).status,400);
  await req('1','admin/credits','PUT',{rewards:{5000:'credits'}});
  const ns=await mf.getDurableObjectNamespace('HUB_WORLD'),stub=ns.get(ns.idFromName('minerarg-beta-v1'));
  for(const uid of ['2','3'])await stub.fetch('https://hub/kick',{method:'POST',headers:{'X-Hub-Broadcaster':'1'},body:JSON.stringify({type:'channel.reward.redemption.updated',payload:{id:'fund-'+uid,status:'accepted',reward:{id:'credits'},redeemer:{user_id:Number(uid),username:'Player'+uid},broadcaster:{user_id:1}}})});
  const versions=await Promise.all(['2','3'].map(async id=>(await state(id)).walletVersion));
  let m=(await ok(act('2',invite))).match;assert.equal((await state('2')).credits,5000);
  assert.equal((await ok(act('2',invite))).match.id,m.id);
  assert.equal((await act('2',{...invite,stake:101})).status,409);
  assert.equal((await act('1',{action:'accept',id:m.id,revision:0})).status,403);
  assert.equal((await act('2',{action:'accept',id:m.id,revision:0})).status,403);
  const accepted=await Promise.all([act('3',{action:'accept',id:m.id,revision:0}),act('3',{action:'accept',id:m.id,revision:0})]);
  assert.deepEqual(accepted.map(r=>r.status).sort(),[200,409]);
  m=(await ok(act('2',{action:'sync'}))).match;assert.equal(m.status,'playing');
  for(const [i,id] of ['2','3'].entries()){const s=await state(id);assert.equal(s.credits,4900);assert.equal(s.walletVersion,versions[i]+1);}
  assert.equal((await req('1','room','PUT',{scene:{...scene,items:[]},revision:1})).status,409);
  assert.equal((await ok(act('1',open))).match.id,m.id,'Visitors can spectate');
  assert.equal((await act('1',{action:'move',id:m.id,revision:m.revision,column:0})).status,403);
  assert.equal((await act(m.users[1-m.turn],{action:'move',id:m.id,revision:m.revision,column:0})).status,409);
  // Refresh restores the match, even though the websocket initially joins home.
  sockets[1].close();sockets[1]=await connect('2');
  assert.equal((await ok(act('2',{action:'sync'}))).match.id,m.id);
  const first=m.turn,winner=m.users[first],loser=m.users[1-first];
  const move={action:'move',id:m.id,revision:m.revision,column:0};
  const concurrent=await Promise.all([act(winner,{...move,winner:0,credits:999999}),act(winner,move)]);
  assert.deepEqual(concurrent.map(r=>r.status).sort(),[200,409]);
  m=(await ok(act('2',{action:'sync'}))).match;assert.equal(m.board.filter(Boolean).length,1);
  for(const column of [1,0,1,0,1,0])m=(await ok(act(m.users[m.turn],{action:'move',id:m.id,revision:m.revision,column}))).match;
  assert.equal(m.status,'won');assert.equal(m.winner,first);assert.equal(m.line.length,4);
  assert.equal((await state(winner)).credits,5100);assert.equal((await state(loser)).credits,4900);
  await ok(act(winner,move));assert.equal((await state(winner)).credits,5100,'No duplicate payout');
  assert(messages.some(e=>e.id==='3'&&e.type==='connect4'&&e.match.status==='invited'));
  assert(messages.some(e=>e.id==='1'&&e.type==='connect4'&&e.match.status==='won'));
  await ok(req(winner,'box/buy','POST',{kind:'object',expectedCost:2000,requestId:crypto.randomUUID()}));assert.equal((await state(winner)).credits,3100);
  await ok(req('1','room','PUT',{scene:{...scene,items:[]},revision:1}));
  assert.equal((await act('2',open)).status,409);
  assert.equal((await ok(act('2',{action:'sync'}))).match.status,'won');
  for(const ws of sockets)ws.close();
  console.log('PASS Connect Four Worker/D1/SQLite/WS: auth/CSRF, object ownership, room presence, invitation consent, concurrent acceptance/moves, reconnect, spectator updates, win settlement, replay and subsequent spending.');
 }finally{await mf.dispose();}
})().catch(e=>{console.error(e);process.exitCode=1;});
