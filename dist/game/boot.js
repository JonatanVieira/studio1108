/* Unity runs here, in the browser. No desktop app or native ad SDK is loaded. */
const loading=document.querySelector('#loading');
const progress=document.querySelector('#progress');
const message=document.querySelector('#message');
const detail=document.querySelector('#detail');
const canvas=document.querySelector('#unity-canvas');
const objectUrls=[];
const retry=document.querySelector('#retry');
retry.addEventListener('click',()=>location.reload());
const safeUrl=value=>{
  const url=new URL(value,location.origin);
  if(url.origin!==location.origin||!url.pathname.startsWith('/game/'))throw new Error('Invalid game file origin');
  return url.href;
};
async function readPart(part,onProgress){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),120000);
  try{
    const response=await fetch(safeUrl(part.url),{signal:controller.signal});
    if(!response.ok)throw new Error('Game download failed: '+response.status);
    const reader=response.body.getReader();
    const chunks=[];let total=0;
    for(;;){const {done,value}=await reader.read();if(done)break;chunks.push(value);total+=value.length;onProgress(value.length);}
    if(total!==part.bytes)throw new Error('Incomplete game download');
    const blob=new Blob(chunks,{type:'application/octet-stream'});
    const hash=await crypto.subtle.digest('SHA-256',await blob.arrayBuffer());
    const hex=[...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');
    if(hex!==part.sha256)throw new Error('Game download integrity check failed');
    return blob;
  }finally{clearTimeout(timeout);}
}
async function boot(){
  try{
    if(!window.WebAssembly)throw new Error('WebAssembly unavailable');
    const response=await fetch('/game/build.json',{cache:'no-cache'});
    if(!response.ok)throw new Error('Game manifest unavailable');
    const build=await response.json();
    // The existing IMGUI layout uses a minimum 650px design width. A narrow
    // desktop browser otherwise hits its minimum-size clamps and overlaps controls.
    // Render at a stable portrait resolution; Unity maps pointer input through CSS sizing.
    canvas.width=720;canvas.height=1280;
    const config={companyName:'STUDIO 1108 GAMES',productName:'Vialchemy',productVersion:build.version,streamingAssetsUrl:build.streamingAssetsUrl,devicePixelRatio:1,matchWebGLToCanvasSize:false,autoSyncPersistentDataPath:true,
      cacheControl:url=>url.startsWith('blob:')?'no-store':'must-revalidate',
      showBanner:(text,type)=>{if(type==='error'){console.error(text);showError();}else console.warn(text);}};
    let downloaded=0;
    const chunkTotal=Object.values(build.files).filter(file=>file.parts).reduce((sum,file)=>sum+file.bytes,0);
    for(const key of ['data','framework','code']){
      const file=build.files[key];
      if(file.parts){
        message.textContent='Carregando os frascos e as poções…';
        const parts=[];
        for(const part of file.parts)parts.push(await readPart(part,amount=>{
          downloaded+=amount;progress.value=chunkTotal?downloaded/chunkTotal*.65:0;
          detail.textContent=`${Math.round(downloaded/1e6)} de ${Math.ceil(chunkTotal/1e6)} MB`;
        }));
        const url=URL.createObjectURL(new Blob(parts,{type:'application/octet-stream'}));
        objectUrls.push(url);config[key+'Url']=url;
      }else config[key+'Url']=safeUrl(file.url);
    }
    message.textContent='Acendendo as luzes da oficina…';detail.textContent='Iniciando o jogo.';
    await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=safeUrl(build.files.loader.url);script.onload=resolve;script.onerror=reject;document.body.append(script);});
    const instance=await createUnityInstance(canvas,config,value=>{progress.value=.65+value*.35;});
    loading.hidden=true;canvas.focus();
    // Release temporary binary copies once Unity has loaded them.
    objectUrls.splice(0).forEach(url=>URL.revokeObjectURL(url));
    window.addEventListener('pagehide',()=>{instance.Quit?.().catch(()=>{});},{once:true});
  }catch(error){console.error('Vialchemy web:',error);showError();objectUrls.splice(0).forEach(url=>URL.revokeObjectURL(url));}
}
function showError(){loading.hidden=false;message.textContent='Não foi possível abrir o jogo.';detail.textContent='Confira sua conexão e tente novamente. Se continuar, use um navegador atualizado ou envie um relato ao estúdio.';progress.hidden=true;retry.hidden=false;}
boot();
