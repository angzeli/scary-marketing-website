# Familiar

> *Software that feels familiar.*

A single-page website for **Familiar**, a fictional "AI companion" startup.
It starts out as a completely ordinary, slightly bland SaaS marketing site —
hero banner, logo wall, feature grid, pricing table, the works — and then,
the further you scroll, it gets **wrong**.

At first it's barely noticeable: a testimonial that repeats itself, a word
that changes when you aren't looking. By the middle of the page it's
unmistakably uncanny. By the bottom it's a horror movie.

(A *familiar*, in folklore, is a spirit that attaches itself to a person.)

## Running it locally

Plain HTML, CSS and JavaScript — no build step, no dependencies.

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

Opening `index.html` directly from disk works too.

**Best experienced** on a desktop with a mouse, at night, with the sound
toggle (bottom left) switched on. Scroll slowly. Read everything.

## The three acts

<details>
<summary>Spoilers</summary>

| | Scroll depth | What happens |
| --- | --- | --- |
| **I. The pitch** | top | A convincing SaaS landing page: hero with product mock-up, logo wall, features, stats, a cookie banner and a friendly chat bubble. |
| **II. The uncanny valley** | middle | Three testimonials from the same woman, whose eyes follow your cursor. A "live personalisation" demo that reads out your local time, device and screen. Pricing whose top tier costs *you*. FAQ answers that change every time you reopen them. The page yellows like old paper. |
| **III. The familiar** | bottom | The lights go out. The team page loses its faces, with an empty seat saved for you. A monologue quotes back what you did on the page: how long you stayed, where you lingered, whether you scrolled back up, what you typed into the chat, what you clicked on the cookie banner. A huge eye opens and follows you. A second cursor trails yours, getting closer. Then something happens. |

The footer's **Leave** link takes you back to the top, which now says
*Welcome back*. So does the page on your next visit. **Forget me** in the
footer resets that.

### Beneath the page

There are more layers for people who look around rather than down:

| Layer | What happens |
| --- | --- |
| **Trying to leave** | Move the mouse up toward the tabs (or fling back up on a phone) and you get the classic "Wait! Before you go 👋" discount popup. Later it says *We'll miss you* and its "No thanks" button edges away. At the end: *you can't leave*, with two buttons that both say Stay. |
| **Stopping** | Stop moving for a while and the room dims. *Still there?* |
| **The console** | The usual "Hey there, curious one, we're hiring!" banner, until it asks why you're looking in there. |
| **Selecting text** | Some phrases are written in invisible ink. |
| **Copying text** | You get the "Read more at…" footer that real sites add, which escalates. |
| **Printing** | There's nothing to print. |
| **Coming back** | The page counts your visits and remembers how long you stayed last time and how far you got. Fam greets you again, the monologue brings it up, and from your third visit one of the testimonials is yours. |
| **3 a.m.** | Between 3:00 and 3:59 local time, the page starts already dim. |
| **The privacy policy** | `privacy.html` is a standard-looking policy that darkens as you read. It quotes your device, redacts itself, keeps updating its own date, and ends with your signature. |
| **Getting lost** | `404.html` is cheerful, at first. |

</details>

## How it works

Everything hangs off one number: **dread**, from `0` (top of the page) to
`1` (bottom).

- Every section declares a target, e.g. `<section data-dread="0.46">`.
  Tall sections can ramp: `data-dread="0.82 0.9"`.
- `js/core.js` interpolates between those anchors based on what's in the
  middle of the viewport. It publishes the result as CSS custom properties:
  the palette (`--bg`, `--fg`, `--accent`, …) and the atmosphere (`--grain`,
  `--vig`, `--scan`, `--ab` for chromatic aberration).
- Sections are transparent, so the whole "room" drifts from white to
  yellowed paper to black as you scroll, without any hard breakpoints.
- Any element with `data-glitch="alternate text"` occasionally flashes its
  alternate for a split second. The chance scales with dread², so it almost
  never happens at the top and happens constantly at the bottom.
- Other modules subscribe with `Familiar.on('dread', d => …)`.

```
index.html             the landing page, top to bottom (and its English copy)
privacy.html           the privacy policy (same engine, its own copy)
404.html               self-contained "page not found"
css/styles.css         styles; colours come from the live custom properties
js/core.js             utilities, dread engine, session observer, glitch, tab title/favicon
js/strings.js          message dictionaries: generated English + all Traditional Chinese
js/i18n.js             language engine: F.t(), F.setLang(), the EN | 繁中 switch
js/memory.js           what is remembered between visits; the 3 a.m. check
js/faces.js            SVG face generator, cursor-tracking pupils, the eye, the scare
js/audio.js            opt-in Web Audio soundscape (all synthesised, no audio files)
js/chat.js             "Fam", the support chat
js/layers.js           exit intent, idle veil, console, clipboard, print
js/sections.js         landing-page behaviour (pricing, FAQ, team, monologue, …)
js/policy.js           privacy-policy behaviour (live details, ticking date, signature)
scripts/check-i18n.js  fails if any page is missing a message in any language (runs in CI)
assets/                favicons
```

## Languages

The site is available in **English** and **Traditional Chinese (繁體中文, Taiwan)**.
Use the `EN | 繁中` switch in the nav. You can switch at any point, even
halfway through the ending: whatever is on screen re-renders in place and
you stay where you were in the story.

The language is chosen in this order:

1. `?lang=zh-Hant` or `?lang=en` in the URL
2. the visitor's last choice
3. the browser's languages: `zh-TW`, `zh-HK`, `zh-MO` and `zh-Hant*` get
   Chinese, everything else gets English

**How copy is organised**

- English page copy lives in `index.html`, marked with `data-i18n="key"`
  (text), `data-i18n-html` (markup), `data-i18n-attr="aria-label:key"`
  (attributes) or `data-i18n-list` (FAQ answer variants). `js/i18n.js` reads
  it from the page at start-up, so the HTML stays the single source of truth
  and works without JavaScript.
- Text that JavaScript generates (Fam, the monologue, durations, titles, …)
  lives in the `en` block of `js/strings.js`. The `zh-Hant` block translates
  every key.
- A glitching element's alternate text is the key plus `.glitch`, e.g.
  `feat.6.title.glitch`: 全天候運作 → 全天候監視.
- Anything rendered from state re-renders on `Familiar.on('lang', …)`.

**Adding or changing copy:** add the key in both places, then run

```sh
node scripts/check-i18n.js
```

It fails on a missing key, an extra key, a placeholder or HTML-tag mismatch,
or a FAQ that has a different number of answers in each language. CI runs
it on every pull request.

## Deploying

It's a static site, so any static host works. For **GitHub Pages**:
*Settings → Pages → Build and deployment → Deploy from a branch →* `main` / `(root)`.

## Content note & accessibility

This is a horror piece. It contains unsettling imagery and **one sudden
full-screen jump scare** near the end. It never flashes repeatedly.

The exit-intent popup never traps you: Esc, a click outside it, or either
button always closes it, and each version appears at most once per visit.

- `prefers-reduced-motion` is respected: no shaking, jitter, film-grain
  animation or ghost cursor. The scare still appears, but without motion.
- Sound is **off by default** and is only ever started by clicking the
  sound toggle.
- Landmarks, headings, the FAQ (`<details>`), chat and cookie banner work
  with a keyboard. `Esc` closes the chat.
- Without JavaScript you get the static marketing page and a shortened
  version of the ending.

## Privacy

Everything the site seems to "know" about you (local time, timezone,
browser, OS, screen size, battery, scroll behaviour, chat messages) is read
or computed **inside your own browser** and is never sent anywhere. There
are no analytics, no cookies and no network requests apart from loading
Google Fonts.

A few small things are kept in `localStorage`, in your browser only:

| Key | What it holds |
| --- | --- |
| `familiar.lang` | the language you chose |
| `familiar.seen` | when you last reached the end of the page |
| `familiar.visits` | how many times you've opened the landing page |
| `familiar.last` | your previous visit's length, how far down you got, and when |

Nothing you type is stored. **Forget me** in the footer clears all of it
except your language.

When you copy text from the page (not from a text field), a line is added
to the end of what you copied. That's the "Read more at…" layer.

## License

[MIT](LICENSE)
