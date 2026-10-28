import { Scene, Floor, Item, uid } from "./model";
import { blankScene, rectangleRoom, sampleScene } from "./sample";
import { wallsFromRooms, bounds, distance, pointInPolygon } from "./geometry";
import {showcaseScene} from "./showcases";
import { catalog, Kind } from "./catalog";
export const templates = [
 {id:"salon",name:"The Sage Salon",description:"A light-filled lounge · warm oak, bouclé and brass"},
 {id:"suite",name:"The Walnut Suite",description:"A quiet retreat · tailored upholstery and walnut"},
  {
    id: "sample",
    name: "The Alder Apartment",
    description: "Seven rooms · a considered family apartment",
  },
  {
    id: "studio",
    name: "The City Studio",
    description: "Three zones · small space, big ideas",
  },
  {
    id: "one-bedroom",
    name: "The Courtyard Flat",
    description: "One bedroom · easy everyday living",
  },
  {
    id: "two-bedroom",
    name: "The Parkside Home",
    description: "Two bedrooms · room to grow",
  },
  {
    id: "family",
    name: "The Garden House",
    description: "Two floors · a place for everyone",
  },
  {
    id: "office",
    name: "The Home Studio",
    description: "Work, meet, and make yourself at home",
  },
  {
    id: "workplace",
    name: "The Workshop",
    description: "A small workplace with shared spaces",
  },
  {
    id: "open-plan",
    name: "The Open House",
    description: "Open living · an uninterrupted canvas",
  },
];
export function templateScene(key: string): Scene {
 if(key==="salon"||key==="suite")return showcaseScene(key);
  if (key === "sample") return sampleScene();
  if (key === "family") {
    const s = sampleScene();
    s.name = "The Garden House";
    const upper = sampleScene().floors[0];
    upper.name = "First floor";
    upper.elevation = 2.8;
    s.floors.push(upper);
    return s;
  }
  const s = blankScene(
      templates.find((t) => t.id === key)?.name ?? "New project",
    ),
    f = s.floors[0];
  type Spec = [string, string, number, number, number, number];
  const specs: Record<string, Spec[]> = {
    studio: [
      ["Living / sleeping", "Living Room", 0, 0, 6, 6],
      ["Kitchen", "Kitchen", 6, 0, 2.5, 3.5],
      ["Bathroom", "Bathroom", 6, 3.5, 2.5, 2.5],
    ],
    "one-bedroom": [
      ["Living & dining", "Living Room", 0, 0, 5, 7],
      ["Bedroom", "Bedroom", 5, 0, 4, 4.5],
      ["Kitchen", "Kitchen", 5, 4.5, 2, 2.5],
      ["Bathroom", "Bathroom", 7, 4.5, 2, 2.5],
    ],
    "two-bedroom": [
      ["Living & dining", "Living Room", 0, 0, 6, 5],
      ["Kitchen", "Kitchen", 6, 0, 4, 3],
      ["Entry", "Entryway", 6, 3, 4, 2],
      ["Primary bedroom", "Bedroom", 0, 5, 4, 4],
      ["Bedroom 02", "Bedroom", 4, 5, 3.5, 4],
      ["Bathroom", "Bathroom", 7.5, 5, 2.5, 4],
    ],
    office: [
      ["Home studio", "Office", 0, 0, 6, 5],
      ["Meeting room", "Dining", 6, 0, 4, 3],
      ["Kitchenette", "Kitchen", 6, 3, 2, 2],
      ["Restroom", "Bathroom", 8, 3, 2, 2],
    ],
    workplace: [
      ["Open workspace", "Office", 0, 0, 7, 7],
      ["Meeting room", "Dining", 7, 0, 4, 4],
      ["Private office", "Office", 7, 4, 4, 3],
      ["Kitchen", "Kitchen", 0, 7, 4, 3],
      ["Entry", "Entryway", 4, 7, 4, 3],
      ["Restroom", "Bathroom", 8, 7, 3, 3],
    ],
    "open-plan": [["Open living", "Living Room", 0, 0, 10, 8]],
  };
  f.rooms = (specs[key] ?? specs.studio).map(([name, type, x, y, w, d]) =>
    rectangleRoom(
      name,
      type,
      x,
      y,
      w,
      d,
      type === "Bathroom" ? "tile" : "oak",
      type === "Bathroom" ? "#d0dcd7" : "#dfc8a5",
    ),
  );
  f.walls = wallsFromRooms(f.rooms);
  for (const r of f.rooms) {
    const b = bounds(r.points);
    const put = (
      kind: Kind,
      x: number,
      y: number,
      w: number,
      d: number,
      rot = 0,
    ) => {
      const c = catalog.find((c) => c.kind === kind)!;
      f.items.push({
        id: uid(),
        catalogId: c.id,
        name: c.name,
        x: b.x + x,
        y: b.y + y,
        width: w,
        depth: d,
        height: c.height,
        elevation: 0,
        rotation: rot,
        color: c.color,
        price: c.price,
        locked: false,
        hidden: false,
      });
    };
    if (r.type === "Living Room") {
      put(
        "rug",
        b.width * 0.53,
        b.depth * 0.45,
        Math.min(3, b.width - 0.5),
        Math.min(2.5, b.depth - 0.5),
      );
      put(
        "sofa",
        b.width - 0.65,
        b.depth * 0.4,
        Math.min(2.5, b.depth - 0.6),
        0.85,
        90,
      );
      put("table", b.width * 0.55, b.depth * 0.45, 1, 0.6);
      put("cabinet", 1, 0.35, 1.4, 0.4);
      put("plant", b.width - 0.45, 0.45, 0.45, 0.45);
    } else if (r.type === "Bedroom") {
      put("bed", b.width / 2, b.depth / 2, Math.min(1.8, b.width - 1), 2.05);
      put(
        "cabinet",
        b.width / 2,
        b.depth - 0.35,
        Math.min(2, b.width - 0.5),
        0.5,
      );
    } else if (r.type === "Bathroom") {
      put("shower", 0.6, 0.6, 1, 1);
      put("toilet", b.width - 0.5, b.depth - 0.6, 0.45, 0.7);
      put("sink", b.width - 0.5, 0.35, 0.65, 0.5);
    } else if (r.type === "Kitchen") {
      put("sink", 0.4, 0.7, 0.6, 0.8);
      put("stove", 0.4, 1.55, 0.6, 0.6);
      if (b.depth > 3) put("fridge", b.width - 0.45, 0.5, 0.7, 0.7);
    } else if (r.type === "Office") {
      put(
        "desk",
        b.width / 2,
        b.depth - 0.6,
        Math.min(1.6, b.width - 0.5),
        0.7,
      );
      put("chair", b.width / 2, b.depth - 1.45, 0.65, 0.65);
      put("shelf", 0.3, 1, 0.35, 1.4);
      put("plant", b.width - 0.4, b.depth - 0.4, 0.4, 0.4);
    } else if (r.type === "Dining") {
      put("table", b.width / 2, b.depth / 2, 1.5, 0.9);
      put("chair", b.width / 2, b.depth / 2 - 0.9, 0.5, 0.5);
      put("chair", b.width / 2, b.depth / 2 + 0.9, 0.5, 0.5);
    } else {
      put("cabinet", b.width / 2, 0.35, Math.min(1.8, b.width - 0.5), 0.45);
      put("plant", b.width - 0.4, b.depth - 0.4, 0.4, 0.4);
    }
  }
  for (const wall of f.walls) {
    const midpoint = {
      x: (wall.a.x + wall.b.x) / 2,
      y: (wall.a.y + wall.b.y) / 2,
    };
    const shared = f.rooms.filter((r) =>
      r.points.some(
        (p, i) =>
          Math.abs(
            distance(p, midpoint) +
              distance(midpoint, r.points[(i + 1) % r.points.length]) -
              distance(p, r.points[(i + 1) % r.points.length]),
          ) < 1e-6,
      ),
    ).length;
    const len = distance(wall.a, wall.b);
    if (len < 1.3) continue;
    const kind = shared > 1 ? "door" : "window";
    f.openings.push({
      id: uid(),
      kind,
      wallId: wall.id,
      offset: (len - (kind === "door" ? 0.9 : 1.1)) / 2,
      width: kind === "door" ? 0.9 : 1.1,
      height: kind === "door" ? 2.1 : 1.3,
      sill: kind === "door" ? 0 : 0.9,
      flip: false,
    });
  }
  return s;
}
