# BuildSpace

A manual interior planning application, opening directly into a furnished seven-room apartment. The current implementation is a working foundation of the requested complete first product, **not a finished release**. See [PROGRESS.md](PROGRESS.md), [LIMITATIONS.md](LIMITATIONS.md), and [TESTING.md](TESTING.md) for verified and unfinished capabilities.

## Start locally

Requires Node.js 24, pnpm 11.25, Docker with Compose, and Chromium for the browser tests. All application/API/WebSocket traffic uses one Next.js server. PostgreSQL is the only separate service.

```bash
cd /workspace/interior-design
export XDG_DATA_HOME=/workspace/.local/share
./scripts/setup.sh
pnpm dev
```

Setup uses the frozen lockfile, starts PostgreSQL with Compose, generates the Prisma client, applies the committed migration, checks TypeScript, and runs unit tests. The server binds to **127.0.0.1:3000**. Check `GET /api/health` for actual database readiness. This onboarding UI does not provide local web previews; use internal browser requests for validation.

For a checkout outside the cloud workspace, install with `pnpm install --frozen-lockfile`, copy `.env.example` to `.env`, link `apps/web/.env.local` to `../../.env`, run `docker compose -p buildspace up -d --wait`, then `pnpm db:generate && pnpm db:migrate && pnpm dev`. Use your usual writable pnpm store/cache paths.

Local development enables a separate anonymous **local guest session**, stored with an HTTP-only cookie and owning real database projects. Registering claims that guest's projects. Login switches accounts. Default database credentials are for loopback development only. Before self-hosting: disable `ALLOW_LOCAL_GUEST`, replace the development database password and matching `DATABASE_URL`, terminate TLS, supply abuse/rate controls suitable for your deployment, and keep PostgreSQL private. This app is not production-security-audited.

```bash
pnpm typecheck
pnpm test
pnpm test:e2e       # requires the running server and /usr/bin/chromium
pnpm build
pnpm start         # production build; stop another server on port 3000 first
```

`PORT=3001 pnpm start` runs another port. Production output is `.next-production`; development output is `.next`. Always restart the custom server after changing `server.mts` or Next configuration. The custom server is necessary for authorized WebSocket upgrades; plain `next dev` omits collaboration.

## Working with a design

- Rooms: choose a template tile, click twice or drag with the room tool, or draw an irregular polygon with the tool menu. Double-click closes the polygon. Numeric room dimensions update its polygon; edits that detach openings are rejected.
- Furnishing: drag a catalog tile onto the plan, or click it and click to place. R rotates the placement preview. Select objects to edit exact dimensions, height, position, rotation, color, and demo price. Transformer handles bake dimensions back into meter-based values.
- Editing: select/Shift-select, duplicate, rotate, mirror, lock, hide, group, align, z-order, copy/paste, undo/redo. A drag commits once. Room merging requires Shift-selecting adjacent rooms; rectangular split and midpoint wall split are available in the inspector.
- Openings: use the door/window tool near a wall. Host ID and offset persist. Numeric changes must fit within the wall. Single/double/sliding/pocket/bifold door symbols are supported; 3D models are approximate, with actual gaps in walls.
- Floors: add/duplicate/switch floors in Settings. Duplicating regenerates entity IDs. Set height and elevation in the floor inspector.
- 3D: orbit, zoom, cutaway/full walls, walkthrough (click scene, WASD, Esc releases pointer), translate/rotate gizmos, shared inspector, top view, and saved cameras. Edits use the same scene and history as 2D.
- Materials: select a room or object, then apply a material/color. Wood/tile floor textures render in 2D and 3D. Daylight direction, ambient intensity, and placed lamp illumination affect 3D.
- Projects: open the gallery from the logo/project title; create blank/sample/template, search, favorite, duplicate, delete, or import. Saves are acknowledged by PostgreSQL, with a retained local draft on errors. Conflicts offer Save a Copy.
- Versions: the floating tool menu opens immutable named snapshots; restoring makes a new undoable edit. Sharing supports registered viewer/editor accounts and revocable read-only links.
- Import/export: BuildSpace JSON round trip; PNG/JPEG tracing layers with known-distance calibration; ASCII DXF LINE/LWPOLYLINE import with explicit unit scale and unsupported-entity reporting. Export SVG, high-resolution PNG, A3 PDF plan, JSON, CSV, estimate PDF, GLB, and 3D PNG. Open 3D before 3D exports.

## Data and operations

`prisma/migrations/202610270001_init` is a real SQL migration. PostgreSQL data resides in the Compose volume `buildspace_buildspace-db`. `docker compose down` retains it; `down -v` deletes it. Do not delete volumes without a backup.

`./scripts/backup-db.sh` saves a private dump outside the checkout at `/workspace/.buildspace/onboarding-db.sql`. Setup can restore it into a newly empty database before migrations. The cloud snapshot must retain that file to restore existing accounts/projects when Docker volumes do not survive. Fresh-task snapshot restoration has not been verified. Live processes never count as retained state.

No paid services, AI tools, or proprietary artwork are used. Vector furniture and procedural 3D geometry are original. See [ARCHITECTURE.md](ARCHITECTURE.md) for scene/API/concurrency details. The canonical scene is format 1; import rejects unsupported format versions and invalid schemas.
