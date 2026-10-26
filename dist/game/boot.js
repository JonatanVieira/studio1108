/* Unity runs here, in the browser. No desktop app or native ad SDK is loaded. */
const loading=document.querySelector('#loading');
const progress=document.querySelector('#progress');
const message=document.querySelector('#message');
const detail=document.querySelector('#detail');
const canvas=document.querySelector('#unity-canvas');
const objectUrls=[];
const downloadController=new AbortController();
const cancelDownload=()=>downloadController.abort();
window.addEventListener('pagehide',cancelDownload,{once:true});
const retry=document.querySelector('#retry');
retry.addEventListener('click',()=>location.reload());
const safeUrl=value=>{
  const url=new URL(value,location.origin);
  if(url.origin!==location.origin||!url.pathname.startsWith('/game/'))throw new Error('Invalid game file origin');
  return url.href;
};
async function boot(){
  const started=performance.now();
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
    const {createGameDownloader}=await import('/game/download.js');
    const {selectGameDelivery}=await import('/game/delivery.js');
    const delivery=await selectGameDelivery(build,{origin:location.origin,signal:downloadController.signal});
    const downloader=createGameDownloader({origin:location.origin});
    message.textContent='Carregando os frascos e as poções…';
    const binaries=await downloader.load(delivery.files,({loaded,total,cachedBytes,networkBytes})=>{
      progress.value=total?loaded/total*.65:0;
      detail.textContent=cachedBytes>0&&networkBytes===0
        ? `Abrindo arquivos salvos: ${Math.round(loaded/1e6)} de ${Math.ceil(total/1e6)} MB`
        : `${Math.round(loaded/1e6)} de ${Math.ceil(total/1e6)} MB`;
    },downloadController.signal);
    const downloadedAt=performance.now();
    for(const key of ['data','framework','code']){
      const file=binaries.files[key];
      if(file instanceof Blob){
        const url=URL.createObjectURL(file);
        objectUrls.push(url);config[key+'Url']=url;
      }else config[key+'Url']=file;
      delete binaries.files[key];
    }
    message.textContent='Acendendo as luzes da oficina…';detail.textContent='Iniciando o jogo.';
    await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=safeUrl(build.files.loader.url);script.onload=resolve;script.onerror=reject;document.body.append(script);});
    const instance=await createUnityInstance(canvas,config,value=>{progress.value=.65+value*.35;});
    if(location.hostname==='127.0.0.1'||location.hostname==='localhost')console.info('Vialchemy load metrics '+JSON.stringify({build:build.build,native:delivery.native,downloadMs:Math.round(downloadedAt-started),startupMs:Math.round(performance.now()-started),cachedBytes:binaries.cachedBytes,fetchedFileBytes:binaries.networkBytes}));
    loading.hidden=true;canvas.focus();
    window.removeEventListener('pagehide',cancelDownload);
    // Release temporary binary copies once Unity has loaded them.
    objectUrls.splice(0).forEach(url=>URL.revokeObjectURL(url));
    window.addEventListener('pagehide',()=>{instance.Quit?.().catch(()=>{});},{once:true});
  }catch(error){console.error('Vialchemy web:',error);showError();objectUrls.splice(0).forEach(url=>URL.revokeObjectURL(url));window.removeEventListener('pagehide',cancelDownload);}
}
function showError(){loading.hidden=false;message.textContent='Não foi possível abrir o jogo.';detail.textContent='Confira sua conexão e tente novamente. Se continuar, use um navegador atualizado ou envie um relato ao estúdio.';progress.hidden=true;retry.hidden=false;}
boot();
