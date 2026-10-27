import { it, expect } from "vitest";
import { templateScene, templates } from "../packages/core/src/templates";
import { SceneSchema } from "../packages/core/src/model";
import { analyze } from "../packages/core/src/geometry";
import { catalog } from "../packages/core/src/catalog";
it("all supplied templates are schema-valid, populated, and free of critical geometry errors", () => {
  for (const t of templates) {
    const scene = templateScene(t.id);
    expect(SceneSchema.safeParse(scene).success, t.id).toBe(true);
    expect(
      scene.floors
        .flatMap((f) => analyze(f))
        .filter((i) => i.severity === "error"),
      t.id,
    ).toEqual([]);
    expect(scene.floors[0].items.length, t.id).toBeGreaterThan(0);
  }
});
it("catalog has over 100 differentiated, stable configurations", () => {
  expect(catalog.length).toBeGreaterThanOrEqual(100);
  expect(new Set(catalog.map((c) => c.id)).size).toBe(catalog.length);
});
