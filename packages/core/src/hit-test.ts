import { Floor, Item, Point } from "./model";
import { pointInPolygon, toWorld, wallProjection, distance } from "./geometry";
import { getCatalog } from "./catalog";

export function localPoint(p: Point, item: Item): Point {
  const angle = (-item.rotation * Math.PI) / 180;
  const dx = p.x - item.x,
    dy = p.y - item.y;
  return {
    x: dx * Math.cos(angle) - dy * Math.sin(angle),
    y: dx * Math.sin(angle) + dy * Math.cos(angle),
  };
}
export function itemContains(p: Point, item: Item) {
  const q = localPoint(p, item),
    c = getCatalog(item.catalogId);
  if (item.flipX) q.x = -q.x;
  const x = q.x / item.width + 0.5,
    y = q.y / item.depth + 0.5;
  if (x < 0 || x > 1 || y < 0 || y > 1) return false;
  if (c.footprint === "ellipse")
    return ((x - 0.5) * 2) ** 2 + ((y - 0.5) * 2) ** 2 <= 1;
  if (c.footprint === "sectional") return y < 0.55 || x > 0.65;
  return true;
}
export function orderedItems(items: Item[]) {
  return [...items].sort(
    (a, b) =>
      (getCatalog(a.catalogId).kind === "rug" ? -1 : 0) -
      (getCatalog(b.catalogId).kind === "rug" ? -1 : 0),
  );
}
/** Visual stacking order, back to front: references, rooms, walls, openings, items, annotations. */
export function hitTest(
  f: Floor,
  screen: Point,
  pan: Point,
  zoom: number,
): string | null {
  const p = toWorld(screen, pan, zoom),
    tolerance = 5 / zoom;
  for (const a of [...f.annotations].reverse())
    if (wallProjection(p, { a: a.a, b: a.b }).distance <= tolerance)
      return a.id;
  for (const i of orderedItems(f.items).reverse())
    if (!i.hidden && itemContains(p, i)) return i.id;
  for (const o of [...f.openings].reverse()) {
    const w = f.walls.find((w) => w.id === o.wallId);
    if (!w) continue;
    const pr = wallProjection(p, w);
    if(o.kind==='door') {
      const angle=Math.atan2(w.b.y-w.a.y,w.b.x-w.a.x), dx=p.x-w.a.x,dy=p.y-w.a.y;
      const x=dx*Math.cos(angle)+dy*Math.sin(angle)-o.offset;
      const y=(-dx*Math.sin(angle)+dy*Math.cos(angle))*(o.flip?-1:1);
      const near=(a:Point,b:Point)=>wallProjection({x,y},{a,b}).distance<=tolerance;
      if(o.style==='bifold') {
        const pts=[{x:0,y:0},{x:o.width*.25,y:o.width*.3},{x:o.width*.5,y:0},{x:o.width*.75,y:o.width*.3},{x:o.width,y:0}];
        if(pts.slice(1).some((p,i)=>near(pts[i],p)))return o.id;
      } else if(o.style!=='sliding'&&o.style!=='pocket') {
        const width=o.style==='double'?o.width/2:o.width;
        const leaf=(lx:number)=>near({x:lx,y:0},{x:lx,y:width});
        const arc=(lx:number,flip=false)=>{const ax=(x-lx)*(flip?-1:1);return ax>=0&&y>=0&&Math.abs(Math.hypot(ax,y)-width)<=tolerance;};
        if(leaf(0)||arc(0)||(o.style==='double'&&(leaf(o.width)||arc(o.width,true)))) return o.id;
      }
    }
    if (
      pr.offset >= o.offset &&
      pr.offset <= o.offset + o.width &&
      pr.distance <= w.thickness / 2 + tolerance
    )
      return o.id;
  }
  for (const w of [...f.walls].reverse()) {
    const pr = wallProjection(p, w);
    if (
      distance(p, w.a) <= w.thickness / 2 + tolerance ||
      distance(p, w.b) <= w.thickness / 2 + tolerance ||
      pr.distance <= w.thickness / 2 + tolerance
    )
      return w.id;
  }
  for (const r of [...f.rooms].reverse())
    if (pointInPolygon(p, r.points)) return r.id;
  for (const r of [...f.references].reverse())
    if (
      p.x >= r.x &&
      p.x <= r.x + r.width &&
      p.y >= r.y &&
      p.y <= r.y + r.depth
    )
      return r.id;
  return null;
}
/** Snap only during a gesture, with a screen-space radius. */
export function dragSnap(p: Point, zoom: number, enabled: boolean) {
  if (!enabled) return { point: p, guides: [] as ("x" | "y")[] };
  const q = {
    x: Math.round(p.x / 0.25) * 0.25,
    y: Math.round(p.y / 0.25) * 0.25,
  };
  const guides: ("x" | "y")[] = [];
  for (const axis of ["x", "y"] as const)
    if (Math.abs(q[axis] - p[axis]) * zoom <= 6) guides.push(axis);
    else q[axis] = p[axis];
  return { point: q, guides };
}
