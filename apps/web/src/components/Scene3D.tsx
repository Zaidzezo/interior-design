"use client";
import { Suspense, useMemo, useRef, useState, useEffect } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
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
import { getCatalog } from "@core/catalog";
import { distance } from "@core/geometry";
import { wallPanels } from "@core/architecture";
function Box({
  position = [0, 0, 0],
  size = [1, 1, 1],
  color = "#ddd",
  roughness = 0.7,
  metalness = 0,
  opacity = 1,
}: {
  position?: [number, number, number];
  size?: [number, number, number];
  color?: string;
  roughness?: number;
  metalness?: number;
  opacity?: number;
}) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        roughness={roughness}
        metalness={metalness}
        transparent={opacity < 1}
        opacity={opacity}
      />
    </mesh>
  );
}
function FurnitureModel({ item }: { item: Item }) {
  const c = getCatalog(item.catalogId),
    w = item.width,
    d = item.depth,
    h = item.height,
    clr = item.color;
  const box = (
    x: number,
    y: number,
    z: number,
    a: number,
    b: number,
    e: number,
    color = clr,
    key?: number,
  ) => <Box key={key} position={[x, y, z]} size={[a, b, e]} color={color} />;
  const legs = () =>
    [-1, 1].flatMap((x) =>
      [-1, 1].map((z) =>
        box(
          x * w * 0.4,
          h * 0.35,
          z * d * 0.36,
          0.045,
          h * 0.7,
          0.045,
          "#8a6a49",
          x * 2 + z,
        ),
      ),
    );
  if (c.kind === "rug") return box(0, 0.012, 0, w, 0.024, d);
  if (c.kind === "stairs")
    return (
      <>
        {Array.from({ length: 12 }, (_, i) =>
          box(
            0,
            ((i + 1) * h) / 24,
            -d / 2 + ((i + 0.5) * d) / 12,
            w,
            ((i + 1) * h) / 12,
            d / 12,
            clr,
            i,
          ),
        )}
      </>
    );
  if (c.kind === "bed")
    return (
      <>
        {box(0, 0.17, 0, w, 0.34, d, "#9c7c58")}
        {box(0, 0.43, 0, w * 0.96, 0.22, d * 0.94, "#eeeae1")}
        {box(0, 0.59, d * 0.12, w * 0.98, 0.14, d * 0.65)}
        {box(0, 0.52, -d * 0.48, w, 0.9, 0.1, "#a18a70")}
        {[-1, 1].map((x) =>
          box(
            x * w * 0.24,
            0.59,
            -d * 0.28,
            w * 0.42,
            0.16,
            d * 0.2,
            "#faf8f0",
            x,
          ),
        )}
      </>
    );
  if (c.kind === "sofa" || c.kind === "chair")
    return (
      <>
        {box(0, 0.22, 0, w, 0.35, d)}
        {box(0, 0.56, -d * 0.4, w, 0.6, d * 0.18)}
        {[-1, 1].map((x) =>
          box(x * w * 0.45, 0.45, 0, w * 0.1, 0.55, d, clr, x),
        )}
        {Array.from({ length: c.kind === "sofa" ? 3 : 1 }, (_, i) =>
          box(
            (i - (c.kind === "sofa" ? 1 : 0)) * w * 0.27,
            0.45,
            0,
            w * (c.kind === "sofa" ? 0.25 : 0.7),
            0.16,
            d * 0.7,
            "#e6e0d3",
            i,
          ),
        )}
      </>
    );
  if (c.kind === "table" || c.kind === "desk")
    return (
      <>
        {legs()}
        {box(0, h - 0.05, 0, w, 0.1, d)}
        {c.kind === "desk" && (
          <>
            {box(0, h + 0.2, -d * 0.23, w * 0.36, 0.4, 0.04, "#35404b")}
            {box(0, h + 0.02, d * 0.1, w * 0.4, 0.02, d * 0.18, "#c4c7be")}
          </>
        )}
      </>
    );
  if (c.kind === "plant")
    return (
      <>
        <mesh position={[0, 0.2, 0]} castShadow>
          <cylinderGeometry args={[w * 0.3, w * 0.23, 0.4, 16]} />
          <meshStandardMaterial color="#b39679" />
        </mesh>
        <mesh position={[0, h * 0.5, 0]}>
          <cylinderGeometry args={[0.02, 0.03, h * 0.7, 8]} />
          <meshStandardMaterial color="#675f46" />
        </mesh>
        {Array.from({ length: 7 }, (_, i) => (
          <mesh
            key={i}
            position={[
              Math.cos(i * 2.4) * w * 0.22,
              h * (0.48 + i * 0.065),
              Math.sin(i * 2.4) * d * 0.22,
            ]}
            scale={[w * 0.5, h * 0.15, d * 0.3]}
            rotation={[0, i, Math.sin(i)]}
            castShadow
          >
            <sphereGeometry args={[1, 10, 8]} />
            <meshStandardMaterial color={i % 2 ? "#8fa17d" : "#58785d"} />
          </mesh>
        ))}
      </>
    );
  if (c.kind === "lamp")
    return (
      <>
        <mesh position={[0, 0.03, 0]}>
          <cylinderGeometry args={[w * 0.38, w * 0.4, 0.06, 20]} />
          <meshStandardMaterial color="#a18b64" />
        </mesh>
        {box(0, h * 0.42, 0, 0.035, h * 0.84, 0.035, "#a18b64")}
        <mesh position={[0, h * 0.85, 0]}>
          <coneGeometry args={[w * 0.5, h * 0.25, 20, 1, true]} />
          <meshStandardMaterial color="#ead9b4" side={THREE.DoubleSide} />
        </mesh>
        <pointLight
          position={[0, h * 0.75, 0]}
          intensity={3}
          distance={5}
          color="#ffdfa8"
        />
      </>
    );
  if (c.kind === "bath")
    return (
      <>
        {box(0, h * 0.4, 0, w, h * 0.8, d, "#f3f4ec")}
        {box(0, h * 0.82, 0, w * 0.8, 0.02, d * 0.78, "#c9dedb")}
        {[-1, 1].map((x) =>
          box(x * w * 0.45, h * 0.85, 0, w * 0.1, 0.16, d, "#f7f6ee", x),
        )}
        {[-1, 1].map((z) =>
          box(0, h * 0.85, z * d * 0.45, w, 0.16, d * 0.1, "#f7f6ee", z + 4),
        )}
      </>
    );
  if (c.kind === "toilet")
    return (
      <>
        {box(0, 0.24, d * 0.12, w * 0.8, 0.48, d * 0.65, "#f4f5ef")}
        {box(0, 0.55, -d * 0.34, w, 0.6, d * 0.25, "#e9eee6")}
        {box(0, 0.5, d * 0.1, w, 0.1, d * 0.75, "#fffdf4")}
      </>
    );
  if (c.kind === "shower")
    return (
      <>
        {box(0, 0.04, 0, w, 0.08, d, "#e5eae2")}
        <Box
          position={[w / 2, h / 2, 0]}
          size={[0.025, h, d]}
          color="#b8d6dd"
          opacity={0.3}
        />
        <Box
          position={[0, h / 2, -d / 2]}
          size={[w, h, 0.025]}
          color="#b8d6dd"
          opacity={0.3}
        />
      </>
    );
  if (c.kind === "sink")
    return (
      <>
        {box(0, h * 0.45, 0, w, h * 0.9, d, "#b59b79")}
        {box(0, h, 0, w, 0.08, d, "#eeede4")}
        {box(0, h + 0.045, 0, w * 0.65, 0.015, d * 0.65, "#b8ccc6")}
        {box(0, h + 0.16, -d * 0.3, 0.04, 0.28, 0.04, "#87958f")}
      </>
    );
  if (c.kind === "stove")
    return (
      <>
        {box(0, h / 2, 0, w, h, d, "#aaa99e")}
        {box(0, h + 0.015, 0, w, 0.035, d, "#30383a")}
        {[-1, 1].flatMap((x) =>
          [-1, 1].map((z) => (
            <mesh
              key={`${x}${z}`}
              position={[x * w * 0.24, h + 0.04, z * d * 0.24]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <ringGeometry args={[w * 0.12, w * 0.15, 20]} />
              <meshStandardMaterial color="#818a84" />
            </mesh>
          )),
        )}
      </>
    );
  if (c.kind === "shelf")
    return (
      <>
        {[-1, 1].map((x) =>
          box(x * w * 0.47, h / 2, 0, w * 0.06, h, d, "#947555", x),
        )}
        {Array.from({ length: 5 }, (_, i) =>
          box(0, (h * i) / 4, 0, w, 0.045, d, "#a78a68", i),
        )}
      </>
    );
  return (
    <>
      {box(0, h / 2, 0, w, h, d)}
      {box(0, h / 2, d * 0.505, 0.035, h * 0.8, 0.025, "#6f6555")}
      {box(w * 0.15, h * 0.55, d * 0.53, 0.13, 0.025, 0.025, "#8d805e")}
    </>
  );
}
function Object3D({
  item,
  mode,
}: {
  item: Item;
  mode: "translate" | "rotate";
}) {
  const s = useEditor();
  const ref = useRef<THREE.Group>(null);
  const [dragging, setDragging] = useState(false);
  if (item.hidden) return null;
  const selected = s.selected.includes(item.id);
  const model = (
    <group
      ref={ref}
      position={[item.x, item.elevation, item.y]}
      rotation={[0, (-item.rotation * Math.PI) / 180, 0]}
      onClick={(e) => {
        e.stopPropagation();
        s.select(item.id, e.nativeEvent.shiftKey);
      }}
    >
      <group scale={[item.flipX ? -1 : 1, 1, 1]}>
        <FurnitureModel item={item} />
      </group>
      {selected && (
        <Box
          position={[0, -0.015, 0]}
          size={[item.width + 0.08, 0.02, item.depth + 0.08]}
          color="#8a78ee"
        />
      )}
    </group>
  );
  return selected && !item.locked && !s.readOnly ? (
    <TransformControls
      mode={mode}
      showX={mode === "translate"}
      showZ={mode === "translate"}
      showY={mode === "rotate"}
      onMouseUp={() => {
        const o = ref.current!;
        s.updateItem(item.id, {
          x: o.position.x,
          y: o.position.z,
          elevation: o.position.y,
          rotation: (-o.rotation.y * 180) / Math.PI,
        });
      }}
    >
      {model}
    </TransformControls>
  ) : (
    model
  );
}
function RoomMesh({ room }: { room: Room }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = room.color;
    ctx.fillRect(0, 0, 256, 256);
    if (["tile", "marble", "terrazzo"].includes(room.material)) {
      ctx.strokeStyle = "rgba(77,98,92,.18)";
      ctx.lineWidth = 1.2;
      ctx.strokeRect(0, 0, 128, 128);
      ctx.strokeRect(128, 128, 128, 128);
      ctx.strokeRect(128, 0, 128, 128);
      ctx.strokeRect(0, 128, 128, 128);
    } else {
      for (let i = 0; i < 16; i++) {
        ctx.fillStyle =
          i % 3 === 0 ? "rgba(255,255,255,.08)" : "rgba(88,60,30,.04)";
        ctx.fillRect(0, i * 16, 256, 16);
        ctx.strokeStyle = "rgba(101,77,48,.16)";
        ctx.beginPath();
        ctx.moveTo(0, i * 16);
        ctx.lineTo(256, i * 16);
        ctx.moveTo(i % 2 ? 85 : 190, i * 16);
        ctx.lineTo(i % 2 ? 85 : 190, i * 16 + 16);
        ctx.stroke();
      }
    }
    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(0.65, 0.65);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [room.color, room.material]);
  useEffect(() => () => texture.dispose(), [texture]);
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    room.points.forEach((p, i) =>
      i ? s.lineTo(p.x, -p.y) : s.moveTo(p.x, -p.y),
    );
    s.closePath();
    return s;
  }, [room.points]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <shapeGeometry args={[shape]} />
      <meshStandardMaterial map={texture} roughness={0.85} />
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
  const length = distance(wall.a, wall.b),
    angle = -Math.atan2(wall.b.y - wall.a.y, wall.b.x - wall.a.x),
    height = cutaway ? Math.min(0.6, wall.height) : wall.height;
  const cuts = [
    0,
    length,
    ...openings.flatMap((o) => [o.offset, o.offset + o.width]),
  ].sort((a, b) => a - b);
  return (
    <group position={[wall.a.x, 0, wall.a.y]} rotation={[0, angle, 0]}>
      {wallPanels(wall, openings, height).map((panel, i) => (
        <Box
          key={i}
          position={[panel.x, panel.y, 0]}
          size={[panel.width, panel.height, wall.thickness]}
          color={cutaway ? "#43566c" : "#e4e1d8"}
        />
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
            {!cutaway && (
              <>
                <Box
                  position={[o.offset, o.sill + o.height / 2, 0]}
                  size={[0.045, o.height, wall.thickness]}
                  color="#eeeae0"
                />
                <Box
                  position={[o.offset + o.width, o.sill + o.height / 2, 0]}
                  size={[0.045, o.height, wall.thickness]}
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
              {!cutaway && (
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
        new GLTFExporter().parse(
          scene,
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
    function cameraEvent(e: Event) {
      const detail = (e as CustomEvent).detail;
      const c = controls as any;
      if (detail === "save") {
        const name = prompt("Name this camera view", "Camera view");
        if (name)
          useEditor.getState().commit((s) => {
            s.cameras.push({
              name,
              position: camera.position.toArray(),
              target: c?.target?.toArray() ?? [5.5, 0, 6],
            });
          });
      } else if (detail === "top") {
        camera.position.set(5.5, 24, 6.01);
        c?.target?.set(5.5, 0, 6);
        camera.lookAt(5.5, 0, 6);
      } else if (detail === "reset") {
        camera.position.set(18, 19, 22);
        c?.target?.set(5.5, 0, 6);
      } else if (typeof detail === "number" && detail >= 0) {
        const saved = useEditor.getState().scene.cameras[detail];
        camera.position.fromArray(saved.position);
        c?.target?.fromArray(saved.target);
      }
      c?.update();
    }
    window.addEventListener("buildspace-export-3d", export3d);
    window.addEventListener("buildspace-camera", cameraEvent);
    return () => {
      window.removeEventListener("buildspace-export-3d", export3d);
      window.removeEventListener("buildspace-camera", cameraEvent);
    };
  }, [scene, gl, camera, controls]);
  return null;
}
function Walk() {
  const { camera } = useThree();
  const keys = useRef(new Set<string>());
  useEffect(() => {
    const d = (e: KeyboardEvent) => keys.current.add(e.code),
      u = (e: KeyboardEvent) => keys.current.delete(e.code);
    window.addEventListener("keydown", d);
    window.addEventListener("keyup", u);
    camera.position.set(7, 1.7, 5);
    return () => {
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
  const [cutaway, setCutaway] = useState(true),
    [walk, setWalk] = useState(false),
    [allFloors, setAllFloors] = useState(false),
    [mode, setMode] = useState<"translate" | "rotate">("translate");
  const f = activeFloor();
  return (
    <div className="scene3d">
      <div className="view3d-options">
        <button
          onClick={() => setCutaway(!cutaway)}
          className={cutaway ? "active" : ""}
        >
          Cutaway walls
        </button>
        <button onClick={() => setWalk(!walk)}>
          {walk ? "Exit walkthrough" : "Walk through"}
        </button>
        <button onClick={() => setAllFloors(!allFloors)}>
          {allFloors ? "All floors" : "Current floor"}
        </button>
        <button
          onClick={() => setMode(mode === "translate" ? "rotate" : "translate")}
        >
          {mode === "translate" ? "Move gizmo" : "Rotate gizmo"}
        </button>
        <button
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent("buildspace-camera", { detail: "top" }),
            )
          }
        >
          Top view
        </button>
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
      {walk && (
        <div className="walk-hint">
          Click scene to look · WASD to move · Esc releases pointer
        </div>
      )}
      <Canvas
        shadows
        camera={{ position: [18, 19, 22], fov: 42, near: 0.05, far: 500 }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        onPointerMissed={() => s.select(null)}
      >
        <color attach="background" args={["#e8ecf0"]} />
        <ambientLight intensity={s.scene.ambient} />
        <hemisphereLight args={["#f9f7ed", "#a8b2b7", 1]} />
        <directionalLight
          position={[
            Math.cos((s.scene.sun / 24) * Math.PI * 2) * 14,
            18,
            Math.sin((s.scene.sun / 24) * Math.PI * 2) * 14,
          ]}
          intensity={2.5}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-18}
          shadow-camera-right={18}
          shadow-camera-top={18}
          shadow-camera-bottom={-18}
          shadow-bias={-0.001}
        />
        <Suspense fallback={null}>
          {(allFloors ? s.scene.floors : [f]).map((f) => (
            <group key={f.id} position={[0, allFloors ? f.elevation : 0, 0]}>
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
              {f.items.map((i) => (
                <Object3D key={i.id} item={i} mode={mode} />
              ))}
            </group>
          ))}
        </Suspense>
        <Grid
          position={[5, -0.03, 6]}
          args={[200, 200]}
          cellSize={0.5}
          cellThickness={0.5}
          cellColor="#bfc7cf"
          sectionSize={2}
          sectionColor="#a9b3bd"
          fadeDistance={50}
          infiniteGrid
        />
        {walk ? (
          <Walk />
        ) : (
          <OrbitControls
            makeDefault
            target={[5.5, 0, 6]}
            minDistance={2}
            maxDistance={80}
          />
        )}
        <GizmoHelper alignment="bottom-right" margin={[75, 75]}>
          <GizmoViewport
            axisColors={["#e1998b", "#8bb89e", "#8fa1d3"]}
            labelColor="#fff"
          />
        </GizmoHelper>
        <ExportBridge />
      </Canvas>
    </div>
  );
}
