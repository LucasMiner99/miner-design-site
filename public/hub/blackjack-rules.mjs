export const BLACKJACK={min:1,max:100,decks:6,dealerStand:17};
export function handValue(cards){
 let total=0,aces=0;
 for(const card of cards){const rank=card%13;if(rank===0){total+=11;aces++;}else total+=Math.min(rank+1,10);}
 while(total>21&&aces){total-=10;aces--;}
 return {total,soft:aces>0,blackjack:cards.length===2&&total===21,bust:total>21};
}
export function cardLabel(card){const rank=['A','2','3','4','5','6','7','8','9','10','J','Q','K'][card%13],suit=['♠','♥','♦','♣'][Math.floor(card/13)];return {rank,suit,red:Math.floor(card/13)===1||Math.floor(card/13)===2};}
