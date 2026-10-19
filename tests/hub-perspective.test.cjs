const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),scope={};vm.createContext(scope);vm.runInContext(fs.readFileSync(__dirname+'/../public/hub/scenery.js','utf8'),scope);const S=scope.VeredaScenery;
const document={createElement(){const canvas={width:0,height:0};canvas.getContext=()=>({setTransform(...matrix){canvas.matrix=matrix;},drawImage(){},getImageData(){return {data:new Uint8ClampedArray(canvas.width*canvas.height*4)};}});return canvas;}};
const art={width:512,height:507,canvas:{}};
for(const [front,side] of [[.63,-.39],[.55,-.4],[.55,-.47],[.38,-.69],[.32,-.5],[.6,-.6]]){
 const output=S.volume(document,art,front,side),[a,b,c,d,e,f]=output.canvas.matrix;
 for(const [x,y] of [[0,0],[art.width,0],[0,art.height],[art.width,art.height]]){
  const px=a*x+c*y+e,py=b*x+d*y+f;
  assert(px>=0&&px<=output.width&&py>=0&&py<=output.height,'Projection must retain all four sprite corners, including negative shear');
 }
 assert(Math.abs(b+d*front-.5)<1e-10);assert(Math.abs(b+d*side+.5)<1e-10,'Room axes stay calibrated');
 if(front+side<=0){assert(f===0);assert.equal(output.height,Math.ceil(d*art.height+b*art.width),'Existing nonnegative projections stay unchanged');}
 assert.equal(output.alpha.length,output.width*output.height,'Hit-test alpha covers the complete image');
}
console.log('PASS perspective: complete bounds for both shear signs, calibrated axes and unchanged existing projections.');
