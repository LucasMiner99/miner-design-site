// Inventory units are fungible within each origin: ordinary copies and machine
// prizes. Only ordinary copies may be consumed by the exchange machine.
export function lockedCopies(user,id){return Math.min(user.inventory?.[id]||0,Math.max(0,user.exchangeLocked?.[id]||0));}
export function transferItemCopies(users,offers,adminGrants){
 // Resolve both outgoing bundles before receiving anything. Marked copies move
 // first; admin catalog gifts mint ordinary copies without spending earned stock.
 const marked=offers.map((offer,n)=>Object.fromEntries(Object.entries(offer).map(([id,count])=>[id,adminGrants[n]?0:Math.min(count,lockedCopies(users[n],id))])));
 for(const user of users)user.exchangeLocked={...user.exchangeLocked};
 for(let n=0;n<2;n++)for(const [id,count] of Object.entries(offers[n])){
  if(!adminGrants[n]){users[n].inventory[id]-=count;users[n].exchangeLocked[id]=(users[n].exchangeLocked[id]||0)-marked[n][id];}
 }
 for(let n=0;n<2;n++)for(const [id,count] of Object.entries(offers[n])){
  const target=users[1-n];target.inventory[id]=(target.inventory[id]||0)+count;
  target.exchangeLocked[id]=(target.exchangeLocked[id]||0)+marked[n][id];target.collected[id]=true;
 }
 return marked;
}

async function rows(storage,prefix){
 const result=[];let startAfter;
 for(;;){const page=await storage.list({prefix,limit:1000,...(startAfter?{startAfter}:{})});result.push(...page.values());if(page.size<1000)return result;startAfter=[...page.keys()].at(-1);}
}
export async function migrateExchangeProvenance(storage){
 // Runs once under the world's startup concurrency barrier. Keep legacy receipts
 // and replay transfers so prizes already gifted retain their origin, too.
 const key='migration:exchange-copy-origin:1';if(await storage.get(key))return;
 const exchanges=await rows(storage,'exchange:');
 const events=exchanges.map(e=>({at:e.at,exchange:e}));
 if(exchanges.length)for(const t of await rows(storage,'trade:'))if(t.status==='completed')events.push({at:t.completedAt,trade:t});
 events.sort((a,b)=>a.at-b.at||Number(!!b.exchange)-Number(!!a.exchange));
 const marks=new Map(),bag=id=>{if(!marks.has(id))marks.set(id,{});return marks.get(id);};
 for(const event of events){
  if(event.exchange){const e=event.exchange,m=bag(e.userId);m[e.sourceId]=Math.max(0,(m[e.sourceId]||0)-1);m[e.rewardId]=(m[e.rewardId]||0)+1;}
  else{
   const t=event.trade,out=t.offers.map((offer,n)=>Object.fromEntries(Object.entries(offer).map(([id,count])=>[id,t.adminGrants?.[n]?0:Math.min(count,bag(t.users[n])[id]||0)])));
   for(let n=0;n<2;n++)for(const [id,count] of Object.entries(out[n]))bag(t.users[n])[id]=(bag(t.users[n])[id]||0)-count;
   for(let n=0;n<2;n++)for(const [id,count] of Object.entries(out[n]))bag(t.users[1-n])[id]=(bag(t.users[1-n])[id]||0)+count;
  }
 }
 const updates={};for(const [id,counts] of marks){const user=await storage.get('user:'+id);if(!user)continue;user.exchangeLocked=Object.fromEntries(Object.entries(counts).map(([item,count])=>[item,Math.min(count,user.inventory?.[item]||0)]).filter(([,count])=>count>0));updates['user:'+id]=user;}
 await storage.transaction(async tx=>{const entries=Object.entries(updates);for(let i=0;i<entries.length;i+=128)await tx.put(Object.fromEntries(entries.slice(i,i+128)));await tx.put(key,true);});
}
