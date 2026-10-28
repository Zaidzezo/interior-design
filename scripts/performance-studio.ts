import {chromium,Page} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {blankScene,rectangleRoom} from '../packages/core/src/sample';
import {catalog} from '../packages/core/src/catalog';
import {uid} from '../packages/core/src/model';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
async function sample(page:Page,frames=24){return page.evaluate(async frames=>{
 const metrics=(reset=false)=>new Promise<any>(resolve=>{window.addEventListener('buildspace-studio-metrics',e=>resolve((e as CustomEvent).detail),{once:true});window.dispatchEvent(new CustomEvent('buildspace-studio-inspect',{detail:reset?'reset':undefined}));});
 await metrics(true);for(let n=0;n<frames;n++)await new Promise(requestAnimationFrame);return metrics();
},frames);}
const results:any[]=[];
try{for(const repeated of [true,false]){
 const context=await browser.newContext({baseURL:process.env.BASE_URL??'http://127.0.0.1:3041',viewport:{width:1440,height:900}}),request=context.request;
 await request.post('/api/auth/guest',{data:{}});const scene=blankScene(),f=scene.floors[0];f.rooms=[rectangleRoom('Model showroom','Custom',0,0,40,30)];
 f.items=Array.from({length:120},(_,i)=>{const c=repeated?catalog[1]:catalog[i%catalog.length];return{id:uid(),catalogId:c.id,name:c.name,width:c.width,depth:c.depth,height:c.height,x:2+i%12*3,y:2+Math.floor(i/12)*2.6,elevation:0,rotation:0,color:c.color,locked:false,hidden:false,price:c.price};});
 const response=await request.post('/api/projects',{data:{name:`3D benchmark ${repeated?'instanced':'varied'}`,scene}});if(!response.ok())throw new Error(await response.text());const project=await response.json(),page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(id=>{localStorage.setItem('buildspace-project',id);localStorage.setItem('buildspace-view','3D');},project.id);await page.goto('/');await page.getByLabel('Render quality').selectOption('draft');await page.locator('[data-camera-ready=true][data-models-ready=true]').waitFor({timeout:90000});
 for(const quality of ['draft','balanced'] as const){await page.getByLabel('Render quality').selectOption(quality);await page.locator('[data-models-ready=true]').waitFor();const idle=await sample(page);const canvas=page.locator('.scene3d canvas'),b=(await canvas.boundingBox())!;await page.mouse.move(b.x+b.width*.8,b.y+b.height*.8);await page.mouse.down();await page.mouse.move(b.x+b.width*.7,b.y+b.height*.7,{steps:12});await page.mouse.up();const orbit=await sample(page);
  const summarize=(data:any)=>{const frames=data.frames.slice().sort((a:number,b:number)=>a-b);return{fps:1000/(frames.reduce((a:number,b:number)=>a+b,0)/frames.length),medianMs:frames[Math.floor(frames.length/2)],p95Ms:frames[Math.floor(frames.length*.95)],...Object.fromEntries(Object.entries(data).filter(([key])=>key!=='frames'))};};results.push({objects:120,repeated,quality,idle:summarize(idle),orbit:summarize(orbit),errors});console.log(JSON.stringify(results[results.length-1]));
 }
 await context.close();}
 await writeFile('artifacts/studio-performance.json',JSON.stringify({renderer:'Chromium SwiftShader software WebGL; not a hardware GPU measurement',browser:browser.version(),viewport:[1440,900],results},null,2));
}finally{await browser.close();}
