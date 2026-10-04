const toggle=document.querySelector('.nav-toggle');
const nav=document.querySelector('#navigation');
toggle?.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));nav.toggleAttribute('data-open',open);});
nav?.addEventListener('click',event=>{if(event.target.closest('a')){toggle.setAttribute('aria-expanded','false');nav.removeAttribute('data-open');}});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&nav?.hasAttribute('data-open')){nav.removeAttribute('data-open');toggle.setAttribute('aria-expanded','false');toggle.focus();}});
