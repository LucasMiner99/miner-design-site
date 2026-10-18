const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
(async()=>{
 const {djAction,DJ_LEVELS,DEFAULT_DJ,saveDJConfig,djScore}=await import('../src/hub-dj.mjs');
 const clone=v=>v===undefined?v:structuredClone(v),records=new Map([['room:1',{scene:{items:[{id:7,type:72}]}}],['room:2',{scene:{items:[{id:8,type:72}]}}]]);
 const storage={get:async k=>clone(records.get(k)),put:async(k,v)=>{if(typeof k==='string')records.set(k,clone(v));else for(const[a,b]of Object.entries(k))records.set(a,clone(b));},transaction:async fn=>fn(storage)};
 let roomId='1',now=Date.UTC(2026,9,18,12);const user={id:'3',credits:0},world={ctx:{storage},ownSockets:()=>roomId?[{deserializeAttachment:()=>({roomId})}]:[],async notifyUser(){}};
 const act=(action,input={})=>djAction(world,user,action,{roomId:'1',itemId:7,...input},now);
 assert(DJ_LEVELS.every((r,i)=>!i||r.bpm>DJ_LEVELS[i-1].bpm&&r.window<DJ_LEVELS[i-1].window));
 for(const bad of [{...DEFAULT_DJ,dailyLimit:-1},{...DEFAULT_DJ,rewards:[1,2]},{...DEFAULT_DJ,rewards:[1,2,1.2]}])await assert.rejects(saveDJConfig(storage,bad));
 roomId=null;await assert.rejects(act('open'),/Entrá/);roomId='1';await assert.rejects(act('open',{itemId:8}),/colocada/);
 let s=await act('start',{requestId:crypto.randomUUID()}),id=s.session.id;roomId='2';await assert.rejects(act('start',{roomId:'2',itemId:8,requestId:crypto.randomUUID()}),/otra mesa/);roomId='1';
 for(let level=0;level<3;level++){
  if(level)s=await act('start',{requestId:crypto.randomUUID()});const r=s.session.round,input={sessionId:id,level};assert.equal(r.level,level);assert.equal(r.count,DJ_LEVELS[level].count);assert(!('presses'in r));
  await assert.rejects(act('finish',input),/termine/);await assert.rejects(act('hit',{...input,seq:100,lane:0}));await assert.rejects(act('hit',{...input,seq:1,lane:10}));
  for(let i=0;i<r.notes.length;i++){const n=r.notes[i];now=n.at;s=await act('hit',{...input,seq:i+1,lane:n.lane,amount:99999,perfect:true,at:0});assert.equal(s.receipt.hit,true);const repeat=await act('hit',{...input,seq:i+1,lane:n.lane});assert.equal(repeat.session.hits,i+1);assert.equal(repeat.session.round.lastSeq,i+1);await assert.rejects(act('hit',{...input,seq:i+1,lane:(n.lane+1)%4}),/registró/);}
  now=r.end+1;const before=user.credits;if(level===1){const tx=storage.transaction;storage.transaction=async()=>{throw Error('disk');};await assert.rejects(act('finish',input),/disk/);assert.equal(user.credits,before);assert(!records.get('dj-session:3').round.finished);storage.transaction=tx;}
  s=await act('finish',input);assert.equal(s.receipt.amount,[20,30,50][level]);assert.equal(s.receipt.accuracy,100);await act('finish',input);assert.equal(user.credits,before+[20,30,50][level]);
 }
 assert(s.session.done);assert.equal(user.credits,100);
 await saveDJConfig(storage,{dailyLimit:105,rewards:[20,30,50]});s=await act('start',{requestId:crypto.randomUUID()});let r=s.session.round,input={sessionId:s.session.id,level:0};
 for(let i=0;i<r.count;i++){now=r.notes[i].at;await act('hit',{...input,seq:i+1,lane:r.notes[i].lane});}now=r.end+1;s=await act('finish',input);assert.equal(s.receipt.amount,5);assert.equal(user.credits,105);
 s=await act('start',{requestId:crypto.randomUUID()});r=s.session.round;input={sessionId:s.session.id,level:1};now=r.start;for(let i=1;i<=16;i++)await act('hit',{...input,seq:i,lane:i%4});now=r.end+1;s=await act('finish',input);assert.equal(s.receipt.amount,0);assert.equal(s.receipt.passed,false,'Pad spam loses accuracy');assert.equal(djScore({hits:{0:true},faults:5,count:8}).accuracy,0);
 now+=301000;await assert.rejects(act('hit',{...input,seq:17,lane:0}),/terminó/);assert.equal((await act('open')).session,null);
 const source=fs.readFileSync(__dirname+'/../public/hub/game.js','utf8'),part=source.slice(source.indexOf('function canInteract'),source.indexOf('function updateInteraction'));let owner=false;const scope={C:{TYPES:{90:{plantation:true,interaction:'plant'},72:{interaction:'dj'}}},online:{canEdit:()=>owner},window:{HubMedia:{supports:()=>false}}};vm.createContext(scope);vm.runInContext(part,scope);assert.equal(scope.canInteract({type:90}),false);assert.equal(scope.interactionLabel({type:90}),'');owner=true;assert.equal(scope.interactionLabel({type:90}),'Cosechar');assert(scope.canInteract({type:72}));
 console.log('PASS DJ: progressive charts, machine/presence, session/sequence isolation, spam penalty, server timing, atomic failure and idempotent rewards, cap, expiry; plant visitor cursor/tooltip hidden.');
})().catch(e=>{console.error(e);process.exitCode=1;});
