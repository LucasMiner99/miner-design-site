(function(root){
  'use strict';
  const SIZE=12;
  const MAX_ITEMS=128;
  const ENV_COUNTS=Object.freeze({wall:17,floor:13,wallPattern:12,floorPattern:13,led:2});
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

  // Mount coordinates share the exact visible face used by the partition renderer.
  // Interior IDs refer to solid wall segments, never door openings.
  function wallSurface(id,layout=activeLayout){
    const l=layoutFor(layout);
    if(id==='left'||id==='right')return {id,side:id,start:0,end:wallSpan(id,l),fixed:0,index:-1};
    if(typeof id!=='string'||!/^inner:(0|[1-9]\d*)$/.test(id))return null;
    const index=Number(id.slice(6)),b=l.partitions?.[index];if(!b)return null;
    const vertical=b.h>1,side=vertical?'left':'right',z=tileHeight(b.x,b.y,l),edge=z>tileHeight(b.x+(vertical?1:0),b.y+(vertical?0:1),l);
    return {id,side,index,start:vertical?b.y:b.x,end:vertical?b.y+b.h:b.x+b.w,fixed:(vertical?b.x:b.y)+(edge?1:.62),z};
  }
  function wallSurfaces(layout=activeLayout){return ['left','right',...(layoutFor(layout).partitions||[]).map((_,i)=>'inner:'+i)].map(id=>wallSurface(id,layout));}
  function wallAnchor(item,layout=activeLayout){
    const s=wallSurface(item.wallSide,layout);if(!s)return null;
    return {x:s.side==='left'?s.fixed:item.wallU,y:s.side==='left'?item.wallU:s.fixed,z:s.index<0?wallHeight(s.side,item.wallU,layout):s.z,side:s.side};
  }
  function wallPick(point,origin,baseY,layout=activeLayout,interior=true){
    const hits=[];
    for(const s of wallSurfaces(layout)){
      if(s.index<0||!interior)continue;
      const u=s.side==='left'?s.fixed-(point.x-origin)/32:s.fixed+(point.x-origin)/32;
      const z=baseY+(s.fixed+u)*16-s.z-point.y;
      if(u>=s.start&&u<=s.end&&z>=0&&z<=155)hits.push({wallSide:s.id,wallU:Math.round(u*4)/4,wallZ:Math.round(z/4)*4,depth:s.fixed+u});
    }
    if(hits.length){hits.sort((a,b)=>b.depth-a.depth);const {depth,...hit}=hits[0];return hit;}
    const side=point.x<origin?'left':'right',u=Math.abs(point.x-origin)/32;
    return {wallSide:side,wallU:Math.round(u*4)/4,wallZ:Math.round((baseY+u*16-wallHeight(side,u,layout)-point.y)/4)*4};
  }

  // A small permanent service area on the front end of the left wall.
  function wallSwitch(layout=activeLayout){return {wallSide:'left',wallU:wallSpan('left',layout)-1,wallZ:108,width:24,mountH:40};}
  function overlapsSwitch(item,layout=activeLayout){const t=TYPES[item.type],b=wallSwitch(layout);return !!(t?.wall&&item.wallSide===b.wallSide&&Math.abs(item.wallU-b.wallU)*32<(t.width+b.width)/2+6&&Math.abs(item.wallZ-b.wallZ)<(t.mountH+b.mountH)/2+6);}
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
    {name:'Mesa DJ',w:2,h:1,width:104,category:'tables',sprite:72,interaction:'dj'},
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
  TYPES.push({name:'Básquet Arcade',w:2,h:3,width:106,category:'deco',sprite:93,interaction:'basket',artAxes:[.63,-.65],rearAxes:[.58,-.64]});
  TYPES.push(
    {name:'Terrario Bosque',w:1,h:1,width:35,category:'deco',sprite:94,tabletop:true,artAxes:[.34,-.60],rearAxes:[.55,-.40]},
    {name:'Telescopio Lunar',w:1,h:1,width:48,category:'deco',sprite:95},
    {name:'Carrito de Té',w:2,h:1,width:82,category:'deco',sprite:96,artFlip:true,artAxes:[.63,-.39],rearAxes:[.38,-.69]},
    {name:'Cajón de Vinilos',w:1,h:1,width:33,category:'deco',sprite:97,tabletop:true,artAxes:[.49,-.69],rearAxes:[.55,-.47]},
    {name:'Cuadro Herbario',w:1,h:1,width:46,mountH:60,category:'wall',sprite:98,wall:true}
  );
  TYPES.push({name:'Carreras de Caballos',w:2,h:1,width:78,category:'deco',sprite:99,interaction:'racing',artAxes:[.51,-.67],rearAxes:[.58,-.57]});
  TYPES.push({name:'Mesa Cuatro en Línea',w:2,h:1,width:86,category:'deco',sprite:100,interaction:'connect4'});
  TYPES.push(
    {name:'Barra LED Vertical',w:1,h:1,width:27,category:'deco',sprite:101,interaction:'light',rotationLight:true,lightAtlas:true},
    {name:'Tira LED Pared',w:1,h:1,width:116,mountH:8,category:'wall',sprite:102,wall:true,interaction:'light',lightAtlas:true},
    {name:'Panel LED Hexagonal',w:1,h:1,width:64,mountH:56,category:'wall',sprite:103,wall:true,interaction:'light',lightAtlas:true},
    {name:'Arco Neón',w:1,h:1,width:30,category:'deco',sprite:104,tabletop:true,interaction:'light',rotationLight:true,lightAtlas:true},
    {name:'Farol Moderno',w:1,h:1,width:27,category:'deco',sprite:105,tabletop:true,interaction:'light',rotationLight:true,lightAtlas:true}
  );
  TYPES.push({name:'Pesca Arcade',w:2,h:1,width:78,category:'deco',sprite:106,interaction:'fishing',fitRotation:true,artAxes:[.55,-.54],rearAxes:[.65,-.49]});
  TYPES.push(
    {name:'Valla Terciopelo',w:2,h:1,width:96,category:'deco',sprite:107,artFlip:true,fitRotation:true},
    {name:'Bandeja de Fichas',w:1,h:1,width:38,category:'deco',sprite:108,tabletop:true,fitRotation:true,artAxes:[.47,-.64],rearAxes:[.48,-.67]},
    {name:'Dados de la Fortuna',w:1,h:1,width:45,category:'deco',sprite:109,fitRotation:true,artAxes:[.57,-.54],rearAxes:[.57,-.54]},
    {name:'Cartel Casino',w:1,h:1,width:108,mountH:47,category:'wall',sprite:110,wall:true,readableWall:true,interaction:'light',lightAtlas:true}
  );
  TYPES.push(
    {name:'Banquito Casino',w:1,h:1,width:38,category:'seats',sprite:111,fitRotation:true,seat:{u:.55,v:.31,dir:0},rearSeats:[{u:.48,v:.26}],seatOverlay:true},
    {name:'Sillón Casino',w:1,h:1,width:62,category:'seats',sprite:112,fitRotation:true,artAxes:[.62,-.40],rearAxes:[.50,-.61],seat:{u:.57,v:.56,dir:0},rearSeats:[{u:.55,v:.53,dir:3}],seatOverlay:[[0,.32],[.13,.30],[.47,.57],[.48,1],[0,1]]},
    {name:'Sofá Casino',w:2,h:1,width:96,category:'seats',sprite:113,fitRotation:true,artAxes:[.40,-.60],rearAxes:[.40,-.60],seat:{u:.31,v:.48,dir:1},seats:[{u:.31,v:.48,dir:1},{u:.61,v:.65,dir:1}],rearSeats:[{u:.33,v:.42},{u:.63,v:.59}],seatOverlay:[[.77,.42],[1,.35],[1,1],[.68,1],[.68,.65]]},
    {name:'Lámpara Gala',w:1,h:1,width:28,category:'deco',sprite:114,interaction:'light',lightAtlas:true},
    {name:'Lámpara Rubí',w:1,h:1,width:28,category:'deco',sprite:115,tabletop:true,interaction:'light',lightAtlas:true}
  );
  TYPES.push({name:'Bola Disco',w:1,h:1,width:38,category:'deco',sprite:116,ceiling:true,ceilingHeight:155,interaction:'light',disco:true});
  TYPES.push({name:'Tragamonedas 777',w:1,h:1,width:56,category:'deco',sprite:117,interaction:'slots',artAxes:[.52,-.55],rearAxes:[.52,-.50],fitRotation:true});
  TYPES.push({name:'Mesa de Blackjack',w:2,h:1,width:104,category:'deco',sprite:118,interaction:'blackjack',artAxes:[.5,-.5],rearAxes:[.5,-.5],fitRotation:true});
  TYPES.push({name:'Mesa de Raspaditas',w:2,h:1,width:104,category:'deco',sprite:119,interaction:'scratch',artAxes:[.5,-.5],rearAxes:[.5,-.5],fitRotation:true});
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
  for(const id of [94,95,96,97,98])TYPES[id].base={shape:id===95?'oval':'box',span:id===95?.65:.85,u:.5};
  for(const id of [101,104,105])TYPES[id].base={shape:'oval',span:.86,u:.5};
  for(const id of [107,108,109])TYPES[id].base={shape:'box',span:.88,u:.5};
  for(const id of [111,112,113,114,115])TYPES[id].base={shape:[112,113].includes(id)?'box':'oval',span:.88,u:.5};
  TYPES[119].base={shape:'box',span:.85,u:.5};
  TYPES[118].base={shape:'box',span:.85,u:.5};
  TYPES[117].base={shape:'box',span:.82,u:.5};
  TYPES[106].base={shape:'box',span:.88,u:.5};
  TYPES[93].base={shape:'box',span:.94,u:.5};
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
  function initial(){return {version:1,geometryVersion:2,structureVersion:1,switchVersion:1,layout:'square',led:0,ledColor:'#52dfff',wallPattern:0,floorPattern:0,name:'Lucas',wall:0,floor:0,items:[
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
  function covers(item,x,y){if(TYPES[item.type].wall||TYPES[item.type].ceiling)return false;const t=dimensions(item);return x+1>item.x&&x<item.x+t.w&&y+1>item.y&&y<item.y+t.h;}
  function blocked(items,x,y,ignoreId,layout=activeLayout){return !inside(x,y,layout)||partitionAt(x,y,layout)||items.some(i=>i.id!==ignoreId&&!i.parentId&&!TYPES[i.type].flat&&covers(i,x,y));}
  function overlap(a,b){if(TYPES[a.type].wall||TYPES[b.type].wall||!!TYPES[a.type].ceiling!==!!TYPES[b.type].ceiling)return false;const ta=dimensions(a),tb=dimensions(b);return a.x<b.x+tb.w&&a.x+ta.w>b.x&&a.y<b.y+tb.h&&a.y+ta.h>b.y;}
  function canPlace(items,item,player,layout=activeLayout,allowSwitch=false){
    const t=TYPES[item.type],d=t&&dimensions(item);
    if(t?.wall){
      const s=wallSurface(item.wallSide,layout);
      if(item.parentId||!s||!Number.isFinite(item.wallU)||!Number.isFinite(item.wallZ))return false;
      const l=layoutFor(layout),u=item.wallU*32,z=item.wallZ;
      if(u-t.width/2<s.start*32+6||u+t.width/2>s.end*32-6||z-t.mountH/2<8||z+t.mountH/2>150)return false;
      if(s.index<0&&wallHeight(item.wallSide,(u-t.width/2)/32,l)!==wallHeight(item.wallSide,(u+t.width/2)/32,l))return false;
      if(!allowSwitch&&overlapsSwitch(item,l))return false;
      return !items.some(i=>i.id!==item.id&&TYPES[i.type].wall&&i.wallSide===item.wallSide&&Math.abs(i.wallU*32-u)<(TYPES[i.type].width+t.width)/2+4&&Math.abs(i.wallZ-z)<(TYPES[i.type].mountH+t.mountH)/2+4);
    }
    if(item.parentId){
      const parent=items.find(i=>i.id===item.parentId);
      return !!(t?.tabletop&&parent&&parent.id!==item.id&&!parent.parentId&&TYPES[parent.type].surface&&surfaceFits(parent,item)&&item.x===parent.x&&item.y===parent.y&&!items.some(i=>i.id!==item.id&&i.parentId===item.parentId&&surfaceOccupied(parent,item,i)));
    }
    if(!t||!Number.isFinite(item.x)||!Number.isFinite(item.y)||!Number.isSafeInteger(item.x*2)||!Number.isSafeInteger(item.y*2)||item.x<0||item.y<0||!inside(item.x,item.y,layout)||!inside(Math.ceil(item.x+d.w)-1,item.y,layout)||!inside(item.x,Math.ceil(item.y+d.h)-1,layout)||!inside(Math.ceil(item.x+d.w)-1,Math.ceil(item.y+d.h)-1,layout))return false;
    if(t.ceiling){
      if(item.parentId)return false;
      for(let y=Math.floor(item.y);y<Math.ceil(item.y+d.h);y++)for(let x=Math.floor(item.x);x<Math.ceil(item.x+d.w);x++)if(!inside(x,y,layout)||partitionAt(x,y,layout)||tileHeight(x,y,layout)!==tileHeight(item.x,item.y,layout))return false;
      return !items.some(i=>i.id!==item.id&&TYPES[i.type].ceiling&&overlap(i,item));
    }
    // Check every cell, including concave cutouts and interior wall strips.
    for(let y=Math.floor(item.y);y<Math.ceil(item.y+d.h);y++)for(let x=Math.floor(item.x);x<Math.ceil(item.x+d.w);x++)if(!inside(x,y,layout)||partitionAt(x,y,layout)||stairAccess(x,y,layout)||doorAccess(x,y,layout)||tileHeight(x,y,layout)!==tileHeight(item.x,item.y,layout))return false;
    if(items.some(i=>i.id!==item.id&&!i.parentId&&!TYPES[i.type].ceiling&&TYPES[i.type].flat===t.flat&&overlap(i,item)))return false;
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
    if(!data||data.version!==1||!Array.isArray(data.items)||data.items.length>MAX_ITEMS)return null;
    const valid=(v,max)=>Number.isInteger(v)&&v>=0&&v<max?v:0;
    const layout=layoutFor(data.layout),result={version:1,geometryVersion:2,structureVersion:1,switchVersion:1,lightsOn:data.lightsOn!==false,led:valid(data.led,ENV_COUNTS.led),ledColor:typeof data.ledColor==='string'&&/^#[0-9a-f]{6}$/i.test(data.ledColor)?data.ledColor.toLowerCase():'#52dfff',layout:layout.id,wallPattern:valid(data.wallPattern,ENV_COUNTS.wallPattern),floorPattern:valid(data.floorPattern,ENV_COUNTS.floorPattern),name:cleanName(data.name),wall:valid(data.wall,ENV_COUNTS.wall),floor:valid(data.floor,ENV_COUNTS.floor),items:[]};
    const ids=new Set(),legacy=data.geometryVersion!==2,legacyFlips=[],relocate=[],switchRelocate=[],deskSlots=new Set();
    if(data.unplacedItems!==undefined&&(!Array.isArray(data.unplacedItems)||data.items.length+data.unplacedItems.length>MAX_ITEMS))return null;
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
      if(data.switchVersion!==1&&overlapsSwitch(item,layout)&&canPlace(result.items,item,null,layout,true)){ids.add(item.id);switchRelocate.push(item);continue;}
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
    // Place only displaced wall art after every unaffected item is reserved.
    for(const item of switchRelocate){
      const t=TYPES[item.type],candidates=[];
      for(const side of [item.wallSide,item.wallSide==='left'?'right':'left'])for(const z of [item.wallZ,90,50,120])for(let u=t.width/64+.2;u<wallSpan(side,layout)-t.width/64-.2;u+=.25)candidates.push({...item,wallSide:side,wallU:u,wallZ:z});
      candidates.sort((a,b)=>(a.wallSide!==item.wallSide)*10000+Math.abs(a.wallU-item.wallU)*32+Math.abs(a.wallZ-item.wallZ)-((b.wallSide!==item.wallSide)*10000+Math.abs(b.wallU-item.wallU)*32+Math.abs(b.wallZ-item.wallZ)));
      const chosen=candidates.find(i=>canPlace(result.items,i,null,layout));if(chosen)result.items.push(chosen);else (result.unplacedItems??=[]).push(item);
    }
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
      if(t.wall){const surfaces=wallSurfaces(l).sort((a,b)=>Number(b.id===raw.wallSide)-Number(a.id===raw.wallSide));for(const s of surfaces)for(const z of [raw.wallZ||90,90,50,120])for(let u=s.start+t.width/64+.2;u<s.end-t.width/64-.2;u+=.25)candidates.push({...clean,x:0,y:0,flip:false,wallSide:s.id,wallU:u,wallZ:z});}
      else{
        if(t.tabletop)for(const p of out.items.filter(p=>!p.parentId&&TYPES[p.type].surface))for(const spot of surfaceGrid(p))candidates.push({...clean,x:p.x,y:p.y,parentId:p.id,...spot});
        const floor=[];for(let y=0;y<l.h;y++)for(let x=0;x<l.w;x++)floor.push({...clean,x,y});floor.sort((a,b)=>Math.abs(a.x-raw.x)+Math.abs(a.y-raw.y)-Math.abs(b.x-raw.x)-Math.abs(b.y-raw.y));candidates.push(...floor);
      }
      const chosen=candidates.find(i=>canPlace(out.items,i,null,l)&&(keepValid&&i===raw||i.parentId||t.wall||t.flat||connected([...out.items,i])));
      if(chosen)out.items.push(chosen);else reserve.push(clean);
    }
    if(reserve.length)out.unplacedItems=reserve;return out;
  }
  const api={wallSurface,wallSurfaces,wallAnchor,wallPick,wallSwitch,overlapsSwitch,MAX_ITEMS,surfaceOffset,surfaceUV,surfaceGrid,surfaceLocal,surfaceOccupied,SIZE,ENV_COUNTS,LAYOUTS,layoutFor,setLayout,room,inside,stairAt,stairAccess,doorAccess,reflow,tileHeight,walkHeight,wallHeight,maxHeight,canStep,partitionCells,partitionAt,wallSpan,rotation,dimensions,TYPES,initial,covers,blocked,overlap,canPlace,pathfind,route,seatPlaces,nearestSeat,seatApproach,moveItem,removeItem,findFree,cleanName,restore};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.VeredaCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
