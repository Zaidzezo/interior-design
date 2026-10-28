import * as T from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type {CatalogItem} from '../../../../../packages/core/src/catalog';

/** Original meter-based construction recipes. Every mesh is exportable glTF geometry. */
export function buildFurniture(c:CatalogItem):T.Group{
 const root=new T.Group();root.name=c.name;const w=c.width,d=c.depth,h=c.height,v=c.variant??0,name=c.name.toLowerCase();
 const mat=(color:string,role:string,roughness=.62,metalness=0)=>{const m=new T.MeshStandardMaterial({color,roughness,metalness});m.name=role;m.userData={finishRole:role};return m;};
 const fabric=mat(c.color,'main',.88),wood=mat('#846046','wood'),cream=mat('#eee8db','linen',.94),metal=mat('#bda16e','metal',.27,.82),dark=mat('#343e44','dark',.45,.1),ceramic=mat('#f0eee5','ceramic',.19),green=mat('#526d42','foliage',.82);
 const add=(geometry:T.BufferGeometry,material:T.Material,x=0,y=0,z=0,rx=0,ry=0,rz=0,label='part')=>{const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.rotation.set(rx,ry,rz);m.name=label;root.add(m);return m;};
 const box=(x:number,y:number,z:number,a:number,b:number,e:number,m:T.Material=fabric,r=.025,label='upholstery')=>add(r>0?new RoundedBoxGeometry(a,b,e,2,Math.min(r,a*.24,b*.24,e*.24)):new T.BoxGeometry(a,b,e),m,x,y,z,0,0,0,label);
 const cyl=(x:number,y:number,z:number,r1:number,r2:number,height:number,m:T.Material=wood,segments=16)=>add(new T.CylinderGeometry(r1,r2,height,segments),m,x,y,z);
 const ball=(x:number,y:number,z:number,a:number,b:number,e:number,m:T.Material=fabric)=>{const mesh=add(new T.SphereGeometry(1,12,8),m,x,y,z);mesh.scale.set(a,b,e);return mesh;};
 const tube=(points:T.Vector3[],radius:number,m:T.Material=metal)=>add(new T.TubeGeometry(new T.CatmullRomCurve3(points),16,radius,6,false),m);
 const leg=(x:number,z:number,height:number,material:T.Material=wood)=>cyl(x,height/2,z,.024,.018,height,material,10);
 const legs=(height:number,spread=.4)=>{for(const x of [-1,1])for(const z of [-1,1])leg(x*w*spread,z*d*spread,height);};
 const cushion=(x:number,y:number,z:number,a:number,b:number,e:number,m:T.Material=fabric,seed=0)=>{
  const geo=new RoundedBoxGeometry(a,b,e,3,Math.min(b*.34,.07));const pos=geo.getAttribute('position');
  for(let i=0;i<pos.count;i++){const px=pos.getX(i),py=pos.getY(i),pz=pos.getZ(i);const edge=Math.max(0,1-Math.abs(px)/(a/2))*Math.max(0,1-Math.abs(pz)/(e/2));pos.setY(i,py+Math.sin((px/a*11+seed)*Math.PI)*Math.sin(pz/e*8)*edge*b*.045);}
  geo.computeVertexNormals();const mesh=add(geo,m,x,y,z);mesh.name='tailored-cushion';
  const y0=y+b*.24,pts=[[-.45,-.43],[.45,-.43],[.45,.43],[-.45,.43],[-.45,-.43]].map(([px,pz])=>new T.Vector3(x+px*a,y0,z+pz*e));tube(pts,.0025,m);
  return mesh;
 };
 if(c.kind==='sofa'||c.kind==='chair'){
  if(/stool/.test(name)){leg(0,0,h*.74,metal);cyl(0,.045,0,w*.37,w*.4,.06,dark);cyl(0,h*.75,0,w*.35,w*.32,.035,wood);cushion(0,h*.92,0,w,.13,d);tube([new T.Vector3(-w*.3,h*.4,0),new T.Vector3(0,h*.4,d*.3),new T.Vector3(w*.3,h*.4,0)],.014,metal);}
  else if(/bench/.test(name)){legs(h*.8);for(let i=0;i<7;i++)box(0,h*.9,-d*.43+i*d*.14,w,.065,d*.1,wood,.01,'slatted-bench');}
  else if(/task/.test(name)){cyl(0,.28,0,.035,.045,.5,dark);for(let i=0;i<5;i++){const a=i*Math.PI*2/5;const x=Math.cos(a)*w*.43,z=Math.sin(a)*d*.43;const spoke=box(x/2,.09,z/2,.035,.035,w*.45,dark,.008);spoke.rotation.y=Math.PI/2-a;ball(x,.05,z,.035,.045,.035,dark);}cushion(0,h*.46,0,w*.8,.12,d*.75);const back=cushion(0,h*.76,-d*.35,w*.76,h*.42,.09);back.rotation.x=-.08;for(const x of [-1,1])box(x*w*.43,h*.61,0,.045,.04,d*.48,dark);}
  else if(c.kind==='chair'&&/dining|classroom|wishbone/.test(name)){legs(h*.5);cushion(0,h*.52,0,w*.88,.07,d*.83);for(const x of [-1,1])box(x*w*.4,h*.72,-d*.36,.03,h*.5,.035,wood);tube([new T.Vector3(-w*.44,h*.94,-d*.28),new T.Vector3(0,h,-d*.44),new T.Vector3(w*.44,h*.94,-d*.28)],.025,wood);for(let i=0;i<2+v%4;i++)box(-w*.3+i*w*.6/(1+v%4),h*.79,-d*.38,.017,h*.3,.02,wood,.004);}
  else{
   const sectional=c.footprint==='sectional'||/sectional|chaise/.test(name),curved=/curved/.test(name),seats=c.kind==='chair'?1:/two|love/.test(name)?2:3;
   const sd=sectional?d*.52:d;
   legs(.12);box(0,.21,-(d-sd)/2,w,.22,sd,fabric,.07);box(0,h*.64,-d*.43,w*.95,h*.55,d*.16,fabric,.08);
   for(const x of [-1,1]){const arm=box(x*w*.45,h*.46,-(d-sd)/2,w*.1,h*.65,sd*.96,fabric,.05+v*.002);if(curved)arm.rotation.y=x*.16;}
   for(let i=0;i<seats;i++){const x=(i-(seats-1)/2)*w*.81/seats,angle=curved?(i-(seats-1)/2)*.16:0;const seat=cushion(x,h*.43,-(d-sd)/2+.04,w*.79/seats,h*.19,sd*.7,fabric,i+v);seat.rotation.y=angle;const back=cushion(x,h*.74,-d*.31,w*.78/seats,h*.36,sd*.18,fabric,i);back.rotation.x=-.12;back.rotation.y=angle;}
   if(sectional){box(w*.29,.21,d*.2,w*.39,.22,d*.59,fabric,.06);cushion(w*.29,h*.43,d*.24,w*.37,h*.19,d*.52,fabric,v);}
   for(let i=0;i<(v%3)+1;i++){const pillow=cushion((i-(v%3)/2)*w*.34,h*.68,-d*.17,Math.min(w*.24,.4),.09,Math.min(sd*.4,.38),cream,v+i);pillow.rotation.set(1.0,0,(i%2?1:-1)*.2);}
  }
 }else if(c.kind==='bed'){
  legs(.12);box(0,.23,0,w,.28,d,wood,.035);cushion(0,.43,0,w*.97,.22,d*.97,cream,v);box(0,h*.75,-d*.47,w*1.03,Math.max(.65,h*.8),.12,fabric,.06);
  const pillows=/single|trundle/.test(name)?1:2;for(let i=0;i<pillows;i++)cushion((i-(pillows-1)/2)*w*.47,.62,-d*.3,w*.43,.15,d*.22,cream,v+i);
  cushion(0,.58,d*.13,w*.98,.18,d*.66,fabric,v);for(let i=0;i<4+v%3;i++)tube([new T.Vector3(-w*.44+i*w*.17,.68,-d*.14),new T.Vector3(-w*.42+i*w*.17,.69,d*.18),new T.Vector3(-w*.44+i*w*.17,.66,d*.43)],.0028,cream);
  for(let i=0;i<3+v%3;i++)for(let j=0;j<2;j++)ball(-w*.36+i*w*.72/(2+v%3),h*.9+j*.14,-d*.402,.008,.008,.006,metal);
 }else if(c.kind==='table'||c.kind==='desk'){
  const round=c.footprint==='ellipse'||/round|oval/.test(name);const top=round?add(new T.CylinderGeometry(.5,.5,.065,48),fabric,0,h-.035,0):box(0,h-.04,0,w,.08,d,fabric,.025);if(round)top.scale.set(w,1,d);
  if(round||/pedestal/.test(name)){cyl(0,h*.45,0,Math.min(w,d)*.14,Math.min(w,d)*.24,h*.88,wood,24);cyl(0,.04,0,Math.min(w,d)*.32,Math.min(w,d)*.34,.07,metal,32);}else legs(h-.09);
  if(/nested/.test(name)){const t=add(new T.CylinderGeometry(w*.28,w*.28,.04,36),wood,w*.34,h*.62,d*.23);leg(w*.34,d*.23,h*.6);}
  if(c.kind==='desk'){const count=/dual/.test(name)?2:1;for(let i=0;i<count;i++){const x=(i-(count-1)/2)*w*.4;box(x,h+.23,-d*.26,w*.35,.36,.025,dark,.008);leg(x,-d*.26,.12,metal);box(x,h+.012,d*.07,w*.32,.015,d*.16,cream,.004);}for(let i=0;i<2+v%3;i++)box(-w*.32,h*.55,-d*.15+i*.14,w*.22,.11,.12,wood,.01);}
  else{cyl(w*.17,h+.025,-d*.1,.065,.065,.035,cream,20);cyl(-w*.1,h+.08,0,.04,.03,.13,metal,20);}
 }else if(c.kind==='cabinet'||c.kind==='shelf'||c.kind==='fridge'){
  const m=c.kind==='fridge'?ceramic:wood;if(c.kind==='shelf'){box(0,h*.5,-d*.46,w,h,d*.08,wood,.008);for(const sign of [-1,1])box(sign*w*.48,h*.5,0,w*.04,h,d,wood,.008);box(0,h*.98,0,w,h*.04,d,wood,.006);}else box(0,h*.5,0,w,h,d,m,.018);const doors=1+v%4;
  if(c.kind==='shelf'){for(let row=0;row<3+v%3;row++){const y=(row+.5)*h/(3+v%3);box(0,y,0,w*.94,.025,d*.97,cream,.002);for(let b=0;b<5;b++)box(-w*.38+b*w*.17,y+.11,d*.2,w*.09,.18+(b%3)*.025,d*.4,[fabric,cream,dark][b%3],.003,'book');}}
  else for(let i=0;i<doors;i++){const x=(i-(doors-1)/2)*w/doors;box(x,h*.52,d*.51,w/doors-.012,h*.94,.022,fabric,.008,'cabinet-door');box(x+w/doors*.28,h*.57,d*.54,.012,.13,.015,metal,.005,'handle');}
  if(/island|peninsula|prep/.test(name))box(0,h+.025,0,w*1.06,.055,d*1.06,ceramic,.012,'stone-worktop');
  if(c.kind==='fridge')for(let i=0;i<7;i++)box(-w*.38+i*w*.125,.09,d*.53,.024,.06,.008,dark,.001,'vent');
 }else if(c.kind==='bath'||c.kind==='sink'||c.kind==='toilet'){
  if(c.kind==='toilet'){box(0,h*.65,-d*.32,w*.88,h*.65,d*.28,ceramic,.04);const bowl=add(new T.TorusGeometry(.3,.095,10,36),ceramic,0,h*.53,d*.08,Math.PI/2);bowl.scale.set(w*1.25,d*1.25,1);ball(0,h*.28,d*.04,w*.32,h*.3,d*.27,ceramic);}
  else {const shape=new T.Shape();const segments=48;for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2;const x=Math.cos(a)*w*.46,z=Math.sin(a)*d*.46;i?shape.lineTo(x,z):shape.moveTo(x,z);}const hole=new T.Path();for(let i=segments;i>=0;i--){const a=i/segments*Math.PI*2;const x=Math.cos(a)*w*.37,z=Math.sin(a)*d*.38;i===segments?hole.moveTo(x,z):hole.lineTo(x,z);}shape.holes.push(hole);const mesh=add(new T.ExtrudeGeometry(shape,{depth:h*.55,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.025,bevelThickness:.025,curveSegments:20}),ceramic,0,h*.78,0,Math.PI/2);box(0,h*.2,0,w*.68,.05,d*.7,ceramic,.03);tube([new T.Vector3(0,h*.6,-d*.46),new T.Vector3(0,h*1.07,-d*.46),new T.Vector3(0,h*1.07,-d*.29)],.017,metal);}
 }else if(c.kind==='shower'){
  box(0,.055,0,w,.11,d,ceramic,.02);const glass=new T.MeshPhysicalMaterial({color:'#d7e7e7',transparent:true,opacity:.24,roughness:.12,metalness:.1,side:T.DoubleSide});box(-w*.48,h*.5,0,.014,h,d,glass,.001);box(0,h*.5,-d*.48,w,h,.014,glass,.001);tube([new T.Vector3(w*.25,.2,-d*.4),new T.Vector3(w*.25,h*.9,-d*.4),new T.Vector3(w*.25,h*.9,-d*.2)],.015,metal);cyl(w*.25,h*.88,-d*.18,.1,.1,.018,metal,20);cyl(0,.116,0,.045,.045,.01,dark,12);
 }else if(c.kind==='stove'){
  box(0,h*.45,0,w,h*.9,d,ceramic,.01);box(0,h*.94,0,w,.05,d,dark,.008);for(let i=0;i<(v===3?6:4);i++){const ring=add(new T.TorusGeometry(Math.min(w,d)*.13,.008,6,20),metal,(i%2?1:-1)*w*.25,h*.98,(Math.floor(i/2)-(v===3?1:.5))*d*.28,Math.PI/2);}
  box(0,h*.48,d*.505,w*.8,h*.55,.02,dark,.008);box(0,h*.8,d*.54,w*.65,.02,.03,metal,.003);
 }else if(c.kind==='plant'){
  cyl(0,h*.13,0,w*.28,w*.2,h*.26,wood,24);cyl(0,h*.27,0,w*.24,w*.24,.012,dark,20);leg(0,0,h*.85,wood);
  for(let i=0;i<9+v;i++){const a=i*2.39996,level=h*(.35+i/(14+v)*.58),r=w*(.26+.12*Math.sin(i));const end=new T.Vector3(Math.cos(a)*r,level+h*.12,Math.sin(a)*r*d/w);tube([new T.Vector3(0,level-.15,0),new T.Vector3(end.x*.5,level,end.z*.5),end],.006,green);const leaf=ball(end.x,end.y,end.z,w*(.16+(v%3)*.025),h*.035,d*.26,green);leaf.rotation.set(Math.sin(a)*.5,a,.35*Math.cos(a));}
 }else if(c.kind==='rug'){
  box(0,.012,0,w,.024,d,fabric,.012,'woven-rug');for(let i=0;i<4+v;i++){const t=.03+i*.012;const pts=[[-w/2+t,-d/2+t],[w/2-t,-d/2+t],[w/2-t,d/2-t],[-w/2+t,d/2-t],[-w/2+t,-d/2+t]].map(([x,z])=>new T.Vector3(x,.025,z));tube(pts,.0018,cream);}for(const sign of [-1,1])for(let i=0;i<18;i++)box(-w*.46+i*w*.92/17,.013,sign*d*.505,.004,.003,.035,cream,.001,'rug-fringe');
 }else if(c.kind==='lamp'){
  const tall=h>.7;cyl(0,.025,0,w*.28,w*.31,.05,metal,24);leg(0,0,h*.8,metal);const shade=new T.MeshPhysicalMaterial({color:'#f0e5ca',roughness:.7,side:T.DoubleSide});add(new T.CylinderGeometry(w*.35,w*.5,h*.25,32,1,true),shade,0,h*.8,0);ball(0,h*.81,0,w*.1,w*.1,w*.1,cream);if(v%2)for(let i=0;i<3;i++){const a=i*Math.PI*2/3;tube([new T.Vector3(Math.cos(a)*w*.35,0,Math.sin(a)*d*.35),new T.Vector3(0,h*.7,0)],.01,wood);}
 }else if(c.kind==='stairs'){
  for(let i=0;i<12;i++)box(0,h*(i+.5)/12,-d*.5+d*(i+.5)/12,w,h/12,d/12,wood,.005,'tread');for(const sign of [-1,1])tube([new T.Vector3(sign*w*.48,.85,-d*.48),new T.Vector3(sign*w*.48,h+.85,d*.48)],.02,metal);
 }

 if(c.kind==='curtain'){
  const geometry=new T.PlaneGeometry(w*.28,h,48,28),position=geometry.getAttribute('position');
  for(let i=0;i<position.count;i++){const x=position.getX(i),y=position.getY(i);position.setZ(i,Math.cos((x/(w*.28)+.5)*Math.PI*(12+v*4))*d*.42+Math.sin((y/h+.5)*Math.PI)*d*.15);position.setY(i,y+Math.sin(x/w*8*Math.PI)*.012);}
  geometry.computeVertexNormals();const cloth=new T.MeshPhysicalMaterial({color:c.color,roughness:.94,sheen:.65,side:T.DoubleSide});cloth.userData={finishRole:'main'};add(geometry,cloth,-w*.36,h/2,0);add(geometry.clone(),cloth,w*.36,h/2,0);const rod=cyl(0,h,0,.014,.014,w*1.04,metal,12);rod.rotation.z=Math.PI/2;for(let i=0;i<16+v*4;i++)add(new T.TorusGeometry(.022,.004,6,12),metal,-w*.48+i*w*.96/(15+v*4),h-.02,0,0,Math.PI/2);
 }else if(c.kind==='art'||c.kind==='mirror'){
  if(c.kind==='mirror'){const mirror=new T.MeshPhysicalMaterial({color:'#dce2df',metalness:1,roughness:.055});const face=add(new T.CircleGeometry(.46,48),mirror,0,h/2,d*.35);face.scale.set(w,h,1);const rim=add(new T.TorusGeometry(.48,.016,8,48),metal,0,h/2,0);rim.scale.set(w,h,1);}
  else {box(0,h/2,0,w,h,d*.7,wood,.008);box(0,h/2,d*.4,w*.91,h*.93,.006,cream,.001);for(let i=0;i<3+v;i++){const material=[fabric,green,metal][i%3];const shape=add(new T.CircleGeometry(.13+i*.02,32),material,-w*.23+i*w*.16,h*(.3+i*.13),d*.55);shape.scale.set(w*1.5,h,1);}box(0,h*.23,d*.58,w*.72,.006,.002,dark,.001);}
 }else if(c.kind==='divider'){
  box(0,.06,0,w,.1,d,wood,.015);box(0,h-.03,0,w,.06,d,wood,.01);for(let i=0;i<15;i++)box(-w*.46+i*w*.92/14,h/2,0,.045,h,d*.55,fabric,.01,'divider-slat');
 }else if(c.kind==='ottoman'){
  legs(.07);if(c.footprint==='ellipse'){cyl(0,h*.45,0,w*.47,w*.43,h*.72,fabric,40);ball(0,h*.85,0,w*.49,h*.17,d*.49,fabric);}else{box(0,h*.4,0,w,h*.7,d,fabric,.06);cushion(0,h*.83,0,w*.99,h*.25,d*.99,fabric,v);for(const x of [-1,1])for(const z of [-1,1])ball(x*w*.22,h*.95,z*d*.22,.008,.006,.008,wood);}
 }else if(c.kind==='fireplace'){
  box(0,.035,0,w,.07,d,fabric,.012);for(const sign of [-1,1])box(sign*w*.39,h*.5,0,w*.18,h*.88,d,fabric,.015);box(0,h*.95,0,w,.1,d*1.04,fabric,.015);box(0,h*.45,-d*.46,w*.7,h*.75,.015,dark,.002);for(let i=0;i<3;i++){const log=cyl(-w*.17+i*w*.17,.14,0,.035,.035,d*.7,wood,10);log.rotation.x=Math.PI/2;}const ember=new T.MeshStandardMaterial({color:'#c06726',emissive:'#d86d26',emissiveIntensity:1.4});ball(0,.18,-d*.04,w*.18,.025,d*.12,ember);
 }
 if(/curved/.test(name)&&c.kind==='sofa'){
  root.clear();const shape=new T.Shape();shape.absarc(0,0,.5,.12*Math.PI,.88*Math.PI,false);shape.absarc(0,0,.34,.88*Math.PI,.12*Math.PI,true);shape.closePath();const geo=new T.ExtrudeGeometry(shape,{depth:h*.65,steps:1,bevelEnabled:true,bevelSize:.04,bevelThickness:.04,bevelSegments:2,curveSegments:24});const back=add(geo,fabric,0,h*.24,0,-Math.PI/2);back.scale.set(w,1,d*1.8);for(let i=0;i<4;i++){const a=.2*Math.PI+i*.2*Math.PI,x=Math.cos(a)*w*.34,z=-Math.sin(a)*d*.24;const seat=cushion(x,h*.38,z,w*.24,h*.18,d*.65,fabric,i);seat.rotation.y=a-Math.PI/2;}legs(.12,.25);
 }

 // Named constructions use different silhouettes and functional parts, not just upholstery colors.
 if(c.kind==='chair'&&/oak lounge|reading chair|wingback|club chair|upholstered accent/.test(name)){
  root.clear();legs(.15);
  if(/oak lounge/.test(name)){
   for(const side of [-1,1]){box(side*w*.43,h*.31,0,.045,h*.46,d*.9,wood,.012);box(side*w*.43,h*.62,-d*.04,.065,.045,d*.85,wood,.012);}
   box(0,h*.37,0,w*.82,.045,d*.8,wood,.01);const back=box(0,h*.69,-d*.34,w*.88,h*.58,.04,wood,.012);back.rotation.x=-.2;
   cushion(0,h*.45,.025,w*.79,.13,d*.72);const pad=cushion(0,h*.7,-d*.26,w*.77,h*.4,.12);pad.rotation.x=-.2;
  }else if(/club|accent/.test(name)){
   cyl(0,h*.18,0,w*.25,w*.25,h*.24,dark,24);cushion(0,h*.43,0,w*.86,h*.2,d*.8);
   const shape=new T.Shape();shape.absarc(0,0,.5,0,Math.PI,false);shape.absarc(0,0,.4,Math.PI,0,true);shape.closePath();const shell=add(new T.ExtrudeGeometry(shape,{depth:h*.53,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:3,curveSegments:32}),fabric,0,h*.36,0,-Math.PI/2);shell.scale.set(w,1,d);
   if(/accent/.test(name)){const back=cushion(0,h*.74,-d*.31,w*.65,h*.34,.12);back.rotation.x=-.16;}
  }else{
   cushion(0,h*.38,.02,w*.9,h*.18,d*.8);const back=cushion(0,h*.68,-d*.31,w*.82,h*.65,.16);back.rotation.x=-.12;
   for(const side of [-1,1]){box(side*w*.43,h*.44,0,w*.11,h*.36,d*.85,fabric,.045);if(/wing/.test(name)){const wing=box(side*w*.4,h*.79,-d*.2,w*.12,h*.38,d*.35,fabric,.035);wing.rotation.y=-side*.24;}else tube([new T.Vector3(side*w*.42,.1,d*.32),new T.Vector3(side*w*.45,h*.58,d*.2),new T.Vector3(side*w*.43,h*.58,-d*.32)],.022,metal);}
  }
 }
 if(c.kind==='bed'){
  root.clear();const platform=/platform/.test(name),trundle=/trundle/.test(name),upholstered=/upholstered|linen/.test(name);const mattressY=platform?h*.26:h*.38;
  legs(platform?.06:.13);box(0,mattressY-.13,0,w,.23,d,upholstered?fabric:wood,.04);cushion(0,mattressY,0,w*.95,.22,d*.96,cream,v);
  if(!platform){if(/king/.test(name)){for(let i=0;i<12;i++)box(-w*.45+i*w*.9/11,h*.65,-d*.47,w*.055,h*.7,.06,wood,.01);}else{box(0,h*.65,-d*.47,w*.99,h*.7,.13,upholstered?fabric:wood,.06);if(upholstered)for(let i=0;i<(v===0?7:3);i++)box(-w*.44+i*w*.88/(v===0?6:2),h*.66,-d*.395,.006,h*.58,.008,cream,.002);}}
  const pillows=/single|trundle/.test(name)?1:2;for(let i=0;i<pillows;i++)cushion((i-(pillows-1)/2)*w*.46,mattressY+.19,-d*.31,w*.42,.15,d*.2,cream,v+i);
  cushion(0,mattressY+.16,d*.15,w*.96,.1,d*.62,fabric,v);box(0,mattressY+.22,d*.37,w*.97,.015,d*.14,wood,.005,'folded-bed-runner');
  if(trundle){box(0,.12,d*.14,w*.87,.16,d*.85,cream,.02);for(const side of [-1,1])box(side*w*.25,.15,d*.49,.12,.025,.025,metal,.005);}
  if(platform)for(const side of [-1,1])box(side*w*.4,h*.13,0,w*.13,h*.23,d*.8,dark,.01,'recessed-plinth');
 }
 if(c.kind==='rug'){
  root.clear();if(/round/.test(name)){const rug=cyl(0,h*.5,0,.5,.5,h,fabric,64);rug.scale.set(w,1,d);for(let ring=0;ring<12;ring++){const t=add(new T.TorusGeometry(.12+ring*.03,.0015,4,64),cream,0,h,0,Math.PI/2);t.scale.set(w,d,1);}}
  else{box(0,h*.4,0,w,h*.8,d,fabric,.003,'woven-rug');
   if(/persian/.test(name)){for(let row=-2;row<=2;row++)for(let col=-3;col<=3;col++){const motif=box(col*w*.12,h*.85,row*d*.16,w*.065,.001,d*.065,row%2?wood:cream,.001);motif.rotation.y=Math.PI/4;}}
   else if(/geometric/.test(name)){for(let i=-3;i<=3;i++){const stripe=box(i*w*.11,h*.85,0,w*.055,.001,d*.85,cream,.001);stripe.rotation.y=.35;}}
   else if(/sisal/.test(name)){for(let i=0;i<20;i++)box(-w*.47+i*w*.94/19,h*.86,0,.004,.001,d*.95,wood,.001);}
   else if(/woven/.test(name)){for(let i=0;i<8;i++)box(-w*.43+i*w*.86/7,h*.86,0,w*.045,.001,d*.98,cream,.001);}
   else for(const side of [-1,1])box(side*w*.45,h*.86,0,.012,.001,d*.92,cream,.001);
   for(const sign of [-1,1])for(let i=0;i<25;i++)box(-w*.46+i*w*.92/24,h*.45,sign*d*.51,.003,.001,.045,cream,.001,'rug-fringe');
  }
 }
 if(c.kind==='plant'){
  root.clear();cyl(0,h*.1,0,w*.27,w*.2,h*.2,wood,32);cyl(0,h*.205,0,w*.24,w*.24,.01,dark,24);
  const leaf=(x:number,y:number,z:number,length:number,width:number,angle:number)=>{const geo=new T.PlaneGeometry(width,length,6,12),a=geo.getAttribute('position');for(let i=0;i<a.count;i++){const px=a.getX(i),py=a.getY(i),t=py/length+.5;a.setX(i,px*Math.max(0,Math.sin(Math.PI*t))**.7);a.setZ(i,Math.sin(Math.PI*t)*length*.13+px*px*1.2);}geo.computeVertexNormals();const m=green.clone();m.side=T.DoubleSide;const mesh=add(geo,m,x,y,z,-.5,angle,.25);return mesh;};
  if(/snake/.test(name)){for(let i=0;i<10;i++){const angle=i*2.399;const blade=leaf(Math.cos(angle)*w*.13,h*(.42+(i%3)*.05),Math.sin(angle)*d*.13,h*(.45+(i%3)*.09),w*.12,angle);blade.rotation.x=.12;}}
  else if(/fern/.test(name)){for(let branch=0;branch<9;branch++){const a=branch*2.399;for(let i=1;i<9;i++){const t=i/9;const x=Math.cos(a)*w*.46*t,z=Math.sin(a)*d*.46*t,y=h*(.35+.35*Math.sin(t*Math.PI));for(const side of [-1,1])leaf(x+Math.cos(a+Math.PI/2)*side*w*.07,y,z+Math.sin(a+Math.PI/2)*side*d*.07,h*.16,w*.07,a);}}}
  else{tube([new T.Vector3(0,h*.18,0),new T.Vector3(w*.025,h*.52,0),new T.Vector3(-w*.025,h*.96,0)],.012,wood);
   const count=/olive/.test(name)?44:/bird/.test(name)?7:/monstera/.test(name)?11:14;
   for(let i=0;i<count;i++){const a=i*2.399,level=h*(.35+i/count*.55),r=w*(.2+.16*Math.sin(i*1.73)**2),end=new T.Vector3(Math.cos(a)*r,level,Math.sin(a)*r*d/w);tube([new T.Vector3(0,level-.12,0),end],.0035,green);const size=/olive/.test(name)?[h*.12,w*.075]:/bird/.test(name)?[h*.46,w*.2]:[h*.25,w*.38];leaf(end.x,end.y,end.z,size[0],size[1],a);if(/monstera/.test(name))for(let l=0;l<4;l++)leaf(end.x+Math.cos(a)*w*.05*l,end.y+l*h*.025,end.z+Math.sin(a)*d*.05*l,h*.12,w*.1,a+l*.2);}
  }
 }
 if(c.kind==='lamp'){
  root.clear();if(/spot/.test(name)){cyl(0,h*.5,0,w*.45,w*.45,h,metal,32);cyl(0,.005,0,w*.35,w*.35,.01,cream,32);}
  else if(/pendant/.test(name)){tube([new T.Vector3(0,h,0),new T.Vector3(0,h*.55,0)],.004,dark);ball(0,h*.3,0,w*.49,h*.29,d*.49,cream);cyl(0,h,0,.06,.06,.025,metal,24);}
  else if(/mushroom/.test(name)){cyl(0,h*.35,0,w*.12,w*.16,h*.7,metal,32);const profile=[new T.Vector2(0,0),new T.Vector2(w*.49,0),new T.Vector2(w*.48,h*.08),new T.Vector2(w*.35,h*.28),new T.Vector2(0,h*.31)];add(new T.LatheGeometry(profile,48),fabric,0,h*.68,0);}
  else{cyl(0,.025,0,w*.3,w*.32,.05,metal,32);if(/tripod/.test(name))for(let i=0;i<3;i++){const a=i*Math.PI*2/3;tube([new T.Vector3(Math.cos(a)*w*.43,0,Math.sin(a)*d*.43),new T.Vector3(0,h*.78,0)],.014,wood);}else tube([new T.Vector3(-w*.22,.03,-d*.2),new T.Vector3(-w*.22,h*.83,-d*.2),new T.Vector3(w*.18,h*.97,d*.15)],.016,metal);add(new T.CylinderGeometry(w*.25,w*.43,h*.24,40,1,true),cream,w*.18,h*.8,d*.15);}
 }

 if(c.kind==='desk'){
  root.clear();const drafting=/drafting/.test(name),standing=/standing/.test(name),corner=/corner/.test(name),wall=/wall mounted/.test(name),children=/children|classroom/.test(name),executive=/executive/.test(name),monitors=/monitor/.test(name)?2:/workstation|workspace/.test(name)?1:0;
  const tabletop=monitors?h*.65:h*.94;const top=box(0,tabletop,0,w,.055,d,fabric,.018);if(drafting)top.rotation.x=-.24;
  if(standing){for(const side of [-1,1]){box(side*w*.34,tabletop*.48,0,.055,tabletop*.94,.055,dark,.008);box(side*w*.34,.035,0,.065,.07,d*.9,dark,.008);}box(0,tabletop*.7,0,w*.7,.05,.04,dark,.005);}
  else if(wall){for(const side of [-1,1]){box(side*w*.3,tabletop*.65,-d*.4,.04,tabletop*.65,.045,metal,.005);tube([new T.Vector3(side*w*.3,tabletop-.03,d*.25),new T.Vector3(side*w*.3,tabletop*.5,-d*.4)],.016,metal);}}
  else{legs(tabletop-.04);if(children||executive)for(let row=0;row<3;row++){box(-w*.32,tabletop*(.22+row*.23),0,w*.24,tabletop*.21,d*.9,wood,.012);box(-w*.32,tabletop*(.22+row*.23),d*.46,w*.13,.012,.02,metal,.004);}}
  if(corner){box(w*.33,tabletop,d*.35,w*.34,.055,d*1.4,fabric,.018);for(const side of [-1,1])leg(w*.33+side*w*.12,d*.92,tabletop-.03);}
  if(drafting){box(0,tabletop*.43,0,w*.7,.04,.04,metal,.008);for(const side of [-1,1]){const support=box(side*w*.32,tabletop*.45,0,.045,tabletop*.85,.045,dark,.008);support.rotation.x=side*.22;}box(0,tabletop+.05,0,w*.7,.004,d*.7,cream,.001,'drawing-sheet');}
  for(let i=0;i<monitors;i++){const x=(i-(monitors-1)/2)*w*.4;box(x,tabletop+.23,-d*.25,w*.34,.36,.026,dark,.006);box(x,tabletop+.08,-d*.25,.035,.15,.025,metal,.003);box(x,tabletop+.01,d*.1,w*.3,.014,d*.16,cream,.003);}
  if(!monitors&&!drafting){box(w*.13,tabletop+.009,0,w*.32,.008,d*.5,cream,.001);cyl(-w*.3,tabletop+.05,-d*.25,.035,.035,.09,metal,16);}
 }
 if(c.kind==='cabinet'){
  root.clear();const island=/island|peninsula|butcher/.test(name),console=/entry|media/.test(name),dresser=/dresser/.test(name),rolling=/rolling/.test(name),wardrobe=/wardrobe|cupboard/.test(name),vanity=/vanity/.test(name);const bottom=console?.24:.08,bodyH=h-bottom-(island?.05:0);
  if(rolling){legs(h*.93);for(const y of [h*.18,h*.48,h*.92])box(0,y,0,w,.05,d,y===h*.92?fabric:wood,.012);for(const x of [-1,1])for(const z of [-1,1])ball(x*w*.4,.035,z*d*.4,.04,.04,.018,dark);}
  else{legs(bottom);box(0,bottom+bodyH/2,-d*.46,w,bodyH,d*.08,wood,.008);for(const side of [-1,1])box(side*w*.48,bottom+bodyH/2,0,w*.04,bodyH,d,wood,.008);box(0,h-.025,0,w,.05,d,wood,.01);box(0,bottom+.02,0,w,.04,d,wood,.01);
   if(dresser){for(let row=0;row<3;row++){const y=bottom+(row+.5)*bodyH/3;box(0,y,d*.47,w*.94,bodyH/3-.012,.045,fabric,.008);for(const sign of [-1,1])box(sign*w*.23,y,d*.51,.12,.012,.02,metal,.003);}}
   else if(/media/.test(name)){box(0,bottom+bodyH*.5,0,w*.94,.025,d,wood,.006);for(const side of [-1,1])box(side*w*.35,bottom+bodyH*.5,0,.02,bodyH,d,wood,.003);box(0,bottom+bodyH*.22,d*.15,w*.36,.055,d*.55,dark,.006,'media-player');}
   else if(/entry/.test(name)){box(0,h*.77,0,w*.93,.1,d*.95,fabric,.012);box(0,h*.77,d*.5,w*.2,.015,.02,metal,.003);}
   else{const doors=wardrobe?2:island?3:2;for(let i=0;i<doors;i++){const x=(i-(doors-1)/2)*w/doors;box(x,bottom+bodyH*.5,d*.47,w/doors-.018,bodyH*.95,.035,fabric,.01);box(x+w/doors*.32,bottom+bodyH*.53,d*.51,.012,wardrobe?.18:.09,.02,metal,.003);if(/sideboard/.test(name))for(let slat=0;slat<8;slat++)box(x-w/doors*.42+slat*w/doors*.12,bottom+bodyH*.5,d*.5,.012,bodyH*.88,.012,wood,.003);}}
  }
  if(island||vanity||/kitchen/.test(name))box(0,h,0,w*1.04,.055,d*1.05,ceramic,.012,'worktop');
  if(/stone prep/.test(name)){box(w*.36,h*.49,0,w*.22,h,d,fabric,.012,'waterfall-stone');box(0,h+.035,0,w*.36,.04,d*.45,wood,.01,'cutting-board');}
  if(/peninsula/.test(name)){box(0,h,-d*.26,w,.055,d*1.5,ceramic,.012);for(const x of [-1,1])box(x*w*.45,h*.48,-d*.85,.045,h*.95,.045,metal,.01);}
 }
 if(c.kind==='table'&&/console|extendable|six person|square walnut/.test(name)){
  if(/console/.test(name)){root.clear();legs(h-.07);box(0,h-.035,0,w,.07,d,fabric,.015);box(0,h*.2,0,w*.95,.035,d*.9,wood,.01);box(0,h*.8,0,w*.92,.12,d*.9,wood,.01);box(0,h*.8,d*.47,.12,.012,.02,metal,.003);}
  else if(/extendable/.test(name)){box(0,h+.006,0,.004,.005,d*.98,dark,.001,'extension-seam');for(const sign of [-1,1])box(sign*w*.32,h*.48,0,.08,h*.85,d*.72,wood,.02,'trestle-leg');}
  else if(/six/.test(name)){for(const z of [-1,1])box(0,h*.83,z*d*.4,w*.88,.12,.04,wood,.01,'table-apron');}
  else box(0,h*.2,0,w*.88,.05,d*.88,wood,.008,'lower-shelf');
 }
 if(c.kind==='sink'){
  root.clear();const pedestal=/pedestal/.test(name),vanity=/vanity/.test(name),double=/double/.test(name),farm=/farmhouse/.test(name),steel=/stainless/.test(name),m=steel?metal:ceramic;
  if(pedestal){cyl(0,h*.39,0,w*.12,w*.2,h*.78,ceramic,32);}
  else {const y=vanity?h*.45:h*.4;box(0,y,0,w,vanity?h*.45:h*.75,d,wood,.015);for(const sign of [-1,1]){box(sign*w*.25,y,d*.51,w*.48,vanity?h*.42:h*.7,.025,fabric,.012);box(sign*w*.25,y,d*.54,.12,.012,.025,metal,.004);}}
  const count=double?2:1,bw=w*.88/count;for(let i=0;i<count;i++){const x=(i-(count-1)/2)*w*.48;box(x,h*.83,0,bw,.04,d*.9,m,.025);box(x,h*.9,-d*.35,bw,.12,.07,m,.025);box(x,h*.9,d*.35,bw,.12,.07,m,.025);for(const side of [-1,1])box(x+side*bw*.46,h*.9,0,bw*.08,.12,d*.72,m,.02);cyl(x,h*.855,0,.025,.025,.004,metal,16);tube([new T.Vector3(x,h*.88,-d*.35),new T.Vector3(x,h*1.12,-d*.35),new T.Vector3(x,h*1.12,-d*.08)],.012,metal);}
  if(farm)box(0,h*.82,d*.47,w*.9,h*.25,.08,ceramic,.025,'apron-sink');
 }
 if(c.kind==='toilet'){
  root.clear();const wall=/wall hung/.test(name);if(!wall){box(0,h*.7,-d*.33,w*.85,h*.58,d*.28,ceramic,.04);box(0,h*.23,0,w*.65,h*.4,d*.65,ceramic,.06);}else box(0,h*.55,-d*.4,w*.7,h*.55,d*.18,ceramic,.025);
  const bowl=add(new T.TorusGeometry(.3,.075,12,48),ceramic,0,h*.53,d*.05,Math.PI/2);bowl.scale.set(w*1.4,d*1.25,1);ball(0,h*.35,d*.04,w*.42,h*.23,d*.4,ceramic);const seat=add(new T.TorusGeometry(.3,.035,8,48),cream,0,h*.64,d*.05,Math.PI/2);seat.scale.set(w*1.4,d*1.25,1);
  if(wall)box(0,h*.9,-d*.43,w*.35,h*.16,.014,metal,.012,'flush-plate');
 }
 if(c.kind==='shower'){
  root.clear();const wet=/wet room/.test(name),corner=/corner/.test(name);box(0,.035,0,w,.07,d,ceramic,.015);const glass=new T.MeshPhysicalMaterial({color:'#dce9e7',transparent:true,opacity:.2,roughness:.08,metalness:.05,side:T.DoubleSide});box(-w*.48,h*.5,0,.012,h,d,glass,.001);if(corner)box(0,h*.5,-d*.48,w,h,.012,glass,.001);if(wet)box(w*.3,h*.5,-d*.48,w*.38,h,.045,ceramic,.001);
  tube([new T.Vector3(w*.22,.2,-d*.42),new T.Vector3(w*.22,h*.92,-d*.42),new T.Vector3(w*.22,h*.92,-d*.18)],.013,metal);cyl(w*.22,h*.9,-d*.18,.11,.11,.015,metal,32);box(0,.075,d*.32,w*.4,.006,.035,metal,.002,'linear-drain');if(corner){box(w*.45,h*.5,-d*.47,.02,h,.02,metal,.002);box(0,h*.54,-d*.46,.22,.015,.02,metal,.003,'glass-door-handle');}
 }
 // Functional variant details, not name badges or color-only differences.
 if(/kitchen base/.test(name)){box(0,h+.025,0,w*1.03,.055,d*1.04,ceramic,.01,'countertop');box(0,.07,d*.52,w*.95,.1,.025,dark,.003,'kickboard');}
 if(/bathroom vanity/.test(name)){const rim=add(new T.TorusGeometry(w*.25,.035,10,32),ceramic,0,h+.035,0,Math.PI/2);rim.scale.y=.7;tube([new T.Vector3(0,h,-d*.3),new T.Vector3(0,h+.2,-d*.3),new T.Vector3(0,h+.2,-d*.05)],.012,metal);}
 if(/executive/.test(name)){box(-w*.32,h*.45,0,w*.25,h*.8,d*.8,wood,.012,'drawer-pedestal');box(0,h*.6,-d*.3,w*.85,h*.4,.02,wood,.005,'privacy-panel');}
 if(/gas hob/.test(name)){for(const x of [-1,1])for(const z of [-1,1]){box(x*w*.25,h*1.02,z*d*.14,.018,.02,d*.34,dark,.003,'grate');box(x*w*.25,h*1.02,z*d*.14,w*.35,.02,.018,dark,.003,'grate');}}
 if(/inset/.test(name)){for(const sign of [-1,1]){box(sign*w*.47,h*.4,0,.06,h*.75,d,wood,.005,'bath-apron');box(0,h*.4,sign*d*.47,w,h*.75,.06,wood,.005,'bath-apron');}}
 if(/close coupled/.test(name)){box(0,h*.95,-d*.33,w*.8,h*.4,d*.23,ceramic,.035,'cistern');cyl(0,h*1.16,-d*.33,.025,.025,.008,metal,12);}
 if(/utility stairs/.test(name))for(const sign of [-1,1]){const stringer=box(sign*w*.48,h*.5,0,.05,.15,Math.hypot(h,d),dark,.008,'closed-stringer');stringer.rotation.x=-Math.atan2(h,d);}
 // A catalog entry's structural details are geometric, not a color-only identifier.
 if(root.children.length===0)box(0,h/2,0,w,h,d,fabric);
 root.updateMatrixWorld(true);const bbox=new T.Box3().setFromObject(root,true),size=bbox.getSize(new T.Vector3()),center=bbox.getCenter(new T.Vector3());
 for(const child of root.children)child.position.sub(new T.Vector3(center.x,bbox.min.y,center.z));root.scale.set(1/size.x,1/size.y,1/size.z);root.userData={catalogId:c.id,dimensions:[w,h,d],author:'BuildSpace contributors',license:'CC0-1.0'};
 return root;
}
