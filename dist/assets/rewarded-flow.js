/* One optional reward, confirmed by the provider; never a reward for clicking an ad. */
(function (root) {
  'use strict';
  function createRewardedFlow(requestAd, schedule = setTimeout, unschedule = clearTimeout) {
    let active = null;
    function cancel(id) {
      if (!active || active.id !== id) return;
      unschedule(active.timer);
      active = null;
    }
    function prepare(id, emit) {
      if (active) return false;
      const session = { id, emit, state: 'loading', viewed: false, timer: null, showAd: null };
      active = session;
      const current = () => active === session;
      function finish(event) {
        if (!current()) return;
        cancel(id);
        emit(event);
      }
      session.timer = schedule(() => finish('unavailable'), 45000);
      try {
        requestAd({
          type: 'reward', name: 'vialchemy-resource',
          beforeReward(showAd) {
            if (!current() || session.state !== 'loading' || typeof showAd !== 'function') return;
            session.showAd = showAd;
            session.state = 'ready';
            emit('ready');
          },
          beforeAd() {
            if (!current() || session.state !== 'requested') return;
            unschedule(session.timer);
            session.state = 'showing';
            emit('showing'); // Synchronous Unity callback mutes/pauses before the ad.
          },
          adViewed() {
            if (!current() || session.state !== 'showing' || session.viewed) return;
            session.viewed = true;
            emit('viewed');
          },
          adDismissed() { if (current()) session.viewed = false; },
          afterAd() { finish(session.viewed ? 'closed' : 'dismissed'); },
          adBreakDone() {
            // A status string alone is not proof of completion: adViewed is required.
            finish(session.viewed ? 'closed' : 'unavailable');
          }
        });
      } catch { finish('unavailable'); }
      return true;
    }
    function show(id) {
      const session = active;
      if (!session || session.id !== id || session.state !== 'ready') return false;
      session.state = 'requested';
      const showAd = session.showAd;
      session.showAd = null;
      try { showAd(); } catch {
        cancel(id);
        session.emit('unavailable');
        return false;
      }
      return true;
    }
    return { prepare, show, cancel };
  }
  if (typeof module === 'object' && module.exports) module.exports = { createRewardedFlow };
  else root.createVialchemyRewardedFlow = createRewardedFlow;
})(typeof window === 'object' ? window : globalThis);
