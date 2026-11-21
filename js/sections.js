/* =============================================================================
   Familiar — section behaviour, top to bottom
   -----------------------------------------------------------------------------
   Every piece of copy that depends on state (dread, the visitor's session,
   what they've clicked) is produced by a render function that reads that
   state and calls F.t(). Each one is re-run on 'lang', so switching language
   at any moment re-renders in place without resetting anything.
   ========================================================================== */
(function () {
  'use strict';

  const F = window.Familiar;
  const M = F.metrics;
  const $ = (id) => document.getElementById(id);
  const $$ = (sel, scope) => Array.from((scope || document).querySelectorAll(sel));
  const html = document.documentElement;
  const env = F.env();

  const dayPart = () => {
    const h = new Date().getHours();
    return h >= 5 && h < 12 ? 'morning' : h >= 12 && h < 18 ? 'afternoon' : 'evening';
  };

  /* ================================================================ NAV == */

  const navCta = $('nav-cta');
  let ctaState = '';
  function renderCta() {
    const d = F.dread;
    const i = d < 0.5 ? 0 : d < 0.75 ? 1 : 2;
    const state = i + F.lang;
    if (state === ctaState) return;
    ctaState = state;
    navCta.dataset.glitch = F.t(`nav.cta.${i}.glitch`);
    F.setText(navCta, F.t(`nav.cta.${i}`));
  }
  F.on('dread', renderCta);
  F.on('lang', renderCta);
  renderCta();

  /* The logo's highlight slowly becomes an iris, then an eye. */
  const mark = document.querySelector('.brand__mark');
  const iris = document.querySelector('.brand__iris');
  const pupil = document.querySelector('.brand__pupil');
  const blood = document.querySelector('.brand__blood');
  let markQueued = false;
  function drawMark() {
    markQueued = false;
    const d = F.dread;
    const t = F.smooth(0.3, 0.72, d);
    let x = F.lerp(20, 16, t);
    let y = F.lerp(12, 16, t);
    const p = F.pointer;
    if (t > 0 && p.active) {
      const r = mark.getBoundingClientRect();
      const dx = p.x - (r.left + r.width / 2);
      const dy = p.y - (r.top + r.height / 2);
      const dist = Math.hypot(dx, dy) || 1;
      const m = Math.min(1, dist / 120) * 4.2 * t;
      x += (dx / dist) * m;
      y += (dy / dist) * m;
    }
    const k = F.smooth(0.55, 0.78, d);
    iris.setAttribute('cx', x.toFixed(2));
    iris.setAttribute('cy', y.toFixed(2));
    iris.setAttribute('r', F.lerp(5, 6.8, t).toFixed(2));
    iris.setAttribute('fill', k > 0.5 ? '#5b4bd6' : '#ffffff');
    iris.setAttribute('opacity', (0.92 + 0.08 * t).toFixed(2));
    pupil.setAttribute('cx', x.toFixed(2));
    pupil.setAttribute('cy', y.toFixed(2));
    pupil.setAttribute('r', (3.3 * F.smooth(0.42, 0.75, d)).toFixed(2));
    blood.setAttribute('opacity', k.toFixed(3));
  }
  const queueMark = () => {
    if (!markQueued) {
      markQueued = true;
      requestAnimationFrame(drawMark);
    }
  };
  F.on('dread', queueMark);
  F.on('pointer', queueMark);

  /* =============================================================== HERO == */

  const heroTitle = $('hero-title');
  const heroSub = $('hero-sub');
  const heroPill = $('hero-pill');
  const heroMicro = $('hero-micro');
  const mockHello = $('mock-hello');
  const mockLearn = $('mock-learn');

  let returning = null; // { kind: 'leave' | 'return', awayMs }
  let learned = 87;

  function renderHero() {
    mockHello.textContent = F.t(`mock.${returning ? 'again' : 'hello'}.${dayPart()}`);
    mockLearn.textContent = returning ? '100%' : learned + '%';
    if (!returning) return; // the normal copy is page copy, handled by i18n.js
    heroTitle.innerHTML = F.t('hero.wb.title');
    heroSub.textContent =
      returning.kind === 'leave'
        ? F.t('hero.wb.leave')
        : F.t('hero.wb.return', { away: F.fmtDuration(returning.awayMs) });
    heroPill.textContent = F.t('hero.wb.pill');
    heroMicro.innerHTML = F.t('hero.wb.micro');
  }
  F.on('lang', renderHero);

  setInterval(() => {
    if (learned < 99 && !returning) {
      learned++;
      mockLearn.textContent = learned + '%';
    }
  }, 9000);

  function welcomeBack(kind, awayMs) {
    returning = { kind, awayMs };
    html.classList.add('is-returning');
    F.floor = 0.1; // it never quite goes back to normal
    renderHero();
    F.refreshDread();
    F.emit('welcome-back', kind);
  }

  renderHero();
  const seen = Number(F.store.get('seen'));
  if (seen) welcomeBack('return', Date.now() - seen);

  /* ============================================================== STATS == */
  /* Formats differ by language (10k+ vs 10,000+, 2.4M vs 240萬), so each stat
     remembers how far its count-up got and re-renders from there. */

  const stats = $$('[data-count]');
  const renderStat = (el) => {
    const k = el._k === undefined ? 1 : el._k;
    el.textContent = F.t(`stat.fmt.${el.dataset.stat}`, parseFloat(el.dataset.count) * (1 - Math.pow(1 - k, 3)));
  };
  function countUp(el) {
    if (F.reducedMotion) {
      el._k = 1;
      renderStat(el);
      return;
    }
    const t0 = performance.now();
    const step = (now) => {
      el._k = F.clamp((now - t0) / 1600);
      renderStat(el);
      if (el._k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  const statIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        statIO.unobserve(e.target);
        countUp(e.target);
      }
    });
  }, { threshold: 0.6 });
  stats.forEach((el) => {
    renderStat(el);
    statIO.observe(el);
  });
  F.on('lang', () => stats.forEach(renderStat));

  /* =========================================================== LIVE DEMO == */

  const offset = -new Date().getTimezoneOffset() / 60;
  const utc = `UTC${offset >= 0 ? '+' : '−'}${Math.abs(offset)}`;
  $('lv-zone').textContent = env.city ? `${env.city} · ${utc}` : utc;
  $('lv-screen').textContent = `${env.w} × ${env.h}${devicePixelRatio > 1 ? ` @${Math.round(devicePixelRatio * 10) / 10}x` : ''}`;
  $('lv-lang').textContent = env.lang;

  function renderLiveStatic() {
    $('lv-device').textContent = F.t('live.device', {
      browser: env.browser || F.t('live.unknownBrowser'),
      os: env.os || F.t('live.unknownOs'),
    });
    $('lv-theme').textContent = F.t(env.dark ? 'live.dark' : 'live.light') + (F.reducedMotion ? F.t('live.lessMotion') : '');
  }
  renderLiveStatic();

  const lvTime = $('lv-time');
  const lvElapsed = $('lv-elapsed');
  const lvMouse = $('lv-mouse');
  const lvBar = $('lv-bar');
  const lvPct = $('lv-pct');
  function tickLive() {
    const weekday = new Date().toLocaleDateString(F.locale(), { weekday: 'long' });
    lvTime.textContent = `${F.localTime()} · ${weekday}`;
    lvElapsed.textContent = F.fmtClock(F.elapsed());
    lvMouse.textContent =
      M.mouseDistance > 0 ? `${Math.round(M.mouseDistance).toLocaleString('en-US')} px` : F.finePointer ? '0 px' : F.t('live.touch');
    const pct = Math.min(99, Math.round(34 + 58 * F.smooth(0.3, 0.62, F.dread) + Math.min(6, F.elapsed() / 30000)));
    lvPct.textContent = F.t('live.pct', { n: pct });
    lvBar.style.width = pct + '%';
  }
  tickLive();
  setInterval(tickLive, 1000);

  let battery = null;
  const renderBattery = () => {
    if (battery) $('lv-battery').textContent = `${Math.round(battery.level * 100)}%${battery.charging ? F.t('live.charging') : ''}`;
  };
  if (navigator.getBattery) {
    navigator.getBattery().then((b) => {
      battery = b;
      $('lv-battery-row').classList.remove('is-hidden');
      renderBattery();
      b.addEventListener('levelchange', renderBattery);
      b.addEventListener('chargingchange', renderBattery);
    }).catch(() => {});
  }

  F.on('lang', () => {
    renderLiveStatic();
    tickLive();
    renderBattery();
  });

  // "Don't worry, this runs entirely in your browser." ... and then, a little later:
  const forNow = $('for-now');
  let forNowTimer = 0;
  new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      clearTimeout(forNowTimer);
      if (e.isIntersecting) forNowTimer = setTimeout(() => forNow.classList.add('is-on'), 4200);
    });
  }, { threshold: 0.6 }).observe(document.querySelector('.live'));

  /* ============================================================ PRICING == */

  const billingOpts = $$('.billing__opt');
  let billing = 'monthly';
  function renderBilling() {
    billingOpts.forEach((o) => {
      const on = o.dataset.billing === billing;
      o.classList.toggle('is-active', on);
      o.setAttribute('aria-pressed', String(on));
    });
    $$('.plan__amount[data-monthly]').forEach((a) => (a.textContent = a.dataset[billing]));
    $$('[data-per]').forEach((p) => (p.textContent = F.t(`plan.per.${billing}`)));
  }
  billingOpts.forEach((btn) =>
    btn.addEventListener('click', () => {
      billing = btn.dataset.billing;
      renderBilling();
    })
  );
  renderBilling();
  F.on('lang', renderBilling);

  /* ================================================================ FAQ == */
  /* Answers type themselves out — and are different every time you look.
     On a language switch, an answer that is mid-sentence is cancelled and
     shown whole, in the new language; how many times each question has been
     opened is kept. */

  const faqItems = $$('.faq__item').map((item) => {
    const a = item.querySelector('.faq__a');
    const p = a.querySelector('p');
    const key = a.dataset.i18nList;
    const delay = Number(a.dataset.delay || 0);
    const state = { opens: 0, shown: 0, token: 0 };
    const variants = () => F.t(key);

    item.addEventListener('toggle', async () => {
      if (!item.open) return;
      const list = variants();
      const idx = Math.min(state.opens, list.length - 1);
      state.opens++;
      state.shown = idx;
      const my = ++state.token;
      const text = list[idx];
      const caret = document.createElement('span');
      caret.className = 'caret';
      p.textContent = '';
      p.appendChild(caret);
      if (delay) await F.sleep(delay);
      if (my !== state.token) return;
      if (F.reducedMotion) {
        p.textContent = text;
        return;
      }
      const speed = (F.lang === 'zh-Hant' ? 34 : 16) + F.dread * 26;
      const chars = Array.from(text);
      for (let i = 1; i <= chars.length; i++) {
        if (my !== state.token || !item.open) return;
        p.textContent = chars.slice(0, i).join('');
        p.appendChild(caret);
        await F.sleep(/[.。？！?!]/.test(chars[i - 1]) ? speed * 9 : speed);
      }
      await F.sleep(900);
      if (my === state.token) caret.remove();
    });

    return {
      relang() {
        state.token++; // stop any typing in progress
        p.textContent = variants()[state.shown] || '';
      },
    };
  });
  faqItems.forEach((f) => f.relang());
  F.on('lang', () => faqItems.forEach((f) => f.relang()));

  /* =============================================================== TEAM == */

  const S = F.SARAH;
  const TEAM = [
    { name: 'Marcus Hale', face: { skin: '#e8b894', hair: '#2b1d14', hairStyle: 'short', bg: '#3b3546', shirt: '#26222e' } },
    { name: 'Priya Raman', face: { skin: '#c98e64', hair: '#120d0b', hairStyle: 'long', bg: '#34303e', shirt: '#4a3d5e', spread: 14.5, mouth: 'flat' } },
    { name: 'Daniel Osei', face: { skin: '#8d5a3b', hair: '#0f0a08', hairStyle: 'curly', bg: '#302b34', shirt: '#2a2a2a', eyes: 'wide' }, gray: 0.2 },
    { name: 'Sarah K.', face: Object.assign({}, S, { bg: '#2e2a33', shirt: '#4b3f6b', eyes: 'void' }), gray: 0.35 },
    { name: 'Sarah K.', face: Object.assign({}, S, { bg: '#2a2428', shirt: '#3d2f45', eyes: 'void', mouth: 'wide', blush: false }), gray: 0.55 },
    { redacted: true, face: { skin: '#cdbfb2', hair: '#1a1412', hairStyle: 'bob', bg: '#221d1f', shirt: '#1d1a1c', eyes: 'closed', mouth: 'sewn', blush: false }, gray: 0.85 },
    { name: '—', face: { skin: '#bdb4aa', hairStyle: 'none', bg: '#1b1718', shirt: '#151213', features: false, blush: false }, gray: 1, contrast: 1.25 },
    { you: true },
  ];

  const grid = $('team-grid');
  grid.innerHTML = TEAM.map((m) => {
    const photo = m.you ? F.silhouette() : F.face(m.face);
    const name = m.redacted ? '<span class="redacted" role="img"></span>' : F.escape(m.name || '');
    return `<article class="member reveal${m.you ? ' member--you' : ''}">
      <div class="member__photo" style="--gray:${m.gray || 0};--contrast:${m.contrast || 1}">${photo}</div>
      <h3>${name}</h3>
      <p></p>
    </article>`;
  }).join('');
  const cards = $$('.member', grid);

  function renderTeam() {
    cards.forEach((card, i) => {
      const m = TEAM[i];
      card.querySelector('p').textContent = m.you ? F.t('team.you.role') : F.t(`team.role.${i}`);
      if (m.you) {
        card.querySelector('h3').textContent = F.t('team.you.name');
        const label = card.querySelector('.silhouette__label');
        if (label) label.textContent = F.t('team.you.photo');
      }
      if (m.redacted) card.querySelector('.redacted').setAttribute('aria-label', F.t('team.redacted'));
    });
  }
  renderTeam();
  F.on('lang', renderTeam);
  F.watchFaces(grid);
  cards.forEach(F.reveal);

  /* ========================================================== MONOLOGUE == */

  const DWELL_SECTIONS = ['pricing', 'faq', 'customers', 'demo', 'how', 'features'];

  const lines = [
    () => F.t('mono.hello'),
    () => F.t('mono.elapsed', { d: F.fmtDuration(F.elapsed()) }),
    () => {
      const h = new Date().getHours();
      const slot = h < 5 ? 'night' : h < 9 ? 'early' : h < 18 ? 'day' : h < 21 ? 'dusk' : 'late';
      return F.t(`mono.time.${slot}`, { t: F.localTime() });
    },
    () => {
      const n = M.scrollUps;
      return F.t(n === 0 ? 'mono.scroll.0' : n === 1 ? 'mono.scroll.1' : 'mono.scroll.n', { n });
    },
    () => {
      let best = null;
      let ms = 0;
      for (const key of DWELL_SECTIONS) {
        if ((M.dwell[key] || 0) > ms) {
          ms = M.dwell[key];
          best = key;
        }
      }
      if (!best || ms < 4000) return F.t('mono.dwell.none');
      return F.t('mono.dwell', {
        s: Math.round(ms / 1000),
        label: F.t(`mono.sec.${best}.label`),
        remark: F.t(`mono.sec.${best}.remark`),
      });
    },
    () => F.t(`mono.cookie.${M.cookie === 'accepted' ? 'accepted' : M.cookie === 'rejected' ? 'rejected' : 'none'}`),
    () => {
      const last = M.chatMessages[M.chatMessages.length - 1];
      if (last) {
        const chars = Array.from(last);
        const short = chars.length > 40 ? chars.slice(0, 38).join('') + '…' : last;
        return F.t('mono.chat.msg', { msg: F.escape(short) });
      }
      return F.t(M.chatOpened ? 'mono.chat.opened' : 'mono.chat.none');
    },
    () => F.t('mono.screen', { w: env.w, h: env.h }),
    () => {
      const n = M.hiddenCount;
      return F.t(n === 0 ? 'mono.hidden.0' : n === 1 ? 'mono.hidden.1' : 'mono.hidden.n', { n });
    },
    () => F.t('mono.room'),
    () => F.t('mono.turn'),
  ];

  const mono = $('monologue');
  const monoLine = $('mono-line');
  const monoProgress = $('mono-progress');
  mono.style.setProperty('--lines', lines.length);
  let monoIdx = -1;
  let monoToken = 0;
  F.holdBreath = false;

  async function showLine(i) {
    const my = ++monoToken;
    const last = i === lines.length - 1;
    F.holdBreath = last;
    F.audio.hush(last); // silence for the last line
    if (!F.reducedMotion) {
      monoLine.classList.add('is-out');
      await F.sleep(520);
      if (my !== monoToken) return;
    }
    monoLine.innerHTML = lines[i]();
    monoLine.classList.remove('is-out');
  }

  function monoUpdate() {
    const r = mono.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) {
      if (F.holdBreath) {
        F.holdBreath = false;
        F.audio.hush(false);
      }
      return;
    }
    const p = F.clamp(-r.top / (r.height - innerHeight));
    monoProgress.style.width = (p * 100).toFixed(1) + '%';
    const i = Math.min(lines.length - 1, Math.floor(p * lines.length));
    if (i !== monoIdx) {
      monoIdx = i;
      showLine(i);
    }
  }
  F.on('scroll', monoUpdate);

  // re-say the current line in the new language, without the fade
  F.on('lang', () => {
    monoToken++;
    monoLine.innerHTML = lines[Math.max(0, monoIdx)]();
    monoLine.classList.remove('is-out');
  });
  monoLine.innerHTML = lines[0]();

  /* ================================================================ EYE == */

  const eyeSection = $('eye');
  const eyeWrap = $('eye-wrap');
  const eyeCaption = $('eye-caption');
  let capIdx = 0;
  let capToken = 0;
  const caption = (i) => F.t('eye.captions')[i];
  eyeCaption.textContent = caption(0);

  F.on('scroll', () => {
    const r = eyeSection.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    const p = F.clamp(-r.top / (r.height - innerHeight));
    eyeWrap.style.setProperty('--eye-scale', (1 + p * p * 0.95).toFixed(3));
    const count = F.t('eye.captions').length;
    const i = Math.min(count - 1, Math.floor(p * count));
    if (i !== capIdx) {
      capIdx = i;
      const my = ++capToken;
      eyeCaption.classList.add('is-out');
      setTimeout(() => {
        if (my !== capToken) return;
        eyeCaption.textContent = caption(i);
        eyeCaption.classList.remove('is-out');
      }, F.reducedMotion ? 0 : 600);
    }
  });
  F.on('lang', () => {
    capToken++;
    eyeCaption.textContent = caption(capIdx);
    eyeCaption.classList.remove('is-out');
  });

  /* ========================================================== SUBSCRIBE == */
  /* Whatever you type, it's already filled in. */

  const subForm = $('subscribe-form');
  const subInput = $('subscribe-email');
  const subBtn = $('subscribe-btn');
  const subMsg = $('subscribe-msg');
  let subDone = false;
  let subMsgKey = '';

  const overwrite = () => {
    const n = Array.from(subInput.value).length;
    const phrase = Array.from(F.t('sub.phrase'));
    let out = '';
    for (let i = 0; i < n; i++) out += phrase[i % phrase.length];
    subInput.value = out;
  };
  function renderSub() {
    subBtn.textContent = F.t(subDone ? 'sub.done' : 'sub.button');
    subMsg.textContent = subMsgKey ? F.t(subMsgKey) : '';
    if (subInput.value) overwrite();
  }
  subInput.addEventListener('input', overwrite);
  subForm.addEventListener('submit', (e) => {
    e.preventDefault();
    subDone = true;
    subMsgKey = subInput.value ? 'sub.msg.typed' : 'sub.msg.empty';
    subBtn.disabled = true;
    subInput.disabled = true;
    renderSub();
  });
  renderSub();
  F.on('lang', renderSub);

  /* ======================================================= FINALE/SCARE == */

  const finale = $('finale');
  const scare = $('scare');
  let finaleVisible = false;
  let scareState = 'idle'; // idle → waiting → done

  async function runFinale() {
    scareState = 'waiting';
    finale.classList.add('is-in');
    F.store.set('seen', String(Date.now()));
    await F.sleep(3400);
    if (!finaleVisible) {
      scareState = 'idle'; // they looked away; it can wait
      return;
    }
    scareState = 'done';

    scare.innerHTML = F.scareFace();
    F.audio.hush(true);
    scare.classList.add('is-on'); // everything goes black, and quiet
    await F.sleep(1100);
    F.audio.sting();
    scare.classList.add('is-face');
    await F.sleep(F.reducedMotion ? 1100 : 760);
    scare.classList.remove('is-face');
    await F.sleep(380);
    finale.classList.add('is-done');
    scare.classList.add('is-fading');
    await F.sleep(1700);
    scare.className = 'scare';
    scare.innerHTML = '';
    F.audio.hush(false);
  }

  new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      finaleVisible = e.isIntersecting;
      if (finaleVisible && scareState === 'idle') runFinale();
    });
  }, { threshold: 0.6 }).observe(finale);

  /* ============================================================= FOOTER == */

  $('leave-link').addEventListener('click', (e) => {
    e.preventDefault();
    F.autoScrolling = true;
    welcomeBack('leave');
    scrollTo({ top: 0, behavior: F.reducedMotion ? 'auto' : 'smooth' });
    setTimeout(() => (F.autoScrolling = false), 4000);
  });

  $('forget-link').addEventListener('click', (e) => {
    e.preventDefault();
    F.store.clear();
    location.href = location.pathname;
  });

  /* ========================================================= COOKIES == */

  const cookie = $('cookie');
  const cookieBtns = $$('[data-cookie]', cookie);
  let cookiePhase = 1;

  /* Buttons are relabelled in place (never re-created) so keyboard focus
     survives a language switch. */
  function renderCookie() {
    const p2 = cookiePhase === 2;
    $('cookie-title').textContent = F.t(p2 ? 'cookie2.title' : 'cookie.title');
    $('cookie-text').textContent = F.t(p2 ? 'cookie2.text' : 'cookie.text');
    cookieBtns[0].textContent = F.t(p2 ? 'cookie2.accept' : 'cookie.reject');
    cookieBtns[1].textContent = F.t(p2 ? 'cookie2.accept' : 'cookie.accept');
    cookieBtns[0].dataset.cookie = p2 ? 'x' : 'rejected';
    cookieBtns[1].dataset.cookie = p2 ? 'x' : 'accepted';
  }
  renderCookie();
  F.on('lang', renderCookie);

  setTimeout(() => {
    if (cookiePhase === 1) cookie.hidden = false;
  }, 1400);

  cookie.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-cookie]');
    if (!btn) return;
    if (cookiePhase === 1) M.cookie = btn.dataset.cookie;
    cookie.hidden = true;
  });

  F.on('dread', (d) => {
    if (cookiePhase === 1 && d > 0.8) {
      cookiePhase = 2;
      renderCookie();
      cookie.hidden = false;
    }
  });

  /* ======================================================= GHOST CURSOR == */
  /* A second pointer that replays yours a moment late. The lag shrinks as you
     go down the page: it's catching up. */

  const ghost = $('ghost-cursor');
  if (F.finePointer && !F.reducedMotion && ghost) {
    const trail = [];
    F.on('pointer', (p) => {
      if (p.type !== 'mouse') return;
      const now = performance.now();
      trail.push({ t: now, x: p.x, y: p.y });
      while (trail.length > 2 && now - trail[0].t > 2200) trail.shift();
    });
    let shown = false;
    const frame = (now) => {
      const d = F.dread;
      const op = 0.8 * F.smooth(0.42, 0.85, d);
      if (op > 0.01 && F.pointer.active && trail.length) {
        const delay = F.holdBreath ? 30 : F.lerp(1400, 260, F.smooth(0.42, 1, d));
        const target = now - delay;
        let s = trail[0];
        for (let i = trail.length - 1; i >= 0; i--) {
          if (trail[i].t <= target) {
            s = trail[i];
            break;
          }
        }
        const off = F.holdBreath ? 16 : 0;
        ghost.style.transform = `translate(${(s.x - 2 + off).toFixed(1)}px, ${(s.y - 2 + off).toFixed(1)}px)`;
        ghost.style.opacity = op.toFixed(3);
        shown = true;
      } else if (shown) {
        ghost.style.opacity = '0';
        shown = false;
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  /* first paint with everything wired up */
  F.refreshDread();
  monoUpdate();
})();
