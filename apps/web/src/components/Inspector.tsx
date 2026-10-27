"use client";
import { useState, useEffect } from "react";
import {
  ChevronDown,
  Copy,
  RotateCw,
  FlipHorizontal,
  AlignCenter,
  ArrowUp,
  ArrowDown,
  Magnet,
  Lock,
  Unlock,
  EyeOff,
  Group,
  Trash2,
  SlidersHorizontal,
  Check,
  Info,
  Box,
  Layers3,
  Lightbulb,
} from "lucide-react";
import {
  splitWall,
  splitRectangularRoom,
  mergeAdjacentRooms,
} from "@core/architecture";
import { rebuild } from "@/lib/store";
import { useEditor, activeFloor } from "@/lib/store";
import {
  bounds,
  area,
  distance,
  openingValid,
  unitFactor,
} from "@core/geometry";
import { totalCost } from "@core/estimate";
import { editWall } from "@core/wall-edit";
import { materials, getCatalog } from "@core/catalog";
import { furnitureSvg, svgData } from "@core/vector";
export function Numeric({
  label,
  value,
  onChange,
  step = 0.05,
  min = -1000,
  max = 1000,
  suffix = "m",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  const [text, setText] = useState(String(+value.toFixed(3)));
  useEffect(() => setText(String(+value.toFixed(3))), [value]);
  return (
    <label className="numeric">
      <span>{label}</span>
      <div>
        <input
          aria-label={label}
          type="number"
          value={text}
          step={step}
          min={min}
          max={max}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            const n = Number(text);
            if (text !== "" && Number.isFinite(n) && n >= min && n <= max)
              onChange(n);
            else setText(String(value));
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
        <small>{suffix}</small>
      </div>
    </label>
  );
}
export default function Inspector({ onIssues }: { onIssues: () => void }) {
  const s = useEditor();
  const f = activeFloor(),
    id = s.selected[0];
  const item = f.items.find((i) => i.id === id),
    room = f.rooms.find((r) => r.id === id),
    wall = f.walls.find((w) => w.id === id),
    opening = f.openings.find((o) => o.id === id);
  const reference = f.references?.find((r) => r.id === id);
  const selected = item || room || wall || opening || reference;
  const b = room ? bounds(room.points) : null;
  const factor = unitFactor[s.scene.unit];
  const length = (
    label: string,
    value: number,
    fn: (v: number) => void,
    min = 0.02,
  ) => (
    <Numeric
      label={label}
      value={value * factor}
      onChange={(v) => fn(v / factor)}
      min={min * factor}
      max={1000 * factor}
      suffix={s.scene.unit}
      step={0.05 * factor}
    />
  );
  const currency = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: s.scene.currency,
    maximumFractionDigits: 0,
  });
  return (
    <aside className="inspector">
      <div className="inspector-title">
        <span>INSPECTOR</span>
        <SlidersHorizontal size={15} />
      </div>
      <div className="inspector-scroll">
        {reference ? (
          <>
            <div className="section-heading">
              <span>TRACING REFERENCE</span>
            </div>
            <h3>{reference.name}</h3>
            <p className="sidebar-hint">
              Select two points on the image and enter their known distance to
              calibrate the drawing scale.
            </p>
            <button
              className="add-outline"
              onClick={() =>
                s.set({
                  tool: "calibrate",
                  message:
                    "Click the first and second calibration points on the image",
                })
              }
            >
              Calibrate known distance
            </button>
            <div className="numeric-grid">
              {length("Image width", reference.width, (width) =>
                s.commit((scene) => {
                  const r = scene.floors
                    .find((f) => f.id === s.floorId)!
                    .references.find((r) => r.id === id)!;
                  r.depth *= width / r.width;
                  r.width = width;
                }),
              )}
              <Numeric
                label="Opacity"
                value={reference.opacity}
                min={0.05}
                max={1}
                step={0.05}
                suffix=""
                onChange={(opacity) =>
                  s.commit((scene) => {
                    scene.floors
                      .find((f) => f.id === s.floorId)!
                      .references.find((r) => r.id === id)!.opacity = opacity;
                  })
                }
              />
            </div>
            <button
              className="add-outline"
              onClick={() =>
                s.commit((scene) => {
                  const r = scene.floors
                    .find((f) => f.id === s.floorId)!
                    .references.find((r) => r.id === id)!;
                  r.locked = !r.locked;
                })
              }
            >
              {reference.locked
                ? "Unlock image position"
                : "Lock image position"}
            </button>
            <button
              className="delete-button"
              onClick={() => {
                s.commit((scene) => {
                  const f = scene.floors.find((f) => f.id === s.floorId)!;
                  f.references = f.references.filter((r) => r.id !== id);
                });
                s.select(null);
              }}
            >
              Remove reference
            </button>
          </>
        ) : selected ? (
          <>
            <div className="selection-card">
              <div className="selection-thumb">
                {item ? (
                  <img
                    alt=""
                    src={svgData(furnitureSvg(item.catalogId, item.color))}
                  />
                ) : room ? (
                  <Layers3 size={28} />
                ) : (
                  <Box size={28} />
                )}
              </div>
              <div>
                <span className="eyebrow">
                  {item
                    ? "FURNITURE"
                    : room
                      ? "ROOM"
                      : wall
                        ? "WALL"
                        : opening?.kind.toUpperCase()}
                </span>
                <strong>
                  {item?.name ??
                    room?.name ??
                    (wall ? "Architectural wall" : `${opening?.kind} opening`)}
                </strong>
                <small>
                  {s.selected.length > 1
                    ? `${s.selected.length} selected`
                    : f.name}
                </small>
              </div>
            </div>
            {opening && (
              <>
                <label className="field-label">
                  OPENING STYLE
                  <select
                    value={
                      opening.style ??
                      (opening.kind === "door" ? "hinged" : "picture")
                    }
                    onChange={(e) =>
                      s.commit((scene) => {
                        scene.floors
                          .find((f) => f.id === s.floorId)!
                          .openings.find((o) => o.id === id)!.style = e.target
                          .value as typeof opening.style;
                      })
                    }
                  >
                    {(opening.kind === "door"
                      ? ["hinged", "double", "sliding", "pocket", "bifold"]
                      : ["picture", "sliding", "floor-to-ceiling"]
                    ).map((style) => (
                      <option value={style} key={style}>
                        {style.replaceAll("-", " ")}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="add-outline"
                  onClick={() =>
                    s.commit((scene) => {
                      const o = scene.floors
                        .find((f) => f.id === s.floorId)!
                        .openings.find((o) => o.id === id)!;
                      o.flip = !o.flip;
                    })
                  }
                >
                  Reverse opening swing
                </button>
              </>
            )}
            {(item || room) && (
              <label className="field-label">
                NAME
                <input
                  aria-label="Entity name"
                  key={id}
                  defaultValue={item?.name ?? room?.name}
                  onBlur={(e) => {
                    const name = e.target.value.trim();
                    if (name)
                      item
                        ? s.updateItem(id, { name })
                        : s.updateRoom(id, { name });
                  }}
                />
              </label>
            )}
            <div className="section-heading">
              <span>DIMENSIONS & POSITION</span>
              <span className="unit-badge">{s.scene.unit}</span>
            </div>
            <div className="numeric-grid">
              {item ? (
                <>
                  {length(
                    "X position",
                    item.x,
                    (x) => s.updateItem(id, { x }),
                    -1000,
                  )}
                  {length(
                    "Y position",
                    item.y,
                    (y) => s.updateItem(id, { y }),
                    -1000,
                  )}
                  {length("Width", item.width, (width) =>
                    s.updateItem(id, { width }),
                  )}
                  {length("Depth", item.depth, (depth) =>
                    s.updateItem(id, { depth }),
                  )}
                  {length("Height", item.height, (height) =>
                    s.updateItem(id, { height }),
                  )}
                  {length(
                    "Elevation",
                    item.elevation,
                    (elevation) => s.updateItem(id, { elevation }),
                    0,
                  )}
                  <Numeric
                    label="Rotation"
                    value={item.rotation}
                    onChange={(rotation) => s.updateItem(id, { rotation })}
                    min={-3600}
                    max={3600}
                    step={15}
                    suffix="°"
                  />
                  <Numeric
                    label="Demo price"
                    value={item.price}
                    onChange={(price) => s.updateItem(id, { price })}
                    min={0}
                    max={1e8}
                    step={10}
                    suffix={s.scene.currency}
                  />
                </>
              ) : room && b ? (
                <>
                  {length("Room width", b.width, (width) =>
                    s.updateRoom(id, {
                      points: room.points.map((p) => ({
                        ...p,
                        x: b.x + ((p.x - b.x) * width) / b.width,
                      })),
                    }),
                  )}
                  {length("Room depth", b.depth, (depth) =>
                    s.updateRoom(id, {
                      points: room.points.map((p) => ({
                        ...p,
                        y: b.y + ((p.y - b.y) * depth) / b.depth,
                      })),
                    }),
                  )}
                  {length("Ceiling height", room.height, (height) =>
                    s.updateRoom(id, { height }),
                  )}
                  <div className="area-readout">
                    <span>FLOOR AREA</span>
                    <strong>
                      {area(room.points).toFixed(2)} <small>m²</small>
                    </strong>
                  </div>
                </>
              ) : wall ? (
                <>
                  {length("Wall length", distance(wall.a, wall.b), (len) =>
                    s.commit((scene) => {
                      const w = scene.floors
                        .find((f) => f.id === s.floorId)!
                        .walls.find((w) => w.id === id)!;
                      const d = distance(w.a, w.b);
                      const endpoint = {
                        x: w.a.x + ((w.b.x - w.a.x) * len) / d,
                        y: w.a.y + ((w.b.y - w.a.y) * len) / d,
                      };
                      editWall(
                        scene.floors.find((f) => f.id === s.floorId)!,
                        id,
                        w.a,
                        endpoint,
                      );
                    }),
                  )}
                  {length("Wall thickness", wall.thickness, (thickness) =>
                    s.commit((scene) => {
                      scene.floors
                        .find((f) => f.id === s.floorId)!
                        .walls.find((w) => w.id === id)!.thickness = thickness;
                    }),
                  )}
                  {length("Wall height", wall.height, (height) =>
                    s.commit((scene) => {
                      scene.floors
                        .find((f) => f.id === s.floorId)!
                        .walls.find((w) => w.id === id)!.height = height;
                    }),
                  )}
                </>
              ) : opening ? (
                <>
                  {(["offset", "width", "height", "sill"] as const).map((key) =>
                    length(
                      key[0].toUpperCase() + key.slice(1),
                      opening[key],
                      (v) =>
                        s.commit((scene) => {
                          const floor = scene.floors.find(
                            (f) => f.id === s.floorId,
                          )!;
                          const o = floor.openings.find((o) => o.id === id)!;
                          o[key] = v;
                          const w = floor.walls.find((w) => w.id === o.wallId)!;
                          if (!openingValid(o, w, floor.openings))
                            throw new Error(
                              "The opening must fit within its host wall",
                            );
                        }),
                      key === "offset" || key === "sill" ? 0 : 0.02,
                    ),
                  )}
                </>
              ) : null}
            </div>
            {(item || room) && (
              <>
                <div className="section-heading">
                  <span>MATERIAL & FINISH</span>
                  <span className="subtle">Surface</span>
                </div>
                <div className="color-control">
                  <input
                    type="color"
                    aria-label="Surface color"
                    value={item?.color ?? room?.color}
                    onChange={(e) =>
                      item
                        ? s.updateItem(id, { color: e.target.value })
                        : s.updateRoom(id, { color: e.target.value })
                    }
                  />
                  <span>
                    {item?.color ?? room?.color}
                    <small>Custom color</small>
                  </span>
                  <ChevronDown size={14} />
                </div>
                {room && (
                  <select
                    className="full-select"
                    aria-label="Floor material"
                    value={room.material}
                    onChange={(e) => {
                      const m = materials.find((m) => m.id === e.target.value)!;
                      s.updateRoom(id, { material: m.id, color: m.color });
                    }}
                  >
                    {materials.map((m) => (
                      <option value={m.id} key={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                )}
              </>
            )}
            {wall && (
              <button
                className="add-outline"
                onClick={() =>
                  s.commit((scene) => {
                    const f = scene.floors.find((f) => f.id === s.floorId)!;
                    splitWall(f, id);
                  })
                }
              >
                Split wall at midpoint
              </button>
            )}
            {room && (
              <div className="room-topology-actions">
                <button
                  className="add-outline"
                  onClick={() =>
                    s.commit((scene) => {
                      const f = scene.floors.find((f) => f.id === s.floorId)!;
                      f.rooms = f.rooms.flatMap((r) =>
                        r.id === id ? splitRectangularRoom(r, "x") : [r],
                      );
                      rebuild(f);
                    })
                  }
                >
                  Split vertically
                </button>
                <button
                  className="add-outline"
                  onClick={() =>
                    s.commit((scene) => {
                      const f = scene.floors.find((f) => f.id === s.floorId)!;
                      f.rooms = f.rooms.flatMap((r) =>
                        r.id === id ? splitRectangularRoom(r, "y") : [r],
                      );
                      rebuild(f);
                    })
                  }
                >
                  Split horizontally
                </button>
                <button
                  className="add-outline"
                  onClick={() =>
                    s.commit((scene) => {
                      const f = scene.floors.find((f) => f.id === s.floorId)!;
                      const other = f.rooms.find(
                        (r) => r.id !== id && s.selected.includes(r.id),
                      );
                      if (!other)
                        throw new Error(
                          "Shift-select two adjacent rooms to merge",
                        );
                      const merged = mergeAdjacentRooms(room, other);
                      const removedWalls = f.walls.filter((w) =>
                        f.openings.some((o) => o.wallId === w.id),
                      );
                      f.rooms = f.rooms.filter(
                        (r) => r.id !== id && r.id !== other.id,
                      );
                      f.rooms.push(merged);
                      rebuild(f);
                    })
                  }
                >
                  Merge selected rooms
                </button>
              </div>
            )}
            <div className="section-heading">
              <span>ACTIONS</span>
              <small>{item?.locked ? "Locked" : "Editable"}</small>
            </div>
            <div className="action-grid">
              {[
                ["duplicate", "Duplicate", Copy],
                ["rotate", "Rotate 90°", RotateCw],
                ["flip", "Mirror", FlipHorizontal],
                ["align", "Align center", AlignCenter],
                ["front", "Bring forward", ArrowUp],
                ["back", "Send backward", ArrowDown],
                ["snap", "Snap to grid", Magnet],
                [
                  "lock",
                  item?.locked ? "Unlock" : "Lock",
                  item?.locked ? Unlock : Lock,
                ],
                ["hide", "Hide / show", EyeOff],
                ["group", "Group", Group],
              ].map(([action, label, Icon]) => (
                <button
                  key={action as string}
                  disabled={!item}
                  onClick={() => s.action(action as string)}
                >
                  {(() => {
                    const I = Icon as typeof Copy;
                    return <I size={14} />;
                  })()}
                  {label as string}
                </button>
              ))}
            </div>
            <button
              className="delete-button"
              onClick={() => {
                if (
                  window.confirm(
                    "Delete the selected entities? You can undo this action.",
                  )
                )
                  s.remove();
              }}
            >
              <Trash2 size={14} />
              Delete selection<span>⌫</span>
            </button>
          </>
        ) : (
          <>
            <div className="floor-summary">
              <div className="floor-summary-icon">
                <Layers3 size={25} />
              </div>
              <span className="eyebrow">YOU'RE DESIGNING</span>
              <h2>{f.name}</h2>
              <p>Good spaces start with a plan.</p>
            </div>
            <div className="section-heading">
              <span>FLOOR SETTINGS</span>
              <Layers3 size={14} />
            </div>
            <label className="field-label">
              FLOOR NAME
              <input
                aria-label="Floor name"
                key={f.id}
                defaultValue={f.name}
                onBlur={(e) =>
                  s.commit((scene) => {
                    scene.floors.find((v) => v.id === f.id)!.name =
                      e.target.value || "Floor";
                  })
                }
              />
            </label>
            <div className="numeric-grid">
              {length("Floor height", f.height, (height) =>
                s.commit((scene) => {
                  const floor = scene.floors.find((v) => v.id === f.id)!;
                  floor.height = height;
                  floor.walls.forEach((w) => (w.height = height));
                  floor.rooms.forEach((r) => (r.height = height));
                }),
              )}
              {length(
                "Floor elevation",
                f.elevation,
                (elevation) =>
                  s.commit((scene) => {
                    scene.floors.find((v) => v.id === f.id)!.elevation =
                      elevation;
                  }),
                -100,
              )}
            </div>
            <div className="section-heading">
              <span>LIGHT & ATMOSPHERE</span>
              <Lightbulb size={15} />
            </div>
            <label className="slider-label">
              Daylight <span>{s.scene.sun}:00</span>
              <input
                type="range"
                aria-label="Time of day"
                min="0"
                max="24"
                step="1"
                value={s.scene.sun}
                onChange={(e) =>
                  s.commit((scene) => {
                    scene.sun = +e.target.value;
                  })
                }
              />
            </label>
            <label className="slider-label">
              Ambient light<span>{s.scene.ambient.toFixed(1)}</span>
              <input
                type="range"
                aria-label="Ambient light"
                min="0"
                max="3"
                step="0.1"
                value={s.scene.ambient}
                onChange={(e) =>
                  s.commit((scene) => {
                    scene.ambient = +e.target.value;
                  })
                }
              />
            </label>
            <div className="inspector-empty">
              <div className="cursor-outline">↖</div>
              <strong>Every detail, considered.</strong>
              <p>
                Select a room, wall, or furniture to fine-tune dimensions,
                finishes, and placement.
              </p>
              <span>Hold Shift to select multiple objects</span>
            </div>
          </>
        )}
        <div className="statistics">
          <div className="section-heading">
            <span>PROJECT AT A GLANCE</span>
            <Info size={14} />
          </div>
          <dl>
            <div>
              <dt>Total floor area</dt>
              <dd>
                {s.scene.floors
                  .reduce(
                    (n, f) =>
                      n + f.rooms.reduce((a, r) => a + area(r.points), 0),
                    0,
                  )
                  .toFixed(1)}{" "}
                <small>m²</small>
              </dd>
            </div>
            <div>
              <dt>Rooms</dt>
              <dd>{s.scene.floors.reduce((n, f) => n + f.rooms.length, 0)}</dd>
            </div>
            <div>
              <dt>Objects</dt>
              <dd>{s.scene.floors.reduce((n, f) => n + f.items.length, 0)}</dd>
            </div>
            <div>
              <dt>Estimated total</dt>
              <dd className="green">{currency.format(totalCost(s.scene))}</dd>
            </div>
          </dl>
          <button className="validation-row" onClick={onIssues}>
            <span className="live-dot" />
            Review spatial checks
            <ChevronDown size={13} />
          </button>
          <p className="tiny-note">
            Catalog prices are illustrative. Areas follow drawn boundaries; not
            certified construction documents.
          </p>
        </div>
      </div>
      <div className="inspector-footer">
        <span className="live-dot" />
        Designed with intention.<span>✧</span>
      </div>
    </aside>
  );
}
