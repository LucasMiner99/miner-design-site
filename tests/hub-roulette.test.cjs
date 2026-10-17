const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {Miniflare,convertV4MiniflareOptions}=require('miniflare'),esbuild=require('esbuild');
(async()=>{
 const site=path.join(__dirname,'..');await esbuild.build({entryPoints:[site+'/src/index.js'],outfile:site+'/.test-build/roulette-test.mjs',bundle:true,format:'esm',platform:'browser',external:['cloudflare:workers']});
 const mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:'roulette-test',modules:true,scriptPath:site+'/.test-build/roulette-test.mjs',compatibilityDate:'2026-06-20',bindings:{HUB_ENABLED:'true',HUB_ORIGIN:'https://minerdesign.xyz'},d1Databases:['STREAMBOT_DB'],durableObjects:{HUB_WORLD:{className:'HubWorld',useSQLite:true},OVERLAY_ROOM:{className:'OverlayRoom',useSQLite:true}}}]}));
 try{
  const db=await mf.getD1Database('STREAMBOT_DB');await db.exec("CREATE TABLE streambot_settings(key TEXT PRIMARY KEY,value TEXT); INSERT INTO streambot_settings VALUES ('kick_user_id','1'),('kick_username','minerarg');");for(const sql of fs.readFileSync(site+'/hub-schema.sql','utf8').split(';').map(s=>s.trim()).filter(Boolean))await db.prepare(sql).run();
  const sessions={};for(const id of ['1','2','3']){sessions[id]=crypto.randomBytes(32).toString('base64url');await db.prepare('INSERT INTO hub_sessions VALUES(?,?,?,?)').bind(crypto.createHash('sha256').update(sessions[id]).digest('hex'),id,id==='1'?'minerarg':'Player'+id,Date.now()+3600000).run();}
  const req=(id,route,method='GET',body,headers={})=>mf.dispatchFetch('https://minerdesign.xyz/api/hub/'+route,{method,headers:{Cookie:'hub_session='+sessions[id],Origin:'https://minerdesign.xyz',...headers},body:body?JSON.stringify(body):undefined});
  const state=async id=>await(await req(id,'state')).json(),uuid=()=>crypto.randomUUID();
  const {rouletteColor,rouletteNumber}=await import('../src/hub-roulette.mjs');
  assert.deepEqual(Array.from({length:37},(_,i)=>rouletteColor(i)).reduce((a,c)=>(a[c]++,a),{red:0,black:0,green:0}),{red:18,black:18,green:1});
  let draws=0;assert.equal(rouletteNumber(a=>a[0]=draws++?37:4294967295),0);assert.equal(draws,2,'Reject RNG tail without bias');
  for(let n=0;n<37;n++)assert.equal(rouletteNumber(a=>a[0]=n),n);
  const admin=await state('1'),scene={...admin.room.scene,items:[{id:1,type:79,x:2,y:2}]};
  assert(admin.inventory.some(i=>i.id==='object:79'));assert(!(await state('2')).inventory.some(i=>i.id==='object:79'));
  assert.equal((await req('2','room','PUT',{scene,revision:0})).status,403);
  assert.equal((await req('1','room','PUT',{scene,revision:0})).status,200);
  const bet=(id,extra={})=>req(id,'roulette/bet','POST',{roomId:'1',itemId:1,color:'red',amount:100,requestId:uuid(),...extra});
  assert.equal((await bet(null)).status,401);assert.equal((await req('2','roulette/bet','POST',{}, {Origin:'https://evil.test'})).status,403);
  assert.equal((await bet('2')).status,403,'HTTP without presence is rejected');
  const connect=async id=>{const r=await req(id,'ws','GET',null,{Upgrade:'websocket'});assert.equal(r.status,101);const ws=r.webSocket;ws.accept();ws.send(JSON.stringify({type:'join',roomId:'1'}));await new Promise(r=>setTimeout(r,60));return ws;};
  const sockets=await Promise.all(['1','2','3'].map(connect));
  assert.equal((await req('2','roulette/open','POST',{roomId:'1',itemId:1})).status,200);
  sockets[1].send(JSON.stringify({type:'interact',itemId:1}));await new Promise(r=>setTimeout(r,50));assert.equal((await state('1')).room.scene.items[0].on,undefined,'Generic interaction cannot mutate roulette state');
  assert.equal((await bet('2',{itemId:2})).status,409);
  assert.equal((await bet('2',{roomId:'2'})).status,403);
  assert.equal((await bet('2')).status,409,'Cannot forge balance');
  for(const amount of [-1,0,.5,'100',10001,Number.MAX_SAFE_INTEGER])assert.equal((await bet('2',{amount})).status,400);
  for(const color of ['__proto__','blue','1'])assert.equal((await bet('2',{color})).status,400);
  await req('1','admin/credits','PUT',{rewards:{5000:'credits'}});
  const ns=await mf.getDurableObjectNamespace('HUB_WORLD'),stub=ns.get(ns.idFromName('minerarg-beta-v1'));
  for(const uid of ['2','3'])await stub.fetch('https://hub/kick',{method:'POST',headers:{'X-Hub-Broadcaster':'1'},body:JSON.stringify({type:'channel.reward.redemption.updated',payload:{id:'fund-'+uid,status:'accepted',reward:{id:'credits'},redeemer:{user_id:Number(uid),username:'Player'+uid},broadcaster:{user_id:1}}})});
  const id=uuid(),responses=await Promise.all([bet('2',{requestId:id,credits:999999,userId:'1',number:0,prize:999999}),bet('2',{requestId:id})]);
  assert(responses.every(r=>r.status===200));const a=await responses[0].json(),b=await responses[1].json();assert.deepEqual(a.receipt,b.receipt);
  const r=a.receipt;assert(r.number>=0&&r.number<37);assert.equal(r.result,rouletteColor(r.number));assert.equal(r.prize,r.result==='red'?200:0);assert.equal(r.after,5000-100+r.prize);
  assert.equal((await state('2')).credits,r.after);assert.equal((await state('2')).walletVersion,2);assert.equal((await state('1')).credits,0);
  assert.equal((await bet('2',{requestId:id,color:'green'})).status,409);assert.equal((await bet('2',{requestId:id,amount:1})).status,409);
  const racing=await Promise.all([bet('2'),bet('2')]);assert(racing.every(r=>r.status===429));
  // Another user cannot read this receipt: the same UUID settles their own, separately funded wager.
  const other=await(await bet('3',{requestId:id,color:'green'})).json();assert.equal(other.receipt.userId,'3');assert.equal(other.receipt.prize,other.receipt.number===0?3600:0);
  assert.equal((await state('2')).credits,r.after);
  // Cross-feature concurrency spends the authoritative wallet, never a client supplied balance.
  await new Promise(resolve=>setTimeout(resolve,4100));
  const collision=await Promise.all([bet('2',{amount:r.after,color:'black'}),req('2','box/buy','POST',{kind:'object',expectedCost:2000,requestId:uuid()})]);
  assert(collision.some(v=>v.status===200));let expected=r.after;for(let i=0;i<collision.length;i++)if(collision[i].status===200){const data=await collision[i].json();expected+=i===0?-data.receipt.amount+data.receipt.prize:-2000;}assert.equal((await state('2')).credits,expected);assert(expected>=0);
  const current=(await state('1')).room;
  assert.equal((await req('1','room','PUT',{scene:{...scene,items:[]},revision:current.revision})).status,200);
  assert.equal((await bet('2')).status,409);assert.equal((await req('2','roulette/open','POST',{roomId:'1',itemId:1})).status,409);
  const replay=await(await bet('2',{requestId:id})).json();assert.deepEqual(replay.receipt,r,'Committed receipt survives removal of table');
  sockets[1].send(JSON.stringify({type:'join',roomId:'2'}));await new Promise(resolve=>setTimeout(resolve,50));
  assert.equal((await bet('2',{requestId:id})).status,200,'Read own outcome after disconnect/room change');
  assert.equal((await bet('2')).status,403);
  for(const ws of sockets)ws.close();
  console.log('PASS roulette: real Worker/D1/SQLite/WS, ownership, presence, probabilities, unbiased RNG, authoritative payout, idempotency, forged input, cooldown, wallet races, removed tables and receipt recovery.');
 }finally{await mf.dispose();}
})().catch(e=>{console.error(e);process.exitCode=1;});
