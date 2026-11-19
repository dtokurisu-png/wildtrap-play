// Sync the latest committed WildTrap scene into Play as an immutable release.
// Never mutate historical versions or active running sessions.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const source='.wildtrap-upstream/assets/terrain/wildtrap-mobile-world.json';
const raw=fs.readFileSync(source,'utf8'),scene=JSON.parse(raw);
if(scene.size!==630||!Number.isInteger(scene.resolution)||
 !Array.isArray(scene.heights)||scene.heights.length!==scene.resolution**2||
 !scene.nodes?.some(n=>n.kind==='playerSpawn'&&n.playerSlot===1))
 throw Error('WildTrap source map is incomplete; refusing to replace Play snapshot');
const blob=createHash('sha1').update('blob '+Buffer.byteLength(raw)+'\0'+raw).digest('hex');
const version='wt-'+blob.slice(0,12),path='maps/versions/'+version+'.json';
const m=JSON.parse(fs.readFileSync('maps/manifest.json','utf8'));
if(!Array.isArray(m.releases))throw Error('Invalid Play manifest');
if(!fs.existsSync(path)){fs.mkdirSync('maps/versions',{recursive:true});fs.writeFileSync(path,raw)}
else if(fs.readFileSync(path,'utf8')!==raw)throw Error('Immutable scene content changed: '+version);
if(m.activeVersion!==version||!fs.existsSync('maps/current.json')||fs.readFileSync('maps/current.json','utf8')!==raw){
 m.activeVersion=version;m.activePath=path;m.publishedAt=new Date().toISOString();
 if(!m.releases.some(r=>r.id===version))m.releases.push({id:version,path,source:'wildtrap/main:assets/terrain/wildtrap-mobile-world.json',notes:'Sincronización de WildTrap: terreno, texturas, acantilados y spawns'});
 fs.writeFileSync('maps/current.json',raw);
 fs.writeFileSync('maps/manifest.json',JSON.stringify(m,null,2)+'\n');
 console.log('Synced current WildTrap map to Play version '+version);
}else console.log('Play map already synced: '+version);
