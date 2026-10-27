"use client";
import dynamic from "next/dynamic";
import { useState, useEffect, useRef, useCallback } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  MousePointer2,
  Hand,
  Square,
  PenTool,
  DoorOpen,
  PanelTop,
  Armchair,
  Ruler,
  Type,
  Trash2,
  Undo2,
  Redo2,
  ChevronDown,
  ChevronLeft,
  Plus,
  Minus,
  Maximize,
  Grid2X2,
  Magnet,
  Layers3,
  Box,
  Share2,
  Download,
  Save,
  FolderOpen,
  Settings2,
  Ellipsis,
  MoveUpRight,
  LayoutGrid,
  Check,
  Cloud,
  LoaderCircle,
  AlertCircle,
  ArrowUpRight,
  TriangleAlert,
  HelpCircle,
  X,
  Sun,
  Scan,
  Command,
} from "lucide-react";
import { useSession, sessionQuery, accountInitials } from "@/lib/session";
import Sidebar from "./Sidebar";
import Inspector from "./Inspector";
import Dialogs, { DialogName } from "./Dialogs";
import { useEditor, activeFloor, Tool } from "@/lib/store";
import { useCollaboration } from "@/lib/collaboration";
import { api, ApiError } from "@/lib/api";
import { area, analyze } from "@core/geometry";
import { totalCost } from "@core/estimate";
import { cloneItems } from "@core/commands";
import { Scene, Item, uid } from "@core/model";
const PlanCanvas = dynamic(() => import("./PlanCanvas"), {
  ssr: false,
  loading: () => (
    <div className="canvas-loading">
      <LoaderCircle className="spin" />
      Preparing your workspace…
    </div>
  ),
});
const Scene3D = dynamic(() => import("./Scene3D"), {
  ssr: false,
  loading: () => (
    <div className="canvas-loading">
      <LoaderCircle className="spin" />
      Building your 3D space…
    </div>
  ),
});
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});
export default function Editor() {
  return (
    <QueryClientProvider client={queryClient}>
      <Workspace />
    </QueryClientProvider>
  );
}
function Workspace() {
  const session = useSession();
  const s = useEditor();
  const [dialog, setDialog] = useState<DialogName>(null),
    [bootError, setBootError] = useState(""),
    [mobileLeft, setMobileLeft] = useState(false),
    [mobileRight, setMobileRight] = useState(false),
    [more, setMore] = useState(false),
    [presentation, setPresentation] = useState(false);
  const initialized = useRef(false),
    inflight = useRef<Promise<boolean> | null>(null),
    clipboard = useRef<Item[]>([]);
  const f = activeFloor();
  const collaboration = useCollaboration();
  const save = useCallback(async (): Promise<boolean> => {
    if (inflight.current) return inflight.current;
    const state = useEditor.getState();
    if (state.readOnly || state.status === "saved" || !state.projectId)
      return true;
    const { scene, projectId, revision, dirty } = state;
    const pending = async () => {
      state.set({ status: "saving" });
      localStorage.setItem(
        `buildspace-draft-${projectId}`,
        JSON.stringify({ scene, revision }),
      );
      try {
        const result = await api<{ revision: number }>(
          `projects/${projectId}/scene`,
          { method: "PUT", body: JSON.stringify({ scene, revision }) },
        );
        const now = useEditor.getState();
        if (now.projectId === projectId) {
          const unchanged = now.dirty === dirty;
          now.set({
            revision: result.revision,
            status: unchanged ? "saved" : "unsaved",
          });
          if (unchanged)
            localStorage.removeItem(`buildspace-draft-${projectId}`);
        }
        return true;
      } catch (e) {
        useEditor.getState().set({
          status:
            e instanceof ApiError && e.status === 409 ? "conflict" : "error",
          message:
            e instanceof Error
              ? e.message
              : "Save failed. Your local draft is retained.",
        });
        return false;
      } finally {
        inflight.current = null;
      }
    };
    inflight.current = pending();
    return inflight.current;
  }, []);
  const boot = useCallback(async () => {
    setBootError("");
    try {
      const token = new URLSearchParams(window.location.search).get("share");
      if (token) {
        const p = await api(`public/${encodeURIComponent(token)}`);
        s.load(p.scene, p.id, p.revision, true);
        return;
      }
      let me = await queryClient.fetchQuery({ ...sessionQuery, staleTime: 0 });
      if (!me.user) {
        await api("auth/guest", { method: "POST", body: "{}" });
        me = await api("auth/me");
        queryClient.setQueryData(["me"], me);
      }
      const projects = await api<any[]>("projects");
      const last = localStorage.getItem("buildspace-project");
      let project;
      if (projects.length)
        project = await api(
          `projects/${projects.some((p) => p.id === last) ? last : projects[0].id}`,
        );
      else
        project = await api("projects", {
          method: "POST",
          body: JSON.stringify({
            name: "The Alder Apartment",
            template: "sample",
          }),
        });
      s.load(project.scene, project.id, project.revision, project.readOnly);
      localStorage.setItem("buildspace-project", project.id);
      const pending = localStorage.getItem(`buildspace-draft-${project.id}`);
      if (
        pending &&
        confirm("A locally retained draft is available. Recover it?")
      ) {
        const draft = JSON.parse(pending);
        s.commit((scene) => Object.assign(scene, draft.scene));
        if (draft.revision !== project.revision)
          s.set({
            status: "conflict",
            message:
              "Recovered draft is based on an older revision. Save a copy to preserve it.",
          });
      }
    } catch (e) {
      setBootError(e instanceof Error ? e.message : "Unable to load project");
    }
  }, []);
  useEffect(() => {
    const expired = () => {
      queryClient.setQueryData(["me"], { user: null });
      useEditor.getState().set({ readOnly: true });
      setDialog("account");
      setBootError(
        "Your session expired. Sign in to continue; unsaved edits are retained.",
      );
    };
    window.addEventListener("buildspace-session-expired", expired);
    return () =>
      window.removeEventListener("buildspace-session-expired", expired);
  }, []);
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      boot();
    }
  }, [boot]);
  useEffect(() => {
    if (s.dirty === 0 || s.status !== "unsaved" || s.readOnly) return;
    const t = setTimeout(() => void save(), 900);
    return () => clearTimeout(t);
  }, [s.dirty, s.status, save]);
  useEffect(() => {
    if (!s.message) return;
    const t = setTimeout(() => s.set({ message: "" }), 6500);
    return () => clearTimeout(t);
  }, [s.message]);
  useEffect(() => {
    function before(e: BeforeUnloadEvent) {
      const s = useEditor.getState();
      if (s.status !== "saved" && s.dirty) {
        localStorage.setItem(
          `buildspace-draft-${s.projectId}`,
          JSON.stringify({ scene: s.scene, revision: s.revision }),
        );
        e.preventDefault();
      }
    }
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, []);
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (document.querySelector('[role="dialog"]')) return;
      const target = e.target as HTMLElement;
      if (target.matches("input,select,textarea") || target.isContentEditable)
        return;
      const st = useEditor.getState();
      if (e.metaKey || e.ctrlKey) {
        const k = e.key.toLowerCase();
        if (["z", "y", "s", "d", "c", "v", "x"].includes(k)) {
          e.preventDefault();
          if (k === "z") e.shiftKey ? st.redo() : st.undo();
          if (k === "y") st.redo();
          if (k === "s") void save();
          if (k === "d") st.duplicate();
          if (k === "c" || k === "x") {
            clipboard.current = structuredClone(
              activeFloor().items.filter((i) => st.selected.includes(i.id)),
            );
            if (k === "x") st.remove();
          }
          if (k === "v" && clipboard.current.length) {
            const ids: string[] = [];
            st.commit((scene) => {
              const floor = scene.floors.find((f) => f.id === st.floorId)!;
              const copies = cloneItems(clipboard.current, 0.5, 0.5);
              floor.items.push(...copies);
              ids.push(...copies.map((i) => i.id));
            });
            st.set({ selected: ids });
          }
        }
        return;
      }
      if (e.key.toLowerCase() === "r" && st.placing) {
        st.set({ placingRotation: (st.placingRotation + 15) % 360 });
        return;
      }
      if (
        e.key.startsWith("Arrow") &&
        ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)
      ) {
        e.preventDefault();
        const step = e.shiftKey ? 0.1 : 0.01;
        st.commit((scene) => {
          const f = scene.floors.find((f) => f.id === st.floorId)!;
          for (const i of f.items)
            if (st.selected.includes(i.id) && !i.locked) {
              i.x +=
                e.key === "ArrowRight"
                  ? step
                  : e.key === "ArrowLeft"
                    ? -step
                    : 0;
              i.y +=
                e.key === "ArrowDown" ? step : e.key === "ArrowUp" ? -step : 0;
            }
        });
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        st.remove();
      }
      const tools: Record<string, Tool> = {
        v: "select",
        h: "pan",
        r: "room",
        w: "wall",
        d: "door",
        n: "window",
        m: "measure",
        t: "note",
      };
      if (tools[e.key]) st.set({ tool: tools[e.key], placing: null });
      if (e.key === "?") setDialog("help");
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [save]);
  const roomCount = s.scene.floors.reduce((n, f) => n + f.rooms.length, 0),
    itemCount = s.scene.floors.reduce((n, f) => n + f.items.length, 0),
    totalArea = s.scene.floors.reduce(
      (n, f) => n + f.rooms.reduce((a, r) => a + area(r.points), 0),
      0,
    );
  const price = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: s.scene.currency,
    maximumFractionDigits: 0,
  }).format(totalCost(s.scene));
  const issues = analyze(f);
  const tools: [Tool, string, typeof MousePointer2, string][] = [
    ["select", "Select", MousePointer2, "V"],
    ["pan", "Pan", Hand, "H"],
    ["room", "Draw room", Square, "R"],
    ["wall", "Draw wall", PenTool, "W"],
    ["door", "Place door", DoorOpen, "D"],
    ["window", "Place window", PanelTop, "N"],
    ["measure", "Measure", Ruler, "M"],
    ["note", "Annotation", Type, "T"],
  ];
  async function saveCopy() {
    try {
      const p = await api("projects", {
        method: "POST",
        body: JSON.stringify({ name: `${s.scene.name} copy`, scene: s.scene }),
      });
      s.load(p.scene, p.id, p.revision);
      s.set({ message: "A separate project was saved with your changes" });
    } catch (e) {
      s.set({ message: String(e) });
    }
  }
  return (
    <main
      className={`editor ${presentation ? "presentation" : ""} ${mobileLeft ? "left-open" : ""} ${mobileRight ? "right-open" : ""}`}
    >
      <header className="topbar">
        <button
          className="brand"
          onClick={() => setDialog("projects")}
          title="Open project gallery"
        >
          <span className="brand-mark">
            <Box size={20} strokeWidth={1.6} />
          </span>
          <span>
            Build<span>Space</span>
            <sup>STUDIO</sup>
          </span>
        </button>
        <div className="project-heading">
          <button onClick={() => setDialog("projects")}>
            {s.scene.name}
            <ChevronDown size={13} />
          </button>
          <span className={`save-indicator ${s.status}`}>
            <span className="live-dot" />
            {s.readOnly
              ? "View-only shared project"
              : {
                  loading: "Opening project",
                  saved: "All changes saved",
                  saving: "Saving changes…",
                  unsaved: "Unsaved changes",
                  error: "Save failed · retry",
                  conflict: "Revision conflict",
                }[s.status]}
            {s.status === "error" && (
              <button onClick={() => void save()}>Retry</button>
            )}
          </span>
        </div>
        <div className="top-actions">
          <button
            className="top-icon"
            title="Open projects"
            onClick={() => setDialog("projects")}
          >
            <FolderOpen size={17} />
          </button>
          <button
            className="top-icon"
            title="Save (Ctrl+S)"
            onClick={() => void save()}
            disabled={s.readOnly}
          >
            <Save size={17} />
          </button>
          <span className="toolbar-divider" />
          <button
            className="top-icon"
            title="Undo"
            disabled={!s.past.length}
            onClick={s.undo}
          >
            <Undo2 size={17} />
          </button>
          <button
            className="top-icon"
            title="Redo"
            disabled={!s.future.length}
            onClick={s.redo}
          >
            <Redo2 size={17} />
          </button>
          <span className="toolbar-divider" />
          <button
            className="button estimate-top"
            onClick={() => setDialog("estimate")}
          >
            <span className="estimate-glyph">$</span>Estimate
          </button>
        </div>
        <div className="top-statistics">
          <div>
            <span>AREA</span>
            <strong>
              {totalArea.toFixed(1)} <small>m²</small>
            </strong>
          </div>
          <div>
            <span>ROOMS</span>
            <strong>{roomCount}</strong>
          </div>
          <div>
            <span>OBJECTS</span>
            <strong>{itemCount}</strong>
          </div>
        </div>
        <div className="sharing-actions">
          <button
            className="button share-button"
            onClick={() => setDialog("share")}
          >
            <Share2 size={15} />
            <span>Share</span>
          </button>
          <button
            className="button primary"
            onClick={() => setDialog("export")}
          >
            <Download size={15} />
            <span>Export</span>
            <ChevronDown size={13} />
          </button>
          <button
            className="user-avatar"
            title="Account"
            onClick={() => setDialog("account")}
          >
            {accountInitials(session.data?.user?.name)}
          </button>
        </div>
      </header>
      <div className="workspace">
        <div className="mobile-panel-toggle">
          <button onClick={() => setMobileLeft(!mobileLeft)}>
            <Layers3 size={16} />
            Library
          </button>
          <button onClick={() => setMobileRight(!mobileRight)}>
            <Settings2 size={16} />
            Inspector
          </button>
        </div>
        <Sidebar
          onHelp={() => setDialog("help")}
          onAccount={() => setDialog("account")}
        />
        <section className="canvas-pane">
          <div className="canvas-topbar">
            <div className="floor-control">
              <Layers3 size={15} />
              <select
                aria-label="Active floor"
                value={s.floorId}
                onChange={(e) =>
                  s.set({ floorId: e.target.value, selected: [] })
                }
              >
                {s.scene.floors.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
              <span className="floor-count">
                L{s.scene.floors.findIndex((f) => f.id === s.floorId)}
              </span>
            </div>
            <div className="canvas-options">
              {collaboration.peers.length > 0 && (
                <span
                  className="collaboration-peers"
                  title={collaboration.peers.map((p) => p.name).join(", ")}
                >
                  {collaboration.peers.length} online
                </span>
              )}
              <button
                className={s.snap ? "enabled" : ""}
                title="Toggle snap to 0.25 m grid"
                onClick={() => s.set({ snap: !s.snap })}
              >
                <Magnet size={14} />
                <span>Snap</span>
              </button>
              <button
                className={s.grid ? "enabled" : ""}
                title="Toggle grid"
                onClick={() => s.set({ grid: !s.grid })}
              >
                <Grid2X2 size={14} />
                <span>Grid</span>
              </button>
              <button
                className={s.measurements ? "enabled" : ""}
                title="Toggle dimensions"
                onClick={() => s.set({ measurements: !s.measurements })}
              >
                <Ruler size={14} />
              </button>
              <button
                className={s.collisions ? "enabled" : ""}
                title="Review spatial issues"
                onClick={() => {
                  s.set({ collisions: !s.collisions });
                  setDialog("issues");
                }}
              >
                <Scan size={14} />
              </button>
              <span className="toolbar-divider" />
              <button
                title="Studio settings"
                onClick={() => setDialog("settings")}
              >
                <Settings2 size={15} />
              </button>
            </div>
            <div className="view-toggle">
              <button
                className={s.view === "2D" ? "active" : ""}
                onClick={() => s.set({ view: "2D" })}
              >
                <Square size={13} />
                2D Plan
              </button>
              <button
                className={s.view === "3D" ? "active" : ""}
                onClick={() => s.set({ view: "3D" })}
              >
                <Box size={14} />
                3D View
              </button>
            </div>
          </div>
          <div className="canvas-body">
            {s.view === "2D" ? <PlanCanvas /> : <Scene3D />}
            {!presentation && (
              <div className="floating-tools">
                {tools.map(([id, label, Icon, key], i) => (
                  <button
                    key={id}
                    title={`${label} (${key})`}
                    aria-label={label}
                    className={s.tool === id && s.view === "2D" ? "active" : ""}
                    onClick={() => {
                      s.set({ tool: id, placing: null, view: "2D" });
                    }}
                  >
                    <Icon size={17} />
                  </button>
                ))}
                <span className="toolbar-divider" />
                <button
                  title="Furniture library"
                  onClick={() => s.set({ tab: "furniture" })}
                >
                  <Armchair size={17} />
                </button>
                <button
                  title="Delete selection"
                  disabled={!s.selected.length}
                  onClick={s.remove}
                >
                  <Trash2 size={16} />
                </button>
                <span className="toolbar-divider" />
                <button
                  title="More drawing tools"
                  onClick={() => setMore(!more)}
                >
                  <Ellipsis size={18} />
                </button>
                {more && (
                  <div className="tools-menu">
                    <button
                      onClick={() => {
                        s.set({ tool: "polygon", view: "2D" });
                        setMore(false);
                      }}
                    >
                      Irregular room
                      <PenTool size={14} />
                    </button>
                    <button
                      onClick={() => {
                        setDialog("versions");
                        setMore(false);
                      }}
                    >
                      Version history
                      <HistoryIcon />
                    </button>
                    <button
                      onClick={() => {
                        setPresentation(true);
                        setMore(false);
                      }}
                    >
                      Presentation mode
                      <Maximize size={14} />
                    </button>
                    <button
                      onClick={() => {
                        setDialog("help");
                        setMore(false);
                      }}
                    >
                      Keyboard shortcuts
                      <Command size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}
            <div className="plan-label">
              <span className="live-dot" />{" "}
              {s.view === "2D" ? "FLOOR PLAN" : "PERSPECTIVE VIEW"}
              <span> / </span>
              {f.name}
            </div>
            <div className="canvas-legend">
              <span>
                <i style={{ background: "#34435a" }} />
                Architecture
              </span>
              <span>
                <i style={{ background: "#7b6be7" }} />
                Selected
              </span>
              <span>
                <i style={{ background: "#58a99a" }} />
                Door
              </span>
              <span>
                <i style={{ background: "#79a8cd" }} />
                Window
              </span>
            </div>
            <div className="zoom-controls">
              <button
                title="Zoom in"
                onClick={() => s.set({ zoom: Math.min(180, s.zoom * 1.2) })}
              >
                <Plus size={18} />
              </button>
              <span>
                {Math.round((s.zoom / 50) * 100)}
                <small>%</small>
              </span>
              <button
                title="Zoom out"
                onClick={() => s.set({ zoom: Math.max(12, s.zoom / 1.2) })}
              >
                <Minus size={18} />
              </button>
              <div />
              <button
                title="Fit floor plan"
                onClick={() => s.set({ fitTick: s.fitTick + 1 })}
              >
                <Maximize size={16} />
              </button>
            </div>
            {s.view === "2D" && (
              <button
                className="view3d-callout"
                onClick={() => s.set({ view: "3D" })}
              >
                <Box size={17} />
                Step inside your design
                <ArrowUpRight size={15} />
              </button>
            )}
            {presentation && (
              <button
                className="exit-presentation button"
                onClick={() => setPresentation(false)}
              >
                <X size={14} />
                Exit presentation
              </button>
            )}
          </div>
          <footer className="canvas-footer">
            <span>
              <span className="live-dot" />
              {s.readOnly ? "Read-only presentation" : "Your ideas. To scale."}
            </span>
            <div>
              <button onClick={() => setDialog("issues")}>
                <span
                  className={`issue-dot ${issues.some((i) => i.severity === "error") ? "has-error" : ""}`}
                />
                {issues.length
                  ? `${issues.length} observations`
                  : "Geometry checked"}
              </button>
              <span className="footer-divider" />
              <span>Grid 0.25 m</span>
              <span className="footer-divider" />
              <button onClick={() => setDialog("settings")}>
                {s.scene.unit.toUpperCase()}
                <ChevronDown size={11} />
              </button>
            </div>
          </footer>
        </section>
        <Inspector onIssues={() => setDialog("issues")} />
      </div>
      {s.message && (
        <div className="toast" role="status">
          <InfoIcon />
          <span>{s.message}</span>
          <button
            title="Dismiss message"
            onClick={() => s.set({ message: "" })}
          >
            <X size={14} />
          </button>
        </div>
      )}
      {s.status === "conflict" && (
        <div className="conflict-banner">
          <TriangleAlert size={17} />A newer revision exists. Your edits are
          retained.<button onClick={saveCopy}>Save a copy</button>
          <button
            onClick={() => {
              if (confirm("Reload server version? A local draft is retained."))
                void boot();
            }}
          >
            Reload
          </button>
        </div>
      )}
      {bootError && (
        <div className="boot-error">
          <AlertCircle size={30} />
          <h2>Let’s reconnect your workspace.</h2>
          <p>{bootError}</p>
          <div>
            <button className="button primary" onClick={() => void boot()}>
              Retry connection
            </button>
            <button className="button" onClick={() => setDialog("account")}>
              Sign in
            </button>
          </div>
        </div>
      )}
      <Dialogs name={dialog} close={() => setDialog(null)} save={save} />
    </main>
  );
}
function HistoryIcon() {
  return <Undo2 size={14} />;
}
function InfoIcon() {
  return <AlertCircle size={17} />;
}
