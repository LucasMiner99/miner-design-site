export const SCRATCH={prices:[10,25,50,100],cells:9,maxMultiplier:50,
 symbols:['Cereza','Limón','Trébol','Campana','Diamante','Corona','Estrella','Siete'],
 tiers:[{count:0,multiplier:0,weight:7000},{count:3,multiplier:2,weight:2000},{count:4,multiplier:3,weight:700},{count:5,multiplier:5,weight:250},{count:6,multiplier:10,weight:40},{count:7,multiplier:50,weight:10}]
};
export function scratchResult(symbols){
 const counts=Array(SCRATCH.symbols.length).fill(0);for(const s of symbols)counts[s]++;
 const count=Math.max(...counts),symbol=counts.indexOf(count),tier=[...SCRATCH.tiers].reverse().find(t=>count>=t.count);
 return {count,symbol,multiplier:tier.multiplier};
}
export function scratchTicket(fill=a=>crypto.getRandomValues(a)){
 const a=new Uint32Array(1),random=n=>{const limit=Math.floor(4294967296/n)*n;do{fill(a);}while(a[0]>=limit);return a[0]%n;};
 const shuffle=list=>{for(let i=list.length-1;i>0;i--){const j=random(i+1);[list[i],list[j]]=[list[j],list[i]];}return list;};
 let roll=random(10000);const tier=SCRATCH.tiers.find(t=>{roll-=t.weight;return roll<0;});
 const ids=shuffle(Array.from({length:SCRATCH.symbols.length},(_,i)=>i)),symbols=Array(tier.count).fill(ids[0]);
 // Fillers never form another triple. The prize is represented exactly by the printed grid.
 const fillers=shuffle((tier.count?ids.slice(1):ids).flatMap(id=>[id,id]));
 symbols.push(...fillers.slice(0,SCRATCH.cells-symbols.length));return shuffle(symbols);
}
