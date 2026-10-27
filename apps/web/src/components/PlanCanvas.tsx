"use client";
import {
  useState,
  useEffect,
  useRef,
  useLayoutEffect,
  useMemo,
  memo,
} from "react";
import {
  Stage,
  Layer,
  Group,
  Rect,
  Line,
  Text,
  Image as KImage,
  Transformer,
  Circle,
  Arc,
} from "react-konva";
import Konva from "konva";
import { editWall } from "@core/wall-edit";
import { hitTest, orderedItems, dragSnap } from "@core/hit-test";
Konva.capturePointerEventsEnabled = true;
import { useEditor, activeFloor, rebuild } from "@/lib/store";
import { Point, Item, Reference, Opening, uid } from "@core/model";
import {
  area,
  bounds,
  distance,
  snap,
  toWorld,
  zoomAt,
  wallProjection,
  openingValid,
  validPolygon,
  analyze,
  corners,
  formatLength,
} from "@core/geometry";
import { getCatalog, floorTexture } from "@core/catalog";
import { furnitureSvg, woodSvg, svgData } from "@core/vector";
import { rectangleRoom } from "@core/sample";
function useSvg(svg: string) {
  const [image, setImage] = useState<HTMLImageElement>();
  useEffect(() => {
    const im = new window.Image();
    im.onload = () => setImage(im);
    im.src = svgData(svg);
    return () => {
      im.onload = null;
    };
  }, [svg]);
  return image;
}
function FloorFill({
  color,
  material,
  tile,
  points,
  selected,
}: {
  color: string;
  material: string;
  tile: boolean;
  points: Point[];
  selected: boolean;
}) {
  const fallback = useSvg(woodSvg(color, tile));
  const [texture, setTexture] = useState<HTMLImageElement>();
  const style = useEditor((s) => s.planStyle);
  useEffect(() => {
    let active=true;
    setTexture(undefined);
    const id = floorTexture(material);
    if (!id || style === "blueprint") return;
    const image = new window.Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 256;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(image, 0, 0, 256, 256);
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.35;
      ctx.fillRect(0, 0, 256, 256);
      const tinted = new window.Image();
      tinted.onload = () => { if(active)setTexture(tinted); };
      tinted.src = canvas.toDataURL();
    };
    image.src = `/assets/materials/${id}-albedo.webp`;
    return () => {
      active=false;
      image.onload = null;
    };
  }, [material, style, color]);
  const image =
    style === "blueprint" || material === "plain"
      ? undefined
      : (texture ?? fallback);
  return (
    <Line
      points={points.flatMap((p) => [p.x, p.y])}
      closed
      fill={style === "blueprint" ? "#f4f5f8" : color}
      opacity={1}
      fillPatternImage={image}
      fillPatternScale={{
        x: 1.2 / (texture ? 256 : 96),
        y: 1.2 / (texture ? 256 : 96),
      }}
      fillPriority={image ? "pattern" : "color"}
      stroke={selected ? "#7770ed" : undefined}
      strokeWidth={0.045}
    />
  );
}
const Furniture = memo(function Furniture({ item }: { item: Item }) {
  const { selected, select, tool, snap: snapping } = useEditor();
  const ref = useRef<Konva.Group>(null);
  const planStyle = useEditor((s) => s.planStyle);
  const image = useSvg(
    furnitureSvg(
      item.catalogId,
      item.color,
      180,
      140,
      planStyle === "realistic",
      item.finish,
    ),
  );
  const active = selected.includes(item.id);
  if (item.hidden) return null;
  return (
    <>
      <Group
        ref={ref}
        id={item.id}
        x={item.x}
        y={item.y}
        rotation={item.rotation}
        draggable={
          !item.locked && tool === "select" && !useEditor.getState().readOnly
        }
        onDragStart={() => {
          if (!useEditor.getState().selected.includes(item.id)) select(item.id);
        }}
        onDragMove={(e) => {
          const st = useEditor.getState(),
            result = dragSnap(
              { x: e.target.x(), y: e.target.y() },
              st.zoom,
              st.snap,
            );
          e.target.position(result.point);
          const dx = result.point.x - item.x,
            dy = result.point.y - item.y;
          for (const other of activeFloor().items)
            if (
              other.id !== item.id &&
              !other.locked &&
              (st.selected.includes(other.id) ||
                (item.groupId && other.groupId === item.groupId))
            )
              e.target
                .getStage()
                ?.findOne("#" + other.id)
                ?.position({ x: other.x + dx, y: other.y + dy });
          window.dispatchEvent(
            new CustomEvent("buildspace-snap", {
              detail: { ...result, id: item.id },
            }),
          );
        }}
        onDragEnd={(e) => {
          window.dispatchEvent(
            new CustomEvent("buildspace-snap", { detail: null }),
          );
          const n = e.target;
          const st = useEditor.getState(),
            target = dragSnap({ x: n.x(), y: n.y() }, st.zoom, snapping).point;
          const dx = target.x - item.x,
            dy = target.y - item.y;
          st.commit((scene) => {
            const f = scene.floors.find((f) => f.id === st.floorId)!;
            for (const i of f.items)
              if (
                !i.locked &&
                (st.selected.includes(i.id) ||
                  (item.groupId && i.groupId === item.groupId))
              ) {
                i.x += dx;
                i.y += dy;
              }
          });
          const current = activeFloor();
          for (const i of current.items)
            n.getStage()
              ?.findOne("#" + i.id)
              ?.position({ x: i.x, y: i.y });
        }}
      >
        <KImage
          hitFunc={(ctx, shape) => {
            const c = getCatalog(item.catalogId),
              w = item.width,
              h = item.depth;
            ctx.beginPath();
            if (c.footprint === "ellipse")
              ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
            else if (c.footprint === "sectional") {
              ctx.moveTo(0, 0);
              ctx.lineTo(w, 0);
              ctx.lineTo(w, h);
              ctx.lineTo(w * 0.65, h);
              ctx.lineTo(w * 0.65, h * 0.55);
              ctx.lineTo(0, h * 0.55);
              ctx.closePath();
            } else ctx.rect(0, 0, w, h);
            ctx.fillStrokeShape(shape);
          }}
          image={image}
          scaleX={item.flipX ? -1 : 1}
          x={item.flipX ? item.width / 2 : -item.width / 2}
          y={-item.depth / 2}
          width={item.width}
          height={item.depth}
          shadowColor="#273849"
          shadowOpacity={getCatalog(item.catalogId).kind === "rug" ? 0 : 0.18}
          shadowBlur={0.04}
          shadowOffset={{ x: 0.025, y: 0.035 }}
        />
        <Rect
          x={-item.width / 2}
          y={-item.depth / 2}
          width={item.width}
          height={item.depth}
          stroke={active ? "#7565e8" : undefined}
          strokeWidth={0.025}
          listening={false}
        />
      </Group>
    </>
  );
});
function TraceImage({ reference }: { reference: Reference }) {
  const s = useEditor();
  const [image, setImage] = useState<HTMLImageElement>();
  useEffect(() => {
    const im = new window.Image();
    im.onload = () => setImage(im);
    im.src = reference.dataUrl;
    return () => {
      im.onload = null;
    };
  }, [reference.dataUrl]);
  return (
    <KImage
      image={image}
      x={reference.x}
      y={reference.y}
      width={reference.width}
      height={reference.depth}
      opacity={reference.opacity}
      draggable={!reference.locked && s.tool === "select"}
      onDragEnd={(e) =>
        s.commit((scene) => {
          const r = scene.floors
            .find((f) => f.id === s.floorId)!
            .references.find((r) => r.id === reference.id)!;
          r.x = e.target.x();
          r.y = e.target.y();
        })
      }
    />
  );
}
function DoorSymbol({
  opening: o,
}: {
  opening: import("@core/model").Opening;
}) {
  if (o.style === "sliding" || o.style === "pocket")
    return (
      <Group>
        <Line
          points={[0, -0.04, o.width * 0.55, -0.04]}
          stroke="#4d9b8d"
          strokeWidth={0.03}
        />
        <Line
          points={[o.width * 0.45, 0.04, o.width, 0.04]}
          stroke="#4d9b8d"
          strokeWidth={0.03}
        />
        {o.style === "pocket" && (
          <Line
            points={[o.width, 0, o.width * 1.6, 0]}
            stroke="#4d9b8d"
            strokeWidth={0.02}
            dash={[0.07, 0.04]}
          />
        )}
      </Group>
    );
  if (o.style === "bifold")
    return (
      <Group scaleY={o.flip ? -1 : 1}>
        <Line
          points={[
            0,
            0,
            o.width * 0.25,
            o.width * 0.3,
            o.width * 0.5,
            0,
            o.width * 0.75,
            o.width * 0.3,
            o.width,
            0,
          ]}
          stroke="#4d9b8d"
          strokeWidth={0.025}
        />
      </Group>
    );
  const leaf = (width: number) => (
    <>
      <Line points={[0, 0, 0, width]} stroke="#4d9b8d" strokeWidth={0.025} />
      <Arc
        innerRadius={width}
        outerRadius={width + 0.012}
        angle={90}
        fill="#4d9b8d"
      />
    </>
  );
  return (
    <Group scaleY={o.flip ? -1 : 1}>
      {leaf(o.style === "double" ? o.width / 2 : o.width)}
      {o.style === "double" && (
        <Group x={o.width} scaleX={-1}>
          {leaf(o.width / 2)}
        </Group>
      )}
    </Group>
  );
}
function PlacementPreview({
  id,
  point,
  rotation,
}: {
  id: string;
  point: Point;
  rotation: number;
}) {
  const c = getCatalog(id);
  const image = useSvg(furnitureSvg(c.id, c.color));
  return (
    <Group
      x={point.x}
      y={point.y}
      rotation={rotation}
      opacity={0.65}
      listening={false}
    >
      <KImage
        image={image}
        x={-c.width / 2}
        y={-c.depth / 2}
        width={c.width}
        height={c.depth}
      />
      <Rect
        x={-c.width / 2}
        y={-c.depth / 2}
        width={c.width}
        height={c.depth}
        stroke="#7862db"
        strokeWidth={0.03}
      />
    </Group>
  );
}
export default function PlanCanvas() {
  const host = useRef<HTMLDivElement>(null);
  const lastCursorSent = useRef(0);
  const [remoteCursors, setRemoteCursors] = useState<
    Record<string, { name: string; x: number; y: number; time: number }>
  >({});
  useEffect(() => {
    const onCursor = (e: Event) => {
      const c = (e as CustomEvent).detail;
      setRemoteCursors((prev) => ({
        ...prev,
        [c.clientId]: { ...c, time: Date.now() },
      }));
    };
    window.addEventListener("buildspace-remote-cursor", onCursor);
    const timer = setInterval(
      () =>
        setRemoteCursors((prev) =>
          Object.fromEntries(
            Object.entries(prev).filter(([, v]) => Date.now() - v.time < 8000),
          ),
        ),
      2000,
    );
    return () => {
      window.removeEventListener("buildspace-remote-cursor", onCursor);
      clearInterval(timer);
    };
  }, []);

  const stage = useRef<Konva.Stage>(null);
  const [size, setSize] = useState({ w: 900, h: 700 });
  const touches = useRef(new Map<number, Point>());
  const pinch = useRef<{
    distance: number;
    mid: Point;
    zoom: number;
    pan: Point;
  } | null>(null);
  const marqueeStart = useRef<Point | null>(null);
  const [marquee, setMarquee] = useState<{ a: Point; b: Point } | null>(null);
  const [start, setStart] = useState<Point | null>(null);
  const [cursor, setCursor] = useState<Point>({ x: 0, y: 0 });
  const dragOrigin = useRef<Point | null>(null);
  const suppressClick = useRef(false);
  const [dragPreview, setDragPreview] = useState<Point | null>(null);
  const drawStart = start ?? dragPreview;
  const [polygon, setPolygon] = useState<Point[]>([]);
  const s = useEditor();
  const f = activeFloor();
  const z = s.zoom,
    p = s.pan;
  const problemIds = useMemo(
    () => new Set(analyze(f).map((i) => i.entityId)),
    [f],
  );
  const [context, setContext] = useState<Point | null>(null);
  const [guide, setGuide] = useState<{
    point: Point;
    guides: ("x" | "y")[];
  } | null>(null);
  useEffect(() => {
    const listener = (e: Event) => setGuide((e as CustomEvent).detail);
    window.addEventListener("buildspace-snap", listener);
    return () => window.removeEventListener("buildspace-snap", listener);
  }, []);
  const [space, setSpace] = useState(false);
  useLayoutEffect(() => {
    const ro = new ResizeObserver(([e]) =>
      setSize({ w: e.contentRect.width, h: e.contentRect.height }),
    );
    if (host.current) ro.observe(host.current);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const pts = [
      ...f.rooms.flatMap((r) => r.points),
      ...f.walls.flatMap((w) => [w.a, w.b]),
      ...(f.references ?? []).flatMap((r) => [
        { x: r.x, y: r.y },
        { x: r.x + r.width, y: r.y + r.depth },
      ]),
    ];
    const b = pts.length ? bounds(pts) : { x: 0, y: 0, width: 10, depth: 10 };
    const zoom = Math.min(
      (size.w - (size.w < 760 ? 55 : 180)) / (b.width + 0.8),
      (size.h - 140) / (b.depth + 0.8),
    );
    s.set({
      zoom: Math.max(10, zoom),
      pan: {
        x: (size.w - b.width * zoom) / 2 - b.x * zoom,
        y: (size.h - b.depth * zoom) / 2 - b.y * zoom + 23,
      },
    });
  }, [size.w, size.h, s.fitTick, s.floorId]);
  useEffect(() => {
    setStart(null);
    setPolygon([]);
  }, [s.tool]);
  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (
        document.querySelector('[role="dialog"]') ||
        (e.target as HTMLElement).isContentEditable ||
        (e.target as HTMLElement).matches("input,textarea,select")
      )
        return;
      if (e.code === "Space") {
        e.preventDefault();
        setSpace(true);
      }
      if (e.key === "Escape") {
        setStart(null);
        setPolygon([]);
        marqueeStart.current = null;
        setMarquee(null);
        setGuide(null);
        s.set({ placing: null, tool: "select" });
        s.select(null);
        setContext(null);
      }
    }
    function up(e: KeyboardEvent) {
      if (e.code === "Space") setSpace(false);
    }
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);
  function point() {
    const a = stage.current?.getPointerPosition();
    if (!a) return { x: 0, y: 0 };
    const w = toWorld(a, p, z);
    return s.tool !== "select" && s.snap ? { x: snap(w.x), y: snap(w.y) } : w;
  }
  function finish(start: Point, q: Point) {
    s.commit((scene) => {
      const floor = scene.floors.find((v) => v.id === s.floorId)!;
      if (s.tool === "calibrate") {
        const reference = floor.references.find((r) =>
          s.selected.includes(r.id),
        );
        if (!reference) throw new Error("Select a reference image first");
        const known = Number(
          window.prompt("Known real-world distance in meters", "1"),
        );
        if (!Number.isFinite(known) || known <= 0)
          throw new Error("Enter a positive distance");
        const factor = known / distance(start, q);
        reference.width *= factor;
        reference.depth *= factor;
      } else if (s.tool === "room") {
        const x = Math.min(start.x, q.x),
          y = Math.min(start.y, q.y),
          w = Math.abs(start.x - q.x),
          d = Math.abs(start.y - q.y);
        if (w < 0.25 || d < 0.25)
          throw new Error("Room must be at least 0.25 m wide and deep");
        floor.rooms.push(rectangleRoom("New room", "Custom", x, y, w, d));
        rebuild(floor);
      } else if (s.tool === "wall")
        floor.walls.push({
          id: uid(),
          a: start,
          b: q,
          thickness: 0.14,
          height: floor.height,
          color: "#26364c",
          source: "manual",
        });
      else
        floor.annotations.push({
          id: uid(),
          a: start,
          b: q,
          kind: s.tool === "note" ? "note" : "measure",
          text:
            s.tool === "note"
              ? (window.prompt("Annotation text", "Design note") ?? "Note")
              : "",
        });
    });
    setStart(null);
  }
  function click(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (
      e.target.getParent() instanceof Konva.Transformer ||
      e.target instanceof Konva.Transformer
    )
      return;
    if (s.tool === "pan" || space) return;
    const q = point();
    if (s.placing) {
      s.addItem(s.placing, q);
      return;
    }
    if (s.tool === "polygon") {
      setPolygon((v) => [...v, q]);
      return;
    }
    if (s.tool === "door" || s.tool === "window") {
      const w = [...f.walls].sort(
        (a, b) => wallProjection(q, a).distance - wallProjection(q, b).distance,
      )[0];
      if (!w || wallProjection(q, w).distance > 0.5) {
        s.set({ message: "Click within 0.5 m of a wall to place an opening" });
        return;
      }
      const opening = {
        id: uid(),
        kind: s.tool,
        wallId: w.id,
        offset: Math.max(0.05, wallProjection(q, w).offset - 0.45),
        width: 0.9,
        height: s.tool === "door" ? 2.1 : 1.3,
        sill: s.tool === "door" ? 0 : 0.9,
        flip: false,
      } as const;
      if (!openingValid(opening, w, f.openings)) {
        s.set({
          message:
            "Opening must fit inside its wall without overlapping another opening",
        });
        return;
      }
      s.commit((scene) =>
        scene.floors.find((v) => v.id === s.floorId)!.openings.push(opening),
      );
      s.select(opening.id);
      return;
    }
    if (["room", "wall", "measure", "note", "calibrate"].includes(s.tool)) {
      if (!start) {
        setStart(q);
        return;
      }
      if (distance(start, q) < 0.1) return;
      finish(start, q);
      return;
    }
    const pointer = stage.current?.getPointerPosition();
    if (pointer)
      s.select(
        hitTest(f, pointer, p, z),
        "shiftKey" in e.evt && e.evt.shiftKey,
      );
  }
  const grid = [];
  if (s.grid) {
    const x0 = Math.floor(-p.x / z / 0.25) * 0.25,
      y0 = Math.floor(-p.y / z / 0.25) * 0.25;
    for (let x = x0; x < (size.w - p.x) / z; x += 0.25)
      grid.push(
        <Line
          key={`x${x}`}
          points={[x, -p.y / z, x, (size.h - p.y) / z]}
          stroke={Math.abs(x - Math.round(x)) < 0.01 ? "#d3d8e2" : "#e1e5ed"}
          strokeWidth={1 / z}
          listening={false}
        />,
      );
    for (let y = y0; y < (size.h - p.y) / z; y += 0.25)
      grid.push(
        <Line
          key={`y${y}`}
          points={[-p.x / z, y, (size.w - p.x) / z, y]}
          stroke={Math.abs(y - Math.round(y)) < 0.01 ? "#d3d8e2" : "#e1e5ed"}
          strokeWidth={1 / z}
          listening={false}
        />,
      );
  }
  const b = f.rooms.length ? bounds(f.rooms.flatMap((r) => r.points)) : null;
  return (
    <div
      ref={host}
      className={`plan-surface ${s.tool === "pan" || space ? "panning" : s.tool !== "select" || s.placing ? "drawing" : ""}`}
      data-testid="plan-canvas"
      role="application"
      aria-label="Floor plan canvas. Shift drag for marquee, Space drag to pan, pinch to zoom."
      tabIndex={0}
      onPointerDownCapture={(e) => {
        const target = e.target as HTMLElement;
        if (target.tagName === "CANVAS") target.setPointerCapture(e.pointerId);
        if (e.pointerType !== "touch") return;
        const rect = e.currentTarget.getBoundingClientRect();
        touches.current.set(e.pointerId, {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
        if (touches.current.size === 2) {
          const [a, b] = [...touches.current.values()];
          const state = useEditor.getState();
          pinch.current = {
            distance: distance(a, b),
            mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
            zoom: state.zoom,
            pan: state.pan,
          };
          stage.current?.stopDrag();
          stage.current?.find("Group").forEach((n) => n.stopDrag());
        }
      }}
      onPointerMoveCapture={(e) => {
        if (e.pointerType !== "touch" || !touches.current.has(e.pointerId))
          return;
        const rect = e.currentTarget.getBoundingClientRect();
        touches.current.set(e.pointerId, {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
        if (pinch.current && touches.current.size === 2) {
          e.preventDefault();
          e.stopPropagation();
          const [a, b] = [...touches.current.values()],
            initial = pinch.current;
          const next = Math.max(
              12,
              Math.min(
                180,
                (initial.zoom * distance(a, b)) / Math.max(1, initial.distance),
              ),
            ),
            world = toWorld(initial.mid, initial.pan, initial.zoom);
          s.set({
            zoom: next,
            pan: {
              x: (a.x + b.x) / 2 - world.x * next,
              y: (a.y + b.y) / 2 - world.y * next,
            },
          });
          suppressClick.current = true;
        }
      }}
      onPointerUpCapture={(e) => {
        touches.current.delete(e.pointerId);
        if (touches.current.size < 2) pinch.current = null;
      }}
      onPointerCancel={(e) => {
        touches.current.delete(e.pointerId);
        pinch.current = null;
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        const id = hitTest(
          f,
          { x: e.clientX - rect.left, y: e.clientY - rect.top },
          p,
          z,
        );
        s.select(id);
        setContext(
          id ? { x: e.clientX - rect.left, y: e.clientY - rect.top } : null,
        );
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const id = e.dataTransfer.getData("buildspace/item");
        const rect = host.current!.getBoundingClientRect();
        if (id)
          s.addItem(
            id,
            toWorld(
              { x: e.clientX - rect.left, y: e.clientY - rect.top },
              p,
              z,
            ),
          );
      }}
    >
      <div className="ruler horizontal">
        {Array.from({ length: 25 }, (_, i) => (
          <span key={i}>{i}</span>
        ))}
      </div>
      <div className="north">
        <span>↑</span>N
      </div>
      <Stage
        ref={stage}
        width={size.w}
        height={size.h}
        scaleX={z}
        scaleY={z}
        x={p.x}
        y={p.y}
        draggable={s.tool === "pan" || space}
        onDragMove={(e) => {
          if (e.target === stage.current)
            s.set({ pan: { x: e.target.x(), y: e.target.y() } });
        }}
        onDragEnd={(e) => {
          suppressClick.current = true;
          if (e.target === stage.current)
            s.set({ pan: { x: e.target.x(), y: e.target.y() } });
        }}
        onClick={click}
        onTap={click as any}
        onMouseDown={(e) => {
          if (s.tool === "select" && e.evt.shiftKey && !s.placing) {
            const screen = stage.current!.getPointerPosition()!;
            const id = hitTest(f, screen, p, z);
            if (!id || f.rooms.some((r) => r.id === id)) {
              marqueeStart.current = point();
              setMarquee({ a: point(), b: point() });
              return;
            }
          }
          setContext(null);
          suppressClick.current = false;
          if (["room", "wall", "measure"].includes(s.tool) && !start)
            dragOrigin.current = point();
        }}
        onMouseUp={() => {
          if (marqueeStart.current) {
            const a = marqueeStart.current,
              b = point();
            marqueeStart.current = null;
            setMarquee(null);
            if (distance(a, b) * z > 4) {
              const ids = f.items
                .filter(
                  (i) =>
                    !i.hidden &&
                    corners(i).every(
                      (c) =>
                        c.x >= Math.min(a.x, b.x) &&
                        c.x <= Math.max(a.x, b.x) &&
                        c.y >= Math.min(a.y, b.y) &&
                        c.y <= Math.max(a.y, b.y),
                    ),
                )
                .map((i) => i.id);
              s.set({ selected: [...new Set([...s.selected, ...ids])] });
              suppressClick.current = true;
              return;
            }
          }
          const a = dragOrigin.current;
          dragOrigin.current = null;
          const q = point();
          if (a && distance(a, q) > 0.2) {
            finish(a, q);
            setDragPreview(null);
            suppressClick.current = true;
          }
        }}
        onMouseMove={() => {
          const q = point();
          if (marqueeStart.current)
            setMarquee({ a: marqueeStart.current, b: q });
          if (s.tool !== "select" || s.placing) setCursor(q);
          if (Date.now() - lastCursorSent.current > 100) {
            lastCursorSent.current = Date.now();
            window.dispatchEvent(
              new CustomEvent("buildspace-cursor", { detail: q }),
            );
          }
          if (dragOrigin.current && distance(dragOrigin.current, q) > 0.2)
            setDragPreview(dragOrigin.current);
        }}
        onDblClick={() => {
          if (s.tool === "polygon" && polygon.length >= 3) {
            const points = polygon.filter(
              (p, i, a) => i === 0 || distance(p, a[i - 1]) > 0.01,
            );
            if (!validPolygon(points)) {
              s.set({
                message: "A room needs a valid non-intersecting boundary",
              });
              return;
            }
            s.commit((scene) => {
              const floor = scene.floors.find((v) => v.id === s.floorId)!;
              floor.rooms.push({
                ...rectangleRoom("Custom room", "Custom", 0, 0, 1, 1),
                points,
              });
              rebuild(floor);
            });
            setPolygon([]);
          }
        }}
        onWheel={(e) => {
          e.evt.preventDefault();
          const { zoom: z, pan: p } = useEditor.getState();
          const q = stage.current!.getPointerPosition()!;
          const next = Math.max(
            12,
            Math.min(
              180,
              z *
                (e.evt.ctrlKey
                  ? Math.exp(-e.evt.deltaY * 0.01)
                  : e.evt.deltaY > 0
                    ? 0.92
                    : 1.08),
            ),
          );
          s.set({ zoom: next, pan: zoomAt(q, p, z, next) });
        }}
      >
        <Layer>
          {grid}
          {(f.references ?? []).map((reference) => (
            <TraceImage key={reference.id} reference={reference} />
          ))}
          {f.rooms.map((r) => (
            <FloorFill
              key={r.id}
              color={r.color}
              material={r.material}
              tile={["tile", "marble", "terrazzo", "concrete"].includes(
                r.material,
              )}
              points={r.points}
              selected={s.selected.includes(r.id)}
            />
          ))}
          {f.walls.map((w) => (
            <Line
              key={w.id}
              id={w.id}
              draggable={s.tool === "select" && !s.readOnly}
              onDragStart={() => s.select(w.id)}
              onDragEnd={(e) => {
                const dx = e.target.x(),
                  dy = e.target.y();
                e.target.position({ x: 0, y: 0 });
                s.commit((scene) =>
                  editWall(
                    scene.floors.find((f) => f.id === s.floorId)!,
                    w.id,
                    { x: w.a.x + dx, y: w.a.y + dy },
                    { x: w.b.x + dx, y: w.b.y + dy },
                  ),
                );
              }}
              points={[w.a.x, w.a.y, w.b.x, w.b.y]}
              stroke={s.selected.includes(w.id) ? "#7a67e8" : w.color}
              strokeWidth={w.thickness}
              shadowColor="#15243b"
              shadowOpacity={s.planStyle === "realistic" ? 0.22 : 0}
              shadowBlur={0.07}
              shadowOffset={{ x: 0.035, y: 0.05 }}
              lineCap="square"
              hitStrokeWidth={w.thickness + 10 / z}
            />
          ))}
          {f.openings.map((o) => {
            const w = f.walls.find((w) => w.id === o.wallId);
            if (!w) return null;
            const len = distance(w.a, w.b),
              angle =
                (Math.atan2(w.b.y - w.a.y, w.b.x - w.a.x) * 180) / Math.PI;
            return (
              <Group
                key={o.id}
                x={w.a.x + ((w.b.x - w.a.x) * o.offset) / len}
                y={w.a.y + ((w.b.y - w.a.y) * o.offset) / len}
                rotation={angle}
              >
                <Line
                  points={[0, 0, o.width, 0]}
                  stroke="#eee9da"
                  strokeWidth={w.thickness + 0.025}
                />
                {o.kind === "door" ? (
                  <DoorSymbol opening={o} />
                ) : o.kind === "window" ? (
                  <>
                    <Rect
                      y={-0.045}
                      width={o.width}
                      height={0.09}
                      fill="#e1edf2"
                      stroke="#679ac5"
                      strokeWidth={0.02}
                    />
                    <Line
                      points={[0, 0, o.width, 0]}
                      stroke="#679ac5"
                      strokeWidth={0.015}
                    />
                  </>
                ) : null}
                {s.selected.includes(o.id) && (
                  <Rect
                    y={-0.13}
                    width={o.width}
                    height={0.26}
                    stroke="#7565e8"
                    strokeWidth={0.02}
                  />
                )}
              </Group>
            );
          })}
          {orderedItems(f.items).map((i) => (
            <Furniture key={i.id} item={i} />
          ))}
          {s.labels &&
            f.rooms.map((r) => {
              const b = bounds(r.points);
              return (
                <Group
                  key={r.id}
                  x={b.x + b.width / 2}
                  y={b.y + b.depth / 2}
                  listening={false}
                >
                  <Text
                    x={-1.8}
                    y={0.35}
                    width={3.6}
                    align="center"
                    text={r.name}
                    fontFamily="Arial"
                    fontStyle="600"
                    fontSize={0.23}
                    fill="#374557"
                    shadowColor="#fff"
                    shadowBlur={0.05}
                  />
                  <Text
                    x={-1}
                    y={0.62}
                    width={2}
                    align="center"
                    text={`${area(r.points).toFixed(1)} m²`}
                    fontSize={0.17}
                    fill="#697866"
                  />
                </Group>
              );
            })}
          {s.measurements && b && (
            <Group listening={false}>
              <Line
                points={[b.x - 0.65, b.y, b.x - 0.65, b.y + b.depth]}
                stroke="#7f8a9a"
                strokeWidth={0.012}
              />
              <Line
                points={[b.x, b.y - 0.5, b.x + b.width, b.y - 0.5]}
                stroke="#7f8a9a"
                strokeWidth={0.012}
              />
              {[b.x, b.x + b.width].map((x) => (
                <Line
                  key={x}
                  points={[x, b.y - 0.65, x, b.y - 0.35]}
                  stroke="#7f8a9a"
                  strokeWidth={0.012}
                />
              ))}
              {[b.y, b.y + b.depth].map((y) => (
                <Line
                  key={y}
                  points={[b.x - 0.8, y, b.x - 0.5, y]}
                  stroke="#7f8a9a"
                  strokeWidth={0.012}
                />
              ))}
              <Text
                x={b.x + b.width / 2 - 0.6}
                y={b.y - 0.85}
                text={formatLength(b.width, s.scene.unit)}
                fontSize={0.16}
                fill="#687386"
              />
              <Text
                x={b.x - 0.97}
                y={b.y + b.depth / 2 + 0.5}
                rotation={-90}
                text={formatLength(b.depth, s.scene.unit)}
                fontSize={0.16}
                fill="#687386"
              />
            </Group>
          )}
          {f.annotations.map((a) => (
            <Group key={a.id}>
              <Line
                points={[a.a.x, a.a.y, a.b.x, a.b.y]}
                stroke="#7064d6"
                strokeWidth={0.025}
                dash={[0.1, 0.06]}
              />
              <Text
                x={(a.a.x + a.b.x) / 2}
                y={(a.a.y + a.b.y) / 2 - 0.25}
                text={
                  a.kind === "measure"
                    ? formatLength(distance(a.a, a.b), s.scene.unit)
                    : a.text
                }
                fontSize={0.18}
                fill="#5f56b1"
              />
            </Group>
          ))}
          {drawStart && (
            <Group listening={false}>
              <Line
                points={
                  s.tool === "room"
                    ? [
                        drawStart.x,
                        drawStart.y,
                        cursor.x,
                        drawStart.y,
                        cursor.x,
                        cursor.y,
                        drawStart.x,
                        cursor.y,
                        drawStart.x,
                        drawStart.y,
                      ]
                    : [drawStart.x, drawStart.y, cursor.x, cursor.y]
                }
                stroke="#7967e8"
                strokeWidth={0.035}
                fill={s.tool === "room" ? "#8b7bea22" : undefined}
                dash={[0.1, 0.06]}
                closed={s.tool === "room"}
              />
              <Text
                x={cursor.x + 0.15}
                y={cursor.y}
                text={
                  s.tool === "room"
                    ? `${Math.abs(cursor.x - drawStart.x).toFixed(2)} × ${Math.abs(cursor.y - drawStart.y).toFixed(2)} m`
                    : `${distance(drawStart, cursor).toFixed(2)} m`
                }
                fontSize={0.2}
                fill="#6555c5"
              />
            </Group>
          )}
          {polygon.length > 0 && (
            <Line
              points={[...polygon, cursor].flatMap((p) => [p.x, p.y])}
              stroke="#7967e8"
              strokeWidth={0.035}
              dash={[0.1, 0.06]}
              listening={false}
            />
          )}
          {s.collisions &&
            f.items
              .filter((i) => !i.hidden && problemIds.has(i.id))
              .map((i) => (
                <Line
                  key={i.id}
                  points={corners(i).flatMap((p) => [p.x, p.y])}
                  closed
                  stroke="#e2718d"
                  fill="#e2718d22"
                  strokeWidth={0.04}
                  listening={false}
                />
              ))}
          {Object.entries(remoteCursors).map(([id, c]) => (
            <Group key={id} x={c.x} y={c.y} listening={false}>
              <Line
                points={[0, 0, 0.08, 0.23, 0.14, 0.14, 0.23, 0.1]}
                closed
                fill="#c28b64"
                stroke="#fff"
                strokeWidth={0.015}
              />
              <Text
                x={0.2}
                y={0.15}
                text={c.name}
                fontSize={0.16}
                padding={0.05}
                fill="#a16d46"
              />
            </Group>
          ))}
          {s.placing && (
            <PlacementPreview
              id={s.placing}
              point={cursor}
              rotation={s.placingRotation}
            />
          )}
        </Layer>
        <Layer>
          {guide && (
            <Group listening={false}>
              {guide.guides.map((axis) => (
                <Line
                  key={axis}
                  points={
                    axis === "x"
                      ? [
                          guide.point.x,
                          -p.y / z,
                          guide.point.x,
                          (size.h - p.y) / z,
                        ]
                      : [
                          -p.x / z,
                          guide.point.y,
                          (size.w - p.x) / z,
                          guide.point.y,
                        ]
                  }
                  stroke="#9878ed"
                  strokeWidth={1 / z}
                  dash={[5 / z, 4 / z]}
                />
              ))}
            </Group>
          )}
          {marquee && (
            <Rect
              listening={false}
              x={Math.min(marquee.a.x, marquee.b.x)}
              y={Math.min(marquee.a.y, marquee.b.y)}
              width={Math.abs(marquee.a.x - marquee.b.x)}
              height={Math.abs(marquee.a.y - marquee.b.y)}
              fill="#7565e822"
              stroke="#7565e8"
              strokeWidth={1 / z}
            />
          )}
          <SelectionHandles />
          {s.tool === "select" &&
            !s.readOnly &&
            f.walls
              .filter((w) => s.selected.includes(w.id))
              .flatMap((w) =>
                (["a", "b"] as const).map((endpoint) => (
                  <Circle
                    key={w.id + endpoint}
                    x={w[endpoint].x}
                    y={w[endpoint].y}
                    radius={6 / z}
                    hitStrokeWidth={6 / z}
                    fill="white"
                    stroke="#7362e6"
                    strokeWidth={1 / z}
                    draggable
                    onMouseEnter={() => {
                      stage.current!.container().style.cursor = "crosshair";
                    }}
                    onMouseLeave={() => {
                      stage.current!.container().style.cursor = "default";
                    }}
                    onDragEnd={(e) => {
                      const q = { x: e.target.x(), y: e.target.y() };
                      s.commit((scene) =>
                        editWall(
                          scene.floors.find((f) => f.id === s.floorId)!,
                          w.id,
                          endpoint === "a" ? q : w.a,
                          endpoint === "b" ? q : w.b,
                        ),
                      );
                    }}
                    onClick={(e) => {
                      e.cancelBubble = true;
                    }}
                  />
                )),
              )}
        </Layer>
      </Stage>
      {context && (
        <div
          role="menu"
          style={{
            position: "absolute",
            left: context.x,
            top: context.y,
            zIndex: 30,
            background: "white",
            border: "1px solid #d3d8e2",
            borderRadius: 8,
            padding: 8,
          }}
        >
          {(f.items.some((i) => s.selected.includes(i.id))
            ? ["duplicate", "rotate", "lock", "front", "back", "delete"]
            : ["delete"]
          ).map((action) => (
            <button
              role="menuitem"
              key={action}
              onClick={() => {
                s.action(action);
                setContext(null);
              }}
              style={{
                display: "block",
                padding: 8,
                width: "100%",
                textAlign: "left",
              }}
            >
              {action}
            </button>
          ))}
        </div>
      )}
      <div className="canvas-status">
        <span className="live-dot" />
        {s.placing
          ? "Click to place · R to rotate"
          : s.tool === "polygon"
            ? "Click corners · double-click to finish"
            : start
              ? "Click to finish · Esc to cancel"
              : "Scroll to zoom · Space + drag to pan"}
        <span className="mono">
          {cursor.x.toFixed(2)}, {cursor.y.toFixed(2)} m
        </span>
      </div>
    </div>
  );
}

function SelectionHandles() {
  const s = useEditor(),
    tr = useRef<Konva.Transformer>(null);
  useLayoutEffect(() => {
    const stage = tr.current?.getStage();
    if (!stage || !tr.current) return;
    const items = activeFloor().items.filter(
      (i) => s.selected.includes(i.id) && !i.locked && !i.hidden,
    );
    tr.current.nodes(
      items
        .map((i) => stage.findOne("#" + i.id))
        .filter(Boolean) as Konva.Node[],
    );
    tr.current.getLayer()?.batchDraw();
  }, [s.selected, s.scene, s.tool]);
  return s.tool === "select" && !s.readOnly ? (
    <Transformer
      ref={tr}
      onTransformEnd={() => {
        const nodes = tr.current?.nodes() ?? [];
        const patches = nodes.map((n) => ({
          id: n.id(),
          x: n.x(),
          y: n.y(),
          rotation: n.rotation(),
          sx: n.scaleX(),
          sy: n.scaleY(),
        }));
        for (const n of nodes) n.scale({ x: 1, y: 1 });
        s.commit((scene) => {
          for (const patch of patches) {
            const i = scene.floors
              .find((f) => f.id === s.floorId)!
              .items.find((i) => i.id === patch.id);
            if (i && !i.locked)
              Object.assign(i, {
                x: patch.x,
                y: patch.y,
                rotation: patch.rotation,
                width: Math.max(0.1, i.width * patch.sx),
                depth: Math.max(0.1, i.depth * patch.sy),
              });
          }
        });
      }}
      flipEnabled={false}
      keepRatio={false}
      shiftBehavior="default"
      centeredScaling={false}
      anchorSize={12}
      anchorStyleFunc={(anchor: Konva.Rect) => anchor.hitStrokeWidth(6)}
      borderStroke="#7362e6"
      anchorStroke="#7362e6"
      anchorFill="white"
      shouldOverdrawWholeArea={false}
      boundBoxFunc={(old, next) =>
        Math.abs(next.width) < 5 || Math.abs(next.height) < 5 ? old : next
      }
    />
  ) : null;
}
