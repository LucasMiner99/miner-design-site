const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {Miniflare,convertV4MiniflareOptions}=require('miniflare'),esbuild=require('esbuild');
(async()=>{
 const site=path.join(__dirname,'..');await esbuild.build({entryPoints:[site+'/src/index.js'],outfile:site+'/.test-build/profile-groups-test.mjs',bundle:true,format:'esm',platform:'browser',external:['cloudflare:workers']});
 const mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:'profile-groups-test',modules:true,scriptPath:site+'/.test-build/profile-groups-test.mjs',compatibilityDate:'2026-06-20',bindings:{HUB_ENABLED:'true',HUB_ORIGIN:'https://minerdesign.xyz'},d1Databases:['STREAMBOT_DB'],durableObjects:{HUB_WORLD:{className:'HubWorld',useSQLite:true},OVERLAY_ROOM:{className:'OverlayRoom',useSQLite:true}}}]}));
 try{
  const db=await mf.getD1Database('STREAMBOT_DB');await db.exec("CREATE TABLE streambot_settings(key TEXT PRIMARY KEY,value TEXT); INSERT INTO streambot_settings VALUES ('kick_user_id','1'),('kick_username','minerarg');");for(const sql of fs.readFileSync(site+'/hub-schema.sql','utf8').split(';').map(s=>s.trim()).filter(Boolean))await db.prepare(sql).run();
  const sessions={};for(const id of ['1','2','3']){sessions[id]=crypto.randomBytes(32).toString('base64url');await db.prepare('INSERT INTO hub_sessions VALUES(?,?,?,?)').bind(crypto.createHash('sha256').update(sessions[id]).digest('hex'),id,id==='1'?'minerarg':'Player'+id,Date.now()+3600000).run();}
  const req=(id,route,method='GET',body,headers={})=>mf.dispatchFetch('https://minerdesign.xyz/api/hub/'+route,{method,headers:{Cookie:'hub_session='+sessions[id],Origin:'https://minerdesign.xyz',...headers},body:body?JSON.stringify(body):undefined});
  const state=async id=>await(await req(id,'state')).json();

  for(const id of ['1','2','3'])await state(id);
  for(const [route,method] of [['profile','PUT'],['groups','POST']]){assert.equal((await req(null,route,method,{})).status,401);assert.equal((await req('2',route,method,{}, {Origin:'https://evil.test'})).status,403);}
  assert.equal((await req('1','profile','PUT',{petName:'  Mimo  '})).status,200);assert.equal((await state('1')).user.petName,'Mimo');assert.equal((await req('1','profile','PUT',{petName:'a'.repeat(25)})).status,400);
  const group=(id,b)=>req(id,'groups','POST',b);
  assert.equal((await group('1',{action:'create',name:'Equipo',color:'url(evil)'})).status,400);
  let r=await group('1',{action:'create',name:'MINER',color:'#75c9ff'});assert.equal(r.status,200);let data=await r.json();const gid=data.group.id;assert.equal(data.group.ownerId,'1');
  assert.equal((await group('2',{action:'accept',id:gid})).status,400,'Cannot join without invitation');
  assert.equal((await group('1',{action:'invite',target:'2'})).status,200);assert.equal((await state('2')).user.invitations[0].id,gid);
  assert.equal((await group('2',{action:'accept',id:gid})).status,200);assert.equal((await state('2')).user.group.id,gid);
  for(const action of ['update','invite','remove','disband'])assert.equal((await group('2',{action,name:'Stolen',color:'#ff0000',target:'3'})).status,403,'Only creator administers');
  assert.equal((await group('1',{action:'update',name:'NUEVO',color:'#ff8844'})).status,200);assert.equal((await state('2')).user.group.name,'NUEVO');
  assert.equal((await group('2',{action:'create',name:'SECOND',color:'#ffffff'})).status,400);
  assert.equal((await group('1',{action:'invite',target:'3'})).status,200);assert.equal((await group('3',{action:'decline',id:gid})).status,200);assert.equal((await state('3')).user.invitations.length,0);
  const wsResponse=await req('2','ws','GET',undefined,{Upgrade:'websocket'}),ws=wsResponse.webSocket;ws.accept();let events=[];ws.addEventListener('message',e=>{try{events.push(JSON.parse(e.data));}catch{}});
  await group('1',{action:'update',name:'LIVE',color:'#00ffaa'});await new Promise(r=>setTimeout(r,80));assert(events.some(e=>e.type==='presence'&&e.players.some(p=>p.id==='2'&&p.group.name==='LIVE')),'Group update propagates to live room');
  await req('2','profile','PUT',{petName:'Pipo'});await new Promise(r=>setTimeout(r,80));assert(events.some(e=>e.type==='presence'&&e.players.some(p=>p.id==='2'&&p.petName==='Pipo')));
  await group('1',{action:'remove',target:'2'});assert.equal((await state('2')).user.group,null);
  await group('1',{action:'invite',target:'2'});await group('2',{action:'accept',id:gid});await group('1',{action:'disband'});assert.equal((await state('1')).user.group,null);assert.equal((await state('2')).user.group,null);ws.close();
  const {C}=await import('../src/hub-rules.mjs');for(let rotation=0;rotation<4;rotation++){const scene=C.initial();scene.items=[{id:1,type:0,x:3,y:3,rotation}];const restored=C.restore(scene);assert(restored);assert.equal(restored.items[0].rotation,rotation);assert.equal(C.dimensions(restored.items[0]).w,rotation%2?2:3);}const bad=C.initial();bad.items[0].rotation=4;assert.equal(C.restore(bad),null);
  const reserve={...C.initial(),items:[],unplacedItems:[{id:99,type:0,x:3,y:3,rotation:3}]};assert.equal(C.restore(reserve).items[0].rotation,3,'Repacked furniture preserves orientation');reserve.unplacedItems[0].rotation=9;assert.equal(C.restore(reserve),null);
  const legacy={...C.initial(),structureVersion:1,items:[{id:5,type:0,x:3,y:3,flip:true}]};assert.equal(C.rotation(C.restore(legacy).items[0]),1,'Existing mirrored furniture is preserved');
  console.log('PASS profile/groups: persistence, input validation, invitation consent, creator authorization, live group/pet updates, removal/disband; four rotation footprints, reserve and legacy restore.');
 }finally{await mf.dispose();}
})().catch(e=>{console.error(e);process.exitCode=1;});
