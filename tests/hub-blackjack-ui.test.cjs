const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
(async()=>{
 const rules=await import('../public/hub/blackjack-rules.mjs'),nodes=new Map();
 function element(){return {value:'10',textContent:'',children:[],dataset:{},classList:{add(){}},setAttribute(k,v){this[k]=v;},append(...items){this.children.push(...items);},replaceChildren(){this.children=[];},addEventListener(k,fn){this[k]=fn;},showModal(){this.open=true;},close(){this.open=false;this['closeEvent']?.();}};}
 const get=id=>{if(!nodes.has(id)){const e=element();e.addEventListener=(k,fn)=>{e[k==='close'?'closeEvent':k]=fn;};nodes.set(id,e);}return nodes.get(id);};
 const memory=new Map(),sessionStorage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)},calls=[];
 let game=null,balance=100,fail=false,resolveAction=null,delayAction=false;
 const bridge={user:{id:'2'},room:{id:'1'},ledger:{credits:()=>balance},async blackjack(route,input){calls.push({route,input});if(route==='open')return {game};if(fail){fail=false;throw Error('Sin conexión');}if(delayAction)await new Promise(r=>resolveAction=r);game={id:input.requestId,amount:10,stake:10,player:[4,5],dealer:[9,null],revision:0,status:'playing',canDouble:true};if(route==='start')balance-=10;else game={...game,id:input.handId,status:'finished',dealer:[9,6],player:[4,5,9],revision:1,outcome:'win',payout:20,canDouble:false};return {game};}};
 const window={MINER_HUB_ONLINE:bridge,matchMedia:()=>({matches:true})},scope={...rules,window,document:{getElementById:get,createElement:element},sessionStorage,crypto,setTimeout,clearTimeout};
 vm.runInNewContext(fs.readFileSync('public/hub/blackjack.js','utf8').replace(/^import .*?;\r?\n/,''),scope);
 await window.HubBlackjack.open({id:5});assert(get('hubBlackjackDialog').open);assert(!get('hubBlackjackStart').disabled);
 fail=true;get('hubBlackjackForm').onsubmit({preventDefault(){}});await new Promise(setImmediate);assert.equal(get('hubBlackjackStart').textContent,'Recuperar jugada');assert.equal(balance,100);
 const oldId=calls.at(-1).input.requestId;get('hubBlackjackForm').onsubmit({preventDefault(){}});await new Promise(setImmediate);assert.equal(calls.at(-1).input.requestId,oldId);assert.equal(balance,90);assert(!get('hubBlackjackActions').hidden);assert(get('hubBlackjackStart').hidden);assert.equal(get('hubBlackjackDealer').children[1]['aria-label'],'Carta oculta');
 delayAction=true;get('hubBlackjackStand').onclick();const count=calls.length;get('hubBlackjackStand').onclick();assert.equal(calls.length,count,'Double click submits only one action');assert(get('hubBlackjackHit').disabled);resolveAction();await new Promise(setImmediate);assert(get('hubBlackjackActions').hidden);assert(get('hubBlackjackStatus').textContent.includes('Ganaste'));assert(!get('hubBlackjackDealerTotal').textContent.toString().includes('?'));
 window.HubBlackjack.close();await window.HubBlackjack.open({id:6});assert.equal(get('hubBlackjackStatus').textContent,'¡Ganaste! · +10 créditos');window.HubBlackjack.close();assert(!get('hubBlackjackDialog').open);
 console.log('PASS blackjack UI: hidden dealer card, server hand rendering, retry preserves request ID, no double submits, finished result and reopen recovery.');
})().catch(e=>{console.error(e);process.exitCode=1;});
