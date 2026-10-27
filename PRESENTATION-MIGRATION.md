# Compatible presentation extension

Scene format remains version 1. Existing IDs, dimensions, coordinates, transforms, floors and room materials are unchanged. There is no database table migration: scenes are stored as JSON.

Legacy scenes omit `item.finish` and `wall.finish`. The explicit read-time migration is `item.finish ?? 'original'` and `wall.finish ?? 'matte'` in inspector and renderers. Missing values retain the original color and surface; newly chosen values are serialized as optional validated enums. No destructive rewrite is performed on import or load. Existing `flipX` continues to store mirrored variants. View style and recent catalog IDs are user interface preferences, separate from project geometry. The compatibility test parses a legacy sample with no finish fields.

For explicit conversion of exported JSON snapshots, `migratePresentation` in packages/core/src/presentation.ts supplies a pure, idempotent migration adding the two default finish values. It preserves IDs, transforms and the source object. Run `pnpm exec tsx scripts/migrate-presentation.ts input.json output.json`; the CLI requires a distinct, nonexistent output file and leaves the input intact. Migration is optional because readers already support missing finish fields. No database reset or bulk rewrite is required.
