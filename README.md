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
index.html        all markup, top to bottom
css/styles.css    styles; colours come from the live custom properties
js/core.js        utilities, dread engine, session observer, glitch, tab title/favicon
js/faces.js       SVG face generator, cursor-tracking pupils, the eye, the scare
js/audio.js       opt-in Web Audio soundscape (all synthesised, no audio files)
js/chat.js        "Fam", the support chat
js/sections.js    per-section behaviour (pricing, FAQ, team, monologue, …)
assets/           favicons
```

## Deploying

It's a static site, so any static host works. For **GitHub Pages**:
*Settings → Pages → Build and deployment → Deploy from a branch →* `main` / `(root)`.

## Content note & accessibility

This is a horror piece. It contains unsettling imagery and **one sudden
full-screen jump scare** near the end. It never flashes repeatedly.

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
are no analytics, cookies or network requests apart from loading Google
Fonts. The only thing stored is a single `localStorage` timestamp, so the
page can welcome you back. **Forget me** in the footer clears it.

## License

[MIT](LICENSE)
