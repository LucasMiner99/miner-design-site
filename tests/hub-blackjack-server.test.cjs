const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {Miniflare,convertV4MiniflareOptions}=require('miniflare'),esbuild=require('esbuild');
(async()=>{
 const site=path.join(__dirname,'..');await esbuild.build({entryPoints:[site+'/src/index.js'],outfile:site+'/.test-build/blackjack-test.mjs',bundle:true,format:'esm',platform:'browser',external:['cloudflare:workers']});
 const mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:'blackjack-test',modules:true,scriptPath:site+'/.test-build/blackjack-test.mjs',compatibilityDate:'2026-06-20',bindings:{HUB_ENABLED:'true',HUB_ORIGIN:'https://minerdesign.xyz'},d1Databases:['STREAMBOT_DB'],durableObjects:{HUB_WORLD:{className:'HubWorld',useSQLite:true},OVERLAY_ROOM:{className:'OverlayRoom',useSQLite:true}}}]}));
 try{
  const db=await mf.getD1Database('STREAMBOT_DB');await db.exec("CREATE TABLE streambot_settings(key TEXT PRIMARY KEY,value TEXT); INSERT INTO streambot_settings VALUES ('kick_user_id','1'),('kick_username','minerarg');");
  for(const sql of fs.readFileSync(site+'/hub-schema.sql','utf8').split(';').map(s=>s.trim()).filter(Boolean))await db.prepare(sql).run();
  const sessions={};for(const id of ['1','2','3']){sessions[id]=crypto.randomBytes(32).toString('base64url');await db.prepare('INSERT INTO hub_sessions VALUES(?,?,?,?)').bind(crypto.createHash('sha256').update(sessions[id]).digest('hex'),id,id==='1'?'minerarg':'Player'+id,Date.now()+3600000).run();}
  const req=(id,route,method='GET',body,headers={})=>mf.dispatchFetch('https://minerdesign.xyz/api/hub/'+route,{method,headers:{Cookie:'hub_session='+sessions[id],Origin:'https://minerdesign.xyz',...headers},body:body===undefined?undefined:JSON.stringify(body)});

  const state=async id=>await(await req(id,'state')).json(),uuid=()=>crypto.randomUUID();
  const admin=await state('1');await state('2');await state('3');const scene={...admin.room.scene,items:[{id:5,type:118,x:2,y:2}]};
  assert(admin.inventory.some(i=>i.id==='object:118'));assert(!(await state('2')).inventory.some(i=>i.id==='object:118'));
  assert.equal((await req('2','room','PUT',{scene,revision:0})).status,403);assert.equal((await req('1','room','PUT',{scene,revision:0})).status,200);
  const input={roomId:'1',itemId:5},start=(id,extra={})=>req(id,'blackjack/start','POST',{...input,amount:100,requestId:uuid(),...extra});
  assert.equal((await start(null)).status,401);assert.equal((await req('2','blackjack/start','POST',{}, {Origin:'https://evil.test'})).status,403);
  assert.equal((await start('2')).status,403);assert.equal((await req('2','blackjack/open','POST',null)).status,400);
  const connect=async id=>{const r=await req(id,'ws','GET',undefined,{Upgrade:'websocket'});assert.equal(r.status,101);const ws=r.webSocket;ws.accept();ws.send(JSON.stringify({type:'join',roomId:'1'}));await new Promise(r=>setTimeout(r,90));return ws;};const sockets=await Promise.all(['1','2','3'].map(connect));
  assert.equal((await start('2')).status,409);for(const amount of [-1,0,.5,'50',1e20])assert.equal((await start('2',{amount})).status,400);
  assert.equal((await start('2',{requestId:'bad'})).status,400);assert.equal((await start('2',{itemId:99})).status,409);
  await req('1','admin/credits','PUT',{rewards:{5000:'blackjack-credits'}});const ns=await mf.getDurableObjectNamespace('HUB_WORLD'),stub=ns.get(ns.idFromName('minerarg-beta-v1'));
  for(const uid of ['2','3'])await stub.fetch('https://hub/kick',{method:'POST',headers:{'X-Hub-Broadcaster':'1'},body:JSON.stringify({type:'channel.reward.redemption.updated',payload:{id:'bj-fund-'+uid,status:'accepted',reward:{id:'blackjack-credits'},redeemer:{user_id:Number(uid),username:'Player'+uid},broadcaster:{user_id:1}}})});
  let requestId,game,initialBalance;
  // Obtain a playable hand; natural blackjacks may finish at the initial deal.
  for(let attempt=0;attempt<20;attempt++){
   if(attempt)await new Promise(r=>setTimeout(r,1250));requestId=uuid();initialBalance=(await state('2')).credits;
   const rs=await Promise.all([start('2',{requestId,credits:999999,deck:[0,9,9,6]}),start('2',{requestId})]);assert(rs.every(r=>r.status===200));const a=await rs[0].json(),b=await rs[1].json();assert.deepEqual(a.game,b.game);game=a.game;
   assert.equal((await state('2')).credits,initialBalance-100+(game.payout||0));
   assert.equal((await start('2',{requestId,amount:99})).status,409);
   if(game.status==='playing')break;
  }
  assert.equal(game.status,'playing');assert.equal(game.dealer[1],null);for(const field of ['deck','cursor','actions'])assert(!Object.hasOwn(game,field));
  assert.equal((await start('2')).status,409,'One active hand per user');
  sockets[1].close();sockets[1]=await connect('2');const opened=await(await req('2','blackjack/open','POST',input)).json();assert.deepEqual(opened.game,game,'Reconnect resumes the dealt hand');
  const action={...input,handId:game.id,revision:0,requestId:uuid(),action:'hit'};
  assert.equal((await req('3','blackjack/play','POST',action)).status,404,'Cannot play another account hand');
  assert.equal((await req('2','blackjack/play','POST',{...action,revision:99})).status,409);
  const hits=await Promise.all([req('2','blackjack/play','POST',action),req('2','blackjack/play','POST',action)]);assert(hits.every(r=>r.status===200));const h1=await hits[0].json(),h2=await hits[1].json();assert.deepEqual(h1.game,h2.game);game=h1.game;assert.equal(game.player.length,3);assert.equal(game.revision,1);
  assert.equal((await req('2','blackjack/play','POST',{...action,action:'stand'})).status,409);
  if(game.status==='playing'){
   assert.equal((await req('2','blackjack/play','POST',{...action,requestId:uuid(),revision:1,action:'double'})).status,409);
   const stand={...action,requestId:uuid(),revision:1,action:'stand'},rs=await Promise.all([req('2','blackjack/play','POST',stand),req('2','blackjack/play','POST',stand)]);assert(rs.every(r=>r.status===200));game=(await rs[0].json()).game;assert.deepEqual(game,(await rs[1].json()).game);
  }
  assert.equal(game.status,'finished');assert(!game.dealer.includes(null));const finalBalance=(await state('2')).credits;assert.equal(finalBalance,initialBalance-100+game.payout);
  assert.equal((await start('3',{amount:5001})).status,409,'Cannot bet above actual wallet');
  const allInId=uuid(),another=await start('3',{amount:5000,requestId:allInId});assert.equal(another.status,200,'Full available wallet above 100 is accepted');const allIn=(await another.json()).game;assert.equal(allIn.amount,5000);assert.equal((await state('3')).credits,allIn.payout||0);
  assert.equal((await start('3',{amount:5000,requestId:allInId})).status,200,'Retry large wager does not debit again');
  if(allIn.status==='playing'){assert.equal(allIn.canDouble,false);assert.equal((await req('3','blackjack/play','POST',{...input,handId:allIn.id,revision:0,requestId:uuid(),action:'double'})).status,409);const settled=await req('3','blackjack/play','POST',{...input,handId:allIn.id,revision:0,requestId:uuid(),action:'stand'});assert.equal(settled.status,200);assert.equal((await state('3')).credits,(await settled.json()).game.payout);}
  const room=(await state('1')).room;assert.equal((await req('1','room','PUT',{scene:{...scene,items:[]},revision:room.revision})).status,200);
  assert.equal((await req('2','blackjack/open','POST',input)).status,409);assert.equal((await start('2',{requestId})).status,200,'Safe receipt recovery after table removal');assert.equal((await state('2')).credits,finalBalance);
  for(const ws of sockets)ws.close();console.log('PASS blackjack server: auth, ownership, presence, inventory, limits, secret cards/shoe, atomic bet/action retries, stale revisions, reconnect, independent players and removal recovery.');
 }finally{await mf.dispose();}
})().catch(e=>{console.error(e);process.exitCode=1;});
