"use client";
import {useLayoutEffect,useEffect,useRef,useMemo} from 'react';
import {useThree,useFrame} from '@react-three/fiber';
import {OrthographicCamera,PerspectiveCamera,OrbitControls} from '@react-three/drei';
import * as THREE from 'three';
import {useEditor,activeFloor} from '@/lib/store';
import {bounds,corners} from '@core/geometry';
import {useStudio} from './studio-context';
/** The top camera shares Blueprint's exact CSS-pixel -> meter transform. */
export function StudioCamera({onReady}:{onReady:(mode:string|null)=>void}){
 const s=useEditor(),{size,camera,controls}=useThree(),studio=useStudio();
 const previous=useRef(new THREE.Vector3(9,7,10)),transition=useRef(true),desired=useRef(new THREE.Vector3()),look=useRef(new THREE.Vector3());
 const f=activeFloor(),b=useMemo(()=>{const points=[...f.rooms.flatMap(r=>r.points),...f.walls.flatMap(w=>[w.a,w.b]),...f.items.flatMap(corners)];return points.length?bounds(points):{x:0,y:0,width:10,depth:10};},[f.id,s.fitTick]);
 const target=useMemo(()=>new THREE.Vector3(b.x+b.width/2,0,b.y+b.depth/2),[b]);
 useLayoutEffect(()=>{const zoom=Math.max(12,Math.min(180,Math.min((size.width-130)/(b.width+.8),(size.height-160)/(b.depth+.8))));s.set({zoom,pan:{x:size.width/2-target.x*zoom,y:size.height/2-target.z*zoom}});},[size.width,size.height,s.fitTick,s.floorId,b]);
 useLayoutEffect(()=>{
  transition.current=true;onReady(null);camera.position.copy(previous.current);camera.up.set(0,s.cameraMode==='top'?0:1,s.cameraMode==='top'?-1:0);look.current.copy(target);
  const diagonal=Math.max(5,Math.hypot(b.width,b.depth));desired.current.copy(target).add(s.cameraMode==='walk'?new THREE.Vector3(0,1.7,0):new THREE.Vector3(diagonal*.85,diagonal*.73,diagonal*.95));
  if(s.cameraMode==='walk')look.current.add(new THREE.Vector3(0,1.7,-1));
 },[camera,s.cameraMode,s.fitTick,s.floorId]);
 useEffect(()=>{
  const event=(e:Event)=>{
   const detail=(e as CustomEvent).detail,st=useEditor.getState(),orbit=controls as any;
   if(detail==='reset'){st.set({cameraMode:'orbit',fitTick:st.fitTick+1});return;}
   if(detail==='save'){const name=prompt('Name this camera view','Camera view');if(name)st.commit(scene=>scene.cameras.push({name,position:camera.position.toArray(),target:orbit?.target?.toArray()??look.current.toArray()}));return;}
   if(detail==='zoom-in'||detail==='zoom-out'){
    if(st.cameraMode!=='orbit')return;const center=orbit?.target??look.current;camera.position.sub(center).multiplyScalar(detail==='zoom-in'?1/1.2:1.2).add(center);orbit?.update();return;
   }
   if(detail==='focus'){
    const floor=activeFloor(),points=[...floor.items.filter(i=>st.selected.includes(i.id)).flatMap(corners),...floor.rooms.filter(r=>st.selected.includes(r.id)).flatMap(r=>r.points),...floor.walls.filter(w=>st.selected.includes(w.id)).flatMap(w=>[w.a,w.b])];
    if(!points.length){st.set({message:'Select an object, room or wall to focus'});return;}
    const box=bounds(points),center=new THREE.Vector3(box.x+box.width/2,0,box.y+box.depth/2);
    if(st.cameraMode==='top'){const zoom=Math.max(12,Math.min(180,Math.min((size.width-130)/(box.width+.8),(size.height-160)/(box.depth+.8))));st.set({zoom,pan:{x:size.width/2-center.x*zoom,y:size.height/2-center.z*zoom}});return;}
    look.current.copy(center);const distance=Math.max(3,Math.hypot(box.width,box.depth)*1.5);desired.current.copy(center).add(new THREE.Vector3(distance*.7,distance*.65,distance*.8));
   }else if(typeof detail==='number'&&detail>=0){const saved=st.scene.cameras[detail];if(!saved)return;desired.current.fromArray(saved.position);look.current.fromArray(saved.target);}
   else return;
   transition.current=true;onReady(null);if(orbit)orbit.enabled=false;
  };
  window.addEventListener('buildspace-camera',event);return()=>window.removeEventListener('buildspace-camera',event);
 },[camera,controls,size.width,size.height]);
 useFrame((_,dt)=>{
  const orbit=controls as any;
  if(s.cameraMode==='top'){
   const ortho=camera as THREE.OrthographicCamera;if(!ortho.isOrthographicCamera)return;
   ortho.left=-size.width/2;ortho.right=size.width/2;ortho.top=size.height/2;ortho.bottom=-size.height/2;ortho.zoom=s.zoom;ortho.updateProjectionMatrix();
   desired.current.set((size.width/2-s.pan.x)/s.zoom,Math.max(30,b.width+b.depth),(size.height/2-s.pan.y)/s.zoom);look.current.set(desired.current.x,0,desired.current.z);
  }else if(!(camera as THREE.PerspectiveCamera).isPerspectiveCamera)return;
  if(transition.current){
   if(orbit)orbit.enabled=false;
   camera.position.lerp(desired.current,1-Math.exp(-14*Math.min(dt,.1)));camera.lookAt(look.current);
   if(orbit?.target)orbit.target.copy(look.current);
   if(camera.position.distanceTo(desired.current)<.015){camera.position.copy(desired.current);camera.lookAt(look.current);camera.updateMatrixWorld();transition.current=false;onReady(s.cameraMode);}
  }else if(s.cameraMode==='top'){camera.position.copy(desired.current);camera.lookAt(look.current);}
  previous.current.copy(camera.position);
 });
 return <>{s.cameraMode==='top'?<OrthographicCamera makeDefault near={.01} far={2000}/>:<PerspectiveCamera makeDefault fov={38} near={.05} far={2000}/>}{s.cameraMode==='orbit'&&<OrbitControls makeDefault target={look.current} enabled={!studio.interacting.current&&!transition.current} mouseButtons={{LEFT:s.tool==='pan'?THREE.MOUSE.PAN:THREE.MOUSE.ROTATE,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.PAN}} enableDamping dampingFactor={.12} minDistance={2} maxDistance={150}/>}</>;
}
