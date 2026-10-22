import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {brotliDecompressSync} from 'node:zlib';
const root=path.resolve('dist');
const b=JSON.parse(await readFile(path.join(root,'game/build.json'),'utf8'));
const hash=x=>createHash('sha256').update(x).digest('hex');
assert(b.nativeFiles&&b.nativeProbe,'Native delivery not configured');
let total=b.nativeFiles.loader.bytes, parts=0, stored=0;
for(const key of ['data','framework','code']) {
  const legacy=[];
  for(const part of b.files[key].parts||[b.files[key]]) legacy.push(await readFile(path.join(root,part.url)));
  const original=brotliDecompressSync(Buffer.concat(legacy)), decoded=[];
  for(const part of b.nativeFiles[key].parts){
    assert(part.url.startsWith('/game/builds/'+b.deliveryRevision+'/'));
    const encoded=await readFile(path.join(root,part.url));
    assert(encoded.length<25*1024*1024);assert.equal(encoded.length,part.bytes);assert.equal(hash(encoded),part.sha256);
    const plain=brotliDecompressSync(encoded);
    assert.equal(plain.length,part.decodedBytes);assert.equal(hash(plain),part.decodedSha256);
    decoded.push(plain);total+=encoded.length;parts++;
  }
  const reconstructed=Buffer.concat(decoded);
  assert.equal(reconstructed.length,b.nativeFiles[key].decodedBytes);
  assert.equal(hash(reconstructed),hash(original),key+' bytes changed');
  if(b.nativeFiles[key].cache)stored+=reconstructed.length;
}
const probe=await readFile(path.join(root,b.nativeProbe.url));total+=probe.length;
assert.equal(hash(brotliDecompressSync(probe)),b.nativeProbe.sha256);
assert.equal(total,b.nativeTotalBytes);
assert(total<=b.totalBytes*1.02,'Download grew by more than 2%');
assert(stored<=100*1024*1024,'Persistent native cache exceeds 100 MiB budget');
assert.equal(b.nativeFiles.code.cache,false);assert.equal(b.nativeFiles.framework.cache,false);
await stat(path.join(root,'game/delivery.js'));
const headers=await readFile(path.join(root,'_headers'),'utf8');
assert(headers.includes('/game/builds/'+b.deliveryRevision+'/*.bin.br'));
assert(headers.includes('Content-Encoding: br'));
console.log(JSON.stringify({parts,bytes:total,previousBytes:b.totalBytes,storedDecodedBytes:stored,unityBinaryBytesUnchanged:true}));
