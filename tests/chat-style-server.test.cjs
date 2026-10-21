const assert=require('node:assert/strict'),path=require('node:path');
const {Miniflare,convertV4MiniflareOptions}=require('miniflare'),esbuild=require('esbuild');
(async()=>{
 const site=path.join(__dirname,'..');await esbuild.build({entryPoints:[site+'/src/index.js'],outfile:site+'/.test-build/chat-style-test.mjs',bundle:true,format:'esm',platform:'browser',external:['cloudflare:workers']});
 const mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:'chat-style-test',modules:true,scriptPath:site+'/.test-build/chat-style-test.mjs',compatibilityDate:'2026-06-20',bindings:{STREAMBOT_ADMIN_KEY:'local-test-admin'},d1Databases:['STREAMBOT_DB'],durableObjects:{HUB_WORLD:{className:'HubWorld',useSQLite:true},OVERLAY_ROOM:{className:'OverlayRoom',useSQLite:true}}}]}));
 try{
  const db=await mf.getD1Database('STREAMBOT_DB');await db.exec("CREATE TABLE streambot_settings(key TEXT PRIMARY KEY,value TEXT NOT NULL,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP); INSERT INTO streambot_settings(key,value) VALUES ('overlay_key','local-test-overlay'),('chat_font_size','18'),('chat_gap','8'),('chat_max_messages','7'),('chat_badge_image_map','subscriber=https://example.com/sub.png'),('chat_7tv_enabled','true'),('bot_enabled','false');");
  const request=(route,admin=false,body)=>mf.dispatchFetch('https://minerdesign.xyz/api/streambot/'+route,{method:body?'PUT':'GET',headers:admin?{'X-Streambot-Key':'local-test-admin','Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
  assert.equal((await request('config')).status,401);
  const replies=await Promise.all([request('config',true),request('chat/state?key=local-test-overlay')]);assert(replies.every(r=>r.status===200));
  const admin=(await replies[0].json()).config,overlay=(await replies[1].json()).config;
  assert.equal(admin.chat_font_size,21);assert.equal(overlay.chat_font_size,21);assert.equal(overlay.chat_gap,2);assert.equal(overlay.chat_max_messages,7);assert.equal(overlay.chat_badge_image_map,'subscriber=https://example.com/sub.png');assert.equal(admin.bot_enabled,false);assert(!Object.hasOwn(overlay,'overlay_key'));
  // A later dashboard save must survive stale concurrent migration attempts.
  const changed=await request('config',true,{chat_font_size:25,chat_gap:0});assert.equal(changed.status,200);
  const {compactChatRows}=await import('../src/chat-style.mjs');await Promise.all([compactChatRows(db,[]),compactChatRows(db,[])]);
  const fresh=(await(await request('chat/state?key=local-test-overlay')).json()).config;assert.equal(fresh.chat_font_size,25);assert.equal(fresh.chat_gap,0);assert.equal(fresh.chat_max_messages,7);
  assert.equal((await request('chat/state?key=wrong')).status,401);assert.equal((await request('chat/emotes?key=wrong')).status,401);
  assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM streambot_settings WHERE key='chat_compact_dm_v1'").first()).n,1);
  console.log('PASS real Worker/D1: existing chat migrates once, concurrent requests are safe, future edits and unrelated settings survive, overlay/admin auth retained.');
 }finally{await mf.dispose();}
})().catch(e=>{console.error(e);process.exitCode=1;});
