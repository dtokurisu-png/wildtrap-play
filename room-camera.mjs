// Room-only camera: fixed inside the upper corner (+X, +Z), facing inward.
// Never translate with the avatar; rotate only when it leaves the framing zone.
export const ROOM_CAMERA_OFFSET=Object.freeze({x:10.55,y:7.85,z:8.5});
export const ROOM_CAMERA_FOCUS_HEIGHT=1.35;
export const ROOM_CAMERA_DEAD_ZONE=Object.freeze({x:2.6,z:2.15});
export function roomCameraPose(player,previousTarget){
 const target=previousTarget
  ? {x:previousTarget.x,y:player.y+ROOM_CAMERA_FOCUS_HEIGHT,z:previousTarget.z}
  : {x:player.x,y:player.y+ROOM_CAMERA_FOCUS_HEIGHT,z:player.z};
 target.x=Math.min(Math.max(target.x,player.x-ROOM_CAMERA_DEAD_ZONE.x),player.x+ROOM_CAMERA_DEAD_ZONE.x);
 target.z=Math.min(Math.max(target.z,player.z-ROOM_CAMERA_DEAD_ZONE.z),player.z+ROOM_CAMERA_DEAD_ZONE.z);
 return {position:{...ROOM_CAMERA_OFFSET},target};
}
export function roomCameraDistance(){
 const p=ROOM_CAMERA_OFFSET;
 return Math.hypot(p.x,p.y-ROOM_CAMERA_FOCUS_HEIGHT,p.z);
}
