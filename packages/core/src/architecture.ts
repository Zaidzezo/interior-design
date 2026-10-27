import { Floor, Room, Point, uid } from "./model";
import {
  distance,
  bounds,
  validPolygon,
  wallProjection,
  openingValid,
  area,
} from "./geometry";
export function splitWall(f: Floor, id: string, fraction = 0.5) {
  const index = f.walls.findIndex((w) => w.id === id);
  if (index < 0) throw new Error("Wall not found");
  const wall = f.walls[index],
    length = distance(wall.a, wall.b),
    cut = length * fraction;
  if (cut < 0.1 || length - cut < 0.1)
    throw new Error("Wall split is too close to an endpoint");
  if (
    f.openings.some(
      (o) => o.wallId === id && o.offset < cut && o.offset + o.width > cut,
    )
  )
    throw new Error("A wall cannot be split through an opening");
  const p = {
    x: wall.a.x + (wall.b.x - wall.a.x) * fraction,
    y: wall.a.y + (wall.b.y - wall.a.y) * fraction,
  };
  const second = { ...wall, id: uid(), a: p };
  f.walls.splice(index, 1, { ...wall, b: p }, second);
  for (const o of f.openings)
    if (o.wallId === id && o.offset >= cut) {
      o.wallId = second.id;
      o.offset -= cut;
    }
  for (const r of f.rooms) {
    const next: Point[] = [];
    for (let i = 0; i < r.points.length; i++) {
      const a = r.points[i],
        b = r.points[(i + 1) % r.points.length];
      next.push(a);
      if (
        Math.abs(distance(a, p) + distance(p, b) - distance(a, b)) < 1e-6 &&
        distance(a, p) > 0.001 &&
        distance(b, p) > 0.001
      )
        next.push(p);
    }
    r.points = next;
  }
  return second.id;
}
export function splitRectangularRoom(room: Room, axis: "x" | "y"): Room[] {
  const b = bounds(room.points);
  if (Math.abs(area(room.points) - b.width * b.depth) > 1e-5)
    throw new Error(
      "This split tool supports rectangular rooms. Use polygon drawing for irregular layouts.",
    );
  const mid = axis === "x" ? b.x + b.width / 2 : b.y + b.depth / 2;
  const rect = (x: number, y: number, w: number, d: number) => [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + d },
    { x, y: y + d },
  ];
  return [
    {
      ...room,
      name: `${room.name} A`,
      points:
        axis === "x"
          ? rect(b.x, b.y, b.width / 2, b.depth)
          : rect(b.x, b.y, b.width, b.depth / 2),
    },
    {
      ...room,
      id: uid(),
      name: `${room.name} B`,
      points:
        axis === "x"
          ? rect(mid, b.y, b.width / 2, b.depth)
          : rect(b.x, mid, b.width, b.depth / 2),
    },
  ];
}
export function mergeAdjacentRooms(a: Room, b: Room): Room {
  const points = [...a.points, ...b.points];
  const key = (p: Point) => `${p.x.toFixed(6)},${p.y.toFixed(6)}`;
  const edges = new Map<string, { a: Point; b: Point; count: number }>();
  for (const room of [a, b])
    for (let i = 0; i < room.points.length; i++) {
      const p = room.points[i],
        q = room.points[(i + 1) % room.points.length];
      const on = points
        .filter(
          (v) =>
            Math.abs(distance(p, v) + distance(v, q) - distance(p, q)) < 1e-6,
        )
        .sort((v, w) => distance(p, v) - distance(p, w));
      for (let j = 0; j < on.length - 1; j++) {
        const u = on[j],
          v = on[j + 1];
        if (distance(u, v) < 1e-6) continue;
        const k = [key(u), key(v)].sort().join(":");
        const e = edges.get(k);
        if (e) e.count++;
        else edges.set(k, { a: u, b: v, count: 1 });
      }
    }
  if (![...edges.values()].some((e) => e.count === 2))
    throw new Error("Rooms must share a boundary");
  const remaining = [...edges.values()].filter((e) => e.count === 1);
  const first = remaining.shift()!;
  const polygon = [first.a, first.b];
  while (remaining.length) {
    const end = polygon[polygon.length - 1];
    const index = remaining.findIndex(
      (e) => distance(e.a, end) < 1e-6 || distance(e.b, end) < 1e-6,
    );
    if (index < 0) throw new Error("Room union is disconnected");
    const edge = remaining.splice(index, 1)[0];
    polygon.push(distance(edge.a, end) < 1e-6 ? edge.b : edge.a);
  }
  if (distance(polygon[0], polygon[polygon.length - 1]) < 1e-6) polygon.pop();
  if (
    !validPolygon(polygon) ||
    Math.abs(area(polygon) - area(a.points) - area(b.points)) > 1e-5
  )
    throw new Error("Room merge would produce invalid topology");
  return { ...a, name: `${a.name} + ${b.name}`, points: polygon };
}
/** Horizontal/vertical wall slabs with real voids for doors and windows. */
export function wallPanels(
  wall: import("./model").Wall,
  openings: import("./model").Opening[],
  height = wall.height,
) {
  const length = distance(wall.a, wall.b);
  const cuts = [
    0,
    length,
    ...openings.flatMap((o) => [o.offset, o.offset + o.width]),
  ].sort((a, b) => a - b);
  const panels: { x: number; y: number; width: number; height: number }[] = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    const x = cuts[i],
      end = cuts[i + 1],
      width = end - x;
    if (width < 1e-6) continue;
    const opening = openings.find(
      (o) => x >= o.offset - 1e-6 && end <= o.offset + o.width + 1e-6,
    );
    if (!opening)
      panels.push({ x: (x + end) / 2, y: height / 2, width, height });
    else {
      if (opening.sill > 0) {
        const h = Math.min(height, opening.sill);
        panels.push({ x: (x + end) / 2, y: h / 2, width, height: h });
      }
      const top = opening.sill + opening.height;
      if (height > top)
        panels.push({
          x: (x + end) / 2,
          y: (height + top) / 2,
          width,
          height: height - top,
        });
    }
  }
  return panels;
}
