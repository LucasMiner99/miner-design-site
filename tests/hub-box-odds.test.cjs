const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
(async()=>{
 const client={};vm.runInNewContext(fs.readFileSync('public/hub/rewards.js','utf8'),client);
 const {R}=await import('../src/hub-rules.mjs');
 const pool=[{id:'owned'},{id:'new-a'},{id:'new-b'}],collected=new Set(['owned']);
 for(const rules of [client.VeredaRewards,R]){
  // Sweep the full probability space independently of how many items remain.
  for(const choices of [pool,[pool[0],pool[1]]]){
   let repeats=0;
   for(let bucket=0;bucket<1000;bucket++){
    const rolls=[(bucket+.5)/1000,.5];
    if(rules.draw(choices,collected,()=>rolls.shift()).id==='owned')repeats++;
   }
   assert.equal(repeats,20,'Exactly 2% repeats while undiscovered rewards remain');
  }
  for(const [roll,id] of [[.979999,'new-a'],[.98,'owned'],[.999999,'owned']]){
   const rolls=[roll,0];assert.equal(rules.draw(pool,collected,()=>rolls.shift()).id,id);
  }
  assert.equal(rules.draw(pool,new Set(),()=>0).id,'owned','First reward needs no repeat roll');
  assert.equal(rules.draw(pool,new Set(pool.map(i=>i.id)),()=>.99).id,'new-b','Complete collection still grants copies');
  assert.throws(()=>rules.draw([],collected),/Caja desconocida/);
  let saved=null;
  const ledger=rules.create({catalog:pool.map(i=>({...i,kind:'object'})),storage:{getItem:()=>saved,setItem:(_,v)=>saved=v},random:()=>0});
  const first=ledger.grant({id:'one',userId:'u',kind:'object',status:'accepted'});
  const second=ledger.grant({id:'two',userId:'u',kind:'object',status:'accepted'});
  assert.notEqual(first.itemId,second.itemId,'Unopened rewards count as discoveries');
  assert.equal(ledger.grant({id:'one',userId:'u',kind:'object',status:'accepted'}).itemId,first.itemId,'Retry never rerolls');
 }
 console.log('PASS box odds: client/server 98% new, 2% repeat, thresholds, completed collection, pending prizes and replay.');
})().catch(e=>{console.error(e);process.exitCode=1;});
