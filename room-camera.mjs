// Fixed-angle room camera. Translation follows the player but orientation and
// player-to-camera separation never depend on movement, heading, or mouse.
export const ROOM_CAMERA_OFFSET=Object.freeze({x:10,y:8.5,z:12.5});
export const ROOM_CAMERA_FOCUS_HEIGHT=1.35;
export function roomCameraPose(player){
 return {
  position:{x:player.x+ROOM_CAMERA_OFFSET.x,y:player.y+ROOM_CAMERA_OFFSET.y,z:player.z+ROOM_CAMERA_OFFSET.z},
  target:{x:player.x,y:player.y+ROOM_CAMERA_FOCUS_HEIGHT,z:player.z}
 };
}
export function roomCameraDistance(){
 const p=ROOM_CAMERA_OFFSET;
 return Math.hypot(p.x,p.y-ROOM_CAMERA_FOCUS_HEIGHT,p.z);
}
