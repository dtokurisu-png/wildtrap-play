// WildTrap Play · third-person camera obstruction fading.
// Only meshes from the current environment are considered; the player is never
// faded and source materials are never mutated. Fading is reversible.
export const CAMERA_FADE_TARGET=.16;
export const CAMERA_FADE_IN_SPEED=9;
export const CAMERA_FADE_OUT_SPEED=5;

export function fadeTowards(value,target,dt,speed){
 const amount=1-Math.exp(-Math.max(0,dt)*speed);
 return value+(target-value)*amount;
}

export function createCameraOcclusion({THREE,environment,player,camera}){
 const ray=new THREE.Raycaster();
 const origin=new THREE.Vector3();
 const target=new THREE.Vector3();
 const direction=new THREE.Vector3();
 const side=new THREE.Vector3();
 const hits=new Set();
 const states=new Map();
 const samples=[{height:.5,offset:0},{height:1.15,offset:-.24},
  {height:1.65,offset:.24}];

 function restore(mesh,state){
  mesh.material=state.original;
  for(const material of state.temporary)material.dispose();
 }
 function reset(){
  for(const [mesh,state] of states)restore(mesh,state);
  states.clear();
 }
 function beginFade(mesh){
  const original=mesh.material;
  if(!original)return null;
  const sources=Array.isArray(original)?original:[original];
  const temporary=sources.map(mat=>{
   const clone=mat.clone();
   clone.transparent=true;
   clone.depthWrite=false;
   // Keep depth testing: transparent surfaces should not draw through walls.
   clone.depthTest=true;
   clone.opacity=mat.opacity;
   return clone;
  });
  const record={original,temporary,opacity:1};
  mesh.material=Array.isArray(original)?temporary:temporary[0];
  states.set(mesh,record);
  return record;
 }
 function update(dt){
  if(!environment.visible)return;
  hits.clear();
  camera.getWorldPosition(origin);
  player.updateWorldMatrix(true,false);
  camera.updateWorldMatrix(true,false);
  environment.updateWorldMatrix(true,true);
  // Three sightlines avoid a thin railing or doorway obscuring the head.
  const right=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0);
  for(const sample of samples){
   player.localToWorld(target.set(0,sample.height,0));
   target.addScaledVector(right,sample.offset);
   direction.subVectors(target,origin);
   const distance=direction.length();
   if(distance<.3)continue;
   direction.multiplyScalar(1/distance);
   ray.set(origin,direction);
   ray.near=.05;
   ray.far=Math.max(.05,distance-.28);
   // Only stage geometry; exclude avatar and UI.
   for(const hit of ray.intersectObject(environment,true)){
    const mesh=hit.object;
    if(!mesh.isMesh||mesh.userData?.noCameraFade||!mesh.visible)continue;
    hits.add(mesh);
   }
  }
  for(const mesh of hits)if(!states.has(mesh))beginFade(mesh);
  for(const [mesh,state] of states){
   if(!mesh.parent){restore(mesh,state);states.delete(mesh);continue;}
   const fade=hits.has(mesh);
   state.opacity=fadeTowards(state.opacity,fade?CAMERA_FADE_TARGET:1,dt,
    fade?CAMERA_FADE_IN_SPEED:CAMERA_FADE_OUT_SPEED);
   state.temporary.forEach((mat,i)=>{
    const original=Array.isArray(state.original)?state.original[i]:state.original;
    mat.opacity=original.opacity*state.opacity;
   });
   if(!fade&&state.opacity>.995){restore(mesh,state);states.delete(mesh);}
  }
 }
 return {update,reset,get activeCount(){return states.size}};
}
