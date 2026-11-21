/* =============================================================================
   Familiar — i18n
   -----------------------------------------------------------------------------
   F.t(key, vars)    look up a message in the current language (falls back to
                     English, then to the key itself)
   F.fill(str, vars) {placeholder} substitution, for strings pulled from arrays
   F.setLang(lang)   switch language at runtime; emits 'lang'
   F.locale()        BCP 47 locale for dates, times and numbers

   Page copy is marked up in index.html:
     data-i18n="key"                  textContent (glitch-aware)
     data-i18n-html="key"             innerHTML (must not contain glitch targets)
     data-i18n-attr="attr:key;…"      attributes (aria-label, placeholder, …)
     data-i18n-list="key"             a "||"-separated data-variants list
   English is collected from those attributes at start-up, so the HTML stays
   the source of truth. Anything that JavaScript renders subscribes to 'lang'.
   ========================================================================== */
(function () {
  'use strict';

  const F = window.Familiar;
  const S = F.STRINGS;
  const root = document.documentElement;
  const LANGS = ['en', 'zh-Hant'];

  F.lang = LANGS.includes(window.FAMILIAR_LANG) ? window.FAMILIAR_LANG : 'en';

  F.fill = (str, vars) =>
    vars && typeof str === 'string'
      ? str.replace(/\{(\w+)\}/g, (m, k) => (Object.prototype.hasOwnProperty.call(vars, k) ? vars[k] : m))
      : str;

  F.has = (key) => key in S[F.lang] || key in S.en;

  F.t = (key, vars) => {
    let v = S[F.lang][key];
    if (v === undefined) v = S.en[key];
    if (v === undefined) {
      if (window.console) console.warn('[i18n] missing key:', key);
      return key;
    }
    if (typeof v === 'function') return v(vars);
    return F.fill(v, vars);
  };

  F.locale = () => {
    if (F.lang === 'zh-Hant') return 'zh-TW';
    const nav = navigator.language || '';
    return /^en\b/i.test(nav) ? nav : 'en-US';
  };

  /* ------------------------------------ collect English from the page */

  const attrPairs = (el) =>
    el.dataset.i18nAttr.split(';').filter(Boolean).map((pair) => pair.split(':').map((s) => s.trim()));

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    // core.js has already stored the un-glitched text in data-orig
    S.en[key] = el.dataset.orig !== undefined ? el.dataset.orig : el.textContent;
    if (el.dataset.glitch !== undefined) S.en[key + '.glitch'] = el.dataset.glitch;
  });
  document.querySelectorAll('[data-i18n-html]').forEach((el) => {
    S.en[el.dataset.i18nHtml] = el.innerHTML.trim();
  });
  document.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    attrPairs(el).forEach(([attr, key]) => {
      S.en[key] = el.getAttribute(attr);
    });
  });
  document.querySelectorAll('[data-i18n-list]').forEach((el) => {
    S.en[el.dataset.i18nList] = el.dataset.variants.split('||');
  });

  /* ------------------------------------------------- apply page copy */

  function applyStatic() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.dataset.i18n;
      const text = F.t(key);
      if (el.dataset.glitch !== undefined) {
        // keep glitches working: swap the alternates and the resting text;
        // a word that is mid-glitch picks the new text up when it settles
        if (F.has(key + '.glitch')) el.dataset.glitch = F.t(key + '.glitch');
        F.setText(el, text);
      } else if (el.textContent !== text) {
        el.textContent = text;
      }
    });
    document.querySelectorAll('[data-i18n-html]').forEach((el) => {
      const html = F.t(el.dataset.i18nHtml);
      if (el.innerHTML.trim() !== html) el.innerHTML = html;
    });
    document.querySelectorAll('[data-i18n-attr]').forEach((el) => {
      attrPairs(el).forEach(([attr, key]) => el.setAttribute(attr, F.t(key)));
    });
    root.lang = F.lang;
    document.querySelectorAll('[data-lang]').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(btn.dataset.lang === F.lang));
    });
  }

  /* Traditional Chinese webfonts, fetched only when someone needs them.
     Google Fonts serves them in unicode-range slices, so only the glyphs
     on the page are downloaded. */
  let fontsRequested = false;
  function loadFonts() {
    if (fontsRequested || F.lang !== 'zh-Hant') return;
    fontsRequested = true;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&family=Noto+Serif+TC:wght@400;600&display=swap';
    document.head.appendChild(link);
  }

  /* ------------------------------------------------------- switching */

  F.setLang = (lang) => {
    if (!LANGS.includes(lang) || lang === F.lang) return;

    // Where is the reader in the story? Keep them there, even though every
    // section is about to change height.
    const anchor = F.section;
    let ratio = 0;
    if (anchor) {
      const r = anchor.getBoundingClientRect();
      ratio = (innerHeight / 2 - r.top) / Math.max(1, r.height);
    }

    F.lang = lang;
    F.store.set('lang', lang);
    try {
      // an explicit choice beats a ?lang= link from now on
      const url = new URL(location.href);
      if (url.searchParams.has('lang')) {
        url.searchParams.delete('lang');
        history.replaceState(history.state, '', url);
      }
    } catch (e) { /* ignore */ }

    loadFonts();
    applyStatic();
    F.emit('lang', lang);

    if (anchor) {
      F.autoScrolling = true; // not a "scroll back up" the monologue should mention
      const restore = () => {
        const r = anchor.getBoundingClientRect();
        scrollTo(0, Math.max(0, scrollY + r.top + ratio * r.height - innerHeight / 2));
      };
      restore();
      requestAnimationFrame(() => {
        restore();
        F.refreshDread();
        setTimeout(() => (F.autoScrolling = false), 120);
      });
    }
    F.refreshDread();
  };

  document.querySelectorAll('[data-lang]').forEach((btn) => {
    btn.addEventListener('click', () => F.setLang(btn.dataset.lang));
  });

  /* ------------------------------------------------------------ boot */

  if (F.lang !== 'en') {
    loadFonts();
    applyStatic();
  } else {
    root.lang = 'en';
  }
  root.classList.remove('i18n-wait');
})();
