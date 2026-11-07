/*! © 2026 YABAI · Sống ở Nhật 3D · all rights reserved */
import*as THREE from'three';
import{mergeGeometries}from'three/addons/utils/BufferGeometryUtils.js';
import{canvasTexture,makeSun,loadModel}from'./stage.js';
import{makeCharacter}from'./chars.js';
import{GOODS,GOOD_KEYS}from'../core/konbini_rules.js';
import{KONBINI_STORE}from'../core/konbini_view.js';
export const KONBINI_COLORS={top:'#4a9ec8',bottom:'#1f2b3a'};
export{KONBINI_STORE};
const CUST_POOL_KINDS=['f_casual','hoodie','suit','f_office'];
const COUNTER_TOP_Y=0.9325;
const MODEL_3D_GOODS={
onigiri:{model:'kb_onigiri',rotY:0,topY:0.155},
ocha:{model:'kb_ocha',rotY:-0.45,topY:0.306,frontSide:true},
coffee:{model:'kb_coffee',rotY:0,topY:0.18},
};
function makeScannedCheckMaterial(){
const tex=canvasTexture(64,64,(g)=>{
g.clearRect(0,0,64,64);
g.fillStyle='#27ae60';
g.beginPath();
g.arc(32,32,26,0,Math.PI*2);
g.fill();
g.lineWidth=4;
g.strokeStyle='#ffffff';
g.stroke();
g.fillStyle='#ffffff';
g.textAlign='center';
g.textBaseline='middle';
g.font='900 34px "Be Vietnam Pro", sans-serif';
g.fillText('✓',32,34);
});
return new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false});
}
function buildItem3DTemplate(gltf,cfg){
const group=new THREE.Group();
gltf.scene.traverse((o)=>{
if(!o.isMesh)return;
const m=o.clone();
m.position.set(0,0,0);
m.rotation.set(0,cfg.rotY||0,0);
m.scale.set(1,1,1);
m.castShadow=false;
m.receiveShadow=true;
if(cfg.frontSide&&m.material){
m.material=m.material.clone();
m.material.side=THREE.FrontSide;
m.material.depthWrite=true;
}
group.add(m);
});
group.scale.setScalar(1.6);
return group;
}
function makeItemCardTexture(good,scanned=false){
return canvasTexture(128,128,(g)=>{
g.fillStyle=scanned?'#d8f5e3':'#fffdf7';
g.fillRect(0,0,128,128);
g.strokeStyle=scanned?'#27ae60':'#d68910';
g.lineWidth=8;
g.strokeRect(4,4,120,120);
g.textAlign='center';
g.textBaseline='middle';
g.font='52px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
g.fillText(good.icon,64,46);
g.fillStyle='#1f2a36';
g.font='800 18px "Zen Maru Gothic", "Be Vietnam Pro", sans-serif';
g.fillText(good.jp,64,88);
g.fillStyle=scanned?'#1e8449':'#b84b18';
g.font='800 17px "Be Vietnam Pro", sans-serif';
g.fillText(scanned?`✓ ${good.price}円`:`${good.price}円`,64,111);
});
}
function makeRegisterScreen(){
const c=document.createElement('canvas');
c.width=256;
c.height=128;
const g=c.getContext('2d');
const tex=new THREE.CanvasTexture(c);
tex.colorSpace=THREE.SRGBColorSpace;
const mat=new THREE.MeshBasicMaterial({map:tex});
return{c,g,tex,mat,sig:''};
}
function drawRegisterScreen(scr,cust){
const sig=cust
?`${cust.id}:${cust.step}:${cust.subTotal}:${cust.total}:${cust.tendered}:${cust.changeGiven}:${cust.payMethod}`
:'idle';
if(scr.sig===sig)return;
scr.sig=sig;
const{g,tex}=scr;
g.fillStyle='#0f2438';
g.fillRect(0,0,256,128);
g.strokeStyle='#38a169';
g.lineWidth=4;
g.strokeRect(3,3,250,122);
g.fillStyle='#7ed6a0';
g.font='700 17px "Zen Maru Gothic", "Be Vietnam Pro", sans-serif';
g.fillText('サクラマート POS',12,24);
if(!cust){
g.fillStyle='#ffffff';
g.font='800 22px "Zen Maru Gothic", sans-serif';
g.fillText('いらっしゃいませ',12,68);
tex.needsUpdate=true;
return;
}
const shownTotal=cust.step==='pay'||cust.step==='thanks'?cust.total:cust.subTotal;
g.fillStyle='#ffd666';
g.font='800 24px "Zen Maru Gothic", "Be Vietnam Pro", sans-serif';
g.fillText(`合計  ${shownTotal}円`,12,58);
g.fillStyle='#d8e9f8';
g.font='700 17px "Zen Maru Gothic", "Be Vietnam Pro", sans-serif';
if(cust.step==='pay'){
if(cust.payMethod==='ic'){
g.fillText('決済: ICカード (タッチ)',12,88);
g.fillStyle='#7ed6a0';
g.fillText('お釣り: 0円',12,112);
}else{
g.fillText(`お預かり: ${cust.tendered}円`,12,88);
g.fillStyle='#7ed6a0';
g.fillText(`お釣り: ${cust.changeDue}円 (入力 ${cust.changeGiven}円)`,12,112);
}
}else if(cust.step==='scan'){
const done=cust.items.filter((i)=>i.scanned).length;
g.fillText(`スキャン: ${done}/${cust.items.length}点`,12,92);
}else{
g.fillText('接客中…',12,92);
}
tex.needsUpdate=true;
}
export async function buildKonbiniStore(){
const[roomGltf,onigiriGltf,ochaGltf,coffeeGltf]=await Promise.all(
['konbini_room','kb_onigiri','kb_ocha','kb_coffee'].map(loadModel),
);
const item3DTemplates={
onigiri:buildItem3DTemplate(onigiriGltf,MODEL_3D_GOODS.onigiri),
ocha:buildItem3DTemplate(ochaGltf,MODEL_3D_GOODS.ocha),
coffee:buildItem3DTemplate(coffeeGltf,MODEL_3D_GOODS.coffee),
};
const scene=new THREE.Scene();
scene.background=new THREE.Color('#eef3f6');
scene.fog=new THREE.FogExp2(new THREE.Color('#eef3f6'),0.012);
scene.add(new THREE.HemisphereLight(0xffffff,0xd8e0e6,1.55));
const fill=new THREE.DirectionalLight(0xf6faff,0.85);
fill.position.set(-4,7,-5);
scene.add(fill);
const sun=makeSun(scene,{color:0xfffcf5,intensity:1.55,size:8,offset:[3,9,4]});
const counterLight=new THREE.PointLight(0xfff9ec,0.9,9,1.4);
counterLight.position.set(0,3.1,1.2);
scene.add(counterLight);
const room=roomGltf.scene;
room.position.set(0,0,0);
room.rotation.set(0,0,0);
room.scale.set(1,1,1);
room.traverse((o)=>{
if(o.isMesh){
o.castShadow=false;
o.receiveShadow=true;
}
});
scene.add(room);
const batch=new Map();
const mats={};
const col=(c,o={})=>{
const key=`${c}:${JSON.stringify(o)}`;
return mats[key]||(mats[key]=new THREE.MeshStandardMaterial({color:c,roughness:0.72,...o}));
};
const m4=new THREE.Matrix4();
const q=new THREE.Quaternion();
const e=new THREE.Euler();
const p=new THREE.Vector3();
const s1=new THREE.Vector3(1,1,1);
function put(geo,m,x,y,z,ry=0,rx=0,rz=0){
e.set(rx,ry,rz);
q.setFromEuler(e);
p.set(x,y,z);
let g=geo.clone().applyMatrix4(m4.compose(p,q,s1));
if(g.index)g=g.toNonIndexed();
for(const k of Object.keys(g.attributes)){
if(!['position','normal','uv'].includes(k))g.deleteAttribute(k);
}
if(!batch.has(m))batch.set(m,[]);
batch.get(m).push(g);
}
const B=(w,h,d)=>new THREE.BoxGeometry(w,h,d);
const C=(rt,rb,h,seg=10)=>new THREE.CylinderGeometry(rt,rb,h,seg);
const darkMetal=col('#26323f',{metalness:0.55,roughness:0.35});
const chromeMat=col('#d8e0e6',{metalness:0.78,roughness:0.24});
const counterBodyMat=col('#e9e6df',{roughness:0.5});
const counterTopMat=col('#c9ccd1',{roughness:0.32,metalness:0.15});
const warmCaseMat=col('#d97706',{metalness:0.35,roughness:0.35});
const warmGlowMat=col('#fff3c4',{emissive:'#ffae2b',emissiveIntensity:0.65,roughness:0.25});
const icPadMat=col('#1d6fa5',{emissive:'#2980b9',emissiveIntensity:0.55,roughness:0.25});
const whiteCupMat=col('#f3f4f6',{roughness:0.42});
const bunMat=col('#fdfaf2',{roughness:0.65});
put(B(2.75,0.90,0.62),counterBodyMat,0.05,0.45,1.38);
put(B(2.82,0.045,0.68),counterTopMat,0.05,0.91,1.38);
put(B(0.75,0.90,0.62),counterBodyMat,1.22,0.45,1.62);
put(B(0.80,0.045,0.66),counterTopMat,1.22,0.91,1.62);
const[rx,,rz]=KONBINI_STORE.registerPos;
put(B(0.32,0.10,0.30),darkMetal,rx,0.98,rz);
put(B(0.26,0.18,0.10),darkMetal,rx,1.12,rz-0.02);
put(B(0.11,0.022,0.14),icPadMat,rx+0.19,0.94,rz-0.05);
put(B(0.14,0.016,0.11),icPadMat,rx+0.19,0.938,rz+0.11);
const[hx,,hz]=KONBINI_STORE.hotCasePos;
put(B(0.38,0.05,0.30),warmCaseMat,hx,0.955,hz);
put(B(0.38,0.04,0.30),warmCaseMat,hx,1.26,hz);
put(B(0.34,0.015,0.26),warmGlowMat,hx,1.10,hz);
put(B(0.34,0.015,0.26),warmGlowMat,hx,0.985,hz);
for(const dx of[-0.175,0.175]){
for(const dz of[-0.135,0.135]){
put(B(0.02,0.28,0.02),warmCaseMat,hx+dx,1.11,hz+dz);
}
}
for(const ox of[-0.10,0,0.10]){
for(const oz of[-0.05,0.05]){
put(new THREE.SphereGeometry(0.034,8,6),bunMat,hx+ox,1.125,hz+oz);
put(C(0.022,0.022,0.11,7),col('#d67f29',{roughness:0.55}),hx+ox,1.015,hz+oz,0,Math.PI/2);
}
}
const[cx,,cz]=KONBINI_STORE.coffeePos;
put(B(0.34,0.46,0.34),darkMetal,cx,1.16,cz);
put(B(0.28,0.12,0.06),chromeMat,cx,1.28,cz-0.15);
put(C(0.032,0.026,0.09,8),whiteCupMat,cx,1.02,cz-0.12);
for(const[m,list]of batch){
const mesh=new THREE.Mesh(mergeGeometries(list,false),m);
mesh.castShadow=false;
mesh.receiveShadow=true;
scene.add(mesh);
}
const glassMat=new THREE.MeshStandardMaterial({
color:'#cce8f6',
transparent:true,
opacity:0.36,
roughness:0.12,
metalness:0.1,
depthWrite:false,
});
const hotGlass=new THREE.Mesh(new THREE.BoxGeometry(0.36,0.27,0.28),glassMat);
hotGlass.position.set(hx,1.11,hz);
scene.add(hotGlass);
const regScreen=makeRegisterScreen();
drawRegisterScreen(regScreen,null);
const screenMesh=new THREE.Mesh(new THREE.PlaneGeometry(0.24,0.13),regScreen.mat);
screenMesh.position.set(rx,1.14,rz+0.04);
screenMesh.rotation.x=-0.22;
scene.add(screenMesh);
const itemTexCache={};
for(const k of GOOD_KEYS){
if(MODEL_3D_GOODS[k])continue;
itemTexCache[`${k}:0`]=makeItemCardTexture(GOODS[k],false);
itemTexCache[`${k}:1`]=makeItemCardTexture(GOODS[k],true);
}
const scannedCheckMat=makeScannedCheckMaterial();
const slotGeo=new THREE.BoxGeometry(0.11,0.085,0.11);
const itemMeshes=[];
const slotViews=KONBINI_STORE.itemSlots.map(([sx,sy,sz],idx)=>{
const mat=new THREE.MeshStandardMaterial({map:itemTexCache['sandwich:0'],roughness:0.35});
const cardMesh=new THREE.Mesh(slotGeo,mat);
cardMesh.position.set(sx,sy,sz);
cardMesh.visible=false;
cardMesh.userData={slotIdx:idx};
scene.add(cardMesh);
itemMeshes.push(cardMesh);
const models={};
for(const[goodId,tpl]of Object.entries(item3DTemplates)){
const grp=tpl.clone(true);
grp.position.set(sx,COUNTER_TOP_Y,sz);
grp.visible=false;
grp.traverse((o)=>{
if(o.isMesh){
o.visible=false;
o.userData={slotIdx:idx};
itemMeshes.push(o);
}
});
scene.add(grp);
models[goodId]=grp;
}
const checkSprite=new THREE.Sprite(scannedCheckMat);
checkSprite.scale.set(0.072,0.072,1);
checkSprite.position.set(sx,COUNTER_TOP_Y+0.22,sz);
checkSprite.visible=false;
scene.add(checkSprite);
return{cardMesh,models,checkSprite};
});
const bagMesh=new THREE.Mesh(
new THREE.BoxGeometry(0.16,0.20,0.12),
new THREE.MeshStandardMaterial({color:'#f8fafc',roughness:0.55}),
);
bagMesh.position.set(-0.26,1.01,1.48);
bagMesh.visible=false;
scene.add(bagMesh);
const tencho=await makeCharacter('suit',KONBINI_COLORS);
tencho.holder.position.set(KONBINI_STORE.tencho.x,0,KONBINI_STORE.tencho.z);
tencho.yaw=KONBINI_STORE.tencho.yaw;
tencho.holder.visible=false;
tencho.play('idle');
scene.add(tencho.holder);
const custPool=await Promise.all(
CUST_POOL_KINDS.map(async(kind,i)=>{
const ch=await makeCharacter(kind);
ch.holder.position.set(KONBINI_STORE.door.x,0,KONBINI_STORE.door.z);
ch.holder.visible=false;
ch.play('idle');
scene.add(ch.holder);
return{ch,slot:i,targetX:KONBINI_STORE.door.x,targetZ:KONBINI_STORE.door.z,targetYaw:0,active:false};
}),
);
let leavingSlot=-1;
let leavingTimer=0;
function hideSlotView(sv){
sv.cardMesh.visible=false;
sv.checkSprite.visible=false;
for(const grp of Object.values(sv.models)){
grp.visible=false;
for(const ch of grp.children)ch.visible=false;
}
}
function syncShift(st){
if(!st){
drawRegisterScreen(regScreen,null);
for(const sv of slotViews)hideSlotView(sv);
bagMesh.visible=false;
for(const p of custPool)p.ch.holder.visible=false;
return;
}
const c=st.cur;
drawRegisterScreen(regScreen,c);
const counterItems=c?c.items:[];
for(let i=0;i<slotViews.length;i++){
const sv=slotViews[i];
const it=counterItems[i];
if(!it||c.step==='done'){
hideSlotView(sv);
continue;
}
const[bx,by,bz]=KONBINI_STORE.itemSlots[i];
const px=bx+(it.scanned?-0.025:0);
const pz=bz+(it.scanned?0.06:0);
const cfg3D=MODEL_3D_GOODS[it.id];
if(cfg3D&&sv.models[it.id]){
sv.cardMesh.visible=false;
const liftY=it.scanned?0.02:0;
const baseY=COUNTER_TOP_Y+liftY;
for(const[k,grp]of Object.entries(sv.models)){
const on=k===it.id;
grp.visible=on;
for(const ch of grp.children)ch.visible=on;
if(on)grp.position.set(px,baseY,pz);
}
sv.checkSprite.visible=Boolean(it.scanned);
if(it.scanned){
sv.checkSprite.position.set(px,baseY+cfg3D.topY+0.042,pz);
}
}else{
for(const grp of Object.values(sv.models)){
grp.visible=false;
for(const ch of grp.children)ch.visible=false;
}
sv.checkSprite.visible=false;
const m=sv.cardMesh;
const texKey=`${it.id}:${it.scanned ? 1 : 0}`;
if(itemTexCache[texKey]&&m.material.map!==itemTexCache[texKey]){
m.material.map=itemTexCache[texKey];
m.material.needsUpdate=true;
}
m.position.set(px,by,pz);
m.visible=true;
}
}
bagMesh.visible=Boolean(c&&c.bagAdded);
const curSlot=c?(c.id-1)%custPool.length:-1;
const qCust=st.queue&&st.queue[0];
const qSlot=qCust?(qCust.id-1)%custPool.length:-1;
for(let i=0;i<custPool.length;i++){
const entry=custPool[i];
if(i===curSlot&&c){
if(!entry.active){
entry.ch.holder.position.set(KONBINI_STORE.counterCustomer.x,0,KONBINI_STORE.counterCustomer.z-0.55);
entry.active=true;
}
entry.ch.holder.visible=true;
entry.targetX=KONBINI_STORE.counterCustomer.x;
entry.targetZ=KONBINI_STORE.counterCustomer.z;
entry.targetYaw=KONBINI_STORE.counterCustomer.yaw;
}else if(i===qSlot&&qCust&&i!==curSlot){
if(!entry.active){
entry.ch.holder.position.set(KONBINI_STORE.door.x,0,KONBINI_STORE.door.z);
entry.active=true;
}
entry.ch.holder.visible=true;
entry.targetX=KONBINI_STORE.queueSpot.x;
entry.targetZ=KONBINI_STORE.queueSpot.z;
entry.targetYaw=KONBINI_STORE.queueSpot.yaw;
}else if(i===leavingSlot&&leavingTimer>0){
entry.ch.holder.visible=true;
entry.targetX=KONBINI_STORE.door.x;
entry.targetZ=KONBINI_STORE.door.z;
entry.targetYaw=Math.PI;
}else{
entry.active=false;
entry.ch.holder.visible=false;
}
}
}
function triggerLeave(custId){
leavingSlot=(Math.max(1,custId)-1)%custPool.length;
leavingTimer=1.4;
}
const uploadedTextures=new Set();
let warmPromise=null;
let texturesWarmed=false;
const warmStats={total:0,frames:0,perFrame:[]};
function warmTextures(renderer,maxPerFrame=4){
if(texturesWarmed)return Promise.resolve(warmStats);
if(warmPromise)return warmPromise;
const queue=[];
const addTex=(t)=>{
if(t&&t.isTexture&&!uploadedTextures.has(t)){
uploadedTextures.add(t);
queue.push(t);
}
};
scene.traverse((o)=>{
if(!o.material)return;
for(const m of[].concat(o.material)){
if(!m)continue;
for(const k of['map','alphaMap','emissiveMap'])addTex(m[k]);
}
});
for(const t of Object.values(itemTexCache))addTex(t);
warmStats.total=queue.length;
warmStats.frames=0;
warmStats.perFrame=[];
if(!queue.length){
texturesWarmed=true;
return Promise.resolve(warmStats);
}
const raf=typeof requestAnimationFrame==='function'?requestAnimationFrame:(fn)=>setTimeout(fn,16);
warmPromise=new Promise((resolve)=>{
const step=()=>{
const n=Math.min(maxPerFrame,queue.length);
for(let i=0;i<n;i++){
const tex=queue.shift();
try{renderer.initTexture(tex);}catch{}
}
warmStats.frames++;
warmStats.perFrame.push(n);
if(queue.length>0){
raf(step);
}else{
texturesWarmed=true;
resolve(warmStats);
}
};
raf(step);
});
return warmPromise;
}
return{
scene,
sun,
blocks:KONBINI_STORE.blocks,
showcase:{pos:new THREE.Vector3(...KONBINI_STORE.showcase.pos),look:new THREE.Vector3(...KONBINI_STORE.showcase.look)},
foreman:tencho,
tencho,
custPool,
itemMeshes,
hotCaseMesh:hotGlass,
syncShift,
triggerLeave,
warmTextures,
isTexturesWarmed:()=>texturesWarmed,
warmStats,
activeCustomerChar(st){
if(!st?.cur)return custPool[0].ch;
return custPool[(st.cur.id-1)%custPool.length].ch;
},
queueCustomerChar(st){
if(!st?.queue?.length)return null;
return custPool[(st.queue[0].id-1)%custPool.length].ch;
},
update(dt=0.016){
if(leavingTimer>0){
leavingTimer=Math.max(0,leavingTimer-dt);
if(leavingTimer<=0)leavingSlot=-1;
}
for(const entry of custPool){
if(!entry.ch.holder.visible)continue;
const pos=entry.ch.holder.position;
const dx=entry.targetX-pos.x;
const dz=entry.targetZ-pos.z;
const dist=Math.hypot(dx,dz);
if(dist>0.04){
const stepD=Math.min(dist,2.8*dt);
pos.x+=(dx/dist)*stepD;
pos.z+=(dz/dist)*stepD;
entry.ch.yaw=Math.atan2(dx,dz);
entry.ch.play('walk');
}else{
entry.ch.yaw=entry.targetYaw;
entry.ch.play('idle');
}
entry.ch.update(dt);
}
tencho.update(dt);
},
};
}
