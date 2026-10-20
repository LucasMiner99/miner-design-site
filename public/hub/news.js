/* Add new releases at the beginning. Plain text only; no remote HTML. */
(()=>{'use strict';
 const releases=[
  {id:'2026-10-20-slots',date:'20 de octubre de 2026',title:'¡Llegaron las tragamonedas!',notes:['Tragamonedas 777: una nueva máquina para tu sala, disponible en cajas de objetos.','Apostá de 1 a 100 créditos. Giran tres rodillos y paga la línea central: 7-7-7 devuelve cien veces la apuesta.','Consultá todos los premios en la máquina. Los giros se guardan aunque cierres la ventana o se corte la conexión.']},
  {id:'2026-10-20-disco',date:'20 de octubre de 2026',title:'La pista se ilumina',notes:['Nueva Bola Disco para colgar del techo: elegí su lugar sobre el piso, incluso encima de muebles. No bloquea el paso. Disponible en cajas de objetos.','Tocala para prender o apagar los reflejos de colores animados. Todos los visitantes ven el mismo estado.','Corregimos la dirección del personaje al sentarse de espaldas en el Sillón Casino.']},
  {id:'2026-10-20-casino-wall',date:'20 de octubre de 2026',title:'Un nuevo acabado para el Casino',notes:['La pared Salón Casino ahora combina paneles suaves, detalles art déco y un zócalo acanalado oscuro.','Los bordes superiores de las paredes acompañan el color elegido, también en las salas con desniveles.']},
  {id:'2026-10-20-casino-lounge',date:'20 de octubre de 2026',title:'Un rincón VIP para el Casino',notes:['Banquito y sillón individual de un bloque, y sofá de dos bloques con dos lugares para sentarse.','Lámparas Gala y Rubí: prendelas y apagalas para iluminar tu sala.','Nuevo ambiente Zócalo LED: se adapta a las paredes y podés elegir su color. También llegó la pared Negro ónix. Encontralos en las cajas de objetos y ambiente.']},
  {id:'2026-10-20-casino-decor',date:'20 de octubre de 2026',title:'El Casino se viste de gala',notes:['Nuevas vallas de terciopelo, bandejas de fichas y esculturas de dados para decorar tus salas.','El cartel Casino tiene luces que podés prender y apagar; también ilumina la sala a oscuras.','Llegaron la pared Salón Casino, la Alfombra Casino y el color de piso Bordó Casino. Objetos y ambientes disponibles en sus respectivas cajas.']},
  {id:'2026-10-20-community',date:'20 de octubre de 2026',title:'Nos encontramos en el Casino',notes:['Salas comunitarias tiene su propio espacio junto a las salas de jugadores. El Casino reúne los minijuegos y abre cuando el administrador lo habilita.','Al cerrar el Casino, los visitantes vuelven a sus casas y se devuelven las apuestas de cuatro en línea que sigan en juego.','La barra de pesca se mueve más fluida y se redujo el trabajo de dibujo durante el zoom y detrás de los minijuegos.']},
  {id:'2026-10-20-fishing',date:'20 de octubre de 2026',title:'La laguna: pesca y récords',notes:['Conseguí Pesca Arcade en las cajas de objetos y jugá en la máquina de cualquier sala.','Mantené al pez dentro de la barra. Hay cinco especies y tamaños en centímetros: los más raros y grandes dan más pelea.','Cada captura suma créditos hasta el límite diario. Tus mejores peces compiten en los rankings globales de tamaño y rareza, incluso después de alcanzar el límite.']},
  {id:'2026-10-20-led-lights',date:'20 de octubre de 2026',title:'Más luces para tu rincón',notes:['Llegaron la barra LED vertical, la tira LED de pared, el panel hexagonal, el arco neón y el farol moderno.','Todos tienen imagen prendida y apagada. Tocá cada luz para cambiar su estado; el cambio se ve para todos.','Con la luz general apagada, iluminan la sala en celeste, turquesa, violeta, rosa o ámbar. Disponibles en las cajas de objetos.']},
  {id:'2026-10-20-connect4',date:'20 de octubre de 2026',title:'Cuatro en línea, entre jugadores',notes:['Una nueva mesa para conseguir en las cajas de objetos. Colocala en tu sala e invitá a otro jugador.','Ambos apuestan el mismo monto. El ganador se lleva el pozo completo; si empatan, recuperan los créditos.','Tenés 60 segundos por turno. Podés cerrar la ventana y volver a la partida; el tiempo sigue corriendo.']},
  {id:'2026-10-20-horse-racing',date:'20 de octubre de 2026',title:'¡Llegan las carreras de caballos!',notes:[
   'Una nueva máquina para tu sala, disponible en las cajas de objetos.',
   'Elegí entre cinco caballos, apostá créditos y mirá la carrera. Los menos favoritos pagan más.',
   'Podés jugar en la máquina de cualquier sala. Las probabilidades y el pago se muestran antes de apostar.'
  ]},
  {id:'2026-10-19-wall-switch',date:'19 de octubre de 2026',title:'La luz, en la pared',notes:[
   'Todas las salas tienen una tecla de luz fija. El dueño puede tocarla para prender o apagar la luz general.',
   'El espacio de la tecla queda reservado: los cuadros y otros objetos de pared no pueden taparla.',
   'Ahora vas a ver las novedades al entrar. Podés volver a leerlas desde el botón Novedades.'
  ]},
  {id:'2026-10-19-lighting',date:'19 de octubre de 2026',title:'Salas con iluminación',notes:[
   'Con la luz general apagada, las lámparas, faroles y neones iluminan sus alrededores.',
   'La iluminación se guarda y todos los visitantes ven el mismo ambiente.',
   'El contador junto al logo muestra cuántas personas están conectadas.'
  ]},
  {id:'recent-additions',date:'Actualizaciones anteriores',title:'Más cosas para tu rincón',notes:[
   'Nuevos muebles, ropa, diseños de pisos y paredes, y mascotas: pollito, rana, conejo, carpincho y tortuga.',
   'Minijuegos de café, DJ y básquet para ganar créditos, con límites diarios.',
   'Plantaciones, intercambios entre jugadores y una máquina para canjear copias repetidas.',
   'Pósters con tus imágenes, chat con emotes y música compartida en la sala.'
  ]}
 ];
 const $=id=>document.getElementById(id),dialog=$('hubNewsDialog');let entered=false,built=false;
 function render(){if(built)return;built=true;const list=$('hubNewsEntries');for(const [index,r] of releases.entries()){
  const entry=document.createElement('section');entry.className='hub-news-entry';const date=document.createElement('p');date.textContent=r.date;const title=document.createElement('h3');title.textContent=r.title;const ul=document.createElement('ul');for(const text of r.notes){const li=document.createElement('li');li.textContent=text;ul.append(li);}entry.append(date,title,ul);
  if(index===0)list.append(entry);else{const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent=r.title;details.append(summary,entry);list.append(details);}
 }}
 function open(){if(dialog.open)return;render();dialog.showModal();}
 $('hubNewsButton').onclick=open;$('hubNewsPlay').onclick=()=>dialog.close();
 window.HubNews={arrive(){if(entered)return;entered=true;$('hubNewsButton').disabled=false;const show=()=>{if(document.querySelector('dialog[open]')){setTimeout(show,500);return;}open();};show();}};
})();
