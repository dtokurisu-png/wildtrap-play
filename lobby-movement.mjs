// World-aligned room movement and common animation selection.
// The same in-place run clip is used for all directions in the room.
export function lobbyMovementDirection(forward,lateral){
 const magnitude=Math.hypot(forward,lateral);
 if(!magnitude)return {x:0,z:0,moving:false,rotation:null};
 const x=lateral/magnitude,z=-forward/magnitude;
 return {x,z,moving:true,rotation:-Math.atan2(x,-z)};
}
export function shouldRunAnimation({area,moving,forwardKey}){
 return Boolean(moving&&(area==='home'||forwardKey));
}
