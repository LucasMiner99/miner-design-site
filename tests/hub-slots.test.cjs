const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const {SLOTS,slotStops,slotPrize,slotMultiplier}=await import('../public/hub/slots-rules.mjs');
 assert.deepEqual([SLOTS.min,SLOTS.max],[1,100]);assert.equal(SLOTS.strip.length,20);
 const frequencies=SLOTS.symbols.map((_,i)=>SLOTS.strip.filter(s=>s===i).length);assert.deepEqual(frequencies,[6,5,4,3,1,1]);
 let total=0,jackpots=0,max=0;for(let a=0;a<20;a++)for(let b=0;b<20;b++)for(let c=0;c<20;c++){const mult=slotMultiplier([a,b,c]);total+=mult;max=Math.max(max,mult);if(mult===100)jackpots++;assert.equal(slotPrize([a,b,c],100),100*mult);}
 assert.equal(total/8000,.9025);assert.equal(jackpots,1);assert.equal(max,100);
 for(const [stops,m]of [[[14,14,14],100],[[7,7,7],50],[[4,4,4],20],[[2,2,2],15],[[1,1,1],10],[[0,0,0],6],[[0,0,14],2],[[14,0,0],2],[[0,14,0],2],[[0,1,2],0]])assert.equal(slotMultiplier(stops),m);
 let i=0;const samples=[4294967295,0,19,14];assert.deepEqual(slotStops(a=>a[0]=samples[i++]),[0,19,14]);assert.equal(i,4);
 const {C,CATALOG,R}=await import('../src/hub-rules.mjs');assert.equal(C.TYPES[117].interaction,'slots');assert(R.poolFor(CATALOG,'object').some(i=>i.type===117));
 for(let rotation=0;rotation<4;rotation++)assert(C.restore({...C.initial(),items:[{id:1,type:117,x:3,y:3,rotation}]}));
 for(const name of ['v69-tragamonedas.webp','rotations/117.webp'])assert(fs.statSync(path.join(__dirname,'../public/hub/assets',name)).size<100000);
 console.log('PASS all 8,000 outcomes: 90.25% return, 1/8,000 jackpot, max 100x, exact integer payouts, unbiased independent stops, catalog and four rotations.');
})().catch(e=>{console.error(e);process.exitCode=1;});
