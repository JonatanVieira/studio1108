// A tiny real response checks hosting support, not browser brand/version guesses.
// Hosts such as GitHub Pages may ignore _headers: keep the original Unity build.
export async function selectGameDelivery(build, {origin, fetcher=globalThis.fetch,
  digest=buffer=>crypto.subtle.digest('SHA-256',buffer), signal, timeoutMs=2500}={}) {
  const fallback={files:build.files,native:false};
  if(!build.nativeFiles || !build.nativeProbe) return fallback;
  const probe=build.nativeProbe;
  const base=new URL(origin).origin;
  const url=new URL(probe.url,base);
  if(url.origin!==base || !url.pathname.startsWith('/game/') || url.username || url.password ||
     !Number.isSafeInteger(probe.bytes) || probe.bytes<1 || probe.bytes>256 || !/^[a-f0-9]{64}$/.test(probe.sha256))
    throw new Error('Invalid native delivery probe');
  const request=new AbortController();
  const abort=()=>request.abort(signal?.reason);
  if(signal?.aborted) abort();
  signal?.addEventListener('abort',abort,{once:true});
  const timeout=setTimeout(()=>request.abort(),timeoutMs);
  try {
    request.signal.throwIfAborted();
    const response=await fetcher(url.href,{signal:request.signal,cache:'no-cache'});
    if(!response.ok) return fallback;
    let buffer;
    if(response.body?.getReader) {
      const reader=response.body.getReader(); const chunks=[]; let count=0;
      try {
        for(;;) {
          const {done,value}=await reader.read(); if(done)break;
          count+=value.length;
          if(count>256){await reader.cancel();return fallback;}
          chunks.push(value);
        }
      } finally {reader.releaseLock();}
      buffer=await new Blob(chunks).arrayBuffer();
    } else buffer=await response.arrayBuffer();
    if(buffer.byteLength!==probe.bytes) return fallback;
    const hash=[...new Uint8Array(await digest(buffer))].map(b=>b.toString(16).padStart(2,'0')).join('');
    signal?.throwIfAborted();
    return hash===probe.sha256?{files:build.nativeFiles,native:true}:fallback;
  } catch(error) {
    if(signal?.aborted) throw error;
    return fallback; // Slow, offline, misconfigured, or unsupported native endpoint.
  } finally {clearTimeout(timeout);signal?.removeEventListener('abort',abort);}
}
