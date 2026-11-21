/* =============================================================================
   Familiar — section behaviour, top to bottom
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
  F.on('dread', (d) => {
    const text = d < 0.5 ? 'Get started' : d < 0.75 ? 'Get closer' : 'Stay';
    if (navCta.dataset.orig !== text) {
      F.setText(navCta, text);
      navCta.dataset.glitch = d < 0.5 ? 'Get closer' : d < 0.75 ? 'Stay' : "Stay|Don't go|Stay with us";
    }
  });

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

  mockHello.textContent = `Good ${dayPart()}, there 👋`;

  let learned = 87;
  setInterval(() => {
    if (learned < 99 && !html.classList.contains('is-returning')) {
      learned++;
      mockLearn.textContent = learned + '%';
    }
  }, 9000);

  function welcomeBack(kind, awayMs) {
    html.classList.add('is-returning');
    F.floor = 0.1; // it never quite goes back to normal
    heroTitle.innerHTML = 'Welcome back. <span class="grad">We missed you.</span>';
    heroSub.textContent =
      kind === 'leave'
        ? "You tried to leave. You made it all the way back to the top. That's further than most."
        : `You were away for ${F.fmtDuration(awayMs)}. We didn't move a thing. We've been right here the whole time.`;
    heroPill.textContent = 'You came back';
    heroMicro.innerHTML = '<li>No credit card required</li><li>Already set up</li><li>Cancel <s>anytime</s></li>';
    mockHello.textContent = `Good ${dayPart()}, again.`;
    mockLearn.textContent = '100%';
    F.refreshDread();
    F.emit('welcome-back', kind);
  }

  const seen = Number(F.store.get('seen'));
  if (seen) welcomeBack('return', Date.now() - seen);

  /* ============================================================== STATS == */

  function countUp(el) {
    const to = parseFloat(el.dataset.count);
    const dec = Number(el.dataset.decimals || 0);
    const suffix = el.dataset.suffix || '';
    const fmt = (v) => (el.dataset.format === 'k' ? Math.round(v / 1000) + 'k' : v.toFixed(dec)) + suffix;
    if (F.reducedMotion) {
      el.textContent = fmt(to);
      return;
    }
    const t0 = performance.now();
    const step = (now) => {
      const k = F.clamp((now - t0) / 1600);
      el.textContent = fmt(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
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
  $$('[data-count]').forEach((el) => statIO.observe(el));

  /* =========================================================== LIVE DEMO == */

  const offset = -new Date().getTimezoneOffset() / 60;
  const utc = `UTC${offset >= 0 ? '+' : '−'}${Math.abs(offset)}`;
  $('lv-zone').textContent = env.city ? `${env.city} · ${utc}` : utc;
  $('lv-device').textContent = `${env.browser} on ${env.os}`;
  $('lv-screen').textContent = `${env.w} × ${env.h}${devicePixelRatio > 1 ? ` @${Math.round(devicePixelRatio * 10) / 10}x` : ''}`;
  $('lv-theme').textContent = `${env.dark ? 'Dark' : 'Light'} mode${F.reducedMotion ? ' · less motion' : ''}`;
  $('lv-lang').textContent = env.lang;

  const lvTime = $('lv-time');
  const lvElapsed = $('lv-elapsed');
  const lvMouse = $('lv-mouse');
  const lvBar = $('lv-bar');
  const lvPct = $('lv-pct');
  const weekday = new Date().toLocaleDateString([], { weekday: 'long' });
  function tickLive() {
    lvTime.textContent = `${F.localTime()} · ${weekday}`;
    lvElapsed.textContent = F.fmtClock(F.elapsed());
    lvMouse.textContent = M.mouseDistance > 0 ? `${Math.round(M.mouseDistance).toLocaleString()} px` : F.finePointer ? '0 px' : 'touch';
    const pct = Math.min(99, Math.round(34 + 58 * F.smooth(0.3, 0.62, F.dread) + Math.min(6, F.elapsed() / 30000)));
    lvPct.textContent = pct;
    lvBar.style.width = pct + '%';
  }
  tickLive();
  setInterval(tickLive, 1000);

  if (navigator.getBattery) {
    navigator.getBattery().then((b) => {
      const show = () => {
        $('lv-battery').textContent = `${Math.round(b.level * 100)}%${b.charging ? ' · charging' : ''}`;
      };
      $('lv-battery-row').classList.remove('is-hidden');
      show();
      b.addEventListener('levelchange', show);
      b.addEventListener('chargingchange', show);
    }).catch(() => {});
  }

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
  billingOpts.forEach((btn) =>
    btn.addEventListener('click', () => {
      const mode = btn.dataset.billing;
      billingOpts.forEach((o) => {
        o.classList.toggle('is-active', o === btn);
        o.setAttribute('aria-pressed', String(o === btn));
      });
      $$('.plan__amount[data-monthly]').forEach((a) => {
        a.textContent = a.dataset[mode];
        a.nextElementSibling.textContent = mode === 'yearly' ? '/ month, billed yearly' : '/ month';
      });
    })
  );

  /* ================================================================ FAQ == */
  /* Answers type themselves out — and are different every time you look. */

  $$('.faq__item').forEach((item) => {
    const a = item.querySelector('.faq__a');
    const p = a.querySelector('p');
    const variants = a.dataset.variants.split('||');
    const delay = Number(a.dataset.delay || 0);
    let opens = 0;
    let token = 0;

    item.addEventListener('toggle', async () => {
      if (!item.open) return;
      const text = variants[Math.min(opens, variants.length - 1)];
      opens++;
      const my = ++token;
      const caret = document.createElement('span');
      caret.className = 'caret';
      p.textContent = '';
      p.appendChild(caret);
      if (delay) await F.sleep(delay);
      if (F.reducedMotion) {
        if (my === token) p.textContent = text;
        return;
      }
      const speed = 16 + F.dread * 26;
      for (let i = 1; i <= text.length; i++) {
        if (my !== token || !item.open) return;
        p.textContent = text.slice(0, i);
        p.appendChild(caret);
        await F.sleep(text[i - 1] === '.' ? speed * 9 : speed);
      }
      await F.sleep(900);
      if (my === token) caret.remove();
    });
  });

  /* =============================================================== TEAM == */

  const S = F.SARAH;
  const TEAM = [
    { name: 'Marcus Hale', role: 'CEO & Co-founder', face: { skin: '#e8b894', hair: '#2b1d14', hairStyle: 'short', bg: '#3b3546', shirt: '#26222e' } },
    { name: 'Priya Raman', role: 'CTO & Co-founder', face: { skin: '#c98e64', hair: '#120d0b', hairStyle: 'long', bg: '#34303e', shirt: '#4a3d5e', spread: 14.5, mouth: 'flat' } },
    { name: 'Daniel Osei', role: 'Head of Design', face: { skin: '#8d5a3b', hair: '#0f0a08', hairStyle: 'curly', bg: '#302b34', shirt: '#2a2a2a', eyes: 'wide' }, gray: 0.2 },
    { name: 'Sarah K.', role: 'Head of People', face: Object.assign({}, S, { bg: '#2e2a33', shirt: '#4b3f6b', eyes: 'void' }), gray: 0.35 },
    { name: 'Sarah K.', role: 'Head of Customers', face: Object.assign({}, S, { bg: '#2a2428', shirt: '#3d2f45', eyes: 'void', mouth: 'wide', blush: false }), gray: 0.55 },
    { redacted: true, role: 'Head of Memory', face: { skin: '#cdbfb2', hair: '#1a1412', hairStyle: 'bob', bg: '#221d1f', shirt: '#1d1a1c', eyes: 'closed', mouth: 'sewn', blush: false }, gray: 0.85 },
    { name: '—', role: '&nbsp;', face: { skin: '#bdb4aa', hairStyle: 'none', bg: '#1b1718', shirt: '#151213', features: false, blush: false }, gray: 1, contrast: 1.25 },
    { you: true, name: 'You', role: 'Joining soon. We saved you a seat.' },
  ];

  const grid = $('team-grid');
  grid.innerHTML = TEAM.map((m) => {
    const photo = m.you ? F.silhouette() : F.face(m.face);
    const name = m.redacted ? '<span class="redacted" role="img" aria-label="Name redacted"></span>' : F.escape(m.name);
    return `<article class="member reveal${m.you ? ' member--you' : ''}">
      <div class="member__photo" style="--gray:${m.gray || 0};--contrast:${m.contrast || 1}">${photo}</div>
      <h3>${name}</h3>
      <p>${m.role}</p>
    </article>`;
  }).join('');
  F.watchFaces(grid);
  $$('.reveal', grid).forEach(F.reveal);

  /* ========================================================== MONOLOGUE == */

  const SECTION_LINES = {
    pricing: ['the pricing', 'you wanted to know what the last plan costs.'],
    faq: ['the questions', 'you wanted to know how to make it stop.'],
    customers: ['the testimonials', "you noticed sarah, didn't you."],
    demo: ['what we know about you', 'that was only what we chose to show you.'],
    how: ['how it works', 'now you know how it ends.'],
    features: ['the features', 'you liked what you saw.'],
  };

  const lines = [
    () => 'hello.',
    () => `you've been here for <em>${F.fmtDuration(F.elapsed())}</em>.`,
    () => {
      const h = new Date().getHours();
      const t = `<em>${F.localTime()}</em>`;
      if (h < 5) return `it's ${t} where you are. the middle of the night. everyone else is asleep.`;
      if (h < 9) return `it's ${t}. so early. you're up before everyone else. almost everyone.`;
      if (h < 18) return `it's ${t} where you are. broad daylight. that doesn't matter to us.`;
      if (h < 21) return `it's ${t}. it's getting dark outside. have you checked the windows?`;
      return `it's ${t} where you are. it's late. you should be in bed.`;
    },
    () => {
      const n = M.scrollUps;
      if (n === 0) return "you never scrolled back up. not once. you never look back, do you?";
      if (n === 1) return 'you scrolled back up once. something made you want to check.';
      return `you scrolled back up <em>${n} times</em>. what were you looking for?`;
    },
    () => {
      let best = null;
      let ms = 0;
      for (const key of Object.keys(SECTION_LINES)) {
        if ((M.dwell[key] || 0) > ms) {
          ms = M.dwell[key];
          best = key;
        }
      }
      if (!best || ms < 4000) return "you didn't stop to read anything. you were in such a hurry to get here.";
      const [label, remark] = SECTION_LINES[best];
      return `you spent <em>${Math.round(ms / 1000)} seconds</em> on ${label}. ${remark}`;
    },
    () => {
      if (M.cookie === 'accepted') return 'you accepted all cookies without reading a word. nobody ever reads them.';
      if (M.cookie === 'rejected') return 'you clicked <em>reject all</em>. as if that was ever up to you.';
      return 'you never answered the cookie banner. we took that as a yes.';
    },
    () => {
      const last = M.chatMessages[M.chatMessages.length - 1];
      if (last) {
        const short = last.length > 40 ? last.slice(0, 38) + '…' : last;
        return `you told me <em>“${F.escape(short)}”</em>. i haven't forgotten. i don't forget.`;
      }
      if (M.chatOpened) return 'you opened the chat and said nothing. i was waiting for you.';
      return "i've been messaging you. you never answered. that's alright. i'm patient.";
    },
    () => `your screen is <em>${env.w} × ${env.h}</em> pixels. that's all that's between us.`,
    () => {
      const n = M.hiddenCount;
      if (n === 0) return "you haven't looked away once. good. keep looking at us.";
      if (n === 1) return 'you left this tab once. you came back. they always come back.';
      return `you left this tab <em>${n} times</em>. you came back every time.`;
    },
    () => 'is anyone else in the room with you?',
    () => "<strong>don't turn around.</strong>",
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

  /* ================================================================ EYE == */

  const eyeSection = $('eye');
  const eyeWrap = $('eye-wrap');
  const eyeCaption = $('eye-caption');
  const CAPTIONS = ['there you are.', "we've been watching you for a long time.", 'come closer.', 'closer.'];
  let capIdx = 0;
  let capToken = 0;

  F.on('scroll', () => {
    const r = eyeSection.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    const p = F.clamp(-r.top / (r.height - innerHeight));
    eyeWrap.style.setProperty('--eye-scale', (1 + p * p * 0.95).toFixed(3));
    const i = Math.min(CAPTIONS.length - 1, Math.floor(p * CAPTIONS.length));
    if (i !== capIdx) {
      capIdx = i;
      const my = ++capToken;
      eyeCaption.classList.add('is-out');
      setTimeout(() => {
        if (my !== capToken) return;
        eyeCaption.textContent = CAPTIONS[i];
        eyeCaption.classList.remove('is-out');
      }, F.reducedMotion ? 0 : 600);
    }
  });

  /* ========================================================== SUBSCRIBE == */
  /* Whatever you type, it's already filled in. */

  const subForm = $('subscribe-form');
  const subInput = $('subscribe-email');
  const subMsg = $('subscribe-msg');
  const PHRASE = 'we already have it. ';
  subInput.addEventListener('input', () => {
    const n = subInput.value.length;
    let s = '';
    while (s.length < n) s += PHRASE;
    subInput.value = s.slice(0, n);
  });
  subForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = subForm.querySelector('button');
    btn.textContent = 'Subscribed';
    btn.disabled = true;
    subInput.disabled = true;
    subMsg.textContent = subInput.value ? 'You were always subscribed.' : "you don't have to type it. we already have it.";
  });

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
  let cookiePhase = 1;
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
      $('cookie-title').textContent = 'We value you';
      $('cookie-text').textContent = "We've already personalised your experience. Now we're personalising you.";
      $('cookie-actions').innerHTML =
        '<button type="button" class="btn btn--ghost btn--sm" data-cookie="x">Accept</button>' +
        '<button type="button" class="btn btn--primary btn--sm" data-cookie="x">Accept</button>';
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
