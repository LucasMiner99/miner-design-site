const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
(async()=>{
 let t=0,nextFrame=0,apiCalls=[],pending=null;const frames=new Map(),elements=new Map();
 function element(){return {textContent:'',hidden:false,disabled:false,open:false,style:{},dataset:{},children:[],listeners:{},append(...children){this.children.push(...children);},replaceChildren(...children){this.children=children;},setAttribute(k,v){this[k]=v;},addEventListener(k,v){this.listeners[k]=v;},getContext(){return {clearRect(){}};},showModal(){this.open=true;},close(){this.open=false;this.listeners.close?.();}};}
 const $=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id);};
 const rules={dailyLimit:400,orderReward:10,completionReward:10,perfectReward:2};let session=null;
 const response=()=>structuredClone({serverNow:10000+t,rules,daily:{remaining:400,limit:400,earned:0},session});
 const context={document:{getElementById:$,createElement:element},performance:{now:()=>t},crypto,requestAnimationFrame:fn=>{frames.set(++nextFrame,fn);return nextFrame;},cancelAnimationFrame:id=>frames.delete(id),MINER_HUB_ONLINE:{room:{id:'1'},preview(){},async coffee(action,input){apiCalls.push({action,input:structuredClone(input)});if(pending)return pending;if(action==='start')session={id:'one',roomId:'1',itemId:7,index:0,order:{name:'Café con leche',ingredients:['coffee','milk']},total:0,results:[],expiresAt:310000,rules};if(action==='pour')session.pour={start:16000,duration:1800,target:.4,width:.2};return response();}}};context.window=context;vm.createContext(context);vm.runInContext(fs.readFileSync(__dirname+'/../public/hub/coffee.js','utf8'),context);
 await context.HubCoffee.open({id:7,type:77});assert($('hubCoffeeDialog').open);assert(!$('hubCoffeeWelcome').hidden);
 await $('hubCoffeeStart').onclick();assert(!$('hubCoffeePlay').hidden);assert.equal($('hubCoffeeRecipe').textContent,'Café con leche');
 const buttons=$('hubCoffeeIngredients').children;buttons[0].onclick();buttons[1].onclick();assert.equal($('hubCoffeeCupLabel').textContent,'Café + Leche');$('hubCoffeeEmpty').onclick();assert.equal($('hubCoffeeCupLabel').textContent,'Taza vacía');buttons[0].onclick();buttons[1].onclick();
 let resolve;pending=new Promise(r=>resolve=r);const a=$('hubCoffeeServe').onclick();const b=$('hubCoffeeServe').onclick();assert.equal(apiCalls.filter(c=>c.action==='pour').length,1,'Double-click only sends one request');
 session.pour={start:16000,duration:1800,target:.4,width:.2};resolve(response());await Promise.all([a,b]);pending=null;assert.equal($('hubCoffeeServe').disabled,true);assert.equal($('hubCoffeeEmpty').disabled,true);assert(buttons.every(b=>b.disabled));assert(!$('hubCoffeeTiming').hidden);
 t=7000;for(const [id,fn] of [...frames]){frames.delete(id);fn();}assert.equal($('hubCoffeeServe').disabled,false);assert.equal($('hubCoffeeServe').textContent,'Servir');
 context.HubCoffee.close();assert.equal(frames.size,0);assert(!$('hubCoffeeDialog').open);
 await context.HubCoffee.open({id:7,type:77});assert(!$('hubCoffeePlay').hidden,'Resume active server session');
 pending=new Promise(r=>resolve=r);const serve=$('hubCoffeeServe').onclick();context.HubCoffee.close();resolve(response());await serve;pending=null;assert(!$('hubCoffeeDialog').open,'Late response cannot reopen a closed panel');
 session={...session,index:3,done:true,total:40,order:null,pour:null,results:[{perfect:false},{perfect:false},{perfect:false}]};await context.HubCoffee.open({id:7,type:77});assert(!$('hubCoffeeResult').hidden);assert.equal($('hubCoffeeResultTotal').textContent,'+40 créditos');context.HubCoffee.close();
 console.log('PASS coffee UI: recipes, ingredient reset, single in-flight request, precision preparation, resume, closed panel response isolation and turn results.');
})().catch(e=>{console.error(e);process.exitCode=1;});
