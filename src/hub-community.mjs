import {C} from './hub-rules.mjs';
export const CASINO_ID='casino';
export const validRoomId=id=>typeof id==='string'&&(/^\d+$/.test(id)||id===CASINO_ID);
export const canManageRoom=(room,auth)=>!!room&&(room.community?!!auth.admin:room.ownerId===auth.id);
export async function ensureCasino(world,auth){
 const storage=world.ctx.storage;let room=await storage.get('room:'+CASINO_ID);
 if(room||!auth.admin)return room;
 const scene=C.initial();scene.layout='hall';scene.name='Casino';scene.items=[];scene.unplacedItems=[];
 scene.wall=8;scene.floor=4;scene.wallPattern=0;scene.floorPattern=2;scene.lightsOn=false;
 // Generous aisles and every playable cabinet. This seed runs once; subsequent
 // releases must preserve the administrator's furniture and decoration.
 const placements=[[99,3,2],[106,8,2],[93,14,2],[72,19,2],[79,4,9],[100,10,9],[77,17,9],[83,21,9],[101,1,2],[101,12,2],[101,22,2],[0,4,14],[0,11,14]];
 scene.items=placements.map(([type,x,y],i)=>({id:i+1,type,x,y,rotation:0,flip:false,on:true}));
 scene.items.push({id:14,type:6,x:17,y:9,finish:1},{id:15,type:5,x:6,y:7,on:true},{id:16,type:5,x:13,y:7,on:true},{id:17,type:5,x:20,y:7,on:true});
 Object.assign(scene.items.find(i=>i.type===77),{parentId:14,slot:0});
 const restored=C.restore(scene);if(!restored)throw Error('Invalid casino seed');
 room={id:CASINO_ID,ownerId:auth.id,name:'Casino',community:true,public:false,revision:0,scene:restored};
 await storage.put('room:'+CASINO_ID,room);return room;
}
