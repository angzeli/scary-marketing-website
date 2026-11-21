/* =============================================================================
   Familiar — core
   -----------------------------------------------------------------------------
   - tiny utilities + event bus (window.Familiar, aliased F)
   - the "dread engine": maps scroll position to a 0–1 value and publishes the
     palette/atmosphere as CSS custom properties
   - the session observer: things the page later quotes back at the visitor.
     Everything stays in memory, in this tab. Nothing is sent anywhere.
   - glitch text, reveal-on-scroll, pointer tracking, tab title / favicon
   ========================================================================== */
(function () {
  'use strict';

  const F = (window.Familiar = window.Familiar || {});
  const root = document.documentElement;

  /* ------------------------------------------------------------ utilities */

  F.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  F.finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  F.clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  F.lerp = (a, b, t) => a + (b - a) * t;
  F.smooth = (e0, e1, x) => {
    const t = F.clamp((x - e0) / (e1 - e0));
    return t * t * (3 - 2 * t);
  };
  F.rand = (a, b) => a + Math.random() * (b - a);
  F.pick = (list) => list[Math.floor(Math.random() * list.length)];
  F.sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  F.escape = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const handlers = {};
  F.on = (name, fn) => (handlers[name] = handlers[name] || []).push(fn);
  F.emit = (name, ...args) => (handlers[name] || []).forEach((fn) => fn(...args));

  /* localStorage, wrapped: private windows / blocked storage must not break the page */
  F.store = {
    get(key) {
      try { return localStorage.getItem('familiar.' + key); } catch (e) { return null; }
    },
    set(key, value) {
      try { localStorage.setItem('familiar.' + key, value); } catch (e) { /* ignore */ }
    },
    clear() {
      try {
        Object.keys(localStorage)
          .filter((k) => k.startsWith('familiar.'))
          .forEach((k) => localStorage.removeItem(k));
      } catch (e) { /* ignore */ }
    },
  };

  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  F.fmtDuration = (ms) => {
    const s = Math.max(1, Math.round(ms / 1000));
    const days = Math.floor(s / 86400);
    if (days >= 1) return plural(days, 'day');
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = s % 60;
    if (h) return m ? `${plural(h, 'hour')} and ${plural(m, 'minute')}` : plural(h, 'hour');
    if (m) return r ? `${plural(m, 'minute')} and ${plural(r, 'second')}` : plural(m, 'minute');
    return plural(r, 'second');
  };
  F.fmtClock = (ms) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
  };
  F.localTime = () =>
    new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase().replace(/\s/g, ' ');

  /* What the browser volunteers about itself. Read locally, never transmitted. */
  F.env = () => {
    const ua = navigator.userAgent;
    const browser =
      /Edg\//.test(ua) ? 'Edge' :
      /OPR\/|Opera/.test(ua) ? 'Opera' :
      /Firefox\/|FxiOS/.test(ua) ? 'Firefox' :
      /SamsungBrowser/.test(ua) ? 'Samsung Internet' :
      /Chrome\/|CriOS/.test(ua) ? 'Chrome' :
      /Safari\//.test(ua) ? 'Safari' : 'your browser';
    const os =
      /iPhone|iPad|iPod/.test(ua) ? 'iOS' :
      /Android/.test(ua) ? 'Android' :
      /CrOS/.test(ua) ? 'ChromeOS' :
      /Mac OS X|Macintosh/.test(ua) ? 'macOS' :
      /Windows/.test(ua) ? 'Windows' :
      /Linux/.test(ua) ? 'Linux' : 'your device';
    let zone = '';
    try { zone = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { /* ignore */ }
    const city = zone.includes('/') ? zone.split('/').pop().replace(/_/g, ' ') : '';
    return {
      browser,
      os,
      zone,
      city,
      w: screen.width,
      h: screen.height,
      dark: matchMedia('(prefers-color-scheme: dark)').matches,
      lang: navigator.language || 'en',
      hour: new Date().getHours(),
    };
  };

  /* --------------------------------------------------- session observer */

  const M = (F.metrics = {
    start: performance.now(),
    scrollUps: 0,
    mouseDistance: 0,
    dwell: {},
    cookie: null,
    chatOpened: false,
    chatMessages: [],
    hiddenCount: 0,
  });
  F.elapsed = () => performance.now() - M.start;

  /* ---------------------------------------------------------- the engine */

  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const ramp = (stops) => stops.map(([t, c]) => [t, hex(c)]);
  const sample = (stops, t) => {
    if (t <= stops[0][0]) return stops[0][1];
    for (let i = 1; i < stops.length; i++) {
      const [t1, c1] = stops[i];
      if (t <= t1) {
        const [t0, c0] = stops[i - 1];
        const k = (t - t0) / (t1 - t0);
        return c0.map((v, j) => Math.round(F.lerp(v, c1[j], k)));
      }
    }
    return stops[stops.length - 1][1];
  };
  const mix = (a, b, k) => a.map((v, i) => Math.round(F.lerp(v, b[i], k)));
  const css = (c, a) => (a == null ? `rgb(${c.join(',')})` : `rgba(${c.join(',')},${a})`);

  const DARK_AT = 0.652;
  const R = {
    bg: ramp([
      [0, '#ffffff'], [0.06, '#fefefd'], [0.16, '#fbfaf6'], [0.26, '#f7f4ec'], [0.36, '#f2ede2'],
      [0.46, '#ece5d6'], [0.55, '#e5dbc8'], [0.61, '#dbcfb8'], [0.645, '#a89d8a'], [0.67, '#4a423a'],
      [0.7, '#1e1a17'], [0.76, '#110e0d'], [0.86, '#0b0909'], [1, '#060505'],
    ]),
    fgLight: ramp([[0, '#0f1220'], [0.36, '#1b1a22'], [0.6, '#2a241e']]),
    fgDark: ramp([[0.65, '#cfc6b6'], [1, '#d9cfbf']]),
    mutedLight: ramp([[0, '#5b6075'], [0.36, '#625e66'], [0.6, '#6c6252']]),
    mutedDark: ramp([[0.65, '#8c8273'], [1, '#918575']]),
    accent: ramp([
      [0, '#5b5bd6'], [0.16, '#5c5ad0'], [0.36, '#6258b4'], [0.5, '#6a5596'], [0.61, '#704a74'],
      [0.67, '#7c2e45'], [0.76, '#931c25'], [1, '#a8121b'],
    ]),
  };
  const WHITE = [255, 255, 255];

  const sections = Array.from(document.querySelectorAll('[data-dread]'));
  let anchors = [];
  let ranges = [];

  function measure() {
    const vh = innerHeight;
    anchors = [];
    ranges = [];
    for (const el of sections) {
      const r = el.getBoundingClientRect();
      const top = r.top + scrollY;
      const h = r.height;
      const [a, b = a] = el.dataset.dread.trim().split(/\s+/).map(Number);
      if (h > vh * 1.2) {
        anchors.push({ y: top + vh * 0.5, d: a });
        anchors.push({ y: top + h - vh * 0.5, d: b });
      } else {
        anchors.push({ y: top + h / 2, d: (a + b) / 2 });
      }
      ranges.push({ el, top, bottom: top + h });
    }
    anchors.sort((p, q) => p.y - q.y);
    update(true);
  }

  F.floor = 0; // raised permanently once the visitor has "come back"
  F.dread = 0;
  F.section = null;
  let lastD = -1;
  let lastThemeStep = -1;
  let flags = '';
  const themeMeta = document.querySelector('meta[name="theme-color"]');

  function update(force) {
    const ref = scrollY + innerHeight / 2;
    let d = anchors.length ? anchors[0].d : 0;
    for (let i = 0; i < anchors.length - 1; i++) {
      const a = anchors[i];
      const b = anchors[i + 1];
      if (ref < a.y) break;
      if (ref <= b.y) {
        d = F.lerp(a.d, b.d, (ref - a.y) / Math.max(1, b.y - a.y));
        break;
      }
      d = b.d;
    }
    d = Math.max(d, F.floor);

    for (const r of ranges) {
      if (ref >= r.top && ref < r.bottom) { F.section = r.el; break; }
    }

    if (!force && Math.abs(d - lastD) < 0.0004) return;
    lastD = d;
    F.dread = d;

    const dark = d >= DARK_AT;
    const bg = sample(R.bg, d);
    const fg = dark ? sample(R.fgDark, d) : sample(R.fgLight, d);
    const muted = dark ? sample(R.mutedDark, d) : sample(R.mutedLight, d);
    const accent = sample(R.accent, d);
    const card = dark ? mix(bg, WHITE, 0.035) : mix(bg, WHITE, 0.62);
    const line = dark ? 'rgba(255,255,255,0.075)' : css(fg, 0.09);

    const s = root.style;
    s.setProperty('--dread', d.toFixed(4));
    s.setProperty('--bg', css(bg));
    s.setProperty('--fg', css(fg));
    s.setProperty('--muted', css(muted));
    s.setProperty('--accent', css(accent));
    s.setProperty('--card', css(card));
    s.setProperty('--line', line);
    s.setProperty('--grain', (0.025 * F.smooth(0.12, 0.5, d) + 0.12 * F.smooth(0.55, 1, d)).toFixed(4));
    s.setProperty('--vig', (0.22 * F.smooth(0.15, 0.6, d) + 0.6 * F.smooth(0.62, 1, d)).toFixed(4));
    s.setProperty('--scan', (0.4 * F.smooth(0.82, 1, d)).toFixed(4));
    s.setProperty('--ab', (3 * F.smooth(0.3, 1, d)).toFixed(3));

    const nextFlags = `${d >= 0.12 ? 'a2' : ''}${d >= 0.7 ? 'a3' : ''}${dark ? 'dk' : ''}`;
    if (nextFlags !== flags) {
      flags = nextFlags;
      root.classList.toggle('act-2', d >= 0.12);
      root.classList.toggle('act-3', d >= 0.7);
      root.classList.toggle('is-dark', dark);
    }

    const themeStep = Math.round(d * 60);
    if (themeStep !== lastThemeStep && themeMeta) {
      lastThemeStep = themeStep;
      themeMeta.content = css(bg);
    }

    F.emit('dread', d);
  }
  F.refreshDread = () => update(true);

  /* scroll: rAF-throttled, plus scroll-back detection */
  let ticking = false;
  let lastY = scrollY;
  let upRun = 0;
  let armed = true;
  F.autoScrolling = false;

  addEventListener('scroll', () => {
    const y = scrollY;
    if (!F.autoScrolling) {
      if (y < lastY) {
        upRun += lastY - y;
        if (armed && upRun > 320) { M.scrollUps++; armed = false; }
      } else if (y > lastY) {
        upRun = 0;
        armed = true;
      }
    }
    lastY = y;
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        update(false);
        F.emit('scroll', y);
      });
    }
  }, { passive: true });

  addEventListener('resize', measure);
  addEventListener('load', measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  if ('ResizeObserver' in window) new ResizeObserver(() => measure()).observe(document.body);

  /* time spent per section */
  setInterval(() => {
    if (document.hidden || !F.section) return;
    const key = F.section.id || F.section.dataset.label;
    M.dwell[key] = (M.dwell[key] || 0) + 250;
  }, 250);

  /* -------------------------------------------------------------- pointer */

  F.pointer = { x: innerWidth / 2, y: innerHeight / 2, active: false, speed: 0, t: 0, type: 'mouse' };
  addEventListener('pointermove', (e) => {
    const p = F.pointer;
    const now = performance.now();
    const dist = Math.hypot(e.clientX - p.x, e.clientY - p.y);
    if (p.active && dist < 400) M.mouseDistance += dist;
    p.speed = p.speed * 0.8 + (dist / Math.max(8, now - p.t)) * 0.2;
    p.x = e.clientX;
    p.y = e.clientY;
    p.t = now;
    p.type = e.pointerType;
    p.active = true;
    F.emit('pointer', p);
  }, { passive: true });
  addEventListener('pointerdown', (e) => {
    const p = F.pointer;
    p.x = e.clientX;
    p.y = e.clientY;
    p.type = e.pointerType;
    p.active = true;
    F.emit('pointer', p);
  }, { passive: true });
  document.addEventListener('mouseout', (e) => {
    if (!e.relatedTarget) { F.pointer.active = false; F.emit('pointer', F.pointer); }
  });

  /* ------------------------------------------------------- reveal on scroll */

  const revealIO = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            revealIO.unobserve(e.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' })
    : null;
  F.reveal = (el) => (revealIO ? revealIO.observe(el) : el.classList.add('is-in'));
  document.querySelectorAll('.reveal').forEach(F.reveal);

  /* ----------------------------------------------------------- glitch text */
  /* <el data-glitch="alt|alt2"> swaps to an alternate for a split second.
     The chance per tick rises with the square of dread: almost never at the
     top of the page, constantly at the bottom. */

  const visibleGlitches = new Set();
  const glitchIO = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
        entries.forEach((e) => (e.isIntersecting ? visibleGlitches.add(e.target) : visibleGlitches.delete(e.target)));
      })
    : null;

  F.registerGlitch = (el) => {
    if (!el.dataset.orig) el.dataset.orig = el.textContent;
    if (glitchIO) glitchIO.observe(el);
  };
  F.setText = (el, text) => {
    el.dataset.orig = text;
    if (!el.classList.contains('is-glitching')) el.textContent = text;
  };
  F.glitch = (el, duration) => {
    if (!el || el.classList.contains('is-glitching') || !el.dataset.glitch) return;
    const alts = el.dataset.glitch.split('|');
    el.textContent = F.pick(alts);
    el.classList.add('is-glitching');
    setTimeout(() => {
      el.textContent = el.dataset.orig;
      el.classList.remove('is-glitching');
    }, duration || F.rand(80, 150) + F.dread * 160);
  };
  document.querySelectorAll('[data-glitch]').forEach(F.registerGlitch);

  setInterval(() => {
    if (document.hidden) return;
    const d = F.dread;
    const p = 0.0012 + 0.2 * d * d;
    visibleGlitches.forEach((el) => {
      if (Math.random() < p) F.glitch(el);
    });
  }, 450);

  /* ---------------------------------------------------- tab title & icon */

  const BASE_TITLE = document.title;
  const favicon = document.getElementById('favicon');
  let titleTimer = 0;
  const restingTitle = () =>
    F.dread < 0.6 ? BASE_TITLE : F.dread < 0.85 ? 'Familiar — we truly get you' : 'you are not alone';

  F.on('dread', (d) => {
    if (!document.hidden && !titleTimer) {
      const t = restingTitle();
      if (document.title !== t) document.title = t;
    }
    const icon = d >= 0.72 ? 'assets/favicon-eye.svg' : 'assets/favicon.svg';
    if (favicon && !favicon.href.endsWith(icon)) favicon.href = icon;
  });

  document.addEventListener('visibilitychange', () => {
    const d = F.dread;
    clearTimeout(titleTimer);
    titleTimer = 0;
    if (document.hidden) {
      M.hiddenCount++;
      document.title = d < 0.3 ? 'Don’t forget about us 👋' : d < 0.7 ? 'come back' : 'i can still see you';
    } else {
      document.title = d < 0.3 ? 'Welcome back! — Familiar' : 'there you are';
      titleTimer = setTimeout(() => {
        titleTimer = 0;
        document.title = restingTitle();
      }, 2600);
    }
  });

  /* Always begin at the top: the page is meant to be read in order. */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  measure();
})();
