import { Floor, Point } from "./model";
import { distance } from "./geometry";
/** Preserve wall and host IDs while moving joined endpoints and room vertices. */
export function editWall(floor: Floor, id: string, a: Point, b: Point) {
  const wall = floor.walls.find((w) => w.id === id);
  if (!wall) return;
  const oldA = { ...wall.a },
    oldB = { ...wall.b };
  const move = (p: Point) =>
    distance(p, oldA) < 1e-7
      ? { ...a }
      : distance(p, oldB) < 1e-7
        ? { ...b }
        : p;
  for (const room of floor.rooms) room.points = room.points.map(move);
  for (const w of floor.walls) {
    w.a = move(w.a);
    w.b = move(w.b);
  }
}
