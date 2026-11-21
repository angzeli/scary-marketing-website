#!/usr/bin/env node
/* =============================================================================
   check-i18n — make sure every language has every message.

   English comes from two places: the data-i18n* attributes in index.html and
   the `en` block of js/strings.js. This script rebuilds that set the same way
   js/i18n.js does at runtime, then checks that:

     1. every English key exists in every other language, and vice versa
     2. every message key referenced from js/*.js exists (template keys like
        `nav.cta.${i}` must resolve to the same set of keys in each language)
     3. values have the same shape: same type, same {placeholders}, the same
        HTML tags, and list lengths that match
     4. every glitching element is translatable (or deliberately language-neutral)

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

/* -------------------------------------- collect English from index.html */

const html = read('index.html');
const fromHtml = new Map(); // key -> { kind, value }
const tagRe = /<([a-zA-Z][\w-]*)\b([^>]*)>/g;
const attrRe = /([\w:-]+)(?:="([^"]*)")?/g;
// glitches that need no translation: symbols, brand names, or text set by JS
const NEUTRAL_GLITCH = new Set(['∞', 'Familiar']);
const JS_OWNED_IDS = new Set(['nav-cta']);

let m;
while ((m = tagRe.exec(html))) {
  const attrs = {};
  let a;
  attrRe.lastIndex = 0;
  while ((a = attrRe.exec(m[2]))) attrs[a[1]] = a[2] === undefined ? '' : a[2];

  if (attrs['data-i18n']) {
    fromHtml.set(attrs['data-i18n'], { kind: 'text' });
    if ('data-glitch' in attrs) fromHtml.set(attrs['data-i18n'] + '.glitch', { kind: 'glitch' });
  }
  if (attrs['data-i18n-html']) fromHtml.set(attrs['data-i18n-html'], { kind: 'html' });
  if (attrs['data-i18n-attr']) {
    attrs['data-i18n-attr'].split(';').filter(Boolean).forEach((pair) => {
      const [attr, key] = pair.split(':').map((s) => s.trim());
      if (!(attr in attrs)) fail(`index.html: data-i18n-attr names "${attr}" but the element has no such attribute`);
      fromHtml.set(key, { kind: 'attr' });
    });
  }
  if (attrs['data-i18n-list']) {
    fromHtml.set(attrs['data-i18n-list'], {
      kind: 'list',
      length: (attrs['data-variants'] || '').split('||').length,
    });
  }
  if ('data-glitch' in attrs && !attrs['data-i18n'] && !NEUTRAL_GLITCH.has(attrs['data-glitch']) && !JS_OWNED_IDS.has(attrs.id)) {
    fail(`index.html: <${m[1]} data-glitch="${attrs['data-glitch']}"> has no data-i18n key, so its glitch can't be translated`);
  }
}

const enKeys = new Set([...Object.keys(S.en), ...fromHtml.keys()]);
for (const key of fromHtml.keys()) {
  if (key in S.en) fail(`"${key}" is defined both in index.html and in strings.js (en); keep English in one place`);
}

/* ------------------------------------------------------ 1. key parity */

for (const lang of OTHERS) {
  const keys = new Set(Object.keys(S[lang]));
  for (const k of enKeys) if (!keys.has(k)) fail(`[${lang}] missing "${k}"`);
  for (const k of keys) if (!enKeys.has(k)) fail(`[${lang}] has "${k}", which English doesn't use`);
}

/* ---------------------------------------------- 2. keys used by the JS */

const keyLike = /^[a-z][a-zA-Z0-9]*(?:\.(?:[a-zA-Z0-9]+|\$\{[^}]+\}))+$/;
const literalRe = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;
const jsFiles = fs.readdirSync(path.join(ROOT, 'js')).filter((f) => f.endsWith('.js') && f !== 'strings.js');
let referenced = 0;
// only strings in a namespace we actually use count as keys ("svg.face" is a selector)
const namespaces = new Set([...enKeys].map((k) => k.split('.')[0]));

for (const file of jsFiles) {
  const src = read('js/' + file);
  let lit;
  while ((lit = literalRe.exec(src))) {
    const s = lit[1] ?? lit[2] ?? lit[3];
    if (!keyLike.test(s) || !namespaces.has(s.split('.')[0])) continue;
    referenced++;
    if (!s.includes('${')) {
      for (const lang of LANGS) {
        const has = lang === 'en' ? enKeys.has(s) : s in S[lang];
        if (!has) fail(`js/${file}: "${s}" is missing in [${lang}]`);
      }
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

/* ------------------------------------------------------- 3. same shape */

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
        fail(`[${lang}] "${key}" has ${other.length} variants; index.html has ${meta.length}`);
      }
      continue; // the English text lives in the HTML; tags are checked by eye there
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

/* HTML-valued page copy: compare tags against the English markup in index.html */
const htmlEnglish = new Map();
const htmlAttrRe = /<(\w+)[^>]*\bdata-i18n-html="([^"]+)"[^>]*>([\s\S]*?)<\/\1>/g;
while ((m = htmlAttrRe.exec(html))) htmlEnglish.set(m[2], m[3]);
for (const [key, en] of htmlEnglish) {
  for (const lang of OTHERS) {
    if (S[lang][key] !== undefined && tags(en) !== tags(S[lang][key])) {
      fail(`[${lang}] "${key}" HTML tags <${tags(S[lang][key])}> ≠ index.html <${tags(en)}>`);
    }
  }
}

/* -------------------------------------------------------------- report */

const summary = `${enKeys.size} keys (${fromHtml.size} from index.html, ${Object.keys(S.en).length} from strings.js) · ` +
  `${LANGS.join(', ')} · ${referenced} key references in js/`;
if (errors.length) {
  console.error(`✗ i18n check failed — ${errors.length} problem${errors.length === 1 ? '' : 's'}\n`);
  errors.forEach((e) => console.error('  • ' + e));
  console.error('\n' + summary);
  process.exit(1);
}
console.log(`✓ i18n check passed — ${summary}`);
