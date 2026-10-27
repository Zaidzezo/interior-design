# Latest editor bug fixes

See [BUGFIXES.md](BUGFIXES.md) for the subsequent interaction, catalog, materials, wall and session fixes. The earlier implementation record below is historical. Source was subsequently committed and pushed to GitHub.

# BuildSpace — current state and exact resumption

Updated 2026-10-27. This is a substantial working implementation of the requested platform. **The complete first-product brief is not finished.** Do not describe the remaining requirements as out of scope or present the application as release-complete.

## Implemented and tested

- Next 15.5.28 / React 19.1.1, strict TypeScript, pnpm workspace; Konva 10 / react-konva 19; R3F 9 / Three 0.180; Prisma **7.10.1** with pg adapter, PostgreSQL 17. Peer compatibility and Node requirements were checked before use. Prisma 6 artifact access failed; Prisma 7 client generation and real migration both succeeded without verification bypass.
- Original light three-pane editor, floating precision tools, independent library/inspector scrolling, responsive phone drawers. Attached references were visually inspected. The specifically requested `references/editor-reference.png` was not available; do not claim a pixel comparison with it.
- Canonical validated meter scene, globally unique entity IDs, real polygon areas, wall deduplication, hosted openings, floors, materials, furniture, annotations, images and cameras.
- Initial 132.0 m² apartment: **seven rooms, 43 furnishings, zero detected default issues**. Eight populated templates plus blank. **100 catalog configurations** using original SVG illustrations and procedural model families.
- Room click/click and drag creation, polygon drawing, standalone walls, exact room/object inspector values, furniture placement/drag/resize/rotation, snapped grid, measurements, copy/paste/duplicate, lock/hide/mirror/z-order/group identity and movement, command undo/redo. Unit tests cover group-copy identity isolation and new IDs across copied floors.
- Room split/adjacent union and wall midpoint splitting are unit tested. Wall panels have unit tests proving actual door/window voids and lintels, rather than decorative symbols on intact walls.
- Genuine synchronized 3D, cutaway/full wall geometry, simplified furnishings, textured floors, lights, orbit/walkthrough, translate/rotate controls and saved cameras. Browser rendering and GLB generation/reloading are verified; not every gizmo/camera gesture is tested.
- PostgreSQL-backed project CRUD, secure session authentication, guest registration/account login, acknowledged autosave, retained local pending drafts, optimistic concurrency, immutable versions, owner/viewer/editor roles and revocable share links. API tests use real PostgreSQL and verify a write race returns one 200 and one 409.
- Authorized WebSocket accepted-revision propagation and presence verified with two browser sessions. Cursor transport/rendering is implemented; advanced merging and remote selections remain unfinished.
- Actual scene-derived estimates; exact 100+100+50=250 calculation verified client/server; CSV and PDF summary.
- Real JSON/SVG/PNG/PDF/GLB exports verified, including GLTFLoader decode before GLB download. JSON import and image scale persistence after reload verified. DXF LINE/LWPOLYLINE parsing has a unit test. Image two-point calibration is implemented but not browser-gesture tested.
- A reload bug after importing was found and fixed by remembering the project centrally in `load()`. Placement event interception and copied-group identity linkage were also corrected.

## Final verification evidence

- `./scripts/setup.sh`: passed; frozen install, Compose health, Prisma generation, migration idempotence, type/unit checks.
- `pnpm typecheck`: passed, including the custom `.mts` server.
- `pnpm test`: **21 passed, 0 failed** across four files.
- `pnpm test:e2e`: **7 passed, 0 skipped, 0 failed**, real Chromium/API/PostgreSQL/software WebGL. Full report retained at `artifacts/e2e-full-results.json`.
- After the grouped-copy fix, targeted `pnpm exec playwright test tests/e2e/editor.spec.ts -g 'editor save/reload'`: **1 passed**. Latest targeted report is `artifacts/e2e-results.json`.
- `pnpm build`: final production build passed; first-load page bundle approximately 167 kB as reported by Next (3D is loaded separately).
- `PORT=3001 pnpm start` and `pnpm exec tsx scripts/production-smoke.ts`: passed actual database health, initial seven-room editor, edit/save/reload, zero browser page errors. Evidence at `artifacts/production-smoke.json` and `artifacts/editor-production.png`.
- Screenshots captured at 1600×900, 1440×900, 1280×800, 390×844, and 3D. Visually reviewed layout against the attached references; increased typography and phone plan fit after review. No exact reference-file or pixel-diff claim.
- Geometry benchmark: actual timings in `artifacts/geometry-benchmark.json`; 20 runs per sample/1,000 separated items. This measures Node geometry analysis, not browser FPS.

The initial production build ran while the first dev output directory was still shared and invalidated a manifest. The custom dev server was restarted, output directories separated, and full regression plus production build/runtime passed afterward. Do not carry that diagnosed failure forward as an unresolved app defect.

## Capability acceptance checklist

| Brief gate | Evidence/status |
|---|---|
| 1. 4×3→12, width 5→15 independent of zoom | Unit and browser verified |
| 2. Irregular/shared boundaries/split topology | Pure tests pass; complete GUI/topology acceptance partial |
| 3. Hosted openings and real 3D gaps | Validation and wall-panel tests pass; all styles/gestures partial |
| 4. Catalog move/rotate/resize and persistence | Browser placement/exact resize/rotation/reload pass; exhaustive repeated-transform test pending |
| 5. Synchronized 2D/3D both directions | Shared scene and rendering implemented; direct 3D gizmo gesture/reload acceptance not fully tested |
| 6. Materials/lights, genuine rendering and history | Implemented subset; complete end-to-end combinations not verified |
| 7. Overlap/outside/rug exception | Unit verified; clearance/door-swing engine incomplete |
| 8. Lock/group/hide/align/copy/history | Browser lock/duplicate/undo/redo and group-copy unit test; comprehensive multi-object workflow partial |
| 9. 250 estimate / deletion / server parity | Unit and real API verified |
| 10. Immutable versions and restore | API immutable storage and browser creation verified; full restore workflow pending |
| 11. Concurrent revision protection | Real API race verified |
| 12. Authentication and permission revocation | Real API verified |
| 13. Two live clients | Browser accepted-revision synchronization verified; field-level concurrent merge missing |
| 14. Import/export actual files | Browser JSON round trip, image width persistence, SVG/PNG/PDF/GLB files verified; PDF/3D asset import missing |
| 15. Editable populated sample / blank / reload | Browser verified |
| 16. Full browser work path | Placement/edit/save/reload/3D/export and separate room creation paths pass; all interactions not covered |
| 17. Reference visuals | Three desktop screenshots captured/reviewed; named local principal reference absent |
| 18. Responsive/touch/focus | Overflow, panes, drawers and keyboard commands checked; complete touch/accessibility matrix incomplete |

## Runtime and reusable environment

Current checkout: `/workspace/interior-design`, initial Git repository remains unborn on branch `work`; no commits or pushes were made. All source files are new. Existing user code was not overwritten.

The development server runs on loopback port 3000; production validation instance runs on 3001. These are processes in this machine, not retained startup state. PostgreSQL now runs under `docker compose -p buildspace` in volume `buildspace_buildspace-db`. The original manually started PostgreSQL container is stopped and its volume retained as a backup. A checked SQL dump is outside the checkout at `/workspace/.buildspace/onboarding-db.sql`.

Environment draft fields saved successfully: `install_script`, `start_skill`, and the additional required domain `binaries.prisma.sh` (package-manager presets preserved). Draft saving is confirmed. Publication and fresh-task restoration are **not** performed or verified; the user must review/save in environment settings and publish to activate a reusable snapshot.

## Exact next work

Read LIMITATIONS.md for the complete unresolved requirements; they remain part of the requested product. Resume by checking runtime and existing changes, not scaffolding a second app:

```bash
cd /workspace/interior-design
export XDG_DATA_HOME=/workspace/.local/share
curl -fsS http://127.0.0.1:3000/api/health
pnpm typecheck
pnpm test
```

1. Prioritize robust architectural topology: vertex/half-edge identity, editable wall endpoints/junctions, collinear merge, room inference, correct shared-boundary movement, offsets/interior area, preserved openings, object/angle snapping. Extend the pure architecture tests before integrating handles. Preserve the existing conservative rejections.
2. Complete vertical architecture (stairwell/ceiling openings, ceilings, floor ordering/alignment), comprehensive multi-selection/group transforms and precision gestures. Current partial group movement must not be advertised as a full group transform system.
3. Extend the canonical schema for per-face materials, custom textures and independent light parameters; use both render adapters and undo/persistence. Implement bounded authenticated asset management and PDF reference/GLB furniture import.
4. Move collaboration to validated semantic operations with documented conflict classes. Preserve current CAS/no-data-loss behavior; add two-client dirty/conflict/reconnect/revocation tests before attempting merges.
5. Complete quantities/clearances/door swings, professional exports with configurable scale/page/floor/helper exclusion, gallery/version comparisons, account reset/profile delivery, touch/a11y and security hardening. Add the remaining acceptance-gate browser tests as each workflow becomes real.
6. Keep screenshots and test outcomes truthful. Run `./scripts/backup-db.sh` before publication to refresh the private database snapshot. Never delete volumes or reset user scenes to make tests pass.

Final import hardening: wall colors are constrained to hex, tracing URLs to base64 PNG/JPEG data, and SVG IDs are escaped. The additional validation unit test passed; the JSON import/reference persistence browser regression passed again after this change.
