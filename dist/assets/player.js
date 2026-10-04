const startButton=document.querySelector('#start-game');
const intro=document.querySelector('#player-intro');
const frame=document.querySelector('#game-frame');
const status=document.querySelector('#load-status');
const description=document.querySelector('#load-description');
const fullButton=document.querySelector('#fullscreen');
// Preview-only inventory. No ad scripts, requests, rewards or impression events
// until the publisher account and child-audience treatment are reviewed.
const mobileAd=document.createElement('section');
mobileAd.className='ad-slot ad-mobile';
mobileAd.setAttribute('aria-label','Espaço reservado para publicidade');
mobileAd.dataset.adPlacement='game-below-mobile';
mobileAd.dataset.adFormat='320x100';
mobileAd.innerHTML='<span class="ad-label">Publicidade</span><strong>Espaço reservado</strong><small>Anúncios ainda não ativados</small>';
document.querySelector('.player-toolbar').after(mobileAd);
let gameManifest;
fetch('/game/manifest.json',{cache:'no-cache'}).then(response=>{if(!response.ok)throw new Error('unavailable');return response.json();}).then(manifest=>{
  if(!manifest.ready)throw new Error('unavailable');
  const entry=new URL(manifest.entry,location.origin);
  if(entry.origin!==location.origin||!entry.pathname.startsWith('/game/'))throw new Error('invalid build');
  gameManifest=manifest;
  description.textContent='Jogue aqui, sem instalar. O primeiro carregamento pode levar alguns instantes.';
  status.textContent=manifest.downloadMB?`Download inicial: aproximadamente ${manifest.downloadMB} MB.`:'Versão de testes para navegador.';
  startButton.hidden=false;
}).catch(()=>{
  description.textContent='A oficina está quase pronta para abrir no navegador.';
  status.textContent='A versão web ainda está em preparação. O jogo será disponibilizado aqui após a exportação e os testes.';
});
startButton?.addEventListener('click',()=>{
  if(!gameManifest)return;
  startButton.disabled=true;
  intro.hidden=true;frame.hidden=false;frame.src=gameManifest.entry;
  fullButton.disabled=!document.fullscreenEnabled;
});
fullButton?.addEventListener('click',async()=>{
  try{if(document.fullscreenElement)await document.exitFullscreen();else await document.querySelector('#player-stage').requestFullscreen();}
  catch{fullButton.textContent='Tela cheia indisponível';}
});
document.addEventListener('fullscreenchange',()=>{fullButton.textContent=document.fullscreenElement?'Sair da tela cheia':'Tela cheia';});
