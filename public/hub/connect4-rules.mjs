export const CONNECT4=Object.freeze({columns:7,rows:6,min:5,max:10000,turnMs:60000,inviteMs:60000});
export function drop(board,column,player){
 if(!Array.isArray(board)||board.length!==42||!Number.isInteger(column)||column<0||column>6||![1,2].includes(player))throw Error('Jugada inválida.');
 const next=board.slice();let row=5;while(row>=0&&next[row*7+column])row--;
 if(row<0)throw Error('Esa columna está llena.');
 const index=row*7+column;next[index]=player;
 for(const [dx,dy] of [[1,0],[0,1],[1,1],[1,-1]]){
  const line=[index];
  for(const sign of [-1,1])for(let step=1;step<4;step++){
   const x=column+dx*step*sign,y=row+dy*step*sign;
   if(x<0||x>6||y<0||y>5||next[y*7+x]!==player)break;line.push(y*7+x);
  }
  if(line.length>=4)return {board:next,index,line,won:true,draw:false};
 }
 return {board:next,index,line:[],won:false,draw:next.every(Boolean)};
}
