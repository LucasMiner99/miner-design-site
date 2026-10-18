(function(root){
  'use strict';
  // Painted legs keep their original pose. Footwear has independent ankle
  // registration, so a stride never stretches a pair of shoes to fill a box.
  const DIRECTIONS=[{x:1,y:.5,near:-1},{x:-1,y:.5,near:1},{x:-1,y:-.5,near:-1},{x:1,y:-.5,near:1}];
  const CONTRACT=Object.freeze({version:26,cols:4,rows:4,idleRow:0,seatRow:3,bodyHeight:45,neckY:39.5,anchorY:84.5,scale:4});
  // Waist, screen-left ankle, screen-right ankle, in the shared 72 x 96 rig.
  // These are anatomical landmarks, not the extremes of an illustration.
  const LOWER_RIG=[
    [[36,64],[31.5,76],[40.3,73.4]],[[36,64],[31.3,73.4],[40.1,76]],
    [[36,62],[31.5,77.5],[40.7,76]],[[36,62],[31.5,76],[40.3,77.5]],
    [[36,63.5],[30,71.5],[36.8,77]],[[36,63.5],[34,77],[39.5,71.5]],
    [[36,62],[31.4,72.6],[38.8,77.5]],[[36,62],[33.6,77.5],[40.3,72.5]],
    [[36,63],[26.4,70.5],[39.4,76.7]],[[36,63],[32.6,76.7],[45.2,70.3]],
    [[36,62],[29.2,73],[42.6,77]],[[36,62],[29.2,77],[42.6,73]],
    [[35,61.5],[37,73.2],[46.2,70.5]],[[37,60.5],[25,70.5],[34.2,73.2]],
    [[36,61.5],[24,70],[33.5,66.9]],[[36,61.5],[38.5,66.9],[48,70]]
  ];
  // Foreground shoe contours isolate existing painted footwear. Each foot is
  // translated and uniformly scaled, never stretched or mirrored. Tall cuffs
  // go underneath the trousers; the selected trouser hem defines their overlap.
  const FOOT_ART=[
    [
      {a:[.25,.66],width:.72,poly:[[0,.18],[.27,.18],[.40,.30],[.40,.46],[.49,.60],[.68,.74],[.76,.89],[.72,1],[0,1]]},
      {a:[.75,.66],width:.72,poly:[[1,.18],[.73,.18],[.60,.30],[.60,.46],[.51,.60],[.32,.74],[.24,.89],[.28,1],[1,1]]},
      {a:[.48,.66],width:.70,poly:[[0,.29],[.32,.24],[.60,.31],[.68,.43],[.65,.64],[.72,.86],[.67,1],[0,1]]},
      {a:[.52,.66],width:.70,poly:[[1,.29],[.68,.24],[.40,.31],[.32,.43],[.35,.64],[.28,.86],[.33,1],[1,1]]},
      {a:[.58,.65],width:.70,poly:[[.23,0],[.8,0],[.8,.43],[1,.69],[1,1],[.39,1],[.44,.67],[.32,.42]]},
      {a:[.42,.65],width:.70,poly:[[.77,0],[.2,0],[.2,.43],[0,.69],[0,1],[.61,1],[.56,.67],[.68,.42]]}
    ],[
      {a:[.25,.66],width:.63,poly:[[0,.18],[.30,.17],[.41,.32],[.38,.50],[.43,.64],[.60,.78],[.64,.94],[.61,1],[0,1]]},
      {a:[.75,.66],width:.63,poly:[[1,.18],[.70,.17],[.59,.32],[.62,.50],[.57,.64],[.40,.78],[.36,.94],[.39,1],[1,1]]},
      {a:[.43,.66],width:.68,poly:[[0,.18],[.40,.12],[.60,.25],[.67,.39],[.64,.62],[.70,.88],[.65,1],[0,1]]},
      {a:[.57,.66],width:.68,poly:[[1,.18],[.60,.12],[.40,.25],[.33,.39],[.36,.62],[.30,.88],[.35,1],[1,1]]},
      {a:[.59,.65],width:.69,poly:[[.25,0],[.78,0],[.82,.36],[.72,.51],[1,.68],[1,1],[.43,1],[.45,.69],[.33,.47]]},
      {a:[.41,.65],width:.69,poly:[[.75,0],[.22,0],[.18,.36],[.28,.51],[0,.68],[0,1],[.57,1],[.55,.69],[.67,.47]]}
    ],[
      {a:[.25,.68],width:.67,poly:[[0,.29],[.13,.14],[.29,.14],[.39,.22],[.39,.49],[.43,.63],[.62,.78],[.68,.90],[.64,1],[0,1]]},
      {a:[.75,.68],width:.67,poly:[[1,.29],[.87,.14],[.71,.14],[.61,.22],[.61,.49],[.57,.63],[.38,.78],[.32,.90],[.36,1],[1,1]]},
      {a:[.43,.68],width:.65,poly:[[0,.25],[.13,.25],[.21,.14],[.41,.14],[.48,.25],[.59,.33],[.62,.51],[.60,.71],[.65,.92],[.60,1],[0,1]]},
      {a:[.57,.68],width:.65,poly:[[1,.25],[.87,.25],[.79,.14],[.59,.14],[.52,.25],[.41,.33],[.38,.51],[.40,.71],[.35,.92],[.40,1],[1,1]]},
      {a:[.68,.77],width:.54,poly:[[.48,.52],[.59,.43],[.71,.43],[.78,.49],[.84,.68],[1,.83],[1,1],[.43,1],[.43,.85],[.50,.68]]},
      {a:[.32,.77],width:.54,poly:[[.52,.52],[.41,.43],[.29,.43],[.22,.49],[.16,.68],[0,.83],[0,1],[.57,1],[.57,.85],[.50,.68]]}
    ],[
      {a:[.25,.66],width:.72,poly:[[0,.20],[.31,.12],[.42,.23],[.42,.43],[.47,.57],[.62,.67],[.74,.83],[.72,1],[0,1]]},
      {a:[.75,.66],width:.72,poly:[[1,.20],[.69,.12],[.58,.23],[.58,.43],[.53,.57],[.38,.67],[.26,.83],[.28,1],[1,1]]},
      {a:[.43,.66],width:.70,poly:[[0,.18],[.36,.17],[.58,.28],[.66,.40],[.66,.65],[.71,.90],[.67,1],[0,1]]},
      {a:[.57,.66],width:.70,poly:[[1,.18],[.64,.17],[.42,.28],[.34,.40],[.34,.65],[.29,.90],[.33,1],[1,1]]},
      {a:[.60,.66],width:.71,poly:[[.22,0],[.81,0],[.82,.31],[.70,.49],[1,.70],[1,1],[.42,1],[.47,.69],[.33,.45]]},
      {a:[.40,.66],width:.71,poly:[[.78,0],[.19,0],[.18,.31],[.30,.49],[0,.70],[0,1],[.58,1],[.53,.69],[.67,.45]]}
    ]
  ];
  // Contact A -> passing -> contact B -> passing. Both contacts are artwork.
  const WALK=Object.freeze([0,1,1,0,0,2,2,0]);
  function selectPose(dir,phase){
    if(!Number.isInteger(dir)||dir<0||dir>3)throw new Error('Dirección inválida');
    if(phase!==null&&phase!=='seat'&&(!Number.isInteger(phase)||phase<0||phase>7))throw new Error('Pose inválida');
    const pose=phase==='seat'?3:phase===null?0:WALK[phase];
    return {pose,atlas:pose===2?'approved':'body',row:pose===3?3:pose===1?1:0,column:dir,bob:typeof phase==='number'&&pose===0?-.6:0};
  }
  function create(document,heads,sheets,approved,modular){
    const choices=root.VeredaPeople.choices;
    if(!approved||approved.length!==sheets.length*4||heads.length!==choices.face.length*choices.hair.length*4||sheets.length+(modular?.tops.length||0)+(modular?.dresses?.length||0)!==choices.top.length||sheets.some(s=>s.length!==16))throw new Error('El atlas no cumple la plantilla de personajes.');
    if(!modular||modular.pants.length!==2||modular.shoes.length!==choices.shoes.length-3||modular.chain.length!==4||[modular.night,...modular.tops,...modular.pants,...modular.shoes].some(s=>!s||s.length!==16||s.some(p=>!p.canvas||p.width<8||p.height<8)))throw new Error('Las prendas separadas no cumplen las cuatro vistas y cuatro poses.');
    for(const sprite of [...heads,...sheets.flat(),...approved])if(!sprite.canvas||sprite.width<8||sprite.height<8)throw new Error('La plantilla contiene una pieza vacía o incompleta.');
    const frames=new Map(),prepared=new Map(),scaledIllustrations=new WeakMap();
    function scaledIllustration(art,w,h){
      let cached=scaledIllustrations.get(art);if(cached)return cached;
      const cv=document.createElement('canvas');cv.width=Math.max(1,Math.ceil(w*4));cv.height=Math.max(1,Math.ceil(h*4));const k=cv.getContext('2d');k.imageSmoothingQuality='high';k.drawImage(art.canvas,0,0,cv.width,cv.height);scaledIllustrations.set(art,cv);return cv;
    }
    function prepare(top,bottom,dir,pose){
      const key=[top,bottom,dir,pose].join(':');if(prepared.has(key))return prepared.get(key);
      const s=pose===2?approved[top*4+dir]:sheets[top][(pose===3?3:pose===1?1:0)*4+dir],idle=sheets[top][dir],cv=document.createElement('canvas');cv.width=s.width;cv.height=s.height;const k=cv.getContext('2d');k.drawImage(s.canvas,0,0);const pixels=k.getImageData(0,0,s.width,s.height);
      // Palette replacement is a runtime clothing material: retain the original
      // painted folds, outline, alpha, pose and proportions of the denim texture.
      // Navy fabric has a bluer hue than denim. Keep that material out of the
      // trouser palette, including its hem, in every illustrated pose.
      if(bottom>0){const p=pixels.data;for(let y=Math.floor(s.height*.42);y<s.height;y++)for(let x=0;x<s.width;x++){const i=(y*s.width+x)*4,r=p[i],g=p[i+1],b=p[i+2];if(p[i+3]&&b>r*1.22&&g>r*1.13&&b>=g*.97&&b<145&&(top!==6||g>b*.72)&&(top!==9||r>b*.30&&b>g*1.15)){const l=.2126*r+.7152*g+.0722*b;if(bottom===1){p[i]=l*1.01;p[i+1]=l*.96;p[i+2]=l*1.08;}else{p[i]=l*1.65+26;p[i+1]=l*1.40+23;p[i+2]=l*.94+19;}}}k.putImageData(pixels,0,0);}
      // Neck center measured from the top strip, not the box center (which moves
      // when a hand or foot sticks out). Uniform scale preserves all proportions.
      let total=0,sum=0;for(let y=0;y<Math.max(3,s.height*.055);y++)for(let x=0;x<s.width;x++)if(pixels.data[(y*s.width+x)*4+3]>160){sum+=x;total++;}
      const neckX=total?sum/total:s.width/2,scale=CONTRACT.bodyHeight/(pose===2?s.height:idle.height);
      const value={canvas:cv,width:s.width,height:s.height,neckX,scale};prepared.set(key,value);return value;
    }
    // Legacy painted bodies are separated once by material, including the ink
    // around each material. A whole pair of legs stays in its illustrated pose.
    // Every new layer shares these waist/foot landmarks; no leg is articulated.
    const layers=new Map();
    function bounds(cv){const p=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;let x0=cv.width,y0=cv.height,x1=0,y1=0;for(let y=0;y<cv.height;y++)for(let x=0;x<cv.width;x++)if(p[(y*cv.width+x)*4+3]>80){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}return {x:x0/4,y:y0/4,w:(x1-x0+1)/4,h:(y1-y0+1)/4};}
    function legacy(top,bottom,dir,pose){
      const key=[top,bottom,dir,pose].join(':');if(layers.has(key))return layers.get(key);
      const src=prepare(top,bottom,dir,pose),w=src.width,h=src.height,k=src.canvas.getContext('2d'),data=k.getImageData(0,0,w,h),raw=prepare(top,0,dir,pose).canvas.getContext('2d').getImageData(0,0,w,h).data;
      const labels=new Uint8Array(w*h),queue=new Int32Array(w*h);let end=0;
      const skinMask=new Uint8Array(w*h),armSkin=new Uint8Array(w*h);
      for(let n=0;n<w*h;n++){const i=n*4,r=raw[i],g=raw[i+1],b=raw[i+2];if(raw[i+3]>20&&r>150&&g>65&&r>g*1.25&&g>b*1.2)skinMask[n]=1;}
      // Orange shoe piping resembles skin. Only skin islands connected to the
      // upper body can be hands; lifted shoes must never survive in a torso.
      for(let seed=0;seed<skinMask.length;seed++)if(skinMask[seed]===1){const points=[seed];skinMask[seed]=2;let minY=h;for(let i=0;i<points.length;i++){const n=points[i],x=n%w,y=Math.floor(n/w);minY=Math.min(minY,y);for(const m of [x?n-1:-1,x<w-1?n+1:-1,y?n-w:-1,y<h-1?n+w:-1])if(m>=0&&skinMask[m]===1){skinMask[m]=2;points.push(m);}}if(minY<h*.58)for(const n of points)armSkin[n]=1;}
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){
        const n=y*w+x,i=n*4,r=raw[i],g=raw[i+1],b=raw[i+2],v=y/h;if(raw[i+3]<20)continue;
        const denim=b>38&&g>24&&b-r>12&&b>r*1.22&&g>r*1.13&&b>=g*.97&&b<145&&(top!==4||b>g*1.15)&&(top!==6||v>.55&&g>b*.72)&&(top!==9||r>b*.30&&b>g*1.15);
        let label=0;if(v<.34)label=1;else if(v>.44&&denim)label=2;else if(armSkin[n])label=1;else if(v>.68&&Math.max(r,g,b)>58&&!denim)label=3;else if(v<.58&&Math.max(r,g,b)>65&&!denim)label=1;
        if(label){labels[n]=label;queue[end++]=n;}
      }
      for(let start=0;start<end;start++){const n=queue[start],x=n%w,y=Math.floor(n/w);for(const m of [x?n-1:-1,x<w-1?n+1:-1,y?n-w:-1,y<h-1?n+w:-1])if(m>=0&&!labels[m]&&raw[m*4+3]>0){labels[m]=labels[n];queue[end++]=m;}}
      // A few antialiased ink islands can have a denim hue far from the pants.
      // They must not expand a layer's registration box to a hand or sole.
      const seen=new Uint8Array(w*h),islands=[];
      for(let seed=0;seed<labels.length;seed++)if(labels[seed]&&!seen[seed]){const label=labels[seed],points=[seed];seen[seed]=1;for(let i=0;i<points.length;i++){const n=points[i],x=n%w,y=Math.floor(n/w);for(const m of [x?n-1:-1,x<w-1?n+1:-1,y?n-w:-1,y<h-1?n+w:-1])if(m>=0&&!seen[m]&&labels[m]===label){seen[m]=1;points.push(m);}}islands.push({label,points});}
      const largest=[0,0,0,0];islands.forEach(c=>largest[c.label]=Math.max(largest[c.label],c.points.length));for(const c of islands)if(c.points.length<largest[c.label]*.02)for(const n of c.points)labels[n]=0;
      const output=[];for(let label=1;label<=3;label++){
        const cut=document.createElement('canvas');cut.width=w;cut.height=h;const c=cut.getContext('2d'),pixels=c.createImageData(w,h);pixels.data.set(data.data);for(let n=0;n<labels.length;n++)if(labels[n]!==label)pixels.data[n*4+3]=0;c.putImageData(pixels,0,0);
        const cv=document.createElement('canvas');cv.width=288;cv.height=384;const draw=cv.getContext('2d');draw.scale(4,4);draw.drawImage(cut,36-src.neckX*src.scale,CONTRACT.neckY,w*src.scale,h*src.scale);output.push({canvas:cv,bounds:bounds(cv)});
      }
      layers.set(key,output);return output;
    }
    const components=new Map(),compiled=new Map((modular.compiled?.entries||[]).map(e=>[e.key,e]));
    const headLandmarks=new Map();
    function chinLandmark(head){
      if(headLandmarks.has(head))return headLandmarks.get(head);
      // Register edited whole heads against the matching bare face. Beard or
      // sunglasses pixels must never move the anatomical chin anchor.
      if(head.registrationReference){const ref=head.registrationReference,p=chinLandmark(ref),value={x:p.x/ref.width*head.width,y:p.y/ref.height*head.height};headLandmarks.set(head,value);return value;}
      const p=head.canvas.getContext('2d').getImageData(0,0,head.width,head.height).data,skin=[];let bottom=0;
      for(let y=Math.floor(head.height*.55);y<head.height;y++)for(let x=0;x<head.width;x++){const i=(y*head.width+x)*4,r=p[i],g=p[i+1],b=p[i+2];if(p[i+3]>180&&r>225&&g>90&&g<180&&r-g>70&&g>b*1.3){skin.push({x,y});bottom=Math.max(bottom,y);}}
      const chin=skin.filter(p=>p.y>bottom-head.height*.025),value=chin.length?{x:chin.reduce((n,p)=>n+p.x,0)/chin.length,y:bottom}:{x:head.width*.5,y:head.height*.97};headLandmarks.set(head,value);return value;
    }
    function component(kind,index,dir,pose){
      const key=[kind,index,dir,pose].join(':');if(components.has(key))return components.get(key);
      const baked=compiled.get(key);
      if(baked){const cv=document.createElement('canvas');cv.width=288;cv.height=384;if(!baked.empty)cv.getContext('2d').drawImage(modular.compiled.images[baked.sheet],baked.x,baked.y,baked.w,baked.h,baked.dx,baked.dy,baked.w,baked.h);components.set(key,cv);return cv;}
      const cv=document.createElement('canvas');cv.width=288;cv.height=384;const k=cv.getContext('2d');k.scale(4,4);
      const base=legacy(0,kind==='pants'?Math.min(index,2):0,dir,pose),cell=pose*4+dir;
      if(kind==='top'&&index>=16){const art=modular.dresses[index-16][cell],idle=modular.dresses[index-16][dir],p=art.canvas.getContext('2d').getImageData(0,0,art.width,art.height).data;let sum=0,n=0;for(let y=0;y<art.height*.055;y++)for(let x=0;x<art.width;x++)if(p[(y*art.width+x)*4+3]>128){sum+=x;n++;}const scale=40/idle.height,neck=n?sum/n:art.width/2;k.drawImage(art.canvas,36-neck*scale,CONTRACT.neckY,art.width*scale,art.height*scale);}
      else if(kind==='top'&&index<11&&index!==6)k.drawImage(legacy(index,0,dir,pose)[0].canvas,0,0,72,96);
      else if(kind==='pants'&&index<3)k.drawImage(base[1].canvas,0,0,72,96);
      else if(kind==='shoes'&&index<3){const shoe=legacy(index===1?9:index===2?10:0,0,dir,pose)[2],b=base[2].bounds,s=shoe.bounds;k.drawImage(shoe.canvas,s.x*4,s.y*4,s.w*4,s.h*4,b.x,b.y+(index?-.7:0),b.w,b.h+(index?.7:0));}
      else if(kind==='top'){
        const s=(index===6?modular.night:modular.tops[index-11])[cell],pixels=s.canvas.getContext('2d').getImageData(0,0,s.width,s.height).data;let sum=0,n=0,hem=0;
        for(let y=0;y<Math.max(3,s.height*.06);y++)for(let x=0;x<s.width;x++)if(pixels[(y*s.width+x)*4+3]>128){sum+=x;n++;}
        const neck=n?sum/n:s.width/2;
        for(let y=0;y<s.height;y++)for(let x=Math.floor(neck-s.width*.055);x<neck+s.width*.055;x++)if(x>=0&&x<s.width&&pixels[(y*s.width+x)*4+3]>128)hem=y;
        const scale=24/Math.max(1,hem);k.drawImage(s.canvas,36-neck*scale,CONTRACT.neckY,s.width*scale,s.height*scale);
      }else if(kind==='pants'){
        // Material variants share the painted anatomy, seams and ink of the
        // original trousers. No affine/shear fit of an unrelated pair of legs.
        const painted=legacy(0,0,dir,pose)[1],material=document.createElement('canvas');material.width=288;material.height=384;
        const mk=material.getContext('2d');mk.drawImage(painted.canvas,0,0);const pixels=mk.getImageData(0,0,288,384),p=pixels.data;
        const palette=[[.90,1.35,1.8,8],[.78,.95,.55,6],[1.15,.52,.68,5],[1.65,1.5,1.15,30]][index-5]||[.74,.75,.78,3];
        for(let n=0;n<p.length;n+=4)if(p[n+3]){const l=.2126*p[n]+.7152*p[n+1]+.0722*p[n+2],offset=index<5?3:palette[3]*Math.min(1,l/38);p[n]=l*palette[0]+offset;p[n+1]=l*palette[1]+offset;p[n+2]=l*palette[2]+offset;}
        mk.putImageData(pixels,0,0);
        if(index===4){
          // Keep the hand-painted cream cross motifs from the supplied garment,
          // but discard its foreign silhouette and incompatible gathered folds.
          const s=modular.pants[1][cell],motifs=document.createElement('canvas');motifs.width=s.width;motifs.height=s.height;const mg=motifs.getContext('2d');mg.drawImage(s.canvas,0,0);const ink=mg.getImageData(0,0,s.width,s.height),q=ink.data;
          for(let n=0;n<q.length;n+=4)if(q[n]<150||q[n+1]<140||q[n+2]<110||q[n]-q[n+2]>85)q[n+3]=0;
          mg.putImageData(ink,0,0);const b=painted.bounds;mk.globalCompositeOperation='source-atop';mk.drawImage(motifs,b.x*4,b.y*4,b.w*4,b.h*4);
        }
        k.drawImage(material,0,0,72,96);
      }else if(kind==='shoes'){
        const anchors=LOWER_RIG[cell].slice(1),near=anchors[0][1]>anchors[1][1]?0:1;
        for(const foot of [1-near,near]){
          const lifted=dir>=2&&(pose===1||pose===2)&&foot===near;
          const s=modular.shoes[index-3][(lifted?4:0)+dir],profile=FOOT_ART[index-3][lifted?dir+2:dir];
          // One shoe stays the same size at rest, walking and seated. Only the
          // depth factor changes for the far foot, not the distance between feet.
          const scale=(dir<2?11.8:10.8)*(foot===near?1:.94)/(s.width*profile.width),[x,y]=anchors[foot];
          const depth=base[2].bounds.y+base[2].bounds.h-anchors[near][1],sole=y+depth*(foot===near?1:pose===0?.70:.85);
          k.save();k.beginPath();k.rect(x-16,y-2,32,20);k.clip();
          k.translate(x-profile.a[0]*s.width*scale,sole-s.height*scale);k.scale(scale,scale);
          k.beginPath();profile.poly.forEach(([u,v],n)=>n?k.lineTo(u*s.width,v*s.height):k.moveTo(u*s.width,v*s.height));k.closePath();k.clip();k.drawImage(s.canvas,0,0);k.restore();
        }
      }else if(kind==='accessory'&&index){const s=index===1?modular.chain[dir]:modular.chainsNew[(index-2)*4+dir],w=dir<2?(index===3?14:13):10,h=w*s.height/s.width;k.drawImage(s.canvas,36-w/2+(dir===0?1:dir===1?-1:0),dir<2?43.5:42,w,h);}
      if(kind==='pants'){
        // Extend the painted waistband underneath every shirt hem. Only this
        // hidden overlap changes; knees, cuffs and shoe contacts stay fixed.
        const b=base[1].bounds,strip=Math.min(4,b.h*.35),copy=document.createElement('canvas');copy.width=288;copy.height=384;copy.getContext('2d').drawImage(cv,0,0);
        const top=Math.max(57,b.y-3);k.drawImage(copy,b.x*4,b.y*4,b.w*4,strip*4,b.x,top,b.w,strip+b.y-top);
        if(pose===3&&dir<2){
          // The old seated body hid its waist with its hands. Other sleeve/hand
          // drawings uncover that area, so continue the painted hip beneath it.
          k.save();k.globalCompositeOperation='destination-over';k.drawImage(copy,(dir===0?36:32)*4,(b.y+4)*4,4*4,3*4,29,59,14,8);k.restore();
        }
      }
      components.set(key,cv);return cv;
    }
    function frame(appearance,dir,phase=null){
      const a=root.VeredaPeople.look(appearance),selected=selectPose(dir,phase);
      const key=[...Object.keys(choices).map(key=>a[key]),dir,phase].join(':');if(frames.has(key)){const s=frames.get(key);frames.delete(key);frames.set(key,s);return s;}
      const cv=document.createElement('canvas');cv.width=288;cv.height=384;const k=cv.getContext('2d');k.scale(4,4);k.imageSmoothingEnabled=true;k.imageSmoothingQuality='high';
      const s={scale:1};
      const drawBack=()=>{
        if(!a.back||!modular.back)return;const art=modular.back[(a.back-1)*4+dir];
        const height=[0,20,30,27,28,31,34,29][a.back],scale=Math.min(height/art.height,25/art.width),w=art.width*scale,h=art.height*scale;
        // The spine, not the crop rectangle, is the mount. Front views put the
        // prop behind the body; rear views expose it over the jacket and nape.
        // Rear views register the bag/body against the spine, not the midpoint
        // between a guitar neck and its body or the rifle barrel and magazine.
        const anchors=[0,.54,.62,.56,.45,.54,.53,.5],rear=dir>=2;
        const anchor=rear?(dir===2?anchors[a.back]:1-anchors[a.back]):.5;
        const spine=[29,43,39.5,32.5][dir];
        const x=spine-w*anchor,y=[0,44,41,42,42,40,39,43][a.back]+selected.bob;
        k.drawImage(scaledIllustration(art,w,h),x,y,w,h);
      };
      if(dir<2)drawBack();
      const lower=a.top>=16?[]:[['shoes',a.shoes],['pants',a.bottom]];
      for(const [kind,index] of [...lower,['top',a.top],...(a.top>=16?[['shoes',a.shoes]]:[]),['accessory',a.accessory]])k.drawImage(component(kind,index,dir,selected.pose),0,selected.bob,72,96);
      const head=heads[(a.face*choices.hair.length+a.hair)*4+dir];
      // Calibrated jaw/skull registration: hair tips and ponytails do not define
      // the head center. These landmarks are shared by all faces of a hairstyle.
      const profiles=[
        {width:40,jaw:1,x:[.50,.50,.50,.50]},
        {width:39,jaw:.98,x:[.51,.49,.50,.50]},
        {width:40,jaw:.98,x:[.51,.49,.50,.50]},
        {width:38,jaw:.98,x:[.565,.435,.53,.47]},
        {width:38,jaw:.98,x:[.52,.48,.50,.50]},
        {width:37,jaw:.92,x:[.57,.43,.52,.48]},
        {width:38,jaw:.98,x:[.52,.48,.50,.50]},
        {width:38,jaw:.97,x:[.53,.47,.50,.50]},
        {width:39,jaw:.98,x:[.51,.49,.50,.50]},
        {width:41,jaw:.98,x:[.53,.47,.50,.50]},
        {width:39,jaw:.98,x:[.51,.49,.50,.50]}
        ,{width:40,jaw:.97,x:[.51,.49,.50,.50]},{width:39,jaw:.98,x:[.51,.49,.50,.50]}
      ],profile=profiles[a.hair],scale=Math.min(profile.width/head.width,37/head.height)*[1,1,.98,1,.96,1,.94,.96,.90,.90,.90,.94,.94][a.hair],w=head.width*scale,h=head.height*scale;
      // Front views register the chin, not the lowest hair tip. The reviewed
      // face-size factors are shared by every expression and direction.
      const landmark=chinLandmark(head),front=dir<2;
      const hx=front?36+(dir===0?2.5:-2.5)-landmark.x*scale:36-w*profile.x[dir];
      const hy=(front?41.4-landmark.y*scale:42.5-h*profile.jaw)+1.25;
      const headDX=hx-(36-w/2),headDY=hy-(43-h);
      k.drawImage(scaledIllustration(head,w,h),hx,hy+selected.bob,w,h);
      if(dir>=2)drawBack();
      const value={canvas:cv,width:72,height:96,anchorX:36,anchorY:CONTRACT.anchorY,seatX:[.45,.55,.52,.48][dir],seatY:62/96,worldScale:1,rig:{model:'illustrated-layers-v26',dir,phase,pose:selected.pose,sourceAtlas:selected.atlas,sourceRow:selected.row,sourceColumn:selected.column,uniformScale:s.scale,headOffset:{x:headDX,y:headDY}}};
      frames.set(key,value);if(frames.size>128)frames.delete(frames.keys().next().value);return value;
    }
    // Use the actual independent outfit layer, never a dressed character.
    // Crop once and cache: small rewards remain legible without blank margins.
    const rewardPreviews=new Map();
    function rewardPreview(slot,index,appearance){
      const a=root.VeredaPeople.look(appearance),hair=slot==='hair'?index:a.hair;
      const key=[slot,index,slot==='face'?hair:0].join(':');
      if(rewardPreviews.has(key))return rewardPreviews.get(key);
      let cv;
      if(slot==='hair'||slot==='face')cv=heads[((slot==='face'?index:0)*choices.hair.length+hair)*4].canvas;
      else if(slot==='back')cv=modular.back[(index-1)*4+3].canvas;
      else cv=component(slot==='bottom'?'pants':slot,index,0,0);
      const b=bounds(cv),cut=document.createElement('canvas');
      cut.width=Math.max(1,Math.ceil(b.w*4));cut.height=Math.max(1,Math.ceil(b.h*4));
      cut.getContext('2d').drawImage(cv,b.x*4,b.y*4,cut.width,cut.height,0,0,cut.width,cut.height);
      const value={canvas:cut,width:cut.width,height:cut.height,slot,index};rewardPreviews.set(key,value);return value;
    }
    function bodyGuide(top,dir,phase){const selected=selectPose(dir,phase),s=prepare(top,0,dir,selected.pose),cv=document.createElement('canvas');cv.width=288;cv.height=384;const k=cv.getContext('2d');k.scale(4,4);k.drawImage(s.canvas,36-s.neckX*s.scale,CONTRACT.neckY,s.width*s.scale,s.height*s.scale);return cv;}
    return {frame,rewardPreview,bodyGuide,component,legacy,headSources:heads,source:{heads,sheets,approved,modular},cacheSize:()=>frames.size};
  }
  const api={create,selectPose,WALK,CONTRACT,DIRECTIONS,LOWER_RIG,FOOT_ART};root.VeredaWardrobe=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
