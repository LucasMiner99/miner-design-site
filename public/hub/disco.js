/* Small cached light stamps. No per-frame texture or room-light-map rebuilds. */
((root)=>{'use strict';
 const colors=['#ef6ad5','#6ddaff','#efca68','#9e83ff'];let stamps;
 function textures(){if(stamps)return stamps;stamps=colors.map(color=>{const cv=document.createElement('canvas');cv.width=cv.height=32;const k=cv.getContext('2d'),g=k.createRadialGradient(16,16,0,16,16,16);g.addColorStop(0,color+'ee');g.addColorStop(.28,color+'aa');g.addColorStop(.6,color+'32');g.addColorStop(1,color+'00');k.fillStyle=g;k.fillRect(0,0,32,32);return cv;});return stamps;}
 function floor(k,items,C,project,time,dark){
  const lights=items.filter(i=>C.TYPES[i.type].disco&&i.on!==false);if(!lights.length)return;
  const art=textures(),count=Math.min(24,Math.max(4,Math.floor(384/lights.length)));k.save();k.globalCompositeOperation='screen';
  for(const item of lights){const cx=item.x+.5,cy=item.y+.5,z=C.tileHeight(cx,cy),phase=time*.00022+item.id*1.7;
   for(let n=0;n<count;n++){
    const ring=1+Math.floor(n/8),angle=phase*(ring%2?1:-.7)+n*Math.PI/4,radius=ring*.92;
    const x=cx+Math.cos(angle)*radius,y=cy+Math.sin(angle)*radius;
    if(!C.inside(x-.4,y-.4)||!C.inside(x+.4,y-.4)||!C.inside(x-.4,y+.4)||!C.inside(x+.4,y+.4)||C.partitionAt(Math.floor(x),Math.floor(y))||C.tileHeight(x,y)!==z)continue;
    const p=project(x,y,z+1),size=7+ring*2;k.globalAlpha=(dark?.85:.48)*(.65+.35*Math.sin(phase*2+n)**2);
    k.drawImage(art[n%4],p.x-size,p.y-size*.5,size*2,size);
   }
  }k.restore();
 }
 function sparkle(k,b,time){
  k.save();k.globalCompositeOperation='screen';const phase=time*.001+b.item.id;
  for(let n=0;n<5;n++){const angle=phase*.7+n*2.4,x=b.x+b.w*(.5+Math.sin(angle)*.32),y=b.y+b.h*(.69+Math.cos(angle*1.3)*.18),a=.25+.45*(.5+.5*Math.sin(phase*2+n));k.globalAlpha=a;k.strokeStyle=colors[n%4];k.lineWidth=.65;k.beginPath();k.moveTo(x-1.4,y);k.lineTo(x+1.4,y);k.moveTo(x,y-1.4);k.lineTo(x,y+1.4);k.stroke();}k.restore();
 }
 root.HubDisco={floor,sparkle};if(typeof module!=='undefined')module.exports=root.HubDisco;
})(typeof window!=='undefined'?window:globalThis);
