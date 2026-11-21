/* =============================================================================
   Familiar — the privacy policy
   -----------------------------------------------------------------------------
   The page itself is ordinary legal copy (index.html-style data-i18n keys);
   the dread engine in core.js darkens it as you read. This file adds the
   parts that know who is reading:

     "Last updated" keeps updating, second by second, while you read
     section 3 quotes your actual browser, screen and time zone
     the end is signed, by you, with the time you got there
   ========================================================================== */
(function () {
  'use strict';

  const F = window.Familiar;
  const env = F.env();
  const $ = (id) => document.getElementById(id);

  const when = (date) =>
    date.toLocaleString(F.locale(), {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    });
  const device = () =>
    F.t('live.device', {
      browser: env.browser || F.t('live.unknownBrowser'),
      os: env.os || F.t('live.unknownOs'),
    });

  /* "We changed it while you were reading." */
  const updated = $('policy-updated');
  function tick() {
    const now = new Date();
    updated.textContent = when(now);
    updated.setAttribute('datetime', now.toISOString());
  }
  tick();
  setInterval(tick, 1000);

  /* The reader's own details, wherever the copy asks for them. The spans
     live inside translated HTML, so they are refilled after every switch. */
  function fillLive() {
    document.querySelectorAll('[data-pv]').forEach((el) => {
      const kind = el.dataset.pv;
      el.textContent =
        kind === 'device' ? device()
          : kind === 'screen' ? `${env.w} × ${env.h}`
            : [env.zone || 'UTC', env.lang].join(' · ');
    });
  }

  /* The signature: dated the moment you reached it. */
  const sign = $('policy-sign');
  const agreed = $('policy-agreed');
  const signature = $('policy-signature');
  let signedAt = null;
  function renderSign() {
    agreed.innerHTML = signedAt ? F.t('policy.agreed', { when: F.escape(when(signedAt)), device: F.escape(device()) }) : '';
    signature.textContent = F.t('team.you.photo');
  }
  new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting && !signedAt) {
        signedAt = new Date();
        renderSign();
        sign.classList.add('is-signed');
      }
    });
  }, { threshold: 0.5 }).observe(sign);

  fillLive();
  renderSign();
  F.on('lang', () => {
    tick();
    fillLive();
    renderSign();
  });
  F.refreshDread();
})();
