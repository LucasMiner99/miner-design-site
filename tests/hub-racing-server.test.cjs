const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {Miniflare,convertV4MiniflareOptions}=require('miniflare'),esbuild=require('esbuild');
(async()=>{
 const site=path.join(__dirname,'..');await esbuild.build({entryPoints:[site+'/src/index.js'],outfile:site+'/.test-build/racing-test.mjs',bundle:true,format:'esm',platform:'browser',external:['cloudflare:workers']});
 const mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:'racing-test',modules:true,scriptPath:site+'/.test-build/racing-test.mjs',compatibilityDate:'2026-06-20',bindings:{HUB_ENABLED:'true',HUB_ORIGIN:'https://minerdesign.xyz'},d1Databases:['STREAMBOT_DB'],durableObjects:{HUB_WORLD:{className:'HubWorld',useSQLite:true},OVERLAY_ROOM:{className:'OverlayRoom',useSQLite:true}}}]}));
 try{
  const db=await mf.getD1Database('STREAMBOT_DB');await db.exec("CREATE TABLE streambot_settings(key TEXT PRIMARY KEY,value TEXT); INSERT INTO streambot_settings VALUES ('kick_user_id','1'),('kick_username','minerarg');");
  for(const sql of fs.readFileSync(site+'/hub-schema.sql','utf8').split(';').map(s=>s.trim()).filter(Boolean))await db.prepare(sql).run();
  const sessions={};for(const id of ['1','2','3']){sessions[id]=crypto.randomBytes(32).toString('base64url');await db.prepare('INSERT INTO hub_sessions VALUES(?,?,?,?)').bind(crypto.createHash('sha256').update(sessions[id]).digest('hex'),id,id==='1'?'minerarg':'Player'+id,Date.now()+3600000).run();}
  const req=(id,route,method='GET',body,headers={})=>mf.dispatchFetch('https://minerdesign.xyz/api/hub/'+route,{method,headers:{Cookie:'hub_session='+sessions[id],Origin:'https://minerdesign.xyz',...headers},body:body===undefined?undefined:JSON.stringify(body)});
  const state=async id=>await(await req(id,'state')).json(),uuid=()=>crypto.randomUUID(),{racingPrize}=await import('../public/hub/racing-rules.mjs');
  const admin=await state('1'),scene={...admin.room.scene,items:[{id:1,type:99,x:2,y:2}]};
  assert(admin.inventory.some(i=>i.id==='object:99'));assert(!(await state('2')).inventory.some(i=>i.id==='object:99'));await state('3');
  assert.equal((await req('2','room','PUT',{scene,revision:0})).status,403);
  assert.equal((await req('1','room','PUT',{scene,revision:0})).status,200);
  const bet=(id,extra={})=>req(id,'racing/bet','POST',{roomId:'1',itemId:1,horse:0,amount:100,requestId:uuid(),...extra});
  assert.equal((await bet(null)).status,401);assert.equal((await req('2','racing/bet','POST',{}, {Origin:'https://evil.test'})).status,403);
  assert.equal((await req('2','racing/bet','POST',null)).status,400);
  assert.equal((await bet('2')).status,403,'Presence required');
  const connect=async id=>{const r=await req(id,'ws','GET',undefined,{Upgrade:'websocket'});assert.equal(r.status,101);const ws=r.webSocket;ws.accept();ws.send(JSON.stringify({type:'join',roomId:'1'}));await new Promise(r=>setTimeout(r,80));return ws;};
  const sockets=await Promise.all(['1','2','3'].map(connect));
  const initial=await(await req('2','racing/open','POST',{roomId:'1',itemId:1})).json();assert.equal(initial.rules.horses.length,5);assert.equal(initial.last,null);
  assert.equal((await bet('2',{itemId:2})).status,409);assert.equal((await bet('2',{roomId:'2'})).status,403);assert.equal((await bet('2')).status,409,'No forged balance');
  for(const amount of [-5,0,.5,6,'100',10005,Number.MAX_SAFE_INTEGER])assert.equal((await bet('2',{amount})).status,400);
  for(const horse of [-1,5,.5,'0','__proto__',null])assert.equal((await bet('2',{horse})).status,400);
  assert.equal((await bet('2',{requestId:'bad'})).status,400);
  await req('1','admin/credits','PUT',{rewards:{5000:'credits'}});
  const ns=await mf.getDurableObjectNamespace('HUB_WORLD'),stub=ns.get(ns.idFromName('minerarg-beta-v1'));
  for(const uid of ['2','3'])await stub.fetch('https://hub/kick',{method:'POST',headers:{'X-Hub-Broadcaster':'1'},body:JSON.stringify({type:'channel.reward.redemption.updated',payload:{id:'fund-'+uid,status:'accepted',reward:{id:'credits'},redeemer:{user_id:Number(uid),username:'Player'+uid},broadcaster:{user_id:1}}})});
  const versionBefore=(await state('2')).walletVersion;
  const id=uuid(),responses=await Promise.all([bet('2',{requestId:id,credits:999999,userId:'1',winner:0,prize:999999,payout:1000}),bet('2',{requestId:id})]);
  assert(responses.every(r=>r.status===200));const a=await responses[0].json(),b=await responses[1].json();assert.deepEqual(a.receipt,b.receipt);
  const r=a.receipt;assert(Number.isInteger(r.winner)&&r.winner>=0&&r.winner<5);assert.equal(r.prize,r.winner===0?racingPrize(0,100):0);assert.equal(r.after,5000-100+r.prize);
  assert.equal((await state('2')).credits,r.after);assert.equal((await state('2')).walletVersion,versionBefore+1);
  assert.equal((await bet('2',{requestId:id,horse:1})).status,409);assert.equal((await bet('2',{requestId:id,amount:5})).status,409);
  assert((await Promise.all([bet('2'),bet('2')])).every(r=>r.status===429));
  const other=await(await bet('3',{requestId:id,horse:4})).json();assert.equal(other.receipt.userId,'3');assert.equal(other.receipt.prize,other.receipt.winner===4?1800:0);
  const reopen=await(await req('2','racing/open','POST',{roomId:'1',itemId:1})).json();assert.deepEqual(reopen.last,r);assert(reopen.serverNow>=r.at);
  // Concurrent box spending must use the updated wallet.
  const box=await req('2','box/buy','POST',{kind:'object',expectedCost:2000,requestId:uuid()});assert.equal(box.status,200);assert.equal((await state('2')).credits,r.after-2000);
  const current=(await state('1')).room;assert.equal((await req('1','room','PUT',{scene:{...scene,items:[]},revision:current.revision})).status,200);
  assert.equal((await bet('2')).status,409);assert.equal((await req('2','racing/open','POST',{roomId:'1',itemId:1})).status,409);
  const replay=await(await bet('2',{requestId:id})).json();assert.deepEqual(replay.receipt,r,'Receipt survives machine removal');assert.equal((await state('2')).credits,r.after-2000,'Recovery never rewinds current wallet');
  sockets[1].send(JSON.stringify({type:'join',roomId:'2'}));await new Promise(r=>setTimeout(r,80));assert.equal((await bet('2',{requestId:id})).status,200);assert.equal((await bet('2')).status,403);
  for(const ws of sockets)ws.close();
  console.log('PASS racing server: Worker/D1/SQLite/WS authentication, presence, inventory, amount/horse validation, authoritative RNG/payout, atomic idempotency, cooldown, wallet and box spending, removed machines and receipt recovery.');
 }finally{await mf.dispose();}
})().catch(e=>{console.error(e);process.exitCode=1;});
