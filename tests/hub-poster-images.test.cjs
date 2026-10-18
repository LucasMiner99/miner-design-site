const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const timers=[],elements=new Map();
const context=vm.createContext({document:{getElementById(id){if(!elements.has(id))elements.set(id,{});return elements.get(id);}},setTimeout(fn,delay){timers.push({fn,delay});}});context.window=context;
vm.runInContext(fs.readFileSync(path.join(__dirname,'../public/hub/posters.js'),'utf8').replace(' window.HubPosters=', ' window.testLoadImage=loadImage;window.HubPosters='),context);
const image={},key='/api/hub/posters/image/1/0?v=2';let active=true,loaded=0,failed=0;
context.testLoadImage(image,key,()=>active,()=>loaded++,()=>failed++);assert.equal(image.src,key);
image.onerror();assert.equal(timers[0].delay,1500);timers.shift().fn();assert.equal(image.src,key+'&retry=1');image.onload();assert.equal(loaded,1);assert.equal(failed,0,'Transient image error can recover');
const broken={};context.testLoadImage(broken,key,()=>active,null,()=>failed++);
for(const delay of [1500,5000,15000]){broken.onerror();assert.equal(timers[0].delay,delay);timers.shift().fn();}
broken.onerror();assert.equal(failed,1);assert.equal(timers.length,0,'Retries are bounded');
const oldRoom={};context.testLoadImage(oldRoom,key,()=>active,()=>loaded++);oldRoom.onerror();active=false;timers.shift().fn();assert.equal(oldRoom.src,key,'Leaving a room cancels its pending image retry');oldRoom.onload();assert.equal(loaded,1,'Stale loads cannot invalidate the next room');
console.log('PASS poster images: transient-error recovery, bounded retries and cancellation on room/dialog changes.');
