#!/usr/bin/env node
/* =============================================================================
   check-i18n — make sure every language has every message, on every page.

   English comes from two places: the data-i18n* attributes in each page's
   HTML (collected at runtime by js/i18n.js, per page) and the `en` block of
   js/strings.js. This script rebuilds that the same way and checks that:

     1. every English key exists in every other language, and vice versa
     2. a key used on several pages has the same English everywhere
     3. every message key referenced from js/*.js resolves on every page that
        loads that script (template keys like `nav.cta.${i}` must resolve to
        the same set of keys in each language)
     4. values have the same shape: same type, same {placeholders}, the same
        HTML tags, and list lengths that match
     5. every glitching element is translatable (or deliberately neutral)
     6. 404.html (self-contained) has the same keys in every language

   Usage: node scripts/check-i18n.js     (exits 1 on any problem)
   No dependencies.
   ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const errors = [];
const fail = (msg) => errors.push(msg);

/* ------------------------------------------------- load the dictionaries */

const sandbox = { window: {} };
vm.runInNewContext(read('js/strings.js'), sandbox, { filename: 'js/strings.js' });
const S = sandbox.window.Familiar.STRINGS;
const LANGS = Object.keys(S);
const OTHERS = LANGS.filter((l) => l !== 'en');

/* ------------------------------------------- collect English from pages */

const PAGES = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html') && f !== '404.html').sort();
const tagRe = /<([a-zA-Z][\w-]*)\b([^>]*)>/g;
const attrRe = /([\w:-]+)(?:="([^"]*)")?/g;
// glitches that need no translation: symbols, brand names, or text set by JS
const NEUTRAL_GLITCH = new Set(['∞', 'Familiar']);
const JS_OWNED_IDS = new Set(['nav-cta']);

const fromHtml = new Map(); // key -> { kind, length?, english: Map(page -> text) }
const harvestedOn = {}; // page -> Set(keys)
const scriptsOn = {}; // page -> Set('js/x.js')

function note(page, key, kind, english, extra) {
  harvestedOn[page].add(key);
  if (!fromHtml.has(key)) fromHtml.set(key, Object.assign({ kind, english: new Map() }, extra));
  const entry = fromHtml.get(key);
  if (entry.kind !== kind) fail(`${page}: "${key}" is used as ${kind} here but as ${entry.kind} elsewhere`);
  if (english !== undefined) entry.english.set(page, english);
}

for (const page of PAGES) {
  const html = read(page);
  harvestedOn[page] = new Set();
  scriptsOn[page] = new Set([...html.matchAll(/<script[^>]*\bsrc="(js\/[^"]+)"/g)].map((m) => m[1]));
  let m;
  tagRe.lastIndex = 0;
  while ((m = tagRe.exec(html))) {
    const [, tag, rawAttrs] = m;
    const attrs = {};
    let a;
    attrRe.lastIndex = 0;
    while ((a = attrRe.exec(rawAttrs))) attrs[a[1]] = a[2] === undefined ? '' : a[2];
    const after = html.slice(m.index + m[0].length);
    const inner = () => {
      const close = after.indexOf(`</${tag}>`);
      return close === -1 ? undefined : after.slice(0, close);
    };

    if (attrs['data-i18n']) {
      note(page, attrs['data-i18n'], 'text', inner());
      if ('data-glitch' in attrs) note(page, attrs['data-i18n'] + '.glitch', 'glitch', attrs['data-glitch']);
    }
    if (attrs['data-i18n-html']) {
      const v = inner();
      note(page, attrs['data-i18n-html'], 'html', v === undefined ? undefined : v.trim());
    }
    if (attrs['data-i18n-attr']) {
      attrs['data-i18n-attr'].split(';').filter(Boolean).forEach((pair) => {
        const [attr, key] = pair.split(':').map((s) => s.trim());
        if (!(attr in attrs)) fail(`${page}: data-i18n-attr names "${attr}" but the element has no such attribute`);
        note(page, key, 'attr', attrs[attr]);
      });
    }
    if (attrs['data-i18n-list']) {
      const list = (attrs['data-variants'] || '').split('||');
      note(page, attrs['data-i18n-list'], 'list', list.join('||'), { length: list.length });
    }
    if ('data-glitch' in attrs && !attrs['data-i18n'] && !NEUTRAL_GLITCH.has(attrs['data-glitch']) && !JS_OWNED_IDS.has(attrs.id)) {
      fail(`${page}: <${tag} data-glitch="${attrs['data-glitch']}"> has no data-i18n key, so its glitch can't be translated`);
    }
  }
}

const enKeys = new Set([...Object.keys(S.en), ...fromHtml.keys()]);
for (const [key, entry] of fromHtml) {
  if (key in S.en) fail(`"${key}" is defined both in HTML and in strings.js (en); keep English in one place`);
  const variants = new Set(entry.english.values());
  if (variants.size > 1) fail(`"${key}" has different English on different pages: ${[...entry.english.keys()].join(', ')}`);
}

/* ------------------------------------------------------ 1. key parity */

for (const lang of OTHERS) {
  const keys = new Set(Object.keys(S[lang]));
  for (const k of enKeys) if (!keys.has(k)) fail(`[${lang}] missing "${k}"`);
  for (const k of keys) if (!enKeys.has(k)) fail(`[${lang}] has "${k}", which English doesn't use`);
}

/* ---------------------------------------------- 3. keys used by the JS */

const keyLike = /^[a-z][a-zA-Z0-9]*(?:\.(?:[a-zA-Z0-9]+|\$\{[^}]+\}))+$/;
const literalRe = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;
const jsFiles = fs.readdirSync(path.join(ROOT, 'js')).filter((f) => f.endsWith('.js') && f !== 'strings.js');
// only strings in a namespace we actually use count as keys ("svg.face" is a selector)
const namespaces = new Set([...enKeys].map((k) => k.split('.')[0]));
let referenced = 0;

for (const file of jsFiles) {
  const src = read('js/' + file);
  const loadedBy = PAGES.filter((p) => scriptsOn[p].has('js/' + file));
  // in English a key must come from strings.js, or be on every page that runs this file
  const enHas = (k) => k in S.en || (loadedBy.length > 0 && loadedBy.every((p) => harvestedOn[p].has(k)));
  let lit;
  while ((lit = literalRe.exec(src))) {
    const s = lit[1] ?? lit[2] ?? lit[3];
    if (!keyLike.test(s) || !namespaces.has(s.split('.')[0])) continue;
    referenced++;
    if (!s.includes('${')) {
      if (!enHas(s)) fail(`js/${file}: "${s}" isn't available in [en] on every page that loads it (${loadedBy.join(', ') || 'none'})`);
      for (const lang of OTHERS) if (!(s in S[lang])) fail(`js/${file}: "${s}" is missing in [${lang}]`);
      continue;
    }
    const re = new RegExp('^' + s.split(/\$\{[^}]+\}/).map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[^.]+') + '$');
    const matches = (keys) => [...keys].filter((k) => re.test(k)).sort().join(',');
    const en = matches(enKeys);
    if (!en) fail(`js/${file}: template key \`${s}\` matches nothing in [en]`);
    for (const lang of OTHERS) {
      if (matches(Object.keys(S[lang])) !== en) fail(`js/${file}: template key \`${s}\` resolves differently in [${lang}]`);
    }
  }
}

/* ------------------------------------------------------- 4. same shape */

const placeholders = (v) => (typeof v === 'string' ? [...v.matchAll(/\{(\w+)\}/g)].map((x) => x[1]).sort().join(',') : '');
const tags = (v) => (typeof v === 'string' ? [...v.matchAll(/<(\w+)/g)].map((x) => x[1]).sort().join(',') : '');
const kindOf = (v) => (Array.isArray(v) ? 'list' : typeof v);

for (const lang of OTHERS) {
  for (const key of enKeys) {
    const other = S[lang][key];
    if (other === undefined) continue; // already reported
    const meta = fromHtml.get(key);
    if (meta) {
      const want = meta.kind === 'list' ? 'list' : 'string';
      if (kindOf(other) !== want) fail(`[${lang}] "${key}" should be a ${want}`);
      if (meta.kind === 'list' && Array.isArray(other) && other.length !== meta.length) {
        fail(`[${lang}] "${key}" has ${other.length} variants; the HTML has ${meta.length}`);
      }
      if (meta.kind === 'html') {
        const en = [...meta.english.values()][0];
        if (en !== undefined && tags(en) !== tags(other)) fail(`[${lang}] "${key}" HTML tags <${tags(other)}> ≠ English <${tags(en)}>`);
      }
      continue;
    }
    const en = S.en[key];
    if (kindOf(en) !== kindOf(other)) { fail(`[${lang}] "${key}" is a ${kindOf(other)}; en is a ${kindOf(en)}`); continue; }
    const pairs = Array.isArray(en) ? en.map((v, i) => [v, other[i]]) : [[en, other]];
    if (Array.isArray(en) && en.length !== other.length) fail(`[${lang}] "${key}" has ${other.length} items; en has ${en.length}`);
    pairs.forEach(([e, o], i) => {
      const where = Array.isArray(en) ? `"${key}"[${i}]` : `"${key}"`;
      if (placeholders(e) !== placeholders(o)) fail(`[${lang}] ${where} placeholders {${placeholders(o)}} ≠ en {${placeholders(e)}}`);
      if (tags(e) !== tags(o)) fail(`[${lang}] ${where} HTML tags <${tags(o)}> ≠ en <${tags(e)}>`);
    });
  }
}

/* ------------------------------------------------------- 6. 404.html */

let notFoundKeys = 0;
if (fs.existsSync(path.join(ROOT, '404.html'))) {
  const m = read('404.html').match(/<script id="strings-404" type="application\/json">([\s\S]*?)<\/script>/);
  if (!m) fail('404.html: no <script id="strings-404"> dictionary');
  else {
    const T = JSON.parse(m[1]);
    const en = Object.keys(T.en || {}).sort().join(',');
    notFoundKeys = Object.keys(T.en || {}).length;
    for (const lang of LANGS) {
      if (!T[lang]) { fail(`404.html: no [${lang}] strings`); continue; }
      if (Object.keys(T[lang]).sort().join(',') !== en) fail(`404.html: [${lang}] keys differ from [en]`);
      for (const [k, v] of Object.entries(T[lang])) if (!String(v).trim()) fail(`404.html: [${lang}] "${k}" is empty`);
    }
  }
}

/* -------------------------------------------------------------- report */

const summary = `${enKeys.size} keys (${fromHtml.size} from ${PAGES.join(' + ')}, ${Object.keys(S.en).length} from strings.js) · ` +
  `${LANGS.join(', ')} · ${referenced} key references in js/ · 404.html: ${notFoundKeys} keys`;
if (errors.length) {
  console.error(`✗ i18n check failed — ${errors.length} problem${errors.length === 1 ? '' : 's'}\n`);
  errors.forEach((e) => console.error('  • ' + e));
  console.error('\n' + summary);
  process.exit(1);
}
console.log(`✓ i18n check passed — ${summary}`);
