# The data

## Sources

| Stream | File | Span | After cleaning |
| --- | --- | --- | --- |
| Music | `spotify_history.csv` | Jul 2013 → Dec 2024 | 149,860 plays, 4,113 artists |
| Ledger | `Daily Household Transactions.csv` | Jan 2015 → Sep 2018 | 2,461 lines, ₹19.6 L |
| Card | `Augmented_IndiaTransactMultiFacet2024.csv` | Apr 2022 → Apr 2024 | 1,276 charges, 306 towns |

## The duplication trap

The card file ships **each transaction about seven times** — 10,267 rows are only 1,500
distinct charges. Deduplicating on
`(timestamp, merchant, amount, card, city, first, last)` is the first thing the pipeline does.
Left in, every card figure in the project would be inflated sevenfold.

## Bundles

| File | Size | Contents |
| --- | --- | --- |
| `core.json` | 22 KB | meta, eras, clock, weekday, months, findings, ghost, top artists |
| `graph.json` | 42 KB | 194 nodes, 1,600 lift-scored edges |
| `atlas.json` | 19 KB | 306 towns with coordinates and disputed counts |
| `days.json` | 155 KB | one row per day across 4,179 days |
| `moments.json` | 565 KB | 13,920 itemised receipts, dictionary-encoded |

Rows are tuples and strings live in a shared table, because the whole record has to travel with
no server to page it. `src/types.ts` is the decoder ring.

## Finding the connections

Raw co-occurrence just re-ranks the loudest things — The Beatles appear on more days than
anything else, so they would be wired to everything. Pairs are scored by **lift** instead:

```
lift(a, b) = days(a ∧ b) ÷ ( days(a) × days(b) ÷ totalDays )
```

Pairs need ≥ 2 shared days and lift > 1.05, then **each node keeps its own strongest 14 ties**
rather than a global top-N. That last step is what preserves the link between a tiny ledger
entry like `auto` and a huge artist node — the reason the graph shows the auto fare sitting
next to the band that was playing on the way home.

## Geocoding

The card file's lat/long columns are randomised worldwide and unusable. Towns are resolved
against a hand-built table of ~240 Indian city coordinates, falling back to state centroids
with deterministic jitter. The shape of India emerges from the dot density alone — there is no
basemap.

## Honesty

Every figure quoted anywhere in the interface is computed by the pipeline and interpolated into
the copy. Nothing is hand-typed. When a claim turned out not to survive the data — an early
draft asserted the two spending profiles tracked each other, and the real correlation is
0.24 — the copy was rewritten around the measurement, not the other way round.
