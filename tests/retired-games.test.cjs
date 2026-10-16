const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const base=__dirname+'/../',source=fs.readFileSync(base+'src/streambot.js','utf8');
const defaults=source.slice(source.indexOf('const DEFAULT_CONFIG ='),source.indexOf('\n};',source.indexOf('const DEFAULT_CONFIG ='))+3);
const parser=source.slice(source.indexOf('function parseConfigRows('),source.indexOf('\nasync function ensureOverlayKey'));
const context={DEFAULT_VOICE_ID:'test-voice'};vm.createContext(context);vm.runInContext(defaults+'\n'+parser+'\nthis.parse=parseConfigRows;',context);
const config=context.parse([{key:'crown_enabled',value:'true'},{key:'cleaning_enabled',value:'true'},{key:'bot_enabled',value:'true'},{key:'chat_overlay_enabled',value:'true'}]);
assert.equal(config.crown_enabled,false);assert.equal(config.cleaning_enabled,false);assert.equal(config.bot_enabled,true);assert.equal(config.chat_overlay_enabled,true);
const html=fs.readFileSync(base+'public/streambot.html','utf8');
for(const id of ['crown','cleaning']){assert.match(html,new RegExp('<button[^>]*hidden[^>]*data-section="'+id+'"'));assert.match(html,new RegExp('<section id="section-'+id+'"[^>]*hidden'));}
for(const id of ['tts','subgoal','chat','alerts','commands','mods','logs'])assert.match(html,new RegExp('<button class="nav-link" data-section="'+id+'"'));
assert.match(fs.readFileSync(base+'public/streambot.css','utf8'),/\[hidden\]\{display:none!important\}/);
console.log('PASS: retired minigames hidden and disabled even with persisted enabled settings; other dashboard sections and bot/chat settings retained.');
