import assert from 'node:assert/strict';
import {createCameraOcclusion,fadeTowards,CAMERA_FADE_TARGET} from '../camera-occlusion.mjs';

class Vector3 {
 constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
 set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
 copy(v){return this.set(v.x,v.y,v.z);}
 subVectors(a,b){return this.set(a.x-b.x,a.y-b.y,a.z-b.z);}
 length(){return Math.hypot(this.x,this.y,this.z);}
 multiplyScalar(v){this.x*=v;this.y*=v;this.z*=v;return this;}
 addScaledVector(v,s){this.x+=v.x*s;this.y+=v.y*s;this.z+=v.z*s;return this;}
 setFromMatrixColumn(){return this.set(1,0,0);}
}
class Raycaster {
 set(origin,direction){this.origin=origin;this.direction=direction;}
 intersectObject(environment){return environment.blocked?[{object:environment.children[0]}]:[];}
}
const source={opacity:1,transparent:false,depthWrite:true,depthTest:true,
 side:0,clone(){return {...this,dispose(){this.disposed=true;}}}};
const mesh={isMesh:true,visible:true,material:source,parent:{},userData:{}};
const environment={children:[mesh],visible:true,blocked:true,
 updateWorldMatrix(){}};
const player={updateWorldMatrix(){},localToWorld(v){return v;}};
const camera={matrixWorld:{},getWorldPosition(v){return v.set(0,2,5)},updateWorldMatrix(){}};
const fader=createCameraOcclusion({THREE:{Vector3,Raycaster},environment,player,camera});
fader.update(.1);
assert.equal(fader.activeCount,1);
assert.notEqual(mesh.material,source,'Original material should not be changed');
assert.equal(mesh.material.transparent,true);
assert.equal(mesh.material.depthWrite,false);
assert.ok(mesh.material.opacity<1,'Camera obstacle should start fading');
for(let i=0;i<40;i++)fader.update(.1);
assert.ok(Math.abs(mesh.material.opacity-CAMERA_FADE_TARGET)<.001,'Obstacle should become translucent');
assert.equal(source.opacity,1,'Original opacity should remain untouched');
environment.blocked=false;
for(let i=0;i<50;i++)fader.update(.1);
assert.equal(mesh.material,source,'Material should restore when line of sight is clear');
assert.equal(fader.activeCount,0);
environment.blocked=true;
fader.update(.2);
fader.reset();
assert.equal(mesh.material,source,'Changing rooms restores all camera-faded materials');
assert.equal(fader.activeCount,0);
assert.ok(fadeTowards(1,.2,.1,8)<1);
console.log('PASS: Occluding geometry fades smoothly and restores without altering shared material');
