import { it, expect } from "vitest";
import { SceneSchema } from "../packages/core/src/model";
import { sampleScene } from "../packages/core/src/sample";
import { furnitureSvg } from "../packages/core/src/vector";
import {
  floorTexture,
  furnitureFinishes,
  catalog,
} from "../packages/core/src/catalog";
import { useEditor } from "../apps/web/src/lib/store";
it("legacy scene compatibility and optional finishes round trip", () => {
  const scene = sampleScene();
  expect(SceneSchema.safeParse(scene).success).toBe(true);
  scene.floors[0].items[0].finish = "velvet";
  scene.floors[0].walls[0].finish = "plaster";
  expect(SceneSchema.parse(scene).floors[0].items[0].finish).toBe("velvet");
});
it("schematic rendering removes realistic shading and material variants change patterns", () => {
  const c = catalog[0];
  expect(furnitureSvg(c.id, c.color, 180, 140, false)).not.toContain(
    "feDropShadow",
  );
  expect(
    new Set(
      furnitureFinishes.map((f) =>
        furnitureSvg(c.id, c.color, 180, 140, true, f.id),
      ),
    ).size,
  ).toBeGreaterThan(2);
  expect(floorTexture("plain")).toBeNull();
});
it("recent furniture tracks actual placement and finish edits are undoable", () => {
  const s = useEditor.getState();
  s.load(sampleScene(), "presentation", 0);
  s.addItem(catalog[1].id, { x: 3, y: 3 });
  expect(useEditor.getState().recentItems[0]).toBe(catalog[1].id);
  const id = useEditor.getState().selected[0];
  s.updateItem(id, { finish: "velvet" });
  expect(
    useEditor.getState().scene.floors[0].items.find((i) => i.id === id)?.finish,
  ).toBe("velvet");
  s.undo();
  expect(
    useEditor.getState().scene.floors[0].items.find((i) => i.id === id)?.finish,
  ).toBeUndefined();
});
it("group selection expands and ungrouping remains available", () => {
  const s = useEditor.getState(),
    scene = sampleScene(),
    items = scene.floors[0].items.slice(0, 2);
  items.forEach((i) => (i.groupId = "group"));
  s.load(scene, "group-fixture", 0);
  s.select(items[0].id);
  expect(useEditor.getState().selected).toEqual(items.map((i) => i.id));
  s.action("ungroup");
  expect(
    useEditor
      .getState()
      .scene.floors[0].items.slice(0, 2)
      .every((i) => !i.groupId),
  ).toBe(true);
});
