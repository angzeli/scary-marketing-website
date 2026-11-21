# Familiar

> *Software that feels familiar.*

A single-page website that starts out as a completely ordinary, slightly
bland SaaS marketing site — hero banner, logo wall, feature grid, pricing
table, the works — and then, the further you scroll, gets **wrong**.

At first it's barely noticeable: a testimonial that repeats itself, a word
that changes when you aren't looking. By the middle of the page it's
unmistakably uncanny. By the bottom it's a horror movie.

## Status

🚧 Under construction. The site itself is being built in pull requests —
see the [issues](../../issues) for the plan.

## Running it locally

The site is plain HTML, CSS and JavaScript with no build step.

```sh
# any static file server works, e.g.
python3 -m http.server 8000
# then open http://localhost:8000
```

You can also just open `index.html` directly in a browser.

## Content note

This project contains horror imagery and (by design) unsettling content.
It is intended to respect `prefers-reduced-motion`, avoid rapid flashing,
and never play sound without the visitor opting in.

## Privacy

Any "personalisation" the site shows you is computed entirely in your own
browser. Nothing is collected, stored on a server, or sent anywhere.

## License

[MIT](LICENSE)
