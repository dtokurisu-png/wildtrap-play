import assert from 'node:assert/strict';
import {roomCameraPose,roomCameraDistance,ROOM_CAMERA_OFFSET} from '../room-camera.mjs';
const approx=(a,b)=>Math.abs(a-b)<1e-9;
const a=roomCameraPose({x:0,y:0,z:5.7});
const b=roomCameraPose({x:7.3,y:0,z:-6});
assert.ok(approx(a.position.x-a.target.x,ROOM_CAMERA_OFFSET.x));
assert.ok(approx(a.position.z-a.target.z,ROOM_CAMERA_OFFSET.z));
for(const key of ['x','y','z']){
 const before=a.position[key]-a.target[key];
 const after=b.position[key]-b.target[key];
 assert.ok(approx(before,after),'Moving must not change room camera direction: '+key);
}
const dist=v=>Math.hypot(v.position.x-v.target.x,v.position.y-v.target.y,v.position.z-v.target.z);
assert.ok(approx(dist(a),roomCameraDistance()));
assert.ok(approx(dist(b),dist(a)),'Camera distance must remain exactly constant');
console.log('PASS: fixed room-camera direction, constant distance across character motion');
