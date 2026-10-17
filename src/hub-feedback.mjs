const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
const validId=id=>typeof id==='string'&&/^feedback:\d{13}:[a-f0-9-]{36}$/.test(id);
export async function handleFeedback(request,storage,user,admin,readBody){
 const url=new URL(request.url),path=url.pathname;
 if(path==='/feedback'&&request.method==='POST'){
  const b=await readBody(request),text=typeof b.text==='string'?b.text.trim():'';
  if(!text||text.length>1500)fail('Escribí un comentario de hasta 1500 caracteres.');
  if(!['comment','bug','idea'].includes(b.kind))fail('Elegí el tipo de comentario.');
  if(typeof b.submissionId!=='string'||!/^[-a-f0-9]{36}$/.test(b.submissionId))fail('Volvé a abrir el formulario.');
  const receiptKey='feedback-receipt:'+user.id+':'+b.submissionId,previous=await storage.get(receiptKey);
  if(previous)return json({ok:true,id:previous});
  const now=Date.now();if(user.lastFeedbackAt&&now-user.lastFeedbackAt<60000)fail('Esperá un minuto antes de enviar otro comentario.',429);
  const id='feedback:'+String(now).padStart(13,'0')+':'+crypto.randomUUID();
  const entry={id,userId:user.id,username:user.name,kind:b.kind,text,createdAt:now,readAt:null};
  await storage.put({[id]:entry,[receiptKey]:id,['user:'+user.id]:{...user,lastFeedbackAt:now}});
  return json({ok:true,id},201);
 }
 if(path==='/admin/feedback'){
  if(!admin)fail('Solo el administrador puede leer los comentarios.',403);
  if(request.method==='GET'){
   const before=url.searchParams.get('before');if(before&&!validId(before))fail('Página inválida.');
   const rows=[...(await storage.list({prefix:'feedback:',reverse:true,limit:51,...(before?{end:before}:{})})).values()];
   const entries=rows.slice(0,50);return json({entries,nextCursor:rows.length>50?entries.at(-1).id:null});
  }
  if(request.method==='PUT'){
   const b=await readBody(request);if(!validId(b.id)||typeof b.read!=='boolean')fail('Comentario inválido.');
   const entry=await storage.get(b.id);if(!entry)fail('No encontramos ese comentario.',404);
   entry.readAt=b.read?Date.now():null;await storage.put(b.id,entry);return json({entry});
  }
 }
 return null;
}
