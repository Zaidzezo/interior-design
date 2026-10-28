import {it,expect} from 'vitest';
import {readFile} from 'node:fs/promises';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
import {catalog} from '../packages/core/src/catalog';
it('every catalog entry has a decodable compressed main/LOD model with normalized finite bounds',async()=>{
 await MeshoptDecoder.ready;const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
 const base='apps/web/public/assets/models',manifest=JSON.parse(await readFile(`${base}/manifest.json`,'utf8'));
 expect(Object.keys(manifest.models).sort()).toEqual(catalog.map(c=>c.id).sort());expect(new Set(Object.values(manifest.models).map((entry:any)=>entry.geometryHash)).size).toBe(catalog.length);
 for(const c of catalog){expect(manifest.models[c.id].dimensions).toEqual([c.width,c.height,c.depth]);let fullVertices=0;
  for(const suffix of ['', '.lod']){const doc=await io.read(`${base}/${c.id}${suffix}.glb`),root=doc.getRoot();expect(root.listExtensionsRequired().map(e=>e.extensionName)).toContain('EXT_meshopt_compression');const box={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};root.listScenes()[0].traverse(node=>{const m=node.getWorldMatrix();for(const primitive of node.getMesh()?.listPrimitives()??[]){const a=primitive.getAttribute('POSITION')!;for(let n=0;n<a.getCount();n++){const p=a.getElement(n,[]);for(let k=0;k<3;k++){const value=m[k]*p[0]+m[k+4]*p[1]+m[k+8]*p[2]+m[k+12];box.min[k]=Math.min(box.min[k],value);box.max[k]=Math.max(box.max[k],value);}}}});const extent=box.min.map((a,i)=>box.max[i]-a);for(const dimension of extent){expect(Number.isFinite(dimension),c.id).toBe(true);expect(dimension,c.id).toBeCloseTo(1,1);}expect(box.min[1],c.id).toBeCloseTo(0,2);const vertices=root.listMeshes().flatMap(m=>m.listPrimitives()).reduce((total,p)=>total+(p.getAttribute('POSITION')?.getCount()??0),0);expect(vertices,c.id).toBeGreaterThan(10);if(!suffix)fullVertices=vertices;else expect(vertices,c.id).toBeLessThanOrEqual(fullVertices);}
  const thumb=await readFile(`apps/web/public/assets/thumbnails/${c.id}.webp`);expect(thumb.subarray(0,4).toString()).toBe('RIFF');expect(thumb.length,c.id).toBeGreaterThan(400);
 }
},30000);
