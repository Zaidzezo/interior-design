import type { Point, Room, Item, Floor, Wall, Opening } from "./model";
const EPS = 1e-7;
export const distance = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.y - b.y);
export const area = (p: Point[]) =>
  Math.abs(
    p.reduce((s, a, i) => {
      const b = p[(i + 1) % p.length];
      return s + a.x * b.y - b.x * a.y;
    }, 0),
  ) / 2;
export const perimeter = (p: Point[]) =>
  p.reduce((s, a, i) => s + distance(a, p[(i + 1) % p.length]), 0);
export const bounds = (points: Point[]) => ({
  x: Math.min(...points.map((p) => p.x)),
  y: Math.min(...points.map((p) => p.y)),
  width:
    Math.max(...points.map((p) => p.x)) - Math.min(...points.map((p) => p.x)),
  depth:
    Math.max(...points.map((p) => p.y)) - Math.min(...points.map((p) => p.y)),
});
export function pointInPolygon(p: Point, poly: Point[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i],
      b = poly[j];
    const cross = (p.y - a.y) * (b.x - a.x) - (p.x - a.x) * (b.y - a.y);
    if (
      Math.abs(cross) < EPS &&
      p.x >= Math.min(a.x, b.x) - EPS &&
      p.x <= Math.max(a.x, b.x) + EPS &&
      p.y >= Math.min(a.y, b.y) - EPS &&
      p.y <= Math.max(a.y, b.y) + EPS
    )
      return true;
    if (
      a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside;
  }
  return inside;
}
const cross = (a: Point, b: Point, c: Point) =>
  (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
export function intersects(a: Point, b: Point, c: Point, d: Point) {
  return (
    cross(a, b, c) * cross(a, b, d) < -EPS &&
    cross(c, d, a) * cross(c, d, b) < -EPS
  );
}
export function validPolygon(p: Point[]) {
  if (
    p.length < 3 ||
    !p.every((v) => Number.isFinite(v.x) && Number.isFinite(v.y)) ||
    area(p) < 0.04
  )
    return false;
  for (let i = 0; i < p.length; i++) {
    if (distance(p[i], p[(i + 1) % p.length]) < EPS) return false;
    for (let j = i + 1; j < p.length; j++)
      if (
        j !== i + 1 &&
        !(i === 0 && j === p.length - 1) &&
        intersects(p[i], p[(i + 1) % p.length], p[j], p[(j + 1) % p.length])
      )
        return false;
  }
  return true;
}
export function corners(item: Item): Point[] {
  const r = (item.rotation * Math.PI) / 180,
    c = Math.cos(r),
    s = Math.sin(r);
  return [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([a, b]) => ({
    x: item.x + ((a * item.width) / 2) * c - ((b * item.depth) / 2) * s,
    y: item.y + ((a * item.width) / 2) * s + ((b * item.depth) / 2) * c,
  }));
}
export function overlap(a: Point[], b: Point[]) {
  for (const p of [a, b])
    for (let i = 0; i < p.length; i++) {
      const q = p[(i + 1) % p.length],
        n = { x: -(q.y - p[i].y), y: q.x - p[i].x };
      const aa = a.map((v) => v.x * n.x + v.y * n.y),
        bb = b.map((v) => v.x * n.x + v.y * n.y);
      if (
        Math.max(...aa) <= Math.min(...bb) + EPS ||
        Math.max(...bb) <= Math.min(...aa) + EPS
      )
        return false;
    }
  return true;
}
export const snap = (n: number, step = 0.25) => Math.round(n / step) * step;
export const toScreen = (p: Point, pan: Point, zoom: number) => ({
  x: p.x * zoom + pan.x,
  y: p.y * zoom + pan.y,
});
export const toWorld = (p: Point, pan: Point, zoom: number) => ({
  x: (p.x - pan.x) / zoom,
  y: (p.y - pan.y) / zoom,
});
export function zoomAt(p: Point, pan: Point, oldZoom: number, newZoom: number) {
  const w = toWorld(p, pan, oldZoom);
  return { x: p.x - w.x * newZoom, y: p.y - w.y * newZoom };
}
export const unitFactor = {
  m: 1,
  cm: 100,
  mm: 1000,
  ft: 3.280839895,
  in: 39.37007874,
};
export const formatLength = (n: number, unit: keyof typeof unitFactor = "m") =>
  `${(n * unitFactor[unit]).toFixed(unit === "mm" ? 0 : 2)} ${unit}`;
export function wallsFromRooms(rooms: Room[], previous: Wall[] = []): Wall[] {
  const edges = rooms.flatMap((r) =>
    r.points.map((p, i) => ({ a: p, b: r.points[(i + 1) % r.points.length] })),
  );
  const points = rooms.flatMap((r) => r.points);
  const map = new Map<string, Wall>();
  const key = (a: Point, b: Point) =>
    [
      `${a.x.toFixed(4)},${a.y.toFixed(4)}`,
      `${b.x.toFixed(4)},${b.y.toFixed(4)}`,
    ]
      .sort()
      .join(":");
  const old = new Map(previous.map((w) => [key(w.a, w.b), w]));
  for (const e of edges) {
    const len = distance(e.a, e.b);
    const cuts = points
      .filter(
        (p) =>
          Math.abs(cross(e.a, e.b, p)) < EPS &&
          distance(e.a, p) <= len + EPS &&
          distance(e.b, p) <= len + EPS,
      )
      .sort((a, b) => distance(e.a, a) - distance(e.a, b));
    for (let i = 0; i < cuts.length - 1; i++) {
      const a = cuts[i],
        b = cuts[i + 1];
      if (distance(a, b) < EPS) continue;
      const k = key(a, b);
      if (!map.has(k))
        map.set(
          k,
          old.get(k) ?? {
            id: crypto.randomUUID(),
            a,
            b,
            thickness: 0.14,
            height: 2.8,
            color: "#26364c",
            source: "room",
          },
        );
    }
  }
  return [...map.values()];
}
export function openingValid(o: Opening, w: Wall, others: Opening[] = []) {
  const len = distance(w.a, w.b);
  return (
    o.offset >= 0.05 &&
    o.width > 0 &&
    o.offset + o.width <= len - 0.05 + EPS &&
    o.sill + o.height <= w.height + EPS &&
    !others.some(
      (x) =>
        x.id !== o.id &&
        x.wallId === o.wallId &&
        x.offset < o.offset + o.width &&
        x.offset + x.width > o.offset,
    )
  );
}
export function wallProjection(p: Point, w: Pick<Wall, "a" | "b">) {
  const len = distance(w.a, w.b),
    dx = len ? (w.b.x - w.a.x) / len : 0,
    dy = len ? (w.b.y - w.a.y) / len : 0;
  const t = Math.max(0, Math.min(len, (p.x - w.a.x) * dx + (p.y - w.a.y) * dy));
  return {
    offset: t,
    point: { x: w.a.x + t * dx, y: w.a.y + t * dy },
    distance: Math.hypot(p.x - (w.a.x + t * dx), p.y - (w.a.y + t * dy)),
  };
}
export type Issue = {
  id: string;
  entityId: string;
  severity: "error" | "warning";
  message: string;
};
export function analyze(f: Floor): Issue[] {
  const issues: Issue[] = [];
  for (const r of f.rooms)
    if (!validPolygon(r.points))
      issues.push({
        id: `polygon-${r.id}`,
        entityId: r.id,
        severity: "error",
        message: `${r.name}: invalid room boundary`,
      });
  const solid = f.items.filter(
    (i) => !i.hidden && !/rug|lamp|plant|art|pendant/.test(i.catalogId),
  );
  for (const i of solid) {
    const c = corners(i);
    if (!f.rooms.some((r) => containsPolygon(r.points, c)))
      issues.push({
        id: `outside-${i.id}`,
        entityId: i.id,
        severity: "warning",
        message: `${i.name} extends outside a room`,
      });
  }
  // Sweep over cached AABBs before applying SAT to nearby rotated rectangles.
  const broad = solid
    .map((item) => {
      const polygon = corners(item);
      return { item, polygon, box: bounds(polygon) };
    })
    .sort((a, b) => a.box.x - b.box.x);
  for (let i = 0; i < broad.length; i++)
    for (let j = i + 1; j < broad.length; j++) {
      const aa = broad[i],
        bb = broad[j];
      if (bb.box.x >= aa.box.x + aa.box.width - EPS) break;
      if (
        bb.box.y >= aa.box.y + aa.box.depth - EPS ||
        aa.box.y >= bb.box.y + bb.box.depth - EPS
      )
        continue;
      const a = aa.item,
        b = bb.item;
      if (
        a.elevation >= b.elevation + b.height ||
        b.elevation >= a.elevation + a.height
      )
        continue;
      if (overlap(aa.polygon, bb.polygon))
        issues.push({
          id: `overlap-${[a.id, b.id].sort().join("-")}`,
          entityId: a.id,
          severity: "warning",
          message: `${a.name} overlaps ${b.name}`,
        });
    }
  for (const o of f.openings) {
    const w = f.walls.find((w) => w.id === o.wallId);
    if (!w || !openingValid(o, w, f.openings))
      issues.push({
        id: `opening-${o.id}`,
        entityId: o.id,
        severity: "error",
        message: `Invalid ${o.kind} attachment`,
      });
  }
  for (let i = 0; i < f.rooms.length; i++)
    for (let j = i + 1; j < f.rooms.length; j++)
      if (polygonsOverlap(f.rooms[i].points, f.rooms[j].points))
        issues.push({
          id: `room-overlap-${f.rooms[i].id}-${f.rooms[j].id}`,
          entityId: f.rooms[i].id,
          severity: "error",
          message: `${f.rooms[i].name} overlaps ${f.rooms[j].name}`,
        });
  for (let i = 0; i < f.walls.length; i++)
    for (let j = i + 1; j < f.walls.length; j++)
      if (intersects(f.walls[i].a, f.walls[i].b, f.walls[j].a, f.walls[j].b))
        issues.push({
          id: `wall-cross-${f.walls[i].id}-${f.walls[j].id}`,
          entityId: f.walls[i].id,
          severity: "warning",
          message: "Wall segments cross without a shared junction",
        });
  return issues;
}
export function containsPolygon(outer: Point[], inner: Point[]) {
  return (
    inner.every((p) => pointInPolygon(p, outer)) &&
    !inner.some((p, i) =>
      outer.some((q, j) =>
        intersects(
          p,
          inner[(i + 1) % inner.length],
          q,
          outer[(j + 1) % outer.length],
        ),
      ),
    )
  );
}
function strictlyInside(p: Point, poly: Point[]) {
  if (!pointInPolygon(p, poly)) return false;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i],
      b = poly[(i + 1) % poly.length];
    if (Math.abs(distance(a, p) + distance(p, b) - distance(a, b)) < 1e-6)
      return false;
  }
  return true;
}
export function polygonsOverlap(a: Point[], b: Point[]) {
  return (
    a.some((p, i) =>
      b.some((q, j) =>
        intersects(p, a[(i + 1) % a.length], q, b[(j + 1) % b.length]),
      ),
    ) ||
    a.some((p) => strictlyInside(p, b)) ||
    b.some((p) => strictlyInside(p, a)) ||
    a.every((p) => b.some((q) => distance(p, q) < 1e-6))
  );
}
