// Fixed room security-camera anchor, just below the ceiling at the +X/+Z corner.
// The camera can yaw/pitch in place but must never track the avatar by translating.
export const ROOM_CAMERA_OFFSET=Object.freeze({x:10.55,y:7.85,z:8.5});
export const ROOM_CAMERA_FOCUS_HEIGHT=1.35;
// Comfortable on-screen region: rotation starts only near an edge.
export const ROOM_CAMERA_FRAME=Object.freeze({horizontal:.72,vertical:.68});
export function roomCameraPose(player){
 return {
  position:{...ROOM_CAMERA_OFFSET},
  target:{x:player.x,y:player.y+ROOM_CAMERA_FOCUS_HEIGHT,z:player.z}
 };
}
export function roomCameraNeedsRotation(screenX,screenY){
 return Math.abs(screenX)>ROOM_CAMERA_FRAME.horizontal ||
  Math.abs(screenY)>ROOM_CAMERA_FRAME.vertical;
}
export function roomCameraDistance(){
 const p=ROOM_CAMERA_OFFSET;
 return Math.hypot(p.x,p.y-ROOM_CAMERA_FOCUS_HEIGHT,p.z);
}
