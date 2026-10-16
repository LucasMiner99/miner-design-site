(function(root){
  'use strict';
  function sprite(canvas,extra={}){const p=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data,alpha=new Uint8Array(canvas.width*canvas.height);for(let i=0;i<alpha.length;i++)alpha[i]=p[i*4+3];return {canvas,width:canvas.width,height:canvas.height,alpha,...extra};}
  // Flat illustrations share the exact wall basis: (1, .5), (0, 1).
  // The same projection drives the visible alpha and pointer hit testing.
  function wall(document,art,type){const cv=document.createElement('canvas'),w=512,h=w*type.mountH/type.width;cv.width=w;cv.height=Math.ceil(h+w*.5);const k=cv.getContext('2d');k.setTransform(w/art.width,w*.5/art.width,0,h/art.height,0,0);k.drawImage(art.canvas,0,0);return sprite(cv,{wallPlane:{width:w,height:h,slope:.5}});}
  function tank(document,art){const cv=document.createElement('canvas'),a=1/(.478+.55),b=.5-a*.478;cv.width=art.width;cv.height=Math.ceil(a*art.height+b*art.width);const k=cv.getContext('2d');k.setTransform(1,b,0,a,0,0);k.drawImage(art.canvas,0,0);return sprite(cv);}
  // Calibrate the two horizontal axes of volumetric artwork without flattening
  // its top planes, side faces, brackets or contents onto a wall rectangle.
  function volume(document,art,front=.32,side=-.5){const cv=document.createElement('canvas'),a=1/(front-side),b=.5-a*front;cv.width=art.width;cv.height=Math.ceil(a*art.height+b*art.width);const k=cv.getContext('2d');k.setTransform(1,b,0,a,0,0);k.drawImage(art.canvas,0,0);return sprite(cv);}
  function fit(document,art,reference){const cv=document.createElement('canvas');cv.width=reference.width;cv.height=reference.height;const k=cv.getContext('2d'),s=Math.min(cv.width/art.width,cv.height/art.height);k.drawImage(art.canvas,(cv.width-art.width*s)/2,cv.height-art.height*s,art.width*s,art.height*s);return sprite(cv);}
  const screens={36:[[[.36,.25],[.65,.30],[.59,.55],[.28,.49]]],48:[[[.055,.25],[.36,.075],[.36,.31],[.055,.48]],[[.42,.11],[.77,.015],[.77,.235],[.42,.33]]]};
  function screenEffects(k,b,time,opacity){const planes=screens[b.item.type];if(!planes)return;k.save();k.globalAlpha=opacity;k.translate(b.x+(b.flip?b.w:0),b.y);if(b.flip)k.scale(-1,1);
    planes.forEach((points,index)=>{const p=points.map(([x,y])=>[x*b.w,y*b.h]);k.save();k.beginPath();p.forEach(([x,y],i)=>i?k.lineTo(x,y):k.moveTo(x,y));k.closePath();k.clip();
      const [a,c,,d]=p;k.transform(c[0]-a[0],c[1]-a[1],d[0]-a[0],d[1]-a[1],a[0],a[1]);
      k.fillStyle=b.item.type===36?'#071e35':'#16254d';k.globalAlpha=opacity*.72;k.fillRect(0,0,1,1);
      const t=time*.00018+index*.35+b.item.id*.07;
      if(b.item.type===36){for(let row=0;row<3;row++)for(let col=0;col<5;col++){k.fillStyle=['#a5e6d0','#f5cc7c','#dfb1ef'][row];k.fillRect(.08+col*.17+Math.sin(t*2)*.025,.12+row*.14,.10,.06);}k.fillStyle='#fff3ba';k.fillRect(.12+(.5+.5*Math.sin(t*3))*.60,.80,.22,.045);k.fillRect(.12+((t*.32)% .70),.55+.14*Math.sin(t*5),.035,.05);}
      else {const gradient=k.createLinearGradient(0,0,1,1);gradient.addColorStop(0,'#668bff');gradient.addColorStop(.5,'#ae6ee8');gradient.addColorStop(1,'#4bd5db');k.globalAlpha=opacity*(.20+.04*Math.sin(t*3));k.fillStyle=gradient;k.fillRect(0,0,1,1);k.globalAlpha=opacity*.32;for(let j=0;j<4;j++){k.fillStyle=j%2?'#8de6ec':'#b7b7ff';k.fillRect(.06,.13+j*.16,.28+.16*Math.sin(t*2+j),.035);}k.fillStyle='#b8d2ff';k.fillRect(.58,.14,.34,.60);k.fillStyle='#344d86';k.fillRect(.61,.18,.28,.48);}
      k.restore();
    });k.restore();
  }
  function pulse(time,id){return .90+.06*Math.sin(time*.0015+id)+.04*Math.sin(time*.0031+id*.7);}
  function door(document,art,opened,dx,dy){
    // Register all FOUR front-face corners. The original painting has slightly
    // unequal edge slopes; a three-point affine fit leaves the top off-axis.
    // Map the entire painting, including its top/side thickness and handle.
    const r=opened?{x0:.13,x1:.91,t0:.22,t1:.027,b0:.985,b1:.793}:{x0:.031,x1:.887,t0:.030,t1:.210,b0:.788,b1:.987};
    function map(x,y){const u=(x/art.width-r.x0)/(r.x1-r.x0),top=r.t0+(r.t1-r.t0)*u,bottom=r.b0+(r.b1-r.b0)*u,v=(y/art.height-top)/(bottom-top);return {x:u*dx,y:u*dy-107*(1-v)};}
    const corners=[[0,0],[art.width,0],[art.width,art.height],[0,art.height]].map(([x,y])=>map(x,y)),left=Math.floor(Math.min(...corners.map(p=>p.x)))-2,top=Math.floor(Math.min(...corners.map(p=>p.y)))-2;
    const width=Math.ceil(Math.max(...corners.map(p=>p.x)))-left+2,height=Math.ceil(Math.max(...corners.map(p=>p.y)))-top+2,cv=document.createElement('canvas'),scale=3;cv.width=width*scale;cv.height=height*scale;const k=cv.getContext('2d');k.scale(scale,scale);k.translate(-left,-top);k.imageSmoothingEnabled=true;k.imageSmoothingQuality='high';
    function triangle(s){const d=s.map(p=>map(p.x,p.y)),[a,b,c]=s,[p,q,r]=d,den=(b.x-a.x)*(c.y-a.y)-(c.x-a.x)*(b.y-a.y);
      const aa=((q.x-p.x)*(c.y-a.y)-(r.x-p.x)*(b.y-a.y))/den,cc=((r.x-p.x)*(b.x-a.x)-(q.x-p.x)*(c.x-a.x))/den,bb=((q.y-p.y)*(c.y-a.y)-(r.y-p.y)*(b.y-a.y))/den,dd=((r.y-p.y)*(b.x-a.x)-(q.y-p.y)*(c.x-a.x))/den;
      k.save();k.beginPath();const center={x:(p.x+q.x+r.x)/3,y:(p.y+q.y+r.y)/3};d.forEach((v,i)=>{const length=Math.hypot(v.x-center.x,v.y-center.y),x=v.x+(v.x-center.x)/length*.12,y=v.y+(v.y-center.y)/length*.12;i?k.lineTo(x,y):k.moveTo(x,y);});k.closePath();k.clip();k.transform(aa,bb,cc,dd,p.x-aa*a.x-cc*a.y,p.y-bb*a.x-dd*a.y);k.drawImage(art.canvas,0,0);k.restore();
    }
    for(let x=0;x<8;x++)for(let y=0;y<8;y++){const a={x:x*art.width/8,y:y*art.height/8},b={x:(x+1)*art.width/8,y:a.y},c={x:b.x,y:(y+1)*art.height/8},d={x:a.x,y:c.y};triangle([a,b,c]);triangle([a,c,d]);}
    return {canvas:cv,width,height,left,top,registration:r};
  }
  const api={wall,tank,volume,fit,sprite,door,screenEffects,pulse,screens};root.VeredaScenery=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
