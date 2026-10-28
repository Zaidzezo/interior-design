"use client";
import { useEffect, useRef, useState } from "react";
import Konva from "konva";
import { useEditor, activeFloor } from "@/lib/store";
import { Item, Point, Scene } from "@core/model";
import { toWorld, distance } from "@core/geometry";
import { dragSnap } from "@core/hit-test";
import {
  selectionFrame,
  controlPoint,
  controlCursor,
  resizeHandles,
  resizeSelection,
  rotateSelection,
  Handle,
  Frame,
} from "@core/transforms";

type Gesture = {
  scene: Scene;
  host: HTMLElement;
  handle: Handle;
  items: Item[];
  frame: Frame;
  start: Point;
  offset: Point;
  preview: Item[];
  pointerId: number;
  button: HTMLButtonElement;
  zoom: number;
  pan: Point;
  floorId: string;
};
const handles = [...Object.keys(resizeHandles), "rotate", "move"] as Handle[];
export default function SelectionControls({
  stage,
  renderer,
}: {
  stage?: React.RefObject<Konva.Stage | null>;
  renderer?: {preview:(items:Item[],original:Item[])=>void};
}) {
  const s = useEditor(),
    gesture = useRef<Gesture | null>(null),
    [preview, setPreview] = useState<Item[] | null>(null);
  const items = activeFloor().items.filter(
    (i) => s.selected.includes(i.id) && !i.hidden && !i.locked,
  );
  const current = preview ?? items;
  function show(list: Item[], original: Item[]) {
    if(renderer){renderer.preview(list,original);return;}
    for (const i of list) {
      const old = original.find((o) => o.id === i.id);
      stage?.current?.findOne("#" + i.id)?.setAttrs({
        x: i.x,
        y: i.y,
        rotation: i.rotation,
        scaleX: old ? i.width / old.width : 1,
        scaleY: old ? i.depth / old.depth : 1,
      });
    }
    stage?.current?.batchDraw();
  }
  function finish(commit: boolean) {
    const g = gesture.current;
    if (!g) return;
    gesture.current = null;
    delete g.host.dataset.transforming;
    try {
      if (g.button.hasPointerCapture(g.pointerId))
        g.button.releasePointerCapture(g.pointerId);
    } catch {}
    show(g.items, g.items);
    const latest = useEditor.getState();
    if (
      commit &&
      latest.scene === g.scene &&
      latest.floorId === g.floorId &&
      g.items.every((i) => latest.selected.includes(i.id))
    )
      latest.commit((scene) => {
        const floor = scene.floors.find((f) => f.id === g.floorId);
        if (floor)
          for (const patch of g.preview) {
            const item = floor.items.find((i) => i.id === patch.id);
            if (item && !item.locked)
              Object.assign(item, {
                x: patch.x,
                y: patch.y,
                rotation: patch.rotation,
                width: patch.width,
                depth: patch.depth,
              });
          }
      });
    const actual = activeFloor().items;
    show(actual, actual);
    setPreview(null);
    window.dispatchEvent(new CustomEvent("buildspace-snap", { detail: null }));
  }
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && gesture.current) {e.stopImmediatePropagation();finish(false);}
    };
    const blur = () => finish(false);
    window.addEventListener("keydown", key, true);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", key, true);
      window.removeEventListener("blur", blur);
      const g = gesture.current;
      if (g) {
        delete g.host.dataset.transforming;
        const actual = activeFloor().items;
        show(actual, actual);
        gesture.current = null;
      }
    };
  }, []);
  useEffect(() => {
    const g = gesture.current;
    if (
      g &&
      (s.scene !== g.scene ||
        s.floorId !== g.floorId ||
        s.tool !== "select" ||
        s.readOnly)
    )
      finish(false);
  }, [s.scene, s.floorId, s.tool, s.readOnly, s.selected, s.projectId]);
  useEffect(() => {
    const follow = (event: Event) => {
      if (gesture.current) return;
      const detail = (event as CustomEvent).detail;
      if(detail?.items){setPreview(detail.items);return;}
      if (!detail?.id) {
        setPreview(null);
        return;
      }
      const state = useEditor.getState();
      const selected = activeFloor().items.filter(
        (i) => state.selected.includes(i.id) && !i.locked && !i.hidden,
      );
      setPreview(
        selected.map((i) => {
          const node = stage?.current?.findOne("#" + i.id);
          return node ? { ...i, x: node.x(), y: node.y() } : i;
        }),
      );
    };
    window.addEventListener("buildspace-snap", follow);
    return () => window.removeEventListener("buildspace-snap", follow);
  }, []);
  if (!current.length || s.tool !== "select" || s.readOnly) return null;
  const frame = selectionFrame(current);
  const g = gesture.current;
  // Preserve the initial visual padding during capture so the dragged control stays under the pointer.
  const displayFrame = g
    ? {
        ...frame,
        width: frame.width + Math.max(0, 36 / g.zoom - g.frame.width),
        depth: frame.depth + Math.max(0, 36 / g.zoom - g.frame.depth),
      }
    : {
        ...frame,
        width: Math.max(frame.width, 36 / s.zoom),
        depth: Math.max(frame.depth, 36 / s.zoom),
      };

  const screen = (p: Point) => ({
    x: p.x * s.zoom + s.pan.x,
    y: p.y * s.zoom + s.pan.y,
  });
  return (
    <div className="selection-controls" aria-label="Object transform controls">
      {(displayFrame.width > frame.width ||
        displayFrame.depth > frame.depth) && (
        <div
          aria-hidden="true"
          className="selection-cage"
          style={{
            left: screen(frame).x,
            top: screen(frame).y,
            width: displayFrame.width * s.zoom,
            height: displayFrame.depth * s.zoom,
            transform: `translate(-50%,-50%) rotate(${frame.rotation}deg)`,
          }}
        />
      )}
      {handles.map((handle) => {
        const pos = screen(controlPoint(displayFrame, handle, s.zoom));
        return (
          <button
            type="button"
            key={handle}
            className={`object-handle ${handle}`}
            aria-label={`${handle} handle`}
            data-handle={handle}
            style={{
              left: pos.x,
              top: pos.y,
              cursor: controlCursor(handle, frame.rotation),
            }}
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              e.preventDefault();
              e.stopPropagation();
              const rect =
                  e.currentTarget.parentElement!.getBoundingClientRect(),
                pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top };
              const nearest = [...handles].sort(
                (a, b) =>
                  distance(
                    screen(controlPoint(displayFrame, a, s.zoom)),
                    pointer,
                  ) -
                  distance(
                    screen(controlPoint(displayFrame, b, s.zoom)),
                    pointer,
                  ),
              )[0];
              const world = toWorld(pointer, s.pan, s.zoom),
                origin = controlPoint(frame, nearest, s.zoom);
              const snapshot = structuredClone(items);
              e.currentTarget.setPointerCapture(e.pointerId);
              e.currentTarget.parentElement!.parentElement!.dataset.transforming =
                "true";
              gesture.current = {
                scene: s.scene,
                host: e.currentTarget.parentElement!.parentElement!,
                handle: nearest,
                items: snapshot,
                frame: selectionFrame(snapshot),
                start: world,
                offset: { x: world.x - origin.x, y: world.y - origin.y },
                preview: snapshot,
                pointerId: e.pointerId,
                button: e.currentTarget,
                zoom: s.zoom,
                pan: { ...s.pan },
                floorId: s.floorId,
              };
            }}
            onPointerMove={(e) => {
              const g = gesture.current;
              if (!g) {
                const rect =
                    e.currentTarget.parentElement!.getBoundingClientRect(),
                  point = { x: e.clientX - rect.left, y: e.clientY - rect.top };
                const nearest = [...handles].sort(
                  (a, b) =>
                    distance(
                      screen(controlPoint(displayFrame, a, s.zoom)),
                      point,
                    ) -
                    distance(
                      screen(controlPoint(displayFrame, b, s.zoom)),
                      point,
                    ),
                )[0];
                e.currentTarget.style.cursor = controlCursor(
                  nearest,
                  frame.rotation,
                );
                return;
              }
              if (g.pointerId !== e.pointerId) return;
              e.preventDefault();
              e.stopPropagation();
              const rect =
                  e.currentTarget.parentElement!.getBoundingClientRect(),
                p = toWorld(
                  { x: e.clientX - rect.left, y: e.clientY - rect.top },
                  g.pan,
                  g.zoom,
                );
              let next: Item[];
              if (g.handle === "move") {
                const result = dragSnap(
                  {
                    x: g.frame.x + p.x - g.start.x,
                    y: g.frame.y + p.y - g.start.y,
                  },
                  g.zoom,
                  useEditor.getState().snap,
                );
                next = g.items.map((i) => ({
                  ...i,
                  x: i.x + result.point.x - g.frame.x,
                  y: i.y + result.point.y - g.frame.y,
                }));
                window.dispatchEvent(
                  new CustomEvent("buildspace-snap", { detail: result }),
                );
              } else if (g.handle === "rotate") {
                const start = Math.atan2(
                    g.start.y - g.frame.y,
                    g.start.x - g.frame.x,
                  ),
                  angle = Math.atan2(p.y - g.frame.y, p.x - g.frame.x);
                let degrees = ((angle - start) * 180) / Math.PI;
                if (e.shiftKey) degrees = Math.round(degrees / 15) * 15;
                next = rotateSelection(g.items, g.frame, degrees);
              } else
                next = resizeSelection(
                  g.items,
                  g.frame,
                  g.handle,
                  { x: p.x - g.offset.x, y: p.y - g.offset.y },
                  e.shiftKey,
                  e.altKey,
                );
              g.preview = next;
              show(next, g.items);
              setPreview(next);
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              e.stopPropagation();
              finish(true);
            }}
            onPointerCancel={() => finish(false)}
            onLostPointerCapture={() => {
              if (gesture.current) finish(false);
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <span aria-hidden="true">
              {handle === "rotate" ? "↻" : handle === "move" ? "✥" : ""}
            </span>
          </button>
        );
      })}
    </div>
  );
}
