import { z } from "zod";
const finite = z.number().finite();
const positive = finite.min(0.02).max(1000);
export const PointSchema = z.object({
  x: finite.min(-1000).max(1000),
  y: finite.min(-1000).max(1000),
});
const entity = { id: z.string().min(1).max(100) };
export const RoomSchema = z.object({
  ...entity,
  name: z.string().max(100),
  type: z.string().max(50),
  points: z.array(PointSchema).min(3).max(100),
  material: z.string().max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  height: positive.default(2.8),
});
export const WallSchema = z.object({
  ...entity,
  a: PointSchema,
  b: PointSchema,
  thickness: positive.max(2),
  height: positive.max(20),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#26364c"),
  finish: z
    .enum(["matte", "plaster", "brick", "paneling", "wallpaper"])
    .optional(),
  source: z.enum(["room", "manual"]).optional(),
});
export const OpeningSchema = z.object({
  ...entity,
  kind: z.enum(["door", "window", "passage"]),
  wallId: z.string(),
  offset: finite.min(0),
  width: positive,
  height: positive,
  sill: finite.min(0).max(10),
  flip: z.boolean().default(false),
  style: z
    .enum([
      "hinged",
      "double",
      "sliding",
      "pocket",
      "bifold",
      "picture",
      "floor-to-ceiling",
    ])
    .optional(),
});
export const ItemSchema = z.object({
  ...entity,
  catalogId: z.string().max(100),
  name: z.string().max(100),
  x: finite,
  y: finite,
  width: positive,
  depth: positive,
  height: positive,
  elevation: finite.min(0).max(100),
  rotation: finite,
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  price: finite.min(0).max(1e8),
  locked: z.boolean(),
  hidden: z.boolean(),
  groupId: z.string().optional(),
  flipX: z.boolean().optional(),
  finish: z
    .enum([
      "original",
      "boucle",
      "velvet",
      "walnut",
      "marble",
      "brass",
      "rattan",
    ])
    .optional(),
});
export const ReferenceSchema = z.object({
  ...entity,
  name: z.string().max(100),
  dataUrl: z
    .string()
    .max(4000000)
    .regex(/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]*={0,2}$/),
  x: finite,
  y: finite,
  width: positive,
  depth: positive,
  opacity: finite.min(0.05).max(1),
  locked: z.boolean(),
});
export const FloorSchema = z.object({
  ...entity,
  name: z.string().max(100),
  elevation: finite,
  height: positive,
  rooms: z.array(RoomSchema).max(300),
  walls: z.array(WallSchema).max(2000),
  removedBoundaries: z
    .array(z.object({ a: PointSchema, b: PointSchema }))
    .max(2000)
    .optional(),
  openings: z.array(OpeningSchema).max(1000),
  items: z.array(ItemSchema).max(2000),
  references: z.array(ReferenceSchema).max(5).default([]),
  annotations: z
    .array(
      z.object({
        ...entity,
        a: PointSchema,
        b: PointSchema,
        text: z.string().max(500),
        kind: z.enum(["measure", "note"]),
      }),
    )
    .max(1000),
});
export const SceneSchema = z
  .object({
    formatVersion: z.literal(1),
    name: z.string().min(1).max(100),
    unit: z.enum(["m", "cm", "mm", "ft", "in"]),
    currency: z.enum(["USD", "EUR", "GBP", "JOD"]),
    floors: z.array(FloorSchema).min(1).max(20),
    ambient: finite.min(0).max(3),
    sun: finite.min(0).max(24),
    rules: z.object({ clearance: finite.min(0).max(2) }),
    cameras: z
      .array(
        z.object({
          name: z.string(),
          position: z.array(finite).length(3),
          target: z.array(finite).length(3),
        }),
      )
      .max(30),
  })
  .superRefine((scene, ctx) => {
    const ids = new Set<string>();
    for (const floor of scene.floors) {
      for (const entity of [
        floor,
        ...floor.rooms,
        ...floor.walls,
        ...floor.openings,
        ...floor.items,
        ...floor.annotations,
        ...floor.references,
      ]) {
        if (ids.has(entity.id))
          ctx.addIssue({
            code: "custom",
            message: "Scene entity IDs must be globally unique",
          });
        ids.add(entity.id);
      }
      for (const o of floor.openings)
        if (!floor.walls.some((w) => w.id === o.wallId))
          ctx.addIssue({
            code: "custom",
            message: "Opening host wall is missing",
          });
    }
  });
export type Reference = z.infer<typeof ReferenceSchema>;
export type Point = z.infer<typeof PointSchema>;
export type Room = z.infer<typeof RoomSchema>;
export type Wall = z.infer<typeof WallSchema>;
export type Opening = z.infer<typeof OpeningSchema>;
export type Item = z.infer<typeof ItemSchema>;
export type Floor = z.infer<typeof FloorSchema>;
export type Scene = z.infer<typeof SceneSchema>;
export const uid = () => crypto.randomUUID();
