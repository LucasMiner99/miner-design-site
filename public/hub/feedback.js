/* Private player feedback; author identity is assigned by the server. */
(()=>{'use strict';
 const $=id=>document.getElementById(id),labels={comment:'Comentario',bug:'Bug',idea:'Idea'};
 let submissionId=null,busy=false,loading=false,cursor=null;
 async function api(path,method='GET',value){
  const r=await fetch('/api/hub/'+path,{method,credentials:'same-origin',headers:value?{'Content-Type':'application/json'}:{},body:value?JSON.stringify(value):undefined});
  const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.error||'No pudimos completar la acción. Intentá otra vez.');return data;
 }
 $('hubFeedbackOpen').onclick=()=>{if(!submissionId)submissionId=crypto.randomUUID();$('hubFeedbackError').textContent='';$('hubFeedbackDialog').showModal();$('hubFeedbackText').focus();};
 $('hubFeedbackText').oninput=()=>{$('hubFeedbackCount').textContent=$('hubFeedbackText').value.length+'/1500';};
 $('hubFeedbackForm').onsubmit=async e=>{
  e.preventDefault();if(busy)return;const text=$('hubFeedbackText').value.trim();if(!text){$('hubFeedbackError').textContent='Escribí un comentario antes de enviar.';return;}
  busy=true;$('hubFeedbackSend').disabled=true;$('hubFeedbackError').textContent='Enviando…';
  try{await api('feedback','POST',{kind:$('hubFeedbackKind').value,text,submissionId});submissionId=null;$('hubFeedbackText').value='';$('hubFeedbackCount').textContent='0/1500';$('hubFeedbackKind').value='comment';$('hubFeedbackDialog').close();$('hubFeedbackNotice').textContent='Comentario enviado. ¡Gracias!';}
  catch(e){$('hubFeedbackError').textContent=e.message;}
  finally{busy=false;$('hubFeedbackSend').disabled=false;}
 };
 function render(entry){
  const article=document.createElement('article');article.className='hub-feedback-entry';article.classList.toggle('unread',!entry.readAt);
  const header=document.createElement('header'),author=document.createElement('strong'),kind=document.createElement('span'),date=document.createElement('time'),text=document.createElement('p'),read=document.createElement('button');
  author.textContent=entry.username;author.title='ID de Kick: '+entry.userId;kind.textContent=labels[entry.kind]||'Comentario';date.dateTime=new Date(entry.createdAt).toISOString();date.textContent=new Date(entry.createdAt).toLocaleString('es-AR',{dateStyle:'short',timeStyle:'short'});text.textContent=entry.text;read.type='button';
  const update=()=>{article.classList.toggle('unread',!entry.readAt);read.textContent=entry.readAt?'Marcar como no leído':'Marcar como leído';read.setAttribute('aria-label',read.textContent+' · '+entry.username);};update();
  read.onclick=async()=>{read.disabled=true;try{const data=await api('admin/feedback','PUT',{id:entry.id,read:!entry.readAt});entry=data.entry;update();}catch(e){$('hubFeedbackInboxStatus').textContent=e.message;}finally{read.disabled=false;}};
  header.append(author,kind,date);article.append(header,text,read);return article;
 }
 async function load(reset){
  if(loading)return;loading=true;$('hubFeedbackRefresh').disabled=true;$('hubFeedbackMore').disabled=true;$('hubFeedbackInboxStatus').textContent='Cargando…';
  try{const data=await api('admin/feedback'+(!reset&&cursor?'?before='+encodeURIComponent(cursor):''));if(reset)$('hubFeedbackList').replaceChildren();for(const entry of data.entries)$('hubFeedbackList').append(render(entry));cursor=data.nextCursor;$('hubFeedbackMore').hidden=!cursor;$('hubFeedbackInboxStatus').textContent=$('hubFeedbackList').children.length?'':'Todavía no hay comentarios.';}
  catch(e){$('hubFeedbackInboxStatus').textContent=e.message;}
  finally{loading=false;$('hubFeedbackRefresh').disabled=false;$('hubFeedbackMore').disabled=false;}
 }
 $('hubFeedbackInbox').onclick=()=>{$('hubFeedbackInboxDialog').showModal();load(true);};
 $('hubFeedbackRefresh').onclick=()=>load(true);$('hubFeedbackMore').onclick=()=>load(false);
})();
