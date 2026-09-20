# Architecture

## Constraint

Frontend only. No backend, no database, no server-side rendering — the hackathon rules forbid
them. So the whole record has to reach the browser as static files, and every design decision
below follows from that one constraint.

## Two halves

```
etl/build_data.py      offline, runs once   39 MB CSV  →  0.8 MB JSON
src/                   runtime              React 18 + strict TypeScript
```

The pipeline is not shipped. It runs on a developer machine before the build, does all the
joining, era detection, lift scoring and geocoding, and writes five JSON bundles into
`public/data/`. The deployed site never computes any of it.

This is the single most important performance decision in the project: the browser receives
*answers*, not raw data to aggregate.

## Layers

```
src/
├─ main.tsx                 entry: mount, styles, service worker
├─ App.tsx                  shell: routing, lazy passes, shared state
├─ constants/               acts.ts, streams.ts — shared vocabulary, zero deps
├─ types.ts                 the decoder ring for every JSON bundle
├─ context/
│  ├─ DataContext.ts        the shape + the context object
│  └─ DataProvider.tsx      fetch and decode, nothing else
├─ hooks/                   one hook per file, all display-agnostic
│  ├─ useCanvas.ts          DPR-correct canvas sized to its parent
│  ├─ useSize.ts            ResizeObserver
│  ├─ useMediaQuery.ts      useReducedMotion.ts  useTheme.ts
│  ├─ useInView.ts          useCountUp.ts  useHotkey.ts
│  ├─ useRecord.ts          record-aware selectors over the context
│  └─ index.ts              barrel
├─ workers/
│  └─ record.worker.ts      decodes and searches 13,920 receipts off-thread
├─ utils/                   format.ts, registerServiceWorker.ts
├─ components/
│  ├─ acts/                 the seven passes — each its own chunk
│  └─ chrome/               Rail, Inspector, Palette, Texture, ErrorBoundary,
│                           ActSkeleton — everything that frames the passes
├─ styles/
│  ├─ fonts.css             self-hosted @font-face
│  ├─ tokens.css            design tokens, reset
│  ├─ app.css               component styles
│  └─ adaptive.css          theme, container queries, breakpoints, print
└─ __tests__/               vitest
```

## Off the main thread

`moments.json` is 565 KB of dictionary-encoded tuples that expand into 13,920 objects, and the
search palette scans all of them on every keystroke. Both jobs run in `record.worker.ts`: it
owns the decoded record, keeps a pre-lowercased haystack and a date index, and answers queries
by id so a stale reply is discarded rather than flashing. The main thread never parses the
bundle and never scans it.

The rule the tree encodes: **hooks know nothing about receipts.** `useCanvas` and `useSize`
could be lifted into any project. Everything that understands eras, ghosts and lift lives in
`components/acts` or the pipeline. That separation is why the act files stay readable despite
doing genuinely hard work.

## Data flow

```
public/data/*.json
      ↓ fetch
DataProvider          decodes tuples → objects, once
      ↓ context
useData / useDay / useDayIndex      memoised selectors
      ↓ props
acts                  render; never fetch, never decode
```

`core.json` (22 KB) gates the first render. `days`, `graph`, `moments` and `atlas` stream in
afterwards and each pass reveals itself as its data lands, so nothing hides behind one long
spinner. A pass that is still waiting shows a skeleton of the right size.

## Routing

The URL hash is the pass. `#tape` deep-links to pass 03, browser back and forward move between
passes, and `actIndexFromHash` is a pure function with its own tests. No router dependency.

## Code splitting

Each pass is a `React.lazy` chunk. The entry bundle carries only the shell; the seven passes
are 1.5–3.7 KB gzipped each and arrive on demand. The neighbouring passes are warmed during
`requestIdleCallback`, so paging still feels instant while a visitor who never opens the map
never downloads it.

## Rendering strategy

| Technique | Where | Why |
| --- | --- | --- |
| Canvas 2D | particles, constellation, tape, map | hundreds of moving elements; DOM cannot keep 60fps |
| SVG | dial, anomaly charts, barcode | few elements, benefits from being inspectable and scalable |
| HTML | the receipt | must stay selectable, printable and screen-reader legible |

The force simulation is hand-rolled — no D3, no physics library. **React and ReactDOM are the
only runtime dependencies in the entire project.**

## Resilience

Every pass is wrapped in an `ErrorBoundary`. Canvas work touches device pixel ratios, pointer
capture and offscreen contexts, so a failure is contained to the one pass rather than blanking
the site, and the index still works.
