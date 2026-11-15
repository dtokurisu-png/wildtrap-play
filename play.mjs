import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {getMapManifest,loadPublishedMap,pinSessionMapVersion,WILDTRAP_SHARED_ASSETS} from './map-loader.mjs';
import {buildAdaptiveTerrain} from './adaptive-terrain-cuts.mjs';
import {createCameraOcclusion} from './camera-occlusion.mjs';
import {roomCameraPose} from './room-camera.mjs';
import {shouldRunAnimation} from './lobby-movement.mjs';
import {movementAxes,movementHeading} from './playtest-movement.mjs';
import {inPlaceClip} from './playtest-animation.mjs';

const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const canvas=$('game');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.shadowMap.enabled=false;
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x142923);
scene.fog=new THREE.FogExp2(0x142923,.012);
const hemi=new THREE.HemisphereLight(0xe6fff5,0x40543c,2.1);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffe5bc,2.25);sun.position.set(-85,140,90);scene.add(sun);
const camera=new THREE.PerspectiveCamera(65,1,.08,1600);
// Room-only optical zoom: perspective changes, never camera location or avatar scale.
const ROOM_ZOOM_AT_SPAWN=2.35;
const ROOM_ZOOM_MIN=1.05;
const ROOM_ZOOM_MAX=4.65;
const roomCameraAnchor=new THREE.Vector3(10.55,7.85,8.5);
const roomSpawnHead=new THREE.Vector3(0,1.35,5.7);
const roomReferenceDistance=roomCameraAnchor.distanceTo(roomSpawnHead);
const clock=new THREE.Clock();
const stage=new THREE.Group();scene.add(stage);
const avatar=new THREE.Group();avatar.name='Explorador 1 WT';scene.add(avatar);
const occlusion=createCameraOcclusion({THREE,environment:stage,player:avatar,camera});
const keys=new Set();
const gltfLoader=new GLTFLoader();
const state={area:'home',screen:'welcome',session:null,version:null,sceneData:null,spawn:null,
 inventory:{herbs:3,stones:2},coins:120,missionOpened:false,
 yaw:0,pitch:.25,lookTarget:new THREE.Vector3(),drag:false,lastX:0,lastY:0,
 mixer:null,idle:null,run:null,running:false,avatarReady:false,busy:false};
const palette={wall:0x547565,wood:0x91673e,gold:0xf3b659};
const geo=(geometry,color,options={})=>new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({
 color,roughness:.85,metalness:.04,...options}));
const box=(w,h,d,color)=>geo(new THREE.BoxGeometry(w,h,d),color);
function put(parent,mesh,x,y,z,rotation=0){mesh.position.set(x,y,z);mesh.rotation.y=rotation;parent.add(mesh);return mesh;}
function textTexture(text,bg='#113d31',fg='#d6fff1'){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
 const ctx=canvas.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,512,128);
 ctx.strokeStyle='#66c9a6';ctx.lineWidth=5;ctx.strokeRect(3,3,506,122);
 ctx.fillStyle=fg;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 36px system-ui';
 ctx.fillText(text,256,65,485);const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;return t;
}
function sign(parent,label,x,y,z){const mat=new THREE.MeshBasicMaterial({map:textTexture(label),side:THREE.DoubleSide});
 const plane=new THREE.Mesh(new THREE.PlaneGeometry(3.8,.95),mat);plane.position.set(x,y,z);parent.add(plane);return plane;}
function clearStage(){occlusion.reset();while(stage.children.length){const item=stage.children[0];stage.remove(item);
 item.traverse?.(node=>{node.geometry?.dispose?.();if(node.material&&node.userData?.disposeMaterial){node.material.dispose?.();}});}
}
function buildLobby(){
 clearStage();state.area='home';state.yaw=0;state.pitch=.24;
 camera.zoom=ROOM_ZOOM_AT_SPAWN;camera.updateProjectionMatrix();
 // Full-size avatar is reserved for the personal room.
 avatar.scale.setScalar(1);
 scene.background.setHex(0x1a342c);scene.fog=new THREE.FogExp2(0x1a342c,.012);
 const floor=box(23,.36,19,0x53654d);put(stage,floor,0,-.2,0);
 for(const [w,h,d,x,z] of [[23,9,.65,0,9.5],[.65,9,19,-11.5,0],[.65,9,19,11.5,0]]){
  put(stage,box(w,h,d,0x485c48),x,4.45,z);
 }
 const rear=box(23,9,.75,0x425847);put(stage,rear,0,4.45,-9.5);
  // Camera remains under the ceiling and within the room walls.
  const ceiling=put(stage,box(23,.28,19,0x35493b),0,9.08,0);
  ceiling.userData.noCameraFade=true;
 const door=box(4.25,4.2,.18,0x286f56);put(stage,door,0,2.18,-9.01);
 put(stage,box(4.75,.25,.4,0xd4a85e),0,4.42,-8.75);
 for(const x of [-2.45,2.45])put(stage,box(.3,4.3,.45,0xd4a85e),x,2.14,-8.78);
 sign(stage,'CAZAR  /  TIENDA',0,5.3,-8.77);
 // Rest area and the player's personal bed.
 put(stage,box(5,.7,2.65,0x57412f),-6,.45,2.4);
 put(stage,box(4.6,.28,2.25,0x7095a0),-6,.93,2.4);
 put(stage,box(1.1,.23,1.8,0xdedbb9),-7.48,1.21,2.4);
 put(stage,box(5.4,.18,3.1,0x9b6d43),-6,.13,2.4);
 sign(stage,'DESCANSO',-6,3.35,-8.95);
 // Pet corner: small friendly stylized mushroom, no player pet progress simulated.
 const pad=geo(new THREE.CylinderGeometry(2.15,2.15,.15,22),0x2b6655);
 put(stage,pad,6,.10,2.7);
 const pet=geo(new THREE.SphereGeometry(.67,16,12),0xc8e3b2);put(stage,pet,6,.85,2.7);
 const cap=geo(new THREE.SphereGeometry(1.02,16,12,0,Math.PI*2,0,Math.PI/2),0x2ac5a3);
 put(stage,cap,6,1.10,2.7);
 for(const x of [5.77,6.23])put(stage,geo(new THREE.SphereGeometry(.075,8,8),0x153429),x,.91,2.07);
 sign(stage,'MASCOTA',6,3.35,-8.95);
 const shelf=box(4,2,.7,0x73583c);put(stage,shelf,7.2,1.2,-5.5);
 for(let i=0;i<4;i++){put(stage,box(.4,.55,.4,i%2?0x8ebf9b:0xdaba65),5.8+i*.9,2.5,-5.5)}
 for(const [x,z] of [[-9,-7],[9,-7],[-9,7],[9,7]])
 put(stage,geo(new THREE.CylinderGeometry(.16,.24,3,8),0xcab780),x,1.5,z);
 avatar.position.set(0,0,5.7);
 const pose=roomCameraPose(avatar.position);
 camera.position.set(pose.position.x,pose.position.y,pose.position.z);
 state.lookTarget.set(pose.target.x,pose.target.y,pose.target.z);
 camera.lookAt(state.lookTarget);
 updateHud();
}
function heightAt(map,x,z){
 const n=map.resolution,size=map.size,hs=map.heights;
 const xx=clamp((x/size+.5)*(n-1),0,n-1),zz=clamp((z/size+.5)*(n-1),0,n-1);
 const ix=Math.floor(xx),iz=Math.floor(zz),tx=xx-ix,tz=zz-iz;
 const ix1=Math.min(ix+1,n-1),iz1=Math.min(iz+1,n-1);
 const a=hs[iz*n+ix],b=hs[iz*n+ix1],c=hs[iz1*n+ix],d=hs[iz1*n+ix1];
 return ((a*(1-tx)+b*tx)*(1-tz)+(c*(1-tx)+d*tx)*tz);
}
function buildTerrainGeometry(map){
 const n=map.resolution;
 const mesh=new THREE.PlaneGeometry(map.size,map.size,n-1,n-1);mesh.rotateX(-Math.PI/2);
 const v=mesh.getAttribute('position'),colors=new Float32Array(n*n*3);
 const color=new THREE.Color();
 for(let i=0;i<n*n;i++){
  const h=map.heights[i];v.setY(i,h);
  const grass=clamp(.34+h*.0018,.32,.60);
  color.setRGB(grass*.54,grass*.90,grass*.65);
  colors[i*3]=color.r;colors[i*3+1]=color.g;colors[i*3+2]=color.b;
 }
 mesh.setAttribute('color',new THREE.BufferAttribute(colors,3));
 mesh.computeVertexNormals();
 const cuts=map.cuts3d||[],holes=map.holes||[];
 if(cuts.length||holes.length){
  const a=buildAdaptiveTerrain({
   positions:mesh.getAttribute('position').array,
   colors:mesh.getAttribute('color').array,
   normals:mesh.getAttribute('normal').array,
   uvs:mesh.getAttribute('uv').array,
   indices:mesh.index.array
  },holes,cuts,map.size,n);
  if(a&&!a.stats?.incomplete){
   const cut=new THREE.BufferGeometry();
   cut.setAttribute('position',new THREE.Float32BufferAttribute(a.positions,3));
   cut.setAttribute('color',new THREE.Float32BufferAttribute(a.colors,3));
   cut.setAttribute('uv',new THREE.Float32BufferAttribute(a.uvs,2));
   cut.setIndex(a.indices);cut.computeVertexNormals();mesh.dispose();return cut;
  }
 }
 return mesh;
}
async function addPrefab(node,map){
 const files={
  'stone-cave':'stone ruin 3d model.glb',
  'rocky-cave':'rocky ring 3d model.glb',
  'stylized-cave':'stylized rock ring 3d model.glb',
  'mountain':'montañá.glb'
 };
 const name=files[node.prefabId];if(!name)return;
 try{
  const gltf=await gltfLoader.loadAsync(WILDTRAP_SHARED_ASSETS+'terrain/'+encodeURIComponent(name));
  if(state.area!=='hunt')return;
  const model=gltf.scene;
  const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());
  // Same nominal span as editor's prefab catalog; keep author's node scale.
  const span=node.prefabId==='mountain'?65:46;
  const scalar=(span/Math.max(size.x,size.z,1e-5))*(Number(node.scale)||1);
  model.scale.setScalar(scalar);
  const x=Number(node.x)||0,z=Number(node.z)||0;
  const cave=node.prefabId!=='mountain';
  model.position.set(x,cave&&Number.isFinite(node.y)?node.y:heightAt(map,x,z)+(Number(node.offsetY)||0),z);
  model.rotation.y=Number(node.rotation)||0;
  model.traverse(obj=>{if(obj.isMesh){obj.frustumCulled=false;obj.material?.side&&(obj.material.side=THREE.DoubleSide)}});
  stage.add(model);
 }catch(err){console.warn('Prefab no disponible:',node.prefabId,err);}
}
function buildHunt(map,spawn){
 clearStage();state.area='hunt';state.yaw=0;state.pitch=.25;
 // Never apply the room's lens adjustment to jungle gameplay.
 camera.zoom=1;camera.updateProjectionMatrix();
 // Published hunting world: half the room avatar's size, regardless of GLB load timing.
 avatar.scale.setScalar(.5);
 scene.background.setHex(0xb7cbbf);scene.fog=new THREE.FogExp2(0xa9c5b7,.0022);
 const ground=new THREE.Mesh(buildTerrainGeometry(map),new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide}));
 ground.name='Published map geometry';stage.add(ground);
 for(const node of map.nodes||[])if(node.kind==='prefab')void addPrefab(node,map);
 // Spawn marker only in the demo; real multiplayer can hide this reference.
 const circle=geo(new THREE.TorusGeometry(1.55,.09,10,48),0x00f0bb,{emissive:0x008866,emissiveIntensity:.35});
 circle.rotation.x=-Math.PI/2;put(stage,circle,spawn.x,heightAt(map,spawn.x,spawn.z)+.15,spawn.z);
 avatar.position.set(spawn.x,heightAt(map,spawn.x,spawn.z),spawn.z);
 state.lookTarget.copy(avatar.position).add(new THREE.Vector3(0,1.3,0));
 updateHud();
}
function fallbackAvatar(){
 const shell=new THREE.Group();
 const body=geo(new THREE.CapsuleGeometry(.35,.85,5,9),0x57d9bb);body.position.y=.90;shell.add(body);
 const head=geo(new THREE.SphereGeometry(.3,12,12),0xd7c6a3);head.position.y=1.65;shell.add(head);
 avatar.add(shell);
}
async function loadAvatar(){
 try{
  const gltf=await gltfLoader.loadAsync(WILDTRAP_SHARED_ASSETS+'explorador%201%20wt.glb');
  const visual=new THREE.Group();visual.add(gltf.scene);
  const box3=new THREE.Box3().setFromObject(visual),height=box3.max.y-box3.min.y;
  visual.scale.setScalar(clamp(1.8/Math.max(height,.0001),.00001,1e4));
  visual.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(visual),center=bounds.getCenter(new THREE.Vector3());
  visual.position.set(-center.x,-bounds.min.y,-center.z);
  visual.rotation.y=Math.PI;avatar.add(visual);
  if(gltf.animations.length){
   const mixer=new THREE.AnimationMixer(gltf.scene);
   const clips=gltf.animations;
   state.mixer=mixer;state.idle=mixer.clipAction(inPlaceClip(clips[2]||clips[0]).clip);
   state.run=mixer.clipAction(inPlaceClip(clips[4]||clips[2]||clips[0]).clip);
   state.idle.play();
  }
  state.avatarReady=true;
 }catch(err){console.warn('Explorador GLB no disponible, usando avatar básico:',err);fallbackAvatar();}
}
function animateAvatar(moving){
 if(!state.mixer||!state.run||!state.idle)return;
 if(state.running!==moving){
  state.running=moving;
  const from=moving?state.idle:state.run,to=moving?state.run:state.idle;
  to.reset().play();from.crossFadeTo(to,.16,false);
 }
}
function getDoorDistance(){return Math.hypot(avatar.position.x,avatar.position.z+9.0)}
function getPetDistance(){return Math.hypot(avatar.position.x-6,avatar.position.z-2.7)}
function getBedDistance(){return Math.hypot(avatar.position.x+6,avatar.position.z-2.4)}
function showToast(message){
 $('toast').textContent=message;$('toast').classList.add('show');
 clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>$('toast').classList.remove('show'),2600);
}
function showPanel(html,screen){
 state.screen=screen;
 $('panel').innerHTML=html;
 $('shade').hidden=false;keys.clear();
 document.activeElement?.blur?.();
}
function hidePanel(){state.screen='none';$('shade').hidden=true;canvas.focus({preventScroll:true});}
function title(kicker,title,description){
 return '<div class="eyebrow">'+kicker+'</div><h1 id="panelTitle">'+title+'</h1><p>'+description+'</p>';
}
const btn=(id,label,klass='')=>'<button type="button" id="'+id+'" class="'+klass+'">'+label+'</button>';
const escapeText=value=>String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
function welcome(){
 showPanel(title('WILDTRAP PLAY · prototipo 0.1','Tu aventura empieza aquí',
 'Demostración navegable del recorrido de un jugador: habitación personal → salida → partida en solitario → escenario publicado.')+
 '<div class="information"><strong>Qué es real en esta prueba</strong><p class="small">Se carga el mapa independiente desde WildTrap Play, se fija la versión de sesión y se utiliza el spawn del jugador 1. El modo en solitario es local; todavía no hay backend ni conexión online.</p></div>'+
 '<div class="actions">'+btn('welcomeStart','Entrar a mi habitación','primary')+'</div>'+
 '<p id="version">El mapa no se modifica desde esta aplicación.</p>','welcome');
 $('welcomeStart').onclick=()=>{hidePanel();showToast('Bienvenido a tu habitación. Acércate a la puerta.');};
}
function doorMenu(){
 if(state.area!=='home')return;
 showPanel(title('PUERTA DE SALIDA','¿Adónde quieres ir?','Desde esta puerta puedes comerciar o comenzar una cacería.')+
 '<div class="grid"><div class="tile"><span class="eyebrow">Exploración</span><strong>Ir a cazar</strong><span class="small">Seleccionar partida y cargar una misión.</span></div><div class="tile"><span class="eyebrow">Comercio</span><strong>Tienda</strong><span class="small">Vender recursos de demostración.</span></div></div>'+
 '<div class="actions">'+btn('doorHunt','Ir a cazar','primary')+btn('doorShop','Abrir tienda')+btn('doorBack','Volver a habitación','ghost')+'</div>','door');
 $('doorHunt').onclick=huntMenu;$('doorShop').onclick=shopMenu;$('doorBack').onclick=hidePanel;
}
function shopMenu(){
 showPanel(title('TIENDA · DEMOSTRACIÓN','Puesto de suministros',
 'Puedes probar el flujo de venta. Estas cantidades son de ejemplo y solo existen en esta sesión local.')+
 '<div class="information"><div class="row"><span>Monedas</span><strong id="coins">'+state.coins+'</strong></div>'+
 '<div class="row"><span>Hierbas · '+state.inventory.herbs+' unidades</span>'+btn('sellHerb','Vender +15')+'</div>'+
 '<div class="row"><span>Piedras · '+state.inventory.stones+' unidades</span>'+btn('sellStone','Vender +10')+'</div></div>'+
 '<div class="actions">'+btn('shopBack','Volver a la puerta','ghost')+'</div>','shop');
 $('sellHerb').disabled=!state.inventory.herbs;$('sellStone').disabled=!state.inventory.stones;
 $('sellHerb').onclick=()=>{state.inventory.herbs--;state.coins+=15;shopMenu()};
 $('sellStone').onclick=()=>{state.inventory.stones--;state.coins+=10;shopMenu()};
 $('shopBack').onclick=doorMenu;
}
function huntMenu(){
 showPanel(title('PREPARAR PARTIDA','¿Cómo quieres cazar?',
 'Elige una modalidad. Esta primera prueba implementa la conexión local de un jugador en solitario.')+
 '<div class="tile"><strong>Un jugador · Solo</strong><span class="small">Crea una sesión local, fija la versión del mapa y entra a la arena.</span></div>'+
 '<div class="actions">'+btn('chooseSolo','Crear partida en solitario','primary')+'</div>'+
 '<div class="divider"></div><div class="grid"><div class="tile"><strong>Crear sala con amigos</strong><span class="small">Pendiente: backend y sistema de invitaciones.</span></div><div class="tile"><strong>Unirme a un amigo</strong><span class="small">Pendiente: conexión multijugador.</span></div></div>'+
 '<div class="actions">'+btn('friendsCreate','Próximamente')+btn('huntBack','Volver','ghost')+'</div>','hunt');
 $('friendsCreate').disabled=true;
 $('chooseSolo').onclick=prepareSolo;$('huntBack').onclick=doorMenu;
}
async function prepareSolo(){
 if(state.busy)return;
 state.busy=true;
 showPanel(title('CREANDO SESIÓN','Conectando en solitario…','Seleccionando una versión estable del escenario.')+
 '<div class="information" id="loadingStatus">Leyendo el manifiesto publicado…</div>','loading');
 try{
  const manifest=await getMapManifest();
  $('loadingStatus').textContent='Versión '+manifest.activeVersion+' · cargando geometría…';
  const loaded=await loadPublishedMap(manifest.activeVersion);
  const spawn=(loaded.scene.nodes||[]).find(n=>n.kind==='playerSpawn'&&n.playerSlot===1);
  if(!spawn||!Number.isFinite(spawn.x)||!Number.isFinite(spawn.z))throw Error('No existe un Spawn válido para el jugador 1.');
  const session=pinSessionMapVersion({id:'LOCAL-'+Date.now().toString(36).toUpperCase(),type:'solo',host:'local-player-1',players:['local-player-1']},loaded.version);
  state.session=session;state.sceneData=loaded.scene;state.version=loaded.version;state.spawn=spawn;
  showPanel(title('SALA CREADA','Partida en solitario preparada',
    'La sala está creada localmente. Tu escenario ya tiene una versión asignada y no cambiará aunque se publique otra.')+
    '<div class="information"><div class="row"><span>Modalidad</span><strong>Solo · 1 jugador</strong></div>'+
    '<div class="row"><span>Sala</span><span class="pill">'+escapeText(session.id)+'</span></div>'+
    '<div class="row"><span>Mapa</span><span class="pill">'+escapeText(session.mapVersion)+'</span></div>'+
    '<div class="row"><span>Spawn jugador 1</span><span>X '+spawn.x.toFixed(1)+' · Z '+spawn.z.toFixed(1)+'</span></div>'+
    '<div class="row"><span>Conexión</span><strong>Local · sin servidor</strong></div></div>'+
    '<div class="actions">'+btn('startMission','Entrar a la cacería','primary')+btn('cancelRoom','Cancelar','ghost')+'</div>','room');
  $('startMission').onclick=startMission;
  $('cancelRoom').onclick=()=>{state.session=null;state.sceneData=null;hidePanel();showToast('Sala local cancelada.')};
 }catch(err){showPanel(title('NO SE PUDO CREAR LA PARTIDA','Error al cargar mapa',escapeText(err.message))+
  '<div class="actions">'+btn('retrySolo','Reintentar','primary')+btn('errorBack','Regresar','ghost')+'</div>','error');
  $('retrySolo').onclick=prepareSolo;$('errorBack').onclick=huntMenu;
 }finally{state.busy=false;}
}
function startMission(){
 if(!state.session||!state.sceneData||!state.spawn)return;
 buildHunt(state.sceneData,state.spawn);
 state.missionOpened=true;
 updateHud();
 // Mission conditions shown only AFTER the player is actually spawned in the scene.
 showPanel(title('DENTRO DEL ESCENARIO','¡Cacería iniciada!',
 'Ya estás dentro de la versión publicada del mapa. Estas son las condiciones de esta misión de prueba.')+
 '<div class="information"><div class="row"><span>Objetivo</span><strong>Reconocer la zona de aparición</strong></div>'+
 '<div class="row"><span>Estado</span><strong>Exploración libre</strong></div>'+
 '<div class="row"><span>Jugador</span><strong>1 / 1</strong></div>'+
 '<div class="row"><span>Versión fijada</span><span class="pill">'+escapeText(state.session.mapVersion)+'</span></div></div>'+
 '<p class="small">Los enemigos, las recompensas y las reglas definitivas se incorporarán al sistema de misiones. El mapa sí es el publicado en WildTrap Play.</p>'+
 '<div class="actions">'+btn('missionContinue','Comenzar a explorar','primary')+'</div>','mission');
 $('missionContinue').onclick=hidePanel;
}
function returnHome(){
 state.session=null;state.sceneData=null;state.spawn=null;state.version=null;state.missionOpened=false;
 buildLobby();hidePanel();showToast('Has regresado a tu habitación.');
}
function openMenu(){
 const inHunt=state.area==='hunt';
 showPanel(title('WILDTRAP PLAY','Menú de '+(inHunt?'cacería':'habitación'),
 inHunt?'Sesión en solitario · mapa '+escapeText(state.version||''): 'Zona personal · demostración navegable')+
 '<div class="actions">'+btn('resumeGame','Continuar','primary')+
 (inHunt?btn('returnHome','Volver a la habitación'):btn('openDoor','Puerta · Cazar/Tienda'))+'</div>'+
 '<p class="small">Prueba independiente del editor. No se modifican tus archivos ni la publicación del mapa.</p>','menu');
 $('resumeGame').onclick=hidePanel;
 if(inHunt)$('returnHome').onclick=()=>{if(confirm('¿Salir de la cacería local y volver a la habitación?'))returnHome()};
 else $('openDoor').onclick=doorMenu;
}
function updateHud(){
 $('hud').hidden=false;
 $('statusLine').textContent=state.area==='home'?'Habitación del explorador':'Cacería · Jugador 1';
 $('details').textContent=state.area==='home'?'Mi habitación · lobby local':
  'Solo · mapa '+(state.version||'--')+' · 1/1';
 $('mission').hidden=state.area!=='hunt'||!state.missionOpened;
 $('missionInfo').textContent='Exploración libre · localizar la zona de aparición · '+(state.version||'');
 $('interact').hidden=true;
}
function interaction(){
 if(state.area!=='home')return;
 if(getDoorDistance()<3.9)return doorMenu();
 if(getPetDistance()<2.8)return showToast('Tu mascota está descansando. Aquí irá el sistema de crianza y mejoras.');
 if(getBedDistance()<3.1)return showToast('Tu cama: punto de descanso personal (prueba de interfaz).');
 showToast('Acércate a la puerta para salir o comerciar.');
}
$('menuButton').onclick=openMenu;
$('interactButton').onclick=interaction;
window.addEventListener('keydown',e=>{
 if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight','KeyE','Escape'].includes(e.code))e.preventDefault();
 if(state.screen!=='none'){
  if(e.code==='Escape'&&['door','shop','hunt','menu'].includes(state.screen))hidePanel();
  return;
 }
 keys.add(e.code);
 if(e.code==='KeyE'&&!e.repeat)interaction();
 if(e.code==='Escape')openMenu();
});
window.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',()=>keys.clear());
canvas.addEventListener('pointerdown',e=>{if(state.screen!=='none'||state.area==='home')return;state.drag=true;state.lastX=e.clientX;state.lastY=e.clientY;canvas.setPointerCapture?.(e.pointerId)});
canvas.addEventListener('pointermove',e=>{if(!state.drag||state.area==='home')return;state.yaw-=(e.clientX-state.lastX)*.0035;state.pitch=clamp(state.pitch+(e.clientY-state.lastY)*.0024,-.12,.7);state.lastX=e.clientX;state.lastY=e.clientY});
canvas.addEventListener('pointerup',()=>state.drag=false);
canvas.addEventListener('pointercancel',()=>state.drag=false);
canvas.addEventListener('contextmenu',e=>e.preventDefault());
function resize(){const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}
window.addEventListener('resize',resize);
// Single movement function shared by real frames and deterministic browser tests.
function stepMovement(dt,open){
 const move=movementAxes(keys,state.area==='home'?0:state.yaw);
 let moving=false;
 if(!open&&move.moving){
  const roomSpeed=(keys.has('ShiftLeft')||keys.has('ShiftRight'))?6:3.8;
  const speed=state.area==='home'?roomSpeed:roomSpeed*.5;
  const dx=move.x*speed*dt,dz=move.z*speed*dt;
  const x=avatar.position.x+dx,z=avatar.position.z+dz;
  const oldX=avatar.position.x,oldZ=avatar.position.z;
  if(state.area==='home'){
   avatar.position.x=clamp(x,-10.25,10.25);
   avatar.position.z=clamp(z,-7.1,8.5);
   avatar.position.y=0;
  }else if(state.sceneData){
   const limit=state.sceneData.size*.5-1.5;
   avatar.position.x=clamp(x,-limit,limit);
   avatar.position.z=clamp(z,-limit,limit);
   const ground=heightAt(state.sceneData,avatar.position.x,avatar.position.z);
   avatar.position.y=THREE.MathUtils.damp(avatar.position.y,ground,13,dt);
  }
  // Face the direction of *actual* travel, including diagonals.
  // At room limits the player must not run against the wall in place.
  const traveledX=avatar.position.x-oldX,traveledZ=avatar.position.z-oldZ;
  const bounds=state.area==='home'?{minX:-10.25,maxX:10.25,minZ:-7.1,maxZ:8.5}:
   {minX:-state.sceneData.size*.5+1.5,maxX:state.sceneData.size*.5-1.5,
    minZ:-state.sceneData.size*.5+1.5,maxZ:state.sceneData.size*.5-1.5};
  // Some render frames have dt≈0. Treat a held key as moving when the
  // requested direction is clear, rather than flickering to idle every frame.
  const probe=.01;
  const canAdvanceX=Math.abs(clamp(avatar.position.x+move.x*probe,bounds.minX,bounds.maxX)-avatar.position.x)>1e-7;
  const canAdvanceZ=Math.abs(clamp(avatar.position.z+move.z*probe,bounds.minZ,bounds.maxZ)-avatar.position.z)>1e-7;
  moving=canAdvanceX||canAdvanceZ||Math.hypot(traveledX,traveledZ)>1e-7;
  if(moving)avatar.rotation.y=-movementHeading(move.x,move.z);
 }
 // Same in-place run clip on W/A/S/D and diagonals, in both areas.
 // Only the facing direction changes; running stops when movement stops.
 animateAvatar(shouldRunAnimation({area:state.area,moving,forwardKey:keys.has('KeyW')||keys.has('ArrowUp')}));
 return moving;
}
function frame(){
 requestAnimationFrame(frame);
 const dt=Math.min(clock.getDelta(),.06);
 const open=state.screen!=='none';
 // Share the exact eight-way movement math from the WildTrap editor.
 // Lobby keeps its fixed-camera, world-aligned controls.
 stepMovement(dt,open);
 if(state.mixer)state.mixer.update(dt);
 if(state.area==='home'&&!open){
  const nearDoor=getDoorDistance()<3.9,nearPet=getPetDistance()<2.8,nearBed=getBedDistance()<3.1;
  $('interact').hidden=!(nearDoor||nearPet||nearBed);
  $('interactButton').textContent=nearDoor?'E · Cazar o ir a la tienda':nearPet?'E · Ver mascota':'E · Descansar';
 }
 $('coords').textContent='X '+avatar.position.x.toFixed(1)+' · Z '+avatar.position.z.toFixed(1);
 if(state.area==='home'){
  // Fixed interior position; rotate smoothly only as the player leaves the frame's dead zone.
  const pose=roomCameraPose(avatar.position,state.lookTarget);
  camera.position.set(pose.position.x,pose.position.y,pose.position.z);
  state.lookTarget.lerp(new THREE.Vector3(pose.target.x,pose.target.y,pose.target.z),1-Math.exp(-dt*5));
  camera.lookAt(state.lookTarget);
  // Keep the avatar approximately the same on-screen size at any distance.
  // Zoom is purely optical; camera.position remains determined by roomCameraPose.
  const head=avatar.position.clone().add(new THREE.Vector3(0,1.35,0));
  const distance=camera.position.distanceTo(head);
  const desiredZoom=clamp(ROOM_ZOOM_AT_SPAWN*distance/roomReferenceDistance,ROOM_ZOOM_MIN,ROOM_ZOOM_MAX);
  const nextZoom=THREE.MathUtils.damp(camera.zoom,desiredZoom,5,dt);
  if(Math.abs(nextZoom-camera.zoom)>1e-5){camera.zoom=nextZoom;camera.updateProjectionMatrix();}
 }else{
  const fwd=new THREE.Vector3(Math.sin(state.yaw),0,-Math.cos(state.yaw));
  const desired=avatar.position.clone().addScaledVector(fwd,-5.5).add(new THREE.Vector3(.45,2.9+state.pitch*3,0));
  state.lookTarget.lerp(avatar.position.clone().addScaledVector(fwd,2.0).add(new THREE.Vector3(0,1.5-state.pitch*1.5,0)),1-Math.exp(-dt*10));
  camera.position.lerp(desired,1-Math.exp(-dt*8));camera.lookAt(state.lookTarget);
 }
 occlusion.update(dt);
 renderer.render(scene,camera);
 if(state.smokeRoomCameraStart){
  const origin=state.smokeRoomCameraStart;
  if(avatar.position.distanceTo(origin)>.25){
   keys.delete('KeyW');
   const pose=roomCameraPose(avatar.position);
   const actual=[avatar.position.x,avatar.position.y,avatar.position.z,camera.position.x,camera.position.y,camera.position.z];
   const correct=actual.every(Number.isFinite)&&
    camera.position.distanceTo(new THREE.Vector3(pose.position.x,pose.position.y,pose.position.z))<.001&&
    state.area==='home';
   document.documentElement.dataset.roomCamera=correct?'PASS':'FAIL';
   if(!correct)document.documentElement.dataset.roomCameraError='Coordinates or camera offset incorrect';
   state.smokeRoomCameraStart=null;
  }
 }
}
buildLobby();welcome();resize();frame();
loadAvatar();
// Deterministic movement regression exercises the actual frame loop instead of
// relying on Chrome's virtual timers (which can complete before the browser paints).
if(new URLSearchParams(location.search).get('smoke')==='room-camera'){
 $('welcomeStart').click();
 state.smokeRoomCameraStart=avatar.position.clone();
 keys.add('KeyW');
}
// Optional deterministic browser smoke flow; never runs in normal gameplay.
if(['solo','hunt-directions'].includes(new URLSearchParams(location.search).get('smoke'))){
 (async()=>{
  try{
   $('welcomeStart').click();
   avatar.position.set(0,0,-7.5);
   interaction();
   if(state.screen!=='door')throw Error('Door interaction did not open');
   $('doorHunt').click();
   if(state.screen!=='hunt')throw Error('Hunt selection did not open');
   $('chooseSolo').click();
   const deadline=Date.now()+25000;
   while(state.screen==='loading'&&Date.now()<deadline)await new Promise(r=>setTimeout(r,150));
   if(state.screen!=='room')throw Error('Local room creation: '+state.screen);
   $('startMission').click();
   if(state.area!=='hunt'||state.screen!=='mission'||!state.session?.mapVersion)
    throw Error('Hunt scene did not appear with frozen map');
   $('missionContinue').click();
   if(state.screen!=='none')throw Error('Mission conditions did not close');
   if(new URLSearchParams(location.search).get('smoke')==='hunt-directions'){
    // Exercise the same movement function with a fixed time step. Browser GPU
    // scheduling can produce zero-time frames, so don't rely on RAF frame count.
    const dirs=[['KeyW'],['KeyS'],['KeyA'],['KeyD'],
     ['KeyW','KeyA'],['KeyW','KeyD'],['KeyS','KeyA'],['KeyS','KeyD']];
    for(const codes of dirs){
     keys.clear();for(const code of codes)keys.add(code);
     const before=avatar.position.clone();
     stepMovement(.10,false);
     const delta=avatar.position.clone().sub(before);
     const expected=movementAxes(new Set(codes),state.yaw);
     const distance=Math.hypot(delta.x,delta.z);
     const alignment=(delta.x*expected.x+delta.z*expected.z)/(distance||1);
     const angle=movementHeading(expected.x,expected.z);
     const angularError=Math.atan2(Math.sin(avatar.rotation.y+angle),Math.cos(avatar.rotation.y+angle));
     if(distance<.05||alignment<.999||Math.abs(angularError)>.001||
       (state.mixer&&!state.running))
      throw Error('Movimiento de cacería incorrecto: '+codes.join('+'));
    }
    keys.clear();stepMovement(.10,false);
    document.documentElement.dataset.huntDirections='PASS';
    document.documentElement.dataset.huntDirectionsChecked='8';
   }
   document.documentElement.dataset.smoke='PASS';
   document.documentElement.dataset.smokeVersion=state.session.mapVersion;
  }catch(error){
   document.documentElement.dataset.smoke='FAIL';
   document.documentElement.dataset.smokeError=error.message;
   console.error(error);
  }
 })();
}

