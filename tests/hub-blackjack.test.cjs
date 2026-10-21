const assert=require('node:assert/strict');
(async()=>{
 const {handValue}=await import('../public/hub/blackjack-rules.mjs'),{newHand,playHand,publicHand,shuffleShoe,blackjack}=await import('../src/hub-blackjack.mjs'),{C,CATALOG,R}=await import('../src/hub-rules.mjs');
 assert.equal(handValue([0,13,9]).total,12);assert.equal(handValue([0,5]).soft,true);assert.equal(handValue([0,5,9]).soft,false);assert(handValue([0,9]).blackjack);assert(!handValue([0,4,4]).blackjack);
 const make=(cards,amount=10)=>newHand('hand',amount,[...cards,...Array(30).fill(9)]);
 assert.equal(make([0,9,12,6]).payout,25);assert.equal(make([0,9,12,6],1).payout,2);assert.equal(make([0,13,9,22]).outcome,'push');assert.equal(make([8,13,7,22]).outcome,'dealer-blackjack');
 const soft17=make([9,0,8,5]);const stand=playHand(soft17,'stand');assert.equal(stand.dealer.length,2);assert.equal(stand.outcome,'win');assert.equal(stand.payout,20);
 const bust=playHand(make([9,8,5,7,9]),'hit');assert.equal(bust.outcome,'bust');assert.equal(bust.payout,0);assert.equal(bust.dealer.length,2);
 const hit=playHand(make([1,8,2,7,3]),'hit');assert.equal(hit.status,'playing');assert.equal(hit.player.length,3);assert.throws(()=>playHand(hit,'double'));
 const double=playHand(make([4,9,5,6,9]),'double');assert.equal(double.stake,20);assert.equal(double.player.length,3);assert.equal(double.outcome,'win');assert.equal(double.payout,40,'Three-card 21 is not a natural');
 const dealerBust=playHand(make([9,9,8,5,9]),'stand');assert.equal(dealerBust.outcome,'win');assert(handValue(dealerBust.dealer).bust);
 const push=playHand(make([9,9,7,7]),'stand');assert.equal(push.outcome,'push');assert.equal(push.payout,10);
 const copy=JSON.stringify(soft17);playHand(soft17,'hit');assert.equal(JSON.stringify(soft17),copy,'Playing never mutates stored data before commit');
 const safe=publicHand(soft17,{credits:100});assert.deepEqual(safe.dealer,[0,null]);for(const field of ['deck','cursor','actions','at'])assert(!Object.hasOwn(safe,field));assert(!publicHand(soft17,{credits:0}).canDouble);
 const shoe=shuffleShoe();assert.equal(shoe.length,312);for(let c=0;c<52;c++)assert.equal(shoe.filter(n=>n===c).length,6);
 let first=true,calls=0;shuffleShoe(a=>{calls++;a[0]=first?4294967295:0;first=false;});assert.equal(calls,312,'Reject modulo bias');
 assert.equal(C.TYPES[118].interaction,'blackjack');assert.equal(CATALOG.find(i=>i.id==='object:118').name,'Mesa de Blackjack');assert(R.poolFor(CATALOG,'object').some(i=>i.id==='object:118'));
 // Exercise the actual wallet/action code with a deterministic persisted hand.
 const id='11111111-1111-4111-8111-111111111111',req='22222222-2222-4222-8222-222222222222';
 const data=new Map(),user={id:'2',credits:0},storage={async get(k){return structuredClone(data.get(k));},async put(rows){for(const [k,v]of Object.entries(rows))data.set(k,structuredClone(v));},async transaction(fn){return fn(this);}};
 const world={ctx:{storage},ownSockets:()=>[{deserializeAttachment:()=>({roomId:'1'})}],notifyUser:async()=>{}};
 const h={...make([4,9,5,6,9]),id};data.set('blackjack:2:'+id,h);data.set('blackjack-last:2',id);data.set('room:1',{scene:{items:[{id:5,type:118}]}});
 const input={roomId:'1',itemId:5,handId:id,revision:0,requestId:req,action:'double'};
 await assert.rejects(blackjack(world,user,'play',input),/suficientes/);assert.equal(data.get('blackjack:2:'+id).revision,0);user.credits=10;
 const paid=await blackjack(world,user,'play',input);assert.equal(paid.game.payout,40);assert.equal(user.credits,40);assert.equal(user.walletVersion,1);
 await blackjack(world,user,'play',input);assert.equal(user.credits,40);assert.equal(user.walletVersion,1,'Duplicate double pays only once');
 await assert.rejects(blackjack(world,user,'play',{...input,action:'hit'}),/otra jugada/);
 console.log('PASS blackjack rules/wallet: soft aces, naturals, 3:2 rounding, push, bust, S17, double, 21, hidden dealer/shoe, unbiased six decks, inventory pool, insufficient balance and duplicate actions.');
})().catch(e=>{console.error(e);process.exitCode=1;});
