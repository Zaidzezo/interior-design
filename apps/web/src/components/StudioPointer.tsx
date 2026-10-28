"use client";
import {useEffect,useRef} from 'react';
import {ThreeEvent,useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {useEditor,activeFloor} from '@/lib/store';
import {Item,Point,Scene} from '@core/model';
import {dragSnap} from '@core/hit-test';
import {catalog} from '@core/catalog';
import {useStudio,StudioController} from './studio-context';
import {groundEvent} from './GroundInteraction';
export function itemPointer(id:string,e:ThreeEvent<PointerEvent>,studio:StudioController){
 e.stopPropagation();const st=useEditor.getState();if(st.cameraMode==='walk')return;if(studio.overview.current){st.set({message:'Switch to Current floor to edit'});return;}
 if(st.tool!=='select'||studio.space.current||e.button===1||st.placing){groundEvent('down',e);(e.target as HTMLElement|null)?.setPointerCapture(e.pointerId);return;}
 if(e.nativeEvent.shiftKey){st.select(id,true);return;}if(!st.selected.includes(id))st.select(id);
 if(e.nativeEvent.pointerType==='touch'&&!e.nativeEvent.isPrimary)return;
 studio.dragStart.current?.(id,e.nativeEvent);
}
export function StudioPointer(){
 const studio=useStudio(),{camera,gl,controls,size}=useThree(),gesture=useRef<{pointer:number;scene:Scene;mode:string;floorId:string;items:Item[];point:THREE.Vector3;preview:Item[]}|null>(null),ray=useRef(new THREE.Raycaster());
 useEffect(()=>{
 const ground=(client:Point)=>{const rect=gl.domElement.getBoundingClientRect();ray.current.setFromCamera(new THREE.Vector2((client.x-rect.left)/rect.width*2-1,-(client.y-rect.top)/rect.height*2+1),camera);return ray.current.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),new THREE.Vector3());};
 const end=(commit:boolean)=>{const g=gesture.current;if(!g)return;gesture.current=null;studio.setInteracting(false);if(controls)(controls as any).enabled=useEditor.getState().cameraMode==='orbit';try{if(gl.domElement.hasPointerCapture(g.pointer))gl.domElement.releasePointerCapture(g.pointer);}catch{}
  const latest=useEditor.getState();if(commit&&latest.scene===g.scene&&latest.cameraMode===g.mode&&latest.floorId===g.floorId)latest.commit(scene=>{const f=scene.floors.find(f=>f.id===g.floorId)!;for(const patch of g.preview){const i=f.items.find(i=>i.id===patch.id);if(i&&!i.locked){i.x=patch.x;i.y=patch.y;}}});
  studio.preview(activeFloor().items,activeFloor().items);window.dispatchEvent(new CustomEvent('buildspace-snap',{detail:null}));
 };
 const begin=(id:string,event:PointerEvent)=>{const st=useEditor.getState(),item=activeFloor().items.find(i=>i.id===id);if(!item||item.locked||st.readOnly||gesture.current||studio.interacting.current)return;const point=ground({x:event.clientX,y:event.clientY});if(!point)return;
  event.preventDefault();studio.setInteracting(true);if(controls)(controls as any).enabled=false;
  const items=structuredClone(activeFloor().items.filter(i=>st.selected.includes(i.id)&&!i.locked));gesture.current={pointer:event.pointerId,scene:st.scene,floorId:st.floorId,mode:st.cameraMode,items,point,preview:items};gl.domElement.setPointerCapture(event.pointerId);
 };
 studio.dragStart.current=begin;
 const dragOver=(event:DragEvent)=>{if(event.dataTransfer?.types.includes('buildspace/item')){event.preventDefault();event.dataTransfer.dropEffect='copy';}};
 const drop=(event:DragEvent)=>{const id=event.dataTransfer?.getData('buildspace/item'),st=useEditor.getState();if(!id||!catalog.some(c=>c.id===id)||st.readOnly||studio.overview.current)return;event.preventDefault();const p=ground({x:event.clientX,y:event.clientY});if(p){st.set({placing:id});st.addItem(id,dragSnap({x:p.x,y:p.z},st.zoom,st.snap).point);}};
 gl.domElement.addEventListener('dragover',dragOver);gl.domElement.addEventListener('drop',drop);
 const move=(e:PointerEvent)=>{const g=gesture.current;if(!g||g.pointer!==e.pointerId)return;const st=useEditor.getState();if(st.scene!==g.scene){end(false);return;}const p=ground({x:e.clientX,y:e.clientY});if(!p)return;e.preventDefault();
  const first=g.items[0],world=new THREE.Vector3(first.x,0,first.y),a=world.clone().project(camera),b=world.clone().add(new THREE.Vector3(1,0,0)).project(camera),c=world.clone().add(new THREE.Vector3(0,0,1)).project(camera),scale=Math.max(Math.hypot((b.x-a.x)*size.width/2,(b.y-a.y)*size.height/2),Math.hypot((c.x-a.x)*size.width/2,(c.y-a.y)*size.height/2));
  const result=dragSnap({x:first.x+p.x-g.point.x,y:first.y+p.z-g.point.z},Math.max(1,scale),st.snap),dx=result.point.x-first.x,dy=result.point.y-first.y;
  g.preview=g.items.map(i=>({...i,x:i.x+dx,y:i.y+dy}));studio.preview(g.preview,g.items);window.dispatchEvent(new CustomEvent('buildspace-snap',{detail:{...result,items:g.preview}}));
 };
 const up=(e:PointerEvent)=>{if(gesture.current?.pointer===e.pointerId)end(true);};const cancel=()=>end(false);
 const key=(e:KeyboardEvent)=>{if((e.target as HTMLElement).matches('input,textarea,select')||document.querySelector('[role="dialog"]'))return;if(e.key==='Escape'&&gesture.current){e.stopImmediatePropagation();cancel();}if(e.code==='Space'){studio.space.current=true;if(controls)(controls as any).mouseButtons.LEFT=THREE.MOUSE.PAN;}};
 const release=(e:KeyboardEvent)=>{if(e.code==='Space'){studio.space.current=false;if(controls)(controls as any).mouseButtons.LEFT=useEditor.getState().tool==='pan'?THREE.MOUSE.PAN:THREE.MOUSE.ROTATE;}};
 window.addEventListener('pointermove',move,{passive:false});window.addEventListener('pointerup',up);window.addEventListener('pointercancel',cancel);window.addEventListener('blur',cancel);window.addEventListener('keydown',key,true);window.addEventListener('keyup',release);
 return()=>{gl.domElement.removeEventListener('dragover',dragOver);gl.domElement.removeEventListener('drop',drop);end(false);studio.dragStart.current=null;window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',cancel);window.removeEventListener('blur',cancel);window.removeEventListener('keydown',key,true);window.removeEventListener('keyup',release);};
 },[camera,gl,controls,size.width,size.height,studio]);
 return null;
}
