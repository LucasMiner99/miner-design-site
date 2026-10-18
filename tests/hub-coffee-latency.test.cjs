const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
(async()=>{
 const {coffeeAction}=await import('../src/hub-coffee.mjs');
 // Different upload/download delays, backend work and unrelated clock epochs.
 for(const [up,down,work,keyboard,jitter] of [[0,0,0,false,0],[80,80,30,false,0],[200,200,100,false,0],[500,500,150,false,0],[300,40,120,false,0],[40,350,180,true,0],[200,200,80,false,80],[200,200,80,false,-80]]){
  let t=20,frameId=0,held=null,serveCalls=0;const epoch=Date.UTC(2026,9,18,15),frames=new Map(),elements=new Map();
  const create=()=>({style:{},dataset:{},children:[],listeners:{},textContent:'',hidden:false,disabled:false,open:false,setAttribute(){},append(...c){this.children.push(...c);},replaceChildren(...c){this.children=c;},addEventListener(k,fn){this.listeners[k]=fn;},getContext(){return {clearRect(){}};},showModal(){this.open=true;},close(){this.open=false;this.listeners.close?.();}});
  const $=id=>{if(!elements.has(id))elements.set(id,create());return elements.get(id);},clone=v=>v===undefined?v:structuredClone(v),records=new Map([['room:1',{scene:{items:[{id:7,type:77}]}}]]);
  const storage={get:async k=>clone(records.get(k)),put:async(k,v)=>{if(typeof k==='string')records.set(k,clone(v));else for(const[a,b]of Object.entries(k))records.set(a,clone(b));},transaction:async fn=>fn(storage)};
  const user={id:'2',credits:0},world={ctx:{storage},ownSockets:()=>[{deserializeAttachment:()=>({roomId:'1'})}],async notifyUser(){}};
  const context={document:{getElementById:$,createElement:create},performance:{now:()=>t},crypto,requestAnimationFrame:fn=>{frames.set(++frameId,fn);return frameId;},cancelAnimationFrame:id=>frames.delete(id),MINER_HUB_ONLINE:{room:{id:'1'},preview(){},async coffee(action,input){
   const sent=t,result=await coffeeAction(world,user,action,input,epoch+sent+up+(action==='serve'?jitter:0));
   if(action==='serve'){serveCalls++;await new Promise(resolve=>held=resolve);}else t+=up+work+down;
   return result;
  }}};context.window=context;vm.createContext(context);vm.runInContext(fs.readFileSync(__dirname+'/../public/hub/coffee.js','utf8'),context);
  const tick=()=>{for(const[id,fn]of [...frames]){frames.delete(id);fn();}};
  await context.HubCoffee.open({id:7,type:77});await $('hubCoffeeStart').onclick();
  const ids=['coffee','milk','ice','sugar','cocoa'],session=records.get('coffee-session:2'),required=session.recipes[0]==='sweet'?['coffee','sugar']:['coffee'];
  for(const id of required)$('hubCoffeeIngredients').children[ids.indexOf(id)].onclick();await $('hubCoffeeServe').onclick();
  const p=records.get('coffee-session:2').pour,center=p.target+p.width/2;
  t=p.start+p.duration*center-epoch-up;tick();
  assert(Math.abs(parseFloat($('hubCoffeeNeedle').style.left)-center*100)<.01,`Visible center must predict server arrival (up ${up}, down ${down}, processing ${work})`);
  let waiting;if(keyboard)waiting=$('hubCoffeeServe').onclick({detail:0});else $('hubCoffeeServe').listeners.pointerdown({button:0,preventDefault(){}});
  const stopped=$('hubCoffeeNeedle').style.left;assert.equal($('hubCoffeeServe').textContent,'Sirviendo…');
  await new Promise(setImmediate);assert.equal(serveCalls,1);assert.equal(user.credits,12,'A press in the displayed zone earns the actual server precision award');
  t+=up+work+down+100;tick();assert.equal($('hubCoffeeNeedle').style.left,stopped,'Needle stays frozen while waiting for confirmation');
  held();if(waiting)await waiting;await new Promise(setImmediate);
  if(!keyboard)await $('hubCoffeeServe').onclick({detail:1});assert.equal(serveCalls,1,'Pointer release cannot submit a second command');
  assert.equal($('hubCoffeeRecipe').textContent,'Café con leche');assert.match($('hubCoffeeStatus').textContent,/perfecto/);context.HubCoffee.close();assert.equal(frames.size,0);
 }
 console.log('PASS coffee latency: actual server awards at visual center, 0–1000ms round trips, asymmetric routes, server work, +/-80ms jitter, immediate press/frozen cursor, release dedupe and keyboard.');
})().catch(e=>{console.error(e);process.exitCode=1;});
