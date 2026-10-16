(function(root){
  'use strict';
  const WALK_ROWS=[0,1,1,0,0,2,2,0];
  // Locomotion is driven by distance travelled, like the owner. Pausing the
  // room's decorative effects must not turn a walking pet into a sliding sprite.
  function frameIndex(pet){const row=pet.moving?WALK_ROWS[Math.floor(pet.step)%WALK_ROWS.length]:0;return row*4+pet.dir;}
  // Pets are derived from each owner's saved look; their transient paths never
  // enter a room save. One pet per owner, no collision footprint of its own.
  function create(C,items,owners){
    const actors=new Map();let layout=C.room().id;
    const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
    function nearby(owner,pet){
      const list=[];
      for(let y=Math.floor(owner.y)-3;y<=Math.floor(owner.y)+3;y++)for(let x=Math.floor(owner.x)-3;x<=Math.floor(owner.x)+3;x++){
        const p={x:x+.5,y:y+.5},d=distance(p,owner);
        if(d<.7||d>3||C.blocked(items(),x,y)||Math.abs(C.tileHeight(x,y)-C.walkHeight(owner.x,owner.y))>12)continue;
        const crowded=[...actors.values()].some(a=>a!==pet&&distance(a,p)<.55);
        list.push({p,score:Math.abs(d-1.3)+(crowded?3:0)+(pet?distance(p,pet)*.12:0)});
      }
      return list.sort((a,b)=>a.score-b.score).map(a=>a.p);
    }
    function sync(){
      const all=owners(),ids=new Set(all.filter(o=>o.appearance?.pet>0).map(o=>o.id));
      for(const id of actors.keys())if(!ids.has(id))actors.delete(id);
      const changed=layout!==C.room().id;layout=C.room().id;
      for(const owner of all){
        if(!ids.has(owner.id))continue;let pet=actors.get(owner.id);
        if(!pet){const p=nearby(owner)[0];if(!p)continue;pet={id:'pet:'+owner.id,ownerId:owner.id,...p,path:[],dir:0,step:0,moving:false,cooldown:0};actors.set(owner.id,pet);}
        pet.kind=owner.appearance.pet;pet.name=owner.name;
        if(changed||C.blocked(items(),Math.floor(pet.x),Math.floor(pet.y))){const p=nearby(owner,pet)[0];if(p)Object.assign(pet,p);pet.path=[];pet.cooldown=0;}
        if(pet.path.some(p=>C.blocked(items(),Math.floor(p.x),Math.floor(p.y)))){pet.path=[];pet.cooldown=0;}
      }
      return all;
    }
    function update(dt,active=true){
      const all=sync();dt=Math.min(.05,Math.max(0,dt));
      for(const owner of all){const pet=actors.get(owner.id);if(!pet)continue;pet.moving=false;if(!active)continue;
        pet.cooldown-=dt;
        if(pet.cooldown<=0){
          pet.cooldown=.55;
          if(distance(pet,owner)>2.1||distance(pet,owner)<.65||Math.abs(C.walkHeight(pet.x,pet.y)-C.walkHeight(owner.x,owner.y))>12){
            for(const goal of nearby(owner,pet)){const path=C.route(items(),pet,goal);if(path!==null){pet.path=path;break;}}
          }
        }
        let budget=dt*(distance(pet,owner)>4?2.7:2.05);
        while(pet.path.length&&budget>0){const p=pet.path[0],dx=p.x-pet.x,dy=p.y-pet.y,d=Math.hypot(dx,dy);if(d<.001){pet.path.shift();continue;}
          const step=Math.min(budget,d);pet.x+=dx/d*step;pet.y+=dy/d*step;budget-=step;pet.dir=Math.abs(dx)>Math.abs(dy)?dx>0?0:2:dy>0?1:3;pet.step+=step*6;pet.moving=true;if(step===d)pet.path.shift();
        }
      }
    }
    return {actors,update,sync};
  }
  const api={create,frameIndex};root.VeredaPets=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
