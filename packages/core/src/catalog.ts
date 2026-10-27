export type Kind =
  | "sofa"
  | "chair"
  | "bed"
  | "table"
  | "desk"
  | "cabinet"
  | "sink"
  | "stove"
  | "toilet"
  | "bath"
  | "shower"
  | "plant"
  | "rug"
  | "lamp"
  | "shelf"
  | "fridge"
  | "stairs";
export type CatalogItem = {
  id: string;
  name: string;
  category: string;
  kind: Kind;
  width: number;
  depth: number;
  height: number;
  price: number;
  color: string;
  footprint?: "rectangle" | "ellipse" | "sectional";
  variant?: number;
};
const groups: [
  Kind,
  string,
  string,
  number,
  number,
  number,
  string,
  string[],
][] = [
  [
    "sofa",
    "Living",
    "Sofa",
    2.4,
    0.95,
    0.8,
    "#d9d5c9",
    [
      "Linen three seat",
      "Bouclé loveseat",
      "Deep modular",
      "Compact two seat",
      "Corner sectional",
      "Leather lounge",
    ],
  ],
  [
    "chair",
    "Living",
    "Armchair",
    0.8,
    0.85,
    0.8,
    "#b9c7bb",
    [
      "Oak lounge",
      "Upholstered accent",
      "Reading chair",
      "Wingback",
      "Club chair",
    ],
  ],
  [
    "bed",
    "Bedroom",
    "Bed",
    1.8,
    2.1,
    0.6,
    "#b8c6d5",
    [
      "Queen upholstered",
      "King oak",
      "Double linen",
      "Single walnut",
      "Guest trundle",
      "Low platform",
    ],
  ],
  [
    "cabinet",
    "Storage",
    "Cabinet",
    1.2,
    0.45,
    0.8,
    "#aa8763",
    [
      "Oak sideboard",
      "Walnut dresser",
      "Entry console",
      "Tall wardrobe",
      "Kitchen base",
      "Bathroom vanity",
      "Media console",
      "Utility cupboard",
    ],
  ],
  [
    "table",
    "Dining",
    "Table",
    1.8,
    0.9,
    0.75,
    "#b5916e",
    [
      "Six person dining",
      "Four person round",
      "Extendable oak",
      "Bistro table",
      "Coffee table",
      "Side table",
    ],
  ],
  [
    "desk",
    "Office",
    "Desk",
    1.5,
    0.7,
    0.75,
    "#b5936c",
    [
      "Writing desk",
      "Standing desk",
      "Corner workspace",
      "Compact study",
      "Executive desk",
    ],
  ],
  [
    "chair",
    "Dining",
    "Chair",
    0.48,
    0.5,
    0.85,
    "#cbb995",
    [
      "Oak dining",
      "Wishbone dining",
      "Upholstered dining",
      "Kitchen stool",
      "Counter stool",
    ],
  ],
  [
    "sink",
    "Kitchen",
    "Sink",
    0.8,
    0.6,
    0.9,
    "#e2e5e0",
    ["Single basin", "Double basin", "Farmhouse basin", "Compact stainless"],
  ],
  [
    "stove",
    "Kitchen",
    "Cooktop",
    0.6,
    0.6,
    0.9,
    "#4f5355",
    ["Four ring induction", "Gas hob", "Electric oven", "Range cooker"],
  ],
  [
    "fridge",
    "Kitchen",
    "Fridge",
    0.75,
    0.7,
    1.9,
    "#d5d9d7",
    ["Tall refrigerator", "French door fridge", "Under counter fridge"],
  ],
  [
    "bath",
    "Bathroom",
    "Bath",
    0.85,
    1.75,
    0.6,
    "#f0f0e9",
    ["Freestanding bath", "Inset bathtub", "Compact bath"],
  ],
  [
    "shower",
    "Bathroom",
    "Shower",
    1,
    1,
    2.1,
    "#b7d6d6",
    ["Walk in shower", "Corner shower", "Wet room tray"],
  ],
  [
    "toilet",
    "Bathroom",
    "Toilet",
    0.45,
    0.7,
    0.75,
    "#eeeee8",
    ["Wall hung toilet", "Close coupled toilet", "Compact toilet"],
  ],
  [
    "sink",
    "Bathroom",
    "Vanity",
    0.8,
    0.5,
    0.85,
    "#e5e5da",
    ["Floating vanity", "Double vanity", "Pedestal basin"],
  ],
  [
    "plant",
    "Decor",
    "Plant",
    0.5,
    0.5,
    1.2,
    "#789274",
    [
      "Fiddle leaf fig",
      "Monstera",
      "Olive tree",
      "Bird of paradise",
      "Snake plant",
      "Small fern",
    ],
  ],
  [
    "rug",
    "Decor",
    "Rug",
    2.5,
    1.8,
    0.02,
    "#c9bca7",
    [
      "Wool ivory",
      "Woven sand",
      "Persian clay",
      "Sisal natural",
      "Geometric sage",
      "Round jute",
    ],
  ],
  [
    "lamp",
    "Lighting",
    "Lamp",
    0.4,
    0.4,
    1.6,
    "#d8bb80",
    [
      "Floor arc",
      "Table mushroom",
      "Tripod floor",
      "Pendant globe",
      "Ceiling spot",
    ],
  ],
  [
    "shelf",
    "Storage",
    "Shelf",
    1.2,
    0.35,
    1.8,
    "#977452",
    ["Open bookcase", "Wall bookshelf", "Low library", "Display shelves"],
  ],
  [
    "stairs",
    "Architecture",
    "Stairs",
    1,
    3,
    2.8,
    "#c3aa88",
    ["Straight oak staircase", "Compact utility stairs", "Wide open stair"],
  ],
  [
    "cabinet",
    "Kitchen",
    "Island",
    1.8,
    0.9,
    0.9,
    "#bda98b",
    [
      "Oak kitchen island",
      "Stone prep island",
      "Breakfast peninsula",
      "Rolling butcher block",
    ],
  ],
  [
    "desk",
    "Office",
    "Workspace",
    1.8,
    0.8,
    0.75,
    "#c5b99f",
    [
      "Dual monitor workspace",
      "Wall mounted workstation",
      "Drafting table",
      "Children study desk",
    ],
  ],
  [
    "table",
    "Living",
    "Occasional table",
    0.7,
    0.7,
    0.45,
    "#a98e6c",
    [
      "Low square walnut",
      "Nested coffee tables",
      "Narrow console table",
      "Round accent table",
    ],
  ],
];
export const catalog: CatalogItem[] = groups.flatMap(
  ([kind, category, , w, d, h, color, names], g) =>
    names.map((name, i) => ({
      id: `${kind}-${g}-${i}`,
      name,
      category,
      kind,
      width: +(w * (i === 3 ? 0.65 : i === 2 ? 1.15 : 1)).toFixed(2),
      depth: d,
      height: h,
      price: Math.round((w * d * 220 + g * 13) * (1 + i * 0.12)),
      color,
      variant: i,
      footprint: /round|stool|plant|lamp|bistro/i.test(name + " " + kind)
        ? ("ellipse" as const)
        : /sectional|corner workspace/.test(name.toLowerCase())
          ? ("sectional" as const)
          : ("rectangle" as const),
    })),
);
// Explicit sizes override family defaults; dimensions are meters.
const sizes: Record<string, [number, number, number]> = {
  "Linen three seat": [2.2, 0.95, 0.82],
  "Bouclé loveseat": [1.5, 0.85, 0.78],
  "Compact two seat": [1.65, 0.85, 0.8],
  "Corner sectional": [2.9, 2.1, 0.85],
  "King oak": [1.95, 2.2, 0.65],
  "Double linen": [1.4, 2.05, 0.6],
  "Single walnut": [0.95, 2.05, 0.55],
  "Four person round": [1.1, 1.1, 0.75],
  "Bistro table": [0.7, 0.7, 0.74],
  "Coffee table": [1.1, 0.6, 0.42],
  "Side table": [0.45, 0.45, 0.5],
  "Kitchen stool": [0.38, 0.38, 0.65],
  "Counter stool": [0.42, 0.42, 0.75],
  "Tall wardrobe": [1.8, 0.6, 2.1],
  "Double vanity": [1.4, 0.55, 0.85],
};
for (const c of catalog) {
  const size = sizes[c.name];
  if (size) [c.width, c.depth, c.height] = size;
}
for (const [id, name, kind, width, depth, height, category] of [
  [
    "office-task-chair",
    "Office task chair",
    "chair",
    0.65,
    0.65,
    1.05,
    "Office",
  ],
  [
    "classroom-chair",
    "Classroom stacking chair",
    "chair",
    0.45,
    0.5,
    0.8,
    "Office",
  ],
  [
    "classroom-desk",
    "Classroom student desk",
    "desk",
    0.65,
    0.5,
    0.74,
    "Office",
  ],
  [
    "meeting-table",
    "Eight person meeting table",
    "table",
    2.4,
    1.1,
    0.75,
    "Office",
  ],
  ["entry-bench", "Slatted entry bench", "sofa", 1.2, 0.4, 0.45, "Living"],
] as const)
  catalog.push({
    id,
    name,
    kind,
    width,
    depth,
    height,
    category,
    color: "#b8aa90",
    price: 180,
    variant: catalog.length,
  });
export const getCatalog = (id: string) =>
  catalog.find((c) => c.id === id) ?? catalog[0];
export const materials = [
  {
    id: "oak",
    name: "Natural oak",
    color: "#dfc8a5",
    rate: 48,
    family: "Wood",
  },
  {
    id: "walnut",
    name: "Smoked walnut",
    color: "#bda083",
    rate: 65,
    family: "Wood",
  },
  {
    id: "ash",
    name: "Whitewashed ash",
    color: "#e5ddcc",
    rate: 52,
    family: "Wood",
  },
  {
    id: "tile",
    name: "Limestone tile",
    color: "#d5ddd8",
    rate: 42,
    family: "Stone",
  },
  {
    id: "marble",
    name: "Calacatta marble",
    color: "#e8e9e4",
    rate: 110,
    family: "Stone",
  },
  {
    id: "terrazzo",
    name: "Warm terrazzo",
    color: "#d7cabc",
    rate: 72,
    family: "Stone",
  },
  {
    id: "concrete",
    name: "Polished concrete",
    color: "#c5c6c2",
    rate: 35,
    family: "Concrete",
  },
  {
    id: "carpet",
    name: "Oat wool carpet",
    color: "#d5cebc",
    rate: 32,
    family: "Fabric",
  },
  {
    id: "sage",
    name: "Soft sage",
    color: "#b6c2ae",
    rate: 18,
    family: "Paint",
  },
  {
    id: "clay",
    name: "Desert clay",
    color: "#cba992",
    rate: 18,
    family: "Paint",
  },
  {
    id: "chalk",
    name: "Chalk white",
    color: "#f0eee7",
    rate: 16,
    family: "Paint",
  },
  {
    id: "navy",
    name: "Midnight blue",
    color: "#32475e",
    rate: 20,
    family: "Paint",
  },
];
