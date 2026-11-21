/* =============================================================================
   Familiar — faces
   -----------------------------------------------------------------------------
   F.face(opts)   → SVG string for a friendly flat-illustration portrait, whose
                    features can be swapped for progressively wrong ones
   eye tracking   → every visible pupil turns towards the pointer
   the eye        → the big one in Act III
   F.scareFace()  → the apparition used by the scare
   ========================================================================== */
(function () {
  'use strict';

  const F = window.Familiar;
  let uid = 0;

  /* ---------------------------------------------------------------- faces */

  const HAIR = {
    bob: {
      back: 'M31,60 C28,30 43,19 60,19 C77,19 92,30 89,60 L91,82 C84,86 79,84 77,78 L43,78 C41,84 36,86 29,82 Z',
      front: 'M35,52 C35,32 47,23 61,23 C76,23 86,33 85,51 C80,41 70,36 60,37 C52,38 46,40 42,45 C40,48 37,50 35,52 Z',
    },
    short: {
      back: '',
      front: 'M35,50 C34,31 46,23 60,23 C75,23 86,31 85,50 C82,41 73,35 61,35 C49,35 40,40 35,50 Z',
    },
    long: {
      back: 'M29,60 C27,28 43,17 60,17 C77,17 93,28 91,60 L95,120 L25,120 Z',
      front: 'M35,54 C36,33 48,24 60,26 C72,24 84,33 85,54 C80,42 69,33 60,30 C51,33 40,42 35,54 Z',
    },
    curly: {
      back: 'M30,56 C22,48 26,30 38,26 C40,16 54,14 60,18 C68,12 82,16 84,26 C96,30 98,48 90,56 Z',
      front: 'M36,46 C34,36 42,28 50,30 C54,24 66,24 70,30 C78,28 86,36 84,46 C78,40 70,38 60,38 C50,38 42,40 36,46 Z',
    },
    none: { back: '', front: '' },
  };

  function eyeMarkup(type, x, y, hair) {
    switch (type) {
      case 'void':
        return `<ellipse cx="${x}" cy="${y}" rx="4.9" ry="4.3" fill="#050404"/>
          <g class="pupil" data-x="${x}" data-y="${y}" data-r="1.8"><circle cx="${x}" cy="${y}" r=".75" fill="#f4efe6"/></g>`;
      case 'wide':
        return `<circle cx="${x}" cy="${y}" r="4.8" fill="#fbf8f2"/>
          <g class="pupil" data-x="${x}" data-y="${y}" data-r="2.6"><circle cx="${x}" cy="${y}" r="1.1" fill="#120c0a"/></g>`;
      case 'closed':
        return `<path d="M${x - 4.2},${y} Q${x},${y + 2.6} ${x + 4.2},${y}" fill="none" stroke="#2a1d17" stroke-width="1.4" stroke-linecap="round"/>`;
      case 'none':
        return '';
      default:
        return `<ellipse cx="${x}" cy="${y}" rx="4.2" ry="3" fill="#fff"/>
          <g class="pupil" data-x="${x}" data-y="${y}" data-r="1.7"><circle cx="${x}" cy="${y}" r="2" fill="#2a1d17"/><circle cx="${x + 0.7}" cy="${y - 0.7}" r=".55" fill="#fff"/></g>
          <path d="M${x - 4.6},${y - 1.6} Q${x},${y - 4.4} ${x + 4.6},${y - 1.6}" fill="none" stroke="${hair}" stroke-width="1.1" stroke-linecap="round" opacity=".55"/>`;
    }
  }

  function mouthMarkup(type) {
    switch (type) {
      case 'flat':
        return '<path d="M54,72 L66,72" stroke="#7a3a2e" stroke-width="1.8" stroke-linecap="round"/>';
      case 'wide':
        return `<path d="M42,67 Q60,86 78,67 Q60,77 42,67 Z" fill="#1a0606"/>
          <path d="M45.5,69.4 Q60,78.4 74.5,69.4" fill="none" stroke="#efe6d6" stroke-width="1.7" stroke-dasharray="1.6 1.1"/>`;
      case 'sewn': {
        let st = '';
        for (let x = 53; x <= 67; x += 2.8) st += `M${x},69.6 L${x + 1.4},74.4 `;
        return `<path d="M51,72 L69,72" stroke="#2b1410" stroke-width="1.3"/><path d="${st}" stroke="#2b1410" stroke-width="1"/>`;
      }
      case 'none':
        return '';
      default:
        return '<path d="M52.5,70 Q60,76 67.5,70" fill="none" stroke="#7a3a2e" stroke-width="1.9" stroke-linecap="round"/>';
    }
  }

  F.face = function (opts) {
    const o = Object.assign(
      {
        skin: '#f2c9a8',
        hair: '#5b3926',
        hairStyle: 'bob',
        bg: '#e9e6ff',
        shirt: '#6c5ce7',
        eyes: 'normal',
        mouth: 'smile',
        spread: 10.5,
        eyeY: 56,
        features: true,
        blush: true,
      },
      opts
    );
    const id = 'fc' + uid++;
    const h = HAIR[o.hairStyle] || HAIR.none;
    const lx = 60 - o.spread;
    const rx = 60 + o.spread;
    const features = o.features
      ? `
        <path d="M${lx - 5},${o.eyeY - 7} Q${lx},${o.eyeY - 9.4} ${lx + 5},${o.eyeY - 7.2}" fill="none" stroke="${o.hair}" stroke-width="1.7" stroke-linecap="round"/>
        <path d="M${rx - 5},${o.eyeY - 7.2} Q${rx},${o.eyeY - 9.4} ${rx + 5},${o.eyeY - 7}" fill="none" stroke="${o.hair}" stroke-width="1.7" stroke-linecap="round"/>
        ${eyeMarkup(o.eyes, lx, o.eyeY, o.hair)}
        ${eyeMarkup(o.eyes, rx, o.eyeY, o.hair)}
        <path d="M60,59 Q57.5,65 60.8,66" fill="none" stroke="rgba(120,60,40,.45)" stroke-width="1.4" stroke-linecap="round"/>
        ${o.blush ? '<circle cx="45" cy="66" r="4" fill="#f08a8a" opacity=".22"/><circle cx="75" cy="66" r="4" fill="#f08a8a" opacity=".22"/>' : ''}
        ${mouthMarkup(o.mouth)}`
      : '';

    return `<svg class="face" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <defs><clipPath id="${id}"><rect width="120" height="120"/></clipPath></defs>
      <g clip-path="url(#${id})">
        <rect width="120" height="120" fill="${o.bg}"/>
        ${h.back ? `<path d="${h.back}" fill="${o.hair}"/>` : ''}
        <path d="M14,122 C17,99 37,92 60,92 C83,92 103,99 106,122 Z" fill="${o.shirt}"/>
        <path d="M52,76 L68,76 L68,94 Q60,99 52,94 Z" fill="${o.skin}"/>
        <path d="M52,84 Q60,89 68,84 L68,78 L52,78 Z" fill="rgba(0,0,0,.08)"/>
        <ellipse cx="35.5" cy="59" rx="4" ry="6" fill="${o.skin}"/>
        <ellipse cx="84.5" cy="59" rx="4" ry="6" fill="${o.skin}"/>
        <ellipse cx="60" cy="56" rx="24.5" ry="29" fill="${o.skin}"/>
        ${h.front ? `<path d="${h.front}" fill="${o.hair}"/>` : ''}
        ${features}
      </g>
    </svg>`;
  };

  /* The visitor's own seat on the team. */
  F.silhouette = () => `<svg class="face" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <ellipse cx="60" cy="54" rx="22" ry="27" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="3 3" opacity=".55"/>
      <path d="M18,118 C20,98 38,90 60,90 C82,90 100,98 102,118" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="3 3" opacity=".55"/>
      <text class="silhouette__label" x="60" y="61" text-anchor="middle" font-family="Cormorant Garamond, Noto Serif TC, serif" font-size="15" fill="currentColor" opacity=".6">${F.escape(F.t('team.you.photo'))}</text>
    </svg>`;

  /* Sarah K. She's in every testimonial. */
  F.SARAH = { skin: '#f3cdb0', hair: '#8a3f22', hairStyle: 'bob', bg: '#e9e6ff', shirt: '#6c5ce7' };

  document.querySelectorAll('[data-face="sarah"]').forEach((el) => {
    el.innerHTML = F.face(F.SARAH);
  });

  /* --------------------------------------------- pupils follow the pointer */

  const watching = new Set();
  const faceIO = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
        entries.forEach((e) => (e.isIntersecting ? watching.add(e.target) : watching.delete(e.target)));
      }, { rootMargin: '80px' })
    : null;

  F.watchFace = (svg) => {
    svg._pupils = Array.from(svg.querySelectorAll('.pupil'));
    if (svg._pupils.length && faceIO) faceIO.observe(svg);
  };
  F.watchFaces = (scope) => (scope || document).querySelectorAll('svg.face').forEach(F.watchFace);
  F.watchFaces();

  let facePending = false;
  function trackFaces() {
    facePending = false;
    const p = F.pointer;
    // Without a pointer, they look straight at you.
    const tx = p.active ? p.x : innerWidth / 2;
    const ty = p.active ? p.y : innerHeight / 2;
    watching.forEach((svg) => {
      const r = svg.getBoundingClientRect();
      if (!r.width) return;
      const k = r.width / 120;
      for (const g of svg._pupils) {
        const cx = r.left + parseFloat(g.dataset.x) * k;
        const cy = r.top + parseFloat(g.dataset.y) * k;
        const dx = tx - cx;
        const dy = ty - cy;
        const dist = Math.hypot(dx, dy) || 1;
        const max = parseFloat(g.dataset.r);
        const m = Math.min(max, (dist / 90) * max);
        g.setAttribute('transform', `translate(${((dx / dist) * m).toFixed(2)} ${((dy / dist) * m * 0.8).toFixed(2)})`);
      }
    });
  }
  const queueFaces = () => {
    if (!facePending) {
      facePending = true;
      requestAnimationFrame(trackFaces);
    }
  };
  F.on('pointer', queueFaces);
  F.on('scroll', queueFaces);

  /* --------------------------------------------------------------- the eye */

  function buildEye() {
    const wrap = document.getElementById('eye-wrap');
    if (!wrap) return null;

    // bloodshot veins creeping in from the corners
    let veins = '';
    for (let i = 0; i < 26; i++) {
      const side = i % 2 ? 1 : -1;
      const a = F.rand(-0.95, 0.95);
      let x = 400 + side * F.rand(250, 330);
      let y = 200 + a * F.rand(40, 95);
      let d = `M${x.toFixed(1)},${y.toFixed(1)}`;
      const steps = 3 + Math.floor(Math.random() * 3);
      for (let s = 0; s < steps; s++) {
        const nx = x - side * F.rand(24, 52);
        const ny = y + F.rand(-22, 22) - (y - 200) * 0.18;
        d += ` Q${(x + nx) / 2 + F.rand(-10, 10)},${(y + ny) / 2 + F.rand(-12, 12)} ${nx.toFixed(1)},${ny.toFixed(1)}`;
        x = nx;
        y = ny;
      }
      veins += `<path d="${d}" stroke-width="${F.rand(0.6, 2.4).toFixed(2)}" opacity="${F.rand(0.35, 0.85).toFixed(2)}"/>`;
    }

    let fibres = '';
    for (let i = 0; i < 90; i++) {
      const t = (i / 90) * Math.PI * 2 + F.rand(-0.03, 0.03);
      const r0 = F.rand(40, 52);
      const r1 = F.rand(78, 104);
      const light = i % 3 === 0;
      fibres += `<line x1="${(Math.cos(t) * r0).toFixed(1)}" y1="${(Math.sin(t) * r0).toFixed(1)}" x2="${(Math.cos(t) * r1).toFixed(1)}" y2="${(Math.sin(t) * r1).toFixed(1)}" stroke="${light ? 'rgba(255,220,255,.22)' : 'rgba(10,0,20,.35)'}" stroke-width="${F.rand(0.8, 2.2).toFixed(1)}"/>`;
    }

    const ALMOND = 'M40,200 Q400,-50 760,200 Q400,450 40,200 Z';
    wrap.innerHTML = `
      <svg viewBox="0 0 800 400" role="img" aria-label="${F.escape(F.t('eye.aria'))}">
        <defs>
          <radialGradient id="eye-sclera" cx="50%" cy="50%" r="58%">
            <stop offset="0" stop-color="#f3ece2"/>
            <stop offset=".5" stop-color="#e3d3c6"/>
            <stop offset=".82" stop-color="#b9877b"/>
            <stop offset="1" stop-color="#5a1714"/>
          </radialGradient>
          <radialGradient id="eye-iris" r="1">
            <stop offset=".32" stop-color="#1c0f33"/>
            <stop offset=".5" stop-color="#5b4bd6"/>
            <stop offset=".78" stop-color="#b75aa3"/>
            <stop offset=".96" stop-color="#2a0f2a"/>
          </radialGradient>
          <linearGradient id="eye-lidshade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#000" stop-opacity=".75"/>
            <stop offset=".35" stop-color="#000" stop-opacity="0"/>
            <stop offset=".8" stop-color="#000" stop-opacity="0"/>
            <stop offset="1" stop-color="#000" stop-opacity=".5"/>
          </linearGradient>
          <filter id="eye-wet"><feGaussianBlur stdDeviation="1.4"/></filter>
          <clipPath id="eye-clip"><path id="eye-clip-path" d="${ALMOND}"/></clipPath>
        </defs>

        <g opacity=".5" fill="none" stroke="#3a1c18" stroke-linecap="round">
          <path d="M70,150 Q400,-110 730,150" stroke-width="3"/>
          <path d="M120,118 Q400,-130 680,118" stroke-width="1.5" opacity=".6"/>
          <path d="M90,262 Q400,420 710,262" stroke-width="2" opacity=".7"/>
        </g>

        <g clip-path="url(#eye-clip)">
          <rect width="800" height="400" fill="url(#eye-sclera)"/>
          <g fill="none" stroke="#a3161b" stroke-linecap="round" id="eye-veins" opacity=".55">${veins}</g>
          <g id="eye-iris-g" transform="translate(400 200)">
            <circle r="108" fill="url(#eye-iris)"/>
            ${fibres}
            <circle r="106" fill="none" stroke="#0c0410" stroke-width="9" opacity=".9"/>
            <circle id="eye-pupil" r="40" fill="#030203"/>
            <ellipse cx="-34" cy="-38" rx="18" ry="11" fill="#fff" opacity=".78" filter="url(#eye-wet)"/>
            <ellipse cx="30" cy="30" rx="6" ry="4" fill="#fff" opacity=".25"/>
          </g>
          <rect width="800" height="400" fill="url(#eye-lidshade)"/>
          <path id="eye-rim" d="${ALMOND}" fill="none" stroke="#8a1c1c" stroke-width="30" opacity=".5" filter="url(#eye-wet)"/>
        </g>
        <path id="eye-lid" d="${ALMOND}" fill="none" stroke="#140606" stroke-width="12" stroke-linejoin="round"/>
      </svg>`;

    return {
      svg: wrap.querySelector('svg'),
      clip: wrap.querySelector('#eye-clip-path'),
      lid: wrap.querySelector('#eye-lid'),
      rim: wrap.querySelector('#eye-rim'),
      iris: wrap.querySelector('#eye-iris-g'),
      pupil: wrap.querySelector('#eye-pupil'),
      veins: wrap.querySelector('#eye-veins'),
    };
  }

  const eye = buildEye();
  if (eye) {
    F.on('lang', () => eye.svg.setAttribute('aria-label', F.t('eye.aria')));
    const section = document.getElementById('eye');
    const state = {
      visible: false,
      open: 0, // 0 closed → 1 open (lids)
      target: 0,
      blink: 1, // multiplier, dips to 0 during a blink
      ix: 0, iy: 0, // iris offset
      pr: 40, // pupil radius
      nextBlink: performance.now() + 4000,
      woke: false,
      wanderX: 0, wanderY: 0, nextWander: 0,
    };
    F.eye = state;

    const setOpen = (k) => {
      const t = `translate(0 200) scale(1 ${Math.max(0.012, k).toFixed(4)}) translate(0 -200)`;
      eye.clip.setAttribute('transform', t);
      eye.lid.setAttribute('transform', t);
      eye.rim.setAttribute('transform', t);
    };
    setOpen(0);

    new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        state.visible = e.isIntersecting;
        if (e.isIntersecting && !state.woke) {
          state.woke = true;
          // a flutter, then it opens. slowly.
          setTimeout(() => (state.target = 0.12), 600);
          setTimeout(() => (state.target = 0.02), 900);
          setTimeout(() => (state.target = 1), 1700);
        }
        if (e.isIntersecting && !state.running) {
          state.running = true;
          lastT = performance.now();
          requestAnimationFrame(frame);
        }
      });
    }, { threshold: 0.35 }).observe(section.querySelector('.eye__stage'));

    let lastT = performance.now();
    function frame(now) {
      const dt = Math.min(64, now - lastT);
      lastT = now;

      // lids
      const speed = state.target > state.open ? 0.0011 : 0.006;
      state.open += F.clamp((state.target - state.open) * dt * speed * 3, -0.2, 0.2);
      if (now > state.nextBlink && state.open > 0.9) {
        state.blinkStart = now;
        state.nextBlink = now + F.rand(2600, 7000);
      }
      if (state.blinkStart) {
        const b = (now - state.blinkStart) / 190;
        state.blink = b < 0.5 ? 1 - b * 2 : b < 1 ? (b - 0.5) * 2 : 1;
        if (b >= 1) state.blinkStart = 0;
      }
      setOpen(state.open * state.blink);

      // gaze
      const p = F.pointer;
      const r = eye.svg.getBoundingClientRect();
      let gx;
      let gy;
      if (p.active && p.type === 'mouse') {
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        gx = F.clamp((p.x - cx) / (r.width * 0.5), -1, 1);
        gy = F.clamp((p.y - cy) / (r.height * 0.5), -1, 1);
      } else {
        // no mouse: it searches for you, in sharp little saccades
        if (now > state.nextWander) {
          state.wanderX = F.rand(-0.8, 0.8);
          state.wanderY = F.rand(-0.5, 0.5);
          if (Math.random() < 0.35) state.wanderX = state.wanderY = 0; // straight at you
          state.nextWander = now + F.rand(700, 2400);
        }
        if (p.active && now - p.t < 1500) {
          state.wanderX = F.clamp((p.x - (r.left + r.width / 2)) / (r.width * 0.5), -1, 1);
          state.wanderY = F.clamp((p.y - (r.top + r.height / 2)) / (r.height * 0.5), -1, 1);
        }
        gx = state.wanderX;
        gy = state.wanderY;
      }
      const ease = p.type === 'mouse' ? 0.012 : 0.03;
      state.ix += (gx * 190 - state.ix) * Math.min(1, dt * ease);
      state.iy += (gy * 62 - state.iy) * Math.min(1, dt * ease);
      eye.iris.setAttribute('transform', `translate(${(400 + state.ix).toFixed(1)} ${(200 + state.iy).toFixed(1)})`);

      // pupil: dilates when you move quickly, or come close
      const targetR = 30 + F.clamp(p.speed * 18, 0, 26) + (state.open < 0.5 ? 10 : 0);
      state.pr += (targetR - state.pr) * Math.min(1, dt * 0.004);
      eye.pupil.setAttribute('r', state.pr.toFixed(1));

      // the longer it looks at you, the redder it gets
      if (state.open > 0.9) {
        const v = parseFloat(eye.veins.getAttribute('opacity'));
        if (v < 1) eye.veins.setAttribute('opacity', Math.min(1, v + dt * 0.00004).toFixed(3));
      }

      if (state.visible) requestAnimationFrame(frame);
      else state.running = false;
    }
  }

  /* ------------------------------------------------------------ the scare */

  F.scareFace = function () {
    const bez = (p0, p1, p2, t) => (1 - t) * (1 - t) * p0 + 2 * (1 - t) * t * p1 + t * t * p2;
    // an impossible grin: upper and lower rows of teeth along two curves
    let teeth = '';
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const x = bez(160, 300, 440, t);
      const y = bez(530, 582, 530, t);
      const h = 20 + Math.sin(t * Math.PI) * 14 + F.rand(-4, 5);
      const a = ((t - 0.5) * 34).toFixed(1);
      teeth += `<rect x="${(x - 6).toFixed(1)}" y="${(y - 3).toFixed(1)}" width="11.5" height="${h.toFixed(1)}" rx="3.5" fill="#d3cab4" transform="rotate(${a} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
    }
    for (let i = 2; i <= 16; i++) {
      const t = i / 18;
      const x = bez(160, 300, 440, t);
      const y = bez(530, 700, 530, t);
      const h = 16 + Math.sin(t * Math.PI) * 12 + F.rand(-4, 4);
      const a = ((0.5 - t) * 40).toFixed(1);
      teeth += `<rect x="${(x - 6).toFixed(1)}" y="${(y - h + 3).toFixed(1)}" width="11.5" height="${h.toFixed(1)}" rx="3.5" fill="#b9af98" transform="rotate(${a} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
    }
    // a few strands of hair, mostly at the edges of the face
    let strands = '';
    const xs = [150, 168, 186, 205, 395, 414, 432, 452, 262, 338];
    xs.forEach((x0) => {
      const x = x0 + F.rand(-8, 8);
      const len = F.rand(380, 700);
      strands += `<path d="M${x.toFixed(0)},70 C${(x + F.rand(-25, 25)).toFixed(0)},${(len * 0.4).toFixed(0)} ${(x + F.rand(-35, 35)).toFixed(0)},${(len * 0.7).toFixed(0)} ${(x + F.rand(-30, 30)).toFixed(0)},${len.toFixed(0)}" stroke="#050404" stroke-width="${F.rand(1.5, 4.5).toFixed(1)}" fill="none" opacity="${F.rand(0.6, 0.95).toFixed(2)}"/>`;
    });

    return `<svg viewBox="40 80 520 660" preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="sc-skin" cx="50%" cy="44%" r="54%">
          <stop offset="0" stop-color="#e9e4d6"/>
          <stop offset=".45" stop-color="#b9b3a3"/>
          <stop offset=".8" stop-color="#47433c"/>
          <stop offset="1" stop-color="#000"/>
        </radialGradient>
        <radialGradient id="sc-socket">
          <stop offset=".5" stop-color="#000"/>
          <stop offset="1" stop-color="#000" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="sc-throat" cx="50%" cy="40%" r="60%">
          <stop offset="0" stop-color="#000"/>
          <stop offset="1" stop-color="#2a0505"/>
        </radialGradient>
        <filter id="sc-warp" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency=".012 .03" numOctaves="2" seed="13"/>
          <feDisplacementMap in="SourceGraphic" scale="22"/>
        </filter>
        <filter id="sc-grain">
          <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4"/>
          <feColorMatrix type="saturate" values="0"/>
          <feComponentTransfer><feFuncA type="table" tableValues="0 .5"/></feComponentTransfer>
        </filter>
        <filter id="sc-blur"><feGaussianBlur stdDeviation="8"/></filter>
        <filter id="sc-soft"><feGaussianBlur stdDeviation="2.5"/></filter>
      </defs>
      <rect x="-2000" y="-2000" width="5000" height="5000" fill="#000"/>
      <g filter="url(#sc-warp)">
        <path d="M120,60 C60,220 70,520 110,800 L490,800 C530,520 540,220 480,60 Z" fill="#070606"/>
        <ellipse cx="300" cy="400" rx="172" ry="240" fill="url(#sc-skin)"/>
        <ellipse cx="226" cy="352" rx="66" ry="58" fill="url(#sc-socket)"/>
        <ellipse cx="374" cy="352" rx="66" ry="58" fill="url(#sc-socket)"/>
        <ellipse cx="226" cy="356" rx="40" ry="33" fill="#000"/>
        <ellipse cx="374" cy="356" rx="40" ry="33" fill="#000"/>
        <path d="M214,384 C210,420 218,450 212,500" stroke="#0b0909" stroke-width="7" fill="none" filter="url(#sc-soft)" opacity=".85"/>
        <path d="M388,384 C392,430 384,455 390,520" stroke="#0b0909" stroke-width="6" fill="none" filter="url(#sc-soft)" opacity=".75"/>
        <circle cx="232" cy="360" r="3.6" fill="#fff"/>
        <circle cx="368" cy="360" r="3.6" fill="#fff"/>
        <path d="M284,404 Q300,458 318,404" stroke="#1c1a17" stroke-width="8" fill="none" filter="url(#sc-blur)"/>
        <path d="M160,530 Q300,700 440,530 Q300,582 160,530 Z" fill="url(#sc-throat)"/>
        ${teeth}
        <path d="M160,530 Q300,582 440,530" stroke="#1a0d0b" stroke-width="3" fill="none" filter="url(#sc-soft)"/>
        <path d="M140,40 C108,150 148,270 176,340 C150,255 150,150 212,92 Z" fill="#050404"/>
        <path d="M460,40 C492,150 452,270 424,340 C450,255 450,150 388,92 Z" fill="#050404"/>
        <path d="M128,20 C200,0 400,0 472,20 C462,120 420,152 300,132 C180,152 138,120 128,20 Z" fill="#050404"/>
        ${strands}
      </g>
      <rect x="40" y="80" width="520" height="660" filter="url(#sc-grain)" opacity=".7"/>
    </svg>`;
  };
})();
