import { it, expect } from "vitest";
import { blankScene, rectangleRoom } from "../packages/core/src/sample";
import {
  area,
  wallsFromRooms,
  analyze,
  distance,
} from "../packages/core/src/geometry";
import {
  mergeAdjacentRooms,
  splitRectangularRoom,
  splitWall,
} from "../packages/core/src/architecture";
import { importDxf } from "../packages/core/src/dxf";
it("splits and merges rooms while preserving the union area", () => {
  const room = rectangleRoom("Living", "Custom", 0, 0, 4, 3);
  const [a, b] = splitRectangularRoom(room, "x");
  expect(area(a.points)).toBe(6);
  expect(area(b.points)).toBe(6);
  expect(area(mergeAdjacentRooms(a, b).points)).toBe(12);
});
it("merges adjacent rooms into a valid irregular L boundary", () => {
  const a = rectangleRoom("A", "Custom", 0, 0, 4, 2),
    b = rectangleRoom("B", "Custom", 0, 2, 2, 2);
  const m = mergeAdjacentRooms(a, b);
  expect(area(m.points)).toBe(12);
  expect(() =>
    mergeAdjacentRooms(a, rectangleRoom("D", "Custom", 10, 10, 1, 1)),
  ).toThrow();
});
it("splits a wall and preserves hosted opening offset and total area", () => {
  const f = blankScene().floors[0];
  f.rooms = [rectangleRoom("Room", "Custom", 0, 0, 6, 4)];
  f.walls = wallsFromRooms(f.rooms);
  const w = f.walls.find((w) => w.a.y === 0 && w.b.y === 0)!;
  f.openings.push({
    id: "door",
    kind: "door",
    wallId: w.id,
    offset: 4,
    width: 1,
    height: 2.1,
    sill: 0,
    flip: false,
  });
  const second = splitWall(f, w.id);
  expect(f.openings[0].wallId).toBe(second);
  expect(f.openings[0].offset).toBe(1);
  expect(area(f.rooms[0].points)).toBe(24);
  expect(analyze(f)).toEqual([]);
});
it("rejects splitting through an opening", () => {
  const f = blankScene().floors[0];
  f.rooms = [rectangleRoom("Room", "Custom", 0, 0, 4, 3)];
  f.walls = wallsFromRooms(f.rooms);
  const w = f.walls.find((w) => distance(w.a, w.b) === 4)!;
  f.openings.push({
    id: "door",
    kind: "door",
    wallId: w.id,
    offset: 1.7,
    width: 0.9,
    height: 2.1,
    sill: 0,
    flip: false,
  });
  expect(() => splitWall(f, w.id)).toThrow("opening");
});
it("imports the documented DXF LINE subset with explicit millimeter units", () => {
  const { scene } = importDxf(
    "0\nSECTION\n2\nENTITIES\n0\nLINE\n10\n0\n20\n0\n11\n4000\n21\n0\n0\nENDSEC\n0\nEOF",
  );
  expect(distance(scene.floors[0].walls[0].a, scene.floors[0].walls[0].b)).toBe(
    4,
  );
});

it("3D wall panels leave a genuine door void and preserve the lintel", async () => {
  const { wallPanels } = await import("../packages/core/src/architecture");
  const w = {
    id: "wall",
    a: { x: 0, y: 0 },
    b: { x: 4, y: 0 },
    thickness: 0.14,
    height: 2.8,
    color: "#26364c",
  };
  const o = {
    id: "door",
    wallId: "wall",
    kind: "door" as const,
    offset: 0.5,
    width: 0.9,
    height: 2.1,
    sill: 0,
    flip: false,
  };
  const panels = wallPanels(w, [o]);
  expect(panels).toHaveLength(3);
  expect(
    panels.some(
      (p) =>
        0.95 > p.x - p.width / 2 &&
        0.95 < p.x + p.width / 2 &&
        1 > p.y - p.height / 2 &&
        1 < p.y + p.height / 2,
    ),
  ).toBe(false);
  expect(
    panels.find((p) => Math.abs(p.width - 0.9) < 0.001)?.height,
  ).toBeCloseTo(0.7);
  const window = wallPanels(w, [
    { ...o, kind: "window", sill: 0.9, height: 1.3 },
  ]);
  expect(window).toHaveLength(4);
  expect(window.some((p) => Math.abs(p.width - 0.9) < 0.001 && p.y < 0.9)).toBe(
    true,
  );
});
