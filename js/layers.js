/* =============================================================================
   Familiar — layers
   -----------------------------------------------------------------------------
   Things that happen around the page rather than on it. Each one starts as a
   familiar web-marketing trope and escalates with dread:

     exit intent   "Wait! Before you go 👋" … "you can't leave."
     idle veil     stop moving and the room dims
     console       "Hey there, curious one — we're hiring!" … an eye
     clipboard     "Read more at Familiar" … "we know what you copied."
     print         there's nothing to print

   Everything builds its own DOM and re-renders on 'lang', so any page that
   loads this file gets the layers. Nothing here leaves the browser.
   ========================================================================== */
(function () {
  'use strict';

  const F = window.Familiar;
  const M = F.metrics;
  M.exits = 0;
  M.idles = 0;
  M.copies = 0;

  const tierOf = (d) => (d < 0.3 ? 0 : d < 0.7 ? 1 : 2);
  const scaring = () => !!document.querySelector('.scare.is-on');
  const loadedAt = performance.now();

  /* ========================================================= EXIT INTENT == */

  const exit = document.createElement('div');
  exit.className = 'exit';
  exit.id = 'exit';
  exit.hidden = true;
  exit.innerHTML = `
    <div class="exit__card" role="dialog" aria-modal="true" aria-labelledby="exit-title" aria-describedby="exit-text">
      <button type="button" class="exit__close" data-exit="close">×</button>
      <p class="exit__eyebrow" id="exit-eyebrow"></p>
      <h2 class="exit__title" id="exit-title"></h2>
      <p class="exit__text" id="exit-text"></p>
      <p class="exit__timer" id="exit-timer"><span></span> <b></b></p>
      <div class="exit__actions">
        <button type="button" class="btn btn--primary" data-exit="yes"></button>
        <button type="button" class="btn btn--ghost" data-exit="no"></button>
      </div>
    </div>`;
  document.body.appendChild(exit);

  const card = exit.querySelector('.exit__card');
  const q = (sel) => exit.querySelector(sel);
  const closeBtn = q('[data-exit="close"]');
  const yesBtn = q('[data-exit="yes"]');
  const noBtn = q('[data-exit="no"]');
  const timerEl = q('#exit-timer');

  const shown = [false, false, false];
  let openTier = null;
  let openedAt = 0;
  let lastOpen = -Infinity;
  let returnFocus = null;
  let timer = 0;
  let dodges = 0;

  const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  function renderTimer() {
    if (openTier === null || openTier === 2) return;
    const elapsed = Math.floor((performance.now() - openedAt) / 1000);
    // tier 0 counts down like every "limited offer"; tier 1 counts up
    timerEl.querySelector('b').textContent = openTier === 0 ? mmss(Math.max(0, 14 * 60 + 59 - elapsed)) : mmss(elapsed);
  }

  function renderExit() {
    if (openTier === null) return;
    const k = `exit.${openTier}`;
    exit.dataset.tier = openTier;
    q('#exit-eyebrow').textContent = F.t(k + '.eyebrow');
    q('#exit-title').textContent = F.t(k + '.title');
    q('#exit-text').textContent = F.t(k + '.text');
    yesBtn.textContent = F.t(k + '.yes');
    noBtn.textContent = F.t(k + '.no');
    closeBtn.setAttribute('aria-label', F.t('exit.close'));
    closeBtn.hidden = openTier === 2;
    timerEl.hidden = openTier === 2;
    timerEl.querySelector('span').textContent = F.t('exit.timer');
    renderTimer();
  }

  function openExit(tier) {
    openTier = tier;
    shown[tier] = true;
    openedAt = lastOpen = performance.now();
    M.exits++;
    dodges = 0;
    noBtn.style.transform = '';
    returnFocus = document.activeElement;
    renderExit();
    exit.hidden = false;
    yesBtn.focus({ preventScroll: true });
    clearInterval(timer);
    timer = setInterval(renderTimer, 1000);
  }

  function closeExit(how) {
    if (openTier === null) return;
    const tier = openTier;
    openTier = null;
    exit.hidden = true;
    clearInterval(timer);
    if (returnFocus && document.contains(returnFocus) && returnFocus.focus) returnFocus.focus({ preventScroll: true });
    if (how === 'yes' && F.chatSay) F.chatSay(() => F.t(`exit.${tier}.after`), 1300);
  }

  function maybeExit() {
    const now = performance.now();
    if (openTier !== null || F.autoScrolling || scaring()) return;
    if (now - loadedAt < 10000 || now - lastOpen < 20000) return;
    const tier = tierOf(F.dread);
    if (!shown[tier]) openExit(tier);
  }
  F.exitIntent = maybeExit; // for testing and for other layers

  // the mouse leaves through the top of the window, towards the tabs
  document.addEventListener('mouseout', (e) => {
    if (!e.relatedTarget && e.clientY < 8) maybeExit();
  });
  // on touch screens: a hard fling back up the page
  if (!F.finePointer) {
    let samples = [];
    addEventListener('scroll', () => {
      const now = performance.now();
      samples.push({ t: now, y: scrollY });
      while (samples.length && now - samples[0].t > 700) samples.shift();
      if (samples[0].y - scrollY > innerHeight * 1.2 && scrollY > innerHeight) {
        samples = [];
        maybeExit();
      }
    }, { passive: true });
  }

  exit.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-exit]');
    if (btn) closeExit(btn.dataset.exit);
    else if (!card.contains(e.target)) closeExit('backdrop');
  });
  // Keyboard, while the dialog is open: Esc always closes it, and Tab cycles
  // through its buttons (pulling focus back in if it ever got out).
  document.addEventListener('keydown', (e) => {
    if (openTier === null) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopImmediatePropagation();
      closeExit('esc');
    } else if (e.key === 'Tab') {
      const focusable = [closeBtn, yesBtn, noBtn].filter((b) => !b.hidden);
      const i = focusable.indexOf(document.activeElement);
      const next = i === -1 ? 0 : (i + (e.shiftKey ? -1 : 1) + focusable.length) % focusable.length;
      e.preventDefault();
      focusable[next].focus({ preventScroll: true });
    }
  }, true);
  // "No thanks" edges away from the mouse in the middle tier (three times, then gives up)
  noBtn.addEventListener('pointerenter', (e) => {
    if (openTier !== 1 || e.pointerType !== 'mouse' || F.reducedMotion || dodges >= 3) return;
    dodges++;
    noBtn.style.transform = `translate(${F.rand(-70, 70).toFixed(0)}px, ${F.rand(-34, -12).toFixed(0)}px)`;
  });
  F.on('lang', renderExit);

  /* ============================================================ IDLE VEIL == */

  const veil = document.createElement('div');
  veil.className = 'idle';
  veil.setAttribute('aria-hidden', 'true');
  veil.innerHTML = '<p class="idle__text"></p>';
  document.body.appendChild(veil);
  const veilText = veil.firstElementChild;

  let lastInput = performance.now();
  let veiled = false;

  function renderVeil() {
    const d = F.dread;
    veilText.textContent = F.t(`idle.${d < 0.55 ? 0 : d < 0.85 ? 1 : 2}`);
  }
  const poke = () => {
    lastInput = performance.now();
    if (veiled) {
      veiled = false;
      veil.classList.remove('is-on');
    }
  };
  ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'].forEach((type) =>
    addEventListener(type, poke, { passive: true })
  );
  setInterval(() => {
    if (veiled || document.hidden || openTier !== null || scaring() || F.dread < 0.2) return;
    if (performance.now() - lastInput > 12000) {
      veiled = true;
      M.idles++;
      renderVeil();
      veil.classList.add('is-on');
    }
  }, 1000);
  F.on('lang', () => veiled && renderVeil());

  /* ============================================================== CONSOLE == */
  /* console.log only, so it never looks like an error to anyone. */

  const STYLE = {
    hello: 'font: 600 15px Inter, system-ui, sans-serif; color: #5b5bd6',
    body: 'font: 13px Inter, system-ui, sans-serif; color: #5b6075',
    whisper: 'font: italic 14px Georgia, serif; color: #8a7f70',
    red: 'font: 600 14px Georgia, serif; color: #c4161c',
    eye: 'font: 12px/1.15 ui-monospace, monospace; color: #c4161c',
  };
  const EYE = [
    '         .-~~~~~~~~-.',
    '      .~   .-~~-.   ~.',
    '     (    (  ()  )    )',
    "      '~.  '-..-'  .~'",
    "         '-~~~~~~~-'",
  ].join('\n');

  console.log('%c' + F.t('console.hello'), STYLE.hello);
  console.log('%c' + F.t('console.hiring'), STYLE.body);
  const whispers = [
    { d: 0.45, key: 'console.why', style: 'whisper' },
    { d: 0.75, key: 'console.code', style: 'red' },
    { d: 0.95, key: 'console.behind', style: 'red', eye: true },
  ];
  F.on('dread', (d) => {
    whispers.forEach((w) => {
      if (w.done || d < w.d) return;
      w.done = true;
      if (w.eye) console.log('%c' + EYE, STYLE.eye);
      console.log('%c' + F.t(w.key), STYLE[w.style]);
    });
  });

  /* ============================================================ CLIPBOARD == */

  let askedAboutCopy = false;
  document.addEventListener('copy', (e) => {
    const active = document.activeElement;
    if (active && /^(INPUT|TEXTAREA)$/.test(active.tagName)) return; // never touch what people type
    const text = String(getSelection ? getSelection() : '');
    if (!text.trim() || !e.clipboardData) return;
    const tier = tierOf(F.dread);
    e.clipboardData.setData('text/plain', `${text}\n\n${F.t('copy.' + tier)}`);
    e.preventDefault();
    M.copies++;
    if (tier > 0 && !askedAboutCopy && F.chatSay) {
      askedAboutCopy = true;
      F.chatSay(() => F.t('chat.copy'), 1800);
    }
  });

  /* ================================================================ PRINT == */

  const print = document.createElement('div');
  print.className = 'print-only';
  print.setAttribute('aria-hidden', 'true');
  print.innerHTML = '<p class="print-only__title"></p><p class="print-only__text"></p>';
  document.body.appendChild(print);
  const renderPrint = () => {
    print.firstElementChild.textContent = F.t('print.title');
    print.lastElementChild.textContent = F.t('print.text');
  };
  renderPrint();
  F.on('lang', renderPrint);
})();
