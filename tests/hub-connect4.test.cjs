const assert=require('node:assert/strict'),crypto=require('node:crypto');
(async()=>{
 const {drop}=await import('../public/hub/connect4-rules.mjs'),{connect4Action,expireConnect4,guardConnect4Tables}=await import('../src/hub-connect4.mjs');
 for(const [dx,dy] of [[1,0],[0,1],[1,1],[1,-1]]){
  const b=Array(42).fill(0);
  // Construct a legal landing cell and three neighboring matching counters.
  const row=dy===1?5:dy===-1?2:5,col=3;
  for(let k=1;k<=3;k++)b[(row-dy*k)*7+(col-dx*k)]=1;
  for(let r=row+1;r<6;r++)b[r*7+col]=2;
  const result=drop(b,col,1);assert(result.won,`${dx},${dy} win`);assert(result.line.length>=4);
 }
 let board=Array(42).fill(0);for(let n=0;n<6;n++){const r=drop(board,4,n%2+1);assert.equal(r.index,(5-n)*7+4);board=r.board;}assert.throws(()=>drop(board,4,1),/llena/);
 for(const c of [-1,7,1.5,'2',null])assert.throws(()=>drop(board,c,1));
 const drawBoard=Array.from({length:42},(_,i)=>((Math.floor(i/7)%2===0?Math.floor(i%7/2):Math.floor((i%7+2)/2))%2)+1);
 // This full board has alternating paired stripes and no four-in-a-row.
 drawBoard[0]=0;const drawn=drop(drawBoard,0,1);assert(drawn.draw&&!drawn.won);
 const data=new Map(),clone=v=>v===undefined?undefined:structuredClone(v);let alarm=null,failTx=false;
 const storage={async get(k){return clone(data.get(k));},async put(k,v){if(typeof k==='object'){for(const [a,b] of Object.entries(k))data.set(a,clone(b));}else data.set(k,clone(v));},async delete(keys){for(const k of Array.isArray(keys)?keys:[keys])data.delete(k);},async list({prefix}){return new Map([...data].filter(([k])=>k.startsWith(prefix)).map(([k,v])=>[k,clone(v)]));},async getAlarm(){return alarm;},async setAlarm(at){alarm=at;},async transaction(fn){const saved=clone(data);try{if(failTx)throw Error('simulated transaction failure');return await fn(storage);}catch(e){data.clear();for(const [k,v] of saved)data.set(k,v);throw e;}}};
 const room={id:'1',scene:{items:[{id:1,type:100}]}};await storage.put('room:1',room);
 for(const id of ['1','2','3'])await storage.put('user:'+id,{id,name:'Player'+id,credits:1000,walletVersion:0});
 const sockets=new Map(['1','2','3'].map(id=>[id,[{deserializeAttachment:()=>({roomId:'1'})}]])),events=[];
 const w={ctx:{storage},ownSockets:id=>sockets.get(id)||[],players:()=>['1','2','3'].map(id=>({id,name:'Player'+id})),user:async id=>storage.get('user:'+id),notifyUser:async()=>{},broadcast:(r,e)=>events.push(clone(e)),send:()=>{}};
 const action=async(id,b)=>connect4Action(w,await w.user(id),b),invite=()=>action('1',{action:'invite',requestId:crypto.randomUUID(),target:'2',stake:100,roomId:'1',itemId:1}),total=async()=> (await w.user('1')).credits+(await w.user('2')).credits;
 let m=(await invite()).match;assert.equal(await total(),2000);
 assert(alarm<=m.deadline);
 await assert.rejects(()=>action('1',{action:'accept',id:m.id,revision:0}),/pendiente/);
 await assert.rejects(()=>guardConnect4Tables(w,'1',{items:[]}),/Terminá/);
 const replay=await action('1',{action:'invite',requestId:m.id,target:'2',stake:100,roomId:'1',itemId:1});assert.equal(replay.match.id,m.id);
 m=(await action('2',{action:'accept',id:m.id,revision:0})).match;assert.equal(await total(),1800);
 const wrong=m.users[1-m.turn];await assert.rejects(()=>action(wrong,{action:'move',id:m.id,revision:m.revision,column:0}),/turno/);
 sockets.set(m.users[m.turn],[]);await assert.rejects(()=>action(m.users[m.turn],{action:'move',id:m.id,revision:m.revision,column:0}),/Entrá/);
 sockets.set(m.users[m.turn],[{deserializeAttachment:()=>({roomId:'1'})}]);
 // Timeout settles even with both clients disconnected, exactly once.
 sockets.clear();await expireConnect4(w,m.deadline+1);const ended=(await action('1',{action:'sync'})).match;assert.equal(ended.status,'won');assert.equal(await total(),2000);assert.equal((await w.user(m.users[ended.winner])).credits,1100);
 await expireConnect4(w,m.deadline+1000);assert.equal(await total(),2000);
 assert.equal((await storage.list({prefix:'connect4-deadline:'})).size,0);
 await guardConnect4Tables(w,'1',{items:[]});
 // Force a final draw position to exercise refunds and transaction rollback.
 for(const id of ['1','2'])sockets.set(id,[{deserializeAttachment:()=>({roomId:'1'})}]);await storage.delete('connect4-rate:1');
 m=(await invite()).match;m=(await action('2',{action:'accept',id:m.id,revision:0})).match;
 m.board=drawBoard;m.turn=0;await storage.put('connect4:'+m.id,m);const before=await total(),revision=m.revision;
 failTx=true;await assert.rejects(()=>action('1',{action:'move',id:m.id,revision,column:0}),/transaction failure/);failTx=false;
 assert.equal(await total(),before);assert.equal((await storage.get('connect4:'+m.id)).board[0],0);
 m=(await action('1',{action:'move',id:m.id,revision,column:0})).match;assert.equal(m.status,'draw');assert.equal(await total(),before+200);
 await action('1',{action:'move',id:m.id,revision,column:0});assert.equal(await total(),before+200);
 // Pending invitations neither escrow funds nor outlive their deadline.
 await storage.delete('connect4-rate:1');m=(await invite()).match;const money=await total();await expireConnect4(w,m.deadline+1);assert.equal(await total(),money);assert.equal((await action('2',{action:'sync'})).match.status,'cancelled');
 // Exact escrow return must survive unrelated earnings near the wallet cap.
 await storage.delete('connect4-rate:1');m=(await invite()).match;m=(await action('2',{action:'accept',id:m.id,revision:0})).match;
 const rich=await w.user('1');rich.credits=2000000000;await storage.put('user:1',rich);
 m=(await action('2',{action:'resign',id:m.id,revision:m.revision})).match;assert.equal((await w.user('1')).credits,2000000200);assert.equal(m.winner,0);
 await storage.delete('connect4-rate:1');
 m=(await invite()).match;const cash=await total(),other=await w.user('2');other.credits=0;await storage.put('user:2',other);
 const spent=await total();await assert.rejects(()=>action('2',{action:'accept',id:m.id,revision:0}),/créditos suficientes/);
 assert.equal(await total(),spent);assert.equal((await action('1',{action:'sync'})).match.status,'cancelled');
 assert(spent<cash);
 console.log('PASS Connect Four: gravity, all win axes, draw, escrow, replay, membership, presence, timeout/refunds, table lock, atomic rollback and balance-cap safety.');
})().catch(e=>{console.error(e);process.exitCode=1;});
