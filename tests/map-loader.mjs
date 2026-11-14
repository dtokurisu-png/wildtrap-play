import assert from 'node:assert/strict';
import {getMapManifest,loadPublishedMap,pinSessionMapVersion} from '../map-loader.mjs';

const original=globalThis.fetch;
const responses={
 'maps/manifest.json':{activeVersion:'v002',releases:[
  {id:'v001',path:'maps/versions/v001.json'},
  {id:'v002',path:'maps/versions/v002.json'}]},
 'maps/versions/v001.json':{resolution:3,heights:Array(9).fill(1),nodes:[]},
 'maps/versions/v002.json':{resolution:3,heights:Array(9).fill(2),nodes:[]}
};
globalThis.fetch=async url=>{
 const path=new URL(url).pathname.split('/').slice(-3).join('/');
 const key=path.includes('maps/versions/')?path:'maps/manifest.json';
 if(!responses[key])return {ok:false,status:404};
 return {ok:true,json:async()=>responses[key]};
};
try{
 const manifest=await getMapManifest();
 assert.equal(manifest.activeVersion,'v002');
 assert.equal((await loadPublishedMap()).version,'v002');
 const old=await loadPublishedMap('v001');
 assert.equal(old.scene.heights[0],1);
 const room=pinSessionMapVersion({},'v001');
 assert.equal(room.mapVersion,'v001');
 assert.throws(()=>pinSessionMapVersion(room,'v002'),/fijada/);
 await assert.rejects(loadPublishedMap('../secret'),/no publicada/);
 console.log('PASS: Play loads frozen map snapshots and rejects session version changes');
}finally{globalThis.fetch=original;}
