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
