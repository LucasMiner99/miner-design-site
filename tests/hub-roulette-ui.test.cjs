const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const ids=new Map(),storage=new Map(),timers=[],calls=[];let mode='success',credits=1000,last=null;
const ctx2d=new Proxy({}, {get:()=>()=>{}});
function el(){return {value:'100',textContent:'',style:{},dataset:{},disabled:false,open:false,events:{},setAttribute(k,v){this[k]=v;},addEventListener(k,f){this.events[k]=f;},showModal(){this.open=true;},close(){this.open=false;this.events.close?.();},getContext:()=>ctx2d};}
const get=id=>{if(!ids.has(id))ids.set(id,el());return ids.get(id);},colors=['red','black','green'].map(color=>Object.assign(el(),{dataset:{rouletteColor:color}}));
const bridge={user:{id:'2'},room:{id:'1'},ledger:{credits:()=>credits},async roulette(action,input){calls.push({action,...input});if(action==='open')return {last};if(mode==='pending')return new Promise(resolve=>bridge.resolve=resolve);if(mode==='network')throw Error('Sin conexión');if(mode==='reject')throw Object.assign(Error('Fondos insuficientes'),{status:409});credits=1100;last={...input,number:1,result:'red',prize:200};return {receipt:last};}};
const context=vm.createContext({document:{getElementById:get,querySelectorAll:()=>colors},crypto,sessionStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},setTimeout:f=>timers.push(f),MINER_HUB_ONLINE:bridge,matchMedia:()=>({matches:true})});context.window=context;
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../public/hub/roulette.js'),'utf8'),context);
const tick=()=>new Promise(r=>setImmediate(r)),submit=()=>get('hubRouletteForm').onsubmit({preventDefault(){}});
(async()=>{
 await context.HubRoulette.open({id:1});assert(get('hubRouletteDialog').open);assert.equal(calls.length,1,'Opening never bets');
 mode='pending';const active=submit();await tick();assert(get('hubRouletteBet').disabled);await submit();assert.equal(calls.filter(c=>c.action==='bet').length,1,'Double click sends once');
 const first=calls.at(-1);bridge.resolve({receipt:{...first,number:1,result:'red',prize:200}});await tick();timers.shift()();await active;assert.match(get('hubRouletteStatus').textContent,/Ganaste 100/);assert.equal(storage.size,0);
 mode='network';await submit();assert.match(get('hubRouletteBet').textContent,/Recuperar/);const pending=calls.at(-1);const serialized=[...storage.values()][0];
 context.HubRoulette.close();await context.HubRoulette.open({id:1});assert.equal([...storage.values()][0],serialized);
 mode='success';const retry=submit();await tick();assert.equal(calls.at(-1).requestId,pending.requestId);timers.shift()();await retry;assert.equal(storage.size,0);
 mode='pending';const closed=submit();await tick();const req=calls.at(-1);context.HubRoulette.close();bridge.resolve({receipt:{...req,number:0,result:'green',prize:0}});await closed;assert.equal(get('hubRouletteDialog').open,false);assert.equal(storage.size,0,'Settlement still clears receipt after close');
 await context.HubRoulette.open({id:1});mode='reject';await submit();assert.equal(storage.size,0,'Definite server rejection may start a fresh request');assert(!get('hubRouletteBet').disabled);
 colors[2].onclick();assert.match(get('hubRouletteBet').textContent,/verde/);get('hubRouletteAmount').value='0.5';const n=calls.length;await submit();assert.equal(calls.length,n);
 console.log('PASS roulette UI: no wager on open, double clicks, saved retry UUID, network recovery, close during settlement, rejected wagers, color and integer input.');
})().catch(e=>{console.error(e);process.exitCode=1;});
