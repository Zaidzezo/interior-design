"use client";
import {Suspense,useEffect,useRef,useState} from 'react';
import {ThreeEvent} from '@react-three/fiber';
import {Line,Html} from '@react-three/drei';
import * as THREE from 'three';
import {useEditor,activeFloor,rebuild} from '@/lib/store';
import {Point,uid,Item} from '@core/model';
import {getCatalog} from '@core/catalog';
import {dragSnap} from '@core/hit-test';
import {ModelAsset} from './ModelAsset';
import {rectangleRoom} from '@core/sample';
import {distance,bounds,validPolygon,wallProjection,openingValid,formatLength} from '@core/geometry';
import {useStudio} from './studio-context';
type GroundEvent={point:Point;client:Point;button:number;pointerId:number};
export function groundEvent(phase:'down'|'move'|'up',e:ThreeEvent<PointerEvent>){const p=e.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),new THREE.Vector3());if(!p)return;window.dispatchEvent(new CustomEvent(`buildspace-ground-${phase}`,{detail:{point:{x:p.x,y:p.z},client:{x:e.clientX,y:e.clientY},button:e.button,pointerId:e.pointerId}}));}
export function GroundInteraction(){
 const s=useEditor(),studio=useStudio(),start=useRef<Point|null>(null),drag=useRef<{point:Point;client:Point;pan:Point;panOnly:boolean}|null>(null),space=studio.space,[preview,setPreview]=useState<Point|null>(null),[polygon,setPolygon]=useState<Point[]>([]),[guide,setGuide]=useState<{point:Point;guides:("x"|"y")[]}|null>(null);
 const finish=(a:Point,b:Point)=>{const state=useEditor.getState();state.commit(scene=>{const f=scene.floors.find(f=>f.id===state.floorId)!;if(state.tool==='room'){const w=Math.abs(a.x-b.x),d=Math.abs(a.y-b.y);if(w<.25||d<.25)throw new Error('Room must be at least 0.25m wide and deep');f.rooms.push(rectangleRoom('New room','Custom',Math.min(a.x,b.x),Math.min(a.y,b.y),w,d));rebuild(f);}else if(state.tool==='wall'){if(distance(a,b)<.1)return;f.walls.push({id:uid(),a,b,height:f.height,thickness:.14,color:'#26364c',source:'manual'});}else f.annotations.push({id:uid(),a,b,kind:state.tool==='note'?'note':'measure',text:state.tool==='note'?(prompt('Annotation text','Design note')??'Note'):''});});};
 useEffect(()=>{
  const down=(event:Event)=>{const e=(event as CustomEvent<GroundEvent>).detail,st=useEditor.getState();
   if(st.cameraMode==='top'&&(e.button===1||st.tool==='pan'||space.current)){drag.current={point:e.point,client:e.client,pan:{...st.pan},panOnly:true};studio.setInteracting(true);return;}
   if(st.readOnly||studio.overview.current)return;if(st.placing){st.addItem(st.placing,dragSnap(e.point,st.zoom,st.snap).point);setPreview(null);return;}
   if(st.tool==='door'||st.tool==='window'){const f=activeFloor(),w=[...f.walls].sort((a,b)=>wallProjection(e.point,a).distance-wallProjection(e.point,b).distance)[0];if(!w||wallProjection(e.point,w).distance>.35){st.set({message:'Place the opening on a wall'});return;}const o={id:uid(),kind:st.tool,wallId:w.id,offset:Math.max(.05,wallProjection(e.point,w).offset-.45),width:.9,height:st.tool==='door'?2.1:1.3,sill:st.tool==='door'?0:.9,flip:false};if(!openingValid(o,w,f.openings)){st.set({message:'Opening must fit inside the wall without overlapping another opening'});return;}st.commit(scene=>scene.floors.find(f=>f.id===st.floorId)!.openings.push(o));st.select(o.id);return;}
   if(['room','wall','measure','note'].includes(st.tool)){if(start.current){finish(start.current,e.point);start.current=null;setPreview(null);}else{start.current=e.point;drag.current={point:e.point,client:e.client,pan:st.pan,panOnly:false};}return;}
   if(st.tool==='polygon'){setPolygon(p=>[...p,e.point]);return;}
  };
  const move=(event:Event)=>{const e=(event as CustomEvent<GroundEvent>).detail,st=useEditor.getState();if(drag.current?.panOnly){st.set({pan:{x:drag.current.pan.x+e.client.x-drag.current.client.x,y:drag.current.pan.y+e.client.y-drag.current.client.y}});return;}setPreview(st.placing?dragSnap(e.point,st.zoom,st.snap).point:e.point);};
  const up=(event:Event)=>{const e=(event as CustomEvent<GroundEvent>).detail,g=drag.current,st=useEditor.getState();drag.current=null;studio.setInteracting(false);if(g&&start.current&&['room','wall','measure'].includes(st.tool)&&distance(start.current,e.point)>.2){finish(start.current,e.point);start.current=null;setPreview(null);}};
  const guides=(e:Event)=>setGuide((e as CustomEvent).detail);
  const reset=()=>{start.current=null;drag.current=null;space.current=false;setPreview(null);setPolygon([]);setGuide(null);studio.setInteracting(false);};
  const key=(e:KeyboardEvent)=>{if(document.querySelector('[role="dialog"]')||(e.target as HTMLElement).matches('input,select,textarea'))return;if(e.code==='Space'){space.current=true;e.preventDefault();}if(e.key==='Escape'){start.current=null;drag.current=null;setPreview(null);setPolygon([]);studio.setInteracting(false);}};const release=(e:KeyboardEvent)=>{if(e.code==='Space')space.current=false;};
  window.addEventListener('blur',reset);window.addEventListener('buildspace-snap',guides);window.addEventListener('buildspace-ground-down',down);window.addEventListener('buildspace-ground-move',move);window.addEventListener('buildspace-ground-up',up);window.addEventListener('keydown',key);window.addEventListener('keyup',release);
  return()=>{window.removeEventListener('blur',reset);window.removeEventListener('buildspace-snap',guides);window.removeEventListener('buildspace-ground-down',down);window.removeEventListener('buildspace-ground-move',move);window.removeEventListener('buildspace-ground-up',up);window.removeEventListener('keydown',key);window.removeEventListener('keyup',release);};
 },[studio]);
 useEffect(()=>{start.current=null;drag.current=null;setPreview(null);setPolygon([]);},[s.floorId,s.tool,s.cameraMode,s.projectId]);
 const c=s.placing?getCatalog(s.placing):null;
 const ghost:Item|null=c&&preview?{id:'placement-preview',catalogId:c.id,name:c.name,x:preview.x,y:preview.y,width:c.width,depth:c.depth,height:c.height,elevation:0,rotation:s.placingRotation,color:s.placingColor??c.color,price:c.price,locked:false,hidden:false,finish:s.placingFinish??c.defaultFinish??'original'}:null;
 const f=activeFloor(),b=f.rooms.length?bounds(f.rooms.flatMap(r=>r.points)):null;
 const a=start.current,q=preview,shape=a&&q?(s.tool==='room'?[a,{x:q.x,y:a.y},q,{x:a.x,y:q.y},a]:[a,q]):[];
 return <>
 {ghost&&<group userData={{editorHelper:true}} position={[ghost.x,.01,ghost.y]} rotation={[0,-ghost.rotation*Math.PI/180,0]}><Suspense fallback={null}><ModelAsset item={ghost} ghost quality="draft"/></Suspense></group>}
 {guide&&<group userData={{editorHelper:true}}>{guide.guides.map(axis=><Line key={axis} points={axis==='x'?[[guide.point.x,.04,guide.point.y-10],[guide.point.x,.04,guide.point.y+10]]:[[guide.point.x-10,.04,guide.point.y],[guide.point.x+10,.04,guide.point.y]]} color="#a18ae9" lineWidth={1} dashed dashSize={.1} gapSize={.08} depthTest={false} raycast={()=>{}}/>)}</group>}
 <mesh userData={{editorHelper:true}} rotation={[-Math.PI/2,0,0]} position={[0,-.025,0]} onPointerDown={e=>{if(s.tool==='select'&&!s.placing)s.select(null);groundEvent('down',e);(e.target as HTMLElement|null)?.setPointerCapture(e.pointerId);}} onPointerMove={e=>groundEvent('move',e)} onPointerUp={e=>{groundEvent('up',e);(e.target as HTMLElement|null)?.releasePointerCapture(e.pointerId);}} onDoubleClick={()=>{if(s.tool==='polygon'&&polygon.length>=3){const points=polygon.filter((p,i,all)=>!i||distance(p,all[i-1])>.01);if(!validPolygon(points))return;s.commit(scene=>{const floor=scene.floors.find(f=>f.id===s.floorId)!;floor.rooms.push({...rectangleRoom('New room','Custom',0,0,1,1),points});rebuild(floor);});setPolygon([]);}}}><planeGeometry args={[2000,2000]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>
 {shape.length>1&&<Line userData={{editorHelper:true}} points={shape.map(p=>[p.x,.02,p.y])} color="#8973e8" lineWidth={2} raycast={()=>{}}/>}
 {polygon.length>0&&<Line userData={{editorHelper:true}} points={[...polygon,...(q?[q]:[])].map(p=>[p.x,.02,p.y])} color="#8973e8" lineWidth={2} raycast={()=>{}}/>}
 {s.measurements&&s.cameraMode==='top'&&b&&<group userData={{editorHelper:true}}><Line points={[[b.x,.015,b.y-.45],[b.x+b.width,.015,b.y-.45]]} color="#738092" lineWidth={1} raycast={()=>{}}/><Html center position={[b.x+b.width/2,.02,b.y-.6]}><span className="studio-measure">{formatLength(b.width,s.scene.unit)}</span></Html></group>}
 {f.annotations.map(annotation=><group key={annotation.id} onPointerDown={e=>{e.stopPropagation();s.select(annotation.id);}}><Line points={[[annotation.a.x,.03,annotation.a.y],[annotation.b.x,.03,annotation.b.y]]} color="#8a77d9" lineWidth={1.5}/><Html center position={[(annotation.a.x+annotation.b.x)/2,.04,(annotation.a.y+annotation.b.y)/2]}><span className="studio-measure">{annotation.kind==='measure'?formatLength(distance(annotation.a,annotation.b),s.scene.unit):annotation.text}</span></Html></group>)}
 </>;
}
