const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {Miniflare,convertV4MiniflareOptions}=require('miniflare'),esbuild=require('esbuild');
(async()=>{
 const {C,CATALOG}=await import('../src/hub-rules.mjs'),{mediaSnapshot,handleMedia}=await import('../src/hub-media.mjs');
 assert.equal(mediaSnapshot({position:178,playing:true,loop:true,duration:180,updatedAt:1000},6000).position,3);
 const values=new Map(),events=[],world={ctx:{storage:{get:async k=>structuredClone(values.get(k)),put:async(k,v)=>values.set(k,structuredClone(v))}},send:(ws,e)=>events.push(e),broadcast:(id,e)=>events.push(e)};
 values.set('room:1',{id:'1',ownerId:'1',scene:{items:[{id:1,type:24}]}});let attachment={user:{id:'1'},roomId:'1'};const ws={deserializeAttachment:()=>attachment,serializeAttachment:a=>attachment=a};
 await handleMedia(world,ws,{action:'load',itemId:1,url:'https://youtu.be/M7lc1UVf-VE'});
 await handleMedia(world,ws,{action:'metadata',videoId:'M7lc1UVf-VE',duration:180,title:'Canción de prueba'});attachment.lastMedia=0;
 await handleMedia(world,ws,{action:'loop',loop:true});assert.equal(events.at(-1).media.title,'Canción de prueba');assert.equal(events.at(-1).media.loop,true);
 attachment.user.id='2';for(const action of ['loop','metadata'])await assert.rejects(handleMedia(world,ws,{action,loop:false,duration:60}),/Solo el dueño/);
 attachment.user.id='1';await assert.rejects(handleMedia(world,ws,{action:'metadata',videoId:'wrong',duration:60}),/cambió/);await assert.rejects(handleMedia(world,ws,{action:'metadata',videoId:'M7lc1UVf-VE',duration:Infinity}),/Duración/);
 const site=path.join(__dirname,'..');let entry=site+'/src/index.js';
 if(process.argv.includes('--legacy-world')){
  const legacyPosters=fs.readFileSync(site+'/src/hub-posters.mjs','utf8').replace("return Response.json({key:'hub-posters/'+image[1]+'/'+image[2]+'.jpg'});","return posterImage(world.env,'hub-posters/'+image[1]+'/'+image[2]+'.jpg');");
  fs.writeFileSync(site+'/.test-build/legacy-posters.mjs',legacyPosters);
  fs.writeFileSync(site+'/.test-build/legacy-world.mjs',fs.readFileSync(site+'/src/hub-world.mjs','utf8').replaceAll("from './","from '../src/").replace("from '../src/hub-posters.mjs'","from './legacy-posters.mjs'"));
  entry=site+'/.test-build/legacy-poster-entry.mjs';fs.writeFileSync(entry,"export {default} from '../src/index.js';export {OverlayRoom} from '../src/realtime.js';export {HubWorld} from './legacy-world.mjs';");
 }
 await esbuild.build({entryPoints:[entry],outfile:site+'/.test-build/posters-test.mjs',bundle:true,format:'esm',platform:'browser',external:['cloudflare:workers']});
 const mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:'posters-test',modules:true,scriptPath:site+'/.test-build/posters-test.mjs',compatibilityDate:'2026-06-20',bindings:{HUB_ENABLED:'true',HUB_ORIGIN:'https://minerdesign.xyz'},r2Buckets:['STREAMBOT_MEDIA'],d1Databases:['STREAMBOT_DB'],durableObjects:{HUB_WORLD:{className:'HubWorld',useSQLite:true},OVERLAY_ROOM:{className:'OverlayRoom',useSQLite:true}}}]}));
 try{
  const db=await mf.getD1Database('STREAMBOT_DB');await db.exec("CREATE TABLE streambot_settings(key TEXT PRIMARY KEY,value TEXT); INSERT INTO streambot_settings VALUES ('kick_user_id','1'),('kick_username','minerarg');");for(const sql of fs.readFileSync(site+'/hub-schema.sql','utf8').split(';').map(s=>s.trim()).filter(Boolean))await db.prepare(sql).run();
  const sessions={};for(const id of ['1','2']){sessions[id]=crypto.randomBytes(32).toString('base64url');await db.prepare('INSERT INTO hub_sessions VALUES(?,?,?,?)').bind(crypto.createHash('sha256').update(sessions[id]).digest('hex'),id,id==='1'?'minerarg':'Invitado',Date.now()+3600000).run();}
  const req=(id,route,method='GET',body,headers={})=>mf.dispatchFetch('https://minerdesign.xyz/api/hub/'+route,{method,headers:{Cookie:'hub_session='+sessions[id],Origin:'https://minerdesign.xyz','Content-Type':'image/jpeg',...headers},body});
  for(const id of ['1','2'])await req(id,'state');
  const jpeg=fs.readFileSync(path.join(__dirname,'fixtures/poster.jpg'));
  assert.equal((await req(null,'posters')).status,401);assert.equal((await req('1','posters/0','PUT',jpeg,{Origin:'https://evil.test'})).status,403);
  assert.equal((await req('1','posters/5','PUT',jpeg)).status,404);assert.equal((await req('1','posters/-1','PUT',jpeg)).status,404);
  assert.equal((await req('1','posters/0','PUT','<svg/>',{'Content-Type':'image/svg+xml'})).status,400);
  assert.equal((await req('1','posters/0','PUT',new Uint8Array(512*1024+1))).status,413);
  assert.equal((await req('1','posters/0','PUT','not a jpeg')).status,400);
  const bad=Buffer.from(jpeg),sof=bad.indexOf(Buffer.from([255,192]));assert(sof>0);bad[sof+5]=8;bad[sof+6]=0;assert.equal((await req('1','posters/0','PUT',bad)).status,400);
  for(let slot=0;slot<5;slot++){if(slot)await new Promise(r=>setTimeout(r,1550));const response=await req('1','posters/'+slot,'PUT',jpeg);assert.equal(response.status,200,await response.clone().text());}
  assert.equal((await(await req('1','posters')).json()).slots.filter(Boolean).length,5);assert.equal((await(await req('2','posters')).json()).slots.filter(Boolean).length,0);
  const ownPreview=await req('1','posters/image/1/0');assert.equal(ownPreview.status,200,'Owner thumbnail loads before placement');assert.equal(ownPreview.headers.get('Content-Type'),'image/jpeg');assert.deepEqual(Buffer.from(await ownPreview.arrayBuffer()),jpeg);
  assert.equal((await req('2','posters/image/1/0')).status,404,'Unplaced personal images stay private');const own=await(await req('1','state')).json();own.room.scene.items=[{id:1,type:80,x:0,y:0,wallSide:'left',wallU:5,wallZ:90,posterSlot:0}];assert.equal((await req('1','room','PUT',JSON.stringify({scene:own.room.scene,revision:own.room.revision}),{'Content-Type':'application/json'})).status,200);
  const loaded=await req('2','posters/image/1/0');assert.equal(loaded.status,200);assert.equal(loaded.headers.get('Content-Type'),'image/jpeg');assert.deepEqual(Buffer.from(await loaded.arrayBuffer()),jpeg);
  assert.equal((await req(null,'posters/image/1/0')).status,401);
  assert.equal((await req('2','posters/image/1/0','PUT',jpeg)).status,404,'Cannot overwrite another account');
  assert.equal((await req('1','posters/0','PUT',jpeg)).status,429);await new Promise(r=>setTimeout(r,1550));assert.equal((await req('1','posters/0','PUT',jpeg)).status,200);
  assert.equal((await(await req('1','posters')).json()).slots[0].version,2);const bucket=await mf.getR2Bucket('STREAMBOT_MEDIA');assert.equal((await bucket.list({prefix:'hub-posters/1/'})).objects.length,5,'Replacement retains exactly five objects');
  const scene=C.initial();scene.items=[{id:1,type:80,x:0,y:0,wallSide:'left',wallU:5,wallZ:90,posterSlot:4}];assert.equal(C.restore(scene).items[0].posterSlot,4);scene.items[0].posterSlot=5;assert.equal(C.restore(scene),null);
  assert.equal(CATALOG.filter(i=>i.kind==='object'&&C.TYPES[i.type].poster).length,3);
  console.log('PASS posters/media: auth, CSRF, five fixed R2 keys, replacement, isolated accounts, MIME/byte/dimension limits, visitor reads, scene validation, shared loop clock and owner-only metadata/repeat.');
 }finally{await mf.dispose();}
})().catch(e=>{console.error(e);process.exitCode=1;});
