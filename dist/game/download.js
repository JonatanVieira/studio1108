// Only immutable game binaries live here. Never touches Unity's saved progress.
const CACHE_NAME = 'vialchemy-binaries-v1';
const MAX_PART_BYTES = 20 * 1024 * 1024;

export function createGameDownloader({origin, fetcher = globalThis.fetch,
  storage, digest = buffer => crypto.subtle.digest('SHA-256', buffer),
  concurrency = 3, timeoutMs = 120000} = {}) {
  const base = new URL(origin).origin;
  const safeUrl = value => {
    const url = new URL(value, base);
    if (url.origin !== base || !url.pathname.startsWith('/game/') || url.username || url.password)
      throw new Error('Invalid game file origin');
    return url.href;
  };
  const cacheKey = part => `${base}/game/.binary-cache/${part.sha256}-${part.bytes}`;
  const validatePart = part => {
    safeUrl(part.url);
    if (!Number.isSafeInteger(part.bytes) || part.bytes <= 0 || part.bytes > MAX_PART_BYTES ||
      !/^[a-f0-9]{64}$/.test(part.sha256)) throw new Error('Invalid game part');
  };
  async function valid(blob, part) {
    if (blob.size !== part.bytes) return false;
    const hash = await digest(await blob.arrayBuffer());
    return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('') === part.sha256;
  }

  async function load(files, onProgress = () => {}, signal) {
    const jobs = [], result = {}, retained = new Set();
    for (const name of ['data', 'framework', 'code']) {
      const file = files[name];
      if (!file) throw new Error('Incomplete game manifest');
      if (!file.parts) { result[name] = safeUrl(file.url); continue; }
      if (!Array.isArray(file.parts) || file.parts.length === 0) throw new Error('Missing game parts');
      let size = 0;
      for (const part of file.parts) { validatePart(part); size += part.bytes; retained.add(cacheKey(part)); }
      if (size !== file.bytes) throw new Error('Game part sizes do not match');
      result[name] = new Array(file.parts.length);
      file.parts.forEach((part, index) => jobs.push({name, part, index}));
    }
    let cache;
    // Storage may be disabled, unavailable in private browsing, or out of space.
    // None of those conditions may prevent playing the game.
    try { cache = await (storage === undefined ? globalThis.caches : storage)?.open(CACHE_NAME); } catch { cache = null; }
    const controller = new AbortController();
    const abort = () => controller.abort(signal?.reason);
    if (signal?.aborted) abort();
    signal?.addEventListener('abort', abort, {once: true});
    let next = 0, failure, loaded = 0, cachedBytes = 0, networkBytes = 0;
    const total = jobs.reduce((sum, job) => sum + job.part.bytes, 0);
    function progress(amount, cached) {
      loaded += amount;
      if (cached) cachedBytes += amount; else networkBytes += amount;
      onProgress({loaded, total, cachedBytes, networkBytes});
    }
    async function read(part) {
      controller.signal.throwIfAborted();
      const key = cacheKey(part);
      if (cache) {
        let blob;
        try { const response = await cache.match(key); if (response) blob = await response.blob(); }
        catch { /* A cache read failure falls back to the network. */ }
        if (blob && await valid(blob, part)) {
          controller.signal.throwIfAborted(); progress(part.bytes, true); return blob;
        }
        if (blob) { try { await cache.delete(key); } catch { /* Optional cache. */ } }
      }
      const request = new AbortController();
      const stop = () => request.abort(controller.signal.reason);
      controller.signal.addEventListener('abort', stop, {once: true});
      if (controller.signal.aborted) stop();
      const timeout = setTimeout(() => request.abort(new Error('Game download timed out')), timeoutMs);
      try {
        const response = await fetcher(safeUrl(part.url), {signal: request.signal});
        if (!response.ok) throw new Error('Game download failed: ' + response.status);
        const chunks = []; let bytes = 0;
        if (response.body?.getReader) {
          const reader = response.body.getReader();
          try {
            for (;;) {
              const {done, value} = await reader.read();
              if (done) break;
              bytes += value.length;
              if (bytes > part.bytes) throw new Error('Game download exceeds declared size');
              chunks.push(value); progress(value.length, false);
            }
          } catch (error) { await reader.cancel().catch(() => {}); throw error; }
          finally { reader.releaseLock(); }
        } else {
          const buffer = await response.arrayBuffer(); bytes = buffer.byteLength;
          if (bytes > part.bytes) throw new Error('Game download exceeds declared size');
          chunks.push(buffer); progress(bytes, false);
        }
        const blob = new Blob(chunks, {type: 'application/octet-stream'});
        if (!await valid(blob, part)) throw new Error('Game download integrity check failed');
        controller.signal.throwIfAborted();
        if (cache) { try { await cache.put(key, new Response(blob)); } catch { /* Quota cannot block the game. */ } }
        return blob;
      } finally { clearTimeout(timeout); controller.signal.removeEventListener('abort', stop); }
    }
    async function worker() {
      try {
        while (!controller.signal.aborted && next < jobs.length) {
          const {name, part, index} = jobs[next++];
          result[name][index] = await read(part);
        }
      } catch (error) { failure ??= error; controller.abort(error); }
    }
    try {
      await Promise.all(Array.from({length: Math.min(jobs.length, Math.max(1, Math.min(3, concurrency)))}, worker));
      if (failure) throw failure;
      controller.signal.throwIfAborted();
      for (const name of ['data', 'framework', 'code'])
        if (Array.isArray(result[name])) result[name] = new Blob(result[name], {type: 'application/octet-stream'});
      // Keep only this manifest's binaries. Never enumerate/delete other app caches,
      // localStorage, IndexedDB, PlayerPrefs, or anything containing player progress.
      if (cache) {
        try { for (const request of await cache.keys()) if (!retained.has(request.url)) await cache.delete(request); }
        catch { /* Cleanup is best-effort, not a condition for starting Unity. */ }
      }
      return {files: result, cachedBytes, networkBytes};
    } finally { signal?.removeEventListener('abort', abort); }
  }
  return {load, safeUrl};
}
