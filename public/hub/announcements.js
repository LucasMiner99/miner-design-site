(()=>{'use strict';
 const $=id=>document.getElementById(id),dialog=$('hubAnnouncementDialog'),field=$('hubAnnouncementInput');
 let current={text:'',revision:-1},editingRevision=0,busy=false;
 function receive(value){
  if(!value||!Number.isSafeInteger(value.revision)||value.revision<=current.revision||typeof value.text!=='string')return;
  current=value;$('hubAnnouncementText').textContent=value.text;$('hubAnnouncementBanner').hidden=!value.text;
 }
 function controls(){field.disabled=busy;$('hubAnnouncementPublish').disabled=busy||!field.value.trim();$('hubAnnouncementRemove').disabled=busy||!current.text;$('hubAnnouncementCount').textContent=field.value.length+'/280';}
 async function save(text){
  if(busy)return;busy=true;controls();$('hubAnnouncementStatus').textContent='Guardando…';
  try{receive(await window.MINER_HUB_ONLINE.announcement({text,revision:editingRevision}));dialog.close();}
  catch(e){$('hubAnnouncementStatus').textContent=e.message;}
  finally{busy=false;controls();}
 }
 $('hubAnnouncement').onclick=async()=>{
  if(!window.MINER_HUB_ONLINE?.user?.admin)return;
  busy=true;controls();$('hubAnnouncementStatus').textContent='Cargando…';dialog.showModal();
  try{receive(await window.MINER_HUB_ONLINE.announcement());editingRevision=current.revision;field.value=current.text;$('hubAnnouncementStatus').textContent='';}
  catch(e){$('hubAnnouncementStatus').textContent=e.message;dialog.close();return;}
  finally{busy=false;controls();}field.focus();
 };
 field.oninput=controls;
 $('hubAnnouncementForm').onsubmit=e=>{e.preventDefault();if(field.value.trim())save(field.value);};
 $('hubAnnouncementRemove').onclick=()=>save('');
 window.HubAnnouncements={receive};
})();
