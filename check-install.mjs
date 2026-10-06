import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const code=await readFile(new URL('dist/assets/install.js',import.meta.url),'utf8');
function fixture(ios=false,standalone=false) {
  function element(dataset={}) { return {dataset,hidden:false,disabled:false,open:false,attributes:{},listeners:{},
    setAttribute(k,v){this.attributes[k]=v;},addEventListener(k,fn){this.listeners[k]=fn;},
    showModal(){this.open=true;},close(){this.open=false;}}; }
  const ids=Object.fromEntries(['install-app','install-guide','install-native','install-status','install-explanation'].map(id=>[id,element()]));
  const switches=['ios','android'].map(installPlatform=>element({installPlatform}));
  const panels=['ios','android'].map(installSteps=>element({installSteps}));
  const listeners={}; const media={matches:standalone,addEventListener(k,fn){this.listener=fn;}};
  const context={document:{querySelector:s=>ids[s.slice(1)],querySelectorAll:s=>s==='[data-install-platform]'?switches:panels},
    navigator:{userAgent:ios?'iPhone':'Chrome Android',platform:ios?'iPhone':'Linux',maxTouchPoints:1},
    window:{matchMedia:()=>media,addEventListener:(name,fn)=>{listeners[name]=fn;}}};
  vm.runInNewContext(code,context);
  return {ids,switches,panels,listeners,media,click:()=>ids['install-app'].listeners.click()};
}
let f=fixture(); await f.click(); assert(f.ids['install-guide'].open); assert.equal(f.panels[0].hidden,true);
f=fixture(true); await f.click(); assert.equal(f.panels[0].hidden,false); assert.equal(f.panels[1].hidden,true);
f=fixture(false,true); assert.equal(f.ids['install-app'].hidden,true);
f=fixture(); let calls=0;
f.listeners.beforeinstallprompt({preventDefault(){},prompt:async()=>{calls++;return {outcome:'dismissed'};}});
await f.click(); assert.equal(calls,1); assert.equal(f.ids['install-guide'].open,false); assert.match(f.ids['install-status'].textContent,/continuar jogando/); assert.equal(f.ids['install-app'].hidden,false);
f=fixture();
f.listeners.beforeinstallprompt({preventDefault(){},prompt:async()=>({outcome:'accepted'})});
await f.click(); assert.equal(f.ids['install-app'].hidden,false);
f.listeners.appinstalled(); assert.equal(f.ids['install-app'].hidden,true); assert.equal(f.ids['install-native'].hidden,true);
f=fixture(); f.listeners.beforeinstallprompt({preventDefault(){},prompt:async()=>{throw Error('not available');}});
await f.click(); assert(f.ids['install-guide'].open); assert.equal(f.ids['install-app'].disabled,false);
f=fixture(); await f.click(); f.listeners.beforeinstallprompt({preventDefault(){},prompt:async()=>({outcome:'dismissed'})});
assert.equal(f.ids['install-native'].hidden,false); assert(f.ids['install-guide'].open);
console.log('7 installation-flow checks passed (browser events simulated, no device installation).');

// Exercise installed startup without changing a real browser's installation or saves.
const playerCode=await readFile(new URL('dist/assets/player.js',import.meta.url),'utf8');
const playerHtml=await readFile(new URL('dist/jogar/index.html',import.meta.url),'utf8');
const launchCode=playerHtml.match(/<script id="app-launch-mode">([\s\S]*?)<\/script>/)[1];
async function playerFixture({mode='browser',ios=false,search='',failFirst=false,entry='/game/'}={}) {
  const classes=new Set(),ids={},listeners={};
  let downloads=0,starts=0,ads=0,fullscreenRequests=0;
  for(const id of ['start-game','player-intro','game-frame','load-status','load-description','fullscreen','player-toolbar','player-stage']) {
    ids[id]={hidden:id==='game-frame'||id==='start-game',disabled:false,textContent:'',listeners:{},
      addEventListener(type,fn){this.listeners[type]=fn;},after(){ads++;},
      requestFullscreen(){fullscreenRequests++;return Promise.resolve();}};
  }
  Object.defineProperty(ids['game-frame'],'src',{set(value){this.currentSrc=value;starts++;}});
  const document={documentElement:{classList:{add:x=>classes.add(x),contains:x=>classes.has(x)}},
    querySelector:s=>ids[s.slice(1)],fullscreenEnabled:true,
    createElement:()=>({dataset:{},setAttribute(){}}),
    addEventListener:(name,fn)=>{listeners[name]=fn;}};
  const context=vm.createContext({document,URL,URLSearchParams,navigator:{standalone:ios},
    location:{origin:'https://vialchemy.test',search},
    window:{matchMedia:query=>({matches:query===`(display-mode: ${mode})`})},
    fetch:async()=>{downloads++;if(failFirst&&downloads===1)throw Error('offline');
      return {ok:true,json:async()=>({ready:true,entry,downloadMB:89})};}});
  vm.runInContext(launchCode,context);
  vm.runInContext(playerCode,context);
  const flush=()=>new Promise(resolve=>setImmediate(resolve));
  await flush();
  return {ids,classes,flush,counts:()=>({downloads,starts,ads,fullscreenRequests})};
}
for(const options of [{mode:'standalone'},{mode:'fullscreen'},{ios:true},{search:'?origem=tela-inicial'}]) {
  const p=await playerFixture(options);
  assert(p.classes.has('game-app'));
  assert.equal(p.ids['game-frame'].currentSrc,'/game/','Preserve the save-storage URL');
  assert.equal(p.ids['game-frame'].hidden,false);
  assert.equal(p.ids['player-intro'].hidden,true);
  assert.deepEqual(p.counts(),{downloads:1,starts:1,ads:0,fullscreenRequests:0});
  p.ids['start-game'].listeners.click();
  assert.equal(p.counts().starts,1,'Do not restart an already running game');
}
let p=await playerFixture();
assert(!p.classes.has('game-app'));
assert.equal(p.counts().starts,0,'Browser visitors choose when to download the game');
assert.equal(p.counts().ads,1,'Keep the website ad placement');
assert.equal(p.ids['start-game'].hidden,false);
p.ids['start-game'].listeners.click();
assert.equal(p.counts().starts,1);
await p.ids.fullscreen.listeners.click();
assert.equal(p.counts().fullscreenRequests,1,'Keep manual browser fullscreen');
p=await playerFixture({mode:'standalone',failFirst:true});
assert.equal(p.counts().starts,0);
assert.equal(p.ids['start-game'].textContent,'Tentar novamente');
assert.equal(p.ids['start-game'].hidden,false);
await p.ids['start-game'].listeners.click();
await p.flush();
assert.equal(p.counts().starts,1,'Recover from a failed connection');
p=await playerFixture({mode:'standalone',entry:'https://other.test/game/'});
assert.equal(p.counts().starts,0,'Reject a foreign game URL');
assert.equal(p.ids['start-game'].textContent,'Tentar novamente');
assert.match(playerHtml,/viewport-fit=cover/);
console.log('7 app-launch checks passed (simulated Android/iOS/shortcut, browser, retry and URL validation; not a physical-device test).');
