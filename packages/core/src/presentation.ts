import {Scene,SceneSchema} from './model';
/** Optional idempotent migration for legacy format-1 scene snapshots. No identity changes. */
export function migratePresentation(input:Scene):Scene{
 const scene=SceneSchema.parse(structuredClone(input));
 for(const floor of scene.floors){
  for(const item of floor.items)item.finish??='original';
  for(const wall of floor.walls)wall.finish??='matte';
 }
 return scene;
}
