import { Item, Point } from "./model";
import { bounds, corners } from "./geometry";
export const resizeHandles = {
  "top-left": [-1, -1],
  "top-center": [0, -1],
  "top-right": [1, -1],
  "middle-left": [-1, 0],
  "middle-right": [1, 0],
  "bottom-left": [-1, 1],
  "bottom-center": [0, 1],
  "bottom-right": [1, 1],
} as const;
export type Handle = keyof typeof resizeHandles | "rotate" | "move";
export type Frame = {
  x: number;
  y: number;
  width: number;
  depth: number;
  rotation: number;
};
export const rotate = (p: Point, degrees: number): Point => {
  const a = (degrees * Math.PI) / 180;
  return {
    x: p.x * Math.cos(a) - p.y * Math.sin(a),
    y: p.x * Math.sin(a) + p.y * Math.cos(a),
  };
};
export function selectionFrame(items: Item[]): Frame {
  if (items.length === 1) return { ...items[0] };
  const b = bounds(items.flatMap(corners));
  return {
    x: b.x + b.width / 2,
    y: b.y + b.depth / 2,
    width: b.width,
    depth: b.depth,
    rotation: 0,
  };
}
export function controlPoint(f: Frame, handle: Handle, zoom: number): Point {
  const pair =
    handle in resizeHandles
      ? resizeHandles[handle as keyof typeof resizeHandles]
      : [0, -1];
  const local = {
    x: (pair[0] * f.width) / 2,
    y:
      (pair[1] * f.depth) / 2 -
      (handle === "rotate" ? 30 / zoom : handle === "move" ? 60 / zoom : 0),
  };
  const q = rotate(local, f.rotation);
  return { x: f.x + q.x, y: f.y + q.y };
}
export function resizeSelection(
  items: Item[],
  f: Frame,
  handle: keyof typeof resizeHandles,
  pointer: Point,
  shift = false,
  alt = false,
): Item[] {
  const [hx, hy] = resizeHandles[handle];
  const p = rotate({ x: pointer.x - f.x, y: pointer.y - f.y }, -f.rotation);
  const opposite = {
    x: alt ? 0 : (-hx * f.width) / 2,
    y: alt ? 0 : (-hy * f.depth) / 2,
  };
  let sx = hx ? ((p.x - opposite.x) * hx) / (f.width * (alt ? 0.5 : 1)) : 1;
  let sy = hy ? ((p.y - opposite.y) * hy) / (f.depth * (alt ? 0.5 : 1)) : 1;
  // Mixed rotations cannot represent nonuniform group shear in the canonical model.
  if (shift || items.length > 1) {
    const scale =
      hx && hy
        ? ((p.x - opposite.x) * hx * f.width +
            (p.y - opposite.y) * hy * f.depth) /
          ((f.width * f.width + f.depth * f.depth) * (alt ? 0.5 : 1))
        : hx
          ? sx
          : sy;
    sx = sy = scale;
  }
  const minX = Math.max(...items.map((i) => 0.1 / i.width)),
    minY = Math.max(...items.map((i) => 0.1 / i.depth));
  const maxX = Math.min(...items.map((i) => 1000 / i.width)),
    maxY = Math.min(...items.map((i) => 1000 / i.depth));
  if (shift || items.length > 1)
    sx = sy = Math.max(minX, minY, Math.min(maxX, maxY, sx));
  else {
    sx = Math.max(minX, Math.min(maxX, sx));
    sy = Math.max(minY, Math.min(maxY, sy));
  }
  const localCenter = {
    x: alt || !hx ? 0 : opposite.x + (hx * f.width * sx) / 2,
    y: alt || !hy ? 0 : opposite.y + (hy * f.depth * sy) / 2,
  };
  const centerOffset = rotate(localCenter, f.rotation);
  return items.map((i) => {
    const local = rotate({ x: i.x - f.x, y: i.y - f.y }, -f.rotation),
      offset = rotate({ x: local.x * sx, y: local.y * sy }, f.rotation);
    return {
      ...i,
      x: f.x + centerOffset.x + offset.x,
      y: f.y + centerOffset.y + offset.y,
      width: i.width * sx,
      depth: i.depth * sy,
    };
  });
}
export function rotateSelection(
  items: Item[],
  f: Frame,
  degrees: number,
): Item[] {
  return items.map((i) => {
    const q = rotate({ x: i.x - f.x, y: i.y - f.y }, degrees);
    return { ...i, x: f.x + q.x, y: f.y + q.y, rotation: i.rotation + degrees };
  });
}
export function controlCursor(handle: Handle, rotation: number) {
  if (handle === "move") return "move";
  if (handle === "rotate") return "grab";
  const [x, y] = resizeHandles[handle];
  const a = (Math.atan2(y, x) * 180) / Math.PI + rotation;
  return ["ew-resize", "nwse-resize", "ns-resize", "nesw-resize"][
    ((Math.round(a / 45) % 4) + 4) % 4
  ];
}

/** Keep edge/corner targets disjoint even when the object projects to less than a pixel. */
export function displayControlPoint(
  f: Frame,
  handle: Handle,
  zoom: number,
): Point {
  return controlPoint(
    {
      ...f,
      width: Math.max(f.width, 36 / zoom),
      depth: Math.max(f.depth, 36 / zoom),
    },
    handle,
    zoom,
  );
}
