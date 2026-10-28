"use client";
import { create } from "zustand";
import { cloneItems } from "@core/commands";
import { Scene, Floor, Item, Room, Point, uid, SceneSchema } from "@core/model";
import { sampleScene, rectangleRoom } from "@core/sample";
import {
  wallsFromRooms,
  analyze,
  bounds,
  snap,
  wallProjection,
  openingValid,
  distance,
} from "@core/geometry";
import { catalog, getCatalog } from "@core/catalog";
export type Tool =
  | "select"
  | "pan"
  | "room"
  | "polygon"
  | "wall"
  | "door"
  | "window"
  | "measure"
  | "note"
  | "calibrate";
type State = {
  scene: Scene;
  floorId: string;
  selected: string[];
  past: Scene[];
  future: Scene[];
  dirty: number;
  projectId: string | null;
  revision: number;
  readOnly: boolean;
  tool: Tool;
  view: "2D" | "3D";
  cameraMode: "top" | "orbit" | "walk";
  quality: "draft" | "balanced" | "high";
  lightMode: "day" | "evening";
  planStyle: "realistic" | "blueprint";
  recentItems: string[];
  grid: boolean;
  snap: boolean;
  measurements: boolean;
  collisions: boolean;
  labels: boolean;
  zoom: number;
  pan: Point;
  fitTick: number;
  tab: string;
  placing: string | null;
  placingRotation: number;
  placingColor: string|null;
  placingFinish: Item["finish"]|null;
  message: string;
  status: "loading" | "saved" | "saving" | "unsaved" | "error" | "conflict";
  load: (
    scene: Scene,
    id: string,
    revision: number,
    readOnly?: boolean,
  ) => void;
  commit: (fn: (s: Scene) => void) => void;
  undo: () => void;
  redo: () => void;
  select: (id: string | null, multi?: boolean) => void;
  updateItem: (id: string, patch: Partial<Item>) => void;
  updateRoom: (id: string, patch: Partial<Room>) => void;
  addItem: (id: string, p: Point) => void;
  addRoom: (type: string, p?: Point) => void;
  remove: () => void;
  duplicate: () => void;
  action: (a: string) => void;
  set: (patch: Partial<State>) => void;
};
export const useEditor = create<State>((set, get) => {
  const scene = sampleScene();
  return {
    scene,
    floorId: scene.floors[0].id,
    selected: [],
    past: [],
    future: [],
    dirty: 0,
    projectId: null,
    revision: 0,
    readOnly: false,
    tool: "select",
    view: "3D",
    cameraMode:"orbit",
    quality:"balanced",
    lightMode:"day",
    planStyle: "realistic",
    recentItems: [],
    grid: true,
    snap: true,
    measurements: true,
    collisions: false,
    labels: true,
    zoom: 50,
    pan: { x: 0, y: 0 },
    fitTick: 0,
    tab: "rooms",
    placing: null,
    placingRotation: 0,
    placingColor:null,
    placingFinish:null,
    message: "",
    status: "loading",
    set: (patch) => {
      if(patch.view&&typeof window!=="undefined")localStorage.setItem("buildspace-view",patch.view);
      if (patch.planStyle && typeof window !== "undefined")
        localStorage.setItem("buildspace-plan-style", patch.planStyle);
      set({...((patch.placing!==undefined&&patch.placing!==get().placing)?{placingColor:null,placingFinish:null}:{}),...patch});
    },
    load: (scene, id, revision, readOnly = false) => {
      const parsed = SceneSchema.parse(scene);
      if (
        typeof window !== "undefined" &&
        !readOnly &&
        new URLSearchParams(location.search).has("share")
      )
        history.replaceState(null, "", location.pathname);
      if (typeof window !== "undefined" && !readOnly)
        localStorage.setItem("buildspace-project", id);
      set({
        scene: parsed,
        projectId: id,
        revision,
        readOnly,
        floorId: scene.floors[0].id,
        selected: [],
        past: [],
        future: [],
        dirty: 0,
        status: "saved",
        fitTick: get().fitTick + 1,
      });
    },
    commit: (fn) => {
      if (!get().projectId) {
        set({ message: "Opening your project…" });
        return;
      }
      if (get().readOnly) {
        set({ message: "This project is read-only" });
        return;
      }
      const before = get().scene;
      const scene = structuredClone(before);
      try {
        fn(scene);
        const errors = scene.floors
          .flatMap(analyze)
          .filter((i) => i.severity === "error");
        if (errors.length) throw new Error(errors[0].message);
      } catch (e) {
        set({ message: e instanceof Error ? e.message : "Edit failed" });
        return;
      }
      if (JSON.stringify(before) === JSON.stringify(scene)) return;
      set({
        scene,
        past: [...get().past.slice(-79), before],
        future: [],
        dirty: get().dirty + 1,
        status: "unsaved",
      });
    },
    undo: () => {
      const s = get();
      if (s.readOnly || !s.past.length) return;
      set({
        scene: s.past[s.past.length - 1],
        past: s.past.slice(0, -1),
        future: [s.scene, ...s.future],
        dirty: s.dirty + 1,
        status: "unsaved",
      });
    },
    redo: () => {
      const s = get();
      if (s.readOnly || !s.future.length) return;
      set({
        scene: s.future[0],
        past: [...s.past, s.scene],
        future: s.future.slice(1),
        dirty: s.dirty + 1,
        status: "unsaved",
      });
    },
    select: (id, multi = false) => {
      if (!id) {
        set({ selected: [] });
        return;
      }
      const f = get().scene.floors.find((f) => f.id === get().floorId)!;
      const item = f.items.find((i) => i.id === id);
      const ids = item?.groupId
        ? f.items
            .filter((i) => i.groupId === item.groupId && !i.hidden)
            .map((i) => i.id)
        : [id];
      set({
        selected: multi
          ? get().selected.includes(id)
            ? get().selected.filter((id) => !ids.includes(id))
            : [...new Set([...get().selected, ...ids])]
          : ids,
      });
    },
    updateItem: (id, patch) =>
      get().commit((s) => {
        const i = s.floors.flatMap((f) => f.items).find((i) => i.id === id);
        if (
          i &&
          (!i.locked ||
            Object.keys(patch).every((k) => k === "locked" || k === "hidden"))
        ) {
          if (i.groupId && (patch.x !== undefined || patch.y !== undefined)) {
            const dx = (patch.x ?? i.x) - i.x,
              dy = (patch.y ?? i.y) - i.y;
            for (const other of s.floors.flatMap((f) => f.items))
              if (
                other.id !== id &&
                other.groupId === i.groupId &&
                !other.locked
              ) {
                other.x += dx;
                other.y += dy;
              }
          }
          Object.assign(i, patch);
        }
      }),
    updateRoom: (id, patch) =>
      get().commit((s) => {
        const f = s.floors.find((f) => f.rooms.some((r) => r.id === id));
        if (!f) return;
        Object.assign(f.rooms.find((r) => r.id === id)!, patch);
        if (patch.points) rebuild(f);
      }),
    addItem: (catalogId, p) => {
      const c = getCatalog(catalogId);
      const id = uid();
      const recentItems = [
        catalogId,
        ...get().recentItems.filter((id) => id !== catalogId),
      ].slice(0, 8);
      set({ recentItems });
      if (typeof window !== "undefined")
        localStorage.setItem(
          "buildspace-recent-items",
          JSON.stringify(recentItems),
        );
      get().commit((s) => {
        const f = s.floors.find((f) => f.id === get().floorId)!;
        f.items.push({
          id,
          catalogId: c.id,
          name: c.name,
          x: p.x,
          y: p.y,
          width: c.width,
          depth: c.depth,
          height: c.height,
          elevation: 0,
          rotation: get().placingRotation,
          color: get().placingColor??c.color,
          ...((get().placingFinish??c.defaultFinish)?{finish:(get().placingFinish??c.defaultFinish)!}:{}),
          price: c.price,
          locked: false,
          hidden: false,
        });
      });
      set({
        selected: [id],
        placing: null,
        tool: "select",
        message: `${c.name} added`,
      });
    },
    addRoom: (type, p) => {
      const f = get().scene.floors.find((f) => f.id === get().floorId)!;
      const b = f.rooms.length
        ? bounds(f.rooms.flatMap((r) => r.points))
        : { x: 0, y: 0, width: 0, depth: 0 };
      const r = rectangleRoom(
        type,
        type,
        p?.x ?? b.x + b.width + 0.5,
        p?.y ?? b.y,
        4,
        3,
      );
      get().commit((s) => {
        const f = s.floors.find((f) => f.id === get().floorId)!;
        f.rooms.push(r);
        rebuild(f);
      });
      set({ selected: [r.id], fitTick: get().fitTick + 1 });
    },
    remove: () => {
      const ids = get().selected;
      get().commit((s) => {
        const f = s.floors.find((f) => f.id === get().floorId)!;
        f.items = f.items.filter((i) => !ids.includes(i.id) || i.locked);
        const removedRooms = f.rooms.some((r) => ids.includes(r.id));
        f.rooms = f.rooms.filter((r) => !ids.includes(r.id));
        f.openings = f.openings.filter((o) => !ids.includes(o.id));
        f.annotations = f.annotations.filter((a) => !ids.includes(a.id));
        f.references = f.references.filter(
          (r) => !ids.includes(r.id) || r.locked,
        );
        const removedWalls = f.walls.filter((w) => ids.includes(w.id));
        if (removedWalls.some((w) => f.openings.some((o) => o.wallId === w.id)))
          throw new Error(
            "Remove wall openings before deleting their host wall",
          );
        f.removedBoundaries = [
          ...(f.removedBoundaries ?? []),
          ...removedWalls
            .filter((w) => w.source === "room")
            .map((w) => ({ a: { ...w.a }, b: { ...w.b } })),
        ];
        f.walls = f.walls.filter((w) => !ids.includes(w.id));
        if (removedRooms) rebuild(f);
      });
      set({ selected: [] });
    },
    duplicate: () => {
      const ids = get().selected;
      const next: string[] = [];
      get().commit((s) => {
        const f = s.floors.find((f) => f.id === get().floorId)!;
        const copies = cloneItems(
          f.items.filter((i) => ids.includes(i.id)),
          0.4,
          0.4,
        );
        f.items.push(...copies);
        next.push(...copies.map((i) => i.id));
      });
      set({ selected: next });
    },
    action: (a) => {
      if (a === "duplicate") return get().duplicate();
      if (a === "delete") return get().remove();
      get().commit((s) => {
        const f = s.floors.find((f) => f.id === get().floorId)!;
        const items = f.items.filter((i) => get().selected.includes(i.id));
        const group = a === "group" ? uid() : undefined;
        for (const i of items) {
          if (a === "lock") {
            i.locked = !i.locked;
            continue;
          }
          if (i.locked) continue;
          if (a === "rotate") i.rotation = (i.rotation + 90) % 360;
          if (a === "flip") i.flipX = !i.flipX;
          if (a === "hide") i.hidden = !i.hidden;
          if (a === "snap") {
            i.x = snap(i.x);
            i.y = snap(i.y);
          }
          if (a === "group") i.groupId = group;
          if (a === "ungroup") delete i.groupId;
          if (a === "align" && items.length > 1) i.x = items[0].x;
          if (a === "front") {
            f.items.splice(f.items.indexOf(i), 1);
            f.items.push(i);
          }
          if (a === "back") {
            f.items.splice(f.items.indexOf(i), 1);
            f.items.unshift(i);
          }
        }
      });
    },
  };
});
export function activeFloor() {
  const s = useEditor.getState();
  return s.scene.floors.find((f) => f.id === s.floorId) ?? s.scene.floors[0];
}
export function rebuild(f: Floor) {
  const old = f.walls;
  f.walls = [
    ...wallsFromRooms(f.rooms, old).filter(
      (w) =>
        !(f.removedBoundaries ?? []).some(
          (edge) =>
            wallProjection(w.a, edge).distance < 1e-6 &&
            wallProjection(w.b, edge).distance < 1e-6,
        ),
    ),
    ...old.filter((w) => w.source === "manual"),
  ];
  for (const o of f.openings) {
    if (f.walls.some((w) => w.id === o.wallId)) continue;
    const previous = old.find((w) => w.id === o.wallId);
    if (!previous) throw new Error("Opening has no host wall");
    const len = distance(previous.a, previous.b);
    const p = {
      x:
        previous.a.x +
        ((previous.b.x - previous.a.x) * (o.offset + o.width / 2)) / len,
      y:
        previous.a.y +
        ((previous.b.y - previous.a.y) * (o.offset + o.width / 2)) / len,
    };
    const w = [...f.walls].sort(
      (a, b) => wallProjection(p, a).distance - wallProjection(p, b).distance,
    )[0];
    if (!w || wallProjection(p, w).distance > 0.3)
      throw new Error(
        "This edit would detach an opening. Move or delete it first.",
      );
    o.wallId = w.id;
    o.offset = wallProjection(p, w).offset - o.width / 2;
    if (!openingValid(o, w, f.openings))
      throw new Error("This edit would invalidate an opening");
  }
}
