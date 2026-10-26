// Repackage, never recompile or edit Unity assets. Run before opting a build in.
// Output is a new directory and candidate JSON; current manifests stay unchanged.
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {brotliCompress, brotliDecompressSync, constants} from 'node:zlib';
import {promisify} from 'node:util';
import assert from 'node:assert/strict';
const compress = promisify(brotliCompress);
const root = path.resolve('dist');
const build = JSON.parse(await readFile(path.join(root,'game/build.json'),'utf8'));
assert(build.build === process.argv[2], 'Pass the exact current build id.');
const revision = build.build + '-native-br-v1';
const output = path.join(root,'game/builds',revision);
await mkdir(output); // Refuse to overwrite an earlier candidate.
const digest = b => createHash('sha256').update(b).digest('hex');
const nativeFiles = {loader:build.files.loader};
const jobs = [];
for (const name of ['data','framework','code']) {
  const file = build.files[name];
  const segments = [];
  for (const part of file.parts || [file]) {
    assert(part.url.startsWith('/game/builds/'+build.build+'/'));
    const b = await readFile(path.join(root,part.url));
    assert.equal(b.length,part.bytes);
    if(part.sha256) assert.equal(digest(b),part.sha256);
    segments.push(b);
  }
  const plain = brotliDecompressSync(Buffer.concat(segments));
  const parts = [];
  for(let offset=0,index=0;offset<plain.length;offset+=4*1024*1024,index++) {
    const data = plain.subarray(offset,Math.min(offset+4*1024*1024,plain.length));
    const filename = `${name}-${String(index).padStart(3,'0')}.bin.br`;
    const part = {url:`/game/builds/${revision}/${filename}`,encoding:'br',bytes:0,sha256:'',decodedBytes:data.length,decodedSha256:digest(data)};
    parts.push(part); jobs.push({data,filename,part});
  }
  // Persist only the main asset data (~83 MB). Code/framework use HTTP caching.
  nativeFiles[name] = {bytes:0,decodedBytes:plain.length,cache:name==='data',parts};
}
let next=0;
await Promise.all(Array.from({length:2}, async()=>{
  while(next<jobs.length) {
    const {data,filename,part}=jobs[next++];
    const encoded=await compress(data,{params:{[constants.BROTLI_PARAM_QUALITY]:11,[constants.BROTLI_PARAM_SIZE_HINT]:data.length}});
    assert.deepEqual(brotliDecompressSync(encoded),data);
    part.bytes=encoded.length; part.sha256=digest(encoded);
    await writeFile(path.join(output,filename),encoded);
    console.log(`${filename}: ${encoded.length} / ${data.length}`);
  }
}));
for(const name of ['data','framework','code']) nativeFiles[name].bytes=nativeFiles[name].parts.reduce((n,p)=>n+p.bytes,0);
const probe=Buffer.from('VIALCHEMY_NATIVE_BR_1');
const probeEncoded=await compress(probe);
await writeFile(path.join(output,'probe.bin.br'),probeEncoded);
const nativeProbe={url:`/game/builds/${revision}/probe.bin.br`,bytes:probe.length,sha256:digest(probe)};
const nativeTotalBytes=Object.values(nativeFiles).reduce((n,f)=>n+f.bytes,0)+probeEncoded.length;
const candidate={...build,deliveryRevision:revision,nativeFiles,nativeProbe,nativeTotalBytes};
await writeFile(path.join(output,'candidate.json'),JSON.stringify(candidate,null,2)+'\n');
console.log(JSON.stringify({revision,bytes: nativeTotalBytes,previousBytes:build.totalBytes,storedDecodedBytes:nativeFiles.data.decodedBytes,parts:jobs.length,candidate:path.join(output,'candidate.json')}));
