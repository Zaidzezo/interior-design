"use client";
import { Suspense, useMemo, useRef, useState, useEffect, useCallback, useLayoutEffect } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  RoundedBox,
  useTexture,
  TransformControls,
  Grid,
  Environment,
  GizmoHelper,
  GizmoViewport,
  PointerLockControls,
} from "@react-three/drei";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { useEditor, activeFloor } from "@/lib/store";
import { Item, Wall, Opening, Room } from "@core/model";
import { getCatalog, floorTexture } from "@core/catalog";
import { distance } from "@core/geometry";
import {StudioPointer,itemPointer} from './StudioPointer';
import {InstancedAsset} from './InstancedAsset';
import {StudioContext,useStudio} from './studio-context';
import {StudioCamera} from './StudioCamera';
import {GroundInteraction,groundEvent} from './GroundInteraction';
import {StudioEffects} from './StudioEffects';
import SelectionControls from './SelectionControls';
import {dragSnap} from '@core/hit-test';
import {bounds,corners,zoomAt} from '@core/geometry';
import { ModelAsset } from "./ModelAsset";
import { wallPanels } from "@core/architecture";
function Box({
  position = [0, 0, 0],
  size = [1, 1, 1],
  color = "#ddd",
  roughness = 0.7,
  metalness = 0,
  opacity = 1,
  map,
  normalMap,
  roughnessMap,
}: {
  position?: [number, number, number];
  size?: [number, number, number];
  color?: string;
  roughness?: number;
  metalness?: number;
  opacity?: number;
  map?: THREE.Texture;
  normalMap?: THREE.Texture;
  roughnessMap?: THREE.Texture;
}) {
  if (Math.min(...size) < 0.08)
    return (
      <mesh position={position} castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial
          color={color}
          map={map} normalMap={normalMap} roughnessMap={roughnessMap} normalScale={new THREE.Vector2(.12,.12)}
          roughness={roughness}
          metalness={metalness}
          transparent={opacity < 1}
          opacity={opacity}
        />
      </mesh>
    );
  return (
    <RoundedBox
      position={position}
      args={size}
      radius={Math.min(...size) * 0.12}
      smoothness={2}
      bevelSegments={1}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial
        color={color}
        map={map} normalMap={normalMap} roughnessMap={roughnessMap} normalScale={new THREE.Vector2(.12,.12)}
        roughness={roughness}
        metalness={metalness}
        transparent={opacity < 1}
        opacity={opacity}
      />
    </RoundedBox>
  );
}

function Object3D({item,mode}:{item:Item;mode:'translate'|'rotate'|'scale'}){
 const s=useEditor(),studio=useStudio(),ref=useRef<THREE.Group>(null!),gizmo=useRef<any>(null);
 useLayoutEffect(()=>{if(ref.current)studio.nodes.current.set(item.id,ref.current);return()=>{studio.nodes.current.delete(item.id);};},[item.id,item.hidden,studio]);
 if(item.hidden)return null;
 const model=<group ref={ref} name={`entity-${item.id}`} userData={{entityId:item.id}} position={[item.x,item.elevation,item.y]} rotation={[0,-item.rotation*Math.PI/180,0]}
  onPointerDown={e=>{if(gizmo.current?.axis)return;itemPointer(item.id,e,studio);}} onPointerMove={e=>{if(s.tool!=='select'||studio.space.current)groundEvent('move',e);}} onPointerUp={e=>{if(s.tool!=='select'||studio.space.current)groundEvent('up',e);}} onClick={e=>e.stopPropagation()}>
   <group scale={[item.flipX?-1:1,1,1]}><Suspense fallback={null}><ModelAsset item={item} quality={s.quality} onReady={studio.modelReady}/></Suspense></group>
   {s.selected.includes(item.id)&&<group userData={{editorHelper:true}}><Box position={[0,-.012,0]} size={[item.width+.04,.012,item.depth+.04]} color="#8a78ee"/></group>}
   {getCatalog(item.catalogId).kind==='lamp'&&<pointLight position={[0,item.height*.8,0]} color="#ffdeb0" intensity={s.scene.sun>=18?2:.25} distance={5} decay={2}/>}
 </group>;
 return s.cameraMode==='orbit'&&s.selected.length===1&&s.selected.includes(item.id)&&!item.locked&&!s.readOnly?<TransformControls ref={gizmo} object={ref} mode={mode} translationSnap={s.snap?.25:null} rotationSnap={s.snap?Math.PI/12:null} showX={mode!=='rotate'} showZ={mode!=='rotate'} showY={mode!=='translate'} onMouseDown={()=>studio.setInteracting(true)} onMouseUp={()=>{const n=ref.current!;s.updateItem(item.id,{x:n.position.x,y:n.position.z,elevation:Math.max(0,n.position.y),rotation:-n.rotation.y*180/Math.PI,width:Math.max(.1,Math.min(1000,item.width*n.scale.x)),depth:Math.max(.1,Math.min(1000,item.depth*n.scale.z)),height:Math.max(.1,Math.min(1000,item.height*n.scale.y))});n.scale.set(1,1,1);studio.setInteracting(false);}}>{model}</TransformControls>:model;
}

function RoomMesh({ room }: { room: Room }) {
  const studio=useStudio();
  const materialId = floorTexture(room.material) ?? "oak";
  const loaded = useTexture([
    `/assets/materials/${materialId}-albedo.webp`,
    `/assets/materials/${materialId}-normal.webp`,
    `/assets/materials/${materialId}-roughness.webp`,
  ]);
  const maps = useMemo(
    () =>
      loaded.map((map, i) => {
        const texture = map.clone();
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1 / 1.2, 1 / 1.2);
        texture.colorSpace =
          i === 0 ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        texture.needsUpdate = true;
        return texture;
      }),
    [loaded[0], loaded[1], loaded[2]],
  );
  useEffect(() => () => maps.forEach((t) => t.dispose()), [maps]);
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    room.points.forEach((p, i) =>
      i ? s.lineTo(p.x, -p.y) : s.moveTo(p.x, -p.y),
    );
    s.closePath();
    return s;
  }, [room.points]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow onPointerDown={e=>{e.stopPropagation();const st=useEditor.getState();if(studio.overview.current){st.set({message:'Switch to Current floor to edit'});return;}if(st.tool!=='select'||st.placing||studio.space.current||e.button===1){groundEvent('down',e);(e.target as HTMLElement|null)?.setPointerCapture(e.pointerId);}else st.select(room.id,e.nativeEvent.shiftKey);}} onPointerMove={e=>groundEvent('move',e)} onPointerUp={e=>groundEvent('up',e)}>
      <shapeGeometry args={[shape]} />
      <meshStandardMaterial
        color={room.color}
        map={floorTexture(room.material) ? maps[0] : undefined}
        normalMap={floorTexture(room.material) ? maps[1] : undefined}
        normalScale={new THREE.Vector2(0.18, 0.18)}
        roughnessMap={floorTexture(room.material) ? maps[2] : undefined}
        roughness={room.material === "marble" ? 0.35 : 0.9}
      />
    </mesh>
  );
}
function WallMesh({
  wall,
  openings,
  cutaway,
}: {
  wall: Wall;
  openings: Opening[];
  cutaway: boolean;
}) {
  const studio=useStudio();
  const materialId = wall.finish && wall.finish !== 'matte' ? wall.finish : 'plaster';
  const sources = useTexture(['albedo','normal','roughness'].map(kind=>`/assets/materials/${materialId}-${kind}.webp`));
  const maps=useMemo(()=>sources.map((source,i)=>{const map=source.clone();map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(3,2);map.colorSpace=i===0?THREE.SRGBColorSpace:THREE.NoColorSpace;map.needsUpdate=true;return map;}),[sources[0],sources[1],sources[2]]);
  useEffect(()=>()=>maps.forEach(map=>map.dispose()),[maps]);
  const camera=useThree(state=>state.camera),state=useEditor(),[front,setFront]=useState(false);
  useFrame(()=>{const dx=wall.b.x-wall.a.x,dz=wall.b.y-wall.a.y,desired=(camera.position.x-(wall.a.x+wall.b.x)/2)*dz-(camera.position.z-(wall.a.y+wall.b.y)/2)*dx>0;if(desired!==front)setFront(desired);});
  const length = distance(wall.a, wall.b),
    angle = -Math.atan2(wall.b.y - wall.a.y, wall.b.x - wall.a.x),
    height = cutaway ? state.cameraMode==='top'?Math.min(1.2,wall.height):front?.12:wall.height : wall.height;
  const cuts = [
    0,
    length,
    ...openings.flatMap((o) => [o.offset, o.offset + o.width]),
  ].sort((a, b) => a - b);
  return (
    <group position={[wall.a.x, 0, wall.a.y]} rotation={[0, angle, 0]} onPointerDown={e=>{e.stopPropagation();const st=useEditor.getState();if(studio.overview.current){st.set({message:'Switch to Current floor to edit'});return;}if(st.tool!=='select'||st.placing||studio.space.current||e.button===1){groundEvent('down',e);(e.target as HTMLElement|null)?.setPointerCapture(e.pointerId);}else st.select(wall.id,e.nativeEvent.shiftKey);}} onPointerMove={e=>groundEvent('move',e)} onPointerUp={e=>groundEvent('up',e)}>
      {wallPanels(wall, openings, height).map((panel, i) => (
        <Box
          key={i}
          position={[panel.x, panel.y, 0]}
          size={[panel.width, panel.height, wall.thickness]}
          color={wall.color}
          map={wall.finish && wall.finish !== "matte" ? maps[0] : undefined}
          normalMap={maps[1]} roughnessMap={maps[2]}
        />
      ))}
      {wallPanels(wall, openings, height)
        .filter((p) => p.y - p.height / 2 < 0.01)
        .map((panel, i) => (
          <group key={`trim-${i}`}>
            <Box
              position={[panel.x, 0.045, wall.thickness / 2 + 0.012]}
              size={[panel.width, 0.09, 0.024]}
              color="#e9e5db"
            />
            <Box
              position={[panel.x, 0.045, -wall.thickness / 2 - 0.012]}
              size={[panel.width, 0.09, 0.024]}
              color="#e9e5db"
            />
            <Box
              position={[panel.x, height + 0.008, 0]}
              size={[panel.width, 0.016, wall.thickness + 0.01]}
              color={wall.color}
            />
          </group>
        ))}
      {openings
        .filter((o) => o.kind === "window" && height > o.sill)
        .map((o) => (
          <group key={o.id}>
            <Box
              position={[
                o.offset + o.width / 2,
                o.sill + Math.min(o.height, height - o.sill) / 2,
                0,
              ]}
              size={[o.width, Math.min(o.height, height - o.sill), 0.025]}
              color="#c2dfe5"
              opacity={0.35}
            />
            <Box
              position={[o.offset + o.width / 2, o.sill, 0]}
              size={[o.width, 0.05, wall.thickness + 0.05]}
              color="#eeeae0"
            />
            {height > o.sill && (
              <>
                <Box
                  position={[o.offset, o.sill + Math.min(o.height,height-o.sill) / 2, 0]}
                  size={[0.045, Math.min(o.height,height-o.sill), wall.thickness]}
                  color="#eeeae0"
                />
                <Box
                  position={[o.offset + o.width, o.sill + Math.min(o.height,height-o.sill) / 2, 0]}
                  size={[0.045, Math.min(o.height,height-o.sill), wall.thickness]}
                  color="#eeeae0"
                />
              </>
            )}
          </group>
        ))}
      {openings
        .filter((o) => o.kind === "door")
        .map((o) => {
          const h = Math.min(height, o.height),
            leafWidth = o.style === "double" ? o.width / 2 : o.width;
          const sliding = o.style === "sliding" || o.style === "pocket";
          return (
            <group key={o.id} position={[o.offset, 0, 0]}>
              <group
                rotation={[
                  0,
                  sliding ? 0 : o.flip ? -Math.PI / 2 : Math.PI / 2,
                  0,
                ]}
              >
                <Box
                  position={[
                    leafWidth / 2,
                    h / 2,
                    sliding ? wall.thickness : 0.01,
                  ]}
                  size={[leafWidth, h, 0.035]}
                  color="#c6b497"
                />
              </group>
              {o.style === "double" && (
                <group
                  position={[o.width, 0, 0]}
                  rotation={[0, o.flip ? Math.PI / 2 : -Math.PI / 2, 0]}
                >
                  <Box
                    position={[-leafWidth / 2, h / 2, 0]}
                    size={[leafWidth, h, 0.035]}
                    color="#c6b497"
                  />
                </group>
              )}
              <Box
                position={[0, h / 2, 0]}
                size={[0.04, h, wall.thickness + 0.02]}
                color="#ebe6d9"
              />
              <Box
                position={[o.width, h / 2, 0]}
                size={[0.04, h, wall.thickness + 0.02]}
                color="#ebe6d9"
              />
              {height>=o.height && (
                <Box
                  position={[o.width / 2, o.height, 0]}
                  size={[o.width, 0.05, wall.thickness + 0.02]}
                  color="#ebe6d9"
                />
              )}
            </group>
          );
        })}
    </group>
  );
}
function ExportBridge() {
  const { scene, gl, camera, controls } = useThree();
  useEffect(() => {
    async function export3d(e: Event) {
      const type = (e as CustomEvent).detail;
      if (type === "png") {
        gl.render(scene, camera);
        const a = document.createElement("a");
        a.download = "buildspace-3d.png";
        a.href = gl.domElement.toDataURL("image/png");
        a.click();
      } else {
        // Export only canonical floor geometry. Helpers, ground ray planes and gizmos
        // are renderer infrastructure and must never inflate the exported building.
        const exportScene=new THREE.Scene();
        for(const child of scene.children)if(child.userData.exportRoot){const floor=child.clone(true);const helpers:THREE.Object3D[]=[];floor.traverse(object=>{if(object.userData.editorHelper||object.type==='TransformControls')helpers.push(object);});helpers.forEach(object=>object.removeFromParent());exportScene.add(floor);}
        new GLTFExporter().parse(
          exportScene,
          (result) => {
            new GLTFLoader().parse(
              result as ArrayBuffer,
              "",
              (loaded) => {
                let meshes = 0;
                loaded.scene.traverse((o) => {
                  if ((o as THREE.Mesh).isMesh) meshes++;
                });
                if (!meshes) {
                  useEditor
                    .getState()
                    .set({ message: "Export contained no geometry" });
                  return;
                }
                const blob = new Blob([result as ArrayBuffer], {
                  type: "model/gltf-binary",
                });
                const a = document.createElement("a");
                a.download = "buildspace.glb";
                a.href = URL.createObjectURL(blob);
                a.click();
                setTimeout(() => URL.revokeObjectURL(a.href), 1000);
                loaded.scene.traverse((o) => {
                  if ((o as THREE.Mesh).isMesh)
                    (o as THREE.Mesh).geometry.dispose();
                });
                window.dispatchEvent(
                  new CustomEvent("buildspace-glb-validated", {
                    detail: { meshes },
                  }),
                );
              },
              (error) =>
                useEditor
                  .getState()
                  .set({ message: `GLB validation failed: ${error}` }),
            );
          },
          (err) => useEditor.getState().set({ message: String(err) }),
          { binary: true },
        );
      }
    }
    window.addEventListener("buildspace-export-3d", export3d);
    return () => {
      window.removeEventListener("buildspace-export-3d", export3d);
    };
  }, [scene, gl, camera, controls]);
  return null;
}
function Walk() {
  const { camera } = useThree();
  const keys = useRef(new Set<string>());
  useEffect(() => {
    const d = (e: KeyboardEvent) => {if((e.target as HTMLElement).matches('input,textarea,select')||document.querySelector('[role="dialog"]'))return;keys.current.add(e.code);},
      u = (e: KeyboardEvent) => keys.current.delete(e.code);
    const blur=()=>keys.current.clear();
    window.addEventListener("blur",blur);
    window.addEventListener("keydown", d);
    window.addEventListener("keyup", u);

    return () => {
      window.removeEventListener("blur",blur);
      window.removeEventListener("keydown", d);
      window.removeEventListener("keyup", u);
    };
  }, [camera]);
  useFrame((_, dt) => {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    dir.y = 0;
    dir.normalize();
    const right = new THREE.Vector3().crossVectors(
      dir,
      new THREE.Vector3(0, 1, 0),
    );
    const d = Math.min(dt, 0.05) * 2.5;
    if (keys.current.has("KeyW")) camera.position.addScaledVector(dir, d);
    if (keys.current.has("KeyS")) camera.position.addScaledVector(dir, -d);
    if (keys.current.has("KeyD")) camera.position.addScaledVector(right, d);
    if (keys.current.has("KeyA")) camera.position.addScaledVector(right, -d);
  });
  return <PointerLockControls />;
}
export default function Scene3D() {
  const s = useEditor();
  const [loadedIds,setLoadedIds]=useState(new Set<string>());
  const host=useRef<HTMLDivElement>(null),nodes=useRef(new Map<string,THREE.Group>()),interacting=useRef(false),overview=useRef(false),dragStart=useRef<((id:string,event:PointerEvent)=>void)|null>(null),space=useRef(false),[,setInteraction]=useState(false),[readyMode,setReadyMode]=useState<string|null>(null);
  const studio=useMemo(()=>({overview,modelReady:(id:string)=>setLoadedIds(previous=>previous.has(id)?previous:new Set([...previous,id])),nodes,interacting,dragStart,space,setInteracting:(value:boolean)=>{interacting.current=value;setInteraction(value);},preview:(items:Item[])=>{for(const i of items){const n=nodes.current.get(i.id);if(n){n.position.set(i.x,i.elevation,i.y);n.rotation.y=-i.rotation*Math.PI/180;n.getObjectByName(`model-${i.id}`)?.scale.set(i.width,i.height,i.depth);}}}}),[]);
  useEffect(()=>{const node=host.current;if(!node)return;const wheel=(e:WheelEvent)=>{const st=useEditor.getState();if(st.cameraMode!=='top')return;e.preventDefault();if(interacting.current||node.dataset.transforming==='true')return;const rect=node.getBoundingClientRect(),p={x:e.clientX-rect.left,y:e.clientY-rect.top},next=Math.max(12,Math.min(180,st.zoom*Math.exp(-e.deltaY*.0015)));st.set({zoom:next,pan:zoomAt(p,st.pan,st.zoom,next)});};node.addEventListener('wheel',wheel,{passive:false});return()=>node.removeEventListener('wheel',wheel);},[]);
  const [cutaway, setCutaway] = useState(true),
    [walk, setWalk] = useState(false),
    [allFloors, setAllFloors] = useState(false),
    [mode, setMode] = useState<"translate" | "rotate" | "scale">("translate");
  const f = activeFloor();
  const batches=useMemo(()=>{const map=new Map<string,Item[]>();for(const i of f.items){if(i.hidden||i.flipX||s.selected.includes(i.id)||['lamp','shower'].includes(getCatalog(i.catalogId).kind))continue;const key=[i.catalogId,i.color,i.finish??'original',i.flipX?'mirror':'normal'].join('|');map.set(key,[...(map.get(key)??[]),i]);}return [...map.values()].filter(items=>items.length>=3);},[f.items,s.selected]);
  const batchedIds=new Set(batches.flatMap(items=>items.map(i=>i.id)));
  return (
    <StudioContext.Provider value={studio}><div ref={host} className="scene3d" data-testid="studio-3d" data-camera-mode={s.cameraMode} data-camera-ready={readyMode===s.cameraMode} data-models-ready={f.items.filter(i=>!i.hidden).every(i=>loadedIds.has(i.id))} data-zoom={s.zoom} data-pan-x={s.pan.x} data-pan-y={s.pan.y}>
      <div className="studio-heading"><span>BUILDSPACE / STUDIO</span><strong>{s.cameraMode==='top'?'Top-down editing':s.cameraMode==='walk'?'Inside your space':'A new perspective'}</strong></div>
      <div className="view3d-options">
        <button
          onClick={() => setCutaway(!cutaway)}
          className={cutaway ? "active" : ""}
        >
          Cutaway walls
        </button>
        <button aria-pressed={s.cameraMode==='walk'} onClick={()=>s.set({cameraMode:s.cameraMode==='walk'?'orbit':'walk'})}>Walk through</button>
        <button aria-pressed={s.cameraMode==='orbit'} onClick={()=>s.set({cameraMode:'orbit'})}>Orbit view</button>
        <button aria-pressed={s.cameraMode==='top'} onClick={()=>s.set({cameraMode:'top'})}>Top edit</button>
        <button aria-pressed={s.scene.sun>=18} onClick={()=>s.commit(scene=>{scene.sun=scene.sun>=18?14:20;})}>{s.scene.sun>=18?'Evening':'Daylight'}</button>
        <select aria-label="Render quality" value={s.quality} onChange={e=>s.set({quality:e.target.value as typeof s.quality})}><option value="draft">Draft</option><option value="balanced">Balanced</option><option value="high">High quality</option></select>
        <button onClick={() => {overview.current=!allFloors;setAllFloors(!allFloors);s.select(null);}}>
          {allFloors ? "All floors" : "Current floor"}
        </button>
        <button
          onClick={() => setMode(mode === "translate" ? "rotate" : mode==="rotate"?"scale":"translate")}
        >
          {mode === "translate" ? "Move gizmo" : mode === "rotate"?"Rotate gizmo":"Resize gizmo"}
        </button>
        <button onClick={()=>window.dispatchEvent(new CustomEvent("buildspace-camera",{detail:"focus"}))}>Focus selection</button>
        <button
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent("buildspace-camera", { detail: "reset" }),
            )
          }
        >
          Reset
        </button>
        <button
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent("buildspace-camera", { detail: "save" }),
            )
          }
        >
          Save view
        </button>
        {s.scene.cameras.length > 0 && (
          <select
            aria-label="Saved 3D view"
            onChange={(e) =>
              window.dispatchEvent(
                new CustomEvent("buildspace-camera", {
                  detail: +e.target.value,
                }),
              )
            }
          >
            <option value="-1">Saved views</option>
            {s.scene.cameras.map((c, i) => (
              <option value={i} key={i}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>
      {s.cameraMode==='walk' && (
        <div className="walk-hint">
          Click scene to look · WASD to move · Esc releases pointer
        </div>
      )}
      <Canvas
        shadows
        camera={{ position: [18, 19, 22], fov: 42, near: 0.05, far: 500 }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        onPointerMissed={() => {if(!interacting.current)s.select(null);}}
      >
        <color attach="background" args={[s.scene.sun>=18?'#252d3b':'#f3f1ed']} />
        <StudioCamera onReady={setReadyMode}/>
        <Suspense fallback={null}><Environment files="/assets/environments/studio.hdr" environmentIntensity={s.scene.sun>=18?.3:.8}/></Suspense>
        <StudioEffects enabled={s.quality!=='draft'&&s.cameraMode==='orbit'}/>
        <GroundInteraction/>
        <StudioPointer/>
        <ambientLight intensity={s.scene.ambient*(s.scene.sun>=18?.3:.65)} />
        <hemisphereLight args={["#f9f7ed", "#a8b2b7", 1]} />
        <directionalLight
          position={[
            Math.cos((s.scene.sun / 24) * Math.PI * 2) * 14,
            18,
            Math.sin((s.scene.sun / 24) * Math.PI * 2) * 14,
          ]}
          intensity={s.scene.sun>=18?.45:3.2}
          castShadow
          shadow-mapSize={s.quality==='high'?[2048,2048]:[1024,1024]}
          shadow-camera-left={-18}
          shadow-camera-right={18}
          shadow-camera-top={18}
          shadow-camera-bottom={-18}
          shadow-bias={-0.001}
        />
        <Suspense fallback={null}>
          {(allFloors ? s.scene.floors : [f]).map((f) => (
            <group key={f.id} name={`floor-${f.id}`} userData={{exportRoot:true}} position={[0, allFloors ? f.elevation : 0, 0]}>
              {f.rooms.map((r) => (
                <RoomMesh key={r.id} room={r} />
              ))}
              {f.walls.map((w) => (
                <WallMesh
                  key={w.id}
                  wall={w}
                  openings={f.openings.filter((o) => o.wallId === w.id)}
                  cutaway={cutaway}
                />
              ))}
              {f.items.filter(i=>!batchedIds.has(i.id)||allFloors&&f.id!==s.floorId).map((i) => (
                <Object3D key={i.id} item={i} mode={mode} />
              ))}
              {f.id===s.floorId&&batches.map(items=><Suspense key={[items[0].catalogId,items[0].color,items[0].finish].join('|')} fallback={null}><InstancedAsset items={items}/></Suspense>)}
            </group>
          ))}
        </Suspense>
        {s.grid&&s.cameraMode==='top'&&<Grid
          position={[5, -0.03, 6]}
          args={[200, 200]}
          cellSize={0.5}
          cellThickness={0.5}
          cellColor="#bfc7cf"
          sectionSize={2}
          sectionColor="#a9b3bd"
          fadeDistance={50}
          infiniteGrid
        />}
        {s.cameraMode==='walk'&&<Walk/>}
        <ExportBridge />
      </Canvas>
      {(!f.items.filter(i=>!i.hidden).every(i=>loadedIds.has(i.id))||readyMode!==s.cameraMode)&&<div className="studio-loading"><span>Preparing your space…</span></div>}
      {!allFloors&&s.cameraMode==='top'&&readyMode==='top'&&<SelectionControls renderer={studio}/>}
    </div></StudioContext.Provider>
  );
}
