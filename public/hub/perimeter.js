/* A room-sized fixture follows actual wall runs, including steps and door gaps. */
((root)=>{
 'use strict';
 function geometry(C,layout){
  const l=C.layoutFor(layout),paths=[];
  for(const side of ['left','right']){
   const count=C.wallSpan(side,l),point=(u,z)=>({x:side==='left'?0:u,y:side==='left'?u:0,z:z+5});let start=0,previous=null;
   while(start<count){const z=C.wallHeight(side,start+.5,l);let end=start+1;while(end<count&&C.wallHeight(side,end+.5,l)===z)end++;
    const a=point(start,z),b=point(end,z);if(previous&&previous.z!==a.z)paths.push({a:previous,b:a});paths.push({a,b});previous=b;start=end;
   }
  }
  for(const b of l.partitions||[]){const axis=b.h>1?'y':'x',z=C.tileHeight(b.x,b.y,l),edge=z>C.tileHeight(b.x+(axis==='y'?1:0),b.y+(axis==='x'?1:0),l),near=(edge?.76:.38)+.24;
   const a={x:b.x+(axis==='y'?near:0),y:b.y+(axis==='x'?near:0),z:z+5},end={x:a.x+(axis==='x'?b.w:0),y:a.y+(axis==='y'?b.h:0),z:a.z};paths.push({a,b:end,partition:true});
  }
  return paths;
 }
 function draw(k,a,b,color){
  k.save();k.lineCap='butt';k.lineJoin='round';k.beginPath();k.moveTo(a.x,a.y);k.lineTo(b.x,b.y);
  for(const [width,stroke] of [[9,color+'12'],[6,color+'25'],[3.3,'#101015'],[2,color],[.65,'#fff8']]){k.lineWidth=width;k.strokeStyle=stroke;k.stroke();}k.restore();
 }
 function sources(paths,hex){const color=[1,3,5].map(n=>parseInt(hex.slice(n,n+2),16)),out=[];
  for(const {a,b} of paths){const length=Math.hypot(b.x-a.x,b.y-a.y),n=Math.max(1,Math.ceil(length/48));for(let i=0;i<n;i++){const t=(i+.5)/n;out.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,radius:80,color,power:.38});}}return out;
 }
 const api={geometry,draw,sources};root.HubPerimeter=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
