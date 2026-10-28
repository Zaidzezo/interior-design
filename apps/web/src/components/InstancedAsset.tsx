"use client";
import {useMemo,useLayoutEffect,useRef,useEffect} from 'react';
import * as THREE from 'three';
import {Item} from '@core/model';
import {useEditor} from '@/lib/store';
import {usePreparedModel} from './ModelAsset';
import {useStudio} from './studio-context';
import {itemPointer} from './StudioPointer';
/** Repeated unselected assets share geometry/material draws. Selected objects leave the batch. */
export function InstancedAsset({items}:{items:Item[]}){
 const studio=useStudio(),quality=useEditor(s=>s.quality),model=usePreparedModel(items[0],quality==='draft'),refs=useRef<THREE.InstancedMesh[]>([]);
 const parts=useMemo(()=>{model.updateMatrixWorld(true);const result:THREE.Mesh[]=[];model.traverse(o=>{if(o instanceof THREE.Mesh)result.push(o);});return result;},[model]);
 useLayoutEffect(()=>{const matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3(),position=new THREE.Vector3();for(let p=0;p<parts.length;p++){const mesh=refs.current[p];if(!mesh)continue;for(let i=0;i<items.length;i++){const item=items[i];position.set(item.x,item.elevation,item.y);rotation.setFromAxisAngle(new THREE.Vector3(0,1,0),-item.rotation*Math.PI/180);scale.set(item.width*(item.flipX?-1:1),item.height,item.depth);matrix.compose(position,rotation,scale).multiply(parts[p].matrixWorld);mesh.setMatrixAt(i,matrix);}mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();}const live=[...refs.current];return()=>live.forEach(mesh=>mesh?.dispose());},[items,parts]);
 useEffect(()=>{for(const item of items)studio.modelReady(item.id);},[items,model]);
 return <group name="catalog-instances">{parts.map((part,p)=><instancedMesh key={p} ref={node=>{if(node)refs.current[p]=node;}} args={[part.geometry,part.material,items.length]} dispose={null} castShadow receiveShadow onPointerDown={e=>{if(e.instanceId!==undefined)itemPointer(items[e.instanceId].id,e,studio);}} onClick={e=>e.stopPropagation()}/>)}</group>;
}
