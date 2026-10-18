// The browser and server share the court and trajectory, never a client score.
export const COURT={width:400,height:440,x:200,y:380,hoopY:135,duration:30000};
export function hoopX(at,start,phase=0){const t=Math.max(0,(at-start-10000)/1000);if(!t)return 200;const amplitude=Math.min(1,t)*70+Math.min(1,Math.max(0,t-10))*38;return 200+amplitude*Math.sin(phase+1.8*t+.9*Math.max(0,t-10));}
export function trajectory(dx,dy,start){const duration=750+Math.hypot(dx,dy)*1.3;return {start,land:start+duration,x:COURT.x+dx,y:COURT.y+dy};}
export function ballAt(shot,at){const t=Math.max(0,Math.min(1,(at-shot.start)/(shot.land-shot.start)));return {x:COURT.x+(shot.x-COURT.x)*t,y:COURT.y+(shot.y-COURT.y)*t-110*Math.sin(Math.PI*t),radius:22-11*t,t};}
export function judgeShot(shot,start,phase){return Math.abs(shot.x-hoopX(shot.land,start,phase))<=25&&Math.abs(shot.y-COURT.hoopY)<=18;}
