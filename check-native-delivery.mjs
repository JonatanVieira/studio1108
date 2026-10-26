import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash,webcrypto} from 'node:crypto';
const moduleAt=async file=>import('data:text/javascript;base64,'+Buffer.from(await readFile(file)).toString('base64'));
const {selectGameDelivery}=await moduleAt('dist/game/delivery.js');
const {createGameDownloader}=await moduleAt('dist/game/download.js');
const origin='https://example.test';
const hash=b=>createHash('sha256').update(b).digest('hex');
const digest=b=>webcrypto.subtle.digest('SHA-256',b);
const marker='VIALCHEMY_NATIVE_BR_1';
const oldFiles={data:{url:'/game/old.data'},framework:{url:'/game/old.js'},code:{url:'/game/old.wasm'}};
const payloads=['asset-data-'.repeat(21),'framework-'.repeat(7),'wasm-code-'.repeat(11)];
const names=['data','framework','code'];
const nativeFiles=Object.fromEntries(names.map((name,i)=>[name,{bytes:20+i,decodedBytes:payloads[i].length,cache:name==='data',parts:[{
  url:'/game/native/'+name+'.br',bytes:20+i,sha256:hash('encoded-'+name),encoding:'br',decodedBytes:payloads[i].length,decodedSha256:hash(payloads[i])
}]}]));
const build={files:oldFiles,nativeFiles,nativeProbe:{url:'/game/native/probe.br',bytes:marker.length,sha256:hash(marker)}};
let passed=0;
async function test(name,fn){await fn();passed++;console.log('PASS '+name);}
function storage(){const map=new Map();return {map,open:async()=>({match:async k=>map.get(k)?.clone(),put:async(k,r)=>{map.set(k,r.clone());},delete:async k=>map.delete(k.url||k),keys:async()=>[...map.keys()].map(url=>({url}))})};}
const pick=(fetcher,extra={},value=build)=>selectGameDelivery(value,{origin,fetcher,digest,...extra});
const payloadFetcher=async url=>new Response(payloads[names.indexOf(url.split('/').at(-1).replace('.br',''))]);
const downloader=(extra={})=>createGameDownloader({origin,fetcher:payloadFetcher,digest,...extra});

await test('legacy manifest needs no probe',async()=>{assert.equal((await pick(()=>{throw Error('Unexpected fetch')},{},{files:oldFiles})).native,false);});
await test('valid decoded probe selects native files',async()=>{const r=await pick(async()=>new Response(marker));assert.equal(r.native,true);assert.equal(r.files,nativeFiles);});
await test('host without decoding falls back before large downloads',async()=>{assert.equal((await pick(async()=>new Response('compressed bytes'))).files,oldFiles);});
await test('wrong probe hash falls back',async()=>{assert.equal((await pick(async()=>new Response('x'.repeat(marker.length)))).native,false);});
await test('missing native probe endpoint falls back',async()=>{assert.equal((await pick(async()=>new Response('',{status:404}))).native,false);});
await test('probe network failure falls back',async()=>{assert.equal((await pick(async()=>{throw Error('offline');})).native,false);});
await test('probe timeout is bounded',async()=>{assert.equal((await pick((url,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(signal.reason))),{timeoutMs:5})).native,false);});
await test('page cancellation does not fall back or make a request',async()=>{const c=new AbortController();c.abort();await assert.rejects(pick(()=>{throw Error('Unexpected fetch')},{signal:c.signal}));});
await test('oversized probe is rejected',async()=>{assert.equal((await pick(async()=>new Response('x'.repeat(300)))).native,false);});
for(const invalid of ['https://foreign.test/game/probe','/outside','https://name:pass@example.test/game/probe'])await test('reject probe URL '+invalid,async()=>{await assert.rejects(pick(()=>{throw Error('Unexpected fetch')},{},{...build,nativeProbe:{...build.nativeProbe,url:invalid}}),/Invalid/);});

await test('decoded hashes, ordering and encoded progress totals',async()=>{
  const seen=[];const r=await downloader({storage:null}).load(nativeFiles,p=>seen.push(p.loaded));
  for(let i=0;i<3;i++)assert.equal(await r.files[names[i]].text(),payloads[i]);
  assert.equal(seen.at(-1),63);assert(seen.every((n,i)=>i===0||n>=seen[i-1]));assert.equal(r.networkBytes,63);
});
await test('only data persists; code/framework do not double cache size',async()=>{
  const s=storage();let calls=0;const d=downloader({storage:s,fetcher:async(...args)=>{calls++;return payloadFetcher(...args);}});
  await d.load(nativeFiles);assert.equal(s.map.size,1);assert.equal([...s.map.values()][0].headers.get('Content-Encoding'),null);
  const r=await d.load(nativeFiles);assert.equal(calls,5);assert.equal(r.cachedBytes,20);assert.equal(r.networkBytes,43);
});
await test('corrupted decoded cache is repaired',async()=>{
  const s=storage(),d=downloader({storage:s});await d.load(nativeFiles);
  s.map.set([...s.map.keys()][0],new Response('x'.repeat(payloads[0].length)));
  assert.equal(await (await d.load(nativeFiles)).files.data.text(),payloads[0]);
});
await test('undecoded response cannot enter Unity or cache',async()=>{
  const s=storage();await assert.rejects(downloader({storage:s,fetcher:async()=>new Response('wrong'.repeat(4))}).load(nativeFiles),/integrity/);assert.equal(s.map.size,0);
});
await test('expanded response is bounded against declared decoded size',async()=>{await assert.rejects(downloader({storage:null,fetcher:async()=>new Response('x'.repeat(2000))}).load(nativeFiles),/exceeds/);});
await test('native works without cache permission',async()=>{const r=await downloader({storage:{open(){throw Error('Denied');}}}).load(nativeFiles);assert.equal(await r.files.data.text(),payloads[0]);});
await test('native works when cache quota is full',async()=>{const s={open:async()=>({match:async()=>null,put:async()=>{throw Error('Quota');},keys:async()=>[]})};assert.equal(await (await downloader({storage:s}).load(nativeFiles)).files.data.text(),payloads[0]);});
for(const [name,change] of [
  ['invalid encoding',p=>p.encoding='gzip'],['missing decoded hash',p=>delete p.decodedSha256],
  ['invalid decoded size',p=>p.decodedBytes=-1],['oversized decoded part',p=>p.decodedBytes=21*1024*1024]
])await test(name,async()=>{const f=structuredClone(nativeFiles);change(f.data.parts[0]);await assert.rejects(downloader().load(f),/Invalid decoded/);});
await test('declared expanded file total must match',async()=>{const f=structuredClone(nativeFiles);f.data.decodedBytes++;await assert.rejects(downloader().load(f),/Decoded game part sizes/);});
await test('old compressed and new decoded cache use different identities',async()=>{const s=storage();s.map.set(origin+'/game/.binary-cache/old-compressed',new Response('old'));await downloader({storage:s}).load(nativeFiles);assert.equal(s.map.size,1);assert([...s.map.keys()][0].includes(hash(payloads[0])));});
await test('GitHub Pages subdirectory preserves delivery and download URLs',async()=>{
  // Apply the same quoted-root-path transformation used by build-pages.mjs.
  const prefix=source=>source.replace(/(["'])\/(?!\/)([^"'\r\n]*)\1/g,
    (match,quote,localPath)=>quote+'/studio1108/'+localPath+quote);
  const prefixedModule=async file=>import('data:text/javascript;base64,'+Buffer.from(prefix(await readFile(file,'utf8'))).toString('base64'));
  const {selectGameDelivery:select}=await prefixedModule('dist/game/delivery.js');
  const {createGameDownloader:create}=await prefixedModule('dist/game/download.js');
  const manifest=JSON.parse(prefix(JSON.stringify(build)));
  const selected=await select(manifest,{origin,digest,fetcher:async url=>{
    assert.equal(url,origin+'/studio1108/game/native/probe.br');return new Response(marker);
  }});
  assert.equal(selected.native,true);
  const r=await create({origin,digest,storage:null,fetcher:async url=>{
    assert(url.startsWith(origin+'/studio1108/game/'));return payloadFetcher(url);
  }}).load(selected.files);
  assert.equal(await r.files.data.text(),payloads[0]);
  const fallback=await select(manifest,{origin,digest,fetcher:async()=>new Response('encoded')});
  assert.equal(fallback.native,false);assert.equal(fallback.files.data.url,'/studio1108/game/old.data');
});
console.log(JSON.stringify({passed}));
