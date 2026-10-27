import { Scene, Floor, Room, Item, uid } from "./model";
import { wallsFromRooms, wallProjection, distance } from "./geometry";
import { catalog, Kind } from "./catalog";
export function blankScene(name = "Untitled project"): Scene {
  return {
    formatVersion: 1,
    name,
    unit: "m",
    currency: "USD",
    ambient: 0.8,
    sun: 14,
    rules: { clearance: 0.15 },
    cameras: [],
    floors: [
      {
        id: uid(),
        name: "Ground floor",
        elevation: 0,
        height: 2.8,
        rooms: [],
        walls: [],
        openings: [],
        items: [],
        references: [],
        annotations: [],
      },
    ],
  };
}
export function rectangleRoom(
  name: string,
  type: string,
  x: number,
  y: number,
  width: number,
  depth: number,
  material = "oak",
  color = "#dfc8a5",
): Room {
  return {
    id: uid(),
    name,
    type,
    points: [
      { x, y },
      { x: x + width, y },
      { x: x + width, y: y + depth },
      { x, y: y + depth },
    ],
    material,
    color,
    height: 2.8,
  };
}
export function sampleScene(): Scene {
  const s = blankScene("The Alder Apartment");
  const f = s.floors[0];
  f.rooms = [
    rectangleRoom("Entryway", "Entryway", 0, 0, 3.4, 2.4, "tile", "#d9d8cd"),
    rectangleRoom("Kitchen", "Kitchen", 0, 2.4, 3.4, 4, "oak"),
    rectangleRoom("Bathroom", "Bathroom", 0, 6.4, 3.4, 2.8, "tile", "#d0dcd7"),
    rectangleRoom("Office / Study", "Office", 0, 9.2, 3.4, 2.8, "oak"),
    rectangleRoom("Living & dining", "Living Room", 3.4, 0, 7.6, 6.4, "oak"),
    rectangleRoom("Primary bedroom", "Bedroom", 3.4, 6.4, 4.2, 5.6, "oak"),
    rectangleRoom("Bedroom 02", "Bedroom", 7.6, 6.4, 3.4, 5.6, "oak"),
  ];
  f.walls = wallsFromRooms(f.rooms);
  const place = (
    kind: Kind,
    x: number,
    y: number,
    w: number,
    d: number,
    r = 0,
    color?: string,
    variant = 0,
  ) => {
    const c = catalog.filter((c) => c.kind === kind)[variant];
    f.items.push({
      id: uid(),
      catalogId: c.id,
      name: c.name,
      x,
      y,
      width: w,
      depth: d,
      height: c.height,
      elevation: 0,
      rotation: r,
      color: color ?? c.color,
      price: c.price,
      locked: false,
      hidden: false,
    });
  };
  place("cabinet", 1.65, 0.35, 1.8, 0.45);
  place("rug", 1.7, 1.35, 1.5, 0.8);
  place("plant", 0.45, 0.45, 0.45, 0.45);
  place("cabinet", 0.4, 3.35, 0.55, 1.5);
  place("sink", 0.4, 4.55, 0.55, 0.8);
  place("stove", 0.4, 5.45, 0.55, 0.7);
  place("fridge", 2.85, 2.85, 0.65, 0.65);
  place("table", 2.15, 4.6, 1.1, 0.7, 90);
  place("chair", 2.85, 4.2, 0.45, 0.45);
  place("chair", 2.85, 5, 0.45, 0.45);
  place("bath", 0.65, 7.75, 0.85, 1.75);
  place("sink", 2.75, 6.85, 0.8, 0.5);
  place("toilet", 2.75, 8.45, 0.45, 0.7);
  place("plant", 1.6, 8.7, 0.35, 0.35);
  place("desk", 1.7, 11.45, 1.65, 0.65);
  place("chair", 1.7, 10.65, 0.65, 0.65);
  place("shelf", 0.35, 10.5, 0.4, 1.4);
  place("plant", 2.85, 11.5, 0.45, 0.45);
  place("rug", 8.6, 2.2, 3.5, 2.8);
  place("sofa", 9.9, 2.2, 2.8, 0.95, 90);
  place("chair", 7.25, 0.85, 0.8, 0.85);
  place("table", 8.45, 2.2, 1.2, 0.7);
  place("cabinet", 5.9, 0.45, 1.8, 0.45);
  place("plant", 10.45, 0.55, 0.55, 0.55);
  place("lamp", 10.5, 4.3, 0.4, 0.4);
  place("table", 6.3, 4.65, 1.9, 1);
  place("chair", 5.65, 3.85, 0.5, 0.5);
  place("chair", 6.65, 3.85, 0.5, 0.5);
  place("chair", 5.65, 5.45, 0.5, 0.5);
  place("chair", 6.65, 5.45, 0.5, 0.5);
  place("plant", 4, 5.9, 0.45, 0.45);
  place("rug", 5.5, 9.3, 3.2, 3.6);
  place("bed", 5.5, 9.25, 1.8, 2.1, 0, "#aebfc7");
  place("cabinet", 4.2, 8.55, 0.5, 0.5);
  place("cabinet", 6.8, 8.55, 0.5, 0.5);
  place("cabinet", 5.5, 11.6, 2.8, 0.55);
  place("plant", 6.95, 11.5, 0.45, 0.45);
  place("rug", 9.3, 9.4, 2.5, 3.2);
  place("bed", 9.3, 9, 1.45, 2.05, 0, "#b7bda4");
  place("cabinet", 8.25, 8.25, 0.45, 0.45);
  place("desk", 9.35, 11.5, 1.8, 0.55);
  place("chair", 9.35, 10.8, 0.55, 0.55);
  place("plant", 10.5, 11.5, 0.4, 0.4);
  const opening = (
    kind: "door" | "window",
    x: number,
    y: number,
    width: number,
  ) => {
    const p = { x, y };
    const w = [...f.walls].sort(
      (a, b) =>
        wallProjection(p, a).distance - wallProjection(p, b).distance ||
        distance(wallProjection(p, a).point, p) -
          distance(wallProjection(p, b).point, p),
    )[0];
    const t = wallProjection(p, w).offset;
    f.openings.push({
      id: uid(),
      kind,
      wallId: w.id,
      offset: Math.max(
        0.1,
        Math.min(distance(w.a, w.b) - width - 0.1, t - width / 2),
      ),
      width,
      height: kind === "door" ? 2.1 : 1.3,
      sill: kind === "door" ? 0 : 0.9,
      flip: false,
    });
  };
  opening("door", 1.7, 0, 1);
  opening("door", 3.4, 1.5, 0.9);
  opening("door", 3.4, 5.7, 0.85);
  opening("door", 2.5, 6.4, 0.8);
  opening("door", 3.4, 9.9, 0.85);
  opening("door", 4.3, 6.4, 0.9);
  opening("door", 8.45, 6.4, 0.85);
  opening("window", 6, 0, 1.6);
  opening("window", 9.2, 0, 1.6);
  opening("window", 11, 3, 1.8);
  opening("window", 11, 9.6, 1.5);
  opening("window", 5.5, 12, 1.8);
  opening("window", 1.7, 12, 1.4);
  opening("window", 0, 4.5, 1.4);
  return s;
}
