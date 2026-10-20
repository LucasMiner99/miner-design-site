const key='global-announcement';
export async function announcement(world){return await world.ctx.storage.get(key)||{text:'',revision:0};}
export async function editAnnouncement(world,auth,input){
 const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
 if(!auth.admin)fail('Solo el administrador puede publicar anuncios.',403);
 if(!input||typeof input.text!=='string'||input.text.length>280||/[\p{Cc}\p{Cf}]/u.test(input.text))fail('Escribí un mensaje de hasta 280 caracteres, en una sola línea.');
 const current=await announcement(world);
 if(input.revision!==current.revision)fail('El anuncio cambió en otra pestaña. Cerrá y volvé a abrir este panel.',409);
 const next={text:input.text.trim(),revision:current.revision+1};
 await world.ctx.storage.put(key,next);
 for(const ws of world.sockets())world.send(ws,{type:'announcement',announcement:next});
 return next;
}
