const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {Miniflare,convertV4MiniflareOptions}=require('miniflare'),esbuild=require('esbuild');
(async()=>{
 const site=path.join(__dirname,'..');await esbuild.build({entryPoints:[site+'/src/index.js'],outfile:site+'/.test-build/lighting-test.mjs',bundle:true,format:'esm',platform:'browser',external:['cloudflare:workers']});
 const options={workers:[{name:'lighting-test',modules:true,scriptPath:site+'/.test-build/lighting-test.mjs',compatibilityDate:'2026-06-20',bindings:{HUB_ENABLED:'true',HUB_ORIGIN:'https://minerdesign.xyz'},d1Databases:['STREAMBOT_DB'],durableObjects:{HUB_WORLD:{className:'HubWorld',useSQLite:true},OVERLAY_ROOM:{className:'OverlayRoom',useSQLite:true}}}]};
 const mf=new Miniflare(convertV4MiniflareOptions(options)),clients=[];
 try{
  const db=await mf.getD1Database('STREAMBOT_DB');await db.exec("CREATE TABLE streambot_settings(key TEXT PRIMARY KEY,value TEXT); INSERT INTO streambot_settings VALUES ('kick_user_id','1'),('kick_username','minerarg');");
  for(const sql of fs.readFileSync(site+'/hub-schema.sql','utf8').split(';').map(s=>s.trim()).filter(Boolean))await db.prepare(sql).run();
  const sessions={};for(const id of ['1','2','3']){sessions[id]=crypto.randomBytes(32).toString('base64url');await db.prepare('INSERT INTO hub_sessions VALUES(?,?,?,?)').bind(crypto.createHash('sha256').update(sessions[id]).digest('hex'),id,id==='1'?'minerarg':'Player'+id,Date.now()+3600000).run();}
  const req=(id,route,method='GET',body,headers={})=>mf.dispatchFetch('https://minerdesign.xyz/api/hub/'+route,{method,headers:{Cookie:'hub_session='+sessions[id],Origin:'https://minerdesign.xyz',...headers},body:body?JSON.stringify(body):undefined});
  const state=async id=>(await req(id,'state')).json(),delay=ms=>new Promise(r=>setTimeout(r,ms));
  async function wait(fn){for(let n=0;n<100;n++){const value=fn();if(value)return value;await delay(20);}throw Error('Timed out waiting for room event');}
  async function connect(id){const r=await req(id,'ws','GET',null,{Upgrade:'websocket'});assert.equal(r.status,101);const ws=r.webSocket,messages=[];ws.addEventListener('message',e=>{if(e.data!=='pong')messages.push(JSON.parse(e.data));});ws.accept();const c={ws,messages};clients.push(c);await wait(()=>messages.find(m=>m.type==='room'));return c;}
  async function send(c,value,type){const n=c.messages.length;c.ws.send(JSON.stringify(value));return wait(()=>c.messages.slice(n).find(m=>m.type===type));}
  for(const id of ['1','2','3'])await state(id);
  const owner=await connect('2'),visitor=await connect('3'),admin=await connect('1');
  await send(visitor,{type:'join',roomId:'2'},'room');await send(admin,{type:'join',roomId:'2'},'room');
  const before=await state('2');assert.notEqual(before.room.scene.lightsOn,false,'Existing rooms start in daylight');
  for(const c of [visitor,admin])assert.match((await send(c,{type:'room-light',on:false,roomId:'2'},'error')).error,/Solo el dueño/);
  assert.notEqual((await state('2')).room.scene.lightsOn,false);
  assert.match((await send(owner,{type:'room-light',on:'false'},'error')).error,/inválido/);
  await send(owner,{type:'room-light',on:false},'room-light');
  await wait(()=>visitor.messages.find(m=>m.type==='room-light'&&m.on===false));
  assert.equal((await state('2')).room.scene.lightsOn,false,'Persisted on the server');
  const result=await req('2','room','PUT',{scene:{...before.room.scene,lightsOn:true},revision:before.room.revision});
  assert.equal(result.status,200);assert.equal((await result.json()).room.scene.lightsOn,false,'Stale decoration cannot switch lighting back on');
  const another=await connect('2');assert.equal(another.messages.find(m=>m.type==='room').room.scene.lightsOn,false,'Reconnect restores darkness');
  await delay(1050);await send(another,{type:'room-light',on:true},'room-light');
  assert.equal((await state('2')).room.scene.lightsOn,true);
  await send(another,{type:'join',roomId:'3'},'room');
  assert.match((await send(another,{type:'room-light',on:false,roomId:'2'},'error')).error,/Solo el dueño/,'Cannot target another room from a forged message');
  console.log('PASS room lighting: owner-only, visitor/admin denied, boolean validation, live broadcast, persistence, reconnect and stale-save protection.');
 }finally{for(const c of clients)c.ws.close();await mf.dispose();}
})().catch(e=>{console.error(e);process.exitCode=1;});
