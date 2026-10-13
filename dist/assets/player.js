const startButton=document.querySelector('#start-game');
const intro=document.querySelector('#player-intro');
const frame=document.querySelector('#game-frame');
const status=document.querySelector('#load-status');
const description=document.querySelector('#load-description');
const fullButton=document.querySelector('#fullscreen');
const appMode=document.documentElement.classList.contains('game-app');
// Manual placements remain inactive until the advertising configuration is approved.
if(!appMode){
const mobileAd=document.createElement('section');
mobileAd.className='ad-slot ad-mobile';
mobileAd.setAttribute('aria-label','Espaço reservado para publicidade');
mobileAd.dataset.adPlacement='game-below-mobile';
mobileAd.dataset.adFormat='320x100';
mobileAd.innerHTML='<span class="ad-label">Publicidade</span><strong>Espaço reservado</strong><small>Anúncios ainda não ativados</small>';
document.querySelector('.player-toolbar').after(mobileAd);
}
let gameManifest;
let gameStarted=false;
let checkingManifest=false;
function startGame(){
  if(!gameManifest||gameStarted)return;
  gameStarted=true;
  startButton.disabled=true;
  intro.hidden=true;frame.hidden=false;
  const gameUrl=new URL(gameManifest.entry,location.origin);
  if(['localhost','127.0.0.1','[::1]'].includes(location.hostname) && new URLSearchParams(location.search).get('ads-test')==='1')
    gameUrl.searchParams.set('ads-test','1');
  frame.src=gameUrl.pathname+gameUrl.search+gameUrl.hash;
  fullButton.disabled=!document.fullscreenEnabled;
}
async function prepareGame(){
 if(checkingManifest||gameStarted)return;
 checkingManifest=true;
 startButton.hidden=true;
 description.textContent=appMode?'Preparando sua oficina de alquimia…':'Verificando a versão para navegador…';
 status.textContent='';
 try{
  const response=await fetch('/game/manifest.json',{cache:'no-cache'});
  if(!response.ok)throw new Error('unavailable');
  const manifest=await response.json();
  if(!manifest.ready)throw new Error('unavailable');
  const entry=new URL(manifest.entry,location.origin);
  if(entry.origin!==location.origin||!entry.pathname.startsWith('/game/'))throw new Error('invalid build');
  gameManifest=manifest;
  description.textContent='Jogue aqui, sem instalar. O primeiro carregamento pode levar alguns instantes.';
  status.textContent=manifest.downloadMB?`Download inicial: aproximadamente ${manifest.downloadMB} MB.`:'Versão de testes para navegador.';
  startButton.textContent='Iniciar Vialchemy';
  if(appMode)startGame();
  else startButton.hidden=false;
 }catch{
  description.textContent='Não foi possível abrir a oficina.';
  status.textContent='Confira sua conexão com a internet e tente novamente. Seu progresso salvo não foi apagado.';
  startButton.textContent='Tentar novamente';
  startButton.disabled=false;
  startButton.hidden=false;
 }finally{checkingManifest=false;}
}
startButton?.addEventListener('click',()=>{
  if(!gameManifest)return prepareGame();
  startGame();
});
// Installed launches use the manifest's fullscreen mode, not a gesture-gated
// requestFullscreen() call. Ordinary browser visitors keep the manual button.
fullButton?.addEventListener('click',async()=>{
  try{if(document.fullscreenElement)await document.exitFullscreen();else await document.querySelector('#player-stage').requestFullscreen();}
  catch{fullButton.textContent='Tela cheia indisponível';}
});
document.addEventListener('fullscreenchange',()=>{fullButton.textContent=document.fullscreenElement?'Sair da tela cheia':'Tela cheia';});
prepareGame();
