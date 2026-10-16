(function(root){
 'use strict';
 const KEY='minerhub.rewards.demo.v1';
 const slots=['hair','face','top','bottom','shoes','accessory','back','pet'];
 function catalog(C,P,environment=[]){return [
  ...C.TYPES.map((t,type)=>({id:'object:'+type,kind:'object',type,name:t.name})),
  ...slots.flatMap(slot=>P.choices[slot].map((name,index)=>({id:'look:'+slot+':'+index,kind:'character',slot,index,name,starter:index===0||slot==='hair'&&index===1})).filter(i=>!(['accessory','back','pet'].includes(slot)&&i.index===0))),
  ...environment.flatMap(({key,label,options})=>options.map((option,index)=>({id:'environment:'+key+':'+index,kind:'environment',slot:key,index,value:option.id??index,name:label+' · '+option.name,starter:index===0})))
 ];}
 function randomIndex(length,random=Math.random){const r=random();if(!Number.isFinite(r)||r<0||r>=1)throw new Error('Sorteo inválido.');return Math.floor(r*length);}
 function secureRandom(){if(root.crypto?.getRandomValues){const n=new Uint32Array(1);root.crypto.getRandomValues(n);return n[0]/4294967296;}return Math.random();}
 // Pending prizes also count as collected, so saving boxes cannot reroll the
 // same first item. When both groups exist, a new item has a 95% chance.
 function draw(pool,collected,random=secureRandom){
  if(!pool.length)throw new Error('Caja desconocida.');
  const fresh=pool.filter(i=>!collected.has(i.id)),repeat=pool.filter(i=>collected.has(i.id));
  const candidates=fresh.length&&repeat.length?(randomIndex(100,random)<95?fresh:repeat):fresh.length?fresh:repeat;
  return candidates[randomIndex(candidates.length,random)];
 }
 function create({catalog,storage,random=secureRandom}){
  const byId=new Map(catalog.map(i=>[i.id,i]));let data={version:1,receipts:[]};
  const saved=storage.getItem(KEY);
  function valid(r){return r&&typeof r.id==='string'&&r.id.length>0&&r.id.length<=150&&typeof r.userId==='string'&&r.userId.length>0&&r.userId.length<=100&&['object','character','environment'].includes(r.kind)&&byId.get(r.itemId)?.kind===r.kind&&typeof r.opened==='boolean';}
  if(saved){const parsed=JSON.parse(saved);if(parsed?.version!==1||!Array.isArray(parsed.receipts)||!parsed.receipts.every(valid)||new Set(parsed.receipts.map(r=>r.id)).size!==parsed.receipts.length)throw new Error('No se pudo leer el inventario de prueba. Se conservó el guardado original.');data=parsed;}
  const copy=v=>JSON.parse(JSON.stringify(v));
  function commit(next){storage.setItem(KEY,JSON.stringify(next));data=next;}
  return {
   // Local demo ledger, NOT a trusted Kick webhook endpoint. Production must
   // authenticate the event and perform the random draw/transaction server-side.
   grant({id,userId,kind,status}){
    if(status!=='accepted')return null;
    if(typeof id!=='string'||!id||id.length>150||typeof userId!=='string'||!userId||userId.length>100)throw new Error('Canje inválido.');
    const old=data.receipts.find(r=>r.id===id);if(old){if(old.userId!==userId||old.kind!==kind)throw new Error('El canje ya corresponde a otra entrega.');return copy(old);}
    const pool=catalog.filter(i=>i.kind===kind&&!i.starter);if(!pool.length)throw new Error('Caja desconocida.');
    const collected=new Set(data.receipts.filter(r=>r.userId===userId).map(r=>r.itemId));
    const receipt={id,userId,kind,itemId:draw(pool,collected,random).id,opened:false};
    commit({...data,receipts:[...data.receipts,receipt]});return copy(receipt);
   },
   open(id,userId){const r=data.receipts.find(r=>r.id===id&&r.userId===userId);if(!r)throw new Error('Esta caja no pertenece al jugador.');if(!r.opened)commit({...data,receipts:data.receipts.map(i=>i.id===id?{...i,opened:true}:i)});return copy({...r,opened:true});},
   pending:(userId,kind)=>copy(data.receipts.filter(r=>r.userId===userId&&!r.opened&&(!kind||r.kind===kind))),
   // Starter ownership is deterministic: no duplicate grants on reload/rename.
   owns:(userId,id)=>!!byId.get(id)?.starter||data.receipts.some(r=>r.userId===userId&&r.itemId===id&&r.opened),
   inventory(userId){const counts=new Map(catalog.filter(i=>i.starter).map(i=>[i.id,1]));for(const r of data.receipts)if(r.userId===userId&&r.opened)counts.set(r.itemId,(counts.get(r.itemId)||0)+1);return [...counts].map(([id,count])=>({...byId.get(id),count}));},
   receipts:()=>copy(data.receipts),item:id=>byId.get(id)
  };
 }
 const api={KEY,catalog,create,randomIndex,draw};root.VeredaRewards=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
