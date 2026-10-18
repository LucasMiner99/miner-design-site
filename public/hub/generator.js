(function(root){
  'use strict';
  // Fresh, seeded test rooms. Placement never depends on the current decoration.
  function generate(C,{seed=Date.now(),layout='random',excludeLayout,name='Lucas'}={}){
    if(layout!=='random'&&!C.LAYOUTS.some(l=>l.id===layout))throw new Error('Forma de sala no disponible.');
    let n=Number(seed)>>>0;
    const rand=()=>{n+=0x6D2B79F5;let t=Math.imul(n^n>>>15,1|n);t^=t+Math.imul(t^t>>>7,61|t);return ((t^t>>>14)>>>0)/4294967296;};
    const pick=a=>a[Math.floor(rand()*a.length)],shuffle=a=>a.map(v=>({v,r:rand()})).sort((a,b)=>a.r-b.r).map(e=>e.v);
    if(layout==='random')layout=pick(C.LAYOUTS.filter(l=>l.id!==excludeLayout)).id;
    const l=C.layoutFor(layout),items=[],reserve=[];
    const room={version:1,geometryVersion:2,structureVersion:1,layout,name:C.cleanName(name),items};
    for(const [key,count] of Object.entries(C.ENV_COUNTS))room[key]=Math.floor(rand()*count);
    // Cache the empty room graph once, including stairs, doors and cutouts.
    const cells=[],neighbors=Array.from({length:l.w*l.h},()=>[]),base=new Uint8Array(l.w*l.h);
    for(let y=0;y<l.h;y++)for(let x=0;x<l.w;x++)if(!C.blocked([],x,y,null,l)){
      const index=y*l.w+x;base[index]=1;cells.push({x,y,index});
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])if(C.canStep(x,y,x+dx,y+dy,l)&&!C.blocked([],x+dx,y+dy,null,l))neighbors[index].push((y+dy)*l.w+x+dx);
    }
    function connected(candidate){
      const free=base.slice();
      for(const i of [...items,candidate])if(i&&!i.parentId&&!C.TYPES[i.type].wall&&!C.TYPES[i.type].flat){
        const d=C.dimensions(i);for(let y=i.y;y<i.y+d.h;y++)for(let x=i.x;x<i.x+d.w;x++)free[y*l.w+x]=0;
      }
      let remaining=0,start=-1;for(const c of cells)if(free[c.index]){remaining++;start=c.index;}
      if(remaining<30)return false;
      const queue=[start];free[start]=0;remaining--;
      for(let j=0;j<queue.length;j++)for(const index of neighbors[queue[j]])if(free[index]){free[index]=0;remaining--;queue.push(index);}
      return remaining===0;
    }
    function put(item){if(C.TYPES[item.type].finishes&&rand()<.5)item.finish=1;items.push(item);}
    // Widely separated targets in usable cells distribute furniture across wings
    // and levels, including rooms whose floor does not fill its bounding box.
    function floorTarget(){
      const centers=items.filter(i=>!i.parentId&&!C.TYPES[i.type].wall&&!C.TYPES[i.type].flat).map(i=>{const d=C.dimensions(i);return {x:i.x+d.w/2,y:i.y+d.h/2};});
      let best=pick(cells),distance=-1;
      for(let j=0;j<16;j++){const c=pick(cells),d=centers.length?Math.min(...centers.map(p=>(p.x-c.x-.5)**2+(p.y-c.y-.5)**2)):rand();if(d>distance){best=c;distance=d;}}
      return {x:best.x+.5,y:best.y+.5};
    }
    function placeFloor(type){
      const t=C.TYPES[type],target=floorTarget(),candidates=[];
      for(const flip of shuffle([false,true]))for(const {x,y} of cells){
        const item={id:type+1,type,x,y,flip};if(!C.canPlace(items,item,null,l))continue;
        const d=C.dimensions(item);
        const tight=!t.flat&&items.some(i=>{if(i.parentId||C.TYPES[i.type].wall||C.TYPES[i.type].flat)return false;const q=C.dimensions(i);return x<i.x+q.w+1&&x+d.w+1>i.x&&y<i.y+q.h+1&&y+d.h+1>i.y;});
        candidates.push({item,score:(x+d.w/2-target.x)**2+(y+d.h/2-target.y)**2+(tight?l.w*l.h:0)+rand()});
      }
      candidates.sort((a,b)=>a.score-b.score);
      // Relax the margin when needed, but never overlap or close a route.
      const chosen=candidates.find(c=>t.flat||connected(c.item));
      if(chosen)put(chosen.item);
      else reserve.push({id:type+1,type,x:Math.floor(target.x),y:Math.floor(target.y),flip:false});
    }
    const types=shuffle(C.TYPES.map((t,type)=>({t,type})));
    const floor=types.filter(({t})=>!t.wall&&!t.tabletop).sort((a,b)=>Number(a.t.flat)-Number(b.t.flat)||b.t.w*b.t.h-a.t.w*a.t.h);
    for(const {type} of floor)placeFloor(type);
    const slots=shuffle(items.flatMap(parent=>C.surfaceGrid(parent).map(spot=>({parent,spot}))));
    for(const {type} of types.filter(({t})=>t.tabletop)){
      const candidate=slots.map(({parent,spot})=>({id:type+1,type,x:parent.x,y:parent.y,flip:parent.flip,parentId:parent.id,...spot})).find(i=>C.canPlace(items,i,null,l));
      if(candidate)put(candidate);else placeFloor(type);
    }
    // A failed wall placement affects only that piece, never the whole room.
    const walls=types.filter(({t})=>t.wall).sort((a,b)=>b.t.mountH*b.t.width-a.t.mountH*a.t.width);
    for(const [index,{t,type}] of walls.entries()){
      const preferred=index%2?'right':'left',wanted=rand(),candidates=[];
      for(const side of [preferred,preferred==='left'?'right':'left']){
        const span=C.wallSpan(side,l),low=6+t.width/2,high=span*32-6-t.width/2;
        for(let z=8+t.mountH/2;z<=150-t.mountH/2;z+=4)for(let u=low;u<=high;u+=8){
          const item={id:type+1,type,x:0,y:0,flip:false,wallSide:side,wallU:u/32,wallZ:z};
          if(C.canPlace(items,item,null,l))candidates.push({item,score:Math.abs(u-(low+(high-low)*wanted))*.25+Math.abs(z-90)+(side===preferred?0:80)});
        }
      }
      candidates.sort((a,b)=>a.score-b.score);
      if(candidates.length)put(candidates[0].item);
      else reserve.push({id:type+1,type,x:0,y:0,flip:false,wallSide:preferred,wallU:C.wallSpan(preferred,l)*.5,wallZ:90});
    }
    if(reserve.length)room.unplacedItems=reserve;
    // Restore gives reserve pieces a last chance with normal placement rules.
    const result=C.restore(room);
    if(!result)throw new Error('No se pudo validar la sala.');
    return result;
  }
  const api={generate};root.VeredaGenerator=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
