const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
(async()=>{
 const R=await import('../public/hub/fishing-rules.mjs'),s={species:'trout',lengthMm:350,seed:123,startAt:1000,state:R.initialFishing()};
 const saved=structuredClone(s),values=[0,16,32,48].map(t=>R.fishingVisual(s,false,1000+t));
 assert(values.every((v,i)=>!i||v.y>values[i-1].y),'Visual bar advances between fixed steps');
 assert.deepEqual(s,saved,'Drawing cannot mutate authoritative physics');
 const atEnd=R.fishingVisual(s,false,1050);s.state=R.stepFishing(s,false);
 assert.equal(R.fishingVisual(s,false,1050).y,atEnd.y,'No jump at step boundary');
 const source=fs.readFileSync('public/hub/game.js','utf8'),start=source.indexOf('  function tick(now)'),end=source.indexOf('  function updateBubbles',start);
 let open=false,hidden=false,painted=0,updated=0;
 const scope={document:{get hidden(){return hidden;},querySelector:()=>open?{}:null},requestAnimationFrame(){},updatePlayer(){updated++;},people:{update(){}},pets:{update(){}},paint(){painted++;}};
 vm.createContext(scope);vm.runInContext(`let latestTime=0,ready=true,animationEnabled=true,effectsTime=0,targetZoom=1,zoom=1,reduceMotion=false,rewardsUI=null;${source.slice(start,end)};this.run=tick;`,scope);
 scope.run(16);assert.equal(painted,1);open=true;scope.run(32);scope.run(48);assert.equal(painted,1,'Room is not redrawn behind a dialog');assert.equal(updated,3,'Position simulation remains current');open=false;scope.run(64);assert.equal(painted,2,'Room resumes immediately');hidden=true;scope.run(80);assert.equal(painted,2);
 assert(source.includes('const floorTarget=movingCamera?g:floorViewContext'),'Camera movement bypasses a full viewport intermediate copy');
 console.log('PASS smooth fishing draw without changing physics, uninterrupted movement state behind modal, paused background raster and direct floor rendering on zoom.');
})().catch(e=>{console.error(e);process.exitCode=1;});
