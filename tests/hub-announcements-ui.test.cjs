const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
(async()=>{
 const nodes=new Map(),node=id=>{if(!nodes.has(id))nodes.set(id,{hidden:true,value:'',textContent:'',disabled:false,showModal(){this.open=true;},close(){this.open=false;},focus(){}});return nodes.get(id);};
 let saved=[],record={text:'Hola',revision:1},admin=true;
 const window={MINER_HUB_ONLINE:{get user(){return {admin};},async announcement(value){if(value){saved.push(value);record={text:value.text,revision:record.revision+1};}return record;}}};
 vm.runInNewContext(fs.readFileSync('public/hub/announcements.js','utf8'),{window,document:{getElementById:node}});
 const receive=window.HubAnnouncements.receive;
 receive({text:'<img src=x onerror=alert(1)>',revision:1});assert.equal(node('hubAnnouncementText').textContent,'<img src=x onerror=alert(1)>');assert.equal(node('hubAnnouncementBanner').hidden,false);
 receive({text:'',revision:2});assert.equal(node('hubAnnouncementBanner').hidden,true);
 receive({text:'stale',revision:1});assert.equal(node('hubAnnouncementBanner').hidden,true,'Old HTTP snapshots cannot restore removed banners');
 record={text:'Nueva',revision:3};await node('hubAnnouncement').onclick();assert.equal(node('hubAnnouncementInput').value,'Nueva');
 node('hubAnnouncementInput').value='Editada';node('hubAnnouncementForm').onsubmit({preventDefault(){}});await new Promise(setImmediate);assert.equal(saved[0].revision,3);assert.equal(node('hubAnnouncementText').textContent,'Editada');assert.equal(node('hubAnnouncementDialog').open,false);
 await node('hubAnnouncement').onclick();node('hubAnnouncementRemove').onclick();await new Promise(setImmediate);assert.equal(saved[1].text,'');assert.equal(node('hubAnnouncementBanner').hidden,true);
 admin=false;await node('hubAnnouncement').onclick();assert.equal(node('hubAnnouncementDialog').open,false);
 console.log('PASS announcements UI: safe plain text, stale update rejection, editor loading, publish/remove and admin visibility guard.');
})().catch(e=>{console.error(e);process.exitCode=1;});
