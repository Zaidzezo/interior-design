import {blankScene,rectangleRoom} from './sample';
import {catalog} from './catalog';
import {Scene,Item,uid} from './model';
import {wallsFromRooms} from './geometry';
export function showcaseScene(kind:'salon'|'suite'):Scene{
 const scene=blankScene(kind==='salon'?'The Sage Salon':'The Walnut Suite'),floor=scene.floors[0];floor.rooms=[rectangleRoom(scene.name,kind==='salon'?'Living Room':'Bedroom',0,0,5.6,4.8,kind==='salon'?'oak':'walnut','#eee9df')];floor.walls=wallsFromRooms(floor.rooms).map(w=>({...w,color:'#e9e5dc',finish:'plaster' as const}));
 const back=floor.walls.find(w=>Math.abs(w.a.y)<1e-6&&Math.abs(w.b.y)<1e-6)!;floor.openings.push({id:uid(),kind:'window',wallId:back.id,offset:.65,width:4.2,height:2.2,sill:.3,flip:false,style:'picture'});
 const add=(name:string,x:number,y:number,patch:Partial<Item>={})=>{const c=catalog.find(c=>c.name===name||c.id===name);if(!c)throw new Error(`Unknown showcase item: ${name}`);floor.items.push({id:uid(),catalogId:c.id,name:c.name,x,y,width:c.width,depth:c.depth,height:c.height,elevation:0,rotation:0,color:c.color,price:c.price,locked:false,hidden:false,finish:c.defaultFinish??'original',...patch});};
 add('Wool ivory',2.65,2.6,{width:3.75,depth:3.2,color:'#e8e4d9'});add('studio-curtain-linen',2.8,.15);
 if(kind==='salon'){
  add('Linen three seat',.82,2.65,{rotation:270,finish:'boucle',color:'#d8cfbd',height:.86});add('Oak lounge',4.05,2.55,{rotation:90,color:'#9aa58e',finish:'rattan'});add('studio-table-marble',2.6,2.65);add('Side table',.65,4.08,{width:.5,depth:.5,height:.5});add('Table mushroom',.65,4.08,{elevation:.5,width:.28,depth:.28,height:.42});add('Fiddle leaf fig',4.8,.85,{height:1.65,width:.65,depth:.65});add('Small fern',.45,.6,{height:.5,width:.4,depth:.4});add('studio-art-abstract',.09,2.55,{rotation:270,elevation:1.15});add('Floor arc',1.0,1.15,{width:.5,depth:.65,height:1.8});
 }else{
  add('Queen upholstered',2.8,1.7,{width:1.95,depth:2.2,height:1.16,color:'#bbb3a2',finish:'boucle'});for(const x of [1.45,4.15]){add('Side table',x,.95,{width:.5,depth:.5,height:.5,finish:'walnut'});add('Table mushroom',x,.95,{elevation:.5,width:.3,depth:.3,height:.42});}add('studio-ottoman-velvet',2.8,3.5);add('Olive tree',4.8,3.85,{width:.65,depth:.65,height:1.55});add('studio-art-landscape',2.8,.1,{elevation:1.5});add('Walnut dresser',.45,3.25,{width:1.2,depth:.45,height:.75,rotation:270,finish:'walnut'});
 }
 return scene;
}
