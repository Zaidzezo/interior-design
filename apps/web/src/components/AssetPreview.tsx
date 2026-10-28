"use client";
import {Suspense,useState,useEffect,useMemo,useRef} from 'react';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {Environment,OrbitControls} from '@react-three/drei';
import * as THREE from 'three';
import {catalog,getCatalog} from '@core/catalog';
import {ModelAsset} from './ModelAsset';
function Ready({onReady}:{onReady:()=>void}){const reported=useRef(false);const {gl,scene,camera}=useThree();useFrame(()=>{gl.render(scene,camera);if(!reported.current){reported.current=true;onReady();}},1);return null;}
function Fit({id}:{id:string}){const {camera}=useThree(),c=getCatalog(id);useEffect(()=>{const diagonal=Math.hypot(c.width,c.height,c.depth);camera.position.set(diagonal*.9,c.height*.45+diagonal*.65,diagonal*.95);camera.lookAt(0,c.height*.45,0);},[camera,id]);return null;}
export default function AssetPreview(){
 const [id,setId]=useState(catalog[0].id),[ready,setReady]=useState(false);const c=getCatalog(id);
 useEffect(()=>{const update=(e:Event)=>{const key=(e as CustomEvent).detail;if(catalog.some(c=>c.id===key)){setReady(false);setId(key);}};window.addEventListener('buildspace-preview',update);return()=>window.removeEventListener('buildspace-preview',update);},[]);
 const item=useMemo(()=>({id:'preview',catalogId:c.id,name:c.name,x:0,y:0,width:c.width,depth:c.depth,height:c.height,elevation:0,rotation:0,color:c.color,price:c.price,locked:false,hidden:false,finish:c.defaultFinish??'original'}),[c.id]);
 return <main style={{height:'100vh',display:'grid',placeItems:'center',background:'#f6f4ef'}}><div data-preview-ready={ready} data-id={id} style={{width:320,height:320}}><Canvas shadows dpr={1} gl={{antialias:true,preserveDrawingBuffer:true,alpha:true}} camera={{fov:34,near:.01,far:100}} onCreated={({gl})=>{gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=1;}}><Fit id={id}/><ambientLight intensity={.5}/><directionalLight position={[3,5,4]} intensity={3} castShadow shadow-mapSize={[1024,1024]} shadow-bias={-.001}/><Suspense fallback={null} key={id}><Environment files="/assets/environments/studio.hdr" environmentIntensity={.8}/><ModelAsset item={item} quality="high"/><Ready onReady={()=>setReady(true)}/></Suspense><mesh rotation={[-Math.PI/2,0,0]} position={[0,-.01,0]} receiveShadow><planeGeometry args={[30,30]}/><shadowMaterial transparent opacity={.15}/></mesh><OrbitControls target={[0,c.height*.45,0]} enableDamping/></Canvas></div></main>;
}
