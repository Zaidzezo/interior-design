import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {GLTFExporter} from 'three/examples/jsm/exporters/GLTFExporter.js';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {cloneDocument,flatten,join,weld,dedup,prune,meshopt,simplify} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder,MeshoptSimplifier} from 'meshoptimizer';
import {catalog} from '../packages/core/src/catalog';
import {buildFurniture} from '../apps/web/src/lib/assets/model-factory';
class Reader{result:ArrayBuffer|string|null=null;onloadend:((e:unknown)=>void)|null=null;readAsArrayBuffer(b:Blob){b.arrayBuffer().then(a=>{this.result=a;this.onloadend?.({target:this});});}readAsDataURL(b:Blob){b.arrayBuffer().then(a=>{this.result=`data:${b.type};base64,${Buffer.from(a).toString('base64')}`;this.onloadend?.({target:this});});}}
(globalThis as any).FileReader=Reader;
await MeshoptEncoder.ready;await MeshoptDecoder.ready;await MeshoptSimplifier.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
function vertexBounds(scene:import('@gltf-transform/core').Scene){const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity],p:number[]=[];scene.traverse(node=>{const matrix=node.getWorldMatrix();for(const primitive of node.getMesh()?.listPrimitives()??[]){const positions=primitive.getAttribute('POSITION');if(!positions)continue;for(let n=0;n<positions.getCount();n++){positions.getElement(n,p);for(let axis=0;axis<3;axis++){const value=matrix[axis]*p[0]+matrix[4+axis]*p[1]+matrix[8+axis]*p[2]+matrix[12+axis];min[axis]=Math.min(min[axis],value);max[axis]=Math.max(max[axis],value);}}}});return{min,max};}
const dir=new URL('../apps/web/public/assets/models/',import.meta.url);await mkdir(dir,{recursive:true});
const report:Record<string,unknown>={},fingerprints=new Map<string,string[]>();let total=0;
for(const c of catalog){
 console.log(`Building ${c.id}: ${c.name}`);
 const scene=new THREE.Scene(),model=buildFurniture(c);scene.add(model);scene.updateMatrixWorld(true);
 const hash=createHash('sha256');let vertices=0;
 scene.traverse(o=>{if(o instanceof THREE.Mesh){const pos=o.geometry.getAttribute('position');vertices+=pos.count;const point=new THREE.Vector3();for(let i=0;i<pos.count;i++){point.fromBufferAttribute(pos,i).applyMatrix4(o.matrixWorld);hash.update(`${point.x.toFixed(5)},${point.y.toFixed(5)},${point.z.toFixed(5)};`);}}});
 const box=new THREE.Box3().setFromObject(model,true),modelExtent=box.getSize(new THREE.Vector3());if(![...modelExtent.toArray(),...box.min.toArray(),...box.max.toArray()].every(Number.isFinite)||Math.min(...modelExtent.toArray())<=0)throw new Error(`Invalid model bounds: ${c.id}`);
 const key=hash.digest('hex');fingerprints.set(key,[...(fingerprints.get(key)??[]),c.name]);
 // Bake each world matrix before merging. Flattening nonuniform root scales
 // with rotated leaves/cushions through TRS decomposition loses shear and
 // changes their dimensions, even though the source bounds were correct.
 const baked=new THREE.Scene();scene.traverse(object=>{if(object instanceof THREE.Mesh){const mesh=new THREE.Mesh(object.geometry.clone().applyMatrix4(object.matrixWorld),object.material);mesh.name=object.name;baked.add(mesh);}});
 const binary=await new GLTFExporter().parseAsync(baked,{binary:true}) as ArrayBuffer;
 const doc=await io.readBinary(new Uint8Array(binary));await doc.transform(flatten(),join(),weld(),dedup(),prune());
 const low=cloneDocument(doc);await low.transform(simplify({simplifier:MeshoptSimplifier,ratio:.35,error:.02}));
 const lowScene=low.getRoot().listScenes()[0],lowBox=vertexBounds(lowScene),extent=lowBox.min.map((n,i)=>lowBox.max[i]-n),normalization=low.createNode('lod-dimensions').setScale([1/extent[0],1/extent[1],1/extent[2]]).setTranslation([-(lowBox.min[0]+lowBox.max[0])/2/extent[0],-lowBox.min[1]/extent[1],-(lowBox.min[2]+lowBox.max[2])/2/extent[2]]);for(const child of lowScene.listChildren())normalization.addChild(child);lowScene.addChild(normalization);
 await low.transform(meshopt({encoder:MeshoptEncoder,level:'medium'}));await io.write(new URL(`${c.id}.lod.glb`,dir).pathname,low);
 await doc.transform(meshopt({encoder:MeshoptEncoder,level:'medium'}));const output=await io.writeBinary(doc);await writeFile(new URL(`${c.id}.glb`,dir),output);total+=output.byteLength;
 report[c.id]={name:c.name,bytes:output.byteLength,sourceVertices:vertices,geometryHash:key,dimensions:[c.width,c.height,c.depth],license:'CC0-1.0'};
 baked.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});
 scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());}});
}
await writeFile(new URL('manifest.json',dir),JSON.stringify({author:'BuildSpace contributors',source:'scripts/build-models.ts and apps/web/src/lib/assets/model-factory.ts',license:'CC0-1.0',compression:'EXT_meshopt_compression',models:report},null,2));
const duplicates=[...fingerprints.values()].filter(a=>a.length>1);console.log(JSON.stringify({models:catalog.length,totalBytes:total,duplicateGeometry:duplicates}));
if(duplicates.length)process.exitCode=1;
