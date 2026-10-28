"use client";
import {useRef,useEffect} from 'react';
import {useThree,useFrame} from '@react-three/fiber';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';
import {SSAOPass} from 'three/examples/jsm/postprocessing/SSAOPass.js';
import {OutputPass} from 'three/examples/jsm/postprocessing/OutputPass.js';
/** Own postprocess resources in an effect, so suspension/StrictMode can't orphan GPU targets. */
export function StudioEffects({enabled}:{enabled:boolean}){
 const {gl,scene,camera,size}=useThree(),pipeline=useRef<{composer:EffectComposer;ao:SSAOPass;output:OutputPass}|null>(null);
 const samples=useRef<number[]>([]),last=useRef(0);
 useEffect(()=>{
  if(!enabled)return;
  const composer=new EffectComposer(gl),render=new RenderPass(scene,camera),ao=new SSAOPass(scene,camera,1,1,8),output=new OutputPass();
  ao.kernelRadius=.2;ao.minDistance=.001;ao.maxDistance=.12;composer.addPass(render);composer.addPass(ao);composer.addPass(output);pipeline.current={composer,ao,output};
  return()=>{pipeline.current=null;ao.dispose();ao.ssaoMaterial.dispose();ao.noiseTexture?.dispose();output.dispose();composer.dispose();};
 },[gl,scene,camera,enabled]);
 useEffect(()=>{const p=pipeline.current;if(p){p.composer.setSize(size.width,size.height);p.ao.setSize(Math.max(1,Math.round(size.width/4)),Math.max(1,Math.round(size.height/4)));}},[size.width,size.height,camera,enabled]);
 useEffect(()=>{
  const autoReset=gl.info.autoReset;gl.info.autoReset=false;
  const inspect=(event:Event)=>{if((event as CustomEvent).detail==='reset'){samples.current=[];last.current=0;}const context=gl.getContext();window.dispatchEvent(new CustomEvent('buildspace-studio-metrics',{detail:{frames:[...samples.current],drawCalls:gl.info.render.calls,triangles:gl.info.render.triangles,geometries:gl.info.memory.geometries,textures:gl.info.memory.textures,programs:gl.info.programs?.length,camera:camera.type,position:camera.position.toArray(),contextLost:context.isContextLost(),renderer:context.getParameter(context.RENDERER),width:gl.domElement.width,height:gl.domElement.height}}));};
  window.addEventListener('buildspace-studio-inspect',inspect);return()=>{gl.info.autoReset=autoReset;window.removeEventListener('buildspace-studio-inspect',inspect);};
 },[gl,camera]);
 useFrame((_,dt)=>{
  gl.info.reset();if(pipeline.current)pipeline.current.composer.render(dt);else gl.render(scene,camera);
  const now=performance.now();if(last.current){samples.current.push(now-last.current);if(samples.current.length>240)samples.current.shift();}last.current=now;
 },1);
 return null;
}
