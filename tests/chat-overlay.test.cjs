const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/../public/chat-overlay.js','utf8');
class Element{
 constructor(tag){this.tagName=tag;this.children=[];this.dataset={};this.style={setProperty(k,v){this[k]=v;}};this.className='';this.classList={add:(...v)=>{this.className=[...new Set([...this.className.split(' '),...v])].join(' ');},remove:v=>{this.className=this.className.split(' ').filter(c=>c!==v).join(' ');},contains:v=>this.className.split(' ').includes(v)};}
 append(...items){for(const i of items){i.parent=this;this.children.push(i);}}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(c=>c!==this);}
 replaceWith(other){const index=this.parent.children.indexOf(this);this.parent.children[index]=other;other.parent=this.parent;}
 replaceChildren(){this.children=[];}
 querySelector(selector){return this.children.find(e=>e.classList?.contains(selector.slice(1)));}
}
async function fixture(search='',config={}){
 const root=new Element('div'),listeners={},intervals=[],sockets=[];
 let liveConfig={chat_overlay_enabled:true,chat_font_size:32,chat_gap:3,chat_badges_enabled:true,chat_kick_emotes_enabled:true,chat_7tv_enabled:true,chat_message_seconds:0,...config};
 const scope={document:{getElementById:()=>root,createElement:t=>new Element(t),createTextNode:t=>({textContent:t})},location:{search:'?key=test'+search,protocol:'https:',host:'test.local'},URLSearchParams,console,setTimeout:f=>{f();},setInterval:(f,n)=>intervals.push({f,n}),innerWidth:1000,addEventListener:(n,f)=>listeners[n]=f,fetch:async url=>({ok:true,json:async()=>url.includes('/emotes')?{emotes:{KEKW:'https://cdn.7tv.app/emote/test/2x.webp'}}:{enabled:true,config:liveConfig,messages:[]}}),WebSocket:class{constructor(){sockets.push(this);}}};scope.window=scope;vm.createContext(scope);vm.runInContext(source,scope);await new Promise(r=>setImmediate(r));
 return {root,scope,listeners,intervals,config:v=>liveConfig={...liveConfig,...v},message:m=>sockets[0].onmessage({data:JSON.stringify({type:'chat.message',message:{id:Math.random().toString(),username:'MinerARG',content:'Hola',color:'#abcdef',createdAt:Date.now(),...m}})}),refresh:async()=>{sockets[0].onmessage({data:JSON.stringify({type:'chat.refresh'})});await new Promise(r=>setImmediate(r));}};
}
(async()=>{
 const f=await fixture();assert.equal(f.root.style['--font'],'32.00px');assert.equal(f.root.style['--gap'],'3.00px');assert.equal(f.root.style['--chat-width'],undefined);f.scope.innerWidth=320;f.listeners.resize();assert.equal(f.root.style['--font'],'32.00px','OBS width does not change approved font size');
 f.message({id:'first',content:'Hola [emote:123:KickSmile] KEKW',badges:[{type:'moderator'}]});const row=f.root.children[0];assert.deepEqual(row.children.map(c=>c.className),['badges','username','body']);assert.equal(row.querySelector('.username').style.color,'#abcdef');assert.equal(row.querySelector('.body').children.filter(c=>c.tagName==='img').length,2,'Kick and 7TV remain images');assert.equal(row.querySelector('.badges').children[0].children[0].src,'https://cpwemotes.co.uk/kick/kickBadges/moderator.svg');
 f.message({id:'first'});assert.equal(f.root.children.length,1,'Replay is ignored');
 const image=row.querySelector('.body').children.find(c=>c.tagName==='img');image.onerror();assert(row.querySelector('.body').children.some(c=>c.textContent==='KickSmile'),'Failed emotes keep their text');
 f.config({chat_font_size:26,chat_gap:0,chat_hide_commands:true,chat_badges_enabled:false,chat_kick_emotes_enabled:false,chat_7tv_enabled:false});await f.refresh();assert.equal(f.root.style['--font'],'26.00px');assert.equal(f.root.style['--gap'],'0.00px');f.message({content:'!entrar'});assert.equal(f.root.children.length,1);f.message({content:'<script>alert(1)</script> [emote:123:KickSmile] KEKW',badges:[{type:'vip'}]});const safe=f.root.children.at(-1);assert(!safe.querySelector('.badges'));assert(!safe.querySelector('.body').children.some(c=>c.tagName==='img'));assert(safe.querySelector('.body').children.some(c=>c.textContent.includes('<script>')),'Messages remain text, not HTML');
 const scaled=await fixture('&scale=2&font=22&gap=3&width=500');assert.equal(scaled.root.style['--font'],'44.00px');assert.equal(scaled.root.style['--chat-width'],undefined);assert.equal(scaled.root.style['--scale'],'2');
 const invalid=await fixture('&scale=nope&width=nope');assert.equal(invalid.root.style['--font'],'32.00px');assert.equal(invalid.root.style['--chat-width'],undefined);
 const legacy=await fixture('&width=480');assert.equal(legacy.root.style['--chat-width'],undefined,'Old OBS URLs cannot cap the responsive width');
 const uncapped=await fixture('&max=1',{chat_max_messages:1});for(let i=0;i<45;i++)uncapped.message({id:'many'+i});assert.equal(uncapped.root.children.length,45,'Legacy count limits do not remove messages that fit');
 uncapped.root.clientHeight=600;uncapped.root.children.forEach((el,i)=>{el.offsetTop=(i-30)*40;el.offsetHeight=40;});uncapped.listeners.resize();assert.equal(uncapped.root.children.length,15,'Only completely offscreen rows are discarded');assert.equal(uncapped.root.children[0].dataset.id,'many30');
 const css=fs.readFileSync(__dirname+'/../public/chat-overlay.css','utf8');assert(/#chat\{[^}]*width:100%/.test(css));assert(!css.includes('--chat-width'));assert(css.includes('overflow-wrap:anywhere'));assert(css.includes('font-weight:600'));assert(css.includes('background:transparent;'));assert(!css.includes('linear-gradient'));assert(css.includes('line-height:1.22'));assert(css.includes('rgba(0,0,0,.95)'));assert.equal(fs.readFileSync(__dirname+'/../public/assets/fonts/dm-sans-600-latin.woff2').subarray(0,4).toString(),'wOF2');
 console.log('PASS compact chat: responsive width, fixed font sizing, explicit scale, native/7TV emotes, badge rendering, text escaping, live settings and transparent styling.');
})().catch(e=>{console.error(e);process.exitCode=1;});
