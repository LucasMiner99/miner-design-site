const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
(async()=>{
 const {SLOTS,slotSymbols,slotPrize}=await import('../public/hub/slots-rules.mjs');
 const ids=new Map(),storage=new Map(),calls=[],frames=new Map();let clock=0,nextFrame=0,mode='success',last=null,credits=1000;
 const context2d=new Proxy({}, {get:(_,key)=>key==='createLinearGradient'?()=>({addColorStop(){}}):()=>{}});
 function el(){return {value:'10',textContent:'',dataset:{},disabled:false,open:false,events:{},setAttribute(k,v){this[k]=v;},addEventListener(k,f){this.events[k]=f;},showModal(){this.open=true;},close(){this.open=false;this.events.close?.();},getContext:()=>context2d};}
 const get=id=>{if(!ids.has(id))ids.set(id,el());return ids.get(id);},presets=[1,10,25,50,100].map(n=>Object.assign(el(),{dataset:{slotBet:String(n)}}));
 const bridge={user:{id:'2'},room:{id:'1'},ledger:{credits:()=>credits},async slots(action,input){calls.push({action,...input});if(action==='open')return {last,serverNow:clock};if(mode==='pending')return new Promise(resolve=>bridge.resolve=resolve);if(mode==='network')throw Error('Sin conexión');if(mode==='reject')throw Object.assign(Error('Fondos insuficientes'),{status:409});last={...input,stops:[14,14,14],multiplier:100,prize:input.amount*100,at:clock};return {receipt:last,serverNow:clock};}};
 const context=vm.createContext({SLOTS,slotSymbols,document:{getElementById:get,querySelectorAll:()=>presets},crypto,performance:{now:()=>clock},sessionStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},requestAnimationFrame:f=>{const id=++nextFrame;frames.set(id,f);return id;},cancelAnimationFrame:id=>frames.delete(id),MINER_HUB_ONLINE:bridge,matchMedia:()=>({matches:false})});context.window=context;
 vm.runInContext(fs.readFileSync(__dirname+'/../public/hub/slots.js','utf8').replace(/^import .*;\r?\n/,''),context);
 const tick=()=>new Promise(r=>setImmediate(r)),submit=()=>get('hubSlotsForm').onsubmit({preventDefault(){}}),advance=ms=>{clock+=ms;const queued=[...frames.values()];frames.clear();queued.forEach(f=>f(clock));};
 await context.HubSlots.open({id:1});assert(get('hubSlotsDialog').open);assert.equal(calls.length,1,'Opening never wagers');
 mode='pending';const active=submit();await tick();assert(get('hubSlotsBet').disabled);await submit();assert.equal(calls.filter(c=>c.action==='bet').length,1);
 const first=calls.at(-1);bridge.resolve({receipt:{...first,stops:[14,14,14],multiplier:100,prize:1000,at:clock},serverNow:clock});await tick();advance(4001);await active;
 assert.match(get('hubSlotsStatus').textContent,/Premio máximo.*1.000 créditos.*990 netos/);assert.equal(storage.size,0);
 mode='network';await submit();assert.match(get('hubSlotsBet').textContent,/Recuperar/);const pending=calls.at(-1),saved=[...storage.values()][0];context.HubSlots.close();await context.HubSlots.open({id:1});assert.equal([...storage.values()][0],saved);
 mode='success';const retry=submit();await tick();assert.equal(calls.at(-1).requestId,pending.requestId);advance(4001);await retry;assert.equal(storage.size,0);
 const next=submit();await tick();advance(1200);context.HubSlots.close();await next;assert.equal(frames.size,0);const resume=context.HubSlots.open({id:1});await tick();assert(get('hubSlotsBet').disabled);advance(3000);await resume;assert(!get('hubSlotsBet').disabled);
 mode='pending';const closed=submit();await tick();const request=calls.at(-1);context.HubSlots.close();bridge.resolve({receipt:{...request,stops:[0,1,2],multiplier:0,prize:0,at:clock},serverNow:clock});await closed;assert.equal(storage.size,0);assert.equal(frames.size,0);
 await context.HubSlots.open({id:1});mode='reject';await submit();assert.equal(storage.size,0);
 for(const value of ['0','.5','101','1e20']){get('hubSlotsAmount').value=value;const n=calls.length;await submit();assert.equal(calls.length,n);}
 presets[4].onclick();assert.equal(get('hubSlotsAmount').value,'100');credits=1;const n=calls.length;await submit();assert.equal(calls.length,n);assert.match(get('hubSlotsStatus').textContent,/suficientes/);
 console.log('PASS slots UI: no bet on open, double-submit guard, 777 payout, pending recovery, resume, close during request/animation, invalid amounts, presets and insufficient credits.');
})().catch(e=>{console.error(e);process.exitCode=1;});
