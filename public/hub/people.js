(function(root){
  'use strict';
  const LIMIT=20;
  const choices={face:['Sonrisa','Pecas','Anteojos','Risa','Lentes oscuros','Bigote','Barba corta'],hair:['Despeinado café','Melena cobriza','Rulos negros','Colita rubia','Corto plateado','Ondas ciruela','Pixie menta','Melena tinta','Ondas durazno','Gorra Oliva','Gorro Ciruela'],top:['Buzo salvia','Remera lila','Campera ladrillo','Camisa cielo','Campera Club','Remera Rayas','Remera Noche','Chaleco Arena','Tejido Mostaza','Buzo Laguna','Campera Invierno','Buzo Asimétrico','Buzo Cruces','Musculosa Negra','Buzo Crema','Buzo Bordó'],bottom:['Jean azul','Pantalón carbón','Pantalón arena','Baggy Negro','Jean Cruces','Jean lavado','Pantalón oliva','Pantalón vino','Pantalón crema'],shoes:['Zapatillas crema','Botas miel','Botas café','Altas con tira','Altas bicolor','Botas crema','Lona y cordones'],accessory:['Sin cadena','Cadena cubana','Cubana dorada','Estrella de plata','Perlas'],back:['Sin accesorio','Mochila Paseo','Guitarra Viajera','AK sin culata','Bat de béisbol','Espada Errante','Rifle de precisión'],pet:['Sin mascota','Gatito Miga','Perrito Churro','Gatito Gris','Gatito Esmoquin','Perrito Chocolate','Perrito Manchas']};
  function hash(text){let h=2166136261;for(const c of String(text)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
  function random(seed){let a=hash(seed);return ()=>{a+=0x6D2B79F5;let t=Math.imul(a^a>>>15,1|a);t^=t+Math.imul(t^t>>>7,61|t);return ((t^t>>>14)>>>0)/4294967296;};}
  function look(value={}){if(!value||typeof value!=='object')value={};if(value.shoes===undefined)value={...value,shoes:value.top===9?1:value.top===10?2:0};return Object.fromEntries(Object.keys(choices).map(k=>[k,Number.isInteger(value[k])&&value[k]>=0&&value[k]<choices[k].length?value[k]:0]));}
  function generate(seed){const r=random(seed);return Object.fromEntries(Object.keys(choices).map(k=>[k,k==='pet'?0:Math.floor(r()*choices[k].length)]));}
  function create(C,items,player){
    const actors=new Map();let paused=false,serial=0;
    function free(){const list=[];for(let y=0;y<C.room().h;y++)for(let x=0;x<C.room().w;x++)if(!C.blocked(items(),x,y)&&Math.hypot(player().x-x-.5,player().y-y-.5)>.8&&![...actors.values()].some(a=>Math.hypot(a.x-x-.5,a.y-y-.5)<.8))list.push({x:x+.5,y:y+.5});return list;}
    function join(entry={}){
      if(!entry||typeof entry!=='object')return null;const {id,name,appearance}=entry;
      if(typeof id!=='string'||!id.trim()||id.length>96||id==='self')return null;
      const old=actors.get(id);if(old){if(name)old.name=C.cleanName(name);return old;}
      if(actors.size>=LIMIT)return null;const cells=free();if(!cells.length)return null;
      const rng=random(id),p=cells[Math.floor(rng()*cells.length)];
      const actor={id,name:C.cleanName(name||'Visitante'),appearance:appearance?look(appearance):look({}),...p,dir:0,path:[],step:0,moving:false,wait:.7+rng()*3,rng};actors.set(id,actor);return actor;
    }
    function update(dt){for(const a of actors.values()){
      a.moving=false;
      if(C.blocked(items(),Math.floor(a.x),Math.floor(a.y))){const p=free()[0];if(p)Object.assign(a,p);a.path=[];}
      if(paused)continue;
      if(a.path.some(p=>C.blocked(items(),Math.floor(p.x),Math.floor(p.y))))a.path=[];
      if(!a.path.length)continue;
      if(false){a.wait-=dt;if(a.wait>0)continue;const cells=free();if(cells.length){const goal=cells[Math.floor(a.rng()*cells.length)];a.path=C.route(items(),a,goal)||[];}a.wait=2+a.rng()*4;}
      let budget=dt*2.6;
      while(a.path.length&&budget>0){const p=a.path[0],dx=p.x-a.x,dy=p.y-a.y,d=Math.hypot(dx,dy);if(d<.001){a.path.shift();continue;}const step=Math.min(d,budget);a.x+=dx/d*step;a.y+=dy/d*step;budget-=step;const dir=Math.abs(dx)>Math.abs(dy)?dx>0?0:2:dy>0?1:3;if(a.dir!==dir)a.step=0;a.dir=dir;a.step+=step*6.4;a.moving=true;if(step===d)a.path.shift();}
    }}
    return {actors,join,update,remove:id=>actors.delete(id),pause:value=>paused=!!value,isPaused:()=>paused,
      demo(){const names=['Luna','Mateo','Cami','Nico','Sol','Teo','Mora','Fede','Alma','Fran','Vicky','Dani'];let id;do{id='demo-'+(++serial);}while(actors.has(id));return join({id,name:names[(serial-1)%names.length]});},
      serialize:()=>[...actors.values()].map(a=>({id:a.id,name:a.name,appearance:{...a.appearance}})),
      restore(rows){if(Array.isArray(rows))for(const row of rows.slice(0,LIMIT))if(row&&typeof row==='object')join(row);}
    };
  }
  root.VeredaPeople={LIMIT,choices,look,generate,create};
  if(typeof module!=='undefined')module.exports=root.VeredaPeople;
})(typeof window!=='undefined'?window:globalThis);
