const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
(async()=>{
 const {RACING,racingPrize}=await import('../public/hub/racing-rules.mjs');
 const ids=new Map(),storage=new Map(),calls=[],frames=new Map();let clock=0,nextFrame=0,mode='success',last=null,credits=1000;
 const context2d=new Proxy({}, {get:()=>()=>{}});
 function el(){return {value:'100',textContent:'',style:{setProperty(){}},dataset:{},disabled:false,open:false,events:{},children:[],append(...c){this.children.push(...c);},setAttribute(k,v){this[k]=v;},addEventListener(k,f){this.events[k]=f;},showModal(){this.open=true;},close(){this.open=false;this.events.close?.();},getContext:()=>context2d};}
 const get=id=>{if(!ids.has(id))ids.set(id,el());return ids.get(id);};
 const bridge={user:{id:'2'},room:{id:'1'},ledger:{credits:()=>credits},async racing(action,input){
  calls.push({action,...input});if(action==='open')return {last,serverNow:clock};
  if(mode==='pending')return new Promise(resolve=>bridge.resolve=resolve);
  if(mode==='network')throw Error('Sin conexión');
  if(mode==='reject')throw Object.assign(Error('Fondos insuficientes'),{status:409});
  last={...input,winner:input.horse,prize:racingPrize(input.horse,input.amount),at:clock,seed:27};return {receipt:last,serverNow:clock};
 }};
 const context=vm.createContext({RACING,racingPrize,document:{getElementById:get,createElement:el},crypto,performance:{now:()=>clock},sessionStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},requestAnimationFrame:f=>{const id=++nextFrame;frames.set(id,f);return id;},cancelAnimationFrame:id=>frames.delete(id),MINER_HUB_ONLINE:bridge,matchMedia:()=>({matches:false})});context.window=context;
 vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../public/hub/racing.js'),'utf8').replace(/^import .*;\r?\n/,''),context);
 const tick=()=>new Promise(r=>setImmediate(r)),submit=()=>get('hubRacingForm').onsubmit({preventDefault(){}}),advance=ms=>{clock+=ms;const queued=[...frames.values()];frames.clear();queued.forEach(f=>f(clock));};
 await context.HubRacing.open({id:1});assert(get('hubRacingDialog').open);assert.equal(calls.length,1);assert.equal(get('hubRacingHorses').children.length,5);
 mode='pending';const active=submit();await tick();assert(get('hubRacingBet').disabled);await submit();assert.equal(calls.filter(c=>c.action==='bet').length,1);
 const first=calls.at(-1);bridge.resolve({receipt:{...first,winner:0,prize:200,seed:3,at:clock},serverNow:clock});await tick();advance(12001);await active;
 assert.match(get('hubRacingStatus').textContent,/200 créditos.*100 netos/);assert.equal(storage.size,0);
 mode='network';await submit();assert.match(get('hubRacingBet').textContent,/Recuperar/);const pending=calls.at(-1),saved=[...storage.values()][0];
 context.HubRacing.close();await context.HubRacing.open({id:1});assert.equal([...storage.values()][0],saved);
 mode='success';const retry=submit();await tick();assert.equal(calls.at(-1).requestId,pending.requestId);advance(12001);await retry;assert.equal(storage.size,0);
 // Closing cancels animation immediately; reopening resumes a committed race.
 const next=submit();await tick();advance(2500);context.HubRacing.close();await next;assert.equal(frames.size,0);assert(!get('hubRacingDialog').open);
 const resume=context.HubRacing.open({id:1});await tick();assert(get('hubRacingBet').disabled);advance(10000);await resume;assert(!get('hubRacingBet').disabled);
 mode='pending';const closed=submit();await tick();const request=calls.at(-1);context.HubRacing.close();bridge.resolve({receipt:{...request,winner:4,prize:0,seed:4,at:clock},serverNow:clock});await closed;assert.equal(storage.size,0);assert.equal(frames.size,0);
 await context.HubRacing.open({id:1});mode='reject';await submit();assert.equal(storage.size,0);
 get('hubRacingHorses').children[4].onclick();assert.match(get('hubRacingReturn').textContent,/Medianoche.*1.800/);
 for(const value of ['0.5','6','10005']){get('hubRacingAmount').value=value;const n=calls.length;await submit();assert.equal(calls.length,n);}
 console.log('PASS racing UI: selection, odds, no bet on open, double-submit guard, same-ID recovery, pause-free resume, close/disconnect animation cleanup, rejected wagers and amount validation.');
})().catch(e=>{console.error(e);process.exitCode=1;});
