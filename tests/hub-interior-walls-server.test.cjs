const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {Miniflare,convertV4MiniflareOptions}=require('miniflare'),esbuild=require('esbuild');
(async()=>{
 const site=path.join(__dirname,'..');await esbuild.build({entryPoints:[site+'/src/index.js'],outfile:site+'/.test-build/interior-walls-test.mjs',bundle:true,format:'esm',platform:'browser',external:['cloudflare:workers']});
 const mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:'interior-walls-test',modules:true,scriptPath:site+'/.test-build/interior-walls-test.mjs',compatibilityDate:'2026-06-20',bindings:{HUB_ENABLED:'true',HUB_ORIGIN:'https://minerdesign.xyz'},d1Databases:['STREAMBOT_DB'],durableObjects:{HUB_WORLD:{className:'HubWorld',useSQLite:true},OVERLAY_ROOM:{className:'OverlayRoom',useSQLite:true}}}]}));
 try{
  const db=await mf.getD1Database('STREAMBOT_DB');await db.exec("CREATE TABLE streambot_settings(key TEXT PRIMARY KEY,value TEXT); INSERT INTO streambot_settings VALUES ('kick_user_id','1'),('kick_username','minerarg');");
  for(const sql of fs.readFileSync(site+'/hub-schema.sql','utf8').split(';').map(s=>s.trim()).filter(Boolean))await db.prepare(sql).run();
  const sessions={};for(const id of ['1','2','3']){sessions[id]=crypto.randomBytes(32).toString('base64url');await db.prepare('INSERT INTO hub_sessions VALUES(?,?,?,?)').bind(crypto.createHash('sha256').update(sessions[id]).digest('hex'),id,id==='1'?'minerarg':'Player'+id,Date.now()+3600000).run();}
  const req=(id,route,method='GET',body,headers={})=>mf.dispatchFetch('https://minerdesign.xyz/api/hub/'+route,{method,headers:{Cookie:'hub_session='+sessions[id],Origin:'https://minerdesign.xyz',...headers},body:body===undefined?undefined:JSON.stringify(body)});

  const {C}=await import('../src/hub-rules.mjs');
  const state=async id=>await(await req(id,'state')).json();const admin=await state('1');await state('2');
  const items=[{id:1,type:27,x:0,y:0,wallSide:'inner:0',wallU:3,wallZ:84},{id:2,type:30,x:0,y:0,wallSide:'inner:2',wallU:2.5,wallZ:76},{id:3,type:80,x:0,y:0,wallSide:'inner:1',wallU:14,wallZ:84,posterSlot:2}];
  const scene={...admin.room.scene,layout:'suite',items};
  const sockets=[],events=[];
  for(const id of ['1','2']){const r=await req(id,'ws','GET',undefined,{Upgrade:'websocket'});const ws=r.webSocket,list=[];ws.accept();ws.addEventListener('message',e=>list.push(JSON.parse(e.data)));sockets.push(ws);events.push(list);}
  sockets[1].send(JSON.stringify({type:'join',roomId:'1'}));await new Promise(r=>setTimeout(r,100));
  assert.equal((await req('2','room','PUT',{roomId:'1',revision:0,scene})).status,403,'Visitors cannot decorate');
  const save=await req('1','room','PUT',{roomId:'1',revision:0,scene});assert.equal(save.status,200,await save.clone().text());await new Promise(r=>setTimeout(r,100));
  const stored=(await state('1')).room;assert.equal(stored.scene.items.length,3);assert.deepEqual(stored.scene.items,items.map(i=>({...i,flip:false})));
  for(const list of events)assert.deepEqual(list.filter(e=>e.type==='scene').at(-1).room.scene.items,stored.scene.items,'Owner and visitor receive wall mounts');
  for(const bad of [{wallSide:'inner:99'},{wallU:7.5},{wallZ:200}]){const invalid={...scene,items:[{...items[0],...bad}]};assert.equal((await req('1','room','PUT',{roomId:'1',revision:stored.revision,scene:invalid})).status,400);}
  assert.equal((await state('1')).room.revision,stored.revision,'Invalid scenes leave room unchanged');
  const moved={...scene,items:items.map(i=>i.id===1?{...i,wallSide:'right',wallU:4}:i)};
  assert.equal((await req('1','room','PUT',{roomId:'1',revision:stored.revision,scene:moved})).status,200);assert.equal((await state('1')).room.scene.items[0].wallSide,'right');
  for(const ws of sockets)ws.close();
  console.log('PASS interior wall server: owner permissions, persisted mounts, poster slots, visitor broadcasts, rejected door/invalid targets and movement back to outer walls.');
 }finally{await mf.dispose();}
})().catch(e=>{console.error(e);process.exitCode=1;});
