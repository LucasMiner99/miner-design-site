const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
(async()=>{
 const {djAction}=await import('../src/hub-dj.mjs');let t=0,frame=0,hold=false,release;const epoch=Date.UTC(2026,9,18,15),frames=new Map(),elements=new Map(),events={};
 const create=()=>({style:{},dataset:{},classList:{add(){},remove(){}},children:[],listeners:{},clientHeight:250,textContent:'',disabled:false,open:false,hidden:false,append(...c){this.children.push(...c);},replaceChildren(...c){this.children=c;},setAttribute(){},addEventListener(k,fn){this.listeners[k]=fn;},showModal(){this.open=true;},close(){this.open=false;this.listeners.close?.();}}),$=id=>{if(!elements.has(id))elements.set(id,create());return elements.get(id);},clone=v=>v===undefined?v:structuredClone(v);
 const records=new Map([['room:1',{scene:{items:[{id:7,type:72}]}}]]),storage={get:async k=>clone(records.get(k)),put:async(k,v)=>{if(typeof k==='string')records.set(k,clone(v));else for(const[a,b]of Object.entries(k))records.set(a,clone(b));},transaction:async fn=>fn(storage)};
 const user={id:'2',credits:0},world={ctx:{storage},ownSockets:()=>[{deserializeAttachment:()=>({roomId:'1'})}],async notifyUser(){}};
 const c={document:{getElementById:$,createElement:create,addEventListener:(k,fn)=>events[k]=fn},performance:{now:()=>t},crypto,requestAnimationFrame:fn=>{frames.set(++frame,fn);return frame;},cancelAnimationFrame:id=>frames.delete(id),MINER_HUB_ONLINE:{room:{id:'1'},preview(){},async dj(action,input){const result=await djAction(world,user,action,input,epoch+t+150);if(action==='start'||action==='open')t+=330;if(action==='hit'&&hold){hold=false;await new Promise(r=>release=r);}return result;}}};c.window=c;vm.createContext(c);vm.runInContext(fs.readFileSync(__dirname+'/../public/hub/dj.js','utf8'),c);
 const settle=()=>new Promise(setImmediate),tick=()=>{for(const [id,fn]of [...frames]){frames.delete(id);fn();}},pad=lane=>$('hubDJPads').children[lane].listeners.pointerdown({button:0,preventDefault(){}});
 await c.HubDJ.open({id:7,type:72});assert(!$('hubDJWelcome').hidden);await $('hubDJStart').onclick();assert(!$('hubDJPlay').hidden);assert.equal($('hubDJNotes').children.length,8);
 for(let level=0;level<3;level++){
  if(level)await $('hubDJStart').onclick();const r=clone(records.get('dj-session:2').round);
  for(let i=0;i<r.count;i++){
   t=r.notes[i].at-epoch-150;tick();assert(!$('hubDJPads').children[r.notes[i].lane].disabled);if(level===0&&i===0)hold=true;
   if(i%2)events.keydown({key:['a','s','d','f'][r.notes[i].lane],preventDefault(){}});else pad(r.notes[i].lane);await settle();
   if(level===0&&i===1){assert.match($('hubDJAccuracy').textContent,/2\/8/);release();await settle();assert.match($('hubDJAccuracy').textContent,/2\/8/,'Older response cannot roll score backwards');}
  }
  t=r.end+400-epoch;tick();await settle();assert(!$('hubDJResult').hidden);assert.match($('hubDJResultDetail').textContent,/100 %/);
 }
 assert.equal(user.credits,100);assert.equal($('hubDJResultCredits').textContent,'+100 créditos');
 await $('hubDJStart').onclick();let r=records.get('dj-session:2').round;t=r.notes[0].at-epoch-150;tick();pad(r.notes[0].lane);await settle();c.HubDJ.close();assert.equal(frames.size,0);
 await c.HubDJ.open({id:7,type:72});r=records.get('dj-session:2').round;t=r.notes[1].at-epoch-150;tick();pad(r.notes[1].lane);await settle();assert.equal(records.get('dj-session:2').round.lastSeq,2,'Resume uses fresh sequence after reopening');assert.equal(Object.keys(records.get('dj-session:2').round.hits).length,2);
 c.HubDJ.close();assert.equal(frames.size,0);console.log('PASS DJ UI: 3 rhythm charts, keyboard/touch, latency prediction, out-of-order replies, automatic atomic payouts, resume sequence and cleanup.');
})().catch(e=>{console.error(e);process.exitCode=1;});
