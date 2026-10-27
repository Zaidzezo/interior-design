import { describe, it, expect } from "vitest";
import {
  area,
  perimeter,
  pointInPolygon,
  validPolygon,
  wallsFromRooms,
  corners,
  overlap,
  openingValid,
  analyze,
  toScreen,
  toWorld,
  zoomAt,
  unitFactor,
} from "../packages/core/src/geometry";
import {
  sampleScene,
  blankScene,
  rectangleRoom,
} from "../packages/core/src/sample";
import { SceneSchema, Item } from "../packages/core/src/model";
import { totalCost, estimate } from "../packages/core/src/estimate";
import { catalog } from "../packages/core/src/catalog";
describe("meter-based geometry", () => {
  it("4 × 3 is 12 and resizing to 5 × 3 is 15 regardless of zoom", () => {
    const r = rectangleRoom("Room", "Custom", 0, 0, 4, 3);
    expect(area(r.points)).toBe(12);
    expect(perimeter(r.points)).toBe(14);
    r.points = r.points.map((p) => ({ ...p, x: p.x * 1.25 }));
    expect(area(r.points)).toBe(15);
    for (const zoom of [0.25, 50, 125])
      expect(
        area(
          r.points.map((p) =>
            toWorld(
              toScreen(p, { x: -400, y: 210 }, zoom),
              { x: -400, y: 210 },
              zoom,
            ),
          ),
        ),
      ).toBeCloseTo(15);
  });
  it("keeps pointer stationary when zooming with negative pan", () => {
    const screen = { x: 317, y: 221 },
      pan = { x: -200, y: -110 };
    const world = toWorld(screen, pan, 50);
    expect(toScreen(world, zoomAt(screen, pan, 50, 90), 90)).toEqual(screen);
  });
  it("validates an L-shaped room and rejects self intersection and zero edges", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 2 },
      { x: 2, y: 2 },
      { x: 2, y: 4 },
      { x: 0, y: 4 },
    ];
    expect(validPolygon(points)).toBe(true);
    expect(area(points)).toBe(12);
    expect(pointInPolygon({ x: 3, y: 3 }, points)).toBe(false);
    expect(
      validPolygon([
        { x: 0, y: 0 },
        { x: 4, y: 4 },
        { x: 0, y: 4 },
        { x: 4, y: 0 },
      ]),
    ).toBe(false);
    expect(
      validPolygon([
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ]),
    ).toBe(false);
  });
  it("deduplicates and splits a partially shared wall without duplicate heavy boundaries", () => {
    const rooms = [
      rectangleRoom("A", "Custom", 0, 0, 4, 3),
      rectangleRoom("B", "Custom", 4, 1, 2, 2),
    ];
    const walls = wallsFromRooms(rooms);
    expect(walls.filter((w) => w.a.x === 4 && w.b.x === 4)).toHaveLength(2);
    const ids = wallsFromRooms(rooms, walls).map((w) => w.id);
    expect(ids).toEqual(walls.map((w) => w.id));
  });
  it("SAT separates rotated items and treats touching edges as non-overlap", () => {
    const a = sampleScene().floors[0].items[0];
    const one = { ...a, x: 0, y: 0, width: 2, depth: 1, rotation: 45 };
    expect(overlap(corners(one), corners({ ...one, x: 0.2 }))).toBe(true);
    expect(overlap(corners(one), corners({ ...one, x: 10 }))).toBe(false);
    expect(
      overlap(
        corners({ ...one, rotation: 0 }),
        corners({ ...one, rotation: 0, x: 2 }),
      ),
    ).toBe(false);
  });
  it("rejects oversized, overlapping, detached, and vertically invalid openings", () => {
    const wall = {
      id: "wall",
      a: { x: 0, y: 0 },
      b: { x: 4, y: 0 },
      thickness: 0.14,
      height: 2.8,
      color: "#333333",
    };
    const o = {
      id: "door",
      kind: "door" as const,
      wallId: "wall",
      offset: 0.5,
      width: 0.9,
      height: 2.1,
      sill: 0,
      flip: false,
    };
    expect(openingValid(o, wall)).toBe(true);
    expect(openingValid({ ...o, width: 4 }, wall)).toBe(false);
    expect(openingValid({ ...o, sill: 1 }, wall)).toBe(false);
    expect(openingValid(o, wall, [{ ...o, id: "another" }])).toBe(false);
  });
  it("round trips the full scene and rejects nonfinite or unbounded dimensions", () => {
    const s = sampleScene();
    expect(SceneSchema.parse(JSON.parse(JSON.stringify(s)))).toEqual(s);
    s.floors[0].items[0].width = Infinity;
    expect(SceneSchema.safeParse(s).success).toBe(false);
  });
  it("sample has seven rooms, at least 30 furnishings and no critical errors", () => {
    const s = sampleScene(),
      f = s.floors[0];
    expect(f.rooms).toHaveLength(7);
    expect(f.items.length).toBeGreaterThanOrEqual(30);
    expect(analyze(f).filter((i) => i.severity === "error")).toEqual([]);
    expect(new Set(catalog.map((c) => c.id)).size).toBe(catalog.length);
  });
  it("flags out-of-room furniture and overlap, allows a rug under a table", () => {
    const f = blankScene().floors[0];
    f.rooms = [rectangleRoom("Room", "Custom", 0, 0, 4, 3)];
    const item = sampleScene().floors[0].items.find((i) =>
      i.catalogId.startsWith("table"),
    )!;
    f.items = [
      { ...item, id: "a", x: 2, y: 1.5, width: 1, depth: 1 },
      { ...item, id: "b", x: 2, y: 1.5, width: 1, depth: 1 },
    ];
    expect(analyze(f).some((i) => i.id === "overlap-a-b")).toBe(true);
    f.items[1].catalogId = catalog.find((c) => c.kind === "rug")!.id;
    expect(analyze(f)).toEqual([]);
    f.items[0].x = 10;
    expect(analyze(f).some((i) => i.id === "outside-a")).toBe(true);
  });
  it("estimates two 100 items and one 50 item as 250, then updates on delete", () => {
    const s = blankScene();
    const item = sampleScene().floors[0].items[0];
    s.floors[0].items = [
      { ...item, id: "1", price: 100 },
      { ...item, id: "2", price: 100 },
      { ...item, id: "3", price: 50 },
    ];
    expect(totalCost(s)).toBe(250);
    s.floors[0].items.pop();
    expect(totalCost(s)).toBe(200);
  });
  it("feet and inches convert accurately", () => {
    expect(unitFactor.ft).toBeCloseTo(1 / 0.3048, 7);
    expect(unitFactor.in).toBeCloseTo(1 / 0.0254, 7);
  });
});

it('rejects injected SVG colors and non-base64 tracing URLs',()=>{const scene=sampleScene();scene.floors[0].walls[0].color='#fff"/><script>alert(1)</script>';expect(SceneSchema.safeParse(scene).success).toBe(false);const clean=sampleScene();clean.floors[0].references.push({id:crypto.randomUUID(),name:'Unsafe',dataUrl:'data:image/png;base64,\" onload=\"alert(1)',x:0,y:0,width:1,depth:1,opacity:.5,locked:true});expect(SceneSchema.safeParse(clean).success).toBe(false)});
