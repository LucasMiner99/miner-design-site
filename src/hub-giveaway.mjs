import {profileText} from './hub-groups.mjs';
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
export function giveawayNames(value){
 if(!Array.isArray(value)||value.length>200)fail('Usá entre 2 y 200 nombres.');
 const seen=new Set(),names=[];for(const raw of value){const name=profileText(raw,40),key=name.toLocaleLowerCase();if(name&&!seen.has(key)){seen.add(key);names.push(name);}}
 if(names.length<2)fail('Agregá al menos dos nombres distintos.');return names;
}
export function chooseGiveaway(size,random=()=>crypto.getRandomValues(new Uint32Array(1))[0]){
 const ceiling=Math.floor(0x100000000/size)*size;let n;do{n=random();}while(n>=ceiling);return n%size;
}
export async function giveaway(world,auth,input){
 if(!auth.admin)fail('Solo el administrador puede hacer sorteos.',403);
 if(!input){const players=new Map();for(const ws of world.sockets()){const a=ws.deserializeAttachment();if(a?.roomId)players.set(a.user.id,{id:a.user.id,name:a.user.name});}return {players:[...players.values()].sort((a,b)=>a.name.localeCompare(b.name))};}
 const names=giveawayNames(input.names),id=input.requestId;if(typeof id!=='string'||!/^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(id))fail('Sorteo inválido.');
 const key='giveaways:'+auth.id,history=await world.ctx.storage.get(key)||[],prior=history.find(r=>r.id===id);
 if(prior){if(JSON.stringify(prior.names)!==JSON.stringify(names))fail('Ese sorteo ya tiene otros participantes.',409);return prior;}
 if(history.length&&Date.now()-history[0].at<3000)fail('Esperá a que termine el sorteo.',429);
 const index=chooseGiveaway(names.length),result={id,names,index,winner:names[index],at:Date.now()};
 await world.ctx.storage.put(key,[result,...history].slice(0,30));return result;
}
