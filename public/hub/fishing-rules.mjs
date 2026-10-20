// Fixed-step simulation shared by the responsive client and authoritative server.
export const FISHING={stepMs:50,maxTicks:700,batchLimit:40,leadMs:150,sessionMs:45000,castDelay:8000,rankingLimit:20};
export const FISH=[
 {id:'silverside',name:'Pejerrey',rarity:'Común',rank:1,weight:46,min:10,max:28,reward:20,color:'#a6c7d0'},
 {id:'trout',name:'Trucha Arcoíris',rarity:'Poco común',rank:2,weight:28,min:20,max:48,reward:30,color:'#8db99a'},
 {id:'goldcarp',name:'Carpa Dorada',rarity:'Raro',rank:3,weight:16,min:35,max:80,reward:45,color:'#e7ba69'},
 {id:'moonkoi',name:'Koi Lunar',rarity:'Épico',rank:4,weight:8,min:55,max:130,reward:70,color:'#b8a0ec'},
 {id:'astral',name:'Arowana Astral',rarity:'Legendario',rank:5,weight:2,min:90,max:220,reward:120,color:'#8fdde0'}
];
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const fishOf=s=>FISH.find(f=>f.id===s.species);
export const sizeRatio=s=>{const f=fishOf(s);return clamp((s.lengthMm/10-f.min)/(f.max-f.min),0,1);};
export function rollFish(random){
 let roll=random()*100,fish=FISH.at(-1);for(const f of FISH){roll-=f.weight;if(roll<0){fish=f;break;}}
 const lengthMm=Math.round((fish.min+(fish.max-fish.min)*random()**1.7)*10);
 return {species:fish.id,lengthMm,seed:Math.floor(random()*4294967296)};
}
export const initialFishing=()=>({tick:0,y:.5,v:0,progress:.28,done:false,won:false});
export const barHeight=s=>.32-(fishOf(s).rank-1)*.022-sizeRatio(s)*.04;
function noise(seed,i){let a=(seed^Math.imul(i+1,0x45d9f3b))>>>0;a=Math.imul(a^(a>>>16),0x45d9f3b);return ((a^(a>>>16))>>>0)/4294967296;}
export function fishPosition(s,tick){
 const t=tick*FISHING.stepMs/1000,rank=fishOf(s).rank-1,interval=2.1-rank*.20-sizeRatio(s)*.30;
 const index=Math.floor(t/interval),part=t/interval-index,mix=part*part*(3-2*part);
 const a=index===0?.5:.12+noise(s.seed,index-1)*.76,b=.12+noise(s.seed,index)*.76;
 return clamp(a+(b-a)*mix+Math.sin(t*(2+rank*.3))*.018,.08,.92);
}
export function stepFishing(s,held){
 const p=s.state;if(p.done)return p;const dt=FISHING.stepMs/1000,half=barHeight(s)/2;
 let v=clamp((p.v+(held?-1.8:1.35)*dt)*.985,-.85,.85),y=p.y+v*dt;
 if(y<half){y=half;v=0;}if(y>1-half){y=1-half;v=0;}
 const tick=p.tick+1,inside=Math.abs(fishPosition(s,tick)-y)<=half+.018;
 const progress=clamp(p.progress+dt*(inside?.09:-.09),0,1),won=progress>=1,done=won||progress<=0||tick>=FISHING.maxTicks;
 return {tick,y,v,progress,done,won};
}
export function advanceFishing(s,inputs){for(const held of inputs){if(s.state.done)break;s.state=stepFishing(s,held);}return s.state;}
export function fishingReward(s){return Math.round(fishOf(s).reward*(1+sizeRatio(s)*.5));}
export const sizeLabel=mm=>(mm/10).toLocaleString('es-AR',{minimumFractionDigits:1,maximumFractionDigits:1})+' cm';
export const compareSize=(a,b)=>b.lengthMm-a.lengthMm||b.rank-a.rank||a.at-b.at||a.userId.localeCompare(b.userId);
export const compareRarity=(a,b)=>b.rank-a.rank||b.lengthMm-a.lengthMm||a.at-b.at||a.userId.localeCompare(b.userId);
export function insertRecord(rows,entry,compare){
 const prior=rows.find(r=>r.userId===entry.userId);
 if(prior&&compare(prior,entry)<=0)return rows;
 return [...rows.filter(r=>r.userId!==entry.userId),entry].sort(compare).slice(0,FISHING.rankingLimit);
}
