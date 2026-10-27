import { it, expect } from "vitest";
import { sampleScene } from "../packages/core/src/sample";
import {
  selectionFrame,
  resizeSelection,
  rotate,
  controlPoint,
} from "../packages/core/src/transforms";
const item = () => ({
  ...sampleScene().floors[0].items[0],
  x: 5,
  y: 5,
  width: 2,
  depth: 1,
  rotation: 33,
});
it("rotated corner keeps the opposite corner fixed and supports centered aspect lock", () => {
  const i = item(),
    f = selectionFrame([i]),
    start = controlPoint(f, "bottom-right", 50),
    p = { x: start.x + 1, y: start.y + 1 };
  const resized = resizeSelection([i], f, "bottom-right", p)[0];
  expect(controlPoint(selectionFrame([resized]), "top-left", 50).x).toBeCloseTo(
    controlPoint(f, "top-left", 50).x,
  );
  expect(controlPoint(selectionFrame([resized]), "top-left", 50).y).toBeCloseTo(
    controlPoint(f, "top-left", 50).y,
  );
  const centered = resizeSelection([i], f, "bottom-right", p, true, true)[0];
  expect(centered.x).toBe(5);
  expect(centered.y).toBe(5);
  expect(centered.width / centered.depth).toBeCloseTo(2);
});
it("clamps minimum and maximum dimensions in meters without mirroring", () => {
  const i = item(),
    f = selectionFrame([i]);
  for (const sign of [-1, 1]) {
    const p = rotate({ x: sign * 100000, y: sign * 100000 }, i.rotation);
    const out = resizeSelection(
      [i],
      f,
      "bottom-right",
      { x: p.x + 5, y: p.y + 5 },
      true,
    )[0];
    expect(out.width).toBeGreaterThanOrEqual(0.1);
    expect(out.depth).toBeGreaterThanOrEqual(0.1);
    expect(out.width).toBeLessThanOrEqual(1000);
    expect(out.depth).toBeLessThanOrEqual(1000);
    expect(out.width / out.depth).toBeCloseTo(2);
  }
});

it("tiny projected objects retain independent 18px handle regions at every rotation", async () => {
  const { displayControlPoint, resizeHandles } = await import(
    "../packages/core/src/transforms"
  );
  for (const rotation of [0, 33, 90])
    for (const zoom of [12, 75, 180]) {
      const f = { x: 5, y: 5, width: 0.1, depth: 0.1, rotation },
        points = Object.keys(resizeHandles).map((h) =>
          displayControlPoint(f, h as keyof typeof resizeHandles, zoom),
        );
      for (let a = 0; a < points.length; a++)
        for (let b = a + 1; b < points.length; b++)
          expect(
            Math.hypot(points[a].x - points[b].x, points[a].y - points[b].y) *
              zoom,
          ).toBeGreaterThanOrEqual(18 - 1e-8);
    }
});
