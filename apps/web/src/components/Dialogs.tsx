"use client";
import { useEffect, useState, useRef } from "react";
import {
  X,
  Plus,
  FolderOpen,
  FilePlus,
  ArrowUpRight,
  Download,
  Check,
  Copy,
  Trash2,
  History,
  Link,
  Mail,
  Shield,
  Search,
  AlertTriangle,
  Home,
  CheckCircle,
  Upload,
  Star,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEditor, activeFloor } from "@/lib/store";
import { api } from "@/lib/api";
import { importDxf } from "@core/dxf";
import { templates, templateScene } from "@core/templates";
import { sampleScene, blankScene } from "@core/sample";
import {cloneItems} from "@core/commands";
import { Scene, uid, SceneSchema } from "@core/model";
import { estimate, totalCost } from "@core/estimate";
import { analyze, area } from "@core/geometry";
import { planSvg, svgData } from "@core/vector";
import {
  exportPlan,
  exportEstimatePdf,
  importScene,
  imageReference,
} from "@/lib/exports";
export type DialogName =
  | "projects"
  | "estimate"
  | "versions"
  | "share"
  | "export"
  | "settings"
  | "help"
  | "account"
  | "issues"
  | null;
export default function Dialogs({
  name,
  close,
  save,
}: {
  name: DialogName;
  close: () => void;
  save: () => Promise<boolean>;
}) {
  const s = useEditor();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement;
    ref.current?.focus();
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      if (e.key === "Tab") {
        const nodes = ref.current?.querySelectorAll<HTMLElement>(
          "button:not([disabled]),input,select,a[href]",
        );
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("keydown", key);
      prev?.focus();
    };
  }, [name]);
  useEffect(() => setError(""), [name]);
  if (!name) return null;
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }
  const titles = {
    projects: ["Your projects", "Make room for something great."],
    estimate: [
      "Project estimate",
      "A considered budget, built from your design.",
    ],
    versions: [
      "Version history",
      "Keep the possibilities. Revisit any direction.",
    ],
    share: ["Share your space", "Invite a fresh perspective."],
    export: ["Export your design", "From an idea to something you can share."],
    settings: [
      "Studio settings",
      "The little things that make it your workspace.",
    ],
    help: ["A little guidance", "Precision tools. Room to explore."],
    account: [
      "Your BuildSpace account",
      "Keep your projects under your own account.",
    ],
    issues: ["Spatial review", "Check your plan before your next step."],
  };
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={titles[name][0]}
        className={`modal modal-${name}`}
      >
        <header className="modal-heading">
          <div>
            <span className="eyebrow">BUILDSPACE STUDIO</span>
            <h2>{titles[name][0]}</h2>
            <p>{titles[name][1]}</p>
          </div>
          <button title="Close dialog" onClick={close}>
            <X size={20} />
          </button>
        </header>
        {error && (
          <div role="alert" className="error-banner">
            {error}
          </div>
        )}
        <div className="modal-content">
          {name === "projects" ? (
            <Projects run={run} close={close} save={save} />
          ) : name === "estimate" ? (
            <Estimate />
          ) : name === "versions" ? (
            <Versions run={run} save={save} close={close} />
          ) : name === "share" ? (
            <Share run={run} />
          ) : name === "export" ? (
            <Exports run={run} />
          ) : name === "settings" ? (
            <Settings />
          ) : name === "account" ? (
            <Account run={run} />
          ) : name === "issues" ? (
            <Issues close={close} />
          ) : (
            <Help />
          )}
        </div>
        {busy && <div className="busy-strip">Working…</div>}
      </div>
    </div>
  );
}
function Projects({
  run,
  close,
  save,
}: {
  run: (f: () => Promise<void>) => void;
  close: () => void;
  save: () => Promise<boolean>;
}) {
  const s = useEditor();
  const q = useQueryClient();
  const [search, setSearch] = useState("");
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["projects"],
    queryFn: () => api("projects"),
  });
  async function create(template: string) {
    if (!(await save())) return;
    const p = await api("projects", {
      method: "POST",
      body: JSON.stringify({
        name:
          template === "blank"
            ? "Untitled project"
            : (templates.find((t) => t.id === template)?.name ?? "New project"),
        template,
      }),
    });
    s.load(p.scene, p.id, p.revision);
    localStorage.setItem("buildspace-project", p.id);
    q.invalidateQueries({ queryKey: ["projects"] });
    close();
  }
  return (
    <>
      <div className="project-create-grid">
        <button onClick={() => run(() => create("blank"))}>
          <FilePlus size={25} />
          <strong>Start from scratch</strong>
          <span>A blank canvas, all yours.</span>
          <Plus size={18} />
        </button>
        <button onClick={() => run(() => create("sample"))}>
          <Home size={25} />
          <strong>The Alder Apartment</strong>
          <span>Seven rooms. Endless possibilities.</span>
          <ArrowUpRight size={18} />
        </button>
        <label className="project-import">
          <Upload size={25} />
          <strong>Import a design</strong>
          <span>JSON · DXF · PNG / JPEG reference</span>
          <input
            type="file"
            accept=".json,.dxf,.png,.jpg,.jpeg"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file)
                run(async () => {
                  if (!(await save())) return;
                  if (/\.(png|jpe?g)$/i.test(file.name)) {
                    const reference = await imageReference(file);
                    s.commit((scene) => {
                      scene.floors
                        .find((f) => f.id === s.floorId)!
                        .references.push(reference);
                    });
                    s.set({
                      selected: [reference.id],
                      message:
                        "Reference added. Calibrate it in the inspector before tracing.",
                    });
                    close();
                    return;
                  }
                  let scene: Scene;
                  if (/\.dxf$/i.test(file.name)) {
                    const scale = Number(
                      prompt(
                        "Meters per DXF unit (millimeters = 0.001, meters = 1)",
                        "0.001",
                      ),
                    );
                    const result = importDxf(await file.text(), scale);
                    scene = result.scene;
                    if (result.unsupported.length)
                      s.set({
                        message: `Imported LINE/LWPOLYLINE. Unsupported entities: ${result.unsupported.join(", ")}`,
                      });
                  } else scene = await importScene(file);
                  const p = await api("projects", {
                    method: "POST",
                    body: JSON.stringify({ name: scene.name, scene }),
                  });
                  s.load(p.scene, p.id, p.revision);
                  close();
                });
            }}
          />
        </label>
      </div>
      <h3>Start with a little inspiration</h3>
      <div className="template-gallery">
        {templates
          .filter((t) => t.id !== "sample")
          .map((t) => (
            <button key={t.id} onClick={() => run(() => create(t.id))}>
              <img
                src={svgData(planSvg(templateScene(t.id).floors[0]))}
                alt=""
              />
              <strong>{t.name}</strong>
              <span>{t.description}</span>
            </button>
          ))}
      </div>
      <div className="projects-toolbar">
        <h3>
          Recent projects <span>{projects.length}</span>
        </h3>
        <div className="search-field">
          <Search size={14} />
          <input
            placeholder="Search projects"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="project-list">
        {projects
          .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
          .map((p) => (
            <div className="project-list-row" key={p.id}>
              <div className="project-icon">
                <Home size={23} />
              </div>
              <button
                className="project-open"
                onClick={() =>
                  run(async () => {
                    if (!(await save())) return;
                    const project = await api(`projects/${p.id}`);
                    s.load(
                      project.scene,
                      project.id,
                      project.revision,
                      project.readOnly,
                    );
                    localStorage.setItem("buildspace-project", p.id);
                    close();
                  })
                }
              >
                <strong>
                  {p.name}
                  {p.id === s.projectId && <span>OPEN</span>}
                </strong>
                <small>
                  Edited {new Date(p.updatedAt).toLocaleString()} · Revision{" "}
                  {p.revision}
                </small>
              </button>
              <button
                title="Favorite project"
                onClick={() =>
                  run(async () => {
                    await api(`projects/${p.id}`, {
                      method: "PATCH",
                      body: JSON.stringify({ favorite: !p.favorite }),
                    });
                    q.invalidateQueries({ queryKey: ["projects"] });
                  })
                }
              >
                <Star size={16} fill={p.favorite ? "#d8b66d" : "none"} />
              </button>
              <button
                title="Duplicate project"
                onClick={() =>
                  run(async () => {
                    const original = await api(`projects/${p.id}`);
                    await api("projects", {
                      method: "POST",
                      body: JSON.stringify({
                        name: `${p.name} copy`,
                        scene: original.scene,
                      }),
                    });
                    q.invalidateQueries({ queryKey: ["projects"] });
                  })
                }
              >
                <Copy size={16} />
              </button>
              <button
                disabled={p.id === s.projectId}
                title="Delete project"
                onClick={() => {
                  if (confirm(`Permanently delete ${p.name} and its versions?`))
                    run(async () => {
                      await api(`projects/${p.id}`, { method: "DELETE" });
                      q.invalidateQueries({ queryKey: ["projects"] });
                    });
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
      </div>
    </>
  );
}
function Estimate() {
  const s = useEditor();
  const [category, setCategory] = useState("All");
  const lines = estimate(s.scene);
  const money = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: s.scene.currency,
    }).format(n);
  return (
    <>
      <div className="estimate-banner">
        <div>
          <span>YOUR ESTIMATED INVESTMENT</span>
          <strong>{money(totalCost(s.scene))}</strong>
        </div>
        <p>
          Based on catalog demo prices and measured material quantities.
          <br />
          Labor, tax, and delivery are excluded.
        </p>
      </div>
      <div className="estimate-controls">
        <button
          className="button"
          onClick={() => void exportEstimatePdf(s.scene)}
        >
          <Download size={14} />
          PDF summary
        </button>
        <div className="category-chips">
          {["All", "Furniture", "Flooring", "Finishes"].map((c) => (
            <button
              key={c}
              className={category === c ? "active" : ""}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <button
          className="button"
          onClick={() => exportPlan("csv", s.scene, activeFloor())}
        >
          <Download size={14} />
          Export CSV
        </button>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Item / material</th>
              <th>Qty.</th>
              <th>Unit price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {lines
              .filter((l) => category === "All" || l.category === category)
              .map((l) => (
                <tr key={l.id}>
                  <td>
                    <strong>{l.name}</strong>
                    <small>
                      {l.category} · {l.floor}
                    </small>
                  </td>
                  <td>
                    {l.quantity.toFixed(l.unit === "ea" ? 0 : 2)} {l.unit}
                  </td>
                  <td>{money(l.rate)}</td>
                  <td>{money(l.total)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <p className="tiny-note">
        Wall finish is calculated per room-facing surface. Openings are not
        deducted in this initial estimator. Edit furniture prices in the
        inspector.
      </p>
    </>
  );
}
function Versions({
  run,
  save,
  close,
}: {
  run: (f: () => Promise<void>) => void;
  save: () => Promise<boolean>;
  close: () => void;
}) {
  const s = useEditor();
  const [title, setTitle] = useState("");
  const q = useQueryClient();
  const { data: versions = [] } = useQuery<any[]>({
    queryKey: ["versions", s.projectId],
    queryFn: () => api(`projects/${s.projectId}/versions`),
  });
  return (
    <>
      <form
        className="version-create"
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            if (!(await save()))
              throw new Error(
                "Save your project successfully before creating a version",
              );
            await api(`projects/${s.projectId}/versions`, {
              method: "POST",
              body: JSON.stringify({
                name: title || `Design ${versions.length + 1}`,
              }),
            });
            setTitle("");
            q.invalidateQueries({ queryKey: ["versions"] });
          });
        }}
      >
        <input
          placeholder="Name this design direction…"
          aria-label="Version name"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button className="button primary" type="submit">
          <Plus size={15} />
          Save version
        </button>
      </form>
      {versions.length === 0 && (
        <div className="empty">
          <History size={30} />
          <h3>Your design story starts here.</h3>
          <p>Save a named version before exploring a new direction.</p>
        </div>
      )}
      {versions.map((v) => (
        <div className="version-row" key={v.id}>
          <img
            src={svgData(planSvg(v.scene.floors[0]))}
            alt="Version plan preview"
          />
          <div>
            <strong>{v.name}</strong>
            <small>
              {new Date(v.createdAt).toLocaleString()} · Revision {v.revision}
            </small>
            <span>
              {v.scene.floors.length} floors ·{" "}
              {v.scene.floors.reduce(
                (n: number, f: any) => n + f.rooms.length,
                0,
              )}{" "}
              rooms
            </span>
          </div>
          <button
            className="button"
            onClick={() => {
              if (
                confirm(
                  "Restore this version as a new edit? Current changes remain available in undo history.",
                )
              ) {
                s.commit((scene) =>
                  Object.assign(scene, SceneSchema.parse(v.scene)),
                );
                close();
              }
            }}
          >
            Restore
          </button>
        </div>
      ))}
    </>
  );
}
function Share({ run }: { run: (f: () => Promise<void>) => void }) {
  const s = useEditor(),
    q = useQueryClient();
  const [email, setEmail] = useState(""),
    [role, setRole] = useState("viewer");
  const { data } = useQuery<any>({
    queryKey: ["share", s.projectId],
    queryFn: () => api(`projects/${s.projectId}/share`),
  });
  return (
    <>
      <div className="privacy-note">
        <Shield size={24} />
        <div>
          <strong>Private by default</strong>
          <p>Invite existing accounts or create a revocable, read-only link.</p>
        </div>
      </div>
      <form
        className="share-invite"
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            await api(`projects/${s.projectId}/share`, {
              method: "POST",
              body: JSON.stringify({ email, role }),
            });
            setEmail("");
            q.invalidateQueries({ queryKey: ["share"] });
          });
        }}
      >
        <input
          aria-label="Invite email"
          type="email"
          placeholder="designer@example.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="viewer">Can view</option>
          <option value="editor">Can edit</option>
        </select>
        <button className="button primary" type="submit">
          Invite
        </button>
      </form>
      {data?.members.map((m: any) => (
        <div className="share-row" key={m.id}>
          <Mail size={16} />
          <strong>{m.user.email}</strong>
          <span>{m.role}</span>
          <button
            title="Revoke membership"
            onClick={() =>
              run(async () => {
                await api(`projects/${s.projectId}/share`, {
                  method: "DELETE",
                  body: JSON.stringify({ id: m.id, kind: "member" }),
                });
                q.invalidateQueries({ queryKey: ["share"] });
              })
            }
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}
      <h3>View-only links</h3>
      <button
        className="add-outline"
        onClick={() =>
          run(async () => {
            await api(`projects/${s.projectId}/share`, {
              method: "POST",
              body: "{}",
            });
            q.invalidateQueries({ queryKey: ["share"] });
          })
        }
      >
        <Plus size={15} />
        Create a share link
      </button>
      {data?.links.map((l: any) => (
        <div className="share-row" key={l.id}>
          <Link size={16} />
          <input
            readOnly
            aria-label="Share URL"
            value={`${window.location.origin}/?share=${l.token}`}
          />
          <button
            title="Copy link"
            onClick={() =>
              run(async () => {
                await navigator.clipboard.writeText(
                  `${window.location.origin}/?share=${l.token}`,
                );
                s.set({ message: "Share link copied" });
              })
            }
          >
            <Copy size={15} />
          </button>
          <button
            title="Revoke link"
            onClick={() =>
              run(async () => {
                await api(`projects/${s.projectId}/share`, {
                  method: "DELETE",
                  body: JSON.stringify({ id: l.id, kind: "link" }),
                });
                q.invalidateQueries({ queryKey: ["share"] });
              })
            }
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}
      <p className="tiny-note">
        Editors save with optimistic revision checks. A stale save is rejected,
        preserving the pending draft. Live presence and accepted revisions
        synchronize over authorized WebSockets. Concurrent unsaved edits are
        rejected safely; field-level operation merging is not yet implemented.
      </p>
    </>
  );
}
function Exports({ run }: { run: (f: () => Promise<void>) => void }) {
  const s = useEditor();
  const [labels, setLabels] = useState(true),
    [grid, setGrid] = useState(false);
  return (
    <>
      <div className="export-preview">
        <img
          alt="Export floor plan preview"
          src={svgData(planSvg(activeFloor()))}
        />
        <div>
          <strong>{s.scene.name}</strong>
          <span>
            {activeFloor().name} · {activeFloor().rooms.length} rooms
          </span>
          <label>
            <input
              type="checkbox"
              checked={labels}
              onChange={(e) => setLabels(e.target.checked)}
            />
            Room labels
          </label>
          <label>
            <input
              type="checkbox"
              checked={grid}
              onChange={(e) => setGrid(e.target.checked)}
            />
            Background
          </label>
        </div>
      </div>
      <div className="export-grid">
        {[
          ["svg", "Vector plan", "SVG · scalable"],
          ["png", "High resolution image", "PNG · 2× resolution"],
          ["pdf", "Print-ready plan", "PDF · A3 · scale to fit"],
          ["json", "Editable project", "BuildSpace JSON"],
          ["csv", "Itemized estimate", "CSV · demo prices"],
          ["glb", "3D model", "GLB · open 3D view first"],
          ["3dpng", "3D screenshot", "PNG · open 3D view first"],
        ].map(([type, title, desc]) => (
          <button
            key={type}
            onClick={() =>
              run(async () => {
                if (type === "glb" || type === "3dpng") {
                  if (s.view !== "3D")
                    throw new Error(
                      "Switch to 3D and wait for the scene to render, then export again",
                    );
                  window.dispatchEvent(
                    new CustomEvent("buildspace-export-3d", {
                      detail: type === "glb" ? "glb" : "png",
                    }),
                  );
                  return;
                }
                await exportPlan(type, s.scene, activeFloor(), {
                  grid,
                  labels,
                  measurements: true,
                });
              })
            }
          >
            <Download size={19} />
            <strong>{title}</strong>
            <span>{desc}</span>
          </button>
        ))}
      </div>
    </>
  );
}
function Settings() {
  const s = useEditor();
  const f = activeFloor();
  return (
    <>
      <label className="field-label">
        PROJECT NAME
        <input
          defaultValue={s.scene.name}
          onBlur={(e) =>
            s.commit((scene) => {
              scene.name = e.target.value || "Untitled project";
            })
          }
        />
      </label>
      <div className="settings-grid">
        <label className="field-label">
          DISPLAY UNITS
          <select
            value={s.scene.unit}
            onChange={(e) =>
              s.commit((scene) => {
                scene.unit = e.target.value as Scene["unit"];
              })
            }
          >
            {["m", "cm", "mm", "ft", "in"].map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </label>
        <label className="field-label">
          CURRENCY
          <select
            value={s.scene.currency}
            onChange={(e) =>
              s.commit((scene) => {
                scene.currency = e.target.value as Scene["currency"];
              })
            }
          >
            {["USD", "EUR", "GBP", "JOD"].map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </label>
      </div>
      <h3>Floors</h3>
      {s.scene.floors.map((floor, i) => (
        <div className="floor-setting-row" key={floor.id}>
          <button
            className={floor.id === f.id ? "active" : ""}
            onClick={() => s.set({ floorId: floor.id, selected: [] })}
          >
            {floor.name}
            <small>Elevation {floor.elevation} m</small>
          </button>
          <button
            className="button"
            onClick={() =>
              s.commit((scene) => {
                const copy = structuredClone(floor);
                copy.id = uid();
                const wallIds = new Map(copy.walls.map((w) => [w.id, uid()]));
                copy.rooms.forEach((r) => (r.id = uid()));
                copy.walls.forEach((w) => (w.id = wallIds.get(w.id)!));
                copy.openings.forEach((o) => {
                  o.id = uid();
                  o.wallId = wallIds.get(o.wallId)!;
                });
                copy.items=cloneItems(copy.items);
                copy.annotations.forEach((a) => (a.id = uid()));
                copy.references.forEach((r) => (r.id = uid()));
                copy.name = `${floor.name} copy`;
                copy.elevation = Math.max(
                  ...scene.floors.map((f) => f.elevation + f.height),
                );
                scene.floors.push(copy);
              })
            }
          >
            Duplicate
          </button>
          <button
            title="Delete floor"
            disabled={s.scene.floors.length === 1}
            onClick={() => {
              if (confirm("Delete this floor and its contents?")) {
                s.commit((scene) => {
                  scene.floors = scene.floors.filter((f) => f.id !== floor.id);
                });
                s.set({ floorId: s.scene.floors[0].id, selected: [] });
              }
            }}
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}
      <button
        className="add-outline"
        onClick={() =>
          s.commit((scene) => {
            const floor = blankScene().floors[0];
            floor.name = `Floor ${scene.floors.length + 1}`;
            floor.elevation = Math.max(
              ...scene.floors.map((f) => f.elevation + f.height),
            );
            scene.floors.push(floor);
          })
        }
      >
        <Plus size={15} />
        Add floor
      </button>
      <p className="tiny-note">
        Floor heights and elevations can be edited in the inspector. Sun
        direction is an approximation based on a 24-hour circular path.
      </p>
    </>
  );
}
function Issues({ close }: { close: () => void }) {
  const s = useEditor();
  const issues = s.scene.floors.flatMap((f) =>
    analyze(f).map((i) => ({ ...i, floorId: f.id })),
  );
  return (
    <>
      <div className="privacy-note">
        <AlertTriangle size={23} />
        <div>
          <strong>{issues.length} spatial observations</strong>
          <p>
            Geometry checks are design assistance, not certified building-code
            compliance.
          </p>
        </div>
      </div>
      {issues.length === 0 ? (
        <div className="empty">
          <CheckCircle size={34} />
          <h3>A little breathing room.</h3>
          <p>
            No issues detected by the implemented room, opening and furniture
            checks.
          </p>
        </div>
      ) : (
        issues.map((i) => (
          <button
            className="issue-row"
            key={i.id}
            onClick={() => {
              s.set({
                floorId: i.floorId,
                collisions: true,
                selected: [i.entityId],
              });
              close();
            }}
          >
            <AlertTriangle size={16} />
            <span>{i.message}</span>
            <ArrowUpRight size={14} />
          </button>
        ))
      )}
    </>
  );
}
function Account({ run }: { run: (f: () => Promise<void>) => void }) {
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [name, setName] = useState("");
  const { data } = useQuery<any>({
    queryKey: ["me"],
    queryFn: () => api("auth/me"),
  });
  return (
    <>
      <p className="privacy-note">
        {data?.user
          ? `Current account: ${data.user.email}`
          : "Sign in to access your projects."}
      </p>
      <form
        className="account-form"
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            await api(`auth/${register ? "register" : "login"}`, {
              method: "POST",
              body: JSON.stringify({ email, password, name }),
            });
            localStorage.removeItem("buildspace-project");
            window.location.reload();
          });
        }}
      >
        {register && (
          <label className="field-label">
            YOUR NAME
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
        )}
        <label className="field-label">
          EMAIL
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="field-label">
          PASSWORD
          <input
            type="password"
            minLength={10}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button type="submit" className="button primary">
          {register ? "Create account" : "Sign in"}
        </button>
      </form>
      <button className="text-button" onClick={() => setRegister(!register)}>
        {register
          ? "Already have an account? Sign in"
          : "New to BuildSpace? Create an account"}
      </button>
      {data?.user && (
        <button
          className="delete-button"
          onClick={() =>
            run(async () => {
              await api("auth/logout", { method: "POST", body: "{}" });
              localStorage.removeItem("buildspace-project");
              window.location.reload();
            })
          }
        >
          Sign out
        </button>
      )}
      <p className="tiny-note">
        Registering from a local guest session keeps that session’s projects.
        Signing in to an existing account switches accounts; projects are not
        automatically transferred. Password reset delivery is not configured.
      </p>
    </>
  );
}
function Help() {
  return (
    <>
      <div className="shortcut-grid">
        {[
          ["V", "Select"],
          ["H / Space", "Pan the canvas"],
          ["R", "Draw a room"],
          ["W", "Draw a wall"],
          ["D", "Place a door"],
          ["N", "Place a window"],
          ["M", "Measure distance"],
          ["⌘ / Ctrl Z", "Undo"],
          ["⌘ / Ctrl Shift Z", "Redo"],
          ["⌘ / Ctrl D", "Duplicate"],
          ["⌘ / Ctrl C / V", "Copy / paste"],
          ["⌘ / Ctrl S", "Save project"],
          ["Delete", "Delete selection"],
          ["Esc", "Cancel drawing"],
          ["Shift + click", "Select multiple"],
          ["Scroll", "Zoom around pointer"],
        ].map(([key, description]) => (
          <div key={key}>
            <span>{description}</span>
            <kbd>{key}</kbd>
          </div>
        ))}
      </div>
      <p className="tiny-note">
        Room, wall and measure tools: click to start, click to finish. Polygon
        room: choose “Irregular room” in the tool menu, click corners and
        double-click to close. Drag from the furniture catalog to place an item.
        Use the inspector for exact dimensions.
      </p>
    </>
  );
}
