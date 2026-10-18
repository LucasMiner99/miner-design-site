// Generated from public/hub/core.js, people.js and rewards.js.
(function(root){
  'use strict';
  const SIZE=12;
  const ENV_COUNTS=Object.freeze({wall:16,floor:12,wallPattern:6,floorPattern:7});
  const LAYOUTS=[{id:'square',name:'Cuadrada · 12 × 12',w:12,h:12},{id:'wide',name:'Ancha · 16 × 12',w:16,h:12},{id:'tall',name:'Alargada · 12 × 16',w:12,h:16},{id:'large',name:'Amplia · 16 × 16',w:16,h:16},{id:'ell',name:'En L · 16 × 16',w:16,h:16,cut:12},{id:'loft',name:'Loft · 20 × 16',w:20,h:16},{id:'hall',name:'Salón · 24 × 18',w:24,h:18},
    {id:'tee',name:'En T · 24 × 22',w:24,h:22,shape:'tee'},
    {id:'courtyard',name:'En U · 24 × 20',w:24,h:20,shape:'courtyard'},
    {id:'steps',name:'Escalonada · 24 × 20',w:24,h:20,shape:'steps'},
    {id:'duplex',name:'Dos ambientes · 24 × 18',w:24,h:18,partitions:[{x:12,y:0,w:1,h:7},{x:12,y:9,w:1,h:9}],doors:[{x:12,y:7,w:1,h:2,axis:'x'}]},
    {id:'suite',name:'Tres ambientes · 24 × 20',w:24,h:20,partitions:[{x:12,y:0,w:1,h:7},{x:12,y:9,w:1,h:11},{x:0,y:9,w:5,h:1},{x:7,y:9,w:5,h:1}],doors:[{x:12,y:7,w:1,h:2,axis:'x'},{x:5,y:9,w:2,h:1,axis:'y'}]},
    {id:'terrace',name:'Tarima · 28 × 22',w:28,h:22,platforms:[{x:0,y:0,w:28,h:8,z:48}],stairs:[{x:12,y:8,w:2,h:4,axis:'y',high:48,low:0}],partitions:[{x:0,y:7,w:12,h:1},{x:14,y:7,w:14,h:1}],doors:[{x:12,y:7,w:2,h:1,axis:'y'}]},
    {id:'gallery',name:'Ala elevada · 28 × 24',w:28,h:24,platforms:[{x:0,y:0,w:9,h:24,z:48}],stairs:[{x:9,y:10,w:4,h:2,axis:'x',high:48,low:0}],partitions:[{x:8,y:0,w:1,h:10},{x:8,y:12,w:1,h:12}],doors:[{x:8,y:10,w:1,h:2,axis:'x'}]},
    {id:'grand',name:'Tres niveles · 32 × 28',w:32,h:28,platforms:[{x:0,y:0,w:32,h:18,z:40},{x:0,y:0,w:32,h:7,z:80}],stairs:[{x:9,y:7,w:2,h:4,axis:'y',high:80,low:40},{x:22,y:18,w:2,h:4,axis:'y',high:40,low:0}],partitions:[{x:0,y:6,w:9,h:1},{x:11,y:6,w:21,h:1},{x:0,y:17,w:22,h:1},{x:24,y:17,w:8,h:1}],doors:[{x:9,y:6,w:2,h:1,axis:'y'},{x:22,y:17,w:2,h:1,axis:'y'}]}
  ];
  let activeLayout=LAYOUTS[0];
  const layoutFor=id=>LAYOUTS.find(l=>l.id===(typeof id==='object'?id?.id:id))||LAYOUTS[0];
  function setLayout(id){activeLayout=layoutFor(id);return activeLayout;}
  const room=()=>activeLayout;
  const within=(x,y,b)=>x>=b.x&&x<b.x+b.w&&y>=b.y&&y<b.y+b.h;
  function stairAt(x,y,layout=activeLayout){return (layoutFor(layout).stairs||[]).find(s=>within(x,y,s))||null;}
  function tileHeight(x,y,layout=activeLayout){
    const l=layoutFor(layout),s=stairAt(x,y,l);
    if(s){const n=s.axis==='x'?s.w:s.h,index=Math.floor(s.axis==='x'?x-s.x:y-s.y);return s.high-(s.high-s.low)*(index+1)/n;}
    return Math.max(0,...(l.platforms||[]).filter(p=>within(x,y,p)).map(p=>p.z));
  }
  function maxHeight(layout=activeLayout){return Math.max(0,...(layoutFor(layout).platforms||[]).map(p=>p.z));}
  function canStep(x,y,nx,ny,layout=activeLayout){
    if(Math.abs(nx-x)+Math.abs(ny-y)!==1||!inside(x,y,layout)||!inside(nx,ny,layout))return false;
    const a=tileHeight(x,y,layout),b=tileHeight(nx,ny,layout);if(a===b)return true;
    const stairs=[stairAt(x,y,layout),stairAt(nx,ny,layout)].filter(Boolean);
    return Math.abs(a-b)<=12&&stairs.some(s=>s.axis==='x'?y===ny:x===nx);
  }
  // Interpolate along legal stair routes only. Flat landings stay perfectly flat.
  function walkHeight(x,y,layout=activeLayout){
    const ix=Math.floor(x),iy=Math.floor(y),base=tileHeight(ix,iy,layout);let z=base;
    for(const [d,axis] of [[x-ix-.5,'x'],[y-iy-.5,'y']]){if(!d)continue;const nx=ix+(axis==='x'?Math.sign(d):0),ny=iy+(axis==='y'?Math.sign(d):0);if(canStep(ix,iy,nx,ny,layout))z+=Math.abs(d)*(tileHeight(nx,ny,layout)-base);}
    return z;
  }
  function stairAccess(x,y,layout=activeLayout){return (layoutFor(layout).stairs||[]).some(s=>within(x,y,s.axis==='x'?{x:s.x-1,y:s.y,w:s.w+2,h:s.h}:{x:s.x,y:s.y-1,w:s.w,h:s.h+2}));}
  function doorAccess(x,y,layout=activeLayout){return (layoutFor(layout).doors||[]).some(d=>within(x,y,d.axis==='x'?{x:d.x-1,y:d.y,w:d.w+2,h:d.h}:{x:d.x,y:d.y-1,w:d.w,h:d.h+2}));}
  function newBarrier(x,y,layout){const id=layoutFor(layout).id;if(['terrace','gallery','grand'].includes(id))return partitionAt(x,y,layout)||doorAccess(x,y,layout);if(id==='duplex')return x===12&&y===9||doorAccess(x,y,layout);if(id==='suite')return x===12&&y===9||x===7&&y===9||doorAccess(x,y,layout);return false;}
  function wallHeight(side,u,layout=activeLayout){return tileHeight(side==='left'?0:u,side==='left'?u:0,layout);}
  function inside(x,y,layout=activeLayout){
    const l=layoutFor(layout);if(x<0||y<0||x>=l.w||y>=l.h||l.cut&&x>=l.cut&&y>=l.cut)return false;
    if(l.shape==='tee')return y<10||x>=6&&x<18;
    if(l.shape==='courtyard')return y<10||x<8||x>=16;
    if(l.shape==='steps')return x<(y<7?24:y<14?20:16);
    return true;
  }
  function partitionCells(layout=activeLayout){const l=layoutFor(layout),cells=[];for(const b of l.partitions||[])for(let y=b.y;y<b.y+b.h;y++)for(let x=b.x;x<b.x+b.w;x++)cells.push({x,y});return cells;}
  function partitionAt(x,y,layout=activeLayout){return (layoutFor(layout).partitions||[]).some(b=>x>=b.x&&y>=b.y&&x<b.x+b.w&&y<b.y+b.h);}
  function wallSpan(side,layout=activeLayout){const l=layoutFor(layout),max=side==='left'?l.h:l.w;let n=0;while(n<max&&inside(side==='left'?0:n,side==='left'?n:0,l))n++;return n;}

  function rotation(item){return Number.isInteger(item.rotation)&&item.rotation>=0&&item.rotation<4?item.rotation:item.flip?1:0;}
  function dimensions(item){const t=TYPES[item.type];return rotation(item)%2?{w:t.h,h:t.w}:{w:t.w,h:t.h};}

  const TYPES=[
    {name:'Sofá Salvia',w:3,h:2,width:172,category:'seats',sprite:0},
    {name:'Sillón Miel',w:2,h:2,width:110,category:'seats',sprite:1},
    {name:'Mesa Domingo',w:2,h:2,width:120,category:'tables',sprite:2},
    {name:'Monstera',w:1,h:1,width:86,category:'deco',sprite:3},
    {name:'Biblioteca Nido',w:2,h:1,width:103,category:'deco',sprite:4},
    {name:'Lámpara Alba',w:1,h:1,width:48,category:'deco',sprite:5},
    {name:'Aparador Bosque',w:2,h:1,width:124,category:'tables',sprite:6},
    {name:'Almohadón Sol',w:1,h:1,width:65,category:'seats',sprite:7},
    {name:'Alfombra Raíz',w:4,h:3,width:220,category:'deco',sprite:8,flat:true},
    {name:'Mesa de café',w:2,h:1,width:120,category:'tables',sprite:9},
    {name:'Helecho',w:1,h:1,width:78,category:'deco',sprite:10},
    {name:'Banquito Roble',w:1,h:1,width:57,category:'seats',sprite:11},
    {name:'Cama Siesta',w:2,h:3,width:150,category:'deco',sprite:12},
    {name:'Tocadiscos',w:1,h:1,width:76,category:'deco',sprite:13},
    {name:'Lectura y café',w:1,h:1,width:44,category:'deco',sprite:14},
    {name:'Lavanda',w:1,h:1,width:65,category:'deco',sprite:15},
    {name:'Escritorio Roble',w:2,h:1,width:90,category:'tables',sprite:16},
    {name:'Sillón Mimbre',w:1,h:1,width:64,category:'seats',sprite:17},
    {name:'Puf Coral',w:1,h:1,width:58,category:'seats',sprite:18},
    {name:'Vinilero Sur',w:2,h:1,width:94,category:'tables',sprite:19},
    {name:'Jardín de vidrio',w:1,h:1,width:34,category:'deco',sprite:20},
    {name:'Farol Lucero',w:1,h:1,width:28,category:'deco',sprite:21},
    {name:'Banco Encuentro',w:3,h:1,width:108,category:'seats',sprite:22,seat:{u:.31,v:.24,dir:1},seats:[{u:.31,v:.24,dir:1},{u:.65,v:.45,dir:1}]},
    {name:'Mesita Nogal',w:1,h:1,width:57,category:'tables',sprite:23,surface:[{u:.50,v:.25}]},
    {name:'Radio Menta',w:1,h:1,width:43,category:'deco',sprite:24,tabletop:true},
    {name:'Cactus Flor',w:1,h:1,width:31,category:'deco',sprite:25,tabletop:true},
    {name:'Ventana Barrio',w:1,h:1,width:128,mountH:100,category:'wall',sprite:26,wall:true},
    {name:'Cuadro Sierra',w:1,h:1,width:54,mountH:48,category:'wall',sprite:27,wall:true},
    {name:'Lámina Helecho',w:1,h:1,width:38,mountH:68,category:'wall',sprite:28,wall:true},
    {name:'Reloj Tarde',w:1,h:1,width:36,mountH:36,category:'wall',sprite:29,wall:true},
    {name:'Estante Brote',w:1,h:1,width:90,mountH:45,category:'wall',sprite:30,wall:true},
    {name:'Espejo Óvalo',w:1,h:1,width:38,mountH:58,category:'wall',sprite:31,wall:true},
    {name:'Pecera Calma',w:1,h:1,width:60,category:'deco',sprite:32,tabletop:true},
    {name:'Bonsái Brisa',w:1,h:1,width:34,category:'deco',sprite:33,tabletop:true},
    {name:'Baúl Tesoro',w:2,h:1,width:86,category:'tables',sprite:34,surface:[{u:.32,v:.22},{u:.68,v:.40}]},
    {name:'Carrito Café',w:2,h:1,width:82,category:'tables',sprite:35,surface:[{u:.40,v:.22},{u:.71,v:.35}]},
    {name:'Arcade Recreo',w:1,h:1,width:57,category:'deco',sprite:36},
    {name:'Barra Cafecito',w:2,h:2,width:94,category:'deco',sprite:37},
    {name:'Caballete Color',w:1,h:1,width:52,category:'deco',sprite:38},
    {name:'Canasto Abrigo',w:1,h:1,width:43,category:'deco',sprite:39},
    {name:'Heladera Crema',w:1,h:1,width:61,category:'deco',sprite:40},
    {name:'Cocina Oliva',w:2,h:1,width:86,category:'deco',sprite:41},
    {name:'Perchero Paseo',w:1,h:1,width:45,category:'deco',sprite:42},
    {name:'Tele Retro',w:2,h:1,width:87,category:'deco',sprite:43},
    {name:'Guitarra Fogón',w:1,h:1,width:39,category:'deco',sprite:44},
    {name:'Carrito Pochoclos',w:1,h:1,width:61,category:'deco',sprite:45},
    {name:'Galletitas de casa',w:1,h:1,width:28,category:'deco',sprite:46,tabletop:true},
    {name:'Gatito de peluche',w:1,h:1,width:36,category:'deco',sprite:47,tabletop:true},
    {name:'Escritorio Stream',w:3,h:2,width:108,category:'tables',sprite:48,artFlip:true},
    {name:'Silla Gamer',w:1,h:1,width:56,category:'seats',sprite:49,seat:{u:.45,v:.59,dir:1}},
    {name:'Torre RGB',w:1,h:1,width:31,category:'deco',sprite:50},
    {name:'Micrófono Podcast',w:1,h:1,width:21,category:'deco',sprite:51,tabletop:true},
    {name:'Cámara Stream',w:1,h:1,width:23,category:'deco',sprite:52,tabletop:true},
    {name:'Aro de Luz',w:1,h:1,width:31,category:'deco',sprite:53,interaction:'light'},
    {name:'Consola Recreo',w:1,h:1,width:34,category:'deco',sprite:54,tabletop:true},
    {name:'Auriculares Estudio',w:1,h:1,width:24,category:'deco',sprite:55,tabletop:true},
    {name:'Panel Acústico',w:1,h:1,width:84,mountH:61,category:'wall',sprite:56,wall:true},
    {name:'Neón Play',w:1,h:1,width:66,mountH:46,category:'wall',sprite:57,wall:true,interaction:'light'},
    {name:'Estante Geek',w:1,h:1,width:80,mountH:47,category:'wall',sprite:58,wall:true},
    {name:'Cuadro Pixel',w:1,h:1,width:54,mountH:58,category:'wall',sprite:59,wall:true},
    {name:'Mesa Auxiliar Estudio',w:2,h:1,width:84,category:'tables',sprite:60,surface:[{u:.31,v:.22},{u:.69,v:.39}]},
    {name:'Parlante Estudio',w:1,h:1,width:27,category:'deco',sprite:61,tabletop:true},
    {name:'Panel Hexágonos',w:1,h:1,width:66,mountH:56,category:'wall',sprite:62,wall:true},
    {name:'Cuadro Cassette',w:1,h:1,width:54,mountH:58,category:'wall',sprite:63,wall:true},
    {name:'Ventana Ciudad',w:1,h:1,width:78,mountH:96,category:'wall',sprite:64,wall:true,interaction:'curtain'},
    {name:'Ventana Lluvia',w:1,h:1,width:112,mountH:78,category:'wall',sprite:65,wall:true,interaction:'curtain'},
    {name:'Ventana Lago',w:1,h:1,width:112,mountH:78,category:'wall',sprite:66,wall:true,interaction:'curtain'},
    {name:'Estante Dino',w:1,h:1,width:82,mountH:52,category:'wall',sprite:67,wall:true},
    {name:'Organizador Estudio',w:1,h:1,width:76,mountH:62,category:'wall',sprite:68,wall:true},
    {name:'Mini Expendedora',w:1,h:1,width:48,category:'deco',sprite:69},
    {name:'Puf Luna',w:1,h:1,width:61,category:'seats',sprite:70,seat:{u:.46,v:.55,dir:0}},
    {name:'Pinball Órbita',w:1,h:2,width:76,category:'deco',sprite:71},
    {name:'Mesa DJ',w:2,h:1,width:104,category:'tables',sprite:72},
    {name:'Rascador Mimo',w:1,h:1,width:60,category:'deco',sprite:73},
    {name:'Cama Nube',w:1,h:1,width:52,category:'deco',sprite:74},
    {name:'Estante Vinilos',w:1,h:1,width:88,mountH:54,category:'wall',sprite:75,wall:true},
    {name:'Cuadro Lunar',w:1,h:1,width:48,mountH:48,category:'wall',sprite:76,wall:true},
    {name:'Cafetera Crema',w:1,h:1,width:34,category:'deco',sprite:77,tabletop:true,interaction:'coffee'},
    {name:'Globo Viajero',w:1,h:1,width:29,category:'deco',sprite:78,tabletop:true},
    {name:'Ruleta',w:2,h:2,width:108,category:'deco',sprite:79,interaction:'roulette'},
    {name:'Póster personal · Cuadrado',w:1,h:1,width:64,mountH:64,category:'wall',sprite:80,wall:true,poster:true,ratio:1},
    {name:'Póster personal · Horizontal',w:1,h:1,width:88,mountH:49.5,category:'wall',sprite:81,wall:true,poster:true,ratio:16/9},
    {name:'Póster personal · Vertical',w:1,h:1,width:45,mountH:80,category:'wall',sprite:82,wall:true,poster:true,ratio:9/16},
    {name:'Máquina de intercambio',w:1,h:1,width:62,category:'deco',sprite:83,interaction:'exchange'},
    {name:'Monitor Panorámico',w:1,h:1,width:53,category:'deco',sprite:84,tabletop:true},
    {name:'Monitor Vertical Crema',w:1,h:1,width:30,category:'deco',sprite:85,tabletop:true},
    {name:'Tele Cine',w:3,h:1,width:126,category:'deco',sprite:86},
    {name:'Tele Plasma Pared',w:1,h:1,width:136,mountH:76.5,category:'wall',sprite:87,wall:true,interaction:'light'},
    {name:'Mesa Taller',w:3,h:1,width:118,category:'tables',sprite:88,rearArtFlip:true,surface:[{u:.30,v:.23},{u:.70,v:.42}]},
    {name:'Lámpara Luna',w:1,h:1,width:25,category:'deco',sprite:89,tabletop:true,interaction:'light',rotationLight:true}
  ];
  for(const [index,name,rarity] of [[0,'Girasol','Común'],[1,'Rosa','Rara'],[2,'Cannabis Dorada','Épica']])TYPES.push({name,w:1,h:1,width:46,category:'deco',sprite:90+index,interaction:'plant',plantation:true,rarity});
  const DARK_TYPES=[0,1,2,4,6,7,9,11,12,13,16,17,18,19,20,22,23,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,55,60,61];
  DARK_TYPES.forEach(i=>TYPES[i].finishes=['Original','Nogal y negro']);
  // Only a display width: height always comes from the original sprite's proportions.
  const metrics=[
    {width:132,seat:{u:.30,v:.44,dir:1},seats:[{u:.30,v:.44,dir:1},{u:.58,v:.63,dir:1}]},
    {width:82,seat:{u:.40,v:.48,dir:1}},
    {width:108,surface:[{u:.36,v:.30},{u:.65,v:.38}]},
    {width:64},
    {width:88},
    {width:42},
    {width:96,surface:[{u:.31,v:.21},{u:.68,v:.36}]},
    {width:49,seat:{u:.50,v:.46,dir:0}},
    {width:216},
    {width:94,surface:[{u:.28,v:.25},{u:.69,v:.43}]},
    {width:46,tabletop:true},
    {width:43,seat:{u:.49,v:.20,dir:0}},
    {width:150},
    {width:58},
    {width:27,tabletop:true},
    {width:33,tabletop:true},
    {surface:[{u:.32,v:.21},{u:.64,v:.32}]},
    {seat:{u:.50,v:.60,dir:1}},
    {seat:{u:.50,v:.35,dir:0}},
    {surface:[{u:.30,v:.18},{u:.67,v:.37}]},
    {tabletop:true},
    {tabletop:true}
  ];
  TYPES.forEach((t,i)=>Object.assign(t,metrics[i]));
  TYPES[5].interaction=TYPES[21].interaction='light';
  TYPES[26].interaction='curtain';
  // Base widths exclude canopies, lampshades and tabletop overhangs. A base is
  // projected on the same 2:1 floor plane; it is not the full sprite's rectangle.
  const bases=[
    ['box',.90],['box',.88],['oval',.84],['oval',.43],
    ['box',.95],['oval',.65],['box',.94],['box',.94],
    ['flat',1],['box',.87],['oval',.42],['oval',.86],
    ['box',.94],['box',.94],['box',.94],['oval',.58],
    ['box',.90],['box',.85],['oval',.90],['box',.93],['oval',.89],['oval',.87],
    ['box',.91],['box',.92],['box',.88],['oval',.75],
    ['wall',1],['wall',1],['wall',1],['wall',1],['wall',1],['wall',1],
    ['box',.95],['oval',.63],['box',.92],['box',.87],
    ['box',.86],['box',.91],['box',.77],['oval',.89],['box',.9],['box',.9],['oval',.75],['box',.9],['box',.68],['box',.8],['oval',.75],['oval',.86],
    ['box',.92],['oval',.77],['box',.90],['oval',.87],['box',.85],['oval',.88],['box',.90],['oval',.80],['wall',1],['wall',1],['wall',1],['wall',1]
  ];
  bases.push(['box',.91],['box',.91],['wall',1],['wall',1]);
  bases.push(['wall',1],['wall',1],['wall',1],['wall',1],['wall',1],['box',.87],['oval',.88]);
  bases.push(['box',.86],['box',.91],['box',.90],['oval',.94],['wall',1],['wall',1],['box',.86],['oval',.73]);
  TYPES.forEach((t,i)=>t.base={shape:bases[i]?.[0]||'wall',span:bases[i]?.[1]||1,u:.5});
  for(let i=90;i<=92;i++)TYPES[i].base={shape:'oval',span:.62,u:.5};
  TYPES[83].base={shape:'box',span:.94,u:.5};
  for(const [i,shape,span] of [[84,'box',.4],[85,'box',.55],[86,'box',.94],[88,'box',.94],[89,'oval',.8]])TYPES[i].base={shape,span,u:.5};
  // Local tabletop plane, separate from room/pathfinding cells. A quarter-tile
  // grid spans the usable surface; legacy slots remain readable without moving saves.
  for(const t of TYPES)if(t.surface){
    const c={u:t.surface.reduce((n,p)=>n+p.u,0)/t.surface.length,v:t.surface.reduce((n,p)=>n+p.v,0)/t.surface.length};
    const first=t.surface[0],last=t.surface.at(-1);
    t.surfaceArea={c,a:t.surface.length>1?{u:(last.u-first.u)*1.65,v:(last.v-first.v)*1.65}:{u:.48,v:.19},b:{u:-.28,v:.14},nx:t.w*4,ny:t.h*4};
  }
  Object.assign(TYPES[2].surfaceArea,{a:{u:.62,v:.26},b:{u:-.62,v:.26}});
  function surfaceUV(parent,child){
    const t=TYPES[parent.type],a=t?.surfaceArea;if(!a)return null;
    if(child.surfaceX===undefined&&child.surfaceY===undefined)return Number.isInteger(child.slot)?t.surface[child.slot]||null:null;
    if(child.slot!==undefined||!Number.isInteger(child.surfaceX)||!Number.isInteger(child.surfaceY)||child.surfaceX<1||child.surfaceX>=a.nx||child.surfaceY<1||child.surfaceY>=a.ny)return null;
    return {u:a.c.u+(child.surfaceX/a.nx-.5)*a.a.u+(child.surfaceY/a.ny-.5)*a.b.u,v:a.c.v+(child.surfaceX/a.nx-.5)*a.a.v+(child.surfaceY/a.ny-.5)*a.b.v};
  }
  function surfaceLocal(parent,child){
    const p=surfaceUV(parent,child),a=TYPES[parent.type]?.surfaceArea;if(!p||!a)return null;
    const u=p.u-a.c.u,v=p.v-a.c.v,d=a.a.u*a.b.v-a.a.v*a.b.u;
    return {x:(u*a.b.v-v*a.b.u)/d*TYPES[parent.type].w,y:(a.a.u*v-a.a.v*u)/d*TYPES[parent.type].h};
  }
  function surfaceFits(parent,child){return !!surfaceUV(parent,child);}
  function surfaceOccupied(parent,a,b){
    // Existing authored slots retain their old compatibility. New placements
    // also collide with legacy props, using each object's actual base size.
    if(a.surfaceX===undefined&&b.surfaceX===undefined)return a.slot===b.slot;
    const p=surfaceLocal(parent,a),q=surfaceLocal(parent,b);if(!p||!q)return true;
    const radius=i=>Math.max(.16,Math.min(.46,TYPES[i.type].width*TYPES[i.type].base.span/110));
    return Math.hypot(p.x-q.x,p.y-q.y)<radius(a)+radius(b)-.001;
  }
  function surfaceGrid(parent){const a=TYPES[parent.type]?.surfaceArea,out=[];if(a)for(let y=1;y<a.ny;y++)for(let x=1;x<a.nx;x++)out.push({surfaceX:x,surfaceY:y});return out;}
  function surfaceOffset(parent,spot){
    const t=TYPES[parent.type],x=spot.surfaceX/4-t.w/2,y=spot.surfaceY/4-t.h/2,r=rotation(parent);
    const a=r===0?x:r===1?y:r===2?-x:-y,b=r===0?y:r===1?x:r===2?-y:-x;
    return {x:32*(a-b),y:16*(a+b)};
  }
  // Top-center landmarks only; spacing and angles always come from room cells.
  const surfaceCenters={2:.32,6:.30,9:.38,16:.28,19:.28,23:.27,34:.30,35:.29,60:.265,88:.29};
  for(const [id,v] of Object.entries(surfaceCenters))TYPES[id].surfaceCenter={u:.5,v};
  TYPES[9].artAxes=[.57,-.57];
  TYPES[88].artAxes=[.52,-.56];
  TYPES[86].artAxes=[.45,-.57];
  function initial(){return {version:1,geometryVersion:2,structureVersion:1,layout:'square',wallPattern:0,floorPattern:0,name:'Lucas',wall:0,floor:0,items:[
    {id:1,type:0,x:1,y:5,flip:false},
    {id:2,type:4,x:0,y:1,flip:false},
    {id:3,type:5,x:0,y:4,flip:false},
    {id:4,type:6,x:4,y:0,flip:false},
    {id:5,type:3,x:8,y:0,flip:false},
    {id:6,type:1,x:7,y:3,flip:false},
    {id:7,type:8,x:3,y:4,flip:false},
    {id:8,type:9,x:4,y:5,flip:false},
    {id:9,type:10,x:0,y:8,flip:false},
    {id:10,type:13,x:8,y:1,flip:false},
    {id:11,type:14,x:7,y:7,flip:false},
    {id:12,type:15,x:5,y:1,flip:false},
    {id:13,type:16,x:9,y:1,flip:false},
    {id:14,type:17,x:10,y:3,flip:false},
    {id:15,type:18,x:9,y:9,flip:false},
    {id:16,type:19,x:1,y:10,flip:false},
    {id:17,type:20,x:9,y:1,flip:false,parentId:13,slot:0},
    {id:18,type:21,x:1,y:10,flip:false,parentId:16,slot:0}
  ]};}
  function covers(item,x,y){if(TYPES[item.type].wall)return false;const t=dimensions(item);return x+1>item.x&&x<item.x+t.w&&y+1>item.y&&y<item.y+t.h;}
  function blocked(items,x,y,ignoreId,layout=activeLayout){return !inside(x,y,layout)||partitionAt(x,y,layout)||items.some(i=>i.id!==ignoreId&&!i.parentId&&!TYPES[i.type].flat&&covers(i,x,y));}
  function overlap(a,b){if(TYPES[a.type].wall||TYPES[b.type].wall)return false;const ta=dimensions(a),tb=dimensions(b);return a.x<b.x+tb.w&&a.x+ta.w>b.x&&a.y<b.y+tb.h&&a.y+ta.h>b.y;}
  function canPlace(items,item,player,layout=activeLayout){
    const t=TYPES[item.type],d=t&&dimensions(item);
    if(t?.wall){
      if(item.parentId||!['left','right'].includes(item.wallSide)||!Number.isFinite(item.wallU)||!Number.isFinite(item.wallZ))return false;
      const l=layoutFor(layout),span=wallSpan(item.wallSide,l)*32,u=item.wallU*32,z=item.wallZ;
      if(u-t.width/2<6||u+t.width/2>span-6||z-t.mountH/2<8||z+t.mountH/2>150)return false;
      if(wallHeight(item.wallSide,(u-t.width/2)/32,l)!==wallHeight(item.wallSide,(u+t.width/2)/32,l))return false;
      return !items.some(i=>i.id!==item.id&&TYPES[i.type].wall&&i.wallSide===item.wallSide&&Math.abs(i.wallU*32-u)<(TYPES[i.type].width+t.width)/2+4&&Math.abs(i.wallZ-z)<(TYPES[i.type].mountH+t.mountH)/2+4);
    }
    if(item.parentId){
      const parent=items.find(i=>i.id===item.parentId);
      return !!(t?.tabletop&&parent&&parent.id!==item.id&&!parent.parentId&&TYPES[parent.type].surface&&surfaceFits(parent,item)&&item.x===parent.x&&item.y===parent.y&&!items.some(i=>i.id!==item.id&&i.parentId===item.parentId&&surfaceOccupied(parent,item,i)));
    }
    if(!t||!Number.isFinite(item.x)||!Number.isFinite(item.y)||!Number.isSafeInteger(item.x*2)||!Number.isSafeInteger(item.y*2)||item.x<0||item.y<0||!inside(item.x,item.y,layout)||!inside(Math.ceil(item.x+d.w)-1,item.y,layout)||!inside(item.x,Math.ceil(item.y+d.h)-1,layout)||!inside(Math.ceil(item.x+d.w)-1,Math.ceil(item.y+d.h)-1,layout))return false;
    // Check every cell, including concave cutouts and interior wall strips.
    for(let y=Math.floor(item.y);y<Math.ceil(item.y+d.h);y++)for(let x=Math.floor(item.x);x<Math.ceil(item.x+d.w);x++)if(!inside(x,y,layout)||partitionAt(x,y,layout)||stairAccess(x,y,layout)||doorAccess(x,y,layout)||tileHeight(x,y,layout)!==tileHeight(item.x,item.y,layout))return false;
    if(items.some(i=>i.id!==item.id&&!i.parentId&&TYPES[i.type].flat===t.flat&&overlap(i,item)))return false;
    if(!t.flat&&player&&covers(item,Math.floor(player.x),Math.floor(player.y)))return false;
    return true;
  }
  function moveItem(items,item){
    const old=items.find(i=>i.id===item.id);
    if(!old){items.push({...item});return;}
    delete old.parentId;delete old.slot;delete old.surfaceX;delete old.surfaceY;Object.assign(old,item);
    for(const child of items.filter(i=>i.parentId===item.id)){child.x=item.x;child.y=item.y;}
  }
  function removeItem(items,id){return items.filter(i=>i.id!==id&&i.parentId!==id);}
  // Keep the current step; replan only after its endpoint, never backtrack to a tile centre.
  function route(items,player,end,occupied=new Set()){
    const next=player.path?.[0],start=next||player;
    if(next&&occupied.has(Math.floor(next.x)+','+Math.floor(next.y)))return null;
    const tail=pathfind(items,start,end,occupied);
    if(tail===null)return null;
    return next?[{...next},...tail]:tail;
  }
  function seatPlaces(item){const t=TYPES[item.type];return t?.seats||(t?.seat?[t.seat]:[]);}
  function nearestSeat(item,u,v){const places=seatPlaces(item);let best=0,distance=Infinity;places.forEach((s,index)=>{const d=(u-s.u)**2+(v-s.v)**2;if(d<distance){best=index;distance=d;}});return best;}
  function seatApproach(items,player,item,occupied=new Set()){
    const type=TYPES[item.type];if(!type?.seat||item.parentId)return null;const t=dimensions(item);
    let best=null;
    const left=Math.floor(item.x),right=Math.ceil(item.x+t.w),top=Math.floor(item.y),bottom=Math.ceil(item.y+t.h);
    for(let y=top-1;y<=bottom;y++)for(let x=left-1;x<=right;x++){
      const beside=(x>=left&&x<right&&(y===top-1||y===bottom))||(y>=top&&y<bottom&&(x===left-1||x===right));
      if(!beside)continue;
      if(tileHeight(x,y)!==tileHeight(item.x,item.y)||stairAt(x,y))continue;
      const path=route(items,player,{x,y},occupied);
      if(path!==null&&(!best||path.length<best.path.length))best={path,exit:{x:x+.5,y:y+.5}};
    }
    return best;
  }
  function pathfind(items,start,end,occupied=new Set()){
    const sx=Math.floor(start.x),sy=Math.floor(start.y),ex=Math.floor(end.x),ey=Math.floor(end.y);
    if(blocked(items,ex,ey)||occupied.has(ex+','+ey))return null;
    const queue=[[sx,sy]],seen=new Set([sx+','+sy]),prev=new Map();
    for(let k=0;k<queue.length;k++){
      const [x,y]=queue[k];
      if(x===ex&&y===ey){let out=[],key=ex+','+ey;while(key!==sx+','+sy){const [a,b]=key.split(',').map(Number);out.push({x:a+.5,y:b+.5});key=prev.get(key);}return out.reverse();}
      for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1]]){const nx=x+dx,ny=y+dy,key=nx+','+ny;if(!seen.has(key)&&!occupied.has(key)&&canStep(x,y,nx,ny)&&!blocked(items,nx,ny)){seen.add(key);prev.set(key,x+','+y);queue.push([nx,ny]);}}
    }
    return null;
  }
  function findFree(items,preferred={x:6.5,y:7.5},layout=activeLayout){if(!blocked(items,Math.floor(preferred.x),Math.floor(preferred.y),undefined,layout))return {...preferred};const l=layoutFor(layout);for(let y=l.h-1;y>=0;y--)for(let x=l.w-1;x>=0;x--)if(!blocked(items,x,y,undefined,layout))return {x:x+.5,y:y+.5};return null;}
  function cleanName(s){return String(s||'').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,18)||'Vecino';}
  function restore(data){
    if(!data||data.version!==1||!Array.isArray(data.items)||data.items.length>96)return null;
    const valid=(v,max)=>Number.isInteger(v)&&v>=0&&v<max?v:0;
    const layout=layoutFor(data.layout),result={version:1,geometryVersion:2,structureVersion:1,layout:layout.id,wallPattern:valid(data.wallPattern,ENV_COUNTS.wallPattern),floorPattern:valid(data.floorPattern,ENV_COUNTS.floorPattern),name:cleanName(data.name),wall:valid(data.wall,ENV_COUNTS.wall),floor:valid(data.floor,ENV_COUNTS.floor),items:[]};
    const ids=new Set(),legacy=data.geometryVersion!==2,legacyFlips=[],relocate=[],deskSlots=new Set();
    if(data.unplacedItems!==undefined&&(!Array.isArray(data.unplacedItems)||data.items.length+data.unplacedItems.length>96))return null;
    for(const raw of [...data.items].sort((a,b)=>Number(!!a?.parentId)-Number(!!b?.parentId))){
      if(!raw||!Number.isSafeInteger(raw.id)||raw.id<1||ids.has(raw.id)||!Number.isInteger(raw.type)||!TYPES[raw.type])return null;
      const item={id:raw.id,type:raw.type,x:raw.x,y:raw.y,flip:legacy?false:!!raw.flip};
      if(raw.rotation!==undefined){if(!Number.isInteger(raw.rotation)||raw.rotation<0||raw.rotation>3)return null;item.rotation=raw.rotation;item.flip=!!(raw.rotation%2);}
      if(TYPES[item.type].poster&&raw.posterSlot!==undefined){if(!Number.isInteger(raw.posterSlot)||raw.posterSlot<0||raw.posterSlot>4)return null;item.posterSlot=raw.posterSlot;}
      if(TYPES[item.type].finishes&&raw.finish===1)item.finish=1;
      if(TYPES[item.type].interaction==='light'&&typeof raw.on==='boolean')item.on=raw.on;
      if(TYPES[item.type].interaction==='curtain'&&typeof raw.closed==='boolean')item.closed=raw.closed;
      if(TYPES[item.type].wall){item.wallSide=raw.wallSide;item.wallU=raw.wallU;item.wallZ=raw.wallZ;item.x=0;item.y=0;item.flip=false;}
      if(legacy&&raw.flip&&!TYPES[item.type].wall)legacyFlips.push(raw.id);
      if(raw.parentId!==undefined){if(!Number.isSafeInteger(raw.parentId)||raw.parentId<1)return null;item.parentId=raw.parentId;if(raw.slot!==undefined)item.slot=raw.slot;if(raw.surfaceX!==undefined)item.surfaceX=raw.surfaceX;if(raw.surfaceY!==undefined)item.surfaceY=raw.surfaceY;}
      if(item.parentId){const parent=result.items.find(p=>p.id===item.parentId);if(parent){item.x=parent.x;item.y=parent.y;}}
      // v27 allowed two props on the occupied gaming desk. Reserve the rest of
      // the saved room first, then move those props to another surface or floor.
      if(item.parentId&&result.items.find(p=>p.id===item.parentId)?.type===48){
        const key=item.parentId+':'+item.slot;
        if(!TYPES[item.type].tabletop||![0,1].includes(item.slot)||deskSlots.has(key))return null;
        deskSlots.add(key);ids.add(item.id);delete item.parentId;delete item.slot;relocate.push(item);continue;
      }
      if(!canPlace(result.items,item,null,layout)){
        const d=dimensions(item),migrating=data.structureVersion!==1&&!TYPES[item.type].wall&&Number.isInteger(item.x)&&Number.isInteger(item.y)&&inside(item.x,item.y,layout)&&inside(item.x+d.w-1,item.y+d.h-1,layout);
        let touched=false;if(migrating)for(let y=item.y;y<item.y+d.h;y++)for(let x=item.x;x<item.x+d.w;x++)if(newBarrier(x,y,layout))touched=true;
        if(!touched&&!(migrating&&item.parentId&&relocate.some(p=>p.id===item.parentId)))return null;
        ids.add(item.id);relocate.push(item);continue;
      }
      ids.add(item.id);result.items.push(item);
    }
    for(const raw of data.unplacedItems||[]){
      if(!raw||!Number.isSafeInteger(raw.id)||raw.id<1||ids.has(raw.id)||!Number.isInteger(raw.type)||!TYPES[raw.type]||!Number.isFinite(raw.x)||!Number.isFinite(raw.y)||!Number.isSafeInteger(raw.x*2)||!Number.isSafeInteger(raw.y*2))return null;
      const item={id:raw.id,type:raw.type,x:raw.x,y:raw.y,flip:!!raw.flip};
      if(raw.rotation!==undefined){if(!Number.isInteger(raw.rotation)||raw.rotation<0||raw.rotation>3)return null;item.rotation=raw.rotation;item.flip=!!(raw.rotation%2);}
      if(TYPES[item.type].poster&&raw.posterSlot!==undefined){if(!Number.isInteger(raw.posterSlot)||raw.posterSlot<0||raw.posterSlot>4)return null;item.posterSlot=raw.posterSlot;}
      if(TYPES[item.type].finishes&&raw.finish===1)item.finish=1;
      if(TYPES[item.type].interaction==='light'&&typeof raw.on==='boolean')item.on=raw.on;
      if(TYPES[item.type].interaction==='curtain'&&typeof raw.closed==='boolean')item.closed=raw.closed;
      if(TYPES[item.type].wall){item.wallSide=raw.wallSide;item.wallU=raw.wallU;item.wallZ=raw.wallZ;item.x=0;item.y=0;item.flip=false;}
      ids.add(item.id);relocate.push(item);
    }
    // Reserve every old footprint before rotating legacy mirrors, so a moved
    // object can never steal a later object's place or discard a saved room.
    for(const id of legacyFlips){
      const item=result.items.find(i=>i.id===id),rotated={...item,flip:true};
      if(canPlace(result.items,rotated,null,layout)){moveItem(result.items,rotated);continue;}
      const cells=[];for(let y=0;y<layout.h;y++)for(let x=0;x<layout.w;x++)cells.push({x,y});
      cells.sort((a,b)=>Math.abs(a.x-item.x)+Math.abs(a.y-item.y)-Math.abs(b.x-item.x)-Math.abs(b.y-item.y));
      const cell=cells.find(c=>canPlace(result.items,{...rotated,...c},null,layout));
      if(cell)moveItem(result.items,{...rotated,...cell});
      // A completely packed room keeps the original position and orientation.
    }
    if(relocate.length){const packed=reflow({...result,items:[...result.items,...relocate]},layout.id,true);result.items=packed.items;if(packed.unplacedItems?.length)result.unplacedItems=packed.unplacedItems;}
    if(!findFree(result.items,undefined,layout))return null;
    return result;
  }
  // Repack a room without dropping IDs, finishes or supported children.
  function reflow(source,layoutId,keepValid=false){
    const l=layoutFor(layoutId),out={...source,layout:l.id,structureVersion:1,items:[]},reserve=[];
    delete out.unplacedItems;
    const rows=[...source.items,...(source.unplacedItems||[])].map(i=>({...i}));
    rows.sort((a,b)=>Number(!!a.parentId)-Number(!!b.parentId)||Number(!!TYPES[a.type].wall)-Number(!!TYPES[b.type].wall)||dimensions(b).w*dimensions(b).h-dimensions(a).w*dimensions(a).h);
    const connected=list=>{const free=new Set();for(let y=0;y<l.h;y++)for(let x=0;x<l.w;x++)if(!blocked(list,x,y,null,l))free.add(x+','+y);if(!free.size)return false;const q=[free.values().next().value];free.delete(q[0]);for(let j=0;j<q.length;j++){const [x,y]=q[j].split(',').map(Number);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const key=(x+dx)+','+(y+dy);if(canStep(x,y,x+dx,y+dy,l)&&free.delete(key))q.push(key);}}return !free.size;};
    for(const raw of rows){const t=TYPES[raw.type],candidates=[];
      if(canPlace(out.items,raw,null,l))candidates.push(raw);
      if(raw.parentId&&out.items.some(p=>p.id===raw.parentId)){const p=out.items.find(p=>p.id===raw.parentId);candidates.push({...raw,x:p.x,y:p.y});}
      const clean={...raw};delete clean.parentId;delete clean.slot;delete clean.surfaceX;delete clean.surfaceY;
      if(t.wall){for(const side of [raw.wallSide||'left',(raw.wallSide||'left')==='left'?'right':'left'])for(const z of [raw.wallZ||90,90,50,120])for(let u=t.width/64+.2;u<wallSpan(side,l)-t.width/64-.2;u+=.25)candidates.push({...clean,x:0,y:0,flip:false,wallSide:side,wallU:u,wallZ:z});}
      else{
        if(t.tabletop)for(const p of out.items.filter(p=>!p.parentId&&TYPES[p.type].surface))for(const spot of surfaceGrid(p))candidates.push({...clean,x:p.x,y:p.y,parentId:p.id,...spot});
        const floor=[];for(let y=0;y<l.h;y++)for(let x=0;x<l.w;x++)floor.push({...clean,x,y});floor.sort((a,b)=>Math.abs(a.x-raw.x)+Math.abs(a.y-raw.y)-Math.abs(b.x-raw.x)-Math.abs(b.y-raw.y));candidates.push(...floor);
      }
      const chosen=candidates.find(i=>canPlace(out.items,i,null,l)&&(keepValid&&i===raw||i.parentId||t.wall||t.flat||connected([...out.items,i])));
      if(chosen)out.items.push(chosen);else reserve.push(clean);
    }
    if(reserve.length)out.unplacedItems=reserve;return out;
  }
  const api={surfaceOffset,surfaceUV,surfaceGrid,surfaceLocal,surfaceOccupied,SIZE,ENV_COUNTS,LAYOUTS,layoutFor,setLayout,room,inside,stairAt,stairAccess,doorAccess,reflow,tileHeight,walkHeight,wallHeight,maxHeight,canStep,partitionCells,partitionAt,wallSpan,rotation,dimensions,TYPES,initial,covers,blocked,overlap,canPlace,pathfind,route,seatPlaces,nearestSeat,seatApproach,moveItem,removeItem,findFree,cleanName,restore};
  root.VeredaCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);

(function(root){
  'use strict';
  const LIMIT=20;
  const choices={face:['Sonrisa','Pecas','Anteojos','Risa','Lentes oscuros','Bigote','Barba corta'],hair:['Despeinado café','Melena cobriza','Rulos negros','Colita rubia','Corto plateado','Ondas ciruela','Pixie menta','Melena tinta','Ondas durazno','Gorra Oliva','Gorro Ciruela','Trenzas Café','Corto Azul'],top:['Buzo salvia','Remera lila','Campera ladrillo','Camisa cielo','Campera Club','Remera Rayas','Remera Noche','Chaleco Arena','Tejido Mostaza','Buzo Laguna','Campera Invierno','Buzo Asimétrico','Buzo Cruces','Musculosa Negra','Buzo Crema','Buzo Bordó','Vestido Margarita','Vestido Noche','Vestido Denim'],bottom:['Jean azul','Pantalón carbón','Pantalón arena','Baggy Negro','Jean Cruces','Jean lavado','Pantalón oliva','Pantalón vino','Pantalón crema'],shoes:['Zapatillas crema','Botas miel','Botas café','Altas con tira','Altas bicolor','Botas crema','Lona y cordones'],accessory:['Sin cadena','Cadena cubana','Cubana dorada','Estrella de plata','Perlas'],back:['Sin accesorio','Mochila Paseo','Guitarra Viajera','AK sin culata','Bat de béisbol','Espada Errante','Rifle de precisión','Skate Rayo'],pet:['Sin mascota','Gatito Miga','Perrito Churro','Gatito Gris','Gatito Esmoquin','Perrito Chocolate','Perrito Manchas']};
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
  
})(typeof window!=='undefined'?window:globalThis);

(function(root){
 'use strict';
 const KEY='minerhub.rewards.demo.v1';
 const slots=['hair','face','top','bottom','shoes','accessory','back','pet'];
 function catalog(C,P,environment=[]){return [
  ...C.TYPES.map((t,type)=>({id:'object:'+type,kind:'object',type,name:t.name,...(t.plantation?{plantation:true,rarity:t.rarity}:{})})),
  ...slots.flatMap(slot=>P.choices[slot].map((name,index)=>({id:'look:'+slot+':'+index,kind:'character',slot,index,name,starter:index===0||slot==='hair'&&index===1})).filter(i=>!(['accessory','back','pet'].includes(slot)&&i.index===0))),
  ...environment.flatMap(({key,label,options})=>options.map((option,index)=>({id:'environment:'+key+':'+index,kind:'environment',slot:key,index,value:option.id??index,name:label+' · '+option.name,starter:index===0})))
 ];}
 function poolFor(catalog,kind){return catalog.filter(i=>!i.starter&&(kind==='plantation'?i.plantation:i.kind===kind&&!i.plantation));}
 function randomIndex(length,random=Math.random){const r=random();if(!Number.isFinite(r)||r<0||r>=1)throw new Error('Sorteo inválido.');return Math.floor(r*length);}
 function secureRandom(){if(root.crypto?.getRandomValues){const n=new Uint32Array(1);root.crypto.getRandomValues(n);return n[0]/4294967296;}return Math.random();}
 // Pending prizes also count as collected, so saving boxes cannot reroll the
 // same first item. When both groups exist, a new item has a 98% chance.
 function draw(pool,collected,random=secureRandom){
  if(!pool.length)throw new Error('Caja desconocida.');
  const fresh=pool.filter(i=>!collected.has(i.id)),repeat=pool.filter(i=>collected.has(i.id));
  const candidates=fresh.length&&repeat.length?(randomIndex(100,random)<98?fresh:repeat):fresh.length?fresh:repeat;
  return candidates[randomIndex(candidates.length,random)];
 }
 function create({catalog,storage,random=secureRandom}){
  const byId=new Map(catalog.map(i=>[i.id,i]));let data={version:1,receipts:[]};
  const saved=storage.getItem(KEY);
  function valid(r){return r&&typeof r.id==='string'&&r.id.length>0&&r.id.length<=150&&typeof r.userId==='string'&&r.userId.length>0&&r.userId.length<=100&&['object','character','environment'].includes(r.kind)&&byId.get(r.itemId)?.kind===r.kind&&typeof r.opened==='boolean';}
  if(saved){const parsed=JSON.parse(saved);if(parsed?.version!==1||!Array.isArray(parsed.receipts)||!parsed.receipts.every(valid)||new Set(parsed.receipts.map(r=>r.id)).size!==parsed.receipts.length)throw new Error('No se pudo leer el inventario de prueba. Se conservó el guardado original.');data=parsed;}
  const copy=v=>JSON.parse(JSON.stringify(v));
  function commit(next){storage.setItem(KEY,JSON.stringify(next));data=next;}
  return {
   // Local demo ledger, NOT a trusted Kick webhook endpoint. Production must
   // authenticate the event and perform the random draw/transaction server-side.
   grant({id,userId,kind,status}){
    if(status!=='accepted')return null;
    if(typeof id!=='string'||!id||id.length>150||typeof userId!=='string'||!userId||userId.length>100)throw new Error('Canje inválido.');
    const old=data.receipts.find(r=>r.id===id);if(old){if(old.userId!==userId||old.kind!==kind)throw new Error('El canje ya corresponde a otra entrega.');return copy(old);}
    const pool=catalog.filter(i=>i.kind===kind&&!i.starter);if(!pool.length)throw new Error('Caja desconocida.');
    const collected=new Set(data.receipts.filter(r=>r.userId===userId).map(r=>r.itemId));
    const receipt={id,userId,kind,itemId:draw(pool,collected,random).id,opened:false};
    commit({...data,receipts:[...data.receipts,receipt]});return copy(receipt);
   },
   open(id,userId){const r=data.receipts.find(r=>r.id===id&&r.userId===userId);if(!r)throw new Error('Esta caja no pertenece al jugador.');if(!r.opened)commit({...data,receipts:data.receipts.map(i=>i.id===id?{...i,opened:true}:i)});return copy({...r,opened:true});},
   pending:(userId,kind)=>copy(data.receipts.filter(r=>r.userId===userId&&!r.opened&&(!kind||r.kind===kind))),
   // Starter ownership is deterministic: no duplicate grants on reload/rename.
   owns:(userId,id)=>!!byId.get(id)?.starter||data.receipts.some(r=>r.userId===userId&&r.itemId===id&&r.opened),
   inventory(userId){const counts=new Map(catalog.filter(i=>i.starter).map(i=>[i.id,1]));for(const r of data.receipts)if(r.userId===userId&&r.opened)counts.set(r.itemId,(counts.get(r.itemId)||0)+1);return [...counts].map(([id,count])=>({...byId.get(id),count}));},
   receipts:()=>copy(data.receipts),item:id=>byId.get(id)
  };
 }
 const api={KEY,catalog,poolFor,create,randomIndex,draw};root.VeredaRewards=api;
})(typeof window!=='undefined'?window:globalThis);

export const C=globalThis.VeredaCore,P=globalThis.VeredaPeople,R=globalThis.VeredaRewards;
export const CATALOG=[{"id":"object:0","kind":"object","type":0,"name":"Sofá Salvia"},{"id":"object:1","kind":"object","type":1,"name":"Sillón Miel"},{"id":"object:2","kind":"object","type":2,"name":"Mesa Domingo"},{"id":"object:3","kind":"object","type":3,"name":"Monstera"},{"id":"object:4","kind":"object","type":4,"name":"Biblioteca Nido"},{"id":"object:5","kind":"object","type":5,"name":"Lámpara Alba"},{"id":"object:6","kind":"object","type":6,"name":"Aparador Bosque"},{"id":"object:7","kind":"object","type":7,"name":"Almohadón Sol"},{"id":"object:8","kind":"object","type":8,"name":"Alfombra Raíz"},{"id":"object:9","kind":"object","type":9,"name":"Mesa de café"},{"id":"object:10","kind":"object","type":10,"name":"Helecho"},{"id":"object:11","kind":"object","type":11,"name":"Banquito Roble"},{"id":"object:12","kind":"object","type":12,"name":"Cama Siesta"},{"id":"object:13","kind":"object","type":13,"name":"Tocadiscos"},{"id":"object:14","kind":"object","type":14,"name":"Lectura y café"},{"id":"object:15","kind":"object","type":15,"name":"Lavanda"},{"id":"object:16","kind":"object","type":16,"name":"Escritorio Roble"},{"id":"object:17","kind":"object","type":17,"name":"Sillón Mimbre"},{"id":"object:18","kind":"object","type":18,"name":"Puf Coral"},{"id":"object:19","kind":"object","type":19,"name":"Vinilero Sur"},{"id":"object:20","kind":"object","type":20,"name":"Jardín de vidrio"},{"id":"object:21","kind":"object","type":21,"name":"Farol Lucero"},{"id":"object:22","kind":"object","type":22,"name":"Banco Encuentro"},{"id":"object:23","kind":"object","type":23,"name":"Mesita Nogal"},{"id":"object:24","kind":"object","type":24,"name":"Radio Menta"},{"id":"object:25","kind":"object","type":25,"name":"Cactus Flor"},{"id":"object:26","kind":"object","type":26,"name":"Ventana Barrio"},{"id":"object:27","kind":"object","type":27,"name":"Cuadro Sierra"},{"id":"object:28","kind":"object","type":28,"name":"Lámina Helecho"},{"id":"object:29","kind":"object","type":29,"name":"Reloj Tarde"},{"id":"object:30","kind":"object","type":30,"name":"Estante Brote"},{"id":"object:31","kind":"object","type":31,"name":"Espejo Óvalo"},{"id":"object:32","kind":"object","type":32,"name":"Pecera Calma"},{"id":"object:33","kind":"object","type":33,"name":"Bonsái Brisa"},{"id":"object:34","kind":"object","type":34,"name":"Baúl Tesoro"},{"id":"object:35","kind":"object","type":35,"name":"Carrito Café"},{"id":"object:36","kind":"object","type":36,"name":"Arcade Recreo"},{"id":"object:37","kind":"object","type":37,"name":"Barra Cafecito"},{"id":"object:38","kind":"object","type":38,"name":"Caballete Color"},{"id":"object:39","kind":"object","type":39,"name":"Canasto Abrigo"},{"id":"object:40","kind":"object","type":40,"name":"Heladera Crema"},{"id":"object:41","kind":"object","type":41,"name":"Cocina Oliva"},{"id":"object:42","kind":"object","type":42,"name":"Perchero Paseo"},{"id":"object:43","kind":"object","type":43,"name":"Tele Retro"},{"id":"object:44","kind":"object","type":44,"name":"Guitarra Fogón"},{"id":"object:45","kind":"object","type":45,"name":"Carrito Pochoclos"},{"id":"object:46","kind":"object","type":46,"name":"Galletitas de casa"},{"id":"object:47","kind":"object","type":47,"name":"Gatito de peluche"},{"id":"object:48","kind":"object","type":48,"name":"Escritorio Stream"},{"id":"object:49","kind":"object","type":49,"name":"Silla Gamer"},{"id":"object:50","kind":"object","type":50,"name":"Torre RGB"},{"id":"object:51","kind":"object","type":51,"name":"Micrófono Podcast"},{"id":"object:52","kind":"object","type":52,"name":"Cámara Stream"},{"id":"object:53","kind":"object","type":53,"name":"Aro de Luz"},{"id":"object:54","kind":"object","type":54,"name":"Consola Recreo"},{"id":"object:55","kind":"object","type":55,"name":"Auriculares Estudio"},{"id":"object:56","kind":"object","type":56,"name":"Panel Acústico"},{"id":"object:57","kind":"object","type":57,"name":"Neón Play"},{"id":"object:58","kind":"object","type":58,"name":"Estante Geek"},{"id":"object:59","kind":"object","type":59,"name":"Cuadro Pixel"},{"id":"object:60","kind":"object","type":60,"name":"Mesa Auxiliar Estudio"},{"id":"object:61","kind":"object","type":61,"name":"Parlante Estudio"},{"id":"object:62","kind":"object","type":62,"name":"Panel Hexágonos"},{"id":"object:63","kind":"object","type":63,"name":"Cuadro Cassette"},{"id":"object:64","kind":"object","type":64,"name":"Ventana Ciudad"},{"id":"object:65","kind":"object","type":65,"name":"Ventana Lluvia"},{"id":"object:66","kind":"object","type":66,"name":"Ventana Lago"},{"id":"object:67","kind":"object","type":67,"name":"Estante Dino"},{"id":"object:68","kind":"object","type":68,"name":"Organizador Estudio"},{"id":"object:69","kind":"object","type":69,"name":"Mini Expendedora"},{"id":"object:70","kind":"object","type":70,"name":"Puf Luna"},{"id":"object:71","kind":"object","type":71,"name":"Pinball Órbita"},{"id":"object:72","kind":"object","type":72,"name":"Mesa DJ"},{"id":"object:73","kind":"object","type":73,"name":"Rascador Mimo"},{"id":"object:74","kind":"object","type":74,"name":"Cama Nube"},{"id":"object:75","kind":"object","type":75,"name":"Estante Vinilos"},{"id":"object:76","kind":"object","type":76,"name":"Cuadro Lunar"},{"id":"object:77","kind":"object","type":77,"name":"Cafetera Crema"},{"id":"object:78","kind":"object","type":78,"name":"Globo Viajero"},{"id":"object:79","kind":"object","type":79,"name":"Ruleta"},{"id":"object:80","kind":"object","type":80,"name":"Póster personal · Cuadrado"},{"id":"object:81","kind":"object","type":81,"name":"Póster personal · Horizontal"},{"id":"object:82","kind":"object","type":82,"name":"Póster personal · Vertical"},{"id":"object:83","kind":"object","type":83,"name":"Máquina de intercambio"},{"id":"object:84","kind":"object","type":84,"name":"Monitor Panorámico"},{"id":"object:85","kind":"object","type":85,"name":"Monitor Vertical Crema"},{"id":"object:86","kind":"object","type":86,"name":"Tele Cine"},{"id":"object:87","kind":"object","type":87,"name":"Tele Plasma Pared"},{"id":"object:88","kind":"object","type":88,"name":"Mesa Taller"},{"id":"object:89","kind":"object","type":89,"name":"Lámpara Luna"},{"id":"object:90","kind":"object","type":90,"name":"Girasol","plantation":true,"rarity":"Común"},{"id":"object:91","kind":"object","type":91,"name":"Rosa","plantation":true,"rarity":"Rara"},{"id":"object:92","kind":"object","type":92,"name":"Cannabis Dorada","plantation":true,"rarity":"Épica"},{"id":"look:hair:0","kind":"character","slot":"hair","index":0,"name":"Despeinado café","starter":true},{"id":"look:hair:1","kind":"character","slot":"hair","index":1,"name":"Melena cobriza","starter":true},{"id":"look:hair:2","kind":"character","slot":"hair","index":2,"name":"Rulos negros","starter":false},{"id":"look:hair:3","kind":"character","slot":"hair","index":3,"name":"Colita rubia","starter":false},{"id":"look:hair:4","kind":"character","slot":"hair","index":4,"name":"Corto plateado","starter":false},{"id":"look:hair:5","kind":"character","slot":"hair","index":5,"name":"Ondas ciruela","starter":false},{"id":"look:hair:6","kind":"character","slot":"hair","index":6,"name":"Pixie menta","starter":false},{"id":"look:hair:7","kind":"character","slot":"hair","index":7,"name":"Melena tinta","starter":false},{"id":"look:hair:8","kind":"character","slot":"hair","index":8,"name":"Ondas durazno","starter":false},{"id":"look:hair:9","kind":"character","slot":"hair","index":9,"name":"Gorra Oliva","starter":false},{"id":"look:hair:10","kind":"character","slot":"hair","index":10,"name":"Gorro Ciruela","starter":false},{"id":"look:hair:11","kind":"character","slot":"hair","index":11,"name":"Trenzas Café","starter":false},{"id":"look:hair:12","kind":"character","slot":"hair","index":12,"name":"Corto Azul","starter":false},{"id":"look:face:0","kind":"character","slot":"face","index":0,"name":"Sonrisa","starter":true},{"id":"look:face:1","kind":"character","slot":"face","index":1,"name":"Pecas","starter":false},{"id":"look:face:2","kind":"character","slot":"face","index":2,"name":"Anteojos","starter":false},{"id":"look:face:3","kind":"character","slot":"face","index":3,"name":"Risa","starter":false},{"id":"look:face:4","kind":"character","slot":"face","index":4,"name":"Lentes oscuros","starter":false},{"id":"look:face:5","kind":"character","slot":"face","index":5,"name":"Bigote","starter":false},{"id":"look:face:6","kind":"character","slot":"face","index":6,"name":"Barba corta","starter":false},{"id":"look:top:0","kind":"character","slot":"top","index":0,"name":"Buzo salvia","starter":true},{"id":"look:top:1","kind":"character","slot":"top","index":1,"name":"Remera lila","starter":false},{"id":"look:top:2","kind":"character","slot":"top","index":2,"name":"Campera ladrillo","starter":false},{"id":"look:top:3","kind":"character","slot":"top","index":3,"name":"Camisa cielo","starter":false},{"id":"look:top:4","kind":"character","slot":"top","index":4,"name":"Campera Club","starter":false},{"id":"look:top:5","kind":"character","slot":"top","index":5,"name":"Remera Rayas","starter":false},{"id":"look:top:6","kind":"character","slot":"top","index":6,"name":"Remera Noche","starter":false},{"id":"look:top:7","kind":"character","slot":"top","index":7,"name":"Chaleco Arena","starter":false},{"id":"look:top:8","kind":"character","slot":"top","index":8,"name":"Tejido Mostaza","starter":false},{"id":"look:top:9","kind":"character","slot":"top","index":9,"name":"Buzo Laguna","starter":false},{"id":"look:top:10","kind":"character","slot":"top","index":10,"name":"Campera Invierno","starter":false},{"id":"look:top:11","kind":"character","slot":"top","index":11,"name":"Buzo Asimétrico","starter":false},{"id":"look:top:12","kind":"character","slot":"top","index":12,"name":"Buzo Cruces","starter":false},{"id":"look:top:13","kind":"character","slot":"top","index":13,"name":"Musculosa Negra","starter":false},{"id":"look:top:14","kind":"character","slot":"top","index":14,"name":"Buzo Crema","starter":false},{"id":"look:top:15","kind":"character","slot":"top","index":15,"name":"Buzo Bordó","starter":false},{"id":"look:top:16","kind":"character","slot":"top","index":16,"name":"Vestido Margarita","starter":false},{"id":"look:top:17","kind":"character","slot":"top","index":17,"name":"Vestido Noche","starter":false},{"id":"look:top:18","kind":"character","slot":"top","index":18,"name":"Vestido Denim","starter":false},{"id":"look:bottom:0","kind":"character","slot":"bottom","index":0,"name":"Jean azul","starter":true},{"id":"look:bottom:1","kind":"character","slot":"bottom","index":1,"name":"Pantalón carbón","starter":false},{"id":"look:bottom:2","kind":"character","slot":"bottom","index":2,"name":"Pantalón arena","starter":false},{"id":"look:bottom:3","kind":"character","slot":"bottom","index":3,"name":"Baggy Negro","starter":false},{"id":"look:bottom:4","kind":"character","slot":"bottom","index":4,"name":"Jean Cruces","starter":false},{"id":"look:bottom:5","kind":"character","slot":"bottom","index":5,"name":"Jean lavado","starter":false},{"id":"look:bottom:6","kind":"character","slot":"bottom","index":6,"name":"Pantalón oliva","starter":false},{"id":"look:bottom:7","kind":"character","slot":"bottom","index":7,"name":"Pantalón vino","starter":false},{"id":"look:bottom:8","kind":"character","slot":"bottom","index":8,"name":"Pantalón crema","starter":false},{"id":"look:shoes:0","kind":"character","slot":"shoes","index":0,"name":"Zapatillas crema","starter":true},{"id":"look:shoes:1","kind":"character","slot":"shoes","index":1,"name":"Botas miel","starter":false},{"id":"look:shoes:2","kind":"character","slot":"shoes","index":2,"name":"Botas café","starter":false},{"id":"look:shoes:3","kind":"character","slot":"shoes","index":3,"name":"Altas con tira","starter":false},{"id":"look:shoes:4","kind":"character","slot":"shoes","index":4,"name":"Altas bicolor","starter":false},{"id":"look:shoes:5","kind":"character","slot":"shoes","index":5,"name":"Botas crema","starter":false},{"id":"look:shoes:6","kind":"character","slot":"shoes","index":6,"name":"Lona y cordones","starter":false},{"id":"look:accessory:1","kind":"character","slot":"accessory","index":1,"name":"Cadena cubana","starter":false},{"id":"look:accessory:2","kind":"character","slot":"accessory","index":2,"name":"Cubana dorada","starter":false},{"id":"look:accessory:3","kind":"character","slot":"accessory","index":3,"name":"Estrella de plata","starter":false},{"id":"look:accessory:4","kind":"character","slot":"accessory","index":4,"name":"Perlas","starter":false},{"id":"look:back:1","kind":"character","slot":"back","index":1,"name":"Mochila Paseo","starter":false},{"id":"look:back:2","kind":"character","slot":"back","index":2,"name":"Guitarra Viajera","starter":false},{"id":"look:back:3","kind":"character","slot":"back","index":3,"name":"AK sin culata","starter":false},{"id":"look:back:4","kind":"character","slot":"back","index":4,"name":"Bat de béisbol","starter":false},{"id":"look:back:5","kind":"character","slot":"back","index":5,"name":"Espada Errante","starter":false},{"id":"look:back:6","kind":"character","slot":"back","index":6,"name":"Rifle de precisión","starter":false},{"id":"look:back:7","kind":"character","slot":"back","index":7,"name":"Skate Rayo","starter":false},{"id":"look:pet:1","kind":"character","slot":"pet","index":1,"name":"Gatito Miga","starter":false},{"id":"look:pet:2","kind":"character","slot":"pet","index":2,"name":"Perrito Churro","starter":false},{"id":"look:pet:3","kind":"character","slot":"pet","index":3,"name":"Gatito Gris","starter":false},{"id":"look:pet:4","kind":"character","slot":"pet","index":4,"name":"Gatito Esmoquin","starter":false},{"id":"look:pet:5","kind":"character","slot":"pet","index":5,"name":"Perrito Chocolate","starter":false},{"id":"look:pet:6","kind":"character","slot":"pet","index":6,"name":"Perrito Manchas","starter":false},{"id":"environment:wall:0","kind":"environment","slot":"wall","index":0,"value":0,"name":"Pared · Salvia","starter":true},{"id":"environment:wall:1","kind":"environment","slot":"wall","index":1,"value":1,"name":"Pared · Durazno","starter":false},{"id":"environment:wall:2","kind":"environment","slot":"wall","index":2,"value":2,"name":"Pared · Lavanda","starter":false},{"id":"environment:wall:3","kind":"environment","slot":"wall","index":3,"value":3,"name":"Pared · Azul bruma","starter":false},{"id":"environment:wall:4","kind":"environment","slot":"wall","index":4,"value":4,"name":"Pared · Crema","starter":false},{"id":"environment:wall:5","kind":"environment","slot":"wall","index":5,"value":5,"name":"Pared · Rosa té","starter":false},{"id":"environment:wall:6","kind":"environment","slot":"wall","index":6,"value":6,"name":"Pared · Grafito","starter":false},{"id":"environment:wall:7","kind":"environment","slot":"wall","index":7,"value":7,"name":"Pared · Bosque","starter":false},{"id":"environment:wall:8","kind":"environment","slot":"wall","index":8,"value":8,"name":"Pared · Terracota","starter":false},{"id":"environment:wall:9","kind":"environment","slot":"wall","index":9,"value":9,"name":"Pared · Azul noche","starter":false},{"id":"environment:wall:10","kind":"environment","slot":"wall","index":10,"value":10,"name":"Pared · Petróleo","starter":false},{"id":"environment:wall:11","kind":"environment","slot":"wall","index":11,"value":11,"name":"Pared · Cielo","starter":false},{"id":"environment:wall:12","kind":"environment","slot":"wall","index":12,"value":12,"name":"Pared · Lila","starter":false},{"id":"environment:wall:13","kind":"environment","slot":"wall","index":13,"value":13,"name":"Pared · Borgoña","starter":false},{"id":"environment:wall:14","kind":"environment","slot":"wall","index":14,"value":14,"name":"Pared · Blanco tiza","starter":false},{"id":"environment:wall:15","kind":"environment","slot":"wall","index":15,"value":15,"name":"Pared · Gris perla","starter":false},{"id":"environment:floor:0","kind":"environment","slot":"floor","index":0,"value":0,"name":"Piso · Roble cálido","starter":true},{"id":"environment:floor:1","kind":"environment","slot":"floor","index":1,"value":1,"name":"Piso · Madera clara","starter":false},{"id":"environment:floor:2","kind":"environment","slot":"floor","index":2,"value":2,"name":"Piso · Nogal","starter":false},{"id":"environment:floor:3","kind":"environment","slot":"floor","index":3,"value":3,"name":"Piso · Cerezo","starter":false},{"id":"environment:floor:4","kind":"environment","slot":"floor","index":4,"value":4,"name":"Piso · Gris niebla","starter":false},{"id":"environment:floor:5","kind":"environment","slot":"floor","index":5,"value":5,"name":"Piso · Piedra crema","starter":false},{"id":"environment:floor:6","kind":"environment","slot":"floor","index":6,"value":6,"name":"Piso · Carbón","starter":false},{"id":"environment:floor:7","kind":"environment","slot":"floor","index":7,"value":7,"name":"Piso · Blanco lavado","starter":false},{"id":"environment:floor:8","kind":"environment","slot":"floor","index":8,"value":8,"name":"Piso · Arcilla","starter":false},{"id":"environment:floor:9","kind":"environment","slot":"floor","index":9,"value":9,"name":"Piso · Verde piedra","starter":false},{"id":"environment:floor:10","kind":"environment","slot":"floor","index":10,"value":10,"name":"Piso · Azul pizarra","starter":false},{"id":"environment:floor:11","kind":"environment","slot":"floor","index":11,"value":11,"name":"Piso · Malva","starter":false},{"id":"environment:wallPattern:0","kind":"environment","slot":"wallPattern","index":0,"value":0,"name":"Diseño de pared · Paneles de madera","starter":true},{"id":"environment:wallPattern:1","kind":"environment","slot":"wallPattern","index":1,"value":1,"name":"Diseño de pared · Liso","starter":false},{"id":"environment:wallPattern:2","kind":"environment","slot":"wallPattern","index":2,"value":2,"name":"Diseño de pared · Papel a rayas","starter":false},{"id":"environment:wallPattern:3","kind":"environment","slot":"wallPattern","index":3,"value":3,"name":"Diseño de pared · Ladrillos","starter":false},{"id":"environment:wallPattern:4","kind":"environment","slot":"wallPattern","index":4,"value":4,"name":"Diseño de pared · Rombos","starter":false},{"id":"environment:wallPattern:5","kind":"environment","slot":"wallPattern","index":5,"value":5,"name":"Diseño de pared · Dos tonos","starter":false},{"id":"environment:floorPattern:0","kind":"environment","slot":"floorPattern","index":0,"value":0,"name":"Diseño de piso · Parquet fino","starter":true},{"id":"environment:floorPattern:1","kind":"environment","slot":"floorPattern","index":1,"value":1,"name":"Diseño de piso · Tablones anchos","starter":false},{"id":"environment:floorPattern:2","kind":"environment","slot":"floorPattern","index":2,"value":2,"name":"Diseño de piso · Damero","starter":false},{"id":"environment:floorPattern:3","kind":"environment","slot":"floorPattern","index":3,"value":3,"name":"Diseño de piso · Baldosas","starter":false},{"id":"environment:floorPattern:4","kind":"environment","slot":"floorPattern","index":4,"value":4,"name":"Diseño de piso · Parquet entrelazado","starter":false},{"id":"environment:floorPattern:5","kind":"environment","slot":"floorPattern","index":5,"value":5,"name":"Diseño de piso · Mosaico","starter":false},{"id":"environment:floorPattern:6","kind":"environment","slot":"floorPattern","index":6,"value":6,"name":"Diseño de piso · Terrazo","starter":false},{"id":"environment:layout:0","kind":"environment","slot":"layout","index":0,"value":"square","name":"Sala · Cuadrada · 12 × 12","starter":true},{"id":"environment:layout:1","kind":"environment","slot":"layout","index":1,"value":"wide","name":"Sala · Ancha · 16 × 12","starter":false},{"id":"environment:layout:2","kind":"environment","slot":"layout","index":2,"value":"tall","name":"Sala · Alargada · 12 × 16","starter":false},{"id":"environment:layout:3","kind":"environment","slot":"layout","index":3,"value":"large","name":"Sala · Amplia · 16 × 16","starter":false},{"id":"environment:layout:4","kind":"environment","slot":"layout","index":4,"value":"ell","name":"Sala · En L · 16 × 16","starter":false},{"id":"environment:layout:5","kind":"environment","slot":"layout","index":5,"value":"loft","name":"Sala · Loft · 20 × 16","starter":false},{"id":"environment:layout:6","kind":"environment","slot":"layout","index":6,"value":"hall","name":"Sala · Salón · 24 × 18","starter":false},{"id":"environment:layout:7","kind":"environment","slot":"layout","index":7,"value":"tee","name":"Sala · En T · 24 × 22","starter":false},{"id":"environment:layout:8","kind":"environment","slot":"layout","index":8,"value":"courtyard","name":"Sala · En U · 24 × 20","starter":false},{"id":"environment:layout:9","kind":"environment","slot":"layout","index":9,"value":"steps","name":"Sala · Escalonada · 24 × 20","starter":false},{"id":"environment:layout:10","kind":"environment","slot":"layout","index":10,"value":"duplex","name":"Sala · Dos ambientes · 24 × 18","starter":false},{"id":"environment:layout:11","kind":"environment","slot":"layout","index":11,"value":"suite","name":"Sala · Tres ambientes · 24 × 20","starter":false},{"id":"environment:layout:12","kind":"environment","slot":"layout","index":12,"value":"terrace","name":"Sala · Tarima · 28 × 22","starter":false},{"id":"environment:layout:13","kind":"environment","slot":"layout","index":13,"value":"gallery","name":"Sala · Ala elevada · 28 × 24","starter":false},{"id":"environment:layout:14","kind":"environment","slot":"layout","index":14,"value":"grand","name":"Sala · Tres niveles · 32 × 28","starter":false}];
