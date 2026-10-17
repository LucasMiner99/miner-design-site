/* Emotes are DOM nodes, never message HTML. Failed images fall back to their name. */
(()=>{'use strict';let emotes=Object.create(null),loading=null;
 function render(container,text){container.replaceChildren();const tokens=String(text).match(/\[emote:\d{1,20}:[^\]\r\n]{1,80}\]|\s+|[^\s\[]+|\[/gu)||[];
  for(const token of tokens){const kick=token.match(/^\[emote:(\d{1,20}):([^\]]+)\]$/),name=kick?kick[2]:token,url=kick?'https://files.kick.com/emotes/'+kick[1]+'/fullsize':emotes[token];
   if(url){const img=document.createElement('img');img.className='hub-emote';img.alt=name;img.title=name;img.decoding='async';img.referrerPolicy='no-referrer';img.src=url;img.onerror=()=>img.replaceWith(document.createTextNode(name));container.append(img);}else container.append(document.createTextNode(token));
  }
 }
 window.HubEmotes={render,load(){if(loading)return loading;loading=fetch('/api/hub/emotes',{credentials:'same-origin'}).then(r=>r.ok?r.json():{}).then(data=>{for(const [name,url] of Object.entries(data.emotes||{}))if(/^https:\/\/cdn\.7tv\.app\/emote\/[\w-]{4,40}\/2x\.webp$/.test(url))emotes[name]=url;}).catch(()=>{});return loading;}};
})();
