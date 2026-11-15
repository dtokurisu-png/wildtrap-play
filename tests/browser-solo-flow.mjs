import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const executable=['google-chrome','google-chrome-stable','chromium'].find(c=>
 spawnSync('which',[c],{encoding:'utf8'}).status===0);
assert.ok(executable,'Chrome browser is required');
const base=process.env.WILDTRAP_PLAY_TEST_URL||'http://127.0.0.1:8123/';
for(const [name,url] of [['lobby',base],['solo',base+'?smoke=solo'],['room-camera',base+'?smoke=room-camera'],['hunt-directions',base+'?smoke=hunt-directions']]){
 const r=spawnSync(executable,[
  '--headless','--no-sandbox','--disable-dev-shm-usage','--disable-gpu',
  '--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader',
  '--disable-extensions','--virtual-time-budget=30000','--dump-dom',url
 ],{encoding:'utf8',timeout:85000,maxBuffer:12e6});
 const html=r.stdout||'';
 console.log(name,'exit',r.status,'stderr tail',(r.stderr||'').slice(-400));
 assert.equal(r.status,0,'Browser failed for '+name);
 assert.match(html,/Tu aventura empieza aquí|Cacería · Jugador 1/,'Game interface did not start');
 if(name==='room-camera'){
  const status=html.match(/data-room-camera="([^"]+)"/)?.[1];
  const reason=html.match(/data-room-camera-error="([^"]+)"/)?.[1];
  console.log('Room camera movement test',status,reason||'');
  assert.equal(status,'PASS','Moving player broke camera: '+reason);
 }
 if(name==='hunt-directions'){
  const status=html.match(/data-hunt-directions="([^"]+)"/)?.[1];
  const count=html.match(/data-hunt-directions-checked="([^"]+)"/)?.[1];
  const reason=html.match(/data-hunt-directions-error="([^"]+)"/)?.[1];
  console.log('Hunt 8-way movement test',status,count,reason||'');
  assert.equal(status,'PASS','Hunt movement, orientation or run failed: '+(reason||'never finished'));
  assert.equal(count,'8');
 }
 if(name==='solo'){
  const status=html.match(/data-smoke="([^"]+)"/)?.[1];
  const reason=html.match(/data-smoke-error="([^"]+)"/)?.[1];
  console.log('Solo E2E smoke',status,reason||'');
  assert.equal(status,'PASS','Door → solo room → published arena failed: '+reason);
  assert.match(html,/data-smoke-version="v001"/,'Wrong pinned map version');
 }
 console.log('PASS '+name);
}
