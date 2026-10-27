# Compatible presentation extension

Scene format remains version 1. Existing IDs, dimensions, coordinates, transforms, floors and room materials are unchanged. There is no database table migration: scenes are stored as JSON.

Legacy scenes omit `item.finish` and `wall.finish`. The explicit read-time migration is `item.finish ?? 'original'` and `wall.finish ?? 'matte'` in inspector and renderers. Missing values retain the original color and surface; newly chosen values are serialized as optional validated enums. No destructive rewrite is performed on import or load. Existing `flipX` continues to store mirrored variants. View style and recent catalog IDs are user interface preferences, separate from project geometry. The compatibility test parses a legacy sample with no finish fields.
