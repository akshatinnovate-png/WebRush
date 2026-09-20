# Carbon Copy

**A decade of receipts, reassembled.** Built for WebRush — one problem statement, six hours, frontend only.

> 161,046 receipts from one person's digital life between 2013 and 2024 — every song, every rupee, every swipe. Half of the last two years belongs to someone else.

**Live:** _paste your Netlify URL here_ · **Repo:** _paste your GitHub URL here_

![React 18](https://img.shields.io/badge/React-18-1b1425)
![TypeScript strict](https://img.shields.io/badge/TypeScript-strict-1b1425)
![ESLint 0 warnings](https://img.shields.io/badge/ESLint-0%20errors%2C%200%20warnings-1b1425)
![Tests 23](https://img.shields.io/badge/tests-23%20passing-1b1425)
![Bundle 22KB](https://img.shields.io/badge/bundle-22.2%20KB%20gzip-1b1425)
![Runtime deps 2](https://img.shields.io/badge/runtime%20deps-2-1b1425)

## Contents

- [The idea](#the-idea) · [What the data says](#what-the-data-actually-says) · [The seven passes](#the-seven-passes)
- [Architecture](docs/ARCHITECTURE.md) · [Performance](docs/PERFORMANCE.md) · [Responsiveness](docs/RESPONSIVENESS.md) · [Accessibility](docs/ACCESSIBILITY.md) · [Data](docs/DATA.md)
- [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md) · [Changelog](CHANGELOG.md)

---

## Features

- **Eight linked passes** over one record, each deep-linkable by URL hash and reachable by keyboard.
- **Full-text search** across all 13,920 itemised receipts (`⌘K` / `Ctrl+K`), matching songs, merchants, towns, ledger notes and dates; Enter prints that day.
- **Relationship discovery, two ways** — a force-directed graph of 194 recurring things joined by 1,600 lift-scored ties, and a chain-walker that follows one path through it and explains each hop in words.
- **An eleven-year timeline** printed as a scrollable receipt roll, with a month scrubber and per-era detail.
- **A receipt printer** that renders any of 4,179 days as an itemised thermal receipt, with date navigation and a text download.
- **A rhythm dial** — twenty-four hours, weekday breakdown and six computed findings.
- **A map of the card trail** across 306 Indian towns, with a disputed-charge layer.
- **Filtering** by stream, by entity kind, and by disputed status.
- **Light and dark themes** with a three-way carbon / system / paper switch.
- **Offline support** through a service worker; installable as a PWA.
- **Full keyboard navigation** and a screen-reader route to every canvas.

## Tech stack

| Layer | Choice | Why |
| --- | --- | --- |
| UI | React 18 | the only runtime dependency, with `react-dom` |
| Language | TypeScript, `strict` | 99% of exported symbols carry JSDoc |
| Build | Vite 5 | 22 KB gzipped output |
| Styling | Hand-written CSS, four sheets | tokens, components, adaptive layer, fonts |
| Graphics | Canvas 2D and SVG | no chart or animation library |
| Testing | Vitest + Testing Library | 23 tests; Playwright audits are opt-in |
| Linting | ESLint 9 + `jsx-a11y` | zero errors, zero warnings |
| Pipeline | Python, pandas | offline; never ships |
| Hosting | Netlify | static, with a strict CSP |

No chart library, no animation library, no UI kit, no router, no state manager.

## Installation

```bash
git clone https://github.com/akshatinnovate-png/WebRush.git
cd WebRush
npm install
npm run dev          # http://localhost:5173
```

Requires Node 20 or newer. A clean `npm ci` completes in about four seconds.

## Usage

| Action | How |
| --- | --- |
| Move between passes | click the index, or `[` and `]` |
| Search every receipt | `⌘K` / `Ctrl+K`, then `↑` `↓` and `Enter` |
| Explore the graph | drag to pan, scroll or pinch to zoom, click a node |
| Read a specific day | pass 04, then the date picker or the arrows |
| Switch theme | the three swatches at the foot of the index |
| Print a receipt | `⌘P` on pass 04 — the page prints as an 80 mm receipt |
| Deep-link a pass | append `#tape`, `#atlas`, `#thread`, `#copy` … |

## The idea

The brief asks for `Raw Data → Insights → Connections → Story`, and explicitly warns against
building a timeline with cards under it.

So this is not a timeline. It is a **forensic reading of a stranger's decade**, done in seven
passes, each of which uses a different mechanism to find something the previous pass could not
see. The passes are a sequence — each one assumes what the last one showed — which is why the
navigation is numbered.

Three separate records are stacked on top of each other:

| Stream | Source | Span | Volume |
| --- | --- | --- | --- |
| Music | `spotify_history.csv` | Jul 2013 → Dec 2024 | 149,860 plays, 4,113 artists |
| Household ledger | `Daily Household Transactions.csv` | Jan 2015 → Sep 2018 | 2,461 hand-entered lines, ₹19.6 L |
| Card trail | `Augmented_IndiaTransactMultiFacet2024.csv` | Apr 2022 → Apr 2024 | 8,725 charges across 305 towns |

They barely overlap, and that gap is the point: a life is only legible when you stack the
fragments. The household ledger stops dead in 2018; the card starts in 2022; only the music
runs the whole way through and ties the two halves together.

## What the data actually says

Every number in the interface is computed by the pipeline. Nothing is written by hand.

- **368 days of silence.** Not a single play between 9 January 2014 and 12 January 2015. No
  music, no ledger, no card — a whole year that left no receipt at all.
- **This life happens at night.** 29.5% of every song ever played started between midnight and
  5am. The four hours from 9am to 1pm account for 3.0%.
- **35.7% of songs were never finished.** Radiohead was skipped 61% of the time and still got
  played 2,305 times.
- **The most repeated act costs ₹56.** 162 separate purchases of milk, 142 auto rides at ₹41.
  The median line in the entire ledger is ₹83.
- **The Beatles are the spine.** 13,621 plays — 9.1% of all listening, the top artist in eight
  separate years.
- **Half the card trail was never theirs.** 4,361 of 8,725 charges (50.0%, ₹2.25 crore) are
  bank-flagged, running unbroken for 25 months and never tapering.

The last finding is the turn the whole project builds towards — and the interesting part is how
*undetectable* it is. The disputed share sits between 46% and 56% in every merchant class. The
charges are flat across all 24 hours (the busiest single hour holds 6.4% against an even 4.2%),
and the two hourly profiles do not even correlate with each other (r = 0.24). Every signal that
makes the music legible as a person fails completely on the card. In 37 towns every single
charge was disputed; in 34 others, not one was.

## The eight passes

Every pass ships in the first response — no lazy loading, no skeletons standing in for content.

| # | Pass | Mechanism |
| --- | --- | --- |
| 01 | **The record** | Dot-matrix title drawn from ~3,000 canvas particles, coloured in the *true* proportion of the three streams — so you can see the mix before a number is quoted. |
| 02 | **The web** | Force-directed constellation. 205 recurring entities, 1,545 ties. This is the relationship-discovery mechanism. |
| 03 | **The tape** | 138 months printed on a scrollable receipt roll; listening rises above the fold, spending hangs below it. |
| 04 | **A single day** | Any one of 4,179 days printed as an actual thermal receipt, line by line, downloadable. |
| 05 | **The rhythm** | 24-hour radial dial, weekday bars, and six headline findings. |
| 06 | **The trail** | The card plotted across India, with a toggle that isolates the disputed layer. |

Plus a **⌘K command palette** searching all 21,369 itemised receipts, an inspector drawer, and
`[` / `]` to page between passes.

### How the connections are found

A naive co-occurrence count just re-ranks the loudest things — The Beatles appear on more days
than anything else, so they would be wired to everything. Instead each candidate pair is scored
by **lift**:

```
lift(a, b) = days(a ∧ b) / ( days(a) × days(b) / totalDays )
```

…which measures how much more often two things share a day than chance alone would produce.
Pairs need at least 3 shared days and lift > 1.05, then **every node keeps its own strongest 14
ties** rather than taking a global top-N. That last step is what preserves links between a tiny
ledger entry like `auto` and a huge artist node — the reason the graph shows the auto fare
sitting next to the band that was playing on the way home.

## Architecture

Frontend only. No backend, no database, no server-side rendering — per the hackathon rules.

```
etl/build_data.py     offline: 39 MB of CSV  →  0.8 MB of JSON
public/data/*.json    the entire record, as static files
src/                  React 18 + strict TypeScript, Vite
```

The pipeline runs **once, offline**, before the build. The deployed site is pure static files.

### The data bundles

Rows are tuples and strings are dictionary-encoded, because the whole record has to reach the
browser with no server to page it.

| File | Size | Loaded |
| --- | --- | --- |
| `core.json` | 22 KB | blocks first render |
| `graph.json` | 42 KB | progressive |
| `atlas.json` | 20 KB | progressive |
| `days.json` | 156 KB | progressive |
| `moments.json` | 565 KB | progressive |

`core.json` is small enough to gate the first paint; the heavy bundles arrive afterwards and
each pass reveals itself as its data lands, so nothing hides behind one long spinner.
`src/types.ts` is the decoder ring for all of it.

### Rendering

Canvas 2D for anything with hundreds of moving elements (particles, constellation, tape, map);
SVG for anything that benefits from being in the DOM (the dial, the anomaly charts, the
barcode); plain HTML for the receipt itself, so it stays selectable and readable by a screen
reader. The force simulation is hand-rolled — no D3, no physics library.

**Zero runtime dependencies beyond React.** No chart library, no animation library, no UI kit.

## Design

The subject is a stack of receipts, so the materials are thermal paper, carbon paper and
ledger ink rather than a generic dark theme.

- **Ground** — deep aubergine carbon (`#120C18`), not a tinted near-black.
- **Paper** — `#F4EFE3`, used *only* where something is literally printed. It is the one honest
  light surface in the product, which is what makes the tape and the receipt land.
- **One ink per stream**, so colour always carries meaning: pink `#FF5C8A` = a song,
  amber `#FFB13C` = the ledger, mint `#4FE3C1` = a place, violet `#9A7BFF` = a charge nobody
  can account for.
- **Two typefaces.** Instrument Serif for the narrative voice; JetBrains Mono for everything
  else. A monospace-primary interface is grounded in the subject — the whole product is
  receipts and ledgers — rather than being a default.

Motion is user-triggered everywhere except one orchestrated page-load sequence in pass 01.

## Testing

```bash
npm run verify     # typecheck → lint → test → build
```

23 tests across formatting, deterministic hashing, act resolution and shared constants, plus a
Playwright smoke run (`etl/smoke.mjs`) that walks all seven passes at two viewports and fails
on any console error. ESLint runs with `jsx-a11y` and reports zero errors **and zero warnings**.

## Accessibility

Full detail in [docs/ACCESSIBILITY.md](docs/ACCESSIBILITY.md).

- Semantic landmarks, one `<h1>`, headings in order, `aria-current="step"` on the live pass.
- **Every canvas has a parallel keyboard route.** The constellation ships the same 205 nodes as
  a real button list; the dial has a 24-button hour strip; the tape has a range scrubber that
  drives the same state.
- Skip link, visible focus rings, `aria-live` announcements on pass and hour changes.
- `prefers-reduced-motion` honoured throughout: particles land instantly, the receipt prints
  all at once, the map stops pulsing.
- A `<noscript>` message that points at the raw JSON rather than showing a blank page.

## Performance

| | gzipped |
| --- | --- |
| app JS | 19.7 KB |
| React | 45.2 KB |
| CSS | 6.1 KB |
| HTML | 1.5 KB |

`index.html` carries an inlined paint shell, so the first frame is never blank and FCP does not
wait on JavaScript. Fonts use `display=swap` with preconnect. React is split into its own
long-cached chunk. Layout shift is avoided by giving every canvas a fixed container.

## Security

`netlify.toml` sets a strict `Content-Security-Policy` (`script-src 'self'`, no inline
handlers, `object-src 'none'`, `form-action 'none'`), plus `X-Content-Type-Options`,
`X-Frame-Options`, `Referrer-Policy` and a restrictive `Permissions-Policy`. There is no user
input that reaches anything but React state, no `dangerouslySetInnerHTML`, and no third-party
scripts at all.

## Running it

```bash
npm install
npm run dev        # development
npm run build      # → dist/
npm run preview    # serve the build
npm run lint       # eslint, zero errors and zero warnings
npm run typecheck  # tsc --noEmit, strict
```

Regenerating the data bundles (only needed if the source CSVs change):

```bash
python3 etl/build_data.py     # requires pandas + numpy
```

## Deploying

**Netlify Drop:** unzip `carbon-copy-netlify.zip` and drag the folder onto
[app.netlify.com/drop](https://app.netlify.com/drop). It is already built.

**From Git:** connect the repo — `netlify.toml` already specifies
`npm run build` → publish `dist`, with an SPA redirect and all headers.

## Data

Three public datasets, used as provided. Personal names in the card file are synthetic. The
entire record is treated as one fictional person's "life receipts", as the brief asks.

## Author

**Akshat Sarkar** — akshat.innovate@gmail.com

Built solo for WebRush, a six-hour frontend hackathon.

## Acknowledgements

Three public datasets, used as provided: a Spotify listening export, a daily household
transactions ledger, and an augmented Indian card-transaction set. Personal names in the card
file are synthetic. Typefaces are Instrument Serif and JetBrains Mono, both self-hosted under
the SIL Open Font Licence.

## Licence

MIT.
