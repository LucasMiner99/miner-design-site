/* Soft room lighting in world coordinates. Camera motion never rebuilds the map. */
((root)=>{
 'use strict';
 const warm=[255,196,112],cool=[176,207,255];
 const profiles={
  116:{color:[212,184,255],y:.67,radius:155,power:.65,pool:true},
  114:{color:[255,203,125],y:.23,radius:145,power:.88,pool:true},
  115:{color:[255,89,134],y:.32,radius:100,power:.78,pool:true},
  110:{color:[255,198,101],y:.50,radius:125,power:.75},
  106:{color:[119,208,222],y:.37,radius:65,power:.38},
  101:{color:[129,192,255],y:.45,radius:82,power:.40,points:[[.5,.18],[.5,.43],[.5,.68]]},
  102:{color:[96,230,235],y:.50,radius:90,power:.43,points:[[.12,.17],[.5,.5],[.88,.83]]},
  103:{color:[199,143,255],y:.50,radius:135,power:.85},
  104:{color:[255,137,173],y:.42,radius:110,power:.82,pool:true},
  105:{color:[255,206,130],y:.58,radius:130,power:.85,pool:true},
  99:{color:[196,227,210],y:.35,radius:65,power:.38},
  5:{color:warm,y:.18,radius:150,pool:true},
  21:{color:warm,y:.60,radius:150,pool:true},
  53:{color:[226,238,255],y:.18,radius:135,pool:true},
  57:{color:[172,116,255],y:.50,radius:115},
  87:{color:cool,y:.50,radius:95},
  89:{color:[255,223,164],y:.27,radius:105,pool:true},
  36:{color:cool,y:.34,radius:65,power:.38},
  43:{color:cool,y:.38,radius:65,power:.38},
  48:{color:[151,173,255],y:.28,radius:85,power:.42},
  50:{color:[102,224,236],y:.48,radius:45,power:.32},
  84:{color:cool,y:.38,radius:65,power:.38},
  85:{color:cool,y:.38,radius:65,power:.38},
  86:{color:cool,y:.30,radius:90,power:.42}
 };
 function source(b){
  const p=profiles[b.item.type];if(!p||b.item.on===false)return null;
  return {x:b.x+b.w*.5,y:b.y+b.h*p.y,radius:p.radius,color:p.color,power:p.power??.82,
   pool:p.pool&&b.ground?{x:b.ground.x,y:b.ground.y}:null};
 }
 function sources(b){
  const base=source(b);if(!base)return [];
  const points=profiles[b.item.type].points;
  return points?points.map(([u,v])=>({...base,x:b.x+b.w*(b.flip?1-u:u),y:b.y+b.h*v})):[base];
 }
 function gradient(k,x,y,rx,ry,color,power){
  k.save();k.translate(x,y);k.scale(rx,ry);
  const g=k.createRadialGradient(0,0,0,0,0,1),rgb=color.join(',');
  for(const [at,strength] of [[0,1],[.25,.82],[.65,.22],[1,0]])g.addColorStop(at,`rgba(${rgb},${power*strength})`);
  k.fillStyle=g;k.fillRect(-1,-1,2,2);k.restore();
 }
 function create(makeCanvas=()=>document.createElement('canvas')){
  const map=makeCanvas(),k=map.getContext('2d'),halos=new Map();let key='',builds=0,haloBuilds=0;
  function glow(ctx,b,opacity=1){
   const lights=sources(b);if(!lights.length)return;
   const id=[b.item.type,b.w,b.h,!!b.flip].join(':'),margin=Math.ceil(Math.max(...lights.map(l=>l.radius))*.26);
   let halo=halos.get(id);
   if(!halo){
    halo=makeCanvas();halo.width=Math.ceil(b.w+margin*2);halo.height=Math.ceil(b.h+margin*2);
    const q=halo.getContext('2d');for(const l of sources({...b,x:margin,y:margin}))gradient(q,l.x,l.y,l.radius*.25,l.radius*.25,l.color,.30);
    if(halos.size>=64)halos.delete(halos.keys().next().value);halos.set(id,halo);haloBuilds++;
   }
   ctx.save();ctx.globalAlpha=opacity;ctx.drawImage(halo,b.x-margin,b.y-margin);ctx.restore();
  }
  function apply(ctx,scene,{enabled,bounds,extraLights=[],view,dpr,width,height}){
   if(!enabled)return;
   const lights=[...bounds.flatMap(sources),...extraLights],next=JSON.stringify([width,height,lights]);
   if(next!==key){
    // A low-resolution light field is independent of sprite resolution and zoom.
    const scale=Math.min(1,1536/Math.max(width,height));
    map.width=Math.max(1,Math.ceil(width*scale));map.height=Math.max(1,Math.ceil(height*scale));
    k.setTransform(scale,0,0,scale,0,0);k.globalCompositeOperation='source-over';
    k.fillStyle='#384059';k.fillRect(0,0,width,height);k.globalCompositeOperation='lighter';
    for(const l of lights){
     gradient(k,l.x,l.y,l.radius,l.radius*.92,l.color,l.power);
     if(l.pool)gradient(k,l.pool.x,l.pool.y,l.radius*1.25,l.radius*.56,l.color,.58);
    }
    key=next;builds++;
   }
   ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalCompositeOperation='multiply';
   // Cover the viewport first, so panning outside the cached room stays dark.
   ctx.fillStyle='#384059';
   // Draw a single opaque field, including its dark border, without multiplying twice.
   const x=view.x*dpr,y=view.y*dpr,w=width*view.s*dpr,h=height*view.s*dpr;
   ctx.fillRect(0,0,scene.width,Math.max(0,Math.min(scene.height,y)));
   ctx.fillRect(0,Math.max(0,y+h),scene.width,Math.max(0,scene.height-y-h));
   ctx.fillRect(0,Math.max(0,y),Math.max(0,x),Math.max(0,Math.min(scene.height,y+h)-Math.max(0,y)));
   ctx.fillRect(Math.max(0,x+w),Math.max(0,y),Math.max(0,scene.width-x-w),Math.max(0,Math.min(scene.height,y+h)-Math.max(0,y)));
   ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='low';ctx.drawImage(map,x,y,w,h);
   // Preserve the original room silhouette, pets, and soft sprite alpha edges.
   ctx.globalCompositeOperation='destination-in';ctx.drawImage(scene,0,0);ctx.restore();
  }
  return {apply,glow,stats:()=>({builds,haloBuilds,width:map.width,height:map.height})};
 }
 const api={create,source,sources};root.HubLighting=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
