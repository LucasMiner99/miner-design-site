const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {Miniflare,convertV4MiniflareOptions}=require('miniflare'),esbuild=require('esbuild');
(async()=>{
 const site=path.join(__dirname,'..');await esbuild.build({entryPoints:[site+'/src/index.js'],outfile:site+'/.test-build/scratch-test.mjs',bundle:true,format:'esm',platform:'browser',external:['cloudflare:workers']});
 const mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:'scratch-test',modules:true,scriptPath:site+'/.test-build/scratch-test.mjs',compatibilityDate:'2026-06-20',bindings:{HUB_ENABLED:'true',HUB_ORIGIN:'https://minerdesign.xyz'},d1Databases:['STREAMBOT_DB'],durableObjects:{HUB_WORLD:{className:'HubWorld',useSQLite:true},OVERLAY_ROOM:{className:'OverlayRoom',useSQLite:true}}}]}));
 try{
  const db=await mf.getD1Database('STREAMBOT_DB');await db.exec("CREATE TABLE streambot_settings(key TEXT PRIMARY KEY,value TEXT); INSERT INTO streambot_settings VALUES ('kick_user_id','1'),('kick_username','minerarg');");
  for(const sql of fs.readFileSync(site+'/hub-schema.sql','utf8').split(';').map(s=>s.trim()).filter(Boolean))await db.prepare(sql).run();
  const sessions={};for(const id of ['1','2','3']){sessions[id]=crypto.randomBytes(32).toString('base64url');await db.prepare('INSERT INTO hub_sessions VALUES(?,?,?,?)').bind(crypto.createHash('sha256').update(sessions[id]).digest('hex'),id,id==='1'?'minerarg':'Player'+id,Date.now()+3600000).run();}
  const req=(id,route,method='GET',body,headers={})=>mf.dispatchFetch('https://minerdesign.xyz/api/hub/'+route,{method,headers:{Cookie:'hub_session='+sessions[id],Origin:'https://minerdesign.xyz',...headers},body:body===undefined?undefined:JSON.stringify(body)});


  const state=async id=>await(await req(id,'state')).json(),uuid=()=>crypto.randomUUID();
  const admin=await state('1');await state('2');await state('3');const scene={...admin.room.scene,items:[{id:5,type:119,x:2,y:2}]};
  assert(admin.inventory.some(i=>i.id==='object:119'));assert(!(await state('2')).inventory.some(i=>i.id==='object:119'));
  assert.equal((await req('2','room','PUT',{scene,revision:0})).status,403);assert.equal((await req('1','room','PUT',{scene,revision:0})).status,200);
  const input={roomId:'1',itemId:5},buy=(id,extra={})=>req(id,'scratch/buy','POST',{...input,amount:100,requestId:uuid(),...extra});
  assert.equal((await buy(null)).status,401);assert.equal((await req('2','scratch/buy','POST',{}, {Origin:'https://evil.test'})).status,403);
  assert.equal((await buy('2')).status,403);assert.equal((await req('2','scratch/open','POST',null)).status,400);
  const connect=async id=>{const r=await req(id,'ws','GET',undefined,{Upgrade:'websocket'});assert.equal(r.status,101);const ws=r.webSocket;ws.accept();ws.send(JSON.stringify({type:'join',roomId:'1'}));await new Promise(r=>setTimeout(r,90));return ws;};const sockets=await Promise.all(['1','2','3'].map(connect));
  assert.equal((await buy('2')).status,409);for(const amount of [-1,0,.5,1,101,'50',1e20])assert.equal((await buy('2',{amount})).status,400);
  assert.equal((await buy('2',{requestId:'bad'})).status,400);assert.equal((await buy('2',{itemId:99})).status,409);
  await req('1','admin/credits','PUT',{rewards:{5000:'scratch-credits'}});const ns=await mf.getDurableObjectNamespace('HUB_WORLD'),stub=ns.get(ns.idFromName('minerarg-beta-v1'));
  for(const uid of ['2','3'])await stub.fetch('https://hub/kick',{method:'POST',headers:{'X-Hub-Broadcaster':'1'},body:JSON.stringify({type:'channel.reward.redemption.updated',payload:{id:'scratch-fund-'+uid,status:'accepted',reward:{id:'scratch-credits'},redeemer:{user_id:Number(uid),username:'Player'+uid},broadcaster:{user_id:1}}})});
  const requestId=uuid(),before=(await state('2')).credits;
  const rs=await Promise.all([buy('2',{requestId,symbols:Array(9).fill(7),prize:99999,credits:999999}),buy('2',{requestId})]);assert(rs.every(r=>r.status===200));let ticket=(await rs[0].json()).ticket;assert.deepEqual(ticket,(await rs[1].json()).ticket);
  assert.equal(ticket.status,'pending');assert.equal((await state('2')).credits,before-100);assert.equal(ticket.prize,undefined);
  assert.equal((await buy('2',{requestId,amount:50})).status,409);assert.equal((await buy('2')).status,409,'Only one pending ticket');
  sockets[1].close();sockets[1]=await connect('2');assert.deepEqual((await(await req('2','scratch/open','POST',input)).json()).ticket,ticket);
  assert.equal((await req('3','scratch/claim','POST',{ticketId:ticket.id})).status,404);
  const {scratchResult}=await import('../public/hub/scratch-rules.mjs'),expected=scratchResult(ticket.symbols).multiplier*100;
  const claims=await Promise.all([req('2','scratch/claim','POST',{ticketId:ticket.id,prize:999999,symbols:Array(9).fill(7)}),req('2','scratch/claim','POST',{ticketId:ticket.id})]);assert(claims.every(r=>r.status===200));ticket=(await claims[0].json()).ticket;assert.deepEqual(ticket,(await claims[1].json()).ticket);assert.equal(ticket.status,'claimed');assert.equal(ticket.prize,expected);assert.equal((await state('2')).credits,before-100+expected);
  assert.deepEqual((await(await buy('2',{requestId})).json()).ticket,ticket,'Retry old purchase returns same paid ticket');
  const r3=await buy('3',{amount:25});assert.equal(r3.status,200);const third=(await r3.json()).ticket;
  const room=(await state('1')).room;assert.equal((await req('1','room','PUT',{scene:{...scene,items:[]},revision:room.revision})).status,200);
  assert.equal((await req('3','scratch/open','POST',input)).status,409);assert.equal((await req('3','scratch/claim','POST',{ticketId:third.id})).status,200,'Owned paid ticket remains claimable after table removal');
  assert.equal((await req('3','scratch/claim','POST',{ticketId:uuid()})).status,404);assert.equal((await req('3','scratch/claim','POST',{})).status,400);
  await req('2','scratch/claim','POST',{ticketId:ticket.id});assert.equal((await state('2')).credits,before-100+expected);
  for(const ws of sockets)ws.close();console.log('PASS scratch server: authentication, CSRF, table presence, inventory, wallet, spoofed input, atomic concurrent retries, single pending ticket, reconnect, ownership and safe claim after removal.');
 }finally{await mf.dispose();}
})().catch(e=>{console.error(e);process.exitCode=1;});
