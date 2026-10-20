// Shared display rules. Wagers and outcomes are validated by the server.
export const RACING={
 min:5,max:10000,step:5,duration:12000,
 horses:[
  {id:0,name:'Relámpago',color:'#e67366',chance:45,payout:20},
  {id:1,name:'Cobre',color:'#e9b953',chance:25,payout:36},
  {id:2,name:'Lucero',color:'#6bb9dc',chance:15,payout:60},
  {id:3,name:'Cometa',color:'#b798dd',chance:10,payout:90},
  {id:4,name:'Medianoche',color:'#8fc6aa',chance:5,payout:180}
 ]
};
// Payouts are in tenths and include the stake. Multiples of five pay whole credits.
export const racingPrize=(horse,amount)=>Math.floor(amount*RACING.horses[horse].payout/10);
export function racingWinner(fill=a=>crypto.getRandomValues(a)){
 const a=new Uint32Array(1),limit=Math.floor(4294967296/100)*100;
 do{fill(a);}while(a[0]>=limit);
 let draw=a[0]%100;
 for(const horse of RACING.horses){if(draw<horse.chance)return horse.id;draw-=horse.chance;}
}
