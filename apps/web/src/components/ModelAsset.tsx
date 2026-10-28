"use client";
import {useMemo,useEffect,useState,useRef} from 'react';
import {useGLTF,useTexture} from '@react-three/drei';
import {useFrame,useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {MeshoptDecoder} from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import {Item} from '@core/model';
import {getCatalog} from '@core/catalog';
export const modelUrl=(id:string,low=false)=>`/assets/models/${id}${low?'.lod':''}.glb`;
export function usePreparedModel(item:Item,low=false,ghost=false){
 const id=getCatalog(item.catalogId).id;
 const asset=useGLTF(modelUrl(id,low),false,false,loader=>loader.setMeshoptDecoder(MeshoptDecoder));
 const finish=item.finish??getCatalog(item.catalogId).defaultFinish??'original',fabric=['sofa','chair','bed','rug','curtain','ottoman'].includes(getCatalog(id).kind);
 const material=finish==='marble'?'marble':finish==='walnut'||finish==='rattan'?'walnut':fabric?'carpet':getCatalog(id).kind==='fireplace'?'concrete':'oak';
 const textures=useTexture([`/assets/materials/${material}-albedo.webp`,`/assets/materials/${material}-normal.webp`,`/assets/materials/${material}-roughness.webp`]);
 const model=useMemo(()=>{const copy=asset.scene.clone(true);copy.traverse(object=>{if(!(object instanceof THREE.Mesh))return;const multiple=Array.isArray(object.material),original:THREE.Material[]=multiple?object.material as THREE.Material[]:[object.material as THREE.Material];const cloned=original.map(source=>{const m=source.clone() as THREE.MeshStandardMaterial;
  if(m.userData.finishRole==='main'){m.color.set(item.color);m.map=textures[0];m.map.colorSpace=THREE.SRGBColorSpace;m.normalMap=textures[1];m.normalScale=new THREE.Vector2(fabric?.14:.08,fabric?.14:.08);m.roughnessMap=textures[2];m.roughness=finish==='marble'?.24:finish==='brass'?.3:fabric?.95:.65;m.metalness=finish==='brass'?.82:0;}
  if(ghost){m.transparent=true;m.opacity=.45;m.depthWrite=false;}return m;});object.material=multiple?cloned:cloned[0];object.castShadow=!ghost;object.receiveShadow=true;if(ghost)object.raycast=()=>{};});return copy;},[asset.scene,item.color,finish,textures[0],textures[1],textures[2],ghost]);
 useEffect(()=>()=>model.traverse(o=>{if(o instanceof THREE.Mesh)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());}),[model]);
 return model;
}
export function ModelAsset({item,quality='balanced',ghost=false,onReady}:{item:Item;quality?:'draft'|'balanced'|'high';ghost?:boolean;onReady?:(id:string)=>void}){
 const root=useRef<THREE.Group>(null),[low,setLow]=useState(quality==='draft'),camera=useThree(s=>s.camera),point=useMemo(()=>new THREE.Vector3(),[]);
 const model=usePreparedModel(item,low,ghost);
 useEffect(()=>{if(!ghost){onReady?.(item.id);window.dispatchEvent(new CustomEvent('buildspace-model-ready',{detail:item.id}));}},[model,item.id,ghost,onReady]);
 useFrame(()=>{if(!root.current)return;root.current.getWorldPosition(point);const ortho=camera as THREE.OrthographicCamera;const want=quality==='draft'||quality!=='high'&&(ortho.isOrthographicCamera?Math.max(item.width,item.depth)*ortho.zoom<28:point.distanceTo(camera.position)>28);if(want!==low)setLow(want);});
 return <group ref={root} name={`model-${item.id}`} scale={[item.width,item.height,item.depth]}><primitive object={model} dispose={null}/></group>;
}
