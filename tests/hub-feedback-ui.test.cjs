const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
function element(){
 const e={children:[],value:'',disabled:false,hidden:false,open:false,attrs:{},classes:new Set(),textContent:''};
 e.classList={toggle(name,on){on?e.classes.add(name):e.classes.delete(name);}};
 e.append=(...items)=>e.children.push(...items);e.replaceChildren=(...items)=>e.children=[...items];
 e.showModal=()=>e.open=true;e.close=()=>e.open=false;e.focus=()=>{};e.setAttribute=(k,v)=>e.attrs[k]=v;
 Object.defineProperty(e,'innerHTML',{set(){throw Error('Feedback must render as text, never HTML');}});return e;
}
(async()=>{
 const ids=new Map(),get=id=>{if(!ids.has(id))ids.set(id,element());return ids.get(id);},requests=[];
 let response=()=>Response.json({ok:true});
 const context=vm.createContext({document:{getElementById:get,createElement:element},crypto,Date,encodeURIComponent,fetch:async(url,options)=>{requests.push({url,...options});return response(url,options);}});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../public/hub/feedback.js'),'utf8'),context);
 get('hubFeedbackOpen').onclick();assert(get('hubFeedbackDialog').open);
 get('hubFeedbackText').value='   ';await get('hubFeedbackForm').onsubmit({preventDefault(){}});assert.equal(requests.length,0);
 get('hubFeedbackKind').value='bug';get('hubFeedbackText').value='La puerta no abre';get('hubFeedbackText').oninput();assert.equal(get('hubFeedbackCount').textContent,'17/1500');
 response=()=>Response.json({error:'Sin conexión'},{status:503});await get('hubFeedbackForm').onsubmit({preventDefault(){}});
 const originalId=JSON.parse(requests.at(-1).body).submissionId;assert.equal(get('hubFeedbackText').value,'La puerta no abre');assert.equal(get('hubFeedbackError').textContent,'Sin conexión');assert.equal(get('hubFeedbackSend').disabled,false);
 response=()=>Response.json({ok:true});await get('hubFeedbackForm').onsubmit({preventDefault(){}});assert.equal(JSON.parse(requests.at(-1).body).submissionId,originalId);assert.equal(get('hubFeedbackDialog').open,false);assert.equal(get('hubFeedbackText').value,'');assert.match(get('hubFeedbackNotice').textContent,/enviado/);
 const entry={id:'feedback:1234567890123:00000000-0000-0000-0000-000000000000',userId:'2',username:'<img src=x>',kind:'bug',text:'<script>alert(1)</script>',createdAt:Date.now(),readAt:null};
 response=()=>Response.json({entries:[entry],nextCursor:entry.id});get('hubFeedbackInbox').onclick();await new Promise(setImmediate);
 const article=get('hubFeedbackList').children[0];assert(article.classes.has('unread'));assert.equal(article.children[0].children[0].textContent,entry.username);assert.equal(article.children[1].textContent,entry.text);assert.equal(get('hubFeedbackMore').hidden,false);
 response=()=>Response.json({entry:{...entry,readAt:Date.now()}});await article.children[2].onclick();assert.equal(article.classes.has('unread'),false);assert.equal(JSON.parse(requests.at(-1).body).read,true);
 response=()=>Response.json({entries:[],nextCursor:null});get('hubFeedbackMore').onclick();await new Promise(setImmediate);assert(requests.at(-1).url.includes('before='+encodeURIComponent(entry.id)));assert.equal(get('hubFeedbackMore').hidden,true);assert.equal(get('hubFeedbackList').children.length,1);
 response=()=>Response.json({entries:[],nextCursor:null});get('hubFeedbackRefresh').onclick();await new Promise(setImmediate);assert.equal(get('hubFeedbackList').children.length,0);assert.match(get('hubFeedbackInboxStatus').textContent,/Todavía/);
 console.log('PASS: feedback UI preserves drafts and retry IDs, sends comments, renders untrusted text safely, marks read and paginates.');
})().catch(e=>{console.error(e);process.exitCode=1;});
