const fail=(text,status=400)=>{throw Object.assign(Error(text),{status});};
export function profileText(value,max=24){if(typeof value!=='string')fail('Nombre inválido.');const text=value.normalize('NFC').replace(/[\p{Cc}\p{Cf}]/gu,'').replace(/\s+/gu,' ').trim();if([...text].length>max)fail('El nombre es demasiado largo.');return text;}
function fields(input){const name=profileText(input.name,16);if(!name)fail('Elegí un nombre para el grupo.');if(typeof input.color!=='string'||!/^#[a-f\d]{6}$/i.test(input.color))fail('Color inválido.');return {name,color:input.color.toLowerCase()};}
export function groupBadge(group){return group?{id:group.id,name:group.name,color:group.color}:null;}
export async function userGroup(world,user){const g=user.groupId&&await world.ctx.storage.get('group:'+user.groupId);return g?.members.includes(user.id)?g:null;}
export async function groupState(world,user){
 const g=await userGroup(world,user),rows=await world.ctx.storage.list({prefix:'group-invite:'+user.id+':',limit:50}),invitations=[];
 for(const [key,invite] of rows){const group=await world.ctx.storage.get('group:'+invite.groupId);if(!group||invite.expiresAt<Date.now()){await world.ctx.storage.delete(key);continue;}invitations.push({...groupBadge(group),from:invite.from});}
 const members=g?await Promise.all(g.members.map(async id=>({id,name:(await world.user(id)).name}))):[];
 return {group:g?{...groupBadge(g),ownerId:g.ownerId,members}:null,invitations};
}
export async function refreshProfiles(world,ids){
 const rooms=new Set();for(const id of new Set(ids)){const user=await world.user(id),group=groupBadge(await userGroup(world,user));for(const ws of world.ownSockets(id)){const a=ws.deserializeAttachment();a.group=group;a.petName=user.petName||'';ws.serializeAttachment(a);if(a.roomId)rooms.add(a.roomId);}await world.notifyUser(id);}
 for(const room of rooms)world.broadcast(room,{type:'presence',players:world.players(room)});
}
export async function handleGroup(world,user,input){
 const s=world.ctx.storage,g=await userGroup(world,user),action=input?.action;
 if(action==='create'){
  if(g)fail('Ya pertenecés a un grupo.');if(Date.now()-(user.groupCreatedAt||0)<60000)fail('Esperá un minuto antes de crear otro grupo.');
  const group={id:crypto.randomUUID(),ownerId:user.id,members:[user.id],...fields(input)};user.groupId=group.id;user.groupCreatedAt=Date.now();await s.put({['group:'+group.id]:group,['user:'+user.id]:user});await refreshProfiles(world,[user.id]);
 }else if(action==='accept'||action==='decline'){
  if(typeof input.id!=='string'||!/^[a-f\d-]{36}$/.test(input.id))fail('Invitación inválida.');
  const key='group-invite:'+user.id+':'+input.id,invite=await s.get(key),target=await s.get('group:'+input.id);
  if(!invite||invite.expiresAt<Date.now()||!target)fail('La invitación ya no está disponible.');
  if(action==='accept'){if(g)fail('Salí de tu grupo antes de aceptar.');if(target.members.length>=50)fail('El grupo está lleno.');user.groupId=target.id;target.members.push(user.id);await s.put({['user:'+user.id]:user,['group:'+target.id]:target});}
  await s.delete(key);await refreshProfiles(world,action==='accept'?target.members:[user.id]);
 }else{
  if(!g)fail('No pertenecés a un grupo.');
  const owner=g.ownerId===user.id;
  if(['update','invite','remove','disband'].includes(action)&&!owner)fail('Solo el creador puede administrar el grupo.',403);
  if(action==='update'){Object.assign(g,fields(input));await s.put('group:'+g.id,g);await refreshProfiles(world,g.members);}
  else if(action==='invite'){
   const id=String(input.target||'');if(!/^\d+$/.test(id)||g.members.includes(id))fail('Elegí otro jugador.');
   const target=await s.get('user:'+id);if(!target)fail('Ese jugador no está disponible.');if(await userGroup(world,target))fail('Ese jugador ya tiene grupo.');
   if(g.members.length>=50)fail('El grupo está lleno.');const pending=await s.list({prefix:'group-invite:'+id+':',limit:20});if(pending.size>=20)fail('Ese jugador tiene demasiadas invitaciones.');
   await s.put('group-invite:'+id+':'+g.id,{groupId:g.id,from:user.name,expiresAt:Date.now()+7*86400000});await world.notifyUser(id);
  }else if(action==='leave'||action==='remove'){
   const id=action==='leave'?user.id:String(input.target||'');if(id===g.ownerId)fail('El creador debe disolver el grupo.');if(!g.members.includes(id))fail('Ese jugador no pertenece al grupo.');
   const target=await world.user(id);delete target.groupId;g.members=g.members.filter(n=>n!==id);await s.put({['user:'+id]:target,['group:'+g.id]:g});await refreshProfiles(world,[id,...g.members]);
  }else if(action==='disband'){
   await s.transaction(async tx=>{for(const id of g.members){const u=await tx.get('user:'+id);if(u?.groupId===g.id){delete u.groupId;await tx.put('user:'+id,u);}}await tx.delete('group:'+g.id);});await refreshProfiles(world,g.members);
  }else fail('Acción de grupo inválida.');
 }
 return groupState(world,await world.user(user.id));
}
