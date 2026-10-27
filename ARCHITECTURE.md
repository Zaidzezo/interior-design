# Architecture

## Workspace and domain

- `apps/web`: Next App Router, React 19, strict TypeScript, Tailwind entry plus original studio CSS, Lucide, Konva, R3F/Drei/Three, Zustand and TanStack Query.
- `packages/core/src/model.ts`: Zod format-1 scenes in meters, finite/bounded numeric fields, globally unique entity IDs and valid opening references. Floors own polygon rooms, physical wall segments, hosted openings, furniture/fixtures/stairs/lights, tracing layers and annotations. Material references and per-item color/price are persisted. Saved cameras and scene units/currency are project data.
- `geometry.ts`, `architecture.ts`: pure area/perimeter, containment, intersections, polygon validity, world/screen transforms, pointer zoom, SAT with a sweep/AABB broad phase, wall segmentation/deduplication, splitting and adjacent room union. `catalog.ts` owns item configurations and demo prices; `estimate.ts` owns derived quantities. Rendering does not define financial or geometric truth.
- `sample.ts`, `templates.ts`: actual edit-ready scenes. `vector.ts`: original detailed SVG furniture, textures and scalable plan exports. 3D reconstructs floors, segmented wall cutouts, glass, door leaves and furnishings at the same world dimensions.

Rectangular and polygonal room drawing is supported. This is not yet a complete CAD topology solver: free walls do not automatically form closed rooms, room wall edits have conservative opening constraints, and curved walls/robust polygon offsets are not implemented.

## Persistence and security

Next route handlers are the intentionally simpler equivalent to a second Fastify service: one origin, one authenticated API, one deployment. PostgreSQL/Prisma provides relational User, Session, Project, Version, Member and Share tables and a committed SQL migration.

Passwords use salted scrypt. Session tokens are 256 random bits; only SHA-256 token hashes are stored. Cookies are HTTP-only, SameSite Lax and Secure in production. Login/register use a local per-process rate limiter. Mutations check the Origin against Host. Zod validates request schemas; scene requests are capped at 5 MB. Local guest creation is gated by `ALLOW_LOCAL_GUEST`. Owner/editor/viewer authorization is checked server-side, including versions, estimates and analyses. Public links are long random revocable tokens and permit only GET scene access.

No arbitrary filesystem asset paths are accepted. Tracing images are bounded PNG/JPEG data URLs inside validated scenes. Full uploaded asset management and production threat hardening remain unfinished.

## API

- `GET /api/health`: actual PostgreSQL SELECT.
- `GET /api/auth/me`; `POST /api/auth/guest`, `register`, `login`, `logout`.
- `GET/POST /api/projects`; `GET/PATCH/DELETE /api/projects/:id`.
- `PUT /api/projects/:id/scene`: `{ revision, scene }`; atomically updates only where revision matches. Returns `{ revision }`. A stale writer gets 409 and retains its draft. Invalid polygon/opening/room-overlap geometry gets 422.
- `GET/POST /api/projects/:id/versions`: named immutable snapshots of the acknowledged stored scene. Restoring uses a normal new scene revision.
- `GET /api/projects/:id/estimate` and `/analysis`: authoritative shared computations.
- `GET/POST/DELETE /api/projects/:id/share`: owner-only members and links. Viewers cannot write or delete projects.
- `GET /api/public/:token`: read-only link payload; revoked/missing links return 404.
- `GET /api/catalog`: authenticated catalog and materials.

## Commands, autosave and collaboration

Zustand holds transient interaction plus semantic scene snapshots for 80 undo entries. Drag/transform ends commit one scene update. The canonical model is never stored in screen pixels. Debounced autosave serializes requests, tracks changes made during an in-flight save, and never displays Saved without acknowledgement. A local pending draft is retained before requests and at unload. Stored versions are independent of undo history.

The custom Node server handles same-origin WebSocket upgrades at `/collaboration`. Authentication and project access are checked at connection; scene broadcasts recheck permission and session existence. Periodic permission checks close revoked connections. Presence, cursors and accepted revisions are exchanged; clients reconnect and receive the current revision.

This is a **conservative revision protocol, not a CRDT**. Writes travel through the same validated CAS API. Clean clients apply accepted remote revisions. Clients with local changes preserve them and enter explicit conflict state rather than overwrite. Disjoint concurrent edits are not merged. Field-level operations, remote selections, cursor-floor filtering, persistent presence and multi-server pub/sub remain unfinished. The current WebSocket process is intended for a single local/self-hosted instance.

## Rendering and exports

Konva is client-only. SVG-backed furnishings share original vector geometry with thumbnails/plan exports. Transform scales are baked into width/depth and reset. Floors have procedural material fills. Three uses the same physical dimensions, elevation, rotation, floor finishes and lights. Wall sections below/above openings produce actual geometry gaps. Furniture models are simplified procedural shapes rather than photoreal assets.

SVG/PNG/PDF exports frame the floor content, not editor panels. PDF is A3 and scale-to-fit, not certified architectural scale. CSV and estimate PDF use actual bill quantities and demo rates. GLB exports the current rendered Three scene and is decoded with GLTFLoader before download; helper exclusion and standalone export-scene construction still need refinement.
