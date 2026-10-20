const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const {RACING,racingPrize,racingWinner}=await import('../public/hub/racing-rules.mjs');
 assert.equal(RACING.horses.length,5);
 const counts=[0,0,0,0,0];
 for(let n=0;n<100;n++)counts[racingWinner(a=>a[0]=n)]++;
 assert.deepEqual(counts,RACING.horses.map(h=>h.chance));
 let calls=0;assert.equal(racingWinner(a=>a[0]=calls++?99:4294967295),4);assert.equal(calls,2);
 for(const h of RACING.horses)for(const amount of [5,100,10000]){
  assert(Number.isSafeInteger(racingPrize(h.id,amount)));
  assert.equal(racingPrize(h.id,amount),amount*h.payout/10);
  assert.equal(h.chance*h.payout/1000,.9,'Same expected return for every horse');
 }
 const {C,CATALOG,R}=await import('../src/hub-rules.mjs');
 assert.equal(C.TYPES[99].interaction,'racing');
 assert.equal(CATALOG.find(i=>i.id==='object:99').name,'Carreras de Caballos');
 assert(R.poolFor(CATALOG,'object').some(i=>i.id==='object:99'));
 assert(!R.poolFor(CATALOG,'plantation').some(i=>i.id==='object:99'));
 for(let rotation=0;rotation<4;rotation++)assert(C.canPlace([],{id:1,type:99,x:2,y:2,rotation},null,'square'));
 for(const file of ['v59-horse-racing.webp','rotations/99.webp'])assert(fs.statSync(path.join(__dirname,'../public/hub/assets',file)).size<100000);
 console.log('PASS racing rules: exact weighted outcomes, unbiased random draw, integer/equal-return payouts, catalog and four rotations.');
})().catch(e=>{console.error(e);process.exitCode=1;});
