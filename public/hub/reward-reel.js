/* Shared box/exchange reveal. Results are already committed by the server. */
(()=>{'use strict';
 window.HubRewardReel={draw(cv,entries,winner,progress,paint){
  const k=cv.getContext('2d'),w=cv.width,h=cv.height,cardW=190,step=202;
  const start=step*2,end=winner*step+cardW/2-w/2,offset=start+(end-start)*(1-Math.pow(1-progress,4));
  k.clearRect(0,0,w,h);k.fillStyle='#eee';k.fillRect(0,0,w,h);
  for(let j=0;j<entries.length;j++){const x=j*step-offset;if(x+cardW<0||x>w)continue;const item=entries[j];k.fillStyle='#fff';k.fillRect(x,10,cardW,h-20);k.strokeStyle='#ccc';k.strokeRect(x+.5,10.5,cardW-1,h-21);paint(k,item,x+8,18,cardW-16,h-65);k.fillStyle='#171717';k.font='900 15px "Zalando Sans Expanded"';k.textAlign='center';k.fillText(item.name,x+cardW/2,h-28,cardW-14);}
  k.fillStyle='#171717';k.beginPath();k.moveTo(w/2-10,0);k.lineTo(w/2+10,0);k.lineTo(w/2,22);k.fill();k.fillRect(w/2-2,h-15,4,15);
 }};
})();
