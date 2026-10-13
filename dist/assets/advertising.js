(function () {
  'use strict';
  const config = window.VialchemyAdConfig || {};
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  // URL flags cannot enable advertising on the public site.
  const test = local && new URLSearchParams(location.search).get('ads-test') === '1';
  const approved = location.protocol === 'https:' &&
    ['studio1108.com.br', 'www.studio1108.com.br'].includes(location.hostname) &&
    config.accountApproved === true && config.childPrivacyReviewed === true;
  const displayEnabled = approved && config.displayEnabled === true;
  const rewardedEnabled = test || (approved && config.h5Approved === true && config.rewardedEnabled === true);
  let sdkPromise;
  function loadSdk(rewarded) {
    if (sdkPromise) return sdkPromise;
    sdkPromise = new Promise((resolve, reject) => {
      if (!/^ca-pub-\d{16}$/.test(config.publisher || '')) { reject(new Error('Publisher unavailable')); return; }
      const queue = window.adsbygoogle = window.adsbygoogle || [];
      queue.requestNonPersonalizedAds = 1;
      const script = document.createElement('script');
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + config.publisher;
      script.setAttribute('data-ad-client', config.publisher);
      script.setAttribute('data-tag-for-age-treatment', '1');
      script.setAttribute('data-tag-for-child-directed-treatment', '1');
      script.setAttribute('data-tag-for-under-age-of-consent', '1');
      if (test) script.setAttribute('data-adbreak-test', 'on');
      if (rewarded) window.adBreak = window.adConfig = options => queue.push(options);
      const timer = setTimeout(() => reject(new Error('Ad service timeout')), 15000);
      script.onload = () => {
        if (rewarded) window.adConfig({ sound: 'off', preloadAdBreaks: 'on', onReady: () => { clearTimeout(timer); resolve(); } });
        else { clearTimeout(timer); resolve(); }
      };
      script.onerror = () => { clearTimeout(timer); reject(new Error('Ad service unavailable')); };
      document.head.append(script);
    });
    const attempt = sdkPromise;
    return attempt.catch(error => { if (sdkPromise === attempt) sdkPromise = null; throw error; });
  }
  const flow = window.createVialchemyRewardedFlow
    ? window.createVialchemyRewardedFlow(options => window.adBreak(options)) : null;
  let pending = null;
  window.VialchemyRewarded = Object.freeze({
    prepare(id, emit) {
      if (!rewardedEnabled || !flow || pending) return false;
      const session = { id, emit };
      pending = session;
      loadSdk(true).then(() => {
        if (pending !== session) return;
        window.adConfig({ sound: 'off' });
        flow.prepare(id, event => {
          if (pending !== session) return;
          if (['closed', 'dismissed', 'unavailable'].includes(event)) pending = null;
          emit(event);
        });
      }).catch(() => {
        if (pending !== session) return;
        pending = null;
        emit('unavailable');
      });
      return true;
    },
    show(id) { return !!flow && flow.show(id); },
    cancel(id) {
      if (!pending || pending.id !== id) return;
      pending = null;
      flow?.cancel(id);
    }
  });
  // Manual placements only: no overlays, automatic refresh, or rewarded banners.
  const mounted = new WeakSet();
  async function mountDisplay() {
    if (!displayEnabled || !/^\d+$/.test(config.displaySlot || '')) return;
    document.querySelectorAll('[data-ad-placement="site-footer"]').forEach(slot => { slot.hidden = false; });
    const slots = [...document.querySelectorAll('[data-ad-placement]')].filter(slot =>
      !mounted.has(slot) && slot.getBoundingClientRect().width >= 250 &&
      slot.getBoundingClientRect().height > 0);
    if (!slots.length) return;
    slots.forEach(slot => mounted.add(slot));
    try { await loadSdk(false); } catch { return; }
    for (const slot of slots) {
      if (!slot.getBoundingClientRect().height) continue;
      const ad = document.createElement('ins');
      ad.className = 'adsbygoogle';
      ad.style.cssText = 'display:block;width:100%';
      ad.setAttribute('data-ad-client', config.publisher);
      ad.setAttribute('data-ad-slot', config.displaySlot);
      ad.setAttribute('data-ad-format', slot.classList.contains('ad-desktop') ? 'rectangle' : 'horizontal');
      ad.setAttribute('data-full-width-responsive', 'false');
      ad.setAttribute('data-tag-for-age-treatment', '1');
      ad.setAttribute('data-tag-for-child-directed-treatment', '1');
      ad.setAttribute('data-tag-for-under-age-of-consent', '1');
      slot.querySelectorAll('strong,small').forEach(element => element.remove());
      slot.classList.add('ad-live');
      slot.setAttribute('aria-label', 'Publicidade');
      slot.append(ad);
      try { window.adsbygoogle.push({}); } catch { ad.remove(); }
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountDisplay, { once: true });
  else mountDisplay();
})();
