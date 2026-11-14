// WildTrap Play only consumes explicit, immutable published map versions.
// This file is independent from the WildTrap editor and its local draft.
const ROOT=new URL('./',import.meta.url);
async function json(path){
 const response=await fetch(new URL(path,ROOT),{cache:'no-store'});
 if(!response.ok)throw Error('No se pudo cargar '+path+' (HTTP '+response.status+')');
 return response.json();
}
export async function getMapManifest(){
 const value=await json('maps/manifest.json');
 if(!value||!Array.isArray(value.releases)||!value.activeVersion)
  throw Error('El manifiesto de escenarios no está disponible.');
 return value;
}
export async function loadPublishedMap(versionId=null){
 const manifest=await getMapManifest();
 const selected=versionId||manifest.activeVersion;
 // Whitelist of immutable paths from manifest: no arbitrary URL input.
 const release=manifest.releases.find(item=>item.id===selected);
 if(!release||!/^maps\/versions\/[a-zA-Z0-9-]+\.json$/.test(release.path))
  throw Error('Versión de mapa no publicada: '+selected);
 const scene=await json(release.path);
 if(!scene||!Number.isInteger(scene.resolution)||!Array.isArray(scene.heights)||
  scene.heights.length!==scene.resolution*scene.resolution)
  throw Error('Los datos de la versión '+selected+' son inválidos.');
 return {version:selected,scene,release};
}
// The room must store mapVersion before matchmaking/mission starts.
// Joining players reuse exactly that ID, even if the editor publishes later.
export function pinSessionMapVersion(room,version){
 if(!room||typeof room!=='object'||!version)throw Error('No se puede asignar la versión de la sala.');
 if(room.mapVersion&&room.mapVersion!==version)
  throw Error('La versión del escenario ya está fijada para esta sala.');
 room.mapVersion=version;
 return room;
}
export const WILDTRAP_SHARED_ASSETS='https://dtokurisu-png.github.io/wildtrap/assets/';
