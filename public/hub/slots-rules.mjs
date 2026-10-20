// One centre payline, independent uniform stops on three identical 20-stop reels.
export const SLOTS={min:1,max:100,duration:4000,maxMultiplier:100,
 symbols:[{id:'cherry',name:'Cerezas',multiplier:6},{id:'lemon',name:'Limón',multiplier:10},{id:'grape',name:'Uvas',multiplier:15},{id:'bell',name:'Campana',multiplier:20},{id:'bar',name:'BAR',multiplier:50},{id:'seven',name:'7',multiplier:100}],
 strip:[0,1,2,0,3,1,0,4,2,1,0,3,2,0,5,1,3,0,2,1],pairCherry:2
};
export function slotSymbols(stops){return stops.map(n=>SLOTS.strip[n]);}
export function slotMultiplier(stops){const s=slotSymbols(stops);if(s.every(n=>n===s[0]))return SLOTS.symbols[s[0]].multiplier;return s.filter(n=>n===0).length===2?SLOTS.pairCherry:0;}
export const slotPrize=(stops,amount)=>slotMultiplier(stops)*amount;
export function slotStops(fill=a=>crypto.getRandomValues(a)){
 const n=SLOTS.strip.length,limit=Math.floor(4294967296/n)*n,a=new Uint32Array(1),stops=[];
 for(let i=0;i<3;i++){do{fill(a);}while(a[0]>=limit);stops.push(a[0]%n);}return stops;
}
