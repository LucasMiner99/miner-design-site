const assert=require('node:assert/strict');
(async()=>{
 const {SCRATCH,scratchTicket,scratchResult}=await import('../public/hub/scratch-rules.mjs');
 let seed=421;const next=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
 const totals=new Map();let payout=0;
 // Every prize draw bucket, with independent deterministic shuffle/filler samples.
 for(let roll=0;roll<10000;roll++){let first=true;const symbols=scratchTicket(a=>{a[0]=first?(first=false,roll):next();return a;});assert.equal(symbols.length,9);assert(symbols.every(n=>Number.isInteger(n)&&n>=0&&n<8));
  const r=scratchResult(symbols);totals.set(r.multiplier,(totals.get(r.multiplier)||0)+1);payout+=r.multiplier;
  const counts=Array(8).fill(0);symbols.forEach(s=>counts[s]++);assert(counts.filter(n=>n>=3).length<=1);
 }
 for(const tier of SCRATCH.tiers)assert.equal(totals.get(tier.multiplier),tier.weight);
 assert.equal(payout/10000,.825,'Declared return is 82.5%, not an accidental profitable loop');
 for(let n=3;n<=9;n++){const symbols=[...Array(n).fill(0),...Array.from({length:9-n},(_,i)=>i+1)];assert(scratchResult(symbols).multiplier>=2);}
 const vm=require('node:vm'),fs=require('node:fs'),scope={};vm.runInNewContext(fs.readFileSync('public/hub/core.js','utf8'),scope);const C=scope.VeredaCore,{C:server,CATALOG,R}=await import('../src/hub-rules.mjs');assert.equal(C.TYPES[119].interaction,'scratch');assert.equal(JSON.stringify(C.TYPES[119]),JSON.stringify(server.TYPES[119]));assert(R.poolFor(CATALOG,'object').some(x=>x.id==='object:119'));
 const {scratch}=await import('../src/hub-scratch.mjs'),id='11111111-1111-4111-8111-111111111111',data=new Map(),user={id:'2',credits:1999999990};
 data.set('scratch:2:'+id,{id,amount:10,symbols:[0,0,0,1,1,2,2,3,4],prize:20,multiplier:2,status:'pending'});
 const storage={async get(k){return structuredClone(data.get(k));},async put(rows){for(const [k,v]of Object.entries(rows))data.set(k,structuredClone(v));},async transaction(fn){return fn(this);}},world={ctx:{storage},notifyUser:async()=>{}};
 await assert.rejects(scratch(world,user,'claim',{ticketId:id,prize:99999}),/límite|créditos/);assert.equal(data.get('scratch:2:'+id).status,'pending');
 user.credits=100;const claimed=await scratch(world,user,'claim',{ticketId:id,prize:99999});assert.equal(claimed.ticket.prize,20);assert.equal(user.credits,120);await scratch(world,user,'claim',{ticketId:id});assert.equal(user.credits,120);assert.equal(user.walletVersion,1);
 console.log('PASS scratch rules/wallet: all 10000 outcome buckets, exact paytable/odds, no accidental triples, fixed return, type parity, saved prize at wallet cap and exactly-once winning payment.');
})().catch(e=>{console.error(e);process.exitCode=1;});
