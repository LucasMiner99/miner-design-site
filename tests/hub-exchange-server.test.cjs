const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {Miniflare,convertV4MiniflareOptions}=require('miniflare'),esbuild=require('esbuild');
(async()=>{
 const site=path.join(__dirname,'..');await esbuild.build({entryPoints:[site+'/src/index.js'],outfile:site+'/.test-build/exchange-test.mjs',bundle:true,format:'esm',platform:'browser',external:['cloudflare:workers']});
 const mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:'exchange-test',modules:true,scriptPath:site+'/.test-build/exchange-test.mjs',compatibilityDate:'2026-06-20',bindings:{HUB_ENABLED:'true',HUB_ORIGIN:'https://minerdesign.xyz'},d1Databases:['STREAMBOT_DB'],durableObjects:{HUB_WORLD:{className:'HubWorld',useSQLite:true},OVERLAY_ROOM:{className:'OverlayRoom',useSQLite:true}}}]}));
 const clients={};try{
  const db=await mf.getD1Database('STREAMBOT_DB');await db.exec("CREATE TABLE streambot_settings(key TEXT PRIMARY KEY,value TEXT); INSERT INTO streambot_settings VALUES ('kick_user_id','1'),('kick_username','minerarg');");for(const sql of fs.readFileSync(site+'/hub-schema.sql','utf8').split(';').map(s=>s.trim()).filter(Boolean))await db.prepare(sql).run();
  const sessions={};for(const id of ['1','2','3']){sessions[id]=crypto.randomBytes(32).toString('base64url');await db.prepare('INSERT INTO hub_sessions VALUES(?,?,?,?)').bind(crypto.createHash('sha256').update(sessions[id]).digest('hex'),id,id==='1'?'minerarg':'Player'+id,Date.now()+3600000).run();}
  const req=(id,route,method='GET',body,headers={})=>mf.dispatchFetch('https://minerdesign.xyz/api/hub/'+route,{method,headers:{Cookie:'hub_session='+sessions[id],Origin:'https://minerdesign.xyz',...headers},body:body?JSON.stringify(body):undefined});
  const state=async id=>await(await req(id,'state')).json(),table={roomId:'1',itemId:10};
  assert.equal((await req(null,'exchange/open','POST',table)).status,401);assert.equal((await req('2','exchange/open','POST',table,{Origin:'https://evil.test'})).status,403);
  assert.equal((await req('2','exchange/open','POST',table)).status,403,'Must be connected inside room');
  const owner=await state('1');owner.room.scene.items=[{id:10,type:83,x:2,y:2}];assert.equal((await req('1','room','PUT',{scene:owner.room.scene,revision:owner.room.revision})).status,200,'Admin places new machine');
  const delay=()=>new Promise(r=>setTimeout(r,100));
  for(const id of ['1','2','3']){await state(id);const r=await req(id,'ws','GET',null,{Upgrade:'websocket'});assert.equal(r.status,101);const ws=r.webSocket,messages=[];ws.addEventListener('message',e=>messages.push(JSON.parse(e.data)));ws.accept();clients[id]={ws,messages};await delay();ws.send(JSON.stringify({type:'join',roomId:'1'}));await delay();}
  const latest=id=>clients[id].messages.filter(m=>m.type==='trade').at(-1),send=async(id,action,extra={})=>{const t=latest(id)?.trade;clients[id].ws.send(JSON.stringify({type:'trade',action,id:t?.id,revision:t?.revision,...extra}));await delay();};
  await send('1','invite',{target:'2'});await send('2','join');await send('1','offer',{items:[{id:'object:0',count:4},{id:'object:1',count:2},{id:'object:2',count:2}],credits:0});await send('1','accept');await send('2','accept');assert.equal(latest('2').trade.status,'completed');
  const choices=await(await req('2','exchange/open','POST',table)).json();assert.equal(choices.items.length,3);assert.equal((await(await req('1','exchange/open','POST',table)).json()).items.length,0,'Virtual admin catalog does not supply free canjes');
  const input={...table,sourceId:'object:0',requestId:crypto.randomUUID()};
  const responses=await Promise.all([req('2','exchange/swap','POST',{...input,rewardId:'object:999',userId:'3',count:99}),req('2','exchange/swap','POST',input)]);assert(responses.every(r=>r.status===200));
  const data=await responses[0].json();assert.equal((await responses[1].json()).receipt.rewardId,data.receipt.rewardId);assert(!['object:0','object:1','object:2','object:999'].includes(data.receipt.rewardId));
  let current=await state('2');assert.equal(current.inventory.find(i=>i.id==='object:0').count,3);assert.equal(current.inventory.find(i=>i.id===data.receipt.rewardId).count,1);assert.equal(current.credits,0);assert(!(await state('3')).inventory.some(i=>i.id===data.receipt.rewardId));
  assert.equal((await req('2','exchange/swap','POST',{...input,requestId:crypto.randomUUID()})).status,409,'Limit survives fresh request IDs');
  const concurrent=await Promise.all([0,1,2].map(()=>req('2','exchange/swap','POST',{...table,sourceId:'object:1',requestId:crypto.randomUUID()})));assert.equal(concurrent.filter(r=>r.status===200).length,1,'Competing requests consume only one duplicate');
  current=await state('2');assert.equal(current.inventory.find(i=>i.id==='object:1').count,1);assert.equal((await req('3','exchange/swap','POST',{...table,sourceId:'object:2',requestId:crypto.randomUUID()})).status,409,'Identity cannot be forged');
  // The machine must still exist when submitting, not just when opening its menu.
  const fresh=await state('1');fresh.room.scene.items=[];await req('1','room','PUT',{scene:fresh.room.scene,revision:fresh.room.revision});
  assert.equal((await req('2','exchange/swap','POST',{...table,sourceId:'object:2',requestId:crypto.randomUUID()})).status,409);assert.equal((await state('2')).inventory.find(i=>i.id==='object:2').count,2);
  assert.equal((await req('2','exchange/swap','POST',input)).status,200,'Successful receipt remains recoverable after machine removal');
  console.log('PASS exchange real Worker + D1 + DO/SQLite + WebSocket: authentication/origin, machine presence, admin placement, earned duplicates, forged prize/identity, atomic concurrent canjes, replay recovery and persistent per-type limits.');
 }finally{for(const c of Object.values(clients))c.ws.close();await mf.dispose();}
})().catch(e=>{console.error(e);process.exitCode=1;});
