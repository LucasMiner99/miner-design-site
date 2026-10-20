(function(root){
  'use strict';
  function sprite(canvas,extra={}){const p=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data,alpha=new Uint8Array(canvas.width*canvas.height);for(let i=0;i<alpha.length;i++)alpha[i]=p[i*4+3];return {canvas,width:canvas.width,height:canvas.height,alpha,...extra};}
  // Authored light atlases have two registered, equally sized cells. Preserve
  // their complete alpha and common bounds instead of re-cropping each state.
  function lightFrames(document,image){
    if(image.width%2)throw Error('El atlas de iluminación necesita dos celdas iguales.');
    return [0,1].map(i=>{const cv=document.createElement('canvas');cv.width=image.width/2;cv.height=image.height;cv.getContext('2d').drawImage(image,i*cv.width,0,cv.width,cv.height,0,0,cv.width,cv.height);return sprite(cv);});
  }
  // Flat illustrations share the exact wall basis: (1, .5), (0, 1).
  // The same projection drives the visible alpha and pointer hit testing.
  function wall(document,art,type,side=1){const cv=document.createElement('canvas'),w=512,h=w*type.mountH/type.width;cv.width=w;cv.height=Math.ceil(h+w*.5);const k=cv.getContext('2d');k.setTransform(w/art.width,side*w*.5/art.width,0,h/art.height,0,side<0?w*.5:0);k.drawImage(art.canvas,0,0);return sprite(cv,{wallPlane:{width:w,height:h,slope:side*.5}});}
  function tank(document,art){const cv=document.createElement('canvas'),a=1/(.478+.55),b=.5-a*.478;cv.width=art.width;cv.height=Math.ceil(a*art.height+b*art.width);const k=cv.getContext('2d');k.setTransform(1,b,0,a,0,0);k.drawImage(art.canvas,0,0);return sprite(cv);}
  // Calibrate the two horizontal axes of volumetric artwork without flattening
  // its top planes, side faces, brackets or contents onto a wall rectangle.
  function volume(document,art,front=.32,side=-.5){const cv=document.createElement('canvas'),a=1/(front-side),b=.5-a*front;
    // A negative shear extends above the source origin. Include both extrema
    // and translate the whole image so handles, lids and feet are never clipped.
    const top=Math.min(0,b*art.width),bottom=a*art.height+Math.max(0,b*art.width);
    cv.width=art.width;cv.height=Math.ceil(bottom-top);const k=cv.getContext('2d');k.setTransform(1,b,0,a,0,-top);k.drawImage(art.canvas,0,0);return sprite(cv);}
  function fit(document,art,reference){const cv=document.createElement('canvas');cv.width=reference.width;cv.height=reference.height;const k=cv.getContext('2d'),s=Math.min(cv.width/art.width,cv.height/art.height),x=(cv.width-art.width*s)/2,y=cv.height-art.height*s;k.drawImage(art.canvas,x,y,art.width*s,art.height*s);const c=art.surfaceCenter;return sprite(cv,{surfaceCenter:c?{u:(x+c.u*art.width*s)/cv.width,v:(y+c.v*art.height*s)/cv.height}:reference.surfaceCenter});}
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
  // Decorative designs are drawn in local surface coordinates, then projected
  // by the same basis as the floor/wall. These run only when caches rebuild.
  function shape(k,points,fill,stroke,width=1){k.beginPath();points.forEach(([x,y],i)=>i?k.lineTo(x,y):k.moveTo(x,y));k.closePath();if(fill){k.fillStyle=fill;k.fill();}if(stroke){k.strokeStyle=stroke;k.lineWidth=width;k.stroke();}}
  function casinoSuit(k,kind,x,y,size,color){
    k.save();k.translate(x,y);k.scale(size,size);k.fillStyle=color;k.beginPath();
    if(kind%4===0){k.moveTo(0,-1);k.lineTo(.65,0);k.lineTo(0,1);k.lineTo(-.65,0);}
    else if(kind%4===1){k.moveTo(0,.85);k.bezierCurveTo(-1.5,-.1,-.75,-1.4,0,-.55);k.bezierCurveTo(.75,-1.4,1.5,-.1,0,.85);}
    else if(kind%4===2){k.moveTo(0,-1);k.bezierCurveTo(-1.5,.1,-.75,1.2,0,.35);k.bezierCurveTo(.75,1.2,1.5,.1,0,-1);}
    else {for(const [u,v] of [[0,-.5],[-.45,.15],[.45,.15]]){k.moveTo(u+.48,v);k.arc(u,v,.48,0,Math.PI*2);}}
    k.closePath();k.fill();if(kind%4>=2)shape(k,[[-.15,.25],[.15,.25],[.3,1],[-.3,1]],color);k.restore();
  }
  function floorDesign(k,index,f,project,x,y){
    const a=project(x,y),b=project(x+1,y),c=project(x,y+1);k.save();k.transform(b.x-a.x,b.y-a.y,c.x-a.x,c.y-a.y,a.x,a.y);k.beginPath();k.rect(0,0,1,1);k.clip();
    const polygon=(p,fill,stroke=f.dark+'88')=>shape(k,p,fill,stroke,.014),noise=n=>{const q=Math.sin((x*37+y*91+n*17)*12.9898)*43758.5453;return q-Math.floor(q);};
    if(index===7){
      k.fillStyle=f.light;k.fillRect(0,0,1,1);
      const points=Array.from({length:16},(_,n)=>{const t=n*Math.PI/8,r=n%2?.20:.43;return [.5+Math.cos(t)*r,.5+Math.sin(t)*r];});polygon(points,f.dark);
      polygon([[.5,.34],[.66,.5],[.5,.66],[.34,.5]],f.base,f.light);
      for(const [u,v] of [[0,0],[1,0],[1,1],[0,1]])polygon([[u,v-.12],[u+.12,v],[u,v+.12],[u-.12,v]],f.base);
    }else if(index===8){
      k.fillStyle=f.dark;k.fillRect(0,0,1,1);
      for(let row=-1;row<4;row++)for(let col=-1;col<3;col++){const cx=col+(row%2? .5:0),cy=row/3;polygon(Array.from({length:6},(_,i)=>{const t=i*Math.PI/3;return [cx+Math.cos(t)*.48,cy+Math.sin(t)*.185];}),(x+col+y+row)%3?f.light:f.base,f.dark);}
    }else if(index===9){
      k.fillStyle=f.base;k.fillRect(0,0,1,1);
      for(let n=-3;n<5;n++){const t=n*.25;polygon([[0,t],[.5,t+.5],[.5,t+.72],[0,t+.22]],n%2?f.light:f.base);polygon([[.5,t+.5],[1,t],[1,t+.22],[.5,t+.72]],n%2?f.base:f.light);}
    }else if(index===10){
      k.fillStyle=f.base;k.fillRect(0,0,1,1);for(let n=0;n<35;n++){const u=noise(n),v=noise(n+40),r=.015+noise(n+90)*.035;polygon([[u,v],[u+r,v-.02],[u+r*1.3,v+r],[u-.01,v+r*.6]],n%3?f.light+'99':f.dark+'88',null);}
    }else if(index===11){
      k.fillStyle=f.dark;k.fillRect(0,0,1,1);const stones=[[[.02,.02],[.49,.02],[.43,.36],[.02,.44]],[[.52,.02],[.98,.02],[.98,.42],[.46,.35]],[[.02,.47],[.42,.39],[.60,.66],[.46,.98],[.02,.98]],[[.46,.39],[.98,.46],[.98,.98],[.50,.98],[.64,.65]]];stones.forEach((p,i)=>polygon(p,(x+y+i)%3?f.light:f.base,null));
    }else if(index===12){
      k.fillStyle=f.base;k.fillRect(0,0,1,1);
      // Sparse woven motifs, anchored to world tiles so adjoining pieces align.
      if((x+y)%2===0){
        const gold='#c8a76b';polygon([[.5,.16],[.84,.5],[.5,.84],[.16,.5]],null,gold+'66');
        casinoSuit(k,(Math.floor(x/2)+y)%4,.5,.5,.14,gold);
      }else {polygon([[.5,.47],[.53,.5],[.5,.53],[.47,.5]],'#c8a76b77',null);}
    }k.restore();
  }
  function wallDesign(k,index,w,span,height){
    k.save();k.beginPath();k.rect(0,0,span,height);k.clip();k.lineWidth=1;k.strokeStyle=w.trim+'88';k.fillStyle=w.panel+'66';
    if(index===6){for(let y=-20;y<height;y+=48)for(let x=-24;x<span;x+=48){for(let d=0;d<3;d++){k.beginPath();k.arc(x+24,y+22,20-d*5,Math.PI,0);k.lineTo(x+44-d*5,y+46);k.stroke();}}}
    else if(index===7){for(let y=-16;y<height;y+=14)for(let x=-16;x<span;x+=28){const u=x+(Math.round(y/14)%2)*14;k.beginPath();k.arc(u,y,14,0,Math.PI);k.stroke();}}
    else if(index===8){for(let y=8;y<height;y+=44)for(let x=10;x<span;x+=38){k.save();k.translate(x+(Math.floor(y/44)%2)*19,y);k.rotate(-.28);k.beginPath();k.moveTo(0,0);k.quadraticCurveTo(-4,16,0,34);k.stroke();for(let j=0;j<4;j++){k.beginPath();const s=j%2?1:-1;k.ellipse(s*4,5+j*7,5,2.4,s*.55,0,Math.PI*2);k.fill();}k.restore();}}
    else if(index===9){for(let x=0;x<span;x+=10){const g=k.createLinearGradient(x,0,x+10,0);g.addColorStop(0,w.trim+'99');g.addColorStop(.3,'#ffffff16');g.addColorStop(1,'#00000020');k.fillStyle=g;k.fillRect(x,0,10,height);}}
    else if(index===10){for(let y=20;y<height;y+=52)for(let x=18;x<span;x+=64){const points=[[x,y],[x+19,y+9],[x+32,y-7],[x+46,y+17]];k.beginPath();points.forEach(([a,b],i)=>i?k.lineTo(a,b):k.moveTo(a,b));k.stroke();for(const [a,b] of points){k.fillStyle=w.trim;k.beginPath();k.arc(a,b,1.7,0,Math.PI*2);k.fill();}shape(k,[[x+15,y+30],[x+17,y+35],[x+22,y+37],[x+17,y+39],[x+15,y+44],[x+13,y+39],[x+8,y+37],[x+13,y+35]],w.trim+'bb');}}
    else if(index===11){
      // Velvet panels and dark fluted wainscoting, drawn in the wall's own plane.
      const split=height*.73;k.fillStyle=w.dark;k.fillRect(0,0,span,height);
      for(let x=0;x<span;x+=96){
        const velvet=k.createLinearGradient(x,0,x+96,0);
        velvet.addColorStop(0,'#00000030');velvet.addColorStop(.16,'#ffffff08');velvet.addColorStop(.65,'#ffffff03');velvet.addColorStop(1,'#00000030');
        k.fillStyle=velvet;k.fillRect(x,0,96,split);
        k.fillStyle='#a98a524d';k.fillRect(x,0,.7,split);
        // Restrained Art Deco crown: no repeated card symbols or bright boxes.
        k.strokeStyle='#b89a605c';k.lineWidth=.7;k.beginPath();
        for(const inset of [0,7]){k.moveTo(x+10+inset,0);k.lineTo(x+10+inset,17);k.lineTo(x+48,36-inset);k.lineTo(x+86-inset,17);k.lineTo(x+86-inset,0);}k.stroke();
      }
      k.fillStyle=w.trim;k.fillRect(0,split,span,height-split);
      for(let x=0;x<span;x+=6){
        const flute=k.createLinearGradient(x,0,x+6,0);flute.addColorStop(0,'#00000050');flute.addColorStop(.35,'#ffffff0b');flute.addColorStop(1,'#00000025');
        k.fillStyle=flute;k.fillRect(x,split,6,height-split);
      }
      k.fillStyle='#00000055';k.fillRect(0,split-2,span,5);
      k.fillStyle='#967747';k.fillRect(0,split-1,span,1.4);
      k.fillStyle='#c6a56a88';k.fillRect(0,split-1,span,.5);
      k.fillStyle=w.trim;k.fillRect(0,height-5,span,5);
    }
    k.restore();
  }
  const api={floorDesign,wallDesign,wall,tank,volume,fit,sprite,lightFrames,door,screenEffects,pulse,screens};root.VeredaScenery=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
