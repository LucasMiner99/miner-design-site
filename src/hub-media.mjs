export const MEDIA_TYPES=new Set([13,24,43,48,61,72]);
const fail=message=>{throw Object.assign(Error(message),{status:400});};
export function youtubeId(value){
 try{const u=new URL(value);if(!['https:','http:'].includes(u.protocol)||u.username||u.password)return null;const h=u.hostname.toLowerCase();let id;if(h==='youtu.be')id=u.pathname.slice(1);else if(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com'].includes(h))id=u.pathname==='/watch'?u.searchParams.get('v'):u.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)\/?$/)?.[1];return /^[\w-]{11}$/.test(id||'')?id:null;}catch{return null;}
}
export function mediaSnapshot(media,now=Date.now()){if(!media)return null;let position=media.position+(media.playing?Math.max(0,now-media.updatedAt)/1000:0);if(media.loop&&media.duration>0)position%=media.duration;else position=Math.min(86400,position);return {...media,position,updatedAt:now};}
export async function handleMedia(world,ws,b){
 const a=ws.deserializeAttachment(),room=await world.ctx.storage.get('room:'+a.roomId);if(!room)return;
 if(b.action==='sync'){world.send(ws,{type:'media',roomId:room.id,media:mediaSnapshot(room.media)});return;}
 if(a.user.id!==room.ownerId)fail('Solo el dueño de la sala puede cambiar la música.');
 // Seeks are already coalesced by the client and covered by the socket rate limit.
 if(!['seek','metadata'].includes(b.action)&&Date.now()-(a.lastMedia||0)<500)fail('Esperá un momento.');
 let media=mediaSnapshot(room.media);
 if(b.action==='load'){
  const item=room.scene.items.find(i=>i.id===b.itemId);if(!item||!MEDIA_TYPES.has(item.type))fail('Elegí una compu, radio, tocadiscos, tele, parlante o mesa DJ.');
  const videoId=youtubeId(b.url);if(!videoId)fail('Pegá un enlace válido de un video de YouTube.');
  media={videoId,itemId:item.id,position:0,playing:true,loop:!!room.media?.loop,title:'',duration:0,updatedAt:Date.now(),revision:(room.media?.revision||0)+1};
 }else if(b.action==='stop')media=null;
 else if(b.action==='seek'&&media){
  if(b.videoId!==media.videoId)fail('La música cambió. Probá de nuevo.');
  if(typeof b.position!=='number'||!Number.isFinite(b.position)||b.position<0||b.position>86400)fail('Elegí una posición válida.');
  if(b.seekToken!==undefined&&(typeof b.seekToken!=='string'||!/^[-\w]{1,80}$/.test(b.seekToken)))fail('Solicitud de audio inválida.');
  media.position=b.position;media.seekToken=b.seekToken||null;media.revision++;
 }
 else if(b.action==='metadata'&&media){
  if(b.videoId!==media.videoId)fail('La música cambió.');
  if(typeof b.duration!=='number'||!Number.isFinite(b.duration)||b.duration<=0||b.duration>86400)fail('Duración inválida.');
  media.duration=b.duration;media.title=String(b.title||'').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,160);media.revision++;
 }
 else if(b.action==='loop'&&media){if(typeof b.loop!=='boolean')fail('Repetición inválida.');media.loop=b.loop;media.revision++;}
 else if(['pause','resume'].includes(b.action)&&media){media.playing=b.action==='resume';media.revision++;}
 else fail('No hay un video para controlar.');
 if(!['seek','metadata'].includes(b.action)){a.lastMedia=Date.now();ws.serializeAttachment(a);}room.media=media;await world.ctx.storage.put('room:'+room.id,room);world.broadcast(room.id,{type:'media',roomId:room.id,media});
}
