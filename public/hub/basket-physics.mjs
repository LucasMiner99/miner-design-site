// The browser and server share the court and trajectory, never a client score.
export const COURT={width:400,height:440,x:200,y:380,hoopY:135,duration:30000,resetDelay:500};
// A steady, gentle sweep, including the countdown: no late-game acceleration.
export function hoopX(at,start,phase=0){return 200+58*Math.sin(phase+(at-start)/1000*.55);}
export function trajectory(dx,dy,start){const duration=600+Math.hypot(dx,dy)*.8;return {start,land:start+duration,x:COURT.x+dx,y:COURT.y+dy};}
export function ballAt(shot,at){const t=Math.max(0,Math.min(1,(at-shot.start)/(shot.land-shot.start)));return {x:COURT.x+(shot.x-COURT.x)*t,y:COURT.y+(shot.y-COURT.y)*t-110*Math.sin(Math.PI*t),radius:22-11*t,t};}
export function judgeShot(shot,start,phase){return Math.abs(shot.x-hoopX(shot.land,start,phase))<=32&&Math.abs(shot.y-COURT.hoopY)<=24;}
// Accepted shots visibly enter the opening; missed shots rebound outside it.
// Only the authoritative receipt supplies hit, never the predicted client shot.
export function shotVisual(shot,at,start,phase){
 const b=ballAt(shot,at),hx=hoopX(shot.land,start,phase);
 if(at<shot.land){if(shot.hit){const t=Math.max(0,(b.t-.65)/.35),ease=t*t*(3-2*t);b.x+=(hx-shot.x)*ease;b.y+=(COURT.hoopY-shot.y)*ease;}return {...b,alpha:1};}
 const t=Math.min(1,(at-shot.land)/COURT.resetDelay);
 if(shot.hit)return {x:hoopX(at,start,phase),y:COURT.hoopY+60*t,radius:11-3*t,alpha:1-t*t};
 return {x:shot.x+(shot.x>=hx?1:-1)*65*t,y:shot.y-45*Math.sin(Math.PI*t)+90*t,radius:11,alpha:1-t};
}
