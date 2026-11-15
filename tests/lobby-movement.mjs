import assert from 'node:assert/strict';
import {lobbyMovementDirection,shouldRunAnimation} from '../lobby-movement.mjs';

for(const [name,forward,lateral] of [
 ['W',1,0],['S',-1,0],['A',0,-1],['D',0,1],
 ['W+A',1,-1],['W+D',1,1],['S+A',-1,-1],['S+D',-1,1]
]){
 const direction=lobbyMovementDirection(forward,lateral);
 assert.equal(direction.moving,true,name+' must move');
 assert.ok(Math.abs(Math.hypot(direction.x,direction.z)-1)<1e-10,name+' speed is normalized');
 const facedX=-Math.sin(direction.rotation),facedZ=-Math.cos(direction.rotation);
 assert.ok(Math.abs(facedX-direction.x)<1e-10&&Math.abs(facedZ-direction.z)<1e-10,name+' faces its movement');
 assert.equal(shouldRunAnimation({area:'home',moving:true,forwardKey:forward>0}),true,name+' plays run in lobby');
}
assert.equal(shouldRunAnimation({area:'home',moving:false,forwardKey:true}),false);
assert.equal(shouldRunAnimation({area:'hunt',moving:true,forwardKey:false}),false,'Hunting behavior remains unchanged');
assert.equal(shouldRunAnimation({area:'hunt',moving:true,forwardKey:true}),true);
console.log('PASS: lobby run animation for W/A/S/D and all diagonals; facing and hunt unaffected');
