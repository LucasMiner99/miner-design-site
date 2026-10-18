const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {Miniflare,convertV4MiniflareOptions}=require('miniflare'),esbuild=require('esbuild');
(async()=>{
 const site=path.join(__dirname,'..');await esbuild.build({entryPoints:[site+'/src/index.js'],outfile:site+'/.test-build/credit-trade-test.mjs',bundle:true,format:'esm',platform:'browser',external:['cloudflare:workers']});
 const mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:'credit-trade-test',modules:true,scriptPath:site+'/.test-build/credit-trade-test.mjs',compatibilityDate:'2026-06-20',bindings:{HUB_ENABLED:'true',HUB_ORIGIN:'https://minerdesign.xyz'},d1Databases:['STREAMBOT_DB'],durableObjects:{HUB_WORLD:{className:'HubWorld',useSQLite:true},OVERLAY_ROOM:{className:'OverlayRoom',useSQLite:true}}}]}));
 try{
  const db=await mf.getD1Database('STREAMBOT_DB');await db.exec("CREATE TABLE streambot_settings(key TEXT PRIMARY KEY,value TEXT); INSERT INTO streambot_settings VALUES ('kick_user_id','1'),('kick_username','minerarg');");for(const sql of fs.readFileSync(site+'/hub-schema.sql','utf8').split(';').map(s=>s.trim()).filter(Boolean))await db.prepare(sql).run();
  const sessions={};for(const id of ['1','2','3']){sessions[id]=crypto.randomBytes(32).toString('base64url');await db.prepare('INSERT INTO hub_sessions VALUES(?,?,?,?)').bind(crypto.createHash('sha256').update(sessions[id]).digest('hex'),id,id==='1'?'minerarg':'Player'+id,Date.now()+3600000).run();}
  const req=(id,route,method='GET',body,headers={})=>mf.dispatchFetch('https://minerdesign.xyz/api/hub/'+route,{method,headers:{Cookie:'hub_session='+sessions[id],Origin:'https://minerdesign.xyz',...headers},body:body?JSON.stringify(body):undefined});
  const state=async id=>await(await req(id,'state')).json();
  await req('1','admin/credits','PUT',{rewards:{5000:'funds'}});
  const ns=await mf.getDurableObjectNamespace('HUB_WORLD'),stub=ns.get(ns.idFromName('minerarg-beta-v1'));
  for(const uid of ['1','2','3'])await stub.fetch('https://hub/kick',{method:'POST',headers:{'X-Hub-Broadcaster':'1'},body:JSON.stringify({type:'channel.reward.redemption.updated',payload:{id:'fund-'+uid,status:'accepted',reward:{id:'funds'},redeemer:{user_id:Number(uid),username:'Player'+uid},broadcaster:{user_id:1}}})});
  const versionBefore=(await state('1')).walletVersion;
  const clients={};for(const id of ['1','2','3']){const r=await req(id,'ws','GET',null,{Upgrade:'websocket'});assert.equal(r.status,101);const ws=r.webSocket,messages=[];ws.addEventListener('message',e=>messages.push(JSON.parse(e.data)));ws.accept();clients[id]={ws,messages};await new Promise(r=>setTimeout(r,30));ws.send(JSON.stringify({type:'join',roomId:'1'}));await new Promise(r=>setTimeout(r,45));}
  const latest=id=>clients[id].messages.filter(m=>m.type==='trade').at(-1),send=async(id,action,extra={})=>{const t=latest(id)?.trade;clients[id].ws.send(JSON.stringify({type:'trade',action,id:t?.id,revision:t?.revision,...extra}));await new Promise(r=>setTimeout(r,170));};
  await send('1','invite',{target:'2'});await send('2','join');
  for(const credits of [-1,.5,'100',5001,Number.MAX_SAFE_INTEGER]){await send('1','offer',{items:[],credits});assert.equal(latest('1').trade.credits[0],0);}
  await send('1','offer',{items:[{id:'object:0',count:1}],credits:100});await send('2','offer',{items:[],credits:300});
  await send('1','accept');assert(latest('1').trade.accepted[0]);await send('2','offer',{items:[],credits:400});assert.deepEqual(latest('1').trade.accepted,[false,false]);
  await send('1','accept');await send('2','accept');assert.equal(latest('1').trade.status,'completed');
  assert.equal((await state('1')).credits,5300);assert.equal((await state('2')).credits,4700);assert.equal((await state('2')).inventory.find(i=>i.id==='object:0').count,1);
  await send('2','accept');assert.equal((await state('2')).credits,4700,'Repeated completion cannot transfer twice');assert.equal((await state('1')).walletVersion,versionBefore+1);
  assert.equal(latest('2').creditsAvailable,4700);assert.deepEqual(latest('2').trade.credits,[100,400]);
  await send('2','invite',{target:'3'});await send('3','join');await send('2','offer',{items:[],credits:3000});await send('3','accept');
  assert.equal((await req('2','box/buy','POST',{kind:'object',expectedCost:2000,requestId:crypto.randomUUID()})).status,200);
  await send('2','accept');assert.match(clients['2'].messages.at(-1).error,/saldo/);assert.equal((await state('2')).credits,2700);assert.equal((await state('3')).credits,5000);assert.deepEqual(latest('2').trade.accepted,[false,false]);
  await send('2','offer',{items:[],credits:1000});await send('2','accept');await send('3','accept');assert.equal((await state('2')).credits,1700);assert.equal((await state('3')).credits,6000);
  for(const c of Object.values(clients))c.ws.close();
  console.log('PASS credit trades: real Worker+WS+SQLite, item/money exchange, credit-only gift, own balance limits incl admin, revised acceptance, spent funds recheck, atomic wallets/inventory and duplicate completion.');
 }finally{await mf.dispose();}
})().catch(e=>{console.error(e);process.exitCode=1;});
