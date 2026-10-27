import { Scene } from "./model";
import { area, perimeter } from "./geometry";
import { materials } from "./catalog";
export function estimate(scene: Scene) {
  return scene.floors.flatMap((f) => [
    ...f.items.map((i) => ({
      id: i.id,
      name: i.name,
      category: "Furniture",
      floor: f.name,
      quantity: 1,
      unit: "ea",
      rate: i.price,
      total: i.price,
    })),
    ...f.rooms.flatMap((r) => {
      const m = materials.find((m) => m.id === r.material) ?? materials[0];
      return [
        {
          id: r.id,
          name: `${r.name} · ${m.name}`,
          category: "Flooring",
          floor: f.name,
          quantity: area(r.points),
          unit: "m²",
          rate: m.rate,
          total: area(r.points) * m.rate,
        },
        {
          id: `paint-${r.id}`,
          name: `${r.name} · wall finish`,
          category: "Finishes",
          floor: f.name,
          quantity: perimeter(r.points) * r.height,
          unit: "m²",
          rate: 12,
          total: perimeter(r.points) * r.height * 12,
        },
      ];
    }),
  ]);
}
export const totalCost = (s: Scene) =>
  estimate(s).reduce((n, i) => n + i.total, 0);
