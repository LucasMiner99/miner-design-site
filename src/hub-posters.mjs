// Five fixed keys per account. Replacements cannot accumulate stored versions.
export const POSTER_LIMIT=512*1024;
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
export async function posterBytes(request){
 if(request.headers.get('Content-Type')?.split(';')[0]!=='image/jpeg')fail('Subí una imagen JPG, PNG o WebP desde el selector.');
 const reader=request.body?.getReader();if(!reader)fail('Falta la imagen.');let size=0;const chunks=[];
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>POSTER_LIMIT){await reader.cancel();fail('La imagen supera el límite de 512 KB.',413);}chunks.push(value);}
 const bytes=new Uint8Array(size);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length;}return bytes;
}
export function jpegDimensions(b){
 if(b.length<12||b[0]!==255||b[1]!==216||b[b.length-2]!==255||b[b.length-1]!==217)fail('La imagen no es válida.');
 let p=2,dimensions=null;
 while(p<b.length-2){if(b[p++]!==255)fail('La imagen no es válida.');while(b[p]===255)p++;const marker=b[p++];if(marker===218)break;
  const length=(b[p]<<8)|b[p+1];if(length<2||p+length>b.length)fail('La imagen no es válida.');
  if([192,193,194].includes(marker)){if(length<8)fail('La imagen no es válida.');dimensions={width:(b[p+5]<<8)|b[p+6],height:(b[p+3]<<8)|b[p+4]};}
  p+=length;
 }
 if(!dimensions||dimensions.width<1||dimensions.height<1||dimensions.width>1024||dimensions.height>1024)fail('La imagen debe medir hasta 1024 píxeles.');return dimensions;
}
export async function posterList(world,id){return await world.ctx.storage.get('posters:'+id)||Array(5).fill(null);}
export async function handlePosters(request,world,user,admin=false){
 const path=new URL(request.url).pathname;
 if(path==='/posters'&&request.method==='GET')return Response.json({slots:await posterList(world,user.id)});
 const image=path.match(/^\/posters\/image\/(\d{1,30})\/([0-4])$/);
 if(image&&request.method==='GET'){
  const room=await world.ctx.storage.get('room:'+image[1]);if(image[1]!==user.id&&(!room||(!room.public&&!admin)||!room.scene.items.some(i=>[80,81,82].includes(i.type)&&i.posterSlot===Number(image[2]))))fail('Imagen no disponible.',404);
  // Authorize here, then stream R2 from the gateway without holding the room's lock.
  return Response.json({key:'hub-posters/'+image[1]+'/'+image[2]+'.jpg'});
 }
 const upload=path.match(/^\/posters\/([0-4])$/);
 if(upload&&request.method==='PUT'){
  if(!world.env.STREAMBOT_MEDIA)fail('Las imágenes todavía no están disponibles.',503);
  const now=Date.now(),last=await world.ctx.storage.get('poster-upload:'+user.id);if(last&&now-last<1500)fail('Esperá un momento antes de subir otra imagen.',429);
  const bytes=await posterBytes(request),dimensions=jpegDimensions(bytes),slot=Number(upload[1]),slots=await posterList(world,user.id);
  await world.env.STREAMBOT_MEDIA.put('hub-posters/'+user.id+'/'+slot+'.jpg',bytes,{httpMetadata:{contentType:'image/jpeg'}});
  slots[slot]={slot,version:(slots[slot]?.version||0)+1,...dimensions};
  await world.ctx.storage.put({['posters:'+user.id]:slots,['poster-upload:'+user.id]:now});
  world.broadcast(user.id,{type:'posters',roomId:user.id,slots});return Response.json({slots});
 }
 fail('No disponible.',404);
}

export async function posterImage(env,key){const object=await env.STREAMBOT_MEDIA.get(key);if(!object)fail('Imagen no disponible.',404);return new Response(object.body,{headers:{'Content-Type':'image/jpeg','X-Content-Type-Options':'nosniff','Cache-Control':'private, no-cache','ETag':object.httpEtag||''}});}
