import { describe, it, expect } from "vitest";
import { sampleScene, blankScene } from "../packages/core/src/sample";
import { hitTest, itemContains, dragSnap } from "../packages/core/src/hit-test";
import { wallProjection } from "../packages/core/src/geometry";
import { catalog } from "../packages/core/src/catalog";
import { furnitureSvg } from "../packages/core/src/vector";
import { editWall } from "../packages/core/src/wall-edit";

describe("selection geometry", () => {
  it("measures the finite segment and handles zero length", () => {
    expect(
      wallProjection({ x: 100, y: 0 }, { a: { x: 0, y: 0 }, b: { x: 1, y: 0 } })
        .distance,
    ).toBe(99);
    expect(
      wallProjection({ x: 3, y: 4 }, { a: { x: 0, y: 0 }, b: { x: 0, y: 0 } })
        .distance,
    ).toBe(5);
  });
  it("uses topmost order with zoom/pan, without snapping or invisible targets", () => {
    const f = sampleScene().floors[0],
      i = f.items.find((i) => i.catalogId.includes("sofa"))!;
    const clone = { ...i, id: crypto.randomUUID() };
    f.items.push(clone);
    expect(
      hitTest(f, { x: i.x * 80 + 13, y: i.y * 80 - 9 }, { x: 13, y: -9 }, 80),
    ).toBe(clone.id);
    clone.hidden = true;
    expect(
      hitTest(f, { x: i.x * 80 + 13, y: i.y * 80 - 9 }, { x: 13, y: -9 }, 80),
    ).toBe(i.id);
  });
  it("does not select a wall from beyond its endpoint", () => {
    const f = blankScene().floors[0];
    f.walls.push({
      id: crypto.randomUUID(),
      a: { x: 0, y: 0 },
      b: { x: 1, y: 0 },
      thickness: 0.1,
      height: 2.8,
      color: "#000000",
    });
    expect(hitTest(f, { x: 500, y: 0 }, { x: 0, y: 0 }, 50)).toBeNull();
  });
  it("respects rotation and the empty corner of sectional furniture", () => {
    const i = {
      ...sampleScene().floors[0].items[0],
      catalogId: catalog.find((c) => c.name === "Corner sectional")!.id,
      x: 0,
      y: 0,
      rotation: 90,
      width: 2,
      depth: 2,
    };
    expect(itemContains({ x: -0.8, y: -0.8 }, i)).toBe(false);
    expect(itemContains({ x: 0.8, y: 0 }, i)).toBe(true);
  });
  it("selects door leaves and arcs without selecting empty swing interiors",()=>{
    const f=blankScene().floors[0],id=crypto.randomUUID();
    f.walls.push({id,a:{x:0,y:0},b:{x:3,y:0},thickness:.1,height:2.8,color:'#000000'});
    f.openings.push({id:'door',wallId:id,kind:'door',offset:1,width:.9,height:2.1,sill:0,flip:false});
    expect(hitTest(f,{x:100,y:60},{x:0,y:0},100)).toBe('door');
    expect(hitTest(f,{x:140,y:30},{x:0,y:0},100)).toBeNull();
  });
  it("caps drag snapping at six screen pixels", () => {
    expect(dragSnap({ x: 0.12, y: 0.12 }, 100, true).point).toEqual({
      x: 0.12,
      y: 0.12,
    });
    expect(dragSnap({ x: 0.02, y: 0.02 }, 100, true).point).toEqual({
      x: 0,
      y: 0,
    });
    expect(dragSnap({ x: 0.02, y: 0.02 }, 100, false).guides).toEqual([]);
  });
  it("preserves joined wall identity and room vertices on edit", () => {
    const f = sampleScene().floors[0],
      w = f.walls[0],
      ids = f.walls.map((w) => w.id),
      a = { x: w.a.x + 0.1, y: w.a.y };
    editWall(f, w.id, a, w.b);
    expect(f.walls.map((w) => w.id)).toEqual(ids);
    expect(w.a).toEqual(a);
  });
  it("renders every catalog entry with unique geometry at the same color", () => {
    const svg = catalog.map((c) => furnitureSvg(c.id, "#cccccc"));
    expect(new Set(svg).size).toBe(catalog.length);
    expect(catalog.every((c) => c.width > 0 && c.depth > 0 && c.category)).toBe(
      true,
    );
  });
});
