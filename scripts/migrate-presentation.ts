import {readFile,writeFile} from 'node:fs/promises';
import {migratePresentation} from '../packages/core/src/presentation';
const input=process.argv[2],output=process.argv[3];
if(!input||!output||input===output)throw new Error('Usage: pnpm exec tsx scripts/migrate-presentation.ts input.json output.json (distinct paths; output must not exist)');
const scene=migratePresentation(JSON.parse(await readFile(input,'utf8')));
await writeFile(output,JSON.stringify(scene,null,2),{flag:'wx'});
console.log('Wrote compatible format-1 presentation snapshot. Original retained.');
