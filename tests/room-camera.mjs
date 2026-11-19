import assert from 'node:assert/strict';
import {roomCameraPose,roomCameraDistance,ROOM_CAMERA_OFFSET} from '../room-camera.mjs';
const approx=(a,b)=>Math.abs(a-b)<1e-9;
const a=roomCameraPose({x:0,y:0,z:5.7});
const b=roomCameraPose({x:7.3,y:0,z:-6});
for(const pose of [a,b])for(const axis of ['x','y','z'])
 assert.ok(approx(pose.position[axis],ROOM_CAMERA_OFFSET[axis]),'Fixed room camera must not translate: '+axis);
assert.ok(approx(a.target.z,5.7),'Focus tracks original room spawn');
assert.ok(approx(b.target.x,7.3),'Focus tracks player outside framing dead zone');
const origin=roomCameraPose({x:0,y:0,z:0});
const distance=Math.hypot(origin.position.x-origin.target.x,origin.position.y-origin.target.y,origin.position.z-origin.target.z);
assert.ok(approx(distance,roomCameraDistance()),'Reference camera distance matches origin');
console.log('PASS: fixed room camera position and player-follow focus');
