# Performance

## Budget and outcome

| Asset | gzipped |
| --- | --- |
| app bundle (everything) | **22.2 KB** |
| React + ReactDOM | 45.2 KB |

| CSS (all four sheets) | ~8 KB |
| fonts (self-hosted, latin) | 83 KB total, 2 preloaded |

No chart library, no animation library, no UI kit, no router, no state manager. React and
ReactDOM are the only runtime dependencies.

**No horizontal overflow.** A measured audit across twelve widths and all eight passes found
the document scrolling sideways at every mobile size — the rail's list leaked its scroll width
all the way to `<html>`, because `overflow-x: hidden` creates a scroll container rather than
clipping. Fixed with `overflow-x: clip` and paint containment; the audit now reports zero
failures at 320–1920 px.

## What was done, and why it works

**Move the work off the client entirely.** The pipeline turns 39 MB of CSV into 0.8 MB of JSON
before the build. The browser never aggregates, joins or scores anything — it receives answers.

**Nothing third-party in the critical path.** Fonts were on Google Fonts, which costs two extra
DNS + TLS round trips and a render-blocking stylesheet. They are now served from this origin,
preloaded, latin-subset only, with JetBrains Mono as a single variable file covering all four
weights. The CSP lost two external hosts as a side effect.

**First paint does not wait on JavaScript.** `index.html` carries an inlined shell, so the first
contentful paint happens on the HTML response.

**One bundle, deliberately.** An earlier revision lazy-loaded each pass. It saved a few
kilobytes and cost far more: behind `Suspense`, the first DOM a crawler or auditor sees is a
loading skeleton, and the entry bundle no longer contains the search, the map or the
relationship graph at all. At 22 KB gzipped for the entire application there was no problem
worth solving, and shipping every feature in the first response is worth more than the
split ever was.

**Compact wire format.** Rows are tuples and strings are dictionary-encoded into a shared table,
so 13,920 receipts cost 565 KB raw and roughly 150 KB over the wire.

**Progressive hydration of the record.** 22 KB gates the first render; the rest streams in.

**Layout stability.** Every canvas has a fixed-size container, so there is no late-arriving
chunk that could shift the layout in the first place.
`contain: layout paint` on canvas wrappers stops them reflowing neighbours.

**Skip painting what is off screen.** `content-visibility: auto` with
`contain-intrinsic-size` on the findings grid, the coda and the loading skeleton.

**Canvas discipline.** One `requestAnimationFrame` loop per pass, the draw function held in a
ref so it never restarts the loop, DPR capped at 2, `shadowBlur` only on focused nodes, and
label collision resolved before painting rather than by overdrawing.

**Offline.** A service worker caches the shell stale-while-revalidate and the record
cache-first — it is immutable for the life of a deploy. A second visit costs one conditional
request.

**Caching headers.** `netlify.toml` marks hashed assets `immutable` for a year.
