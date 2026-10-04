// Installation always requires the browser's confirmation. Never simulate it.
const installButton = document.querySelector('#install-app');
const installGuide = document.querySelector('#install-guide');
const installNative = document.querySelector('#install-native');
const installStatus = document.querySelector('#install-status');
const installExplanation = document.querySelector('#install-explanation');
const installButtons = [installButton, installNative];
const platformButtons = [...document.querySelectorAll('[data-install-platform]')];
const stepPanels = [...document.querySelectorAll('[data-install-steps]')];
const standalone = window.matchMedia('(display-mode: standalone)');
const isAppleMobile = /iPad|iPhone|iPod/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
let selectedPlatform = isAppleMobile ? 'ios' : 'android';
let installPrompt = null;
let installed = false;
let busy = false;

function selectPlatform(platform) {
  selectedPlatform = platform;
  platformButtons.forEach(button => button.setAttribute('aria-pressed',
    String(button.dataset.installPlatform === platform)));
  stepPanels.forEach(panel => { panel.hidden = panel.dataset.installSteps !== platform; });
}
function updateControls(message) {
  const alreadyInstalled = installed || standalone.matches || navigator.standalone === true;
  installButton.hidden = alreadyInstalled;
  installNative.hidden = alreadyInstalled || !installPrompt;
  installButtons.forEach(button => { button.disabled = busy; });
  installButton.textContent = busy ? 'Aguardando confirmação…'
    : installPrompt ? 'Instalar Vialchemy'
    : isAppleMobile ? 'Adicionar no iPhone' : 'Adicionar à tela inicial';
  installButton.setAttribute('aria-haspopup', installPrompt ? 'false' : 'dialog');
  installExplanation.textContent = installPrompt
    ? 'O navegador liberou a instalação. Toque em Instalar Vialchemy e confirme.'
    : 'O navegador não ofereceu a instalação direta aqui. Use a opção do seu celular:';
  installStatus.textContent = message || (alreadyInstalled
    ? 'Abra o Vialchemy pelo ícone da poção na sua tela inicial.'
    : installPrompt ? 'Toque para abrir a confirmação do navegador.'
    : isAppleMobile ? 'No iPhone, a adição é feita pelo menu Compartilhar do Safari.'
    : 'A instalação direta aparece quando o navegador permitir.');
  if (alreadyInstalled && installGuide.open) installGuide.close();
}
function openGuide() {
  selectPlatform(selectedPlatform);
  updateControls();
  if (!installGuide.open) installGuide.showModal();
}
async function requestInstall() {
  if (busy || installed || standalone.matches || navigator.standalone === true) return;
  if (!installPrompt) { openGuide(); return; }
  const prompt = installPrompt;
  installPrompt = null;
  busy = true;
  if (installGuide.open) installGuide.close();
  updateControls('Confirme a instalação na janela do navegador.');
  try {
    const result = await prompt.prompt();
    const choice = prompt.userChoice ? await prompt.userChoice : result;
    if (!installed) updateControls(choice?.outcome === 'accepted'
      ? 'Pedido confirmado. Aguarde o navegador concluir a instalação.'
      : 'Tudo bem. Você pode continuar jogando e adicionar depois.');
  } catch {
    openGuide();
    installStatus.textContent = 'A instalação direta não abriu. Mostramos a alternativa do navegador.';
  } finally {
    busy = false;
    installButtons.forEach(button => { button.disabled = false; });
    updateControls(installStatus.textContent);
  }
}
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;
  updateControls();
});
window.addEventListener('appinstalled', () => {
  installed = true;
  installPrompt = null;
  updateControls();
});
installButtons.forEach(button => button.addEventListener('click', requestInstall));
platformButtons.forEach(button => button.addEventListener('click',
  () => selectPlatform(button.dataset.installPlatform)));
standalone.addEventListener?.('change', () => updateControls());
selectPlatform(selectedPlatform);
updateControls();
