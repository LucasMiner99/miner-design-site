const assert=require('node:assert/strict'),path=require('node:path');
const {Miniflare,convertV4MiniflareOptions}=require('miniflare'),esbuild=require('esbuild');
(async()=>{
 const site=path.join(__dirname,'..');await esbuild.build({entryPoints:[site+'/src/index.js'],outfile:site+'/.test-build/alert-style-test.mjs',bundle:true,format:'esm',platform:'browser',external:['cloudflare:workers']});
 const mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:'alert-style-test',modules:true,scriptPath:site+'/.test-build/alert-style-test.mjs',compatibilityDate:'2026-06-20',bindings:{STREAMBOT_ADMIN_KEY:'local-test-admin'},d1Databases:['STREAMBOT_DB'],durableObjects:{HUB_WORLD:{className:'HubWorld',useSQLite:true},OVERLAY_ROOM:{className:'OverlayRoom',useSQLite:true}}}]}));
 try{
  const db=await mf.getD1Database('STREAMBOT_DB');await db.exec("CREATE TABLE streambot_settings(key TEXT PRIMARY KEY,value TEXT NOT NULL,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP); INSERT INTO streambot_settings(key,value) VALUES ('overlay_key','local-test-overlay'),('alerts_name_size','29'),('alerts_label_size','11'),('alerts_duration_seconds','8'),('alerts_follow','false'),('alerts_volume','0.35'),('bot_enabled','false');");
  const req=(route,admin=false,body)=>mf.dispatchFetch('https://minerdesign.xyz/api/streambot/'+route,{method:body?'PUT':'GET',headers:admin?{'X-Streambot-Key':'local-test-admin','Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
  assert.equal((await req('alerts/state?key=wrong')).status,401);
  const replies=await Promise.all([req('config',true),req('alerts/state?key=local-test-overlay')]);assert(replies.every(r=>r.status===200));
  const admin=(await replies[0].json()).config,overlay=(await replies[1].json()).config;
  for(const c of [admin,overlay]){assert.equal(c.alerts_name_size,44);assert.equal(c.alerts_label_size,23);assert.equal(c.alerts_duration_seconds,5);assert.equal(c.alerts_follow,false);assert.equal(c.alerts_volume,.35);}
  assert.equal(admin.bot_enabled,false);assert(!Object.hasOwn(overlay,'overlay_key'));
  assert.equal((await req('config',true,{alerts_name_size:52,alerts_label_size:28,alerts_gap:18})).status,200);
  const {radialAlertRows}=await import('../src/alert-style.mjs');await Promise.all([radialAlertRows(db,[]),radialAlertRows(db,[])]);
  const fresh=(await(await req('alerts/state?key=local-test-overlay')).json()).config;
  assert.equal(fresh.alerts_name_size,52);assert.equal(fresh.alerts_label_size,28);assert.equal(fresh.alerts_gap,18);assert.equal(fresh.alerts_follow,false);assert.equal(fresh.alerts_volume,.35);
  console.log('PASS alerts migration: approved defaults once, concurrent-safe, future edits and event/audio preferences preserved, auth intact.');
 }finally{await mf.dispose();}
})().catch(e=>{console.error(e);process.exitCode=1;});
