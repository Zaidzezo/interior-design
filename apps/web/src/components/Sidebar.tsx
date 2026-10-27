"use client";
import { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Search,
  Star,
  Layers3,
  Armchair,
  Paintbrush,
  SlidersHorizontal,
  House,
  Grip,
  Box,
  ArrowUpRight,
  HelpCircle,
} from "lucide-react";
import { useEditor, activeFloor } from "@/lib/store";
import { useSession, accountInitials } from "@/lib/session";
import { catalog, materials, Kind, floorTexture } from "@core/catalog";
import { furnitureSvg, svgData, woodSvg } from "@core/vector";
import { area } from "@core/geometry";
const roomTypes: [string, Kind][] = [
  ["Living Room", "sofa"],
  ["Bedroom", "bed"],
  ["Kitchen", "stove"],
  ["Bathroom", "bath"],
  ["Entryway", "cabinet"],
  ["Office", "desk"],
  ["Dining", "table"],
  ["Balcony", "plant"],
  ["Storage", "shelf"],
  ["Utility", "sink"],
  ["Custom", "rug"],
];
export default function Sidebar({
  onHelp,
  onAccount,
}: {
  onHelp: () => void;
  onAccount: () => void;
}) {
  const session = useSession();
  const s = useEditor();
  const f = activeFloor();
  useEffect(() => {
    try {
      const saved = localStorage.getItem("buildspace-plan-style");
      if (saved === "realistic" || saved === "blueprint")
        s.set({ planStyle: saved });
      const ids = JSON.parse(
        localStorage.getItem("buildspace-recent-items") ?? "[]",
      );
      if (Array.isArray(ids))
        s.set({
          recentItems: ids
            .filter((id) => catalog.some((c) => c.id === id))
            .slice(0, 8),
        });
    } catch {}
  }, []);
  const [search, setSearch] = useState(""),
    [category, setCategory] = useState("All"),
    [favorites, setFavorites] = useState<string[]>(() => {
      try {
        return JSON.parse(localStorage.getItem("buildspace-favorites") ?? "[]");
      } catch {
        return [];
      }
    });
  const [showAll, setShowAll] = useState(false);
  const filtered = catalog.filter(
    (c) =>
      (category === "All" ||
        (category === "Favorites"
          ? favorites.includes(c.id)
          : c.category === category)) &&
      c.name.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <aside className="sidebar">
      <nav className="panel-tabs">
        {[
          ["rooms", "Rooms"],
          ["furniture", "Furniture"],
          ["materials", "Materials"],
          ["properties", "Properties"],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => s.set({ tab: id })}
            className={s.tab === id ? "active" : ""}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="sidebar-scroll">
        {s.tab === "rooms" ? (
          <>
            <div className="section-heading">
              <span>BUILD YOUR SPACE</span>
              <span className="subtle">01</span>
            </div>
            <div className="room-types">
              {(showAll ? roomTypes : roomTypes.slice(0, 8)).map(
                ([name, kind], i) => (
                  <button
                    className="room-type"
                    key={name}
                    onClick={() => s.addRoom(name)}
                    title={`Add a 4 × 3 m ${name.toLowerCase()}`}
                  >
                    <img
                      src={svgData(
                        furnitureSvg(
                          kind,
                          ["#c1b6d4", "#b5c7ce", "#c2b59e", "#d7e3df"][i % 4],
                          80,
                          65,
                        ),
                      )}
                      alt=""
                    />
                    <span>{name}</span>
                    <Plus size={13} className="tile-plus" />
                  </button>
                ),
              )}
            </div>
            <button
              className="text-button more-types"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? "Fewer room types" : "All room types"}
              <ChevronDown size={13} />
            </button>
            <div className="section-heading">
              <span>YOUR FLOOR PLAN</span>
              <button
                title="Fit floor plan"
                onClick={() => s.set({ fitTick: s.fitTick + 1 })}
              >
                <Layers3 size={14} />
              </button>
            </div>
            <div className="floor-tree">
              <div className="tree-floor">
                <ChevronDown size={14} />
                <Layers3 size={15} />
                <strong>{f.name}</strong>
                <span>{f.rooms.length}</span>
              </div>
              {f.rooms.map((r, i) => (
                <button
                  className={`room-row ${s.selected.includes(r.id) ? "selected" : ""}`}
                  key={r.id}
                  onClick={() => s.select(r.id)}
                >
                  <span className="room-index">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <strong>{r.name}</strong>
                    <small>{r.type}</small>
                  </div>
                  <span className="area-badge">
                    {area(r.points).toFixed(1)}
                    <small>m²</small>
                  </span>
                  <ChevronRight size={13} />
                </button>
              ))}
            </div>
            <button
              className="add-outline"
              onClick={() => s.set({ tool: "room" })}
            >
              <Plus size={15} />
              Draw a custom room<span>R</span>
            </button>
            <div className="tip-card">
              <div className="tip-icon">
                <House size={17} />
              </div>
              <strong>A place for every idea.</strong>
              <p>
                Add a room, make it yours. Drag furniture straight onto your
                plan.
              </p>
              <button onClick={() => s.set({ tab: "furniture" })}>
                Explore the furniture library
                <ArrowUpRight size={13} />
              </button>
            </div>
          </>
        ) : s.tab === "furniture" ? (
          <>
            <div className="section-heading">
              <span>FURNITURE LIBRARY</span>
              <span className="subtle">{catalog.length} items</span>
            </div>
            <div className="search-field">
              <Search size={15} />
              <input
                aria-label="Search furniture"
                placeholder="Find the perfect piece…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="category-chips">
              {[
                "All",
                "Favorites",
                ...new Set(catalog.map((c) => c.category)),
              ].map((c) => (
                <button
                  key={c}
                  className={category === c ? "active" : ""}
                  onClick={() => setCategory(c)}
                >
                  {c === "Favorites" ? <Star size={12} /> : null}
                  {c}
                </button>
              ))}
            </div>
            <p className="sidebar-hint">
              Drag into your plan, or click to place.
            </p>
            {!!s.recentItems.length && (
              <section
                aria-label="Recently used furniture"
                className="recent-furniture"
              >
                <div className="section-heading">RECENTLY USED</div>
                <div>
                  {s.recentItems.map((id) => {
                    const c = catalog.find((c) => c.id === id)!;
                    return (
                      <button
                        key={id}
                        title={c.name}
                        onClick={() => s.set({ placing: id, tool: "select" })}
                      >
                        <img
                          loading="lazy"
                          src={svgData(furnitureSvg(c.id, c.color))}
                          alt={c.name}
                        />
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
            <div className="catalog-grid">
              {filtered.map((c) => (
                <div
                  className={`catalog-card ${s.placing === c.id ? "chosen" : ""}`}
                  key={c.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("buildspace/item", c.id);
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                >
                  <button
                    className="favorite"
                    title="Toggle favorite"
                    onClick={() => {
                      const next = favorites.includes(c.id)
                        ? favorites.filter((x) => x !== c.id)
                        : [...favorites, c.id];
                      setFavorites(next);
                      localStorage.setItem(
                        "buildspace-favorites",
                        JSON.stringify(next),
                      );
                    }}
                  >
                    <Star
                      size={12}
                      fill={favorites.includes(c.id) ? "#d4b56e" : "none"}
                    />
                  </button>
                  <button
                    className="catalog-place"
                    onClick={() =>
                      s.set({
                        placing: c.id,
                        tool: "select",
                        message: `Click on the plan to place ${c.name}`,
                      })
                    }
                  >
                    <img
                      loading="lazy"
                      src={svgData(furnitureSvg(c.id, c.color))}
                      alt={c.name}
                    />
                    <strong>{c.name}</strong>
                    <span>
                      {c.width} × {c.depth} m <b>${c.price}</b>
                    </span>
                  </button>
                </div>
              ))}
            </div>
            {!filtered.length && (
              <p className="empty">No matching furniture.</p>
            )}
          </>
        ) : s.tab === "materials" ? (
          <>
            <div className="section-heading">
              <span>MATERIAL STUDIO</span>
              <Paintbrush size={15} />
            </div>
            <div className="search-field">
              <Search size={15} />
              <input
                placeholder="Search materials…"
                aria-label="Search materials"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <p className="sidebar-hint">
              Select a room or object, then apply a finish.
            </p>
            <div className="material-grid">
              {materials
                .filter((m) =>
                  m.name.toLowerCase().includes(search.toLowerCase()),
                )
                .map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      const id = s.selected[0];
                      const room = f.rooms.find((r) => r.id === id);
                      const item = f.items.find((i) => i.id === id);
                      if (room)
                        s.updateRoom(id, { material: m.id, color: m.color });
                      else if (item) s.updateItem(id, { color: m.color });
                      else
                        s.set({
                          message: "Select a room or furniture item first",
                        });
                    }}
                  >
                    <span
                      style={{
                        backgroundImage: floorTexture(m.id)
                          ? `url(/assets/materials/${m.id}-albedo.webp)`
                          : `url("${svgData(woodSvg(m.color, m.family !== "Wood"))}")`,
                      }}
                    />
                    <strong>{m.name}</strong>
                    <small>
                      {m.family} · ${m.rate}/m²
                    </small>
                  </button>
                ))}
            </div>
          </>
        ) : (
          <>
            <div className="section-heading">
              <span>SCENE LAYERS</span>
              <Layers3 size={15} />
            </div>
            {[
              ["grid", "Architectural grid"],
              ["labels", "Room labels & areas"],
              ["measurements", "Dimensions"],
              ["collisions", "Spatial issues"],
            ].map(([key, label]) => (
              <label className="layer-row" key={key}>
                <input
                  type="checkbox"
                  checked={Boolean(s[key as keyof typeof s])}
                  onChange={(e) => s.set({ [key]: e.target.checked })}
                />
                {label}
              </label>
            ))}
            {(f.references ?? []).map((r) => (
              <button
                key={r.id}
                className="add-outline"
                onClick={() => s.select(r.id)}
              >
                Reference · {r.name}
              </button>
            ))}
            <div className="section-heading">
              <span>OBJECT VISIBILITY</span>
              <span>{f.items.length}</span>
            </div>
            {f.items.map((i) => (
              <label key={i.id} className="layer-row">
                <input
                  type="checkbox"
                  checked={!i.hidden}
                  onChange={() => s.updateItem(i.id, { hidden: !i.hidden })}
                />
                <button onClick={() => s.select(i.id)}>{i.name}</button>
              </label>
            ))}
          </>
        )}
      </div>
      <div className="sidebar-footer">
        <button className="avatar" title="Account" onClick={onAccount}>
          {accountInitials(session.data?.user?.name)}
        </button>
        <div>
          <strong>Your design workspace</strong>
          <small>Local studio · demo prices</small>
        </div>
        <button title="Keyboard shortcuts" onClick={onHelp}>
          <HelpCircle size={17} />
        </button>
      </div>
    </aside>
  );
}
