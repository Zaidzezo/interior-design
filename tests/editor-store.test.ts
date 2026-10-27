import { beforeEach, it, expect } from "vitest";
import { useEditor, rebuild } from "../apps/web/src/lib/store";
import { sampleScene } from "../packages/core/src/sample";
beforeEach(() => useEditor.getState().load(sampleScene(), "test-project", 1));
it("changes floor color without regenerating walls, persists scene value and supports undo/redo", () => {
  const s = useEditor.getState(),
    f = s.scene.floors[0],
    room = f.rooms[0],
    walls = f.walls.map((w) => w.id);
  s.select(room.id);
  s.updateRoom(room.id, { color: "#123456" });
  expect(useEditor.getState().scene.floors[0].rooms[0].color).toBe("#123456");
  expect(useEditor.getState().scene.floors[0].walls.map((w) => w.id)).toEqual(
    walls,
  );
  s.undo();
  expect(useEditor.getState().scene.floors[0].rooms[0].color).toBe(room.color);
  s.redo();
  expect(useEditor.getState().scene.floors[0].rooms[0].color).toBe("#123456");
});
it("deletes generated walls and keeps the deletion across room geometry rebuild and undo", () => {
  const s = useEditor.getState(),
    f = s.scene.floors[0],
    w = f.walls.find((w) => !f.openings.some((o) => o.wallId === w.id))!;
  s.select(w.id);
  s.remove();
  const current = structuredClone(useEditor.getState().scene.floors[0]);
  expect(current.walls.some((v) => v.id === w.id)).toBe(false);
  rebuild(current);
  expect(
    current.walls.some(
      (v) =>
        JSON.stringify(v.a) === JSON.stringify(w.a) &&
        JSON.stringify(v.b) === JSON.stringify(w.b),
    ),
  ).toBe(false);
  s.undo();
  expect(
    useEditor.getState().scene.floors[0].walls.some((v) => v.id === w.id),
  ).toBe(true);
});
